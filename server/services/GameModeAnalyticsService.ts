// =============================================================================
// Game Mode Analytics Service - Track game mode usage and preferences
// =============================================================================
// Phase 3.4-3.6: Analytics for game modes, filters, and ambient mode
// =============================================================================

import { EventEmitter } from 'events';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { analyticsService } from './AnalyticsService.js';

// ============================================
// PLAYER PREFERENCES MODEL
// ============================================

export interface IPlayerPreferences extends Document {
    playerId: string;
    visualFilters: {
        enabled: boolean;
        preset: string;
        customSettings?: {
            brightness: number;
            contrast: number;
            saturation: number;
            blur: number;
            vignette: number;
            colorTint: string;
        };
    };
    audioSettings: {
        masterVolume: number;
        musicVolume: number;
        sfxVolume: number;
        voiceVolume: number;
        ambientVolume: number;
    };
    accessibility: {
        reducedMotion: boolean;
        highContrast: boolean;
        colorBlindMode: string | null;
        screenReader: boolean;
        subtitles: boolean;
    };
    gameplayPreferences: {
        autoJoinEvents: boolean;
        showPlayerNames: boolean;
        showPlayerCount: boolean;
        defaultRealm: string;
        preferredGameModes: string[];
    };
    notifications: {
        friendOnline: boolean;
        eventStart: boolean;
        giftReceived: boolean;
        achievementUnlocked: boolean;
        questComplete: boolean;
    };
    updatedAt: Date;
}

const PlayerPreferencesSchema = new Schema<IPlayerPreferences>({
    playerId: { type: String, required: true, unique: true, index: true },
    visualFilters: {
        enabled: { type: Boolean, default: false },
        preset: { type: String, default: 'default' },
        customSettings: {
            brightness: { type: Number, default: 1 },
            contrast: { type: Number, default: 1 },
            saturation: { type: Number, default: 1 },
            blur: { type: Number, default: 0 },
            vignette: { type: Number, default: 0 },
            colorTint: { type: String, default: '#ffffff' }
        }
    },
    audioSettings: {
        masterVolume: { type: Number, default: 1 },
        musicVolume: { type: Number, default: 0.7 },
        sfxVolume: { type: Number, default: 0.8 },
        voiceVolume: { type: Number, default: 1 },
        ambientVolume: { type: Number, default: 0.5 }
    },
    accessibility: {
        reducedMotion: { type: Boolean, default: false },
        highContrast: { type: Boolean, default: false },
        colorBlindMode: { type: String, default: null },
        screenReader: { type: Boolean, default: false },
        subtitles: { type: Boolean, default: true }
    },
    gameplayPreferences: {
        autoJoinEvents: { type: Boolean, default: true },
        showPlayerNames: { type: Boolean, default: true },
        showPlayerCount: { type: Boolean, default: true },
        defaultRealm: { type: String, default: 'genesis' },
        preferredGameModes: [{ type: String }]
    },
    notifications: {
        friendOnline: { type: Boolean, default: true },
        eventStart: { type: Boolean, default: true },
        giftReceived: { type: Boolean, default: true },
        achievementUnlocked: { type: Boolean, default: true },
        questComplete: { type: Boolean, default: true }
    },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'playerPreferences' });

const PlayerPreferences = (mongoose.models.PlayerPreferences ||
    mongoose.model<IPlayerPreferences>('PlayerPreferences', PlayerPreferencesSchema)) as Model<IPlayerPreferences>;

// ============================================
// GAME MODE ANALYTICS MODEL
// ============================================

interface IGameModeSession extends Document {
    sessionId: string;
    playerId: string;
    gameMode: string;
    startedAt: Date;
    endedAt: Date | null;
    duration: number;
    realm: string;
    completed: boolean;
    outcome?: 'win' | 'loss' | 'draw' | 'abandoned';
    participants?: number;
    score?: number;
    metadata?: Record<string, any>;
}

const GameModeSessionSchema = new Schema<IGameModeSession>({
    sessionId: { type: String, required: true, unique: true },
    playerId: { type: String, required: true, index: true },
    gameMode: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },
    realm: { type: String, required: true },
    completed: { type: Boolean, default: false },
    outcome: { type: String, enum: ['win', 'loss', 'draw', 'abandoned'] },
    participants: Number,
    score: Number,
    metadata: Schema.Types.Mixed
}, { collection: 'gameModesSessions' });

GameModeSessionSchema.index({ playerId: 1, gameMode: 1 });
GameModeSessionSchema.index({ startedAt: -1 });

const GameModeSession = (mongoose.models.GameModeSession ||
    mongoose.model<IGameModeSession>('GameModeSession', GameModeSessionSchema)) as Model<IGameModeSession>;

// ============================================
// AMBIENT MODE TRACKING MODEL
// ============================================

interface IAmbientSession extends Document {
    sessionId: string;
    playerId: string;
    mode: 'zen' | 'aurora' | 'stargazing' | 'campfire' | 'custom';
    startedAt: Date;
    endedAt: Date | null;
    duration: number;
    realm: string;
    settings: {
        musicTrack?: string;
        visualPreset?: string;
        particleDensity?: number;
    };
}

const AmbientSessionSchema = new Schema<IAmbientSession>({
    sessionId: { type: String, required: true, unique: true },
    playerId: { type: String, required: true, index: true },
    mode: {
        type: String,
        enum: ['zen', 'aurora', 'stargazing', 'campfire', 'custom'],
        required: true
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },
    realm: { type: String, required: true },
    settings: {
        musicTrack: String,
        visualPreset: String,
        particleDensity: Number
    }
}, { collection: 'ambientSessions' });

AmbientSessionSchema.index({ playerId: 1, mode: 1 });

const AmbientSession = (mongoose.models.AmbientSession ||
    mongoose.model<IAmbientSession>('AmbientSession', AmbientSessionSchema)) as Model<IAmbientSession>;

// ============================================
// GAME MODE ANALYTICS SERVICE
// ============================================

class GameModeAnalyticsService extends EventEmitter {
    private initialized: boolean = false;
    private activeSessions: Map<string, { sessionId: string; type: 'gameMode' | 'ambient' }> = new Map();

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('📊 Game mode analytics service initialized');
    }

    // =========================================================================
    // PLAYER PREFERENCES
    // =========================================================================

    async getPlayerPreferences(playerId: string): Promise<IPlayerPreferences> {
        let prefs = await PlayerPreferences.findOne({ playerId });

        if (!prefs) {
            prefs = await PlayerPreferences.create({ playerId });
        }

        return prefs;
    }

    async updatePreferences(
        playerId: string,
        updates: Partial<IPlayerPreferences>
    ): Promise<IPlayerPreferences | null> {
        const result = await PlayerPreferences.findOneAndUpdate(
            { playerId },
            { ...updates, updatedAt: new Date() },
            { new: true, upsert: true }
        );

        this.emit('preferences_updated', { playerId, updates });
        return result;
    }

    async updateVisualFilters(
        playerId: string,
        filters: IPlayerPreferences['visualFilters']
    ): Promise<void> {
        await PlayerPreferences.findOneAndUpdate(
            { playerId },
            { visualFilters: filters, updatedAt: new Date() },
            { upsert: true }
        );

        this.emit('visual_filters_changed', { playerId, filters });
    }

    // =========================================================================
    // GAME MODE TRACKING
    // =========================================================================

    async startGameModeSession(
        playerId: string,
        gameMode: string,
        realm: string,
        metadata?: Record<string, any>
    ): Promise<string> {
        const sessionId = `gm_${Date.now()}_${playerId}`;

        await GameModeSession.create({
            sessionId,
            playerId,
            gameMode,
            startedAt: new Date(),
            realm,
            metadata
        });

        this.activeSessions.set(playerId, { sessionId, type: 'gameMode' });
        this.emit('game_mode_started', { playerId, gameMode, sessionId });

        return sessionId;
    }

    async endGameModeSession(
        playerId: string,
        outcome?: 'win' | 'loss' | 'draw' | 'abandoned',
        score?: number
    ): Promise<void> {
        const active = this.activeSessions.get(playerId);
        if (!active || active.type !== 'gameMode') return;

        const session = await GameModeSession.findOne({ sessionId: active.sessionId });
        if (!session) return;

        const endedAt = new Date();
        const duration = (endedAt.getTime() - session.startedAt.getTime()) / 1000;

        await GameModeSession.findOneAndUpdate(
            { sessionId: active.sessionId },
            {
                endedAt,
                duration,
                completed: outcome !== 'abandoned',
                outcome,
                score
            }
        );

        this.activeSessions.delete(playerId);
        this.emit('game_mode_ended', {
            playerId,
            gameMode: session.gameMode,
            duration,
            outcome
        });
    }

    async getGameModeStats(playerId: string): Promise<{
        totalSessions: number;
        totalPlayTime: number;
        modeBreakdown: Record<string, { sessions: number; time: number; wins: number }>;
        favoriteMode: string | null;
        recentModes: string[];
    }> {
        const sessions = await GameModeSession.find({ playerId }).lean();

        const modeBreakdown: Record<string, { sessions: number; time: number; wins: number }> = {};
        let totalPlayTime = 0;

        for (const session of sessions) {
            if (!modeBreakdown[session.gameMode]) {
                modeBreakdown[session.gameMode] = { sessions: 0, time: 0, wins: 0 };
            }
            modeBreakdown[session.gameMode].sessions++;
            modeBreakdown[session.gameMode].time += session.duration;
            if (session.outcome === 'win') {
                modeBreakdown[session.gameMode].wins++;
            }
            totalPlayTime += session.duration;
        }

        // Find favorite mode
        let favoriteMode: string | null = null;
        let maxTime = 0;
        for (const [mode, stats] of Object.entries(modeBreakdown)) {
            if (stats.time > maxTime) {
                maxTime = stats.time;
                favoriteMode = mode;
            }
        }

        // Get recent modes
        const recentSessions = await GameModeSession.find({ playerId })
            .sort({ startedAt: -1 })
            .limit(5)
            .lean();
        const recentModes = [...new Set(recentSessions.map(s => s.gameMode))];

        return {
            totalSessions: sessions.length,
            totalPlayTime,
            modeBreakdown,
            favoriteMode,
            recentModes
        };
    }

    // =========================================================================
    // AMBIENT MODE TRACKING
    // =========================================================================

    async startAmbientSession(
        playerId: string,
        mode: 'zen' | 'aurora' | 'stargazing' | 'campfire' | 'custom',
        realm: string,
        settings?: IAmbientSession['settings']
    ): Promise<string> {
        // End any existing ambient session
        await this.endAmbientSession(playerId);

        const sessionId = `amb_${Date.now()}_${playerId}`;

        await AmbientSession.create({
            sessionId,
            playerId,
            mode,
            startedAt: new Date(),
            realm,
            settings: settings || {}
        });

        this.activeSessions.set(playerId, { sessionId, type: 'ambient' });
        this.emit('ambient_started', { playerId, mode, sessionId });

        return sessionId;
    }

    async endAmbientSession(playerId: string): Promise<void> {
        const active = this.activeSessions.get(playerId);
        if (!active || active.type !== 'ambient') return;

        const session = await AmbientSession.findOne({ sessionId: active.sessionId });
        if (!session) return;

        const endedAt = new Date();
        const duration = (endedAt.getTime() - session.startedAt.getTime()) / 1000;

        await AmbientSession.findOneAndUpdate(
            { sessionId: active.sessionId },
            { endedAt, duration }
        );

        // Track in general analytics
        await analyticsService.trackAmbientModeSession(playerId, session.mode, duration);

        this.activeSessions.delete(playerId);
        this.emit('ambient_ended', { playerId, mode: session.mode, duration });
    }

    async getAmbientStats(playerId: string): Promise<{
        totalSessions: number;
        totalTime: number;
        modeBreakdown: Record<string, { sessions: number; time: number }>;
        favoriteMode: string | null;
        averageSessionLength: number;
    }> {
        const sessions = await AmbientSession.find({ playerId }).lean();

        const modeBreakdown: Record<string, { sessions: number; time: number }> = {};
        let totalTime = 0;

        for (const session of sessions) {
            if (!modeBreakdown[session.mode]) {
                modeBreakdown[session.mode] = { sessions: 0, time: 0 };
            }
            modeBreakdown[session.mode].sessions++;
            modeBreakdown[session.mode].time += session.duration;
            totalTime += session.duration;
        }

        // Find favorite mode
        let favoriteMode: string | null = null;
        let maxTime = 0;
        for (const [mode, stats] of Object.entries(modeBreakdown)) {
            if (stats.time > maxTime) {
                maxTime = stats.time;
                favoriteMode = mode;
            }
        }

        return {
            totalSessions: sessions.length,
            totalTime,
            modeBreakdown,
            favoriteMode,
            averageSessionLength: sessions.length > 0 ? totalTime / sessions.length : 0
        };
    }

    // =========================================================================
    // GLOBAL ANALYTICS
    // =========================================================================

    async getGlobalGameModeStats(): Promise<{
        totalSessions: number;
        uniquePlayers: number;
        modePopularity: Record<string, number>;
        averageSessionLength: number;
    }> {
        const totalSessions = await GameModeSession.countDocuments();
        const uniquePlayers = await GameModeSession.distinct('playerId').then(p => p.length);

        const modeAgg = await GameModeSession.aggregate([
            { $group: { _id: '$gameMode', count: { $sum: 1 } } }
        ]);

        const modePopularity: Record<string, number> = {};
        for (const mode of modeAgg) {
            modePopularity[mode._id] = mode.count;
        }

        const avgAgg = await GameModeSession.aggregate([
            { $match: { duration: { $gt: 0 } } },
            { $group: { _id: null, avg: { $avg: '$duration' } } }
        ]);

        return {
            totalSessions,
            uniquePlayers,
            modePopularity,
            averageSessionLength: avgAgg[0]?.avg || 0
        };
    }

    async getGlobalAmbientStats(): Promise<{
        totalSessions: number;
        totalTime: number;
        modePopularity: Record<string, number>;
    }> {
        const totalSessions = await AmbientSession.countDocuments();

        const totalTimeAgg = await AmbientSession.aggregate([
            { $group: { _id: null, total: { $sum: '$duration' } } }
        ]);

        const modeAgg = await AmbientSession.aggregate([
            { $group: { _id: '$mode', count: { $sum: 1 } } }
        ]);

        const modePopularity: Record<string, number> = {};
        for (const mode of modeAgg) {
            modePopularity[mode._id] = mode.count;
        }

        return {
            totalSessions,
            totalTime: totalTimeAgg[0]?.total || 0,
            modePopularity
        };
    }

    // =========================================================================
    // CLEANUP
    // =========================================================================

    async handlePlayerDisconnect(playerId: string): Promise<void> {
        // End any active sessions
        await this.endGameModeSession(playerId, 'abandoned');
        await this.endAmbientSession(playerId);
    }
}

export const gameModeAnalyticsService = new GameModeAnalyticsService();
export { PlayerPreferences, GameModeSession, AmbientSession };
