// =============================================================================
// Map Marker Handlers - WebSocket handlers for map markers
// =============================================================================
// Phase 2.1: Map marker management via WebSocket
// =============================================================================

// @ts-ignore - uuid package types
import { v4 as uuidv4 } from 'uuid';
import type { PlayerConnection, HandlerContext } from '../types.js';
import { 
    MapMarker, 
    MarkerShareInvite, 
    MarkerPreset,
    CreateMarkerInput,
    MarkerQueryOptions 
} from '../../database/markerModels.js';
import { friendshipService } from '../../services/FriendshipService.js';
import { constellationService } from '../../services/ConstellationService.js';

// ============================================
// LIMITS
// ============================================

const LIMITS = {
    MAX_MARKERS_PER_PLAYER: 50,
    MAX_MARKERS_PER_REALM: 20,
    MAX_SHARED_MARKERS: 25,
    MAX_PRESETS: 10,
    TEMPORARY_MARKER_DURATION: 30 * 60 * 1000, // 30 minutes
    LABEL_MAX_LENGTH: 50,
    DESCRIPTION_MAX_LENGTH: 200
};

// ============================================
// MAP MARKER HANDLERS
// ============================================

export class MapMarkerHandlers {
    // =========================================================================
    // CREATE MARKER
    // =========================================================================

    static async handleCreateMarker(
        connection: PlayerConnection,
        data: CreateMarkerInput,
        ctx: HandlerContext
    ): Promise<void> {
        try {
            // Validate input
            if (!data.label || data.label.length > LIMITS.LABEL_MAX_LENGTH) {
                ctx.sendError(connection, 'Invalid marker label');
                return;
            }

            if (data.description && data.description.length > LIMITS.DESCRIPTION_MAX_LENGTH) {
                ctx.sendError(connection, 'Description too long');
                return;
            }

            // Check marker limits
            const existingCount = await MapMarker.countDocuments({ playerId: connection.playerId });
            if (existingCount >= LIMITS.MAX_MARKERS_PER_PLAYER) {
                ctx.sendError(connection, `Maximum ${LIMITS.MAX_MARKERS_PER_PLAYER} markers allowed`);
                return;
            }

            const realmCount = await MapMarker.countDocuments({ 
                playerId: connection.playerId, 
                realm: connection.realm 
            });
            if (realmCount >= LIMITS.MAX_MARKERS_PER_REALM) {
                ctx.sendError(connection, `Maximum ${LIMITS.MAX_MARKERS_PER_REALM} markers per realm`);
                return;
            }

            // Calculate expiration for temporary markers
            let expiresAt: Date | undefined;
            if (data.markerType === 'temporary' || data.expiresInMs) {
                expiresAt = new Date(Date.now() + (data.expiresInMs || LIMITS.TEMPORARY_MARKER_DURATION));
            }

            // Create marker
            const markerId = `marker_${uuidv4()}`;
            const marker = await MapMarker.create({
                markerId,
                playerId: connection.playerId,
                playerName: connection.playerName,
                realm: data.realm || connection.realm,
                x: data.x,
                y: data.y,
                markerType: data.markerType || 'temporary',
                iconType: data.iconType || 'default',
                label: data.label,
                description: data.description,
                color: data.color || '#ffffff',
                visibility: data.visibility || 'private',
                sharedWith: data.sharedWith || [],
                expiresAt,
                metadata: data.metadata || {}
            });

            // Send confirmation
            ctx.send(connection.ws, {
                type: 'marker_created',
                data: {
                    marker: {
                        markerId: marker.markerId,
                        x: marker.x,
                        y: marker.y,
                        realm: marker.realm,
                        label: marker.label,
                        iconType: marker.iconType,
                        color: marker.color,
                        visibility: marker.visibility,
                        markerType: marker.markerType,
                        expiresAt: marker.expiresAt
                    }
                },
                timestamp: Date.now()
            });

            // Broadcast to relevant players if shared
            if (marker.visibility !== 'private') {
                await MapMarkerHandlers.broadcastMarkerUpdate(
                    connection, 
                    marker, 
                    'marker_added', 
                    ctx
                );
            }

        } catch (error) {
            console.error('Error creating marker:', error);
            ctx.sendError(connection, 'Failed to create marker');
        }
    }

    // =========================================================================
    // GET MARKERS
    // =========================================================================

    static async handleGetMarkers(
        connection: PlayerConnection,
        data: MarkerQueryOptions,
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const realm = data.realm || connection.realm;
            
            // Build query for markers visible to this player
            const query: any = {
                realm,
                $or: [
                    // Player's own markers
                    { playerId: connection.playerId },
                    // Public markers
                    { visibility: 'public' },
                    // Markers shared directly with player
                    { sharedWith: connection.playerId }
                ]
            };

            // Get player's friends for 'friends' visibility
            const friends = await friendshipService.getFriends(connection.playerId);
            const friendIds = friends.map(f => f.friendId);
            if (friendIds.length > 0) {
                query.$or.push({
                    visibility: 'friends',
                    playerId: { $in: friendIds }
                });
            }

            // Get player's constellation members
            const constellations = await constellationService.getPlayerConstellations(connection.playerId);
            if (constellations && constellations.length > 0) {
                const constellation = constellations[0];
                const memberIds = constellation.playerIds;
                query.$or.push({
                    visibility: 'constellation',
                    playerId: { $in: memberIds }
                });
            }

            // Apply bounds filter if provided
            if (data.bounds) {
                query.x = { $gte: data.bounds.minX, $lte: data.bounds.maxX };
                query.y = { $gte: data.bounds.minY, $lte: data.bounds.maxY };
            }

            // Apply marker type filter
            if (data.markerType) {
                query.markerType = Array.isArray(data.markerType) 
                    ? { $in: data.markerType } 
                    : data.markerType;
            }

            // Exclude expired markers unless explicitly requested
            if (!data.includeExpired) {
                query.$and = query.$and || [];
                query.$and.push({
                    $or: [
                        { expiresAt: { $exists: false } },
                        { expiresAt: null },
                        { expiresAt: { $gt: new Date() } }
                    ]
                });
            }

            const markers = await MapMarker.find(query)
                .sort({ createdAt: -1 })
                .limit(data.limit || 100)
                .skip(data.skip || 0)
                .lean();

            ctx.send(connection.ws, {
                type: 'markers_list',
                data: {
                    realm,
                    markers: markers.map(m => ({
                        markerId: m.markerId,
                        playerId: m.playerId,
                        playerName: m.playerName,
                        x: m.x,
                        y: m.y,
                        label: m.label,
                        description: m.description,
                        iconType: m.iconType,
                        color: m.color,
                        markerType: m.markerType,
                        visibility: m.visibility,
                        isOwn: m.playerId === connection.playerId,
                        expiresAt: m.expiresAt
                    })),
                    total: await MapMarker.countDocuments(query)
                },
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error getting markers:', error);
            ctx.sendError(connection, 'Failed to get markers');
        }
    }

    // =========================================================================
    // UPDATE MARKER
    // =========================================================================

    static async handleUpdateMarker(
        connection: PlayerConnection,
        data: { 
            markerId: string; 
            updates: Partial<CreateMarkerInput> 
        },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const { markerId, updates } = data;

            // Find and verify ownership
            const marker = await MapMarker.findOne({ 
                markerId, 
                playerId: connection.playerId 
            });

            if (!marker) {
                ctx.sendError(connection, 'Marker not found or not owned');
                return;
            }

            // Apply updates
            if (updates.x !== undefined) marker.x = updates.x;
            if (updates.y !== undefined) marker.y = updates.y;
            if (updates.label) marker.label = updates.label.slice(0, LIMITS.LABEL_MAX_LENGTH);
            if (updates.description !== undefined) marker.description = updates.description?.slice(0, LIMITS.DESCRIPTION_MAX_LENGTH);
            if (updates.iconType) marker.iconType = updates.iconType;
            if (updates.color) marker.color = updates.color;
            if (updates.visibility) marker.visibility = updates.visibility;
            if (updates.markerType) marker.markerType = updates.markerType;
            
            marker.updatedAt = new Date();
            await marker.save();

            ctx.send(connection.ws, {
                type: 'marker_updated',
                data: {
                    markerId: marker.markerId,
                    updates: {
                        x: marker.x,
                        y: marker.y,
                        label: marker.label,
                        description: marker.description,
                        iconType: marker.iconType,
                        color: marker.color,
                        visibility: marker.visibility
                    }
                },
                timestamp: Date.now()
            });

            // Broadcast update if shared
            if (marker.visibility !== 'private') {
                await MapMarkerHandlers.broadcastMarkerUpdate(
                    connection, 
                    marker, 
                    'marker_updated', 
                    ctx
                );
            }

        } catch (error) {
            console.error('Error updating marker:', error);
            ctx.sendError(connection, 'Failed to update marker');
        }
    }

    // =========================================================================
    // DELETE MARKER
    // =========================================================================

    static async handleDeleteMarker(
        connection: PlayerConnection,
        data: { markerId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const { markerId } = data;

            const marker = await MapMarker.findOne({ 
                markerId, 
                playerId: connection.playerId 
            });

            if (!marker) {
                ctx.sendError(connection, 'Marker not found or not owned');
                return;
            }

            const wasShared = marker.visibility !== 'private';
            const realm = marker.realm;
            
            await marker.deleteOne();

            ctx.send(connection.ws, {
                type: 'marker_deleted',
                data: { markerId },
                timestamp: Date.now()
            });

            // Broadcast deletion if was shared
            if (wasShared) {
                await MapMarkerHandlers.broadcastMarkerRemoval(
                    connection, 
                    markerId, 
                    realm, 
                    ctx
                );
            }

        } catch (error) {
            console.error('Error deleting marker:', error);
            ctx.sendError(connection, 'Failed to delete marker');
        }
    }

    // =========================================================================
    // SHARE MARKER
    // =========================================================================

    static async handleShareMarker(
        connection: PlayerConnection,
        data: { markerId: string; targetPlayerId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const { markerId, targetPlayerId } = data;

            // Verify ownership
            const marker = await MapMarker.findOne({ 
                markerId, 
                playerId: connection.playerId 
            });

            if (!marker) {
                ctx.sendError(connection, 'Marker not found or not owned');
                return;
            }

            // Check shared limit
            if (marker.sharedWith.length >= LIMITS.MAX_SHARED_MARKERS) {
                ctx.sendError(connection, 'Maximum shares reached for this marker');
                return;
            }

            // Create share invite
            const inviteId = `invite_${uuidv4()}`;
            await MarkerShareInvite.create({
                inviteId,
                markerId,
                fromPlayerId: connection.playerId,
                fromPlayerName: connection.playerName,
                toPlayerId: targetPlayerId,
                status: 'pending'
            });

            // Notify target player if online
            const targetConn = ctx.connections.get(targetPlayerId);
            if (targetConn) {
                ctx.send(targetConn.ws, {
                    type: 'marker_share_invite',
                    data: {
                        inviteId,
                        markerId,
                        fromPlayerId: connection.playerId,
                        fromPlayerName: connection.playerName,
                        markerLabel: marker.label,
                        realm: marker.realm
                    },
                    timestamp: Date.now()
                });
            }

            ctx.send(connection.ws, {
                type: 'marker_share_sent',
                data: { inviteId, targetPlayerId },
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error sharing marker:', error);
            ctx.sendError(connection, 'Failed to share marker');
        }
    }

    // =========================================================================
    // ACCEPT/DECLINE SHARE INVITE
    // =========================================================================

    static async handleAcceptShareInvite(
        connection: PlayerConnection,
        data: { inviteId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const invite = await MarkerShareInvite.findOneAndUpdate(
                { 
                    inviteId: data.inviteId, 
                    toPlayerId: connection.playerId,
                    status: 'pending'
                },
                { status: 'accepted' },
                { new: true }
            );

            if (!invite) {
                ctx.sendError(connection, 'Invite not found or already processed');
                return;
            }

            // Add player to marker's sharedWith
            await MapMarker.findOneAndUpdate(
                { markerId: invite.markerId },
                { $addToSet: { sharedWith: connection.playerId } }
            );

            // Notify sharer
            const sharerConn = ctx.connections.get(invite.fromPlayerId);
            if (sharerConn) {
                ctx.send(sharerConn.ws, {
                    type: 'marker_share_accepted',
                    data: {
                        inviteId: invite.inviteId,
                        markerId: invite.markerId,
                        acceptedBy: connection.playerId,
                        acceptedByName: connection.playerName
                    },
                    timestamp: Date.now()
                });
            }

            ctx.send(connection.ws, {
                type: 'share_invite_accepted',
                data: { markerId: invite.markerId },
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error accepting share invite:', error);
            ctx.sendError(connection, 'Failed to accept invite');
        }
    }

    static async handleDeclineShareInvite(
        connection: PlayerConnection,
        data: { inviteId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const invite = await MarkerShareInvite.findOneAndUpdate(
                { 
                    inviteId: data.inviteId, 
                    toPlayerId: connection.playerId,
                    status: 'pending'
                },
                { status: 'declined' },
                { new: true }
            );

            if (!invite) {
                ctx.sendError(connection, 'Invite not found');
                return;
            }

            ctx.send(connection.ws, {
                type: 'share_invite_declined',
                data: { inviteId: invite.inviteId },
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error declining share invite:', error);
            ctx.sendError(connection, 'Failed to decline invite');
        }
    }

    // =========================================================================
    // MARKER PRESETS
    // =========================================================================

    static async handleSavePreset(
        connection: PlayerConnection,
        data: { name: string; iconType: string; color: string; defaultVisibility?: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const presetCount = await MarkerPreset.countDocuments({ playerId: connection.playerId });
            if (presetCount >= LIMITS.MAX_PRESETS) {
                ctx.sendError(connection, `Maximum ${LIMITS.MAX_PRESETS} presets allowed`);
                return;
            }

            const presetId = `preset_${uuidv4()}`;
            await MarkerPreset.create({
                playerId: connection.playerId,
                presetId,
                name: data.name.slice(0, 30),
                iconType: data.iconType,
                color: data.color,
                defaultVisibility: data.defaultVisibility || 'private'
            });

            ctx.send(connection.ws, {
                type: 'preset_saved',
                data: { presetId, name: data.name },
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error saving preset:', error);
            ctx.sendError(connection, 'Failed to save preset');
        }
    }

    static async handleGetPresets(
        connection: PlayerConnection,
        _data: any,
        ctx: HandlerContext
    ): Promise<void> {
        try {
            const presets = await MarkerPreset.find({ playerId: connection.playerId }).lean();

            ctx.send(connection.ws, {
                type: 'presets_list',
                data: {
                    presets: presets.map(p => ({
                        presetId: p.presetId,
                        name: p.name,
                        iconType: p.iconType,
                        color: p.color,
                        defaultVisibility: p.defaultVisibility
                    }))
                },
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error getting presets:', error);
            ctx.sendError(connection, 'Failed to get presets');
        }
    }

    static async handleDeletePreset(
        connection: PlayerConnection,
        data: { presetId: string },
        ctx: HandlerContext
    ): Promise<void> {
        try {
            await MarkerPreset.deleteOne({ 
                playerId: connection.playerId, 
                presetId: data.presetId 
            });

            ctx.send(connection.ws, {
                type: 'preset_deleted',
                data: { presetId: data.presetId },
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error deleting preset:', error);
            ctx.sendError(connection, 'Failed to delete preset');
        }
    }

    // =========================================================================
    // BROADCASTING HELPERS
    // =========================================================================

    private static async broadcastMarkerUpdate(
        connection: PlayerConnection,
        marker: any,
        eventType: string,
        ctx: HandlerContext
    ): Promise<void> {
        const targetPlayerIds = new Set<string>();

        // Add directly shared players
        for (const playerId of marker.sharedWith) {
            targetPlayerIds.add(playerId);
        }

        // Add friends if visibility is friends
        if (marker.visibility === 'friends' || marker.visibility === 'public') {
            const friends = await friendshipService.getFriends(connection.playerId);
            for (const friend of friends) {
                targetPlayerIds.add(friend.friendId);
            }
        }

        // Add constellation members if visibility is constellation
        if (marker.visibility === 'constellation') {
            const constellations = await constellationService.getPlayerConstellations(connection.playerId);
            if (constellations && constellations.length > 0) {
                const constellation = constellations[0];
                for (const memberId of constellation.playerIds) {
                    if (memberId !== connection.playerId) {
                        targetPlayerIds.add(memberId);
                    }
                }
            }
        }

        // Broadcast to all in same realm
        for (const playerId of targetPlayerIds) {
            const targetConn = ctx.connections.get(playerId);
            if (targetConn && targetConn.realm === marker.realm) {
                ctx.send(targetConn.ws, {
                    type: eventType,
                    data: {
                        marker: {
                            markerId: marker.markerId,
                            playerId: marker.playerId,
                            playerName: marker.playerName,
                            x: marker.x,
                            y: marker.y,
                            label: marker.label,
                            iconType: marker.iconType,
                            color: marker.color,
                            visibility: marker.visibility
                        }
                    },
                    timestamp: Date.now()
                });
            }
        }
    }

    private static async broadcastMarkerRemoval(
        connection: PlayerConnection,
        markerId: string,
        realm: string,
        ctx: HandlerContext
    ): Promise<void> {
        // Broadcast to all players in the same realm
        for (const [, targetConn] of ctx.connections) {
            if (targetConn.realm === realm && targetConn.playerId !== connection.playerId) {
                ctx.send(targetConn.ws, {
                    type: 'marker_removed',
                    data: { markerId },
                    timestamp: Date.now()
                });
            }
        }
    }
}
