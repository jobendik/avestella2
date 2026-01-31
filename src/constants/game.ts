// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Core Game Constants (Extracted from App.jsx)
// ═══════════════════════════════════════════════════════════════════════════

import type { Beacon, Season } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// World Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const WORLD_SIZE = 8000;
export const AI_COUNT = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Campfire Model (from LEGACY - centralized spawn system)
// ─────────────────────────────────────────────────────────────────────────────

export const SPAWN_RADIUS = 200;           // All players spawn within this radius of center (0,0)
export const CAMPFIRE_RADIUS = 1200;       // The "warm" zone where most activity happens
export const CAMPFIRE_CENTER = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 }; // Center of world
export const COMPASS_DISTANCE = 2000;      // Show compass when this far from center

// ─────────────────────────────────────────────────────────────────────────────
// Procedural Star System (from LEGACY)
// ─────────────────────────────────────────────────────────────────────────────

export const STAR_CELL_SIZE = 180;         // Grid cell size for star generation
export const STAR_BASE_COUNT = 5;          // Base stars per cell
export const STAR_VARIANCE = 8;            // Random variance in star count
export const STAR_VIEW_RADIUS = 520;       // Base view radius
export const STAR_BOND_BONUS = 40;         // Extra view radius per strong bond

// ─────────────────────────────────────────────────────────────────────────────
// Tether System (from LEGACY - visual bonds between players)
// ─────────────────────────────────────────────────────────────────────────────

export const TETHER_DISTANCE = 380;        // Max distance for tether visibility
export const TETHER_GRAPH_DISTANCE = 304;  // Distance for social graph edges (0.8 * TETHER)

// ─────────────────────────────────────────────────────────────────────────────
// Power-Up System (from LEGACY)
// ─────────────────────────────────────────────────────────────────────────────

export const POWERUP_SPAWN_INTERVAL = 8000;   // ms between spawn attempts
export const POWERUP_SPAWN_CHANCE = 0.4;      // Chance to spawn when interval fires
export const POWERUP_LIFETIME = 30;           // Seconds before despawn
export const POWERUP_COLLECT_RADIUS = 35;     // Pickup distance
export const MAX_POWERUPS = 5;                // Max powerups in world at once
export const BOOST_DURATION = 3.0;            // Seconds of boost effect
export const BOOST_SPEED_MULTIPLIER = 2.2;    // Speed increase when boosted
export const POWERUP_XP_BONUS = 50;           // XP gained from XP power-up

// ─────────────────────────────────────────────────────────────────────────────
// Tag Arena Settings (from LEGACY)
// ─────────────────────────────────────────────────────────────────────────────

export const TAG_SPEED_MULTIPLIER = 1.5;      // Speed increase in tag arena
export const TAG_IT_SPEED_BONUS = 0.2;        // Extra speed for IT player
export const TAG_COLLISION_RADIUS = 30;       // Tag detection radius
export const TAG_IMMUNITY_TIME = 2000;        // ms of immunity after being tagged

// ─────────────────────────────────────────────────────────────────────────────
// Camera Shake Intensities (from LEGACY)
// ─────────────────────────────────────────────────────────────────────────────

export const SHAKE_LEVELUP = 0.8;
export const SHAKE_TAG = 1.2;
export const SHAKE_POWERUP = 0.4;
export const SHAKE_ECHO = 0.25;
export const SHAKE_CONFETTI = 0.3;
export const SHAKE_SNAPSHOT = 0.2;
export const SHAKE_REACTION = 0.15;

// ─────────────────────────────────────────────────────────────────────────────
// Light & Radius
// ─────────────────────────────────────────────────────────────────────────────

export const LIGHT_MIN_RADIUS = 30;
export const LIGHT_MAX_RADIUS = 180;

// ─────────────────────────────────────────────────────────────────────────────
// Cold/Warmth System
// ─────────────────────────────────────────────────────────────────────────────

export const COLD_ONSET_DELAY = 180;       // frames before cold starts
export const COLD_SHRINK_RATE = 0.06;      // radius shrink per frame in cold
export const WARMTH_GROW_RATE = 0.15;      // radius growth when near warmth

// ─────────────────────────────────────────────────────────────────────────────
// Social & Connection
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_CONNECTION_DIST = 300;
export const OPTIMAL_DISTANCE = 120;
export const CROWDING_DISTANCE = 50;
export const BOND_GROW_RATE = 0.005; // Increased from 0.003 for faster bonding
export const BOND_DECAY_RATE = 0.0008;
export const BOND_CONFIRM_THRESHOLD = 0.2; // Reduced from 0.3 for easier confirmation
export const HANDSHAKE_WINDOW = 3000;       // ms for handshake confirmation

// ─────────────────────────────────────────────────────────────────────────────
// Chat & Communication
// ─────────────────────────────────────────────────────────────────────────────

export const CHAT_BUBBLE_DURATION = 8000;  // ms chat bubbles stay visible (legacy: 8000)

// ─────────────────────────────────────────────────────────────────────────────
// Pulse System
// ─────────────────────────────────────────────────────────────────────────────

export const PULSE_PATTERN_TIMEOUT = 1500; // ms before pattern resets (legacy: 1500)

// ─────────────────────────────────────────────────────────────────────────────
// Movement & Physics
// ─────────────────────────────────────────────────────────────────────────────

export const IDLE_BREATH_THRESHOLD = 180;  // legacy: 180
export const WARMTH_LINGER_FRAMES = 900;   // legacy: 900 - frames warmth lingers
export const WARMTH_GRANT_FLOOR = 450;     // legacy: 450 - minimum warmth grant

// ─────────────────────────────────────────────────────────────────────────────
// Trails
// ─────────────────────────────────────────────────────────────────────────────

export const TRAIL_SEGMENT_INTERVAL = 50;
export const TRAIL_BOOST_AMOUNT = 0.5;
export const TRAIL_DURATION = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Particles
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_PARTICLES = 200;          // legacy: 200
export const MAX_FRAGMENTS = 200;          // legacy: 200

// ─────────────────────────────────────────────────────────────────────────────
// Beacons (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const BEACON_CHARGE_RADIUS = 160;   // legacy: 160
export const BEACON_CHARGE_RATE = 0.008;
export const BEACON_ACTIVATION_FRAMES = 4; // legacy: 4

export const BEACONS: Beacon[] = [
  { id: 'b1', x: 1000, y: 1000, name: 'Dawn Spire', icon: '🌅', type: 'hope', rhythmPattern: [1, 0, 1, 0, 1, 1, 0, 0], rhythmOffset: 0, color: '#FFD700', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b2', x: 7000, y: 1000, name: 'Starfall Peak', icon: '⭐', type: 'wonder', rhythmPattern: [1, 1, 0, 1, 0, 0, 1, 0], rhythmOffset: 2, color: '#E6E6FA', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b3', x: 4000, y: 4000, name: 'Heart of Light', icon: '💖', type: 'love', rhythmPattern: [1, 0, 0, 1, 1, 0, 0, 1], rhythmOffset: 4, color: '#FF69B4', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b4', x: 1000, y: 7000, name: 'Moonrise Tower', icon: '🌙', type: 'dreams', rhythmPattern: [0, 1, 1, 0, 1, 0, 1, 0], rhythmOffset: 6, color: '#87CEEB', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b5', x: 7000, y: 7000, name: 'Eternal Flame', icon: '🔥', type: 'courage', rhythmPattern: [1, 1, 1, 0, 0, 1, 0, 0], rhythmOffset: 0, color: '#FF6B6B', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b6', x: 4000, y: 1000, name: 'Crystal Sanctum', icon: '💎', type: 'clarity', rhythmPattern: [1, 0, 1, 1, 0, 0, 1, 0], rhythmOffset: 1, color: '#00CED1', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b7', x: 1000, y: 4000, name: 'Whisper Grove', icon: '🌿', type: 'peace', rhythmPattern: [0, 1, 0, 1, 0, 1, 1, 0], rhythmOffset: 3, color: '#98FB98', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b8', x: 7000, y: 4000, name: 'Aurora Spire', icon: '🌈', type: 'joy', rhythmPattern: [1, 1, 0, 0, 1, 1, 0, 0], rhythmOffset: 5, color: '#DDA0DD', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b9', x: 4000, y: 7000, name: 'Echo Chamber', icon: '🔔', type: 'harmony', rhythmPattern: [0, 0, 1, 1, 0, 0, 1, 1], rhythmOffset: 7, color: '#F0E68C', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b10', x: 2500, y: 2500, name: 'Spirit Well', icon: '💫', type: 'wonder', rhythmPattern: [1, 0, 0, 1, 0, 1, 1, 0], rhythmOffset: 2, color: '#B8860B', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b11', x: 5500, y: 2500, name: 'Ember Throne', icon: '👑', type: 'courage', rhythmPattern: [1, 1, 0, 0, 0, 1, 1, 0], rhythmOffset: 4, color: '#CD853F', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b12', x: 2500, y: 5500, name: 'Memory Pool', icon: '💧', type: 'dreams', rhythmPattern: [0, 1, 1, 0, 0, 1, 0, 1], rhythmOffset: 6, color: '#4169E1', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
  { id: 'b13', x: 5500, y: 5500, name: 'Twilight Arch', icon: '🌆', type: 'hope', rhythmPattern: [0, 0, 1, 0, 1, 1, 0, 1], rhythmOffset: 0, color: '#9370DB', active: false, lit: false, lightLevel: 0, pulsePhase: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Darkness Wave System
// ─────────────────────────────────────────────────────────────────────────────

export const DARKNESS_WAVE_INTERVAL = 90000; // ms between waves (legacy: 90000)
export const DARKNESS_WAVE_DURATION = 15000; // ms wave duration (legacy: 15000)
export const DARKNESS_WAVE_WARNING = 5000;   // ms warning before wave (legacy: 5000)

// ─────────────────────────────────────────────────────────────────────────────
// Golden Fragment System
// ─────────────────────────────────────────────────────────────────────────────

export const GOLDEN_FRAGMENT_SPAWN_CHANCE = 0.002; // legacy: 0.002
export const GOLDEN_FRAGMENT_VALUE = 25;           // legacy: 25
export const FRAGMENT_COLLECT_RADIUS = 60;         // legacy: 60
export const FRAGMENT_SPAWN_RATE = 0.02;           // legacy: 0.02

// ─────────────────────────────────────────────────────────────────────────────
// Trail System (from legacy_2)
// ─────────────────────────────────────────────────────────────────────────────

export const TRAIL_FADE_DURATION = 30000;   // ms for trails to fade (legacy: 30000)
export const TRAIL_INTERVAL = 100;          // ms between trail points (legacy: 100)
// TRAIL_BOOST_AMOUNT is defined above (line 66)

// ─────────────────────────────────────────────────────────────────────────────
// Beacon System (legacy_2 values match existing definitions)
// ─────────────────────────────────────────────────────────────────────────────

// BEACON_CHARGE_RADIUS is defined above (line 80)

// ─────────────────────────────────────────────────────────────────────────────
// Minimap
// ─────────────────────────────────────────────────────────────────────────────

export const MINIMAP_SIZE = 120;
export const MINIMAP_MARGIN = 20;

// ─────────────────────────────────────────────────────────────────────────────
// AI Agents (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const AI_AGENT_COUNT = 30;

export const AI_PERSONALITIES = [
  { type: 'explorer', speed: 1.8, wanderRange: 3000, social: 0.3, socialRadius: 30, pauseChance: 0.01, color: '#60a5fa', pulseChance: 0.02 },
  { type: 'social', speed: 1.0, wanderRange: 800, social: 0.9, socialRadius: 90, pauseChance: 0.02, color: '#f472b6', pulseChance: 0.05 },
  { type: 'shy', speed: 0.6, wanderRange: 400, social: 0.1, socialRadius: 10, pauseChance: 0.05, color: '#a78bfa', pulseChance: 0.01 },
  { type: 'seeker', speed: 1.4, wanderRange: 2000, social: 0.5, socialRadius: 50, pauseChance: 0.01, color: '#34d399', pulseChance: 0.03 },
  { type: 'wanderer', speed: 1.2, wanderRange: 1500, social: 0.4, socialRadius: 40, pauseChance: 0.03, color: '#fbbf24', pulseChance: 0.02 },
  { type: 'guardian', speed: 0.8, wanderRange: 600, social: 0.7, socialRadius: 70, pauseChance: 0.04, color: '#fb923c', pulseChance: 0.04 },
];

export const AI_MESSAGES = {
  greeting: ['Hey there!', 'Hello friend!', 'Nice to meet you!', 'Welcome!'],
  excited: ['So bright!', 'Beautiful!', 'Amazing!', 'Wow!'],
  group: ['Stronger together!', 'United we glow!'],
  random: ['Keep shining.', 'Beautiful night…', '✨'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Seasons (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const SEASONS: Record<string, Season> = {
  spring: { name: 'Spring Bloom', color: '#FFB6D9', particleType: 'petals', bonusType: 'bonds' },
  summer: { name: 'Summer Radiance', color: '#FFD700', particleType: 'sparks', bonusType: 'light' },
  autumn: { name: 'Autumn Harvest', color: '#FF8C42', particleType: 'leaves', bonusType: 'fragments' },
  winter: { name: 'Winter Solstice', color: '#B0E0E6', particleType: 'snowflakes', bonusType: 'warmth' },
};

export function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Colors
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_LIGHT_COLOR = '#FFD700';

export const AGENT_COLORS = [
  '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#fbbf24',
  '#34d399', '#818cf8', '#fb7185', '#2dd4bf', '#c084fc',
  '#22d3ee', '#f97316', '#a3e635', '#e879f9', '#facc15',
];

// ─────────────────────────────────────────────────────────────────────────────
// Random Names for AI Agents (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const RANDOM_NAMES = [
  'Wandering Sun', 'Glowing Flame', 'Silent Spark', 'Seeking Light', 'Shimmering Ray',
  'Eternal Guardian', 'Lost Hope', 'Bright Dream', 'Dreaming Spirit', 'Drifting Star',
  'Golden Ember', 'Radiant Wanderer', 'Whispering Soul', 'Dancing Beacon', 'Floating Phoenix',
  'Ancient Wisp', 'Gentle Echo', 'Kind Memory', 'Cosmic Dawn', 'Velvet Twilight',
  'Mystic Nova', 'Aurora Comet', 'Nebula Ray', 'Stellar Flame', 'Lunar Spirit'
];

export function getRandomName(): string {
  const adjs = ['Wandering', 'Glowing', 'Silent', 'Seeking', 'Shimmering', 'Eternal', 'Lost', 'Bright', 'Dreaming', 'Drifting', 'Golden', 'Radiant', 'Whispering', 'Dancing', 'Floating', 'Ancient', 'Gentle', 'Kind', 'Cosmic', 'Velvet', 'Mystic', 'Aurora'];
  const nouns = ['Sun', 'Flame', 'Spark', 'Light', 'Ray', 'Guardian', 'Hope', 'Dream', 'Spirit', 'Star', 'Ember', 'Wanderer', 'Soul', 'Beacon', 'Phoenix', 'Wisp', 'Echo', 'Memory', 'Dawn', 'Twilight', 'Nova', 'Comet', 'Nebula'];
  return `${adjs[Math.floor(Math.random() * adjs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulse Patterns (from lumina-viral-bible.md Section 5.1)
// ─────────────────────────────────────────────────────────────────────────────
// 1 = short pulse, 2 = long pulse

export const PULSE_PATTERNS: Record<string, number[]> = {
  // ═══ BASIC COMMUNICATION ═══
  hello: [1, 1],           // short short = "hello/greeting"
  goodbye: [2, 1],         // long short = "goodbye/farewell"
  yes: [1, 1],             // short short = "agreement"
  no: [2, 2],              // long long = "disagreement"
  thanks: [1, 2, 1, 2],    // short long short long = "thank you"
  sorry: [2, 1, 2],        // long short long = "apology"

  // ═══ NAVIGATION ═══
  follow: [1, 1, 2],       // short short long = "follow me"
  wait: [2],               // long = "stay here"
  go_beacon: [1, 1, 1],    // three short = "head to beacon"
  go_there: [1, 2, 2],     // short long long = "go that direction"
  come_back: [2, 1, 1],    // long short short = "return here"
  found: [1, 1, 2],        // short short long = "discovery"

  // ═══ EMOTIONAL ═══
  joy: [1, 1, 1, 1],       // four short = "happiness/joy"
  sad: [2, 2, 2],          // three long = "sadness"
  excited: [1, 1, 1, 1, 1], // five rapid = "excitement"
  scared: [2, 1, 2, 1],    // long short long short = "fear"
  love: [2, 2, 1, 1],      // long long short short = "affection"

  // ═══ EMERGENCY ═══
  help: [1, 2, 1],         // short long short = "need assistance"
  danger: [2, 2, 2, 1],    // three long one short = "warning"
  sos: [1, 1, 1, 2, 2, 2, 1, 1, 1], // ... --- ... = "emergency"
};

export const PULSE_MESSAGES: Record<string, string> = {
  // Basic
  hello: '👋 Hello!',
  goodbye: '👋 Goodbye!',
  yes: '✅ Yes!',
  no: '❌ No',
  thanks: '🙏 Thank you!',
  sorry: '😔 Sorry!',
  // Navigation
  follow: '👉 Follow me!',
  wait: '✋ Wait here',
  go_beacon: '🔷 To the beacon!',
  go_there: '👉 Go that way!',
  come_back: '🔙 Come back!',
  found: '🔍 Found something!',
  // Emotional
  joy: '✨ Pure joy!',
  sad: '😢 Feeling sad...',
  excited: '🎉 So excited!',
  scared: '😰 I\'m scared...',
  love: '💕 Love!',
  // Emergency
  help: '🆘 Need help!',
  danger: '⚠️ Danger!',
  sos: '🚨 SOS - Emergency!',
};

// ─────────────────────────────────────────────────────────────────────────────
// Quick Chat Options (from App.jsx) - DEPRECATED, use social.ts QUICK_CHAT_OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const QUICK_CHAT_OPTIONS = [
  { emoji: '👋', text: 'Hello!' },
  { emoji: '💖', text: 'Beautiful!' },
  { emoji: '✨', text: 'Amazing!' },
  { emoji: '🎉', text: 'Yay!' },
  { emoji: '🤝', text: 'Together!' },
  { emoji: '👀', text: 'Look!' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Ambient Modes (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const AMBIENT_MODES = {
  firefly: {
    name: 'Firefly Watch',
    icon: '✨',
    desc: 'Peaceful observation mode',
    color: '#FDE047',
    effects: { slowMotion: true, hideUI: true, fireflyCount: 30 }
  },
  shrine: {
    name: 'Shrine Meditation',
    icon: '🛕',
    desc: 'Meditate at a beacon',
    color: '#60A5FA',
    effects: { teleportToBeacon: true, healingAura: true, slowTime: true }
  },
  meditation: {
    name: 'Meditation',
    icon: '🧘',
    desc: 'Calm minimal experience',
    color: '#A78BFA',
    effects: { hideOthers: true, minimalUI: true, breathFocus: true }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Screenshot & Share (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const SCREENSHOT_FILTERS = [
  { id: 'none', name: 'Original', style: '' },
  { id: 'warm', name: 'Warm Glow', style: 'sepia(30%) saturate(130%) brightness(110%)' },
  { id: 'cool', name: 'Cool Night', style: 'hue-rotate(180deg) saturate(120%)' },
  { id: 'dreamy', name: 'Dreamy', style: 'contrast(90%) brightness(110%) saturate(120%) blur(0.5px)' },
  { id: 'vivid', name: 'Vivid', style: 'contrast(120%) saturate(150%)' },
  { id: 'monochrome', name: 'Monochrome', style: 'grayscale(100%) contrast(110%)' },
];

export const SHARE_TEMPLATES = [
  { id: 'minimal', name: 'Minimal', style: 'clean' },
  { id: 'stats', name: 'Stats Card', style: 'with-stats' },
  { id: 'quote', name: 'Quote', style: 'with-quote' },
  { id: 'framed', name: 'Framed', style: 'with-border' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tutorial Steps (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export const TUTORIAL_STEPS = [
  {
    id: 0,
    title: 'Welcome, Wanderer',
    text: 'You are a light in the cosmos. Your journey begins here.',
    icon: 'Sparkles',
    action: 'tap_to_start',
    skippable: false
  },
  {
    id: 1,
    title: 'Find Your Light',
    text: 'Touch to move through the cosmos. Collect the glowing fragments.',
    icon: 'Navigation',
    highlight: 'fragments',
    goal: 'collect_3_fragments',
    skippable: true
  },
  {
    id: 2,
    title: 'Meet Other Souls',
    text: "You're not alone here. Approach glowing lights to meet others.",
    icon: 'Users',
    highlight: 'other_souls',
    goal: 'approach_soul',
    skippable: true
  },
  {
    id: 3,
    title: 'Form Connections',
    text: 'Stay near someone to form a bond. Bonds make you both stronger.',
    icon: 'Heart',
    highlight: 'bond_meter',
    goal: 'form_bond',
    skippable: true
  },
  {
    id: 4,
    title: 'Light the Way',
    text: 'Find and charge beacons to brighten the world for everyone.',
    icon: 'Zap',
    highlight: 'beacons',
    goal: 'visit_beacon',
    skippable: true
  },
  {
    id: 5,
    title: 'Your Journey Begins',
    text: 'Complete daily challenges, unlock cosmetics, and create lasting memories.',
    icon: 'Star',
    action: 'show_menus',
    skippable: false
  }];