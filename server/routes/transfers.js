import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { transferDb, logDb } from '../db/database.js';
import compression from '../lib/compression.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/transfers
 * List all transfers
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    // Clean up expired transfers first
    transferDb.cleanupExpired();
    
    const transfers = transferDb.getAll(parseInt(limit), parseInt(offset));
    
    const formattedTransfers = transfers.map(t => ({
      id: t.id,
      filename: t.original_filename,
      originalSize: compression.formatBytes(t.original_size),
      compressedSize: compression.formatBytes(t.compressed_size),
      compressionRatio: t.compression_ratio + '%',
      hasPassword: !!t.password_hash,
      downloadCount: t.download_count,
      maxDownloads: t.max_downloads,
      expiresAt: t.expires_at,
      createdAt: t.created_at,
      status: t.status
    }));

    res.json({
      transfers: formattedTransfers,
      total: formattedTransfers.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('List transfers error:', error);
    res.status(500).json({ error: 'Failed to list transfers' });
  }
});

/**
 * GET /api/transfers/:id
 * Get single transfer details with logs
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transfer = transferDb.getById(id);
    
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const logs = logDb.getByTransferId(id);

    res.json({
      transfer: {
        id: transfer.id,
        filename: transfer.original_filename,
        originalSize: compression.formatBytes(transfer.original_size),
        compressedSize: compression.formatBytes(transfer.compressed_size),
        compressionRatio: transfer.compression_ratio + '%',
        hasPassword: !!transfer.password_hash,
        downloadCount: transfer.download_count,
        maxDownloads: transfer.max_downloads,
        expiresAt: transfer.expires_at,
        createdAt: transfer.created_at,
        status: transfer.status,
        mimeType: transfer.mime_type
      },
      logs: logs.map(l => ({
        action: l.action,
        timestamp: l.created_at,
        ipAddress: l.ip_address,
        details: l.details ? JSON.parse(l.details) : null
      }))
    });

  } catch (error) {
    console.error('Get transfer error:', error);
    res.status(500).json({ error: 'Failed to get transfer' });
  }
});

/**
 * DELETE /api/transfers/:id
 * Delete a transfer
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transfer = transferDb.getById(id);
    
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '..', 'uploads', transfer.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    transferDb.delete(id);

    // Log deletion
    logDb.create({
      transfer_id: id,
      action: 'deleted',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      details: null
    });

    res.json({ 
      success: true, 
      message: 'Transfer deleted successfully' 
    });

  } catch (error) {
    console.error('Delete transfer error:', error);
    res.status(500).json({ error: 'Failed to delete transfer' });
  }
});

/**
 * GET /api/transfers/stats/overview
 * Get transfer statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const transfers = transferDb.getAll(1000, 0);
    
    const totalUploads = transfers.length;
    const totalOriginalSize = transfers.reduce((sum, t) => sum + t.original_size, 0);
    const totalCompressedSize = transfers.reduce((sum, t) => sum + t.compressed_size, 0);
    const totalDownloads = transfers.reduce((sum, t) => sum + t.download_count, 0);
    const avgCompressionRatio = transfers.length > 0
      ? (transfers.reduce((sum, t) => sum + t.compression_ratio, 0) / transfers.length).toFixed(2)
      : 0;

    res.json({
      totalUploads,
      totalDownloads,
      totalOriginalSize: compression.formatBytes(totalOriginalSize),
      totalCompressedSize: compression.formatBytes(totalCompressedSize),
      totalSaved: compression.formatBytes(totalOriginalSize - totalCompressedSize),
      avgCompressionRatio: avgCompressionRatio + '%'
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
