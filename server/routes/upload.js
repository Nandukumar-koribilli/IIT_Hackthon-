import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

import { transferDb, logDb } from '../db/database.js';
import encryption from '../lib/encryption.js';
import compression from '../lib/compression.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

/**
 * POST /api/upload
 * Upload a file with compression and optional encryption
 */
router.post('/', upload.single('file'), async (req, res) => {
  const io = req.app.get('io');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      password,
      expiresIn, // in hours
      maxDownloads,
      compressionLevel = 6
    } = req.body;

    const transferId = await encryption.generateTransferId();
    const originalFilePath = req.file.path;
    const originalSize = req.file.size;
    const originalFilename = req.file.originalname;
    const mimeType = req.file.mimetype;

    // Emit upload started
    io.emit('upload-started', { transferId, filename: originalFilename });

    // Step 1: Generate encryption parameters
    const iv = await encryption.generateIV();
    const salt = await encryption.generateSalt();
    const fileKey = await encryption.generateKey();

    // Step 2: Compress the file
    const compressedPath = path.join(__dirname, '..', 'uploads', 'temp', `${transferId}.compressed`);
    const algorithm = compression.selectAlgorithm(mimeType);
    
    io.emit('upload-progress', { 
      transferId, 
      stage: 'compressing',
      progress: 30 
    });

    const compressionResult = await compression.compressFile(
      originalFilePath,
      compressedPath,
      algorithm,
      parseInt(compressionLevel)
    );

    // Step 3: Encrypt the compressed file
    io.emit('upload-progress', { 
      transferId, 
      stage: 'encrypting',
      progress: 60 
    });

    const compressedData = fs.readFileSync(compressedPath);
    const { encrypted, authTag } = encryption.encrypt(compressedData, fileKey, iv);

    // Save encrypted file
    const finalPath = path.join(__dirname, '..', 'uploads', `${transferId}.enc`);
    fs.writeFileSync(finalPath, encrypted);

    // Generate checksum
    const checksum = encryption.generateChecksum(encrypted);

    // Clean up temp files
    fs.unlinkSync(originalFilePath);
    fs.unlinkSync(compressedPath);

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn) {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + parseInt(expiresIn));
      expiresAt = expirationDate.toISOString();
    }

    // Save transfer record
    transferDb.create({
      id: transferId,
      filename: `${transferId}.enc`,
      original_filename: originalFilename,
      original_size: originalSize,
      compressed_size: encrypted.length,
      compression_ratio: parseFloat(compressionResult.ratio),
      encryption_iv: iv,
      encryption_salt: salt,
      password_hash: passwordHash,
      mime_type: mimeType,
      expires_at: expiresAt,
      max_downloads: maxDownloads ? parseInt(maxDownloads) : null,
      checksum
    });

    // Log the upload
    logDb.create({
      transfer_id: transferId,
      action: 'upload',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      details: JSON.stringify({
        originalSize,
        compressedSize: encrypted.length,
        compressionRatio: compressionResult.ratio
      })
    });

    io.emit('upload-progress', { 
      transferId, 
      stage: 'complete',
      progress: 100 
    });

    // Return success with transfer details
    // The key and authTag are needed for client-side decryption
    res.json({
      success: true,
      transfer: {
        id: transferId,
        filename: originalFilename,
        originalSize: compression.formatBytes(originalSize),
        compressedSize: compression.formatBytes(encrypted.length),
        compressionRatio: compressionResult.ratio + '%',
        savings: compressionResult.savings + '%',
        expiresAt,
        maxDownloads: maxDownloads || 'Unlimited',
        hasPassword: !!password
      },
      // These are needed for decryption - store securely!
      decryptionKey: fileKey,
      authTag,
      // Generate download link
      downloadUrl: `/download/${transferId}#key=${fileKey}&tag=${authTag}`
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Upload failed', 
      message: error.message 
    });
  }
});

/**
 * POST /api/upload/chunk
 * Handle chunked uploads for very large files
 */
router.post('/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { 
      transferId,
      chunkIndex,
      totalChunks,
      filename 
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No chunk data' });
    }

    const chunkDir = path.join(__dirname, '..', 'uploads', 'chunks', transferId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    // Save chunk
    const chunkPath = path.join(chunkDir, `chunk-${chunkIndex}`);
    fs.renameSync(req.file.path, chunkPath);

    // Check if all chunks received
    const chunks = fs.readdirSync(chunkDir);
    const progress = Math.round((chunks.length / parseInt(totalChunks)) * 100);

    const io = req.app.get('io');
    io.emit('upload-progress', {
      transferId,
      stage: 'uploading',
      progress: Math.min(progress, 30) // Cap at 30% for upload stage
    });

    if (chunks.length === parseInt(totalChunks)) {
      // All chunks received - merge them
      const mergedPath = path.join(__dirname, '..', 'uploads', 'temp', `${transferId}-merged`);
      const writeStream = fs.createWriteStream(mergedPath);

      for (let i = 0; i < parseInt(totalChunks); i++) {
        const chunkPath = path.join(chunkDir, `chunk-${i}`);
        const chunkData = fs.readFileSync(chunkPath);
        writeStream.write(chunkData);
        fs.unlinkSync(chunkPath);
      }
      
      writeStream.end();
      fs.rmdirSync(chunkDir);

      res.json({
        success: true,
        message: 'All chunks received',
        complete: true,
        mergedPath
      });
    } else {
      res.json({
        success: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
        complete: false,
        received: chunks.length,
        total: parseInt(totalChunks)
      });
    }

  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ 
      error: 'Chunk upload failed', 
      message: error.message 
    });
  }
});

export default router;
