// Companion Service - Manages companion ownership, leveling, and bonuses
// Server-side persistence for companion system

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// DATABASE MODEL
// ============================================

export interface IOwnedCompanion {
    companionId: string;
    level: number;
    xp: number;
    acquiredAt: Date;
}

export interface ICompanionData extends Document {
    playerId: string;
    ownedCompanions: IOwnedCompanion[];
    equippedCompanionId: string | null;
    constellationPieces: string[];
    completedConstellations: string[];
    earnedBadges: string[];
    totalFragmentsCollected: number;
    totalCompanionXPEarned: number;
    createdAt: Date;
    updatedAt: Date;
}

const CompanionDataSchema = new Schema<ICompanionData>({
    playerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    ownedCompanions: [{
        companionId: { type: String, required: true },
        level: { type: Number, default: 1, min: 1, max: 10 },
        xp: { type: Number, default: 0, min: 0 },
        acquiredAt: { type: Date, default: Date.now }
    }],
    equippedCompanionId: { type: String, default: null },
    constellationPieces: { type: [String], default: [] },
    completedConstellations: { type: [String], default: [] },
    earnedBadges: { type: [String], default: [] },
    totalFragmentsCollected: { type: Number, default: 0, min: 0 },
    totalCompanionXPEarned: { type: Number, default: 0, min: 0 }
}, {
    timestamps: true,
    collection: 'companion_data'
});

export const CompanionData: Model<ICompanionData> = mongoose.model<ICompanionData>('CompanionData', CompanionDataSchema);

// ============================================
// COMPANION CONSTANTS
// ============================================

export interface CompanionConfig {
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
    price: number;
    effect: string;
    effectType: string;
    effectValue: number;
    description: string;
}

// Companion level thresholds
const COMPANION_LEVELS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];

function getCompanionLevel(xp: number): number {
    for (let i = COMPANION_LEVELS.length - 1; i >= 0; i--) {
        if (xp >= COMPANION_LEVELS[i]) return i + 1;
    }
    return 1;
}

function getXPForNextLevel(level: number): number {
    if (level >= COMPANION_LEVELS.length) return Infinity;
    return COMPANION_LEVELS[level];
}

// Companion definitions (subset - expand as needed)
const COMPANION_CONFIGS: Record<string, CompanionConfig> = {
    'ember': {
        id: 'ember',
        name: 'Ember',
        icon: '🔥',
        rarity: 'common',
        price: 500,
        effect: '+5% XP gain',
        effectType: 'xp_boost',
        effectValue: 0.05,
        description: 'A friendly flame spirit that enhances your journey'
    },
    'crystal': {
        id: 'crystal',
        name: 'Crystal',
        icon: '💎',
        rarity: 'rare',
        price: 2000,
        effect: '+10% Stardust gain',
        effectType: 'stardust_boost',
        effectValue: 0.10,
        description: 'A sparkling gem creature that attracts stardust'
    },
    'shadow': {
        id: 'shadow',
        name: 'Shadow',
        icon: '🌑',
        rarity: 'epic',
        price: 5000,
        effect: '+15% exploration speed',
        effectType: 'exploration_boost',
        effectValue: 0.15,
        description: 'A mysterious dark spirit that moves silently'
    },
    'phoenix': {
        id: 'phoenix',
        name: 'Phoenix',
        icon: '🦅',
        rarity: 'legendary',
        price: 15000,
        effect: 'Streak protection',
        effectType: 'streak_protection',
        effectValue: 1,
        description: 'A mythical bird that protects your daily streak'
    },
    'cosmic': {
        id: 'cosmic',
        name: 'Cosmic',
        icon: '🌌',
        rarity: 'mythic',
        price: 50000,
        effect: '+25% all bonuses',
        effectType: 'all_boost',
        effectValue: 0.25,
        description: 'An ancient cosmic entity of immense power'
    }
};

// ============================================
// COMPANION SERVICE CLASS
// ============================================

export class CompanionService {
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('🐾 Companion service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    // ========================================
    // DATA ACCESS
    // ========================================

    async getCompanionData(playerId: string): Promise<ICompanionData> {
        let data = await CompanionData.findOne({ playerId });
        
        if (!data) {
            data = new CompanionData({
                playerId,
                ownedCompanions: [],
                equippedCompanionId: null,
                constellationPieces: [],
                completedConstellations: [],
                earnedBadges: [],
                totalFragmentsCollected: 0,
                totalCompanionXPEarned: 0
            });
            await data.save();
        }
        
        return data;
    }

    // ========================================
    // COMPANION MANAGEMENT
    // ========================================

    async getOwnedCompanions(playerId: string): Promise<IOwnedCompanion[]> {
        const data = await this.getCompanionData(playerId);
        return data.ownedCompanions;
    }

    async ownsCompanion(playerId: string, companionId: string): Promise<boolean> {
        const data = await this.getCompanionData(playerId);
        return data.ownedCompanions.some(c => c.companionId === companionId);
    }

    async purchaseCompanion(playerId: string, companionId: string): Promise<{
        success: boolean;
        error?: string;
        cost?: number;
    }> {
        const config = COMPANION_CONFIGS[companionId];
        if (!config) {
            return { success: false, error: 'Invalid companion' };
        }

        const data = await this.getCompanionData(playerId);
        
        if (data.ownedCompanions.some(c => c.companionId === companionId)) {
            return { success: false, error: 'Already owned' };
        }

        // Add companion
        data.ownedCompanions.push({
            companionId,
            level: 1,
            xp: 0,
            acquiredAt: new Date()
        });
        await data.save();

        return { success: true, cost: config.price };
    }

    async unlockCompanion(playerId: string, companionId: string): Promise<boolean> {
        const data = await this.getCompanionData(playerId);
        
        if (data.ownedCompanions.some(c => c.companionId === companionId)) {
            return false; // Already owned
        }

        data.ownedCompanions.push({
            companionId,
            level: 1,
            xp: 0,
            acquiredAt: new Date()
        });
        await data.save();

        return true;
    }

    async equipCompanion(playerId: string, companionId: string | null): Promise<boolean> {
        const data = await this.getCompanionData(playerId);

        if (companionId !== null && !data.ownedCompanions.some(c => c.companionId === companionId)) {
            return false; // Don't own it
        }

        data.equippedCompanionId = companionId;
        await data.save();

        return true;
    }

    async getEquippedCompanion(playerId: string): Promise<{
        companion: CompanionConfig | null;
        data: IOwnedCompanion | null;
    }> {
        const playerData = await this.getCompanionData(playerId);
        
        if (!playerData.equippedCompanionId) {
            return { companion: null, data: null };
        }

        const owned = playerData.ownedCompanions.find(c => c.companionId === playerData.equippedCompanionId);
        const config = COMPANION_CONFIGS[playerData.equippedCompanionId];

        return {
            companion: config || null,
            data: owned || null
        };
    }

    // ========================================
    // LEVELING
    // ========================================

    async addCompanionXP(playerId: string, companionId: string, xpAmount: number): Promise<{
        success: boolean;
        leveledUp: boolean;
        newLevel: number;
        newXP: number;
    }> {
        const data = await this.getCompanionData(playerId);
        const companion = data.ownedCompanions.find(c => c.companionId === companionId);

        if (!companion) {
            return { success: false, leveledUp: false, newLevel: 0, newXP: 0 };
        }

        const oldLevel = companion.level;
        companion.xp += xpAmount;
        companion.level = getCompanionLevel(companion.xp);
        
        data.totalCompanionXPEarned += xpAmount;
        await data.save();

        return {
            success: true,
            leveledUp: companion.level > oldLevel,
            newLevel: companion.level,
            newXP: companion.xp
        };
    }

    async getCompanionProgress(playerId: string, companionId: string): Promise<{
        level: number;
        xp: number;
        xpForNextLevel: number;
        percentage: number;
    } | null> {
        const data = await this.getCompanionData(playerId);
        const companion = data.ownedCompanions.find(c => c.companionId === companionId);

        if (!companion) return null;

        const currentLevelXP = COMPANION_LEVELS[companion.level - 1] || 0;
        const nextLevelXP = getXPForNextLevel(companion.level);
        const xpInLevel = companion.xp - currentLevelXP;
        const xpNeeded = nextLevelXP - currentLevelXP;

        return {
            level: companion.level,
            xp: companion.xp,
            xpForNextLevel: nextLevelXP,
            percentage: Math.min(100, (xpInLevel / xpNeeded) * 100)
        };
    }

    // ========================================
    // BONUSES
    // ========================================

    async getActiveBonus(playerId: string, effectType: string): Promise<number> {
        const { companion, data } = await this.getEquippedCompanion(playerId);
        
        if (!companion || !data) return 0;

        if (companion.effectType === effectType || companion.effectType === 'all_boost') {
            // Scale bonus by level (each level adds 10% to base effect)
            const levelMultiplier = 1 + (data.level - 1) * 0.1;
            return companion.effectValue * levelMultiplier;
        }

        return 0;
    }

    async getAllActiveBonuses(playerId: string): Promise<Record<string, number>> {
        const { companion, data } = await this.getEquippedCompanion(playerId);
        const bonuses: Record<string, number> = {};

        if (!companion || !data) return bonuses;

        const levelMultiplier = 1 + (data.level - 1) * 0.1;

        if (companion.effectType === 'all_boost') {
            bonuses['xp_boost'] = companion.effectValue * levelMultiplier;
            bonuses['stardust_boost'] = companion.effectValue * levelMultiplier;
            bonuses['exploration_boost'] = companion.effectValue * levelMultiplier;
        } else {
            bonuses[companion.effectType] = companion.effectValue * levelMultiplier;
        }

        return bonuses;
    }

    // ========================================
    // CONSTELLATIONS
    // ========================================

    async addConstellationPiece(playerId: string, pieceId: string): Promise<boolean> {
        const data = await this.getCompanionData(playerId);
        
        if (data.constellationPieces.includes(pieceId)) {
            return false; // Already have it
        }

        data.constellationPieces.push(pieceId);
        await data.save();

        return true;
    }

    async getConstellationProgress(playerId: string, constellationId: string): Promise<{
        total: number;
        owned: number;
        percentage: number;
        pieces: string[];
    }> {
        // This would need constellation definitions
        // For now, return a basic structure
        const data = await this.getCompanionData(playerId);
        const ownedPieces = data.constellationPieces.filter(p => p.startsWith(constellationId));
        
        return {
            total: 5, // Assume 5 pieces per constellation
            owned: ownedPieces.length,
            percentage: (ownedPieces.length / 5) * 100,
            pieces: ownedPieces
        };
    }

    async claimConstellationReward(playerId: string, constellationId: string): Promise<{
        success: boolean;
        reward?: { stardust: number; cosmetic: string };
    }> {
        const data = await this.getCompanionData(playerId);
        
        if (data.completedConstellations.includes(constellationId)) {
            return { success: false };
        }

        const progress = await this.getConstellationProgress(playerId, constellationId);
        if (progress.owned < progress.total) {
            return { success: false };
        }

        data.completedConstellations.push(constellationId);
        await data.save();

        return {
            success: true,
            reward: { stardust: 1000, cosmetic: `constellation_${constellationId}` }
        };
    }

    // ========================================
    // STATS
    // ========================================

    async getCompanionStats(playerId: string): Promise<{
        totalOwned: number;
        totalAvailable: number;
        equippedId: string | null;
        totalXPEarned: number;
        constellationPieces: number;
        completedConstellations: number;
    }> {
        const data = await this.getCompanionData(playerId);
        
        return {
            totalOwned: data.ownedCompanions.length,
            totalAvailable: Object.keys(COMPANION_CONFIGS).length,
            equippedId: data.equippedCompanionId,
            totalXPEarned: data.totalCompanionXPEarned,
            constellationPieces: data.constellationPieces.length,
            completedConstellations: data.completedConstellations.length
        };
    }

    // ========================================
    // COMPANION CATALOG
    // ========================================

    getAllCompanions(): CompanionConfig[] {
        return Object.values(COMPANION_CONFIGS);
    }

    getCompanionConfig(companionId: string): CompanionConfig | null {
        return COMPANION_CONFIGS[companionId] || null;
    }
}

export const companionService = new CompanionService();
