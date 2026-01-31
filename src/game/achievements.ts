/**
 * Achievement system - tracks and unlocks player milestones
 * Ported from legacy_3/src/game/achievements.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Achievement {
  id: string;
  title: string;
  description: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: GameStats) => boolean;
  target: number;
  getValue: (stats: GameStats) => number;
}

export interface GameStats {
  fragmentsCollected: number;
  beaconsLit: number;
  soulsMet: number;
  nearbyCount: number;
  bondCount: number;
  echoesPlaced: number;
  playTimeMinutes: number;
  maxConstellationSize: number;
}

export interface AchievementProgress {
  current: number;
  target: number;
  percentage: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'beacon',
    title: 'Illuminator',
    description: 'Light your first beacon',
    icon: '🌟',
    condition: (stats) => stats.beaconsLit >= 1,
    target: 1,
    getValue: (stats) => stats.beaconsLit
  },
  {
    id: 'master',
    title: 'Master of Light',
    description: 'Light all 5 beacons',
    icon: '👑',
    condition: (stats) => stats.beaconsLit >= 5,
    target: 5,
    getValue: (stats) => stats.beaconsLit
  },
  {
    id: 'collector',
    title: 'Light Collector',
    description: 'Collect 5 light fragments',
    icon: '✨',
    condition: (stats) => stats.fragmentsCollected >= 5,
    target: 5,
    getValue: (stats) => stats.fragmentsCollected
  },
  {
    id: 'hoarder',
    title: 'Fragment Hoarder',
    description: 'Collect 50 light fragments',
    icon: '💎',
    condition: (stats) => stats.fragmentsCollected >= 50,
    target: 50,
    getValue: (stats) => stats.fragmentsCollected
  },
  {
    id: 'social',
    title: 'Social Butterfly',
    description: 'Meet 10 different souls',
    icon: '🦋',
    condition: (stats) => stats.soulsMet >= 10,
    target: 10,
    getValue: (stats) => stats.soulsMet
  },
  {
    id: 'popular',
    title: 'Center of Attention',
    description: 'Have 5 souls nearby at once',
    icon: '🌟',
    condition: (stats) => stats.maxConstellationSize >= 5,
    target: 5,
    getValue: (stats) => stats.maxConstellationSize
  },
  {
    id: 'constellation',
    title: 'Constellation Maker',
    description: 'Form bonds with 3 souls simultaneously',
    icon: '⭐',
    condition: (stats) => stats.bondCount >= 3,
    target: 3,
    getValue: (stats) => stats.bondCount
  },
  {
    id: 'echo',
    title: 'Echo Maker',
    description: 'Leave a message for others',
    icon: '💬',
    condition: (stats) => stats.echoesPlaced >= 1,
    target: 1,
    getValue: (stats) => stats.echoesPlaced
  },
  {
    id: 'storyteller',
    title: 'Storyteller',
    description: 'Leave 10 echoes in the world',
    icon: '📖',
    condition: (stats) => stats.echoesPlaced >= 10,
    target: 10,
    getValue: (stats) => stats.echoesPlaced
  },
  {
    id: 'wanderer',
    title: 'Eternal Wanderer',
    description: 'Explore for 30 minutes',
    icon: '🚶',
    condition: (stats) => stats.playTimeMinutes >= 30,
    target: 30,
    getValue: (stats) => stats.playTimeMinutes
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // Additional achievements to reach 30+ (from lumina-viral-bible.md)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Begin your journey',
    icon: '👣',
    condition: (stats) => stats.fragmentsCollected >= 1,
    target: 1,
    getValue: (stats) => stats.fragmentsCollected
  },
  {
    id: 'first_bond',
    title: 'First Bond',
    description: 'Form your first connection',
    icon: '🤝',
    condition: (stats) => stats.bondCount >= 1,
    target: 1,
    getValue: (stats) => stats.bondCount
  },
  {
    id: 'starmaker',
    title: 'Starmaker',
    description: 'Seal a star memory with someone',
    icon: '⭐',
    condition: (stats) => (stats as any).starMemoriesSealed >= 1,
    target: 1,
    getValue: (stats) => (stats as any).starMemoriesSealed || 0
  },
  {
    id: 'golden_soul',
    title: 'Golden Soul',
    description: 'Collect a golden fragment',
    icon: '🌟',
    condition: (stats) => (stats as any).goldenFragmentsCollected >= 1,
    target: 1,
    getValue: (stats) => (stats as any).goldenFragmentsCollected || 0
  },
  {
    id: 'fragment_hunter',
    title: 'Fragment Hunter',
    description: 'Collect 100 fragments',
    icon: '💠',
    condition: (stats) => stats.fragmentsCollected >= 100,
    target: 100,
    getValue: (stats) => stats.fragmentsCollected
  },
  {
    id: 'fragment_master',
    title: 'Fragment Master',
    description: 'Collect 500 fragments',
    icon: '💎',
    condition: (stats) => stats.fragmentsCollected >= 500,
    target: 500,
    getValue: (stats) => stats.fragmentsCollected
  },
  {
    id: 'social_star',
    title: 'Social Star',
    description: 'Meet 50 different souls',
    icon: '🌠',
    condition: (stats) => stats.soulsMet >= 50,
    target: 50,
    getValue: (stats) => stats.soulsMet
  },
  {
    id: 'social_legend',
    title: 'Social Legend',
    description: 'Meet 100 different souls',
    icon: '✨',
    condition: (stats) => stats.soulsMet >= 100,
    target: 100,
    getValue: (stats) => stats.soulsMet
  },
  {
    id: 'bond_collector',
    title: 'Bond Collector',
    description: 'Form 10 bonds',
    icon: '💫',
    condition: (stats) => (stats as any).totalBondsFormed >= 10,
    target: 10,
    getValue: (stats) => (stats as any).totalBondsFormed || 0
  },
  {
    id: 'bond_master',
    title: 'Bond Master',
    description: 'Form 25 bonds',
    icon: '👑',
    condition: (stats) => (stats as any).totalBondsFormed >= 25,
    target: 25,
    getValue: (stats) => (stats as any).totalBondsFormed || 0
  },
  {
    id: 'pulse_initiate',
    title: 'Pulse Initiate',
    description: 'Send 10 pulses',
    icon: '📡',
    condition: (stats) => (stats as any).pulsesSent >= 10,
    target: 10,
    getValue: (stats) => (stats as any).pulsesSent || 0
  },
  {
    id: 'pulse_master',
    title: 'Pulse Master',
    description: 'Send 100 pulses',
    icon: '📻',
    condition: (stats) => (stats as any).pulsesSent >= 100,
    target: 100,
    getValue: (stats) => (stats as any).pulsesSent || 0
  },
  {
    id: 'light_giver',
    title: 'Light Giver',
    description: 'Gift light 5 times',
    icon: '🎁',
    condition: (stats) => (stats as any).lightGifted >= 5,
    target: 5,
    getValue: (stats) => (stats as any).lightGifted || 0
  },
  {
    id: 'generous_soul',
    title: 'Generous Soul',
    description: 'Gift light 25 times',
    icon: '💝',
    condition: (stats) => (stats as any).lightGifted >= 25,
    target: 25,
    getValue: (stats) => (stats as any).lightGifted || 0
  },
  {
    id: 'darkness_survivor',
    title: 'Darkness Survivor',
    description: 'Survive a darkness wave',
    icon: '🌑',
    condition: (stats) => (stats as any).darknessWavesSurvived >= 1,
    target: 1,
    getValue: (stats) => (stats as any).darknessWavesSurvived || 0
  },
  {
    id: 'darkness_veteran',
    title: 'Darkness Veteran',
    description: 'Survive 10 darkness waves',
    icon: '🌚',
    condition: (stats) => (stats as any).darknessWavesSurvived >= 10,
    target: 10,
    getValue: (stats) => (stats as any).darknessWavesSurvived || 0
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Log in for 3 consecutive days',
    icon: '🌅',
    condition: (stats) => (stats as any).loginStreak >= 3,
    target: 3,
    getValue: (stats) => (stats as any).loginStreak || 0
  },
  {
    id: 'dedicated',
    title: 'Dedicated Soul',
    description: 'Log in for 7 consecutive days',
    icon: '🔥',
    condition: (stats) => (stats as any).loginStreak >= 7,
    target: 7,
    getValue: (stats) => (stats as any).loginStreak || 0
  },
  {
    id: 'marathon_runner',
    title: 'Marathon Runner',
    description: 'Log in for 30 consecutive days',
    icon: '🏃',
    condition: (stats) => (stats as any).loginStreak >= 30,
    target: 30,
    getValue: (stats) => (stats as any).loginStreak || 0
  },
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Discover a new biome',
    icon: '🗺️',
    condition: (stats) => (stats as any).biomesDiscovered >= 1,
    target: 1,
    getValue: (stats) => (stats as any).biomesDiscovered || 0
  },
  {
    id: 'cartographer',
    title: 'Cartographer',
    description: 'Discover all 6 biomes',
    icon: '🌍',
    condition: (stats) => (stats as any).biomesDiscovered >= 6,
    target: 6,
    getValue: (stats) => (stats as any).biomesDiscovered || 0
  },
  {
    id: 'discoverer',
    title: 'Discoverer',
    description: 'Find a point of interest',
    icon: '🔍',
    condition: (stats) => (stats as any).poisDiscovered >= 1,
    target: 1,
    getValue: (stats) => (stats as any).poisDiscovered || 0
  },
  {
    id: 'adventurer',
    title: 'Adventurer',
    description: 'Find 10 points of interest',
    icon: '🧭',
    condition: (stats) => (stats as any).poisDiscovered >= 10,
    target: 10,
    getValue: (stats) => (stats as any).poisDiscovered || 0
  },
  {
    id: 'veteran',
    title: 'Veteran',
    description: 'Play for 2 hours total',
    icon: '⏰',
    condition: (stats) => stats.playTimeMinutes >= 120,
    target: 120,
    getValue: (stats) => stats.playTimeMinutes
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Play for 5 hours total',
    icon: '🦉',
    condition: (stats) => stats.playTimeMinutes >= 300,
    target: 300,
    getValue: (stats) => stats.playTimeMinutes
  },
  {
    id: 'constellation_builder',
    title: 'Constellation Builder',
    description: 'Have 10 souls nearby at once',
    icon: '🌌',
    condition: (stats) => stats.maxConstellationSize >= 10,
    target: 10,
    getValue: (stats) => stats.maxConstellationSize
  },
  {
    id: 'echo_artist',
    title: 'Echo Artist',
    description: 'Leave 25 echoes in the world',
    icon: '🎨',
    condition: (stats) => stats.echoesPlaced >= 25,
    target: 25,
    getValue: (stats) => stats.echoesPlaced
  },
  {
    id: 'photographer',
    title: 'Photographer',
    description: 'Take a screenshot',
    icon: '📸',
    condition: (stats) => (stats as any).screenshotsTaken >= 1,
    target: 1,
    getValue: (stats) => (stats as any).screenshotsTaken || 0
  },
  {
    id: 'videographer',
    title: 'Videographer',
    description: 'Record a video clip',
    icon: '🎬',
    condition: (stats) => (stats as any).videosRecorded >= 1,
    target: 1,
    getValue: (stats) => (stats as any).videosRecorded || 0
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check for newly unlocked achievements
 */
export const checkAchievements = (
  stats: GameStats,
  unlockedIds: string[]
): Achievement[] => {
  const newAchievements: Achievement[] = [];
  
  ACHIEVEMENTS.forEach(achievement => {
    if (!unlockedIds.includes(achievement.id) && achievement.condition(stats)) {
      newAchievements.push({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description
      });
    }
  });
  
  return newAchievements;
};

/**
 * Check if a specific achievement is unlocked
 */
export const isAchievementUnlocked = (
  achievementId: string,
  unlockedIds: string[]
): boolean => {
  return unlockedIds.includes(achievementId);
};

/**
 * Get progress for all achievements
 */
export const getAchievementProgress = (
  stats: GameStats
): Record<string, AchievementProgress> => {
  const progress: Record<string, AchievementProgress> = {};
  
  ACHIEVEMENTS.forEach(achievement => {
    const current = achievement.getValue(stats);
    progress[achievement.id] = {
      current,
      target: achievement.target,
      percentage: Math.min(100, (current / achievement.target) * 100)
    };
  });
  
  return progress;
};

/**
 * Get a specific achievement definition
 */
export const getAchievementById = (id: string): AchievementDefinition | undefined => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

/**
 * Get all achievement definitions
 */
export const getAllAchievements = (): AchievementDefinition[] => {
  return ACHIEVEMENTS;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages achievement state for easy integration
 */
export class AchievementManager {
  unlockedIds: Set<string>;
  stats: GameStats;
  onUnlock?: (achievement: Achievement) => void;
  
  constructor(initialUnlocked: string[] = []) {
    this.unlockedIds = new Set(initialUnlocked);
    this.stats = {
      fragmentsCollected: 0,
      beaconsLit: 0,
      soulsMet: 0,
      nearbyCount: 0,
      bondCount: 0,
      echoesPlaced: 0,
      playTimeMinutes: 0,
      maxConstellationSize: 0
    };
  }
  
  /**
   * Update stats and check for new achievements
   */
  update(newStats: Partial<GameStats>): Achievement[] {
    // Update stats
    Object.assign(this.stats, newStats);
    
    // Track max constellation size
    if (this.stats.nearbyCount > this.stats.maxConstellationSize) {
      this.stats.maxConstellationSize = this.stats.nearbyCount;
    }
    
    // Check for new achievements
    const newAchievements = checkAchievements(this.stats, Array.from(this.unlockedIds));
    
    // Mark as unlocked and trigger callbacks
    newAchievements.forEach(achievement => {
      this.unlockedIds.add(achievement.id);
      this.onUnlock?.(achievement);
    });
    
    return newAchievements;
  }
  
  /**
   * Add fragments collected
   */
  addFragments(count: number): Achievement[] {
    return this.update({ fragmentsCollected: this.stats.fragmentsCollected + count });
  }
  
  /**
   * Add beacon lit
   */
  addBeaconLit(): Achievement[] {
    return this.update({ beaconsLit: this.stats.beaconsLit + 1 });
  }
  
  /**
   * Add echo placed
   */
  addEcho(): Achievement[] {
    return this.update({ echoesPlaced: this.stats.echoesPlaced + 1 });
  }
  
  /**
   * Update social stats
   */
  updateSocial(soulsMet: number, nearbyCount: number, bondCount: number): Achievement[] {
    return this.update({ soulsMet, nearbyCount, bondCount });
  }
  
  /**
   * Get all progress
   */
  getProgress(): Record<string, AchievementProgress> {
    return getAchievementProgress(this.stats);
  }
  
  /**
   * Get unlocked count
   */
  getUnlockedCount(): number {
    return this.unlockedIds.size;
  }
  
  /**
   * Get total achievements
   */
  getTotalCount(): number {
    return ACHIEVEMENTS.length;
  }
  
  /**
   * Check if achievement is unlocked
   */
  isUnlocked(achievementId: string): boolean {
    return this.unlockedIds.has(achievementId);
  }
  
  /**
   * Set unlock callback
   */
  setOnUnlock(callback: (achievement: Achievement) => void): void {
    this.onUnlock = callback;
  }
  
  /**
   * Export unlocked IDs for persistence
   */
  exportUnlocked(): string[] {
    return Array.from(this.unlockedIds);
  }
  
  /**
   * Import unlocked IDs from storage
   */
  importUnlocked(ids: string[]): void {
    ids.forEach(id => this.unlockedIds.add(id));
  }
}

/**
 * Create initial game stats
 */
export const createGameStats = (): GameStats => ({
  fragmentsCollected: 0,
  beaconsLit: 0,
  soulsMet: 0,
  nearbyCount: 0,
  bondCount: 0,
  echoesPlaced: 0,
  playTimeMinutes: 0,
  maxConstellationSize: 0
});
