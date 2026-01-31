// =============================================================================
// Warmth Service - Server-authoritative warmth and darkness mechanics
// =============================================================================
// Phase 2.2: Server-side validation of warmth/darkness values
// =============================================================================

import { EventEmitter } from 'events';
import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// WARMTH STATE MODEL
// ============================================

interface IWarmthState extends Document {
    playerId: string;
    warmth: number;
    darkness: number;
    lightsCarried: number;
    lastWarmthSource: Date | null;
    lastDarknessExposure: Date | null;
    darknessLevel: number; // Current environmental darkness
    zone: string;
    updatedAt: Date;
}

const WarmthStateSchema = new Schema<IWarmthState>({
    playerId: { type: String, required: true, unique: true, index: true },
    warmth: { type: Number, default: 100, min: 0, max: 100 },
    darkness: { type: Number, default: 0, min: 0, max: 100 },
    lightsCarried: { type: Number, default: 0 },
    lastWarmthSource: { type: Date, default: null },
    lastDarknessExposure: { type: Date, default: null },
    darknessLevel: { type: Number, default: 0 },
    zone: { type: String, default: 'neutral' },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'warmthStates' });

const WarmthState = mongoose.models.WarmthState || 
    mongoose.model<IWarmthState>('WarmthState', WarmthStateSchema);

// ============================================
// WARMTH/DARKNESS ZONES
// ============================================

interface WarmthZone {
    id: string;
    name: string;
    warmthRate: number;      // Warmth change per second
    darknessRate: number;    // Darkness change per second
    baseDarkness: number;    // Base darkness level
    lightBonus: number;      // Multiplier for light effects
}

const ZONES: Record<string, WarmthZone> = {
    'campfire': {
        id: 'campfire',
        name: 'Campfire',
        warmthRate: 5,        // +5 warmth/sec
        darknessRate: -2,     // -2 darkness/sec
        baseDarkness: 0,
        lightBonus: 2
    },
    'gathering': {
        id: 'gathering',
        name: 'Gathering',
        warmthRate: 2,
        darknessRate: -1,
        baseDarkness: 10,
        lightBonus: 1.5
    },
    'neutral': {
        id: 'neutral',
        name: 'Neutral',
        warmthRate: 0,
        darknessRate: 0,
        baseDarkness: 20,
        lightBonus: 1
    },
    'shadows': {
        id: 'shadows',
        name: 'Shadows',
        warmthRate: -1,
        darknessRate: 1,
        baseDarkness: 50,
        lightBonus: 0.5
    },
    'deep_darkness': {
        id: 'deep_darkness',
        name: 'Deep Darkness',
        warmthRate: -3,
        darknessRate: 3,
        baseDarkness: 80,
        lightBonus: 0.25
    },
    'void': {
        id: 'void',
        name: 'The Void',
        warmthRate: -5,
        darknessRate: 5,
        baseDarkness: 100,
        lightBonus: 0.1
    }
};

// ============================================
// WARMTH SOURCES
// ============================================

interface WarmthSource {
    id: string;
    warmthGain: number;
    duration: number;       // Duration in ms
    cooldown: number;       // Cooldown between uses
    darknessReduction: number;
}

const WARMTH_SOURCES: Record<string, WarmthSource> = {
    'campfire': {
        id: 'campfire',
        warmthGain: 10,
        duration: 0,        // Instant
        cooldown: 0,
        darknessReduction: 5
    },
    'hug': {
        id: 'hug',
        warmthGain: 15,
        duration: 3000,
        cooldown: 30000,
        darknessReduction: 10
    },
    'light_fragment': {
        id: 'light_fragment',
        warmthGain: 25,
        duration: 0,
        cooldown: 60000,
        darknessReduction: 15
    },
    'beacon': {
        id: 'beacon',
        warmthGain: 5,
        duration: 0,
        cooldown: 0,
        darknessReduction: 3
    },
    'friend_proximity': {
        id: 'friend_proximity',
        warmthGain: 2,
        duration: 0,
        cooldown: 1000,     // Per second when near friend
        darknessReduction: 1
    },
    'constellation_bond': {
        id: 'constellation_bond',
        warmthGain: 20,
        duration: 0,
        cooldown: 120000,
        darknessReduction: 10
    }
};

// ============================================
// DARKNESS EFFECTS
// ============================================

interface DarknessEffect {
    threshold: number;
    name: string;
    movementPenalty: number;    // Speed multiplier
    visionRange: number;        // Vision radius multiplier
    interactionPenalty: boolean;
    whispers: boolean;          // Creepy audio effects
}

const DARKNESS_EFFECTS: DarknessEffect[] = [
    { threshold: 0, name: 'Clear', movementPenalty: 1.0, visionRange: 1.0, interactionPenalty: false, whispers: false },
    { threshold: 20, name: 'Dim', movementPenalty: 1.0, visionRange: 0.9, interactionPenalty: false, whispers: false },
    { threshold: 40, name: 'Dark', movementPenalty: 0.95, visionRange: 0.7, interactionPenalty: false, whispers: true },
    { threshold: 60, name: 'Very Dark', movementPenalty: 0.85, visionRange: 0.5, interactionPenalty: true, whispers: true },
    { threshold: 80, name: 'Pitch Black', movementPenalty: 0.7, visionRange: 0.3, interactionPenalty: true, whispers: true },
    { threshold: 95, name: 'Consumed', movementPenalty: 0.5, visionRange: 0.1, interactionPenalty: true, whispers: true }
];

// ============================================
// WARMTH SERVICE
// ============================================

interface PlayerWarmthState {
    playerId: string;
    warmth: number;
    darkness: number;
    zone: string;
    lightsCarried: number;
    nearbyPlayers: Set<string>;
    lastUpdate: number;
    cooldowns: Map<string, number>;
}

class WarmthService extends EventEmitter {
    private initialized: boolean = false;
    private playerStates: Map<string, PlayerWarmthState> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly UPDATE_RATE = 1000; // Update every second

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        // Start update loop
        this.updateInterval = setInterval(() => {
            this.updateAllPlayers();
        }, this.UPDATE_RATE);

        console.log('🔥 Warmth service initialized');
    }

    // =========================================================================
    // PLAYER STATE MANAGEMENT
    // =========================================================================

    async loadPlayerState(playerId: string): Promise<PlayerWarmthState> {
        // Check memory cache first
        let state = this.playerStates.get(playerId);
        if (state) return state;

        // Load from database
        let dbState = await WarmthState.findOne({ playerId }).lean();
        
        if (!dbState) {
            // Create new state
            dbState = await WarmthState.create({
                playerId,
                warmth: 100,
                darkness: 0,
                lightsCarried: 0,
                zone: 'neutral'
            });
        }

        state = {
            playerId,
            warmth: dbState.warmth,
            darkness: dbState.darkness,
            zone: dbState.zone || 'neutral',
            lightsCarried: dbState.lightsCarried,
            nearbyPlayers: new Set(),
            lastUpdate: Date.now(),
            cooldowns: new Map()
        };

        this.playerStates.set(playerId, state);
        return state;
    }

    async savePlayerState(playerId: string): Promise<void> {
        const state = this.playerStates.get(playerId);
        if (!state) return;

        await WarmthState.findOneAndUpdate(
            { playerId },
            {
                warmth: state.warmth,
                darkness: state.darkness,
                zone: state.zone,
                lightsCarried: state.lightsCarried,
                updatedAt: new Date()
            },
            { upsert: true }
        );
    }

    removePlayerState(playerId: string): void {
        const state = this.playerStates.get(playerId);
        if (state) {
            // Save before removing
            this.savePlayerState(playerId).catch(err => 
                console.error('Error saving warmth state on remove:', err)
            );
            this.playerStates.delete(playerId);
        }
    }

    // =========================================================================
    // ZONE MANAGEMENT
    // =========================================================================

    setPlayerZone(playerId: string, zoneId: string): void {
        const state = this.playerStates.get(playerId);
        if (!state) return;

        const zone = ZONES[zoneId] || ZONES['neutral'];
        const oldZone = state.zone;
        state.zone = zone.id;

        if (oldZone !== zone.id) {
            this.emit('zone_changed', { playerId, oldZone, newZone: zone.id });
        }
    }

    // =========================================================================
    // WARMTH SOURCES
    // =========================================================================

    /**
     * Apply a warmth source to a player
     */
    applyWarmthSource(playerId: string, sourceId: string): {
        success: boolean;
        warmthGained?: number;
        darknessReduced?: number;
        cooldownRemaining?: number;
    } {
        const state = this.playerStates.get(playerId);
        if (!state) return { success: false };

        const source = WARMTH_SOURCES[sourceId];
        if (!source) return { success: false };

        // Check cooldown
        const lastUse = state.cooldowns.get(sourceId) || 0;
        const now = Date.now();
        if (now - lastUse < source.cooldown) {
            return { 
                success: false, 
                cooldownRemaining: source.cooldown - (now - lastUse) 
            };
        }

        // Apply zone bonus
        const zone = ZONES[state.zone] || ZONES['neutral'];
        const warmthGained = source.warmthGain * zone.lightBonus;
        const darknessReduced = source.darknessReduction * zone.lightBonus;

        // Apply changes
        state.warmth = Math.min(100, state.warmth + warmthGained);
        state.darkness = Math.max(0, state.darkness - darknessReduced);
        state.cooldowns.set(sourceId, now);

        this.emit('warmth_gained', { 
            playerId, 
            sourceId, 
            warmthGained, 
            darknessReduced,
            newWarmth: state.warmth,
            newDarkness: state.darkness
        });

        return { success: true, warmthGained, darknessReduced };
    }

    // =========================================================================
    // PROXIMITY
    // =========================================================================

    /**
     * Update nearby players for warmth sharing
     */
    updateNearbyPlayers(playerId: string, nearbyPlayerIds: string[]): void {
        const state = this.playerStates.get(playerId);
        if (!state) return;

        state.nearbyPlayers = new Set(nearbyPlayerIds);
    }

    // =========================================================================
    // LIGHT CARRYING
    // =========================================================================

    /**
     * Add light source to player
     */
    addLight(playerId: string, amount: number = 1): void {
        const state = this.playerStates.get(playerId);
        if (!state) return;

        state.lightsCarried = Math.min(5, state.lightsCarried + amount);
        this.emit('light_added', { playerId, lightsCarried: state.lightsCarried });
    }

    /**
     * Use a light source
     */
    useLight(playerId: string): boolean {
        const state = this.playerStates.get(playerId);
        if (!state || state.lightsCarried <= 0) return false;

        state.lightsCarried--;
        state.warmth = Math.min(100, state.warmth + 20);
        state.darkness = Math.max(0, state.darkness - 15);

        this.emit('light_used', { 
            playerId, 
            lightsRemaining: state.lightsCarried,
            newWarmth: state.warmth,
            newDarkness: state.darkness
        });

        return true;
    }

    // =========================================================================
    // QUERIES
    // =========================================================================

    getPlayerWarmth(playerId: string): { warmth: number; darkness: number } | null {
        const state = this.playerStates.get(playerId);
        if (!state) return null;

        return {
            warmth: state.warmth,
            darkness: state.darkness
        };
    }

    getDarknessEffect(darkness: number): DarknessEffect {
        for (let i = DARKNESS_EFFECTS.length - 1; i >= 0; i--) {
            if (darkness >= DARKNESS_EFFECTS[i].threshold) {
                return DARKNESS_EFFECTS[i];
            }
        }
        return DARKNESS_EFFECTS[0];
    }

    getFullState(playerId: string): {
        warmth: number;
        darkness: number;
        zone: string;
        lightsCarried: number;
        effect: DarknessEffect;
    } | null {
        const state = this.playerStates.get(playerId);
        if (!state) return null;

        return {
            warmth: state.warmth,
            darkness: state.darkness,
            zone: state.zone,
            lightsCarried: state.lightsCarried,
            effect: this.getDarknessEffect(state.darkness)
        };
    }

    // =========================================================================
    // UPDATE LOOP
    // =========================================================================

    private updateAllPlayers(): void {
        const now = Date.now();

        for (const [playerId, state] of this.playerStates) {
            const deltaTime = (now - state.lastUpdate) / 1000; // Convert to seconds
            state.lastUpdate = now;

            const zone = ZONES[state.zone] || ZONES['neutral'];

            // Apply zone effects
            let warmthChange = zone.warmthRate * deltaTime;
            let darknessChange = zone.darknessRate * deltaTime;

            // Apply nearby player bonus (warmth from proximity)
            const nearbyCount = state.nearbyPlayers.size;
            if (nearbyCount > 0) {
                warmthChange += nearbyCount * 0.5 * deltaTime;
                darknessChange -= nearbyCount * 0.2 * deltaTime;
            }

            // Apply light carried bonus
            if (state.lightsCarried > 0) {
                warmthChange += state.lightsCarried * 0.3 * deltaTime;
                darknessChange -= state.lightsCarried * 0.5 * deltaTime;
            }

            // Apply base darkness pressure
            const baseDarknessDiff = zone.baseDarkness - state.darkness;
            darknessChange += baseDarknessDiff * 0.1 * deltaTime;

            // Update values
            const oldWarmth = state.warmth;
            const oldDarkness = state.darkness;

            state.warmth = Math.max(0, Math.min(100, state.warmth + warmthChange));
            state.darkness = Math.max(0, Math.min(100, state.darkness + darknessChange));

            // Emit events for significant changes
            if (Math.abs(state.warmth - oldWarmth) > 1 || Math.abs(state.darkness - oldDarkness) > 1) {
                this.emit('state_updated', {
                    playerId,
                    warmth: state.warmth,
                    darkness: state.darkness,
                    effect: this.getDarknessEffect(state.darkness)
                });
            }

            // Check for critical thresholds
            if (state.warmth <= 0 && oldWarmth > 0) {
                this.emit('warmth_depleted', { playerId });
            }

            if (state.darkness >= 95 && oldDarkness < 95) {
                this.emit('consumed_by_darkness', { playerId });
            }
        }
    }

    // =========================================================================
    // SHUTDOWN
    // =========================================================================

    async shutdown(): Promise<void> {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Save all states
        const savePromises = Array.from(this.playerStates.keys()).map(playerId =>
            this.savePlayerState(playerId)
        );

        await Promise.all(savePromises);
        this.playerStates.clear();
    }
}

export const warmthService = new WarmthService();
export { ZONES, WARMTH_SOURCES, DARKNESS_EFFECTS };
