// =============================================================================
// Pulse Pattern Service - Server-side pattern validation
// =============================================================================
// Phase 1.5: Validate pulse patterns to prevent cheating
// =============================================================================

import { EventEmitter } from 'events';
import { PlayerData } from '../database/playerDataModel.js';
import { achievementService } from './AchievementService.js';

// ============================================
// PATTERN DEFINITIONS
// ============================================

export interface PulsePattern {
    id: string;
    name: string;
    description: string;
    sequence: ('short' | 'long' | 'pause')[];
    tolerance: number; // Timing tolerance in ms
    reward?: {
        xp?: number;
        stardust?: number;
        achievement?: string;
    };
}

export const PULSE_PATTERNS: Record<string, PulsePattern> = {
    'sos': {
        id: 'sos',
        name: 'SOS',
        description: 'Three short, three long, three short',
        sequence: ['short', 'short', 'short', 'pause', 'long', 'long', 'long', 'pause', 'short', 'short', 'short'],
        tolerance: 300,
        reward: { xp: 50, achievement: 'signal_sos' }
    },
    'heartbeat': {
        id: 'heartbeat',
        name: 'Heartbeat',
        description: 'Two quick pulses',
        sequence: ['short', 'short', 'pause'],
        tolerance: 250,
        reward: { xp: 10 }
    },
    'greeting': {
        id: 'greeting',
        name: 'Greeting',
        description: 'Long, short, long',
        sequence: ['long', 'short', 'long'],
        tolerance: 300,
        reward: { xp: 15 }
    },
    'celebration': {
        id: 'celebration',
        name: 'Celebration',
        description: 'Five rapid pulses',
        sequence: ['short', 'short', 'short', 'short', 'short'],
        tolerance: 200,
        reward: { xp: 25, stardust: 5 }
    },
    'morse_love': {
        id: 'morse_love',
        name: 'Love (Morse)',
        description: 'L-O-V-E in morse code',
        sequence: ['short', 'long', 'short', 'short', 'pause', 'long', 'long', 'long', 'pause', 'short', 'short', 'short', 'long', 'pause', 'short'],
        tolerance: 350,
        reward: { xp: 100, achievement: 'morse_master' }
    },
    'constellation': {
        id: 'constellation',
        name: 'Constellation Call',
        description: 'Three synchronized long pulses',
        sequence: ['long', 'pause', 'long', 'pause', 'long'],
        tolerance: 400,
        reward: { xp: 75, stardust: 25, achievement: 'constellation_caller' }
    }
};

// Timing thresholds (ms)
const TIMING = {
    SHORT_MAX: 200,      // < 200ms = short
    LONG_MIN: 400,       // > 400ms = long
    PAUSE_MIN: 500,      // > 500ms gap = pause
    SEQUENCE_TIMEOUT: 5000  // Max time to complete a pattern
};

// ============================================
// PULSE PATTERN SERVICE
// ============================================

interface PlayerPulseState {
    pulses: { timestamp: number; duration: number }[];
    lastPulseEnd: number;
    patternStartTime: number;
}

class PulsePatternService extends EventEmitter {
    private initialized: boolean = false;
    private playerStates: Map<string, PlayerPulseState> = new Map();
    private cooldowns: Map<string, Map<string, number>> = new Map(); // playerId -> patternId -> lastCompleteTime
    private readonly PATTERN_COOLDOWN = 60000; // 1 minute cooldown per pattern

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('📡 Pulse pattern service initialized');
    }

    // =========================================================================
    // PULSE RECORDING
    // =========================================================================

    /**
     * Record a pulse start
     */
    recordPulseStart(playerId: string): void {
        let state = this.playerStates.get(playerId);
        const now = Date.now();

        if (!state || now - state.lastPulseEnd > TIMING.SEQUENCE_TIMEOUT) {
            // Start new sequence
            state = {
                pulses: [],
                lastPulseEnd: 0,
                patternStartTime: now
            };
        }

        // Check for pause (gap between pulses)
        if (state.lastPulseEnd > 0 && now - state.lastPulseEnd >= TIMING.PAUSE_MIN) {
            // Add pause marker
            state.pulses.push({ timestamp: state.lastPulseEnd, duration: -1 }); // -1 = pause
        }

        // Add pulse start
        state.pulses.push({ timestamp: now, duration: 0 });
        this.playerStates.set(playerId, state);
    }

    /**
     * Record a pulse end and check for pattern completion
     */
    recordPulseEnd(playerId: string): { matched: boolean; pattern?: PulsePattern } {
        const state = this.playerStates.get(playerId);
        if (!state || state.pulses.length === 0) {
            return { matched: false };
        }

        const now = Date.now();
        const lastPulse = state.pulses[state.pulses.length - 1];

        if (lastPulse.duration === 0) {
            lastPulse.duration = now - lastPulse.timestamp;
        }

        state.lastPulseEnd = now;
        this.playerStates.set(playerId, state);

        // Check if any pattern matches
        return this.checkPatternMatch(playerId, state);
    }

    // =========================================================================
    // PATTERN MATCHING
    // =========================================================================

    private checkPatternMatch(playerId: string, state: PlayerPulseState): { matched: boolean; pattern?: PulsePattern } {
        const sequence = this.convertToSequence(state.pulses);

        for (const pattern of Object.values(PULSE_PATTERNS)) {
            if (this.matchesPattern(sequence, pattern)) {
                // Check cooldown
                if (this.isOnCooldown(playerId, pattern.id)) {
                    continue;
                }

                // Pattern matched!
                this.setCooldown(playerId, pattern.id);
                this.clearPlayerState(playerId);
                
                return { matched: true, pattern };
            }
        }

        return { matched: false };
    }

    private convertToSequence(pulses: { timestamp: number; duration: number }[]): ('short' | 'long' | 'pause')[] {
        const sequence: ('short' | 'long' | 'pause')[] = [];

        for (const pulse of pulses) {
            if (pulse.duration === -1) {
                sequence.push('pause');
            } else if (pulse.duration < TIMING.SHORT_MAX) {
                sequence.push('short');
            } else if (pulse.duration >= TIMING.LONG_MIN) {
                sequence.push('long');
            }
            // Durations between SHORT_MAX and LONG_MIN are ambiguous, skip
        }

        return sequence;
    }

    private matchesPattern(sequence: ('short' | 'long' | 'pause')[], pattern: PulsePattern): boolean {
        if (sequence.length < pattern.sequence.length) {
            return false;
        }

        // Check if the end of the sequence matches the pattern
        const startIndex = sequence.length - pattern.sequence.length;
        
        for (let i = 0; i < pattern.sequence.length; i++) {
            if (sequence[startIndex + i] !== pattern.sequence[i]) {
                return false;
            }
        }

        return true;
    }

    // =========================================================================
    // COOLDOWNS
    // =========================================================================

    private isOnCooldown(playerId: string, patternId: string): boolean {
        const playerCooldowns = this.cooldowns.get(playerId);
        if (!playerCooldowns) return false;

        const lastComplete = playerCooldowns.get(patternId);
        if (!lastComplete) return false;

        return Date.now() - lastComplete < this.PATTERN_COOLDOWN;
    }

    private setCooldown(playerId: string, patternId: string): void {
        let playerCooldowns = this.cooldowns.get(playerId);
        if (!playerCooldowns) {
            playerCooldowns = new Map();
            this.cooldowns.set(playerId, playerCooldowns);
        }
        playerCooldowns.set(patternId, Date.now());
    }

    private clearPlayerState(playerId: string): void {
        this.playerStates.delete(playerId);
    }

    // =========================================================================
    // REWARDS
    // =========================================================================

    /**
     * Award pattern completion rewards
     */
    async awardPatternRewards(playerId: string, pattern: PulsePattern): Promise<{
        xp: number;
        stardust: number;
        achievement?: string;
    }> {
        const result = {
            xp: pattern.reward?.xp || 0,
            stardust: pattern.reward?.stardust || 0,
            achievement: pattern.reward?.achievement
        };

        try {
            // Award XP and stardust
            if (result.xp > 0 || result.stardust > 0) {
                await PlayerData.findOneAndUpdate(
                    { playerId },
                    {
                        $inc: {
                            xp: result.xp,
                            stardust: result.stardust
                        }
                    }
                );
            }

            // Award achievement
            if (result.achievement) {
                await achievementService.unlockAchievement(playerId, result.achievement);
            }

            // Track pattern usage
            await PlayerData.findOneAndUpdate(
                { playerId },
                {
                    $addToSet: { 'communication.signalPatterns': pattern.id }
                }
            );

            this.emit('pattern_completed', { playerId, patternId: pattern.id, rewards: result });

        } catch (error) {
            console.error('Error awarding pattern rewards:', error);
        }

        return result;
    }

    // =========================================================================
    // STATS
    // =========================================================================

    /**
     * Get player's completed patterns
     */
    async getPlayerPatternStats(playerId: string): Promise<{
        completedPatterns: string[];
        totalPatterns: number;
        availablePatterns: string[];
    }> {
        try {
            const player = await PlayerData.findOne({ playerId }).lean();
            const completedPatterns = player?.communication?.signalPatterns || [];

            return {
                completedPatterns,
                totalPatterns: Object.keys(PULSE_PATTERNS).length,
                availablePatterns: Object.keys(PULSE_PATTERNS).filter(id => !completedPatterns.includes(id))
            };
        } catch (error) {
            console.error('Error getting pattern stats:', error);
            return {
                completedPatterns: [],
                totalPatterns: Object.keys(PULSE_PATTERNS).length,
                availablePatterns: Object.keys(PULSE_PATTERNS)
            };
        }
    }

    /**
     * Get all available patterns (for client reference)
     */
    getAllPatterns(): PulsePattern[] {
        return Object.values(PULSE_PATTERNS);
    }

    /**
     * Cleanup stale states (call periodically)
     */
    cleanup(): void {
        const now = Date.now();

        // Clear old player states
        for (const [playerId, state] of this.playerStates.entries()) {
            if (now - state.patternStartTime > TIMING.SEQUENCE_TIMEOUT * 2) {
                this.playerStates.delete(playerId);
            }
        }

        // Clear old cooldowns
        for (const [playerId, cooldowns] of this.cooldowns.entries()) {
            for (const [patternId, time] of cooldowns.entries()) {
                if (now - time > this.PATTERN_COOLDOWN * 2) {
                    cooldowns.delete(patternId);
                }
            }
            if (cooldowns.size === 0) {
                this.cooldowns.delete(playerId);
            }
        }
    }
}

export const pulsePatternService = new PulsePatternService();
