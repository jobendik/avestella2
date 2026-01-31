// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Progression Constants
// ═══════════════════════════════════════════════════════════════════════════

import type {
  DailyReward,
  SeasonReward,
  LadderTier,
  TutorialStep
} from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// XP & Leveling
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_XP_TO_LEVEL = 100;
export const XP_MULTIPLIER = 1.15;
export const MAX_LEVEL = 100;

export function getXPForLevel(level: number): number {
  return Math.floor(BASE_XP_TO_LEVEL * Math.pow(XP_MULTIPLIER, level - 1));
}

export function getLevelFromTotalXP(totalXP: number): number {
  let level = 1;
  let xpNeeded = 0;
  while (level < MAX_LEVEL) {
    xpNeeded += getXPForLevel(level);
    if (totalXP < xpNeeded) break;
    level++;
  }
  return level;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stardust Rewards
// ─────────────────────────────────────────────────────────────────────────────

export const STARDUST_PER_LEVEL = 50;
export const MILESTONE_LEVELS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
export const MILESTONE_BONUS = 200;

export const MILESTONE_LEVEL_NAMES: Record<number, string> = {
  5: 'Novice Trail',
  10: 'Journeyman Aura',
  15: 'Adept Color',
  20: 'Expert Companion',
  25: 'Master Title',
  30: 'Grandmaster Badge',
  40: 'Legend Frame',
  50: 'Celestial Crown',
};

// ─────────────────────────────────────────────────────────────────────────────
// Daily Login Rewards (30-day cycle)
// ─────────────────────────────────────────────────────────────────────────────

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, type: 'stardust', amount: 50, name: 'Welcome Back!', icon: '✨' },
  { day: 2, type: 'stardust', amount: 75, name: 'Day 2 Bonus', icon: '✨' },
  { day: 3, type: 'xp', amount: 100, name: 'XP Boost', icon: '⭐' },
  { day: 4, type: 'stardust', amount: 100, name: 'Growing Light', icon: '✨' },
  { day: 5, type: 'trail', amount: 0, name: 'Sparkle Trail', icon: '💫' },
  { day: 6, type: 'stardust', amount: 125, name: 'Dedication', icon: '✨' },
  { day: 7, type: 'special', name: 'Weekly Chest', icon: '🎁', rewards: { stardust: 200, xp: 150 } },
  { day: 8, type: 'stardust', amount: 100, name: 'New Week', icon: '✨' },
  { day: 9, type: 'xp', amount: 150, name: 'XP Surge', icon: '⭐' },
  { day: 10, type: 'color', amount: 0, name: 'Cosmic Blue', icon: '🎨' },
  { day: 11, type: 'stardust', amount: 150, name: 'Steadfast', icon: '✨' },
  { day: 12, type: 'stardust', amount: 175, name: 'Committed', icon: '✨' },
  { day: 13, type: 'xp', amount: 200, name: 'XP Overflow', icon: '⭐' },
  { day: 14, type: 'special', name: 'Biweekly Chest', icon: '🎁', rewards: { stardust: 350, xp: 250 } },
  { day: 15, type: 'aura', amount: 0, name: 'Gentle Glow', icon: '💠' },
  { day: 16, type: 'stardust', amount: 200, name: 'Halfway There', icon: '✨' },
  { day: 17, type: 'stardust', amount: 225, name: 'Perseverance', icon: '✨' },
  { day: 18, type: 'xp', amount: 250, name: 'XP Mastery', icon: '⭐' },
  { day: 19, type: 'stardust', amount: 250, name: 'Loyal Soul', icon: '✨' },
  { day: 20, type: 'companion', amount: 0, name: 'Wisp Friend', icon: '🌟' },
  { day: 21, type: 'special', name: 'Third Week Chest', icon: '🎁', rewards: { stardust: 500, xp: 350 } },
  { day: 22, type: 'stardust', amount: 275, name: 'Final Stretch', icon: '✨' },
  { day: 23, type: 'stardust', amount: 300, name: 'Almost There', icon: '✨' },
  { day: 24, type: 'xp', amount: 300, name: 'XP Supreme', icon: '⭐' },
  { day: 25, type: 'stardust', amount: 325, name: 'Dedication', icon: '✨' },
  { day: 26, type: 'stardust', amount: 350, name: 'Radiant Soul', icon: '✨' },
  { day: 27, type: 'xp', amount: 400, name: 'XP Ultimate', icon: '⭐' },
  { day: 28, type: 'special', name: 'Fourth Week Chest', icon: '🎁', rewards: { stardust: 750, xp: 500 } },
  { day: 29, type: 'stardust', amount: 400, name: 'Penultimate', icon: '✨' },
  { day: 30, type: 'legendary', amount: 0, name: 'Monthly Legend', icon: '👑' },
];

export const STREAK_BONUSES = [
  // Per lumina-viral-bible.md Section 9.2 - Login & Streak Systems
  { days: 3, name: 'Warm Up', icon: '🔥', multiplier: 1.1, reward: { stardust: 50 } },
  { days: 7, name: 'On Fire', icon: '🔥🔥', multiplier: 1.25, reward: { stardust: 100 } },
  { days: 14, name: 'Blazing', icon: '🔥🔥🔥', multiplier: 1.5, reward: { stardust: 200 } },
  { days: 30, name: 'Inferno', icon: '🌟🔥🌟', multiplier: 2.0, reward: { stardust: 500, cosmetic: 'streak_30_badge' } },
  { days: 60, name: 'Solar Flare', icon: '☀️🔥☀️', multiplier: 2.5, reward: { stardust: 1000 } },
  { days: 90, name: 'Eternal Flame', icon: '🌸🔥🌸', multiplier: 3.0, reward: { stardust: 1500, cosmetic: 'streak_90_trail' } },
  { days: 100, name: 'Supernova', icon: '🌟💥🌟', multiplier: 3.5, reward: { stardust: 2000, title: 'Supernova' } },
  { days: 150, name: 'Phoenix Rising', icon: '🦅🔥🦅', multiplier: 4.0, reward: { stardust: 3000 } },
  { days: 180, name: 'Half Year Hero', icon: '🏆🔥🏆', multiplier: 4.5, reward: { stardust: 4000, cosmetic: 'streak_180_aura' } },
  { days: 250, name: 'Stellar Guardian', icon: '⭐🛡️⭐', multiplier: 5.0, reward: { stardust: 5000 } },
  { days: 300, name: 'Cosmic Champion', icon: '🌌👑🌌', multiplier: 6.0, reward: { stardust: 7500, cosmetic: 'streak_300_crown' } },
  { days: 365, name: 'Year One Legend', icon: '🎂🌟🎂', multiplier: 10.0, reward: { stardust: 15000, cosmetic: 'legendary_year_aura', title: 'Year One Legend', crystals: 500 } },
  { days: 500, name: 'Eternal Devotee', icon: '💎🔥💎', multiplier: 12.0, reward: { stardust: 25000, cosmetic: 'eternal_devotee_set', title: 'Eternal Devotee', crystals: 1000 } },
  { days: 730, name: 'Two Year Transcendent', icon: '✨👑✨', multiplier: 15.0, reward: { stardust: 50000, cosmetic: 'transcendent_set', title: 'Transcendent', crystals: 2000 } },
];

// ─────────────────────────────────────────────────────────────────────────────
// Season Pass Rewards (100 tiers per lumina-viral-bible.md Section 3.3)
// ─────────────────────────────────────────────────────────────────────────────

export const SEASON_PASS_REWARDS: SeasonReward[] = [
  // Early tiers (1-20)
  { tier: 1, free: { stardust: 50 }, premium: { stardust: 100, cosmetic: { type: 'trail', name: 'Season Spark', id: 'season_spark' } } },
  { tier: 2, free: { stardust: 50 }, premium: { stardust: 100 } },
  { tier: 3, free: { stardust: 75 }, premium: { stardust: 150 } },
  { tier: 4, free: { stardust: 75 }, premium: { stardust: 150 } },
  { tier: 5, free: { stardust: 100, cosmetic: { type: 'color', name: 'Seasonal Glow', id: 'seasonal_glow' } }, premium: { stardust: 200, title: 'Early Bird' } },
  { tier: 6, free: { stardust: 100 }, premium: { stardust: 200 } },
  { tier: 7, free: { stardust: 100 }, premium: { stardust: 200, cosmetic: { type: 'pulse', name: 'Celebration', id: 'pulse_celebration' } } },
  { tier: 8, free: { stardust: 125 }, premium: { stardust: 250 } },
  { tier: 9, free: { stardust: 125 }, premium: { stardust: 250 } },
  { tier: 10, free: { stardust: 150 }, premium: { stardust: 300, cosmetic: { type: 'aura', name: 'Season Aura', id: 'season_aura' } } },
  { tier: 11, free: { stardust: 150 }, premium: { stardust: 300 } },
  { tier: 12, free: { stardust: 150, cosmetic: { type: 'emote', name: 'Wave', id: 'emote_wave' } }, premium: { stardust: 300 } },
  { tier: 13, free: { stardust: 175 }, premium: { stardust: 350 } },
  { tier: 14, free: { stardust: 175 }, premium: { stardust: 350 } },
  { tier: 15, free: { stardust: 200, cosmetic: { type: 'trail', name: 'Comet Tail', id: 'comet_tail' } }, premium: { stardust: 400, cosmetic: { type: 'color', name: 'Aurora', id: 'aurora' } } },
  { tier: 16, free: { stardust: 200 }, premium: { stardust: 400 } },
  { tier: 17, free: { stardust: 200 }, premium: { stardust: 400 } },
  { tier: 18, free: { stardust: 225 }, premium: { stardust: 450, cosmetic: { type: 'pulse', name: 'Heartbeat', id: 'pulse_heartbeat' } } },
  { tier: 19, free: { stardust: 225 }, premium: { stardust: 450 } },
  { tier: 20, free: { stardust: 250 }, premium: { stardust: 500, cosmetic: { type: 'color', name: 'Prismatic', id: 'prismatic' }, title: 'Dedicated' } },
  
  // Mid tiers (21-50)
  { tier: 21, free: { stardust: 250 }, premium: { stardust: 500 } },
  { tier: 22, free: { stardust: 250, cosmetic: { type: 'emote', name: 'Dance', id: 'emote_dance' } }, premium: { stardust: 500 } },
  { tier: 23, free: { stardust: 275 }, premium: { stardust: 550 } },
  { tier: 24, free: { stardust: 275 }, premium: { stardust: 550 } },
  { tier: 25, free: { stardust: 300, cosmetic: { type: 'aura', name: 'Ethereal', id: 'ethereal' } }, premium: { stardust: 600, cosmetic: { type: 'trail', name: 'Constellation', id: 'constellation' } } },
  { tier: 26, free: { stardust: 300 }, premium: { stardust: 600 } },
  { tier: 27, free: { stardust: 300 }, premium: { stardust: 600 } },
  { tier: 28, free: { stardust: 325 }, premium: { stardust: 650, cosmetic: { type: 'pulse', name: 'Ripple', id: 'pulse_ripple' } } },
  { tier: 29, free: { stardust: 325 }, premium: { stardust: 650 } },
  { tier: 30, free: { stardust: 350 }, premium: { stardust: 700, cosmetic: { type: 'trail', name: 'Starfall', id: 'starfall' }, title: 'Committed' } },
  { tier: 31, free: { stardust: 350 }, premium: { stardust: 700 } },
  { tier: 32, free: { stardust: 350, cosmetic: { type: 'color', name: 'Nebula Blue', id: 'nebula_blue' } }, premium: { stardust: 700 } },
  { tier: 33, free: { stardust: 375 }, premium: { stardust: 750 } },
  { tier: 34, free: { stardust: 375 }, premium: { stardust: 750 } },
  { tier: 35, free: { stardust: 400 }, premium: { stardust: 800, title: 'Veteran', cosmetic: { type: 'aura', name: 'Veteran Glow', id: 'veteran_glow' } } },
  { tier: 36, free: { stardust: 400 }, premium: { stardust: 800 } },
  { tier: 37, free: { stardust: 400 }, premium: { stardust: 800, cosmetic: { type: 'emote', name: 'Celebrate', id: 'emote_celebrate' } } },
  { tier: 38, free: { stardust: 425 }, premium: { stardust: 850 } },
  { tier: 39, free: { stardust: 425 }, premium: { stardust: 850 } },
  { tier: 40, free: { stardust: 450, cosmetic: { type: 'color', name: 'Cosmic', id: 'cosmic' } }, premium: { stardust: 900, cosmetic: { type: 'aura', name: 'Celestial', id: 'celestial' } } },
  { tier: 41, free: { stardust: 450 }, premium: { stardust: 900 } },
  { tier: 42, free: { stardust: 450 }, premium: { stardust: 900, cosmetic: { type: 'trail', name: 'Meteor Shower', id: 'meteor_shower' } } },
  { tier: 43, free: { stardust: 475 }, premium: { stardust: 950 } },
  { tier: 44, free: { stardust: 475 }, premium: { stardust: 950 } },
  { tier: 45, free: { stardust: 500 }, premium: { stardust: 1000, cosmetic: { type: 'pulse', name: 'Nova Burst', id: 'pulse_nova' } } },
  { tier: 46, free: { stardust: 500 }, premium: { stardust: 1000 } },
  { tier: 47, free: { stardust: 500, cosmetic: { type: 'emote', name: 'Bow', id: 'emote_bow' } }, premium: { stardust: 1000 } },
  { tier: 48, free: { stardust: 550 }, premium: { stardust: 1100 } },
  { tier: 49, free: { stardust: 550 }, premium: { stardust: 1100 } },
  { tier: 50, free: { stardust: 750, cosmetic: { type: 'trail', name: 'Legend Trail', id: 'legend_trail' } }, premium: { stardust: 1500, cosmetic: { type: 'aura', name: 'Legendary Aura', id: 'legendary_aura' }, title: 'Halfway Hero' } },
  
  // High tiers (51-75)
  { tier: 51, free: { stardust: 600 }, premium: { stardust: 1200 } },
  { tier: 52, free: { stardust: 600 }, premium: { stardust: 1200, cosmetic: { type: 'color', name: 'Solar Flare', id: 'solar_flare' } } },
  { tier: 53, free: { stardust: 625 }, premium: { stardust: 1250 } },
  { tier: 54, free: { stardust: 625 }, premium: { stardust: 1250 } },
  { tier: 55, free: { stardust: 650, cosmetic: { type: 'aura', name: 'Radiant', id: 'radiant' } }, premium: { stardust: 1300, cosmetic: { type: 'trail', name: 'Phoenix Trail', id: 'phoenix_trail' } } },
  { tier: 56, free: { stardust: 650 }, premium: { stardust: 1300 } },
  { tier: 57, free: { stardust: 675 }, premium: { stardust: 1350, cosmetic: { type: 'emote', name: 'Cheer', id: 'emote_cheer' } } },
  { tier: 58, free: { stardust: 675 }, premium: { stardust: 1350 } },
  { tier: 59, free: { stardust: 700 }, premium: { stardust: 1400 } },
  { tier: 60, free: { stardust: 750, cosmetic: { type: 'color', name: 'Galactic', id: 'galactic' } }, premium: { stardust: 1500, cosmetic: { type: 'aura', name: 'Galactic Aura', id: 'galactic_aura' }, title: 'Elite' } },
  { tier: 61, free: { stardust: 725 }, premium: { stardust: 1450 } },
  { tier: 62, free: { stardust: 725, cosmetic: { type: 'pulse', name: 'Beacon Call', id: 'pulse_beacon' } }, premium: { stardust: 1450 } },
  { tier: 63, free: { stardust: 750 }, premium: { stardust: 1500 } },
  { tier: 64, free: { stardust: 750 }, premium: { stardust: 1500 } },
  { tier: 65, free: { stardust: 800 }, premium: { stardust: 1600, cosmetic: { type: 'trail', name: 'Cosmic Stream', id: 'cosmic_stream' } } },
  { tier: 66, free: { stardust: 800 }, premium: { stardust: 1600 } },
  { tier: 67, free: { stardust: 825 }, premium: { stardust: 1650, cosmetic: { type: 'color', name: 'Supernova', id: 'supernova' } } },
  { tier: 68, free: { stardust: 825 }, premium: { stardust: 1650 } },
  { tier: 69, free: { stardust: 850 }, premium: { stardust: 1700 } },
  { tier: 70, free: { stardust: 900, cosmetic: { type: 'aura', name: 'Champion Glow', id: 'champion_glow' } }, premium: { stardust: 1800, cosmetic: { type: 'emote', name: 'Victory', id: 'emote_victory' }, title: 'Champion' } },
  { tier: 71, free: { stardust: 875 }, premium: { stardust: 1750 } },
  { tier: 72, free: { stardust: 875 }, premium: { stardust: 1750, cosmetic: { type: 'pulse', name: 'Triumph', id: 'pulse_triumph' } } },
  { tier: 73, free: { stardust: 900 }, premium: { stardust: 1800 } },
  { tier: 74, free: { stardust: 900 }, premium: { stardust: 1800 } },
  { tier: 75, free: { stardust: 1000, cosmetic: { type: 'trail', name: 'Eternal Trail', id: 'eternal_trail' } }, premium: { stardust: 2000, cosmetic: { type: 'aura', name: 'Eternal Aura', id: 'eternal_aura' } } },
  
  // Prestige tiers (76-100)
  { tier: 76, free: { stardust: 950 }, premium: { stardust: 1900 } },
  { tier: 77, free: { stardust: 950 }, premium: { stardust: 1900, cosmetic: { type: 'color', name: 'Void Black', id: 'void_black' } } },
  { tier: 78, free: { stardust: 975 }, premium: { stardust: 1950 } },
  { tier: 79, free: { stardust: 975 }, premium: { stardust: 1950 } },
  { tier: 80, free: { stardust: 1100, cosmetic: { type: 'emote', name: 'Salute', id: 'emote_salute' } }, premium: { stardust: 2200, cosmetic: { type: 'trail', name: 'Legend Stream', id: 'legend_stream' }, title: 'Legend' } },
  { tier: 81, free: { stardust: 1000 }, premium: { stardust: 2000 } },
  { tier: 82, free: { stardust: 1000 }, premium: { stardust: 2000, cosmetic: { type: 'pulse', name: 'Legend Pulse', id: 'pulse_legend' } } },
  { tier: 83, free: { stardust: 1025 }, premium: { stardust: 2050 } },
  { tier: 84, free: { stardust: 1025 }, premium: { stardust: 2050 } },
  { tier: 85, free: { stardust: 1100 }, premium: { stardust: 2200, cosmetic: { type: 'aura', name: 'Mythic Aura', id: 'mythic_aura' } } },
  { tier: 86, free: { stardust: 1050 }, premium: { stardust: 2100 } },
  { tier: 87, free: { stardust: 1050, cosmetic: { type: 'color', name: 'Mythic Gold', id: 'mythic_gold' } }, premium: { stardust: 2100 } },
  { tier: 88, free: { stardust: 1075 }, premium: { stardust: 2150 } },
  { tier: 89, free: { stardust: 1075 }, premium: { stardust: 2150 } },
  { tier: 90, free: { stardust: 1200, cosmetic: { type: 'trail', name: 'Mythic Trail', id: 'mythic_trail' } }, premium: { stardust: 2400, cosmetic: { type: 'emote', name: 'Ascend', id: 'emote_ascend' }, title: 'Mythic' } },
  { tier: 91, free: { stardust: 1100 }, premium: { stardust: 2200 } },
  { tier: 92, free: { stardust: 1100 }, premium: { stardust: 2200, cosmetic: { type: 'pulse', name: 'Mythic Pulse', id: 'pulse_mythic' } } },
  { tier: 93, free: { stardust: 1125 }, premium: { stardust: 2250 } },
  { tier: 94, free: { stardust: 1125 }, premium: { stardust: 2250 } },
  { tier: 95, free: { stardust: 1250, cosmetic: { type: 'aura', name: 'Transcendent Aura', id: 'transcendent_aura' } }, premium: { stardust: 2500, cosmetic: { type: 'color', name: 'Transcendent', id: 'transcendent' } } },
  { tier: 96, free: { stardust: 1150 }, premium: { stardust: 2300 } },
  { tier: 97, free: { stardust: 1150 }, premium: { stardust: 2300, cosmetic: { type: 'trail', name: 'Divine Trail', id: 'divine_trail' } } },
  { tier: 98, free: { stardust: 1200 }, premium: { stardust: 2400 } },
  { tier: 99, free: { stardust: 1250 }, premium: { stardust: 2500, cosmetic: { type: 'emote', name: 'Divine', id: 'emote_divine' } } },
  { tier: 100, free: { stardust: 2000, cosmetic: { type: 'trail', name: 'Season Master Trail', id: 'season_master_trail' } }, premium: { stardust: 5000, cosmetic: { type: 'aura', name: 'Season Master Aura', id: 'season_master_aura' }, title: 'Season Master' } },
];

export const SEASON_XP_PER_TIER = 1000;
export const PREMIUM_PASS_COST = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Ladder Tiers
// ─────────────────────────────────────────────────────────────────────────────

export const LADDER_TIERS: LadderTier[] = [
  { name: 'Spark', icon: '✨', minPoints: 0, color: '#9CA3AF' },
  { name: 'Ember', icon: '🔥', minPoints: 100, color: '#F97316' },
  { name: 'Flame', icon: '🔶', minPoints: 300, color: '#FBBF24' },
  { name: 'Blaze', icon: '🌟', minPoints: 600, color: '#EAB308' },
  { name: 'Beacon', icon: '💫', minPoints: 1000, color: '#22D3EE' },
  { name: 'Radiant', icon: '☀️', minPoints: 1500, color: '#F472B6' },
  { name: 'Stellar', icon: '⭐', minPoints: 2500, color: '#A855F7' },
  { name: 'Celestial', icon: '🌙', minPoints: 4000, color: '#8B5CF6' },
  { name: 'Astral', icon: '🌌', minPoints: 6000, color: '#6366F1' },
  { name: 'Eternal', icon: '👑', minPoints: 10000, color: '#FFD700' },
];

export function getCurrentTier(points: number): LadderTier {
  for (let i = LADDER_TIERS.length - 1; i >= 0; i--) {
    if (points >= LADDER_TIERS[i].minPoints) {
      return LADDER_TIERS[i];
    }
  }
  return LADDER_TIERS[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tutorial Steps
// ─────────────────────────────────────────────────────────────────────────────

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Avestella',
    text: 'A world of light and connection awaits you. Your glow represents your presence—nurture it by finding warmth.',
    skippable: true
  },
  {
    title: 'Collect Fragments',
    text: 'Golden sparkles are light fragments. Move close to collect them and grow your light. Find 3 to continue.',
    skippable: false
  },
  {
    title: 'Meet Other Souls',
    text: 'Other lights wander this world. Approach them to form connections. Their warmth will sustain your light.',
    skippable: false
  },
  {
    title: 'Form Bonds',
    text: 'Stay near another soul to strengthen your bond. Mutual bonds unlock new abilities like voice chat and light gifting.',
    skippable: false
  },
  {
    title: 'Discover Beacons',
    text: 'Diamond-shaped landmarks are beacons. Stand near them with others to activate them and illuminate the world.',
    skippable: false
  },
  {
    title: 'Begin Your Journey',
    text: 'You\'re ready to explore! Complete daily challenges, unlock cosmetics, and create lasting memories with others.',
    skippable: true
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Challenge Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChallengeTemplate {
  type: string;
  descTemplate: string;
  targets: { easy: number; medium: number; hard: number };
  rewards: {
    easy: { stardust: number; xp: number };
    medium: { stardust: number; xp: number };
    hard: { stardust: number; xp: number };
  };
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // Collection challenges
  {
    type: 'fragment',
    descTemplate: 'Collect {target} light fragments',
    targets: { easy: 10, medium: 25, hard: 50 },
    rewards: {
      easy: { stardust: 25, xp: 50 },
      medium: { stardust: 50, xp: 100 },
      hard: { stardust: 100, xp: 200 },
    },
  },
  {
    type: 'goldenFragment',
    descTemplate: 'Collect {target} golden fragments',
    targets: { easy: 1, medium: 3, hard: 5 },
    rewards: {
      easy: { stardust: 50, xp: 75 },
      medium: { stardust: 100, xp: 150 },
      hard: { stardust: 200, xp: 300 },
    },
  },
  // Social challenges
  {
    type: 'beacon',
    descTemplate: 'Help activate {target} beacon(s)',
    targets: { easy: 1, medium: 2, hard: 3 },
    rewards: {
      easy: { stardust: 75, xp: 100 },
      medium: { stardust: 150, xp: 200 },
      hard: { stardust: 300, xp: 400 },
    },
  },
  {
    type: 'bond',
    descTemplate: 'Form bonds with {target} soul(s)',
    targets: { easy: 2, medium: 5, hard: 10 },
    rewards: {
      easy: { stardust: 40, xp: 60 },
      medium: { stardust: 80, xp: 120 },
      hard: { stardust: 160, xp: 240 },
    },
  },
  {
    type: 'pulse',
    descTemplate: 'Send {target} pulse(s) to others',
    targets: { easy: 5, medium: 15, hard: 30 },
    rewards: {
      easy: { stardust: 20, xp: 40 },
      medium: { stardust: 40, xp: 80 },
      hard: { stardust: 80, xp: 160 },
    },
  },
  // Exploration challenges (legacy_2)
  {
    type: 'explore',
    descTemplate: 'Explore {target} new areas',
    targets: { easy: 3, medium: 6, hard: 10 },
    rewards: {
      easy: { stardust: 30, xp: 50 },
      medium: { stardust: 60, xp: 100 },
      hard: { stardust: 120, xp: 200 },
    },
  },
  // Survival challenges (legacy_2)
  {
    type: 'survival',
    descTemplate: 'Survive {target} darkness wave(s)',
    targets: { easy: 1, medium: 3, hard: 5 },
    rewards: {
      easy: { stardust: 60, xp: 80 },
      medium: { stardust: 120, xp: 160 },
      hard: { stardust: 240, xp: 320 },
    },
  },
  // Beacon challenges (legacy_2)
  {
    type: 'beaconCharge',
    descTemplate: 'Fully charge {target} beacon(s)',
    targets: { easy: 1, medium: 2, hard: 4 },
    rewards: {
      easy: { stardust: 80, xp: 120 },
      medium: { stardust: 160, xp: 240 },
      hard: { stardust: 320, xp: 480 },
    },
  },
];

export const DAILY_CHALLENGE_BONUS = { stardust: 500, xp: 200 };
export const MAX_DAILY_REROLLS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions (legacy_2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the highest applicable streak bonus for a given streak count
 */
export function getStreakBonusForStreak(streak: number): typeof STREAK_BONUSES[0] | null {
  for (let i = STREAK_BONUSES.length - 1; i >= 0; i--) {
    if (streak >= STREAK_BONUSES[i].days) {
      return STREAK_BONUSES[i];
    }
  }
  return null;
}

/**
 * Get the reward for a specific day (uses 30-day cycle)
 */
export function getRewardForDay(day: number): DailyReward {
  // Normalize to 30-day cycle (day 31 becomes day 1, etc.)
  const normalizedDay = ((day - 1) % 30) + 1;
  const reward = DAILY_REWARDS.find(r => r.day === normalizedDay);
  return reward || DAILY_REWARDS[0];
}

/**
 * Get upcoming rewards for the next N days
 */
export function getUpcomingRewards(currentDay: number, count: number = 7): DailyReward[] {
  const rewards: DailyReward[] = [];
  for (let i = 1; i <= count; i++) {
    rewards.push(getRewardForDay(currentDay + i));
  }
  return rewards;
}

/**
 * Calculate XP with guild bonus multiplier
 */
export function calculateXPWithGuildBonus(baseXP: number, guildBonus: number = 0): number {
  return Math.floor(baseXP * (1 + guildBonus));
}
