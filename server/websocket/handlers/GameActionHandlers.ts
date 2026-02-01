// =============================================================================
// Game Action Handlers - Core gameplay actions (sing, pulse, emote, echo, stars)
// =============================================================================

import type { PlayerConnection, HandlerContext, Echo } from '../types.js';
import { progressionService } from '../../services/ProgressionService.js';
import { resonanceService } from '../../services/ResonanceService.js';

export class GameActionHandlers {
    /**
     * Handle singing (voice ripple)
     */
    static async handleSing(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { pitch, duration, intensity } = data;

            // Validate
            if (typeof pitch !== 'number' || typeof duration !== 'number') return;

            const now = Date.now();

            // Create ripple effect
            const ripple = {
                type: 'voice_ripple',
                data: {
                    playerId: connection.playerId,
                    x: connection.x,
                    y: connection.y,
                    pitch: Math.max(0, Math.min(1, pitch)),
                    duration: Math.max(100, Math.min(5000, duration)),
                    intensity: Math.max(0, Math.min(1, intensity || 0.5)),
                    timestamp: now
                },
                timestamp: now
            };

            // Broadcast to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    ctx.send(conn.ws, ripple);
                }
            }

            // Award XP for singing
            await progressionService.addXP(connection.playerId, 1, 'sing');
        } catch (error) {
            console.error('Failed to handle sing:', error);
        }
    }

    /**
     * Handle pulse (heartbeat visualization)
     */
    static handlePulse(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { intensity, color } = data;

            const now = Date.now();

            const pulse = {
                type: 'pulse',
                data: {
                    playerId: connection.playerId,
                    x: connection.x,
                    y: connection.y,
                    intensity: Math.max(0, Math.min(1, intensity || 0.5)),
                    color: color || connection.color,
                    timestamp: now
                },
                timestamp: now
            };

            // Update social state
            connection.isPulsing = true;
            connection.pulseExpiresAt = now + 1000;

            // Broadcast to nearby players
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    const dx = conn.x - connection.x;
                    const dy = conn.y - connection.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Only send to players within pulse range
                    if (distance < 300) {
                        ctx.send(conn.ws, pulse);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to handle pulse:', error);
        }
    }

    /**
     * Handle emote
     */
    static async handleEmote(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { emoteId } = data;

            if (!emoteId || typeof emoteId !== 'string') return;

            const now = Date.now();

            const emote = {
                type: 'emote',
                data: {
                    playerId: connection.playerId,
                    emoteId,
                    x: connection.x,
                    y: connection.y,
                    timestamp: now
                },
                timestamp: now
            };

            // Broadcast to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    ctx.send(conn.ws, emote);
                }
            }

            // Track emote for achievements
            await progressionService.addXP(connection.playerId, 1, 'emote');
        } catch (error) {
            console.error('Failed to handle emote:', error);
        }
    }

    /**
     * Handle creating an echo
     */
    static async handleCreateEcho(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { message, duration } = data;

            if (!message || typeof message !== 'string') return;

            const trimmed = message.trim();
            if (trimmed.length === 0 || trimmed.length > 100) {
                ctx.sendError(connection, 'Echo message must be 1-100 characters');
                return;
            }

            const echo: Echo = {
                id: `echo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                playerId: connection.playerId,
                playerName: connection.playerName,
                message: trimmed,
                x: connection.x,
                y: connection.y,
                createdAt: Date.now(),
                expiresAt: Date.now() + (duration || 60000),
                resonanceCount: 0
            };

            // Store echo
            ctx.echoes.set(echo.id, echo);

            // Broadcast to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    ctx.send(conn.ws, {
                        type: 'echo_created',
                        data: echo,
                        timestamp: Date.now()
                    });
                }
            }

            // Award XP
            await progressionService.addXP(connection.playerId, 5, 'create_echo');
        } catch (error) {
            console.error('Failed to create echo:', error);
        }
    }

    /**
     * Handle resonating with an echo
     */
    static async handleResonateEcho(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { echoId } = data;

            const echo = ctx.echoes.get(echoId);
            if (!echo) {
                ctx.sendError(connection, 'Echo not found');
                return;
            }

            // Increment resonance
            echo.resonanceCount++;

            // Notify echo creator
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    ctx.send(conn.ws, {
                        type: 'echo_resonated',
                        data: {
                            echoId,
                            resonanceCount: echo.resonanceCount,
                            resonatedBy: connection.playerId
                        },
                        timestamp: Date.now()
                    });
                }
            }

            // Award XP to both players
            await progressionService.addXP(connection.playerId, 2, 'resonate_echo');
            await progressionService.addXP(echo.playerId, 3, 'echo_resonated');
        } catch (error) {
            console.error('Failed to resonate echo:', error);
        }
    }

    /**
     * Handle lighting a star
     */
    static async handleLightStar(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { starId, message } = data;

            if (!starId) return;

            const now = Date.now();

            // Track star lighting
            if (!ctx.litStars) {
                (ctx as any).litStars = new Map();
            }
            (ctx as any).litStars.set(starId, {
                playerId: connection.playerId,
                message: message?.substring(0, 100) || '',
                litAt: now
            });

            // Broadcast to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    ctx.send(conn.ws, {
                        type: 'star_lit',
                        data: {
                            starId,
                            playerId: connection.playerId,
                            playerName: connection.playerName,
                            message: message?.substring(0, 100) || '',
                            timestamp: now
                        },
                        timestamp: now
                    });
                }
            }

            // Award XP
            await progressionService.addXP(connection.playerId, 10, 'light_star');
        } catch (error) {
            console.error('Failed to light star:', error);
        }
    }

    /**
     * Handle resonance with another player
     */
    static async handleResonance(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId, strength } = data;

            if (!targetId) return;

            // Track resonance
            await resonanceService.recordResonance(connection.playerId, targetId, strength || 1.0);

            const now = Date.now();

            // Notify both players
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                const targetConn = realm.get(targetId);

                if (targetConn) {
                    ctx.send(targetConn.ws, {
                        type: 'resonance_received',
                        data: {
                            fromId: connection.playerId,
                            fromName: connection.playerName,
                            strength: strength || 1.0
                        },
                        timestamp: now
                    });
                }
            }

            ctx.send(connection.ws, {
                type: 'resonance_sent',
                data: {
                    targetId,
                    strength: strength || 1.0
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to handle resonance:', error);
        }
    }

    /**
     * Handle wave gesture
     */
    static handleWave(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { targetId } = data;

            const now = Date.now();

            const wave = {
                type: 'wave',
                data: {
                    playerId: connection.playerId,
                    playerName: connection.playerName,
                    targetId,
                    x: connection.x,
                    y: connection.y,
                    timestamp: now
                },
                timestamp: now
            };

            // Broadcast to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    ctx.send(conn.ws, wave);
                }
            }
        } catch (error) {
            console.error('Failed to handle wave:', error);
        }
    }

    // =========================================================================
    // Pulse Pattern Recognition & Broadcasting
    // =========================================================================

    // Known pulse patterns that can be recognized
    private static readonly PULSE_PATTERNS: Record<string, {
        name: string;
        description: string;
        sequence: number[]; // Intervals in ms between pulses
        tolerance: number;  // Acceptable timing variance
        xpReward: number;
    }> = {
            'heartbeat': {
                name: 'Heartbeat',
                description: 'The rhythm of life',
                sequence: [300, 200, 700],  // lub-dub... pause
                tolerance: 100,
                xpReward: 10
            },
            'sos': {
                name: 'SOS',
                description: 'A call for help',
                sequence: [200, 200, 200, 400, 400, 400, 200, 200, 200], // ... --- ...
                tolerance: 80,
                xpReward: 25
            },
            'greeting': {
                name: 'Greeting',
                description: 'A friendly hello',
                sequence: [150, 150, 300],
                tolerance: 75,
                xpReward: 5
            },
            'celebration': {
                name: 'Celebration',
                description: 'Joy and excitement',
                sequence: [100, 100, 100, 100, 500],
                tolerance: 50,
                xpReward: 15
            },
            'calm': {
                name: 'Calm',
                description: 'Peaceful and slow',
                sequence: [1000, 1000, 1000],
                tolerance: 200,
                xpReward: 20
            },
            'excitement': {
                name: 'Excitement',
                description: 'Rapid and energetic',
                sequence: [80, 80, 80, 80, 80],
                tolerance: 30,
                xpReward: 15
            },
            'mystery': {
                name: 'Mystery',
                description: 'An enigmatic pattern',
                sequence: [500, 200, 800, 200, 500],
                tolerance: 100,
                xpReward: 30
            },
            'cosmic': {
                name: 'Cosmic',
                description: 'The pulse of the universe',
                sequence: [700, 350, 700, 350, 1400],
                tolerance: 150,
                xpReward: 50
            }
        };

    // Track recent pulses per player for pattern detection
    private static recentPulses: Map<string, number[]> = new Map();
    private static readonly MAX_PULSE_HISTORY = 15;
    private static readonly PULSE_TIMEOUT = 5000; // Reset if no pulse for 5s

    /**
     * Handle pulse pattern completion
     * When a player completes a recognized pattern, broadcast to nearby players
     */
    static async handlePulsePatternCompleted(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { patternId, pulseTimestamps } = data;

            // Validate pattern exists
            const pattern = this.PULSE_PATTERNS[patternId];
            if (!pattern) {
                ctx.sendError(connection, 'Unknown pattern');
                return;
            }

            // Validate the pattern was actually performed correctly (server-side verification)
            if (!this.verifyPattern(patternId, pulseTimestamps)) {
                ctx.sendError(connection, 'Pattern not recognized');
                return;
            }

            const now = Date.now();

            // Award XP to the player
            await progressionService.addXP(connection.playerId, pattern.xpReward, 'pulse_pattern');

            // Broadcast pattern completion to nearby players
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    const dx = conn.x - connection.x;
                    const dy = conn.y - connection.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Broadcast to players within 400 units
                    if (distance < 400) {
                        ctx.send(conn.ws, {
                            type: 'pulse_pattern_broadcast',
                            data: {
                                playerId: connection.playerId,
                                playerName: connection.playerName,
                                patternId,
                                patternName: pattern.name,
                                description: pattern.description,
                                x: connection.x,
                                y: connection.y,
                                color: connection.color
                            },
                            timestamp: now
                        });
                    }
                }
            }

            // Confirm to sender
            ctx.send(connection.ws, {
                type: 'pulse_pattern_confirmed',
                data: {
                    patternId,
                    patternName: pattern.name,
                    xpEarned: pattern.xpReward
                },
                timestamp: now
            });

        } catch (error) {
            console.error('Failed to handle pulse pattern:', error);
        }
    }

    /**
     * Record a pulse and check for pattern completion
     */
    static async handleRecordPulse(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const now = Date.now();
            const playerId = connection.playerId;

            // Get or create pulse history
            let pulses = this.recentPulses.get(playerId) || [];

            // Check for timeout - reset if too long since last pulse
            if (pulses.length > 0 && now - pulses[pulses.length - 1] > this.PULSE_TIMEOUT) {
                pulses = [];
            }

            // Add current pulse
            pulses.push(now);

            // Trim to max history
            if (pulses.length > this.MAX_PULSE_HISTORY) {
                pulses = pulses.slice(-this.MAX_PULSE_HISTORY);
            }

            this.recentPulses.set(playerId, pulses);

            // Check if any pattern matches
            const matchedPattern = this.detectPattern(pulses);
            if (matchedPattern) {
                // Clear history after match
                this.recentPulses.set(playerId, []);

                // Auto-broadcast the pattern
                await this.handlePulsePatternCompleted(connection, {
                    patternId: matchedPattern,
                    pulseTimestamps: pulses
                }, ctx);
            }

        } catch (error) {
            console.error('Failed to record pulse:', error);
        }
    }

    /**
     * Detect if recent pulses match any known pattern
     */
    private static detectPattern(timestamps: number[]): string | null {
        if (timestamps.length < 3) return null;

        // Calculate intervals between pulses
        const intervals: number[] = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
        }

        // Try to match each pattern
        for (const [patternId, pattern] of Object.entries(this.PULSE_PATTERNS)) {
            if (this.matchesPattern(intervals, pattern.sequence, pattern.tolerance)) {
                return patternId;
            }
        }

        return null;
    }

    /**
     * Check if intervals match a pattern sequence within tolerance
     */
    private static matchesPattern(intervals: number[], sequence: number[], tolerance: number): boolean {
        if (intervals.length < sequence.length) return false;

        // Check the last N intervals against the pattern
        const startIdx = intervals.length - sequence.length;

        for (let i = 0; i < sequence.length; i++) {
            const expected = sequence[i];
            const actual = intervals[startIdx + i];
            if (Math.abs(actual - expected) > tolerance) {
                return false;
            }
        }

        return true;
    }

    /**
     * Server-side verification that a pattern was performed correctly
     */
    private static verifyPattern(patternId: string, timestamps: number[]): boolean {
        const pattern = this.PULSE_PATTERNS[patternId];
        if (!pattern || !timestamps || timestamps.length < pattern.sequence.length + 1) {
            return false;
        }

        // Calculate intervals
        const intervals: number[] = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
        }

        // Check last N intervals match pattern
        return this.matchesPattern(intervals, pattern.sequence, pattern.tolerance);
    }

    /**
     * Get available pulse patterns for learning
     */
    static handleGetPulsePatterns(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const patterns = Object.entries(this.PULSE_PATTERNS).map(([id, pattern]) => ({
                id,
                name: pattern.name,
                description: pattern.description,
                pulseCount: pattern.sequence.length + 1,
                difficulty: pattern.tolerance < 75 ? 'hard' : pattern.tolerance < 125 ? 'medium' : 'easy',
                xpReward: pattern.xpReward
            }));

            ctx.send(connection.ws, {
                type: 'pulse_patterns_list',
                data: { patterns },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get pulse patterns:', error);
        }
    }
}
