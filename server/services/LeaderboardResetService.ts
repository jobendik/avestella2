// =============================================================================
// Leaderboard Reset Service - Handles periodic leaderboard resets
// =============================================================================
// Phase 1.3 & 1.4: Weekly and Monthly Leaderboard Reset Cron Jobs
// =============================================================================

import { EventEmitter } from 'events';
import { leaderboardService } from './LeaderboardService.js';
import { notificationService } from './NotificationService.js';
import { PlayerData } from '../database/playerDataModel.js';
import { Progression } from '../database/progressionModels.js';

// Weekly/Monthly archive models
import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// ARCHIVE MODELS
// ============================================

interface ILeaderboardArchive extends Document {
    periodType: 'weekly' | 'monthly';
    periodStart: Date;
    periodEnd: Date;
    rankings: {
        rank: number;
        playerId: string;
        playerName: string;
        xp: number;
        stardust: number;
        challengesCompleted: number;
    }[];
    createdAt: Date;
}

const LeaderboardArchiveSchema = new Schema<ILeaderboardArchive>({
    periodType: { type: String, enum: ['weekly', 'monthly'], required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    rankings: [{
        rank: Number,
        playerId: String,
        playerName: String,
        xp: Number,
        stardust: Number,
        challengesCompleted: Number
    }],
    createdAt: { type: Date, default: Date.now }
}, { collection: 'leaderboardArchives' });

const LeaderboardArchive = mongoose.models.LeaderboardArchive || 
    mongoose.model<ILeaderboardArchive>('LeaderboardArchive', LeaderboardArchiveSchema);

// ============================================
// WEEKLY STATS MODEL
// ============================================

interface IWeeklyStats extends Document {
    playerId: string;
    weekStart: Date;
    xpEarned: number;
    stardustEarned: number;
    challengesCompleted: number;
    gamesPlayed: number;
    wins: number;
    updatedAt: Date;
}

const WeeklyStatsSchema = new Schema<IWeeklyStats>({
    playerId: { type: String, required: true, index: true },
    weekStart: { type: Date, required: true, index: true },
    xpEarned: { type: Number, default: 0 },
    stardustEarned: { type: Number, default: 0 },
    challengesCompleted: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'weeklyStats' });

WeeklyStatsSchema.index({ playerId: 1, weekStart: 1 }, { unique: true });

const WeeklyStats = mongoose.models.WeeklyStats || 
    mongoose.model<IWeeklyStats>('WeeklyStats', WeeklyStatsSchema);

// ============================================
// MONTHLY STATS MODEL
// ============================================

interface IMonthlyStats extends Document {
    playerId: string;
    monthStart: Date;
    xpEarned: number;
    stardustEarned: number;
    challengesCompleted: number;
    gamesPlayed: number;
    updatedAt: Date;
}

const MonthlyStatsSchema = new Schema<IMonthlyStats>({
    playerId: { type: String, required: true, index: true },
    monthStart: { type: Date, required: true, index: true },
    xpEarned: { type: Number, default: 0 },
    stardustEarned: { type: Number, default: 0 },
    challengesCompleted: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'monthlyStats' });

MonthlyStatsSchema.index({ playerId: 1, monthStart: 1 }, { unique: true });

const MonthlyStats = mongoose.models.MonthlyStats || 
    mongoose.model<IMonthlyStats>('MonthlyStats', MonthlyStatsSchema);

// ============================================
// REWARD CONFIGURATION
// ============================================

interface LeaderboardReward {
    stardust: number;
    xp: number;
    title?: string;
    cosmetic?: string;
}

const WEEKLY_REWARDS: Record<number, LeaderboardReward> = {
    1: { stardust: 1000, xp: 500, title: 'Weekly Champion' },
    2: { stardust: 750, xp: 400 },
    3: { stardust: 500, xp: 300 },
    4: { stardust: 300, xp: 200 },
    5: { stardust: 200, xp: 150 },
    6: { stardust: 150, xp: 100 },
    7: { stardust: 125, xp: 100 },
    8: { stardust: 100, xp: 75 },
    9: { stardust: 100, xp: 75 },
    10: { stardust: 100, xp: 75 }
};

const MONTHLY_REWARDS: Record<number, LeaderboardReward> = {
    1: { stardust: 5000, xp: 2000, title: 'Monthly Legend', cosmetic: 'aura_champion' },
    2: { stardust: 3000, xp: 1500, title: 'Monthly Elite' },
    3: { stardust: 2000, xp: 1000, title: 'Monthly Star' },
    4: { stardust: 1500, xp: 750 },
    5: { stardust: 1000, xp: 500 },
    6: { stardust: 750, xp: 400 },
    7: { stardust: 600, xp: 350 },
    8: { stardust: 500, xp: 300 },
    9: { stardust: 400, xp: 250 },
    10: { stardust: 300, xp: 200 }
};

// ============================================
// LEADERBOARD RESET SERVICE
// ============================================

class LeaderboardResetService extends EventEmitter {
    private initialized: boolean = false;
    private weeklyCheckInterval: NodeJS.Timeout | null = null;
    private monthlyCheckInterval: NodeJS.Timeout | null = null;
    private lastWeeklyReset: Date | null = null;
    private lastMonthlyReset: Date | null = null;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        // Check for resets every hour
        this.weeklyCheckInterval = setInterval(() => {
            this.checkWeeklyReset();
        }, 60 * 60 * 1000); // Every hour

        this.monthlyCheckInterval = setInterval(() => {
            this.checkMonthlyReset();
        }, 60 * 60 * 1000); // Every hour

        // Initial check
        await this.checkWeeklyReset();
        await this.checkMonthlyReset();

        console.log('🏆 Leaderboard reset service initialized');
    }

    // =========================================================================
    // RESET CHECKS
    // =========================================================================

    private async checkWeeklyReset(): Promise<void> {
        const now = new Date();
        const dayOfWeek = now.getUTCDay(); // 0 = Sunday
        const hour = now.getUTCHours();

        // Reset on Sunday at midnight UTC
        if (dayOfWeek === 0 && hour === 0) {
            const weekStart = this.getWeekStart(now);

            // Check if we already reset this week
            if (this.lastWeeklyReset && 
                this.lastWeeklyReset.getTime() >= weekStart.getTime()) {
                return;
            }

            console.log('🏆 Running weekly leaderboard reset...');
            await this.runWeeklyReset();
            this.lastWeeklyReset = now;
        }
    }

    private async checkMonthlyReset(): Promise<void> {
        const now = new Date();
        const dayOfMonth = now.getUTCDate();
        const hour = now.getUTCHours();

        // Reset on 1st of month at midnight UTC
        if (dayOfMonth === 1 && hour === 0) {
            const monthStart = this.getMonthStart(now);

            // Check if we already reset this month
            if (this.lastMonthlyReset && 
                this.lastMonthlyReset.getTime() >= monthStart.getTime()) {
                return;
            }

            console.log('🏆 Running monthly leaderboard reset...');
            await this.runMonthlyReset();
            this.lastMonthlyReset = now;
        }
    }

    // =========================================================================
    // WEEKLY RESET
    // =========================================================================

    async runWeeklyReset(): Promise<void> {
        try {
            const now = new Date();
            const weekEnd = now;
            const weekStart = new Date(now);
            weekStart.setUTCDate(weekStart.getUTCDate() - 7);

            // Get top 10 players for this week
            const topPlayers = await WeeklyStats.find({
                weekStart: { $gte: weekStart, $lt: weekEnd }
            })
                .sort({ xpEarned: -1 })
                .limit(10)
                .lean();

            if (topPlayers.length === 0) {
                console.log('🏆 No weekly stats to reset');
                return;
            }

            // Get player names
            const rankings = await Promise.all(
                topPlayers.map(async (player, index) => {
                    const playerData = await PlayerData.findOne({ playerId: player.playerId }).lean();
                    return {
                        rank: index + 1,
                        playerId: player.playerId,
                        playerName: playerData?.name || 'Unknown',
                        xp: player.xpEarned,
                        stardust: player.stardustEarned,
                        challengesCompleted: player.challengesCompleted
                    };
                })
            );

            // Archive results
            await LeaderboardArchive.create({
                periodType: 'weekly',
                periodStart: weekStart,
                periodEnd: weekEnd,
                rankings
            });

            // Award rewards
            for (const ranking of rankings) {
                const reward = WEEKLY_REWARDS[ranking.rank];
                if (reward) {
                    await this.awardReward(ranking.playerId, reward, 'weekly', ranking.rank);
                }
            }

            // Clear weekly stats (or mark as processed)
            await WeeklyStats.deleteMany({
                weekStart: { $lt: weekEnd }
            });

            this.emit('weekly_reset_complete', { rankings, periodEnd: weekEnd });
            console.log(`✅ Weekly leaderboard reset complete. Awarded ${rankings.length} players.`);
        } catch (error) {
            console.error('❌ Weekly reset failed:', error);
        }
    }

    // =========================================================================
    // MONTHLY RESET
    // =========================================================================

    async runMonthlyReset(): Promise<void> {
        try {
            const now = new Date();
            const monthEnd = now;
            const monthStart = new Date(now);
            monthStart.setUTCMonth(monthStart.getUTCMonth() - 1);

            // Get top 10 players for this month
            const topPlayers = await MonthlyStats.find({
                monthStart: { $gte: monthStart, $lt: monthEnd }
            })
                .sort({ xpEarned: -1 })
                .limit(10)
                .lean();

            if (topPlayers.length === 0) {
                console.log('🏆 No monthly stats to reset');
                return;
            }

            // Get player names
            const rankings = await Promise.all(
                topPlayers.map(async (player, index) => {
                    const playerData = await PlayerData.findOne({ playerId: player.playerId }).lean();
                    return {
                        rank: index + 1,
                        playerId: player.playerId,
                        playerName: playerData?.name || 'Unknown',
                        xp: player.xpEarned,
                        stardust: player.stardustEarned,
                        challengesCompleted: player.challengesCompleted
                    };
                })
            );

            // Archive results
            await LeaderboardArchive.create({
                periodType: 'monthly',
                periodStart: monthStart,
                periodEnd: monthEnd,
                rankings
            });

            // Award rewards
            for (const ranking of rankings) {
                const reward = MONTHLY_REWARDS[ranking.rank];
                if (reward) {
                    await this.awardReward(ranking.playerId, reward, 'monthly', ranking.rank);
                }
            }

            // Clear monthly stats
            await MonthlyStats.deleteMany({
                monthStart: { $lt: monthEnd }
            });

            this.emit('monthly_reset_complete', { rankings, periodEnd: monthEnd });
            console.log(`✅ Monthly leaderboard reset complete. Awarded ${rankings.length} players.`);
        } catch (error) {
            console.error('❌ Monthly reset failed:', error);
        }
    }

    // =========================================================================
    // STAT TRACKING
    // =========================================================================

    /**
     * Track XP earned for leaderboards
     */
    async trackXPEarned(playerId: string, xp: number): Promise<void> {
        try {
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            const monthStart = this.getMonthStart(now);

            // Update weekly stats
            await WeeklyStats.findOneAndUpdate(
                { playerId, weekStart },
                { 
                    $inc: { xpEarned: xp },
                    $set: { updatedAt: now }
                },
                { upsert: true }
            );

            // Update monthly stats
            await MonthlyStats.findOneAndUpdate(
                { playerId, monthStart },
                { 
                    $inc: { xpEarned: xp },
                    $set: { updatedAt: now }
                },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error tracking XP:', error);
        }
    }

    /**
     * Track stardust earned for leaderboards
     */
    async trackStardustEarned(playerId: string, stardust: number): Promise<void> {
        try {
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            const monthStart = this.getMonthStart(now);

            await WeeklyStats.findOneAndUpdate(
                { playerId, weekStart },
                { 
                    $inc: { stardustEarned: stardust },
                    $set: { updatedAt: now }
                },
                { upsert: true }
            );

            await MonthlyStats.findOneAndUpdate(
                { playerId, monthStart },
                { 
                    $inc: { stardustEarned: stardust },
                    $set: { updatedAt: now }
                },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error tracking stardust:', error);
        }
    }

    /**
     * Track challenge completion for leaderboards
     */
    async trackChallengeCompleted(playerId: string): Promise<void> {
        try {
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            const monthStart = this.getMonthStart(now);

            await WeeklyStats.findOneAndUpdate(
                { playerId, weekStart },
                { 
                    $inc: { challengesCompleted: 1 },
                    $set: { updatedAt: now }
                },
                { upsert: true }
            );

            await MonthlyStats.findOneAndUpdate(
                { playerId, monthStart },
                { 
                    $inc: { challengesCompleted: 1 },
                    $set: { updatedAt: now }
                },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error tracking challenge:', error);
        }
    }

    /**
     * Track game played/won for leaderboards
     */
    async trackGamePlayed(playerId: string, won: boolean): Promise<void> {
        try {
            const now = new Date();
            const weekStart = this.getWeekStart(now);

            const update: any = { 
                $inc: { gamesPlayed: 1 },
                $set: { updatedAt: now }
            };
            if (won) {
                update.$inc.wins = 1;
            }

            await WeeklyStats.findOneAndUpdate(
                { playerId, weekStart },
                update,
                { upsert: true }
            );
        } catch (error) {
            console.error('Error tracking game:', error);
        }
    }

    // =========================================================================
    // LEADERBOARD QUERIES
    // =========================================================================

    async getWeeklyLeaderboard(limit: number = 10): Promise<any[]> {
        const weekStart = this.getWeekStart(new Date());

        const stats = await WeeklyStats.find({ weekStart })
            .sort({ xpEarned: -1 })
            .limit(limit)
            .lean();

        return Promise.all(
            stats.map(async (s, index) => {
                const player = await PlayerData.findOne({ playerId: s.playerId }).lean();
                return {
                    rank: index + 1,
                    playerId: s.playerId,
                    playerName: player?.name || 'Unknown',
                    xp: s.xpEarned,
                    stardust: s.stardustEarned,
                    challengesCompleted: s.challengesCompleted,
                    wins: s.wins
                };
            })
        );
    }

    async getMonthlyLeaderboard(limit: number = 10): Promise<any[]> {
        const monthStart = this.getMonthStart(new Date());

        const stats = await MonthlyStats.find({ monthStart })
            .sort({ xpEarned: -1 })
            .limit(limit)
            .lean();

        return Promise.all(
            stats.map(async (s, index) => {
                const player = await PlayerData.findOne({ playerId: s.playerId }).lean();
                return {
                    rank: index + 1,
                    playerId: s.playerId,
                    playerName: player?.name || 'Unknown',
                    xp: s.xpEarned,
                    stardust: s.stardustEarned,
                    challengesCompleted: s.challengesCompleted
                };
            })
        );
    }

    async getPlayerWeeklyStats(playerId: string): Promise<any | null> {
        const weekStart = this.getWeekStart(new Date());
        return WeeklyStats.findOne({ playerId, weekStart }).lean();
    }

    async getPlayerMonthlyStats(playerId: string): Promise<any | null> {
        const monthStart = this.getMonthStart(new Date());
        return MonthlyStats.findOne({ playerId, monthStart }).lean();
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private async awardReward(
        playerId: string, 
        reward: LeaderboardReward, 
        periodType: 'weekly' | 'monthly',
        rank: number
    ): Promise<void> {
        try {
            // Award stardust and XP
            await Progression.findOneAndUpdate(
                { playerId },
                { 
                    $inc: { 
                        stardust: reward.stardust,
                        xp: reward.xp
                    }
                },
                { upsert: true }
            );

            // Award title if any
            if (reward.title) {
                await PlayerData.findOneAndUpdate(
                    { playerId },
                    { $addToSet: { 'cosmetics.ownedItems': `title_${reward.title.toLowerCase().replace(/\s+/g, '_')}` } }
                );
            }

            // Award cosmetic if any
            if (reward.cosmetic) {
                await PlayerData.findOneAndUpdate(
                    { playerId },
                    { $addToSet: { 'cosmetics.ownedItems': reward.cosmetic } }
                );
            }

            // Send notification
            await notificationService.sendNotification(playerId, {
                type: `${periodType}_leaderboard_reward`,
                title: `${periodType === 'weekly' ? 'Weekly' : 'Monthly'} Rank #${rank}!`,
                message: `Congratulations! You earned ${reward.stardust} stardust and ${reward.xp} XP!`,
                data: { rank, ...reward }
            });
        } catch (error) {
            console.error(`Error awarding ${periodType} reward to ${playerId}:`, error);
        }
    }

    private getWeekStart(date: Date): Date {
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        d.setUTCDate(diff);
        return d;
    }

    private getMonthStart(date: Date): Date {
        const d = new Date(date);
        d.setUTCDate(1);
        d.setUTCHours(0, 0, 0, 0);
        return d;
    }

    shutdown(): void {
        if (this.weeklyCheckInterval) clearInterval(this.weeklyCheckInterval);
        if (this.monthlyCheckInterval) clearInterval(this.monthlyCheckInterval);
    }
}

export const leaderboardResetService = new LeaderboardResetService();
