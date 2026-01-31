// Friendship Service - Manages friends, friend requests, and blocks
// Enhances the existing Friendship model in models.ts

import { FriendRequest, IFriendRequest, BlockedPlayer, IBlockedPlayer } from '../database/socialModels.js';
import { Friendship } from '../database/models.js';
import crypto from 'crypto';

function generateRequestId(): string {
    return 'req_' + crypto.randomBytes(6).toString('hex');
}

export interface FriendInfo {
    friendId: string;
    friendName: string;
    addedAt: Date;
}

export class FriendshipService {
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('👥 Friendship service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    // ========================================
    // FRIEND REQUESTS
    // ========================================

    async sendFriendRequest(fromPlayerId: string, fromPlayerName: string, toPlayerId: string, message?: string): Promise<{
        success: boolean;
        requestId?: string;
        error?: string;
    }> {
        // Can't friend yourself
        if (fromPlayerId === toPlayerId) {
            return { success: false, error: 'Cannot send friend request to yourself' };
        }

        // Check if already friends
        const existingFriendship = await Friendship.findOne({
            $or: [
                { playerId: fromPlayerId, friendId: toPlayerId },
                { playerId: toPlayerId, friendId: fromPlayerId }
            ]
        });
        if (existingFriendship) {
            return { success: false, error: 'Already friends with this player' };
        }

        // Check if blocked
        const isBlocked = await this.isBlocked(toPlayerId, fromPlayerId);
        if (isBlocked) {
            return { success: false, error: 'Cannot send friend request to this player' };
        }

        // Check for existing pending request
        const existingRequest = await FriendRequest.findOne({
            fromPlayerId,
            toPlayerId,
            status: 'pending'
        });
        if (existingRequest) {
            return { success: false, error: 'Friend request already pending' };
        }

        // Check if they sent us a request (auto-accept)
        const reverseRequest = await FriendRequest.findOne({
            fromPlayerId: toPlayerId,
            toPlayerId: fromPlayerId,
            status: 'pending'
        });
        if (reverseRequest) {
            // Accept their request instead
            return this.acceptFriendRequest(fromPlayerId, reverseRequest.requestId);
        }

        // Create new request
        const requestId = generateRequestId();
        const request = new FriendRequest({
            requestId,
            fromPlayerId,
            fromPlayerName,
            toPlayerId,
            message: message || null,
            status: 'pending'
        });
        await request.save();

        return { success: true, requestId };
    }

    async acceptFriendRequest(playerId: string, requestId: string): Promise<{
        success: boolean;
        friendId?: string;
        error?: string;
    }> {
        const request = await FriendRequest.findOne({
            requestId,
            toPlayerId: playerId,
            status: 'pending'
        });

        if (!request) {
            return { success: false, error: 'Friend request not found' };
        }

        // Update request status
        request.status = 'accepted';
        request.respondedAt = new Date();
        await request.save();

        // Create bidirectional friendship
        await Friendship.findOneAndUpdate(
            { playerId: request.fromPlayerId, friendId: playerId },
            { playerId: request.fromPlayerId, friendId: playerId, friendName: 'Friend' },
            { upsert: true }
        );
        await Friendship.findOneAndUpdate(
            { playerId, friendId: request.fromPlayerId },
            { playerId, friendId: request.fromPlayerId, friendName: request.fromPlayerName },
            { upsert: true }
        );

        return { success: true, friendId: request.fromPlayerId };
    }

    async declineFriendRequest(playerId: string, requestId: string): Promise<boolean> {
        const result = await FriendRequest.findOneAndUpdate(
            { requestId, toPlayerId: playerId, status: 'pending' },
            { $set: { status: 'declined', respondedAt: new Date() } }
        );
        return !!result;
    }

    async cancelFriendRequest(playerId: string, requestId: string): Promise<boolean> {
        const result = await FriendRequest.deleteOne({
            requestId,
            fromPlayerId: playerId,
            status: 'pending'
        });
        return result.deletedCount > 0;
    }

    async getPendingRequests(playerId: string): Promise<IFriendRequest[]> {
        return FriendRequest.find({
            toPlayerId: playerId,
            status: 'pending'
        }).sort({ createdAt: -1 });
    }

    async getSentRequests(playerId: string): Promise<IFriendRequest[]> {
        return FriendRequest.find({
            fromPlayerId: playerId,
            status: 'pending'
        }).sort({ createdAt: -1 });
    }

    // ========================================
    // FRIENDS MANAGEMENT
    // ========================================

    async getFriends(playerId: string): Promise<FriendInfo[]> {
        const friendships = await Friendship.find({ playerId }).lean();
        return friendships.map((f: any) => ({
            friendId: f.friendId,
            friendName: f.friendName,
            addedAt: f.createdAt || new Date()
        }));
    }

    async getFriendCount(playerId: string): Promise<number> {
        return Friendship.countDocuments({ playerId });
    }

    async areFriends(playerId1: string, playerId2: string): Promise<boolean> {
        const friendship = await Friendship.findOne({
            playerId: playerId1,
            friendId: playerId2
        });
        return !!friendship;
    }

    async removeFriend(playerId: string, friendId: string): Promise<boolean> {
        // Remove both directions
        const result1 = await Friendship.deleteOne({ playerId, friendId });
        const result2 = await Friendship.deleteOne({ playerId: friendId, friendId: playerId });
        return result1.deletedCount > 0 || result2.deletedCount > 0;
    }

    async updateFriendName(playerId: string, friendId: string, newName: string): Promise<boolean> {
        const result = await Friendship.findOneAndUpdate(
            { playerId, friendId },
            { $set: { friendName: newName } }
        );
        return !!result;
    }

    // ========================================
    // BLOCKING
    // ========================================

    async blockPlayer(playerId: string, blockedPlayerId: string, reason?: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        if (playerId === blockedPlayerId) {
            return { success: false, error: 'Cannot block yourself' };
        }

        // Remove any existing friendship
        await this.removeFriend(playerId, blockedPlayerId);

        // Cancel any pending friend requests
        await FriendRequest.deleteMany({
            $or: [
                { fromPlayerId: playerId, toPlayerId: blockedPlayerId },
                { fromPlayerId: blockedPlayerId, toPlayerId: playerId }
            ]
        });

        // Create block record
        await BlockedPlayer.findOneAndUpdate(
            { playerId, blockedPlayerId },
            { playerId, blockedPlayerId, reason, blockedAt: new Date() },
            { upsert: true }
        );

        return { success: true };
    }

    async unblockPlayer(playerId: string, blockedPlayerId: string): Promise<boolean> {
        const result = await BlockedPlayer.deleteOne({ playerId, blockedPlayerId });
        return result.deletedCount > 0;
    }

    async isBlocked(playerId: string, otherPlayerId: string): Promise<boolean> {
        const block = await BlockedPlayer.findOne({
            playerId,
            blockedPlayerId: otherPlayerId
        });
        return !!block;
    }

    async getBlockedPlayers(playerId: string): Promise<IBlockedPlayer[]> {
        return BlockedPlayer.find({ playerId });
    }

    async getBlockedByPlayers(playerId: string): Promise<string[]> {
        const blocks = await BlockedPlayer.find({ blockedPlayerId: playerId });
        return blocks.map(b => b.playerId);
    }

    // ========================================
    // MUTUAL FRIENDS
    // ========================================

    async getMutualFriends(playerId1: string, playerId2: string): Promise<string[]> {
        const friends1 = await Friendship.find({ playerId: playerId1 }).distinct('friendId');
        const friends2 = await Friendship.find({ playerId: playerId2 }).distinct('friendId');

        const set1 = new Set(friends1);
        return friends2.filter((f: string) => set1.has(f));
    }

    async getMutualFriendCount(playerId1: string, playerId2: string): Promise<number> {
        const mutual = await this.getMutualFriends(playerId1, playerId2);
        return mutual.length;
    }

    // ========================================
    // FRIEND SUGGESTIONS
    // ========================================

    async getFriendSuggestions(playerId: string, limit: number = 10): Promise<{
        playerId: string;
        mutualCount: number;
        source: 'mutual' | 'recent' | 'popular';
    }[]> {
        // Get player's friends
        const friendIds = await Friendship.find({ playerId }).distinct('friendId');
        const friendSet = new Set(friendIds);
        friendSet.add(playerId); // Exclude self

        // Get friends of friends
        const friendsOfFriends: Record<string, number> = {};

        for (const friendId of friendIds) {
            const fof = await Friendship.find({ playerId: friendId }).distinct('friendId');
            for (const f of fof) {
                if (!friendSet.has(f)) {
                    friendsOfFriends[f] = (friendsOfFriends[f] || 0) + 1;
                }
            }
        }

        // Sort by mutual friend count
        const suggestions = Object.entries(friendsOfFriends)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([id, count]) => ({
                playerId: id,
                mutualCount: count,
                source: 'mutual' as const
            }));

        return suggestions;
    }

    // ========================================
    // ONLINE STATUS
    // ========================================

    async getOnlineFriends(playerId: string, onlinePlayerIds: Set<string>): Promise<string[]> {
        const friends = await this.getFriends(playerId);
        return friends
            .filter(f => onlinePlayerIds.has(f.friendId))
            .map(f => f.friendId);
    }

    // ========================================
    // BONDING (Server-Authoritative)
    // ========================================

    async formBond(playerId: string, targetId: string): Promise<{ success: boolean; bond?: any; error?: string }> {
        if (playerId === targetId) return { success: false, error: 'Cannot bond with yourself' };

        // Check blocking
        if (await this.isBlocked(playerId, targetId) || await this.isBlocked(targetId, playerId)) {
            return { success: false, error: 'Cannot bond with blocked player' };
        }

        // Check if friends (optional requirement?)
        // For now, we allow bonding regardless of friend status, but maybe we require it?

        // In a real DB we would store bonds. For now, we rely on the in-memory WebSocketHandler state 
        // to track active ephemeral bonds, or we could persist "Soul Bonds" here.
        // Let's assume this is for PERMANENT/SEALED bonds logic.

        // Determine if bond already exists
        const existingFriendship = await Friendship.findOne({ playerId, friendId: targetId });

        return {
            success: true,
            bond: {
                id: `bond_${Date.now()}_${playerId}_${targetId}`,
                initiator: playerId,
                target: targetId,
                formedAt: Date.now(),
                strength: 0,
                sealed: false
            }
        };
    }

    async sealBond(playerId: string, bondId: string): Promise<{ success: boolean }> {
        // Logic to finalize a bond, maybe converting it to a high-tier friendship or marriage-like status
        return { success: true };
    }
}

// Export singleton
export const friendshipService = new FriendshipService();
export default friendshipService;
