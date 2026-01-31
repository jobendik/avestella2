// =============================================================================
// Player Data Handlers - Sync, Friends, Social Features
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { playerDataService } from '../../services/PlayerDataService.js';
import { friendshipService } from '../../services/FriendshipService.js';

export class PlayerDataHandlers {
    /**
     * Sync partial player data updates
     */
    static async handleSyncPlayerData(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const updated = await playerDataService.updatePlayerData(connection.playerId, data);
            if (updated) {
                ctx.send(connection.ws, {
                    type: 'player_data_synced',
                    data: { success: true },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to sync player data:', error);
        }
    }

    /**
     * Request full player data from server
     */
    static async handleRequestPlayerData(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const playerData = await playerDataService.getOrCreatePlayerData(connection.playerId, connection.playerName || 'Player');

            ctx.send(connection.ws, {
                type: 'player_data',
                data: playerData,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get player data:', error);
        }
    }

    /**
     * Handle friend request
     */
    static async handleFriendRequest(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId } = data;
            if (!targetId || targetId === connection.playerId) return;

            const result = await friendshipService.sendFriendRequest(connection.playerId, connection.playerName || 'Player', targetId);

            if (result.success) {
                ctx.send(connection.ws, {
                    type: 'friend_request_sent',
                    data: { targetId },
                    timestamp: Date.now()
                });

                // Notify target if online
                const targetConn = ctx.connections.get(targetId);
                if (targetConn) {
                    ctx.send(targetConn.ws, {
                        type: 'friend_request_received',
                        data: { fromId: connection.playerId, fromName: connection.playerName },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Failed to send friend request:', error);
        }
    }

    /**
     * Accept friend request
     */
    static async handleAcceptFriend(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { requesterId } = data;
            const result = await friendshipService.acceptFriendRequest(requesterId, connection.playerId);

            if (result.success) {
                connection.friends?.add(requesterId);

                ctx.send(connection.ws, {
                    type: 'friend_accepted',
                    data: { friendId: requesterId },
                    timestamp: Date.now()
                });

                // Notify requester if online
                const requesterConn = ctx.connections.get(requesterId);
                if (requesterConn) {
                    requesterConn.friends?.add(connection.playerId);
                    ctx.send(requesterConn.ws, {
                        type: 'friend_request_accepted',
                        data: { friendId: connection.playerId, friendName: connection.playerName },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Failed to accept friend request:', error);
        }
    }

    /**
     * Decline friend request
     */
    static async handleDeclineFriend(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { requesterId } = data;
            await friendshipService.declineFriendRequest(requesterId, connection.playerId);

            ctx.send(connection.ws, {
                type: 'friend_declined',
                data: { requesterId },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to decline friend request:', error);
        }
    }

    /**
     * Remove friend
     */
    static async handleRemoveFriend(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { friendId } = data;
            await friendshipService.removeFriend(connection.playerId, friendId);

            connection.friends?.delete(friendId);

            ctx.send(connection.ws, {
                type: 'friend_removed',
                data: { friendId },
                timestamp: Date.now()
            });

            // Notify other party if online
            const friendConn = ctx.connections.get(friendId);
            if (friendConn) {
                friendConn.friends?.delete(connection.playerId);
            }
        } catch (error) {
            console.error('Failed to remove friend:', error);
        }
    }

    /**
     * Get friends list with online status
     */
    static async handleGetFriends(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const friends = await friendshipService.getFriends(connection.playerId);

            const friendsWithStatus = friends.map(friend => ({
                ...friend,
                isOnline: ctx.connections.has(friend.friendId),
                realm: ctx.connections.get(friend.friendId)?.realm
            }));

            ctx.send(connection.ws, {
                type: 'friends_list',
                data: { friends: friendsWithStatus },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get friends:', error);
        }
    }

    /**
     * Get pending friend requests
     */
    static async handleGetPendingRequests(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const requests = await friendshipService.getPendingRequests(connection.playerId);

            ctx.send(connection.ws, {
                type: 'pending_friend_requests',
                data: { requests },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get pending requests:', error);
        }
    }

    /**
     * Teleport to a friend's location
     */
    static async handleTeleportToFriend(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { friendId } = data;
            if (!friendId) {
                ctx.send(connection.ws, {
                    type: 'teleport_failed',
                    data: { error: 'No friend ID provided' },
                    timestamp: Date.now()
                });
                return;
            }

            // Check if they are actually friends
            const friends = await friendshipService.getFriends(connection.playerId);
            const isFriend = friends.some(f => f.friendId === friendId);

            if (!isFriend) {
                ctx.send(connection.ws, {
                    type: 'teleport_failed',
                    data: { error: 'Player is not your friend' },
                    timestamp: Date.now()
                });
                return;
            }

            // Check if friend is online
            const friendConn = ctx.connections.get(friendId);
            if (!friendConn) {
                ctx.send(connection.ws, {
                    type: 'teleport_failed',
                    data: { error: 'Friend is not online' },
                    timestamp: Date.now()
                });
                return;
            }

            // Send teleport coordinates to the client
            ctx.send(connection.ws, {
                type: 'teleport_to_friend',
                data: {
                    success: true,
                    friendId,
                    x: friendConn.x,
                    y: friendConn.y,
                    realm: friendConn.realm
                },
                timestamp: Date.now()
            });

            // Notify the friend that someone teleported to them
            ctx.send(friendConn.ws, {
                type: 'friend_teleported_to_you',
                data: {
                    playerId: connection.playerId,
                    playerName: connection.playerName
                },
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Failed to teleport to friend:', error);
            ctx.send(connection.ws, {
                type: 'teleport_failed',
                data: { error: 'Failed to teleport' },
                timestamp: Date.now()
            });
        }
    }

    // =========================================================================
    // COMMUNICATION SYNC HANDLERS
    // =========================================================================

    /**
     * Sync communication preferences (friends, blocked, favorites, settings)
     */
    static async handleSyncCommunication(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { friends, blocked, favoriteEmotes, chatEnabled, signalsEnabled } = data;

            // Build update object
            const updates: any = {};

            if (friends !== undefined) {
                updates['social.friendIds'] = friends;
            }
            if (blocked !== undefined) {
                updates['social.blockedIds'] = blocked;
                updates['communication.blockedPlayerIds'] = blocked;
            }
            if (favoriteEmotes !== undefined) {
                updates['cosmetics.equippedEmotes'] = favoriteEmotes;
            }
            if (chatEnabled !== undefined || signalsEnabled !== undefined) {
                // Store in settings or a communication settings field
                const settingsUpdate: any = {};
                if (chatEnabled !== undefined) settingsUpdate['settings.chatEnabled'] = chatEnabled;
                if (signalsEnabled !== undefined) settingsUpdate['settings.signalsEnabled'] = signalsEnabled;
                Object.assign(updates, settingsUpdate);
            }

            if (Object.keys(updates).length > 0) {
                await playerDataService.updatePlayerData(connection.playerId, updates);
            }

            ctx.send(connection.ws, {
                type: 'communication_synced',
                data: { success: true },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to sync communication:', error);
            ctx.send(connection.ws, {
                type: 'communication_synced',
                data: { success: false, error: 'Failed to sync' },
                timestamp: Date.now()
            });
        }
    }

    /**
     * Request communication data from server
     */
    static async handleRequestCommunication(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const playerData = await playerDataService.getOrCreatePlayerData(connection.playerId, connection.playerName || 'Player');

            ctx.send(connection.ws, {
                type: 'communication_data',
                data: {
                    friends: playerData.social?.friendIds || [],
                    blocked: playerData.social?.blockedIds || [],
                    favoriteEmotes: playerData.cosmetics?.equippedEmotes || [],
                    chatEnabled: (playerData.settings as any)?.chatEnabled ?? true,
                    signalsEnabled: (playerData.settings as any)?.signalsEnabled ?? true
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get communication data:', error);
        }
    }

    /**
     * Update player settings
     */
    static async handleUpdateSettings(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const updates: any = {};

            // Map settings to dot notation updates for nested schema
            for (const [key, value] of Object.entries(data)) {
                updates[`settings.${key}`] = value;
            }

            await playerDataService.updatePlayerData(connection.playerId, updates);

            ctx.send(connection.ws, {
                type: 'settings_updated',
                data: { success: true, settings: data },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to update settings:', error);
            ctx.send(connection.ws, {
                type: 'settings_updated',
                data: { success: false, error: 'Failed to update settings' },
                timestamp: Date.now()
            });
        }
    }

    // =========================================================================
    // MAP MARKER HANDLERS
    // =========================================================================

    // In-memory map markers (ephemeral - no persistence needed)
    private static mapMarkers: Map<string, {
        id: string;
        playerId: string;
        x: number;
        y: number;
        realm: string;
        label?: string;
        icon?: string;
        expiresAt: number;
    }> = new Map();

    /**
     * Place a map marker visible to friends
     */
    static async handlePlaceMapMarker(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { x, y, realm, label, icon, expiresIn = 300 } = data;

            if (typeof x !== 'number' || typeof y !== 'number' || !realm) {
                return;
            }

            const markerId = `marker_${connection.playerId}_${Date.now()}`;
            const expiresAt = Date.now() + (expiresIn * 1000);

            // Remove any existing marker from this player
            for (const [id, marker] of this.mapMarkers) {
                if (marker.playerId === connection.playerId) {
                    this.mapMarkers.delete(id);
                    break;
                }
            }

            // Add new marker
            this.mapMarkers.set(markerId, {
                id: markerId,
                playerId: connection.playerId,
                x,
                y,
                realm,
                label: label?.slice(0, 50),
                icon,
                expiresAt
            });

            ctx.send(connection.ws, {
                type: 'map_marker_placed',
                data: { markerId, expiresAt },
                timestamp: Date.now()
            });

            // Notify online friends in the same realm
            const friends = await friendshipService.getFriends(connection.playerId);
            for (const friend of friends) {
                const friendConn = ctx.connections.get(friend.friendId);
                if (friendConn && friendConn.realm === realm) {
                    ctx.send(friendConn.ws, {
                        type: 'friend_marker_update',
                        data: {
                            playerId: connection.playerId,
                            playerName: connection.playerName,
                            markerId,
                            x,
                            y,
                            label,
                            icon,
                            expiresAt
                        },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Failed to place map marker:', error);
        }
    }

    /**
     * Remove a map marker
     */
    static handleRemoveMapMarker(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { markerId } = data;

            const marker = this.mapMarkers.get(markerId);
            if (marker && marker.playerId === connection.playerId) {
                this.mapMarkers.delete(markerId);

                ctx.send(connection.ws, {
                    type: 'map_marker_removed',
                    data: { markerId },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to remove map marker:', error);
        }
    }

    /**
     * Request friend markers for current realm
     */
    static async handleRequestFriendMarkers(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { realm } = data;
            if (!realm) return;

            const friends = await friendshipService.getFriends(connection.playerId);
            const friendIds = new Set(friends.map(f => f.friendId));

            // Clean up expired markers
            const now = Date.now();
            for (const [id, marker] of this.mapMarkers) {
                if (marker.expiresAt < now) {
                    this.mapMarkers.delete(id);
                }
            }

            // Get friend markers in this realm
            const markers: any[] = [];
            for (const marker of this.mapMarkers.values()) {
                if (marker.realm === realm && friendIds.has(marker.playerId)) {
                    const friendConn = ctx.connections.get(marker.playerId);
                    markers.push({
                        ...marker,
                        playerName: friendConn?.playerName || 'Friend'
                    });
                }
            }

            ctx.send(connection.ws, {
                type: 'friend_markers',
                data: { markers },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get friend markers:', error);
        }
    }
}
