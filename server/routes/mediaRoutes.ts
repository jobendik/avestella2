// =============================================================================
// Media Routes - REST endpoints for media upload/download
// =============================================================================
// Phase 3.2: Recording Upload Endpoints
// =============================================================================

import express, { Request, Response, Router } from 'express';
// @ts-ignore - multer types
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { mediaStorageService } from '../services/MediaStorageService.js';

const router: Router = express.Router();

// ============================================
// MULTER CONFIGURATION
// ============================================

const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        const uploadDir = './uploads/temp';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max
    },
    fileFilter: (req: any, file: any, cb: any) => {
        const allowedTypes = ['video/webm', 'video/mp4', 'video/quicktime', 
                             'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// ============================================
// AUTH MIDDLEWARE (simplified for example)
// ============================================

interface AuthRequest extends Request {
    playerId?: string;
    playerName?: string;
    file?: any;
}

const authMiddleware = (req: AuthRequest, res: Response, next: express.NextFunction) => {
    // In production, this would validate JWT or session
    const playerId = req.headers['x-player-id'] as string;
    const playerName = req.headers['x-player-name'] as string;

    if (!playerId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    req.playerId = playerId;
    req.playerName = playerName || 'Unknown';
    next();
};

// ============================================
// UPLOAD TOKEN ENDPOINTS
// ============================================

/**
 * GET /api/media/upload-token
 * Get a token for uploading media
 */
router.get('/upload-token', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const type = (req.query.type as 'recording' | 'screenshot' | 'avatar') || 'recording';
        
        const token = await mediaStorageService.generateUploadToken(
            req.playerId!,
            type
        );

        res.json({
            success: true,
            tokenId: token.tokenId,
            expiresAt: token.expiresAt
        });
    } catch (error: any) {
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// RECORDING ENDPOINTS
// ============================================

/**
 * POST /api/media/recordings
 * Upload a new recording
 */
router.post('/recordings', authMiddleware, upload.single('recording'), async (req: AuthRequest, res: Response) => {
    try {
        const { tokenId, title, description, type, realm, duration, visibility, tags } = req.body;

        // Validate upload token
        const validation = await mediaStorageService.validateUploadToken(tokenId, req.playerId!);
        if (!validation.valid) {
            // Clean up uploaded file
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ success: false, error: validation.error });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Consume the token
        await mediaStorageService.consumeUploadToken(tokenId);

        // Create recording entry
        const recording = await mediaStorageService.createRecording({
            playerId: req.playerId!,
            playerName: req.playerName!,
            type: type || 'moment',
            title: title || 'Untitled Recording',
            description,
            realm: realm || 'genesis',
            duration: parseFloat(duration) || 0,
            fileSize: req.file.size,
            format: path.extname(req.file.originalname).slice(1),
            visibility: visibility || 'private',
            tags: tags ? JSON.parse(tags) : [],
            metadata: {
                startTime: new Date(),
                endTime: new Date()
            }
        });

        // Move file to permanent location
        const targetDir = `./uploads/recordings/${req.playerId}`;
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const targetPath = `${targetDir}/${recording.recordingId}.${path.extname(req.file.originalname).slice(1)}`;
        fs.renameSync(req.file.path, targetPath);

        // Mark as ready (in production, would process/transcode first)
        await mediaStorageService.markRecordingReady(recording.recordingId);

        res.status(201).json({
            success: true,
            recording: {
                recordingId: recording.recordingId,
                title: recording.title,
                status: 'ready'
            }
        });
    } catch (error: any) {
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/media/recordings
 * Get player's recordings
 */
router.get('/recordings', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { type, status, limit, skip } = req.query;

        const recordings = await mediaStorageService.getPlayerRecordings(req.playerId!, {
            type: type as string,
            status: status as string,
            limit: parseInt(limit as string) || 20,
            skip: parseInt(skip as string) || 0
        });

        res.json({
            success: true,
            recordings,
            count: recordings.length
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/media/recordings/public
 * Get public recordings
 */
router.get('/recordings/public', async (req: Request, res: Response) => {
    try {
        const { realm, tags, limit, skip } = req.query;

        const recordings = await mediaStorageService.getPublicRecordings({
            realm: realm as string,
            tags: tags ? (tags as string).split(',') : undefined,
            limit: parseInt(limit as string) || 20,
            skip: parseInt(skip as string) || 0
        });

        res.json({
            success: true,
            recordings,
            count: recordings.length
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/media/recordings/:recordingId
 * Get a specific recording
 */
router.get('/recordings/:recordingId', async (req: Request, res: Response) => {
    try {
        const { recordingId } = req.params;
        const playerId = req.headers['x-player-id'] as string;

        // Find the recording
        const { Recording } = await import('../services/MediaStorageService.js');
        const recording = await Recording.findOne({ recordingId }).lean() as any;

        if (!recording) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        // Check visibility
        if (recording.visibility === 'private' && recording.playerId !== playerId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // TODO: Check friends visibility

        // Increment views
        await mediaStorageService.incrementViews(recordingId);

        res.json({
            success: true,
            recording
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * PATCH /api/media/recordings/:recordingId
 * Update recording visibility
 */
router.patch('/recordings/:recordingId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { recordingId } = req.params;
        const { visibility } = req.body;

        if (!['private', 'friends', 'public'].includes(visibility)) {
            return res.status(400).json({ success: false, error: 'Invalid visibility' });
        }

        const success = await mediaStorageService.updateVisibility(
            recordingId,
            req.playerId!,
            visibility
        );

        if (!success) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * DELETE /api/media/recordings/:recordingId
 * Delete a recording
 */
router.delete('/recordings/:recordingId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { recordingId } = req.params;

        const success = await mediaStorageService.deleteRecording(recordingId, req.playerId!);

        if (!success) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/media/recordings/:recordingId/like
 * Like a recording
 */
router.post('/recordings/:recordingId/like', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { recordingId } = req.params;
        const { like } = req.body; // true to like, false to unlike

        await mediaStorageService.toggleLike(recordingId, like !== false);

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/media/recordings/:recordingId/share
 * Share a recording
 */
router.post('/recordings/:recordingId/share', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { recordingId } = req.params;

        await mediaStorageService.incrementShares(recordingId);

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// STORAGE ENDPOINTS
// ============================================

/**
 * GET /api/media/storage
 * Get player's storage stats
 */
router.get('/storage', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const stats = await mediaStorageService.getStorageStats(req.playerId!);

        res.json({
            success: true,
            ...stats,
            usedFormatted: formatBytes(stats.used),
            limitFormatted: formatBytes(stats.limit),
            percentUsed: Math.round((stats.used / stats.limit) * 100)
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// FILE SERVING
// ============================================

/**
 * GET /api/media/file/:recordingId
 * Stream a recording file
 */
router.get('/file/:recordingId', async (req: Request, res: Response) => {
    try {
        const { recordingId } = req.params;
        const playerId = req.headers['x-player-id'] as string;

        const { Recording } = await import('../services/MediaStorageService.js');
        const recording = await Recording.findOne({ recordingId, status: 'ready' }).lean() as any;

        if (!recording) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        // Check visibility
        if (recording.visibility === 'private' && recording.playerId !== playerId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Construct file path
        const filePath = `./uploads/recordings/${recording.playerId}/${recordingId}.${recording.format}`;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // Get file stats
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Handle range requests for video streaming
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': `video/${recording.format}`
            });

            file.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': `video/${recording.format}`
            });
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// HELPERS
// ============================================

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
