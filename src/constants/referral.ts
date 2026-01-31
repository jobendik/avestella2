// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Referral System Constants
// ═══════════════════════════════════════════════════════════════════════════
// Per lumina-viral-bible.md Section 15.2 - Friend codes and referral rewards

// ─────────────────────────────────────────────────────────────────────────────
// Referral Code Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferralCode {
  code: string;
  ownerId: string;
  createdAt: number;
  usageCount: number;
  maxUses?: number; // Unlimited if not set
}

export interface ReferralReward {
  milestone: number; // Number of referrals needed
  referrerReward: {
    stardust?: number;
    crystals?: number;
    cosmetic?: string;
    title?: string;
  };
  refereeReward: {
    stardust?: number;
    crystals?: number;
    cosmetic?: string;
  };
  name: string;
  icon: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Referral Milestone Rewards
// ─────────────────────────────────────────────────────────────────────────────

export const REFERRAL_MILESTONES: ReferralReward[] = [
  {
    milestone: 1,
    name: 'First Friend',
    icon: '👋',
    referrerReward: { stardust: 500, crystals: 50 },
    refereeReward: { stardust: 500, crystals: 50 },
  },
  {
    milestone: 3,
    name: 'Growing Circle',
    icon: '🌱',
    referrerReward: { stardust: 1000, crystals: 100 },
    refereeReward: { stardust: 300 },
  },
  {
    milestone: 5,
    name: 'Friendly Face',
    icon: '😊',
    referrerReward: { stardust: 2000, crystals: 150, cosmetic: 'referral_trail_5' },
    refereeReward: { stardust: 300 },
  },
  {
    milestone: 10,
    name: 'Social Butterfly',
    icon: '🦋',
    referrerReward: { stardust: 5000, crystals: 300, cosmetic: 'referral_aura_10', title: 'Social Butterfly' },
    refereeReward: { stardust: 300 },
  },
  {
    milestone: 25,
    name: 'Community Builder',
    icon: '🏗️',
    referrerReward: { stardust: 10000, crystals: 500, cosmetic: 'referral_frame_25', title: 'Community Builder' },
    refereeReward: { stardust: 300 },
  },
  {
    milestone: 50,
    name: 'Beacon of Welcome',
    icon: '💡',
    referrerReward: { stardust: 25000, crystals: 1000, cosmetic: 'referral_legendary_set_50', title: 'Beacon of Welcome' },
    refereeReward: { stardust: 500, crystals: 25 },
  },
  {
    milestone: 100,
    name: 'Legendary Ambassador',
    icon: '👑',
    referrerReward: { stardust: 50000, crystals: 2500, cosmetic: 'referral_mythic_set_100', title: 'Legendary Ambassador' },
    refereeReward: { stardust: 1000, crystals: 50, cosmetic: 'ambassador_friend_badge' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Referee Benefits (New Player Bonuses)
// ─────────────────────────────────────────────────────────────────────────────

export interface RefereeBenefit {
  id: string;
  name: string;
  description: string;
  value: string | number;
  duration?: number; // Hours, if temporary
}

export const REFEREE_BENEFITS: RefereeBenefit[] = [
  {
    id: 'welcome_stardust',
    name: 'Welcome Stardust',
    description: 'Bonus starting stardust',
    value: 500,
  },
  {
    id: 'welcome_crystals',
    name: 'Welcome Crystals',
    description: 'Bonus starting crystals',
    value: 50,
  },
  {
    id: 'xp_boost',
    name: 'Welcome XP Boost',
    description: '50% bonus XP for first week',
    value: 50,
    duration: 168, // 7 days in hours
  },
  {
    id: 'starter_cosmetic',
    name: 'Referred Friend Badge',
    description: 'Exclusive badge for referred players',
    value: 'badge_referred_friend',
  },
  {
    id: 'protection',
    name: 'Newcomer Protection',
    description: 'Extended newcomer protection period',
    value: 'protection_extended',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Referral Link Tracking
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferralLink {
  id: string;
  ownerId: string;
  source: 'twitter' | 'facebook' | 'instagram' | 'discord' | 'direct' | 'other';
  createdAt: number;
  clicks: number;
  conversions: number;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number; // Still playing
  totalStardustEarned: number;
  totalCrystalsEarned: number;
  nextMilestone: ReferralReward | null;
  progressToNext: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Special Referral Events
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferralEvent {
  id: string;
  name: string;
  description: string;
  bonusMultiplier: number; // 2.0 = double rewards
  startDate: number;
  endDate: number;
}

export const REFERRAL_EVENTS: ReferralEvent[] = [
  {
    id: 'double_weekend',
    name: 'Double Referral Weekend',
    description: 'Earn double referral rewards this weekend!',
    bonusMultiplier: 2.0,
    startDate: 0, // Set dynamically
    endDate: 0,
  },
  {
    id: 'triple_holiday',
    name: 'Holiday Triple Bonus',
    description: 'Triple referral rewards during the holiday season!',
    bonusMultiplier: 3.0,
    startDate: 0,
    endDate: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Referral Code Generation
// ─────────────────────────────────────────────────────────────────────────────

const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous chars
export const REFERRAL_CODE_LENGTH = 8;

export function generateReferralCode(): string {
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)];
  }
  return code;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getReferralMilestone(referralCount: number): ReferralReward | null {
  for (let i = REFERRAL_MILESTONES.length - 1; i >= 0; i--) {
    if (referralCount >= REFERRAL_MILESTONES[i].milestone) {
      return REFERRAL_MILESTONES[i];
    }
  }
  return null;
}

export function getNextReferralMilestone(referralCount: number): ReferralReward | null {
  for (const milestone of REFERRAL_MILESTONES) {
    if (referralCount < milestone.milestone) {
      return milestone;
    }
  }
  return null;
}

export function getReferralProgress(referralCount: number): { current: number; next: number; percentage: number } {
  const currentMilestone = getReferralMilestone(referralCount);
  const nextMilestone = getNextReferralMilestone(referralCount);
  
  if (!nextMilestone) {
    return { current: referralCount, next: referralCount, percentage: 100 };
  }
  
  const start = currentMilestone?.milestone || 0;
  const end = nextMilestone.milestone;
  const progress = referralCount - start;
  const total = end - start;
  
  return {
    current: referralCount,
    next: end,
    percentage: Math.round((progress / total) * 100),
  };
}

export function calculateReferralRewards(referralCount: number): {
  totalStardust: number;
  totalCrystals: number;
  cosmetics: string[];
  titles: string[];
} {
  let totalStardust = 0;
  let totalCrystals = 0;
  const cosmetics: string[] = [];
  const titles: string[] = [];
  
  for (const milestone of REFERRAL_MILESTONES) {
    if (referralCount >= milestone.milestone) {
      if (milestone.referrerReward.stardust) totalStardust += milestone.referrerReward.stardust;
      if (milestone.referrerReward.crystals) totalCrystals += milestone.referrerReward.crystals;
      if (milestone.referrerReward.cosmetic) cosmetics.push(milestone.referrerReward.cosmetic);
      if (milestone.referrerReward.title) titles.push(milestone.referrerReward.title);
    }
  }
  
  return { totalStardust, totalCrystals, cosmetics, titles };
}
