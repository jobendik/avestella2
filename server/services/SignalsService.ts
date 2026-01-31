// =============================================================================
// Signals Service - Player-to-player signaling system
// =============================================================================
// Handles light signals, distress calls, invitations, and beacons

import { EventEmitter } from 'events';

export type SignalType = 
    | 'wave'           // Friendly wave
    | 'invitation'     // Come join me
    | 'distress'       // Need help
    | 'celebration'    // Celebrating
    | 'discovery'      // Found something
    | 'rally'          // Gathering point
    | 'warning'        // Danger ahead
    | 'thanks'         // Gratitude
    | 'farewell'       // Goodbye
    | 'heart';         // Sending love

export interface Signal {
    id: string;
    senderId: string;
    senderName: string;
    type: SignalType;
    position: { x: number; y: number };
    realm: string;
    targetId?: string;     // If directed at specific player
    message?: string;      // Optional short message
    intensity: number;     // 1-3, affects visibility range
    color: number;         // Hue value
    createdAt: number;
    expiresAt: number;
    seenBy: Set<string>;
}

export interface SignalConfig {
    type: SignalType;
    name: string;
    icon: string;
    baseRange: number;
    duration: number; // milliseconds
    cooldown: number; // milliseconds
    unlockLevel?: number;
}

// Signal type configurations
const SIGNAL_CONFIGS: Record<SignalType, SignalConfig> = {
    wave: { type: 'wave', name: 'Wave', icon: '👋', baseRange: 300, duration: 5000, cooldown: 1000 },
    invitation: { type: 'invitation', name: 'Invitation', icon: '🎉', baseRange: 500, duration: 30000, cooldown: 10000 },
    distress: { type: 'distress', name: 'Distress', icon: '🆘', baseRange: 800, duration: 60000, cooldown: 30000 },
    celebration: { type: 'celebration', name: 'Celebration', icon: '🎊', baseRange: 400, duration: 10000, cooldown: 5000 },
    discovery: { type: 'discovery', name: 'Discovery', icon: '✨', baseRange: 600, duration: 45000, cooldown: 15000 },
    rally: { type: 'rally', name: 'Rally', icon: '🚩', baseRange: 700, duration: 120000, cooldown: 60000, unlockLevel: 10 },
    warning: { type: 'warning', name: 'Warning', icon: '⚠️', baseRange: 500, duration: 30000, cooldown: 20000, unlockLevel: 5 },
    thanks: { type: 'thanks', name: 'Thanks', icon: '🙏', baseRange: 300, duration: 5000, cooldown: 2000 },
    farewell: { type: 'farewell', name: 'Farewell', icon: '🌟', baseRange: 400, duration: 8000, cooldown: 5000 },
    heart: { type: 'heart', name: 'Heart', icon: '💖', baseRange: 350, duration: 8000, cooldown: 3000 },
};

class SignalsService extends EventEmitter {
    private signals: Map<string, Signal> = new Map();
    private playerCooldowns: Map<string, Map<SignalType, number>> = new Map();
    private signalIdCounter = 0;
    private cleanupInterval: NodeJS.Timeout | null = null;

    async initialize(): Promise<void> {
        console.log('📡 Signals Service initializing...');
        
        // Cleanup expired signals every second
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSignals();
        }, 1000);
        
        console.log('📡 Signals Service initialized');
    }

    // =========================================================================
    // Signal Creation
    // =========================================================================

    sendSignal(
        senderId: string,
        senderName: string,
        type: SignalType,
        position: { x: number; y: number },
        realm: string,
        options: {
            targetId?: string;
            message?: string;
            intensity?: number;
            color?: number;
            playerLevel?: number;
        } = {}
    ): { success: boolean; error?: string; signal?: Signal } {
        const config = SIGNAL_CONFIGS[type];
        if (!config) {
            return { success: false, error: 'Invalid signal type' };
        }

        // Check level requirement
        if (config.unlockLevel && (!options.playerLevel || options.playerLevel < config.unlockLevel)) {
            return { success: false, error: `Signal requires level ${config.unlockLevel}` };
        }

        // Check cooldown
        if (this.isOnCooldown(senderId, type)) {
            const remaining = this.getCooldownRemaining(senderId, type);
            return { success: false, error: `On cooldown for ${Math.ceil(remaining / 1000)}s` };
        }

        const signalId = `sig_${++this.signalIdCounter}_${Date.now()}`;
        const now = Date.now();
        
        const signal: Signal = {
            id: signalId,
            senderId,
            senderName,
            type,
            position,
            realm,
            targetId: options.targetId,
            message: options.message?.slice(0, 100), // Limit message length
            intensity: Math.max(1, Math.min(3, options.intensity || 1)),
            color: options.color || 180,
            createdAt: now,
            expiresAt: now + config.duration,
            seenBy: new Set([senderId]) // Sender has already "seen" it
        };

        this.signals.set(signalId, signal);
        this.setCooldown(senderId, type);

        this.emit('signal_sent', { signal });

        return { success: true, signal };
    }

    // =========================================================================
    // Signal Retrieval
    // =========================================================================

    getActiveSignals(realm: string): Signal[] {
        const now = Date.now();
        return Array.from(this.signals.values()).filter(s => 
            s.realm === realm && s.expiresAt > now
        );
    }

    getSignalsInRange(
        position: { x: number; y: number },
        realm: string,
        maxRange?: number
    ): Array<{ signal: Signal; distance: number; volume: number }> {
        const activeSignals = this.getActiveSignals(realm);
        const results: Array<{ signal: Signal; distance: number; volume: number }> = [];

        for (const signal of activeSignals) {
            const dx = position.x - signal.position.x;
            const dy = position.y - signal.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const config = SIGNAL_CONFIGS[signal.type];
            const effectiveRange = config.baseRange * signal.intensity;
            
            if (maxRange && distance > maxRange) continue;
            if (distance > effectiveRange) continue;

            // Calculate "volume" based on distance (1.0 = close, 0.0 = at edge of range)
            const volume = 1 - (distance / effectiveRange);

            results.push({ signal, distance, volume: Math.max(0, Math.min(1, volume)) });
        }

        // Sort by distance (closest first)
        return results.sort((a, b) => a.distance - b.distance);
    }

    getSignalsForPlayer(
        playerId: string,
        position: { x: number; y: number },
        realm: string
    ): Array<{ signal: Signal; distance: number; isNew: boolean }> {
        const signalsInRange = this.getSignalsInRange(position, realm);
        
        return signalsInRange.map(({ signal, distance }) => {
            const isNew = !signal.seenBy.has(playerId);
            if (isNew) {
                signal.seenBy.add(playerId);
            }
            return { signal, distance, isNew };
        });
    }

    getDirectedSignals(targetId: string): Signal[] {
        const now = Date.now();
        return Array.from(this.signals.values()).filter(s => 
            s.targetId === targetId && s.expiresAt > now
        );
    }

    // =========================================================================
    // Signal Interaction
    // =========================================================================

    acknowledgeSignal(playerId: string, signalId: string): boolean {
        const signal = this.signals.get(signalId);
        if (!signal) return false;

        signal.seenBy.add(playerId);
        this.emit('signal_acknowledged', { playerId, signalId });
        return true;
    }

    respondToSignal(
        responderId: string,
        responderName: string,
        signalId: string,
        responseType: SignalType,
        position: { x: number; y: number },
        realm: string
    ): { success: boolean; error?: string; signal?: Signal } {
        const originalSignal = this.signals.get(signalId);
        if (!originalSignal) {
            return { success: false, error: 'Original signal not found' };
        }

        // Send response signal directed at original sender
        return this.sendSignal(
            responderId,
            responderName,
            responseType,
            position,
            realm,
            { targetId: originalSignal.senderId }
        );
    }

    // =========================================================================
    // Cooldown Management
    // =========================================================================

    private isOnCooldown(playerId: string, type: SignalType): boolean {
        const playerCooldowns = this.playerCooldowns.get(playerId);
        if (!playerCooldowns) return false;

        const cooldownEnd = playerCooldowns.get(type);
        if (!cooldownEnd) return false;

        return Date.now() < cooldownEnd;
    }

    private getCooldownRemaining(playerId: string, type: SignalType): number {
        const playerCooldowns = this.playerCooldowns.get(playerId);
        if (!playerCooldowns) return 0;

        const cooldownEnd = playerCooldowns.get(type);
        if (!cooldownEnd) return 0;

        return Math.max(0, cooldownEnd - Date.now());
    }

    private setCooldown(playerId: string, type: SignalType): void {
        let playerCooldowns = this.playerCooldowns.get(playerId);
        if (!playerCooldowns) {
            playerCooldowns = new Map();
            this.playerCooldowns.set(playerId, playerCooldowns);
        }

        const config = SIGNAL_CONFIGS[type];
        playerCooldowns.set(type, Date.now() + config.cooldown);
    }

    getCooldowns(playerId: string): Record<SignalType, number> {
        const result: Partial<Record<SignalType, number>> = {};
        
        for (const type of Object.keys(SIGNAL_CONFIGS) as SignalType[]) {
            result[type] = this.getCooldownRemaining(playerId, type);
        }
        
        return result as Record<SignalType, number>;
    }

    // =========================================================================
    // Configuration
    // =========================================================================

    getSignalConfig(type: SignalType): SignalConfig | null {
        return SIGNAL_CONFIGS[type] || null;
    }

    getAllSignalConfigs(): SignalConfig[] {
        return Object.values(SIGNAL_CONFIGS);
    }

    getAvailableSignals(playerLevel: number): SignalConfig[] {
        return Object.values(SIGNAL_CONFIGS).filter(config => 
            !config.unlockLevel || playerLevel >= config.unlockLevel
        );
    }

    // =========================================================================
    // Cleanup
    // =========================================================================

    private cleanupExpiredSignals(): void {
        const now = Date.now();
        const expired: string[] = [];

        for (const [id, signal] of this.signals) {
            if (signal.expiresAt <= now) {
                expired.push(id);
            }
        }

        for (const id of expired) {
            this.signals.delete(id);
            this.emit('signal_expired', { signalId: id });
        }

        // Cleanup old cooldown entries
        for (const [playerId, cooldowns] of this.playerCooldowns) {
            for (const [type, endTime] of cooldowns) {
                if (endTime < now) {
                    cooldowns.delete(type);
                }
            }
            if (cooldowns.size === 0) {
                this.playerCooldowns.delete(playerId);
            }
        }
    }

    // =========================================================================
    // Statistics
    // =========================================================================

    getStats(): {
        activeSignals: number;
        signalsByType: Record<SignalType, number>;
        signalsByRealm: Record<string, number>;
    } {
        const signalsByType: Partial<Record<SignalType, number>> = {};
        const signalsByRealm: Record<string, number> = {};
        const now = Date.now();

        for (const signal of this.signals.values()) {
            if (signal.expiresAt <= now) continue;
            
            signalsByType[signal.type] = (signalsByType[signal.type] || 0) + 1;
            signalsByRealm[signal.realm] = (signalsByRealm[signal.realm] || 0) + 1;
        }

        return {
            activeSignals: this.signals.size,
            signalsByType: signalsByType as Record<SignalType, number>,
            signalsByRealm
        };
    }

    shutdown(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.signals.clear();
        this.playerCooldowns.clear();
    }
}

export const signalsService = new SignalsService();
export { SignalsService };
