/**
 * Quest System Hook
 * Ported from LEGACY config.ts QUESTS/WEEKLY_QUESTS and main.ts quest logic
 * 
 * Server-synced quests - all data persisted to MongoDB via WebSocket
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useServerSync } from './useServerSync';

// ============================================================================
// TYPES
// ============================================================================

export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  target: number;
  reward: number;
  icon: string;
  trackingKey: QuestTrackingKey;
}

export type QuestTrackingKey =
  | 'whispersSent'
  | 'starsGathered'
  | 'connectionsFormed'
  | 'timesEmoted'
  | 'timesSung'
  | 'newFriends'
  | 'realmChanges';

export interface QuestProgress {
  questId: string;
  current: number;
  completed: boolean;
  claimedReward: boolean;
}

export interface QuestState {
  dailyProgress: Record<string, QuestProgress>;
  weeklyProgress: Record<string, QuestProgress>;
  lastDailyReset: number;
  lastWeeklyReset: number;
  totalRewardsClaimed: number;
}

export interface QuestTimers {
  dailyReset: string;
  weeklyReset: string;
  dailySeconds: number;
  weeklySeconds: number;
}

export interface UseQuestsReturn {
  /** Daily quest definitions */
  dailyQuests: QuestDefinition[];
  /** Weekly quest definitions */
  weeklyQuests: QuestDefinition[];
  /** Current progress state */
  state: QuestState;
  /** Time until resets */
  timers: QuestTimers;
  /** Track progress for a quest action */
  trackProgress: (key: QuestTrackingKey, amount?: number) => void;
  /** Claim reward for completed quest */
  claimReward: (questId: string, isWeekly: boolean) => number;
  /** Get progress for a specific quest */
  getProgress: (questId: string, isWeekly: boolean) => QuestProgress | undefined;
  /** Check if any quests are completable but unclaimed */
  hasUnclaimedRewards: boolean;
  /** Total unclaimed daily rewards */
  unclaimedDailyCount: number;
  /** Total unclaimed weekly rewards */
  unclaimedWeeklyCount: number;
}

// ============================================================================
// CONSTANTS - Ported from LEGACY config.ts
// ============================================================================

export const DAILY_QUESTS: QuestDefinition[] = [
  {
    id: 'daily_whisper',
    name: 'Whisper Walker',
    description: 'Send whispers to other players',
    target: 5,
    reward: 50,
    icon: '💬',
    trackingKey: 'whispersSent',
  },
  {
    id: 'daily_stars',
    name: 'Star Collector',
    description: 'Gather shimmering stars',
    target: 10,
    reward: 30,
    icon: '⭐',
    trackingKey: 'starsGathered',
  },
  {
    id: 'daily_connect',
    name: 'Bond Weaver',
    description: 'Form connections with others',
    target: 3,
    reward: 75,
    icon: '🔗',
    trackingKey: 'connectionsFormed',
  },
  {
    id: 'daily_emote',
    name: 'Expression Artist',
    description: 'Use emotes to express yourself',
    target: 10,
    reward: 25,
    icon: '😊',
    trackingKey: 'timesEmoted',
  },
  {
    id: 'daily_sing',
    name: 'Melody Maker',
    description: 'Sing or hum for others',
    target: 3,
    reward: 40,
    icon: '🎵',
    trackingKey: 'timesSung',
  },
];

export const WEEKLY_QUESTS: QuestDefinition[] = [
  {
    id: 'weekly_whisper',
    name: 'Social Butterfly',
    description: 'Send many whispers throughout the week',
    target: 50,
    reward: 200,
    icon: '🦋',
    trackingKey: 'whispersSent',
  },
  {
    id: 'weekly_stars',
    name: 'Constellation Hunter',
    description: 'Gather a constellation of stars',
    target: 100,
    reward: 150,
    icon: '🌟',
    trackingKey: 'starsGathered',
  },
  {
    id: 'weekly_friends',
    name: 'Friendship Champion',
    description: 'Make new friends',
    target: 3,
    reward: 300,
    icon: '👥',
    trackingKey: 'newFriends',
  },
  {
    id: 'weekly_explorer',
    name: 'Realm Explorer',
    description: 'Travel between different realms',
    target: 5,
    reward: 100,
    icon: '🌐',
    trackingKey: 'realmChanges',
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getDefaultState(): QuestState {
  const dailyProgress: Record<string, QuestProgress> = {};
  const weeklyProgress: Record<string, QuestProgress> = {};

  DAILY_QUESTS.forEach(q => {
    dailyProgress[q.id] = { questId: q.id, current: 0, completed: false, claimedReward: false };
  });

  WEEKLY_QUESTS.forEach(q => {
    weeklyProgress[q.id] = { questId: q.id, current: 0, completed: false, claimedReward: false };
  });

  return {
    dailyProgress,
    weeklyProgress,
    lastDailyReset: Date.now(),
    lastWeeklyReset: Date.now(),
    totalRewardsClaimed: 0,
  };
}

// NOTE: loadState() and saveState() removed - useServerSync handles persistence now

/**
 * Get milliseconds until next midnight UTC
 */
function getTimeUntilDailyReset(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

/**
 * Get milliseconds until next Monday midnight UTC
 */
function getTimeUntilWeeklyReset(): number {
  const now = new Date();
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday.getTime() - now.getTime();
}

/**
 * Format milliseconds as HH:MM:SS
 */
function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Check if a reset should occur based on timestamp
 */
function shouldResetDaily(lastReset: number): boolean {
  const lastResetDate = new Date(lastReset);
  const now = new Date();
  return (
    lastResetDate.getUTCFullYear() !== now.getUTCFullYear() ||
    lastResetDate.getUTCMonth() !== now.getUTCMonth() ||
    lastResetDate.getUTCDate() !== now.getUTCDate()
  );
}

function shouldResetWeekly(lastReset: number): boolean {
  const lastResetDate = new Date(lastReset);
  const now = new Date();

  // Get ISO week number
  const getWeek = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  return (
    lastResetDate.getUTCFullYear() !== now.getUTCFullYear() ||
    getWeek(lastResetDate) !== getWeek(now)
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useQuests(playerId?: string): UseQuestsReturn {
  const [state, setState] = useState<QuestState>(getDefaultState);
  const [timers, setTimers] = useState<QuestTimers>({
    dailyReset: formatTimeRemaining(getTimeUntilDailyReset()),
    weeklyReset: formatTimeRemaining(getTimeUntilWeeklyReset()),
    dailySeconds: Math.floor(getTimeUntilDailyReset() / 1000),
    weeklySeconds: Math.floor(getTimeUntilWeeklyReset() / 1000),
  });

  // Server sync for persistence
  const serverSync = useServerSync(playerId || 'anonymous');

  // Sync from server when data arrives
  useEffect(() => {
    if (serverSync.playerData?.quests) {
      const quests = serverSync.playerData.quests;
      setState(prev => {
        const dailyProgress = { ...prev.dailyProgress };
        const weeklyProgress = { ...prev.weeklyProgress };

        // Merge server quest progress
        Object.entries(quests.questProgress || {}).forEach(([questId, progress]) => {
          const quest = [...DAILY_QUESTS, ...WEEKLY_QUESTS].find(q => q.id === questId);
          if (quest) {
            const progressData: QuestProgress = {
              questId,
              current: progress as number,
              completed: (progress as number) >= quest.target,
              claimedReward: quests.completedQuestIds?.includes(questId) || false,
            };

            if (DAILY_QUESTS.some(q => q.id === questId)) {
              dailyProgress[questId] = progressData;
            } else {
              weeklyProgress[questId] = progressData;
            }
          }
        });

        return {
          ...prev,
          dailyProgress,
          weeklyProgress,
        };
      });
    }
  }, [serverSync.playerData?.quests]);

  // Check for resets on mount and periodically
  useEffect(() => {
    const checkResets = () => {
      setState(prev => {
        let updated = prev;
        let needsUpdate = false;

        if (shouldResetDaily(prev.lastDailyReset)) {
          const dailyProgress: Record<string, QuestProgress> = {};
          DAILY_QUESTS.forEach(q => {
            dailyProgress[q.id] = { questId: q.id, current: 0, completed: false, claimedReward: false };
          });
          updated = { ...updated, dailyProgress, lastDailyReset: Date.now() };
          needsUpdate = true;
        }

        if (shouldResetWeekly(prev.lastWeeklyReset)) {
          const weeklyProgress: Record<string, QuestProgress> = {};
          WEEKLY_QUESTS.forEach(q => {
            weeklyProgress[q.id] = { questId: q.id, current: 0, completed: false, claimedReward: false };
          });
          updated = { ...updated, weeklyProgress, lastWeeklyReset: Date.now() };
          needsUpdate = true;
        }

        return needsUpdate ? updated : prev;
      });
    };

    checkResets();
    const interval = setInterval(checkResets, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Update timers every second
  useEffect(() => {
    const updateTimers = () => {
      const dailyMs = getTimeUntilDailyReset();
      const weeklyMs = getTimeUntilWeeklyReset();
      setTimers({
        dailyReset: formatTimeRemaining(dailyMs),
        weeklyReset: formatTimeRemaining(weeklyMs),
        dailySeconds: Math.floor(dailyMs / 1000),
        weeklySeconds: Math.floor(weeklyMs / 1000),
      });
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync state changes to server (removed localStorage save)
  // Server sync happens automatically via serverSync

  /**
   * Track progress for quests that match the given tracking key
   * Syncs to server automatically
   */
  const trackProgress = useCallback((key: QuestTrackingKey, amount = 1) => {
    setState(prev => {
      const updated = { ...prev };
      let changed = false;

      // Update daily quests
      DAILY_QUESTS.forEach(quest => {
        if (quest.trackingKey === key) {
          const progress = updated.dailyProgress[quest.id];
          if (progress && !progress.completed) {
            const newCurrent = Math.min(progress.current + amount, quest.target);
            updated.dailyProgress = {
              ...updated.dailyProgress,
              [quest.id]: {
                ...progress,
                current: newCurrent,
                completed: newCurrent >= quest.target,
              },
            };
            changed = true;
            // Sync to server
            serverSync.updateQuestProgress(quest.id, newCurrent);
          }
        }
      });

      // Update weekly quests
      WEEKLY_QUESTS.forEach(quest => {
        if (quest.trackingKey === key) {
          const progress = updated.weeklyProgress[quest.id];
          if (progress && !progress.completed) {
            const newCurrent = Math.min(progress.current + amount, quest.target);
            updated.weeklyProgress = {
              ...updated.weeklyProgress,
              [quest.id]: {
                ...progress,
                current: newCurrent,
                completed: newCurrent >= quest.target,
              },
            };
            changed = true;
            // Sync to server
            serverSync.updateQuestProgress(quest.id, newCurrent);
          }
        }
      });

      return changed ? updated : prev;
    });
  }, [serverSync]);

  /**
   * Claim reward for a completed quest
   * Syncs to server automatically
   */
  const claimReward = useCallback((questId: string, isWeekly: boolean): number => {
    let rewardAmount = 0;

    setState(prev => {
      const progressMap = isWeekly ? prev.weeklyProgress : prev.dailyProgress;
      const progress = progressMap[questId];
      const quests = isWeekly ? WEEKLY_QUESTS : DAILY_QUESTS;
      const quest = quests.find(q => q.id === questId);

      if (!progress || !quest || !progress.completed || progress.claimedReward) {
        return prev;
      }

      rewardAmount = quest.reward;

      const updatedProgress = {
        ...progress,
        claimedReward: true,
      };

      // Sync quest completion to server
      serverSync.completeQuest(questId);

      return {
        ...prev,
        [isWeekly ? 'weeklyProgress' : 'dailyProgress']: {
          ...progressMap,
          [questId]: updatedProgress,
        },
        totalRewardsClaimed: prev.totalRewardsClaimed + rewardAmount,
      };
    });

    return rewardAmount;
  }, [serverSync]);

  /**
   * Get progress for a specific quest
   */
  const getProgress = useCallback((questId: string, isWeekly: boolean): QuestProgress | undefined => {
    const progressMap = isWeekly ? state.weeklyProgress : state.dailyProgress;
    return progressMap[questId];
  }, [state]);

  // Calculate unclaimed rewards
  const { hasUnclaimedRewards, unclaimedDailyCount, unclaimedWeeklyCount } = useMemo(() => {
    let dailyCount = 0;
    let weeklyCount = 0;

    Object.values(state.dailyProgress).forEach(p => {
      if (p.completed && !p.claimedReward) dailyCount++;
    });

    Object.values(state.weeklyProgress).forEach(p => {
      if (p.completed && !p.claimedReward) weeklyCount++;
    });

    return {
      hasUnclaimedRewards: dailyCount > 0 || weeklyCount > 0,
      unclaimedDailyCount: dailyCount,
      unclaimedWeeklyCount: weeklyCount,
    };
  }, [state]);

  return {
    dailyQuests: DAILY_QUESTS,
    weeklyQuests: WEEKLY_QUESTS,
    state,
    timers,
    trackProgress,
    claimReward,
    getProgress,
    hasUnclaimedRewards,
    unclaimedDailyCount,
    unclaimedWeeklyCount,
  };
}

export default useQuests;
