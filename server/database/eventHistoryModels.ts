import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// Completed World Event Model
// ==========================================

export interface ICompletedEvent extends Document {
  eventId: string;
  type: string;
  name: string;
  description?: string;
  realm: string;
  
  // Timing
  startTime: Date;
  endTime: Date;
  duration: number;           // In milliseconds
  
  // Participation
  totalParticipants: number;
  uniqueParticipants: string[];
  topContributors: Array<{
    playerId: string;
    playerName: string;
    contribution: number;
    rank: number;
    rewardMultiplier: number;
  }>;
  
  // Progress
  totalProgress: number;
  targetProgress: number;
  completed: boolean;
  
  // Rewards
  rewardsDistributed: boolean;
  totalRewardsDistributed: {
    stardust: number;
    xp: number;
    cosmetics: number;
  };
  
  createdAt: Date;
}

const CompletedEventSchema = new Schema<ICompletedEvent>({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  realm: {
    type: String,
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  totalParticipants: {
    type: Number,
    default: 0
  },
  uniqueParticipants: {
    type: [String],
    default: []
  },
  topContributors: [{
    playerId: String,
    playerName: String,
    contribution: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    rewardMultiplier: { type: Number, default: 1 }
  }],
  totalProgress: {
    type: Number,
    default: 0
  },
  targetProgress: {
    type: Number,
    default: 100
  },
  completed: {
    type: Boolean,
    default: false
  },
  rewardsDistributed: {
    type: Boolean,
    default: false
  },
  totalRewardsDistributed: {
    stardust: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    cosmetics: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'completed_events'
});

CompletedEventSchema.index({ endTime: -1 });
CompletedEventSchema.index({ type: 1, endTime: -1 });
CompletedEventSchema.index({ completed: 1, endTime: -1 });

export const CompletedEvent: Model<ICompletedEvent> = mongoose.model<ICompletedEvent>('CompletedEvent', CompletedEventSchema);

// ==========================================
// Player Event Participation Model
// ==========================================

export interface IEventParticipation extends Document {
  participationId: string;
  playerId: string;
  eventId: string;
  eventType: string;
  
  // Contribution
  contribution: number;
  rank?: number;
  percentile?: number;
  
  // Rewards earned
  rewardsEarned: {
    stardust: number;
    xp: number;
    cosmetics: string[];
  };
  rewardsClaimed: boolean;
  
  // Activity
  firstContribution: Date;
  lastContribution: Date;
  totalActions: number;
  
  createdAt: Date;
}

const EventParticipationSchema = new Schema<IEventParticipation>({
  participationId: {
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
  eventId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true
  },
  contribution: {
    type: Number,
    default: 0
  },
  rank: Number,
  percentile: Number,
  rewardsEarned: {
    stardust: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    cosmetics: { type: [String], default: [] }
  },
  rewardsClaimed: {
    type: Boolean,
    default: false
  },
  firstContribution: {
    type: Date,
    default: Date.now
  },
  lastContribution: {
    type: Date,
    default: Date.now
  },
  totalActions: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'event_participations'
});

EventParticipationSchema.index({ playerId: 1, eventId: 1 }, { unique: true });
EventParticipationSchema.index({ eventId: 1, contribution: -1 });

export const EventParticipation: Model<IEventParticipation> = mongoose.model<IEventParticipation>('EventParticipation', EventParticipationSchema);

// ==========================================
// Darkness Event Model
// ==========================================

export interface IDarknessEvent extends Document {
  eventId: string;
  realm: string;
  
  // Event parameters
  intensity: number;          // 1-10 scale
  radius: number;
  duration: number;
  
  // Participants
  survivors: Array<{
    playerId: string;
    playerName: string;
    timeInDarkness: number;
    lightUsed: number;
  }>;
  casualties: Array<{
    playerId: string;
    playerName: string;
    timeBeforeEnveloped: number;
  }>;
  
  // Location
  center: {
    x: number;
    y: number;
  };
  
  // Timing
  startedAt: Date;
  endedAt: Date;
  
  // Rewards
  survivalRewardMultiplier: number;
  bonusRewardsGranted: boolean;
}

const DarknessEventSchema = new Schema<IDarknessEvent>({
  eventId: {
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
  intensity: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  radius: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  survivors: [{
    playerId: String,
    playerName: String,
    timeInDarkness: { type: Number, default: 0 },
    lightUsed: { type: Number, default: 0 }
  }],
  casualties: [{
    playerId: String,
    playerName: String,
    timeBeforeEnveloped: { type: Number, default: 0 }
  }],
  center: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date,
    required: true
  },
  survivalRewardMultiplier: {
    type: Number,
    default: 1
  },
  bonusRewardsGranted: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'darkness_events'
});

DarknessEventSchema.index({ startedAt: -1 });
DarknessEventSchema.index({ realm: 1, startedAt: -1 });

export const DarknessEvent: Model<IDarknessEvent> = mongoose.model<IDarknessEvent>('DarknessEvent', DarknessEventSchema);

// ==========================================
// Power-Up Spawn Model
// ==========================================

export interface IPowerUpSpawn extends Document {
  spawnId: string;
  type: string;
  rarity: string;
  realm: string;
  
  position: {
    x: number;
    y: number;
  };
  
  spawnedAt: Date;
  expiresAt: Date;
  
  collectedBy?: string;
  collectedByName?: string;
  collectedAt?: Date;
  
  expired: boolean;
}

const PowerUpSpawnSchema = new Schema<IPowerUpSpawn>({
  spawnId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  rarity: {
    type: String,
    default: 'common',
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary']
  },
  realm: {
    type: String,
    required: true,
    index: true
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  spawnedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  collectedBy: String,
  collectedByName: String,
  collectedAt: Date,
  expired: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'powerup_spawns'
});

// TTL - auto-delete after 24 hours
PowerUpSpawnSchema.index({ spawnedAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });
PowerUpSpawnSchema.index({ realm: 1, expired: 1, expiresAt: 1 });

export const PowerUpSpawn: Model<IPowerUpSpawn> = mongoose.model<IPowerUpSpawn>('PowerUpSpawn', PowerUpSpawnSchema);
