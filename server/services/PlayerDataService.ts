// PlayerData Service - Comprehensive player state management
import { PlayerData, IPlayerData } from '../database/playerDataModel.js';
import { mongoPersistence } from './MongoPersistenceService.js';

// Default player data structure
const DEFAULT_PLAYER_DATA = {
    name: 'Wanderer',
    hue: 180,
    avatar: '⭐',
    xp: 0,
    level: 1,
    stardust: 0,
    lifetimeStardust: 0,
    seasonId: 'season_1',
    seasonXp: 0,
    seasonLevel: 0,
    seasonTier: 0,
    claimedSeasonRewards: [],
    dailyLoginStreak: 0,
    longestStreak: 0,
    totalLogins: 0,
    lastLoginDate: null,
    currentMonth: null,
    claimedDailyRewards: [],
    stats: {
        starsLit: 0,
        echoesCreated: 0,
        sings: 0,
        pulses: 0,
        emotes: 0,
        teleports: 0,
        whispersSent: 0,
        connections: 0,
        fragmentsCollected: 0,
        beaconsLit: 0,
        bondsFormed: 0,
        giftsGiven: 0,
        giftsReceived: 0,
        challengesCompleted: 0,
        weeklyChallengesCompleted: 0,
        questsCompleted: 0
    },
    achievements: [],
    cosmetics: {
        ownedItems: [],
        equippedTrail: null,
        equippedAura: null,
        equippedTitle: null,
        equippedEmotes: [],
        equippedPulseEffect: null
    },
    companions: {
        ownedIds: [],
        activeId: null,
        companionLevels: {},
        companionXp: {}
    },
    exploration: {
        discoveredAreas: [],
        visitedRealms: ['genesis'],
        totalDistance: 0,
        explorationPercent: 0,
        discoveries: []
    },
    communication: {
        chatHistory: [],
        signalPatterns: [],
        blockedPlayerIds: []
    },
    quests: {
        activeQuestIds: [],
        completedQuestIds: [],
        questProgress: {},
        dailyQuestDate: null,
        weeklyQuestDate: null
    },
    analytics: {
        totalPlaytime: 0,
        sessionsCount: 0,
        lastSessionStart: null,
        milestones: [],
        events: []
    },
    settings: {
        musicEnabled: true,
        soundEnabled: true,
        masterVolume: 70,
        musicVolume: 70,
        sfxVolume: 70,
        particlesEnabled: true,
        screenShake: true,
        reducedMotion: false,
        colorblindMode: null,
        highContrast: false,
        notifications: true,
        autoSave: true
    },
    anchoring: {
        breathingCompleted: 0,
        lastAnchorDate: null,
        preferredProvider: null,
        sessionHistory: []
    },
    social: {
        friendIds: [],
        blockedIds: [],
        guildId: null,
        pendingFriendRequests: []
    },
    gameState: {
        lastRealm: 'genesis',
        lastPosition: { x: 0, y: 0 },
        litBeacons: [],
        bonds: [],
        starMemories: []
    },
    media: {
        screenshots: [],
        recordings: []
    },
    leaderboard: {
        rankPoints: 0,
        weeklyXp: 0,
        weeklyWins: 0,
        monthlyXp: 0,
        peakRank: 'unranked'
    }
};

export class PlayerDataService {

    private initialized: boolean = false;
    private memoryStore: Map<string, IPlayerData> = new Map();

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('👤 PlayerData service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    private useMongo(): boolean {
        return mongoPersistence.isReady();
    }

    // ========================================
    // CORE CRUD OPERATIONS
    // ========================================

    async getPlayerData(playerId: string): Promise<IPlayerData | null> {
        if (this.useMongo()) {
            return PlayerData.findOne({ playerId });
        }
        return this.memoryStore.get(playerId) || null;
    }

    async getOrCreatePlayerData(playerId: string, initialName?: string): Promise<IPlayerData> {
        if (this.useMongo()) {
            let player = await PlayerData.findOne({ playerId });

            if (!player) {
                player = new PlayerData({
                    playerId,
                    ...DEFAULT_PLAYER_DATA,
                    name: initialName || DEFAULT_PLAYER_DATA.name,
                    lastSeen: new Date()
                });
                await player.save();
                console.log(`👤 Created new player data for ${playerId} (MongoDB)`);
            }
            return player;
        } else {
            // In-memory fallback
            let player = this.memoryStore.get(playerId);
            if (!player) {
                // Clone default data
                const now = new Date();
                player = {
                    ...JSON.parse(JSON.stringify(DEFAULT_PLAYER_DATA)),
                    playerId,
                    name: initialName || DEFAULT_PLAYER_DATA.name,
                    lastSeen: now,
                    createdAt: now,
                    updatedAt: now
                } as IPlayerData;
                // Type assertion needed because IPlayerData is Mongoose document
                this.memoryStore.set(playerId, player);
                console.log(`👤 Created new player data for ${playerId} (In-Memory)`);
            }
            return player;
        }
    }

    async updatePlayerData(playerId: string, updates: Partial<IPlayerData>): Promise<IPlayerData | null> {
        if (this.useMongo()) {
            return PlayerData.findOneAndUpdate(
                { playerId },
                { $set: { ...updates, lastSeen: new Date() } },
                { new: true, upsert: false }
            );
        } else {
            const player = this.memoryStore.get(playerId);
            if (!player) return null;

            const updated = {
                ...player,
                ...updates,
                lastSeen: new Date(),
                updatedAt: new Date()
            };
            this.memoryStore.set(playerId, updated as IPlayerData);
            return updated as IPlayerData;
        }
    }

    async deletePlayerData(playerId: string): Promise<boolean> {
        if (this.useMongo()) {
            const result = await PlayerData.deleteOne({ playerId });
            return result.deletedCount > 0;
        } else {
            return this.memoryStore.delete(playerId);
        }
    }

    // ========================================
    // PARTIAL UPDATES (for specific systems)
    // ========================================

    async updateProgression(playerId: string, data: {
        xp?: number;
        level?: number;
        stardust?: number;
        seasonXp?: number;
        seasonLevel?: number;
        seasonTier?: number;
    }): Promise<IPlayerData | null> {
        const updates: any = { lastSeen: new Date() };

        if (data.xp !== undefined) updates.xp = data.xp;
        if (data.level !== undefined) updates.level = data.level;
        if (data.stardust !== undefined) {
            updates.stardust = data.stardust;
            updates.$inc = { lifetimeStardust: Math.max(0, data.stardust) };
        }
        if (data.seasonXp !== undefined) updates.seasonXp = data.seasonXp;
        if (data.seasonLevel !== undefined) updates.seasonLevel = data.seasonLevel;
        if (data.seasonTier !== undefined) updates.seasonTier = data.seasonTier;

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async updateStats(playerId: string, statUpdates: Partial<IPlayerData['stats']>): Promise<IPlayerData | null> {
        const updates: any = {};
        for (const [key, value] of Object.entries(statUpdates)) {
            updates[`stats.${key}`] = value;
        }
        updates.lastSeen = new Date();

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async incrementStat(playerId: string, stat: keyof IPlayerData['stats'], amount: number = 1): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $inc: { [`stats.${stat}`]: amount },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    async updateSettings(playerId: string, settings: Partial<IPlayerData['settings']>): Promise<IPlayerData | null> {
        const updates: any = {};
        for (const [key, value] of Object.entries(settings)) {
            updates[`settings.${key}`] = value;
        }
        updates.lastSeen = new Date();

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async updateCosmetics(playerId: string, cosmetics: Partial<IPlayerData['cosmetics']>): Promise<IPlayerData | null> {
        const updates: any = {};
        for (const [key, value] of Object.entries(cosmetics)) {
            updates[`cosmetics.${key}`] = value;
        }
        updates.lastSeen = new Date();

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async addOwnedCosmetic(playerId: string, itemId: string): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $addToSet: { 'cosmetics.ownedItems': itemId },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    async updateCompanions(playerId: string, companions: Partial<IPlayerData['companions']>): Promise<IPlayerData | null> {
        const updates: any = {};
        for (const [key, value] of Object.entries(companions)) {
            updates[`companions.${key}`] = value;
        }
        updates.lastSeen = new Date();

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async addCompanion(playerId: string, companionId: string): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $addToSet: { 'companions.ownedIds': companionId },
                $set: {
                    [`companions.companionLevels.${companionId}`]: 1,
                    [`companions.companionXp.${companionId}`]: 0,
                    lastSeen: new Date()
                }
            },
            { new: true }
        );
    }

    async updateExploration(playerId: string, exploration: Partial<IPlayerData['exploration']>): Promise<IPlayerData | null> {
        const updates: any = {};
        for (const [key, value] of Object.entries(exploration)) {
            updates[`exploration.${key}`] = value;
        }
        updates.lastSeen = new Date();

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async addDiscovery(playerId: string, discovery: { id: string; type: string }): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $push: {
                    'exploration.discoveries': {
                        ...discovery,
                        timestamp: Date.now()
                    }
                },
                $addToSet: { 'exploration.discoveredAreas': discovery.id },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    async updateQuests(playerId: string, quests: Partial<IPlayerData['quests']>): Promise<IPlayerData | null> {
        const updates: any = {};
        for (const [key, value] of Object.entries(quests)) {
            updates[`quests.${key}`] = value;
        }
        updates.lastSeen = new Date();

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async updateQuestProgress(playerId: string, questId: string, progress: number): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $set: {
                    [`quests.questProgress.${questId}`]: progress,
                    lastSeen: new Date()
                }
            },
            { new: true }
        );
    }

    async completeQuest(playerId: string, questId: string): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $addToSet: { 'quests.completedQuestIds': questId },
                $pull: { 'quests.activeQuestIds': questId },
                $inc: { 'stats.questsCompleted': 1 },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    async updateAnchoring(playerId: string, anchoring: Partial<IPlayerData['anchoring']>): Promise<IPlayerData | null> {
        const updates: any = {};
        for (const [key, value] of Object.entries(anchoring)) {
            updates[`anchoring.${key}`] = value;
        }
        updates.lastSeen = new Date();

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async addAnchoringSession(playerId: string, session: { type: string; duration: number }): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $push: {
                    'anchoring.sessionHistory': {
                        $each: [{ ...session, timestamp: Date.now() }],
                        $slice: -100 // Keep last 100 sessions
                    }
                },
                $inc: { 'anchoring.breathingCompleted': 1 },
                $set: {
                    'anchoring.lastAnchorDate': new Date().toISOString().split('T')[0],
                    lastSeen: new Date()
                }
            },
            { new: true }
        );
    }

    async updateGameState(playerId: string, gameState: Partial<IPlayerData['gameState']>): Promise<IPlayerData | null> {
        const updates: any = {};
        for (const [key, value] of Object.entries(gameState)) {
            updates[`gameState.${key}`] = value;
        }
        updates.lastSeen = new Date();

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async addBond(playerId: string, bond: { targetId: string; strength: number; type: string }): Promise<IPlayerData | null> {
        // First remove existing bond with same target
        await PlayerData.updateOne(
            { playerId },
            { $pull: { 'gameState.bonds': { targetId: bond.targetId } } }
        );

        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $push: { 'gameState.bonds': bond },
                $inc: { 'stats.bondsFormed': 1 },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    async addStarMemory(playerId: string, memory: { starId: string; memory: string }): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $push: {
                    'gameState.starMemories': {
                        $each: [{ ...memory, timestamp: Date.now() }],
                        $slice: -50 // Keep last 50 memories
                    }
                },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    async updateLeaderboard(playerId: string, leaderboard: Partial<IPlayerData['leaderboard']>): Promise<IPlayerData | null> {
        const updates: any = {};
        for (const [key, value] of Object.entries(leaderboard)) {
            updates[`leaderboard.${key}`] = value;
        }
        updates.lastSeen = new Date();

        return PlayerData.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    async addRankPoints(playerId: string, points: number): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $inc: { 'leaderboard.rankPoints': points },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    // ========================================
    // ACHIEVEMENTS
    // ========================================

    async addAchievement(playerId: string, achievementId: string): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $addToSet: { achievements: achievementId },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    async hasAchievement(playerId: string, achievementId: string): Promise<boolean> {
        const player = await PlayerData.findOne({ playerId, achievements: achievementId });
        return !!player;
    }

    // ========================================
    // DAILY LOGIN
    // ========================================

    async processDailyLogin(playerId: string): Promise<{
        isNewDay: boolean;
        streak: number;
        rewards: { stardust: number; xp: number };
    }> {
        const player = await this.getOrCreatePlayerData(playerId);
        const today = new Date().toISOString().split('T')[0];

        if (player.lastLoginDate === today) {
            return { isNewDay: false, streak: player.dailyLoginStreak, rewards: { stardust: 0, xp: 0 } };
        }

        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const isConsecutive = player.lastLoginDate === yesterday;

        let newStreak = isConsecutive ? player.dailyLoginStreak + 1 : 1;
        const longestStreak = Math.max(player.longestStreak, newStreak);

        // Calculate rewards based on streak
        const baseStardust = 50;
        const baseXp = 25;
        const streakMultiplier = Math.min(newStreak, 7); // Cap at 7x

        const rewards = {
            stardust: baseStardust * streakMultiplier,
            xp: baseXp * streakMultiplier
        };

        await PlayerData.findOneAndUpdate(
            { playerId },
            {
                $set: {
                    lastLoginDate: today,
                    dailyLoginStreak: newStreak,
                    longestStreak
                },
                $inc: {
                    totalLogins: 1,
                    stardust: rewards.stardust,
                    xp: rewards.xp,
                    lifetimeStardust: rewards.stardust
                }
            }
        );

        return { isNewDay: true, streak: newStreak, rewards };
    }

    // ========================================
    // SOCIAL
    // ========================================

    async addFriend(playerId: string, friendId: string): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $addToSet: { 'social.friendIds': friendId },
                $pull: { 'social.pendingFriendRequests': friendId },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    async removeFriend(playerId: string, friendId: string): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $pull: { 'social.friendIds': friendId },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    async blockPlayer(playerId: string, blockedId: string): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $addToSet: { 'social.blockedIds': blockedId },
                $pull: { 'social.friendIds': blockedId },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    // ========================================
    // ANALYTICS
    // ========================================

    async trackSession(playerId: string, action: 'start' | 'end'): Promise<void> {
        if (action === 'start') {
            await PlayerData.findOneAndUpdate(
                { playerId },
                {
                    $set: { 'analytics.lastSessionStart': Date.now() },
                    $inc: { 'analytics.sessionsCount': 1 }
                }
            );
        } else {
            const player = await this.getPlayerData(playerId);
            if (player?.analytics.lastSessionStart) {
                const sessionDuration = Date.now() - player.analytics.lastSessionStart;
                await PlayerData.findOneAndUpdate(
                    { playerId },
                    {
                        $inc: { 'analytics.totalPlaytime': sessionDuration },
                        $set: { 'analytics.lastSessionStart': null }
                    }
                );
            }
        }
    }

    async addAnalyticsEvent(playerId: string, event: { type: string; data?: any }): Promise<void> {
        await PlayerData.findOneAndUpdate(
            { playerId },
            {
                $push: {
                    'analytics.events': {
                        $each: [{ ...event, timestamp: Date.now() }],
                        $slice: -500 // Keep last 500 events
                    }
                }
            }
        );
    }

    async addMilestone(playerId: string, milestoneId: string): Promise<IPlayerData | null> {
        return PlayerData.findOneAndUpdate(
            { playerId },
            {
                $addToSet: { 'analytics.milestones': milestoneId },
                $set: { lastSeen: new Date() }
            },
            { new: true }
        );
    }

    // ========================================
    // LEADERBOARDS
    // ========================================

    async getLeaderboard(type: 'xp' | 'stardust' | 'rankPoints' | 'challenges', limit: number = 50): Promise<any[]> {
        let sortField: string;
        switch (type) {
            case 'xp': sortField = 'xp'; break;
            case 'stardust': sortField = 'lifetimeStardust'; break;
            case 'rankPoints': sortField = 'leaderboard.rankPoints'; break;
            case 'challenges': sortField = 'stats.challengesCompleted'; break;
            default: sortField = 'xp';
        }

        const players = await PlayerData.find()
            .sort({ [sortField]: -1 })
            .limit(limit)
            .select('playerId name level xp stardust lifetimeStardust leaderboard stats.challengesCompleted')
            .lean();

        return players.map((p, i) => ({
            rank: i + 1,
            playerId: p.playerId,
            name: p.name,
            level: p.level,
            value: type === 'xp' ? p.xp :
                type === 'stardust' ? p.lifetimeStardust :
                    type === 'rankPoints' ? p.leaderboard?.rankPoints || 0 :
                        p.stats?.challengesCompleted || 0
        }));
    }

    async getPlayerRank(playerId: string, type: 'xp' | 'stardust' | 'rankPoints' | 'challenges'): Promise<number> {
        const player = await this.getPlayerData(playerId);
        if (!player) return -1;

        let field: string;
        let value: number;

        switch (type) {
            case 'xp':
                field = 'xp';
                value = player.xp;
                break;
            case 'stardust':
                field = 'lifetimeStardust';
                value = player.lifetimeStardust;
                break;
            case 'rankPoints':
                field = 'leaderboard.rankPoints';
                value = player.leaderboard?.rankPoints || 0;
                break;
            case 'challenges':
                field = 'stats.challengesCompleted';
                value = player.stats?.challengesCompleted || 0;
                break;
            default:
                return -1;
        }

        const count = await PlayerData.countDocuments({ [field]: { $gt: value } });
        return count + 1;
    }

    // ========================================
    // WEEKLY RESET
    // ========================================

    async resetWeeklyStats(): Promise<number> {
        const result = await PlayerData.updateMany(
            {},
            {
                $set: {
                    'leaderboard.weeklyXp': 0,
                    'leaderboard.weeklyWins': 0
                }
            }
        );
        return result.modifiedCount;
    }

    async resetMonthlyStats(): Promise<number> {
        const result = await PlayerData.updateMany(
            {},
            { $set: { 'leaderboard.monthlyXp': 0 } }
        );
        return result.modifiedCount;
    }
}

// Export singleton
export const playerDataService = new PlayerDataService();
