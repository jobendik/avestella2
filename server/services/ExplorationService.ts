// =============================================================================
// Exploration Service - Server-side exploration tracking
// =============================================================================
// Tracks fog of war, POI discovery, biomes visited, and exploration progress

import { EventEmitter } from 'events';
import { mongoPersistence } from './MongoPersistenceService.js';

export interface ExplorationData {
    playerId: string;
    discoveredPOIs: string[];
    revealedCells: string[]; // "realm:x:y" format
    visitedBiomes: string[];
    visitedRealms: string[];
    totalDistanceTraveled: number;
    explorationXp: number;
    lastPosition: { realm: string; x: number; y: number };
    achievements: string[];
    milestones: ExplorationMilestone[];
}

export interface ExplorationMilestone {
    id: string;
    name: string;
    unlockedAt: number;
    reward: {
        xp?: number;
        stardust?: number;
        title?: string;
        cosmetic?: string;
    };
}

export interface POI {
    id: string;
    realm: string;
    x: number;
    y: number;
    type: 'shrine' | 'ruin' | 'fountain' | 'monument' | 'portal' | 'hidden' | 'ancient';
    name: string;
    discoveredBy: string | null;
    discoveredAt: number | null;
    xpReward: number;
    description?: string;
}

export interface BiomeConfig {
    id: string;
    name: string;
    realm: string;
    centerX: number;
    centerY: number;
    radius: number;
    xpMultiplier: number;
    description: string;
}

// Static POI definitions
const POIS: POI[] = [
    // Genesis realm
    { id: 'genesis_shrine_1', realm: 'genesis', x: 500, y: 500, type: 'shrine', name: 'The First Light', discoveredBy: null, discoveredAt: null, xpReward: 100 },
    { id: 'genesis_fountain_1', realm: 'genesis', x: -300, y: 400, type: 'fountain', name: 'Stardust Spring', discoveredBy: null, discoveredAt: null, xpReward: 75 },
    { id: 'genesis_monument_1', realm: 'genesis', x: 0, y: -600, type: 'monument', name: 'Pillar of Beginnings', discoveredBy: null, discoveredAt: null, xpReward: 150 },
    { id: 'genesis_hidden_1', realm: 'genesis', x: 1200, y: -800, type: 'hidden', name: 'Secret Grove', discoveredBy: null, discoveredAt: null, xpReward: 250 },
    { id: 'genesis_ruin_1', realm: 'genesis', x: -800, y: -200, type: 'ruin', name: 'Forgotten Temple', discoveredBy: null, discoveredAt: null, xpReward: 125 },
    
    // Nebula realm
    { id: 'nebula_portal_1', realm: 'nebula', x: 0, y: 0, type: 'portal', name: 'Nebula Core', discoveredBy: null, discoveredAt: null, xpReward: 200 },
    { id: 'nebula_ancient_1', realm: 'nebula', x: 700, y: -400, type: 'ancient', name: 'Elder Star', discoveredBy: null, discoveredAt: null, xpReward: 300 },
    { id: 'nebula_shrine_1', realm: 'nebula', x: -500, y: 300, type: 'shrine', name: 'Twilight Altar', discoveredBy: null, discoveredAt: null, xpReward: 100 },
    
    // Void realm
    { id: 'void_hidden_1', realm: 'void', x: 200, y: -600, type: 'hidden', name: 'The Deep Dark', discoveredBy: null, discoveredAt: null, xpReward: 400 },
    { id: 'void_monument_1', realm: 'void', x: -400, y: 0, type: 'monument', name: 'Obelisk of Silence', discoveredBy: null, discoveredAt: null, xpReward: 175 },
    
    // Starforge realm  
    { id: 'starforge_fountain_1', realm: 'starforge', x: 100, y: 100, type: 'fountain', name: 'Molten Pool', discoveredBy: null, discoveredAt: null, xpReward: 150 },
    { id: 'starforge_ancient_1', realm: 'starforge', x: -600, y: 500, type: 'ancient', name: 'The Forge Heart', discoveredBy: null, discoveredAt: null, xpReward: 350 },
    
    // Sanctuary realm
    { id: 'sanctuary_shrine_1', realm: 'sanctuary', x: 0, y: 0, type: 'shrine', name: 'Eternal Peace', discoveredBy: null, discoveredAt: null, xpReward: 125 },
    { id: 'sanctuary_hidden_1', realm: 'sanctuary', x: 800, y: 300, type: 'hidden', name: 'Hidden Garden', discoveredBy: null, discoveredAt: null, xpReward: 275 },
];

const BIOMES: BiomeConfig[] = [
    { id: 'genesis_meadow', name: 'Starlit Meadow', realm: 'genesis', centerX: 0, centerY: 0, radius: 500, xpMultiplier: 1.0, description: 'A peaceful starting area' },
    { id: 'genesis_forest', name: 'Cosmic Forest', realm: 'genesis', centerX: 600, centerY: 300, radius: 400, xpMultiplier: 1.2, description: 'Dense stellar vegetation' },
    { id: 'genesis_peaks', name: 'Aurora Peaks', realm: 'genesis', centerX: -500, centerY: -400, radius: 350, xpMultiplier: 1.5, description: 'Towering luminous mountains' },
    { id: 'nebula_core', name: 'Nebula Core', realm: 'nebula', centerX: 0, centerY: 0, radius: 600, xpMultiplier: 1.3, description: 'Heart of the nebula' },
    { id: 'void_depths', name: 'Abyssal Depths', realm: 'void', centerX: 0, centerY: 0, radius: 800, xpMultiplier: 2.0, description: 'The deepest darkness' },
    { id: 'starforge_caldera', name: 'Star Caldera', realm: 'starforge', centerX: 0, centerY: 0, radius: 500, xpMultiplier: 1.8, description: 'Where new stars are born' },
    { id: 'sanctuary_gardens', name: 'Eternal Gardens', realm: 'sanctuary', centerX: 0, centerY: 0, radius: 700, xpMultiplier: 1.1, description: 'A place of rest' },
];

const EXPLORATION_MILESTONES = [
    { id: 'first_poi', threshold: 1, type: 'pois', reward: { xp: 100, title: 'Explorer' } },
    { id: 'poi_hunter', threshold: 5, type: 'pois', reward: { xp: 250, stardust: 100 } },
    { id: 'poi_master', threshold: 10, type: 'pois', reward: { xp: 500, cosmetic: 'trail_explorer' } },
    { id: 'world_traveler', threshold: 3, type: 'realms', reward: { xp: 200, title: 'World Traveler' } },
    { id: 'all_realms', threshold: 5, type: 'realms', reward: { xp: 500, cosmetic: 'aura_traveler' } },
    { id: 'biome_explorer', threshold: 3, type: 'biomes', reward: { xp: 150, stardust: 50 } },
    { id: 'biome_master', threshold: 7, type: 'biomes', reward: { xp: 400, title: 'Biome Master' } },
    { id: 'distance_100k', threshold: 100000, type: 'distance', reward: { xp: 300, stardust: 200 } },
    { id: 'distance_1m', threshold: 1000000, type: 'distance', reward: { xp: 1000, cosmetic: 'frame_explorer' } },
    { id: 'cells_1000', threshold: 1000, type: 'cells', reward: { xp: 200 } },
    { id: 'cells_10000', threshold: 10000, type: 'cells', reward: { xp: 750, title: 'Cartographer' } },
];

const CELL_SIZE = 100; // Grid cell size for fog of war

class ExplorationService extends EventEmitter {
    private playerData: Map<string, ExplorationData> = new Map();
    private pois: Map<string, POI> = new Map();
    private biomes: BiomeConfig[] = BIOMES;

    async initialize(): Promise<void> {
        console.log('🧭 Exploration Service initializing...');
        
        // Initialize POIs
        for (const poi of POIS) {
            this.pois.set(poi.id, { ...poi });
        }
        
        // Load discovered POIs from database
        await this.loadPOIDiscoveries();
        
        console.log(`🧭 Exploration Service initialized with ${this.pois.size} POIs and ${this.biomes.length} biomes`);
    }

    private async loadPOIDiscoveries(): Promise<void> {
        try {
            if (mongoPersistence.isReady()) {
                const discoveries = await mongoPersistence.getCollection('poi_discoveries')?.find({}).toArray();
                if (discoveries) {
                    for (const disc of discoveries) {
                        const poi = this.pois.get(disc.poiId);
                        if (poi) {
                            poi.discoveredBy = disc.playerId;
                            poi.discoveredAt = disc.discoveredAt;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load POI discoveries:', error);
        }
    }

    // =========================================================================
    // Player Exploration Data
    // =========================================================================

    async getPlayerExploration(playerId: string): Promise<ExplorationData> {
        let data = this.playerData.get(playerId);
        
        if (!data) {
            // Try loading from database
            try {
                if (mongoPersistence.isReady()) {
                    const saved = await mongoPersistence.getCollection('exploration')?.findOne({ playerId });
                    if (saved) {
                        data = saved as unknown as ExplorationData;
                        this.playerData.set(playerId, data);
                        return data;
                    }
                }
            } catch (error) {
                console.error('Failed to load exploration data:', error);
            }
            
            // Create new data
            data = {
                playerId,
                discoveredPOIs: [],
                revealedCells: [],
                visitedBiomes: [],
                visitedRealms: [],
                totalDistanceTraveled: 0,
                explorationXp: 0,
                lastPosition: { realm: 'genesis', x: 0, y: 0 },
                achievements: [],
                milestones: []
            };
            this.playerData.set(playerId, data);
        }
        
        return data;
    }

    /**
     * Update player position and track exploration progress
     */
    async updatePlayerPosition(
        playerId: string, 
        realm: string, 
        x: number, 
        y: number
    ): Promise<{
        newPOI?: POI;
        newBiome?: BiomeConfig;
        newRealm?: boolean;
        cellsRevealed: number;
        distanceTraveled: number;
        xpEarned: number;
        milestonesUnlocked: ExplorationMilestone[];
    }> {
        const data = await this.getPlayerExploration(playerId);
        const result = {
            newPOI: undefined as POI | undefined,
            newBiome: undefined as BiomeConfig | undefined,
            newRealm: false,
            cellsRevealed: 0,
            distanceTraveled: 0,
            xpEarned: 0,
            milestonesUnlocked: [] as ExplorationMilestone[]
        };

        // Calculate distance traveled
        if (data.lastPosition.realm === realm) {
            const dx = x - data.lastPosition.x;
            const dy = y - data.lastPosition.y;
            result.distanceTraveled = Math.hypot(dx, dy);
            data.totalDistanceTraveled += result.distanceTraveled;
            
            // XP for traveling (1 XP per 100 units)
            result.xpEarned += Math.floor(result.distanceTraveled / 100);
        }

        // Update position
        data.lastPosition = { realm, x, y };

        // Check new realm
        if (!data.visitedRealms.includes(realm)) {
            data.visitedRealms.push(realm);
            result.newRealm = true;
            result.xpEarned += 50; // Bonus for new realm
        }

        // Reveal cells (fog of war)
        const cellX = Math.floor(x / CELL_SIZE);
        const cellY = Math.floor(y / CELL_SIZE);
        
        // Reveal 3x3 area around player
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const cellId = `${realm}:${cellX + dx}:${cellY + dy}`;
                if (!data.revealedCells.includes(cellId)) {
                    data.revealedCells.push(cellId);
                    result.cellsRevealed++;
                    result.xpEarned += 1; // 1 XP per cell
                }
            }
        }

        // Check for POI discovery
        for (const poi of this.pois.values()) {
            if (poi.realm !== realm) continue;
            if (data.discoveredPOIs.includes(poi.id)) continue;
            
            const distance = Math.hypot(poi.x - x, poi.y - y);
            if (distance <= 50) { // Discovery radius
                data.discoveredPOIs.push(poi.id);
                result.newPOI = poi;
                result.xpEarned += poi.xpReward;
                
                // Mark as first discoverer if unclaimed
                if (!poi.discoveredBy) {
                    poi.discoveredBy = playerId;
                    poi.discoveredAt = Date.now();
                    result.xpEarned += poi.xpReward; // Double XP for first discoverer
                    await this.persistPOIDiscovery(poi.id, playerId);
                }
                
                this.emit('poi_discovered', { playerId, poi });
                break; // Only one POI per update
            }
        }

        // Check for biome entry
        for (const biome of this.biomes) {
            if (biome.realm !== realm) continue;
            if (data.visitedBiomes.includes(biome.id)) continue;
            
            const distance = Math.hypot(biome.centerX - x, biome.centerY - y);
            if (distance <= biome.radius) {
                data.visitedBiomes.push(biome.id);
                result.newBiome = biome;
                result.xpEarned += 25;
                
                this.emit('biome_entered', { playerId, biome });
                break;
            }
        }

        // Check milestones
        result.milestonesUnlocked = this.checkMilestones(data);
        for (const milestone of result.milestonesUnlocked) {
            if (milestone.reward.xp) result.xpEarned += milestone.reward.xp;
        }

        // Add XP to exploration total
        data.explorationXp += result.xpEarned;

        // Persist
        await this.persistExplorationData(data);

        return result;
    }

    private checkMilestones(data: ExplorationData): ExplorationMilestone[] {
        const unlocked: ExplorationMilestone[] = [];
        const unlockedIds = data.milestones.map(m => m.id);

        for (const ms of EXPLORATION_MILESTONES) {
            if (unlockedIds.includes(ms.id)) continue;

            let value = 0;
            switch (ms.type) {
                case 'pois': value = data.discoveredPOIs.length; break;
                case 'realms': value = data.visitedRealms.length; break;
                case 'biomes': value = data.visitedBiomes.length; break;
                case 'distance': value = data.totalDistanceTraveled; break;
                case 'cells': value = data.revealedCells.length; break;
            }

            if (value >= ms.threshold) {
                const milestone: ExplorationMilestone = {
                    id: ms.id,
                    name: ms.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    unlockedAt: Date.now(),
                    reward: ms.reward
                };
                data.milestones.push(milestone);
                unlocked.push(milestone);
                
                this.emit('milestone_unlocked', { playerId: data.playerId, milestone });
            }
        }

        return unlocked;
    }

    // =========================================================================
    // POI Operations
    // =========================================================================

    getPOIsInRealm(realm: string): POI[] {
        return Array.from(this.pois.values()).filter(p => p.realm === realm);
    }

    getDiscoveredPOIs(playerId: string): POI[] {
        const data = this.playerData.get(playerId);
        if (!data) return [];
        return data.discoveredPOIs.map(id => this.pois.get(id)).filter((p): p is POI => p !== undefined);
    }

    getUndiscoveredPOIs(playerId: string, realm: string): POI[] {
        const data = this.playerData.get(playerId);
        const discovered = data?.discoveredPOIs || [];
        return Array.from(this.pois.values())
            .filter(p => p.realm === realm && !discovered.includes(p.id));
    }

    // =========================================================================
    // Biome Operations
    // =========================================================================

    getBiomeAtPosition(realm: string, x: number, y: number): BiomeConfig | null {
        for (const biome of this.biomes) {
            if (biome.realm !== realm) continue;
            const distance = Math.hypot(biome.centerX - x, biome.centerY - y);
            if (distance <= biome.radius) {
                return biome;
            }
        }
        return null;
    }

    getBiomesInRealm(realm: string): BiomeConfig[] {
        return this.biomes.filter(b => b.realm === realm);
    }

    // =========================================================================
    // Biome Reward Validation (Phase 3 Security)
    // =========================================================================

    /**
     * Validate and calculate biome-specific rewards server-side
     * Prevents client-side manipulation of reward multipliers
     */
    validateBiomeReward(
        playerId: string,
        biomeId: string,
        baseReward: number,
        rewardType: 'xp' | 'stardust' | 'fragments'
    ): { valid: boolean; finalReward: number; multiplier: number; error?: string } {
        // Find the biome
        const biome = this.biomes.find(b => b.id === biomeId);
        if (!biome) {
            return { valid: false, finalReward: 0, multiplier: 1, error: 'Invalid biome' };
        }

        // Get player data to verify they've visited this biome
        const data = this.playerData.get(playerId);
        if (!data || !data.visitedBiomes.includes(biomeId)) {
            return { valid: false, finalReward: 0, multiplier: 1, error: 'Biome not visited' };
        }

        // Apply server-controlled multiplier
        const multiplier = biome.xpMultiplier;
        const finalReward = Math.floor(baseReward * multiplier);

        this.emit('biome_reward_calculated', {
            playerId,
            biomeId,
            rewardType,
            baseReward,
            finalReward,
            multiplier
        });

        return { valid: true, finalReward, multiplier };
    }

    /**
     * Get the valid XP multiplier for a player's current position
     * Used by XP granting systems to apply biome bonuses server-side
     */
    getPositionXPMultiplier(playerId: string, realm: string, x: number, y: number): number {
        const biome = this.getBiomeAtPosition(realm, x, y);
        return biome?.xpMultiplier || 1.0;
    }

    /**
     * Validate a claimed biome discovery and apply rewards
     */
    async claimBiomeDiscoveryReward(
        playerId: string,
        biomeId: string
    ): Promise<{ success: boolean; reward?: { xp: number; stardust?: number }; error?: string }> {
        const data = await this.getPlayerExploration(playerId);
        
        // Check if biome exists
        const biome = this.biomes.find(b => b.id === biomeId);
        if (!biome) {
            return { success: false, error: 'Invalid biome' };
        }

        // Check if already claimed
        if (data.visitedBiomes.includes(biomeId)) {
            return { success: false, error: 'Biome already discovered' };
        }

        // Calculate discovery reward based on biome difficulty
        const baseXP = 50;
        const reward = {
            xp: Math.floor(baseXP * biome.xpMultiplier),
            stardust: biome.xpMultiplier >= 1.5 ? 25 : undefined
        };

        // Mark as visited
        data.visitedBiomes.push(biomeId);
        await this.persistExplorationData(data);

        this.emit('biome_discovered', { playerId, biomeId, reward });

        return { success: true, reward };
    }

    // =========================================================================
    // Leaderboard
    // =========================================================================

    async getExplorationLeaderboard(limit: number = 50): Promise<Array<{
        playerId: string;
        explorationXp: number;
        poisDiscovered: number;
        cellsRevealed: number;
    }>> {
        const entries = Array.from(this.playerData.values())
            .map(d => ({
                playerId: d.playerId,
                explorationXp: d.explorationXp,
                poisDiscovered: d.discoveredPOIs.length,
                cellsRevealed: d.revealedCells.length
            }))
            .sort((a, b) => b.explorationXp - a.explorationXp)
            .slice(0, limit);
        
        return entries;
    }

    // =========================================================================
    // Persistence
    // =========================================================================

    private async persistExplorationData(data: ExplorationData): Promise<void> {
        try {
            if (mongoPersistence.isReady()) {
                await mongoPersistence.getCollection('exploration')?.updateOne(
                    { playerId: data.playerId },
                    { $set: data },
                    { upsert: true }
                );
            }
        } catch (error) {
            console.error('Failed to persist exploration data:', error);
        }
    }

    private async persistPOIDiscovery(poiId: string, playerId: string): Promise<void> {
        try {
            if (mongoPersistence.isReady()) {
                await mongoPersistence.getCollection('poi_discoveries')?.insertOne({
                    poiId,
                    playerId,
                    discoveredAt: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to persist POI discovery:', error);
        }
    }

    // =========================================================================
    // Stats
    // =========================================================================

    getStats(): {
        totalPOIs: number;
        discoveredPOIs: number;
        totalBiomes: number;
        playerDataCount: number;
    } {
        const discoveredCount = Array.from(this.pois.values()).filter(p => p.discoveredBy !== null).length;
        
        return {
            totalPOIs: this.pois.size,
            discoveredPOIs: discoveredCount,
            totalBiomes: this.biomes.length,
            playerDataCount: this.playerData.size
        };
    }

    // =========================================================================
    // Additional Methods for Routes
    // =========================================================================

    /**
     * Get exploration stats for a player
     */
    async getExplorationStats(playerId: string): Promise<{
        totalCellsRevealed: number;
        totalPOIsDiscovered: number;
        totalBiomesVisited: number;
        totalRealmsVisited: number;
        totalDistanceTraveled: number;
        explorationXp: number;
        explorationLevel: number;
        milestones: ExplorationMilestone[];
    }> {
        const data = await this.getPlayerExploration(playerId);
        const level = Math.floor(Math.sqrt(data.explorationXp / 100)) + 1;
        
        return {
            totalCellsRevealed: data.revealedCells.length,
            totalPOIsDiscovered: data.discoveredPOIs.length,
            totalBiomesVisited: data.visitedBiomes.length,
            totalRealmsVisited: data.visitedRealms.length,
            totalDistanceTraveled: data.totalDistanceTraveled,
            explorationXp: data.explorationXp,
            explorationLevel: level,
            milestones: data.milestones
        };
    }

    /**
     * Get milestones for a player
     */
    async getMilestones(playerId: string): Promise<{
        unlocked: ExplorationMilestone[];
        available: Array<{
            id: string;
            threshold: number;
            type: string;
            currentProgress: number;
            reward: any;
        }>;
    }> {
        const data = await this.getPlayerExploration(playerId);
        const unlockedIds = new Set(data.milestones.map(m => m.id));
        
        const available = EXPLORATION_MILESTONES.filter(ms => !unlockedIds.has(ms.id)).map(ms => {
            let currentProgress = 0;
            switch (ms.type) {
                case 'pois': currentProgress = data.discoveredPOIs.length; break;
                case 'realms': currentProgress = data.visitedRealms.length; break;
                case 'biomes': currentProgress = data.visitedBiomes.length; break;
                case 'distance': currentProgress = data.totalDistanceTraveled; break;
                case 'cells': currentProgress = data.revealedCells.length; break;
            }
            return {
                id: ms.id,
                threshold: ms.threshold,
                type: ms.type,
                currentProgress,
                reward: ms.reward
            };
        });
        
        return {
            unlocked: data.milestones,
            available
        };
    }

    /**
     * Reveal fog at a specific position
     */
    async revealFog(playerId: string, realm: string, x: number, y: number): Promise<{
        success: boolean;
        cellsRevealed: string[];
        xpEarned: number;
    }> {
        const data = await this.getPlayerExploration(playerId);
        const cellX = Math.floor(x / CELL_SIZE);
        const cellY = Math.floor(y / CELL_SIZE);
        const cellsRevealed: string[] = [];
        let xpEarned = 0;

        // Reveal 3x3 area
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const cellId = `${realm}:${cellX + dx}:${cellY + dy}`;
                if (!data.revealedCells.includes(cellId)) {
                    data.revealedCells.push(cellId);
                    cellsRevealed.push(cellId);
                    xpEarned += 1;
                }
            }
        }

        if (cellsRevealed.length > 0) {
            data.explorationXp += xpEarned;
            await this.persistExplorationData(data);
        }

        return { success: true, cellsRevealed, xpEarned };
    }

    /**
     * Check if a cell is explored
     */
    async isExplored(playerId: string, realm: string, x: number, y: number): Promise<boolean> {
        const data = await this.getPlayerExploration(playerId);
        const cellX = Math.floor(x / CELL_SIZE);
        const cellY = Math.floor(y / CELL_SIZE);
        const cellId = `${realm}:${cellX}:${cellY}`;
        return data.revealedCells.includes(cellId);
    }

    /**
     * Get all explored areas for a player
     */
    async exploredAreas(playerId: string, realm?: string): Promise<{
        cells: Array<{ realm: string; x: number; y: number }>;
        totalCells: number;
    }> {
        const data = await this.getPlayerExploration(playerId);
        let cells = data.revealedCells.map(cellId => {
            const [cellRealm, x, y] = cellId.split(':');
            return { realm: cellRealm, x: parseInt(x), y: parseInt(y) };
        });

        if (realm) {
            cells = cells.filter(c => c.realm === realm);
        }

        return { cells, totalCells: cells.length };
    }

    /**
     * Get POIs near a position
     */
    getPOIsNearPosition(realm: string, x: number, y: number, radius: number = 500): POI[] {
        return Array.from(this.pois.values()).filter(poi => {
            if (poi.realm !== realm) return false;
            const distance = Math.hypot(poi.x - x, poi.y - y);
            return distance <= radius;
        });
    }

    /**
     * Manually discover a POI
     */
    async discoverPOI(playerId: string, poiId: string): Promise<{
        success: boolean;
        error?: string;
        poi?: POI;
        xpEarned?: number;
        firstDiscoverer?: boolean;
    }> {
        const poi = this.pois.get(poiId);
        if (!poi) {
            return { success: false, error: 'POI not found' };
        }

        const data = await this.getPlayerExploration(playerId);
        if (data.discoveredPOIs.includes(poiId)) {
            return { success: false, error: 'Already discovered' };
        }

        data.discoveredPOIs.push(poiId);
        let xpEarned = poi.xpReward;
        let firstDiscoverer = false;

        if (!poi.discoveredBy) {
            poi.discoveredBy = playerId;
            poi.discoveredAt = Date.now();
            xpEarned += poi.xpReward; // Double for first
            firstDiscoverer = true;
            await this.persistPOIDiscovery(poiId, playerId);
        }

        data.explorationXp += xpEarned;
        await this.persistExplorationData(data);

        this.emit('poi_discovered', { playerId, poi });

        return { success: true, poi, xpEarned, firstDiscoverer };
    }

    /**
     * Discover a biome
     */
    async discoverBiome(playerId: string, biomeId: string): Promise<{
        success: boolean;
        error?: string;
        biome?: BiomeConfig;
        xpEarned?: number;
    }> {
        const biome = this.biomes.find(b => b.id === biomeId);
        if (!biome) {
            return { success: false, error: 'Biome not found' };
        }

        const data = await this.getPlayerExploration(playerId);
        if (data.visitedBiomes.includes(biomeId)) {
            return { success: false, error: 'Already visited' };
        }

        data.visitedBiomes.push(biomeId);
        const xpEarned = 25;
        data.explorationXp += xpEarned;
        await this.persistExplorationData(data);

        this.emit('biome_entered', { playerId, biome });

        return { success: true, biome, xpEarned };
    }

    /**
     * Get discovered biomes for a player
     */
    async discoveredBiomes(playerId: string): Promise<BiomeConfig[]> {
        const data = await this.getPlayerExploration(playerId);
        return data.visitedBiomes
            .map(id => this.biomes.find(b => b.id === id))
            .filter((b): b is BiomeConfig => b !== undefined);
    }

    /**
     * Discover a secret (hidden POI)
     */
    async discoverSecret(playerId: string, secretId: string): Promise<{
        success: boolean;
        error?: string;
        secret?: POI;
        xpEarned?: number;
    }> {
        const poi = this.pois.get(secretId);
        if (!poi || poi.type !== 'hidden') {
            return { success: false, error: 'Secret not found' };
        }

        return this.discoverPOI(playerId, secretId);
    }

    /**
     * Get discovered secrets for a player
     */
    async discoveredSecrets(playerId: string): Promise<POI[]> {
        const data = await this.getPlayerExploration(playerId);
        return data.discoveredPOIs
            .map(id => this.pois.get(id))
            .filter((p): p is POI => p !== undefined && p.type === 'hidden');
    }

    // =========================================================================
    // Time-Based Secrets
    // =========================================================================
    // Time secrets are special discoveries that only appear at specific times
    
    private timeSecretsDiscovered: Map<string, Set<string>> = new Map(); // playerId -> discovered secret IDs

    // Define time-based secrets
    private readonly TIME_SECRETS = [
        { id: 'midnight_whisper', hour: 0, minute: 0, windowMinutes: 30, xpReward: 500, name: 'Midnight Whisper', description: 'Found at the stroke of midnight' },
        { id: 'dawn_chorus', hour: 6, minute: 0, windowMinutes: 60, xpReward: 300, name: 'Dawn Chorus', description: 'Discovered at dawn' },
        { id: 'solar_zenith', hour: 12, minute: 0, windowMinutes: 30, xpReward: 400, name: 'Solar Zenith', description: 'Found at high noon' },
        { id: 'twilight_veil', hour: 18, minute: 0, windowMinutes: 60, xpReward: 350, name: 'Twilight Veil', description: 'Discovered at dusk' },
        { id: 'golden_hour', hour: 17, minute: 30, windowMinutes: 30, xpReward: 450, name: 'Golden Hour', description: 'Found during the golden hour' },
        { id: 'witching_hour', hour: 3, minute: 0, windowMinutes: 30, xpReward: 600, name: 'Witching Hour', description: 'Discovered in the witching hour' },
        { id: 'blue_hour', hour: 5, minute: 0, windowMinutes: 30, xpReward: 350, name: 'Blue Hour', description: 'Found during the blue hour before dawn' },
        { id: 'elevenses', hour: 11, minute: 11, windowMinutes: 11, xpReward: 1111, name: 'The Elevenses', description: 'Found at 11:11' },
    ];

    /**
     * Check which time secrets are currently available
     */
    getAvailableTimeSecrets(): Array<{ id: string; name: string; description: string; xpReward: number; expiresIn: number }> {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMinute;

        return this.TIME_SECRETS.filter(secret => {
            const secretTotalMinutes = secret.hour * 60 + secret.minute;
            const windowStart = secretTotalMinutes;
            const windowEnd = secretTotalMinutes + secret.windowMinutes;
            return currentTotalMinutes >= windowStart && currentTotalMinutes < windowEnd;
        }).map(secret => {
            const secretTotalMinutes = secret.hour * 60 + secret.minute;
            const windowEnd = secretTotalMinutes + secret.windowMinutes;
            const expiresIn = (windowEnd - currentTotalMinutes) * 60 * 1000; // Convert to ms
            return {
                id: secret.id,
                name: secret.name,
                description: secret.description,
                xpReward: secret.xpReward,
                expiresIn
            };
        });
    }

    /**
     * Discover a time-based secret
     */
    async discoverTimeSecret(playerId: string, secretId: string): Promise<{
        success: boolean;
        error?: string;
        secret?: { id: string; name: string; description: string };
        xpEarned?: number;
        alreadyDiscovered?: boolean;
    }> {
        const secret = this.TIME_SECRETS.find(s => s.id === secretId);
        if (!secret) {
            return { success: false, error: 'Time secret not found' };
        }

        // Check if secret is currently available
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const secretTotalMinutes = secret.hour * 60 + secret.minute;
        const windowEnd = secretTotalMinutes + secret.windowMinutes;

        if (currentTotalMinutes < secretTotalMinutes || currentTotalMinutes >= windowEnd) {
            return { success: false, error: 'This time secret is not currently available' };
        }

        // Check if already discovered
        let playerSecrets = this.timeSecretsDiscovered.get(playerId);
        if (!playerSecrets) {
            playerSecrets = new Set();
            this.timeSecretsDiscovered.set(playerId, playerSecrets);
            
            // Load from database
            try {
                if (mongoPersistence.isReady()) {
                    const saved = await mongoPersistence.getCollection('time_secrets')?.findOne({ playerId });
                    if (saved && saved.discoveredSecrets) {
                        playerSecrets = new Set(saved.discoveredSecrets);
                        this.timeSecretsDiscovered.set(playerId, playerSecrets);
                    }
                }
            } catch (error) {
                console.error('Failed to load time secrets:', error);
            }
        }

        if (playerSecrets.has(secretId)) {
            return { success: false, error: 'Already discovered', alreadyDiscovered: true };
        }

        // Discover the secret
        playerSecrets.add(secretId);
        
        // Persist
        try {
            if (mongoPersistence.isReady()) {
                await mongoPersistence.getCollection('time_secrets')?.updateOne(
                    { playerId },
                    { $set: { playerId, discoveredSecrets: Array.from(playerSecrets), updatedAt: Date.now() } },
                    { upsert: true }
                );
            }
        } catch (error) {
            console.error('Failed to persist time secret:', error);
        }

        // Add XP to exploration
        const data = await this.getPlayerExploration(playerId);
        data.explorationXp += secret.xpReward;
        await this.persistExplorationData(data);

        this.emit('time_secret_discovered', { playerId, secret });

        return {
            success: true,
            secret: { id: secret.id, name: secret.name, description: secret.description },
            xpEarned: secret.xpReward
        };
    }

    /**
     * Get all discovered time secrets for a player
     */
    async getDiscoveredTimeSecrets(playerId: string): Promise<Array<{ id: string; name: string; description: string }>> {
        let playerSecrets = this.timeSecretsDiscovered.get(playerId);
        
        if (!playerSecrets) {
            playerSecrets = new Set();
            try {
                if (mongoPersistence.isReady()) {
                    const saved = await mongoPersistence.getCollection('time_secrets')?.findOne({ playerId });
                    if (saved && saved.discoveredSecrets) {
                        playerSecrets = new Set(saved.discoveredSecrets);
                        this.timeSecretsDiscovered.set(playerId, playerSecrets);
                    }
                }
            } catch (error) {
                console.error('Failed to load time secrets:', error);
            }
        }

        return this.TIME_SECRETS
            .filter(s => playerSecrets!.has(s.id))
            .map(s => ({ id: s.id, name: s.name, description: s.description }));
    }

    /**
     * Get all time secrets (for UI display showing locked/unlocked)
     */
    async getAllTimeSecrets(playerId: string): Promise<Array<{
        id: string;
        name: string;
        description: string;
        xpReward: number;
        isDiscovered: boolean;
        isAvailable: boolean;
        hint: string;
    }>> {
        const discovered = await this.getDiscoveredTimeSecrets(playerId);
        const discoveredIds = new Set(discovered.map(d => d.id));
        const available = this.getAvailableTimeSecrets();
        const availableIds = new Set(available.map(a => a.id));

        return this.TIME_SECRETS.map(secret => ({
            id: secret.id,
            name: discoveredIds.has(secret.id) ? secret.name : '???',
            description: discoveredIds.has(secret.id) ? secret.description : 'A time-locked secret',
            xpReward: secret.xpReward,
            isDiscovered: discoveredIds.has(secret.id),
            isAvailable: availableIds.has(secret.id),
            hint: `Available around ${secret.hour.toString().padStart(2, '0')}:${secret.minute.toString().padStart(2, '0')}`
        }));
    }
}

export const explorationService = new ExplorationService();
export { ExplorationService };
