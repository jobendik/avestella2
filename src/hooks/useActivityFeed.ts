// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Activity Feed Hook
// ═══════════════════════════════════════════════════════════════════════════
// Connects to backend ActivityFeedService for friend activity tracking
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { gameClient } from '../services/GameClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityType = 
  | 'levelUp' 
  | 'achievement' 
  | 'gift' 
  | 'online' 
  | 'bondFormed' 
  | 'milestone' 
  | 'questComplete' 
  | 'seasonTier' 
  | 'constellationFormed';

export interface FriendActivity {
  activityId: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  activityType: ActivityType;
  data: {
    level?: number;
    achievementName?: string;
    achievementIcon?: string;
    recipientName?: string;
    bondedWithName?: string;
    milestoneName?: string;
    questName?: string;
    seasonTier?: number;
    constellationName?: string;
    constellationRarity?: string;
  };
  timestamp: Date;
  timeAgo: string;
}

export interface ActivityStats {
  totalActivities: number;
  activitiesThisWeek: number;
  mostActiveDay: string;
  activityBreakdown: Record<ActivityType, number>;
}

export interface UseActivityFeedReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // Data
  activities: FriendActivity[];
  playerActivities: FriendActivity[];
  stats: ActivityStats | null;
  
  // Real-time
  newActivityCount: number;
  
  // Actions
  refreshFeed: () => void;
  loadPlayerActivities: () => void;
  loadStats: () => void;
  markAsRead: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useActivityFeed(): UseActivityFeedReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [playerActivities, setPlayerActivities] = useState<FriendActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [newActivityCount, setNewActivityCount] = useState(0);

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleFeed = (data: any) => {
      setLoading(false);
      if (data?.activities) {
        const parsed = data.activities.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }));
        setActivities(parsed);
        setNewActivityCount(0);
      }
    };

    const handlePlayerActivities = (data: any) => {
      setLoading(false);
      if (data?.activities) {
        const parsed = data.activities.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }));
        setPlayerActivities(parsed);
      }
    };

    const handleStats = (data: any) => {
      if (data) {
        setStats(data);
      }
    };

    const handleNewFriendActivity = (data: any) => {
      // Real-time activity from a friend
      if (data) {
        const newActivity = {
          ...data,
          timestamp: new Date(data.timestamp)
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 50));
        setNewActivityCount(prev => prev + 1);
      }
    };

    // Subscribe to events
    gameClient.on('activity:feed', handleFeed);
    gameClient.on('activity:playerActivities', handlePlayerActivities);
    gameClient.on('activity:stats', handleStats);
    gameClient.on('activity:newFriendActivity', handleNewFriendActivity);

    // Initial load
    gameClient.getActivityFeed(50);

    return () => {
      gameClient.off('activity:feed', handleFeed);
      gameClient.off('activity:playerActivities', handlePlayerActivities);
      gameClient.off('activity:stats', handleStats);
      gameClient.off('activity:newFriendActivity', handleNewFriendActivity);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const refreshFeed = useCallback(() => {
    setLoading(true);
    setNewActivityCount(0);
    gameClient.getActivityFeed(50);
  }, []);

  const loadPlayerActivities = useCallback(() => {
    setLoading(true);
    gameClient.getPlayerActivities(20);
  }, []);

  const loadStats = useCallback(() => {
    gameClient.getActivityStats();
  }, []);

  const markAsRead = useCallback(() => {
    setNewActivityCount(0);
  }, []);

  return {
    loading,
    error,
    activities,
    playerActivities,
    stats,
    newActivityCount,
    refreshFeed,
    loadPlayerActivities,
    loadStats,
    markAsRead
  };
}

export default useActivityFeed;
