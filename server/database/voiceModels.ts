import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// Voice Session Model
// ==========================================

export interface IVoiceSession extends Document {
  sessionId: string;
  roomId: string;
  roomName: string;
  realm: string;
  
  // Session details
  type: 'proximity' | 'channel' | 'private' | 'group';
  maxParticipants: number;
  
  // Participants
  participants: Array<{
    playerId: string;
    playerName: string;
    joinedAt: Date;
    leftAt?: Date;
    duration: number;       // In milliseconds
    speakTime: number;      // Time spent speaking
    wasMuted: boolean;
    wasDeafened: boolean;
  }>;
  
  // Statistics
  peakParticipants: number;
  totalDuration: number;
  averageParticipants: number;
  
  // Timing
  startedAt: Date;
  endedAt?: Date;
  
  // Host info (if applicable)
  hostId?: string;
  hostName?: string;
}

const VoiceSessionSchema = new Schema<IVoiceSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  roomName: {
    type: String,
    required: true
  },
  realm: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['proximity', 'channel', 'private', 'group'],
    default: 'channel'
  },
  maxParticipants: {
    type: Number,
    default: 10
  },
  participants: [{
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: Date,
    duration: { type: Number, default: 0 },
    speakTime: { type: Number, default: 0 },
    wasMuted: { type: Boolean, default: false },
    wasDeafened: { type: Boolean, default: false }
  }],
  peakParticipants: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  averageParticipants: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  hostId: String,
  hostName: String
}, {
  collection: 'voice_sessions'
});

VoiceSessionSchema.index({ startedAt: -1 });
VoiceSessionSchema.index({ realm: 1, startedAt: -1 });
VoiceSessionSchema.index({ 'participants.playerId': 1 });

export const VoiceSession: Model<IVoiceSession> = mongoose.model<IVoiceSession>('VoiceSession', VoiceSessionSchema);

// ==========================================
// Voice Room Model (Persistent Channels)
// ==========================================

export interface IVoiceRoom extends Document {
  roomId: string;
  name: string;
  description?: string;
  realm: string;
  
  // Settings
  type: 'public' | 'private' | 'guild';
  maxParticipants: number;
  isPasswordProtected: boolean;
  passwordHash?: string;
  
  // Position (for proximity-based rooms)
  position?: {
    x: number;
    y: number;
  };
  radius?: number;
  
  // Owner/Guild
  ownerId?: string;
  ownerName?: string;
  guildId?: string;
  
  // Permissions
  allowedUsers?: string[];
  bannedUsers?: string[];
  moderators?: string[];
  
  // Status
  isActive: boolean;
  currentParticipants: number;
  
  // Stats
  totalSessions: number;
  totalVisitors: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const VoiceRoomSchema = new Schema<IVoiceRoom>({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200
  },
  realm: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['public', 'private', 'guild'],
    default: 'public'
  },
  maxParticipants: {
    type: Number,
    default: 10,
    max: 50
  },
  isPasswordProtected: {
    type: Boolean,
    default: false
  },
  passwordHash: String,
  position: {
    x: Number,
    y: Number
  },
  radius: {
    type: Number,
    default: 200
  },
  ownerId: String,
  ownerName: String,
  guildId: String,
  allowedUsers: {
    type: [String],
    default: []
  },
  bannedUsers: {
    type: [String],
    default: []
  },
  moderators: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  totalVisitors: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'voice_rooms'
});

VoiceRoomSchema.index({ realm: 1, isActive: 1 });
VoiceRoomSchema.index({ guildId: 1 });
VoiceRoomSchema.index({ ownerId: 1 });

export const VoiceRoom: Model<IVoiceRoom> = mongoose.model<IVoiceRoom>('VoiceRoom', VoiceRoomSchema);

// ==========================================
// Voice Activity Log (for analytics)
// ==========================================

export interface IVoiceActivityLog extends Document {
  logId: string;
  playerId: string;
  roomId: string;
  sessionId: string;
  
  action: 'join' | 'leave' | 'mute' | 'unmute' | 'deafen' | 'undeafen' | 'speak_start' | 'speak_end';
  timestamp: Date;
  
  metadata?: {
    duration?: number;      // For speak_end, leave
    reason?: string;        // For leave (disconnect, kick, etc.)
  };
}

const VoiceActivityLogSchema = new Schema<IVoiceActivityLog>({
  logId: {
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
  roomId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['join', 'leave', 'mute', 'unmute', 'deafen', 'undeafen', 'speak_start', 'speak_end']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    duration: Number,
    reason: String
  }
}, {
  collection: 'voice_activity_logs'
});

// TTL - expire after 7 days
VoiceActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
VoiceActivityLogSchema.index({ sessionId: 1, timestamp: 1 });

export const VoiceActivityLog: Model<IVoiceActivityLog> = mongoose.model<IVoiceActivityLog>('VoiceActivityLog', VoiceActivityLogSchema);
