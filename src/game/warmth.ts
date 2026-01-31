/**
 * Warmth system - manages light radius based on proximity to others
 * Ported from legacy_3/src/game/warmth.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const LIGHT_MIN_RADIUS = 30;
export const LIGHT_MAX_RADIUS = 180;
export const COLD_ONSET_DELAY = 8000; // ms before cold starts
export const CROWDING_DISTANCE = 50;  // Too close = awkward, no warmth
export const OPTIMAL_DISTANCE = 120;  // Sweet spot for maximum warmth
export const MAX_CONNECTION_DIST = 300;
export const WARMTH_LINGER_FRAMES = 900;  // Frames warmth persists after leaving
export const WARMTH_GRANT_FLOOR = 450;    // Minimum warmth when entering proximity

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WarmthState {
  warmthLinger: number;
  wasNearWarmth: boolean;
  coldTimer: number;
  radius: number;
}

export interface NearbyEntity {
  x: number;
  y: number;
  id: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WARMTH CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate warmth strength from nearby entities
 * Uses optimal distance curve - too close or too far reduces warmth
 */
export const calculateWarmthStrength = (
  playerX: number,
  playerY: number,
  entities: NearbyEntity[]
): number => {
  let totalStrength = 0;
  
  entities.forEach(entity => {
    const dist = Math.hypot(playerX - entity.x, playerY - entity.y);
    
    // Only count entities in the warmth zone (not too close, not too far)
    if (dist > CROWDING_DISTANCE && dist < MAX_CONNECTION_DIST) {
      let strength = 0;
      
      if (dist <= OPTIMAL_DISTANCE) {
        // Ramping up to optimal - warmth increases as you approach sweet spot
        strength = (dist - CROWDING_DISTANCE) / (OPTIMAL_DISTANCE - CROWDING_DISTANCE);
      } else {
        // Ramping down from optimal - warmth decreases as you move away
        strength = 1 - ((dist - OPTIMAL_DISTANCE) / (MAX_CONNECTION_DIST - OPTIMAL_DISTANCE));
      }
      
      totalStrength += strength;
    }
  });
  
  return totalStrength;
};

/**
 * Update warmth linger effect
 * Warmth persists for a while after leaving proximity
 */
export const updateWarmthLinger = (
  state: WarmthState,
  accumulatedWarmth: number
): void => {
  const isNearWarmth = accumulatedWarmth > 0.1;
  
  if (isNearWarmth) {
    // Just entered warmth zone - grant minimum floor
    if (!state.wasNearWarmth) {
      state.warmthLinger = Math.max(state.warmthLinger, WARMTH_GRANT_FLOOR);
    }
    // Build up linger while near warmth
    state.warmthLinger = Math.min(WARMTH_LINGER_FRAMES, state.warmthLinger + 5);
  } else if (state.warmthLinger > 0) {
    // Decay linger when away from warmth
    state.warmthLinger--;
  }
  
  state.wasNearWarmth = isNearWarmth;
};

/**
 * Update player light radius based on warmth
 */
export const updateRadius = (
  state: WarmthState,
  warmthStrength: number,
  hasMoved: boolean,
  speed: number
): void => {
  const isNearWarmth = warmthStrength > 0.1;
  
  // Soft cap using exponential function to prevent overpowering
  const softCap = 1 - Math.exp(-0.5 * warmthStrength);
  const effectiveWarmth = isNearWarmth ? softCap : (state.warmthLinger > 0 ? 0.5 : 0);
  
  if (effectiveWarmth > 0) {
    // Grow radius when warm
    const growth = Math.min(0.25, effectiveWarmth * 0.25);
    state.radius = Math.min(LIGHT_MAX_RADIUS, state.radius + growth);
  } else if (state.coldTimer > (COLD_ONSET_DELAY / 16)) {
    // Shrink radius when cold (but maintain minimum floor)
    const floor = LIGHT_MAX_RADIUS * 0.2;
    state.radius = Math.max(floor, state.radius - 0.1);
  } else {
    // Slow shrink when neutral
    state.radius = Math.max(LIGHT_MIN_RADIUS, state.radius - 0.05);
  }
};

/**
 * Update cold timer (increases when stationary and isolated)
 */
export const updateColdTimer = (
  state: WarmthState,
  hasMoved: boolean,
  speed: number
): void => {
  if (!hasMoved || speed < 0.1) {
    // Increase cold when stationary
    state.coldTimer++;
  } else {
    // Reset cold when moving
    state.coldTimer = 0;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// WARMTH MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages warmth/cold state for easy integration
 */
export class WarmthManager {
  state: WarmthState;
  
  constructor(initialRadius: number = LIGHT_MIN_RADIUS) {
    this.state = {
      warmthLinger: 0,
      wasNearWarmth: false,
      coldTimer: 0,
      radius: initialRadius
    };
  }
  
  /**
   * Update all warmth calculations
   */
  update(
    playerX: number,
    playerY: number,
    nearbyEntities: NearbyEntity[],
    hasMoved: boolean,
    speed: number
  ): void {
    // Calculate warmth from nearby entities
    const warmthStrength = calculateWarmthStrength(playerX, playerY, nearbyEntities);
    
    // Update warmth linger
    updateWarmthLinger(this.state, warmthStrength);
    
    // Update cold timer
    updateColdTimer(this.state, hasMoved, speed);
    
    // Update radius
    updateRadius(this.state, warmthStrength, hasMoved, speed);
  }
  
  /**
   * Get current light radius
   */
  getRadius(): number {
    return this.state.radius;
  }
  
  /**
   * Get cold timer for vignette rendering
   */
  getColdTimer(): number {
    return this.state.coldTimer;
  }
  
  /**
   * Get warmth intensity (0-1) for glow effects
   */
  getWarmthIntensity(): number {
    return this.state.warmthLinger / WARMTH_LINGER_FRAMES;
  }
  
  /**
   * Check if player is currently cold
   */
  isCold(): boolean {
    return this.state.coldTimer > (COLD_ONSET_DELAY / 16);
  }
  
  /**
   * Check if player is currently warm
   */
  isWarm(): boolean {
    return this.state.wasNearWarmth || this.state.warmthLinger > 0;
  }
}

/**
 * Create initial warmth state
 */
export const createWarmthState = (initialRadius: number = LIGHT_MIN_RADIUS): WarmthState => ({
  warmthLinger: 0,
  wasNearWarmth: false,
  coldTimer: 0,
  radius: initialRadius
});
