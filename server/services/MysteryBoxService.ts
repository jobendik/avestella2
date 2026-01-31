// =============================================================================
// Mystery Box Service - Server-side loot box system
// =============================================================================
// Handles mystery box purchases, opening, pity system, and rewards

import { EventEmitter } from 'events';
import { mongoPersistence } from './MongoPersistenceService.js';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type MysteryBoxTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface MysteryBoxReward {
    type: 'stardust' | 'crystals' | 'cosmetic' | 'title' | 'xp_boost' | 'emote';
    rarity: Rarity;
    value: number | string;
    weight: number;
}

export interface MysteryBoxConfig {
    id: MysteryBoxTier;
    name: string;
    stardustCost: number;
    crystalCost: number;
    rewards: MysteryBoxReward[];
    guaranteedRarity?: Rarity;
}

export interface BoxOpenResult {
    success: boolean;
    error?: string;
    reward?: {
        type: string;
        rarity: Rarity;
        value: number | string;
        displayName: string;
        isPityReward: boolean;
    };
    pityProgress?: {
        current: number;
        threshold: number;
    };
}

export interface PlayerBoxStats {
    playerId: string;
    boxesOpened: Record<MysteryBoxTier, number>;
    pityCounters: Record<MysteryBoxTier, number>;
    lastOpenTime: number;
    totalSpent: {
        stardust: number;
        crystals: number;
    };
    rewardsReceived: Array<{
        boxTier: MysteryBoxTier;
        reward: MysteryBoxReward;
        timestamp: number;
    }>;
}

// Box configurations
const MYSTERY_BOXES: Record<MysteryBoxTier, MysteryBoxConfig> = {
    common: {
        id: 'common',
        name: 'Common Lumina Box',
        stardustCost: 500,
        crystalCost: 0,
        rewards: [
            { type: 'stardust', rarity: 'common', value: 100, weight: 40 },
            { type: 'stardust', rarity: 'common', value: 200, weight: 25 },
            { type: 'xp_boost', rarity: 'common', value: 'xp_boost_30m', weight: 20 },
            { type: 'cosmetic', rarity: 'uncommon', value: 'random_common_trail', weight: 10 },
            { type: 'emote', rarity: 'uncommon', value: 'random_common_emote', weight: 5 },
        ],
    },
    rare: {
        id: 'rare',
        name: 'Rare Lumina Box',
        stardustCost: 1500,
        crystalCost: 0,
        rewards: [
            { type: 'stardust', rarity: 'common', value: 300, weight: 30 },
            { type: 'stardust', rarity: 'uncommon', value: 500, weight: 20 },
            { type: 'xp_boost', rarity: 'uncommon', value: 'xp_boost_1h', weight: 20 },
            { type: 'cosmetic', rarity: 'rare', value: 'random_rare_cosmetic', weight: 15 },
            { type: 'emote', rarity: 'rare', value: 'random_rare_emote', weight: 10 },
            { type: 'crystals', rarity: 'rare', value: 50, weight: 5 },
        ],
        guaranteedRarity: 'uncommon',
    },
    epic: {
        id: 'epic',
        name: 'Epic Lumina Box',
        stardustCost: 5000,
        crystalCost: 250,
        rewards: [
            { type: 'stardust', rarity: 'uncommon', value: 750, weight: 25 },
            { type: 'stardust', rarity: 'rare', value: 1000, weight: 15 },
            { type: 'cosmetic', rarity: 'epic', value: 'random_epic_cosmetic', weight: 25 },
            { type: 'emote', rarity: 'epic', value: 'random_epic_emote', weight: 15 },
            { type: 'crystals', rarity: 'epic', value: 100, weight: 10 },
            { type: 'title', rarity: 'epic', value: 'random_epic_title', weight: 10 },
        ],
        guaranteedRarity: 'rare',
    },
    legendary: {
        id: 'legendary',
        name: 'Legendary Lumina Box',
        stardustCost: 15000,
        crystalCost: 750,
        rewards: [
            { type: 'stardust', rarity: 'rare', value: 2000, weight: 20 },
            { type: 'cosmetic', rarity: 'legendary', value: 'random_legendary_cosmetic', weight: 30 },
            { type: 'emote', rarity: 'legendary', value: 'random_legendary_emote', weight: 15 },
            { type: 'crystals', rarity: 'legendary', value: 300, weight: 15 },
            { type: 'title', rarity: 'legendary', value: 'random_legendary_title', weight: 15 },
            { type: 'cosmetic', rarity: 'legendary', value: 'legendary_set_piece', weight: 5 },
        ],
        guaranteedRarity: 'epic',
    },
    mythic: {
        id: 'mythic',
        name: 'Mythic Lumina Box',
        stardustCost: 0,
        crystalCost: 2000,
        rewards: [
            { type: 'cosmetic', rarity: 'legendary', value: 'random_mythic_cosmetic', weight: 35 },
            { type: 'crystals', rarity: 'legendary', value: 500, weight: 20 },
            { type: 'title', rarity: 'legendary', value: 'mythic_title', weight: 15 },
            { type: 'cosmetic', rarity: 'legendary', value: 'complete_mythic_set', weight: 10 },
            { type: 'cosmetic', rarity: 'legendary', value: 'exclusive_mythic_aura', weight: 10 },
            { type: 'crystals', rarity: 'legendary', value: 1000, weight: 10 },
        ],
        guaranteedRarity: 'legendary',
    },
};

// Pity system thresholds
const PITY_THRESHOLDS: Record<MysteryBoxTier, { threshold: number; guaranteedRarity: Rarity }> = {
    common: { threshold: 10, guaranteedRarity: 'rare' },
    rare: { threshold: 15, guaranteedRarity: 'epic' },
    epic: { threshold: 20, guaranteedRarity: 'legendary' },
    legendary: { threshold: 10, guaranteedRarity: 'legendary' },
    mythic: { threshold: 5, guaranteedRarity: 'legendary' },
};

// Cosmetic pools for random rewards
const COSMETIC_POOLS: Record<Rarity, string[]> = {
    common: ['trail_basic_1', 'trail_basic_2', 'color_pastel_1', 'color_pastel_2'],
    uncommon: ['trail_shimmer', 'trail_sparkle', 'aura_soft_glow', 'frame_basic'],
    rare: ['trail_rainbow', 'trail_stardust', 'aura_pulsing', 'frame_ornate', 'companion_spark'],
    epic: ['trail_cosmic', 'trail_nebula', 'aura_ethereal', 'frame_golden', 'companion_wisp'],
    legendary: ['trail_aurora', 'trail_void', 'aura_legendary', 'frame_diamond', 'companion_phoenix'],
};

const EMOTE_POOLS: Record<Rarity, string[]> = {
    common: ['wave', 'nod', 'spin'],
    uncommon: ['dance', 'bow', 'cheer'],
    rare: ['fireworks', 'hearts', 'stars'],
    epic: ['explosion', 'rainbow', 'galaxy'],
    legendary: ['cosmic_dance', 'supernova', 'transcend'],
};

const TITLE_POOLS: Record<Rarity, string[]> = {
    common: [],
    uncommon: [],
    rare: ['Wanderer', 'Seeker', 'Dreamer'],
    epic: ['Stargazer', 'Cosmic Traveler', 'Light Bearer'],
    legendary: ['Celestial', 'Eternal', 'Transcendent'],
};

class MysteryBoxService extends EventEmitter {
    private playerStats: Map<string, PlayerBoxStats> = new Map();

    async initialize(): Promise<void> {
        console.log('📦 Mystery Box Service initializing...');
        console.log('📦 Mystery Box Service initialized');
    }

    // =========================================================================
    // Box Operations
    // =========================================================================

    getBoxConfig(tier: MysteryBoxTier): MysteryBoxConfig | null {
        return MYSTERY_BOXES[tier] || null;
    }

    getAllBoxConfigs(): MysteryBoxConfig[] {
        return Object.values(MYSTERY_BOXES);
    }

    /**
     * Check if player can afford a box
     */
    canAffordBox(
        tier: MysteryBoxTier,
        playerStardust: number,
        playerCrystals: number
    ): { canAfford: boolean; stardustNeeded: number; crystalsNeeded: number } {
        const config = MYSTERY_BOXES[tier];
        if (!config) {
            return { canAfford: false, stardustNeeded: 0, crystalsNeeded: 0 };
        }

        const stardustNeeded = Math.max(0, config.stardustCost - playerStardust);
        const crystalsNeeded = Math.max(0, config.crystalCost - playerCrystals);

        return {
            canAfford: stardustNeeded === 0 && crystalsNeeded === 0,
            stardustNeeded,
            crystalsNeeded
        };
    }

    /**
     * Open a mystery box (after payment is processed externally)
     */
    async openBox(playerId: string, tier: MysteryBoxTier): Promise<BoxOpenResult> {
        const config = MYSTERY_BOXES[tier];
        if (!config) {
            return { success: false, error: 'Invalid box tier' };
        }

        const stats = await this.getPlayerStats(playerId);
        
        // Increment counters
        stats.boxesOpened[tier] = (stats.boxesOpened[tier] || 0) + 1;
        stats.pityCounters[tier] = (stats.pityCounters[tier] || 0) + 1;
        stats.lastOpenTime = Date.now();
        stats.totalSpent.stardust += config.stardustCost;
        stats.totalSpent.crystals += config.crystalCost;

        // Check pity system
        const pity = PITY_THRESHOLDS[tier];
        const isPityReward = stats.pityCounters[tier] >= pity.threshold;
        
        // Roll for reward
        let reward: MysteryBoxReward;
        if (isPityReward) {
            // Guaranteed high rarity reward
            reward = this.rollRewardWithMinRarity(config.rewards, pity.guaranteedRarity);
            stats.pityCounters[tier] = 0; // Reset pity counter
        } else {
            reward = this.rollReward(config.rewards);
        }

        // Resolve random values
        const resolvedValue = this.resolveRandomValue(reward);
        const displayName = this.getDisplayName(reward.type, resolvedValue, reward.rarity);

        // Record reward
        stats.rewardsReceived.push({
            boxTier: tier,
            reward: { ...reward, value: resolvedValue },
            timestamp: Date.now()
        });

        // Keep only last 100 rewards in memory
        if (stats.rewardsReceived.length > 100) {
            stats.rewardsReceived = stats.rewardsReceived.slice(-100);
        }

        // Persist
        await this.persistPlayerStats(stats);

        // Emit event
        this.emit('box_opened', {
            playerId,
            tier,
            reward: { ...reward, value: resolvedValue },
            isPityReward
        });

        return {
            success: true,
            reward: {
                type: reward.type,
                rarity: reward.rarity,
                value: resolvedValue,
                displayName,
                isPityReward
            },
            pityProgress: {
                current: stats.pityCounters[tier],
                threshold: pity.threshold
            }
        };
    }

    /**
     * Roll a random reward based on weights
     */
    private rollReward(rewards: MysteryBoxReward[]): MysteryBoxReward {
        const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
        let roll = Math.random() * totalWeight;
        
        for (const reward of rewards) {
            roll -= reward.weight;
            if (roll <= 0) {
                return reward;
            }
        }
        
        return rewards[rewards.length - 1];
    }

    /**
     * Roll reward with minimum rarity (for pity system)
     */
    private rollRewardWithMinRarity(rewards: MysteryBoxReward[], minRarity: Rarity): MysteryBoxReward {
        const rarityOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const minIndex = rarityOrder.indexOf(minRarity);
        
        const filteredRewards = rewards.filter(r => 
            rarityOrder.indexOf(r.rarity) >= minIndex
        );
        
        if (filteredRewards.length === 0) {
            // Fallback to any reward
            return this.rollReward(rewards);
        }
        
        return this.rollReward(filteredRewards);
    }

    /**
     * Resolve random value strings to actual items
     */
    private resolveRandomValue(reward: MysteryBoxReward): string | number {
        if (typeof reward.value === 'number') {
            return reward.value;
        }

        const value = reward.value;
        
        // Handle random cosmetics
        if (value.startsWith('random_') && value.includes('cosmetic')) {
            const pool = COSMETIC_POOLS[reward.rarity] || COSMETIC_POOLS.common;
            return pool[Math.floor(Math.random() * pool.length)];
        }
        
        // Handle random emotes
        if (value.startsWith('random_') && value.includes('emote')) {
            const pool = EMOTE_POOLS[reward.rarity] || EMOTE_POOLS.common;
            return pool[Math.floor(Math.random() * pool.length)];
        }
        
        // Handle random titles
        if (value.startsWith('random_') && value.includes('title')) {
            const pool = TITLE_POOLS[reward.rarity] || [];
            if (pool.length > 0) {
                return pool[Math.floor(Math.random() * pool.length)];
            }
        }
        
        return value;
    }

    /**
     * Get display name for a reward
     */
    private getDisplayName(type: string, value: string | number, rarity: Rarity): string {
        if (type === 'stardust') return `${value} Stardust`;
        if (type === 'crystals') return `${value} Cosmic Crystals`;
        if (type === 'xp_boost') return 'XP Boost';
        if (typeof value === 'string') {
            // Convert snake_case to Title Case
            return value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        return `${rarity} Reward`;
    }

    // =========================================================================
    // Player Stats
    // =========================================================================

    async getPlayerStats(playerId: string): Promise<PlayerBoxStats> {
        let stats = this.playerStats.get(playerId);
        
        if (!stats) {
            // Try loading from database
            try {
                if (mongoPersistence.isReady()) {
                    const saved = await mongoPersistence.getCollection('mystery_box_stats')?.findOne({ playerId });
                    if (saved) {
                        stats = saved as unknown as PlayerBoxStats;
                        this.playerStats.set(playerId, stats);
                        return stats;
                    }
                }
            } catch (error) {
                console.error('Failed to load mystery box stats:', error);
            }
            
            // Create new stats
            stats = {
                playerId,
                boxesOpened: {} as Record<MysteryBoxTier, number>,
                pityCounters: {} as Record<MysteryBoxTier, number>,
                lastOpenTime: 0,
                totalSpent: { stardust: 0, crystals: 0 },
                rewardsReceived: []
            };
            this.playerStats.set(playerId, stats);
        }
        
        return stats;
    }

    async getPityProgress(playerId: string, tier: MysteryBoxTier): Promise<{
        current: number;
        threshold: number;
        percentage: number;
    }> {
        const stats = await this.getPlayerStats(playerId);
        const pity = PITY_THRESHOLDS[tier];
        const current = stats.pityCounters[tier] || 0;
        
        return {
            current,
            threshold: pity.threshold,
            percentage: Math.round((current / pity.threshold) * 100)
        };
    }

    // =========================================================================
    // Persistence
    // =========================================================================

    private async persistPlayerStats(stats: PlayerBoxStats): Promise<void> {
        try {
            if (mongoPersistence.isReady()) {
                await mongoPersistence.getCollection('mystery_box_stats')?.updateOne(
                    { playerId: stats.playerId },
                    { $set: stats },
                    { upsert: true }
                );
            }
        } catch (error) {
            console.error('Failed to persist mystery box stats:', error);
        }
    }

    // =========================================================================
    // Analytics
    // =========================================================================

    async getGlobalStats(): Promise<{
        totalBoxesOpened: Record<MysteryBoxTier, number>;
        totalStardustSpent: number;
        totalCrystalsSpent: number;
    }> {
        const stats = {
            totalBoxesOpened: {} as Record<MysteryBoxTier, number>,
            totalStardustSpent: 0,
            totalCrystalsSpent: 0
        };

        for (const playerStats of this.playerStats.values()) {
            for (const [tier, count] of Object.entries(playerStats.boxesOpened)) {
                stats.totalBoxesOpened[tier as MysteryBoxTier] = 
                    (stats.totalBoxesOpened[tier as MysteryBoxTier] || 0) + count;
            }
            stats.totalStardustSpent += playerStats.totalSpent.stardust;
            stats.totalCrystalsSpent += playerStats.totalSpent.crystals;
        }

        return stats;
    }
}

export const mysteryBoxService = new MysteryBoxService();
export { MysteryBoxService };
