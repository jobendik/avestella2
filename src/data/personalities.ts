/**
 * AI Personality Definitions
 * Ported from legacy_3/src/data/personalities.ts
 */

export interface AIPersonality {
  type: 'explorer' | 'social' | 'shy' | 'beacon_seeker' | 'wanderer' | 'guardian';
  speed: number;
  wanderRange: number;
  social: number;
  pauseChance: number;
  color: string;
}

export const AI_PERSONALITIES: AIPersonality[] = [
  {
    type: 'explorer',
    speed: 1.8,
    wanderRange: 3000,
    social: 0.3,
    pauseChance: 0.01,
    color: '#60a5fa' // Blue
  },
  {
    type: 'social',
    speed: 1.0,
    wanderRange: 800,
    social: 0.9,
    pauseChance: 0.02,
    color: '#f472b6' // Pink
  },
  {
    type: 'shy',
    speed: 0.6,
    wanderRange: 400,
    social: 0.1,
    pauseChance: 0.05,
    color: '#a78bfa' // Purple
  },
  {
    type: 'beacon_seeker',
    speed: 1.4,
    wanderRange: 2000,
    social: 0.5,
    pauseChance: 0.01,
    color: '#34d399' // Green
  },
  {
    type: 'wanderer',
    speed: 1.2,
    wanderRange: 1500,
    social: 0.4,
    pauseChance: 0.03,
    color: '#fbbf24' // Yellow
  },
  {
    type: 'guardian',
    speed: 0.8,
    wanderRange: 600,
    social: 0.7,
    pauseChance: 0.04,
    color: '#fb923c' // Orange
  },
];

/**
 * Get a random personality
 */
export const getRandomPersonality = (): AIPersonality => {
  return AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
};

/**
 * Get personality by type
 */
export const getPersonalityByType = (type: AIPersonality['type']): AIPersonality | undefined => {
  return AI_PERSONALITIES.find(p => p.type === type);
};
