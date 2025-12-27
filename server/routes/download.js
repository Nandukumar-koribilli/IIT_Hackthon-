import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

import { transferDb, logDb } from '../db/database.js';
import encryption from '../lib/encryption.js';
import compression from '../lib/compression.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/download/:id/info
 * Get transfer metadata (no password required)
 */
router.get('/:id/info', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transfer = transferDb.getById(id);
    
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    // Check if expired
    if (transfer.expires_at && new Date(transfer.expires_at) < new Date()) {
      transferDb.updateStatus(id, 'expired');
      return res.status(410).json({ error: 'Transfer has expired' });
    }

    // Check download limit
    if (transfer.max_downloads && transfer.download_count >= transfer.max_downloads) {
      return res.status(410).json({ error: 'Download limit reached' });
    }

    res.json({
      id: transfer.id,
      filename: transfer.original_filename,
      originalSize: compression.formatBytes(transfer.original_size),
      compressedSize: compression.formatBytes(transfer.compressed_size),
      compressionRatio: transfer.compression_ratio + '%',
      hasPassword: !!transfer.password_hash,
      expiresAt: transfer.expires_at,
      downloadCount: transfer.download_count,
      maxDownloads: transfer.max_downloads,
      createdAt: transfer.created_at,
      mimeType: transfer.mime_type
    });

  } catch (error) {
    console.error('Get info error:', error);
    res.status(500).json({ error: 'Failed to get transfer info' });
  }
});

/**
 * POST /api/download/:id
 * Download the file (requires decryption key and optional password)
 */
router.post('/:id', async (req, res) => {
  const io = req.app.get('io');
  
  try {
    const { id } = req.params;
    const { password, decryptionKey, authTag } = req.body;
    
    const transfer = transferDb.getById(id);
    
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    // Check status
    if (transfer.status !== 'active') {
      return res.status(410).json({ error: `Transfer is ${transfer.status}` });
    }

    // Check if expired
    if (transfer.expires_at && new Date(transfer.expires_at) < new Date()) {
      transferDb.updateStatus(id, 'expired');
      return res.status(410).json({ error: 'Transfer has expired' });
    }

    // Check download limit
    if (transfer.max_downloads && transfer.download_count >= transfer.max_downloads) {
      return res.status(410).json({ error: 'Download limit reached' });
    }

    // Verify password if required
    if (transfer.password_hash) {
      if (!password) {
        return res.status(401).json({ error: 'Password required', requiresPassword: true });
      }
      
      const isValid = await bcrypt.compare(password, transfer.password_hash);
      if (!isValid) {
        // Log failed attempt
        logDb.create({
          transfer_id: id,
          action: 'download_failed',
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          details: 'Invalid password'
        });
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Verify decryption key and authTag are provided
    if (!decryptionKey || !authTag) {
      return res.status(400).json({ 
        error: 'Decryption key and auth tag required',
        message: 'These should be from the download URL fragment'
      });
    }

    io.emit('download-progress', { 
      transferId: id, 
      stage: 'reading',
      progress: 10 
    });

    // Read encrypted file
    const filePath = path.join(__dirname, '..', 'uploads', transfer.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    const encryptedData = fs.readFileSync(filePath);

    // Verify checksum
    const checksum = encryption.generateChecksum(encryptedData);
    if (checksum !== transfer.checksum) {
      return res.status(500).json({ error: 'File integrity check failed' });
    }

    io.emit('download-progress', { 
      transferId: id, 
      stage: 'decrypting',
      progress: 40 
    });

    // Decrypt the file
    let decryptedData;
    try {
      decryptedData = encryption.decrypt(
        encryptedData,
        decryptionKey,
        transfer.encryption_iv,
        authTag
      );
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return res.status(400).json({ 
        error: 'Decryption failed', 
        message: 'Invalid decryption key or auth tag' 
      });
    }

    io.emit('download-progress', { 
      transferId: id, 
      stage: 'decompressing',
      progress: 70 
    });

    // Decompress the file
    const decompressedData = await compression.decompressGzip(decryptedData);

    // Update download count
    transferDb.updateDownloadCount(id);

    // Log successful download
    logDb.create({
      transfer_id: id,
      action: 'download',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      details: JSON.stringify({ size: decompressedData.length })
    });

    io.emit('download-progress', { 
      transferId: id, 
      stage: 'complete',
      progress: 100 
    });

    // Send file
    res.setHeader('Content-Type', transfer.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(transfer.original_filename)}"`);
    res.setHeader('Content-Length', decompressedData.length);
    res.send(decompressedData);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Download failed', 
      message: error.message 
    });
  }
});

/**
 * GET /api/download/:id/stream
 * Stream download for large files (client-side decryption)
 */
router.get('/:id/stream', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transfer = transferDb.getById(id);
    
    if (!transfer || transfer.status !== 'active') {
      return res.status(404).json({ error: 'Transfer not found or inactive' });
    }

    // Check if expired
    if (transfer.expires_at && new Date(transfer.expires_at) < new Date()) {
      transferDb.updateStatus(id, 'expired');
      return res.status(410).json({ error: 'Transfer has expired' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', transfer.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('X-Encryption-IV', transfer.encryption_iv);
    
    fs.createReadStream(filePath).pipe(res);

  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Stream failed' });
  }
});

export default router;
