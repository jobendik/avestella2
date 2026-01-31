// Leaderboard Service - Manages all leaderboard types and rankings
// Supports multiple leaderboard categories with caching for performance

import { PlayerData } from '../database/playerDataModel.js';
import { Progression } from '../database/progressionModels.js';
import { Reputation } from '../database/socialModels.js';
import { mongoPersistence } from './MongoPersistenceService.js';

// ============================================
// TYPES
// ============================================

export type LeaderboardCategory =
    | 'xp'
    | 'stardust'
    | 'stars'
    | 'echoes'
    | 'challenges'
    | 'connections'
    | 'seasonXp'
    | 'weeklyXp'
    | 'monthlyXp'
    | 'reputation_explorer'
    | 'reputation_connector'
    | 'reputation_guardian'
    | 'reputation_beacon_keeper'
    | 'reputation_collector';

export interface LeaderboardEntry {
    rank: number;
    playerId: string;
    name: string;
    avatar: string;
    value: number;
    level?: number;
    seasonTier?: number;
    hue?: number;
}

export interface LeaderboardResult {
    category: LeaderboardCategory;
    entries: LeaderboardEntry[];
    lastUpdated: Date;
    totalPlayers: number;
}

export interface PlayerRankInfo {
    playerId: string;
    category: LeaderboardCategory;
    rank: number;
    value: number;
    percentile: number;
    nearbyPlayers: LeaderboardEntry[];
}

// Cache settings
const CACHE_DURATION_MS = 60 * 1000; // 1 minute cache

interface CachedLeaderboard {
    result: LeaderboardResult;
    cachedAt: number;
}

// ============================================
// LEADERBOARD SERVICE CLASS
// ============================================

export class LeaderboardService {

    private initialized: boolean = false;
    private cache: Map<string, CachedLeaderboard> = new Map();

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('🏆 Leaderboard service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    private useMongo(): boolean {
        return mongoPersistence.isReady();
    }

    // ========================================
    // CACHE MANAGEMENT
    // ========================================

    private getCacheKey(category: LeaderboardCategory, limit: number): string {
        return `${category}:${limit}`;
    }

    private getCached(key: string): LeaderboardResult | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.cachedAt > CACHE_DURATION_MS) {
            this.cache.delete(key);
            return null;
        }

        return cached.result;
    }

    private setCache(key: string, result: LeaderboardResult): void {
        this.cache.set(key, { result, cachedAt: Date.now() });
    }

    clearCache(): void {
        this.cache.clear();
    }

    // ========================================
    // MAIN LEADERBOARD METHODS
    // ========================================

    async getLeaderboard(category: LeaderboardCategory, limit: number = 50): Promise<LeaderboardResult> {
        // Fallback if Mongo is not ready
        if (!this.useMongo()) {
            return {
                category,
                entries: [],
                lastUpdated: new Date(),
                totalPlayers: 0
            };
        }

        const cacheKey = this.getCacheKey(category, limit);
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        let entries: LeaderboardEntry[] = [];
        let totalPlayers = 0;

        try {
            switch (category) {
                case 'xp':
                case 'stardust':
                case 'stars':
                case 'echoes':
                case 'connections':
                    entries = await this.getPlayerDataLeaderboard(category, limit);
                    totalPlayers = await PlayerData.countDocuments();
                    break;

                case 'challenges':
                case 'seasonXp':
                case 'weeklyXp':
                case 'monthlyXp':
                    entries = await this.getProgressionLeaderboard(category, limit);
                    totalPlayers = await Progression.countDocuments();
                    break;

                case 'reputation_explorer':
                case 'reputation_connector':
                case 'reputation_guardian':
                case 'reputation_beacon_keeper':
                case 'reputation_collector':
                    const track = category.replace('reputation_', '');
                    entries = await this.getReputationLeaderboard(track, limit);
                    totalPlayers = await Reputation.countDocuments();
                    break;
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            // Return empty result on error
            return {
                category,
                entries: [],
                lastUpdated: new Date(),
                totalPlayers: 0
            };
        }

        const result: LeaderboardResult = {
            category,
            entries,
            lastUpdated: new Date(),
            totalPlayers
        };

        this.setCache(cacheKey, result);
        return result;
    }

    private async getPlayerDataLeaderboard(category: string, limit: number): Promise<LeaderboardEntry[]> {
        const sortField = this.getPlayerDataSortField(category);

        const players = await PlayerData.find({})
            .sort({ [sortField]: -1 })
            .limit(limit)
            .select('playerId name avatar hue xp level stats')
            .lean();

        return players.map((p: any, index: number) => ({
            rank: index + 1,
            playerId: p.playerId,
            name: p.name || 'Wanderer',
            avatar: p.avatar || '⭐',
            hue: p.hue,
            level: p.level,
            value: this.getPlayerDataValue(p, category)
        }));
    }

    private getPlayerDataSortField(category: string): string {
        switch (category) {
            case 'xp': return 'xp';
            case 'stardust': return 'stardust';
            case 'stars': return 'stats.starsLit';
            case 'echoes': return 'stats.echoesCreated';
            case 'connections': return 'stats.connections';
            default: return 'xp';
        }
    }

    private getPlayerDataValue(player: any, category: string): number {
        switch (category) {
            case 'xp': return player.xp || 0;
            case 'stardust': return player.stardust || 0;
            case 'stars': return player.stats?.starsLit || 0;
            case 'echoes': return player.stats?.echoesCreated || 0;
            case 'connections': return player.stats?.connections || 0;
            default: return 0;
        }
    }

    private async getProgressionLeaderboard(category: string, limit: number): Promise<LeaderboardEntry[]> {
        const sortField = this.getProgressionSortField(category);

        const progressions = await Progression.find({})
            .sort({ [sortField]: -1 })
            .limit(limit)
            .lean();

        // Fetch player names
        const playerIds = progressions.map((p: any) => p.playerId);
        const players = await PlayerData.find({ playerId: { $in: playerIds } })
            .select('playerId name avatar hue level')
            .lean();

        const playerMap = new Map(players.map((p: any) => [p.playerId, p]));

        return progressions.map((p: any, index: number) => {
            const player = playerMap.get(p.playerId);
            return {
                rank: index + 1,
                playerId: p.playerId,
                name: player?.name || 'Wanderer',
                avatar: player?.avatar || '⭐',
                hue: player?.hue,
                level: player?.level,
                seasonTier: p.seasonPassTier,
                value: this.getProgressionValue(p, category)
            };
        });
    }

    private getProgressionSortField(category: string): string {
        switch (category) {
            case 'challenges': return 'totalChallengesCompleted';
            case 'seasonXp': return 'seasonPassXP';
            case 'weeklyXp': return 'weeklyStats.xpEarned';
            case 'monthlyXp': return 'monthlyStats.xpEarned';
            default: return 'stardust';
        }
    }

    private getProgressionValue(progression: any, category: string): number {
        switch (category) {
            case 'challenges': return progression.totalChallengesCompleted || 0;
            case 'seasonXp': return progression.seasonPassXP || 0;
            case 'weeklyXp': return progression.weeklyStats?.xpEarned || 0;
            case 'monthlyXp': return progression.monthlyStats?.xpEarned || 0;
            default: return 0;
        }
    }

    private async getReputationLeaderboard(track: string, limit: number): Promise<LeaderboardEntry[]> {
        const sortField = `tracks.${track}.xp`;

        const reputations = await Reputation.find({})
            .sort({ [sortField]: -1 })
            .limit(limit)
            .lean();

        // Fetch player names
        const playerIds = reputations.map((r: any) => r.playerId);
        const players = await PlayerData.find({ playerId: { $in: playerIds } })
            .select('playerId name avatar hue level')
            .lean();

        const playerMap = new Map(players.map((p: any) => [p.playerId, p]));

        return reputations.map((r: any, index: number) => {
            const player = playerMap.get(r.playerId);
            const trackData = r.tracks?.[track] || { xp: 0, level: 1 };
            return {
                rank: index + 1,
                playerId: r.playerId,
                name: player?.name || 'Wanderer',
                avatar: player?.avatar || '⭐',
                hue: player?.hue,
                level: trackData.level,
                value: trackData.xp
            };
        });
    }

    // ========================================
    // PLAYER RANK INFO
    // ========================================

    async getPlayerRank(playerId: string, category: LeaderboardCategory): Promise<PlayerRankInfo | null> {
        if (!this.useMongo()) return null;

        const fullLeaderboard = await this.getLeaderboard(category, 1000);
        const playerEntry = fullLeaderboard.entries.find(e => e.playerId === playerId);

        if (!playerEntry) {
            // Player not in top 1000, estimate rank
            const playerValue = await this.getPlayerValue(playerId, category);
            const higherCount = await this.countPlayersAbove(category, playerValue);

            return {
                playerId,
                category,
                rank: higherCount + 1,
                value: playerValue,
                percentile: Math.round((1 - (higherCount / fullLeaderboard.totalPlayers)) * 100),
                nearbyPlayers: []
            };
        }

        // Get nearby players
        const nearbyPlayers = this.getNearbyPlayers(fullLeaderboard.entries, playerEntry.rank);

        return {
            playerId,
            category,
            rank: playerEntry.rank,
            value: playerEntry.value,
            percentile: Math.round((1 - (playerEntry.rank / fullLeaderboard.totalPlayers)) * 100),
            nearbyPlayers
        };
    }

    private getNearbyPlayers(entries: LeaderboardEntry[], rank: number): LeaderboardEntry[] {
        const startIdx = Math.max(0, rank - 3);
        const endIdx = Math.min(entries.length, rank + 2);
        return entries.slice(startIdx, endIdx);
    }

    private async getPlayerValue(playerId: string, category: LeaderboardCategory): Promise<number> {
        // Get the value for a specific player in a category
        switch (category) {
            case 'xp':
            case 'stardust':
            case 'stars':
            case 'echoes':
            case 'connections': {
                const player = await PlayerData.findOne({ playerId }).lean();
                return player ? this.getPlayerDataValue(player, category) : 0;
            }
            case 'challenges':
            case 'seasonXp':
            case 'weeklyXp':
            case 'monthlyXp': {
                const progression = await Progression.findOne({ playerId }).lean();
                return progression ? this.getProgressionValue(progression, category) : 0;
            }
            default: {
                const track = category.replace('reputation_', '');
                const reputation = await Reputation.findOne({ playerId }).lean() as any;
                return reputation?.tracks?.[track]?.xp || 0;
            }
        }
    }

    private async countPlayersAbove(category: LeaderboardCategory, value: number): Promise<number> {
        const field = this.getCategoryField(category);

        if (category.startsWith('reputation_')) {
            const track = category.replace('reputation_', '');
            return Reputation.countDocuments({ [`tracks.${track}.xp`]: { $gt: value } });
        } else if (['challenges', 'seasonXp', 'weeklyXp', 'monthlyXp'].includes(category)) {
            return Progression.countDocuments({ [field]: { $gt: value } });
        } else {
            return PlayerData.countDocuments({ [field]: { $gt: value } });
        }
    }

    private getCategoryField(category: LeaderboardCategory): string {
        switch (category) {
            case 'xp': return 'xp';
            case 'stardust': return 'stardust';
            case 'stars': return 'stats.starsLit';
            case 'echoes': return 'stats.echoesCreated';
            case 'connections': return 'stats.connections';
            case 'challenges': return 'totalChallengesCompleted';
            case 'seasonXp': return 'seasonPassXP';
            case 'weeklyXp': return 'weeklyStats.xpEarned';
            case 'monthlyXp': return 'monthlyStats.xpEarned';
            default: return 'xp';
        }
    }

    // ========================================
    // AGGREGATED STATS
    // ========================================

    async getGlobalStats(): Promise<{
        totalPlayers: number;
        totalXp: number;
        totalStars: number;
        totalEchoes: number;
        totalConnections: number;
    }> {
        if (!this.useMongo()) {
            return {
                totalPlayers: 0,
                totalXp: 0,
                totalStars: 0,
                totalEchoes: 0,
                totalConnections: 0
            };
        }

        try {
            const result = await PlayerData.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPlayers: { $sum: 1 },
                        totalXp: { $sum: '$xp' },
                        totalStars: { $sum: '$stats.starsLit' },
                        totalEchoes: { $sum: '$stats.echoesCreated' },
                        totalConnections: { $sum: '$stats.connections' }
                    }
                }
            ]);

            return result[0] || {
                totalPlayers: 0,
                totalXp: 0,
                totalStars: 0,
                totalEchoes: 0,
                totalConnections: 0
            };
        } catch (error) {
            console.error('Failed to get global stats:', error);
            return {
                totalPlayers: 0,
                totalXp: 0,
                totalStars: 0,
                totalEchoes: 0,
                totalConnections: 0
            };
        }
    }

    // ========================================
    // COMPETITIVE RANK SYSTEM
    // ========================================

    /**
     * Update a player's competitive rank points
     */
    async updateRankPoints(playerId: string, delta: number): Promise<{
        newRankPoints: number;
        oldRank: string;
        newRank: string;
        rankChanged: boolean;
    }> {
        if (!this.useMongo()) {
            return { newRankPoints: 0, oldRank: 'unranked', newRank: 'unranked', rankChanged: false };
        }

        const player = await PlayerData.findOne({ playerId });
        if (!player) {
            return { newRankPoints: 0, oldRank: 'unranked', newRank: 'unranked', rankChanged: false };
        }

        const oldRankPoints = player.leaderboard?.rankPoints || 0;
        const oldRank = this.getRankFromPoints(oldRankPoints);

        const newRankPoints = Math.max(0, oldRankPoints + delta);
        const newRank = this.getRankFromPoints(newRankPoints);

        // Update database
        await PlayerData.findOneAndUpdate(
            { playerId },
            {
                $set: { 'leaderboard.rankPoints': newRankPoints },
                // Track peak rank
                ...(this.getRankValue(newRank) > this.getRankValue(player.leaderboard?.peakRank || 'unranked')
                    ? { $set: { 'leaderboard.peakRank': newRank } }
                    : {})
            }
        );

        this.clearCache();

        return {
            newRankPoints,
            oldRank,
            newRank,
            rankChanged: oldRank !== newRank
        };
    }

    /**
     * Add XP to weekly/monthly tracking
     */
    async addCompetitiveXp(playerId: string, xp: number): Promise<void> {
        if (!this.useMongo()) return;

        await PlayerData.findOneAndUpdate(
            { playerId },
            {
                $inc: {
                    'leaderboard.weeklyXp': xp,
                    'leaderboard.monthlyXp': xp
                }
            }
        );
        this.clearCache();
    }

    /**
     * Record a competitive win
     */
    async recordWin(playerId: string): Promise<void> {
        if (!this.useMongo()) return;

        await PlayerData.findOneAndUpdate(
            { playerId },
            { $inc: { 'leaderboard.weeklyWins': 1 } }
        );
        this.clearCache();
    }

    /**
     * Process weekly reset (should be called via cron job every Monday)
     */
    async processWeeklyReset(): Promise<{ playersReset: number }> {
        if (!this.useMongo()) return { playersReset: 0 };

        console.log('🔄 Processing weekly leaderboard reset...');

        const result = await PlayerData.updateMany(
            {},
            { $set: { 'leaderboard.weeklyXp': 0, 'leaderboard.weeklyWins': 0 } }
        );

        this.clearCache();
        console.log(`✅ Weekly reset complete: ${result.modifiedCount} players reset`);

        return { playersReset: result.modifiedCount };
    }

    /**
     * Process monthly reset (should be called via cron job on 1st of month)
     */
    async processMonthlyReset(): Promise<{ playersReset: number }> {
        if (!this.useMongo()) return { playersReset: 0 };

        console.log('🔄 Processing monthly leaderboard reset...');

        const result = await PlayerData.updateMany(
            {},
            { $set: { 'leaderboard.monthlyXp': 0 } }
        );

        this.clearCache();
        console.log(`✅ Monthly reset complete: ${result.modifiedCount} players reset`);

        return { playersReset: result.modifiedCount };
    }

    /**
     * Get rank from points
     */
    private getRankFromPoints(points: number): string {
        const RANK_THRESHOLDS = [
            { rank: 'legend', min: 150000 },
            { rank: 'grandmaster', min: 90000 },
            { rank: 'master', min: 65000 },
            { rank: 'diamond_1', min: 45000 },
            { rank: 'diamond_2', min: 32000 },
            { rank: 'diamond_3', min: 22000 },
            { rank: 'platinum_1', min: 15000 },
            { rank: 'platinum_2', min: 10000 },
            { rank: 'platinum_3', min: 7000 },
            { rank: 'gold_1', min: 5000 },
            { rank: 'gold_2', min: 3500 },
            { rank: 'gold_3', min: 2500 },
            { rank: 'silver_1', min: 1800 },
            { rank: 'silver_2', min: 1200 },
            { rank: 'silver_3', min: 800 },
            { rank: 'bronze_1', min: 500 },
            { rank: 'bronze_2', min: 250 },
            { rank: 'bronze_3', min: 100 },
            { rank: 'unranked', min: 0 }
        ];

        for (const tier of RANK_THRESHOLDS) {
            if (points >= tier.min) return tier.rank;
        }
        return 'unranked';
    }

    /**
     * Get numeric rank value for comparison
     */
    private getRankValue(rank: string): number {
        const RANK_VALUES: Record<string, number> = {
            'unranked': 0, 'bronze_3': 1, 'bronze_2': 2, 'bronze_1': 3,
            'silver_3': 4, 'silver_2': 5, 'silver_1': 6,
            'gold_3': 7, 'gold_2': 8, 'gold_1': 9,
            'platinum_3': 10, 'platinum_2': 11, 'platinum_1': 12,
            'diamond_3': 13, 'diamond_2': 14, 'diamond_1': 15,
            'master': 16, 'grandmaster': 17, 'legend': 18
        };
        return RANK_VALUES[rank] || 0;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TUTORIAL TRACKING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Update tutorial progress for a player
     */
    async updateTutorialProgress(
        playerId: string,
        step: number,
        stepId: string
    ): Promise<void> {
        if (!this.useMongo()) return;

        await PlayerData.updateOne(
            { playerId },
            {
                $set: { 'tutorial.currentStep': step },
                $addToSet: { 'tutorial.completedSteps': stepId }
            }
        );
    }

    /**
     * Complete the tutorial for a player
     */
    async completeTutorial(playerId: string): Promise<void> {
        if (!this.useMongo()) return;

        await PlayerData.updateOne(
            { playerId },
            {
                $set: {
                    'tutorial.completed': true,
                    'tutorial.completedAt': new Date()
                }
            }
        );
    }

    /**
     * Skip the tutorial for a player
     */
    async skipTutorial(playerId: string): Promise<void> {
        if (!this.useMongo()) return;

        await PlayerData.updateOne(
            { playerId },
            {
                $set: {
                    'tutorial.completed': true,
                    'tutorial.skipped': true,
                    'tutorial.completedAt': new Date()
                }
            }
        );
    }

    /**
     * Get tutorial progress for a player
     */
    async getTutorialProgress(playerId: string): Promise<{
        completed: boolean;
        currentStep: number;
        completedSteps: string[];
        skipped: boolean;
    } | null> {
        if (!this.useMongo()) return null;

        const player = await PlayerData.findOne({ playerId }).select('tutorial').lean();
        if (!player?.tutorial) return null;

        return {
            completed: player.tutorial.completed || false,
            currentStep: player.tutorial.currentStep || 0,
            completedSteps: player.tutorial.completedSteps || [],
            skipped: player.tutorial.skipped || false
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COMPREHENSIVE STATS RECORDING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Record various stats for leaderboard tracking
     */
    async recordStats(playerId: string, stats: {
        xpEarned?: number;
        stardustEarned?: number;
        challengesCompleted?: number;
        playtimeMinutes?: number;
        bondsFormed?: number;
        giftsGiven?: number;
    }): Promise<void> {
        if (!this.useMongo()) return;

        const updateOps: any = { $inc: {} };

        if (stats.xpEarned) {
            updateOps.$inc['leaderboard.weeklyStats.xpEarned'] = stats.xpEarned;
            updateOps.$inc['leaderboard.monthlyStats.xpEarned'] = stats.xpEarned;
            updateOps.$inc['leaderboard.allTimeStats.totalXpEarned'] = stats.xpEarned;
            updateOps.$inc['leaderboard.weeklyXp'] = stats.xpEarned;
            updateOps.$inc['leaderboard.monthlyXp'] = stats.xpEarned;
        }

        if (stats.stardustEarned) {
            updateOps.$inc['leaderboard.weeklyStats.stardustEarned'] = stats.stardustEarned;
            updateOps.$inc['leaderboard.monthlyStats.stardustEarned'] = stats.stardustEarned;
            updateOps.$inc['leaderboard.allTimeStats.totalStardustEarned'] = stats.stardustEarned;
        }

        if (stats.challengesCompleted) {
            updateOps.$inc['leaderboard.weeklyStats.challengesCompleted'] = stats.challengesCompleted;
            updateOps.$inc['leaderboard.monthlyStats.challengesCompleted'] = stats.challengesCompleted;
            updateOps.$inc['leaderboard.allTimeStats.totalChallengesCompleted'] = stats.challengesCompleted;
        }

        if (stats.playtimeMinutes) {
            updateOps.$inc['leaderboard.weeklyStats.playtimeMinutes'] = stats.playtimeMinutes;
            updateOps.$inc['leaderboard.monthlyStats.playtimeMinutes'] = stats.playtimeMinutes;
            updateOps.$inc['leaderboard.allTimeStats.totalPlaytimeMinutes'] = stats.playtimeMinutes;
        }

        if (stats.bondsFormed) {
            updateOps.$inc['leaderboard.weeklyStats.bondsFormed'] = stats.bondsFormed;
            updateOps.$inc['leaderboard.monthlyStats.bondsFormed'] = stats.bondsFormed;
        }

        if (stats.giftsGiven) {
            updateOps.$inc['leaderboard.weeklyStats.giftsGiven'] = stats.giftsGiven;
            updateOps.$inc['leaderboard.monthlyStats.giftsGiven'] = stats.giftsGiven;
        }

        await PlayerData.findOneAndUpdate({ playerId }, updateOps);
        this.clearCache();
    }

    /**
     * Get comprehensive player stats including weekly, monthly, and all-time
     */
    async getPlayerStats(playerId: string): Promise<{
        weekly: {
            xpEarned: number;
            stardustEarned: number;
            challengesCompleted: number;
            playtimeMinutes: number;
            bondsFormed: number;
            giftsGiven: number;
        };
        monthly: {
            xpEarned: number;
            stardustEarned: number;
            challengesCompleted: number;
            playtimeMinutes: number;
            bondsFormed: number;
            giftsGiven: number;
        };
        allTime: {
            highestLevel: number;
            totalXpEarned: number;
            totalStardustEarned: number;
            totalChallengesCompleted: number;
            totalPlaytimeMinutes: number;
        };
        rankings: Record<string, number>;
    } | null> {
        if (!this.useMongo()) return null;

        const player = await PlayerData.findOne({ playerId }).select('leaderboard level').lean();
        if (!player?.leaderboard) return null;

        const lb = player.leaderboard as any;

        // Get main rankings
        const rankings: Record<string, number> = {};
        const categories: LeaderboardCategory[] = ['xp', 'stardust', 'challenges', 'weeklyXp'];
        
        for (const cat of categories) {
            const rankInfo = await this.getPlayerRank(playerId, cat);
            rankings[cat] = rankInfo?.rank || 0;
        }

        return {
            weekly: {
                xpEarned: lb.weeklyStats?.xpEarned || 0,
                stardustEarned: lb.weeklyStats?.stardustEarned || 0,
                challengesCompleted: lb.weeklyStats?.challengesCompleted || 0,
                playtimeMinutes: lb.weeklyStats?.playtimeMinutes || 0,
                bondsFormed: lb.weeklyStats?.bondsFormed || 0,
                giftsGiven: lb.weeklyStats?.giftsGiven || 0
            },
            monthly: {
                xpEarned: lb.monthlyStats?.xpEarned || 0,
                stardustEarned: lb.monthlyStats?.stardustEarned || 0,
                challengesCompleted: lb.monthlyStats?.challengesCompleted || 0,
                playtimeMinutes: lb.monthlyStats?.playtimeMinutes || 0,
                bondsFormed: lb.monthlyStats?.bondsFormed || 0,
                giftsGiven: lb.monthlyStats?.giftsGiven || 0
            },
            allTime: {
                highestLevel: lb.allTimeStats?.highestLevel || player.level || 1,
                totalXpEarned: lb.allTimeStats?.totalXpEarned || 0,
                totalStardustEarned: lb.allTimeStats?.totalStardustEarned || 0,
                totalChallengesCompleted: lb.allTimeStats?.totalChallengesCompleted || 0,
                totalPlaytimeMinutes: lb.allTimeStats?.totalPlaytimeMinutes || 0
            },
            rankings
        };
    }

    /**
     * Get friends leaderboard
     */
    async getFriendsLeaderboard(
        playerId: string,
        category: LeaderboardCategory
    ): Promise<LeaderboardEntry[]> {
        if (!this.useMongo()) return [];

        const player = await PlayerData.findOne({ playerId }).select('social.friendIds').lean();
        if (!player) return [];

        const friendIds = [...(player.social?.friendIds || []), playerId]; // Include self

        const sortField = this.getSortFieldForCategory(category);

        const friends = await PlayerData.find({ playerId: { $in: friendIds } })
            .sort({ [sortField]: -1 })
            .select('playerId name avatar hue level xp stardust stats leaderboard')
            .lean();

        return friends.map((friend, index) => ({
            rank: index + 1,
            playerId: friend.playerId,
            name: friend.name,
            avatar: friend.avatar || '⭐',
            value: this.getValueForCategory(friend as any, category),
            level: friend.level,
            hue: friend.hue
        }));
    }

    /**
     * Get sort field for a leaderboard category
     */
    private getSortFieldForCategory(category: LeaderboardCategory): string {
        const sortFields: Record<LeaderboardCategory, string> = {
            'xp': 'xp',
            'stardust': 'stardust',
            'stars': 'stars',
            'echoes': 'echoes',
            'challenges': 'stats.challengesCompleted',
            'connections': 'stats.connections',
            'seasonXp': 'leaderboard.seasonStats.xpEarned',
            'weeklyXp': 'leaderboard.weeklyStats.xpEarned',
            'monthlyXp': 'leaderboard.monthlyStats.xpEarned',
            'reputation_explorer': 'reputation.explorer',
            'reputation_connector': 'reputation.connector',
            'reputation_guardian': 'reputation.guardian',
            'reputation_beacon_keeper': 'reputation.beaconKeeper',
            'reputation_collector': 'reputation.collector'
        };
        return sortFields[category] || 'xp';
    }

    /**
     * Get value for a leaderboard category from player data
     */
    private getValueForCategory(player: any, category: LeaderboardCategory): number {
        switch (category) {
            case 'xp':
                return player.xp || 0;
            case 'stardust':
                return player.stardust || 0;
            case 'stars':
                return player.stars || 0;
            case 'echoes':
                return player.echoes || 0;
            case 'challenges':
                return player.stats?.challengesCompleted || 0;
            case 'connections':
                return player.stats?.connections || 0;
            case 'seasonXp':
                return player.leaderboard?.seasonStats?.xpEarned || 0;
            case 'weeklyXp':
                return player.leaderboard?.weeklyStats?.xpEarned || 0;
            case 'monthlyXp':
                return player.leaderboard?.monthlyStats?.xpEarned || 0;
            case 'reputation_explorer':
                return player.reputation?.explorer || 0;
            case 'reputation_connector':
                return player.reputation?.connector || 0;
            case 'reputation_guardian':
                return player.reputation?.guardian || 0;
            case 'reputation_beacon_keeper':
                return player.reputation?.beaconKeeper || 0;
            case 'reputation_collector':
                return player.reputation?.collector || 0;
            default:
                return 0;
        }
    }
}

export const leaderboardService = new LeaderboardService();

