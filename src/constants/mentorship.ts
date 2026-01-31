// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Mentorship System Constants
// ═══════════════════════════════════════════════════════════════════════════
// Per lumina-viral-bible.md Section 4.5 - Experienced players guide newcomers

// ─────────────────────────────────────────────────────────────────────────────
// Mentor Requirements
// ─────────────────────────────────────────────────────────────────────────────

export interface MentorRequirements {
  minLevel: number;
  minSealedBonds: number;
  completedTutorial: boolean;
  noReports: boolean; // Good standing
}

export const MENTOR_REQUIREMENTS: MentorRequirements = {
  minLevel: 20,
  minSealedBonds: 10,
  completedTutorial: true,
  noReports: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Mentor Benefits
// ─────────────────────────────────────────────────────────────────────────────

export interface MentorBenefit {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'title' | 'cosmetic' | 'bonus' | 'feature';
  value?: number | string;
}

export const MENTOR_BENEFITS: MentorBenefit[] = [
  {
    id: 'mentor_title',
    name: 'Mentor Title',
    description: 'Display the exclusive "Mentor" title',
    icon: '🎓',
    type: 'title',
    value: 'Mentor',
  },
  {
    id: 'mentor_aura',
    name: 'Mentor Aura',
    description: 'Special golden aura visible to all',
    icon: '✨',
    type: 'cosmetic',
    value: 'aura_mentor_gold',
  },
  {
    id: 'xp_bonus',
    name: 'XP Bonus',
    description: '+50% XP when helping newcomers',
    icon: '⬆️',
    type: 'bonus',
    value: 50,
  },
  {
    id: 'priority_matching',
    name: 'Priority Matchmaking',
    description: 'Matched first when mentees seek help',
    icon: '🎯',
    type: 'feature',
  },
  {
    id: 'mentor_badge',
    name: 'Mentor Badge',
    description: 'Exclusive mentor badge on profile',
    icon: '🏅',
    type: 'cosmetic',
    value: 'badge_mentor',
  },
  {
    id: 'mentor_trail',
    name: 'Guiding Trail',
    description: 'Special trail effect when leading mentees',
    icon: '🌟',
    type: 'cosmetic',
    value: 'trail_mentor',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mentor Progression
// ─────────────────────────────────────────────────────────────────────────────

export interface MentorLevel {
  level: number;
  name: string;
  menteesHelped: number;
  rewards: {
    stardust?: number;
    title?: string;
    cosmetic?: string;
  };
}

export const MENTOR_LEVELS: MentorLevel[] = [
  { level: 1, name: 'Novice Mentor', menteesHelped: 0, rewards: { title: 'Mentor' } },
  { level: 2, name: 'Guide', menteesHelped: 5, rewards: { stardust: 500, title: 'Guide' } },
  { level: 3, name: 'Teacher', menteesHelped: 15, rewards: { stardust: 1000, cosmetic: 'frame_mentor' } },
  { level: 4, name: 'Sage', menteesHelped: 30, rewards: { stardust: 2000, title: 'Sage' } },
  { level: 5, name: 'Master Mentor', menteesHelped: 50, rewards: { stardust: 5000, cosmetic: 'aura_sage' } },
  { level: 6, name: 'Legendary Mentor', menteesHelped: 100, rewards: { stardust: 10000, title: 'Legendary Mentor', cosmetic: 'trail_legendary_mentor' } },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mentee Experience
// ─────────────────────────────────────────────────────────────────────────────

export interface MenteeStatus {
  hasMentor: boolean;
  mentorId?: string;
  graduationLevel: number;
  sessionsCompleted: number;
  bonusesReceived: number;
}

export const MENTEE_GRADUATION_LEVEL = 10;

export interface MenteeBonus {
  id: string;
  name: string;
  description: string;
  value: number | string;
}

export const MENTEE_BONUSES: MenteeBonus[] = [
  { id: 'newcomer_protection', name: 'Newcomer Protection', description: 'Protected from aggressive players', value: 'protection' },
  { id: 'bonus_rewards', name: 'Bonus Rewards', description: '+25% rewards when with mentor', value: 25 },
  { id: 'guided_tutorial', name: 'Guided Tutorial', description: 'Personalized tutorial experience', value: 'tutorial' },
  { id: 'graduation_ceremony', name: 'Graduation Ceremony', description: 'Special ceremony at Level 10', value: 'ceremony' },
  { id: 'graduation_reward', name: 'Graduation Gift', description: 'Special cosmetic upon graduation', value: 'cosmetic_graduate' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mentorship Sessions
// ─────────────────────────────────────────────────────────────────────────────

export interface MentorshipSession {
  id: string;
  mentorId: string;
  menteeId: string;
  startTime: number;
  endTime?: number;
  activitiesCompleted: string[];
  xpEarned: number;
  rating?: number; // 1-5
}

export interface MentorshipActivity {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  icon: string;
}

export const MENTORSHIP_ACTIVITIES: MentorshipActivity[] = [
  { id: 'explore_together', name: 'Explore Together', description: 'Guide through a new biome', xpReward: 50, icon: '🧭' },
  { id: 'first_bond', name: 'First Bond', description: 'Help form their first bond', xpReward: 100, icon: '🤝' },
  { id: 'beacon_lesson', name: 'Beacon Lesson', description: 'Teach how to light a beacon', xpReward: 75, icon: '💡' },
  { id: 'darkness_survival', name: 'Darkness Survival', description: 'Survive darkness together', xpReward: 80, icon: '🌑' },
  { id: 'pulse_training', name: 'Pulse Training', description: 'Teach pulse patterns', xpReward: 60, icon: '📡' },
  { id: 'gift_giving', name: 'Gift Giving', description: 'Demonstrate light gifting', xpReward: 40, icon: '🎁' },
  { id: 'star_memory', name: 'Star Memory', description: 'Help create first star memory', xpReward: 150, icon: '⭐' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mentor Matching
// ─────────────────────────────────────────────────────────────────────────────

export interface MentorMatchCriteria {
  language?: string;
  timezone?: string;
  playstyle?: 'explorer' | 'social' | 'collector' | 'any';
  preferredActivities?: string[];
}

export const DEFAULT_MATCH_CRITERIA: MentorMatchCriteria = {
  playstyle: 'any',
  preferredActivities: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function checkMentorEligibility(
  level: number,
  sealedBonds: number,
  tutorialComplete: boolean,
  hasReports: boolean
): { eligible: boolean; missingRequirements: string[] } {
  const missing: string[] = [];
  
  if (level < MENTOR_REQUIREMENTS.minLevel) {
    missing.push(`Reach level ${MENTOR_REQUIREMENTS.minLevel} (currently ${level})`);
  }
  if (sealedBonds < MENTOR_REQUIREMENTS.minSealedBonds) {
    missing.push(`Seal ${MENTOR_REQUIREMENTS.minSealedBonds} bonds (currently ${sealedBonds})`);
  }
  if (!tutorialComplete) {
    missing.push('Complete the mentor training tutorial');
  }
  if (hasReports) {
    missing.push('Maintain good standing (no active reports)');
  }
  
  return {
    eligible: missing.length === 0,
    missingRequirements: missing,
  };
}

export function getMentorLevel(menteesHelped: number): MentorLevel {
  for (let i = MENTOR_LEVELS.length - 1; i >= 0; i--) {
    if (menteesHelped >= MENTOR_LEVELS[i].menteesHelped) {
      return MENTOR_LEVELS[i];
    }
  }
  return MENTOR_LEVELS[0];
}

export function getNextMentorLevel(menteesHelped: number): MentorLevel | null {
  const currentLevel = getMentorLevel(menteesHelped);
  const nextIndex = MENTOR_LEVELS.findIndex(l => l.level === currentLevel.level + 1);
  return nextIndex >= 0 ? MENTOR_LEVELS[nextIndex] : null;
}
