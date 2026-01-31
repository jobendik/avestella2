// =============================================================================
// Signals Handlers - Social signals system (calls for help, greetings, etc.)
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { signalsService } from '../../services/SignalsService.js';

export class SignalsHandlers {
    /**
     * Send a signal
     */
    static handleSendSignal(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { type, targetId, message, intensity, color } = data;

            if (!type) {
                ctx.sendError(connection, 'Signal type required');
                return;
            }

            const result = signalsService.sendSignal(
                connection.playerId,
                connection.playerName || 'Player',
                type,
                { x: connection.x, y: connection.y },
                connection.realm || 'genesis',
                {
                    targetId,
                    message,
                    intensity,
                    color,
                    playerLevel: connection.level
                }
            );

            if (result.success && result.signal) {
                ctx.send(connection.ws, {
                    type: 'signal_sent',
                    data: { signalId: result.signal.id },
                    timestamp: Date.now()
                });

                // Broadcast to realm
                if (connection.realm && ctx.realms.has(connection.realm)) {
                    const realm = ctx.realms.get(connection.realm)!;
                    for (const conn of Array.from(realm.values())) {
                        if (conn.playerId !== connection.playerId) {
                            ctx.send(conn.ws, {
                                type: 'signal_received',
                                data: { signal: result.signal },
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            } else {
                ctx.sendError(connection, result.error || 'Failed to send signal');
            }
        } catch (error) {
            console.error('Failed to send signal:', error);
        }
    }

    /**
     * Get signals in range
     */
    static handleGetSignals(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { maxRange } = data;

            const signals = signalsService.getSignalsForPlayer(
                connection.playerId,
                { x: connection.x, y: connection.y },
                connection.realm || 'genesis'
            );

            ctx.send(connection.ws, {
                type: 'signals_list',
                data: { signals },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get signals:', error);
        }
    }

    /**
     * Acknowledge a signal (mark as seen)
     */
    static handleAcknowledgeSignal(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { signalId } = data;

            if (!signalId) {
                return;
            }

            const success = signalsService.acknowledgeSignal(connection.playerId, signalId);

            if (success) {
                ctx.send(connection.ws, {
                    type: 'signal_acknowledged',
                    data: { signalId },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to acknowledge signal:', error);
        }
    }

    /**
     * Respond to a signal
     */
    static handleRespondToSignal(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { signalId, responseType } = data;

            if (!signalId || !responseType) {
                ctx.sendError(connection, 'Signal ID and response type required');
                return;
            }

            const result = signalsService.respondToSignal(
                connection.playerId,
                connection.playerName || 'Player',
                signalId,
                responseType,
                { x: connection.x, y: connection.y },
                connection.realm || 'genesis'
            );

            if (result.success && result.signal) {
                ctx.send(connection.ws, {
                    type: 'response_sent',
                    data: { signalId: result.signal.id },
                    timestamp: Date.now()
                });

                // Broadcast response to realm
                if (connection.realm && ctx.realms.has(connection.realm)) {
                    const realm = ctx.realms.get(connection.realm)!;
                    for (const conn of Array.from(realm.values())) {
                        if (conn.playerId !== connection.playerId) {
                            ctx.send(conn.ws, {
                                type: 'signal_received',
                                data: { signal: result.signal },
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            } else {
                ctx.sendError(connection, result.error || 'Failed to respond');
            }
        } catch (error) {
            console.error('Failed to respond to signal:', error);
        }
    }

    /**
     * Get directed signals (signals aimed at you)
     */
    static handleGetDirectedSignals(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const signals = signalsService.getDirectedSignals(connection.playerId);

            ctx.send(connection.ws, {
                type: 'directed_signals',
                data: { signals },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get directed signals:', error);
        }
    }

    /**
     * Get signal cooldowns
     */
    static handleGetSignalCooldowns(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const cooldowns = signalsService.getCooldowns(connection.playerId);

            ctx.send(connection.ws, {
                type: 'signal_cooldowns',
                data: { cooldowns },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get cooldowns:', error);
        }
    }

    /**
     * Get available signal types
     */
    static handleGetSignalTypes(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const available = signalsService.getAvailableSignals(connection.level || 1);
            const all = signalsService.getAllSignalConfigs();

            ctx.send(connection.ws, {
                type: 'signal_types',
                data: { available, all },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get signal types:', error);
        }
    }
}
