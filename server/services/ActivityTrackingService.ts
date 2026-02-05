// =============================================================================
// ActivityTrackingService - Server-Side Player Activity Tracking
// =============================================================================
// Tracks player activity, session metrics, engagement patterns, and provides
// data for analytics, retention analysis, and personalized experiences.
//
// Features:
// - Session tracking (login/logout, duration)
// - Activity heatmaps (where players spend time)
// - Engagement metrics (actions per minute, interaction patterns)
// - Retention analysis (daily/weekly active users)
// - Achievement progress tracking
// - Feature usage analytics
// =============================================================================

import { EventEmitter } from 'events';

export interface PlayerSession {
    playerId: string;
    sessionId: string;
    startTime: number;
    endTime: number | null;
    realm: string;
    actions: number;
    interactions: number;
    distanceTraveled: number;
    starsTouched: number;
    echosCreated: number;
    chatMessages: number;
    achievements: string[];
    lastActivity: number;
}

export interface ActivityMetrics {
    playerId: string;
    totalSessions: number;
    totalPlayTime: number;           // milliseconds
    averageSessionLength: number;    // milliseconds
    longestSession: number;          // milliseconds
    lastSeen: number;
    firstSeen: number;
    totalActions: number;
    totalInteractions: number;
    favoriteRealm: string;
    realmVisits: Record<string, number>;
    actionsPerMinute: number;
    retentionDays: number[];         // Days since first seen that they played
}

export interface ActivitySnapshot {
    timestamp: number;
    activePlayerCount: number;
    realmCounts: Record<string, number>;
    actionsPerMinute: number;
    averageSessionAge: number;
}

export interface EngagementEvent {
    type: 'action' | 'interaction' | 'achievement' | 'social' | 'economy' | 'exploration';
    playerId: string;
    eventName: string;
    data?: Record<string, any>;
    timestamp: number;
}

export class ActivityTrackingService extends EventEmitter {
    private static instance: ActivityTrackingService;

    // Active sessions
    private activeSessions: Map<string, PlayerSession> = new Map();

    // Historical metrics (in production, this would be in the database)
    private playerMetrics: Map<string, ActivityMetrics> = new Map();

    // Recent events for real-time analytics
    private recentEvents: EngagementEvent[] = [];
    private readonly MAX_RECENT_EVENTS = 1000;

    // Snapshots for historical analysis
    private snapshots: ActivitySnapshot[] = [];
    private readonly MAX_SNAPSHOTS = 288; // 24 hours at 5-minute intervals

    private snapshotInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private ready = false;

    private readonly SNAPSHOT_RATE = 5 * 60 * 1000;  // 5 minutes
    private readonly CLEANUP_RATE = 60 * 60 * 1000;  // 1 hour
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes inactivity

    // Singleton
    static getInstance(): ActivityTrackingService {
        if (!ActivityTrackingService.instance) {
            ActivityTrackingService.instance = new ActivityTrackingService();
        }
        return ActivityTrackingService.instance;
    }

    async initialize(): Promise<void> {
        if (this.ready) return;

        // Start snapshot interval
        this.snapshotInterval = setInterval(() => {
            this.captureSnapshot();
        }, this.SNAPSHOT_RATE);

        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleSessions();
        }, this.CLEANUP_RATE);

        // Capture initial snapshot
        this.captureSnapshot();

        this.ready = true;
        console.log('📊 ActivityTrackingService initialized');
    }

    // =========================================================================
    // Session Management
    // =========================================================================

    /**
     * Start a new player session
     */
    startSession(playerId: string, realm: string): PlayerSession {
        // End any existing session
        if (this.activeSessions.has(playerId)) {
            this.endSession(playerId);
        }

        const session: PlayerSession = {
            playerId,
            sessionId: `${playerId}_${Date.now()}`,
            startTime: Date.now(),
            endTime: null,
            realm,
            actions: 0,
            interactions: 0,
            distanceTraveled: 0,
            starsTouched: 0,
            echosCreated: 0,
            chatMessages: 0,
            achievements: [],
            lastActivity: Date.now()
        };

        this.activeSessions.set(playerId, session);

        // Update player metrics
        this.ensurePlayerMetrics(playerId);
        const metrics = this.playerMetrics.get(playerId)!;
        metrics.totalSessions++;
        metrics.lastSeen = Date.now();
        metrics.realmVisits[realm] = (metrics.realmVisits[realm] || 0) + 1;

        this.emit('session_started', { playerId, sessionId: session.sessionId });

        return session;
    }

    /**
     * End a player session
     */
    endSession(playerId: string): PlayerSession | null {
        const session = this.activeSessions.get(playerId);
        if (!session) return null;

        session.endTime = Date.now();
        const duration = session.endTime - session.startTime;

        // Update metrics
        const metrics = this.playerMetrics.get(playerId);
        if (metrics) {
            metrics.totalPlayTime += duration;
            metrics.averageSessionLength = metrics.totalPlayTime / metrics.totalSessions;
            if (duration > metrics.longestSession) {
                metrics.longestSession = duration;
            }
            metrics.totalActions += session.actions;
            metrics.totalInteractions += session.interactions;

            // Calculate actions per minute
            const minutes = duration / 60000;
            if (minutes > 0) {
                const sessionAPM = session.actions / minutes;
                // Weighted average with existing APM
                metrics.actionsPerMinute = (metrics.actionsPerMinute * 0.9) + (sessionAPM * 0.1);
            }

            // Update favorite realm
            let maxVisits = 0;
            let favorite = 'nexus';
            for (const [realm, visits] of Object.entries(metrics.realmVisits)) {
                if (visits > maxVisits) {
                    maxVisits = visits;
                    favorite = realm;
                }
            }
            metrics.favoriteRealm = favorite;

            // Track retention
            const daysSinceFirst = Math.floor((Date.now() - metrics.firstSeen) / (24 * 60 * 60 * 1000));
            if (!metrics.retentionDays.includes(daysSinceFirst)) {
                metrics.retentionDays.push(daysSinceFirst);
            }
        }

        this.activeSessions.delete(playerId);

        this.emit('session_ended', {
            playerId,
            sessionId: session.sessionId,
            duration,
            stats: {
                actions: session.actions,
                interactions: session.interactions,
                distanceTraveled: session.distanceTraveled
            }
        });

        return session;
    }

    /**
     * Get active session for a player
     */
    getSession(playerId: string): PlayerSession | null {
        return this.activeSessions.get(playerId) || null;
    }

    // =========================================================================
    // Activity Tracking
    // =========================================================================

    /**
     * Record a player action
     */
    recordAction(playerId: string, actionType: string, data?: Record<string, any>): void {
        const session = this.activeSessions.get(playerId);
        if (session) {
            session.actions++;
            session.lastActivity = Date.now();
        }

        this.addEvent({
            type: 'action',
            playerId,
            eventName: actionType,
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Record a player interaction (with other players)
     */
    recordInteraction(playerId: string, interactionType: string, targetPlayerId?: string, data?: Record<string, any>): void {
        const session = this.activeSessions.get(playerId);
        if (session) {
            session.interactions++;
            session.lastActivity = Date.now();
        }

        this.addEvent({
            type: 'interaction',
            playerId,
            eventName: interactionType,
            data: { ...data, targetPlayerId },
            timestamp: Date.now()
        });

        this.emit('player_interaction', { playerId, interactionType, targetPlayerId });
    }

    /**
     * Record distance traveled
     */
    recordMovement(playerId: string, distance: number): void {
        const session = this.activeSessions.get(playerId);
        if (session) {
            session.distanceTraveled += distance;
            session.lastActivity = Date.now();
        }
    }

    /**
     * Record star touched
     */
    recordStarTouch(playerId: string): void {
        const session = this.activeSessions.get(playerId);
        if (session) {
            session.starsTouched++;
            session.lastActivity = Date.now();
        }

        this.recordAction(playerId, 'star_touch');
    }

    /**
     * Record echo created
     */
    recordEchoCreated(playerId: string, echoType?: string): void {
        const session = this.activeSessions.get(playerId);
        if (session) {
            session.echosCreated++;
            session.lastActivity = Date.now();
        }

        this.recordAction(playerId, 'echo_created', { echoType });
    }

    /**
     * Record chat message
     */
    recordChatMessage(playerId: string, messageType: 'global' | 'realm' | 'whisper' | 'guild'): void {
        const session = this.activeSessions.get(playerId);
        if (session) {
            session.chatMessages++;
            session.lastActivity = Date.now();
        }

        this.addEvent({
            type: 'social',
            playerId,
            eventName: 'chat_message',
            data: { messageType },
            timestamp: Date.now()
        });
    }

    /**
     * Record achievement earned
     */
    recordAchievement(playerId: string, achievementId: string): void {
        const session = this.activeSessions.get(playerId);
        if (session) {
            session.achievements.push(achievementId);
            session.lastActivity = Date.now();
        }

        this.addEvent({
            type: 'achievement',
            playerId,
            eventName: 'achievement_earned',
            data: { achievementId },
            timestamp: Date.now()
        });

        this.emit('achievement_earned', { playerId, achievementId });
    }

    /**
     * Record realm change
     */
    recordRealmChange(playerId: string, fromRealm: string, toRealm: string): void {
        const session = this.activeSessions.get(playerId);
        if (session) {
            session.realm = toRealm;
            session.lastActivity = Date.now();
        }

        // Update realm visit count
        const metrics = this.playerMetrics.get(playerId);
        if (metrics) {
            metrics.realmVisits[toRealm] = (metrics.realmVisits[toRealm] || 0) + 1;
        }

        this.addEvent({
            type: 'exploration',
            playerId,
            eventName: 'realm_change',
            data: { fromRealm, toRealm },
            timestamp: Date.now()
        });
    }

    /**
     * Record economy event (purchase, earn, spend)
     */
    recordEconomyEvent(playerId: string, eventType: string, currency: string, amount: number, itemId?: string): void {
        this.addEvent({
            type: 'economy',
            playerId,
            eventName: eventType,
            data: { currency, amount, itemId },
            timestamp: Date.now()
        });
    }

    // =========================================================================
    // Analytics Queries
    // =========================================================================

    /**
     * Get player metrics
     */
    getPlayerMetrics(playerId: string): ActivityMetrics | null {
        return this.playerMetrics.get(playerId) || null;
    }

    /**
     * Get all active sessions
     */
    getActiveSessions(): PlayerSession[] {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Get current active player count
     */
    getActivePlayerCount(): number {
        return this.activeSessions.size;
    }

    /**
     * Get players by realm
     */
    getPlayersByRealm(): Record<string, number> {
        const counts: Record<string, number> = {};
        this.activeSessions.forEach(session => {
            counts[session.realm] = (counts[session.realm] || 0) + 1;
        });
        return counts;
    }

    /**
     * Get recent events for real-time dashboard
     */
    getRecentEvents(count: number = 50, eventType?: string): EngagementEvent[] {
        let events = this.recentEvents;
        if (eventType) {
            events = events.filter(e => e.type === eventType);
        }
        return events.slice(-count);
    }

    /**
     * Get historical snapshots
     */
    getSnapshots(count: number = 24): ActivitySnapshot[] {
        return this.snapshots.slice(-count);
    }

    /**
     * Get daily active users (DAU) - players who have played in last 24 hours
     */
    getDailyActiveUsers(): number {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        let count = 0;
        this.playerMetrics.forEach(metrics => {
            if (metrics.lastSeen >= oneDayAgo) {
                count++;
            }
        });
        return count;
    }

    /**
     * Get weekly active users (WAU) - players who have played in last 7 days
     */
    getWeeklyActiveUsers(): number {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        let count = 0;
        this.playerMetrics.forEach(metrics => {
            if (metrics.lastSeen >= oneWeekAgo) {
                count++;
            }
        });
        return count;
    }

    /**
     * Get average session length
     */
    getAverageSessionLength(): number {
        let total = 0;
        let count = 0;
        this.playerMetrics.forEach(metrics => {
            if (metrics.totalSessions > 0) {
                total += metrics.averageSessionLength;
                count++;
            }
        });
        return count > 0 ? total / count : 0;
    }

    /**
     * Get engagement score for a player (0-100)
     */
    getEngagementScore(playerId: string): number {
        const metrics = this.playerMetrics.get(playerId);
        if (!metrics) return 0;

        // Factors:
        // - Recency (when last played)
        // - Frequency (sessions in last week)
        // - Intensity (actions per minute)
        // - Social (interactions)
        // - Retention (days played)

        const now = Date.now();
        const daysSinceLastPlay = (now - metrics.lastSeen) / (24 * 60 * 60 * 1000);
        const recencyScore = Math.max(0, 100 - daysSinceLastPlay * 5); // -5 per day

        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const recentDays = metrics.retentionDays.filter(d => {
            const dayTimestamp = metrics.firstSeen + d * 24 * 60 * 60 * 1000;
            return dayTimestamp >= oneWeekAgo;
        }).length;
        const frequencyScore = Math.min(100, recentDays * 14.3); // 7 days = 100

        const intensityScore = Math.min(100, metrics.actionsPerMinute * 5); // 20 APM = 100

        const interactionRatio = metrics.totalInteractions / Math.max(1, metrics.totalActions);
        const socialScore = Math.min(100, interactionRatio * 200); // 50% interactions = 100

        const retentionScore = Math.min(100, metrics.retentionDays.length * 3.33); // 30 days = 100

        // Weighted average
        return Math.round(
            recencyScore * 0.25 +
            frequencyScore * 0.25 +
            intensityScore * 0.2 +
            socialScore * 0.15 +
            retentionScore * 0.15
        );
    }

    /**
     * Get top engaged players
     */
    getTopEngagedPlayers(count: number = 10): Array<{ playerId: string; score: number }> {
        const scores: Array<{ playerId: string; score: number }> = [];

        this.playerMetrics.forEach((_, playerId) => {
            scores.push({
                playerId,
                score: this.getEngagementScore(playerId)
            });
        });

        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, count);
    }

    // =========================================================================
    // Internal Methods
    // =========================================================================

    private ensurePlayerMetrics(playerId: string): void {
        if (!this.playerMetrics.has(playerId)) {
            this.playerMetrics.set(playerId, {
                playerId,
                totalSessions: 0,
                totalPlayTime: 0,
                averageSessionLength: 0,
                longestSession: 0,
                lastSeen: Date.now(),
                firstSeen: Date.now(),
                totalActions: 0,
                totalInteractions: 0,
                favoriteRealm: 'nexus',
                realmVisits: {},
                actionsPerMinute: 0,
                retentionDays: []
            });
        }
    }

    private addEvent(event: EngagementEvent): void {
        this.recentEvents.push(event);

        // Trim if too many
        if (this.recentEvents.length > this.MAX_RECENT_EVENTS) {
            this.recentEvents = this.recentEvents.slice(-this.MAX_RECENT_EVENTS);
        }

        this.emit('activity_event', event);
    }

    private captureSnapshot(): void {
        const snapshot: ActivitySnapshot = {
            timestamp: Date.now(),
            activePlayerCount: this.activeSessions.size,
            realmCounts: this.getPlayersByRealm(),
            actionsPerMinute: this.calculateCurrentAPM(),
            averageSessionAge: this.calculateAverageSessionAge()
        };

        this.snapshots.push(snapshot);

        // Trim old snapshots
        if (this.snapshots.length > this.MAX_SNAPSHOTS) {
            this.snapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS);
        }

        this.emit('snapshot_captured', snapshot);
    }

    private calculateCurrentAPM(): number {
        const oneMinuteAgo = Date.now() - 60 * 1000;
        const recentActions = this.recentEvents.filter(
            e => e.type === 'action' && e.timestamp >= oneMinuteAgo
        ).length;
        return recentActions;
    }

    private calculateAverageSessionAge(): number {
        if (this.activeSessions.size === 0) return 0;

        const now = Date.now();
        let totalAge = 0;
        this.activeSessions.forEach(session => {
            totalAge += now - session.startTime;
        });

        return totalAge / this.activeSessions.size;
    }

    private cleanupStaleSessions(): void {
        const now = Date.now();
        const staleIds: string[] = [];

        this.activeSessions.forEach((session, playerId) => {
            if (now - session.lastActivity > this.SESSION_TIMEOUT) {
                staleIds.push(playerId);
            }
        });

        staleIds.forEach(playerId => {
            console.log(`🧹 Cleaning up stale session for ${playerId}`);
            this.endSession(playerId);
        });

        if (staleIds.length > 0) {
            console.log(`📊 Cleaned up ${staleIds.length} stale sessions`);
        }
    }

    /**
     * Shutdown the service
     */
    shutdown(): void {
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
            this.snapshotInterval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // End all active sessions
        this.activeSessions.forEach((_, playerId) => {
            this.endSession(playerId);
        });

        this.ready = false;
        console.log('📊 ActivityTrackingService shutdown');
    }
    /**
     * Track a specific activity
     */
    async trackActivity(playerId: string, activityType: string, _data?: any): Promise<void> {
        this.ensurePlayerMetrics(playerId);
        const metrics = this.playerMetrics.get(playerId);
        if (metrics) {
            metrics.totalActions++;
            metrics.lastSeen = Date.now();
        }
    }
}

// Export singleton instance
export const activityTrackingService = ActivityTrackingService.getInstance();
