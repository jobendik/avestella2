// MongoDB models for AURA game data
import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// ECHO MODEL - Permanent messages in the cosmos
// ============================================

export interface IEcho extends Document {
    echoId: string;          // Unique echo identifier
    x: number;               // X position in cosmos
    y: number;               // Y position in cosmos
    text: string;            // Echo message content
    hue: number;             // Color hue of the author
    authorId: string;        // Author's player ID
    authorName: string;      // Author's display name
    realm: string;           // Which realm (genesis, nebula, void, etc.)
    votes: number;           // Upvotes for persistence
    ignited: number;         // Visual "likes" (glow intensity)
    createdAt: Date;
    updatedAt: Date;
}

const EchoSchema = new Schema<IEcho>({
    echoId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        required: true,
        maxlength: 200,
        trim: true
    },
    hue: {
        type: Number,
        required: true,
        min: 0,
        max: 360
    },
    authorId: {
        type: String,
        required: true,
        index: true
    },
    authorName: {
        type: String,
        required: true,
        maxlength: 20
    },
    realm: {
        type: String,
        required: true,
        enum: ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'],
        index: true
    },
    votes: {
        type: Number,
        default: 0
    },
    ignited: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'echoes'
});

// Compound index for spatial queries within a realm
EchoSchema.index({ realm: 1, x: 1, y: 1 });

// TTL index - echoes with 0 or negative votes expire after 30 days
// Echoes with positive votes persist longer
EchoSchema.index(
    { createdAt: 1 },
    {
        expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
        partialFilterExpression: { votes: { $lte: 0 } }
    }
);

export const Echo: Model<IEcho> = mongoose.model<IEcho>('Echo', EchoSchema);


// ============================================
// MESSAGE MODEL - Whispers/chat messages
// ============================================

export interface IMessage extends Document {
    messageId: string;       // Unique message identifier
    fromId: string;          // Sender's player ID
    fromName: string;        // Sender's display name
    toId?: string;           // Recipient's player ID (null = broadcast)
    toName?: string;         // Recipient's display name
    text: string;            // Message content
    x: number;               // Position where sent
    y: number;               // Position where sent
    realm: string;           // Which realm
    type: 'whisper' | 'broadcast' | 'system';
    delivered: boolean;      // Was it delivered to target
    createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    fromId: {
        type: String,
        required: true,
        index: true
    },
    fromName: {
        type: String,
        required: true,
        maxlength: 20
    },
    toId: {
        type: String,
        index: true,
        sparse: true  // Allow null values
    },
    toName: {
        type: String,
        maxlength: 20
    },
    text: {
        type: String,
        required: true,
        maxlength: 500,
        trim: true
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    realm: {
        type: String,
        required: true,
        enum: ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'],
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['whisper', 'broadcast', 'system'],
        default: 'whisper'
    },
    delivered: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'messages'
});

// Index for fetching conversation history
MessageSchema.index({ fromId: 1, toId: 1, createdAt: -1 });

// TTL index - messages expire after 7 days
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const Message: Model<IMessage> = mongoose.model<IMessage>('Message', MessageSchema);


// ============================================
// LIT STAR MODEL - Stars that have been lit
// ============================================

export interface ILitStar extends Document {
    starId: string;          // Star identifier (realm:cellX,cellY:index)
    realm: string;
    litBy: string;           // Player ID who lit it
    litAt: Date;
}

const LitStarSchema = new Schema<ILitStar>({
    starId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    realm: {
        type: String,
        required: true,
        index: true
    },
    litBy: {
        type: String,
        required: true
    },
    litAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'lit_stars'
});

export const LitStar: Model<ILitStar> = mongoose.model<ILitStar>('LitStar', LitStarSchema);


// ============================================
// PLAYER DATA MODEL - Persistent player info
// ============================================

export interface IPlayer extends Document {
    playerId: string;        // Unique player identifier
    name: string;
    hue: number;
    xp: number;
    level: number;
    stars: number;           // Total stars lit
    echoesCreated: number;   // Total echoes planted
    sings: number;           // Total sings performed
    pulses: number;          // Total pulses performed
    emotes: number;          // Total emotes used
    teleports: number;       // Total teleports used
    whispersSent: number;    // Total whispers sent
    connections: number;     // Total connections made
    achievements: string[];  // Unlocked achievement IDs
    settings: {
        musicEnabled: boolean;
        volume: number;
        particlesEnabled: boolean;
        screenShake: boolean;
    };
    lastRealm: string;
    lastPosition: {
        x: number;
        y: number;
    };
    createdAt: Date;
    lastSeen: Date;
}

const PlayerSchema = new Schema<IPlayer>({
    playerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 20,
        default: 'Wanderer'
    },
    hue: {
        type: Number,
        default: 180,
        min: 0,
        max: 360
    },
    xp: {
        type: Number,
        default: 0,
        min: 0
    },
    level: {
        type: Number,
        default: 1,
        min: 1
    },
    stars: {
        type: Number,
        default: 0,
        min: 0
    },
    echoesCreated: {
        type: Number,
        default: 0,
        min: 0
    },
    sings: {
        type: Number,
        default: 0,
        min: 0
    },
    pulses: {
        type: Number,
        default: 0,
        min: 0
    },
    emotes: {
        type: Number,
        default: 0,
        min: 0
    },
    teleports: {
        type: Number,
        default: 0,
        min: 0
    },
    whispersSent: {
        type: Number,
        default: 0,
        min: 0
    },
    connections: {
        type: Number,
        default: 0,
        min: 0
    },
    achievements: {
        type: [String],
        default: []
    },
    settings: {
        musicEnabled: { type: Boolean, default: true },
        volume: { type: Number, default: 70, min: 0, max: 100 },
        particlesEnabled: { type: Boolean, default: true },
        screenShake: { type: Boolean, default: true }
    },
    lastRealm: {
        type: String,
        default: 'genesis'
    },
    lastPosition: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'players'
});

export const Player: Model<IPlayer> = mongoose.model<IPlayer>('Player', PlayerSchema);


// ============================================
// FRIENDSHIP MODEL - Friend relationships
// ============================================

export interface IFriendship extends Document {
    playerId: string;        // Player who added the friend
    friendId: string;        // The friend's player ID
    friendName: string;      // Friend's display name (cached)
    createdAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>({
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
    friendName: {
        type: String,
        required: true,
        maxlength: 30
    }
}, {
    timestamps: true,
    collection: 'friendships'
});

// Compound unique index - one friendship per pair per direction
FriendshipSchema.index({ playerId: 1, friendId: 1 }, { unique: true });

export const Friendship: Model<IFriendship> = mongoose.model<IFriendship>('Friendship', FriendshipSchema);


// ============================================
// EXPORT ALL MODELS
// ============================================

export default {
    Echo,
    Message,
    LitStar,
    Player,
    Friendship
};
