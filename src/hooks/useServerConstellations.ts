// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Server Constellations Hook
// ═══════════════════════════════════════════════════════════════════════════
// Connects to backend ConstellationService for persistent constellation data
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { gameClient } from '../services/GameClient';
import { useUI } from '@/contexts/UIContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ServerConstellation {
  constellationId: string;
  name: string;
  description?: string;
  playerIds: string[];
  starMemoryIds: string[];
  realmId: string;
  shape: Array<{ x: number; y: number }>;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  rewardsDistributed: boolean;
  createdAt: Date;
}

export interface ConstellationStats {
  totalFormed: number;
  byRarity: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  totalRewardsEarned: number;
  uniquePlayersConnected: number;
}

export interface PotentialConstellation {
  playerIds: string[];
  starMemoryIds: string[];
  realmId: string;
  estimatedRarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UseServerConstellationsReturn {
  // State
  loading: boolean;
  error: string | null;

  // Data
  playerConstellations: ServerConstellation[];
  realmConstellations: ServerConstellation[];
  potentialConstellations: PotentialConstellation[];
  stats: ConstellationStats | null;
  globalStats: any | null;

  // Actions
  formConstellation: (data: {
    playerIds: string[];
    starMemoryIds: string[];
    realmId: string;
    name?: string;
    description?: string;
  }) => void;
  expandConstellation: (constellationId: string, newStarMemoryIds: string[]) => void;
  getPlayerConstellations: () => void;
  getRealmConstellations: (realmId: string) => void;
  checkPotentialConstellations: () => void;
  refreshStats: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useServerConstellations(): UseServerConstellationsReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerConstellations, setPlayerConstellations] = useState<ServerConstellation[]>([]);
  const [realmConstellations, setRealmConstellations] = useState<ServerConstellation[]>([]);
  const [potentialConstellations, setPotentialConstellations] = useState<PotentialConstellation[]>([]);
  const [stats, setStats] = useState<ConstellationStats | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const { showToast } = useUI();

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handlePlayerList = (data: any) => {
      setLoading(false);
      if (data?.constellations) {
        const parsed = data.constellations.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt)
        }));
        setPlayerConstellations(parsed);
      }
    };

    const handleRealmList = (data: any) => {
      setLoading(false);
      if (data?.constellations) {
        const parsed = data.constellations.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt)
        }));
        setRealmConstellations(parsed);
      }
    };

    const handleFormed = (data: any) => {
      if (data?.success && data.constellation) {
        const newConstellation = {
          ...data.constellation,
          createdAt: new Date(data.constellation.createdAt)
        };
        setPlayerConstellations(prev => [newConstellation, ...prev]);
        console.log('⭐ Constellation formed!', data);
      } else if (data?.error) {
        setError(data.error);
      }
    };

    const handlePotential = (data: any) => {
      if (data?.potential) {
        setPotentialConstellations(data.potential);
      }
    };

    const handleStats = (data: any) => {
      if (data) {
        setStats(data);
      }
    };

    const handleGlobalStats = (data: any) => {
      if (data) {
        setGlobalStats(data);
      }
    };

    const handleNewConstellation = (data: any) => {
      // Someone formed a constellation in our realm
      console.log('✨ New constellation in realm!', data);
    };

    const handleYouFormed = (data: any) => {
      // We were part of a constellation formation
      console.log('🎉 You formed a constellation!', data);
      showToast(`Constellation Formed! +${data.rewards?.stardust || 0} Stardust`, 'success', 6000, 'top-center');
    };

    const handleRewardsReceived = (data: any) => {
      console.log('💎 Constellation rewards received!', data);
    };

    // Subscribe to events
    gameClient.on('constellation:playerList', handlePlayerList);
    gameClient.on('constellation:realmList', handleRealmList);
    gameClient.on('constellation:formed', handleFormed);
    gameClient.on('constellation:potential', handlePotential);
    gameClient.on('constellation:stats', handleStats);
    gameClient.on('constellation:globalStats', handleGlobalStats);
    gameClient.on('constellation:newConstellation', handleNewConstellation);
    gameClient.on('constellation:youFormedConstellation', handleYouFormed);
    gameClient.on('constellation:rewardsReceived', handleRewardsReceived);

    // Initial load
    gameClient.getPlayerConstellations();
    gameClient.getConstellationStats();

    return () => {
      gameClient.off('constellation:playerList', handlePlayerList);
      gameClient.off('constellation:realmList', handleRealmList);
      gameClient.off('constellation:formed', handleFormed);
      gameClient.off('constellation:potential', handlePotential);
      gameClient.off('constellation:stats', handleStats);
      gameClient.off('constellation:globalStats', handleGlobalStats);
      gameClient.off('constellation:newConstellation', handleNewConstellation);
      gameClient.off('constellation:youFormedConstellation', handleYouFormed);
      gameClient.off('constellation:rewardsReceived', handleRewardsReceived);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const formConstellation = useCallback((data: {
    playerIds: string[];
    starMemoryIds: string[];
    realmId: string;
    name?: string;
    description?: string;
  }) => {
    gameClient.formConstellation(data);
  }, []);

  const getPlayerConstellations = useCallback(() => {
    setLoading(true);
    gameClient.getPlayerConstellations();
  }, []);

  const getRealmConstellations = useCallback((realmId: string) => {
    setLoading(true);
    gameClient.getRealmConstellations(realmId);
  }, []);

  const checkPotentialConstellations = useCallback(() => {
    gameClient.checkPotentialConstellations();
  }, []);

  const refreshStats = useCallback(() => {
    gameClient.getConstellationStats();
    gameClient.getGlobalConstellationStats();
  }, []);

  return {
    loading,
    error,
    playerConstellations,
    realmConstellations,
    potentialConstellations,
    stats,
    globalStats,
    formConstellation,
    expandConstellation: useCallback((constellationId: string, newStarMemoryIds: string[]) => {
      gameClient.expandConstellation(constellationId, newStarMemoryIds);
    }, []),
    getPlayerConstellations,
    getRealmConstellations,
    checkPotentialConstellations,
    refreshStats
  };
}

export default useServerConstellations;
