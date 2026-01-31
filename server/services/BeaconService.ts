// =============================================================================
// Beacon Service - Server-side beacon management
// =============================================================================
// Handles beacon lighting, charging, protection, and persistence

import { EventEmitter } from 'events';
import { Beacon as BeaconModel, IBeacon } from '../database/models.js';

export interface Beacon {
    id: string;
    realm: string;
    x: number;
    y: number;
    litAt: number;
    litBy: string;
    charge: number; // 0-100
    contributors: Map<string, number>; // playerId -> contribution amount
    isProtected: boolean;
    protectedBy: string[];
    permanentlyLit: boolean;
}

export interface BeaconConfig {
    maxCharge: number;
    chargeDecayRate: number; // per second
    protectionRadius: number;
    lightingThreshold: number; // charge needed to light
    permanentThreshold: number; // charge needed for permanent
    xpRewardLight: number;
    xpRewardCharge: number;
    xpRewardProtect: number;
}

const DEFAULT_CONFIG: BeaconConfig = {
    maxCharge: 100,
    chargeDecayRate: 0.1,
    protectionRadius: 200,
    lightingThreshold: 50,
    permanentThreshold: 100,
    xpRewardLight: 100,
    xpRewardCharge: 5,
    xpRewardProtect: 40,
};

class BeaconService extends EventEmitter {
    private beacons: Map<string, Beacon> = new Map();
    private config: BeaconConfig = DEFAULT_CONFIG;
    private updateInterval: NodeJS.Timeout | null = null;

    async initialize(): Promise<void> {
        console.log('💡 Beacon Service initializing...');
        await this.loadBeacons();
        this.startUpdateLoop();
        console.log('💡 Beacon Service initialized');
    }

    private async loadBeacons(): Promise<void> {
        try {
            const savedBeacons = await BeaconModel.find({}).lean();
            if (savedBeacons && savedBeacons.length > 0) {
                for (const beacon of savedBeacons) {
                    // Convert array contributors to Map
                    const contributorsMap = new Map<string, number>();
                    if (beacon.contributors && Array.isArray(beacon.contributors)) {
                        for (const contrib of beacon.contributors) {
                            contributorsMap.set(contrib.playerId, contrib.amount);
                        }
                    }
                    
                    this.beacons.set(beacon.beaconId, {
                        id: beacon.beaconId,
                        realm: beacon.realm,
                        x: beacon.x,
                        y: beacon.y,
                        litAt: beacon.lastChargedAt?.getTime() || 0,
                        litBy: beacon.lastChargedBy || '',
                        charge: beacon.charge,
                        contributors: contributorsMap,
                        isProtected: false,
                        protectedBy: [],
                        permanentlyLit: beacon.permanentlyLit
                    });
                }
                console.log(`💡 Loaded ${this.beacons.size} beacons from database`);
            }
        } catch (error) {
            console.error('Failed to load beacons:', error);
        }
    }

    private startUpdateLoop(): void {
        // Update beacons every second (decay, protection checks)
        this.updateInterval = setInterval(() => {
            this.updateBeacons();
        }, 1000);
    }

    private updateBeacons(): void {
        const now = Date.now();

        for (const beacon of this.beacons.values()) {
            if (beacon.permanentlyLit) continue;

            // Decay charge over time
            if (beacon.charge > 0) {
                beacon.charge = Math.max(0, beacon.charge - this.config.chargeDecayRate);

                // Beacon goes dark if charge depletes
                if (beacon.charge === 0) {
                    this.emit('beacon_darkened', { beaconId: beacon.id, realm: beacon.realm });
                }
            }
        }
    }

    // =========================================================================
    // Core Beacon Operations
    // =========================================================================

    getBeacon(beaconId: string): Beacon | null {
        return this.beacons.get(beaconId) || null;
    }

    getBeaconsInRealm(realm: string): Beacon[] {
        return Array.from(this.beacons.values()).filter(b => b.realm === realm);
    }

    getBeaconsNearPosition(position: { x: number; y: number }, realm: string, maxDistance: number = 500): Beacon[] {
        return this.getBeaconsInRealm(realm).filter(b => {
            const distance = Math.hypot(b.x - position.x, b.y - position.y);
            return distance <= maxDistance;
        });
    }

    getLitBeacons(realm?: string): Beacon[] {
        const beacons = realm ? this.getBeaconsInRealm(realm) : Array.from(this.beacons.values());
        return beacons.filter(b => b.charge >= this.config.lightingThreshold);
    }

    getLitBeaconsInRealm(realm: string): Beacon[] {
        return this.getBeaconsInRealm(realm).filter(b => b.charge >= this.config.lightingThreshold);
    }

    getBeaconsLitByPlayer(playerId: string): Beacon[] {
        return Array.from(this.beacons.values()).filter(b => b.litBy === playerId);
    }

    /**
     * Light a beacon at position (create if doesn't exist, then charge)
     */
    async lightBeacon(playerId: string, beaconId: string, position?: { x: number; y: number }): Promise<{
        success: boolean;
        error?: string;
        beacon?: Beacon;
        xpAwarded?: number;
    }> {
        let beacon = this.beacons.get(beaconId);
        
        if (!beacon && position) {
            // Extract realm from beaconId or use default
            const parts = beaconId.split(':');
            const realm = parts[0] || 'genesis';
            beacon = this.getOrCreateBeacon(realm, position.x, position.y);
        }
        
        if (!beacon) {
            return { success: false, error: 'Beacon not found' };
        }

        const result = this.chargeBeacon(beaconId, playerId, 50); // Light gives substantial charge
        return {
            success: result.success,
            beacon: result.beacon || undefined,
            xpAwarded: result.xpAwarded
        };
    }

    /**
     * Get beacon protection status at a position
     */
    async getBeaconProtection(playerId: string, beaconId: string, position: { x: number; y: number }): Promise<{
        success: boolean;
        protected: boolean;
        xpAwarded?: number;
    }> {
        const beacon = this.beacons.get(beaconId);
        if (!beacon) {
            return { success: false, protected: false };
        }

        const distance = Math.hypot(beacon.x - position.x, beacon.y - position.y);
        const isInRange = distance <= this.config.protectionRadius;
        const isBeaconLit = beacon.charge >= this.config.lightingThreshold;

        if (isInRange && isBeaconLit) {
            const protectResult = this.protectBeacon(beaconId, playerId);
            return { 
                success: true, 
                protected: true,
                xpAwarded: protectResult.xpAwarded
            };
        }

        return { success: true, protected: false };
    }

    /**
     * Get player's beacon statistics
     */
    async getPlayerBeaconStats(playerId: string): Promise<{
        beaconsLit: number;
        totalContributions: number;
        beaconsProtected: number;
    }> {
        let beaconsLit = 0;
        let totalContributions = 0;
        let beaconsProtected = 0;

        for (const beacon of this.beacons.values()) {
            if (beacon.litBy === playerId) beaconsLit++;
            totalContributions += beacon.contributors.get(playerId) || 0;
            if (beacon.protectedBy.includes(playerId)) beaconsProtected++;
        }

        return { beaconsLit, totalContributions, beaconsProtected };
    }

    /**
     * Get global beacon statistics
     */
    getGlobalStats(): {
        totalBeacons: number;
        litBeacons: number;
        permanentBeacons: number;
        byRealm: Record<string, { total: number; lit: number }>;
    } {
        return this.getStats();
    }

    /**
     * Create or get a beacon at position
     */
    getOrCreateBeacon(realm: string, x: number, y: number): Beacon {
        const beaconId = `${realm}:${Math.round(x / 100)}:${Math.round(y / 100)}`;
        
        let beacon = this.beacons.get(beaconId);
        if (!beacon) {
            beacon = {
                id: beaconId,
                realm,
                x: Math.round(x / 100) * 100,
                y: Math.round(y / 100) * 100,
                litAt: 0,
                litBy: '',
                charge: 0,
                contributors: new Map(),
                isProtected: false,
                protectedBy: [],
                permanentlyLit: false
            };
            this.beacons.set(beaconId, beacon);
        }
        
        return beacon;
    }

    /**
     * Contribute charge to a beacon
     */
    chargeBeacon(beaconId: string, playerId: string, amount: number = 5): {
        success: boolean;
        beacon: Beacon | null;
        wasLit: boolean;
        becamePermanent: boolean;
        xpAwarded: number;
    } {
        const beacon = this.beacons.get(beaconId);
        if (!beacon) {
            return { success: false, beacon: null, wasLit: false, becamePermanent: false, xpAwarded: 0 };
        }

        const wasLitBefore = beacon.charge >= this.config.lightingThreshold;
        const wasPermanentBefore = beacon.permanentlyLit;

        // Add charge
        beacon.charge = Math.min(this.config.maxCharge, beacon.charge + amount);

        // Track contribution
        const currentContribution = beacon.contributors.get(playerId) || 0;
        beacon.contributors.set(playerId, currentContribution + amount);

        // Check if beacon was just lit
        const isLitNow = beacon.charge >= this.config.lightingThreshold;
        const wasJustLit = !wasLitBefore && isLitNow;

        if (wasJustLit) {
            beacon.litAt = Date.now();
            beacon.litBy = playerId;
            this.emit('beacon_lit', { beacon, litBy: playerId });
        }

        // Check if became permanent
        const becamePermanent = !wasPermanentBefore && beacon.charge >= this.config.permanentThreshold;
        if (becamePermanent) {
            beacon.permanentlyLit = true;
            this.emit('beacon_permanent', { beacon });
        }

        // Calculate XP
        let xpAwarded = this.config.xpRewardCharge;
        if (wasJustLit) xpAwarded += this.config.xpRewardLight;

        // Persist
        this.persistBeacon(beacon);

        return {
            success: true,
            beacon,
            wasLit: wasJustLit,
            becamePermanent,
            xpAwarded
        };
    }

    /**
     * Protect a beacon during darkness
     */
    protectBeacon(beaconId: string, playerId: string): {
        success: boolean;
        xpAwarded: number;
    } {
        const beacon = this.beacons.get(beaconId);
        if (!beacon || beacon.charge < this.config.lightingThreshold) {
            return { success: false, xpAwarded: 0 };
        }

        if (!beacon.protectedBy.includes(playerId)) {
            beacon.protectedBy.push(playerId);
            beacon.isProtected = true;
            
            this.emit('beacon_protected', { beacon, protector: playerId });
            
            return { success: true, xpAwarded: this.config.xpRewardProtect };
        }

        return { success: true, xpAwarded: 0 };
    }

    /**
     * Check if a position is within protection radius of a lit beacon
     */
    isPositionProtected(realm: string, x: number, y: number): { protected: boolean; beaconId?: string } {
        for (const beacon of this.beacons.values()) {
            if (beacon.realm !== realm) continue;
            if (beacon.charge < this.config.lightingThreshold) continue;

            const distance = Math.hypot(beacon.x - x, beacon.y - y);
            if (distance <= this.config.protectionRadius) {
                return { protected: true, beaconId: beacon.id };
            }
        }
        return { protected: false };
    }

    /**
     * Get top contributors to a beacon
     */
    getBeaconContributors(beaconId: string, limit: number = 10): Array<{ playerId: string; contribution: number }> {
        const beacon = this.beacons.get(beaconId);
        if (!beacon) return [];

        return Array.from(beacon.contributors.entries())
            .map(([playerId, contribution]) => ({ playerId, contribution }))
            .sort((a, b) => b.contribution - a.contribution)
            .slice(0, limit);
    }

    // =========================================================================
    // Persistence
    // =========================================================================

    private async persistBeacon(beacon: Beacon): Promise<void> {
        try {
            // Convert Map to array format for MongoDB
            const contributorsArray = Array.from(beacon.contributors.entries()).map(
                ([playerId, amount]) => ({ playerId, amount })
            );
            
            await BeaconModel.findOneAndUpdate(
                { beaconId: beacon.id },
                {
                    $set: {
                        beaconId: beacon.id,
                        realm: beacon.realm,
                        x: beacon.x,
                        y: beacon.y,
                        charge: beacon.charge,
                        active: beacon.charge >= this.config.lightingThreshold,
                        permanentlyLit: beacon.permanentlyLit,
                        lastChargedBy: beacon.litBy || null,
                        lastChargedAt: beacon.litAt ? new Date(beacon.litAt) : null,
                        totalContributors: beacon.contributors.size,
                        contributors: contributorsArray.slice(0, 50) // Keep top 50 contributors
                    },
                    $inc: { litCount: beacon.charge >= this.config.lightingThreshold ? 0 : 0 }
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error('Failed to persist beacon:', error);
        }
    }

    // =========================================================================
    // Stats
    // =========================================================================

    getStats(): {
        totalBeacons: number;
        litBeacons: number;
        permanentBeacons: number;
        byRealm: Record<string, { total: number; lit: number }>;
    } {
        const stats = {
            totalBeacons: this.beacons.size,
            litBeacons: 0,
            permanentBeacons: 0,
            byRealm: {} as Record<string, { total: number; lit: number }>
        };

        for (const beacon of this.beacons.values()) {
            if (!stats.byRealm[beacon.realm]) {
                stats.byRealm[beacon.realm] = { total: 0, lit: 0 };
            }
            stats.byRealm[beacon.realm].total++;

            if (beacon.charge >= this.config.lightingThreshold) {
                stats.litBeacons++;
                stats.byRealm[beacon.realm].lit++;
            }

            if (beacon.permanentlyLit) {
                stats.permanentBeacons++;
            }
        }

        return stats;
    }

    shutdown(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

export const beaconService = new BeaconService();
export { BeaconService };
