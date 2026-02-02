// =============================================================================
// Voice Handlers - WebRTC Signaling for Voice Chat
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';

export class VoiceHandlers {
    /**
     * Handle voice signal (WebRTC offer/answer/ice)
     */
    static async handleVoiceSignal(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId, signalType, signal } = data;

            if (!targetId || !signalType || !signal) {
                // console.warn(`🟠 [SERVER VoiceHandler] Invalid voice signal from ${connection.playerId}`);
                return;
            }

            // Find target player
            let targetConnection: PlayerConnection | null = null;

            // Optimization: First check current realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                // We have to iterate because realm is a Map<WebSocket, PlayerConnection> or similar? 
                // Wait, ctx.realms is Map<string, Set<PlayerConnection>> usually.
                // Assuming standard structure based on ChatHandlers.

                for (const conn of Array.from(realm.values())) {
                    if (conn.playerId === targetId) {
                        targetConnection = conn;
                        break;
                    }
                }
            }

            // If not in realm (or if we want to support cross-realm voice? probably not for proximity), 
            // strictly speaking voice should be proximity based, so same realm check is good.

            if (!targetConnection) {
                // console.warn(`🟠 [SERVER VoiceHandler] Target ${targetId} not found in realm ${connection.realm}`);
                return;
            }

            // Relay signal
            ctx.send(targetConnection.ws, {
                type: 'voice_signal',
                data: {
                    fromId: connection.playerId,
                    fromName: connection.playerName,
                    signalType,
                    signalData: signal,
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            });

            // console.log(`🟠 [SERVER VoiceHandler] Relayed ${signalType} from ${connection.playerId} to ${targetId}`);

        } catch (error) {
            console.error('Failed to handle voice signal:', error);
        }
    }

    /**
     * Handle joining a voice room (or channel)
     */
    static async handleJoinRoom(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        // For now, simpler proximity voice is used, but we acknowledge the room request
        // Could be used for Guild voice channels later
        connection.voiceRoom = data.roomId;
        ctx.send(connection.ws, { type: 'voice_room_joined', data: { roomId: data.roomId }, timestamp: Date.now() });
    }

    /**
     * Handle leaving a voice room
     */
    static async handleLeaveRoom(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        connection.voiceRoom = undefined;
        ctx.send(connection.ws, { type: 'voice_room_left', data: {}, timestamp: Date.now() });
    }

    /**
     * Handle mute state change
     */
    static async handleMute(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        // Broadcast mute state to nearby players or room members
        // For proximity, we broadcast to realm
        if (connection.realm && ctx.realms.has(connection.realm)) {
            const realm = ctx.realms.get(connection.realm)!;
            for (const conn of Array.from(realm.values())) {
                if (conn.playerId !== connection.playerId) {
                    ctx.send(conn.ws, {
                        type: 'player_muted',
                        data: { playerId: connection.playerId, isMuted: data.isMuted },
                        timestamp: Date.now()
                    });
                }
            }
        }
    }

    /**
     * Handle speaking state change (for visual indicators)
     */
    static async handleSpeaking(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        if (connection.realm && ctx.realms.has(connection.realm)) {
            const realm = ctx.realms.get(connection.realm)!;
            const msg = {
                type: 'player_speaking',
                data: { playerId: connection.playerId, speaking: data.speaking },
                timestamp: Date.now()
            };
            for (const conn of Array.from(realm.values())) {
                if (conn.playerId !== connection.playerId) {
                    ctx.send(conn.ws, msg);
                }
            }
        }
    }

    /**
     * Get nearby peers for voice connection
     */
    static async handleGetNearbyVoicePeers(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        // Return list of players in same realm for now (simplest proximity)
        // In real massive game, we'd use a spatial grid query
        if (connection.realm && ctx.realms.has(connection.realm)) {
            const realm = ctx.realms.get(connection.realm)!;
            const peers = Array.from(realm.values())
                .filter(c => c.playerId !== connection.playerId)
                .map(c => c.playerId);

            ctx.send(connection.ws, {
                type: 'nearby_voice_peers',
                data: { peers },
                timestamp: Date.now()
            });
        }
    }

    /**
     * Get available voice rooms
     */
    static async handleGetVoiceRooms(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        // Stub: return empty list or guild rooms if implemented
        ctx.send(connection.ws, {
            type: 'voice_rooms_list',
            data: { rooms: [] },
            timestamp: Date.now()
        });
    }
}
