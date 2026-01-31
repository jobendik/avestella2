// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Exploration Hook (Batch 1: World & Exploration)
// Server-synced exploration - all data persisted to MongoDB via WebSocket
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useCallback, useEffect } from 'react';
import type { Biome, PointOfInterest, ExplorationState } from '@/types';
import {
  BIOMES,
  POINTS_OF_INTEREST,
  LANDMARKS,
  TIME_SECRETS,
  FOG_CELL_SIZE,
  DISCOVERY_REWARDS,
  getBiomeAtPosition,
  getRevealedCells,
  calculateExplorationPercentage,
  isTimeSecretActive,
  type Landmark,
  type TimeSecret,
} from '@/constants/world';
import { useServerSync } from './useServerSync';
import { WORLD_SIZE } from '@/constants/game';

// ─────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────────────────

const EXPLORATION_STORAGE_KEY = 'avestella_exploration_v1';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExplorationData {
  exploredCells: string[];
  discoveredBiomes: string[];
  discoveredPOIs: string[];
  discoveredLandmarks: string[];
  discoveredSecrets: string[];
  discoveredTimeSecrets: string[];
  lastPlayerX: number;
  lastPlayerY: number;
}

export interface DiscoveryEvent {
  type: 'biome' | 'poi' | 'landmark' | 'secret' | 'milestone' | 'timeSecret';
  id: string;
  name: string;
  rewards: {
    stardust: number;
    xp: number;
    cosmetic?: string;
  };
}

export interface UseExplorationReturn {
  // State
  currentBiome: Biome | null;
  explorationPercentage: number;
  exploredCells: Set<string>;
  discoveredBiomes: string[];
  discoveredPOIs: string[];
  discoveredLandmarks: string[];
  discoveredTimeSecrets: string[];
  
  // Actions
  updatePlayerPosition: (x: number, y: number) => DiscoveryEvent[];
  isPositionExplored: (x: number, y: number) => boolean;
  getNearbyPOIs: (x: number, y: number, radius: number) => PointOfInterest[];
  getNearbyLandmarks: (x: number, y: number, radius: number) => Landmark[];
  getActiveTimeSecrets: (x: number, y: number) => TimeSecret[];
  getDiscoveredPOIs: () => PointOfInterest[];
  getBiomeProgress: () => { discovered: number; total: number };
  
  // Persistence
  saveExploration: () => void;
  loadExploration: () => void;
  resetExploration: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useExploration(playerId?: string): UseExplorationReturn {
  // Use refs for state to avoid re-renders on every position update
  const exploredCellsRef = useRef<Set<string>>(new Set());
  const discoveredBiomesRef = useRef<Set<string>>(new Set());
  const discoveredPOIsRef = useRef<Set<string>>(new Set());
  const discoveredLandmarksRef = useRef<Set<string>>(new Set());
  const discoveredSecretsRef = useRef<Set<string>>(new Set());
  const discoveredTimeSecretsRef = useRef<Set<string>>(new Set());
  const currentBiomeRef = useRef<Biome | null>(null);
  const explorationPercentageRef = useRef<number>(0);
  const lastMilestoneRef = useRef<number>(0);
  
  // Server sync for persistence
  const serverSync = useServerSync(playerId || 'anonymous');
  
  // Sync from server when data arrives
  useEffect(() => {
    if (serverSync.playerData?.exploration) {
      const exploration = serverSync.playerData.exploration;
      discoveredBiomesRef.current = new Set(exploration.discoveredAreas || []);
      explorationPercentageRef.current = exploration.explorationPercent || 0;
      
      // Load discoveries
      if (exploration.discoveries) {
        exploration.discoveries.forEach(d => {
          if (d.type === 'poi') discoveredPOIsRef.current.add(d.id);
          if (d.type === 'landmark') discoveredLandmarksRef.current.add(d.id);
          if (d.type === 'secret') discoveredSecretsRef.current.add(d.id);
          if (d.type === 'timeSecret') discoveredTimeSecretsRef.current.add(d.id);
        });
      }
    }
  }, [serverSync.playerData?.exploration]);

  /**
   * Update exploration state when player moves
   * Returns any discoveries made
   */
  const updatePlayerPosition = useCallback((x: number, y: number): DiscoveryEvent[] => {
    const discoveries: DiscoveryEvent[] = [];

    // Reveal fog of war cells
    const cellsToReveal = getRevealedCells(x, y);
    let newCellsRevealed = false;
    
    for (const cell of cellsToReveal) {
      if (!exploredCellsRef.current.has(cell)) {
        exploredCellsRef.current.add(cell);
        newCellsRevealed = true;
      }
    }

    // Update exploration percentage
    if (newCellsRevealed) {
      explorationPercentageRef.current = calculateExplorationPercentage(exploredCellsRef.current);
      
      // Check for exploration milestones
      const milestones = [10, 25, 50, 75, 100];
      for (const milestone of milestones) {
        if (
          explorationPercentageRef.current >= milestone &&
          lastMilestoneRef.current < milestone
        ) {
          lastMilestoneRef.current = milestone;
          const rewardKey = `explorationMilestone${milestone}` as keyof typeof DISCOVERY_REWARDS;
          const reward = DISCOVERY_REWARDS[rewardKey];
          
          discoveries.push({
            type: 'milestone',
            id: `milestone_${milestone}`,
            name: `${milestone}% Explored!`,
            rewards: {
              stardust: reward.stardust,
              xp: reward.xp,
              cosmetic: 'cosmetic' in reward ? reward.cosmetic : undefined,
            },
          });
        }
      }
    }

    // Check biome discovery
    const biome = getBiomeAtPosition(x, y);
    if (biome) {
      currentBiomeRef.current = biome;
      
      if (!discoveredBiomesRef.current.has(biome.id)) {
        discoveredBiomesRef.current.add(biome.id);
        discoveries.push({
          type: 'biome',
          id: biome.id,
          name: biome.name,
          rewards: DISCOVERY_REWARDS.biome,
        });
      }
    }

    // Check POI discovery (within 100 units)
    const POI_DISCOVER_RADIUS = 100;
    for (const poi of POINTS_OF_INTEREST) {
      if (discoveredPOIsRef.current.has(poi.id)) continue;
      
      const dx = poi.x - x;
      const dy = poi.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < POI_DISCOVER_RADIUS) {
        discoveredPOIsRef.current.add(poi.id);
        
        const isSecret = poi.type === 'secret';
        if (isSecret) {
          discoveredSecretsRef.current.add(poi.id);
        }
        
        const baseReward = isSecret ? DISCOVERY_REWARDS.secret : DISCOVERY_REWARDS.poi;
        const poiReward = poi.rewards;
        
        discoveries.push({
          type: isSecret ? 'secret' : 'poi',
          id: poi.id,
          name: poi.name,
          rewards: {
            stardust: poiReward?.stardust ?? baseReward.stardust,
            xp: poiReward?.xp ?? baseReward.xp,
            cosmetic: poiReward?.cosmetic,
          },
        });
      }
    }

    // Check landmark discovery (within 150 units)
    const LANDMARK_DISCOVER_RADIUS = 150;
    for (const landmark of LANDMARKS) {
      if (discoveredLandmarksRef.current.has(landmark.id)) continue;
      
      const dx = landmark.x - x;
      const dy = landmark.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < LANDMARK_DISCOVER_RADIUS) {
        discoveredLandmarksRef.current.add(landmark.id);
        discoveries.push({
          type: 'landmark',
          id: landmark.id,
          name: landmark.name,
          rewards: DISCOVERY_REWARDS.landmark,
        });
      }
    }

    // Check time-based secret discovery (within 80 units and during active time)
    const TIME_SECRET_DISCOVER_RADIUS = 80;
    for (const secret of TIME_SECRETS) {
      if (discoveredTimeSecretsRef.current.has(secret.id)) continue;
      if (!isTimeSecretActive(secret)) continue;
      
      const dx = secret.x - x;
      const dy = secret.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < TIME_SECRET_DISCOVER_RADIUS) {
        discoveredTimeSecretsRef.current.add(secret.id);
        discoveries.push({
          type: 'timeSecret',
          id: secret.id,
          name: secret.name,
          rewards: {
            stardust: secret.rewards?.stardust ?? DISCOVERY_REWARDS.secret.stardust * 2,
            xp: secret.rewards?.xp ?? DISCOVERY_REWARDS.secret.xp * 2,
            cosmetic: secret.rewards?.cosmetic,
          },
        });
      }
    }

    // Sync discoveries to server
    for (const discovery of discoveries) {
      serverSync.addDiscovery(discovery.id, discovery.type);
    }
    
    // Update exploration percentage on server
    if (newCellsRevealed) {
      serverSync.updateExploration({
        explorationPercent: explorationPercentageRef.current,
        discoveredAreas: Array.from(discoveredBiomesRef.current),
      });
    }

    return discoveries;
  }, [serverSync]);

  /**
   * Check if a position has been explored
   */
  const isPositionExplored = useCallback((x: number, y: number): boolean => {
    const cellX = Math.floor(x / FOG_CELL_SIZE);
    const cellY = Math.floor(y / FOG_CELL_SIZE);
    return exploredCellsRef.current.has(`${cellX},${cellY}`);
  }, []);

  /**
   * Get POIs within a radius
   */
  const getNearbyPOIs = useCallback((x: number, y: number, radius: number): PointOfInterest[] => {
    return POINTS_OF_INTEREST.filter(poi => {
      const dx = poi.x - x;
      const dy = poi.y - y;
      return Math.sqrt(dx * dx + dy * dy) < radius;
    });
  }, []);

  /**
   * Get landmarks within a radius
   */
  const getNearbyLandmarks = useCallback((x: number, y: number, radius: number): Landmark[] => {
    return LANDMARKS.filter(landmark => {
      const dx = landmark.x - x;
      const dy = landmark.y - y;
      return Math.sqrt(dx * dx + dy * dy) < radius;
    });
  }, []);

  /**
   * Get active time secrets near a position (considers current time)
   */
  const getActiveTimeSecrets = useCallback((x: number, y: number): TimeSecret[] => {
    return TIME_SECRETS.filter(secret => {
      if (!isTimeSecretActive(secret)) return false;
      const dx = secret.x - x;
      const dy = secret.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 200; // Detection radius
    });
  }, []);

  /**
   * Get all discovered POIs
   */
  const getDiscoveredPOIs = useCallback((): PointOfInterest[] => {
    return POINTS_OF_INTEREST.filter(poi => discoveredPOIsRef.current.has(poi.id));
  }, []);

  /**
   * Get biome discovery progress
   */
  const getBiomeProgress = useCallback(() => {
    return {
      discovered: discoveredBiomesRef.current.size,
      total: BIOMES.length,
    };
  }, []);

  /**
   * Save exploration data - now handled by server sync
   */
  const saveExploration = useCallback(() => {
    // No-op: Server sync handles persistence automatically
    console.log('[Exploration] saveExploration called - data is auto-synced to server');
  }, []);

  /**
   * Load exploration data from server
   */
  const loadExploration = useCallback(() => {
    serverSync.requestFullSync();
  }, [serverSync]);

  /**
   * Reset all exploration data
   */
  const resetExploration = useCallback(() => {
    exploredCellsRef.current.clear();
    discoveredBiomesRef.current.clear();
    discoveredPOIsRef.current.clear();
    discoveredLandmarksRef.current.clear();
    discoveredSecretsRef.current.clear();
    discoveredTimeSecretsRef.current.clear();
    explorationPercentageRef.current = 0;
    lastMilestoneRef.current = 0;
    currentBiomeRef.current = null;
    
    // Server will handle state reset
    serverSync.updateExploration({
      discoveredAreas: [],
      visitedRealms: [],
      totalDistance: 0,
      explorationPercent: 0,
    });
  }, [serverSync]);

  // Auto-sync is handled by serverSync, no localStorage needed

  return {
    // State (return current values from refs)
    currentBiome: currentBiomeRef.current,
    explorationPercentage: explorationPercentageRef.current,
    exploredCells: exploredCellsRef.current,
    discoveredBiomes: Array.from(discoveredBiomesRef.current),
    discoveredPOIs: Array.from(discoveredPOIsRef.current),
    discoveredLandmarks: Array.from(discoveredLandmarksRef.current),
    discoveredTimeSecrets: Array.from(discoveredTimeSecretsRef.current),
    
    // Actions
    updatePlayerPosition,
    isPositionExplored,
    getNearbyPOIs,
    getNearbyLandmarks,
    getActiveTimeSecrets,
    getDiscoveredPOIs,
    getBiomeProgress,
    
    // Persistence
    saveExploration,
    loadExploration,
    resetExploration,
  };
}

export default useExploration;
