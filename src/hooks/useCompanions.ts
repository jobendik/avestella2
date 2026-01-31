// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Companions Hook (Batch 4: Collectibles & Pets)
// Manages companion ownership, leveling, and bonuses
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  COMPANIONS,
  COMPANION_LEVELS,
  CONSTELLATION_PIECES,
  CONSTELLATIONS,
  ACHIEVEMENT_BADGES,
  Companion,
  ConstellationPiece,
  calculateCompanionBonus,
  getConstellationProgress,
} from '@/constants/companions';
import { gameClient } from '@/services/GameClient';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OwnedCompanion {
  id: string;
  level: number;
  xp: number;
  acquiredAt: number;
}

interface CompanionData {
  ownedCompanions: Record<string, OwnedCompanion>;
  equippedCompanionId: string | null;
  constellationPieces: string[];
  completedConstellations: string[];
  earnedBadges: string[];
  totalFragmentsCollected: number;
  totalCompanionXPEarned: number;
}

export interface UseCompanionsReturn {
  // State
  ownedCompanions: Record<string, OwnedCompanion>;
  equippedCompanion: Companion | null;
  equippedCompanionData: OwnedCompanion | null;
  constellationPieces: string[];
  completedConstellations: string[];
  earnedBadges: string[];

  // Companion Management
  getAllCompanions: () => Companion[];
  getCompanion: (id: string) => Companion | undefined;
  ownsCompanion: (id: string) => boolean;
  purchaseCompanion: (id: string, stardust: number, spendStardust: (amount: number) => boolean) => boolean;
  unlockCompanion: (id: string) => void;
  equipCompanion: (id: string | null) => void;

  // Leveling
  addCompanionXP: (id: string, xp: number) => { leveledUp: boolean; newLevel: number };
  getCompanionLevel: (id: string) => number;
  getCompanionXP: (id: string) => number;
  getCompanionXPProgress: (id: string) => { current: number; required: number; percentage: number };

  // Bonuses
  getActiveBonus: (effectType: string) => number;
  getAllActiveBonuses: () => Record<string, number>;

  // Constellation
  addConstellationPiece: (pieceId: string) => boolean;
  hasConstellationPiece: (pieceId: string) => boolean;
  getConstellationProgress: (constellationId: string) => { total: number; owned: number; percentage: number };
  checkConstellationComplete: (constellationId: string) => boolean;
  claimConstellationReward: (constellationId: string) => boolean;

  // Achievements
  hasBadge: (badgeId: string) => boolean;
  checkAndAwardBadges: (stats: Record<string, number>) => string[];

  // Stats
  getOwnedCompanionCount: () => number;
  getTotalCompanionCount: () => number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'avestella_companions';

const DEFAULT_DATA: CompanionData = {
  ownedCompanions: {},
  equippedCompanionId: null,
  constellationPieces: [],
  completedConstellations: [],
  earnedBadges: [],
  totalFragmentsCollected: 0,
  totalCompanionXPEarned: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useCompanions = (): UseCompanionsReturn => {
  const [data, setData] = useState<CompanionData>(() => {
    const saved = loadFromStorage<CompanionData>(STORAGE_KEY, DEFAULT_DATA);
    return { ...DEFAULT_DATA, ...saved };
  });

  // Listen to server events
  useEffect(() => {
    // Initial request
    if (gameClient.isConnected()) {
      gameClient.requestCompanionData();
    }

    const onCompanionData = (newData: Partial<CompanionData>) => {
      setData(prev => ({ ...prev, ...newData }));
    };

    const onCompanionPurchased = (eventData: { companionId: string, remainingStardust: number }) => {
      const { companionId } = eventData;

      setData(prev => ({
        ...prev,
        ownedCompanions: {
          ...prev.ownedCompanions,
          [companionId]: {
            id: companionId,
            level: 1,
            xp: 0,
            acquiredAt: Date.now(),
          }
        }
      }));
    };

    const onCompanionEquipped = (eventData: { companionId: string }) => {
      setData(prev => ({
        ...prev,
        equippedCompanionId: eventData.companionId
      }));
    };

    const onConstellationReward = (eventData: { constellationId: string, reward: any }) => {
      setData(prev => ({
        ...prev,
        completedConstellations: [...prev.completedConstellations, eventData.constellationId]
      }));
    };

    gameClient.on('companion_data', onCompanionData);
    gameClient.on('companion_purchased', onCompanionPurchased);
    gameClient.on('companion_equipped', onCompanionEquipped);
    gameClient.on('constellation_reward_claimed', onConstellationReward);

    return () => {
      gameClient.off('companion_data', onCompanionData);
      gameClient.off('companion_purchased', onCompanionPurchased);
      gameClient.off('companion_equipped', onCompanionEquipped);
      gameClient.off('constellation_reward_claimed', onConstellationReward);
    };
  }, []);

  // Persist to storage (Backup/Cache)
  useEffect(() => {
    saveToStorage(STORAGE_KEY, data);
  }, [data]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Companion Management
  // ═══════════════════════════════════════════════════════════════════════════

  const getAllCompanions = useCallback((): Companion[] => {
    return Object.values(COMPANIONS);
  }, []);

  const getCompanion = useCallback((id: string): Companion | undefined => {
    return COMPANIONS[id];
  }, []);

  const ownsCompanion = useCallback((id: string): boolean => {
    return id in data.ownedCompanions;
  }, [data.ownedCompanions]);

  const purchaseCompanion = useCallback((
    id: string,
    stardust: number,
    spendStardust: (amount: number) => boolean
  ): boolean => {
    // Server-authoritative purchase
    gameClient.purchaseCompanion(id);
    return true; // Optimistic success
  }, [ownsCompanion]);

  const unlockCompanion = useCallback((id: string): void => {
    if (ownsCompanion(id)) return;
    if (!COMPANIONS[id]) return;

    setData(prev => ({
      ...prev,
      ownedCompanions: {
        ...prev.ownedCompanions,
        [id]: {
          id,
          level: 1,
          xp: 0,
          acquiredAt: Date.now(),
        },
      },
    }));
  }, [ownsCompanion]);

  const equipCompanion = useCallback((id: string | null): void => {
    // Server-authoritative equip
    gameClient.equipCompanion(id);

    // Optimistic local update
    setData(prev => ({
      ...prev,
      equippedCompanionId: id,
    }));
  }, [ownsCompanion]);

  // Derived state
  const equippedCompanion = useMemo((): Companion | null => {
    if (!data.equippedCompanionId) return null;
    return COMPANIONS[data.equippedCompanionId] || null;
  }, [data.equippedCompanionId]);

  const equippedCompanionData = useMemo((): OwnedCompanion | null => {
    if (!data.equippedCompanionId) return null;
    return data.ownedCompanions[data.equippedCompanionId] || null;
  }, [data.equippedCompanionId, data.ownedCompanions]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Leveling System
  // ═══════════════════════════════════════════════════════════════════════════

  const getCompanionLevel = useCallback((id: string): number => {
    return data.ownedCompanions[id]?.level || 0;
  }, [data.ownedCompanions]);

  const getCompanionXP = useCallback((id: string): number => {
    return data.ownedCompanions[id]?.xp || 0;
  }, [data.ownedCompanions]);

  const getCompanionXPProgress = useCallback((id: string): {
    current: number;
    required: number;
    percentage: number
  } => {
    const owned = data.ownedCompanions[id];
    if (!owned) return { current: 0, required: 100, percentage: 0 };

    const currentLevelData = COMPANION_LEVELS[owned.level - 1];
    const nextLevelData = COMPANION_LEVELS[owned.level];

    if (!nextLevelData) {
      // Max level
      return { current: owned.xp, required: owned.xp, percentage: 100 };
    }

    const currentThreshold = currentLevelData?.xpRequired || 0;
    const nextThreshold = nextLevelData.xpRequired;
    const xpInLevel = owned.xp - currentThreshold;
    const xpNeeded = nextThreshold - currentThreshold;

    return {
      current: xpInLevel,
      required: xpNeeded,
      percentage: Math.round((xpInLevel / xpNeeded) * 100),
    };
  }, [data.ownedCompanions]);

  const addCompanionXP = useCallback((id: string, xp: number): {
    leveledUp: boolean;
    newLevel: number
  } => {
    const owned = data.ownedCompanions[id];
    if (!owned) return { leveledUp: false, newLevel: 0 };

    const companion = COMPANIONS[id];
    if (!companion) return { leveledUp: false, newLevel: owned.level };

    let newXP = owned.xp + xp;
    let newLevel = owned.level;
    let leveledUp = false;

    // Check for level ups
    while (newLevel < companion.maxLevel) {
      const nextLevelData = COMPANION_LEVELS[newLevel];
      if (!nextLevelData || newXP < nextLevelData.xpRequired) break;
      newLevel++;
      leveledUp = true;
    }

    setData(prev => ({
      ...prev,
      ownedCompanions: {
        ...prev.ownedCompanions,
        [id]: {
          ...owned,
          xp: newXP,
          level: newLevel,
        },
      },
      totalCompanionXPEarned: prev.totalCompanionXPEarned + xp,
    }));

    return { leveledUp, newLevel };
  }, [data.ownedCompanions]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Bonus System
  // ═══════════════════════════════════════════════════════════════════════════

  const getActiveBonus = useCallback((effectType: string): number => {
    if (!equippedCompanion || !equippedCompanionData) return 0;
    if (!equippedCompanion.ability) return 0;
    if (equippedCompanion.ability.effect !== effectType) return 0;

    return calculateCompanionBonus(equippedCompanion, equippedCompanionData.level);
  }, [equippedCompanion, equippedCompanionData]);

  const getAllActiveBonuses = useCallback((): Record<string, number> => {
    const bonuses: Record<string, number> = {
      fragment_magnet: 0,
      xp_boost: 0,
      stardust_boost: 0,
      speed_boost: 0,
      glow_aura: 0,
      lucky_find: 0,
    };

    if (!equippedCompanion || !equippedCompanionData) return bonuses;
    if (!equippedCompanion.ability) return bonuses;

    const bonus = calculateCompanionBonus(equippedCompanion, equippedCompanionData.level);
    bonuses[equippedCompanion.ability.effect] = bonus;

    return bonuses;
  }, [equippedCompanion, equippedCompanionData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Constellation System
  // ═══════════════════════════════════════════════════════════════════════════

  const addConstellationPiece = useCallback((pieceId: string): boolean => {
    if (!CONSTELLATION_PIECES[pieceId]) return false;
    if (data.constellationPieces.includes(pieceId)) return false;

    setData(prev => ({
      ...prev,
      constellationPieces: [...prev.constellationPieces, pieceId],
    }));

    return true;
  }, [data.constellationPieces]);

  const hasConstellationPiece = useCallback((pieceId: string): boolean => {
    return data.constellationPieces.includes(pieceId);
  }, [data.constellationPieces]);

  const getConstellationProgressFunc = useCallback((constellationId: string) => {
    return getConstellationProgress(constellationId, data.constellationPieces);
  }, [data.constellationPieces]);

  const checkConstellationComplete = useCallback((constellationId: string): boolean => {
    const constellation = CONSTELLATIONS[constellationId];
    if (!constellation) return false;

    return constellation.pieces.every(p => data.constellationPieces.includes(p));
  }, [data.constellationPieces]);

  const claimConstellationReward = useCallback((constellationId: string): boolean => {
    gameClient.claimConstellationReward(constellationId);
    return true;
  }, [checkConstellationComplete, data.completedConstellations]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Achievement System
  // ═══════════════════════════════════════════════════════════════════════════

  const hasBadge = useCallback((badgeId: string): boolean => {
    return data.earnedBadges.includes(badgeId);
  }, [data.earnedBadges]);

  const checkAndAwardBadges = useCallback((stats: Record<string, number>): string[] => {
    const newBadges: string[] = [];

    Object.values(ACHIEVEMENT_BADGES).forEach(badge => {
      if (hasBadge(badge.id)) return;

      const statValue = stats[badge.requirement.type] || 0;
      if (statValue >= badge.requirement.value) {
        newBadges.push(badge.id);
      }
    });

    if (newBadges.length > 0) {
      setData(prev => ({
        ...prev,
        earnedBadges: [...prev.earnedBadges, ...newBadges],
      }));
    }

    return newBadges;
  }, [hasBadge]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Stats
  // ═══════════════════════════════════════════════════════════════════════════

  const getOwnedCompanionCount = useCallback((): number => {
    return Object.keys(data.ownedCompanions).length;
  }, [data.ownedCompanions]);

  const getTotalCompanionCount = useCallback((): number => {
    return Object.keys(COMPANIONS).length;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Return
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // State
    ownedCompanions: data.ownedCompanions,
    equippedCompanion,
    equippedCompanionData,
    constellationPieces: data.constellationPieces,
    completedConstellations: data.completedConstellations,
    earnedBadges: data.earnedBadges,

    // Companion Management
    getAllCompanions,
    getCompanion,
    ownsCompanion,
    purchaseCompanion,
    unlockCompanion,
    equipCompanion,

    // Leveling
    addCompanionXP,
    getCompanionLevel,
    getCompanionXP,
    getCompanionXPProgress,

    // Bonuses
    getActiveBonus,
    getAllActiveBonuses,

    // Constellation
    addConstellationPiece,
    hasConstellationPiece,
    getConstellationProgress: getConstellationProgressFunc,
    checkConstellationComplete,
    claimConstellationReward,

    // Achievements
    hasBadge,
    checkAndAwardBadges,

    // Stats
    getOwnedCompanionCount,
    getTotalCompanionCount,
  };
};

export type { OwnedCompanion, CompanionData };
