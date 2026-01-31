/**
 * Beacon system - manages collaborative light sources
 * Ported from legacy_3/src/game/beacons.ts
 */

import type { Beacon, BeaconState } from '@/rendering/entities';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const BEACON_ACTIVATION_FRAMES = 4;
export const WORLD_SIZE = 8000;

// Default beacon positions
export const BEACONS: Beacon[] = [
  { id: 'b1', x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, icon: '🌟', type: 'sanctuary' },
  { id: 'b2', x: WORLD_SIZE / 2 - 1000, y: WORLD_SIZE / 2 - 1000, icon: '🔮', type: 'wisdom' },
  { id: 'b3', x: WORLD_SIZE / 2 + 1000, y: WORLD_SIZE / 2 + 1000, icon: '✨', type: 'hope' },
  { id: 'b4', x: WORLD_SIZE / 2 + 1000, y: WORLD_SIZE / 2 - 1000, icon: '⚡', type: 'courage' },
  { id: 'b5', x: WORLD_SIZE / 2 - 1000, y: WORLD_SIZE / 2 + 1000, icon: '💫', type: 'unity' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BeaconChargeResult {
  beaconId: string;
  wasLit: boolean;
  justLit: boolean;
  x: number;
  y: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEACON STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize beacon states for all beacons
 */
export const initializeBeaconStates = (
  beacons: Beacon[] = BEACONS
): Record<string, BeaconState> => {
  return beacons.reduce((acc, beacon) => {
    acc[beacon.id] = {
      charge: 0,
      active: false,
      activeTimer: 0
    };
    return acc;
  }, {} as Record<string, BeaconState>);
};

/**
 * Update beacon charges based on nearby players
 * Multiple players charge faster!
 */
export const updateBeaconCharges = (
  beaconStates: Record<string, BeaconState>,
  playerX: number,
  playerY: number,
  otherPlayers: Array<{ x: number; y: number }>,
  beacons: Beacon[] = BEACONS
): BeaconChargeResult[] => {
  const results: BeaconChargeResult[] = [];
  
  beacons.forEach(beacon => {
    let chargePower = 0;
    
    // Check if local player is near beacon
    const dxPlayer = playerX - beacon.x;
    const dyPlayer = playerY - beacon.y;
    if (dxPlayer * dxPlayer + dyPlayer * dyPlayer < 250 * 250) {
      chargePower += 1;
    }
    
    // Check other players
    otherPlayers.forEach(player => {
      const dx = player.x - beacon.x;
      const dy = player.y - beacon.y;
      
      // Quick bounds check before distance calc
      if (Math.abs(dx) > 250 || Math.abs(dy) > 250) return;
      
      if (dx * dx + dy * dy < 250 * 250) {
        chargePower += 1;
      }
    });
    
    const beaconState = beaconStates[beacon.id];
    const wasActive = beaconState.active;
    
    if (chargePower > 0) {
      // Charge rate scales with number of players
      const rate = chargePower * 4;
      beaconState.charge = Math.min(100, beaconState.charge + rate);
      
      if (beaconState.charge >= 100) {
        beaconState.activeTimer++;
        
        // Activate after sustained full charge
        if (beaconState.activeTimer > BEACON_ACTIVATION_FRAMES && !beaconState.active) {
          beaconState.active = true;
          
          results.push({
            beaconId: beacon.id,
            wasLit: false,
            justLit: true,
            x: beacon.x,
            y: beacon.y
          });
        }
      }
    } else {
      // No players nearby - decay charge
      beaconState.activeTimer = 0;
      beaconState.charge = Math.max(0, beaconState.charge - 2);
      
      // Deactivate if charge drops too low
      if (beaconState.charge < 90) {
        beaconState.active = false;
      }
    }
  });
  
  return results;
};

/**
 * Get warmth bonus from nearby active beacons
 */
export const getBeaconWarmth = (
  beaconStates: Record<string, BeaconState>,
  playerX: number,
  playerY: number,
  beacons: Beacon[] = BEACONS
): number => {
  let totalWarmth = 0;
  
  beacons.forEach(beacon => {
    const beaconState = beaconStates[beacon.id];
    
    if (beaconState?.active) {
      const dist = Math.hypot(playerX - beacon.x, playerY - beacon.y);
      if (dist < 400) {
        totalWarmth += 1.5;
      }
    }
  });
  
  return totalWarmth;
};

/**
 * Count total lit beacons
 */
export const countLitBeacons = (beaconStates: Record<string, BeaconState>): number => {
  return Object.values(beaconStates).filter(state => state.active).length;
};

/**
 * Get the nearest beacon to a position
 */
export const getNearestBeacon = (
  x: number,
  y: number,
  beacons: Beacon[] = BEACONS
): Beacon => {
  let nearest = beacons[0];
  let minDist = Infinity;
  
  beacons.forEach(beacon => {
    const dist = Math.hypot(x - beacon.x, y - beacon.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = beacon;
    }
  });
  
  return nearest;
};

/**
 * Get distance to nearest beacon
 */
export const getDistanceToNearestBeacon = (
  x: number,
  y: number,
  beacons: Beacon[] = BEACONS
): number => {
  const nearest = getNearestBeacon(x, y, beacons);
  return Math.hypot(x - nearest.x, y - nearest.y);
};

// ═══════════════════════════════════════════════════════════════════════════════
// BEACON MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages beacon state for easy integration
 */
export class BeaconManager {
  beacons: Beacon[];
  states: Record<string, BeaconState>;
  
  constructor(beacons: Beacon[] = BEACONS) {
    this.beacons = beacons;
    this.states = initializeBeaconStates(beacons);
  }
  
  /**
   * Update all beacons and return any newly lit
   */
  update(
    playerX: number,
    playerY: number,
    otherPlayers: Array<{ x: number; y: number }>
  ): BeaconChargeResult[] {
    return updateBeaconCharges(this.states, playerX, playerY, otherPlayers, this.beacons);
  }
  
  /**
   * Get warmth from nearby active beacons
   */
  getWarmth(playerX: number, playerY: number): number {
    return getBeaconWarmth(this.states, playerX, playerY, this.beacons);
  }
  
  /**
   * Get total lit beacons
   */
  getLitCount(): number {
    return countLitBeacons(this.states);
  }
  
  /**
   * Get nearest beacon
   */
  getNearest(x: number, y: number): Beacon {
    return getNearestBeacon(x, y, this.beacons);
  }
  
  /**
   * Get all beacon states for rendering
   */
  getStates(): Record<string, BeaconState> {
    return this.states;
  }
  
  /**
   * Get all beacons
   */
  getBeacons(): Beacon[] {
    return this.beacons;
  }
  
  /**
   * Check if a specific beacon is lit
   */
  isLit(beaconId: string): boolean {
    return this.states[beaconId]?.active ?? false;
  }
  
  /**
   * Check if all beacons are lit
   */
  allLit(): boolean {
    return this.getLitCount() === this.beacons.length;
  }
}
