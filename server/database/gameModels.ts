import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// Tag Game Result Model
// ==========================================

export interface ITagGameResult extends Document {
  sessionId: string;
  realm: string;
  
  // Game settings
  gameMode: 'classic' | 'freeze' | 'team' | 'infection';
  duration: number;           // In milliseconds
  maxPlayers: number;
  
  // Players
  players: Array<{
    playerId: string;
    playerName: string;
    team?: string;
    wasIt: boolean;
    tagsMade: number;
    timesTagged: number;
    totalTimeAsIt: number;
    score: number;
    placement: number;
  }>;
  
  // Results
  winner?: {
    playerId: string;
    playerName: string;
    finalScore: number;
  };
  winningTeam?: string;
  
  // Statistics
  totalTags: number;
  longestTagStreak: number;
  averageTagTime: number;
  
  // Timing
  startedAt: Date;
  endedAt: Date;
  
  // Rewards
  rewardsDistributed: boolean;
}

const TagGameResultSchema = new Schema<ITagGameResult>({
  sessionId: {
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
  gameMode: {
    type: String,
    required: true,
    enum: ['classic', 'freeze', 'team', 'infection'],
    default: 'classic'
  },
  duration: {
    type: Number,
    required: true
  },
  maxPlayers: {
    type: Number,
    default: 10
  },
  players: [{
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    team: String,
    wasIt: { type: Boolean, default: false },
    tagsMade: { type: Number, default: 0 },
    timesTagged: { type: Number, default: 0 },
    totalTimeAsIt: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    placement: { type: Number, default: 0 }
  }],
  winner: {
    playerId: String,
    playerName: String,
    finalScore: Number
  },
  winningTeam: String,
  totalTags: {
    type: Number,
    default: 0
  },
  longestTagStreak: {
    type: Number,
    default: 0
  },
  averageTagTime: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date,
    required: true
  },
  rewardsDistributed: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'tag_game_results'
});

TagGameResultSchema.index({ endedAt: -1 });
TagGameResultSchema.index({ 'players.playerId': 1 });

export const TagGameResult: Model<ITagGameResult> = mongoose.model<ITagGameResult>('TagGameResult', TagGameResultSchema);

// ==========================================
// Player Tag Stats Model (Aggregated)
// ==========================================

export interface IPlayerTagStats extends Document {
  playerId: string;
  
  // Lifetime stats
  gamesPlayed: number;
  wins: number;
  losses: number;
  
  // Tag stats
  totalTagsMade: number;
  totalTimesTagged: number;
  totalTimeAsIt: number;
  
  // Scoring
  totalScore: number;
  highScore: number;
  averageScore: number;
  
  // Streaks
  currentWinStreak: number;
  longestWinStreak: number;
  longestTagStreak: number;
  
  // Achievements
  perfectGames: number;       // Games without being tagged
  clutchWins: number;         // Wins in last 10 seconds
  
  // Rankings
  eloRating: number;
  rankTier: string;           // bronze, silver, gold, platinum, diamond
  
  lastGameAt: Date;
  updatedAt: Date;
}

const PlayerTagStatsSchema = new Schema<IPlayerTagStats>({
  playerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  totalTagsMade: {
    type: Number,
    default: 0
  },
  totalTimesTagged: {
    type: Number,
    default: 0
  },
  totalTimeAsIt: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  highScore: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  currentWinStreak: {
    type: Number,
    default: 0
  },
  longestWinStreak: {
    type: Number,
    default: 0
  },
  longestTagStreak: {
    type: Number,
    default: 0
  },
  perfectGames: {
    type: Number,
    default: 0
  },
  clutchWins: {
    type: Number,
    default: 0
  },
  eloRating: {
    type: Number,
    default: 1000
  },
  rankTier: {
    type: String,
    default: 'bronze',
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master']
  },
  lastGameAt: Date
}, {
  timestamps: true,
  collection: 'player_tag_stats'
});

PlayerTagStatsSchema.index({ eloRating: -1 });
PlayerTagStatsSchema.index({ rankTier: 1, eloRating: -1 });

export const PlayerTagStats: Model<IPlayerTagStats> = mongoose.model<IPlayerTagStats>('PlayerTagStats', PlayerTagStatsSchema);

// ==========================================
// Signal Log Model
// ==========================================

export interface ISignalLog extends Document {
  signalId: string;
  
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId?: string;        // Targeted signal
  toPlayerName?: string;
  
  signalType: 'ping' | 'wave' | 'heartbeat' | 'sos' | 'celebrate' | 'custom';
  customEmoji?: string;
  
  position: {
    x: number;
    y: number;
  };
  realm: string;
  
  // Visibility
  radius: number;
  playersInRange: number;
  
  timestamp: Date;
}

const SignalLogSchema = new Schema<ISignalLog>({
  signalId: {
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
    required: true
  },
  toPlayerId: String,
  toPlayerName: String,
  signalType: {
    type: String,
    required: true,
    enum: ['ping', 'wave', 'heartbeat', 'sos', 'celebrate', 'custom']
  },
  customEmoji: String,
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  realm: {
    type: String,
    required: true
  },
  radius: {
    type: Number,
    default: 300
  },
  playersInRange: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  collection: 'signal_logs'
});

// TTL - expire after 24 hours
SignalLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 24 * 60 * 60 });
SignalLogSchema.index({ realm: 1, timestamp: -1 });

export const SignalLog: Model<ISignalLog> = mongoose.model<ISignalLog>('SignalLog', SignalLogSchema);

// ==========================================
// Daily Login Reward Model
// ==========================================

export interface IDailyLoginReward {
  day: number;
  type: 'stardust' | 'xp' | 'cosmetic' | 'companion' | 'mystery_box';
  amount?: number;
  itemId?: string;
  name: string;
  icon: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface IDailyLoginRecord extends Document {
  playerId: string;
  
  // Current streak
  currentStreak: number;
  longestStreak: number;
  
  // Login tracking
  lastLoginDate: string;      // YYYY-MM-DD format
  totalLogins: number;
  
  // Rewards
  claimedToday: boolean;
  lastClaimedReward: IDailyLoginReward | null;
  totalRewardsClaimed: number;
  
  // Milestones
  milestonesReached: number[];
  
  createdAt: Date;
  updatedAt: Date;
}

const DailyLoginRecordSchema = new Schema<IDailyLoginRecord>({
  playerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastLoginDate: {
    type: String,
    default: ''
  },
  totalLogins: {
    type: Number,
    default: 0
  },
  claimedToday: {
    type: Boolean,
    default: false
  },
  lastClaimedReward: {
    type: Schema.Types.Mixed,
    default: null
  },
  totalRewardsClaimed: {
    type: Number,
    default: 0
  },
  milestonesReached: {
    type: [Number],
    default: []
  }
}, {
  timestamps: true,
  collection: 'daily_login_records'
});

export const DailyLoginRecord: Model<IDailyLoginRecord> = mongoose.model<IDailyLoginRecord>('DailyLoginRecord', DailyLoginRecordSchema);

// ==========================================
// Daily Rewards Configuration
// ==========================================

export const DAILY_REWARDS: IDailyLoginReward[] = [
  { day: 1, type: 'stardust', amount: 100, name: 'Stardust', icon: '✨' },
  { day: 2, type: 'xp', amount: 50, name: 'Experience', icon: '⭐' },
  { day: 3, type: 'stardust', amount: 150, name: 'Stardust', icon: '✨' },
  { day: 4, type: 'xp', amount: 75, name: 'Experience', icon: '⭐' },
  { day: 5, type: 'stardust', amount: 200, name: 'Stardust', icon: '✨' },
  { day: 6, type: 'xp', amount: 100, name: 'Experience', icon: '⭐' },
  { day: 7, type: 'mystery_box', name: 'Mystery Box', icon: '🎁', rarity: 'rare' },
];

export const STREAK_MILESTONES: Record<number, IDailyLoginReward> = {
  7: { day: 7, type: 'cosmetic', itemId: 'trail_weekly', name: 'Weekly Trail', icon: '🎁', rarity: 'uncommon' },
  14: { day: 14, type: 'stardust', amount: 1000, name: 'Two Week Bonus', icon: '🎁', rarity: 'rare' },
  30: { day: 30, type: 'cosmetic', itemId: 'aura_monthly', name: 'Monthly Aura', icon: '🏆', rarity: 'epic' },
  60: { day: 60, type: 'companion', itemId: 'companion_loyal', name: 'Loyal Companion', icon: '🐾', rarity: 'epic' },
  90: { day: 90, type: 'cosmetic', itemId: 'title_dedicated', name: 'Dedicated Title', icon: '👑', rarity: 'legendary' },
  180: { day: 180, type: 'cosmetic', itemId: 'aura_legendary', name: 'Legendary Aura', icon: '🌟', rarity: 'legendary' },
  365: { day: 365, type: 'cosmetic', itemId: 'title_annual', name: 'Annual Master', icon: '🎖️', rarity: 'legendary' },
};
