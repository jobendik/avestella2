/**
 * Realm Configuration System
 * Ported from LEGACY/src/core/config.ts (REALMS, SCALES)
 * 
 * Features:
 * - 9 unique realms with distinct visual themes
 * - Per-realm physics modifiers (drift, friction, gravity)
 * - Particle effect multipliers
 * - Special realm modes (tag, zen, confetti)
 * - Musical scales for audio system
 * - Unlock progression
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type RealmId = 
  | 'genesis' 
  | 'nebula' 
  | 'void' 
  | 'starforge' 
  | 'sanctuary' 
  | 'abyss' 
  | 'crystal' 
  | 'celestial' 
  | 'tagarena';

export interface RealmPhysics {
  /** Movement speed multiplier (1.0 = normal) */
  driftMultiplier: number;
  /** Friction/deceleration multiplier (1.0 = normal, <1 = slippery) */
  friction: number;
  /** Optional gravity vector */
  gravity?: { x: number; y: number };
  /** Particle emission multiplier */
  particleMultiplier?: number;
}

export interface RealmData {
  /** Display name */
  name: string;
  /** Emoji icon */
  icon: string;
  /** Background color [R, G, B] */
  bg: [number, number, number];
  /** Nebula gradient color 1 [R, G, B] */
  n1: [number, number, number];
  /** Nebula gradient color 2 [R, G, B] */
  n2: [number, number, number];
  /** Level required to unlock */
  unlock: number;
  /** Short description */
  desc: string;
  /** Base drone frequency for audio */
  drone: number;
  /** Physics configuration */
  physics: RealmPhysics;
  /** Special realm mode */
  special?: 'tag' | 'zen' | 'confetti';
}

// ============================================================================
// Musical Scales (for audio system)
// ============================================================================

/** 
 * Pentatonic-inspired scales for each realm
 * Frequencies in Hz for melodic sound generation
 */
export const REALM_SCALES: Record<RealmId, number[]> = {
  genesis: [261.63, 293.66, 329.63, 392, 440, 523.25],       // C major pentatonic
  nebula: [277.18, 311.13, 369.99, 415.3, 466.16, 554.37],   // C# major pentatonic
  void: [130.81, 146.83, 164.81, 196, 220, 261.63],          // C2 major (octave lower, deeper)
  starforge: [293.66, 329.63, 369.99, 440, 493.88, 587.33],  // D major pentatonic
  sanctuary: [246.94, 293.66, 329.63, 392, 440, 493.88],     // B minor pentatonic (calming)
  abyss: [110, 130.81, 146.83, 174.61, 196, 220],            // A1 minor (lowest, haunting)
  crystal: [329.63, 369.99, 415.3, 493.88, 554.37, 622.25],  // E major (crystalline, bright)
  celestial: [440, 493.88, 554.37, 659.25, 739.99, 880],     // A major (highest, triumphant)
  tagarena: [329.63, 392, 440, 523.25, 587.33, 659.25],      // E major energetic
};

// ============================================================================
// Realm Definitions
// ============================================================================

export const REALMS: Record<RealmId, RealmData> = {
  genesis: {
    name: 'Genesis',
    icon: '🌌',
    bg: [5, 5, 12],
    n1: [78, 205, 196],     // Teal
    n2: [255, 107, 157],    // Pink
    unlock: 1,
    desc: 'The birthplace',
    drone: 55,
    physics: {
      driftMultiplier: 1.0,
      friction: 1.0,
    },
  },

  nebula: {
    name: 'Nebula Gardens',
    icon: '🌸',
    bg: [15, 5, 20],
    n1: [255, 107, 157],    // Pink
    n2: [168, 85, 247],     // Purple
    unlock: 1,
    desc: 'Where echoes bloom',
    drone: 62,
    physics: {
      driftMultiplier: 0.8,
      friction: 0.95,
      particleMultiplier: 1.5,
    },
    special: 'confetti',    // Messages explode with particles
  },

  void: {
    name: 'The Void',
    icon: '🌑',
    bg: [2, 2, 5],
    n1: [30, 30, 60],       // Dark blue
    n2: [20, 20, 40],       // Darker blue
    unlock: 1,
    desc: 'Embrace darkness',
    drone: 41,
    physics: {
      driftMultiplier: 0.6,
      friction: 0.88,
      gravity: { x: 0, y: 0.05 },   // Slight downward pull
    },
  },

  starforge: {
    name: 'Starforge',
    icon: '🔥',
    bg: [15, 8, 5],
    n1: [255, 140, 0],      // Orange
    n2: [255, 69, 0],       // Red-orange
    unlock: 5,
    desc: 'Born of fire',
    drone: 73,
    physics: {
      driftMultiplier: 1.3,
      friction: 1.1,
      particleMultiplier: 2.0,
    },
  },

  sanctuary: {
    name: 'Sanctuary',
    icon: '🏛️',
    bg: [8, 12, 18],
    n1: [100, 149, 237],    // Cornflower blue
    n2: [135, 206, 250],    // Light sky blue
    unlock: 10,
    desc: 'A haven of peace',
    drone: 49,
    physics: {
      driftMultiplier: 0.7,
      friction: 0.92,
    },
    special: 'zen',         // Falling leaves, calming effects
  },

  abyss: {
    name: 'The Abyss',
    icon: '🌊',
    bg: [3, 8, 15],
    n1: [0, 100, 150],      // Deep ocean blue
    n2: [0, 50, 100],       // Darker ocean
    unlock: 15,
    desc: 'Depths unknown',
    drone: 36,
    physics: {
      driftMultiplier: 0.5,
      friction: 0.85,
      gravity: { x: 0, y: 0.1 },    // Stronger sinking feeling
    },
  },

  crystal: {
    name: 'Crystal Caverns',
    icon: '💎',
    bg: [12, 8, 18],
    n1: [200, 150, 255],    // Light purple
    n2: [150, 100, 200],    // Medium purple
    unlock: 20,
    desc: 'Prismatic wonder',
    drone: 82,
    physics: {
      driftMultiplier: 1.1,
      friction: 1.05,
      particleMultiplier: 1.8,
    },
  },

  celestial: {
    name: 'Celestial Throne',
    icon: '👑',
    bg: [15, 12, 5],
    n1: [255, 215, 0],      // Gold
    n2: [255, 180, 0],      // Darker gold
    unlock: 25,
    desc: 'For the ascended',
    drone: 110,
    physics: {
      driftMultiplier: 1.4,
      friction: 1.0,
      particleMultiplier: 2.5,
    },
  },

  tagarena: {
    name: 'Tag Arena',
    icon: '⚡',
    bg: [8, 5, 15],
    n1: [255, 68, 102],     // Coral red
    n2: [255, 215, 0],      // Gold
    unlock: 3,
    desc: 'Run! Avoid the IT player',
    drone: 80,
    physics: {
      driftMultiplier: 1.8,   // Much faster movement
      friction: 0.95,
    },
    special: 'tag',           // Tag game mode
  },
};

// ============================================================================
// Realm Utilities
// ============================================================================

/**
 * Get all unlocked realms for a given level
 * @param level - Player level
 * @returns Array of unlocked realm IDs
 */
export function getUnlockedRealms(level: number): RealmId[] {
  return (Object.keys(REALMS) as RealmId[]).filter(
    (realmId) => REALMS[realmId].unlock <= level
  );
}

/**
 * Check if a realm is unlocked at a given level
 * @param realmId - Realm to check
 * @param level - Player level
 * @returns Whether the realm is unlocked
 */
export function isRealmUnlocked(realmId: RealmId, level: number): boolean {
  return REALMS[realmId].unlock <= level;
}

/**
 * Get realm data with safe fallback to genesis
 * @param realmId - Realm ID (possibly invalid)
 * @returns Realm data
 */
export function getRealm(realmId: string): RealmData {
  if (realmId in REALMS) {
    return REALMS[realmId as RealmId];
  }
  return REALMS.genesis;
}

/**
 * Get realm physics with defaults
 * @param realmId - Realm ID
 * @returns Complete physics config with defaults filled in
 */
export function getRealmPhysics(realmId: string): Required<RealmPhysics> {
  const realm = getRealm(realmId);
  return {
    driftMultiplier: realm.physics.driftMultiplier,
    friction: realm.physics.friction,
    gravity: realm.physics.gravity ?? { x: 0, y: 0 },
    particleMultiplier: realm.physics.particleMultiplier ?? 1.0,
  };
}

/**
 * Get background color as CSS rgb string
 * @param realmId - Realm ID
 * @returns CSS color string
 */
export function getRealmBackground(realmId: string): string {
  const realm = getRealm(realmId);
  return `rgb(${realm.bg[0]}, ${realm.bg[1]}, ${realm.bg[2]})`;
}

/**
 * Get nebula gradient colors as CSS strings
 * @param realmId - Realm ID
 * @returns Object with color1 and color2 CSS strings
 */
export function getRealmNebulaColors(realmId: string): { color1: string; color2: string } {
  const realm = getRealm(realmId);
  return {
    color1: `rgb(${realm.n1[0]}, ${realm.n1[1]}, ${realm.n1[2]})`,
    color2: `rgb(${realm.n2[0]}, ${realm.n2[1]}, ${realm.n2[2]})`,
  };
}

/**
 * Check if realm has a special game mode
 * @param realmId - Realm ID
 * @returns The special mode or undefined
 */
export function getRealmSpecialMode(realmId: string): 'tag' | 'zen' | 'confetti' | undefined {
  return getRealm(realmId).special;
}

/**
 * Get the musical scale for a realm
 * @param realmId - Realm ID
 * @returns Array of frequencies in Hz
 */
export function getRealmScale(realmId: string): number[] {
  if (realmId in REALM_SCALES) {
    return REALM_SCALES[realmId as RealmId];
  }
  return REALM_SCALES.genesis;
}

/**
 * Get a random note from the realm's scale
 * @param realmId - Realm ID
 * @returns Frequency in Hz
 */
export function getRandomRealmNote(realmId: string): number {
  const scale = getRealmScale(realmId);
  return scale[Math.floor(Math.random() * scale.length)];
}

// ============================================================================
// Default Exports
// ============================================================================

export const DEFAULT_REALM: RealmId = 'genesis';
export const ALL_REALM_IDS = Object.keys(REALMS) as RealmId[];
