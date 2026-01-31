// =============================================================================
// Media Storage Service - Handle recordings and media uploads
// =============================================================================
// Phase 3.1: Media storage for recordings, replays, and screenshots
// =============================================================================

import { EventEmitter } from 'events';
import mongoose, { Schema, Document, Model } from 'mongoose';
// @ts-ignore - uuid package types
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ============================================
// RECORDING MODEL
// ============================================

export interface IRecording extends Document {
    recordingId: string;
    playerId: string;
    playerName: string;
    type: 'moment' | 'session' | 'highlight' | 'replay';
    title: string;
    description?: string;
    realm: string;
    duration: number;          // Duration in seconds
    fileSize: number;          // Size in bytes
    filePath: string;          // Storage path or URL
    thumbnailPath?: string;
    format: string;            // 'webm', 'mp4', etc.
    resolution: string;        // '1920x1080', etc.
    fps: number;
    visibility: 'private' | 'friends' | 'public';
    tags: string[];
    metadata: {
        startTime: Date;
        endTime: Date;
        participants?: string[];
        eventId?: string;
        gameMode?: string;
        position?: { x: number; y: number };
    };
    stats: {
        views: number;
        likes: number;
        shares: number;
        downloads: number;
    };
    status: 'processing' | 'ready' | 'failed' | 'deleted';
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}

const RecordingSchema = new Schema<IRecording>({
    recordingId: { type: String, required: true, unique: true, index: true },
    playerId: { type: String, required: true, index: true },
    playerName: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['moment', 'session', 'highlight', 'replay'],
        default: 'moment'
    },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    realm: { type: String, required: true },
    duration: { type: Number, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    thumbnailPath: { type: String },
    format: { type: String, default: 'webm' },
    resolution: { type: String, default: '1920x1080' },
    fps: { type: Number, default: 30 },
    visibility: { 
        type: String, 
        enum: ['private', 'friends', 'public'],
        default: 'private'
    },
    tags: [{ type: String }],
    metadata: {
        startTime: Date,
        endTime: Date,
        participants: [String],
        eventId: String,
        gameMode: String,
        position: {
            x: Number,
            y: Number
        }
    },
    stats: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        downloads: { type: Number, default: 0 }
    },
    status: {
        type: String,
        enum: ['processing', 'ready', 'failed', 'deleted'],
        default: 'processing'
    },
    processedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: Date
}, { collection: 'recordings' });

RecordingSchema.index({ playerId: 1, createdAt: -1 });
RecordingSchema.index({ visibility: 1, status: 1 });
RecordingSchema.index({ tags: 1 });
RecordingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Recording = (mongoose.models.Recording || 
    mongoose.model<IRecording>('Recording', RecordingSchema)) as Model<IRecording>;

// ============================================
// UPLOAD TOKEN MODEL
// ============================================

interface IUploadToken extends Document {
    tokenId: string;
    playerId: string;
    type: 'recording' | 'screenshot' | 'avatar';
    maxSize: number;
    allowedFormats: string[];
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}

const UploadTokenSchema = new Schema<IUploadToken>({
    tokenId: { type: String, required: true, unique: true },
    playerId: { type: String, required: true, index: true },
    type: { type: String, enum: ['recording', 'screenshot', 'avatar'], required: true },
    maxSize: { type: Number, required: true },
    allowedFormats: [{ type: String }],
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'uploadTokens' });

UploadTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UploadToken = (mongoose.models.UploadToken || 
    mongoose.model<IUploadToken>('UploadToken', UploadTokenSchema)) as Model<IUploadToken>;

export { UploadToken };

// ============================================
// STORAGE CONFIGURATION
// ============================================

interface StorageConfig {
    type: 'local' | 's3' | 'azure' | 'gcs';
    basePath: string;
    maxFileSize: number;          // Max size in bytes
    maxRecordingDuration: number; // Max duration in seconds
    maxStoragePerUser: number;    // Max storage per user in bytes
    allowedFormats: string[];
    retentionDays: number;        // Days before auto-deletion
}

const DEFAULT_CONFIG: StorageConfig = {
    type: 'local',
    basePath: './uploads/recordings',
    maxFileSize: 500 * 1024 * 1024,     // 500MB
    maxRecordingDuration: 300,           // 5 minutes
    maxStoragePerUser: 5 * 1024 * 1024 * 1024, // 5GB
    allowedFormats: ['webm', 'mp4', 'mov'],
    retentionDays: 30
};

// ============================================
// MEDIA STORAGE SERVICE
// ============================================

class MediaStorageService extends EventEmitter {
    private initialized: boolean = false;
    private config: StorageConfig = DEFAULT_CONFIG;

    async initialize(config?: Partial<StorageConfig>): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        if (config) {
            this.config = { ...this.config, ...config };
        }

        console.log('📹 Media storage service initialized');
    }

    // =========================================================================
    // UPLOAD TOKENS
    // =========================================================================

    /**
     * Generate an upload token for authenticated uploads
     */
    async generateUploadToken(
        playerId: string,
        type: 'recording' | 'screenshot' | 'avatar'
    ): Promise<{ tokenId: string; expiresAt: Date }> {
        // Check user's storage quota
        const userStorage = await this.getUserStorageUsed(playerId);
        if (userStorage >= this.config.maxStoragePerUser) {
            throw new Error('Storage quota exceeded');
        }

        const tokenId = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        const maxSize = type === 'recording' 
            ? this.config.maxFileSize 
            : type === 'screenshot' 
                ? 10 * 1024 * 1024  // 10MB for screenshots
                : 5 * 1024 * 1024;  // 5MB for avatars

        const allowedFormats = type === 'recording'
            ? this.config.allowedFormats
            : type === 'screenshot'
                ? ['png', 'jpg', 'jpeg', 'webp']
                : ['png', 'jpg', 'jpeg', 'webp', 'gif'];

        await UploadToken.create({
            tokenId,
            playerId,
            type,
            maxSize,
            allowedFormats,
            expiresAt
        });

        return { tokenId, expiresAt };
    }

    /**
     * Validate an upload token
     */
    async validateUploadToken(
        tokenId: string,
        playerId: string
    ): Promise<{ valid: boolean; token?: IUploadToken; error?: string }> {
        const token = await UploadToken.findOne({ tokenId, playerId });

        if (!token) {
            return { valid: false, error: 'Token not found' };
        }

        if (token.used) {
            return { valid: false, error: 'Token already used' };
        }

        if (token.expiresAt < new Date()) {
            return { valid: false, error: 'Token expired' };
        }

        return { valid: true, token };
    }

    /**
     * Mark token as used
     */
    async consumeUploadToken(tokenId: string): Promise<void> {
        await UploadToken.findOneAndUpdate(
            { tokenId },
            { used: true }
        );
    }

    // =========================================================================
    // RECORDINGS
    // =========================================================================

    /**
     * Create a new recording entry
     */
    async createRecording(input: {
        playerId: string;
        playerName: string;
        type: 'moment' | 'session' | 'highlight' | 'replay';
        title: string;
        description?: string;
        realm: string;
        duration: number;
        fileSize: number;
        format?: string;
        resolution?: string;
        fps?: number;
        visibility?: 'private' | 'friends' | 'public';
        tags?: string[];
        metadata?: IRecording['metadata'];
    }): Promise<IRecording> {
        // Validate duration
        if (input.duration > this.config.maxRecordingDuration) {
            throw new Error(`Recording too long. Max ${this.config.maxRecordingDuration}s`);
        }

        // Validate file size
        if (input.fileSize > this.config.maxFileSize) {
            throw new Error(`File too large. Max ${this.config.maxFileSize / 1024 / 1024}MB`);
        }

        const recordingId = `rec_${uuidv4()}`;
        const filePath = `${this.config.basePath}/${input.playerId}/${recordingId}.${input.format || 'webm'}`;
        
        // Calculate expiration
        const expiresAt = new Date(Date.now() + this.config.retentionDays * 24 * 60 * 60 * 1000);

        const recording = await Recording.create({
            recordingId,
            playerId: input.playerId,
            playerName: input.playerName,
            type: input.type,
            title: input.title,
            description: input.description,
            realm: input.realm,
            duration: input.duration,
            fileSize: input.fileSize,
            filePath,
            format: input.format || 'webm',
            resolution: input.resolution || '1920x1080',
            fps: input.fps || 30,
            visibility: input.visibility || 'private',
            tags: input.tags || [],
            metadata: input.metadata || {},
            status: 'processing',
            expiresAt
        });

        this.emit('recording_created', recording);

        return recording;
    }

    /**
     * Mark recording as ready after processing
     */
    async markRecordingReady(
        recordingId: string,
        thumbnailPath?: string
    ): Promise<void> {
        await Recording.findOneAndUpdate(
            { recordingId },
            { 
                status: 'ready',
                processedAt: new Date(),
                thumbnailPath,
                updatedAt: new Date()
            }
        );

        this.emit('recording_ready', { recordingId });
    }

    /**
     * Mark recording as failed
     */
    async markRecordingFailed(recordingId: string, error: string): Promise<void> {
        await Recording.findOneAndUpdate(
            { recordingId },
            { 
                status: 'failed',
                updatedAt: new Date()
            }
        );

        this.emit('recording_failed', { recordingId, error });
    }

    /**
     * Get player's recordings
     */
    async getPlayerRecordings(
        playerId: string,
        options?: {
            type?: string;
            status?: string;
            limit?: number;
            skip?: number;
        }
    ): Promise<any[]> {
        const query: any = { playerId, status: { $ne: 'deleted' } };
        
        if (options?.type) query.type = options.type;
        if (options?.status) query.status = options.status;

        return Recording.find(query)
            .sort({ createdAt: -1 })
            .limit(options?.limit || 20)
            .skip(options?.skip || 0)
            .lean();
    }

    /**
     * Get public recordings
     */
    async getPublicRecordings(options?: {
        realm?: string;
        tags?: string[];
        limit?: number;
        skip?: number;
    }): Promise<any[]> {
        const query: any = { visibility: 'public', status: 'ready' };

        if (options?.realm) query.realm = options.realm;
        if (options?.tags?.length) query.tags = { $in: options.tags };

        return Recording.find(query)
            .sort({ 'stats.views': -1, createdAt: -1 })
            .limit(options?.limit || 20)
            .skip(options?.skip || 0)
            .lean();
    }

    /**
     * Update recording visibility
     */
    async updateVisibility(
        recordingId: string,
        playerId: string,
        visibility: 'private' | 'friends' | 'public'
    ): Promise<boolean> {
        const result = await Recording.findOneAndUpdate(
            { recordingId, playerId },
            { visibility, updatedAt: new Date() }
        );

        return !!result;
    }

    /**
     * Delete a recording
     */
    async deleteRecording(recordingId: string, playerId: string): Promise<boolean> {
        const result = await Recording.findOneAndUpdate(
            { recordingId, playerId },
            { status: 'deleted', updatedAt: new Date() }
        );

        if (result) {
            this.emit('recording_deleted', { recordingId, playerId });
        }

        return !!result;
    }

    // =========================================================================
    // STATS
    // =========================================================================

    /**
     * Increment view count
     */
    async incrementViews(recordingId: string): Promise<void> {
        await Recording.findOneAndUpdate(
            { recordingId },
            { $inc: { 'stats.views': 1 } }
        );
    }

    /**
     * Toggle like
     */
    async toggleLike(recordingId: string, increment: boolean): Promise<void> {
        await Recording.findOneAndUpdate(
            { recordingId },
            { $inc: { 'stats.likes': increment ? 1 : -1 } }
        );
    }

    /**
     * Increment share count
     */
    async incrementShares(recordingId: string): Promise<void> {
        await Recording.findOneAndUpdate(
            { recordingId },
            { $inc: { 'stats.shares': 1 } }
        );
    }

    /**
     * Get user's total storage used
     */
    async getUserStorageUsed(playerId: string): Promise<number> {
        const result = await Recording.aggregate([
            { $match: { playerId, status: { $ne: 'deleted' } } },
            { $group: { _id: null, total: { $sum: '$fileSize' } } }
        ]);

        return result[0]?.total || 0;
    }

    /**
     * Get storage stats for a user
     */
    async getStorageStats(playerId: string): Promise<{
        used: number;
        limit: number;
        recordingCount: number;
        oldestRecording?: Date;
    }> {
        const used = await this.getUserStorageUsed(playerId);
        const count = await Recording.countDocuments({ 
            playerId, 
            status: { $ne: 'deleted' } 
        });
        
        const oldest = await Recording.findOne(
            { playerId, status: { $ne: 'deleted' } },
            { createdAt: 1 },
            { sort: { createdAt: 1 } }
        );

        return {
            used,
            limit: this.config.maxStoragePerUser,
            recordingCount: count,
            oldestRecording: oldest?.createdAt
        };
    }

    // =========================================================================
    // CLEANUP
    // =========================================================================

    /**
     * Cleanup expired recordings (called by cron job)
     */
    async cleanupExpiredRecordings(): Promise<number> {
        const result = await Recording.deleteMany({
            expiresAt: { $lt: new Date() }
        });

        if (result.deletedCount > 0) {
            console.log(`🗑️ Cleaned up ${result.deletedCount} expired recordings`);
        }

        return result.deletedCount;
    }
}

export const mediaStorageService = new MediaStorageService();
