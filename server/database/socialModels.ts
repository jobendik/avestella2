// MongoDB models for Social, Reputation, Referral, Mentorship, and Economy systems
import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// REPUTATION TRACK MODEL
// ============================================
// Tracks: explorer, connector, guardian, beacon_keeper, collector

export interface IReputation extends Document {
    playerId: string;
    tracks: {
        explorer: { xp: number; level: number };
        connector: { xp: number; level: number };
        guardian: { xp: number; level: number };
        beacon_keeper: { xp: number; level: number };
        collector: { xp: number; level: number };
    };
    unlockedRewards: string[];  // Claimed reward IDs
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ReputationSchema = new Schema<IReputation>({
    playerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    tracks: {
        explorer: {
            xp: { type: Number, default: 0, min: 0 },
            level: { type: Number, default: 1, min: 1, max: 10 }
        },
        connector: {
            xp: { type: Number, default: 0, min: 0 },
            level: { type: Number, default: 1, min: 1, max: 10 }
        },
        guardian: {
            xp: { type: Number, default: 0, min: 0 },
            level: { type: Number, default: 1, min: 1, max: 10 }
        },
        beacon_keeper: {
            xp: { type: Number, default: 0, min: 0 },
            level: { type: Number, default: 1, min: 1, max: 10 }
        },
        collector: {
            xp: { type: Number, default: 0, min: 0 },
            level: { type: Number, default: 1, min: 1, max: 10 }
        }
    },
    unlockedRewards: { type: [String], default: [] },
    lastUpdated: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'reputations'
});

export const Reputation: Model<IReputation> = mongoose.model<IReputation>('Reputation', ReputationSchema);

// ============================================
// REFERRAL MODEL
// ============================================

export interface IReferralCode extends Document {
    code: string;              // Unique referral code
    ownerId: string;           // Player who owns this code
    ownerName: string;         // Display name of owner
    usageCount: number;        // Times used
    maxUses: number | null;    // null = unlimited
    conversions: number;       // Players who reached level 10
    totalRewardsEarned: {
        stardust: number;
        crystals: number;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ReferralCodeSchema = new Schema<IReferralCode>({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true,
        maxlength: 12
    },
    ownerId: {
        type: String,
        required: true,
        index: true
    },
    ownerName: {
        type: String,
        required: true,
        maxlength: 20
    },
    usageCount: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: null },
    conversions: { type: Number, default: 0, min: 0 },
    totalRewardsEarned: {
        stardust: { type: Number, default: 0 },
        crystals: { type: Number, default: 0 }
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'referral_codes'
});

export const ReferralCode: Model<IReferralCode> = mongoose.model<IReferralCode>('ReferralCode', ReferralCodeSchema);

export interface IReferral extends Document {
    referrerId: string;        // Player who referred
    refereeId: string;         // Player who was referred
    refereeName: string;       // Referee display name
    code: string;              // Code used
    refereeLevel: number;      // Current level of referee
    hasConverted: boolean;     // Reached level 10
    referrerRewardsClaimed: number[];  // Milestone numbers claimed
    bonusXpEndTime: Date | null; // When referee's bonus XP expires
    createdAt: Date;
    updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>({
    referrerId: {
        type: String,
        required: true,
        index: true
    },
    refereeId: {
        type: String,
        required: true,
        unique: true,  // Each player can only be referred once
        index: true
    },
    refereeName: {
        type: String,
        required: true,
        maxlength: 20
    },
    code: {
        type: String,
        required: true,
        index: true
    },
    refereeLevel: { type: Number, default: 1, min: 1 },
    hasConverted: { type: Boolean, default: false },
    referrerRewardsClaimed: { type: [Number], default: [] },
    bonusXpEndTime: { type: Date, default: null }
}, {
    timestamps: true,
    collection: 'referrals'
});

ReferralSchema.index({ referrerId: 1, refereeId: 1 });

export const Referral: Model<IReferral> = mongoose.model<IReferral>('Referral', ReferralSchema);

// ============================================
// MENTORSHIP MODEL
// ============================================

export interface IMentorProfile extends Document {
    playerId: string;
    playerName: string;
    isMentor: boolean;          // Qualified to mentor
    mentorLevel: number;        // 1-6 mentor progression
    menteesHelped: number;      // Total mentees graduated
    activeMentees: string[];    // Current mentee IDs
    currentMentor: string | null; // If this player has a mentor
    sessionsCompleted: number;
    totalMentoringTime: number; // Minutes spent mentoring
    rating: number;             // 1-5 average rating
    ratingCount: number;        // Number of ratings received
    hasGraduated: boolean;      // Has graduated as a mentee
    graduatedAt: Date | null;
    lastSessionAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const MentorProfileSchema = new Schema<IMentorProfile>({
    playerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    playerName: {
        type: String,
        required: true,
        maxlength: 20
    },
    isMentor: { type: Boolean, default: false },
    mentorLevel: { type: Number, default: 1, min: 1, max: 6 },
    menteesHelped: { type: Number, default: 0, min: 0 },
    activeMentees: { type: [String], default: [] },
    currentMentor: { type: String, default: null },
    sessionsCompleted: { type: Number, default: 0, min: 0 },
    totalMentoringTime: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    hasGraduated: { type: Boolean, default: false },
    graduatedAt: { type: Date, default: null },
    lastSessionAt: { type: Date, default: null }
}, {
    timestamps: true,
    collection: 'mentor_profiles'
});

export const MentorProfile: Model<IMentorProfile> = mongoose.model<IMentorProfile>('MentorProfile', MentorProfileSchema);

export interface IMentorshipSession extends Document {
    sessionId: string;
    mentorId: string;
    menteeId: string;
    startTime: Date;
    endTime: Date | null;
    duration: number;           // Minutes
    activitiesCompleted: string[];
    xpAwarded: number;
    bonusAwarded: number;
    status: 'active' | 'completed' | 'cancelled';
    rating: number | null;      // Mentee's rating of session
    feedback: string | null;
    createdAt: Date;
}

const MentorshipSessionSchema = new Schema<IMentorshipSession>({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    mentorId: {
        type: String,
        required: true,
        index: true
    },
    menteeId: {
        type: String,
        required: true,
        index: true
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    duration: { type: Number, default: 0, min: 0 },
    activitiesCompleted: { type: [String], default: [] },
    xpAwarded: { type: Number, default: 0, min: 0 },
    bonusAwarded: { type: Number, default: 0, min: 0 },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    rating: { type: Number, min: 1, max: 5, default: null },
    feedback: { type: String, maxlength: 500, default: null }
}, {
    timestamps: true,
    collection: 'mentorship_sessions'
});

// TTL - expire old sessions after 30 days
MentorshipSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const MentorshipSession: Model<IMentorshipSession> = mongoose.model<IMentorshipSession>('MentorshipSession', MentorshipSessionSchema);

// ============================================
// ECONOMY / MYSTERY BOX MODEL
// ============================================

export interface IPurchaseHistory extends Document {
    purchaseId: string;
    playerId: string;
    itemType: 'crystal_pack' | 'mystery_box' | 'cosmetic' | 'boost' | 'season_pass';
    itemId: string;
    crystalCost: number;
    stardustCost: number;
    realMoneyCost: number;      // USD cents
    rewards: {
        type: string;
        value: string | number;
        rarity?: string;
    }[];
    createdAt: Date;
}

const PurchaseHistorySchema = new Schema<IPurchaseHistory>({
    purchaseId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    playerId: {
        type: String,
        required: true,
        index: true
    },
    itemType: {
        type: String,
        enum: ['crystal_pack', 'mystery_box', 'cosmetic', 'boost', 'season_pass'],
        required: true
    },
    itemId: { type: String, required: true },
    crystalCost: { type: Number, default: 0, min: 0 },
    stardustCost: { type: Number, default: 0, min: 0 },
    realMoneyCost: { type: Number, default: 0, min: 0 },
    rewards: [{
        type: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
        rarity: { type: String }
    }]
}, {
    timestamps: true,
    collection: 'purchase_history'
});

PurchaseHistorySchema.index({ playerId: 1, createdAt: -1 });

export const PurchaseHistory: Model<IPurchaseHistory> = mongoose.model<IPurchaseHistory>('PurchaseHistory', PurchaseHistorySchema);

export interface IActiveBoost extends Document {
    playerId: string;
    boostType: 'xp' | 'stardust' | 'fragment';
    multiplier: number;
    startTime: Date;
    endTime: Date;
    source: 'purchase' | 'reward' | 'event' | 'referral';
}

const ActiveBoostSchema = new Schema<IActiveBoost>({
    playerId: {
        type: String,
        required: true,
        index: true
    },
    boostType: {
        type: String,
        enum: ['xp', 'stardust', 'fragment'],
        required: true
    },
    multiplier: { type: Number, required: true, min: 1 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },  // Indexed via TTL below
    source: {
        type: String,
        enum: ['purchase', 'reward', 'event', 'referral'],
        required: true
    }
}, {
    timestamps: true,
    collection: 'active_boosts'
});

// TTL - auto-delete expired boosts
ActiveBoostSchema.index({ endTime: 1 }, { expireAfterSeconds: 0 });

export const ActiveBoost: Model<IActiveBoost> = mongoose.model<IActiveBoost>('ActiveBoost', ActiveBoostSchema);

export interface IStreakFreeze extends Document {
    playerId: string;
    freezeDate: string;         // YYYY-MM-DD when the freeze was used
    purchasedAt: Date;
    usedAt: Date | null;
}

const StreakFreezeSchema = new Schema<IStreakFreeze>({
    playerId: {
        type: String,
        required: true,
        index: true
    },
    freezeDate: { type: String, default: null },
    purchasedAt: { type: Date, required: true },
    usedAt: { type: Date, default: null }
}, {
    timestamps: true,
    collection: 'streak_freezes'
});

export const StreakFreeze: Model<IStreakFreeze> = mongoose.model<IStreakFreeze>('StreakFreeze', StreakFreezeSchema);

// ============================================
// FRIEND REQUEST MODEL
// ============================================

export interface IFriendRequest extends Document {
    requestId: string;
    fromPlayerId: string;
    fromPlayerName: string;
    toPlayerId: string;
    status: 'pending' | 'accepted' | 'declined';
    message: string | null;
    createdAt: Date;
    respondedAt: Date | null;
}

const FriendRequestSchema = new Schema<IFriendRequest>({
    requestId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    fromPlayerId: {
        type: String,
        required: true,
        index: true
    },
    fromPlayerName: {
        type: String,
        required: true,
        maxlength: 20
    },
    toPlayerId: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
    },
    message: { type: String, maxlength: 100, default: null },
    respondedAt: { type: Date, default: null }
}, {
    timestamps: true,
    collection: 'friend_requests'
});

FriendRequestSchema.index({ fromPlayerId: 1, toPlayerId: 1 });
// TTL - expire old declined/accepted requests after 7 days
FriendRequestSchema.index(
    { respondedAt: 1 },
    {
        expireAfterSeconds: 7 * 24 * 60 * 60,
        partialFilterExpression: { status: { $ne: 'pending' } }
    }
);

export const FriendRequest: Model<IFriendRequest> = mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);

// ============================================
// BLOCKED PLAYERS MODEL
// ============================================

export interface IBlockedPlayer extends Document {
    playerId: string;
    blockedPlayerId: string;
    reason: string | null;
    blockedAt: Date;
}

const BlockedPlayerSchema = new Schema<IBlockedPlayer>({
    playerId: {
        type: String,
        required: true,
        index: true
    },
    blockedPlayerId: {
        type: String,
        required: true
    },
    reason: { type: String, maxlength: 200, default: null },
    blockedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'blocked_players'
});

BlockedPlayerSchema.index({ playerId: 1, blockedPlayerId: 1 }, { unique: true });

export const BlockedPlayer: Model<IBlockedPlayer> = mongoose.model<IBlockedPlayer>('BlockedPlayer', BlockedPlayerSchema);

// ============================================
// GIFT/SOCIAL INTERACTION MODEL
// ============================================

export interface IGift extends Document {
    fromPlayerId: string;
    toPlayerId: string;
    giftType: 'stardust' | 'cosmetic' | 'xpBoost' | 'fragment';
    amount: number;
    message?: string;
    claimed: boolean;
    claimedAt?: Date;
    createdAt: Date;
}

const GiftSchema = new Schema<IGift>({
    fromPlayerId: {
        type: String,
        required: true,
        index: true
    },
    toPlayerId: {
        type: String,
        required: true,
        index: true
    },
    giftType: {
        type: String,
        enum: ['stardust', 'cosmetic', 'xpBoost', 'fragment'],
        required: true
    },
    amount: { type: Number, default: 1 },
    message: { type: String, maxlength: 100 },
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date }
}, {
    timestamps: true,
    collection: 'gifts'
});

GiftSchema.index({ toPlayerId: 1, claimed: 1 });
// TTL - expire unclaimed gifts after 30 days
GiftSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { claimed: false }
});

export const Gift: Model<IGift> = mongoose.model<IGift>('Gift', GiftSchema);
// ============================================
// GIFT STREAK MODEL
// ============================================
// Tracks consecutive days of gift exchanges between players

export interface IGiftStreak extends Document {
    playerId: string;
    friendId: string;
    currentStreak: number;          // Consecutive days
    longestStreak: number;          // All-time best
    lastGiftDate: string;           // YYYY-MM-DD (sender's perspective)
    lastReceivedDate: string;       // YYYY-MM-DD (receiver's perspective)
    totalGiftsSent: number;
    totalGiftsReceived: number;
    milestonesClaimed: number[];    // Streak milestones claimed (7, 14, 30, 60, 90)
    nextMilestone: number;
    streakBroken: boolean;          // Set true when streak expires (for UI notification)
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}

const GiftStreakSchema = new Schema<IGiftStreak>({
    playerId: {
        type: String,
        required: true,
        index: true
    },
    friendId: {
        type: String,
        required: true,
        index: true
    },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastGiftDate: { type: String, default: '' },
    lastReceivedDate: { type: String, default: '' },
    totalGiftsSent: { type: Number, default: 0, min: 0 },
    totalGiftsReceived: { type: Number, default: 0, min: 0 },
    milestonesClaimed: { type: [Number], default: [] },
    nextMilestone: { type: Number, default: 7 },
    streakBroken: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'gift_streaks'
});

// Compound index for fast lookup of specific pair
GiftStreakSchema.index({ playerId: 1, friendId: 1 }, { unique: true });
// Index for finding all streaks for a player
GiftStreakSchema.index({ playerId: 1, currentStreak: -1 });

export const GiftStreak: Model<IGiftStreak> = mongoose.model<IGiftStreak>('GiftStreak', GiftStreakSchema);

// ============================================
// DAILY GIFT LOG MODEL
// ============================================
// Tracks individual gift events for audit and analytics

export interface IDailyGiftLog extends Document {
    giftId: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverName: string;
    giftType: 'stardust' | 'crystal' | 'cosmetic' | 'xpBoost' | 'mysteryBox' | 'stardustBundle';
    amount: number;
    cosmeticId?: string;
    message?: string;
    streakDay: number;              // Which streak day this gift was
    isBonusGift: boolean;           // Whether this triggered bonus rewards
    bonusRewards?: {
        type: string;
        amount: number;
    }[];
    claimedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
}

const DailyGiftLogSchema = new Schema<IDailyGiftLog>({
    giftId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    senderId: {
        type: String,
        required: true,
        index: true
    },
    senderName: {
        type: String,
        required: true,
        maxlength: 20
    },
    receiverId: {
        type: String,
        required: true,
        index: true
    },
    receiverName: {
        type: String,
        required: true,
        maxlength: 20
    },
    giftType: {
        type: String,
        enum: ['stardust', 'crystal', 'cosmetic', 'xpBoost', 'mysteryBox', 'stardustBundle'],
        required: true
    },
    amount: { type: Number, default: 1, min: 0 },
    cosmeticId: { type: String },
    message: { type: String, maxlength: 200 },
    streakDay: { type: Number, default: 0 },
    isBonusGift: { type: Boolean, default: false },
    bonusRewards: [{
        type: { type: String },
        amount: { type: Number }
    }],
    claimedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true }
}, {
    timestamps: true,
    collection: 'daily_gift_logs'
});

// TTL - expire unclaimed gifts after their expiry date
DailyGiftLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Index for finding pending gifts
DailyGiftLogSchema.index({ receiverId: 1, claimedAt: 1, expiresAt: 1 });

export const DailyGiftLog: Model<IDailyGiftLog> = mongoose.model<IDailyGiftLog>('DailyGiftLog', DailyGiftLogSchema);