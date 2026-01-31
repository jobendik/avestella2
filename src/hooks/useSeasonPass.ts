// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Season Pass Hook
// ═══════════════════════════════════════════════════════════════════════════
// Connects to backend SeasonPassService for battle pass functionality
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { gameClient } from '../services/GameClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SeasonInfo {
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

export interface SeasonProgress {
  currentTier: number;
  currentXp: number;
  xpToNextTier: number;
  isPremium: boolean;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
  unclaimedRewards: number[];
}

export interface SeasonReward {
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

export interface UseSeasonPassReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // Season info
  season: SeasonInfo | null;
  progress: SeasonProgress | null;
  rewards: SeasonReward[];
  
  // Actions
  refreshSeason: () => void;
  claimReward: (tier: number, claimPremium?: boolean) => void;
  claimAllRewards: () => void;
  upgradeToPremium: () => void;
  
  // Computed
  canClaimRewards: boolean;
  progressPercentage: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useSeasonPass(): UseSeasonPassReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [progress, setProgress] = useState<SeasonProgress | null>(null);
  const [rewards, setRewards] = useState<SeasonReward[]>([]);

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleSeasonInfo = (data: any) => {
      setLoading(false);
      if (data) {
        setSeason({
          ...data,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate)
        });
      }
    };

    const handleSeasonProgress = (data: any) => {
      setLoading(false);
      if (data) {
        setProgress(data);
      }
    };

    const handleSeasonRewards = (data: any) => {
      if (data?.rewards) {
        setRewards(data.rewards);
      }
    };

    const handleSeasonXpAdded = (data: any) => {
      if (data) {
        setProgress(prev => prev ? {
          ...prev,
          currentTier: data.newTier,
          currentXp: data.newXp,
          unclaimedRewards: data.unclaimedRewards || prev.unclaimedRewards
        } : null);
      }
    };

    const handleRewardClaimed = (data: any) => {
      if (data?.success) {
        // Refresh progress after claiming
        gameClient.getSeasonProgress();
      } else if (data?.error) {
        setError(data.error);
      }
    };

    const handleAllRewardsClaimed = (data: any) => {
      if (data?.success) {
        gameClient.getSeasonProgress();
      }
    };

    const handlePremiumUpgraded = (data: any) => {
      if (data?.success) {
        setProgress(prev => prev ? { ...prev, isPremium: true } : null);
      } else if (data?.error) {
        setError(data.error);
      }
    };

    const handleTierUp = (data: any) => {
      // Could trigger celebration animation
      console.log('🎉 Season Tier Up!', data);
    };

    // Subscribe to events
    gameClient.on('season:info', handleSeasonInfo);
    gameClient.on('season:progress', handleSeasonProgress);
    gameClient.on('season:rewards', handleSeasonRewards);
    gameClient.on('season:xpAdded', handleSeasonXpAdded);
    gameClient.on('season:rewardClaimed', handleRewardClaimed);
    gameClient.on('season:allRewardsClaimed', handleAllRewardsClaimed);
    gameClient.on('season:premiumUpgraded', handlePremiumUpgraded);
    gameClient.on('season:tierUp', handleTierUp);

    // Initial load
    gameClient.getSeasonInfo();
    gameClient.getSeasonProgress();
    gameClient.getSeasonRewards();

    return () => {
      gameClient.off('season:info', handleSeasonInfo);
      gameClient.off('season:progress', handleSeasonProgress);
      gameClient.off('season:rewards', handleSeasonRewards);
      gameClient.off('season:xpAdded', handleSeasonXpAdded);
      gameClient.off('season:rewardClaimed', handleRewardClaimed);
      gameClient.off('season:allRewardsClaimed', handleAllRewardsClaimed);
      gameClient.off('season:premiumUpgraded', handlePremiumUpgraded);
      gameClient.off('season:tierUp', handleTierUp);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const refreshSeason = useCallback(() => {
    setLoading(true);
    gameClient.getSeasonInfo();
    gameClient.getSeasonProgress();
  }, []);

  const claimReward = useCallback((tier: number, claimPremium: boolean = false) => {
    gameClient.claimSeasonTierReward(tier, claimPremium);
  }, []);

  const claimAllRewards = useCallback(() => {
    gameClient.claimAllSeasonRewards();
  }, []);

  const upgradeToPremium = useCallback(() => {
    gameClient.upgradeToPremiumPass();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────

  const canClaimRewards = progress ? progress.unclaimedRewards.length > 0 : false;

  const progressPercentage = progress && season
    ? Math.min(100, (progress.currentXp / (season.xpPerTier || 1000)) * 100)
    : 0;

  return {
    loading,
    error,
    season,
    progress,
    rewards,
    refreshSeason,
    claimReward,
    claimAllRewards,
    upgradeToPremium,
    canClaimRewards,
    progressPercentage
  };
}

export default useSeasonPass;
