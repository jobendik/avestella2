import type { GameConfig, RealmData, Achievement, Quest, WeeklyQuest, RealmId, Emote } from '../types';

export const CONFIG: GameConfig = {
    // Player progression
    FORMS: ['Spark', 'Ember', 'Flame', 'Prism', 'Nova', 'Celestial', 'Eternal', 'Infinite', 'Ascended', 'Transcendent'],
    LEVEL_XP: [0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000, 50000, 100000],
    
    // Visual/gameplay
    TETHER: 380,
    VIEW_BASE: 520,
    VIEW_BOND: 40,
    BOND_DECAY: 0.06,
    BOND_GAIN: 11,
    STAR_CELL: 180,
    WHISPER_SPEED: 5.5,
    DRIFT: 0.032,
    MINIMAP_R: 2200,
    
    // Campfire Model: Centralized spawn system
    SPAWN_RADIUS: 200,  // All players spawn within this radius of center (0,0)
    CAMPFIRE_RADIUS: 1200,  // The "warm" zone where most activity happens
    
    // Bot/Guardian System
    MIN_POPULATION: 5,  // Minimum number of entities (players + bots) to maintain
    BOT_SPAWN_CHANCE: 0.01,  // Chance per frame to spawn a bot when below min population
    BOT_REMOVE_CHANCE: 0.005,  // Chance per frame to remove a bot when above min population
    
    // Navigation
    COMPASS_DISTANCE: 2000,  // Show compass when this far from center
    
    // === Animation & Physics Constants (formerly magic numbers) ===
    
    // Game loop
    UPDATE_INTERVAL: 16,  // ~60fps fixed timestep
    
    // Player trail
    MAX_TRAIL_LENGTH: 45,
    TRAIL_DECAY_RATE_NEAR: 0.022,  // Decay rate within campfire
    TRAIL_DECAY_RATE_FAR: 0.04,    // Faster decay outside campfire
    
    // Projectile trail
    PROJECTILE_TRAIL_LENGTH: 18,
    
    // Camera
    CAMERA_LERP: 0.075,
    SHAKE_DECAY: 0.03,
    SHAKE_INTENSITY: 12,
    
    // Effect decay rates
    SINGING_DECAY: 0.016,
    PULSING_DECAY: 0.01,
    EMOTE_DECAY: 0.016,
    
    // UI timing
    TOAST_DURATION: 4300,
    
    // Network
    PLAYER_SYNC_INTERVAL: 2000,
    ECHO_SYNC_INTERVAL: 10000,
    POSITION_SYNC_INTERVAL: 3000,
    PLAYER_TIMEOUT: 10000,
    
    // Limits
    MAX_ECHOES: 100,
    MAX_PARTICLES: 500,
    
    // Power-ups system (insp.html inspired)
    POWERUP_SPAWN_INTERVAL: 8000,  // ms between spawn attempts
    POWERUP_SPAWN_CHANCE: 0.4,     // Chance to spawn when interval fires
    POWERUP_LIFETIME: 30,          // Seconds before despawn
    POWERUP_COLLECT_RADIUS: 35,    // Pickup distance
    MAX_POWERUPS: 5,               // Max powerups in world at once
    BOOST_DURATION: 3.0,           // Seconds of speed boost
    BOOST_SPEED_MULTIPLIER: 2.2,   // Speed increase when boosted
    
    // Tag game settings
    TAG_SPEED_MULTIPLIER: 1.5,     // Speed increase in tag arena
    TAG_IT_SPEED_BONUS: 0.2,       // Extra speed for IT player
    TAG_COLLISION_RADIUS: 30,      // Tag detection radius
    TAG_IMMUNITY_TIME: 2000,       // ms of immunity after being tagged
    
    // Camera shake intensities (enhanced)
    SHAKE_LEVELUP: 0.8,
    SHAKE_TAG: 1.2,
    SHAKE_POWERUP: 0.4,
    SHAKE_ECHO: 0.25,
    SHAKE_CONFETTI: 0.3,
};

export const SCALES: Record<RealmId, number[]> = {
    genesis: [261.63, 293.66, 329.63, 392, 440, 523.25],
    nebula: [277.18, 311.13, 369.99, 415.3, 466.16, 554.37],
    void: [130.81, 146.83, 164.81, 196, 220, 261.63],
    starforge: [293.66, 329.63, 369.99, 440, 493.88, 587.33],
    sanctuary: [246.94, 293.66, 329.63, 392, 440, 493.88],
    abyss: [110, 130.81, 146.83, 174.61, 196, 220],
    crystal: [329.63, 369.99, 415.3, 493.88, 554.37, 622.25],
    celestial: [440, 493.88, 554.37, 659.25, 739.99, 880],
    tagarena: [329.63, 392, 440, 523.25, 587.33, 659.25],  // Energetic scale for tag arena
};

export const REALMS: Record<RealmId, RealmData> = {
    genesis: { 
        name: 'Genesis', icon: '🌌', bg: [5, 5, 12], n1: [78, 205, 196], n2: [255, 107, 157], 
        unlock: 1, desc: 'The birthplace', drone: 55,
        physics: { driftMultiplier: 1.0, friction: 1.0 }
    },
    nebula: { 
        name: 'Nebula Gardens', icon: '🌸', bg: [15, 5, 20], n1: [255, 107, 157], n2: [168, 85, 247], 
        unlock: 1, desc: 'Where echoes bloom', drone: 62,
        physics: { driftMultiplier: 0.8, friction: 0.95, particleMultiplier: 1.5 },
        special: 'confetti'  // Messages explode with particles
    },
    void: { 
        name: 'The Void', icon: '🌑', bg: [2, 2, 5], n1: [30, 30, 60], n2: [20, 20, 40], 
        unlock: 1, desc: 'Embrace darkness', drone: 41,
        physics: { driftMultiplier: 0.6, friction: 0.88, gravity: { x: 0, y: 0.05 } }
    },
    starforge: { 
        name: 'Starforge', icon: '🔥', bg: [15, 8, 5], n1: [255, 140, 0], n2: [255, 69, 0], 
        unlock: 5, desc: 'Born of fire', drone: 73,
        physics: { driftMultiplier: 1.3, friction: 1.1, particleMultiplier: 2.0 }
    },
    sanctuary: { 
        name: 'Sanctuary', icon: '🏛️', bg: [8, 12, 18], n1: [100, 149, 237], n2: [135, 206, 250], 
        unlock: 10, desc: 'A haven of peace', drone: 49,
        physics: { driftMultiplier: 0.7, friction: 0.92 },
        special: 'zen'  // Falling leaves, calming effects
    },
    abyss: { 
        name: 'The Abyss', icon: '🌊', bg: [3, 8, 15], n1: [0, 100, 150], n2: [0, 50, 100], 
        unlock: 15, desc: 'Depths unknown', drone: 36,
        physics: { driftMultiplier: 0.5, friction: 0.85, gravity: { x: 0, y: 0.1 } }
    },
    crystal: { 
        name: 'Crystal Caverns', icon: '💎', bg: [12, 8, 18], n1: [200, 150, 255], n2: [150, 100, 200], 
        unlock: 20, desc: 'Prismatic wonder', drone: 82,
        physics: { driftMultiplier: 1.1, friction: 1.05, particleMultiplier: 1.8 }
    },
    celestial: { 
        name: 'Celestial Throne', icon: '👑', bg: [15, 12, 5], n1: [255, 215, 0], n2: [255, 180, 0], 
        unlock: 25, desc: 'For the ascended', drone: 110,
        physics: { driftMultiplier: 1.4, friction: 1.0, particleMultiplier: 2.5 }
    },
    // NEW: Tag Arena - Chase game mode (inspired by insp.html)
    tagarena: { 
        name: 'Tag Arena', icon: '⚡', bg: [8, 5, 15], n1: [255, 68, 102], n2: [255, 215, 0], 
        unlock: 3, desc: 'Run! Avoid the IT player', drone: 80,
        physics: { driftMultiplier: 1.8, friction: 0.95 },
        special: 'tag'  // Tag game mode
    },
};

export const EMOTES: Emote[] = [
    { emoji: '👋', unlock: 1 },
    { emoji: '💫', unlock: 1 },
    { emoji: '❤️', unlock: 1 },
    { emoji: '🎉', unlock: 1 },
    { emoji: '🌟', unlock: 1 },
    { emoji: '✨', unlock: 1 },
    { emoji: '😊', unlock: 1 },
    { emoji: '🤝', unlock: 1 },
    { emoji: '🔥', unlock: 3 },
    { emoji: '💭', unlock: 3 },
    { emoji: '👀', unlock: 3 },
    { emoji: '💕', unlock: 5 },
    { emoji: '🎵', unlock: 5 },
    { emoji: '🌈', unlock: 7 },
    { emoji: '⚡', unlock: 10 },
    { emoji: '👑', unlock: 15 },
];

export const ACHIEVEMENTS: Achievement[] = [
    // Social achievements
    { id: 'first_whisper', name: 'First Words', desc: 'Send your first whisper', icon: '💬', reward: 10, track: 'whispers', need: 1, category: 'social' },
    { id: 'chatterbox', name: 'Chatterbox', desc: 'Send 50 whispers', icon: '🗣️', reward: 50, track: 'whispers', need: 50, category: 'social' },
    { id: 'storyteller', name: 'Storyteller', desc: 'Send 200 whispers', icon: '📚', reward: 100, track: 'whispers', need: 200, category: 'social' },
    { id: 'first_conn', name: 'Kindred Spirit', desc: 'Form your first connection', icon: '💫', reward: 25, track: 'connections', need: 1, category: 'social' },
    { id: 'social', name: 'Social Butterfly', desc: 'Connect with 10 souls', icon: '🦋', reward: 75, track: 'connections', need: 10, category: 'social' },
    { id: 'networker', name: 'Cosmic Networker', desc: 'Connect with 50 souls', icon: '🌐', reward: 150, track: 'connections', need: 50, category: 'social' },
    { id: 'first_friend', name: 'First Friend', desc: 'Add your first friend', icon: '🤝', reward: 30, track: 'friends', need: 1, category: 'social' },
    { id: 'popular', name: 'Popular', desc: 'Have 10 friends', icon: '⭐', reward: 100, track: 'friends', need: 10, category: 'social' },
    { id: 'bond100', name: 'Deep Bond', desc: '100% bond with someone', icon: '💞', reward: 60, track: 'maxBond', need: 100, category: 'social' },
    
    // Exploration achievements
    { id: 'star10', name: 'Star Lighter', desc: 'Light 10 stars', icon: '⭐', reward: 20, track: 'stars', need: 10, category: 'explore' },
    { id: 'star100', name: 'Star Collector', desc: 'Light 100 stars', icon: '🌌', reward: 100, track: 'stars', need: 100, category: 'explore' },
    { id: 'star500', name: 'Constellation Master', desc: 'Light 500 stars', icon: '✨', reward: 200, track: 'stars', need: 500, category: 'explore' },
    { id: 'echo5', name: 'Echo Planter', desc: 'Plant 5 echoes', icon: '🌱', reward: 30, track: 'echoes', need: 5, category: 'explore' },
    { id: 'echo25', name: 'Echo Gardener', desc: 'Plant 25 echoes', icon: '🌿', reward: 80, track: 'echoes', need: 25, category: 'explore' },
    { id: 'realm3', name: 'Realm Explorer', desc: 'Visit 3 realms', icon: '🗺️', reward: 40, track: 'realms', need: 3, category: 'explore' },
    { id: 'realm_all', name: 'Realm Master', desc: 'Visit all 8 realms', icon: '🏆', reward: 200, track: 'realms', need: 8, category: 'explore' },
    { id: 'voice', name: 'Voice Pioneer', desc: 'Use voice chat', icon: '🎙️', reward: 15, track: 'voice', need: 1, category: 'explore' },
    { id: 'lv5', name: 'Nova', desc: 'Reach Level 5', icon: '💥', reward: 50, track: 'level', need: 5, category: 'explore' },
    { id: 'lv10', name: 'Celestial', desc: 'Reach Level 10', icon: '🌠', reward: 100, track: 'level', need: 10, category: 'explore' },
    { id: 'lv20', name: 'Eternal', desc: 'Reach Level 20', icon: '♾️', reward: 200, track: 'level', need: 20, category: 'explore' },
    
    // Secret achievements
    { id: 'night_owl', name: 'Night Owl', desc: 'Play after midnight', icon: '🦉', reward: 25, track: 'nightOwl', need: 1, category: 'secret', secret: true },
    { id: 'marathon', name: 'Marathon', desc: 'Play for 2 hours', icon: '🏃', reward: 50, track: 'marathon', need: 1, category: 'secret', secret: true },
    { id: 'constellation_form', name: 'Constellation', desc: 'Form a 3+ player group', icon: '⭐', reward: 75, track: 'constellation', need: 1, category: 'secret', secret: true },
    { id: 'teleporter', name: 'Teleporter', desc: 'Teleport to a friend', icon: '🚀', reward: 30, track: 'teleports', need: 1, category: 'secret', secret: true },
];

export const QUESTS: Quest[] = [
    { id: 'whisper3', name: 'Cosmic Messenger', desc: 'Send 3 whispers today', icon: '💬', reward: 15, track: 'whispers', need: 3 },
    { id: 'star5', name: 'Illuminate', desc: 'Light 5 stars', icon: '⭐', reward: 10, track: 'stars', need: 5 },
    { id: 'connect1', name: 'Make a Friend', desc: 'Form a new connection', icon: '💫', reward: 20, track: 'connections', need: 1 },
    { id: 'sing2', name: 'Cosmic Harmony', desc: 'Sing 2 times', icon: '🎵', reward: 10, track: 'sings', need: 2 },
    { id: 'emote3', name: 'Express Yourself', desc: 'Use 3 emotes', icon: '😊', reward: 10, track: 'emotes', need: 3 },
];

export const WEEKLY_QUESTS: WeeklyQuest[] = [
    { id: 'w_whisper', name: 'Weekly Messenger', desc: 'Send 50 whispers', icon: '📨', reward: 75, track: 'whispers', need: 50 },
    { id: 'w_stars', name: 'Star Hunter', desc: 'Light 100 stars', icon: '🌟', reward: 100, track: 'stars', need: 100 },
    { id: 'w_friends', name: 'Friendship Week', desc: 'Add 3 friends', icon: '🤝', reward: 80, track: 'newFriends', need: 3 },
    { id: 'w_realms', name: 'Realm Hopper', desc: 'Visit 5 realms', icon: '🌌', reward: 60, track: 'realmChanges', need: 5 },
];

export const APP_ID = 'aura-ultimate-v1';
