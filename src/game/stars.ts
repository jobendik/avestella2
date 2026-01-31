/**
 * Procedural Star Generation System
 * Ported from LEGACY/src/game/logic.ts and LEGACY/src/game/entities.ts
 * 
 * Features:
 * - Seed-based procedural generation for consistent star fields
 * - Grid-cell based caching for infinite worlds
 * - Campfire Model density falloff (fewer stars far from center)
 * - Realm-specific density modifiers
 * - Twinkling animation support
 */

import { STAR_CELL_SIZE, CAMPFIRE_RADIUS, CAMPFIRE_CENTER } from '@/constants/game';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Star {
  id: string;
  x: number;
  y: number;
  lit: boolean;
  burst: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  realm: string;
}

export interface StarFieldState {
  stars: Map<string, Star[]>;
  constellations: Map<string, string[]>; // constellation name -> star IDs
}

// ============================================================================
// Constants
// ============================================================================

/** Realm-specific density multipliers */
export const REALM_STAR_DENSITY: Record<string, number> = {
  genesis: 1.0,
  void: 0.5,
  nebula: 1.3,
  aurora: 1.1,
  crystal: 0.8,
  storm: 0.6,
  deep: 0.7,
  radiant: 1.2,
  twilight: 0.9,
};

/** Base star count range per cell */
const BASE_STAR_COUNT_MIN = 5;
const BASE_STAR_COUNT_RANGE = 8;

/** Minimum density even in far darkness */
const MIN_DENSITY_MULTIPLIER = 0.1;

/** Density falloff rate beyond campfire */
const DENSITY_FALLOFF_RATE = 3000;

// ============================================================================
// Seed-based Random Generation
// ============================================================================

/**
 * Deterministic random number generator based on seed
 * Uses sine function for pseudo-random distribution
 * @param seed - Input seed value
 * @returns Number between 0 and 1
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Generate a seed from cell coordinates and realm
 * Ensures different realms have unique star patterns
 */
function getCellSeed(cx: number, cy: number, realm: string): number {
  return cx * 12.9898 + cy * 78.233 + realm.charCodeAt(0) * 0.1;
}

// ============================================================================
// Star Generation
// ============================================================================

/**
 * Calculate star density multiplier based on distance from campfire center
 * Implements the Campfire Model: full density within campfire, exponential falloff beyond
 */
function getDensityMultiplier(cellCenterX: number, cellCenterY: number): number {
  const distFromCenter = Math.hypot(
    cellCenterX - CAMPFIRE_CENTER.x,
    cellCenterY - CAMPFIRE_CENTER.y
  );

  if (distFromCenter <= CAMPFIRE_RADIUS) {
    return 1.0; // Full density within campfire
  }

  // Exponential falloff beyond campfire radius
  const excessDist = distFromCenter - CAMPFIRE_RADIUS;
  return Math.max(MIN_DENSITY_MULTIPLIER, Math.exp(-excessDist / DENSITY_FALLOFF_RATE));
}

/**
 * Generate stars for a specific grid cell
 * Stars are generated procedurally based on cell coordinates
 * 
 * @param cx - Cell X coordinate
 * @param cy - Cell Y coordinate
 * @param realm - Current realm name
 * @param stars - Star storage map
 */
export function generateCellStars(
  cx: number,
  cy: number,
  realm: string,
  stars: Map<string, Star[]>
): void {
  const cellKey = `${realm}:${cx},${cy}`;
  
  // Skip if already generated
  if (stars.has(cellKey)) return;

  const generatedStars: Star[] = [];
  let seed = getCellSeed(cx, cy, realm);

  // Get realm density modifier
  const realmDensity = REALM_STAR_DENSITY[realm] ?? 1.0;

  // Calculate cell center position
  const cellCenterX = cx * STAR_CELL_SIZE + STAR_CELL_SIZE / 2;
  const cellCenterY = cy * STAR_CELL_SIZE + STAR_CELL_SIZE / 2;

  // Apply Campfire Model density falloff
  const campfireDensity = getDensityMultiplier(cellCenterX, cellCenterY);

  // Calculate final star count
  const baseCount = BASE_STAR_COUNT_MIN + seededRandom(seed) * BASE_STAR_COUNT_RANGE;
  const starCount = Math.floor(baseCount * realmDensity * campfireDensity);

  // Generate stars
  for (let i = 0; i < starCount; i++) {
    // Advance seed for each property
    seed = seed * 1.1 + i * 0.7;
    const localX = seededRandom(seed) * STAR_CELL_SIZE;
    
    seed = seed * 1.3 + 0.5;
    const localY = seededRandom(seed) * STAR_CELL_SIZE;
    
    seed = seed * 0.9 + 0.3;
    const brightness = 0.25 + seededRandom(seed) * 0.75;

    const starId = `${realm}:${cx}:${cy}:${i}`;
    
    generatedStars.push({
      id: starId,
      x: cx * STAR_CELL_SIZE + localX,
      y: cy * STAR_CELL_SIZE + localY,
      lit: false,
      burst: 0,
      brightness,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.015 + Math.random() * 0.025,
      realm,
    });
  }

  stars.set(cellKey, generatedStars);
}

/**
 * Ensure stars are generated for cells around a position
 * Uses a 5x5 grid of cells centered on the current position
 * 
 * @param x - World X position
 * @param y - World Y position
 * @param realm - Current realm
 * @param stars - Star storage map
 */
export function ensureStarsAroundPosition(
  x: number,
  y: number,
  realm: string,
  stars: Map<string, Star[]>
): void {
  const cx = Math.floor(x / STAR_CELL_SIZE);
  const cy = Math.floor(y / STAR_CELL_SIZE);

  // Generate 5x5 grid of cells around player
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      generateCellStars(cx + dx, cy + dy, realm, stars);
    }
  }
}

// ============================================================================
// Star Updates & Animation
// ============================================================================

/**
 * Update star twinkle animation
 * @param star - Star to update
 * @param deltaTime - Time since last frame in seconds
 */
export function updateStarTwinkle(star: Star, deltaTime: number): void {
  star.twinklePhase += star.twinkleSpeed * deltaTime * 60;
  
  // Reduce burst effect over time
  if (star.burst > 0) {
    star.burst = Math.max(0, star.burst - deltaTime * 2);
  }
}

/**
 * Get effective brightness including twinkle
 * @param star - Star to calculate brightness for
 * @returns Brightness value 0-1
 */
export function getStarBrightness(star: Star): number {
  const twinkleFactor = 0.8 + 0.2 * Math.sin(star.twinklePhase);
  const burstFactor = 1 + star.burst * 2;
  return Math.min(1, star.brightness * twinkleFactor * burstFactor);
}

/**
 * Light up a star (from player proximity or interaction)
 */
export function lightStar(star: Star): void {
  star.lit = true;
  star.burst = 1.0;
}

// ============================================================================
// Star Queries
// ============================================================================

/**
 * Get all stars visible in a viewport
 * @param stars - Star storage map
 * @param realm - Current realm
 * @param viewX - Viewport center X
 * @param viewY - Viewport center Y
 * @param viewWidth - Viewport width
 * @param viewHeight - Viewport height
 * @returns Array of visible stars
 */
export function getVisibleStars(
  stars: Map<string, Star[]>,
  realm: string,
  viewX: number,
  viewY: number,
  viewWidth: number,
  viewHeight: number
): Star[] {
  const visible: Star[] = [];
  const halfWidth = viewWidth / 2;
  const halfHeight = viewHeight / 2;

  // Calculate cell range to check
  const minCx = Math.floor((viewX - halfWidth) / STAR_CELL_SIZE) - 1;
  const maxCx = Math.floor((viewX + halfWidth) / STAR_CELL_SIZE) + 1;
  const minCy = Math.floor((viewY - halfHeight) / STAR_CELL_SIZE) - 1;
  const maxCy = Math.floor((viewY + halfHeight) / STAR_CELL_SIZE) + 1;

  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const cellKey = `${realm}:${cx},${cy}`;
      const cellStars = stars.get(cellKey);
      
      if (cellStars) {
        for (const star of cellStars) {
          // Check if star is within viewport bounds
          if (
            star.x >= viewX - halfWidth &&
            star.x <= viewX + halfWidth &&
            star.y >= viewY - halfHeight &&
            star.y <= viewY + halfHeight
          ) {
            visible.push(star);
          }
        }
      }
    }
  }

  return visible;
}

/**
 * Find stars near a position
 * @param stars - Star storage map
 * @param realm - Current realm
 * @param x - Position X
 * @param y - Position Y
 * @param radius - Search radius
 * @returns Array of nearby stars
 */
export function getStarsNearPosition(
  stars: Map<string, Star[]>,
  realm: string,
  x: number,
  y: number,
  radius: number
): Star[] {
  const nearby: Star[] = [];
  const radiusSq = radius * radius;

  // Calculate cells to check
  const minCx = Math.floor((x - radius) / STAR_CELL_SIZE);
  const maxCx = Math.floor((x + radius) / STAR_CELL_SIZE);
  const minCy = Math.floor((y - radius) / STAR_CELL_SIZE);
  const maxCy = Math.floor((y + radius) / STAR_CELL_SIZE);

  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const cellKey = `${realm}:${cx},${cy}`;
      const cellStars = stars.get(cellKey);
      
      if (cellStars) {
        for (const star of cellStars) {
          const dx = star.x - x;
          const dy = star.y - y;
          if (dx * dx + dy * dy <= radiusSq) {
            nearby.push(star);
          }
        }
      }
    }
  }

  return nearby;
}

// ============================================================================
// Star Field Manager
// ============================================================================

/**
 * Create initial star field state
 */
export function createStarFieldState(): StarFieldState {
  return {
    stars: new Map(),
    constellations: new Map(),
  };
}

/**
 * Prune stars from cells that are too far from current position
 * Helps manage memory for large worlds
 * 
 * @param stars - Star storage map
 * @param realm - Current realm
 * @param x - Current position X
 * @param y - Current position Y
 * @param maxCells - Maximum cells to keep from current position
 */
export function pruneDistantStars(
  stars: Map<string, Star[]>,
  realm: string,
  x: number,
  y: number,
  maxCells: number = 10
): void {
  const cx = Math.floor(x / STAR_CELL_SIZE);
  const cy = Math.floor(y / STAR_CELL_SIZE);

  for (const key of stars.keys()) {
    // Only prune stars from current realm
    if (!key.startsWith(`${realm}:`)) continue;

    // Parse cell coordinates from key
    const match = key.match(/^[^:]+:(-?\d+),(-?\d+)$/);
    if (!match) continue;

    const keyCx = parseInt(match[1], 10);
    const keyCy = parseInt(match[2], 10);

    // Remove if too far from current position
    if (Math.abs(keyCx - cx) > maxCells || Math.abs(keyCy - cy) > maxCells) {
      stars.delete(key);
    }
  }
}

// ============================================================================
// Constellation Detection (Future Feature)
// ============================================================================

/**
 * Detect constellation patterns in lit stars
 * This is a placeholder for future constellation discovery feature
 */
export function detectConstellations(
  _stars: Map<string, Star[]>,
  _realm: string
): Map<string, string[]> {
  // TODO: Implement constellation pattern matching
  // This would detect when players have lit stars that form known patterns
  return new Map();
}
