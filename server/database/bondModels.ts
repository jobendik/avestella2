// =============================================================================
// Bond Models - Database models for Bond system, Star Memories, Constellations
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// BOND MODEL
// ============================================

export interface IBond extends Document {
    player1Id: string;
    player2Id: string;
    strength: number;           // 0-100, decays over time
    consent: 'pending' | 'mutual' | 'declined';
    mode: 'silent' | 'whisper' | 'voice';
    sealed: boolean;
    sealWord1?: string;         // Word from player1
    sealWord2?: string;         // Word from player2
    sealedAt?: Date;
    lastInteraction: Date;
    stats: {
        pulsesSent: number;
        pulsesReceived: number;
        whispersSent: number;
        whispersReceived: number;
        lightGifted: number;
        lightReceived: number;
        timeSpentNear: number;  // in seconds
    };
    sharedMemories: Array<{
        text: string;
        timestamp: Date;
    }>;
    realmId?: string;           // Realm where bond was formed
    createdAt: Date;
    updatedAt: Date;
}

const BondSchema = new Schema<IBond>({
    player1Id: { type: String, required: true },
    player2Id: { type: String, required: true },
    strength: { type: Number, default: 0, min: 0, max: 100 },
    consent: {
        type: String,
        enum: ['pending', 'mutual', 'declined'],
        default: 'pending'
    },
    mode: {
        type: String,
        enum: ['silent', 'whisper', 'voice'],
        default: 'silent'
    },
    sealed: { type: Boolean, default: false },
    sealWord1: { type: String, maxlength: 50 },
    sealWord2: { type: String, maxlength: 50 },
    sealedAt: { type: Date },
    lastInteraction: { type: Date, default: Date.now },
    stats: {
        pulsesSent: { type: Number, default: 0 },
        pulsesReceived: { type: Number, default: 0 },
        whispersSent: { type: Number, default: 0 },
        whispersReceived: { type: Number, default: 0 },
        lightGifted: { type: Number, default: 0 },
        lightReceived: { type: Number, default: 0 },
        timeSpentNear: { type: Number, default: 0 }
    },
    sharedMemories: [{
        text: { type: String, maxlength: 200 },
        timestamp: { type: Date, default: Date.now }
    }],
    realmId: { type: String }
}, {
    timestamps: true,
    collection: 'bonds'
});

// Compound index for quick lookups - ensure unique bond pairs
BondSchema.index({ player1Id: 1, player2Id: 1 }, { unique: true });
BondSchema.index({ strength: -1 }); // For leaderboards

export const Bond: Model<IBond> = mongoose.model<IBond>('Bond', BondSchema);

// ============================================
// STAR MEMORY MODEL (Sealed Bonds)
// ============================================

export interface IStarMemory extends Document {
    bondId: string;
    player1Id: string;
    player1Name: string;
    player1Color: string;
    player2Id: string;
    player2Name: string;
    player2Color: string;
    word1: string;              // Seal word from player1
    word2: string;              // Seal word from player2
    combinedPhrase: string;     // Generated phrase from both words
    sealedAt: Date;
    realmId: string;
    position?: {                // Where in the sky this star appears
        x: number;
        y: number;
    };
    brightness: number;         // Visual intensity based on bond strength at seal
    constellation?: string;     // If part of a constellation
}

const StarMemorySchema = new Schema<IStarMemory>({
    bondId: { type: String, required: true, index: true },
    player1Id: { type: String, required: true, index: true },
    player1Name: { type: String, required: true },
    player1Color: { type: String, required: true },
    player2Id: { type: String, required: true, index: true },
    player2Name: { type: String, required: true },
    player2Color: { type: String, required: true },
    word1: { type: String, required: true, maxlength: 50 },
    word2: { type: String, required: true, maxlength: 50 },
    combinedPhrase: { type: String, maxlength: 150 },
    sealedAt: { type: Date, default: Date.now },
    realmId: { type: String, required: true },
    position: {
        x: { type: Number },
        y: { type: Number }
    },
    brightness: { type: Number, default: 1, min: 0.1, max: 5 },
    constellation: { type: String }
}, {
    timestamps: true,
    collection: 'star_memories'
});

StarMemorySchema.index({ player1Id: 1, player2Id: 1 });
StarMemorySchema.index({ constellation: 1 });
StarMemorySchema.index({ realmId: 1 });

export const StarMemory: Model<IStarMemory> = mongoose.model<IStarMemory>('StarMemory', StarMemorySchema);

// ============================================
// CONSTELLATION MODEL
// ============================================

export interface IConstellation extends Document {
    name: string;
    description: string;
    playerIds: string[];        // All players who are part of this constellation
    starMemoryIds: string[];    // All sealed bonds forming this constellation
    formedAt: Date;
    realmId: string;
    shape: Array<{              // Line connections between stars
        from: { x: number; y: number };
        to: { x: number; y: number };
    }>;
    bonusType: 'xp' | 'stardust' | 'cosmetic' | 'title';
    bonusAmount: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const ConstellationSchema = new Schema<IConstellation>({
    name: { type: String, required: true },
    description: { type: String },
    playerIds: [{ type: String }],
    starMemoryIds: [{ type: String }],
    formedAt: { type: Date, default: Date.now },
    realmId: { type: String, required: true },
    shape: [{
        from: { x: Number, y: Number },
        to: { x: Number, y: Number }
    }],
    bonusType: {
        type: String,
        enum: ['xp', 'stardust', 'cosmetic', 'title'],
        default: 'stardust'
    },
    bonusAmount: { type: Number, default: 100 },
    rarity: {
        type: String,
        enum: ['common', 'rare', 'epic', 'legendary'],
        default: 'common'
    }
}, {
    timestamps: true,
    collection: 'constellations'
});

ConstellationSchema.index({ playerIds: 1 });
ConstellationSchema.index({ realmId: 1 });

export const Constellation: Model<IConstellation> = mongoose.model<IConstellation>('Constellation', ConstellationSchema);
