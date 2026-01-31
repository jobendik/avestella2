/**
 * Fragment collection system - light particles to collect
 * Ported from legacy_3/src/game/fragments.ts
 */

import type { Fragment } from '@/rendering/effects';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const FRAGMENT_COLLECT_RADIUS = 60;
export const FRAGMENT_SPAWN_RATE = 0.02;
export const WORLD_SIZE = 8000;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  collectedFragments: Fragment[];
  remainingFragments: Fragment[];
  totalCollected: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPAWNING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Spawn a new fragment at a random position around the player
 */
export const spawnFragment = (playerX: number, playerY: number): Fragment => {
  const angle = Math.random() * Math.PI * 2;
  const distance = 300 + Math.random() * 300; // 300-600 units away
  
  return {
    x: playerX + Math.cos(angle) * distance,
    y: playerY + Math.sin(angle) * distance,
    phase: Math.random() * Math.PI * 2
  };
};

/**
 * Check if a new fragment should spawn based on player speed
 */
export const shouldSpawnFragment = (speed: number): boolean => {
  return Math.random() < FRAGMENT_SPAWN_RATE && speed > 0.2;
};

/**
 * Initialize world with starting fragments
 */
export const initializeFragments = (count: number = 150): Fragment[] => {
  return Array.from({ length: count }, () => ({
    x: Math.random() * WORLD_SIZE,
    y: Math.random() * WORLD_SIZE,
    phase: Math.random() * Math.PI * 2
  }));
};

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check which fragments the player has collected
 */
export const collectFragments = (
  fragments: Fragment[],
  playerX: number,
  playerY: number
): CollectionResult => {
  const collectedFragments: Fragment[] = [];
  const remainingFragments: Fragment[] = [];
  
  fragments.forEach(fragment => {
    const dist = Math.hypot(playerX - fragment.x, playerY - fragment.y);
    
    if (dist < FRAGMENT_COLLECT_RADIUS) {
      collectedFragments.push(fragment);
    } else {
      remainingFragments.push(fragment);
    }
  });
  
  return {
    collectedFragments,
    remainingFragments,
    totalCollected: collectedFragments.length
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Remove fragments that are too far from the player
 */
export const cullDistantFragments = (
  fragments: Fragment[],
  playerX: number,
  playerY: number,
  maxDistance: number = 1500
): Fragment[] => {
  return fragments.filter(fragment => {
    const dist = Math.hypot(playerX - fragment.x, playerY - fragment.y);
    return dist <= maxDistance;
  });
};

/**
 * Limit total fragment count for performance
 */
export const pruneFragments = (
  fragments: Fragment[],
  maxCount: number = 250
): Fragment[] => {
  if (fragments.length <= maxCount) return fragments;
  return fragments.slice(fragments.length - maxCount);
};

// ═══════════════════════════════════════════════════════════════════════════════
// FRAGMENT MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages fragment lifecycle for easy integration
 */
export class FragmentManager {
  fragments: Fragment[];
  totalCollected: number;
  
  constructor(initialCount: number = 150) {
    this.fragments = initializeFragments(initialCount);
    this.totalCollected = 0;
  }
  
  /**
   * Update fragments - spawn, collect, cull
   */
  update(
    playerX: number,
    playerY: number,
    playerSpeed: number
  ): { collected: number; newFragment: Fragment | null } {
    // Spawn new fragments while moving
    let newFragment: Fragment | null = null;
    if (shouldSpawnFragment(playerSpeed) && this.fragments.length < 250) {
      newFragment = spawnFragment(playerX, playerY);
      this.fragments.push(newFragment);
    }
    
    // Collect nearby fragments
    const result = collectFragments(this.fragments, playerX, playerY);
    this.fragments = result.remainingFragments;
    this.totalCollected += result.totalCollected;
    
    // Cull distant fragments periodically
    if (Math.random() < 0.01) {
      this.fragments = cullDistantFragments(this.fragments, playerX, playerY);
    }
    
    // Enforce max count
    this.fragments = pruneFragments(this.fragments);
    
    return {
      collected: result.totalCollected,
      newFragment
    };
  }
  
  /**
   * Get all fragments for rendering
   */
  getFragments(): Fragment[] {
    return this.fragments;
  }
  
  /**
   * Get total fragments collected
   */
  getTotalCollected(): number {
    return this.totalCollected;
  }
}
