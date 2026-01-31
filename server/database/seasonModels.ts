import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// Season Configuration Model
// ==========================================

export interface ISeasonConfig extends Document {
  seasonId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  maxTier: number;
  xpPerTier: number;
  rewards: ISeasonReward[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISeasonReward {
  tier: number;
  free: {
    stardust?: number;
    xp?: number;
    cosmetic?: string;
    title?: string;
  };
  premium: {
    stardust?: number;
    xp?: number;
    cosmetic?: string;
    title?: string;
    companion?: string;
  };
}

const SeasonRewardSchema = new Schema<ISeasonReward>({
  tier: { type: Number, required: true },
  free: {
    stardust: Number,
    xp: Number,
    cosmetic: String,
    title: String
  },
  premium: {
    stardust: Number,
    xp: Number,
    cosmetic: String,
    title: String,
    companion: String
  }
}, { _id: false });

const SeasonConfigSchema = new Schema<ISeasonConfig>({
  seasonId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  maxTier: {
    type: Number,
    default: 100
  },
  xpPerTier: {
    type: Number,
    default: 1000
  },
  rewards: [SeasonRewardSchema],
  isActive: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'season_configs'
});

// Ensure only one active season
SeasonConfigSchema.pre('save', async function(next) {
  if (this.isActive) {
    await SeasonConfig.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { $set: { isActive: false } }
    );
  }
  next();
});

export const SeasonConfig: Model<ISeasonConfig> = mongoose.model<ISeasonConfig>('SeasonConfig', SeasonConfigSchema);

// ==========================================
// Season Progress Model (per player per season)
// ==========================================

export interface ISeasonProgress extends Document {
  playerId: string;
  seasonId: string;
  seasonXp: number;
  seasonTier: number;
  isPremiumPass: boolean;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
  premiumPurchaseDate?: Date;
  lastXpGain: Date;
  totalXpEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

const SeasonProgressSchema = new Schema<ISeasonProgress>({
  playerId: {
    type: String,
    required: true,
    index: true
  },
  seasonId: {
    type: String,
    required: true,
    index: true
  },
  seasonXp: {
    type: Number,
    default: 0
  },
  seasonTier: {
    type: Number,
    default: 0
  },
  isPremiumPass: {
    type: Boolean,
    default: false
  },
  claimedFreeTiers: {
    type: [Number],
    default: []
  },
  claimedPremiumTiers: {
    type: [Number],
    default: []
  },
  premiumPurchaseDate: Date,
  lastXpGain: {
    type: Date,
    default: Date.now
  },
  totalXpEarned: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'season_progress'
});

// Compound index for efficient lookups
SeasonProgressSchema.index({ playerId: 1, seasonId: 1 }, { unique: true });

export const SeasonProgress: Model<ISeasonProgress> = mongoose.model<ISeasonProgress>('SeasonProgress', SeasonProgressSchema);

// ==========================================
// Season History Model (archived seasons)
// ==========================================

export interface ISeasonHistory extends Document {
  playerId: string;
  seasonId: string;
  seasonName: string;
  finalTier: number;
  finalXp: number;
  wasPremium: boolean;
  rewardsClaimed: number;
  premiumRewardsClaimed: number;
  seasonStartDate: Date;
  seasonEndDate: Date;
  archivedAt: Date;
}

const SeasonHistorySchema = new Schema<ISeasonHistory>({
  playerId: {
    type: String,
    required: true,
    index: true
  },
  seasonId: {
    type: String,
    required: true
  },
  seasonName: {
    type: String,
    required: true
  },
  finalTier: {
    type: Number,
    required: true
  },
  finalXp: {
    type: Number,
    required: true
  },
  wasPremium: {
    type: Boolean,
    default: false
  },
  rewardsClaimed: {
    type: Number,
    default: 0
  },
  premiumRewardsClaimed: {
    type: Number,
    default: 0
  },
  seasonStartDate: Date,
  seasonEndDate: Date,
  archivedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'season_history'
});

SeasonHistorySchema.index({ playerId: 1, archivedAt: -1 });

export const SeasonHistory: Model<ISeasonHistory> = mongoose.model<ISeasonHistory>('SeasonHistory', SeasonHistorySchema);

// ==========================================
// Default Season Rewards Generator
// ==========================================

export function generateDefaultSeasonRewards(maxTier: number = 100): ISeasonReward[] {
  const rewards: ISeasonReward[] = [];
  
  for (let tier = 1; tier <= maxTier; tier++) {
    const reward: ISeasonReward = {
      tier,
      free: {},
      premium: {}
    };

    // Free rewards every 5 tiers
    if (tier % 5 === 0) {
      reward.free.stardust = tier * 20;
    }
    
    // Premium rewards every tier
    reward.premium.stardust = tier * 10;
    
    // Special milestone rewards
    if (tier === 10) {
      reward.free.cosmetic = 'trail_season_basic';
      reward.premium.cosmetic = 'trail_season_premium';
    } else if (tier === 25) {
      reward.free.stardust = 500;
      reward.premium.cosmetic = 'aura_season_glow';
    } else if (tier === 50) {
      reward.free.cosmetic = 'particle_season_basic';
      reward.premium.title = 'Season Traveler';
    } else if (tier === 75) {
      reward.free.stardust = 1000;
      reward.premium.cosmetic = 'aura_season_radiant';
    } else if (tier === 100) {
      reward.free.title = 'Season Finisher';
      reward.premium.companion = 'companion_season_exclusive';
      reward.premium.title = 'Season Master';
      reward.premium.stardust = 5000;
    }

    rewards.push(reward);
  }

  return rewards;
}
