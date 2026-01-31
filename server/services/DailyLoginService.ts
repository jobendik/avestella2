import { EventEmitter } from 'events';
import {
  DailyLoginRecord,
  IDailyLoginRecord,
  IDailyLoginReward,
  DAILY_REWARDS,
  STREAK_MILESTONES
} from '../database/gameModels.js';
import { PlayerData } from '../database/playerDataModel.js';

interface DailyLoginResult {
  isNewDay: boolean;
  currentStreak: number;
  previousStreak: number;
  streakBroken: boolean;
  reward: IDailyLoginReward;
  streakBonus: number;
  bonusAmount: number;
  milestoneReward?: IDailyLoginReward;
  nextMilestone?: {
    streak: number;
    reward: IDailyLoginReward;
    daysAway: number;
  };
  totalLogins: number;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string;
  claimedToday: boolean;
  nextReward: IDailyLoginReward;
  streakBonus: number;
  milestonesReached: number[];
  nextMilestone?: {
    streak: number;
    reward: IDailyLoginReward;
    daysAway: number;
  };
}

class DailyLoginService extends EventEmitter {
  private readonly MAX_STREAK_BONUS = 50; // 50% max bonus

  async initialize(): Promise<void> {
    console.log('📅 Daily Login Service initialized');
  }

  // ==========================================
  // Core Login Processing
  // ==========================================

  async processDailyLogin(playerId: string): Promise<DailyLoginResult> {
    let record = await DailyLoginRecord.findOne({ playerId });

    // Create new record if doesn't exist
    if (!record) {
      record = new DailyLoginRecord({
        playerId,
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: '',
        totalLogins: 0,
        claimedToday: false,
        milestonesReached: []
      });
    }

    const today = this.getTodayString();
    const previousStreak = record.currentStreak;
    let streakBroken = false;

    // Check if already logged in today
    if (record.lastLoginDate === today) {
      return {
        isNewDay: false,
        currentStreak: record.currentStreak,
        previousStreak,
        streakBroken: false,
        reward: this.getRewardForDay(record.currentStreak),
        streakBonus: this.calculateStreakBonus(record.currentStreak),
        bonusAmount: 0,
        totalLogins: record.totalLogins,
        nextMilestone: this.getNextMilestone(record.currentStreak)
      };
    }

    // Check streak continuity
    const yesterday = this.getYesterdayString();
    let newStreak: number;

    if (record.lastLoginDate === yesterday || record.lastLoginDate === '') {
      // Continue streak or first login
      newStreak = record.currentStreak + 1;
    } else {
      // Streak broken
      newStreak = 1;
      streakBroken = record.currentStreak > 0;
      
      this.emit('streak_broken', {
        playerId,
        previousStreak: record.currentStreak,
        lastLoginDate: record.lastLoginDate
      });
    }

    // Calculate rewards
    const reward = this.getRewardForDay(newStreak);
    const streakBonus = this.calculateStreakBonus(newStreak);
    let bonusAmount = 0;

    // Apply rewards to player
    const player = await PlayerData.findOne({ playerId });
    if (player) {
      if (reward.type === 'stardust' && reward.amount) {
        bonusAmount = Math.floor(reward.amount * (streakBonus / 100));
        const totalReward = reward.amount + bonusAmount;
        player.stardust = (player.stardust || 0) + totalReward;
      } else if (reward.type === 'xp' && reward.amount) {
        bonusAmount = Math.floor(reward.amount * (streakBonus / 100));
        const totalReward = reward.amount + bonusAmount;
        player.xp = (player.xp || 0) + totalReward;
      } else if (reward.type === 'mystery_box') {
        // Add mystery box to inventory (implementation depends on your mystery box system)
        this.emit('mystery_box_granted', { playerId, rarity: reward.rarity });
      }
      await player.save();
    }

    // Check for milestone reward
    let milestoneReward: IDailyLoginReward | undefined;
    if (STREAK_MILESTONES[newStreak]) {
      milestoneReward = STREAK_MILESTONES[newStreak];
      
      // Grant milestone reward
      if (player) {
        await this.grantMilestoneReward(player, milestoneReward);
      }

      // Track milestone
      if (!record.milestonesReached.includes(newStreak)) {
        record.milestonesReached.push(newStreak);
      }

      this.emit('milestone_reached', {
        playerId,
        milestone: newStreak,
        reward: milestoneReward
      });
    }

    // Update record
    record.currentStreak = newStreak;
    record.lastLoginDate = today;
    record.totalLogins += 1;
    record.claimedToday = true;
    record.lastClaimedReward = reward;
    record.totalRewardsClaimed += 1;

    if (newStreak > record.longestStreak) {
      record.longestStreak = newStreak;
    }

    await record.save();

    // Emit login event
    this.emit('daily_login', {
      playerId,
      streak: newStreak,
      reward,
      streakBonus,
      milestoneReward
    });

    return {
      isNewDay: true,
      currentStreak: newStreak,
      previousStreak,
      streakBroken,
      reward,
      streakBonus,
      bonusAmount,
      milestoneReward,
      nextMilestone: this.getNextMilestone(newStreak),
      totalLogins: record.totalLogins
    };
  }

  // ==========================================
  // Streak Info
  // ==========================================

  async getStreakInfo(playerId: string): Promise<StreakInfo> {
    let record = await DailyLoginRecord.findOne({ playerId });

    if (!record) {
      record = new DailyLoginRecord({
        playerId,
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: '',
        totalLogins: 0,
        claimedToday: false,
        milestonesReached: []
      });
      await record.save();
    }

    const today = this.getTodayString();
    const yesterday = this.getYesterdayString();
    
    // Check if streak is still valid
    let currentStreak = record.currentStreak;
    if (record.lastLoginDate !== today && record.lastLoginDate !== yesterday) {
      // Streak is broken but not yet processed
      currentStreak = 0;
    }

    const claimedToday = record.lastLoginDate === today;
    const nextReward = this.getRewardForDay(currentStreak + 1);
    const streakBonus = this.calculateStreakBonus(currentStreak);

    return {
      currentStreak,
      longestStreak: record.longestStreak,
      lastLoginDate: record.lastLoginDate,
      claimedToday,
      nextReward,
      streakBonus,
      milestonesReached: record.milestonesReached,
      nextMilestone: this.getNextMilestone(currentStreak)
    };
  }

  // ==========================================
  // Reward Helpers
  // ==========================================

  getRewardForDay(streak: number): IDailyLoginReward {
    // Cycle through 7-day rewards
    const dayInCycle = ((streak - 1) % 7) + 1;
    return DAILY_REWARDS[dayInCycle - 1] || DAILY_REWARDS[0];
  }

  calculateStreakBonus(streak: number): number {
    // 2% bonus per week of streak, max 50%
    const weeksComplete = Math.floor(streak / 7);
    return Math.min(weeksComplete * 2, this.MAX_STREAK_BONUS);
  }

  getNextMilestone(currentStreak: number): { streak: number; reward: IDailyLoginReward; daysAway: number } | undefined {
    const milestones = Object.keys(STREAK_MILESTONES)
      .map(Number)
      .sort((a, b) => a - b);
    
    const next = milestones.find(m => m > currentStreak);
    if (next) {
      return {
        streak: next,
        reward: STREAK_MILESTONES[next],
        daysAway: next - currentStreak
      };
    }
    return undefined;
  }

  getAllMilestones(): Record<number, IDailyLoginReward> {
    return STREAK_MILESTONES;
  }

  getWeeklyRewards(): IDailyLoginReward[] {
    return DAILY_REWARDS;
  }

  // ==========================================
  // Leaderboards
  // ==========================================

  async getStreakLeaderboard(limit: number = 50): Promise<Array<{
    playerId: string;
    currentStreak: number;
    longestStreak: number;
    totalLogins: number;
  }>> {
    const records = await DailyLoginRecord
      .find()
      .sort({ currentStreak: -1 })
      .limit(limit)
      .select('playerId currentStreak longestStreak totalLogins');

    return records.map(r => ({
      playerId: r.playerId,
      currentStreak: r.currentStreak,
      longestStreak: r.longestStreak,
      totalLogins: r.totalLogins
    }));
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterdayString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  private async grantMilestoneReward(player: any, reward: IDailyLoginReward): Promise<void> {
    if (reward.type === 'stardust' && reward.amount) {
      player.stardust = (player.stardust || 0) + reward.amount;
    } else if (reward.type === 'cosmetic' && reward.itemId) {
      if (!player.cosmetics.ownedItems.includes(reward.itemId)) {
        player.cosmetics.ownedItems.push(reward.itemId);
      }
    } else if (reward.type === 'companion' && reward.itemId) {
      if (!player.companions.ownedIds.includes(reward.itemId)) {
        player.companions.ownedIds.push(reward.itemId);
      }
    }
    await player.save();
  }

  // ==========================================
  // Admin Functions
  // ==========================================

  async resetStreak(playerId: string): Promise<boolean> {
    const result = await DailyLoginRecord.findOneAndUpdate(
      { playerId },
      { 
        $set: { 
          currentStreak: 0,
          claimedToday: false
        }
      }
    );
    return !!result;
  }

  async setStreak(playerId: string, streak: number): Promise<boolean> {
    const result = await DailyLoginRecord.findOneAndUpdate(
      { playerId },
      { 
        $set: { 
          currentStreak: streak,
          lastLoginDate: this.getTodayString()
        }
      }
    );
    return !!result;
  }
}

export const dailyLoginService = new DailyLoginService();
export { DailyLoginService };
