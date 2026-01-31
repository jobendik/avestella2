// Analytics Service - Tracks player behavior, events, and provides insights
// For admin dashboards and player statistics

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// DATABASE MODELS
// ============================================

export interface IPlayerAnalytics extends Document {
    playerId: string;
    totalPlaytime: number;          // Minutes
    sessionsCount: number;
    lastSessionStart: Date | null;
    lastSessionEnd: Date | null;
    averageSessionLength: number;   // Minutes
    longestSession: number;         // Minutes

    // Activity tracking
    dailyActivity: {
        date: string;               // YYYY-MM-DD
        playtime: number;           // Minutes
        actions: number;
        xpEarned: number;
        stardustEarned: number;
    }[];

    // Milestones
    milestones: {
        type: string;
        achievedAt: Date;
        value: number;
    }[];

    // Event log (recent events)
    recentEvents: {
        type: string;
        timestamp: Date;
        data: any;
    }[];

    // Retention metrics
    firstPlayDate: Date;
    lastActiveDate: Date;
    daysActive: number;
    currentStreak: number;

    createdAt: Date;
    updatedAt: Date;
}

const PlayerAnalyticsSchema = new Schema<IPlayerAnalytics>({
    playerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    totalPlaytime: { type: Number, default: 0, min: 0 },
    sessionsCount: { type: Number, default: 0, min: 0 },
    lastSessionStart: { type: Date, default: null },
    lastSessionEnd: { type: Date, default: null },
    averageSessionLength: { type: Number, default: 0 },
    longestSession: { type: Number, default: 0 },

    dailyActivity: [{
        date: { type: String, required: true },
        playtime: { type: Number, default: 0 },
        actions: { type: Number, default: 0 },
        xpEarned: { type: Number, default: 0 },
        stardustEarned: { type: Number, default: 0 }
    }],

    milestones: [{
        type: { type: String, required: true },
        achievedAt: { type: Date, default: Date.now },
        value: { type: Number, default: 0 }
    }],

    recentEvents: [{
        type: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        data: { type: Schema.Types.Mixed }
    }],

    firstPlayDate: { type: Date, default: Date.now },
    lastActiveDate: { type: Date, default: Date.now },
    daysActive: { type: Number, default: 1 },
    currentStreak: { type: Number, default: 1 }
}, {
    timestamps: true,
    collection: 'player_analytics'
});

// Limit recent events to last 100
PlayerAnalyticsSchema.pre('save', function (next) {
    if (this.recentEvents.length > 100) {
        this.recentEvents = this.recentEvents.slice(-100);
    }
    if (this.dailyActivity.length > 90) {
        this.dailyActivity = this.dailyActivity.slice(-90);
    }
    next();
});

export const PlayerAnalytics: Model<IPlayerAnalytics> = mongoose.model<IPlayerAnalytics>('PlayerAnalytics', PlayerAnalyticsSchema);

// Global analytics for admin dashboard
export interface IGlobalAnalytics extends Document {
    date: string;                   // YYYY-MM-DD

    // User metrics
    dailyActiveUsers: number;
    newUsers: number;
    returningUsers: number;
    totalSessions: number;
    averageSessionLength: number;

    // Activity metrics
    totalActions: number;
    starsLit: number;
    echoesCreated: number;
    connectionsFormed: number;
    messagesExchanged: number;

    // Economy metrics
    stardustEarned: number;
    stardustSpent: number;
    crystalsPurchased: number;
    crystalsSpent: number;

    // Social metrics
    friendsAdded: number;
    guildsCreated: number;
    guildJoins: number;
    giftsExchanged: number;

    // Realm distribution
    realmActivity: {
        genesis: number;
        nebula: number;
        void: number;
        starforge: number;
        sanctuary: number;
    };

    createdAt: Date;
}

const GlobalAnalyticsSchema = new Schema<IGlobalAnalytics>({
    date: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    dailyActiveUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    returningUsers: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    averageSessionLength: { type: Number, default: 0 },

    totalActions: { type: Number, default: 0 },
    starsLit: { type: Number, default: 0 },
    echoesCreated: { type: Number, default: 0 },
    connectionsFormed: { type: Number, default: 0 },
    messagesExchanged: { type: Number, default: 0 },

    stardustEarned: { type: Number, default: 0 },
    stardustSpent: { type: Number, default: 0 },
    crystalsPurchased: { type: Number, default: 0 },
    crystalsSpent: { type: Number, default: 0 },

    friendsAdded: { type: Number, default: 0 },
    guildsCreated: { type: Number, default: 0 },
    guildJoins: { type: Number, default: 0 },
    giftsExchanged: { type: Number, default: 0 },

    realmActivity: {
        genesis: { type: Number, default: 0 },
        nebula: { type: Number, default: 0 },
        void: { type: Number, default: 0 },
        starforge: { type: Number, default: 0 },
        sanctuary: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
    collection: 'global_analytics'
});

export const GlobalAnalytics: Model<IGlobalAnalytics> = mongoose.model<IGlobalAnalytics>('GlobalAnalytics', GlobalAnalyticsSchema);

// ============================================
// ANALYTICS SERVICE CLASS
// ============================================

function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

export class AnalyticsService {
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('📊 Analytics service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    // ========================================
    // PLAYER ANALYTICS
    // ========================================

    async getOrCreatePlayerAnalytics(playerId: string): Promise<IPlayerAnalytics> {
        let analytics = await PlayerAnalytics.findOne({ playerId });

        if (!analytics) {
            analytics = new PlayerAnalytics({
                playerId,
                firstPlayDate: new Date(),
                lastActiveDate: new Date(),
                daysActive: 1,
                currentStreak: 1
            });
            await analytics.save();

            // Track new user globally
            await this.incrementGlobalStat('newUsers', 1);
        }

        return analytics;
    }

    async startSession(playerId: string): Promise<void> {
        const analytics = await this.getOrCreatePlayerAnalytics(playerId);

        analytics.sessionsCount++;
        analytics.lastSessionStart = new Date();

        // Update daily activity
        const today = getTodayString();
        const todayActivity = analytics.dailyActivity.find(d => d.date === today);
        if (!todayActivity) {
            analytics.dailyActivity.push({
                date: today,
                playtime: 0,
                actions: 0,
                xpEarned: 0,
                stardustEarned: 0
            });
        }

        // Update streak
        const lastActive = analytics.lastActiveDate;
        const now = new Date();
        const daysSinceLastActive = Math.floor((now.getTime() - lastActive.getTime()) / (24 * 60 * 60 * 1000));

        if (daysSinceLastActive === 1) {
            analytics.currentStreak++;
        } else if (daysSinceLastActive > 1) {
            analytics.currentStreak = 1;
        }

        analytics.lastActiveDate = now;
        analytics.daysActive++;

        await analytics.save();

        // Track global session
        await this.incrementGlobalStat('totalSessions', 1);
        await this.incrementGlobalStat('dailyActiveUsers', 1);
    }

    async endSession(playerId: string): Promise<void> {
        const analytics = await PlayerAnalytics.findOne({ playerId });
        if (!analytics || !analytics.lastSessionStart) return;

        const sessionLength = Math.floor((Date.now() - analytics.lastSessionStart.getTime()) / (60 * 1000));

        analytics.totalPlaytime += sessionLength;
        analytics.lastSessionEnd = new Date();

        // Update average
        analytics.averageSessionLength = Math.floor(analytics.totalPlaytime / analytics.sessionsCount);

        // Update longest
        if (sessionLength > analytics.longestSession) {
            analytics.longestSession = sessionLength;
        }

        // Update daily playtime
        const today = getTodayString();
        const todayActivity = analytics.dailyActivity.find(d => d.date === today);
        if (todayActivity) {
            todayActivity.playtime += sessionLength;
        }

        await analytics.save();
    }

    async trackEvent(playerId: string, eventType: string, data?: any): Promise<void> {
        const analytics = await this.getOrCreatePlayerAnalytics(playerId);

        analytics.recentEvents.push({
            type: eventType,
            timestamp: new Date(),
            data
        });

        // Update daily actions
        const today = getTodayString();
        const todayActivity = analytics.dailyActivity.find(d => d.date === today);
        if (todayActivity) {
            todayActivity.actions++;
        }

        await analytics.save();

        // Track globally
        await this.incrementGlobalStat('totalActions', 1);
    }

    async trackXPEarned(playerId: string, amount: number): Promise<void> {
        const analytics = await this.getOrCreatePlayerAnalytics(playerId);
        const today = getTodayString();

        const todayActivity = analytics.dailyActivity.find(d => d.date === today);
        if (todayActivity) {
            todayActivity.xpEarned += amount;
        }

        await analytics.save();
    }

    async trackStardustEarned(playerId: string, amount: number): Promise<void> {
        const analytics = await this.getOrCreatePlayerAnalytics(playerId);
        const today = getTodayString();

        const todayActivity = analytics.dailyActivity.find(d => d.date === today);
        if (todayActivity) {
            todayActivity.stardustEarned += amount;
        }

        await analytics.save();
        await this.incrementGlobalStat('stardustEarned', amount);
    }

    async addMilestone(playerId: string, type: string, value: number): Promise<void> {
        const analytics = await this.getOrCreatePlayerAnalytics(playerId);

        analytics.milestones.push({
            type,
            achievedAt: new Date(),
            value
        });

        await analytics.save();
    }

    async getPlayerStats(playerId: string): Promise<{
        totalPlaytime: number;
        sessionsCount: number;
        averageSessionLength: number;
        longestSession: number;
        daysActive: number;
        currentStreak: number;
        recentActivity: any[];
    }> {
        const analytics = await this.getOrCreatePlayerAnalytics(playerId);

        return {
            totalPlaytime: analytics.totalPlaytime,
            sessionsCount: analytics.sessionsCount,
            averageSessionLength: analytics.averageSessionLength,
            longestSession: analytics.longestSession,
            daysActive: analytics.daysActive,
            currentStreak: analytics.currentStreak,
            recentActivity: analytics.dailyActivity.slice(-7)
        };
    }

    // ========================================
    // GLOBAL ANALYTICS
    // ========================================

    async getOrCreateGlobalAnalytics(): Promise<IGlobalAnalytics> {
        const today = getTodayString();
        let analytics = await GlobalAnalytics.findOne({ date: today });

        if (!analytics) {
            analytics = new GlobalAnalytics({ date: today });
            await analytics.save();
        }

        return analytics;
    }

    async incrementGlobalStat(stat: string, amount: number): Promise<void> {
        const today = getTodayString();
        await GlobalAnalytics.findOneAndUpdate(
            { date: today },
            { $inc: { [stat]: amount } },
            { upsert: true }
        );
    }

    async trackRealmActivity(realm: string): Promise<void> {
        const validRealms = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];
        if (!validRealms.includes(realm)) return;

        const today = getTodayString();
        await GlobalAnalytics.findOneAndUpdate(
            { date: today },
            { $inc: { [`realmActivity.${realm}`]: 1 } },
            { upsert: true }
        );
    }

    async getGlobalStats(days: number = 7): Promise<IGlobalAnalytics[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        return GlobalAnalytics.find({ date: { $gte: startDateStr } })
            .sort({ date: -1 })
            .lean() as unknown as IGlobalAnalytics[];
    }

    async trackAmbientModeSession(playerId: string, mode: string, duration: number): Promise<void> {
        const analytics = await this.getOrCreatePlayerAnalytics(playerId);

        analytics.recentEvents.push({
            type: 'ambient_session',
            timestamp: new Date(),
            data: { mode, duration }
        });

        // Also track as a general action
        analytics.dailyActivity[analytics.dailyActivity.length - 1].actions++;

        await analytics.save();

        // Track globally
        await this.incrementGlobalStat('totalActions', 1);
    }

    async getDashboardSummary(): Promise<{
        today: IGlobalAnalytics | null;
        weeklyTotals: {
            dau: number;
            newUsers: number;
            sessions: number;
            starsLit: number;
            connections: number;
        };
        trends: {
            dauChange: number;
            newUsersChange: number;
        };
    }> {
        const today = await this.getOrCreateGlobalAnalytics();
        const weeklyStats = await this.getGlobalStats(7);

        const weeklyTotals = {
            dau: 0,
            newUsers: 0,
            sessions: 0,
            starsLit: 0,
            connections: 0
        };

        for (const day of weeklyStats) {
            weeklyTotals.dau += day.dailyActiveUsers;
            weeklyTotals.newUsers += day.newUsers;
            weeklyTotals.sessions += day.totalSessions;
            weeklyTotals.starsLit += day.starsLit;
            weeklyTotals.connections += day.connectionsFormed;
        }

        // Calculate week-over-week trends
        const previousWeekStats = await this.getGlobalStats(14);
        const prevWeekDau = previousWeekStats.slice(7).reduce((sum, d) => sum + d.dailyActiveUsers, 0);
        const thisWeekDau = previousWeekStats.slice(0, 7).reduce((sum, d) => sum + d.dailyActiveUsers, 0);

        const dauChange = prevWeekDau > 0 ? ((thisWeekDau - prevWeekDau) / prevWeekDau) * 100 : 0;

        const prevWeekNewUsers = previousWeekStats.slice(7).reduce((sum, d) => sum + d.newUsers, 0);
        const thisWeekNewUsers = previousWeekStats.slice(0, 7).reduce((sum, d) => sum + d.newUsers, 0);

        const newUsersChange = prevWeekNewUsers > 0 ? ((thisWeekNewUsers - prevWeekNewUsers) / prevWeekNewUsers) * 100 : 0;

        return {
            today,
            weeklyTotals,
            trends: {
                dauChange: Math.round(dauChange * 10) / 10,
                newUsersChange: Math.round(newUsersChange * 10) / 10
            }
        };
    }

    // ========================================
    // RETENTION ANALYSIS
    // ========================================

    async getRetentionCohort(startDate: string, days: number): Promise<{
        cohortSize: number;
        retention: number[];
    }> {
        // Get players who started on startDate
        const cohortPlayers = await PlayerAnalytics.find({
            firstPlayDate: {
                $gte: new Date(startDate),
                $lt: new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000)
            }
        }).select('playerId dailyActivity').lean();

        const cohortSize = cohortPlayers.length;
        if (cohortSize === 0) return { cohortSize: 0, retention: [] };

        const retention: number[] = [];
        const startDateObj = new Date(startDate);

        for (let d = 1; d <= days; d++) {
            const targetDate = new Date(startDateObj.getTime() + d * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0];

            let activeCount = 0;
            for (const player of cohortPlayers) {
                if (player.dailyActivity.some((a: any) => a.date === targetDate)) {
                    activeCount++;
                }
            }

            retention.push(Math.round((activeCount / cohortSize) * 100));
        }

        return { cohortSize, retention };
    }
}

export const analyticsService = new AnalyticsService();
