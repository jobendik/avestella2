import { EventEmitter } from 'events';
import {
  SeasonConfig,
  SeasonProgress,
  SeasonHistory,
  ISeasonConfig,
  ISeasonProgress,
  ISeasonReward,
  generateDefaultSeasonRewards
} from '../database/seasonModels.js';
import { PlayerData } from '../database/playerDataModel.js';
import crypto from 'crypto';

interface SeasonXPResult {
  newXp: number;
  newTier: number;
  previousTier: number;
  tierUp: boolean;
  tiersGained: number;
  unclaimedRewards: number[];
  seasonId: string;
}

interface ClaimRewardResult {
  success: boolean;
  reward?: ISeasonReward;
  isPremium: boolean;
  error?: string;
  grantedItems?: {
    stardust?: number;
    xp?: number;
    cosmetic?: string;
    title?: string;
    companion?: string;
  };
}

interface SeasonInfo {
  seasonId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  maxTier: number;
  xpPerTier: number;
  isActive: boolean;
}

class SeasonPassService extends EventEmitter {
  private currentSeason: ISeasonConfig | null = null;
  private rotationCheckInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    console.log('🌟 Initializing Season Pass Service...');
    
    // Load current active season
    await this.loadCurrentSeason();
    
    // Schedule rotation check (every hour)
    this.scheduleRotationCheck();
    
    console.log(`🌟 Season Pass Service initialized. Current season: ${this.currentSeason?.name || 'None'}`);
  }

  // ==========================================
  // Season Management
  // ==========================================

  async getCurrentSeason(): Promise<SeasonInfo | null> {
    if (!this.currentSeason) {
      await this.loadCurrentSeason();
    }
    
    if (!this.currentSeason) {
      return null;
    }

    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil(
      (this.currentSeason.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    ));

    return {
      seasonId: this.currentSeason.seasonId,
      name: this.currentSeason.name,
      description: this.currentSeason.description,
      startDate: this.currentSeason.startDate,
      endDate: this.currentSeason.endDate,
      daysRemaining,
      maxTier: this.currentSeason.maxTier,
      xpPerTier: this.currentSeason.xpPerTier,
      isActive: this.currentSeason.isActive
    };
  }

  async getSeasonRewards(seasonId?: string): Promise<ISeasonReward[]> {
    const season = seasonId 
      ? await SeasonConfig.findOne({ seasonId })
      : this.currentSeason;
    
    return season?.rewards || [];
  }

  async createSeason(config: {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    maxTier?: number;
    xpPerTier?: number;
    rewards?: ISeasonReward[];
    activateImmediately?: boolean;
  }): Promise<ISeasonConfig> {
    const seasonId = `season_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const season = new SeasonConfig({
      seasonId,
      name: config.name,
      description: config.description || '',
      startDate: config.startDate,
      endDate: config.endDate,
      maxTier: config.maxTier || 100,
      xpPerTier: config.xpPerTier || 1000,
      rewards: config.rewards || generateDefaultSeasonRewards(config.maxTier || 100),
      isActive: config.activateImmediately || false
    });

    await season.save();

    if (config.activateImmediately) {
      this.currentSeason = season;
      this.emit('season_activated', { season });
    }

    console.log(`🌟 Created new season: ${season.name}`);
    return season;
  }

  // ==========================================
  // Player Progress
  // ==========================================

  async getPlayerProgress(playerId: string): Promise<ISeasonProgress | null> {
    if (!this.currentSeason) {
      return null;
    }

    let progress = await SeasonProgress.findOne({
      playerId,
      seasonId: this.currentSeason.seasonId
    });

    // Create new progress if doesn't exist
    if (!progress) {
      progress = new SeasonProgress({
        playerId,
        seasonId: this.currentSeason.seasonId,
        seasonXp: 0,
        seasonTier: 0,
        isPremiumPass: false,
        claimedFreeTiers: [],
        claimedPremiumTiers: []
      });
      await progress.save();
    }

    return progress;
  }

  async addSeasonXP(playerId: string, xp: number, source?: string): Promise<SeasonXPResult | null> {
    if (!this.currentSeason) {
      return null;
    }

    let progress = await this.getPlayerProgress(playerId);
    if (!progress) {
      return null;
    }

    const previousTier = progress.seasonTier;
    
    // Add XP
    progress.seasonXp += xp;
    progress.totalXpEarned += xp;
    progress.lastXpGain = new Date();

    // Calculate new tier
    const newTier = Math.min(
      Math.floor(progress.seasonXp / this.currentSeason.xpPerTier),
      this.currentSeason.maxTier
    );
    progress.seasonTier = newTier;

    await progress.save();

    const tierUp = newTier > previousTier;
    const tiersGained = newTier - previousTier;

    // Calculate unclaimed rewards
    const unclaimedRewards: number[] = [];
    for (let tier = 1; tier <= newTier; tier++) {
      if (!progress.claimedFreeTiers.includes(tier)) {
        unclaimedRewards.push(tier);
      }
    }

    // Emit events
    if (tierUp) {
      this.emit('tier_up', {
        playerId,
        seasonId: this.currentSeason.seasonId,
        previousTier,
        newTier,
        tiersGained
      });
    }

    this.emit('xp_gained', {
      playerId,
      xp,
      source,
      totalXp: progress.seasonXp,
      tier: newTier
    });

    return {
      newXp: progress.seasonXp,
      newTier,
      previousTier,
      tierUp,
      tiersGained,
      unclaimedRewards,
      seasonId: this.currentSeason.seasonId
    };
  }

  async claimTierReward(playerId: string, tier: number, claimPremium: boolean = false): Promise<ClaimRewardResult> {
    if (!this.currentSeason) {
      return { success: false, isPremium: false, error: 'No active season' };
    }

    const progress = await this.getPlayerProgress(playerId);
    if (!progress) {
      return { success: false, isPremium: false, error: 'Player not found' };
    }

    // Check if tier is reached
    if (tier > progress.seasonTier) {
      return { success: false, isPremium: false, error: 'Tier not reached yet' };
    }

    // Check if trying to claim premium without pass
    if (claimPremium && !progress.isPremiumPass) {
      return { success: false, isPremium: false, error: 'Premium pass required' };
    }

    // Check if already claimed
    const claimedList = claimPremium ? progress.claimedPremiumTiers : progress.claimedFreeTiers;
    if (claimedList.includes(tier)) {
      return { success: false, isPremium: claimPremium, error: 'Already claimed' };
    }

    // Get reward config
    const rewardConfig = this.currentSeason.rewards.find(r => r.tier === tier);
    if (!rewardConfig) {
      return { success: false, isPremium: claimPremium, error: 'Invalid tier' };
    }

    const reward = claimPremium ? rewardConfig.premium : rewardConfig.free;
    const grantedItems: ClaimRewardResult['grantedItems'] = {};

    // Grant rewards to player
    const player = await PlayerData.findOne({ playerId });
    if (player) {
      if (reward.stardust) {
        player.stardust = (player.stardust || 0) + reward.stardust;
        grantedItems.stardust = reward.stardust;
      }
      if (reward.xp) {
        player.xp = (player.xp || 0) + reward.xp;
        grantedItems.xp = reward.xp;
      }
      if (reward.cosmetic) {
        if (!player.cosmetics.ownedItems.includes(reward.cosmetic)) {
          player.cosmetics.ownedItems.push(reward.cosmetic);
        }
        grantedItems.cosmetic = reward.cosmetic;
      }
      if (reward.title) {
        // Assuming titles are stored in cosmetics or a separate field
        grantedItems.title = reward.title;
      }
      // Companion is only available on premium rewards
      const premiumReward = reward as { companion?: string };
      if (claimPremium && premiumReward.companion) {
        if (!player.companions.ownedIds.includes(premiumReward.companion)) {
          player.companions.ownedIds.push(premiumReward.companion);
        }
        grantedItems.companion = premiumReward.companion;
      }
      await player.save();
    }

    // Mark as claimed
    if (claimPremium) {
      progress.claimedPremiumTiers.push(tier);
    } else {
      progress.claimedFreeTiers.push(tier);
    }
    await progress.save();

    this.emit('reward_claimed', {
      playerId,
      seasonId: this.currentSeason.seasonId,
      tier,
      isPremium: claimPremium,
      reward: grantedItems
    });

    return {
      success: true,
      reward: rewardConfig,
      isPremium: claimPremium,
      grantedItems
    };
  }

  async claimAllAvailableRewards(playerId: string): Promise<{
    claimed: number;
    rewards: ClaimRewardResult[];
  }> {
    const progress = await this.getPlayerProgress(playerId);
    if (!progress) {
      return { claimed: 0, rewards: [] };
    }

    const rewards: ClaimRewardResult[] = [];

    // Claim free rewards
    for (let tier = 1; tier <= progress.seasonTier; tier++) {
      if (!progress.claimedFreeTiers.includes(tier)) {
        const result = await this.claimTierReward(playerId, tier, false);
        if (result.success) {
          rewards.push(result);
        }
      }
    }

    // Claim premium rewards if has pass
    if (progress.isPremiumPass) {
      for (let tier = 1; tier <= progress.seasonTier; tier++) {
        if (!progress.claimedPremiumTiers.includes(tier)) {
          const result = await this.claimTierReward(playerId, tier, true);
          if (result.success) {
            rewards.push(result);
          }
        }
      }
    }

    return {
      claimed: rewards.length,
      rewards
    };
  }

  // ==========================================
  // Premium Pass
  // ==========================================

  async upgradeToPremium(playerId: string): Promise<{
    success: boolean;
    retroactiveRewards?: number;
    error?: string;
  }> {
    const progress = await this.getPlayerProgress(playerId);
    if (!progress) {
      return { success: false, error: 'Player not found' };
    }

    if (progress.isPremiumPass) {
      return { success: false, error: 'Already has premium pass' };
    }

    progress.isPremiumPass = true;
    progress.premiumPurchaseDate = new Date();
    await progress.save();

    // Count retroactive rewards available
    let retroactiveRewards = 0;
    for (let tier = 1; tier <= progress.seasonTier; tier++) {
      if (!progress.claimedPremiumTiers.includes(tier)) {
        retroactiveRewards++;
      }
    }

    this.emit('premium_upgraded', {
      playerId,
      seasonId: this.currentSeason?.seasonId,
      retroactiveRewards
    });

    return { success: true, retroactiveRewards };
  }

  // ==========================================
  // Season Rotation
  // ==========================================

  async rotateSeason(newSeasonConfig?: {
    name: string;
    description?: string;
    durationDays?: number;
  }): Promise<void> {
    console.log('🔄 Rotating season...');

    if (this.currentSeason) {
      // Archive current season progress for all players
      await this.archiveSeasonProgress(this.currentSeason);
      
      // Deactivate current season
      this.currentSeason.isActive = false;
      await (this.currentSeason as any).save();
    }

    // Create new season
    const now = new Date();
    const durationDays = newSeasonConfig?.durationDays || 90;
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const newSeason = await this.createSeason({
      name: newSeasonConfig?.name || `Season ${Date.now()}`,
      description: newSeasonConfig?.description || 'A new season begins!',
      startDate: now,
      endDate,
      activateImmediately: true
    });

    this.emit('season_rotated', {
      previousSeasonId: this.currentSeason?.seasonId,
      newSeasonId: newSeason.seasonId
    });

    console.log(`🔄 Season rotated to: ${newSeason.name}`);
  }

  private async archiveSeasonProgress(season: ISeasonConfig): Promise<void> {
    const progressRecords = await SeasonProgress.find({ seasonId: season.seasonId });

    for (const progress of progressRecords) {
      const history = new SeasonHistory({
        playerId: progress.playerId,
        seasonId: season.seasonId,
        seasonName: season.name,
        finalTier: progress.seasonTier,
        finalXp: progress.seasonXp,
        wasPremium: progress.isPremiumPass,
        rewardsClaimed: progress.claimedFreeTiers.length,
        premiumRewardsClaimed: progress.claimedPremiumTiers.length,
        seasonStartDate: season.startDate,
        seasonEndDate: season.endDate
      });

      await history.save();
    }

    console.log(`📦 Archived ${progressRecords.length} player progress records`);
  }

  async getPlayerSeasonHistory(playerId: string): Promise<any[]> {
    return SeasonHistory.find({ playerId }).sort({ archivedAt: -1 });
  }

  // ==========================================
  // Private Methods
  // ==========================================

  private async loadCurrentSeason(): Promise<void> {
    this.currentSeason = await SeasonConfig.findOne({ isActive: true });

    // If no active season, create default
    if (!this.currentSeason) {
      console.log('🌟 No active season found, creating default...');
      
      const now = new Date();
      const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

      this.currentSeason = await this.createSeason({
        name: 'Cosmic Dawn',
        description: 'The first season of adventure begins!',
        startDate: now,
        endDate,
        activateImmediately: true
      });
    }
  }

  private scheduleRotationCheck(): void {
    // Check every hour if season needs rotation
    this.rotationCheckInterval = setInterval(async () => {
      if (this.currentSeason && new Date() > this.currentSeason.endDate) {
        await this.rotateSeason();
      }
    }, 60 * 60 * 1000);
  }

  shutdown(): void {
    if (this.rotationCheckInterval) {
      clearInterval(this.rotationCheckInterval);
    }
  }
}

export const seasonPassService = new SeasonPassService();
export { SeasonPassService };
