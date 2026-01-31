// =============================================================================
// Guild Models - Database models for Guild system
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// GUILD MODEL
// ============================================

export interface IGuildMember {
    playerId: string;
    playerName: string;
    role: 'leader' | 'officer' | 'member';
    joinedAt: Date;
    contributions: {
        stardust: number;
        challenges: number;
        xp: number;
    };
    lastActiveAt: Date;
}

export interface IGuildPerk {
    id: string;
    name: string;
    icon: string;
    description: string;
    level: number;
    unlockedAt: Date;
}

export interface IGuildChatMessage {
    messageId: string;
    playerId: string;
    playerName: string;
    playerRole: 'leader' | 'officer' | 'member';
    message: string;
    timestamp: Date;
}

export interface IGuild extends Document {
    guildId: string;
    name: string;
    tag: string;                    // 3-5 character tag
    description: string;
    icon: string;
    color: string;                  // Primary guild color (hue)
    
    // Progression
    level: number;
    xp: number;
    xpToNextLevel: number;
    
    // Members
    leaderId: string;
    leaderName: string;
    members: IGuildMember[];
    maxMembers: number;
    pendingInvites: string[];       // Player IDs with pending invites
    pendingApplications: string[];  // Player IDs who applied
    
    // Perks
    perks: IGuildPerk[];
    
    // Chat (last 100 messages cached)
    chat: IGuildChatMessage[];
    
    // Statistics
    totalContributions: {
        stardust: number;
        challenges: number;
        xp: number;
    };
    weeklyContributions: {
        stardust: number;
        challenges: number;
        xp: number;
        weekStart: string;
    };
    
    // Settings
    isPublic: boolean;              // Can anyone join?
    minLevelToJoin: number;
    requiresApproval: boolean;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const GuildMemberSchema = new Schema<IGuildMember>({
    playerId: { type: String, required: true },
    playerName: { type: String, required: true, maxlength: 20 },
    role: { 
        type: String, 
        enum: ['leader', 'officer', 'member'], 
        default: 'member' 
    },
    joinedAt: { type: Date, default: Date.now },
    contributions: {
        stardust: { type: Number, default: 0, min: 0 },
        challenges: { type: Number, default: 0, min: 0 },
        xp: { type: Number, default: 0, min: 0 }
    },
    lastActiveAt: { type: Date, default: Date.now }
}, { _id: false });

const GuildPerkSchema = new Schema<IGuildPerk>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    description: { type: String, required: true },
    level: { type: Number, default: 1 },
    unlockedAt: { type: Date, default: Date.now }
}, { _id: false });

const GuildChatMessageSchema = new Schema<IGuildChatMessage>({
    messageId: { type: String, required: true },
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    playerRole: { 
        type: String, 
        enum: ['leader', 'officer', 'member'], 
        default: 'member' 
    },
    message: { type: String, required: true, maxlength: 500 },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const GuildSchema = new Schema<IGuild>({
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 30,
        index: true
    },
    tag: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        minlength: 3,
        maxlength: 5
    },
    description: {
        type: String,
        default: '',
        maxlength: 500
    },
    icon: {
        type: String,
        default: '⭐'
    },
    color: {
        type: String,
        default: '200' // Hue value
    },
    
    // Progression
    level: { type: Number, default: 1, min: 1, max: 50 },
    xp: { type: Number, default: 0, min: 0 },
    xpToNextLevel: { type: Number, default: 1000 },
    
    // Members
    leaderId: { type: String, required: true, index: true },
    leaderName: { type: String, required: true },
    members: [GuildMemberSchema],
    maxMembers: { type: Number, default: 20, min: 5, max: 100 },
    pendingInvites: [{ type: String }],
    pendingApplications: [{ type: String }],
    
    // Perks
    perks: [GuildPerkSchema],
    
    // Chat
    chat: {
        type: [GuildChatMessageSchema],
        default: [],
        validate: {
            validator: function(v: IGuildChatMessage[]) {
                return v.length <= 100; // Keep only last 100 messages
            },
            message: 'Chat history exceeds 100 messages'
        }
    },
    
    // Statistics
    totalContributions: {
        stardust: { type: Number, default: 0, min: 0 },
        challenges: { type: Number, default: 0, min: 0 },
        xp: { type: Number, default: 0, min: 0 }
    },
    weeklyContributions: {
        stardust: { type: Number, default: 0, min: 0 },
        challenges: { type: Number, default: 0, min: 0 },
        xp: { type: Number, default: 0, min: 0 },
        weekStart: { type: String, default: '' }
    },
    
    // Settings
    isPublic: { type: Boolean, default: true },
    minLevelToJoin: { type: Number, default: 1, min: 1 },
    requiresApproval: { type: Boolean, default: false }
}, {
    timestamps: true,
    collection: 'guilds'
});

// Indexes
GuildSchema.index({ 'members.playerId': 1 });
GuildSchema.index({ level: -1, xp: -1 }); // For guild leaderboard
GuildSchema.index({ 'weeklyContributions.stardust': -1 }); // Weekly leaderboard

// Pre-save hook to manage chat size
GuildSchema.pre('save', function(next) {
    if (this.chat && this.chat.length > 100) {
        // Keep only the last 100 messages
        this.chat = this.chat.slice(-100);
    }
    next();
});

export const Guild: Model<IGuild> = mongoose.model<IGuild>('Guild', GuildSchema);


// ============================================
// GUILD GIFT MODEL
// ============================================

export interface IGuildGift extends Document {
    giftId: string;
    guildId: string;
    guildName: string;
    recipientId: string;
    recipientName: string;
    type: 'stardust' | 'cosmetic' | 'xpBoost' | 'mysteryBox';
    amount: number;
    cosmeticId?: string;
    message?: string;
    claimedAt?: Date;
    expiresAt: Date;
    createdAt: Date;
}

const GuildGiftSchema = new Schema<IGuildGift>({
    giftId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    guildName: {
        type: String,
        required: true
    },
    recipientId: {
        type: String,
        required: true,
        index: true
    },
    recipientName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['stardust', 'cosmetic', 'xpBoost', 'mysteryBox']
    },
    amount: {
        type: Number,
        default: 0
    },
    cosmeticId: {
        type: String
    },
    message: {
        type: String,
        maxlength: 200
    },
    claimedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true,
    collection: 'guild_gifts'
});

// TTL index - auto-delete expired unclaimed gifts
GuildGiftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const GuildGift: Model<IGuildGift> = mongoose.model<IGuildGift>('GuildGift', GuildGiftSchema);


// ============================================
// GUILD APPLICATION MODEL
// ============================================

export interface IGuildApplication extends Document {
    applicationId: string;
    guildId: string;
    guildName: string;
    playerId: string;
    playerName: string;
    playerLevel: number;
    message: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewedAt?: Date;
    createdAt: Date;
}

const GuildApplicationSchema = new Schema<IGuildApplication>({
    applicationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    guildName: {
        type: String,
        required: true
    },
    playerId: {
        type: String,
        required: true,
        index: true
    },
    playerName: {
        type: String,
        required: true
    },
    playerLevel: {
        type: Number,
        default: 1
    },
    message: {
        type: String,
        maxlength: 500,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    reviewedBy: {
        type: String
    },
    reviewedAt: {
        type: Date
    }
}, {
    timestamps: true,
    collection: 'guild_applications'
});

// TTL - auto-delete old applications after 30 days
GuildApplicationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const GuildApplication: Model<IGuildApplication> = mongoose.model<IGuildApplication>('GuildApplication', GuildApplicationSchema);


// ============================================
// EXPORTS
// ============================================

export default {
    Guild,
    GuildGift,
    GuildApplication
};
