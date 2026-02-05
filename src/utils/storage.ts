// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Storage Utilities
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_PREFIX = 'avestella_';

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save data to localStorage with prefix
 */
export function saveToStorage<T>(key: string, data: T): boolean {
  if (!isStorageAvailable()) return false;

  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
    return true;
  } catch (error) {
    console.error('Failed to save to storage:', error);
    return false;
  }
}

/**
 * Load data from localStorage
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue;

  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return defaultValue;
  }
}

/**
 * Remove item from localStorage
 */
export function removeFromStorage(key: string): boolean {
  if (!isStorageAvailable()) return false;

  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
    return true;
  } catch (error) {
    console.error('Failed to remove from storage:', error);
    return false;
  }
}

/**
 * Clear all Avestella data from localStorage
 */
export function clearAllStorage(): boolean {
  if (!isStorageAvailable()) return false;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('Failed to clear storage:', error);
    return false;
  }
}

/**
 * Get all Avestella storage keys
 */
export function getAllStorageKeys(): string[] {
  if (!isStorageAvailable()) return [];

  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key.replace(STORAGE_PREFIX, ''));
    }
  }
  return keys;
}

/**
 * Get storage usage in bytes
 */
export function getStorageUsage(): number {
  if (!isStorageAvailable()) return 0;

  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key) || '';
      total += key.length + value.length;
    }
  }
  return total * 2; // UTF-16 encoding uses 2 bytes per character
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  // Player Progress
  PLAYER_DATA: 'player_data',
  PLAYER_LEVEL: 'player_level',
  PLAYER_XP: 'player_xp',
  STARDUST: 'stardust',

  // Cosmetics
  OWNED_COSMETICS: 'owned_cosmetics',
  EQUIPPED_COSMETICS: 'equipped_cosmetics',
  EQUIPPED_TRAIL: 'equipped_trail',
  EQUIPPED_COLOR: 'equipped_color',
  EQUIPPED_AURA: 'equipped_aura',
  EQUIPPED_COMPANION: 'equipped_companion',
  EQUIPPED_TITLE: 'equipped_title',

  // Statistics
  TOTAL_FRAGMENTS: 'total_fragments',
  TOTAL_BONDS: 'total_bonds',
  TOTAL_BEACONS: 'total_beacons',
  TOTAL_DISTANCE: 'total_distance',
  PLAY_TIME: 'play_time',

  // Progression
  ACHIEVEMENTS: 'achievements',
  DAILY_LOGIN_STREAK: 'daily_login_streak',
  LAST_LOGIN_DATE: 'last_login_date',
  CLAIMED_DAILY_REWARDS: 'claimed_daily_rewards',
  SEASON_PASS_TIER: 'season_pass_tier',
  SEASON_PASS_XP: 'season_pass_xp',

  // Settings
  SETTINGS: 'settings',
  SOUND_ENABLED: 'sound_enabled',
  MUSIC_ENABLED: 'music_enabled',
  PARTICLES_ENABLED: 'particles_enabled',

  // Game State
  BEACONS_LIT: 'beacons_lit',
  TUTORIAL_COMPLETED: 'tutorial_completed',
  TUTORIAL_STEP: 'tutorial_step',

  // Social
  PLAYER_NAME: 'player_name',
  PLAYER_AVATAR: 'player_avatar',
  FRIENDS_LIST: 'friends_list',
  GUILD_DATA: 'guild_data',

  // Events
  EVENT_PROGRESS: 'event_progress',
  CLAIMED_EVENT_REWARDS: 'claimed_event_rewards',

  // Relationships
  BONDS: 'bonds',
  STAR_MEMORIES: 'star_memories',
  AI_AGENTS: 'ai_agents',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ─────────────────────────────────────────────────────────────────────────────
// Type-Safe Storage Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save player settings
 */
export function saveSettings(settings: Record<string, unknown>): boolean {
  return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Load player settings
 */
export function loadSettings(): Record<string, unknown> {
  return loadFromStorage(STORAGE_KEYS.SETTINGS, {});
}

/**
 * Save player progress
 */
export interface PlayerProgress {
  level: number;
  xp: number;
  stardust: number;
  totalFragments: number;
  totalBonds: number;
  totalBeacons: number;
  playTime: number;
  lastModified?: number; // Server timestamp for authoritative merge
}

export function savePlayerProgress(progress: PlayerProgress): boolean {
  // Always add a timestamp when saving locally
  const timestampedProgress = {
    ...progress,
    lastModified: Date.now()
  };
  return saveToStorage(STORAGE_KEYS.PLAYER_DATA, timestampedProgress);
}

/**
 * Load player progress
 */
export function loadPlayerProgress(): PlayerProgress {
  return loadFromStorage(STORAGE_KEYS.PLAYER_DATA, {
    level: 1,
    xp: 0,
    stardust: 0,
    totalFragments: 0,
    totalBonds: 0,
    totalBeacons: 0,
    playTime: 0,
    lastModified: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Export/Import/Merge (from legacy_2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export all Avestella data as JSON
 */
export function exportData(): string {
  const data: Record<string, unknown> = {};

  const keys = getAllStorageKeys();
  keys.forEach(key => {
    data[key] = loadFromStorage(key, null);
  });

  return JSON.stringify({
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  }, null, 2);
}

/**
 * Import data from JSON string
 */
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);

    // Remove metadata fields before importing
    const { exportedAt, version, ...importableData } = data;

    for (const [key, value] of Object.entries(importableData)) {
      if (value !== null && value !== undefined) {
        saveToStorage(key, value);
      }
    }

    return true;
  } catch (e) {
    console.warn('Failed to import data:', e);
    return false;
  }
}

/**
 * Merge progress data (for syncing between devices)
 * SECURITY: Server data is always authoritative. Local data is only used as fallback
 * when server is unavailable or to fill in missing fields.
 */
export function mergeProgress(
  local: PlayerProgress | null,
  remote: PlayerProgress | null
): PlayerProgress {
  const defaultProgress: PlayerProgress = {
    level: 1,
    xp: 0,
    stardust: 0,
    totalFragments: 0,
    totalBonds: 0,
    totalBeacons: 0,
    playTime: 0,
    lastModified: 0,
  };

  if (!local && !remote) return defaultProgress;
  if (!local) return remote || defaultProgress;
  if (!remote) return local;

  const localTs = local.lastModified || 0;
  const remoteTs = remote.lastModified || 0;

  // Log significant differences for debugging potential exploitation
  const xpDiff = Math.abs((local.xp || 0) - (remote.xp || 0));
  const stardustDiff = Math.abs((local.stardust || 0) - (remote.stardust || 0));

  if (xpDiff > 1000 || stardustDiff > 500) {
    console.warn('[Storage] Large discrepancy detected during merge:', {
      xpDiff,
      stardustDiff,
      localTs,
      remoteTs,
      preferring: remoteTs >= localTs ? 'remote (server)' : 'local'
    });
  }

  // SERVER DATA IS AUTHORITATIVE: prefer remote (server) data when available
  // Only use local data if it's more recent AND server data is stale/missing
  if (remoteTs >= localTs) {
    // Server is newer or equal - use server data entirely
    return { ...remote };
  }

  // Local is newer (offline play) - still prefer server for critical values
  // but allow local playTime accumulation
  return {
    level: remote.level || local.level,
    xp: remote.xp || local.xp,  // Server-authoritative for XP
    stardust: remote.stardust || local.stardust, // Server-authoritative for stardust
    totalFragments: remote.totalFragments || local.totalFragments,
    totalBonds: remote.totalBonds || local.totalBonds,
    totalBeacons: remote.totalBeacons || local.totalBeacons,
    playTime: Math.max(local.playTime, remote.playTime), // Allow playTime to accumulate
    lastModified: Math.max(localTs, remoteTs),
  };
}

/**
 * Get storage info
 */
export function getStorageInfo(): { used: number; available: boolean } {
  return {
    used: getStorageUsage(),
    available: isStorageAvailable()
  };
}
