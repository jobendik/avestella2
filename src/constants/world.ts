// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - World Constants (Batch 1: World & Exploration)
// ═══════════════════════════════════════════════════════════════════════════

import type { Biome, PointOfInterest } from '@/types';
import { WORLD_SIZE } from './game';

// ─────────────────────────────────────────────────────────────────────────────
// Biome System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Six distinct biomes covering the world.
 * Each biome has unique visual theme, particles, and gameplay modifiers.
 */
export const BIOMES: Biome[] = [
  {
    id: 'crystal_caves',
    name: 'Crystal Caves',
    color: '#00CED1', // Dark cyan
    particles: 'crystal',
    music: 'crystal_ambient',
    fragmentBonus: 1.2,
    bounds: {
      x1: 0,
      y1: 0,
      x2: WORLD_SIZE / 3,
      y2: WORLD_SIZE / 2,
    },
    physics: {
      driftMultiplier: 1.1, // Slippery crystals
      friction: 0.98,
    },
  },
  {
    id: 'twilight_forest',
    name: 'Twilight Forest',
    color: '#9370DB', // Medium purple
    particles: 'firefly',
    music: 'forest_ambient',
    fragmentBonus: 1.0,
    bounds: {
      x1: WORLD_SIZE / 3,
      y1: 0,
      x2: (WORLD_SIZE * 2) / 3,
      y2: WORLD_SIZE / 2,
    },
    physics: {
      driftMultiplier: 0.9,
      friction: 0.92, // Slight air resistance
    },
  },
  {
    id: 'aurora_plains',
    name: 'Aurora Plains',
    color: '#90EE90', // Light green
    particles: 'aurora',
    music: 'plains_ambient',
    fragmentBonus: 1.0,
    bounds: {
      x1: (WORLD_SIZE * 2) / 3,
      y1: 0,
      x2: WORLD_SIZE,
      y2: WORLD_SIZE / 2,
    },
    physics: {
      driftMultiplier: 1.0,
      friction: 0.95, // Standard friction
    },
  },
  {
    id: 'starfall_desert',
    name: 'Starfall Desert',
    color: '#FFD700', // Gold
    particles: 'star',
    music: 'desert_ambient',
    fragmentBonus: 1.3,
    bounds: {
      x1: 0,
      y1: WORLD_SIZE / 2,
      x2: WORLD_SIZE / 3,
      y2: WORLD_SIZE,
    },
    physics: {
      driftMultiplier: 1.2, // Very slippery sand
      friction: 0.90, // Gritty drag
    },
  },
  {
    id: 'mystic_shores',
    name: 'Mystic Shores',
    color: '#FF69B4', // Hot pink
    particles: 'water',
    music: 'shores_ambient',
    fragmentBonus: 1.1,
    bounds: {
      x1: WORLD_SIZE / 3,
      y1: WORLD_SIZE / 2,
      x2: (WORLD_SIZE * 2) / 3,
      y2: WORLD_SIZE,
    },
    physics: {
      driftMultiplier: 0.8, // Fluid movement
      friction: 0.85, // High drag (water)
    },
  },
  {
    id: 'void_expanse',
    name: 'Void Expanse',
    color: '#4B0082', // Indigo
    particles: 'void',
    music: 'void_ambient',
    fragmentBonus: 1.5,
    bounds: {
      x1: (WORLD_SIZE * 2) / 3,
      y1: WORLD_SIZE / 2,
      x2: WORLD_SIZE,
      y2: WORLD_SIZE,
    },
    physics: {
      driftMultiplier: 1.05,
      friction: 0.99, // Near zero friction (space)
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Special Biomes (per lumina-viral-bible.md Section 11.1)
// These are smaller zones within main biomes with special properties
// ─────────────────────────────────────────────────────────────────────────────

export const SPECIAL_BIOMES: Biome[] = [
  {
    id: 'ancient_library',
    name: 'Ancient Library',
    color: '#8B4513', // Saddle brown
    particles: 'dust',
    music: 'library_ambient',
    fragmentBonus: 1.0,
    bounds: {
      x1: WORLD_SIZE * 0.45,
      y1: WORLD_SIZE * 0.1,
      x2: WORLD_SIZE * 0.55,
      y2: WORLD_SIZE * 0.2,
    },
    special: {
      type: 'lore_discovery',
      rewards: { xp: 200, loreFragments: 5 },
    },
    physics: {
      driftMultiplier: 1.0,
      friction: 0.95,
    },
  },
  {
    id: 'memory_gardens',
    name: 'Memory Gardens',
    color: '#DDA0DD', // Plum
    particles: 'petal',
    music: 'garden_ambient',
    fragmentBonus: 0.8,
    bounds: {
      x1: WORLD_SIZE * 0.4,
      y1: WORLD_SIZE * 0.45,
      x2: WORLD_SIZE * 0.6,
      y2: WORLD_SIZE * 0.55,
    },
    special: {
      type: 'star_memory_showcase',
      effect: 'memories_visible',
    },
    physics: {
      driftMultiplier: 0.95,
      friction: 0.94,
    },
  },
  {
    id: 'the_confluence',
    name: 'The Confluence',
    color: '#00CED1', // Dark turquoise
    particles: 'swirl',
    music: 'confluence_ambient',
    fragmentBonus: 1.2,
    bounds: {
      x1: WORLD_SIZE * 0.35,
      y1: WORLD_SIZE * 0.35,
      x2: WORLD_SIZE * 0.65,
      y2: WORLD_SIZE * 0.65,
    },
    special: {
      type: 'meeting_hub',
      effect: 'matchmaking_boost',
    },
    physics: {
      driftMultiplier: 1.0,
      friction: 0.95,
    },
  },
  {
    id: 'forgotten_ruins',
    name: 'Forgotten Ruins',
    color: '#696969', // Dim gray
    particles: 'ember',
    music: 'ruins_ambient',
    fragmentBonus: 2.0,
    bounds: {
      x1: WORLD_SIZE * 0.05,
      y1: WORLD_SIZE * 0.85,
      x2: WORLD_SIZE * 0.15,
      y2: WORLD_SIZE * 0.95,
    },
    special: {
      type: 'secret_history',
      rewards: { stardust: 100, secretLore: true },
    },
    physics: {
      driftMultiplier: 1.0,
      friction: 0.95,
    },
  },
  {
    id: 'living_aurora',
    name: 'Living Aurora',
    color: '#7FFFD4', // Aquamarine
    particles: 'aurora',
    music: 'aurora_ambient',
    fragmentBonus: 1.3,
    bounds: {
      x1: WORLD_SIZE * 0.8,
      y1: WORLD_SIZE * 0.05,
      x2: WORLD_SIZE * 0.95,
      y2: WORLD_SIZE * 0.2,
    },
    special: {
      type: 'dynamic_beauty',
      effect: 'light_restoration',
    },
    physics: {
      driftMultiplier: 1.05,
      friction: 0.93,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Biome Colors (for background gradients and fog)
// ─────────────────────────────────────────────────────────────────────────────

export const BIOME_GRADIENTS: Record<string, { bg1: string; bg2: string; fog: string }> = {
  crystal_caves: {
    bg1: '#0a1628',
    bg2: '#0d2a3d',
    fog: 'rgba(0, 206, 209, 0.03)',
  },
  twilight_forest: {
    bg1: '#150a28',
    bg2: '#1a0d35',
    fog: 'rgba(147, 112, 219, 0.03)',
  },
  aurora_plains: {
    bg1: '#0a1a0a',
    bg2: '#0d280d',
    fog: 'rgba(144, 238, 144, 0.03)',
  },
  starfall_desert: {
    bg1: '#1a150a',
    bg2: '#28200d',
    fog: 'rgba(255, 215, 0, 0.03)',
  },
  mystic_shores: {
    bg1: '#1a0a1a',
    bg2: '#280d28',
    fog: 'rgba(255, 105, 180, 0.03)',
  },
  void_expanse: {
    bg1: '#080010',
    bg2: '#0a0018',
    fog: 'rgba(75, 0, 130, 0.05)',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fog of War Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const FOG_CELL_SIZE = 100; // Size of each exploration cell
export const FOG_REVEAL_RADIUS = 200; // How far the player reveals fog
export const FOG_EDGE_SOFTNESS = 50; // Soft edge around revealed areas

// ─────────────────────────────────────────────────────────────────────────────
// Points of Interest
// ─────────────────────────────────────────────────────────────────────────────

export const POINTS_OF_INTEREST: PointOfInterest[] = [
  // Crystal Caves POIs
  {
    id: 'poi_crystal_heart',
    type: 'shrine',
    name: 'Crystal Heart',
    x: 400,
    y: 600,
    discovered: false,
    rewards: { stardust: 50, xp: 100 },
  },
  {
    id: 'poi_echo_chamber',
    type: 'ruins',
    name: 'Echo Chamber',
    x: 1200,
    y: 1000,
    discovered: false,
    rewards: { stardust: 30, xp: 75 },
  },

  // Twilight Forest POIs
  {
    id: 'poi_ancient_tree',
    type: 'shrine',
    name: 'Ancient Avestella Tree',
    x: 4000,
    y: 1500,
    discovered: false,
    rewards: { stardust: 50, xp: 100, cosmetic: 'trail_nature' },
  },
  {
    id: 'poi_moonlit_glade',
    type: 'viewpoint',
    name: 'Moonlit Glade',
    x: 3500,
    y: 800,
    discovered: false,
    rewards: { stardust: 25, xp: 50 },
  },

  // Aurora Plains POIs
  {
    id: 'poi_aurora_peak',
    type: 'viewpoint',
    name: 'Aurora Peak',
    x: 6500,
    y: 1000,
    discovered: false,
    rewards: { stardust: 40, xp: 100 },
  },
  {
    id: 'poi_rainbow_arch',
    type: 'ruins',
    name: 'Rainbow Arch',
    x: 7000,
    y: 2000,
    discovered: false,
    rewards: { stardust: 35, xp: 80 },
  },

  // Starfall Desert POIs
  {
    id: 'poi_star_crater',
    type: 'pool',
    name: 'Starfall Crater',
    x: 1000,
    y: 5500,
    discovered: false,
    rewards: { stardust: 60, xp: 120, cosmetic: 'aura_starlight' },
  },
  {
    id: 'poi_sand_shrine',
    type: 'shrine',
    name: 'Desert Shrine',
    x: 2000,
    y: 6000,
    discovered: false,
    rewards: { stardust: 45, xp: 90 },
  },

  // Mystic Shores POIs
  {
    id: 'poi_tidal_pool',
    type: 'pool',
    name: 'Mystic Tidal Pool',
    x: 4500,
    y: 6000,
    discovered: false,
    rewards: { stardust: 35, xp: 70 },
  },
  {
    id: 'poi_lighthouse',
    type: 'viewpoint',
    name: 'Spectral Lighthouse',
    x: 5000,
    y: 7000,
    discovered: false,
    rewards: { stardust: 50, xp: 100 },
  },

  // Void Expanse POIs
  {
    id: 'poi_void_heart',
    type: 'shrine',
    name: 'Heart of the Void',
    x: 7000,
    y: 7000,
    discovered: false,
    rewards: { stardust: 100, xp: 200, cosmetic: 'color_void' },
  },
  {
    id: 'poi_dark_constellation',
    type: 'constellation',
    name: 'Dark Constellation',
    x: 6000,
    y: 6000,
    discovered: false,
    rewards: { stardust: 75, xp: 150 },
  },

  // Secret Locations (harder to find)
  {
    id: 'secret_world_center',
    type: 'secret',
    name: 'World Heart',
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    discovered: false,
    rewards: { stardust: 200, xp: 500, cosmetic: 'aura_prismatic' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// World Events Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface WorldEventConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  duration: number; // Duration in seconds
  spawnChance: number; // Chance per minute
  minLevel?: number;
}

export const WORLD_EVENTS: WorldEventConfig[] = [
  {
    id: 'meteor_shower',
    name: 'Meteor Shower',
    icon: '☄️',
    description: 'Collect falling star fragments for bonus stardust!',
    duration: 60,
    spawnChance: 0.1,
  },
  {
    id: 'aurora_borealis',
    name: 'Aurora Borealis',
    icon: '🌌',
    description: 'A spectacular light show across the sky!',
    duration: 120,
    spawnChance: 0.08,
  },
  {
    id: 'solar_eclipse',
    name: 'Solar Eclipse',
    icon: '🌑',
    description: 'Darkness falls... fragments glow brighter!',
    duration: 45,
    spawnChance: 0.05,
  },
  {
    id: 'comet_pass',
    name: 'Comet Pass',
    icon: '💫',
    description: 'A rare comet streaks across the world!',
    duration: 30,
    spawnChance: 0.02,
  },
  {
    id: 'light_bloom',
    name: 'Light Bloom',
    icon: '✨',
    description: 'All lights shine brighter! XP bonus active!',
    duration: 90,
    spawnChance: 0.07,
  },
  {
    id: 'cosmic_storm',
    name: 'Cosmic Storm',
    icon: '⚡',
    description: 'Energy surges through the cosmos! Move faster but beware the lightning!',
    duration: 75,
    spawnChance: 0.06,
  },
  {
    id: 'starfall',
    name: 'Starfall',
    icon: '🌠',
    description: 'Stars rain down! Collect them for massive bonus stardust!',
    duration: 45,
    spawnChance: 0.04,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Landmarks (Visual markers in the world)
// ─────────────────────────────────────────────────────────────────────────────

export interface Landmark {
  id: string;
  name: string;
  x: number;
  y: number;
  icon: string;
  size: number;
  glow: string;
  description: string;
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'crystal_spire',
    name: 'Crystal Spire',
    x: 800,
    y: 800,
    icon: '💎',
    size: 80,
    glow: '#00CED1',
    description: 'A towering spire of pure crystal energy',
  },
  {
    id: 'ancient_tree',
    name: 'World Tree',
    x: 4000,
    y: 1200,
    icon: '🌳',
    size: 100,
    glow: '#9370DB',
    description: 'The ancient tree that connects all realms',
  },
  {
    id: 'aurora_monument',
    name: 'Aurora Monument',
    x: 6800,
    y: 1500,
    icon: '🗿',
    size: 70,
    glow: '#90EE90',
    description: 'A monument to the first light bearers',
  },
  {
    id: 'fallen_star',
    name: 'Fallen Star',
    x: 1500,
    y: 5800,
    icon: '⭐',
    size: 90,
    glow: '#FFD700',
    description: 'The remains of a celestial visitor',
  },
  {
    id: 'lighthouse',
    name: 'Phantom Lighthouse',
    x: 4800,
    y: 6500,
    icon: '🏮',
    size: 75,
    glow: '#FF69B4',
    description: 'Guides lost souls through the mist',
  },
  {
    id: 'void_gate',
    name: 'Void Gate',
    x: 7200,
    y: 6800,
    icon: '🌀',
    size: 85,
    glow: '#4B0082',
    description: 'A portal to realms unknown',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Discovery Rewards
// ─────────────────────────────────────────────────────────────────────────────

export const DISCOVERY_REWARDS = {
  biome: { stardust: 20, xp: 50 },
  poi: { stardust: 25, xp: 75 },
  landmark: { stardust: 15, xp: 40 },
  secret: { stardust: 100, xp: 250 },
  timeSecret: { stardust: 150, xp: 300 },
  explorationMilestone10: { stardust: 50, xp: 100 },
  explorationMilestone25: { stardust: 100, xp: 250 },
  explorationMilestone50: { stardust: 200, xp: 500 },
  explorationMilestone75: { stardust: 300, xp: 750 },
  explorationMilestone100: { stardust: 500, xp: 1000, cosmetic: 'trail_explorer' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Time-Based Secrets
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeSecret {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  radius: number;
  timeCondition: {
    type: 'hour' | 'minute' | 'day' | 'month';
    values: number[]; // Hours 0-23, minutes 0-59, days 0-6 (Sunday=0), months 0-11
  };
  rewards: {
    stardust: number;
    xp: number;
    cosmetic?: string;
  };
}

export const TIME_SECRETS: TimeSecret[] = [
  {
    id: 'secret_midnight_bloom',
    name: 'Midnight Bloom',
    description: 'A flower that only blooms at midnight',
    x: 4000,
    y: 4000,
    radius: 150,
    timeCondition: { type: 'hour', values: [0] }, // Midnight
    rewards: { stardust: 200, xp: 400, cosmetic: 'aura_midnight' },
  },
  {
    id: 'secret_dawn_chorus',
    name: 'Dawn Chorus',
    description: 'The first light of dawn reveals hidden melodies',
    x: 800,
    y: 800,
    radius: 200,
    timeCondition: { type: 'hour', values: [5, 6] }, // 5-6 AM
    rewards: { stardust: 150, xp: 300, cosmetic: 'trail_dawn' },
  },
  {
    id: 'secret_witching_hour',
    name: 'Witching Hour',
    description: 'Strange energies emerge at 3 AM',
    x: 7000,
    y: 7000,
    radius: 100,
    timeCondition: { type: 'hour', values: [3] }, // 3 AM
    rewards: { stardust: 250, xp: 500, cosmetic: 'color_spectral' },
  },
  {
    id: 'secret_golden_hour',
    name: 'Golden Hour',
    description: 'The perfect light of sunset illuminates hidden paths',
    x: 6000,
    y: 1500,
    radius: 180,
    timeCondition: { type: 'hour', values: [17, 18, 19] }, // 5-7 PM
    rewards: { stardust: 100, xp: 200 },
  },
  {
    id: 'secret_lunar_tide',
    name: 'Lunar Tide',
    description: 'The shores reveal secrets under moonlight',
    x: 4500,
    y: 6500,
    radius: 150,
    timeCondition: { type: 'hour', values: [21, 22, 23] }, // 9 PM - midnight
    rewards: { stardust: 175, xp: 350 },
  },
];

/**
 * Check if a time secret is currently active
 */
export function isTimeSecretActive(secret: TimeSecret): boolean {
  const now = new Date();

  switch (secret.timeCondition.type) {
    case 'hour':
      return secret.timeCondition.values.includes(now.getHours());
    case 'minute':
      return secret.timeCondition.values.includes(now.getMinutes());
    case 'day':
      return secret.timeCondition.values.includes(now.getDay());
    case 'month':
      return secret.timeCondition.values.includes(now.getMonth());
    default:
      return false;
  }
}

/**
 * Get active time secrets at a position
 */
export function getActiveTimeSecretsAtPosition(x: number, y: number): TimeSecret[] {
  return TIME_SECRETS.filter(secret => {
    if (!isTimeSecretActive(secret)) return false;

    const dx = secret.x - x;
    const dy = secret.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist <= secret.radius;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the biome at a given position
 */
export function getBiomeAtPosition(x: number, y: number): Biome | null {
  for (const biome of BIOMES) {
    if (
      x >= biome.bounds.x1 &&
      x < biome.bounds.x2 &&
      y >= biome.bounds.y1 &&
      y < biome.bounds.y2
    ) {
      return biome;
    }
  }
  return null;
}

/**
 * Get cell key for fog of war
 */
export function getCellKey(x: number, y: number): string {
  const cellX = Math.floor(x / FOG_CELL_SIZE);
  const cellY = Math.floor(y / FOG_CELL_SIZE);
  return `${cellX},${cellY}`;
}

/**
 * Get cells that should be revealed at a position
 */
export function getRevealedCells(x: number, y: number): string[] {
  const cells: string[] = [];
  const revealCells = Math.ceil(FOG_REVEAL_RADIUS / FOG_CELL_SIZE);

  const centerX = Math.floor(x / FOG_CELL_SIZE);
  const centerY = Math.floor(y / FOG_CELL_SIZE);

  for (let dx = -revealCells; dx <= revealCells; dx++) {
    for (let dy = -revealCells; dy <= revealCells; dy++) {
      const cellX = centerX + dx;
      const cellY = centerY + dy;

      // Check if cell is within reveal radius (circular)
      const cellCenterX = (cellX + 0.5) * FOG_CELL_SIZE;
      const cellCenterY = (cellY + 0.5) * FOG_CELL_SIZE;
      const dist = Math.sqrt((cellCenterX - x) ** 2 + (cellCenterY - y) ** 2);

      if (dist <= FOG_REVEAL_RADIUS && cellX >= 0 && cellY >= 0) {
        cells.push(`${cellX},${cellY}`);
      }
    }
  }

  return cells;
}

/**
 * Calculate exploration percentage
 */
export function calculateExplorationPercentage(exploredCells: Set<string>): number {
  const totalCells = Math.ceil(WORLD_SIZE / FOG_CELL_SIZE) ** 2;
  return (exploredCells.size / totalCells) * 100;
}
