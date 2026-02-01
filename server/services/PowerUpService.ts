// =============================================================================
// PowerUpService - Server-Authoritative Power-Up System
// =============================================================================
// Manages server-side power-up spawning, collection, and effects.
// Ensures all players see the same power-ups and fair collection.
//
// Power-up types:
// - Speed boost
// - Shield (protection)
// - XP multiplier
// - Stardust magnet
// - Bond amplifier
// - Fragment attractor
// - Invisibility
// =============================================================================

import { EventEmitter } from 'events';

export type PowerUpType =
    | 'speed_boost'
    | 'shield'
    | 'xp_multiplier'
    | 'stardust_magnet'
    | 'bond_amplifier'
    | 'fragment_attractor'
    | 'invisibility'
    | 'super_sing'
    | 'pulse_wave';

export interface PowerUp {
    id: string;
    type: PowerUpType;
    x: number;
    y: number;
    realm: string;
    spawnTime: number;
    expiresAt: number;
    collected: boolean;
    collectedBy: string | null;
}

export interface ActiveEffect {
    type: PowerUpType;
    playerId: string;
    startTime: number;
    endTime: number;
    multiplier: number;      // Effect strength
}

export interface PowerUpConfig {
    type: PowerUpType;
    name: string;
    description: string;
    duration: number;        // Effect duration in seconds
    spawnWeight: number;     // Relative spawn probability
    rarity: 'common' | 'uncommon' | 'rare' | 'epic';
    multiplier: number;      // Effect strength multiplier
    color: string;           // For visual representation
    icon: string;            // Emoji/icon
}

// Power-up configurations
const POWER_UP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
    speed_boost: {
        type: 'speed_boost',
        name: 'Speed Boost',
        description: 'Move 50% faster',
        duration: 15,
        spawnWeight: 25,
        rarity: 'common',
        multiplier: 1.5,
        color: '#00ff88',
        icon: '⚡'
    },
    shield: {
        type: 'shield',
        name: 'Shield',
        description: 'Protected from darkness',
        duration: 20,
        spawnWeight: 15,
        rarity: 'uncommon',
        multiplier: 1.0,
        color: '#88ccff',
        icon: '🛡️'
    },
    xp_multiplier: {
        type: 'xp_multiplier',
        name: 'XP Surge',
        description: 'Earn 2x XP',
        duration: 30,
        spawnWeight: 10,
        rarity: 'rare',
        multiplier: 2.0,
        color: '#ffcc00',
        icon: '✨'
    },
    stardust_magnet: {
        type: 'stardust_magnet',
        name: 'Stardust Magnet',
        description: 'Attract nearby stardust',
        duration: 20,
        spawnWeight: 15,
        rarity: 'uncommon',
        multiplier: 1.0,
        color: '#cc88ff',
        icon: '🧲'
    },
    bond_amplifier: {
        type: 'bond_amplifier',
        name: 'Bond Amplifier',
        description: 'Bonds form 2x faster',
        duration: 25,
        spawnWeight: 12,
        rarity: 'uncommon',
        multiplier: 2.0,
        color: '#ff88cc',
        icon: '💫'
    },
    fragment_attractor: {
        type: 'fragment_attractor',
        name: 'Fragment Attractor',
        description: 'Fragments drawn to you',
        duration: 15,
        spawnWeight: 18,
        rarity: 'common',
        multiplier: 1.0,
        color: '#88ffcc',
        icon: '🌟'
    },
    invisibility: {
        type: 'invisibility',
        name: 'Invisibility',
        description: 'Become invisible to others',
        duration: 10,
        spawnWeight: 5,
        rarity: 'epic',
        multiplier: 1.0,
        color: '#ffffff',
        icon: '👻'
    },
    super_sing: {
        type: 'super_sing',
        name: 'Super Sing',
        description: 'Your sing reaches much further',
        duration: 20,
        spawnWeight: 8,
        rarity: 'rare',
        multiplier: 3.0,
        color: '#ff8800',
        icon: '🎵'
    },
    pulse_wave: {
        type: 'pulse_wave',
        name: 'Pulse Wave',
        description: 'Your pulses create waves',
        duration: 15,
        spawnWeight: 8,
        rarity: 'rare',
        multiplier: 2.0,
        color: '#00ccff',
        icon: '🌊'
    }
};

// Spawn configuration per realm
interface RealmSpawnConfig {
    maxPowerUps: number;
    spawnInterval: number;    // Seconds between spawn attempts
    spawnChance: number;      // 0-1 probability per attempt
    lifetimeSeconds: number;  // How long power-ups exist before despawning
    spawnRadius: number;      // Max distance from center
}

const REALM_SPAWN_CONFIGS: Record<string, RealmSpawnConfig> = {
    genesis: {
        maxPowerUps: 5,
        spawnInterval: 30,
        spawnChance: 0.4,
        lifetimeSeconds: 60,
        spawnRadius: 1500
    },
    nebula: {
        maxPowerUps: 6,
        spawnInterval: 25,
        spawnChance: 0.45,
        lifetimeSeconds: 55,
        spawnRadius: 1600
    },
    void: {
        maxPowerUps: 4,
        spawnInterval: 35,
        spawnChance: 0.5,
        lifetimeSeconds: 45,
        spawnRadius: 1400
    },
    starforge: {
        maxPowerUps: 7,
        spawnInterval: 20,
        spawnChance: 0.5,
        lifetimeSeconds: 50,
        spawnRadius: 1700
    },
    sanctuary: {
        maxPowerUps: 8,
        spawnInterval: 15,
        spawnChance: 0.6,
        lifetimeSeconds: 90,
        spawnRadius: 1800
    },
    abyss: {
        maxPowerUps: 4,
        spawnInterval: 40,
        spawnChance: 0.3,
        lifetimeSeconds: 30,
        spawnRadius: 1600
    },
    crystal: {
        maxPowerUps: 6,
        spawnInterval: 25,
        spawnChance: 0.5,
        lifetimeSeconds: 60,
        spawnRadius: 1500
    },
    celestial: {
        maxPowerUps: 5,
        spawnInterval: 30,
        spawnChance: 0.4,
        lifetimeSeconds: 75,
        spawnRadius: 2000
    },
    tagarena: {
        maxPowerUps: 12,
        spawnInterval: 10,
        spawnChance: 0.8,
        lifetimeSeconds: 20,
        spawnRadius: 1200
    }
};

export class PowerUpService extends EventEmitter {
    private static instance: PowerUpService;
    private powerUps: Map<string, PowerUp> = new Map();
    private activeEffects: Map<string, ActiveEffect[]> = new Map(); // playerId -> effects
    private spawnTimers: Map<string, number> = new Map(); // realm -> last spawn time
    private updateInterval: NodeJS.Timeout | null = null;
    private ready = false;

    private readonly UPDATE_RATE = 1000; // 1 second updates

    // Singleton
    static getInstance(): PowerUpService {
        if (!PowerUpService.instance) {
            PowerUpService.instance = new PowerUpService();
        }
        return PowerUpService.instance;
    }

    async initialize(): Promise<void> {
        if (this.ready) return;

        // Initialize spawn timers for all realms
        const now = Date.now();
        for (const realm of Object.keys(REALM_SPAWN_CONFIGS)) {
            this.spawnTimers.set(realm, now);
        }

        // Start update loop
        this.updateInterval = setInterval(() => {
            this.update();
        }, this.UPDATE_RATE);

        this.ready = true;
        console.log('⚡ PowerUpService initialized');
    }

    isReady(): boolean {
        return this.ready;
    }

    /**
     * Main update loop
     */
    private update(): void {
        const now = Date.now();

        // Check for expired power-ups
        for (const [id, powerUp] of this.powerUps) {
            if (!powerUp.collected && now >= powerUp.expiresAt) {
                this.despawnPowerUp(id);
            }
        }

        // Check for expired effects
        for (const [playerId, effects] of this.activeEffects) {
            const activeEffects = effects.filter(e => now < e.endTime);
            if (activeEffects.length !== effects.length) {
                // Some effects expired
                const expired = effects.filter(e => now >= e.endTime);
                for (const effect of expired) {
                    this.emit('effect_expired', {
                        playerId,
                        type: effect.type
                    });
                }
                this.activeEffects.set(playerId, activeEffects);
            }
        }

        // Attempt to spawn new power-ups
        for (const [realm, config] of Object.entries(REALM_SPAWN_CONFIGS)) {
            const lastSpawn = this.spawnTimers.get(realm) || 0;
            const timeSinceSpawn = (now - lastSpawn) / 1000;

            if (timeSinceSpawn >= config.spawnInterval) {
                this.spawnTimers.set(realm, now);

                // Count existing power-ups in realm
                const realmPowerUps = Array.from(this.powerUps.values())
                    .filter(p => p.realm === realm && !p.collected);

                if (realmPowerUps.length < config.maxPowerUps && Math.random() < config.spawnChance) {
                    this.spawnRandomPowerUp(realm);
                }
            }
        }
    }

    /**
     * Spawn a random power-up in a realm
     */
    private spawnRandomPowerUp(realm: string): PowerUp | null {
        const config = REALM_SPAWN_CONFIGS[realm];
        if (!config) return null;

        // Weighted random selection
        const type = this.selectRandomPowerUpType();
        if (!type) return null;

        // Random position within spawn radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * config.spawnRadius;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        return this.spawnPowerUp(type, x, y, realm);
    }

    /**
     * Select a random power-up type based on weights
     */
    private selectRandomPowerUpType(): PowerUpType | null {
        const totalWeight = Object.values(POWER_UP_CONFIGS)
            .reduce((sum, c) => sum + c.spawnWeight, 0);

        let random = Math.random() * totalWeight;

        for (const [type, config] of Object.entries(POWER_UP_CONFIGS)) {
            random -= config.spawnWeight;
            if (random <= 0) {
                return type as PowerUpType;
            }
        }

        return 'speed_boost'; // Fallback
    }

    /**
     * Spawn a specific power-up
     */
    spawnPowerUp(type: PowerUpType, x: number, y: number, realm: string): PowerUp {
        const config = REALM_SPAWN_CONFIGS[realm] || REALM_SPAWN_CONFIGS.genesis;
        const now = Date.now();

        const powerUp: PowerUp = {
            id: `pu-${now}-${Math.random().toString(36).substr(2, 6)}`,
            type,
            x,
            y,
            realm,
            spawnTime: now,
            expiresAt: now + (config.lifetimeSeconds * 1000),
            collected: false,
            collectedBy: null
        };

        this.powerUps.set(powerUp.id, powerUp);

        this.emit('power_up_spawned', this.serializePowerUp(powerUp));

        console.log(`⚡ Power-up spawned: ${POWER_UP_CONFIGS[type].name} in ${realm}`);

        return powerUp;
    }

    /**
     * Despawn a power-up
     */
    private despawnPowerUp(id: string): void {
        const powerUp = this.powerUps.get(id);
        if (powerUp) {
            this.powerUps.delete(id);
            this.emit('power_up_despawned', { id, realm: powerUp.realm });
        }
    }

    /**
     * Attempt to collect a power-up
     */
    collectPowerUp(powerUpId: string, playerId: string): { success: boolean; effect?: ActiveEffect; config?: PowerUpConfig } {
        const powerUp = this.powerUps.get(powerUpId);

        if (!powerUp || powerUp.collected) {
            return { success: false };
        }

        const config = POWER_UP_CONFIGS[powerUp.type];
        const now = Date.now();

        // Mark as collected
        powerUp.collected = true;
        powerUp.collectedBy = playerId;

        // Create active effect
        const effect: ActiveEffect = {
            type: powerUp.type,
            playerId,
            startTime: now,
            endTime: now + (config.duration * 1000),
            multiplier: config.multiplier
        };

        // Add to player's active effects
        if (!this.activeEffects.has(playerId)) {
            this.activeEffects.set(playerId, []);
        }

        // Remove any existing effect of the same type (refresh)
        const playerEffects = this.activeEffects.get(playerId)!;
        const existingIndex = playerEffects.findIndex(e => e.type === powerUp.type);
        if (existingIndex >= 0) {
            playerEffects.splice(existingIndex, 1);
        }
        playerEffects.push(effect);

        // Remove from spawn list
        this.powerUps.delete(powerUpId);

        // Emit events
        this.emit('power_up_collected', {
            powerUpId,
            playerId,
            type: powerUp.type,
            realm: powerUp.realm,
            effect: {
                type: effect.type,
                duration: config.duration,
                multiplier: config.multiplier
            }
        });

        console.log(`⚡ ${config.name} collected by ${playerId}`);

        return { success: true, effect, config };
    }

    /**
     * Get all power-ups in a realm
     */
    getPowerUpsInRealm(realm: string): any[] {
        return Array.from(this.powerUps.values())
            .filter(p => p.realm === realm && !p.collected)
            .map(p => this.serializePowerUp(p));
    }

    /**
     * Get all active effects for a player
     */
    getPlayerEffects(playerId: string): ActiveEffect[] {
        const now = Date.now();
        const effects = this.activeEffects.get(playerId) || [];
        return effects.filter(e => now < e.endTime);
    }

    /**
     * Check if player has a specific effect active
     */
    hasEffect(playerId: string, type: PowerUpType): boolean {
        const now = Date.now();
        const effects = this.activeEffects.get(playerId) || [];
        return effects.some(e => e.type === type && now < e.endTime);
    }

    /**
     * Get effect multiplier for a player
     */
    getEffectMultiplier(playerId: string, type: PowerUpType): number {
        const now = Date.now();
        const effects = this.activeEffects.get(playerId) || [];
        const effect = effects.find(e => e.type === type && now < e.endTime);
        return effect ? effect.multiplier : 1.0;
    }

    /**
     * Get total XP multiplier from all effects
     */
    getXpMultiplier(playerId: string): number {
        let multiplier = 1.0;
        if (this.hasEffect(playerId, 'xp_multiplier')) {
            multiplier *= this.getEffectMultiplier(playerId, 'xp_multiplier');
        }
        return multiplier;
    }

    /**
     * Get speed multiplier from effects
     */
    getSpeedMultiplier(playerId: string): number {
        if (this.hasEffect(playerId, 'speed_boost')) {
            return this.getEffectMultiplier(playerId, 'speed_boost');
        }
        return 1.0;
    }

    /**
     * Check if player is shielded
     */
    isShielded(playerId: string): boolean {
        return this.hasEffect(playerId, 'shield');
    }

    /**
     * Check if player is invisible
     */
    isInvisible(playerId: string): boolean {
        return this.hasEffect(playerId, 'invisibility');
    }

    /**
     * Get bond amplifier multiplier
     */
    getBondMultiplier(playerId: string): number {
        if (this.hasEffect(playerId, 'bond_amplifier')) {
            return this.getEffectMultiplier(playerId, 'bond_amplifier');
        }
        return 1.0;
    }

    /**
     * Serialize power-up for network transmission
     */
    private serializePowerUp(powerUp: PowerUp): any {
        const config = POWER_UP_CONFIGS[powerUp.type];
        return {
            id: powerUp.id,
            type: powerUp.type,
            name: config.name,
            x: powerUp.x,
            y: powerUp.y,
            realm: powerUp.realm,
            rarity: config.rarity,
            color: config.color,
            icon: config.icon,
            expiresIn: Math.max(0, Math.floor((powerUp.expiresAt - Date.now()) / 1000))
        };
    }

    /**
     * Get power-up configuration
     */
    getConfig(type: PowerUpType): PowerUpConfig | null {
        return POWER_UP_CONFIGS[type] || null;
    }

    /**
     * Get all power-up configs
     */
    getAllConfigs(): Record<PowerUpType, PowerUpConfig> {
        return { ...POWER_UP_CONFIGS };
    }

    /**
     * Clear all power-ups (for testing/admin)
     */
    clearAllPowerUps(): void {
        const ids = Array.from(this.powerUps.keys());
        for (const id of ids) {
            this.despawnPowerUp(id);
        }
    }

    /**
     * Clear all effects for a player (on disconnect)
     */
    clearPlayerEffects(playerId: string): void {
        this.activeEffects.delete(playerId);
    }

    /**
     * Shutdown service
     */
    shutdown(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.powerUps.clear();
        this.activeEffects.clear();
        this.spawnTimers.clear();
        this.ready = false;
        console.log('⚡ PowerUpService shut down');
    }
}

// Export singleton
export const powerUpService = PowerUpService.getInstance();
