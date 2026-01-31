/**
 * Bond system - manages social connections between entities
 * Ported from legacy_3/src/game/bonds.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const BOND_GROW_RATE = 0.002;
export const BOND_DECAY_RATE = 0.0005;
export const MAX_CONNECTION_DIST = 300;
export const CROWDING_DISTANCE = 50;
export const OPTIMAL_DISTANCE = 120;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BondState {
  bonds: Map<string, number>;
  soulsMet: Set<string>;
  constellationBonus: number;
}

export interface NearbyEntity {
  id: string;
  x: number;
  y: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOND LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update bonds with nearby entities
 * Bonds grow when near, decay when far
 */
export const updateBonds = (
  state: BondState,
  playerX: number,
  playerY: number,
  entities: NearbyEntity[]
): NearbyEntity[] => {
  const nearby: NearbyEntity[] = [];
  
  // Find entities within connection distance
  entities.forEach(entity => {
    const dist = Math.hypot(playerX - entity.x, playerY - entity.y);
    
    if (dist < MAX_CONNECTION_DIST) {
      nearby.push(entity);
    }
  });
  
  // Grow bonds with nearby entities
  nearby.forEach(entity => {
    const currentBond = state.bonds.get(entity.id) || 0;
    const newBond = Math.min(1, currentBond + BOND_GROW_RATE);
    state.bonds.set(entity.id, newBond);
  });
  
  // Decay bonds with distant entities
  const nearbyIds = new Set(nearby.map(e => e.id));
  state.bonds.forEach((strength, id) => {
    if (!nearbyIds.has(id)) {
      const newStrength = Math.max(0, strength - BOND_DECAY_RATE);
      if (newStrength > 0) {
        state.bonds.set(id, newStrength);
      } else {
        state.bonds.delete(id);
      }
    }
  });
  
  return nearby;
};

/**
 * Track new souls met
 * Returns list of newly met soul IDs
 */
export const trackSoulsMet = (
  state: BondState,
  entities: NearbyEntity[]
): string[] => {
  const newSouls: string[] = [];
  
  entities.forEach(entity => {
    if (!state.soulsMet.has(entity.id)) {
      state.soulsMet.add(entity.id);
      newSouls.push(entity.id);
    }
  });
  
  return newSouls;
};

/**
 * Update constellation bonus based on group size
 * Bonus grows when 2+ nearby, decays otherwise
 */
export const updateConstellationBonus = (
  state: BondState,
  nearbyCount: number
): void => {
  if (nearbyCount >= 2) {
    state.constellationBonus = Math.min(30, state.constellationBonus + 0.5);
  } else {
    state.constellationBonus = Math.max(0, state.constellationBonus - 0.2);
  }
};

/**
 * Get bond strength with a specific entity
 */
export const getBondStrength = (
  state: BondState,
  entityId: string
): number => {
  return state.bonds.get(entityId) || 0;
};

/**
 * Get total number of active bonds
 */
export const getTotalBonds = (state: BondState): number => {
  return state.bonds.size;
};

/**
 * Get total souls ever met
 */
export const getTotalSoulsMet = (state: BondState): number => {
  return state.soulsMet.size;
};

/**
 * Get strongest bond
 */
export const getStrongestBond = (state: BondState): { id: string; strength: number } | null => {
  let strongest: { id: string; strength: number } | null = null;
  
  state.bonds.forEach((strength, id) => {
    if (!strongest || strength > strongest.strength) {
      strongest = { id, strength };
    }
  });
  
  return strongest;
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOND MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages bond state for easy integration
 */
export class BondManager {
  state: BondState;
  
  constructor() {
    this.state = {
      bonds: new Map(),
      soulsMet: new Set(),
      constellationBonus: 0
    };
  }
  
  /**
   * Update all bonds and track new souls
   */
  update(
    playerX: number,
    playerY: number,
    entities: NearbyEntity[]
  ): { nearby: NearbyEntity[]; newSouls: string[] } {
    const nearby = updateBonds(this.state, playerX, playerY, entities);
    const newSouls = trackSoulsMet(this.state, nearby);
    updateConstellationBonus(this.state, nearby.length);
    
    return { nearby, newSouls };
  }
  
  /**
   * Get bond strength with entity
   */
  getBondStrength(entityId: string): number {
    return getBondStrength(this.state, entityId);
  }
  
  /**
   * Get constellation bonus for rendering
   */
  getConstellationBonus(): number {
    return this.state.constellationBonus;
  }
  
  /**
   * Get total souls met
   */
  getSoulsMet(): number {
    return getTotalSoulsMet(this.state);
  }
  
  /**
   * Get total active bonds
   */
  getBondCount(): number {
    return getTotalBonds(this.state);
  }
  
  /**
   * Get all bonds for rendering
   */
  getAllBonds(): Map<string, number> {
    return this.state.bonds;
  }
  
  /**
   * Check if player has met a specific soul
   */
  hasMetSoul(entityId: string): boolean {
    return this.state.soulsMet.has(entityId);
  }
}

/**
 * Create initial bond state
 */
export const createBondState = (): BondState => ({
  bonds: new Map(),
  soulsMet: new Set(),
  constellationBonus: 0
});
