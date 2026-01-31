// Achievement Service - Manages achievements, badges, and rewards
// Tracks player accomplishments across all game systems

import mongoose, { Schema, Document, Model } from 'mongoose';
import { mongoPersistence } from './MongoPersistenceService.js';

// ============================================
// DATABASE MODELS
// ============================================

export interface IAchievementProgress {
    achievementId: string;
    progress: number;
    unlocked: boolean;
    unlockedAt: Date | null;
    tier: number;  // For tiered achievements (bronze, silver, gold)
}

export interface IPlayerAchievements extends Document {
    playerId: string;

    // Achievement tracking
    achievements: IAchievementProgress[];
    unlockedIds: string[];

    // Category stats
    categoryProgress: Record<string, number>;

    // Points and rank
    achievementPoints: number;
    achievementRank: string;

    // Special badges
    badges: string[];
    displayBadge: string | null;

    // Hidden achievements discovered
    hiddenDiscovered: string[];

    // Stats
    totalUnlocked: number;
    lastUnlocked: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

const AchievementProgressSchema = new Schema({
    achievementId: { type: String, required: true },
    progress: { type: Number, default: 0 },
    unlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date, default: null },
    tier: { type: Number, default: 0 }
}, { _id: false });

const PlayerAchievementsSchema = new Schema<IPlayerAchievements>({
    playerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    achievements: [AchievementProgressSchema],
    unlockedIds: { type: [String], default: [] },
    categoryProgress: { type: Schema.Types.Mixed, default: {} },
    achievementPoints: { type: Number, default: 0 },
    achievementRank: { type: String, default: 'novice' },
    badges: { type: [String], default: [] },
    displayBadge: { type: String, default: null },
    hiddenDiscovered: { type: [String], default: [] },
    totalUnlocked: { type: Number, default: 0 },
    lastUnlocked: { type: Date, default: null }
}, {
    timestamps: true,
    collection: 'player_achievements'
});

export const PlayerAchievements: Model<IPlayerAchievements> = mongoose.model<IPlayerAchievements>('PlayerAchievements', PlayerAchievementsSchema);

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

export interface AchievementDefinition {
    id: string;
    name: string;
    description: string;
    category: 'exploration' | 'social' | 'collection' | 'combat' | 'creative' | 'mastery' | 'special' | 'hidden';
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

    // Requirements
    requirement: {
        type: string;
        target: number;
    };

    // Tiered achievements (optional)
    tiers?: {
        targets: number[];
        names: string[];
    };

    // Rewards
    rewards: {
        points: number;
        xp?: number;
        stardust?: number;
        cosmetic?: string;
        title?: string;
        badge?: string;
    };

    // Hidden achievement?
    hidden?: boolean;
}

// Exploration achievements
const EXPLORATION_ACHIEVEMENTS: AchievementDefinition[] = [
    {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Begin your journey in the cosmos',
        category: 'exploration',
        icon: '👣',
        rarity: 'common',
        requirement: { type: 'travel', target: 100 },
        rewards: { points: 10, xp: 50 }
    },
    {
        id: 'wanderer',
        name: 'Wanderer',
        description: 'Travel far across the realm',
        category: 'exploration',
        icon: '🚶',
        rarity: 'rare',
        requirement: { type: 'travel', target: 10000 },
        tiers: { targets: [1000, 5000, 10000], names: ['Traveler', 'Explorer', 'Wanderer'] },
        rewards: { points: 50, xp: 200, title: 'Wanderer' }
    },
    {
        id: 'realm_hopper',
        name: 'Realm Hopper',
        description: 'Visit all realms',
        category: 'exploration',
        icon: '🌌',
        rarity: 'epic',
        requirement: { type: 'realms_visited', target: 5 },
        rewards: { points: 100, stardust: 500, cosmetic: 'realm_trail' }
    },
    {
        id: 'stargazer',
        name: 'Stargazer',
        description: 'Spend 24 hours in the cosmos',
        category: 'exploration',
        icon: '⭐',
        rarity: 'rare',
        requirement: { type: 'playtime_hours', target: 24 },
        tiers: { targets: [1, 10, 24, 100], names: ['Visitor', 'Regular', 'Stargazer', 'Eternal'] },
        rewards: { points: 75, title: 'Stargazer' }
    }
];

// Social achievements
const SOCIAL_ACHIEVEMENTS: AchievementDefinition[] = [
    {
        id: 'first_friend',
        name: 'First Friend',
        description: 'Form your first bond with another player',
        category: 'social',
        icon: '🤝',
        rarity: 'common',
        requirement: { type: 'bonds_formed', target: 1 },
        rewards: { points: 10, xp: 100 }
    },
    {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Form many bonds across the cosmos',
        category: 'social',
        icon: '🦋',
        rarity: 'epic',
        requirement: { type: 'bonds_formed', target: 50 },
        tiers: { targets: [5, 20, 50], names: ['Friendly', 'Popular', 'Social Butterfly'] },
        rewards: { points: 100, cosmetic: 'social_aura', title: 'Social Butterfly' }
    },
    {
        id: 'guardian_angel',
        name: 'Guardian Angel',
        description: 'Help many new players as a mentor',
        category: 'social',
        icon: '👼',
        rarity: 'legendary',
        requirement: { type: 'mentees_helped', target: 20 },
        rewards: { points: 200, badge: 'guardian', title: 'Guardian Angel' }
    },
    {
        id: 'pulse_master',
        name: 'Pulse Master',
        description: 'Send thousands of pulses',
        category: 'social',
        icon: '💫',
        rarity: 'rare',
        requirement: { type: 'pulses_sent', target: 1000 },
        tiers: { targets: [100, 500, 1000], names: ['Pulser', 'Beacon', 'Pulse Master'] },
        rewards: { points: 50, xp: 300 }
    },
    {
        id: 'generous_soul',
        name: 'Generous Soul',
        description: 'Give many gifts to others',
        category: 'social',
        icon: '🎁',
        rarity: 'rare',
        requirement: { type: 'gifts_given', target: 100 },
        rewards: { points: 75, cosmetic: 'giving_glow' }
    }
];

// Collection achievements
const COLLECTION_ACHIEVEMENTS: AchievementDefinition[] = [
    {
        id: 'star_lighter',
        name: 'Star Lighter',
        description: 'Light your first star',
        category: 'collection',
        icon: '✨',
        rarity: 'common',
        requirement: { type: 'stars_lit', target: 1 },
        rewards: { points: 10 }
    },
    {
        id: 'constellation_maker',
        name: 'Constellation Maker',
        description: 'Light thousands of stars',
        category: 'collection',
        icon: '🌟',
        rarity: 'legendary',
        requirement: { type: 'stars_lit', target: 10000 },
        tiers: { targets: [100, 1000, 5000, 10000], names: ['Star Seeker', 'Star Collector', 'Star Keeper', 'Constellation Maker'] },
        rewards: { points: 250, badge: 'constellation', cosmetic: 'star_crown' }
    },
    {
        id: 'fragment_hunter',
        name: 'Fragment Hunter',
        description: 'Collect many fragments',
        category: 'collection',
        icon: '💎',
        rarity: 'rare',
        requirement: { type: 'fragments_collected', target: 500 },
        rewards: { points: 75, stardust: 300 }
    },
    {
        id: 'companion_collector',
        name: 'Companion Collector',
        description: 'Unlock all companions',
        category: 'collection',
        icon: '🐉',
        rarity: 'legendary',
        requirement: { type: 'companions_unlocked', target: 10 },
        rewards: { points: 200, badge: 'collector', title: 'Companion Master' }
    }
];

// Mastery achievements
const MASTERY_ACHIEVEMENTS: AchievementDefinition[] = [
    {
        id: 'level_10',
        name: 'Rising Star',
        description: 'Reach level 10',
        category: 'mastery',
        icon: '📈',
        rarity: 'common',
        requirement: { type: 'level', target: 10 },
        rewards: { points: 25, stardust: 100 }
    },
    {
        id: 'level_50',
        name: 'Veteran',
        description: 'Reach level 50',
        category: 'mastery',
        icon: '🏆',
        rarity: 'epic',
        requirement: { type: 'level', target: 50 },
        rewards: { points: 150, title: 'Veteran', cosmetic: 'veteran_wings' }
    },
    {
        id: 'level_100',
        name: 'Legend',
        description: 'Reach the maximum level',
        category: 'mastery',
        icon: '👑',
        rarity: 'mythic',
        requirement: { type: 'level', target: 100 },
        rewards: { points: 500, badge: 'legend', title: 'Legend', cosmetic: 'legendary_aura' }
    },
    {
        id: 'quest_master',
        name: 'Quest Master',
        description: 'Complete 100 quests',
        category: 'mastery',
        icon: '📜',
        rarity: 'epic',
        requirement: { type: 'quests_completed', target: 100 },
        rewards: { points: 150, title: 'Quest Master' }
    },
    {
        id: 'challenge_champion',
        name: 'Challenge Champion',
        description: 'Complete 500 challenges',
        category: 'mastery',
        icon: '⚔️',
        rarity: 'legendary',
        requirement: { type: 'challenges_completed', target: 500 },
        rewards: { points: 200, badge: 'champion' }
    }
];

// Hidden achievements (discovered when unlocked)
const HIDDEN_ACHIEVEMENTS: AchievementDefinition[] = [
    {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Play between midnight and 4 AM',
        category: 'hidden',
        icon: '🦉',
        rarity: 'rare',
        requirement: { type: 'play_night', target: 1 },
        hidden: true,
        rewards: { points: 50, cosmetic: 'night_trail' }
    },
    {
        id: 'lonely_star',
        name: 'Lonely Star',
        description: 'Wander alone for an hour',
        category: 'hidden',
        icon: '😢',
        rarity: 'rare',
        requirement: { type: 'solo_time', target: 60 },
        hidden: true,
        rewards: { points: 50, title: 'Lone Wolf' }
    },
    {
        id: 'cosmic_dancer',
        name: 'Cosmic Dancer',
        description: 'Perform 1000 spins',
        category: 'hidden',
        icon: '💃',
        rarity: 'epic',
        requirement: { type: 'spins', target: 1000 },
        hidden: true,
        rewards: { points: 100, cosmetic: 'dancer_trail' }
    }
];

// Combine all achievements
const ALL_ACHIEVEMENTS = new Map<string, AchievementDefinition>();
[
    ...EXPLORATION_ACHIEVEMENTS,
    ...SOCIAL_ACHIEVEMENTS,
    ...COLLECTION_ACHIEVEMENTS,
    ...MASTERY_ACHIEVEMENTS,
    ...HIDDEN_ACHIEVEMENTS
].forEach(a => ALL_ACHIEVEMENTS.set(a.id, a));

// Achievement ranks based on points
const ACHIEVEMENT_RANKS = [
    { minPoints: 0, rank: 'novice', name: 'Novice' },
    { minPoints: 100, rank: 'apprentice', name: 'Apprentice' },
    { minPoints: 300, rank: 'journeyman', name: 'Journeyman' },
    { minPoints: 600, rank: 'expert', name: 'Expert' },
    { minPoints: 1000, rank: 'master', name: 'Master' },
    { minPoints: 1500, rank: 'grandmaster', name: 'Grand Master' },
    { minPoints: 2500, rank: 'legend', name: 'Legend' }
];

// ============================================
// ACHIEVEMENT SERVICE CLASS
// ============================================

export class AchievementService {
    private initialized: boolean = false;
    private memoryStore: Map<string, IPlayerAchievements> = new Map();

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('🏆 Achievement service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    private useMongo(): boolean {
        return mongoPersistence.isReady();
    }

    private async saveAchievements(data: IPlayerAchievements | any): Promise<void> {
        if (this.useMongo() && typeof data.save === 'function') {
            await data.save();
        } else {
            // In-memory save
            this.memoryStore.set(data.playerId, data);
        }
    }

    // ========================================
    // DATA ACCESS
    // ========================================

    async getPlayerAchievements(playerId: string): Promise<IPlayerAchievements> {
        if (this.useMongo()) {
            let data = await PlayerAchievements.findOne({ playerId });

            if (!data) {
                data = new PlayerAchievements({
                    playerId,
                    achievements: [],
                    unlockedIds: [],
                    categoryProgress: {},
                    badges: [],
                    hiddenDiscovered: [],
                    achievementPoints: 0,
                    achievementRank: 'novice',
                    displayBadge: null,
                    totalUnlocked: 0,
                    lastUnlocked: null
                });
                await this.saveAchievements(data);
            }
            return data;
        } else {
            // In-memory fallback
            let data = this.memoryStore.get(playerId);
            if (!data) {
                data = {
                    playerId,
                    achievements: [],
                    unlockedIds: [],
                    categoryProgress: {},
                    badges: [],
                    hiddenDiscovered: [],
                    achievementPoints: 0,
                    achievementRank: 'novice',
                    displayBadge: null,
                    totalUnlocked: 0,
                    lastUnlocked: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any;
                this.memoryStore.set(playerId, data!);
            }
            return data!;
        }
    }

    // ========================================
    // PROGRESS TRACKING
    // ========================================

    async updateProgress(playerId: string, type: string, value: number, absolute: boolean = false): Promise<{
        updated: boolean;
        unlocked: AchievementDefinition[];
    }> {
        const data = await this.getPlayerAchievements(playerId);
        const unlocked: AchievementDefinition[] = [];
        let updated = false;

        // Find all achievements that track this type
        for (const [achievementId, definition] of ALL_ACHIEVEMENTS) {
            if (definition.requirement.type !== type) continue;
            if (data.unlockedIds.includes(achievementId)) continue;

            // Get or create progress
            let progress = data.achievements.find(a => a.achievementId === achievementId);

            if (!progress) {
                progress = {
                    achievementId,
                    progress: 0,
                    unlocked: false,
                    unlockedAt: null,
                    tier: 0
                };
                data.achievements.push(progress);
            }

            // Update progress
            if (absolute) {
                progress.progress = value;
            } else {
                progress.progress += value;
            }
            updated = true;

            // Check for tier progress
            if (definition.tiers) {
                for (let i = progress.tier; i < definition.tiers.targets.length; i++) {
                    if (progress.progress >= definition.tiers.targets[i]) {
                        progress.tier = i + 1;
                    }
                }
            }

            // Check for unlock
            if (progress.progress >= definition.requirement.target && !progress.unlocked) {
                progress.unlocked = true;
                progress.unlockedAt = new Date();
                data.unlockedIds.push(achievementId);
                data.totalUnlocked++;
                data.lastUnlocked = new Date();
                data.achievementPoints += definition.rewards.points;

                // Add badge if rewarded
                if (definition.rewards.badge && !data.badges.includes(definition.rewards.badge)) {
                    data.badges.push(definition.rewards.badge);
                }

                // Track hidden discovery
                if (definition.hidden && !data.hiddenDiscovered.includes(achievementId)) {
                    data.hiddenDiscovered.push(achievementId);
                }

                unlocked.push(definition);
            }
        }

        // Update rank
        data.achievementRank = this.calculateRank(data.achievementPoints);

        // Update category progress
        data.categoryProgress[type] = (data.categoryProgress[type] || 0) + value;

        if (updated) {
            await this.saveAchievements(data);
        }

        return { updated, unlocked };
    }

    private calculateRank(points: number): string {
        let rank = 'novice';
        for (const r of ACHIEVEMENT_RANKS) {
            if (points >= r.minPoints) {
                rank = r.rank;
            }
        }
        return rank;
    }

    // ========================================
    // ACHIEVEMENT QUERIES
    // ========================================

    async getUnlockedAchievements(playerId: string): Promise<AchievementDefinition[]> {
        const data = await this.getPlayerAchievements(playerId);

        return data.unlockedIds
            .map(id => ALL_ACHIEVEMENTS.get(id))
            .filter((a): a is AchievementDefinition => a !== undefined);
    }

    async getAchievementProgress(playerId: string): Promise<{
        achievement: AchievementDefinition;
        progress: number;
        unlocked: boolean;
        tier: number;
    }[]> {
        const data = await this.getPlayerAchievements(playerId);
        const result: {
            achievement: AchievementDefinition;
            progress: number;
            unlocked: boolean;
            tier: number;
        }[] = [];

        for (const [id, definition] of ALL_ACHIEVEMENTS) {
            // Skip hidden achievements that aren't discovered
            if (definition.hidden && !data.hiddenDiscovered.includes(id) && !data.unlockedIds.includes(id)) {
                continue;
            }

            const progress = data.achievements.find(a => a.achievementId === id);

            result.push({
                achievement: definition,
                progress: progress?.progress || 0,
                unlocked: progress?.unlocked || false,
                tier: progress?.tier || 0
            });
        }

        return result;
    }

    async getAchievementsByCategory(playerId: string, category: string): Promise<{
        achievement: AchievementDefinition;
        progress: number;
        unlocked: boolean;
    }[]> {
        const allProgress = await this.getAchievementProgress(playerId);
        return allProgress.filter(a => a.achievement.category === category);
    }

    // ========================================
    // BADGES
    // ========================================

    async getPlayerBadges(playerId: string): Promise<string[]> {
        const data = await this.getPlayerAchievements(playerId);
        return data.badges;
    }

    async setDisplayBadge(playerId: string, badge: string | null): Promise<boolean> {
        const data = await this.getPlayerAchievements(playerId);

        if (badge && !data.badges.includes(badge)) {
            return false;
        }

        data.displayBadge = badge;
        await this.saveAchievements(data);
        return true;
    }

    // ========================================
    // STATS & RANKS
    // ========================================

    async getAchievementStats(playerId: string): Promise<{
        totalUnlocked: number;
        totalAchievements: number;
        points: number;
        rank: string;
        rankName: string;
        nextRank: { name: string; pointsNeeded: number } | null;
        categoryBreakdown: Record<string, { unlocked: number; total: number }>;
    }> {
        const data = await this.getPlayerAchievements(playerId);

        // Calculate category breakdown
        const categoryBreakdown: Record<string, { unlocked: number; total: number }> = {};

        for (const [id, def] of ALL_ACHIEVEMENTS) {
            if (!categoryBreakdown[def.category]) {
                categoryBreakdown[def.category] = { unlocked: 0, total: 0 };
            }
            categoryBreakdown[def.category].total++;

            if (data.unlockedIds.includes(id)) {
                categoryBreakdown[def.category].unlocked++;
            }
        }

        // Get rank info
        const currentRankIndex = ACHIEVEMENT_RANKS.findIndex(r => r.rank === data.achievementRank);
        const currentRankInfo = ACHIEVEMENT_RANKS[currentRankIndex] || ACHIEVEMENT_RANKS[0];
        const nextRankInfo = ACHIEVEMENT_RANKS[currentRankIndex + 1];

        return {
            totalUnlocked: data.totalUnlocked,
            totalAchievements: ALL_ACHIEVEMENTS.size,
            points: data.achievementPoints,
            rank: data.achievementRank,
            rankName: currentRankInfo.name,
            nextRank: nextRankInfo
                ? { name: nextRankInfo.name, pointsNeeded: nextRankInfo.minPoints - data.achievementPoints }
                : null,
            categoryBreakdown
        };
    }

    // ========================================
    // LEADERBOARD
    // ========================================

    async getAchievementLeaderboard(limit: number = 10): Promise<{
        rank: number;
        playerId: string;
        points: number;
        achievementRank: string;
        totalUnlocked: number;
    }[]> {
        const topPlayers = await PlayerAchievements
            .find({})
            .sort({ achievementPoints: -1 })
            .limit(limit)
            .lean();

        return topPlayers.map((player, index) => ({
            rank: index + 1,
            playerId: player.playerId,
            points: player.achievementPoints,
            achievementRank: player.achievementRank,
            totalUnlocked: player.totalUnlocked
        }));
    }

    // ========================================
    // CATALOG
    // ========================================

    getAchievementDefinition(achievementId: string): AchievementDefinition | null {
        return ALL_ACHIEVEMENTS.get(achievementId) || null;
    }

    getAllAchievements(includeHidden: boolean = false): AchievementDefinition[] {
        const achievements: AchievementDefinition[] = [];

        for (const def of ALL_ACHIEVEMENTS.values()) {
            if (!includeHidden && def.hidden) continue;
            achievements.push(def);
        }

        return achievements;
    }

    getAchievementRanks(): { rank: string; name: string; minPoints: number }[] {
        return ACHIEVEMENT_RANKS.map(r => ({
            rank: r.rank,
            name: r.name,
            minPoints: r.minPoints
        }));
    }
}

export const achievementService = new AchievementService();
