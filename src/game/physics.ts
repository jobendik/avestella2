/**
 * Physics system for player movement
 * Ported from legacy_3/src/game/physics.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const WORLD_SIZE = 8000;
export const PLAYER_ACCELERATION = 0.002;
export const PLAYER_FRICTION = 0.92;
export const BOUNDARY_PADDING = 50;
export const BOUNDARY_FORCE = 0.1;
export const BOUNDARY_TARGET_DISTANCE = 500;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number | null;
  targetY: number | null;
  isInteracting: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOVEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply acceleration toward target based on input
 */
export const applyMovement = (
  state: PhysicsState,
  centerX: number,
  centerY: number
): void => {
  if (!state.isInteracting || state.targetX === null || state.targetY === null) {
    return;
  }

  const dx = state.targetX - centerX;
  const dy = state.targetY - centerY;
  const angle = Math.atan2(dy, dx);
  const dist = Math.min(Math.hypot(dx, dy), 100);
  
  const accel = dist * PLAYER_ACCELERATION;
  state.vx += Math.cos(angle) * accel;
  state.vy += Math.sin(angle) * accel;
};

/**
 * Apply friction to slow down movement
 */
export const applyFriction = (state: PhysicsState): void => {
  state.vx *= PLAYER_FRICTION;
  state.vy *= PLAYER_FRICTION;
};

/**
 * Update position based on velocity
 */
export const updatePosition = (state: PhysicsState): void => {
  state.x = Math.max(0, Math.min(WORLD_SIZE, state.x + state.vx));
  state.y = Math.max(0, Math.min(WORLD_SIZE, state.y + state.vy));
};

/**
 * Apply forces to push player away from world boundaries
 */
export const applyBoundaryForces = (state: PhysicsState): void => {
  // Left boundary
  if (state.x < BOUNDARY_PADDING) {
    state.vx += BOUNDARY_FORCE;
    if (state.targetX !== null) {
      state.x = BOUNDARY_PADDING;
    }
  }
  
  // Right boundary
  if (state.x > WORLD_SIZE - BOUNDARY_PADDING) {
    state.vx -= BOUNDARY_FORCE;
    if (state.targetX !== null) {
      state.x = WORLD_SIZE - BOUNDARY_PADDING;
    }
  }
  
  // Top boundary
  if (state.y < BOUNDARY_PADDING) {
    state.vy += BOUNDARY_FORCE;
    if (state.targetY !== null) {
      state.y = BOUNDARY_PADDING;
    }
  }
  
  // Bottom boundary
  if (state.y > WORLD_SIZE - BOUNDARY_PADDING) {
    state.vy -= BOUNDARY_FORCE;
    if (state.targetY !== null) {
      state.y = WORLD_SIZE - BOUNDARY_PADDING;
    }
  }
};

/**
 * Calculate current speed from velocity
 */
export const getSpeed = (vx: number, vy: number): number => {
  return Math.hypot(vx, vy);
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHYSICS MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class PhysicsManager {
  private state: PhysicsState;

  constructor(startX: number = WORLD_SIZE / 2, startY: number = WORLD_SIZE / 2) {
    this.state = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      targetX: null,
      targetY: null,
      isInteracting: false
    };
  }

  /**
   * Get current physics state
   */
  getState(): PhysicsState {
    return { ...this.state };
  }

  /**
   * Set interaction target
   */
  setTarget(x: number, y: number): void {
    this.state.targetX = x;
    this.state.targetY = y;
    this.state.isInteracting = true;
  }

  /**
   * Clear interaction target
   */
  clearTarget(): void {
    this.state.targetX = null;
    this.state.targetY = null;
    this.state.isInteracting = false;
  }

  /**
   * Update physics for one frame
   */
  update(centerX: number, centerY: number): void {
    applyMovement(this.state, centerX, centerY);
    applyFriction(this.state);
    updatePosition(this.state);
    applyBoundaryForces(this.state);
  }

  /**
   * Get current position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.state.x, y: this.state.y };
  }

  /**
   * Get current velocity
   */
  getVelocity(): { vx: number; vy: number } {
    return { vx: this.state.vx, vy: this.state.vy };
  }

  /**
   * Get current speed
   */
  getSpeed(): number {
    return getSpeed(this.state.vx, this.state.vy);
  }

  /**
   * Check if player has moved
   */
  hasMoved(): boolean {
    return this.getSpeed() > 0.1;
  }

  /**
   * Apply external force (e.g., from tether)
   */
  applyForce(fx: number, fy: number): void {
    this.state.vx += fx;
    this.state.vy += fy;
  }

  /**
   * Set position directly (e.g., for teleportation)
   */
  setPosition(x: number, y: number): void {
    this.state.x = Math.max(0, Math.min(WORLD_SIZE, x));
    this.state.y = Math.max(0, Math.min(WORLD_SIZE, y));
  }
}
