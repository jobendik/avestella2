/**
 * Fragment collection system - light particles to collect
 * Refactored for Server-Authoritative Architecture
 */

import type { Fragment } from '@/rendering/effects';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const FRAGMENT_COLLECT_RADIUS = 60;
export const FRAGMENT_SPAWN_RATE = 0.02; // Kept for reference or potential visual-only effects
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
// COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check which fragments the player has collected
 * Note: This is now a client-side prediction/helper. 
 * Real validation happens on the server.
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
