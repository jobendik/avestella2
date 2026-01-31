// =============================================================================
// Map Marker Models - Database models for map markers
// =============================================================================
// Phase 2.1: Map marker persistence
// =============================================================================

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// MAP MARKER INTERFACE
// ============================================

export interface IMapMarker extends Document {
    markerId: string;
    playerId: string;
    playerName: string;
    realm: string;
    x: number;
    y: number;
    markerType: 'temporary' | 'permanent' | 'shared' | 'beacon' | 'waypoint' | 'custom';
    iconType: string;
    label: string;
    description?: string;
    color?: string;
    visibility: 'private' | 'friends' | 'constellation' | 'public';
    sharedWith: string[]; // Player IDs or constellation IDs
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    metadata?: {
        votes?: number;
        reports?: number;
        linkedQuestId?: string;
        linkedEventId?: string;
        [key: string]: any;
    };
}

// ============================================
// MAP MARKER SCHEMA
// ============================================

const MapMarkerSchema = new Schema<IMapMarker>({
    markerId: { 
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
    playerName: { 
        type: String, 
        required: true 
    },
    realm: { 
        type: String, 
        required: true,
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
    markerType: { 
        type: String, 
        enum: ['temporary', 'permanent', 'shared', 'beacon', 'waypoint', 'custom'],
        default: 'temporary'
    },
    iconType: { 
        type: String, 
        default: 'default' 
    },
    label: { 
        type: String, 
        required: true,
        maxlength: 50
    },
    description: { 
        type: String,
        maxlength: 200
    },
    color: { 
        type: String,
        default: '#ffffff'
    },
    visibility: { 
        type: String, 
        enum: ['private', 'friends', 'constellation', 'public'],
        default: 'private'
    },
    sharedWith: [{ 
        type: String 
    }],
    expiresAt: { 
        type: Date,
        index: { expireAfterSeconds: 0 } // TTL index for auto-deletion
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },
    metadata: {
        votes: { type: Number, default: 0 },
        reports: { type: Number, default: 0 },
        linkedQuestId: String,
        linkedEventId: String
    }
}, { 
    collection: 'mapMarkers',
    timestamps: true
});

// Compound indexes for efficient queries
MapMarkerSchema.index({ realm: 1, visibility: 1 });
MapMarkerSchema.index({ playerId: 1, realm: 1 });
MapMarkerSchema.index({ realm: 1, x: 1, y: 1 });
MapMarkerSchema.index({ sharedWith: 1 });
MapMarkerSchema.index({ 'metadata.linkedEventId': 1 });

// ============================================
// SHARED MARKER INVITE INTERFACE
// ============================================

export interface IMarkerShareInvite extends Document {
    inviteId: string;
    markerId: string;
    fromPlayerId: string;
    fromPlayerName: string;
    toPlayerId: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    createdAt: Date;
    expiresAt: Date;
}

// ============================================
// MARKER SHARE INVITE SCHEMA
// ============================================

const MarkerShareInviteSchema = new Schema<IMarkerShareInvite>({
    inviteId: {
        type: String,
        required: true,
        unique: true
    },
    markerId: {
        type: String,
        required: true,
        index: true
    },
    fromPlayerId: {
        type: String,
        required: true
    },
    fromPlayerName: {
        type: String,
        required: true
    },
    toPlayerId: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
}, { collection: 'markerShareInvites' });

// TTL index for auto-expiration
MarkerShareInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ============================================
// MARKER PRESET INTERFACE (Player's saved marker styles)
// ============================================

export interface IMarkerPreset extends Document {
    playerId: string;
    presetId: string;
    name: string;
    iconType: string;
    color: string;
    defaultVisibility: 'private' | 'friends' | 'constellation' | 'public';
    createdAt: Date;
}

const MarkerPresetSchema = new Schema<IMarkerPreset>({
    playerId: {
        type: String,
        required: true,
        index: true
    },
    presetId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 30
    },
    iconType: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    defaultVisibility: {
        type: String,
        enum: ['private', 'friends', 'constellation', 'public'],
        default: 'private'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'markerPresets' });

MarkerPresetSchema.index({ playerId: 1, presetId: 1 }, { unique: true });

// ============================================
// EXPORTS
// ============================================

export const MapMarker = (mongoose.models.MapMarker || 
    mongoose.model<IMapMarker>('MapMarker', MapMarkerSchema)) as Model<IMapMarker>;

export const MarkerShareInvite = (mongoose.models.MarkerShareInvite || 
    mongoose.model<IMarkerShareInvite>('MarkerShareInvite', MarkerShareInviteSchema)) as Model<IMarkerShareInvite>;

export const MarkerPreset = (mongoose.models.MarkerPreset || 
    mongoose.model<IMarkerPreset>('MarkerPreset', MarkerPresetSchema)) as Model<IMarkerPreset>;

// ============================================
// HELPER TYPES
// ============================================

export interface CreateMarkerInput {
    playerId: string;
    playerName: string;
    realm: string;
    x: number;
    y: number;
    markerType?: 'temporary' | 'permanent' | 'shared' | 'beacon' | 'waypoint' | 'custom';
    iconType?: string;
    label: string;
    description?: string;
    color?: string;
    visibility?: 'private' | 'friends' | 'constellation' | 'public';
    sharedWith?: string[];
    expiresInMs?: number;
    metadata?: Record<string, any>;
}

export interface MarkerQueryOptions {
    realm?: string;
    playerId?: string;
    visibility?: string | string[];
    markerType?: string | string[];
    bounds?: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
    includeExpired?: boolean;
    limit?: number;
    skip?: number;
}
