// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Companion Constants (Batch 4: Collectibles & Pets)
// Orbital pets that follow the player
// ═══════════════════════════════════════════════════════════════════════════

import type { Rarity } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Companion {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: Rarity;
  price: number;
  orbitRadius: number;
  orbitSpeed: number;
  size: number;
  color: string;
  glowColor: string;
  particleType: 'sparkle' | 'trail' | 'pulse' | 'none';
  ability?: CompanionAbility;
  maxLevel: number;
  unlock: { type: 'purchase' | 'achievement' | 'level' | 'event' | 'hidden'; value?: number | string };
}

export interface CompanionAbility {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active';
  effect: 'fragment_magnet' | 'xp_boost' | 'stardust_boost' | 'speed_boost' | 'glow_aura' | 'lucky_find';
  baseValue: number;
  levelScale: number; // Additional value per level
  cooldown?: number; // For active abilities (ms)
}

export interface CompanionLevel {
  level: number;
  xpRequired: number;
  bonusMultiplier: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Companion Level Progression
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANION_LEVELS: CompanionLevel[] = [
  { level: 1, xpRequired: 0, bonusMultiplier: 1.0 },
  { level: 2, xpRequired: 100, bonusMultiplier: 1.1 },
  { level: 3, xpRequired: 300, bonusMultiplier: 1.2 },
  { level: 4, xpRequired: 600, bonusMultiplier: 1.35 },
  { level: 5, xpRequired: 1000, bonusMultiplier: 1.5 },
  { level: 6, xpRequired: 1500, bonusMultiplier: 1.7 },
  { level: 7, xpRequired: 2200, bonusMultiplier: 1.9 },
  { level: 8, xpRequired: 3000, bonusMultiplier: 2.1 },
  { level: 9, xpRequired: 4000, bonusMultiplier: 2.4 },
  { level: 10, xpRequired: 5500, bonusMultiplier: 3.0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Companions Database
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANIONS: Record<string, Companion> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Common Companions (Easy to get)
  // ═══════════════════════════════════════════════════════════════════════════
  
  wisp: {
    id: 'wisp',
    name: 'Little Wisp',
    icon: '🔮',
    description: 'A tiny spark of light that follows you faithfully',
    rarity: 'common',
    price: 500,
    orbitRadius: 40,
    orbitSpeed: 2.0,
    size: 8,
    color: '#87CEEB',
    glowColor: '#87CEEB',
    particleType: 'sparkle',
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  ember: {
    id: 'ember',
    name: 'Ember',
    icon: '🔥',
    description: 'A warm little flame that keeps you company',
    rarity: 'common',
    price: 500,
    orbitRadius: 35,
    orbitSpeed: 2.5,
    size: 10,
    color: '#FF6B35',
    glowColor: '#FF4500',
    particleType: 'trail',
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  dewdrop: {
    id: 'dewdrop',
    name: 'Dewdrop',
    icon: '💧',
    description: 'A floating droplet that shimmers in the light',
    rarity: 'common',
    price: 500,
    orbitRadius: 45,
    orbitSpeed: 1.8,
    size: 9,
    color: '#00CED1',
    glowColor: '#40E0D0',
    particleType: 'pulse',
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Uncommon Companions (Helpful abilities)
  // ═══════════════════════════════════════════════════════════════════════════

  starbit: {
    id: 'starbit',
    name: 'Starbit',
    icon: '⭐',
    description: 'A fallen star fragment that attracts light',
    rarity: 'uncommon',
    price: 1500,
    orbitRadius: 50,
    orbitSpeed: 1.5,
    size: 12,
    color: '#FFD700',
    glowColor: '#FFA500',
    particleType: 'sparkle',
    ability: {
      id: 'fragment_magnet',
      name: 'Light Attractor',
      description: 'Increases fragment collection radius',
      type: 'passive',
      effect: 'fragment_magnet',
      baseValue: 10, // +10% radius
      levelScale: 2, // +2% per level
    },
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  moonmoth: {
    id: 'moonmoth',
    name: 'Moonmoth',
    icon: '🦋',
    description: 'A luminescent moth drawn to your light',
    rarity: 'uncommon',
    price: 1500,
    orbitRadius: 55,
    orbitSpeed: 1.2,
    size: 14,
    color: '#E6E6FA',
    glowColor: '#DDA0DD',
    particleType: 'trail',
    ability: {
      id: 'xp_boost',
      name: 'Wisdom Wings',
      description: 'Increases experience gained',
      type: 'passive',
      effect: 'xp_boost',
      baseValue: 5, // +5% XP
      levelScale: 1, // +1% per level
    },
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  crystalfly: {
    id: 'crystalfly',
    name: 'Crystalfly',
    icon: '💎',
    description: 'A crystalline insect that sparkles beautifully',
    rarity: 'uncommon',
    price: 1500,
    orbitRadius: 48,
    orbitSpeed: 1.6,
    size: 11,
    color: '#00FFFF',
    glowColor: '#00CED1',
    particleType: 'sparkle',
    ability: {
      id: 'stardust_boost',
      name: 'Crystal Bonus',
      description: 'Increases stardust earned',
      type: 'passive',
      effect: 'stardust_boost',
      baseValue: 5, // +5% stardust
      levelScale: 1, // +1% per level
    },
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Rare Companions (Better abilities)
  // ═══════════════════════════════════════════════════════════════════════════

  aurora: {
    id: 'aurora',
    name: 'Aurora Spirit',
    icon: '🌌',
    description: 'A piece of the northern lights given form',
    rarity: 'rare',
    price: 4000,
    orbitRadius: 60,
    orbitSpeed: 0.8,
    size: 18,
    color: '#9B59B6',
    glowColor: '#8E44AD',
    particleType: 'trail',
    ability: {
      id: 'glow_aura',
      name: 'Aurora Field',
      description: 'Creates a beautiful glow around you',
      type: 'passive',
      effect: 'glow_aura',
      baseValue: 15, // +15% glow radius
      levelScale: 3, // +3% per level
    },
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  nebula: {
    id: 'nebula',
    name: 'Nebula Sprite',
    icon: '🌀',
    description: 'A swirling cloud of cosmic dust',
    rarity: 'rare',
    price: 4000,
    orbitRadius: 65,
    orbitSpeed: 0.6,
    size: 20,
    color: '#FF69B4',
    glowColor: '#FF1493',
    particleType: 'pulse',
    ability: {
      id: 'lucky_find',
      name: 'Cosmic Luck',
      description: 'Chance to find bonus fragments',
      type: 'passive',
      effect: 'lucky_find',
      baseValue: 5, // 5% chance
      levelScale: 1, // +1% per level
    },
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  zephyr: {
    id: 'zephyr',
    name: 'Zephyr',
    icon: '🌬️',
    description: 'A gentle wind spirit that speeds your journey',
    rarity: 'rare',
    price: 4000,
    orbitRadius: 55,
    orbitSpeed: 2.0,
    size: 16,
    color: '#98FB98',
    glowColor: '#00FA9A',
    particleType: 'sparkle',
    ability: {
      id: 'speed_boost',
      name: 'Swift Wind',
      description: 'Slightly increases movement speed',
      type: 'passive',
      effect: 'speed_boost',
      baseValue: 3, // +3% speed
      levelScale: 0.5, // +0.5% per level
    },
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Epic Companions (Strong abilities)
  // ═══════════════════════════════════════════════════════════════════════════

  phoenix: {
    id: 'phoenix',
    name: 'Phoenix Hatchling',
    icon: '🐦‍🔥',
    description: 'A baby phoenix reborn from eternal flames',
    rarity: 'epic',
    price: 10000,
    orbitRadius: 70,
    orbitSpeed: 1.0,
    size: 24,
    color: '#FF4500',
    glowColor: '#FF6347',
    particleType: 'trail',
    ability: {
      id: 'xp_boost',
      name: 'Eternal Wisdom',
      description: 'Greatly increases experience gained',
      type: 'passive',
      effect: 'xp_boost',
      baseValue: 15, // +15% XP
      levelScale: 2, // +2% per level
    },
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  voidling: {
    id: 'voidling',
    name: 'Void Fragment',
    icon: '🕳️',
    description: 'A piece of the void between stars',
    rarity: 'epic',
    price: 10000,
    orbitRadius: 75,
    orbitSpeed: 0.4,
    size: 22,
    color: '#4B0082',
    glowColor: '#8B008B',
    particleType: 'pulse',
    ability: {
      id: 'fragment_magnet',
      name: 'Void Pull',
      description: 'Greatly increases fragment collection radius',
      type: 'passive',
      effect: 'fragment_magnet',
      baseValue: 25, // +25% radius
      levelScale: 4, // +4% per level
    },
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  solaris: {
    id: 'solaris',
    name: 'Solaris',
    icon: '☀️',
    description: 'A miniature sun radiating warmth and light',
    rarity: 'epic',
    price: 10000,
    orbitRadius: 80,
    orbitSpeed: 0.5,
    size: 28,
    color: '#FFD700',
    glowColor: '#FFA500',
    particleType: 'sparkle',
    ability: {
      id: 'stardust_boost',
      name: 'Solar Fortune',
      description: 'Greatly increases stardust earned',
      type: 'passive',
      effect: 'stardust_boost',
      baseValue: 15, // +15% stardust
      levelScale: 2, // +2% per level
    },
    maxLevel: 10,
    unlock: { type: 'purchase' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Legendary Companions (Achievement/Event locked)
  // ═══════════════════════════════════════════════════════════════════════════

  celestial: {
    id: 'celestial',
    name: 'Celestial Guardian',
    icon: '👼',
    description: 'An angelic being that protects the worthy',
    rarity: 'legendary',
    price: 50000,
    orbitRadius: 85,
    orbitSpeed: 0.3,
    size: 32,
    color: '#FFFACD',
    glowColor: '#FFD700',
    particleType: 'sparkle',
    ability: {
      id: 'xp_boost',
      name: 'Divine Blessing',
      description: 'Massively increases all rewards',
      type: 'passive',
      effect: 'xp_boost',
      baseValue: 25, // +25% XP
      levelScale: 3, // +3% per level
    },
    maxLevel: 10,
    unlock: { type: 'level', value: 50 },
  },

  prism: {
    id: 'prism',
    name: 'Prism Entity',
    icon: '🔷',
    description: 'A being of pure refracted light',
    rarity: 'legendary',
    price: 50000,
    orbitRadius: 90,
    orbitSpeed: 0.25,
    size: 30,
    color: '#FF00FF',
    glowColor: '#FF69B4',
    particleType: 'trail',
    ability: {
      id: 'lucky_find',
      name: 'Prismatic Fortune',
      description: 'High chance to find bonus fragments',
      type: 'passive',
      effect: 'lucky_find',
      baseValue: 15, // 15% chance
      levelScale: 2, // +2% per level
    },
    maxLevel: 10,
    unlock: { type: 'achievement', value: 'fragment_master' },
  },

  cosmos: {
    id: 'cosmos',
    name: 'Cosmos',
    icon: '🌠',
    description: 'The universe itself given form',
    rarity: 'legendary',
    price: 100000,
    orbitRadius: 100,
    orbitSpeed: 0.2,
    size: 36,
    color: '#000033',
    glowColor: '#4169E1',
    particleType: 'pulse',
    ability: {
      id: 'stardust_boost',
      name: 'Cosmic Wealth',
      description: 'Massively increases stardust earned',
      type: 'passive',
      effect: 'stardust_boost',
      baseValue: 30, // +30% stardust
      levelScale: 4, // +4% per level
    },
    maxLevel: 10,
    unlock: { type: 'hidden' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Constellation Pieces (Collectibles)
// ─────────────────────────────────────────────────────────────────────────────

export interface ConstellationPiece {
  id: string;
  name: string;
  icon: string;
  constellation: string;
  description: string;
  rarity: Rarity;
  dropChance: number; // Base drop chance from fragments
  bonusWhenComplete: string;
}

export interface Constellation {
  id: string;
  name: string;
  icon: string;
  description: string;
  pieces: string[];
  reward: {
    type: 'companion' | 'cosmetic' | 'stardust' | 'title';
    value: string | number;
  };
}

export const CONSTELLATION_PIECES: Record<string, ConstellationPiece> = {
  // Orion Constellation
  orion_belt_1: {
    id: 'orion_belt_1',
    name: "Orion's Belt - Left",
    icon: '⬢',
    constellation: 'orion',
    description: 'The first star of the hunter\'s belt',
    rarity: 'uncommon',
    dropChance: 0.02,
    bonusWhenComplete: '+5% fragment value',
  },
  orion_belt_2: {
    id: 'orion_belt_2',
    name: "Orion's Belt - Center",
    icon: '⬢',
    constellation: 'orion',
    description: 'The central star of the hunter\'s belt',
    rarity: 'uncommon',
    dropChance: 0.02,
    bonusWhenComplete: '+5% fragment value',
  },
  orion_belt_3: {
    id: 'orion_belt_3',
    name: "Orion's Belt - Right",
    icon: '⬢',
    constellation: 'orion',
    description: 'The third star of the hunter\'s belt',
    rarity: 'uncommon',
    dropChance: 0.02,
    bonusWhenComplete: '+5% fragment value',
  },
  orion_shoulder: {
    id: 'orion_shoulder',
    name: 'Betelgeuse',
    icon: '🔴',
    constellation: 'orion',
    description: 'The red giant on Orion\'s shoulder',
    rarity: 'rare',
    dropChance: 0.01,
    bonusWhenComplete: '+5% fragment value',
  },
  orion_foot: {
    id: 'orion_foot',
    name: 'Rigel',
    icon: '🔵',
    constellation: 'orion',
    description: 'The bright blue star at Orion\'s foot',
    rarity: 'rare',
    dropChance: 0.01,
    bonusWhenComplete: '+5% fragment value',
  },

  // Ursa Major Constellation
  ursa_1: {
    id: 'ursa_1',
    name: 'Dubhe',
    icon: '✦',
    constellation: 'ursa_major',
    description: 'The pointer star of the Big Dipper',
    rarity: 'uncommon',
    dropChance: 0.02,
    bonusWhenComplete: '+10% XP gain',
  },
  ursa_2: {
    id: 'ursa_2',
    name: 'Merak',
    icon: '✦',
    constellation: 'ursa_major',
    description: 'The second pointer star',
    rarity: 'uncommon',
    dropChance: 0.02,
    bonusWhenComplete: '+10% XP gain',
  },
  ursa_3: {
    id: 'ursa_3',
    name: 'Phecda',
    icon: '✦',
    constellation: 'ursa_major',
    description: 'The corner of the Dipper bowl',
    rarity: 'uncommon',
    dropChance: 0.02,
    bonusWhenComplete: '+10% XP gain',
  },
  ursa_4: {
    id: 'ursa_4',
    name: 'Megrez',
    icon: '✦',
    constellation: 'ursa_major',
    description: 'The faintest star in the Dipper',
    rarity: 'rare',
    dropChance: 0.015,
    bonusWhenComplete: '+10% XP gain',
  },
  ursa_5: {
    id: 'ursa_5',
    name: 'Alioth',
    icon: '✦',
    constellation: 'ursa_major',
    description: 'The brightest star in the constellation',
    rarity: 'rare',
    dropChance: 0.015,
    bonusWhenComplete: '+10% XP gain',
  },
  ursa_6: {
    id: 'ursa_6',
    name: 'Mizar',
    icon: '✦',
    constellation: 'ursa_major',
    description: 'A famous double star',
    rarity: 'rare',
    dropChance: 0.015,
    bonusWhenComplete: '+10% XP gain',
  },
  ursa_7: {
    id: 'ursa_7',
    name: 'Alkaid',
    icon: '✦',
    constellation: 'ursa_major',
    description: 'The end of the Dipper handle',
    rarity: 'epic',
    dropChance: 0.008,
    bonusWhenComplete: '+10% XP gain',
  },

  // Lumina Constellation (Special)
  avestella_heart: {
    id: 'avestella_heart',
    name: 'Heart of Lumina',
    icon: '💜',
    constellation: 'lumina',
    description: 'The core of the Lumina constellation',
    rarity: 'legendary',
    dropChance: 0.002,
    bonusWhenComplete: 'Unlock Cosmos companion',
  },
  avestella_crown: {
    id: 'avestella_crown',
    name: 'Crown of Light',
    icon: '👑',
    constellation: 'lumina',
    description: 'The radiant crown above Lumina',
    rarity: 'legendary',
    dropChance: 0.002,
    bonusWhenComplete: 'Unlock Cosmos companion',
  },
  avestella_wings_l: {
    id: 'avestella_wings_l',
    name: 'Left Wing of Dawn',
    icon: '🪽',
    constellation: 'lumina',
    description: 'The left wing of the light bringer',
    rarity: 'epic',
    dropChance: 0.005,
    bonusWhenComplete: 'Unlock Cosmos companion',
  },
  avestella_wings_r: {
    id: 'avestella_wings_r',
    name: 'Right Wing of Dusk',
    icon: '🪽',
    constellation: 'lumina',
    description: 'The right wing of the light bringer',
    rarity: 'epic',
    dropChance: 0.005,
    bonusWhenComplete: 'Unlock Cosmos companion',
  },
};

export const CONSTELLATIONS: Record<string, Constellation> = {
  orion: {
    id: 'orion',
    name: 'Orion the Hunter',
    icon: '🏹',
    description: 'The mighty hunter of the night sky',
    pieces: ['orion_belt_1', 'orion_belt_2', 'orion_belt_3', 'orion_shoulder', 'orion_foot'],
    reward: { type: 'stardust', value: 5000 },
  },
  ursa_major: {
    id: 'ursa_major',
    name: 'Ursa Major',
    icon: '🐻',
    description: 'The Great Bear and its famous Dipper',
    pieces: ['ursa_1', 'ursa_2', 'ursa_3', 'ursa_4', 'ursa_5', 'ursa_6', 'ursa_7'],
    reward: { type: 'title', value: 'Star Mapper' },
  },
  lumina: {
    id: 'lumina',
    name: 'Lumina',
    icon: '✨',
    description: 'The legendary constellation of pure light',
    pieces: ['avestella_heart', 'avestella_crown', 'avestella_wings_l', 'avestella_wings_r'],
    reward: { type: 'companion', value: 'cosmos' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fragment Varieties
// ─────────────────────────────────────────────────────────────────────────────

export interface FragmentType {
  id: string;
  name: string;
  icon: string;
  color: string;
  glowColor: string;
  baseValue: number;
  xpValue: number;
  spawnWeight: number; // Higher = more common
  sizeMultiplier: number;
  description: string;
}

export const FRAGMENT_TYPES: Record<string, FragmentType> = {
  common: {
    id: 'common',
    name: 'Light Fragment',
    icon: '✦',
    color: '#FFFFFF',
    glowColor: '#FFFFCC',
    baseValue: 1,
    xpValue: 1,
    spawnWeight: 100,
    sizeMultiplier: 1.0,
    description: 'A tiny piece of pure light',
  },
  golden: {
    id: 'golden',
    name: 'Golden Fragment',
    icon: '⭐',
    color: '#FFD700',
    glowColor: '#FFA500',
    baseValue: 5,
    xpValue: 3,
    spawnWeight: 20,
    sizeMultiplier: 1.2,
    description: 'A valuable golden light shard',
  },
  prismatic: {
    id: 'prismatic',
    name: 'Prismatic Fragment',
    icon: '💎',
    color: '#FF69B4',
    glowColor: '#FF00FF',
    baseValue: 10,
    xpValue: 5,
    spawnWeight: 8,
    sizeMultiplier: 1.4,
    description: 'A rainbow-shifting crystal of light',
  },
  celestial: {
    id: 'celestial',
    name: 'Celestial Fragment',
    icon: '🌟',
    color: '#87CEEB',
    glowColor: '#00BFFF',
    baseValue: 25,
    xpValue: 10,
    spawnWeight: 3,
    sizeMultiplier: 1.6,
    description: 'A piece of starlight itself',
  },
  void: {
    id: 'void',
    name: 'Void Fragment',
    icon: '🔮',
    color: '#4B0082',
    glowColor: '#8B008B',
    baseValue: 50,
    xpValue: 25,
    spawnWeight: 1,
    sizeMultiplier: 1.8,
    description: 'Light crystallized from the void',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Achievement Badges
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Hidden description shown when achievement is locked (for secret achievements) */
  hiddenDescription?: string;
  category: 'collection' | 'exploration' | 'social' | 'mastery' | 'special' | 'secret';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  /** If true, this is a secret achievement - description hidden until unlocked */
  secret?: boolean;
  requirement: {
    type: string;
    value: number;
  };
  reward: {
    stardust?: number;
    unlock?: string;
    title?: string;
  };
}

export const ACHIEVEMENT_BADGES: Record<string, AchievementBadge> = {
  // Collection Badges
  collector_bronze: {
    id: 'collector_bronze',
    name: 'Novice Collector',
    icon: '🏅',
    description: 'Collect 100 fragments',
    category: 'collection',
    tier: 'bronze',
    requirement: { type: 'fragments_collected', value: 100 },
    reward: { stardust: 100 },
  },
  collector_silver: {
    id: 'collector_silver',
    name: 'Dedicated Collector',
    icon: '🥈',
    description: 'Collect 1,000 fragments',
    category: 'collection',
    tier: 'silver',
    requirement: { type: 'fragments_collected', value: 1000 },
    reward: { stardust: 500 },
  },
  collector_gold: {
    id: 'collector_gold',
    name: 'Expert Collector',
    icon: '🥇',
    description: 'Collect 10,000 fragments',
    category: 'collection',
    tier: 'gold',
    requirement: { type: 'fragments_collected', value: 10000 },
    reward: { stardust: 2000, title: 'Fragment Hunter' },
  },
  collector_platinum: {
    id: 'collector_platinum',
    name: 'Master Collector',
    icon: '🏆',
    description: 'Collect 100,000 fragments',
    category: 'collection',
    tier: 'platinum',
    requirement: { type: 'fragments_collected', value: 100000 },
    reward: { stardust: 10000, unlock: 'fragment_master' },
  },

  // Companion Badges
  companion_friend: {
    id: 'companion_friend',
    name: 'Companion Friend',
    icon: '🐾',
    description: 'Acquire your first companion',
    category: 'collection',
    tier: 'bronze',
    requirement: { type: 'companions_owned', value: 1 },
    reward: { stardust: 200 },
  },
  companion_keeper: {
    id: 'companion_keeper',
    name: 'Companion Keeper',
    icon: '🐾',
    description: 'Own 5 companions',
    category: 'collection',
    tier: 'silver',
    requirement: { type: 'companions_owned', value: 5 },
    reward: { stardust: 1000 },
  },
  companion_master: {
    id: 'companion_master',
    name: 'Companion Master',
    icon: '🐾',
    description: 'Own all companions',
    category: 'collection',
    tier: 'diamond',
    requirement: { type: 'companions_owned', value: 15 },
    reward: { stardust: 25000, title: 'Beast Master' },
  },

  // Exploration Badges
  explorer_bronze: {
    id: 'explorer_bronze',
    name: 'Wanderer',
    icon: '🧭',
    description: 'Discover 10 locations',
    category: 'exploration',
    tier: 'bronze',
    requirement: { type: 'locations_discovered', value: 10 },
    reward: { stardust: 150 },
  },
  explorer_gold: {
    id: 'explorer_gold',
    name: 'Pathfinder',
    icon: '🗺️',
    description: 'Discover 100 locations',
    category: 'exploration',
    tier: 'gold',
    requirement: { type: 'locations_discovered', value: 100 },
    reward: { stardust: 3000, title: 'Pathfinder' },
  },

  // Social Badges
  social_friendly: {
    id: 'social_friendly',
    name: 'Friendly Light',
    icon: '💜',
    description: 'Add 5 friends',
    category: 'social',
    tier: 'bronze',
    requirement: { type: 'friends_added', value: 5 },
    reward: { stardust: 200 },
  },
  social_popular: {
    id: 'social_popular',
    name: 'Popular Light',
    icon: '🌟',
    description: 'Add 50 friends',
    category: 'social',
    tier: 'gold',
    requirement: { type: 'friends_added', value: 50 },
    reward: { stardust: 2000, title: 'Social Butterfly' },
  },

  // Mastery Badges
  level_10: {
    id: 'level_10',
    name: 'Rising Light',
    icon: '⭐',
    description: 'Reach level 10',
    category: 'mastery',
    tier: 'bronze',
    requirement: { type: 'player_level', value: 10 },
    reward: { stardust: 500 },
  },
  level_25: {
    id: 'level_25',
    name: 'Bright Light',
    icon: '🌟',
    description: 'Reach level 25',
    category: 'mastery',
    tier: 'silver',
    requirement: { type: 'player_level', value: 25 },
    reward: { stardust: 2000 },
  },
  level_50: {
    id: 'level_50',
    name: 'Master of Light',
    icon: '✨',
    description: 'Reach level 50',
    category: 'mastery',
    tier: 'gold',
    requirement: { type: 'player_level', value: 50 },
    reward: { stardust: 10000, title: 'Master of Light' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Secret Achievements (hidden until unlocked)
  // ═══════════════════════════════════════════════════════════════════════════
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    icon: '🦉',
    description: 'Play after midnight',
    hiddenDescription: 'Secret achievement',
    category: 'secret',
    tier: 'bronze',
    secret: true,
    requirement: { type: 'night_owl', value: 1 },
    reward: { stardust: 250 },
  },
  marathon: {
    id: 'marathon',
    name: 'Marathon',
    icon: '🏃',
    description: 'Play for 2 hours in a single session',
    hiddenDescription: 'Secret achievement',
    category: 'secret',
    tier: 'silver',
    secret: true,
    requirement: { type: 'marathon', value: 1 },
    reward: { stardust: 500 },
  },
  constellation_form: {
    id: 'constellation_form',
    name: 'Constellation',
    icon: '⭐',
    description: 'Form a group with 3 or more players',
    hiddenDescription: 'Secret achievement',
    category: 'secret',
    tier: 'gold',
    secret: true,
    requirement: { type: 'constellation', value: 1 },
    reward: { stardust: 750 },
  },
  teleporter: {
    id: 'teleporter',
    name: 'Teleporter',
    icon: '🚀',
    description: 'Teleport to a friend',
    hiddenDescription: 'Secret achievement',
    category: 'secret',
    tier: 'bronze',
    secret: true,
    requirement: { type: 'teleports', value: 1 },
    reward: { stardust: 300 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

export const getCompanionsByRarity = (rarity: Rarity): Companion[] => {
  return Object.values(COMPANIONS).filter(c => c.rarity === rarity);
};

export const getConstellationProgress = (
  constellationId: string,
  ownedPieces: string[]
): { total: number; owned: number; percentage: number } => {
  const constellation = CONSTELLATIONS[constellationId];
  if (!constellation) return { total: 0, owned: 0, percentage: 0 };
  
  const owned = constellation.pieces.filter(p => ownedPieces.includes(p)).length;
  return {
    total: constellation.pieces.length,
    owned,
    percentage: Math.round((owned / constellation.pieces.length) * 100),
  };
};

export const calculateCompanionBonus = (
  companion: Companion,
  level: number
): number => {
  if (!companion.ability) return 0;
  const { baseValue, levelScale } = companion.ability;
  const levelData = COMPANION_LEVELS[level - 1] || COMPANION_LEVELS[0];
  return baseValue + (levelScale * (level - 1)) * levelData.bonusMultiplier;
};

export const getNextLevelXP = (currentLevel: number): number => {
  const nextLevel = COMPANION_LEVELS[currentLevel];
  return nextLevel ? nextLevel.xpRequired : Infinity;
};
