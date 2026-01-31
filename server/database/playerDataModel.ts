// Enhanced Player Data Model - All persistent player state
import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// COMPLETE PLAYER DATA MODEL
// ============================================

export interface IPlayerData extends Document {
    playerId: string;

    // === BASIC INFO ===
    name: string;
    hue: number;
    avatar: string;

    // === PROGRESSION ===
    xp: number;
    level: number;
    stardust: number;
    fragments: number;
    lifetimeStardust: number;
    activeBoosts: { type: string; multiplier: number; expiresAt: number }[];

    // === SEASON PASS ===
    seasonId: string;
    seasonXp: number;
    seasonLevel: number;
    seasonTier: number;
    claimedSeasonRewards: number[];

    // === DAILY LOGIN ===
    dailyLoginStreak: number;
    longestStreak: number;
    totalLogins: number;
    lastLoginDate: string | null;
    currentMonth: string | null;
    claimedDailyRewards: number[];

    // === STATS ===
    stats: {
        starsLit: number;
        echoesCreated: number;
        sings: number;
        pulses: number;
        emotes: number;
        teleports: number;
        whispersSent: number;
        connections: number;
        fragmentsCollected: number;
        beaconsLit: number;
        bondsFormed: number;
        giftsGiven: number;
        giftsReceived: number;
        challengesCompleted: number;
        weeklyChallengesCompleted: number;
        questsCompleted: number;
    };

    // === ACHIEVEMENTS ===
    achievements: string[];

    // === COSMETICS ===
    cosmetics: {
        ownedItems: string[];
        equippedTrail: string | null;
        equippedAura: string | null;
        equippedTitle: string | null;
        equippedEmotes: string[];
        equippedPulseEffect: string | null;
        // Sound packs & Avatar frames (GAP 6 & 7 fix)
        ownedSoundPacks: string[];
        equippedSoundPack: string;
        ownedFrames: string[];
        equippedFrame: string;
        // Custom colors (GAP 1 fix - custom color persistence)
        customColor: string | null;              // Currently equipped custom hex color
        unlockedCustomColors: string[];          // All unlocked custom hex colors
        customColorUnlocked: boolean;            // Whether player has unlocked custom color feature
    };

    // === COMPANIONS ===
    companions: {
        ownedIds: string[];
        activeId: string | null;
        companionLevels: { [key: string]: number };
        companionXp: { [key: string]: number };
    };

    // === PETS ===
    pets: {
        ownedIds: string[];
        equippedId: string | null;
        petLevels: { [key: string]: number };
        petXp: { [key: string]: number };
        petStats: {
            [key: string]: {
                happiness: number;
                hunger: number;
                lastInteracted: number;
            }
        };
    };

    // === EXPLORATION ===
    exploration: {
        discoveredAreas: string[];
        visitedRealms: string[];
        totalDistance: number;
        explorationPercent: number;
        discoveries: { id: string; type: string; timestamp: number }[];
    };

    // === COMMUNICATION ===
    communication: {
        chatHistory: { text: string; timestamp: number; toId?: string }[];
        signalPatterns: string[];
        blockedPlayerIds: string[];
    };

    // === QUESTS ===
    quests: {
        activeQuestIds: string[];
        completedQuestIds: string[];
        questProgress: { [questId: string]: number };
        dailyQuestDate: string | null;
        weeklyQuestDate: string | null;
    };

    // === ANALYTICS ===
    analytics: {
        totalPlaytime: number;
        sessionsCount: number;
        lastSessionStart: number | null;
        milestones: string[];
        events: { type: string; timestamp: number; data?: any }[];
    };

    // === SETTINGS ===
    settings: {
        musicEnabled: boolean;
        soundEnabled: boolean;
        masterVolume: number;
        musicVolume: number;
        sfxVolume: number;
        particlesEnabled: boolean;
        screenShake: boolean;
        reducedMotion: boolean;
        colorblindMode: string | null;
        highContrast: boolean;
        notifications: boolean;
        autoSave: boolean;
    };

    // === ANCHORING (Wellness) ===
    anchoring: {
        breathingCompleted: number;
        lastAnchorDate: string | null;
        preferredProvider: string | null;
        sessionHistory: { type: string; duration: number; timestamp: number }[];
    };

    // === SOCIAL ===
    social: {
        friendIds: string[];
        blockedIds: string[];
        guildId: string | null;
        pendingFriendRequests: string[];
    };

    // === GAME STATE ===
    gameState: {
        lastRealm: string;
        lastPosition: { x: number; y: number };
        litBeacons: string[];
        bonds: { targetId: string; strength: number; type: string }[];
        starMemories: { starId: string; memory: string; timestamp: number }[];
    };

    // === MEDIA ===
    media: {
        screenshots: { id: string; dataUrl: string; timestamp: number }[];
        recordings: { id: string; duration: number; timestamp: number }[];
    };

    // === LEADERBOARD ===
    leaderboard: {
        rankPoints: number;
        weeklyXp: number;
        weeklyWins: number;
        monthlyXp: number;
        peakRank: string;
        // Weekly/Monthly tracking
        weekStart: string | null;
        monthStart: string | null;
        weeklyStats: {
            xpEarned: number;
            stardustEarned: number;
            challengesCompleted: number;
            playtimeMinutes: number;
            bondsFormed: number;
            giftsGiven: number;
        };
        monthlyStats: {
            xpEarned: number;
            stardustEarned: number;
            challengesCompleted: number;
            playtimeMinutes: number;
            bondsFormed: number;
            giftsGiven: number;
        };
        allTimeStats: {
            highestLevel: number;
            totalXpEarned: number;
            totalStardustEarned: number;
            totalChallengesCompleted: number;
            totalPlaytimeMinutes: number;
        };
    };

    // === TUTORIAL ===
    tutorial: {
        completed: boolean;
        currentStep: number;
        completedSteps: string[];
        skipped: boolean;
        completedAt: Date | null;
    };

    // === TIMESTAMPS ===
    createdAt: Date;
    updatedAt: Date;
    lastSeen: Date;
}

const PlayerDataSchema = new Schema<IPlayerData>({
    playerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Basic Info
    name: { type: String, required: true, maxlength: 20, default: 'Wanderer' },
    hue: { type: Number, default: 180, min: 0, max: 360 },
    avatar: { type: String, default: '⭐' },

    // Progression
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    stardust: { type: Number, default: 0, min: 0 },
    fragments: { type: Number, default: 0, min: 0 },
    lifetimeStardust: { type: Number, default: 0, min: 0 },
    activeBoosts: { type: [{ type: String, multiplier: Number, expiresAt: Number }], default: [] },

    // Season Pass
    seasonId: { type: String, default: 'season_1' },
    seasonXp: { type: Number, default: 0 },
    seasonLevel: { type: Number, default: 0 },
    seasonTier: { type: Number, default: 0 },
    claimedSeasonRewards: { type: [Number], default: [] },

    // Daily Login
    dailyLoginStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalLogins: { type: Number, default: 0 },
    lastLoginDate: { type: String, default: null },
    currentMonth: { type: String, default: null },
    claimedDailyRewards: { type: [Number], default: [] },

    // Stats
    stats: {
        starsLit: { type: Number, default: 0 },
        echoesCreated: { type: Number, default: 0 },
        sings: { type: Number, default: 0 },
        pulses: { type: Number, default: 0 },
        emotes: { type: Number, default: 0 },
        teleports: { type: Number, default: 0 },
        whispersSent: { type: Number, default: 0 },
        connections: { type: Number, default: 0 },
        fragmentsCollected: { type: Number, default: 0 },
        beaconsLit: { type: Number, default: 0 },
        bondsFormed: { type: Number, default: 0 },
        giftsGiven: { type: Number, default: 0 },
        giftsReceived: { type: Number, default: 0 },
        challengesCompleted: { type: Number, default: 0 },
        weeklyChallengesCompleted: { type: Number, default: 0 },
        questsCompleted: { type: Number, default: 0 }
    },

    // Achievements
    achievements: { type: [String], default: [] },

    // Cosmetics
    cosmetics: {
        ownedItems: { type: [String], default: [] },
        equippedTrail: { type: String, default: null },
        equippedAura: { type: String, default: null },
        equippedTitle: { type: String, default: null },
        equippedEmotes: { type: [String], default: [] },
        equippedPulseEffect: { type: String, default: null },
        // Sound packs & Avatar frames (GAP 6 & 7 fix)
        ownedSoundPacks: { type: [String], default: ['default'] },
        equippedSoundPack: { type: String, default: 'default' },
        ownedFrames: { type: [String], default: ['default'] },
        equippedFrame: { type: String, default: 'default' },
        // Custom colors (GAP 1 fix - custom color persistence)
        customColor: { type: String, default: null },
        unlockedCustomColors: { type: [String], default: [] },
        customColorUnlocked: { type: Boolean, default: false }
    },

    // Companions
    companions: {
        ownedIds: { type: [String], default: [] },
        activeId: { type: String, default: null },
        companionLevels: { type: Schema.Types.Mixed, default: {} },
        companionXp: { type: Schema.Types.Mixed, default: {} }
    },

    // Pets
    pets: {
        ownedIds: { type: [String], default: [] },
        equippedId: { type: String, default: null },
        petLevels: { type: Schema.Types.Mixed, default: {} },
        petXp: { type: Schema.Types.Mixed, default: {} },
        petStats: { type: Schema.Types.Mixed, default: {} }
    },

    // Exploration
    exploration: {
        discoveredAreas: { type: [String], default: [] },
        visitedRealms: { type: [String], default: ['genesis'] },
        totalDistance: { type: Number, default: 0 },
        explorationPercent: { type: Number, default: 0 },
        discoveries: { type: [{ id: String, type: String, timestamp: Number }], default: [] }
    },

    // Communication
    communication: {
        chatHistory: { type: [{ text: String, timestamp: Number, toId: String }], default: [] },
        signalPatterns: { type: [String], default: [] },
        blockedPlayerIds: { type: [String], default: [] }
    },

    // Quests
    quests: {
        activeQuestIds: { type: [String], default: [] },
        completedQuestIds: { type: [String], default: [] },
        questProgress: { type: Schema.Types.Mixed, default: {} },
        dailyQuestDate: { type: String, default: null },
        weeklyQuestDate: { type: String, default: null }
    },

    // Analytics
    analytics: {
        totalPlaytime: { type: Number, default: 0 },
        sessionsCount: { type: Number, default: 0 },
        lastSessionStart: { type: Number, default: null },
        milestones: { type: [String], default: [] },
        events: { type: [{ type: String, timestamp: Number, data: Schema.Types.Mixed }], default: [] }
    },

    // Settings
    settings: {
        musicEnabled: { type: Boolean, default: true },
        soundEnabled: { type: Boolean, default: true },
        masterVolume: { type: Number, default: 70 },
        musicVolume: { type: Number, default: 70 },
        sfxVolume: { type: Number, default: 70 },
        particlesEnabled: { type: Boolean, default: true },
        screenShake: { type: Boolean, default: true },
        reducedMotion: { type: Boolean, default: false },
        colorblindMode: { type: String, default: null },
        highContrast: { type: Boolean, default: false },
        notifications: { type: Boolean, default: true },
        autoSave: { type: Boolean, default: true }
    },

    // Anchoring
    anchoring: {
        breathingCompleted: { type: Number, default: 0 },
        lastAnchorDate: { type: String, default: null },
        preferredProvider: { type: String, default: null },
        sessionHistory: { type: [{ type: String, duration: Number, timestamp: Number }], default: [] }
    },

    // Social
    social: {
        friendIds: { type: [String], default: [] },
        blockedIds: { type: [String], default: [] },
        guildId: { type: String, default: null },
        pendingFriendRequests: { type: [String], default: [] }
    },

    // Game State
    gameState: {
        lastRealm: { type: String, default: 'genesis' },
        lastPosition: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 }
        },
        litBeacons: { type: [String], default: [] },
        bonds: { type: [{ targetId: String, strength: Number, type: String }], default: [] },
        starMemories: { type: [{ starId: String, memory: String, timestamp: Number }], default: [] }
    },

    // Media (limited storage - only recent items)
    media: {
        screenshots: { type: [{ id: String, dataUrl: String, timestamp: Number }], default: [] },
        recordings: { type: [{ id: String, duration: Number, timestamp: Number }], default: [] }
    },

    // Leaderboard
    leaderboard: {
        rankPoints: { type: Number, default: 0 },
        weeklyXp: { type: Number, default: 0 },
        weeklyWins: { type: Number, default: 0 },
        monthlyXp: { type: Number, default: 0 },
        peakRank: { type: String, default: 'unranked' },
        // Weekly/Monthly tracking
        weekStart: { type: String, default: null },
        monthStart: { type: String, default: null },
        weeklyStats: {
            xpEarned: { type: Number, default: 0 },
            stardustEarned: { type: Number, default: 0 },
            challengesCompleted: { type: Number, default: 0 },
            playtimeMinutes: { type: Number, default: 0 },
            bondsFormed: { type: Number, default: 0 },
            giftsGiven: { type: Number, default: 0 }
        },
        monthlyStats: {
            xpEarned: { type: Number, default: 0 },
            stardustEarned: { type: Number, default: 0 },
            challengesCompleted: { type: Number, default: 0 },
            playtimeMinutes: { type: Number, default: 0 },
            bondsFormed: { type: Number, default: 0 },
            giftsGiven: { type: Number, default: 0 }
        },
        allTimeStats: {
            highestLevel: { type: Number, default: 1 },
            totalXpEarned: { type: Number, default: 0 },
            totalStardustEarned: { type: Number, default: 0 },
            totalChallengesCompleted: { type: Number, default: 0 },
            totalPlaytimeMinutes: { type: Number, default: 0 }
        }
    },

    // Tutorial
    tutorial: {
        completed: { type: Boolean, default: false },
        currentStep: { type: Number, default: 0 },
        completedSteps: { type: [String], default: [] },
        skipped: { type: Boolean, default: false },
        completedAt: { type: Date, default: null }
    },

    lastSeen: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'player_data'
});

// Indexes for common queries
PlayerDataSchema.index({ 'leaderboard.rankPoints': -1 });
PlayerDataSchema.index({ xp: -1 });
PlayerDataSchema.index({ stardust: -1 });
PlayerDataSchema.index({ 'stats.challengesCompleted': -1 });
PlayerDataSchema.index({ lastSeen: -1 });

export const PlayerData: Model<IPlayerData> = mongoose.model<IPlayerData>('PlayerData', PlayerDataSchema);

export default PlayerData;
