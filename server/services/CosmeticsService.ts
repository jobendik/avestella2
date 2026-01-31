// =============================================================================
// Cosmetics Service - Server-side cosmetics management
// =============================================================================
// Handles cosmetic items, inventory, equipping, and shop purchases

import { EventEmitter } from 'events';
import { mongoPersistence } from './MongoPersistenceService.js';

export type CosmeticType = 'trail' | 'color' | 'aura' | 'title' | 'frame' | 'emote';
export type CosmeticRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface CosmeticItem {
    id: string;
    type: CosmeticType;
    name: string;
    description: string;
    rarity: CosmeticRarity;
    stardustPrice?: number;
    crystalPrice?: number;
    unlockCondition?: {
        type: 'level' | 'achievement' | 'quest' | 'event' | 'reputation' | 'season';
        value: string | number;
    };
    isLimited?: boolean;
    expiresAt?: number;
    setId?: string; // For cosmetic sets
    metadata?: Record<string, any>;
}

export interface OwnedCosmetic {
    itemId: string;
    unlockedAt: number;
    source: 'purchase' | 'mystery_box' | 'achievement' | 'quest' | 'gift' | 'event' | 'season';
    isEquipped: boolean;
    uses?: number; // For consumables
}

export interface PlayerCosmetics {
    playerId: string;
    owned: Record<string, OwnedCosmetic>;
    equipped: {
        trail?: string;
        color?: string;
        aura?: string;
        title?: string;
        frame?: string;
        emote_wheel?: string[];
    };
    favorites: string[];
    lastUpdated: number;
}

// =========================================================================
// Cosmetic Catalog
// =========================================================================

const COSMETIC_CATALOG: CosmeticItem[] = [
    // === TRAILS ===
    { id: 'trail_basic', type: 'trail', name: 'Basic Trail', description: 'A simple light trail', rarity: 'common', stardustPrice: 100 },
    { id: 'trail_shimmer', type: 'trail', name: 'Shimmer Trail', description: 'A shimmering light path', rarity: 'uncommon', stardustPrice: 500 },
    { id: 'trail_sparkle', type: 'trail', name: 'Sparkle Trail', description: 'Leaves sparkles behind', rarity: 'uncommon', stardustPrice: 750 },
    { id: 'trail_rainbow', type: 'trail', name: 'Rainbow Trail', description: 'A colorful rainbow trail', rarity: 'rare', stardustPrice: 2000 },
    { id: 'trail_stardust', type: 'trail', name: 'Stardust Trail', description: 'Made of actual stardust', rarity: 'rare', stardustPrice: 2500 },
    { id: 'trail_cosmic', type: 'trail', name: 'Cosmic Trail', description: 'Trails of cosmic energy', rarity: 'epic', stardustPrice: 5000, crystalPrice: 200 },
    { id: 'trail_nebula', type: 'trail', name: 'Nebula Trail', description: 'A nebula follows you', rarity: 'epic', crystalPrice: 500 },
    { id: 'trail_aurora', type: 'trail', name: 'Aurora Trail', description: 'Northern lights trail', rarity: 'legendary', crystalPrice: 1000 },
    { id: 'trail_void', type: 'trail', name: 'Void Trail', description: 'A trail of pure darkness', rarity: 'legendary', crystalPrice: 1500, unlockCondition: { type: 'achievement', value: 'void_master' } },

    // === COLORS ===
    { id: 'color_crimson', type: 'color', name: 'Crimson', description: 'Deep red glow', rarity: 'common', stardustPrice: 200 },
    { id: 'color_azure', type: 'color', name: 'Azure', description: 'Bright blue glow', rarity: 'common', stardustPrice: 200 },
    { id: 'color_emerald', type: 'color', name: 'Emerald', description: 'Rich green glow', rarity: 'common', stardustPrice: 200 },
    { id: 'color_violet', type: 'color', name: 'Violet', description: 'Royal purple glow', rarity: 'uncommon', stardustPrice: 400 },
    { id: 'color_gold', type: 'color', name: 'Gold', description: 'Golden radiance', rarity: 'rare', stardustPrice: 1500 },
    { id: 'color_prismatic', type: 'color', name: 'Prismatic', description: 'Shifts through all colors', rarity: 'epic', crystalPrice: 400 },
    { id: 'color_void_black', type: 'color', name: 'Void Black', description: 'Absorbs all light', rarity: 'legendary', crystalPrice: 800 },
    { id: 'color_cosmic_white', type: 'color', name: 'Cosmic White', description: 'Pure starlight', rarity: 'legendary', crystalPrice: 800 },

    // === AURAS ===
    { id: 'aura_soft_glow', type: 'aura', name: 'Soft Glow', description: 'A gentle ambient light', rarity: 'common', stardustPrice: 300 },
    { id: 'aura_pulsing', type: 'aura', name: 'Pulsing Aura', description: 'Light that pulses rhythmically', rarity: 'uncommon', stardustPrice: 800 },
    { id: 'aura_flames', type: 'aura', name: 'Flame Aura', description: 'Surrounded by flames', rarity: 'rare', stardustPrice: 2000 },
    { id: 'aura_frost', type: 'aura', name: 'Frost Aura', description: 'Icy crystals surround you', rarity: 'rare', stardustPrice: 2000 },
    { id: 'aura_ethereal', type: 'aura', name: 'Ethereal Aura', description: 'Ghostly wisps circle you', rarity: 'epic', crystalPrice: 600 },
    { id: 'aura_legendary', type: 'aura', name: 'Legendary Aura', description: 'A legendary presence', rarity: 'legendary', crystalPrice: 1200, unlockCondition: { type: 'level', value: 50 } },

    // === TITLES ===
    { id: 'title_explorer', type: 'title', name: 'Explorer', description: 'Wanderer of realms', rarity: 'common', unlockCondition: { type: 'achievement', value: 'first_steps' } },
    { id: 'title_collector', type: 'title', name: 'Collector', description: 'Gatherer of treasures', rarity: 'uncommon', unlockCondition: { type: 'achievement', value: 'collect_100' } },
    { id: 'title_guardian', type: 'title', name: 'Guardian', description: 'Protector of realms', rarity: 'rare', unlockCondition: { type: 'reputation', value: 'guardian_5' } },
    { id: 'title_beacon_keeper', type: 'title', name: 'Beacon Keeper', description: 'Keeper of the light', rarity: 'rare', unlockCondition: { type: 'reputation', value: 'beacon_keeper_5' } },
    { id: 'title_stargazer', type: 'title', name: 'Stargazer', description: 'Eyes on the cosmos', rarity: 'epic', crystalPrice: 500 },
    { id: 'title_cosmic_traveler', type: 'title', name: 'Cosmic Traveler', description: 'Journeys through the stars', rarity: 'epic', unlockCondition: { type: 'achievement', value: 'visit_all_realms' } },
    { id: 'title_celestial', type: 'title', name: 'Celestial', description: 'One with the cosmos', rarity: 'legendary', unlockCondition: { type: 'level', value: 100 } },
    { id: 'title_eternal', type: 'title', name: 'Eternal', description: 'Beyond time itself', rarity: 'legendary', unlockCondition: { type: 'achievement', value: 'eternal_light' } },
    { id: 'title_transcendent', type: 'title', name: 'Transcendent', description: 'Ascended being', rarity: 'mythic', unlockCondition: { type: 'achievement', value: 'transcendence' } },

    // === FRAMES ===
    { id: 'frame_basic', type: 'frame', name: 'Basic Frame', description: 'Simple profile frame', rarity: 'common', stardustPrice: 250 },
    { id: 'frame_ornate', type: 'frame', name: 'Ornate Frame', description: 'Decorated frame', rarity: 'uncommon', stardustPrice: 600 },
    { id: 'frame_golden', type: 'frame', name: 'Golden Frame', description: 'Gilded frame', rarity: 'rare', stardustPrice: 1800 },
    { id: 'frame_diamond', type: 'frame', name: 'Diamond Frame', description: 'Crystalline frame', rarity: 'epic', crystalPrice: 700 },
    { id: 'frame_celestial', type: 'frame', name: 'Celestial Frame', description: 'Cosmic energy frame', rarity: 'legendary', crystalPrice: 1500 },

    // === EMOTES ===
    { id: 'emote_wave', type: 'emote', name: 'Wave', description: 'Friendly wave', rarity: 'common', stardustPrice: 100 },
    { id: 'emote_dance', type: 'emote', name: 'Dance', description: 'Happy dance', rarity: 'uncommon', stardustPrice: 400 },
    { id: 'emote_fireworks', type: 'emote', name: 'Fireworks', description: 'Celebration!', rarity: 'rare', stardustPrice: 1200 },
    { id: 'emote_hearts', type: 'emote', name: 'Hearts', description: 'Spread love', rarity: 'rare', stardustPrice: 1000 },
    { id: 'emote_explosion', type: 'emote', name: 'Explosion', description: 'Dramatic effect', rarity: 'epic', crystalPrice: 350 },
    { id: 'emote_rainbow', type: 'emote', name: 'Rainbow', description: 'Colorful display', rarity: 'epic', crystalPrice: 400 },
    { id: 'emote_supernova', type: 'emote', name: 'Supernova', description: 'Star explosion', rarity: 'legendary', crystalPrice: 900 },
];

// Build lookup map
const COSMETIC_MAP = new Map<string, CosmeticItem>();
COSMETIC_CATALOG.forEach(item => COSMETIC_MAP.set(item.id, item));

class CosmeticsService extends EventEmitter {
    private playerCosmetics: Map<string, PlayerCosmetics> = new Map();

    async initialize(): Promise<void> {
        console.log('💎 Cosmetics Service initializing...');
        console.log(`💎 Loaded ${COSMETIC_CATALOG.length} cosmetic items`);
        console.log('💎 Cosmetics Service initialized');
    }

    // =========================================================================
    // Catalog Operations
    // =========================================================================

    getCatalog(): CosmeticItem[] {
        return COSMETIC_CATALOG;
    }

    getCatalogByType(type: CosmeticType): CosmeticItem[] {
        return COSMETIC_CATALOG.filter(item => item.type === type);
    }

    getItem(itemId: string): CosmeticItem | null {
        return COSMETIC_MAP.get(itemId) || null;
    }

    getShopItems(): CosmeticItem[] {
        // Return items that can be purchased (have a price)
        return COSMETIC_CATALOG.filter(item =>
            (item.stardustPrice && item.stardustPrice > 0) ||
            (item.crystalPrice && item.crystalPrice > 0)
        );
    }

    // =========================================================================
    // Player Inventory
    // =========================================================================

    async getPlayerCosmetics(playerId: string): Promise<PlayerCosmetics> {
        let cosmetics = this.playerCosmetics.get(playerId);

        if (!cosmetics) {
            // Try loading from database
            try {
                if (mongoPersistence.isReady()) {
                    const saved = await mongoPersistence.getCollection('player_cosmetics')?.findOne({ playerId });
                    if (saved) {
                        cosmetics = saved as unknown as PlayerCosmetics;
                        this.playerCosmetics.set(playerId, cosmetics);
                        return cosmetics;
                    }
                }
            } catch (error) {
                console.error('Failed to load player cosmetics:', error);
            }

            // Create default inventory with starter items
            cosmetics = {
                playerId,
                owned: {
                    'trail_basic': { itemId: 'trail_basic', unlockedAt: Date.now(), source: 'gift', isEquipped: true },
                    'color_azure': { itemId: 'color_azure', unlockedAt: Date.now(), source: 'gift', isEquipped: true },
                    'emote_wave': { itemId: 'emote_wave', unlockedAt: Date.now(), source: 'gift', isEquipped: false },
                },
                equipped: {
                    trail: 'trail_basic',
                    color: 'color_azure',
                    emote_wheel: ['emote_wave']
                },
                favorites: [],
                lastUpdated: Date.now()
            };
            this.playerCosmetics.set(playerId, cosmetics);
        }

        return cosmetics;
    }

    async ownsCosmetic(playerId: string, itemId: string): Promise<boolean> {
        const cosmetics = await this.getPlayerCosmetics(playerId);
        return itemId in cosmetics.owned;
    }

    // =========================================================================
    // Purchase & Unlock
    // =========================================================================

    async purchaseCosmetic(
        playerId: string,
        itemId: string,
        currency: 'stardust' | 'crystals',
        paymentVerified: boolean = false
    ): Promise<{
        success: boolean;
        error?: string;
        cost?: number;
        item?: CosmeticItem;
    }> {
        const item = COSMETIC_MAP.get(itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Check if already owned
        const cosmetics = await this.getPlayerCosmetics(playerId);
        if (cosmetics.owned[itemId]) {
            return { success: false, error: 'Already owned' };
        }

        // Determine cost
        const cost = currency === 'stardust' ? item.stardustPrice : item.crystalPrice;
        if (!cost || cost <= 0) {
            return { success: false, error: `Cannot purchase with ${currency}` };
        }

        // Check unlock conditions
        if (item.unlockCondition) {
            // This should be validated by the caller
            // We just note it here
        }

        // Payment should be handled externally
        if (!paymentVerified) {
            return { success: false, error: 'Payment not verified', cost };
        }

        // Grant the cosmetic
        cosmetics.owned[itemId] = {
            itemId,
            unlockedAt: Date.now(),
            source: 'purchase',
            isEquipped: false
        };
        cosmetics.lastUpdated = Date.now();

        await this.persistPlayerCosmetics(cosmetics);

        this.emit('cosmetic_purchased', { playerId, itemId, currency, cost });

        return { success: true, cost, item };
    }

    async grantCosmetic(
        playerId: string,
        itemId: string,
        source: OwnedCosmetic['source']
    ): Promise<{
        success: boolean;
        error?: string;
        alreadyOwned?: boolean;
    }> {
        const item = COSMETIC_MAP.get(itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        const cosmetics = await this.getPlayerCosmetics(playerId);

        if (cosmetics.owned[itemId]) {
            return { success: true, alreadyOwned: true };
        }

        cosmetics.owned[itemId] = {
            itemId,
            unlockedAt: Date.now(),
            source,
            isEquipped: false
        };
        cosmetics.lastUpdated = Date.now();

        await this.persistPlayerCosmetics(cosmetics);

        this.emit('cosmetic_unlocked', { playerId, itemId, source });

        return { success: true };
    }

    // =========================================================================
    // Equipping
    // =========================================================================

    async grantRandomCosmetic(playerId: string, source: string): Promise<string | null> {
        const allIds = Array.from(COSMETIC_MAP.keys());
        if (allIds.length === 0) return null;

        const randomId = allIds[Math.floor(Math.random() * allIds.length)];
        await this.grantCosmetic(playerId, randomId, source as any);
        return randomId;
    }

    async equipCosmetic(
        playerId: string,
        itemId: string
    ): Promise<{
        success: boolean;
        error?: string;
        type?: CosmeticType;
        previousEquipped?: string;
    }> {
        const item = COSMETIC_MAP.get(itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        const cosmetics = await this.getPlayerCosmetics(playerId);

        if (!cosmetics.owned[itemId]) {
            return { success: false, error: 'Item not owned' };
        }

        // Get previous equipped item of same type
        const previousEquipped = cosmetics.equipped[item.type as keyof typeof cosmetics.equipped];

        // Unequip previous
        if (previousEquipped && typeof previousEquipped === 'string') {
            if (cosmetics.owned[previousEquipped]) {
                cosmetics.owned[previousEquipped].isEquipped = false;
            }
        }

        // Equip new
        cosmetics.owned[itemId].isEquipped = true;

        if (item.type === 'emote') {
            // Add to emote wheel
            if (!cosmetics.equipped.emote_wheel) {
                cosmetics.equipped.emote_wheel = [];
            }
            if (!cosmetics.equipped.emote_wheel.includes(itemId)) {
                if (cosmetics.equipped.emote_wheel.length >= 8) {
                    cosmetics.equipped.emote_wheel.shift(); // Remove oldest
                }
                cosmetics.equipped.emote_wheel.push(itemId);
            }
        } else {
            (cosmetics.equipped as any)[item.type] = itemId;
        }

        cosmetics.lastUpdated = Date.now();
        await this.persistPlayerCosmetics(cosmetics);

        this.emit('cosmetic_equipped', { playerId, itemId, type: item.type });

        return {
            success: true,
            type: item.type,
            previousEquipped: typeof previousEquipped === 'string' ? previousEquipped : undefined
        };
    }

    async unequipCosmetic(
        playerId: string,
        itemId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const item = COSMETIC_MAP.get(itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        const cosmetics = await this.getPlayerCosmetics(playerId);

        if (!cosmetics.owned[itemId]) {
            return { success: false, error: 'Item not owned' };
        }

        cosmetics.owned[itemId].isEquipped = false;

        if (item.type === 'emote') {
            cosmetics.equipped.emote_wheel = cosmetics.equipped.emote_wheel?.filter(e => e !== itemId) || [];
        } else {
            const currentEquipped = (cosmetics.equipped as any)[item.type];
            if (currentEquipped === itemId) {
                (cosmetics.equipped as any)[item.type] = undefined;
            }
        }

        cosmetics.lastUpdated = Date.now();
        await this.persistPlayerCosmetics(cosmetics);

        this.emit('cosmetic_unequipped', { playerId, itemId, type: item.type });

        return { success: true };
    }

    async getEquippedCosmetics(playerId: string): Promise<{
        trail?: CosmeticItem;
        color?: CosmeticItem;
        aura?: CosmeticItem;
        title?: CosmeticItem;
        frame?: CosmeticItem;
        emote_wheel?: CosmeticItem[];
    }> {
        const cosmetics = await this.getPlayerCosmetics(playerId);

        const result: any = {};

        for (const [type, itemId] of Object.entries(cosmetics.equipped)) {
            if (type === 'emote_wheel' && Array.isArray(itemId)) {
                result.emote_wheel = itemId.map(id => COSMETIC_MAP.get(id)).filter(Boolean);
            } else if (typeof itemId === 'string') {
                result[type] = COSMETIC_MAP.get(itemId);
            }
        }

        return result;
    }

    // =========================================================================
    // Favorites
    // =========================================================================

    async toggleFavorite(playerId: string, itemId: string): Promise<{
        success: boolean;
        isFavorite: boolean;
    }> {
        const cosmetics = await this.getPlayerCosmetics(playerId);

        const index = cosmetics.favorites.indexOf(itemId);
        if (index === -1) {
            cosmetics.favorites.push(itemId);
        } else {
            cosmetics.favorites.splice(index, 1);
        }

        cosmetics.lastUpdated = Date.now();
        await this.persistPlayerCosmetics(cosmetics);

        return { success: true, isFavorite: index === -1 };
    }

    // =========================================================================
    // Sets
    // =========================================================================

    getItemsInSet(setId: string): CosmeticItem[] {
        return COSMETIC_CATALOG.filter(item => item.setId === setId);
    }

    async getSetCompletionStatus(playerId: string, setId: string): Promise<{
        total: number;
        owned: number;
        percentage: number;
        missingItems: string[];
    }> {
        const setItems = this.getItemsInSet(setId);
        const cosmetics = await this.getPlayerCosmetics(playerId);

        const owned = setItems.filter(item => item.id in cosmetics.owned);
        const missing = setItems.filter(item => !(item.id in cosmetics.owned));

        return {
            total: setItems.length,
            owned: owned.length,
            percentage: setItems.length > 0 ? Math.round((owned.length / setItems.length) * 100) : 0,
            missingItems: missing.map(item => item.id)
        };
    }

    // =========================================================================
    // Persistence
    // =========================================================================

    private async persistPlayerCosmetics(cosmetics: PlayerCosmetics): Promise<void> {
        try {
            if (mongoPersistence.isReady()) {
                await mongoPersistence.getCollection('player_cosmetics')?.updateOne(
                    { playerId: cosmetics.playerId },
                    { $set: cosmetics },
                    { upsert: true }
                );
            }
        } catch (error) {
            console.error('Failed to persist player cosmetics:', error);
        }
    }

    // =========================================================================
    // Analytics
    // =========================================================================

    async getPopularCosmetics(limit: number = 10): Promise<Array<{ itemId: string; count: number }>> {
        const counts: Record<string, number> = {};

        for (const cosmetics of this.playerCosmetics.values()) {
            for (const itemId of Object.keys(cosmetics.owned)) {
                counts[itemId] = (counts[itemId] || 0) + 1;
            }
        }

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([itemId, count]) => ({ itemId, count }));
    }

    // =========================================================================
    // Unlock Condition Validation
    // =========================================================================

    /**
     * Validate if a player meets the unlock condition for a cosmetic
     */
    async validateUnlockCondition(
        playerId: string,
        itemId: string,
        playerContext: {
            level?: number;
            achievements?: string[];
            completedQuests?: string[];
            reputationTracks?: Record<string, number>;
            seasonPass?: { tier: number; isPremium: boolean };
            eventParticipation?: string[];
        }
    ): Promise<{
        canUnlock: boolean;
        reason?: string;
        requirement?: { type: string; value: string | number; current?: string | number };
    }> {
        const item = COSMETIC_MAP.get(itemId);
        if (!item) {
            return { canUnlock: false, reason: 'Item not found' };
        }

        // Check if already owned
        const cosmetics = await this.getPlayerCosmetics(playerId);
        if (cosmetics.owned[itemId]) {
            return { canUnlock: true }; // Already owned is valid
        }

        // No unlock condition means purchasable by anyone
        if (!item.unlockCondition) {
            return { canUnlock: true };
        }

        const condition = item.unlockCondition;

        switch (condition.type) {
            case 'level':
                const requiredLevel = condition.value as number;
                const playerLevel = playerContext.level || 1;
                if (playerLevel >= requiredLevel) {
                    return { canUnlock: true };
                }
                return {
                    canUnlock: false,
                    reason: `Requires level ${requiredLevel}`,
                    requirement: { type: 'level', value: requiredLevel, current: playerLevel }
                };

            case 'achievement':
                const requiredAchievement = condition.value as string;
                const hasAchievement = playerContext.achievements?.includes(requiredAchievement) || false;
                if (hasAchievement) {
                    return { canUnlock: true };
                }
                return {
                    canUnlock: false,
                    reason: `Requires achievement: ${requiredAchievement}`,
                    requirement: { type: 'achievement', value: requiredAchievement }
                };

            case 'quest':
                const requiredQuest = condition.value as string;
                const completedQuest = playerContext.completedQuests?.includes(requiredQuest) || false;
                if (completedQuest) {
                    return { canUnlock: true };
                }
                return {
                    canUnlock: false,
                    reason: `Requires quest completion: ${requiredQuest}`,
                    requirement: { type: 'quest', value: requiredQuest }
                };

            case 'reputation': {
                const [trackId, requiredTier] = (condition.value as string).split('_');
                const currentTier = playerContext.reputationTracks?.[trackId] || 0;
                const tier = parseInt(requiredTier) || 1;
                if (currentTier >= tier) {
                    return { canUnlock: true };
                }
                return {
                    canUnlock: false,
                    reason: `Requires ${trackId} reputation tier ${tier}`,
                    requirement: { type: 'reputation', value: condition.value, current: currentTier }
                };
            }

            case 'season': {
                const requiredTier = condition.value as number;
                const seasonTier = playerContext.seasonPass?.tier || 0;
                if (seasonTier >= requiredTier) {
                    return { canUnlock: true };
                }
                return {
                    canUnlock: false,
                    reason: `Requires season pass tier ${requiredTier}`,
                    requirement: { type: 'season', value: requiredTier, current: seasonTier }
                };
            }

            case 'event':
                const requiredEvent = condition.value as string;
                const participatedInEvent = playerContext.eventParticipation?.includes(requiredEvent) || false;
                if (participatedInEvent) {
                    return { canUnlock: true };
                }
                return {
                    canUnlock: false,
                    reason: `Requires participation in event: ${requiredEvent}`,
                    requirement: { type: 'event', value: requiredEvent }
                };

            default:
                return { canUnlock: true }; // Unknown condition type, allow
        }
    }

    /**
     * Validate custom color unlock (hex colors)
     * Custom colors require specific reputation or purchase
     */
    async validateCustomColorUnlock(
        playerId: string,
        hexColor: string,
        playerContext: {
            level?: number;
            totalStardustSpent?: number;
            isPremium?: boolean;
            unlockedCustomColors?: string[];
        }
    ): Promise<{
        canUse: boolean;
        reason?: string;
        unlockCost?: { stardust?: number; crystals?: number };
    }> {
        // Validate hex format
        if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
            return { canUse: false, reason: 'Invalid hex color format' };
        }

        // Check if already unlocked
        if (playerContext.unlockedCustomColors?.includes(hexColor.toLowerCase())) {
            return { canUse: true };
        }

        // Premium users get custom colors
        if (playerContext.isPremium) {
            return { canUse: true };
        }

        // Level 25+ players can use custom colors
        if ((playerContext.level || 0) >= 25) {
            return { canUse: true };
        }

        // Otherwise, require purchase
        return {
            canUse: false,
            reason: 'Custom colors require Level 25 or Premium status',
            unlockCost: { stardust: 1000 }
        };
    }

    /**
     * Unlock a custom hex color for a player
     */
    async unlockCustomColor(
        playerId: string,
        hexColor: string,
        paymentVerified: boolean = false
    ): Promise<{
        success: boolean;
        error?: string;
        hexColor?: string;
    }> {
        // Validate hex format
        if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
            return { success: false, error: 'Invalid hex color format' };
        }

        const normalizedColor = hexColor.toLowerCase();

        if (!paymentVerified) {
            return { success: false, error: 'Payment required to unlock custom color' };
        }

        // Store custom color unlock
        try {
            if (mongoPersistence.isReady()) {
                await mongoPersistence.getCollection('custom_colors')?.updateOne(
                    { playerId },
                    {
                        $addToSet: { unlockedColors: normalizedColor },
                        $set: { updatedAt: Date.now() }
                    },
                    { upsert: true }
                );
            }
        } catch (error) {
            console.error('Failed to persist custom color:', error);
            return { success: false, error: 'Failed to save custom color' };
        }

        this.emit('custom_color_unlocked', { playerId, hexColor: normalizedColor });

        return { success: true, hexColor: normalizedColor };
    }

    /**
     * Get player's unlocked custom colors
     */
    async getUnlockedCustomColors(playerId: string): Promise<string[]> {
        try {
            if (mongoPersistence.isReady()) {
                // First try the new playerDataModel location
                const { PlayerData } = await import('../database/playerDataModel.js');
                const player = await PlayerData.findOne({ playerId }).select('cosmetics.unlockedCustomColors').lean();
                if (player?.cosmetics?.unlockedCustomColors?.length) {
                    return player.cosmetics.unlockedCustomColors;
                }

                // Fallback to legacy custom_colors collection
                const doc = await mongoPersistence.getCollection('custom_colors')?.findOne({ playerId });
                return doc?.unlockedColors || [];
            }
        } catch (error) {
            console.error('Failed to load custom colors:', error);
        }
        return [];
    }

    /**
     * Equip a custom color for a player
     */
    async equipCustomColor(playerId: string, hexColor: string): Promise<{ success: boolean; error?: string }> {
        // Validate hex format
        if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
            return { success: false, error: 'Invalid hex color format' };
        }

        const normalizedColor = hexColor.toLowerCase();

        try {
            const { PlayerData } = await import('../database/playerDataModel.js');
            
            // Check if color is unlocked
            const unlockedColors = await this.getUnlockedCustomColors(playerId);
            const player = await PlayerData.findOne({ playerId }).lean();
            
            // Allow if: player has customColorUnlocked, or color is in unlockedCustomColors, or level >= 25
            const canUse = 
                player?.cosmetics?.customColorUnlocked ||
                unlockedColors.includes(normalizedColor) ||
                (player?.level || 0) >= 25;

            if (!canUse) {
                return { success: false, error: 'Custom color feature not unlocked' };
            }

            await PlayerData.updateOne(
                { playerId },
                { $set: { 'cosmetics.customColor': normalizedColor } }
            );

            this.emit('custom_color_equipped', { playerId, hexColor: normalizedColor });

            return { success: true };
        } catch (error) {
            console.error('Failed to equip custom color:', error);
            return { success: false, error: 'Failed to equip custom color' };
        }
    }

    /**
     * Unequip custom color (revert to standard hue)
     */
    async unequipCustomColor(playerId: string): Promise<{ success: boolean }> {
        try {
            const { PlayerData } = await import('../database/playerDataModel.js');
            
            await PlayerData.updateOne(
                { playerId },
                { $set: { 'cosmetics.customColor': null } }
            );

            return { success: true };
        } catch (error) {
            console.error('Failed to unequip custom color:', error);
            return { success: false };
        }
    }

    /**
     * Get player's currently equipped custom color
     */
    async getEquippedCustomColor(playerId: string): Promise<string | null> {
        try {
            const { PlayerData } = await import('../database/playerDataModel.js');
            const player = await PlayerData.findOne({ playerId }).select('cosmetics.customColor').lean();
            return player?.cosmetics?.customColor || null;
        } catch (error) {
            console.error('Failed to get equipped custom color:', error);
            return null;
        }
    }

    /**
     * Unlock custom color feature for player (via level up, purchase, or achievement)
     */
    async unlockCustomColorFeature(playerId: string): Promise<{ success: boolean }> {
        try {
            const { PlayerData } = await import('../database/playerDataModel.js');
            
            await PlayerData.updateOne(
                { playerId },
                { $set: { 'cosmetics.customColorUnlocked': true } }
            );

            this.emit('custom_color_feature_unlocked', { playerId });

            return { success: true };
        } catch (error) {
            console.error('Failed to unlock custom color feature:', error);
            return { success: false };
        }
    }

    /**
     * Validate sound pack ownership
     */
    async validateSoundPackOwnership(
        playerId: string,
        soundPackId: string
    ): Promise<{
        canUse: boolean;
        reason?: string;
        unlockCost?: { stardust?: number; crystals?: number };
    }> {
        // Define available sound packs
        const SOUND_PACKS: Record<string, { name: string; stardustPrice?: number; crystalPrice?: number; unlockCondition?: string }> = {
            'sound_default': { name: 'Default Sounds' },
            'sound_ethereal': { name: 'Ethereal', stardustPrice: 500 },
            'sound_cosmic': { name: 'Cosmic', stardustPrice: 1000 },
            'sound_nature': { name: 'Nature', stardustPrice: 750 },
            'sound_synthwave': { name: 'Synthwave', crystalPrice: 300 },
            'sound_chiptune': { name: 'Chiptune', crystalPrice: 200 },
            'sound_premium': { name: 'Premium', unlockCondition: 'premium' },
        };

        const pack = SOUND_PACKS[soundPackId];
        if (!pack) {
            return { canUse: false, reason: 'Sound pack not found' };
        }

        // Default pack is always available
        if (soundPackId === 'sound_default') {
            return { canUse: true };
        }

        // Check ownership
        try {
            if (mongoPersistence.isReady()) {
                const doc = await mongoPersistence.getCollection('sound_packs')?.findOne({
                    playerId,
                    ownedPacks: soundPackId
                });
                if (doc) {
                    return { canUse: true };
                }
            }
        } catch (error) {
            console.error('Failed to check sound pack ownership:', error);
        }

        // Not owned, return unlock cost
        return {
            canUse: false,
            reason: `Sound pack "${pack.name}" not owned`,
            unlockCost: {
                stardust: pack.stardustPrice,
                crystals: pack.crystalPrice
            }
        };
    }

    /**
     * Validate avatar frame ownership
     */
    async validateAvatarFrameOwnership(
        playerId: string,
        frameId: string
    ): Promise<{
        canUse: boolean;
        reason?: string;
    }> {
        // Frames are stored as regular cosmetics
        const cosmetics = await this.getPlayerCosmetics(playerId);

        if (cosmetics.owned[frameId]) {
            return { canUse: true };
        }

        const item = COSMETIC_MAP.get(frameId);
        if (!item || item.type !== 'frame') {
            return { canUse: false, reason: 'Avatar frame not found' };
        }

        return { canUse: false, reason: `Frame "${item.name}" not owned` };
    }
}

export const cosmeticsService = new CosmeticsService();
export { CosmeticsService };
