// =============================================================================
// Anchoring Handlers - Mindfulness zones and meditation
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { anchoringService } from '../../services/AnchoringService.js';

export class AnchoringHandlers {
    /**
     * Get anchoring zones
     */
    static async handleGetAnchoringZones(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const zones = anchoringService.getZonesByRealm(connection.realm || 'default');

            ctx.send(connection.ws, {
                type: 'anchoring_zones',
                data: { zones },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get anchoring zones:', error);
        }
    }

    /**
     * Enter an anchoring zone
     */
    static async handleEnterAnchoringZone(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { zoneId } = data;

            if (!zoneId) {
                ctx.sendError(connection, 'Zone ID required');
                return;
            }

            const result = await anchoringService.startSession(
                connection.playerId,
                zoneId,
                { x: connection.x, y: connection.y }
            );

            if (!result.success) {
                ctx.sendError(connection, result.error || 'Cannot enter zone');
                return;
            }

            connection.currentAnchoringZone = zoneId;
            connection.anchoringStartTime = Date.now();

            ctx.send(connection.ws, {
                type: 'entered_anchoring_zone',
                data: {
                    zoneId,
                    sessionId: result.sessionId,
                    zoneInfo: result.zone
                },
                timestamp: Date.now()
            });

            // Notify others in zone
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of Array.from(realm.values())) {
                    if (conn.playerId !== connection.playerId && conn.currentAnchoringZone === zoneId) {
                        ctx.send(conn.ws, {
                            type: 'player_joined_zone',
                            data: {
                                playerId: connection.playerId,
                                playerName: connection.playerName,
                                zoneId
                            },
                            timestamp: Date.now()
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to enter anchoring zone:', error);
        }
    }

    /**
     * Leave an anchoring zone
     */
    static async handleLeaveAnchoringZone(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const zoneId = connection.currentAnchoringZone;
            if (!zoneId) return;

            const result = await anchoringService.endSession(connection.playerId, false);

            connection.currentAnchoringZone = undefined;
            connection.anchoringStartTime = undefined;

            ctx.send(connection.ws, {
                type: 'left_anchoring_zone',
                data: {
                    zoneId,
                    session: result.session,
                    rewards: result.session?.rewards
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to leave anchoring zone:', error);
        }
    }

    /**
     * Start a meditation session
     */
    static async handleStartMeditation(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { zoneId } = data;

            if (!zoneId) {
                ctx.sendError(connection, 'Zone ID required');
                return;
            }

            const result = await anchoringService.startSession(
                connection.playerId,
                zoneId,
                { x: connection.x, y: connection.y }
            );

            if (!result.success) {
                ctx.sendError(connection, result.error || 'Cannot start meditation');
                return;
            }

            connection.meditationSession = {
                id: result.sessionId || '',
                type: 'meditation',
                startTime: Date.now(),
                duration: 0
            };

            ctx.send(connection.ws, {
                type: 'meditation_started',
                data: {
                    sessionId: result.sessionId,
                    zone: result.zone
                },
                timestamp: Date.now()
            });

            // Notify nearby players
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of Array.from(realm.values())) {
                    if (conn.playerId !== connection.playerId) {
                        const dx = conn.x - connection.x;
                        const dy = conn.y - connection.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < 200) {
                            ctx.send(conn.ws, {
                                type: 'player_meditating',
                                data: {
                                    playerId: connection.playerId,
                                    playerName: connection.playerName
                                },
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to start meditation:', error);
        }
    }

    /**
     * End a meditation session
     */
    static async handleEndMeditation(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const session = connection.meditationSession;
            if (!session) {
                ctx.sendError(connection, 'No active meditation session');
                return;
            }

            const { interrupted } = data;
            const result = await anchoringService.endSession(connection.playerId, interrupted === true);

            connection.meditationSession = undefined;

            ctx.send(connection.ws, {
                type: 'meditation_ended',
                data: {
                    sessionId: session.id,
                    session: result.session,
                    rewards: result.session?.rewards
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to end meditation:', error);
        }
    }

    /**
     * Get mindfulness stats
     */
    static async handleGetMindfulnessStats(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const stats = await anchoringService.getPlayerMindfulness(connection.playerId);

            ctx.send(connection.ws, {
                type: 'mindfulness_stats',
                data: stats,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get mindfulness stats:', error);
        }
    }

    /**
     * Join group meditation
     */
    static async handleJoinGroupMeditation(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { zoneId } = data;

            // For group meditation, just start a session in the same zone
            const result = await anchoringService.startSession(
                connection.playerId,
                zoneId,
                { x: connection.x, y: connection.y }
            );

            if (!result.success) {
                ctx.sendError(connection, result.error || 'Cannot join session');
                return;
            }

            ctx.send(connection.ws, {
                type: 'joined_group_meditation',
                data: {
                    sessionId: result.sessionId,
                    zone: result.zone
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to join group meditation:', error);
        }
    }

    /**
     * Send breathing sync pulse
     */
    static handleBreathingSync(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { phase } = data; // 'inhale', 'hold', 'exhale'

            // Broadcast to nearby meditating players
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of Array.from(realm.values())) {
                    if (conn.playerId !== connection.playerId && conn.meditationSession) {
                        const dx = conn.x - connection.x;
                        const dy = conn.y - connection.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < 100) {
                            ctx.send(conn.ws, {
                                type: 'breathing_sync',
                                data: {
                                    playerId: connection.playerId,
                                    phase
                                },
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to sync breathing:', error);
        }
    }
}
