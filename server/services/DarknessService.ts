// =============================================================================
// DarknessService - Server-Authoritative Darkness Cycle
// =============================================================================
// Manages the global darkness mechanic that affects all players simultaneously.
// The darkness cycle creates shared tension and encourages player cooperation.
//
// Phases:
// 1. CALM - Normal gameplay, no danger
// 2. WARNING - Darkness approaching, players should prepare
// 3. ACTIVE - Darkness present, danger mode
// 4. COOLDOWN - Darkness receding, safe again
// =============================================================================

import { EventEmitter } from 'events';

export type DarknessPhase = 'calm' | 'warning' | 'active' | 'cooldown';

export interface DarknessState {
    phase: DarknessPhase;
    intensity: number;          // 0-1 for visual effects
    timeRemaining: number;      // Seconds until phase change
    nextPhase: DarknessPhase;
    realm: string;
    waveNumber: number;         // Current wave count
    playersEndangered: Set<string>;
    playersRescued: Set<string>;
}

export interface DarknessConfig {
    calmDuration: number;       // Seconds
    warningDuration: number;
    activeDuration: number;
    cooldownDuration: number;
    baseIntensity: number;      // Starting intensity in active phase
    maxIntensity: number;       // Maximum intensity
    intensityRampTime: number;  // Seconds to reach max intensity
    safeZoneRadius: number;     // Radius around beacons that's safe
}

// Default configuration per realm (different realms have different darkness)
const REALM_CONFIGS: Record<string, DarknessConfig> = {
    genesis: {
        calmDuration: 180,      // 3 minutes calm
        warningDuration: 30,    // 30 second warning
        activeDuration: 60,     // 1 minute darkness
        cooldownDuration: 20,   // 20 second cooldown
        baseIntensity: 0.3,
        maxIntensity: 0.7,
        intensityRampTime: 30,
        safeZoneRadius: 200
    },
    nebula: {
        calmDuration: 150,
        warningDuration: 25,
        activeDuration: 75,
        cooldownDuration: 20,
        baseIntensity: 0.4,
        maxIntensity: 0.8,
        intensityRampTime: 25,
        safeZoneRadius: 175
    },
    void: {
        calmDuration: 120,      // More frequent in void
        warningDuration: 20,
        activeDuration: 90,     // Longer darkness
        cooldownDuration: 15,
        baseIntensity: 0.5,
        maxIntensity: 0.95,
        intensityRampTime: 20,
        safeZoneRadius: 150
    },
    starforge: {
        calmDuration: 200,
        warningDuration: 30,
        activeDuration: 45,     // Shorter but intense
        cooldownDuration: 25,
        baseIntensity: 0.35,
        maxIntensity: 0.85,
        intensityRampTime: 15,
        safeZoneRadius: 180
    },
    sanctuary: {
        calmDuration: 300,      // Very long calm (safe haven)
        warningDuration: 45,
        activeDuration: 30,     // Short darkness
        cooldownDuration: 30,
        baseIntensity: 0.2,
        maxIntensity: 0.5,
        intensityRampTime: 30,
        safeZoneRadius: 250
    }
};

export class DarknessService extends EventEmitter {
    private static instance: DarknessService;
    private realmStates: Map<string, DarknessState> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private ready = false;

    // Update rate (10 times per second for smooth transitions)
    private readonly UPDATE_RATE = 100;

    // Lit beacons that create safe zones (populated by WebSocket handler)
    private litBeacons: Map<string, { x: number; y: number; realm: string }> = new Map();

    // Singleton
    static getInstance(): DarknessService {
        if (!DarknessService.instance) {
            DarknessService.instance = new DarknessService();
        }
        return DarknessService.instance;
    }

    async initialize(): Promise<void> {
        if (this.ready) return;

        // Initialize state for all realms
        const realms = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];
        for (const realm of realms) {
            this.initializeRealmState(realm);
        }

        // Start update loop
        this.updateInterval = setInterval(() => {
            this.update();
        }, this.UPDATE_RATE);

        this.ready = true;
        console.log('🌑 DarknessService initialized');
    }

    isReady(): boolean {
        return this.ready;
    }

    /**
     * Initialize darkness state for a realm
     */
    private initializeRealmState(realm: string): void {
        const config = REALM_CONFIGS[realm] || REALM_CONFIGS.genesis;

        // Start at random point in calm phase for variety
        const randomCalm = Math.floor(Math.random() * config.calmDuration);

        const state: DarknessState = {
            phase: 'calm',
            intensity: 0,
            timeRemaining: config.calmDuration - randomCalm,
            nextPhase: 'warning',
            realm,
            waveNumber: 0,
            playersEndangered: new Set(),
            playersRescued: new Set()
        };

        this.realmStates.set(realm, state);
    }

    /**
     * Main update loop - runs every 100ms
     */
    private update(): void {
        for (const [realm, state] of this.realmStates) {
            const config = REALM_CONFIGS[realm] || REALM_CONFIGS.genesis;
            const deltaSeconds = this.UPDATE_RATE / 1000;

            // Update time remaining
            state.timeRemaining -= deltaSeconds;

            // Update intensity based on phase
            if (state.phase === 'active') {
                const elapsed = config.activeDuration - state.timeRemaining;
                const rampProgress = Math.min(1, elapsed / config.intensityRampTime);
                state.intensity = config.baseIntensity + 
                    (config.maxIntensity - config.baseIntensity) * rampProgress;
            } else if (state.phase === 'warning') {
                // Gradual intensity build during warning
                const warningProgress = 1 - (state.timeRemaining / config.warningDuration);
                state.intensity = config.baseIntensity * 0.3 * warningProgress;
            } else if (state.phase === 'cooldown') {
                // Gradual intensity decrease during cooldown
                const cooldownProgress = state.timeRemaining / config.cooldownDuration;
                state.intensity = config.baseIntensity * cooldownProgress;
            } else {
                state.intensity = 0;
            }

            // Check for phase transition
            if (state.timeRemaining <= 0) {
                this.transitionPhase(realm, state, config);
            }
        }
    }

    /**
     * Transition to next darkness phase
     */
    private transitionPhase(realm: string, state: DarknessState, config: DarknessConfig): void {
        const previousPhase = state.phase;

        switch (state.phase) {
            case 'calm':
                state.phase = 'warning';
                state.timeRemaining = config.warningDuration;
                state.nextPhase = 'active';
                this.emit('darkness_warning', { 
                    realm, 
                    waveNumber: state.waveNumber + 1,
                    warningDuration: config.warningDuration
                });
                console.log(`⚠️ Darkness warning in ${realm}!`);
                break;

            case 'warning':
                state.phase = 'active';
                state.timeRemaining = config.activeDuration;
                state.nextPhase = 'cooldown';
                state.waveNumber++;
                state.playersEndangered.clear();
                state.playersRescued.clear();
                this.emit('darkness_active', { 
                    realm, 
                    waveNumber: state.waveNumber,
                    duration: config.activeDuration
                });
                console.log(`🌑 Darkness ACTIVE in ${realm}! Wave ${state.waveNumber}`);
                break;

            case 'active':
                state.phase = 'cooldown';
                state.timeRemaining = config.cooldownDuration;
                state.nextPhase = 'calm';
                this.emit('darkness_ended', {
                    realm,
                    waveNumber: state.waveNumber,
                    playersEndangered: state.playersEndangered.size,
                    playersRescued: state.playersRescued.size,
                    cooldown: config.cooldownDuration
                });
                console.log(`✨ Darkness receding in ${realm}`);
                break;

            case 'cooldown':
                state.phase = 'calm';
                state.timeRemaining = config.calmDuration;
                state.nextPhase = 'warning';
                this.emit('darkness_cleared', { realm });
                break;
        }

        // Emit phase change event
        this.emit('phase_change', {
            realm,
            previousPhase,
            newPhase: state.phase,
            intensity: state.intensity,
            timeRemaining: state.timeRemaining,
            waveNumber: state.waveNumber
        });
    }

    /**
     * Get current darkness state for a realm
     */
    getState(realm: string): DarknessState | null {
        return this.realmStates.get(realm) || null;
    }

    /**
     * Get serialized state for network transmission
     */
    getSerializedState(realm: string): any {
        const state = this.realmStates.get(realm);
        if (!state) return null;

        return {
            phase: state.phase,
            intensity: state.intensity,
            timeRemaining: Math.ceil(state.timeRemaining),
            nextPhase: state.nextPhase,
            realm: state.realm,
            waveNumber: state.waveNumber
        };
    }

    /**
     * Get all realm states
     */
    getAllStates(): any[] {
        return Array.from(this.realmStates.values()).map(state => ({
            phase: state.phase,
            intensity: state.intensity,
            timeRemaining: Math.ceil(state.timeRemaining),
            nextPhase: state.nextPhase,
            realm: state.realm,
            waveNumber: state.waveNumber
        }));
    }

    /**
     * Check if a position is in a safe zone
     */
    isInSafeZone(realm: string, x: number, y: number): boolean {
        const config = REALM_CONFIGS[realm] || REALM_CONFIGS.genesis;

        // Check distance to all lit beacons in this realm
        for (const [, beacon] of this.litBeacons) {
            if (beacon.realm !== realm) continue;
            const dist = Math.hypot(beacon.x - x, beacon.y - y);
            if (dist <= config.safeZoneRadius) {
                return true;
            }
        }

        return false;
    }

    /**
     * Register a lit beacon for safe zone calculations
     */
    registerBeacon(beaconId: string, x: number, y: number, realm: string): void {
        this.litBeacons.set(beaconId, { x, y, realm });
    }

    /**
     * Unregister a beacon
     */
    unregisterBeacon(beaconId: string): void {
        this.litBeacons.delete(beaconId);
    }

    /**
     * Clear all beacons for a realm
     */
    clearRealmBeacons(realm: string): void {
        for (const [id, beacon] of this.litBeacons) {
            if (beacon.realm === realm) {
                this.litBeacons.delete(id);
            }
        }
    }

    /**
     * Mark a player as endangered (in darkness without safe zone)
     */
    markPlayerEndangered(realm: string, playerId: string): void {
        const state = this.realmStates.get(realm);
        if (state && state.phase === 'active') {
            state.playersEndangered.add(playerId);
        }
    }

    /**
     * Mark a player as rescued (saved by another player during darkness)
     */
    markPlayerRescued(realm: string, playerId: string, rescuerId: string): void {
        const state = this.realmStates.get(realm);
        if (state && state.phase === 'active') {
            state.playersRescued.add(playerId);
            this.emit('player_rescued', {
                realm,
                playerId,
                rescuerId,
                waveNumber: state.waveNumber
            });
        }
    }

    /**
     * Get darkness danger level (for UI display)
     */
    getDangerLevel(realm: string): 'none' | 'low' | 'medium' | 'high' | 'extreme' {
        const state = this.realmStates.get(realm);
        if (!state) return 'none';

        if (state.phase === 'calm') return 'none';
        if (state.phase === 'warning') return 'low';
        if (state.phase === 'cooldown') return 'low';

        // Active phase - base on intensity
        if (state.intensity < 0.4) return 'medium';
        if (state.intensity < 0.7) return 'high';
        return 'extreme';
    }

    /**
     * Force trigger darkness (for testing/events)
     */
    forceDarkness(realm: string, duration?: number): void {
        const state = this.realmStates.get(realm);
        const config = REALM_CONFIGS[realm] || REALM_CONFIGS.genesis;
        
        if (state) {
            state.phase = 'active';
            state.timeRemaining = duration || config.activeDuration;
            state.nextPhase = 'cooldown';
            state.waveNumber++;
            state.playersEndangered.clear();
            state.playersRescued.clear();

            this.emit('darkness_active', {
                realm,
                waveNumber: state.waveNumber,
                duration: state.timeRemaining,
                forced: true
            });

            console.log(`🌑 Darkness FORCED in ${realm}!`);
        }
    }

    /**
     * Clear darkness (for testing/events)
     */
    clearDarkness(realm: string): void {
        const state = this.realmStates.get(realm);
        const config = REALM_CONFIGS[realm] || REALM_CONFIGS.genesis;
        
        if (state && (state.phase === 'active' || state.phase === 'warning')) {
            state.phase = 'calm';
            state.timeRemaining = config.calmDuration;
            state.nextPhase = 'warning';
            state.intensity = 0;

            this.emit('darkness_cleared', { realm, forced: true });

            console.log(`✨ Darkness CLEARED in ${realm}!`);
        }
    }

    /**
     * Shutdown service
     */
    shutdown(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.realmStates.clear();
        this.litBeacons.clear();
        this.ready = false;
        console.log('🌑 DarknessService shut down');
    }
}

// Export singleton
export const darknessService = DarknessService.getInstance();
