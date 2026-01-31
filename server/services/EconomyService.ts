// Economy Service - Manages premium currency, mystery boxes, boosts, and purchases
// Per lumina-viral-bible.md Sections 6.2 and 9.6

import { PurchaseHistory, IPurchaseHistory, ActiveBoost, IActiveBoost, StreakFreeze } from '../database/socialModels.js';
import { Progression } from '../database/progressionModels.js';
import crypto from 'crypto';

// Crystal packages from constants/economy.ts
const CRYSTAL_PACKAGES = [
    { id: 'starter', crystals: 100, bonusCrystals: 0, priceUSD: 0.99 },
    { id: 'small', crystals: 500, bonusCrystals: 50, priceUSD: 4.99 },
    { id: 'medium', crystals: 1200, bonusCrystals: 200, priceUSD: 9.99 },
    { id: 'large', crystals: 2800, bonusCrystals: 600, priceUSD: 19.99 },
    { id: 'jumbo', crystals: 6500, bonusCrystals: 1800, priceUSD: 49.99 },
    { id: 'mega', crystals: 14000, bonusCrystals: 5000, priceUSD: 99.99 },
];

// Mystery box configurations from constants/economy.ts
const MYSTERY_BOXES: Record<string, {
    stardustCost: number;
    crystalCost: number;
    rewards: { type: string; rarity: string; value: number | string; weight: number }[];
    guaranteedRarity?: string;
}> = {
    common: {
        stardustCost: 500,
        crystalCost: 0,
        rewards: [
            { type: 'stardust', rarity: 'common', value: 100, weight: 40 },
            { type: 'stardust', rarity: 'common', value: 200, weight: 25 },
            { type: 'xp_boost', rarity: 'common', value: 'xp_boost_30m', weight: 20 },
            { type: 'cosmetic', rarity: 'uncommon', value: 'random_common_trail', weight: 10 },
            { type: 'emote', rarity: 'uncommon', value: 'random_common_emote', weight: 5 },
        ]
    },
    rare: {
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
        guaranteedRarity: 'uncommon'
    },
    epic: {
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
        guaranteedRarity: 'rare'
    },
    legendary: {
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
        guaranteedRarity: 'epic'
    },
    mythic: {
        stardustCost: 0,
        crystalCost: 2000,
        rewards: [
            { type: 'cosmetic', rarity: 'legendary', value: 'random_legendary_cosmetic', weight: 30 },
            { type: 'cosmetic', rarity: 'mythic', value: 'random_mythic_cosmetic', weight: 25 },
            { type: 'crystals', rarity: 'mythic', value: 500, weight: 15 },
            { type: 'title', rarity: 'mythic', value: 'random_mythic_title', weight: 10 },
            { type: 'companion', rarity: 'mythic', value: 'random_mythic_companion', weight: 10 },
            { type: 'cosmetic', rarity: 'mythic', value: 'mythic_set_piece', weight: 10 },
        ],
        guaranteedRarity: 'legendary'
    }
};

// Boost durations in milliseconds
const BOOST_DURATIONS: Record<string, number> = {
    'xp_boost_30m': 30 * 60 * 1000,
    'xp_boost_1h': 60 * 60 * 1000,
    'xp_boost_24h': 24 * 60 * 60 * 1000,
    'stardust_boost_1h': 60 * 60 * 1000,
    'stardust_boost_24h': 24 * 60 * 60 * 1000,
};

function generatePurchaseId(): string {
    return 'purchase_' + crypto.randomBytes(8).toString('hex');
}

function weightedRandom<T extends { weight: number }>(items: T[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
        random -= item.weight;
        if (random <= 0) return item;
    }
    
    return items[items.length - 1];
}

export class EconomyService {
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('💎 Economy service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    // ========================================
    // CRYSTAL MANAGEMENT
    // ========================================

    async getCrystals(playerId: string): Promise<number> {
        const progression = await Progression.findOne({ playerId });
        return progression?.crystals || 0;
    }

    async addCrystals(playerId: string, amount: number, source: string): Promise<number> {
        const result = await Progression.findOneAndUpdate(
            { playerId },
            { $inc: { crystals: amount } },
            { new: true, upsert: true }
        );
        
        console.log(`💎 ${playerId} received ${amount} crystals from ${source}`);
        return result?.crystals || amount;
    }

    async spendCrystals(playerId: string, amount: number): Promise<{
        success: boolean;
        newBalance?: number;
        error?: string;
    }> {
        const progression = await Progression.findOne({ playerId });
        if (!progression || progression.crystals < amount) {
            return { success: false, error: 'Insufficient crystals' };
        }

        progression.crystals -= amount;
        await progression.save();

        return { success: true, newBalance: progression.crystals };
    }

    // ========================================
    // MYSTERY BOXES
    // ========================================

    async openMysteryBox(playerId: string, boxTier: string): Promise<{
        success: boolean;
        rewards?: { type: string; value: string | number; rarity: string }[];
        error?: string;
    }> {
        const boxConfig = MYSTERY_BOXES[boxTier];
        if (!boxConfig) {
            return { success: false, error: 'Invalid box tier' };
        }

        // Check and deduct costs
        const progression = await Progression.findOne({ playerId });
        if (!progression) {
            return { success: false, error: 'Player not found' };
        }

        if (boxConfig.stardustCost > 0 && progression.stardust < boxConfig.stardustCost) {
            return { success: false, error: 'Insufficient stardust' };
        }
        if (boxConfig.crystalCost > 0 && progression.crystals < boxConfig.crystalCost) {
            return { success: false, error: 'Insufficient crystals' };
        }

        // Deduct costs
        if (boxConfig.stardustCost > 0) {
            progression.stardust -= boxConfig.stardustCost;
        }
        if (boxConfig.crystalCost > 0) {
            progression.crystals -= boxConfig.crystalCost;
        }
        await progression.save();

        // Roll for rewards
        const reward = weightedRandom(boxConfig.rewards);
        const rewards = [{
            type: reward.type,
            value: reward.value,
            rarity: reward.rarity
        }];

        // Record purchase
        const purchase = new PurchaseHistory({
            purchaseId: generatePurchaseId(),
            playerId,
            itemType: 'mystery_box',
            itemId: boxTier,
            crystalCost: boxConfig.crystalCost,
            stardustCost: boxConfig.stardustCost,
            realMoneyCost: 0,
            rewards
        });
        await purchase.save();

        // Apply rewards
        await this.applyRewards(playerId, rewards);

        return { success: true, rewards };
    }

    private async applyRewards(playerId: string, rewards: { type: string; value: string | number; rarity: string }[]): Promise<void> {
        for (const reward of rewards) {
            switch (reward.type) {
                case 'stardust':
                    await Progression.findOneAndUpdate(
                        { playerId },
                        { $inc: { stardust: reward.value as number } }
                    );
                    break;
                case 'crystals':
                    await Progression.findOneAndUpdate(
                        { playerId },
                        { $inc: { crystals: reward.value as number } }
                    );
                    break;
                case 'xp_boost':
                case 'stardust_boost':
                    await this.activateBoost(playerId, reward.value as string, 'reward');
                    break;
                case 'cosmetic':
                case 'emote':
                case 'title':
                    await Progression.findOneAndUpdate(
                        { playerId },
                        { $addToSet: { unlockedCosmetics: reward.value } }
                    );
                    break;
            }
        }
    }

    // ========================================
    // BOOSTS
    // ========================================

    async activateBoost(playerId: string, boostId: string, source: 'purchase' | 'reward' | 'event' | 'referral'): Promise<IActiveBoost | null> {
        const duration = BOOST_DURATIONS[boostId];
        if (!duration) return null;

        const boostType = boostId.includes('xp') ? 'xp' : boostId.includes('stardust') ? 'stardust' : 'fragment';
        
        const boost = new ActiveBoost({
            playerId,
            boostType,
            multiplier: 2.0,
            startTime: new Date(),
            endTime: new Date(Date.now() + duration),
            source
        });
        await boost.save();

        return boost;
    }

    async getActiveBoosts(playerId: string): Promise<IActiveBoost[]> {
        return ActiveBoost.find({
            playerId,
            endTime: { $gt: new Date() }
        });
    }

    async getBoostMultiplier(playerId: string, boostType: 'xp' | 'stardust' | 'fragment'): Promise<number> {
        const boosts = await ActiveBoost.find({
            playerId,
            boostType,
            endTime: { $gt: new Date() }
        });

        if (boosts.length === 0) return 1.0;
        
        // Stack boosts multiplicatively (capped at 4x)
        const multiplier = boosts.reduce((mult, boost) => mult * boost.multiplier, 1.0);
        return Math.min(multiplier, 4.0);
    }

    // ========================================
    // STREAK FREEZE
    // ========================================

    async purchaseStreakFreeze(playerId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const FREEZE_COST = 100; // crystals
        
        const spendResult = await this.spendCrystals(playerId, FREEZE_COST);
        if (!spendResult.success) {
            return { success: false, error: spendResult.error };
        }

        const freeze = new StreakFreeze({
            playerId,
            purchasedAt: new Date()
        });
        await freeze.save();

        // Record purchase
        const purchase = new PurchaseHistory({
            purchaseId: generatePurchaseId(),
            playerId,
            itemType: 'boost',
            itemId: 'streak_freeze',
            crystalCost: FREEZE_COST,
            stardustCost: 0,
            realMoneyCost: 0,
            rewards: []
        });
        await purchase.save();

        return { success: true };
    }

    async useStreakFreeze(playerId: string, date: string): Promise<boolean> {
        const freeze = await StreakFreeze.findOneAndUpdate(
            { playerId, usedAt: null },
            { $set: { freezeDate: date, usedAt: new Date() } }
        );
        return !!freeze;
    }

    async hasStreakFreeze(playerId: string): Promise<boolean> {
        const freeze = await StreakFreeze.findOne({ playerId, usedAt: null });
        return !!freeze;
    }

    // ========================================
    // PURCHASE HISTORY
    // ========================================

    async getPurchaseHistory(playerId: string, limit: number = 50): Promise<IPurchaseHistory[]> {
        return PurchaseHistory.find({ playerId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    async recordPurchase(
        playerId: string,
        itemType: 'crystal_pack' | 'mystery_box' | 'cosmetic' | 'boost' | 'season_pass',
        itemId: string,
        costs: { crystals?: number; stardust?: number; realMoney?: number },
        rewards: { type: string; value: string | number; rarity?: string }[]
    ): Promise<IPurchaseHistory> {
        const purchase = new PurchaseHistory({
            purchaseId: generatePurchaseId(),
            playerId,
            itemType,
            itemId,
            crystalCost: costs.crystals || 0,
            stardustCost: costs.stardust || 0,
            realMoneyCost: costs.realMoney || 0,
            rewards
        });
        await purchase.save();
        return purchase;
    }

    // ========================================
    // PREMIUM PASS
    // ========================================

    async purchasePremiumPass(playerId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const PASS_COST = 950; // crystals
        
        const progression = await Progression.findOne({ playerId });
        if (!progression) {
            return { success: false, error: 'Player not found' };
        }

        if (progression.isPremiumPass) {
            return { success: false, error: 'Already have premium pass' };
        }

        if (progression.crystals < PASS_COST) {
            return { success: false, error: 'Insufficient crystals' };
        }

        progression.crystals -= PASS_COST;
        progression.isPremiumPass = true;
        await progression.save();

        // Record purchase
        await this.recordPurchase(playerId, 'season_pass', 'premium_pass', { crystals: PASS_COST }, []);

        return { success: true };
    }

    // ========================================
    // SPENDING STATS
    // ========================================

    async getSpendingStats(playerId: string): Promise<{
        totalCrystalsSpent: number;
        totalStardustSpent: number;
        totalRealMoneySpent: number;
        purchaseCount: number;
        favoriteItemType: string | null;
    }> {
        const purchases = await PurchaseHistory.find({ playerId });
        
        const stats = {
            totalCrystalsSpent: 0,
            totalStardustSpent: 0,
            totalRealMoneySpent: 0,
            purchaseCount: purchases.length,
            favoriteItemType: null as string | null
        };

        const typeCounts: Record<string, number> = {};

        for (const p of purchases) {
            stats.totalCrystalsSpent += p.crystalCost;
            stats.totalStardustSpent += p.stardustCost;
            stats.totalRealMoneySpent += p.realMoneyCost;
            typeCounts[p.itemType] = (typeCounts[p.itemType] || 0) + 1;
        }

        // Find most common purchase type
        let maxCount = 0;
        for (const [type, count] of Object.entries(typeCounts)) {
            if (count > maxCount) {
                maxCount = count;
                stats.favoriteItemType = type;
            }
        }

        return stats;
    }
}

// Export singleton
export const economyService = new EconomyService();
export default economyService;
