// =============================================================================
// Voice Handlers - WebSocket message handlers for voice chat / WebRTC signaling
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { voiceChannelService } from '../../services/VoiceChannelService.js';

export class VoiceHandlers {
    /**
     * Handle WebRTC signaling message (offer, answer, ICE candidates)
     */
    static async handleVoiceSignal(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId, signalType, signalData } = data;

            if (!targetId || !signalType || !signalData) {
                ctx.sendError(connection, 'Invalid voice signal data');
                return;
            }

            // Forward signal to target peer
            const targetConn = ctx.connections.get(targetId);
            if (targetConn) {
                ctx.send(targetConn.ws, {
                    type: 'voice_signal',
                    data: {
                        fromId: connection.playerId,
                        fromName: connection.playerName,
                        signalType,
                        signalData
                    },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Error handling voice signal:', error);
        }
    }

    /**
     * Join a voice room
     */
    static async handleJoinRoom(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { roomId } = data;

            const result = await voiceChannelService.joinRoom(
                connection.playerId,
                roomId || `proximity_${connection.realm}`
            );

            if (result.success) {
                ctx.send(connection.ws, {
                    type: 'voice_room_joined',
                    data: {
                        roomId: result.roomId,
                        participants: result.participants,
                        settings: result.settings
                    },
                    timestamp: Date.now()
                });

                // Notify other participants
                if (result.participants) {
                    for (const participantId of result.participants) {
                        if (participantId !== connection.playerId) {
                            const participantConn = ctx.connections.get(participantId);
                            if (participantConn) {
                                ctx.send(participantConn.ws, {
                                    type: 'voice_peer_joined',
                                    data: {
                                        peerId: connection.playerId,
                                        peerName: connection.playerName
                                    },
                                    timestamp: Date.now()
                                });
                            }
                        }
                    }
                }
            } else {
                ctx.sendError(connection, result.error || 'Failed to join voice room');
            }
        } catch (error) {
            console.error('Error joining voice room:', error);
            ctx.sendError(connection, 'Failed to join voice room');
        }
    }

    /**
     * Leave voice room
     */
    static async handleLeaveRoom(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { roomId } = data;

            const result = await voiceChannelService.leaveRoom(connection.playerId, roomId);

            if (result.success) {
                ctx.send(connection.ws, {
                    type: 'voice_room_left',
                    data: { roomId },
                    timestamp: Date.now()
                });

                // Notify other participants
                if (result.remainingParticipants) {
                    for (const participantId of result.remainingParticipants) {
                        const participantConn = ctx.connections.get(participantId);
                        if (participantConn) {
                            ctx.send(participantConn.ws, {
                                type: 'voice_peer_left',
                                data: {
                                    peerId: connection.playerId
                                },
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error leaving voice room:', error);
        }
    }

    /**
     * Update mute state
     */
    static async handleMute(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { muted, roomId } = data;

            await voiceChannelService.setMuted(connection.playerId, roomId, muted);

            // Notify other participants
            const roomParticipants = await voiceChannelService.getRoomParticipants(roomId);
            for (const participantId of roomParticipants) {
                if (participantId !== connection.playerId) {
                    const participantConn = ctx.connections.get(participantId);
                    if (participantConn) {
                        ctx.send(participantConn.ws, {
                            type: 'voice_peer_mute_changed',
                            data: {
                                peerId: connection.playerId,
                                muted
                            },
                            timestamp: Date.now()
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error updating mute state:', error);
        }
    }

    /**
     * Handle speaking state update
     */
    static async handleSpeaking(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { speaking } = data;

            // Get player's current room
            const roomId = await voiceChannelService.getPlayerRoom(connection.playerId);
            if (!roomId) return;

            await voiceChannelService.setSpeaking(connection.playerId, roomId, speaking);

            // Broadcast to room participants
            const roomParticipants = await voiceChannelService.getRoomParticipants(roomId);
            for (const participantId of roomParticipants) {
                if (participantId !== connection.playerId) {
                    const participantConn = ctx.connections.get(participantId);
                    if (participantConn) {
                        ctx.send(participantConn.ws, {
                            type: 'voice_peer_speaking',
                            data: {
                                peerId: connection.playerId,
                                speaking
                            },
                            timestamp: Date.now()
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error updating speaking state:', error);
        }
    }

    /**
     * Get nearby voice peers for proximity voice
     */
    static async handleGetNearbyVoicePeers(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const nearbyPeers = await voiceChannelService.getNearbyPeers(
                connection.playerId,
                connection.realm,
                { x: connection.x, y: connection.y }
            );

            ctx.send(connection.ws, {
                type: 'nearby_voice_peers',
                data: { peers: nearbyPeers },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting nearby voice peers:', error);
        }
    }

    /**
     * Get available voice rooms
     */
    static async handleGetVoiceRooms(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const rooms = await voiceChannelService.getRoomsInRealm(connection.realm);

            ctx.send(connection.ws, {
                type: 'voice_rooms',
                data: { rooms },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting voice rooms:', error);
        }
    }
}
