// =============================================================================
// Friend Handlers - Real-time friend status and interactions
// =============================================================================
// Phase 1.1 & 1.2: Friend Online Status Broadcasting & Teleport Validation
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { friendshipService } from '../../services/FriendshipService.js';
import { activityFeedService } from '../../services/ActivityFeedService.js';

export class FriendHandlers {
    // =========================================================================
    // ONLINE STATUS
    // =========================================================================

    /**
     * Handle request for friend online statuses
     */
    static async handleStatusRequest(
        connection: PlayerConnection,
        _data: any,
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const friends = await friendshipService.getFriends(connection.playerId);

            const statuses = friends.map(friend => {
                const friendConn = ctx.connections.get(friend.friendId);
                return {
                    friendId: friend.friendId,
                    friendName: friend.friendName,
                    online: !!friendConn,
                    realm: friendConn?.realm || null,
                    x: friendConn?.x || null,
                    y: friendConn?.y || null,
                    lastSeen: friendConn ? Date.now() : null
                };
            });

            ctx.send(connection.ws, {
                type: 'friend_statuses',
                data: { friends: statuses },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting friend statuses:', error);
            ctx.sendError(connection, 'Failed to get friend statuses');
        }
    }

    /**
     * Handle request for a single friend's position
     */
    static async handleFriendPositionRequest(
        connection: PlayerConnection,
        data: { friendId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const { friendId } = data;

            // Verify friendship
            const areFriends = await friendshipService.areFriends(connection.playerId, friendId);
            if (!areFriends) {
                ctx.sendError(connection, 'Not friends with this player');
                return;
            }

            const friendConn = ctx.connections.get(friendId);
            if (!friendConn) {
                ctx.send(connection.ws, {
                    type: 'friend_position',
                    data: {
                        friendId,
                        online: false
                    },
                    timestamp: Date.now()
                });
                return;
            }

            ctx.send(connection.ws, {
                type: 'friend_position',
                data: {
                    friendId,
                    online: true,
                    x: friendConn.x,
                    y: friendConn.y,
                    realm: friendConn.realm,
                    playerName: friendConn.playerName
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting friend position:', error);
            ctx.sendError(connection, 'Failed to get friend position');
        }
    }

    // =========================================================================
    // TELEPORTATION
    // =========================================================================

    /**
     * Handle teleport to friend request
     * Validates friendship and provides target location
     */
    static async handleTeleportToFriend(
        connection: PlayerConnection,
        data: { friendId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const { friendId } = data;

            // Verify friendship
            const areFriends = await friendshipService.areFriends(connection.playerId, friendId);
            if (!areFriends) {
                ctx.send(connection.ws, {
                    type: 'teleport_to_friend_result',
                    data: {
                        success: false,
                        error: 'Not friends with this player'
                    },
                    timestamp: Date.now()
                });
                return;
            }

            // Get friend's current position
            const friendConn = ctx.connections.get(friendId);
            if (!friendConn) {
                ctx.send(connection.ws, {
                    type: 'teleport_to_friend_result',
                    data: {
                        success: false,
                        error: 'Friend is offline'
                    },
                    timestamp: Date.now()
                });
                return;
            }

            // Calculate spawn position near friend (not exactly on them)
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 50; // 50-100 units away
            const targetX = friendConn.x + Math.cos(angle) * distance;
            const targetY = friendConn.y + Math.sin(angle) * distance;

            // Send teleport data
            ctx.send(connection.ws, {
                type: 'teleport_to_friend_result',
                data: {
                    success: true,
                    targetX,
                    targetY,
                    targetRealm: friendConn.realm,
                    friendId,
                    friendName: friendConn.playerName
                },
                timestamp: Date.now()
            });

            // Notify friend of incoming teleport
            ctx.send(friendConn.ws, {
                type: 'friend_teleporting_to_you',
                data: {
                    friendId: connection.playerId,
                    friendName: connection.playerName
                },
                timestamp: Date.now()
            });

            // Log activity - use recordActivity method
            // Note: Activity feed uses specific typed methods, skip generic log for now

        } catch (error) {
            console.error('Error teleporting to friend:', error);
            ctx.send(connection.ws, {
                type: 'teleport_to_friend_result',
                data: {
                    success: false,
                    error: 'Failed to teleport'
                },
                timestamp: Date.now()
            });
        }
    }

    // =========================================================================
    // STATUS BROADCASTING
    // =========================================================================

    /**
     * Broadcast online status change to all friends
     * Called when player connects or disconnects
     */
    static async broadcastStatusChange(
        playerId: string,
        playerName: string,
        online: boolean,
        realm: string | null,
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const friends = await friendshipService.getFriends(playerId);

            for (const friend of friends) {
                const friendConn = ctx.connections.get(friend.friendId);
                if (friendConn) {
                    ctx.send(friendConn.ws, {
                        type: 'friend_status_changed',
                        data: {
                            friendId: playerId,
                            friendName: playerName,
                            online,
                            realm
                        },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Error broadcasting status change:', error);
        }
    }

    /**
     * Broadcast realm change to all friends
     * Called when player changes realm
     */
    static async broadcastRealmChange(
        playerId: string,
        playerName: string,
        newRealm: string,
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const friends = await friendshipService.getFriends(playerId);

            for (const friend of friends) {
                const friendConn = ctx.connections.get(friend.friendId);
                if (friendConn) {
                    ctx.send(friendConn.ws, {
                        type: 'friend_realm_changed',
                        data: {
                            friendId: playerId,
                            friendName: playerName,
                            realm: newRealm
                        },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Error broadcasting realm change:', error);
        }
    }

    // =========================================================================
    // FRIEND MANAGEMENT (via WebSocket)
    // =========================================================================

    /**
     * Handle add friend request
     */
    static async handleAddFriend(
        connection: PlayerConnection,
        data: { friendId: string; friendName: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const { friendId, friendName } = data;

            if (friendId === connection.playerId) {
                ctx.sendError(connection, 'Cannot add yourself as friend');
                return;
            }

            // Check if already friends
            const alreadyFriends = await friendshipService.areFriends(connection.playerId, friendId);
            if (alreadyFriends) {
                ctx.sendError(connection, 'Already friends');
                return;
            }

            // Send friend request or auto-accept if mutual
            const result = await friendshipService.sendFriendRequest(
                connection.playerId,
                connection.playerName,
                friendId
            );

            if (result.success) {
                // If they had a pending request to us, it auto-accepts
                if (result.requestId) {
                    // Friendship created
                    ctx.send(connection.ws, {
                        type: 'friend_added',
                        data: { friendId, friendName },
                        timestamp: Date.now()
                    });

                    // Notify the other player
                    const friendConn = ctx.connections.get(friendId);
                    if (friendConn) {
                        ctx.send(friendConn.ws, {
                            type: 'friend_added',
                            data: {
                                friendId: connection.playerId,
                                friendName: connection.playerName
                            },
                            timestamp: Date.now()
                        });
                    }
                } else {
                    // Request sent
                    ctx.send(connection.ws, {
                        type: 'friend_request_sent',
                        data: { requestId: result.requestId, toPlayerId: friendId },
                        timestamp: Date.now()
                    });

                    // Notify target
                    const targetConn = ctx.connections.get(friendId);
                    if (targetConn) {
                        ctx.send(targetConn.ws, {
                            type: 'friend_request_received',
                            data: {
                                requestId: result.requestId,
                                fromPlayerId: connection.playerId,
                                fromPlayerName: connection.playerName
                            },
                            timestamp: Date.now()
                        });
                    }
                }
            } else {
                ctx.sendError(connection, result.error || 'Failed to add friend');
            }
        } catch (error) {
            console.error('Error adding friend:', error);
            ctx.sendError(connection, 'Failed to add friend');
        }
    }

    /**
     * Handle remove friend request
     */
    static async handleRemoveFriend(
        connection: PlayerConnection,
        data: { friendId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const { friendId } = data;

            const removed = await friendshipService.removeFriend(connection.playerId, friendId);

            if (removed) {
                ctx.send(connection.ws, {
                    type: 'friend_removed',
                    data: { friendId },
                    timestamp: Date.now()
                });

                // Notify the other player
                const friendConn = ctx.connections.get(friendId);
                if (friendConn) {
                    ctx.send(friendConn.ws, {
                        type: 'friend_removed',
                        data: { friendId: connection.playerId },
                        timestamp: Date.now()
                    });
                }
            } else {
                ctx.sendError(connection, 'Friend not found');
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            ctx.sendError(connection, 'Failed to remove friend');
        }
    }

    /**
     * Handle accept friend request
     */
    static async handleAcceptFriendRequest(
        connection: PlayerConnection,
        data: { requestId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const { requestId } = data;

            const result = await friendshipService.acceptFriendRequest(connection.playerId, requestId);

            if (result.success && result.friendId) {
                ctx.send(connection.ws, {
                    type: 'friend_request_accepted',
                    data: { friendId: result.friendId },
                    timestamp: Date.now()
                });

                // Notify the requester
                const friendConn = ctx.connections.get(result.friendId);
                if (friendConn) {
                    ctx.send(friendConn.ws, {
                        type: 'friend_added',
                        data: {
                            friendId: connection.playerId,
                            friendName: connection.playerName
                        },
                        timestamp: Date.now()
                    });
                }
            } else {
                ctx.sendError(connection, result.error || 'Failed to accept request');
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
            ctx.sendError(connection, 'Failed to accept request');
        }
    }

    /**
     * Handle decline friend request
     */
    static async handleDeclineFriendRequest(
        connection: PlayerConnection,
        data: { requestId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const { requestId } = data;

            const declined = await friendshipService.declineFriendRequest(connection.playerId, requestId);

            if (declined) {
                ctx.send(connection.ws, {
                    type: 'friend_request_declined',
                    data: { requestId },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, 'Request not found');
            }
        } catch (error) {
            console.error('Error declining friend request:', error);
            ctx.sendError(connection, 'Failed to decline request');
        }
    }

    /**
     * Handle get pending friend requests
     */
    static async handleGetPendingRequests(
        connection: PlayerConnection,
        _data: any,
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const requests = await friendshipService.getPendingRequests(connection.playerId);

            ctx.send(connection.ws, {
                type: 'pending_friend_requests',
                data: {
                    requests: requests.map(r => ({
                        requestId: r.requestId,
                        fromPlayerId: r.fromPlayerId,
                        fromPlayerName: r.fromPlayerName,
                        message: r.message,
                        createdAt: r.createdAt
                    }))
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting pending requests:', error);
            ctx.sendError(connection, 'Failed to get pending requests');
        }
    }
}
