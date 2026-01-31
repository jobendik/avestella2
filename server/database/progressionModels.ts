// MongoDB models for progression and social systems
import mongoose, { Schema, Document, Model } from 'mongoose';
import { Guild } from './guildModels.js';

// ============================================
// DAILY CHALLENGE MODEL
// ============================================

export interface IDailyChallenge extends Document {
    playerId: string;
    date: string;              // YYYY-MM-DD format
    challenges: {
        id: string;
        type: string;
        desc: string;
        progress: number;
        target: number;
        reward: { stardust: number; xp: number };
        completed: boolean;
        claimed: boolean;
        difficulty: 'easy' | 'medium' | 'hard';
    }[];
    completedToday: number;
    rerollsUsed: number;
    createdAt: Date;
}

const DailyChallengeSchema = new Schema<IDailyChallenge>({
    playerId: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: String,
        required: true
    },
    challenges: [{
        id: { type: String, required: true },
        type: { type: String, required: true },
        desc: { type: String, required: true },
        progress: { type: Number, default: 0 },
        target: { type: Number, required: true },
        reward: {
            stardust: { type: Number, default: 0 },
            xp: { type: Number, default: 0 }
        },
        completed: { type: Boolean, default: false },
        claimed: { type: Boolean, default: false },
        difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' }
    }],
    completedToday: { type: Number, default: 0 },
    rerollsUsed: { type: Number, default: 0 },
}, {
    timestamps: true,
    collection: 'daily_challenges'
});

DailyChallengeSchema.index({ playerId: 1, date: 1 }, { unique: true });
// TTL - expire old challenges after 7 days
DailyChallengeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const DailyChallenge: Model<IDailyChallenge> = mongoose.model<IDailyChallenge>('DailyChallenge', DailyChallengeSchema);

// ============================================
// WEEKLY CHALLENGE MODEL
// ============================================

export interface IWeeklyChallenge extends Document {
    playerId: string;
    weekStart: string;         // YYYY-MM-DD of Monday
    challenges: {
        id: string;
        type: string;
        desc: string;
        progress: number;
        target: number;
        reward: { stardust: number; xp: number };
        bonusReward?: { stardust: number; xp: number };
        completed: boolean;
        claimed: boolean;
        difficulty: 'easy' | 'medium' | 'hard';
    }[];
    completedThisWeek: number;
    createdAt: Date;
}

const WeeklyChallengeSchema = new Schema<IWeeklyChallenge>({
    playerId: {
        type: String,
        required: true,
        index: true
    },
    weekStart: {
        type: String,
        required: true
    },
    challenges: [{
        id: { type: String, required: true },
        type: { type: String, required: true },
        desc: { type: String, required: true },
        progress: { type: Number, default: 0 },
        target: { type: Number, required: true },
        reward: {
            stardust: { type: Number, default: 0 },
            xp: { type: Number, default: 0 }
        },
        bonusReward: {
            stardust: { type: Number },
            xp: { type: Number }
        },
        completed: { type: Boolean, default: false },
        claimed: { type: Boolean, default: false },
        difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' }
    }],
    completedThisWeek: { type: Number, default: 0 }
}, {
    timestamps: true,
    collection: 'weekly_challenges'
});

WeeklyChallengeSchema.index({ playerId: 1, weekStart: 1 }, { unique: true });
// TTL - expire old challenges after 14 days
WeeklyChallengeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

export const WeeklyChallenge: Model<IWeeklyChallenge> = mongoose.model<IWeeklyChallenge>('WeeklyChallenge', WeeklyChallengeSchema);

// ============================================
// PROGRESSION MODEL (Enhanced player stats)
// ============================================

export interface IProgression extends Document {
    playerId: string;
    stardust: number;
    crystals: number;           // Premium currency
    dailyLoginStreak: number;
    longestStreak: number;
    totalLogins: number;
    lastLoginDate: string | null;
    currentMonth: string | null;
    seasonPassTier: number;
    seasonPassXP: number;
    seasonId: string;           // Current season identifier
    isPremiumPass: boolean;
    claimedDailyRewards: number[];
    claimedSeasonRewards: number[];
    guildId: string | null;
    guildBonus: number;
    totalChallengesCompleted: number;
    weeklyStats: {
        weekStart: string;
        wins: number;
        gamesPlayed: number;
        xpEarned: number;
        challengesCompleted: number;
    };
    monthlyStats: {
        monthStart: string;
        xpEarned: number;
        challengesCompleted: number;
        stardustEarned: number;
    };
    rankPoints: number;         // Competitive rank points
    unlockedCosmetics: string[];
    unlockedTitles: string[];
    equippedCosmetics: {
        trail: string | null;
        aura: string | null;
        pulse: string | null;
        color: string | null;
        title: string | null;
    };
    createdAt: Date;
    updatedAt: Date;
}

const ProgressionSchema = new Schema<IProgression>({
    playerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    stardust: { type: Number, default: 0, min: 0 },
    crystals: { type: Number, default: 0, min: 0 },
    dailyLoginStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    totalLogins: { type: Number, default: 0, min: 0 },
    lastLoginDate: { type: String, default: null },
    currentMonth: { type: String, default: null },
    seasonPassTier: { type: Number, default: 0, min: 0 },
    seasonPassXP: { type: Number, default: 0, min: 0 },
    seasonId: { type: String, default: 'season_1' },
    isPremiumPass: { type: Boolean, default: false },
    claimedDailyRewards: { type: [Number], default: [] },
    claimedSeasonRewards: { type: [Number], default: [] },
    guildId: { type: String, default: null },
    guildBonus: { type: Number, default: 0, min: 0, max: 0.5 },
    totalChallengesCompleted: { type: Number, default: 0, min: 0 },
    weeklyStats: {
        weekStart: { type: String, default: '' },
        wins: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        xpEarned: { type: Number, default: 0 },
        challengesCompleted: { type: Number, default: 0 }
    },
    monthlyStats: {
        monthStart: { type: String, default: '' },
        xpEarned: { type: Number, default: 0 },
        challengesCompleted: { type: Number, default: 0 },
        stardustEarned: { type: Number, default: 0 }
    },
    rankPoints: { type: Number, default: 0, min: 0 },
    unlockedCosmetics: { type: [String], default: [] },
    unlockedTitles: { type: [String], default: [] },
    equippedCosmetics: {
        trail: { type: String, default: null },
        aura: { type: String, default: null },
        pulse: { type: String, default: null },
        color: { type: String, default: null },
        title: { type: String, default: null }
    }
}, {
    timestamps: true,
    collection: 'progression'
});

export const Progression: Model<IProgression> = mongoose.model<IProgression>('Progression', ProgressionSchema);

// ============================================
// GIFT/SOCIAL INTERACTION MODEL
// ============================================

// Gift and GiftStreak moved to socialModels.ts

// ============================================
// GUILD MODEL
// ============================================

// Guild model moved to guildModels.ts to avoid duplication
export { Guild, type IGuild } from './guildModels.js';

// ============================================
// ACTIVITY FEED MODEL
// ============================================

export interface IActivityFeed extends Document {
    playerId: string;          // Owner of this feed entry
    actorId: string;           // Who performed the action
    actorName: string;
    type: 'levelUp' | 'achievement' | 'gift' | 'online' | 'milestone' | 'bondFormed' | 'guildJoin' | 'challenge';
    description: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: Date;
}

const ActivityFeedSchema = new Schema<IActivityFeed>({
    playerId: {
        type: String,
        required: true,
        index: true
    },
    actorId: {
        type: String,
        required: true
    },
    actorName: {
        type: String,
        required: true,
        maxlength: 30
    },
    type: {
        type: String,
        enum: ['levelUp', 'achievement', 'gift', 'online', 'milestone', 'bondFormed', 'guildJoin', 'challenge'],
        required: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 200
    },
    data: {
        type: Schema.Types.Mixed,
        default: {}
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'activity_feed'
});

ActivityFeedSchema.index({ playerId: 1, createdAt: -1 });
// TTL - expire old feed entries after 30 days
ActivityFeedSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ActivityFeed: Model<IActivityFeed> = mongoose.model<IActivityFeed>('ActivityFeed', ActivityFeedSchema);

// ============================================
// EXPORT ALL MODELS
// ============================================

export default {
    DailyChallenge,
    WeeklyChallenge,
    Progression,
    Guild,
    ActivityFeed
};
