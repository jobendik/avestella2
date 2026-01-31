// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Daily Login Hook
// ═══════════════════════════════════════════════════════════════════════════
// Connects to backend DailyLoginService for streak tracking and rewards
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { gameClient } from '../services/GameClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyReward {
  day: number;
  stardust: number;
  xp: number;
  mysteryBox?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface MilestoneReward {
  days: number;
  stardust: number;
  xp: number;
  cosmetic?: string;
  title?: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalLogins: number;
  lastLoginDate: Date | null;
  currentStreakBonus: number; // percentage
  nextMilestone: MilestoneReward | null;
  daysUntilNextMilestone: number;
}

export interface DailyLoginResult {
  isNewDay: boolean;
  reward: DailyReward | null;
  currentStreak: number;
  streakBonus: number;
  milestoneReward: MilestoneReward | null;
  totalStardust: number;
  totalXp: number;
}

export interface UseDailyLoginReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // Streak info
  streakInfo: StreakInfo | null;
  weeklyRewards: DailyReward[];
  milestones: MilestoneReward[];
  
  // Last login result
  lastLoginResult: DailyLoginResult | null;
  
  // Actions
  claimDailyLogin: () => void;
  refreshStreak: () => void;
  
  // Computed
  canClaimToday: boolean;
  currentDayOfWeek: number; // 1-7
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useDailyLogin(): UseDailyLoginReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [weeklyRewards, setWeeklyRewards] = useState<DailyReward[]>([]);
  const [milestones, setMilestones] = useState<MilestoneReward[]>([]);
  const [lastLoginResult, setLastLoginResult] = useState<DailyLoginResult | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleLoginResult = (data: any) => {
      setLoading(false);
      if (data) {
        setLastLoginResult(data);
        
        // Update streak info from result
        if (data.currentStreak !== undefined) {
          setStreakInfo(prev => prev ? {
            ...prev,
            currentStreak: data.currentStreak,
            currentStreakBonus: data.streakBonus || prev.currentStreakBonus
          } : null);
        }
      }
    };

    const handleStreakInfo = (data: any) => {
      setLoading(false);
      if (data) {
        setStreakInfo({
          ...data,
          lastLoginDate: data.lastLoginDate ? new Date(data.lastLoginDate) : null
        });
      }
    };

    const handleRewards = (data: any) => {
      if (data?.weeklyRewards) {
        setWeeklyRewards(data.weeklyRewards);
      }
      if (data?.milestones) {
        setMilestones(data.milestones);
      }
    };

    const handleMilestoneReached = (data: any) => {
      console.log('🎉 Milestone reached!', data);
      // Could trigger celebration UI
    };

    const handleStreakBroken = (data: any) => {
      console.log('💔 Streak broken', data);
      // Could show notification
    };

    // Subscribe to events
    gameClient.on('daily:loginResult', handleLoginResult);
    gameClient.on('daily:streakInfo', handleStreakInfo);
    gameClient.on('daily:rewards', handleRewards);
    gameClient.on('daily:milestoneReached', handleMilestoneReached);
    gameClient.on('daily:streakBroken', handleStreakBroken);

    // Initial load
    gameClient.getStreakInfo();
    gameClient.getDailyRewards();

    return () => {
      gameClient.off('daily:loginResult', handleLoginResult);
      gameClient.off('daily:streakInfo', handleStreakInfo);
      gameClient.off('daily:rewards', handleRewards);
      gameClient.off('daily:milestoneReached', handleMilestoneReached);
      gameClient.off('daily:streakBroken', handleStreakBroken);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const claimDailyLogin = useCallback(() => {
    setLoading(true);
    gameClient.dailyLogin();
  }, []);

  const refreshStreak = useCallback(() => {
    setLoading(true);
    gameClient.getStreakInfo();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────

  const canClaimToday = streakInfo 
    ? !streakInfo.lastLoginDate || 
      new Date(streakInfo.lastLoginDate).toDateString() !== new Date().toDateString()
    : true;

  const currentDayOfWeek = streakInfo
    ? ((streakInfo.currentStreak - 1) % 7) + 1
    : 1;

  return {
    loading,
    error,
    streakInfo,
    weeklyRewards,
    milestones,
    lastLoginResult,
    claimDailyLogin,
    refreshStreak,
    canClaimToday,
    currentDayOfWeek
  };
}

export default useDailyLogin;
