// MongoDB-backed persistence service for AURA
// Replaces file-based persistence with proper database storage

import { database, Echo, Message, LitStar, Player, Friendship } from '../database';
// IEcho, IMessage, IPlayer reserved for future type guards
import type { IEcho as _IEcho, IMessage as _IMessage, IPlayer as _IPlayer, IFriendship as _IFriendship } from '../database';

interface EchoData {
    id: string;
    x: number;
    y: number;
    text: string;
    hue: number;
    name: string;
    realm: string;
    timestamp: number;
    authorId?: string;
    votes?: number;
}

interface MessageData {
    id: string;
    fromId: string;
    fromName: string;
    toId?: string;
    toName?: string;
    text: string;
    x: number;
    y: number;
    realm: string;
    type: 'whisper' | 'broadcast' | 'system';
    timestamp: number;
}

interface PlayerData {
    id: string;
    name: string;
    hue: number;
    xp: number;
    level: number;
    stars: number;
    echoesCreated: number;
    sings: number;
    pulses: number;
    emotes: number;
    teleports: number;
    whispersSent: number;
    connections: number;
    achievements: string[];
    settings?: {
        musicEnabled: boolean;
        volume: number;
        particlesEnabled: boolean;
        screenShake: boolean;
    };
    lastRealm?: string;
    lastPosition?: { x: number; y: number };
}

/**
 * MongoDB-backed persistence service
 * Provides async methods for storing and retrieving game data
 */
export class MongoPersistenceService {
    private initialized: boolean = false;

    /**
     * Initialize the persistence service
     * Attempts connection once - local MongoDB should work immediately or not at all
     */
    async init(mongoUri: string, dbName: string = 'aura'): Promise<void> {
        if (this.initialized) {
            console.log('💾 MongoDB persistence already initialized');
            return;
        }

        await database.connect({
            uri: mongoUri,
            dbName,
            maxRetries: 3,
            retryDelay: 1000
        });

        this.initialized = true;
        console.log('💾 MongoDB persistence service ready');
    }

    /**
     * Check if service is ready
     */
    isReady(): boolean {
        return this.initialized && database.getConnectionStatus();
    }

    /**
     * Shutdown the service
     */
    async shutdown(): Promise<void> {
        await database.disconnect();
        this.initialized = false;
        console.log('💾 MongoDB persistence service shut down');
    }

    // ============================================
    // ECHOES
    // ============================================

    /**
     * Create a new echo
     */
    async createEcho(data: EchoData): Promise<EchoData> {
        const echo = new Echo({
            echoId: data.id,
            x: data.x,
            y: data.y,
            text: data.text,
            hue: data.hue,
            authorId: data.authorId || 'anonymous',
            authorName: data.name,
            realm: data.realm,
            votes: data.votes || 0,
            ignited: 0
        });

        await echo.save();
        console.log(`📢 Echo created: "${data.text.substring(0, 30)}..." in ${data.realm}`);

        return {
            id: echo.echoId,
            x: echo.x,
            y: echo.y,
            text: echo.text,
            hue: echo.hue,
            name: echo.authorName,
            realm: echo.realm,
            timestamp: echo.createdAt.getTime(),
            authorId: echo.authorId,
            votes: echo.votes
        };
    }

    /**
     * Get echoes for a specific realm
     */
    async getEchoes(realm: string, limit: number = 500): Promise<EchoData[]> {
        const echoes = await Echo.find({ realm })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return echoes.map((e: any) => ({
            id: e.echoId,
            x: e.x,
            y: e.y,
            text: e.text,
            hue: e.hue,
            name: e.authorName,
            realm: e.realm,
            timestamp: e.createdAt.getTime(),
            authorId: e.authorId,
            votes: e.votes
        }));
    }

    /**
     * Get echoes near a position (within radius)
     */
    async getEchoesNear(realm: string, x: number, y: number, radius: number): Promise<EchoData[]> {
        const echoes = await Echo.find({
            realm,
            x: { $gte: x - radius, $lte: x + radius },
            y: { $gte: y - radius, $lte: y + radius }
        }).lean();

        return echoes.map((e: any) => ({
            id: e.echoId,
            x: e.x,
            y: e.y,
            text: e.text,
            hue: e.hue,
            name: e.authorName,
            realm: e.realm,
            timestamp: e.createdAt.getTime(),
            authorId: e.authorId,
            votes: e.votes
        }));
    }

    /**
     * Vote on an echo (positive = upvote, negative = downvote)
     */
    async voteEcho(echoId: string, delta: number): Promise<number> {
        const result = await Echo.findOneAndUpdate(
            { echoId },
            { $inc: { votes: delta } },
            { new: true }
        );
        return result?.votes || 0;
    }

    /**
     * Delete an echo
     */
    async deleteEcho(echoId: string): Promise<boolean> {
        const result = await Echo.deleteOne({ echoId });
        return result.deletedCount > 0;
    }

    /**
     * Increment echo ignited count
     */
    async igniteEcho(echoId: string): Promise<number> {
        const result = await Echo.findOneAndUpdate(
            { echoId },
            { $inc: { ignited: 1 } },
            { new: true }
        );
        return result?.ignited || 0;
    }

    /**
     * Get echo count per realm
     */
    async getEchoStats(): Promise<Record<string, number>> {
        const stats = await Echo.aggregate([
            { $group: { _id: '$realm', count: { $sum: 1 } } }
        ]);

        const result: Record<string, number> = {};
        for (const stat of stats) {
            result[stat._id] = stat.count;
        }
        return result;
    }

    // ============================================
    // MESSAGES
    // ============================================

    /**
     * Save a message/whisper
     */
    async saveMessage(data: MessageData): Promise<MessageData> {
        const message = new Message({
            messageId: data.id,
            fromId: data.fromId,
            fromName: data.fromName,
            toId: data.toId,
            toName: data.toName,
            text: data.text,
            x: data.x,
            y: data.y,
            realm: data.realm,
            type: data.type,
            delivered: false
        });

        await message.save();
        return {
            ...data,
            timestamp: message.createdAt.getTime()
        };
    }

    /**
     * Get message history for a player
     */
    async getMessageHistory(playerId: string, limit: number = 50): Promise<MessageData[]> {
        const messages = await Message.find({
            $or: [{ fromId: playerId }, { toId: playerId }]
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return messages.map(m => ({
            id: m.messageId,
            fromId: m.fromId,
            fromName: m.fromName,
            toId: m.toId,
            toName: m.toName,
            text: m.text,
            x: m.x,
            y: m.y,
            realm: m.realm,
            type: m.type,
            timestamp: m.createdAt.getTime()
        }));
    }

    /**
     * Get conversation between two players
     */
    async getConversation(player1Id: string, player2Id: string, limit: number = 50): Promise<MessageData[]> {
        const messages = await Message.find({
            $or: [
                { fromId: player1Id, toId: player2Id },
                { fromId: player2Id, toId: player1Id }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return messages.map((m: any) => ({
            id: m.messageId,
            fromId: m.fromId,
            fromName: m.fromName,
            toId: m.toId,
            toName: m.toName,
            text: m.text,
            x: m.x,
            y: m.y,
            realm: m.realm,
            type: m.type,
            timestamp: m.createdAt.getTime()
        }));
    }

    /**
     * Mark messages as delivered
     */
    async markMessagesDelivered(messageIds: string[]): Promise<void> {
        await Message.updateMany(
            { messageId: { $in: messageIds } },
            { delivered: true }
        );
    }

    /**
     * Get undelivered messages for a player
     */
    async getUndeliveredMessages(playerId: string): Promise<MessageData[]> {
        const messages = await Message.find({
            toId: playerId,
            delivered: false
        })
            .sort({ createdAt: 1 })
            .lean();

        return messages.map((m: any) => ({
            id: m.messageId,
            fromId: m.fromId,
            fromName: m.fromName,
            toId: m.toId,
            toName: m.toName,
            text: m.text,
            x: m.x,
            y: m.y,
            realm: m.realm,
            type: m.type,
            timestamp: m.createdAt.getTime()
        }));
    }

    // ============================================
    // LIT STARS
    // ============================================

    /**
     * Mark a star as lit
     */
    async litStar(starId: string, realm: string, playerId: string): Promise<void> {
        await LitStar.findOneAndUpdate(
            { starId },
            { starId, realm, litBy: playerId, litAt: new Date() },
            { upsert: true }
        );
    }

    /**
     * Check if a star is lit
     */
    async isStarLit(starId: string): Promise<boolean> {
        const star = await LitStar.findOne({ starId }).lean();
        return !!star;
    }

    /**
     * Get all lit stars for a realm
     */
    async getLitStars(realm?: string): Promise<string[]> {
        const query = realm ? { realm } : {};
        const stars = await LitStar.find(query).select('starId').lean();
        return stars.map((s: any) => s.starId);
    }

    /**
     * Get lit star count
     */
    async getLitStarCount(realm?: string): Promise<number> {
        const query = realm ? { realm } : {};
        return await LitStar.countDocuments(query);
    }

    // ============================================
    // PLAYER DATA
    // ============================================

    /**
     * Get or create player
     */
    async getOrCreatePlayer(playerId: string, name?: string): Promise<PlayerData> {
        let player: any = await Player.findOne({ playerId: playerId }).lean();

        if (!player) {
            const newPlayer = new Player({
                playerId: playerId,
                name: name || 'Wanderer',
                hue: Math.floor(Math.random() * 360),
                xp: 0,
                level: 1,
                stars: 0,
                echoesCreated: 0,
                sings: 0,
                pulses: 0,
                emotes: 0,
                teleports: 0,
                whispersSent: 0,
                connections: 0,
                achievements: [],
                lastSeen: new Date()
            });
            await newPlayer.save();
            player = newPlayer.toObject();
        }

        return {
            id: player.playerId,
            name: player.name,
            hue: player.hue,
            xp: player.xp,
            level: player.level,
            stars: player.stars,
            echoesCreated: player.echoesCreated,
            sings: player.sings || 0,
            pulses: player.pulses || 0,
            emotes: player.emotes || 0,
            teleports: player.teleports || 0,
            whispersSent: player.whispersSent,
            connections: player.connections,
            achievements: player.achievements,
            settings: player.settings,
            lastRealm: player.lastRealm,
            lastPosition: player.lastPosition
        };
    }

    /**
     * Update player data
     */
    async updatePlayer(playerId: string, updates: Partial<PlayerData>): Promise<void> {
        const updateData: any = { lastSeen: new Date() };

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.hue !== undefined) updateData.hue = updates.hue;
        if (updates.xp !== undefined) updateData.xp = updates.xp;
        if (updates.level !== undefined) updateData.level = updates.level;
        if (updates.stars !== undefined) updateData.stars = updates.stars;
        if (updates.echoesCreated !== undefined) updateData.echoesCreated = updates.echoesCreated;
        if (updates.sings !== undefined) updateData.sings = updates.sings;
        if (updates.pulses !== undefined) updateData.pulses = updates.pulses;
        if (updates.emotes !== undefined) updateData.emotes = updates.emotes;
        if (updates.teleports !== undefined) updateData.teleports = updates.teleports;
        if (updates.whispersSent !== undefined) updateData.whispersSent = updates.whispersSent;
        if (updates.connections !== undefined) updateData.connections = updates.connections;
        if (updates.achievements !== undefined) updateData.achievements = updates.achievements;
        if (updates.settings !== undefined) updateData.settings = updates.settings;
        if (updates.lastRealm !== undefined) updateData.lastRealm = updates.lastRealm;
        if (updates.lastPosition !== undefined) updateData.lastPosition = updates.lastPosition;

        await Player.findOneAndUpdate(
            { playerId: playerId },
            updateData,
            { upsert: true }
        );
    }

    /**
     * Increment player stats
     */
    async incrementPlayerStats(playerId: string, stats: {
        xp?: number;
        stars?: number;
        echoesCreated?: number;
        sings?: number;
        pulses?: number;
        emotes?: number;
        teleports?: number;
        whispersSent?: number;
        connections?: number;
    }): Promise<void> {
        const inc: any = {};
        if (stats.xp) inc.xp = stats.xp;
        if (stats.stars) inc.stars = stats.stars;
        if (stats.echoesCreated) inc.echoesCreated = stats.echoesCreated;
        if (stats.sings) inc.sings = stats.sings;
        if (stats.pulses) inc.pulses = stats.pulses;
        if (stats.emotes) inc.emotes = stats.emotes;
        if (stats.teleports) inc.teleports = stats.teleports;
        if (stats.whispersSent) inc.whispersSent = stats.whispersSent;
        if (stats.connections) inc.connections = stats.connections;

        await Player.findOneAndUpdate(
            { playerId: playerId },
            { $inc: inc, lastSeen: new Date() }
        );
    }

    /**
     * Add achievement to player
     */
    async addAchievement(playerId: string, achievementId: string): Promise<void> {
        await Player.findOneAndUpdate(
            { playerId: playerId },
            { $addToSet: { achievements: achievementId } }
        );
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(sortBy: 'xp' | 'stars' | 'echoesCreated' = 'xp', limit: number = 10): Promise<PlayerData[]> {
        const sortField = sortBy === 'echoesCreated' ? 'echoesCreated' : sortBy;
        const players = await Player.find()
            .sort({ [sortField]: -1 })
            .limit(limit)
            .lean();

        return players.map((p: any) => ({
            id: p.playerId,
            name: p.name,
            hue: p.hue,
            xp: p.xp,
            level: p.level,
            stars: p.stars,
            echoesCreated: p.echoesCreated,
            sings: p.sings || 0,
            pulses: p.pulses || 0,
            emotes: p.emotes || 0,
            teleports: p.teleports || 0,
            whispersSent: p.whispersSent,
            connections: p.connections,
            achievements: p.achievements
        }));
    }

    // ============================================
    // FRIENDS SYSTEM
    // ============================================

    /**
     * Add a friend relationship
     */
    async addFriend(playerId: string, friendId: string, friendName: string): Promise<boolean> {
        try {
            await Friendship.findOneAndUpdate(
                { playerId, friendId },
                { playerId, friendId, friendName },
                { upsert: true }
            );
            console.log(`👥 ${playerId} added ${friendName} as friend`);
            return true;
        } catch (error) {
            console.error('Failed to add friend:', error);
            return false;
        }
    }

    /**
     * Remove a friend relationship
     */
    async removeFriend(playerId: string, friendId: string): Promise<boolean> {
        try {
            const result = await Friendship.deleteOne({ playerId, friendId });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Failed to remove friend:', error);
            return false;
        }
    }

    /**
     * Get all friends for a player
     */
    async getFriends(playerId: string): Promise<{ friendId: string; friendName: string }[]> {
        try {
            const friends = await Friendship.find({ playerId }).lean();
            return friends.map((f: any) => ({
                friendId: f.friendId,
                friendName: f.friendName
            }));
        } catch (error) {
            console.error('Failed to get friends:', error);
            return [];
        }
    }

    /**
     * Check if two players are friends
     */
    async areFriends(playerId: string, friendId: string): Promise<boolean> {
        try {
            const friendship = await Friendship.findOne({ playerId, friendId }).lean();
            return !!friendship;
        } catch (error) {
            console.error('Failed to check friendship:', error);
            return false;
        }
    }

    /**
     * Batch light multiple stars
     */
    async litStarsBatch(starIds: string[], realm: string, playerId: string): Promise<number> {
        try {
            const operations = starIds.map(starId => ({
                updateOne: {
                    filter: { starId },
                    update: { starId, realm, litBy: playerId, litAt: new Date() },
                    upsert: true
                }
            }));
            const result = await LitStar.bulkWrite(operations);
            return result.upsertedCount + result.modifiedCount;
        } catch (error) {
            console.error('Failed to batch light stars:', error);
            return 0;
        }
    }
}

// Export singleton instance
export const mongoPersistence = new MongoPersistenceService();
export default mongoPersistence;
