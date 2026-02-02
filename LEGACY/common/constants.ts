// Shared constants between client and server

export const REALMS = {
    genesis: { name: 'Genesis', icon: '🌌', unlock: 1 },
    nebula: { name: 'Nebula Gardens', icon: '🌸', unlock: 1 },
    void: { name: 'The Void', icon: '🌑', unlock: 1 },
    starforge: { name: 'Starforge', icon: '🔥', unlock: 5 },
    sanctuary: { name: 'Sanctuary', icon: '🏛️', unlock: 10 }
} as const;

export type RealmId = keyof typeof REALMS;

export const FORMS = ['Spark', 'Ember', 'Flame', 'Prism', 'Nova', 'Celestial', 'Eternal', 'Infinite'] as const;
export type Form = typeof FORMS[number];

export const LEVEL_XP = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000] as const;

// Shared configuration values
export const SHARED_CONFIG = {
    // Network
    PLAYER_TIMEOUT: 10000,
    PLAYER_SYNC_INTERVAL: 2000,
    POSITION_SYNC_INTERVAL: 3000,
    
    // Bot/Guardian System
    MIN_POPULATION: 5,
    BOT_SPAWN_CHANCE: 0.01,
    BOT_REMOVE_CHANCE: 0.005,
    
    // Limits
    MAX_ECHOES_PER_REALM: 1000,
    MAX_WHISPER_LENGTH: 500,
    MAX_ECHO_LENGTH: 200,
    MAX_PLAYER_NAME: 30,
    
    // Gameplay
    SPAWN_RADIUS: 800,
    CAMPFIRE_RADIUS: 1200,
    VIEW_BASE: 520,
    
    // XP gains
    XP_STAR_LIT: 3,
    XP_ECHO_PLANTED: 5,
    XP_WHISPER_SENT: 1,
    XP_BOND_TICK: 1
} as const;

/**
 * Get player level from XP
 */
export function getLevel(xp: number): number {
    for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_XP[i]) return i + 1;
    }
    return 1;
}

/**
 * Get player form/title based on level
 */
export function getForm(level: number): Form {
    return FORMS[Math.min(level - 1, FORMS.length - 1)];
}
