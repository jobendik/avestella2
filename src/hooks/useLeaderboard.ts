// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Leaderboard Hook (TypeScript)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { gameClient } from '@/services/GameClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  name: string;
  avatar: string;
  level: number;
  xp: number;
  stardust: number;
  challengesCompleted: number;
  seasonTier: number;
  weeklyWins?: number;
  weeklyXP?: number;
  monthlyXP?: number;
  isPlayer?: boolean;
}

export type LeaderboardCategory = 'xp' | 'stardust' | 'challenges' | 'season' | 'weekly';
export type TimePeriod = 'allTime' | 'weekly' | 'monthly';

// ─────────────────────────────────────────────────────────────────────────────
// Competitive Rank System
// ─────────────────────────────────────────────────────────────────────────────

export type CompetitiveRank =
  | 'unranked'
  | 'bronze_3' | 'bronze_2' | 'bronze_1'
  | 'silver_3' | 'silver_2' | 'silver_1'
  | 'gold_3' | 'gold_2' | 'gold_1'
  | 'platinum_3' | 'platinum_2' | 'platinum_1'
  | 'diamond_3' | 'diamond_2' | 'diamond_1'
  | 'master' | 'grandmaster' | 'legend';

export interface RankConfig {
  name: string;
  tier: string;
  division?: number;
  minPoints: number;
  badge: string;
  color: string;
}

export const RANKS: Record<CompetitiveRank, RankConfig> = {
  unranked: { name: 'Unranked', tier: 'Unranked', minPoints: 0, badge: '❓', color: '#6B7280' },
  bronze_3: { name: 'Bronze III', tier: 'Bronze', division: 3, minPoints: 100, badge: '🥉', color: '#CD7F32' },
  bronze_2: { name: 'Bronze II', tier: 'Bronze', division: 2, minPoints: 250, badge: '🥉', color: '#CD7F32' },
  bronze_1: { name: 'Bronze I', tier: 'Bronze', division: 1, minPoints: 500, badge: '🥉', color: '#CD7F32' },
  silver_3: { name: 'Silver III', tier: 'Silver', division: 3, minPoints: 800, badge: '🥈', color: '#C0C0C0' },
  silver_2: { name: 'Silver II', tier: 'Silver', division: 2, minPoints: 1200, badge: '🥈', color: '#C0C0C0' },
  silver_1: { name: 'Silver I', tier: 'Silver', division: 1, minPoints: 1800, badge: '🥈', color: '#C0C0C0' },
  gold_3: { name: 'Gold III', tier: 'Gold', division: 3, minPoints: 2500, badge: '🥇', color: '#FFD700' },
  gold_2: { name: 'Gold II', tier: 'Gold', division: 2, minPoints: 3500, badge: '🥇', color: '#FFD700' },
  gold_1: { name: 'Gold I', tier: 'Gold', division: 1, minPoints: 5000, badge: '🥇', color: '#FFD700' },
  platinum_3: { name: 'Platinum III', tier: 'Platinum', division: 3, minPoints: 7000, badge: '💠', color: '#00CED1' },
  platinum_2: { name: 'Platinum II', tier: 'Platinum', division: 2, minPoints: 10000, badge: '💠', color: '#00CED1' },
  platinum_1: { name: 'Platinum I', tier: 'Platinum', division: 1, minPoints: 15000, badge: '💠', color: '#00CED1' },
  diamond_3: { name: 'Diamond III', tier: 'Diamond', division: 3, minPoints: 22000, badge: '💎', color: '#B9F2FF' },
  diamond_2: { name: 'Diamond II', tier: 'Diamond', division: 2, minPoints: 32000, badge: '💎', color: '#B9F2FF' },
  diamond_1: { name: 'Diamond I', tier: 'Diamond', division: 1, minPoints: 45000, badge: '💎', color: '#B9F2FF' },
  master: { name: 'Master', tier: 'Master', minPoints: 65000, badge: '👑', color: '#9333EA' },
  grandmaster: { name: 'Grandmaster', tier: 'Grandmaster', minPoints: 90000, badge: '🌟', color: '#EF4444' },
  legend: { name: 'Legend', tier: 'Legend', minPoints: 150000, badge: '⭐', color: '#F59E0B' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Weekly & Monthly Tracking
// ─────────────────────────────────────────────────────────────────────────────

interface WeeklyStats {
  weekStart: number; // Monday timestamp
  wins: number;
  gamesPlayed: number;
  xpEarned: number;
  challengesCompleted: number;
  peakRank: number;
}

interface MonthlyStats {
  monthStart: number; // 1st of month timestamp
  xpEarned: number;
  challengesCompleted: number;
  stardustEarned: number;
}

function getWeekStart(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

function getMonthStart(): number {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  firstOfMonth.setHours(0, 0, 0, 0);
  return firstOfMonth.getTime();
}

export interface UseLeaderboardReturn {
  // State
  entries: LeaderboardEntry[];
  category: LeaderboardCategory;
  timePeriod: TimePeriod;
  playerRank: number;

  // Functions
  setCategory: (category: LeaderboardCategory) => void;
  setTimePeriod: (period: TimePeriod) => void;
  getTopEntries: (count?: number) => LeaderboardEntry[];
  getPlayerEntry: () => LeaderboardEntry | null;
  refreshLeaderboard: () => void;

  // Weekly Tracking
  weeklyStats: WeeklyStats;
  monthlyStats: MonthlyStats;
  recordWin: () => void;
  recordGamePlayed: () => void;
  recordXPEarned: (xp: number) => void;
  getWeeklyProgress: () => { wins: number; gamesPlayed: number; daysRemaining: number };

  // Competitive Rank
  playerRankPoints: number;
  competitiveRank: CompetitiveRank;
  getRankConfig: () => RankConfig;
  getNextRank: () => { rank: CompetitiveRank; pointsNeeded: number } | null;
  getRankProgress: () => number; // 0-100 progress to next rank
  addRankPoints: (points: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Data Fetching (replaces mock data)
// ─────────────────────────────────────────────────────────────────────────────

// Leaderboard entries are now fetched from the server via WebSocket

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

interface UseLeaderboardProps {
  playerLevel?: number;
  playerXP?: number;
  playerStardust?: number;
  playerChallenges?: number;
  playerSeasonTier?: number;
}

export function useLeaderboard(props?: UseLeaderboardProps): UseLeaderboardReturn {
  const {
    playerLevel = 1,
    playerXP = 0,
    playerStardust = 0,
    playerChallenges = 0,
    playerSeasonTier = 0
  } = props || {};

  const [category, setCategory] = useState<LeaderboardCategory>('xp');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('allTime');
  const [serverEntries, setServerEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch leaderboard from server on mount and when category changes
  useEffect(() => {
    const handleLeaderboardData = (data: any) => {
      if (data.data?.entries) {
        const entries: LeaderboardEntry[] = data.data.entries.map((entry: any) => ({
          name: entry.displayName || entry.playerId || 'Unknown',
          avatar: entry.avatar || '⭐',
          level: entry.level || 1,
          xp: entry.xp || entry.value || 0,
          stardust: entry.stardust || 0,
          challengesCompleted: entry.challengesCompleted || 0,
          seasonTier: entry.seasonTier || 0,
          weeklyWins: entry.weeklyWins || 0,
          isPlayer: false
        }));
        setServerEntries(entries);
        setIsLoading(false);
      }
    };

    const handleConnected = () => {
      gameClient.requestLeaderboard(category, 50);
    };

    gameClient.on('leaderboard', handleLeaderboardData);
    gameClient.on('connected', handleConnected);

    // Request leaderboard data if already connected
    if (gameClient.isConnected()) {
      gameClient.requestLeaderboard(category, 50);
    }

    return () => {
      gameClient.off('leaderboard', handleLeaderboardData);
      gameClient.off('connected', handleConnected);
    };
  }, [category]);

  // Weekly stats with persistence
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>(() => {
    const saved = loadFromStorage<WeeklyStats>('avestella_weekly_stats', {
      weekStart: getWeekStart(),
      wins: 0,
      gamesPlayed: 0,
      xpEarned: 0,
      challengesCompleted: 0,
      peakRank: 0,
    });

    // Reset if it's a new week
    const currentWeekStart = getWeekStart();
    if (saved.weekStart !== currentWeekStart) {
      return {
        weekStart: currentWeekStart,
        wins: 0,
        gamesPlayed: 0,
        xpEarned: 0,
        challengesCompleted: 0,
        peakRank: 0,
      };
    }
    return saved;
  });

  // Monthly stats with persistence
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>(() => {
    const saved = loadFromStorage<MonthlyStats>('avestella_monthly_stats', {
      monthStart: getMonthStart(),
      xpEarned: 0,
      challengesCompleted: 0,
      stardustEarned: 0,
    });

    // Reset if it's a new month
    const currentMonthStart = getMonthStart();
    if (saved.monthStart !== currentMonthStart) {
      return {
        monthStart: currentMonthStart,
        xpEarned: 0,
        challengesCompleted: 0,
        stardustEarned: 0,
      };
    }
    return saved;
  });

  // Competitive rank points with persistence
  const [playerRankPoints, setPlayerRankPoints] = useState<number>(() => {
    return loadFromStorage<number>('avestella_rank_points', 0);
  });

  // Save weekly stats on change
  useEffect(() => {
    saveToStorage('avestella_weekly_stats', weeklyStats);
  }, [weeklyStats]);

  // Save monthly stats on change
  useEffect(() => {
    saveToStorage('avestella_monthly_stats', monthlyStats);
  }, [monthlyStats]);

  // Save rank points on change
  useEffect(() => {
    saveToStorage('avestella_rank_points', playerRankPoints);
  }, [playerRankPoints]);

  // Calculate competitive rank from points
  const competitiveRank = useMemo((): CompetitiveRank => {
    const rankOrder: CompetitiveRank[] = [
      'legend', 'grandmaster', 'master',
      'diamond_1', 'diamond_2', 'diamond_3',
      'platinum_1', 'platinum_2', 'platinum_3',
      'gold_1', 'gold_2', 'gold_3',
      'silver_1', 'silver_2', 'silver_3',
      'bronze_1', 'bronze_2', 'bronze_3',
      'unranked'
    ];

    for (const rank of rankOrder) {
      if (playerRankPoints >= RANKS[rank].minPoints) {
        return rank;
      }
    }
    return 'unranked';
  }, [playerRankPoints]);

  const getRankConfig = useCallback((): RankConfig => {
    return RANKS[competitiveRank];
  }, [competitiveRank]);

  const getNextRank = useCallback((): { rank: CompetitiveRank; pointsNeeded: number } | null => {
    const rankOrder: CompetitiveRank[] = [
      'unranked', 'bronze_3', 'bronze_2', 'bronze_1',
      'silver_3', 'silver_2', 'silver_1',
      'gold_3', 'gold_2', 'gold_1',
      'platinum_3', 'platinum_2', 'platinum_1',
      'diamond_3', 'diamond_2', 'diamond_1',
      'master', 'grandmaster', 'legend'
    ];

    const currentIndex = rankOrder.indexOf(competitiveRank);
    if (currentIndex >= rankOrder.length - 1) return null; // Already at max

    const nextRank = rankOrder[currentIndex + 1];
    const pointsNeeded = RANKS[nextRank].minPoints - playerRankPoints;

    return { rank: nextRank, pointsNeeded };
  }, [competitiveRank, playerRankPoints]);

  const getRankProgress = useCallback((): number => {
    const next = getNextRank();
    if (!next) return 100; // Max rank

    const currentMin = RANKS[competitiveRank].minPoints;
    const nextMin = RANKS[next.rank].minPoints;
    const range = nextMin - currentMin;
    const progress = playerRankPoints - currentMin;

    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [competitiveRank, playerRankPoints, getNextRank]);

  const addRankPoints = useCallback((points: number) => {
    setPlayerRankPoints(prev => Math.max(0, prev + points));
  }, []);

  // Weekly tracking methods
  const recordWin = useCallback(() => {
    setWeeklyStats(prev => ({
      ...prev,
      wins: prev.wins + 1,
      gamesPlayed: prev.gamesPlayed + 1,
    }));
    // Wins give rank points
    addRankPoints(25);
  }, [addRankPoints]);

  const recordGamePlayed = useCallback(() => {
    setWeeklyStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
    }));
    // Participation gives small rank points
    addRankPoints(5);
  }, [addRankPoints]);

  const getWeeklyProgress = useCallback(() => {
    const now = Date.now();
    const weekEnd = weeklyStats.weekStart + 7 * 24 * 60 * 60 * 1000;
    const msRemaining = Math.max(0, weekEnd - now);
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

    return {
      wins: weeklyStats.wins,
      gamesPlayed: weeklyStats.gamesPlayed,
      daysRemaining,
    };
  }, [weeklyStats]);

  // Create player entry
  const playerEntry: LeaderboardEntry = useMemo(() => ({
    name: 'You',
    avatar: '🌟',
    level: playerLevel,
    xp: playerXP,
    stardust: playerStardust,
    challengesCompleted: playerChallenges,
    seasonTier: playerSeasonTier,
    weeklyWins: weeklyStats.wins,
    isPlayer: true
  }), [playerLevel, playerXP, playerStardust, playerChallenges, playerSeasonTier, weeklyStats.wins]);

  // All entries including player (from server + current player)
  const allEntries = useMemo(() => {
    // Filter out the player's own entry from server data to avoid duplicates
    const otherPlayers = serverEntries.filter(e => !e.isPlayer);
    return [...otherPlayers, playerEntry];
  }, [serverEntries, playerEntry]);

  // Sorted entries based on category
  const sortedEntries = useMemo(() => {
    const sortKey = {
      xp: 'xp',
      stardust: 'stardust',
      challenges: 'challengesCompleted',
      season: 'seasonTier',
      weekly: 'weeklyWins'
    }[category] as keyof LeaderboardEntry;

    return [...allEntries].sort((a, b) =>
      ((b[sortKey] as number) || 0) - ((a[sortKey] as number) || 0)
    );
  }, [allEntries, category]);

  // Player rank
  const playerRank = useMemo(() => {
    return sortedEntries.findIndex(e => e.isPlayer) + 1;
  }, [sortedEntries]);

  const getTopEntries = useCallback((count: number = 10): LeaderboardEntry[] => {
    return sortedEntries.slice(0, count);
  }, [sortedEntries]);

  const getPlayerEntry = useCallback((): LeaderboardEntry | null => {
    return playerEntry;
  }, [playerEntry]);

  const refreshLeaderboard = useCallback(() => {
    setIsLoading(true);
    gameClient.requestLeaderboard(category, 50);
  }, [category]);

  const recordXPEarned = useCallback((xp: number) => {
    setWeeklyStats(prev => ({
      ...prev,
      xpEarned: prev.xpEarned + xp
    }));
    setMonthlyStats(prev => ({
      ...prev,
      xpEarned: prev.xpEarned + xp
    }));
  }, []);

  return {
    entries: sortedEntries,
    category,
    timePeriod,
    playerRank,
    setCategory,
    setTimePeriod,
    getTopEntries,
    getPlayerEntry,
    refreshLeaderboard,

    // Weekly & Monthly Tracking
    weeklyStats,
    monthlyStats,
    recordWin,
    recordGamePlayed,
    recordXPEarned,
    getWeeklyProgress,

    // Competitive Rank
    playerRankPoints,
    competitiveRank,
    getRankConfig,
    getNextRank,
    getRankProgress,
    addRankPoints,
  };
}

export default useLeaderboard;
