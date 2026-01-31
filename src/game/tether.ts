/**
 * Tether system - links players together with elastic connection
 * Ported from legacy_3/src/game/tether.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const TETHER_MAX_DIST = 500;
export const TETHER_STRENGTH = 0.02;
export const TETHER_SNAP_TIME = 180; // Frames before snap

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TetherState {
  tetherHostId: string | null;
  tetherStressTimer: number;
  knownTetheredGuests: Set<string>;
}

export interface TetherHost {
  x: number;
  y: number;
  id: string;
}

export interface TetherUpdateResult {
  snapped: boolean;
  forceX: number;
  forceY: number;
  snapPositionX?: number;
  snapPositionY?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TETHER LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update tether state and calculate elastic forces
 */
export const updateTether = (
  state: TetherState,
  playerX: number,
  playerY: number,
  host: TetherHost | null
): TetherUpdateResult => {
  const result: TetherUpdateResult = {
    snapped: false,
    forceX: 0,
    forceY: 0
  };
  
  if (!host) return result;
  
  const dx = host.x - playerX;
  const dy = host.y - playerY;
  const dist = Math.hypot(dx, dy);
  
  if (dist > TETHER_MAX_DIST) {
    // Tether is stressed
    state.tetherStressTimer++;
    
    if (state.tetherStressTimer > TETHER_SNAP_TIME) {
      // Tether snaps!
      state.tetherHostId = null;
      result.snapped = true;
      result.snapPositionX = playerX + dx / 2;
      result.snapPositionY = playerY + dy / 2;
    } else {
      // Apply elastic force pulling toward host
      const force = (dist - TETHER_MAX_DIST) * TETHER_STRENGTH;
      const angle = Math.atan2(dy, dx);
      result.forceX = Math.cos(angle) * force;
      result.forceY = Math.sin(angle) * force;
    }
  } else {
    // Tether is relaxed, reduce stress
    state.tetherStressTimer = Math.max(0, state.tetherStressTimer - 1);
  }
  
  return result;
};

/**
 * Check if a tethered guest has arrived nearby
 */
export const checkTetheredGuestArrival = (
  state: TetherState,
  userId: string,
  playerX: number,
  playerY: number,
  guests: Array<{ id: string; x: number; y: number; tetherHost: string | null }>
): string | null => {
  for (const guest of guests) {
    if (guest.tetherHost === userId) {
      const dist = Math.hypot(playerX - guest.x, playerY - guest.y);
      
      if (dist < 800 && !state.knownTetheredGuests.has(guest.id)) {
        state.knownTetheredGuests.add(guest.id);
        return guest.id;
      }
    }
  }
  
  return null;
};

/**
 * Generate a shareable tether invitation URL
 */
export const getTetherUrl = (userId: string, baseUrl: string): string => {
  return `${baseUrl}?tether=${userId}`;
};

/**
 * Parse tether host from URL
 */
export const parseTetherFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('tether');
};

// ═══════════════════════════════════════════════════════════════════════════════
// TETHER MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages tether state for easy integration
 */
export class TetherManager {
  state: TetherState;
  
  constructor(initialHostId: string | null = null) {
    this.state = {
      tetherHostId: initialHostId ?? parseTetherFromUrl(),
      tetherStressTimer: 0,
      knownTetheredGuests: new Set()
    };
  }
  
  /**
   * Update tether and get forces to apply
   */
  update(
    playerX: number,
    playerY: number,
    host: TetherHost | null
  ): TetherUpdateResult {
    return updateTether(this.state, playerX, playerY, host);
  }
  
  /**
   * Set tether host
   */
  setHost(hostId: string): void {
    this.state.tetherHostId = hostId;
    this.state.tetherStressTimer = 0;
  }
  
  /**
   * Clear tether
   */
  clearTether(): void {
    this.state.tetherHostId = null;
    this.state.tetherStressTimer = 0;
  }
  
  /**
   * Get current host ID
   */
  getHostId(): string | null {
    return this.state.tetherHostId;
  }
  
  /**
   * Check if tethered
   */
  isTethered(): boolean {
    return this.state.tetherHostId !== null;
  }
  
  /**
   * Get stress level (0-1)
   */
  getStressLevel(): number {
    return Math.min(1, this.state.tetherStressTimer / TETHER_SNAP_TIME);
  }
  
  /**
   * Generate invite URL
   */
  getInviteUrl(userId: string): string {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin + window.location.pathname
      : '';
    return getTetherUrl(userId, baseUrl);
  }
}

/**
 * Create initial tether state
 */
export const createTetherState = (hostId: string | null = null): TetherState => ({
  tetherHostId: hostId,
  tetherStressTimer: 0,
  knownTetheredGuests: new Set()
});
