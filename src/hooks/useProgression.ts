// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Progression Hook
// ═══════════════════════════════════════════════════════════════════════════
// Server-synced progression - all data persisted to MongoDB via WebSocket

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useServerSync } from './useServerSync';
import type { PlayerStats } from '@/types';
import {
  BASE_XP_TO_LEVEL,
  XP_MULTIPLIER,
  DAILY_REWARDS,
  SEASON_PASS_REWARDS,
  SEASON_XP_PER_TIER,
  getStreakBonusForStreak,
  getRewardForDay,
  getUpcomingRewards as getUpcomingRewardsHelper,
  calculateXPWithGuildBonus,
} from '@/constants/progression';
import type { DailyReward, LevelUpData, FinalReward } from '@/types';

// Calculate XP required for a given level
const calculateXPForLevel = (level: number): number => {
  return Math.floor(BASE_XP_TO_LEVEL * Math.pow(XP_MULTIPLIER, level - 1));
};

export interface ProgressionState {
  level: number;
  xp: number;
  xpToNextLevel: number;
  stardust: number;
  dailyLoginStreak: number;
  longestStreak: number;           // legacy_2: track longest streak ever
  totalLogins: number;             // legacy_2: track total login days
  lastLoginDate: string | null;
  currentMonth: string | null;     // legacy_2: for monthly reset tracking
  seasonPassTier: number;
  seasonPassXP: number;
  achievements: string[];
  claimedDailyRewards: number[];
  claimedSeasonRewards: number[];
  guildBonus: number;              // legacy_2: guild XP multiplier (0.0 - 0.5)
}

export interface UseProgressionReturn {
  state: ProgressionState;
  addXP: (amount: number, guildBonus?: number) => LevelUpData | null;
  addStardust: (amount: number) => void;
  spendStardust: (amount: number) => boolean;
  claimDailyReward: () => { success: boolean; reward: FinalReward | null };
  updateDailyStreak: () => { streakLost: boolean };
  addSeasonXP: (amount: number) => { tieredUp: boolean; newTier: number };
  claimSeasonReward: (tier: number) => boolean;
  unlockAchievement: (achievementId: string) => boolean;
  hasAchievement: (achievementId: string) => boolean;
  getProgressToNextLevel: () => number;
  getTotalXP: () => number;
  setLevel: (level: number) => void;
  setGuildBonus: (bonus: number) => void;
  getUpcomingRewards: (count?: number) => DailyReward[];
  saveProgress: () => void;
  loadProgress: () => void;
}

const DEFAULT_STATE: ProgressionState = {
  level: 1,
  xp: 0,
  xpToNextLevel: BASE_XP_TO_LEVEL,
  stardust: 0,
  dailyLoginStreak: 0,
  longestStreak: 0,
  totalLogins: 0,
  lastLoginDate: null,
  currentMonth: null,
  seasonPassTier: 0,
  seasonPassXP: 0,
  achievements: [],
  claimedDailyRewards: [],
  claimedSeasonRewards: [],
  guildBonus: 0,
};

export function useProgression(playerId?: string): UseProgressionReturn {
  // Use server sync for all data
  const serverSync = useServerSync(playerId || 'anonymous');

  // Derive state from server data
  const state = useMemo<ProgressionState>(() => {
    if (!serverSync.playerData) {
      return DEFAULT_STATE;
    }

    const data = serverSync.playerData;
    return {
      level: data.level,
      xp: data.xp,
      xpToNextLevel: calculateXPForLevel(data.level),
      stardust: data.stardust,
      dailyLoginStreak: data.dailyLoginStreak,
      longestStreak: data.longestStreak,
      totalLogins: data.totalLogins,
      lastLoginDate: data.lastLoginDate,
      currentMonth: data.currentMonth,
      seasonPassTier: data.seasonTier,
      seasonPassXP: data.seasonXp,
      achievements: data.achievements,
      claimedDailyRewards: data.claimedDailyRewards,
      claimedSeasonRewards: data.claimedSeasonRewards,
      guildBonus: 0, // Guild bonus handled separately
    };
  }, [serverSync.playerData]);

  /**
   * Add XP and handle level ups (with optional guild bonus)
   * Syncs to server automatically
   */
  const addXP = useCallback((amount: number, guildBonusOverride?: number): LevelUpData | null => {
    const effectiveGuildBonus = guildBonusOverride ?? state.guildBonus;
    const finalAmount = calculateXPWithGuildBonus(amount, effectiveGuildBonus);

    // Calculate if this will cause a level up
    let xp = state.xp + finalAmount;
    let level = state.level;
    let xpToNextLevel = state.xpToNextLevel;
    let levelUpData: LevelUpData | null = null;

    while (xp >= xpToNextLevel) {
      xp -= xpToNextLevel;
      level++;

      const isMilestone = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100].includes(level);

      levelUpData = {
        level,
        isMilestone,
        rewards: {
          stardust: isMilestone ? 200 : 50,
          milestoneReward: isMilestone ? `level_${level}_reward` : undefined,
        },
      };

      xpToNextLevel = calculateXPForLevel(level);
    }

    // Sync to server
    serverSync.addXp(finalAmount);
    if (level > state.level) {
      serverSync.setLevel(level);
    }

    return levelUpData;
  }, [state.guildBonus, state.xp, state.level, state.xpToNextLevel, serverSync]);

  /**
   * Add stardust - syncs to server
   */
  const addStardust = useCallback((amount: number) => {
    serverSync.addStardust(amount);
  }, [serverSync]);

  /**
   * Spend stardust (returns false if not enough)
   */
  const spendStardust = useCallback((amount: number): boolean => {
    if (state.stardust < amount) return false;
    serverSync.addStardust(-amount);
    return true;
  }, [state.stardust, serverSync]);

  /**
   * Claim daily login reward (with streak bonus multiplier)
   * Synced to server via processDailyLogin
   */
  const claimDailyReward = useCallback((): { success: boolean; reward: FinalReward | null } => {
    const today = new Date().toDateString();

    if (state.lastLoginDate === today) {
      return { success: false, reward: null };
    }

    // Get reward for current day in cycle
    const reward = getRewardForDay(state.dailyLoginStreak + 1);
    const streakBonus = getStreakBonusForStreak(state.dailyLoginStreak);
    const multiplier = streakBonus?.multiplier ?? 1;

    // Calculate base rewards
    let baseStardust = 0;
    let baseXP = 0;

    if (reward.type === 'stardust') {
      baseStardust = reward.amount ?? 0;
    } else if (reward.type === 'xp') {
      baseXP = reward.amount ?? 0;
    } else if (reward.type === 'special' && reward.rewards) {
      baseStardust = reward.rewards.stardust ?? 0;
      baseXP = reward.rewards.xp ?? 0;
    }

    // Apply streak multiplier
    const totalStardust = Math.floor(baseStardust * multiplier);
    const totalXP = Math.floor(baseXP * multiplier);

    // Process daily login on server (handles streak, rewards, etc.)
    serverSync.processDailyLogin();

    const finalReward: FinalReward = {
      reward,
      streakBonus: multiplier,
      totalStardust,
      totalXP,
    };

    return { success: true, reward: finalReward };
  }, [state.lastLoginDate, state.dailyLoginStreak, serverSync]);

  /**
   * Update daily login streak (handled by server)
   * Returns whether streak was lost
   */
  const updateDailyStreak = useCallback((): { streakLost: boolean } => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (state.lastLoginDate === today) {
      return { streakLost: false };
    }

    const streakLost = state.lastLoginDate !== yesterday && state.dailyLoginStreak > 0;

    // Server handles streak calculation via processDailyLogin
    serverSync.processDailyLogin();

    return { streakLost };
  }, [state.lastLoginDate, state.dailyLoginStreak, serverSync]);

  /**
   * Add season pass XP - synced to server
   */
  const addSeasonXP = useCallback((amount: number): { tieredUp: boolean; newTier: number } => {
    let xp = state.seasonPassXP + amount;
    let tier = state.seasonPassTier;
    let tieredUp = false;

    // Check for tier ups
    while (xp >= SEASON_XP_PER_TIER && tier < SEASON_PASS_REWARDS.length) {
      xp -= SEASON_XP_PER_TIER;
      tier++;
      tieredUp = true;
    }

    // Server handles season progression
    serverSync.addXp(amount); // Season XP tracked alongside regular XP

    return { tieredUp, newTier: tier };
  }, [state.seasonPassXP, state.seasonPassTier, serverSync]);

  /**
   * Claim season pass reward
   */
  const claimSeasonReward = useCallback((tier: number): boolean => {
    if (tier > state.seasonPassTier) return false;
    if (state.claimedSeasonRewards.includes(tier)) return false;

    const reward = SEASON_PASS_REWARDS[tier - 1];
    if (!reward) return false;

    // Add stardust from reward
    if (reward.free.stardust) {
      serverSync.addStardust(reward.free.stardust);
    }

    return true;
  }, [state.seasonPassTier, state.claimedSeasonRewards, serverSync]);

  /**
   * Unlock an achievement - synced to server
   */
  const unlockAchievement = useCallback((achievementId: string): boolean => {
    if (state.achievements.includes(achievementId)) return false;
    serverSync.unlockAchievement(achievementId);
    return true;
  }, [state.achievements, serverSync]);

  /**
   * Check if achievement is unlocked
   */
  const hasAchievement = useCallback((achievementId: string): boolean => {
    return state.achievements.includes(achievementId);
  }, [state.achievements]);

  /**
   * Get progress percentage to next level
   */
  const getProgressToNextLevel = useCallback((): number => {
    return (state.xp / state.xpToNextLevel) * 100;
  }, [state.xp, state.xpToNextLevel]);

  /**
   * Get total XP earned across all levels (legacy_2)
   */
  const getTotalXP = useCallback((): number => {
    let total = state.xp;
    for (let i = 1; i < state.level; i++) {
      total += calculateXPForLevel(i);
    }
    return total;
  }, [state.level, state.xp]);

  /**
   * Set level directly (for debugging/admin) - synced to server
   */
  const setLevel = useCallback((level: number) => {
    const clampedLevel = Math.max(1, Math.min(100, level));
    serverSync.setLevel(clampedLevel);
  }, [serverSync]);

  /**
   * Set guild bonus multiplier (stored locally for calculations)
   */
  const [guildBonus, setGuildBonusState] = useState(0);
  const setGuildBonus = useCallback((bonus: number) => {
    setGuildBonusState(Math.max(0, Math.min(0.5, bonus))); // Cap at 50% bonus
  }, []);

  /**
   * Get upcoming rewards for next N days
   */
  const getUpcomingRewards = useCallback((count: number = 7): DailyReward[] => {
    return getUpcomingRewardsHelper(state.dailyLoginStreak, count);
  }, [state.dailyLoginStreak]);

  /**
   * Save progress - now handled automatically by server sync
   * @deprecated Data is automatically synced to server
   */
  const saveProgress = useCallback(() => {
    // No-op: Server sync handles persistence automatically
    console.log('[Progression] saveProgress called - data is auto-synced to server');
  }, []);

  /**
   * Load progress - now handled automatically by server sync
   * @deprecated Data is automatically loaded from server on connect
   */
  const loadProgress = useCallback(() => {
    // Request full sync from server
    serverSync.requestFullSync();
  }, [serverSync]);

  return {
    state,
    addXP,
    addStardust,
    spendStardust,
    claimDailyReward,
    updateDailyStreak,
    addSeasonXP,
    claimSeasonReward,
    unlockAchievement,
    hasAchievement,
    getProgressToNextLevel,
    getTotalXP,
    setLevel,
    setGuildBonus,
    getUpcomingRewards,
    saveProgress,
    loadProgress,
  };
}

export default useProgression;
