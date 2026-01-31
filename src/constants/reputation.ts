// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Reputation Tracks System
// ═══════════════════════════════════════════════════════════════════════════
// Per lumina-viral-bible.md Section 3.1 - Multiple paths for different playstyles

// ─────────────────────────────────────────────────────────────────────────────
// Reputation Track Types
// ─────────────────────────────────────────────────────────────────────────────

export type ReputationTrack = 
  | 'explorer' 
  | 'connector' 
  | 'guardian' 
  | 'beacon_keeper' 
  | 'collector';

export interface ReputationLevel {
  level: number;
  name: string;
  minXP: number;
  rewards?: {
    stardust?: number;
    title?: string;
    cosmetic?: string;
  };
}

export interface ReputationTrackConfig {
  id: ReputationTrack;
  name: string;
  description: string;
  icon: string;
  color: string;
  levels: ReputationLevel[];
  xpSources: {
    action: string;
    xp: number;
    description: string;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Explorer Reputation
// ─────────────────────────────────────────────────────────────────────────────

export const EXPLORER_REPUTATION: ReputationTrackConfig = {
  id: 'explorer',
  name: 'Explorer',
  description: 'Discover new areas, walk great distances, find hidden locations',
  icon: '🧭',
  color: '#60A5FA',
  levels: [
    { level: 1, name: 'Newcomer', minXP: 0 },
    { level: 2, name: 'Wanderer', minXP: 100, rewards: { title: 'Wanderer' } },
    { level: 3, name: 'Traveler', minXP: 500, rewards: { stardust: 100 } },
    { level: 4, name: 'Nomad', minXP: 1500, rewards: { title: 'Nomad', stardust: 250 } },
    { level: 5, name: 'Pathfinder', minXP: 4000, rewards: { cosmetic: 'trail_explorer', stardust: 500 } },
    { level: 6, name: 'Trailblazer', minXP: 8000, rewards: { title: 'Trailblazer', stardust: 750 } },
    { level: 7, name: 'Cartographer', minXP: 15000, rewards: { cosmetic: 'aura_compass', stardust: 1000 } },
    { level: 8, name: 'World Walker', minXP: 30000, rewards: { title: 'World Walker', stardust: 2000 } },
    { level: 9, name: 'Realm Seeker', minXP: 50000, rewards: { cosmetic: 'frame_explorer', stardust: 3000 } },
    { level: 10, name: 'Eternal Explorer', minXP: 100000, rewards: { title: 'Eternal Explorer', cosmetic: 'aura_legendary_explorer', stardust: 5000 } },
  ],
  xpSources: [
    { action: 'discover_poi', xp: 50, description: 'Discover a point of interest' },
    { action: 'reveal_fog', xp: 1, description: 'Reveal fog of war cell' },
    { action: 'travel_100m', xp: 5, description: 'Travel 100 meters' },
    { action: 'find_hidden', xp: 100, description: 'Find a hidden location' },
    { action: 'enter_biome', xp: 25, description: 'Enter a new biome' },
    { action: 'reach_edge', xp: 200, description: 'Reach the edge of the world' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Connector Reputation
// ─────────────────────────────────────────────────────────────────────────────

export const CONNECTOR_REPUTATION: ReputationTrackConfig = {
  id: 'connector',
  name: 'Connector',
  description: 'Form bonds, seal star memories, spend time with others',
  icon: '💕',
  color: '#F472B6',
  levels: [
    { level: 1, name: 'Shy Soul', minXP: 0 },
    { level: 2, name: 'Acquaintance', minXP: 100, rewards: { title: 'Acquaintance' } },
    { level: 3, name: 'Friend', minXP: 500, rewards: { stardust: 100 } },
    { level: 4, name: 'Close Friend', minXP: 1500, rewards: { title: 'Close Friend', stardust: 250 } },
    { level: 5, name: 'Social Butterfly', minXP: 4000, rewards: { cosmetic: 'trail_hearts', stardust: 500 } },
    { level: 6, name: 'Community Pillar', minXP: 8000, rewards: { title: 'Community Pillar', stardust: 750 } },
    { level: 7, name: 'Soul Weaver', minXP: 15000, rewards: { cosmetic: 'aura_bonds', stardust: 1000 } },
    { level: 8, name: 'Constellation Keeper', minXP: 30000, rewards: { title: 'Constellation Keeper', stardust: 2000 } },
    { level: 9, name: 'Universal Connector', minXP: 50000, rewards: { cosmetic: 'frame_connector', stardust: 3000 } },
    { level: 10, name: 'Legendary Networker', minXP: 100000, rewards: { title: 'Legendary Networker', cosmetic: 'aura_legendary_connector', stardust: 5000 } },
  ],
  xpSources: [
    { action: 'meet_soul', xp: 10, description: 'Meet a new soul' },
    { action: 'form_bond', xp: 50, description: 'Form a new bond' },
    { action: 'seal_bond', xp: 200, description: 'Seal a star memory' },
    { action: 'time_together', xp: 1, description: 'Spend time near a bond (per minute)' },
    { action: 'gift_light', xp: 25, description: 'Gift light to someone' },
    { action: 'send_message', xp: 5, description: 'Send a message to a bond' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Guardian Reputation
// ─────────────────────────────────────────────────────────────────────────────

export const GUARDIAN_REPUTATION: ReputationTrackConfig = {
  id: 'guardian',
  name: 'Guardian',
  description: 'Help newcomers, rescue players from darkness, share light',
  icon: '🛡️',
  color: '#34D399',
  levels: [
    { level: 1, name: 'Bystander', minXP: 0 },
    { level: 2, name: 'Helper', minXP: 100, rewards: { title: 'Helper' } },
    { level: 3, name: 'Protector', minXP: 500, rewards: { stardust: 100 } },
    { level: 4, name: 'Defender', minXP: 1500, rewards: { title: 'Defender', stardust: 250 } },
    { level: 5, name: 'Guardian', minXP: 4000, rewards: { cosmetic: 'trail_shield', stardust: 500 } },
    { level: 6, name: 'Warden', minXP: 8000, rewards: { title: 'Warden', stardust: 750 } },
    { level: 7, name: 'Sentinel', minXP: 15000, rewards: { cosmetic: 'aura_protect', stardust: 1000 } },
    { level: 8, name: 'Light Keeper', minXP: 30000, rewards: { title: 'Light Keeper', stardust: 2000 } },
    { level: 9, name: 'Champion', minXP: 50000, rewards: { cosmetic: 'frame_guardian', stardust: 3000 } },
    { level: 10, name: 'Eternal Guardian', minXP: 100000, rewards: { title: 'Eternal Guardian', cosmetic: 'aura_legendary_guardian', stardust: 5000 } },
  ],
  xpSources: [
    { action: 'help_newcomer', xp: 50, description: 'Help a new player' },
    { action: 'rescue_darkness', xp: 100, description: 'Rescue someone from darkness' },
    { action: 'share_light', xp: 25, description: 'Share light with depleted soul' },
    { action: 'answer_help', xp: 30, description: 'Respond to help pulse' },
    { action: 'protect_beacon', xp: 40, description: 'Protect a beacon during darkness' },
    { action: 'mentor_session', xp: 75, description: 'Complete a mentoring session' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Beacon Keeper Reputation
// ─────────────────────────────────────────────────────────────────────────────

export const BEACON_KEEPER_REPUTATION: ReputationTrackConfig = {
  id: 'beacon_keeper',
  name: 'Beacon Keeper',
  description: 'Light beacons, defend them, perfect beacon rhythms',
  icon: '💡',
  color: '#FBBF24',
  levels: [
    { level: 1, name: 'Spark', minXP: 0 },
    { level: 2, name: 'Flicker', minXP: 100, rewards: { title: 'Flicker' } },
    { level: 3, name: 'Flame', minXP: 500, rewards: { stardust: 100 } },
    { level: 4, name: 'Torch', minXP: 1500, rewards: { title: 'Torch', stardust: 250 } },
    { level: 5, name: 'Illuminator', minXP: 4000, rewards: { cosmetic: 'trail_beacon', stardust: 500 } },
    { level: 6, name: 'Lighthouse', minXP: 8000, rewards: { title: 'Lighthouse', stardust: 750 } },
    { level: 7, name: 'Beacon Master', minXP: 15000, rewards: { cosmetic: 'aura_beacon', stardust: 1000 } },
    { level: 8, name: 'Light Bringer', minXP: 30000, rewards: { title: 'Light Bringer', stardust: 2000 } },
    { level: 9, name: 'Radiance', minXP: 50000, rewards: { cosmetic: 'frame_beacon', stardust: 3000 } },
    { level: 10, name: 'Eternal Flame', minXP: 100000, rewards: { title: 'Eternal Flame', cosmetic: 'aura_legendary_beacon', stardust: 5000 } },
  ],
  xpSources: [
    { action: 'light_beacon', xp: 100, description: 'Light a beacon' },
    { action: 'charge_beacon', xp: 5, description: 'Contribute to beacon charge' },
    { action: 'time_at_beacon', xp: 1, description: 'Spend time at beacon (per minute)' },
    { action: 'perfect_rhythm', xp: 50, description: 'Achieve perfect beacon rhythm' },
    { action: 'multi_soul_light', xp: 75, description: 'Light beacon with multiple souls' },
    { action: 'defend_beacon', xp: 40, description: 'Defend beacon during darkness' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Collector Reputation
// ─────────────────────────────────────────────────────────────────────────────

export const COLLECTOR_REPUTATION: ReputationTrackConfig = {
  id: 'collector',
  name: 'Collector',
  description: 'Collect fragments, find golden fragments, complete collections',
  icon: '💎',
  color: '#A78BFA',
  levels: [
    { level: 1, name: 'Scavenger', minXP: 0 },
    { level: 2, name: 'Gatherer', minXP: 100, rewards: { title: 'Gatherer' } },
    { level: 3, name: 'Collector', minXP: 500, rewards: { stardust: 100 } },
    { level: 4, name: 'Hoarder', minXP: 1500, rewards: { title: 'Hoarder', stardust: 250 } },
    { level: 5, name: 'Treasure Hunter', minXP: 4000, rewards: { cosmetic: 'trail_sparkle', stardust: 500 } },
    { level: 6, name: 'Fragment Master', minXP: 8000, rewards: { title: 'Fragment Master', stardust: 750 } },
    { level: 7, name: 'Golden Touch', minXP: 15000, rewards: { cosmetic: 'aura_gold', stardust: 1000 } },
    { level: 8, name: 'Midas', minXP: 30000, rewards: { title: 'Midas', stardust: 2000 } },
    { level: 9, name: 'Light Incarnate', minXP: 50000, rewards: { cosmetic: 'frame_collector', stardust: 3000 } },
    { level: 10, name: 'Legendary Midas', minXP: 100000, rewards: { title: 'Legendary Midas', cosmetic: 'aura_legendary_collector', stardust: 5000 } },
  ],
  xpSources: [
    { action: 'collect_fragment', xp: 1, description: 'Collect a regular fragment' },
    { action: 'collect_golden', xp: 25, description: 'Collect a golden fragment' },
    { action: 'complete_collection', xp: 100, description: 'Complete a collection set' },
    { action: 'rare_cosmetic', xp: 50, description: 'Obtain a rare cosmetic' },
    { action: 'trade_item', xp: 10, description: 'Trade an item with another player' },
    { action: 'discover_rare', xp: 75, description: 'Discover a rare item' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// All Reputation Tracks
// ─────────────────────────────────────────────────────────────────────────────

export const REPUTATION_TRACKS: ReputationTrackConfig[] = [
  EXPLORER_REPUTATION,
  CONNECTOR_REPUTATION,
  GUARDIAN_REPUTATION,
  BEACON_KEEPER_REPUTATION,
  COLLECTOR_REPUTATION,
];

// ─────────────────────────────────────────────────────────────────────────────
// Mastery Systems (per lumina-viral-bible.md Section 3.1)
// ─────────────────────────────────────────────────────────────────────────────

export interface MasteryLevel {
  level: number;
  name: string;
  description: string;
  minXP: number;
}

export interface MasterySystem {
  id: string;
  name: string;
  description: string;
  icon: string;
  levels: MasteryLevel[];
}

export const PULSE_MASTERY: MasterySystem = {
  id: 'pulse_mastery',
  name: 'Pulse Mastery',
  description: 'Master the art of pulse communication',
  icon: '📡',
  levels: [
    { level: 1, name: 'Novice', description: 'Basic short/long pulses', minXP: 0 },
    { level: 2, name: 'Apprentice', description: 'Pattern recognition', minXP: 200 },
    { level: 3, name: 'Journeyman', description: 'Rhythm synchronization', minXP: 1000 },
    { level: 4, name: 'Expert', description: 'Complex multi-pulse sequences', minXP: 5000 },
    { level: 5, name: 'Master', description: 'Perfect timing with latency compensation', minXP: 15000 },
    { level: 6, name: 'Grandmaster', description: 'Create new patterns recognized by system', minXP: 50000 },
  ],
};

export const NAVIGATION_MASTERY: MasterySystem = {
  id: 'navigation_mastery',
  name: 'Navigation Mastery',
  description: 'Master the art of world navigation',
  icon: '🗺️',
  levels: [
    { level: 1, name: 'Novice', description: 'Basic movement', minXP: 0 },
    { level: 2, name: 'Apprentice', description: 'Efficient pathing', minXP: 200 },
    { level: 3, name: 'Journeyman', description: 'Shortcut knowledge', minXP: 1000 },
    { level: 4, name: 'Expert', description: 'Optimal fragment routes', minXP: 5000 },
    { level: 5, name: 'Master', description: 'Speed running techniques', minXP: 15000 },
    { level: 6, name: 'Grandmaster', description: 'Guide others flawlessly', minXP: 50000 },
  ],
};

export const MASTERY_SYSTEMS: MasterySystem[] = [
  PULSE_MASTERY,
  NAVIGATION_MASTERY,
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getReputationLevel(track: ReputationTrackConfig, xp: number): ReputationLevel {
  for (let i = track.levels.length - 1; i >= 0; i--) {
    if (xp >= track.levels[i].minXP) {
      return track.levels[i];
    }
  }
  return track.levels[0];
}

export function getNextReputationLevel(track: ReputationTrackConfig, xp: number): ReputationLevel | null {
  const currentLevel = getReputationLevel(track, xp);
  const nextIndex = track.levels.findIndex(l => l.level === currentLevel.level + 1);
  return nextIndex >= 0 ? track.levels[nextIndex] : null;
}

export function getReputationProgress(track: ReputationTrackConfig, xp: number): number {
  const currentLevel = getReputationLevel(track, xp);
  const nextLevel = getNextReputationLevel(track, xp);
  
  if (!nextLevel) return 100;
  
  const levelXP = xp - currentLevel.minXP;
  const levelRange = nextLevel.minXP - currentLevel.minXP;
  
  return Math.min(100, (levelXP / levelRange) * 100);
}

export function getMasteryLevel(mastery: MasterySystem, xp: number): MasteryLevel {
  for (let i = mastery.levels.length - 1; i >= 0; i--) {
    if (xp >= mastery.levels[i].minXP) {
      return mastery.levels[i];
    }
  }
  return mastery.levels[0];
}
