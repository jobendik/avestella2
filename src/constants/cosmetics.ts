// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Cosmetics Constants (Extracted from App.jsx)
// ═══════════════════════════════════════════════════════════════════════════

import type { TrailStyle, LightColor, AuraEffect, Rarity } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Trail Styles (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const TRAIL_STYLES: Record<string, TrailStyle> = {
  sparkles: { name: 'Sparkles', icon: '✨', price: 0, rarity: 'common', desc: 'Classic sparkle trail', unlock: { type: 'default' } },
  stars: { name: 'Stars', icon: '⭐', price: 300, rarity: 'uncommon', desc: 'Leave stars behind', unlock: { type: 'purchase' } },
  hearts: { name: 'Hearts', icon: '💖', price: 400, rarity: 'uncommon', desc: 'Love in motion', unlock: { type: 'purchase' } },
  waves: { name: 'Waves', icon: '🌊', price: 400, rarity: 'uncommon', desc: 'Flowing water trails', unlock: { type: 'purchase' } },
  bubbles: { name: 'Bubbles', icon: '🫧', price: 500, rarity: 'rare', desc: 'Float with bubbles', unlock: { type: 'purchase' } },
  petals: { name: 'Petals', icon: '🌸', price: 600, rarity: 'rare', desc: 'Cherry blossom petals', unlock: { type: 'purchase' } },
  rainbow: { name: 'Rainbow', icon: '🌈', price: 800, rarity: 'rare', desc: 'Rainbow light trail', unlock: { type: 'purchase' } },
  constellation: { name: 'Constellation', icon: '✨', price: 1000, rarity: 'epic', desc: 'Connected star patterns', unlock: { type: 'purchase' } },
  lightning: { name: 'Lightning', icon: '⚡', price: 1000, rarity: 'epic', desc: 'Electric arcs follow', unlock: { type: 'purchase' } },
  snowflakes: { name: 'Snowflakes', icon: '❄️', price: 800, rarity: 'rare', desc: 'Winter wonderland', unlock: { type: 'purchase' } },
  fire: { name: 'Fire', icon: '🔥', price: 1200, rarity: 'epic', desc: 'Blazing flame trail', unlock: { type: 'purchase' } },
  aurora: { name: 'Aurora', icon: '🌌', price: 2000, rarity: 'legendary', desc: 'Northern lights dance', unlock: { type: 'purchase' } },
  cosmic: { name: 'Cosmic', icon: '🌠', price: 2500, rarity: 'legendary', desc: 'Galaxy swirls', unlock: { type: 'purchase' } },
  phoenix: { name: 'Phoenix', icon: '🔥', price: 3000, rarity: 'legendary', desc: 'Rise from ashes', unlock: { type: 'purchase' } },
  galaxy: { name: 'Galaxy', icon: '🌌', price: 5000, rarity: 'legendary', desc: 'Universe in motion', unlock: { type: 'purchase' } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Light Colors (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const LIGHT_COLORS: Record<string, LightColor> = {
  amber: { name: 'Amber', color: '#FFBF24', icon: '🟡', price: 0, rarity: 'common', desc: 'Warm amber glow', unlock: { type: 'default' } },
  white: { name: 'White', color: '#FFFFFF', icon: '⚪', price: 0, rarity: 'common', desc: 'Pure white light', unlock: { type: 'default' } },
  rose: { name: 'Rose', color: '#FF6B9D', icon: '🌹', price: 300, rarity: 'uncommon', desc: 'Soft rose light', unlock: { type: 'purchase' } },
  azure: { name: 'Azure', color: '#60A5FA', icon: '💙', price: 400, rarity: 'uncommon', desc: 'Sky blue glow', unlock: { type: 'purchase' } },
  emerald: { name: 'Emerald', color: '#34D399', icon: '💚', price: 400, rarity: 'uncommon', desc: 'Forest green light', unlock: { type: 'purchase' } },
  violet: { name: 'Violet', color: '#A78BFA', icon: '💜', price: 500, rarity: 'rare', desc: 'Mystical violet glow', unlock: { type: 'purchase' } },
  coral: { name: 'Coral', color: '#FB7185', icon: '🧡', price: 500, rarity: 'rare', desc: 'Warm coral light', unlock: { type: 'purchase' } },
  mint: { name: 'Mint', color: '#6EE7B7', icon: '🌿', price: 600, rarity: 'rare', desc: 'Fresh mint glow', unlock: { type: 'purchase' } },
  golden: { name: 'Golden', color: '#FFD700', icon: '⭐', price: 700, rarity: 'rare', desc: 'Royal golden light', unlock: { type: 'purchase' } },
  ice: { name: 'Ice', color: '#93C5FD', icon: '🧊', price: 700, rarity: 'rare', desc: 'Frozen blue light', unlock: { type: 'purchase' } },
  crimson: { name: 'Crimson', color: '#DC143C', icon: '🔴', price: 1000, rarity: 'rare', desc: 'Deep red glow', unlock: { type: 'purchase' } },
  cyan: { name: 'Cyan', color: '#00FFFF', icon: '💎', price: 1200, rarity: 'epic', desc: 'Electric cyan light', unlock: { type: 'purchase' } },
  magenta: { name: 'Magenta', color: '#FF00FF', icon: '💗', price: 1200, rarity: 'epic', desc: 'Vivid magenta glow', unlock: { type: 'purchase' } },
  sunburst: { name: 'Sunburst', color: '#FFD700', icon: '☀️', price: 2000, rarity: 'legendary', desc: 'Radiant solar light', animated: true, unlock: { type: 'purchase' } },
  rainbow: { name: 'Rainbow Shift', color: '#RAINBOW', icon: '🌈', price: 5000, rarity: 'legendary', desc: 'Cycles through colors', animated: true, unlock: { type: 'purchase' } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Aura Effects (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const AURA_EFFECTS: Record<string, AuraEffect> = {
  none: { name: 'None', icon: '⭕', price: 0, rarity: 'common', desc: 'No aura effect', unlock: { type: 'default' } },
  gentle: { name: 'Gentle Glow', icon: '✨', price: 500, rarity: 'uncommon', desc: 'Soft ambient glow', radius: 20, unlock: { type: 'purchase' } },
  sparkle: { name: 'Sparkle Ring', icon: '💫', price: 700, rarity: 'uncommon', desc: 'Sparkling particles', radius: 25, unlock: { type: 'purchase' } },
  radiant: { name: 'Radiant Halo', icon: '🌟', price: 1000, rarity: 'rare', desc: 'Bright halo effect', radius: 30, unlock: { type: 'purchase' } },
  flame: { name: 'Flame Aura', icon: '🔥', price: 1200, rarity: 'rare', desc: 'Flickering flames', radius: 28, unlock: { type: 'purchase' } },
  pulsing: { name: 'Pulsing Energy', icon: '💫', price: 1500, rarity: 'epic', desc: 'Rhythmic pulses', radius: 25, animated: true, unlock: { type: 'purchase' } },
  electric: { name: 'Electric Field', icon: '⚡', price: 2000, rarity: 'epic', desc: 'Lightning arcs', radius: 35, animated: true, unlock: { type: 'purchase' } },
  cosmic: { name: 'Cosmic Field', icon: '🌌', price: 2500, rarity: 'legendary', desc: 'Swirling stars', radius: 40, animated: true, unlock: { type: 'purchase' } },
  divine: { name: 'Divine Radiance', icon: '👑', price: 5000, rarity: 'legendary', desc: 'Heavenly light', radius: 50, animated: true, unlock: { type: 'purchase' } },
  // Additional aura effects
  celestial: { name: 'Celestial Halo', icon: '🌠', price: 3000, rarity: 'legendary', desc: 'Starry celestial glow', radius: 45, animated: true, unlock: { type: 'purchase' } },
  aurora: { name: 'Aurora Borealis', icon: '🌈', price: 3500, rarity: 'legendary', desc: 'Northern lights effect', radius: 50, animated: true, unlock: { type: 'purchase' } },
  galaxy: { name: 'Galaxy Spiral', icon: '🌀', price: 4000, rarity: 'legendary', desc: 'Swirling galaxy effect', radius: 55, animated: true, unlock: { type: 'purchase' } },
  phoenix: { name: 'Phoenix Wings', icon: '🦅', price: 4500, rarity: 'legendary', desc: 'Flame/ember aura effect', radius: 45, animated: true, unlock: { type: 'purchase' } },
  crystal: { name: 'Crystal Prism', icon: '💎', price: 2800, rarity: 'epic', desc: 'Crystalline sparkles', radius: 35, animated: true, unlock: { type: 'purchase' } },
  void: { name: 'Void Essence', icon: '🌑', price: 5500, rarity: 'legendary', desc: 'Dark ethereal aura', radius: 40, animated: true, unlock: { type: 'purchase' } },
  prism: { name: 'Prism Refraction', icon: '🔮', price: 3200, rarity: 'epic', desc: 'Rainbow refraction', radius: 38, animated: true, unlock: { type: 'purchase' } },
  nature: { name: 'Nature Spirit', icon: '🍃', price: 2200, rarity: 'epic', desc: 'Organic leaf effect', radius: 32, animated: true, unlock: { type: 'purchase' } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Companion Types (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompanionType {
  name: string;
  icon: string;
  unlock: string;
  requirement: string;
  color?: string;
  size?: number;
}

export const COMPANION_TYPES: Record<string, CompanionType> = {
  spark: { name: 'Spark', icon: '✨', unlock: 'fragments_15', requirement: '15 fragments', color: '#FFD700', size: 3 },
  star: { name: 'Star', icon: '⭐', unlock: 'bonds_7', requirement: '7 bonds', color: '#FF69B4', size: 4 },
  moon: { name: 'Moon', icon: '🌙', unlock: 'beacons_4', requirement: '4 beacons', color: '#87CEEB', size: 5 },
  heart: { name: 'Heart', icon: '💖', unlock: 'stars_5', requirement: '5 star memories', color: '#FF6B9D', size: 4 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Titles (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export interface Title {
  name: string;
  unlock: string;
  requirement?: string;
}

export const TITLES: Record<string, Title> = {
  wanderer: { name: 'Wanderer', unlock: 'default' },
  lightkeeper: { name: 'Lightkeeper', unlock: 'beacons_5', requirement: '5 beacons' },
  bondsoul: { name: 'Bond Soul', unlock: 'bonds_10', requirement: '10 bonds' },
  starweaver: { name: 'Starweaver', unlock: 'stars_10', requirement: '10 star memories' },
  collector: { name: 'Collector', unlock: 'fragments_50', requirement: '50 fragments' },
  guide: { name: 'Guide', unlock: 'gifts_25', requirement: '25 light gifted' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Ladder Tiers (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const LADDER_TIERS = [
  { name: 'Spark', min: 0, color: '#9CA3AF', icon: '🕯️' },
  { name: 'Ember', min: 100, color: '#FB923C', icon: '🔥' },
  { name: 'Flame', min: 250, color: '#F59E0B', icon: '🌟' },
  { name: 'Radiance', min: 500, color: '#FBBF24', icon: '✨' },
  { name: 'Beacon', min: 1000, color: '#60A5FA', icon: '💫' },
  { name: 'Luminary', min: 2000, color: '#A78BFA', icon: '🌠' },
  { name: 'Celestial', min: 5000, color: '#C084FC', icon: '🌌' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Rarity Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function getRarityColor(rarity: Rarity): string {
  switch (rarity) {
    case 'common': return 'text-gray-400';
    case 'uncommon': return 'text-green-400';
    case 'rare': return 'text-blue-400';
    case 'epic': return 'text-purple-400';
    case 'legendary': return 'text-amber-400';
    default: return 'text-white';
  }
}

export function getRarityBorder(rarity: Rarity): string {
  switch (rarity) {
    case 'common': return 'border-gray-500/30';
    case 'uncommon': return 'border-green-500/30';
    case 'rare': return 'border-blue-500/30';
    case 'epic': return 'border-purple-500/30';
    case 'legendary': return 'border-amber-500/50';
    default: return 'border-white/20';
  }
}

export function getRarityBackground(rarity: Rarity): string {
  switch (rarity) {
    case 'common': return 'bg-gray-500/10';
    case 'uncommon': return 'bg-green-500/10';
    case 'rare': return 'bg-blue-500/10';
    case 'epic': return 'bg-purple-500/10';
    case 'legendary': return 'bg-amber-500/20';
    default: return 'bg-white/5';
  }
}

/**
 * Get hex color for rarity (for canvas/non-Tailwind rendering)
 */
export function getRarityHexColor(rarity: Rarity): string {
  switch (rarity) {
    case 'common': return '#9CA3AF';
    case 'uncommon': return '#34D399';
    case 'rare': return '#60A5FA';
    case 'epic': return '#A78BFA';
    case 'legendary': return '#F97316';
    default: return '#FFFFFF';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sound Packs (Batch 2: Personalization)
// ─────────────────────────────────────────────────────────────────────────────

export interface SoundPack {
  name: string;
  icon: string;
  price: number;
  rarity: Rarity;
  desc: string;
  sounds: {
    fragment: { type: OscillatorType; freq: number; duration: number };
    collect: { type: OscillatorType; freq: number; duration: number };
    levelUp: { type: OscillatorType; freq: number; duration: number };
    click: { type: OscillatorType; freq: number; duration: number };
  };
  unlock: { type: string; value?: number | string };
}

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export const SOUND_PACKS: Record<string, SoundPack> = {
  default: {
    name: 'Classic',
    icon: '🔔',
    price: 0,
    rarity: 'common',
    desc: 'Original sound effects',
    sounds: {
      fragment: { type: 'sine', freq: 880, duration: 0.15 },
      collect: { type: 'sine', freq: 1200, duration: 0.1 },
      levelUp: { type: 'triangle', freq: 523.25, duration: 0.4 },
      click: { type: 'square', freq: 1000, duration: 0.05 },
    },
    unlock: { type: 'default' },
  },
  chime: {
    name: 'Crystal Chime',
    icon: '🔮',
    price: 200,
    rarity: 'uncommon',
    desc: 'Delicate crystalline tones',
    sounds: {
      fragment: { type: 'sine', freq: 1400, duration: 0.2 },
      collect: { type: 'sine', freq: 1800, duration: 0.12 },
      levelUp: { type: 'sine', freq: 698.46, duration: 0.5 },
      click: { type: 'sine', freq: 1200, duration: 0.04 },
    },
    unlock: { type: 'purchase' },
  },
  retro: {
    name: 'Retro 8-Bit',
    icon: '🎮',
    price: 300,
    rarity: 'uncommon',
    desc: 'Classic game sounds',
    sounds: {
      fragment: { type: 'square', freq: 660, duration: 0.1 },
      collect: { type: 'square', freq: 880, duration: 0.08 },
      levelUp: { type: 'square', freq: 440, duration: 0.3 },
      click: { type: 'square', freq: 1320, duration: 0.03 },
    },
    unlock: { type: 'purchase' },
  },
  nature: {
    name: 'Forest',
    icon: '🌲',
    price: 350,
    rarity: 'rare',
    desc: 'Organic nature sounds',
    sounds: {
      fragment: { type: 'triangle', freq: 600, duration: 0.25 },
      collect: { type: 'triangle', freq: 800, duration: 0.15 },
      levelUp: { type: 'triangle', freq: 392, duration: 0.6 },
      click: { type: 'triangle', freq: 700, duration: 0.06 },
    },
    unlock: { type: 'purchase' },
  },
  cosmic: {
    name: 'Cosmic',
    icon: '🌌',
    price: 500,
    rarity: 'rare',
    desc: 'Deep space resonance',
    sounds: {
      fragment: { type: 'sine', freq: 440, duration: 0.3 },
      collect: { type: 'sine', freq: 550, duration: 0.2 },
      levelUp: { type: 'sine', freq: 329.63, duration: 0.7 },
      click: { type: 'sine', freq: 600, duration: 0.08 },
    },
    unlock: { type: 'purchase' },
  },
  electric: {
    name: 'Electric',
    icon: '⚡',
    price: 600,
    rarity: 'epic',
    desc: 'High energy electric buzz',
    sounds: {
      fragment: { type: 'sawtooth', freq: 1000, duration: 0.12 },
      collect: { type: 'sawtooth', freq: 1500, duration: 0.08 },
      levelUp: { type: 'sawtooth', freq: 587.33, duration: 0.35 },
      click: { type: 'sawtooth', freq: 1800, duration: 0.03 },
    },
    unlock: { type: 'purchase' },
  },
  ethereal: {
    name: 'Ethereal',
    icon: '👻',
    price: 800,
    rarity: 'epic',
    desc: 'Ghostly whispers',
    sounds: {
      fragment: { type: 'sine', freq: 350, duration: 0.4 },
      collect: { type: 'sine', freq: 450, duration: 0.25 },
      levelUp: { type: 'sine', freq: 261.63, duration: 0.8 },
      click: { type: 'sine', freq: 400, duration: 0.1 },
    },
    unlock: { type: 'purchase' },
  },
  celestial: {
    name: 'Celestial',
    icon: '✨',
    price: 0,
    rarity: 'legendary',
    desc: 'Heavenly choir',
    sounds: {
      fragment: { type: 'sine', freq: 784, duration: 0.35 },
      collect: { type: 'sine', freq: 988, duration: 0.2 },
      levelUp: { type: 'triangle', freq: 523.25, duration: 0.9 },
      click: { type: 'sine', freq: 880, duration: 0.07 },
    },
    unlock: { type: 'level', value: 30 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Frames (Batch 2: Personalization)
// ─────────────────────────────────────────────────────────────────────────────

export interface AvatarFrame {
  name: string;
  icon: string;
  price: number;
  rarity: Rarity;
  desc: string;
  borderColor: string;
  borderWidth: number;
  glowColor?: string;
  animated?: boolean;
  unlock: { type: string; value?: number | string };
  requirement?: string;
}

export const AVATAR_FRAMES: Record<string, AvatarFrame> = {
  none: {
    name: 'None',
    icon: '⚫',
    price: 0,
    rarity: 'common',
    desc: 'No frame',
    borderColor: 'transparent',
    borderWidth: 0,
    unlock: { type: 'default' },
  },
  simple: {
    name: 'Simple',
    icon: '⭕',
    price: 100,
    rarity: 'common',
    desc: 'Clean white border',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    unlock: { type: 'purchase' },
  },
  golden: {
    name: 'Golden',
    icon: '🟡',
    price: 300,
    rarity: 'uncommon',
    desc: 'Prestigious gold frame',
    borderColor: '#FFD700',
    borderWidth: 3,
    glowColor: 'rgba(255, 215, 0, 0.3)',
    unlock: { type: 'purchase' },
  },
  rose: {
    name: 'Rose',
    icon: '🌹',
    price: 350,
    rarity: 'uncommon',
    desc: 'Romantic pink frame',
    borderColor: '#FF69B4',
    borderWidth: 3,
    glowColor: 'rgba(255, 105, 180, 0.3)',
    unlock: { type: 'purchase' },
  },
  ocean: {
    name: 'Ocean',
    icon: '🌊',
    price: 400,
    rarity: 'rare',
    desc: 'Deep sea blue frame',
    borderColor: '#00CED1',
    borderWidth: 3,
    glowColor: 'rgba(0, 206, 209, 0.3)',
    unlock: { type: 'purchase' },
  },
  emerald: {
    name: 'Emerald',
    icon: '💚',
    price: 400,
    rarity: 'rare',
    desc: 'Nature\'s embrace',
    borderColor: '#50C878',
    borderWidth: 3,
    glowColor: 'rgba(80, 200, 120, 0.3)',
    unlock: { type: 'purchase' },
  },
  flame: {
    name: 'Flame',
    icon: '🔥',
    price: 500,
    rarity: 'rare',
    desc: 'Burning ember frame',
    borderColor: '#FF6B35',
    borderWidth: 4,
    glowColor: 'rgba(255, 107, 53, 0.4)',
    animated: true,
    unlock: { type: 'purchase' },
  },
  frost: {
    name: 'Frost',
    icon: '❄️',
    price: 500,
    rarity: 'rare',
    desc: 'Icy crystal frame',
    borderColor: '#E0FFFF',
    borderWidth: 4,
    glowColor: 'rgba(224, 255, 255, 0.4)',
    animated: true,
    unlock: { type: 'purchase' },
  },
  cosmic: {
    name: 'Cosmic',
    icon: '🌌',
    price: 750,
    rarity: 'epic',
    desc: 'Galaxy swirl frame',
    borderColor: '#E040FB',
    borderWidth: 4,
    glowColor: 'rgba(224, 64, 251, 0.5)',
    animated: true,
    unlock: { type: 'purchase' },
  },
  celestial: {
    name: 'Celestial',
    icon: '⭐',
    price: 1000,
    rarity: 'epic',
    desc: 'Orbiting stars frame',
    borderColor: '#FFEB3B',
    borderWidth: 5,
    glowColor: 'rgba(255, 235, 59, 0.5)',
    animated: true,
    unlock: { type: 'purchase' },
  },
  legendary: {
    name: 'Legendary',
    icon: '👑',
    price: 0,
    rarity: 'legendary',
    desc: 'Crown of glory',
    borderColor: '#FFD700',
    borderWidth: 5,
    glowColor: 'rgba(255, 215, 0, 0.6)',
    animated: true,
    unlock: { type: 'level', value: 50 },
    requirement: 'Reach Level 50',
  },
  starkeeper: {
    name: 'Starkeeper',
    icon: '🌟',
    price: 0,
    rarity: 'legendary',
    desc: 'For those who seal star memories',
    borderColor: '#E040FB',
    borderWidth: 5,
    glowColor: 'rgba(224, 64, 251, 0.6)',
    animated: true,
    unlock: { type: 'stars', value: 10 },
    requirement: 'Seal 10 star memories',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Cores (per lumina-viral-bible.md Section 7.1)
// ─────────────────────────────────────────────────────────────────────────────

export interface AvatarCore {
  id: string;
  name: string;
  icon: string;
  price: number;
  rarity: Rarity;
  desc: string;
  shape: string;
  glowIntensity: number; // 0.5 to 2.0
  unlock: { type: 'default' | 'purchase' | 'level' | 'achievement'; value?: number | string };
  requirement?: string;
}

export const AVATAR_CORES: Record<string, AvatarCore> = {
  classic_orb: {
    id: 'classic_orb',
    name: 'Classic Orb',
    icon: '⚪',
    price: 0,
    rarity: 'common',
    desc: 'The original light form',
    shape: 'circle',
    glowIntensity: 1.0,
    unlock: { type: 'default' },
  },
  pointed_star: {
    id: 'pointed_star',
    name: 'Pointed Star',
    icon: '⭐',
    price: 500,
    rarity: 'uncommon',
    desc: 'A sharp celestial form',
    shape: 'star-5',
    glowIntensity: 1.2,
    unlock: { type: 'purchase' },
  },
  rounded_diamond: {
    id: 'rounded_diamond',
    name: 'Rounded Diamond',
    icon: '💎',
    price: 600,
    rarity: 'uncommon',
    desc: 'Elegant diamond shape',
    shape: 'diamond-rounded',
    glowIntensity: 1.1,
    unlock: { type: 'purchase' },
  },
  geometric_crystal: {
    id: 'geometric_crystal',
    name: 'Geometric Crystal',
    icon: '🔷',
    price: 800,
    rarity: 'rare',
    desc: 'Angular crystalline form',
    shape: 'hexagon',
    glowIntensity: 1.3,
    unlock: { type: 'purchase' },
  },
  flowing_flame: {
    id: 'flowing_flame',
    name: 'Flowing Flame',
    icon: '🔥',
    price: 1000,
    rarity: 'rare',
    desc: 'Dynamic fire essence',
    shape: 'flame',
    glowIntensity: 1.5,
    unlock: { type: 'purchase' },
  },
  water_droplet: {
    id: 'water_droplet',
    name: 'Water Droplet',
    icon: '💧',
    price: 1000,
    rarity: 'rare',
    desc: 'Serene aqua form',
    shape: 'droplet',
    glowIntensity: 1.2,
    unlock: { type: 'purchase' },
  },
  celestial_being: {
    id: 'celestial_being',
    name: 'Celestial Being',
    icon: '👼',
    price: 2000,
    rarity: 'epic',
    desc: 'Ethereal angelic form',
    shape: 'celestial',
    glowIntensity: 1.8,
    unlock: { type: 'purchase' },
  },
  abstract_form: {
    id: 'abstract_form',
    name: 'Abstract Form',
    icon: '🌀',
    price: 1500,
    rarity: 'epic',
    desc: 'Mysterious shifting shape',
    shape: 'abstract',
    glowIntensity: 1.4,
    unlock: { type: 'purchase' },
  },
  void_sphere: {
    id: 'void_sphere',
    name: 'Void Sphere',
    icon: '🌑',
    price: 3000,
    rarity: 'legendary',
    desc: 'Dark matter essence',
    shape: 'void',
    glowIntensity: 0.8,
    unlock: { type: 'purchase' },
  },
  phoenix_core: {
    id: 'phoenix_core',
    name: 'Phoenix Core',
    icon: '🦅',
    price: 5000,
    rarity: 'legendary',
    desc: 'Reborn from eternal flames',
    shape: 'phoenix',
    glowIntensity: 2.0,
    unlock: { type: 'level', value: 40 },
    requirement: 'Reach Level 40',
  },
  cosmic_heart: {
    id: 'cosmic_heart',
    name: 'Cosmic Heart',
    icon: '💜',
    price: 0,
    rarity: 'legendary',
    desc: 'Heart of the universe',
    shape: 'heart-cosmic',
    glowIntensity: 1.9,
    unlock: { type: 'achievement', value: 'sealed_100_bonds' },
    requirement: 'Seal 100 bonds',
  },
  prism_core: {
    id: 'prism_core',
    name: 'Prism Core',
    icon: '🔮',
    price: 4000,
    rarity: 'legendary',
    desc: 'Refracts all light',
    shape: 'prism',
    glowIntensity: 1.7,
    unlock: { type: 'purchase' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Sizes (per lumina-viral-bible.md Section 7.1)
// ─────────────────────────────────────────────────────────────────────────────

export interface AvatarSize {
  id: string;
  name: string;
  desc: string;
  scale: number; // Multiplier from base size
  hitboxScale: number; // Hitbox multiplier (may differ from visual)
  price: number;
  rarity: Rarity;
  unlock: { type: 'default' | 'purchase' | 'level'; value?: number };
}

export const AVATAR_SIZES: Record<string, AvatarSize> = {
  petite: {
    id: 'petite',
    name: 'Petite',
    desc: 'Small and nimble',
    scale: 0.7,
    hitboxScale: 0.8,
    price: 500,
    rarity: 'uncommon',
    unlock: { type: 'purchase' },
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    desc: 'The classic size',
    scale: 1.0,
    hitboxScale: 1.0,
    price: 0,
    rarity: 'common',
    unlock: { type: 'default' },
  },
  imposing: {
    id: 'imposing',
    name: 'Imposing',
    desc: 'Large and noticeable',
    scale: 1.3,
    hitboxScale: 1.2,
    price: 800,
    rarity: 'rare',
    unlock: { type: 'purchase' },
  },
  majestic: {
    id: 'majestic',
    name: 'Majestic',
    desc: 'Extra large and grand',
    scale: 1.6,
    hitboxScale: 1.4,
    price: 1500,
    rarity: 'epic',
    unlock: { type: 'level', value: 25 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Head Items (per lumina-viral-bible.md Section 7.1)
// ─────────────────────────────────────────────────────────────────────────────

export interface AvatarHeadItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  rarity: Rarity;
  desc: string;
  position: 'top' | 'side' | 'back';
  animated?: boolean;
  unlock: { type: 'default' | 'purchase' | 'level' | 'achievement'; value?: number | string };
}

export const AVATAR_HEAD_ITEMS: Record<string, AvatarHeadItem> = {
  none: {
    id: 'none',
    name: 'None',
    icon: '⭕',
    price: 0,
    rarity: 'common',
    desc: 'No head item',
    position: 'top',
    unlock: { type: 'default' },
  },
  halo_gold: {
    id: 'halo_gold',
    name: 'Golden Halo',
    icon: '😇',
    price: 800,
    rarity: 'rare',
    desc: 'Classic angelic halo',
    position: 'top',
    animated: true,
    unlock: { type: 'purchase' },
  },
  halo_silver: {
    id: 'halo_silver',
    name: 'Silver Halo',
    icon: '👼',
    price: 600,
    rarity: 'uncommon',
    desc: 'Subtle silver ring',
    position: 'top',
    unlock: { type: 'purchase' },
  },
  crown_royal: {
    id: 'crown_royal',
    name: 'Royal Crown',
    icon: '👑',
    price: 2000,
    rarity: 'legendary',
    desc: 'Fit for royalty',
    position: 'top',
    animated: true,
    unlock: { type: 'purchase' },
  },
  crown_flower: {
    id: 'crown_flower',
    name: 'Flower Crown',
    icon: '💐',
    price: 500,
    rarity: 'uncommon',
    desc: 'Beautiful floral wreath',
    position: 'top',
    unlock: { type: 'purchase' },
  },
  horns_demon: {
    id: 'horns_demon',
    name: 'Demon Horns',
    icon: '😈',
    price: 700,
    rarity: 'rare',
    desc: 'Devilish curved horns',
    position: 'side',
    unlock: { type: 'purchase' },
  },
  horns_elegant: {
    id: 'horns_elegant',
    name: 'Elegant Horns',
    icon: '🦌',
    price: 900,
    rarity: 'rare',
    desc: 'Graceful antler-style',
    position: 'side',
    unlock: { type: 'purchase' },
  },
  wings_small: {
    id: 'wings_small',
    name: 'Tiny Wings',
    icon: '🕊️',
    price: 1000,
    rarity: 'epic',
    desc: 'Cute small wings',
    position: 'back',
    animated: true,
    unlock: { type: 'purchase' },
  },
  wings_butterfly: {
    id: 'wings_butterfly',
    name: 'Butterfly Wings',
    icon: '🦋',
    price: 1200,
    rarity: 'epic',
    desc: 'Colorful butterfly wings',
    position: 'back',
    animated: true,
    unlock: { type: 'purchase' },
  },
  antennae: {
    id: 'antennae',
    name: 'Antennae',
    icon: '🐛',
    price: 400,
    rarity: 'uncommon',
    desc: 'Cute bug antennae',
    position: 'top',
    animated: true,
    unlock: { type: 'purchase' },
  },
  ears_cat: {
    id: 'ears_cat',
    name: 'Cat Ears',
    icon: '🐱',
    price: 500,
    rarity: 'uncommon',
    desc: 'Adorable cat ears',
    position: 'top',
    unlock: { type: 'purchase' },
  },
  ears_bunny: {
    id: 'ears_bunny',
    name: 'Bunny Ears',
    icon: '🐰',
    price: 500,
    rarity: 'uncommon',
    desc: 'Floppy bunny ears',
    position: 'top',
    unlock: { type: 'purchase' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Orbiting Items (per lumina-viral-bible.md Section 7.1)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrbitingItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  rarity: Rarity;
  desc: string;
  orbitSpeed: number; // Rotations per second
  orbitDistance: number; // Pixels from center
  count: number; // Number of orbiting objects
  unlock: { type: 'default' | 'purchase' | 'level' | 'achievement'; value?: number | string };
}

export const ORBITING_ITEMS: Record<string, OrbitingItem> = {
  none: {
    id: 'none',
    name: 'None',
    icon: '⭕',
    price: 0,
    rarity: 'common',
    desc: 'No orbiting items',
    orbitSpeed: 0,
    orbitDistance: 0,
    count: 0,
    unlock: { type: 'default' },
  },
  moon_companions: {
    id: 'moon_companions',
    name: 'Moon Companions',
    icon: '🌙',
    price: 800,
    rarity: 'rare',
    desc: 'Tiny moons orbit you',
    orbitSpeed: 0.3,
    orbitDistance: 40,
    count: 3,
    unlock: { type: 'purchase' },
  },
  star_trails: {
    id: 'star_trails',
    name: 'Star Trails',
    icon: '⭐',
    price: 600,
    rarity: 'uncommon',
    desc: 'Twinkling star followers',
    orbitSpeed: 0.5,
    orbitDistance: 35,
    count: 5,
    unlock: { type: 'purchase' },
  },
  sparkle_rings: {
    id: 'sparkle_rings',
    name: 'Sparkle Rings',
    icon: '💫',
    price: 700,
    rarity: 'rare',
    desc: 'Sparkling ring system',
    orbitSpeed: 0.4,
    orbitDistance: 45,
    count: 2,
    unlock: { type: 'purchase' },
  },
  pet_orbs: {
    id: 'pet_orbs',
    name: 'Pet Orbs',
    icon: '🔮',
    price: 1000,
    rarity: 'epic',
    desc: 'Cute glowing companions',
    orbitSpeed: 0.25,
    orbitDistance: 50,
    count: 2,
    unlock: { type: 'purchase' },
  },
  symbol_totems: {
    id: 'symbol_totems',
    name: 'Symbol Totems',
    icon: '🔱',
    price: 1200,
    rarity: 'epic',
    desc: 'Ancient symbol totems',
    orbitSpeed: 0.2,
    orbitDistance: 55,
    count: 3,
    unlock: { type: 'purchase' },
  },
  elemental_wisps: {
    id: 'elemental_wisps',
    name: 'Elemental Wisps',
    icon: '🔥',
    price: 1500,
    rarity: 'epic',
    desc: 'Fire, water, earth, air',
    orbitSpeed: 0.35,
    orbitDistance: 45,
    count: 4,
    unlock: { type: 'purchase' },
  },
  cosmic_dust: {
    id: 'cosmic_dust',
    name: 'Cosmic Dust',
    icon: '✨',
    price: 2000,
    rarity: 'legendary',
    desc: 'Stardust particles',
    orbitSpeed: 0.6,
    orbitDistance: 60,
    count: 10,
    unlock: { type: 'purchase' },
  },
  heart_swarm: {
    id: 'heart_swarm',
    name: 'Heart Swarm',
    icon: '💕',
    price: 0,
    rarity: 'legendary',
    desc: 'Floating hearts of love',
    orbitSpeed: 0.4,
    orbitDistance: 40,
    count: 6,
    unlock: { type: 'achievement', value: 'sealed_50_bonds' },
  },
};
