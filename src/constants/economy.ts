// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Economy Constants (Premium Currency & Mystery Boxes)
// ═══════════════════════════════════════════════════════════════════════════
// Per lumina-viral-bible.md Sections 6.2 and 9.6

import type { Rarity } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Premium Currency: Cosmic Crystals
// ─────────────────────────────────────────────────────────────────────────────

export interface CrystalPackage {
  id: string;
  crystals: number;
  bonusCrystals: number;
  priceUSD: number;
  popular?: boolean;
  bestValue?: boolean;
}

export const CRYSTAL_PACKAGES: CrystalPackage[] = [
  { id: 'starter', crystals: 100, bonusCrystals: 0, priceUSD: 0.99 },
  { id: 'small', crystals: 500, bonusCrystals: 50, priceUSD: 4.99 },
  { id: 'medium', crystals: 1200, bonusCrystals: 200, priceUSD: 9.99, popular: true },
  { id: 'large', crystals: 2800, bonusCrystals: 600, priceUSD: 19.99 },
  { id: 'jumbo', crystals: 6500, bonusCrystals: 1800, priceUSD: 49.99, bestValue: true },
  { id: 'mega', crystals: 14000, bonusCrystals: 5000, priceUSD: 99.99 },
];

export interface CrystalPurchaseOption {
  id: string;
  name: string;
  description: string;
  crystalCost: number;
  category: 'cosmetic' | 'boost' | 'convenience' | 'pass';
}

export const CRYSTAL_PURCHASES: CrystalPurchaseOption[] = [
  // Season Pass
  { id: 'premium_pass', name: 'Premium Season Pass', description: 'Unlock premium season rewards', crystalCost: 950, category: 'pass' },
  
  // Boosts
  { id: 'xp_boost_1h', name: '1 Hour XP Boost', description: '2x XP for 1 hour', crystalCost: 50, category: 'boost' },
  { id: 'xp_boost_24h', name: '24 Hour XP Boost', description: '2x XP for 24 hours', crystalCost: 200, category: 'boost' },
  { id: 'stardust_boost_1h', name: '1 Hour Stardust Boost', description: '2x Stardust for 1 hour', crystalCost: 75, category: 'boost' },
  { id: 'stardust_boost_24h', name: '24 Hour Stardust Boost', description: '2x Stardust for 24 hours', crystalCost: 250, category: 'boost' },
  
  // Convenience
  { id: 'streak_freeze', name: 'Streak Freeze', description: 'Protect your streak for 1 day', crystalCost: 100, category: 'convenience' },
  { id: 'streak_recovery', name: 'Streak Recovery', description: 'Restore a lost streak', crystalCost: 300, category: 'convenience' },
  { id: 'extra_challenge_slot', name: 'Extra Challenge Slot', description: 'One additional daily challenge', crystalCost: 150, category: 'convenience' },
  { id: 'instant_bond', name: 'Instant Bond Level', description: 'Skip one bond level requirement', crystalCost: 500, category: 'convenience' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mystery Boxes (per Section 9.6)
// ─────────────────────────────────────────────────────────────────────────────

export type MysteryBoxTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface MysteryBoxReward {
  type: 'stardust' | 'crystals' | 'cosmetic' | 'title' | 'xp_boost' | 'emote';
  rarity: Rarity;
  value: number | string;
  weight: number; // Drop weight (higher = more common)
}

export interface MysteryBoxConfig {
  id: MysteryBoxTier;
  name: string;
  icon: string;
  description: string;
  stardustCost: number;
  crystalCost?: number;
  rewards: MysteryBoxReward[];
  guaranteedRarity?: Rarity; // Minimum rarity guaranteed
}

export const MYSTERY_BOXES: Record<MysteryBoxTier, MysteryBoxConfig> = {
  common: {
    id: 'common',
    name: 'Common Lumina Box',
    icon: '📦',
    description: 'A humble box of surprises',
    stardustCost: 500,
    rewards: [
      { type: 'stardust', rarity: 'common', value: 100, weight: 40 },
      { type: 'stardust', rarity: 'common', value: 200, weight: 25 },
      { type: 'xp_boost', rarity: 'common', value: 'xp_boost_30m', weight: 20 },
      { type: 'cosmetic', rarity: 'uncommon', value: 'random_common_trail', weight: 10 },
      { type: 'emote', rarity: 'uncommon', value: 'random_common_emote', weight: 5 },
    ],
  },
  rare: {
    id: 'rare',
    name: 'Rare Lumina Box',
    icon: '🎁',
    description: 'Better treasures await inside',
    stardustCost: 1500,
    rewards: [
      { type: 'stardust', rarity: 'common', value: 300, weight: 30 },
      { type: 'stardust', rarity: 'uncommon', value: 500, weight: 20 },
      { type: 'xp_boost', rarity: 'uncommon', value: 'xp_boost_1h', weight: 20 },
      { type: 'cosmetic', rarity: 'rare', value: 'random_rare_cosmetic', weight: 15 },
      { type: 'emote', rarity: 'rare', value: 'random_rare_emote', weight: 10 },
      { type: 'crystals', rarity: 'rare', value: 50, weight: 5 },
    ],
    guaranteedRarity: 'uncommon',
  },
  epic: {
    id: 'epic',
    name: 'Epic Lumina Box',
    icon: '💎',
    description: 'Valuable rewards guaranteed',
    stardustCost: 5000,
    crystalCost: 250,
    rewards: [
      { type: 'stardust', rarity: 'uncommon', value: 750, weight: 25 },
      { type: 'stardust', rarity: 'rare', value: 1000, weight: 15 },
      { type: 'cosmetic', rarity: 'epic', value: 'random_epic_cosmetic', weight: 25 },
      { type: 'emote', rarity: 'epic', value: 'random_epic_emote', weight: 15 },
      { type: 'crystals', rarity: 'epic', value: 100, weight: 10 },
      { type: 'title', rarity: 'epic', value: 'random_epic_title', weight: 10 },
    ],
    guaranteedRarity: 'rare',
  },
  legendary: {
    id: 'legendary',
    name: 'Legendary Lumina Box',
    icon: '👑',
    description: 'Only the finest treasures',
    stardustCost: 15000,
    crystalCost: 750,
    rewards: [
      { type: 'stardust', rarity: 'rare', value: 2000, weight: 20 },
      { type: 'cosmetic', rarity: 'legendary', value: 'random_legendary_cosmetic', weight: 30 },
      { type: 'emote', rarity: 'legendary', value: 'random_legendary_emote', weight: 15 },
      { type: 'crystals', rarity: 'legendary', value: 300, weight: 15 },
      { type: 'title', rarity: 'legendary', value: 'random_legendary_title', weight: 15 },
      { type: 'cosmetic', rarity: 'legendary', value: 'legendary_set_piece', weight: 5 },
    ],
    guaranteedRarity: 'epic',
  },
  mythic: {
    id: 'mythic',
    name: 'Mythic Lumina Box',
    icon: '🌟',
    description: 'The rarest treasures in all of Lumina',
    crystalCost: 2000,
    stardustCost: 0, // Crystal-only
    rewards: [
      { type: 'cosmetic', rarity: 'legendary', value: 'random_mythic_cosmetic', weight: 35 },
      { type: 'crystals', rarity: 'legendary', value: 500, weight: 20 },
      { type: 'title', rarity: 'legendary', value: 'mythic_title', weight: 15 },
      { type: 'cosmetic', rarity: 'legendary', value: 'complete_mythic_set', weight: 10 },
      { type: 'cosmetic', rarity: 'legendary', value: 'exclusive_mythic_aura', weight: 10 },
      { type: 'crystals', rarity: 'legendary', value: 1000, weight: 10 },
    ],
    guaranteedRarity: 'legendary',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pity System
// ─────────────────────────────────────────────────────────────────────────────

export interface PitySystem {
  boxType: MysteryBoxTier;
  pityThreshold: number; // Opens before guaranteed epic+
  guaranteedRarity: Rarity;
}

export const PITY_SYSTEM: PitySystem[] = [
  { boxType: 'common', pityThreshold: 10, guaranteedRarity: 'rare' },
  { boxType: 'rare', pityThreshold: 15, guaranteedRarity: 'epic' },
  { boxType: 'epic', pityThreshold: 20, guaranteedRarity: 'legendary' },
  { boxType: 'legendary', pityThreshold: 10, guaranteedRarity: 'legendary' },
  { boxType: 'mythic', pityThreshold: 5, guaranteedRarity: 'legendary' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Bundle Deals
// ─────────────────────────────────────────────────────────────────────────────

export interface BundleDeal {
  id: string;
  name: string;
  description: string;
  contents: {
    crystals?: number;
    stardust?: number;
    boxes?: { tier: MysteryBoxTier; count: number }[];
    cosmetics?: string[];
    boosts?: string[];
  };
  crystalCost: number;
  originalValue: number; // For showing discount
  available: 'always' | 'limited' | 'seasonal';
  endDate?: number;
}

export const BUNDLE_DEALS: BundleDeal[] = [
  {
    id: 'starter_bundle',
    name: 'Starter Bundle',
    description: 'Perfect for new players!',
    contents: {
      crystals: 200,
      stardust: 5000,
      boxes: [{ tier: 'rare', count: 3 }],
    },
    crystalCost: 500,
    originalValue: 800,
    available: 'always',
  },
  {
    id: 'collector_bundle',
    name: 'Collector\'s Bundle',
    description: 'For serious collectors',
    contents: {
      boxes: [
        { tier: 'epic', count: 2 },
        { tier: 'legendary', count: 1 },
      ],
      cosmetics: ['exclusive_collector_frame'],
    },
    crystalCost: 1500,
    originalValue: 2250,
    available: 'limited',
  },
  {
    id: 'premium_bundle',
    name: 'Premium Bundle',
    description: 'Everything you need',
    contents: {
      crystals: 500,
      stardust: 10000,
      boxes: [
        { tier: 'rare', count: 5 },
        { tier: 'epic', count: 3 },
      ],
      boosts: ['xp_boost_24h', 'stardust_boost_24h'],
    },
    crystalCost: 2000,
    originalValue: 3500,
    available: 'always',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getRandomBoxReward(boxTier: MysteryBoxTier): MysteryBoxReward {
  const box = MYSTERY_BOXES[boxTier];
  const totalWeight = box.rewards.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const reward of box.rewards) {
    random -= reward.weight;
    if (random <= 0) {
      return reward;
    }
  }
  
  return box.rewards[0]; // Fallback
}

export function getCrystalPackageById(id: string): CrystalPackage | undefined {
  return CRYSTAL_PACKAGES.find(p => p.id === id);
}

export function calculateBundleDiscount(bundle: BundleDeal): number {
  return Math.round((1 - bundle.crystalCost / bundle.originalValue) * 100);
}
