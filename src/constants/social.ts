// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Social & Events Constants
// ═══════════════════════════════════════════════════════════════════════════

import type { QuickChatOption, AmbientMode, GameEvent, Personality } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Quick Chat Options (48+ options per lumina-viral-bible.md Section 5.2)
// ─────────────────────────────────────────────────────────────────────────────

export const QUICK_CHAT_OPTIONS: QuickChatOption[] = [
  // ═══ GREETINGS (8 options) ═══
  { id: 'hello', icon: '👋', text: 'Hello!', category: 'greeting' },
  { id: 'welcome', icon: '🌟', text: 'Welcome!', category: 'greeting' },
  { id: 'nice_meet', icon: '💫', text: 'Nice to meet you!', category: 'greeting' },
  { id: 'good_evening', icon: '🌙', text: 'Good evening!', category: 'greeting' },
  { id: 'good_morning', icon: '☀️', text: 'Good morning!', category: 'greeting' },
  { id: 'i_see_you', icon: '👀', text: 'I see you!', category: 'greeting' },
  { id: 'hi_friend', icon: '🤗', text: 'Hi friend!', category: 'greeting' },
  { id: 'greetings', icon: '✨', text: 'Greetings, soul!', category: 'greeting' },

  // ═══ QUESTIONS (8 options) ═══
  { id: 'where_from', icon: '🌍', text: 'Where are you from?', category: 'question' },
  { id: 'your_name', icon: '❓', text: 'What\'s your name?', category: 'question' },
  { id: 'where_going', icon: '🎯', text: 'Where are you going?', category: 'question' },
  { id: 'need_help', icon: '🤔', text: 'Need help?', category: 'question' },
  { id: 'want_explore', icon: '🎪', text: 'Want to explore?', category: 'question' },
  { id: 'did_see', icon: '🔔', text: 'Did you see that?', category: 'question' },
  { id: 'how_long', icon: '⏰', text: 'How long have you played?', category: 'question' },
  { id: 'what_think', icon: '💭', text: 'What do you think?', category: 'question' },

  // ═══ RESPONSES (8 options) ═══
  { id: 'yes', icon: '👍', text: 'Yes!', category: 'response' },
  { id: 'no', icon: '👎', text: 'No thanks', category: 'response' },
  { id: 'idk', icon: '🤷', text: 'I don\'t know', category: 'response' },
  { id: 'one_moment', icon: '⏳', text: 'One moment', category: 'response' },
  { id: 'on_my_way', icon: '🔜', text: 'On my way!', category: 'response' },
  { id: 'absolutely', icon: '💯', text: 'Absolutely!', category: 'response' },
  { id: 'love_that', icon: '❤️', text: 'I\'d love that!', category: 'response' },
  { id: 'please', icon: '🙏', text: 'Please!', category: 'response' },

  // ═══ ACTIONS (8 options) ═══
  { id: 'follow', icon: '🚶', text: 'Follow me', category: 'action' },
  { id: 'wait', icon: '⏸️', text: 'Wait here', category: 'action' },
  { id: 'beacon', icon: '✨', text: 'Let\'s beacon!', category: 'action' },
  { id: 'darkness', icon: '🌑', text: 'Darkness coming!', category: 'action' },
  { id: 'gift', icon: '🎁', text: 'Gift incoming', category: 'action' },
  { id: 'photo', icon: '📸', text: 'Photo time!', category: 'action' },
  { id: 'sync', icon: '🎵', text: 'Let\'s sync!', category: 'action' },
  { id: 'play', icon: '🎮', text: 'Let\'s play!', category: 'action' },

  // ═══ EMOTIONS (8 options) ═══
  { id: 'happy', icon: '😊', text: 'So happy!', category: 'emotion' },
  { id: 'sad', icon: '😢', text: 'Feeling sad', category: 'emotion' },
  { id: 'amazing', icon: '🤩', text: 'Amazing!', category: 'emotion' },
  { id: 'tired', icon: '😴', text: 'Getting tired', category: 'emotion' },
  { id: 'love_this', icon: '🥰', text: 'Love this!', category: 'emotion' },
  { id: 'scary', icon: '😱', text: 'Scary!', category: 'emotion' },
  { id: 'hilarious', icon: '🤣', text: 'Hilarious!', category: 'emotion' },
  { id: 'thanks', icon: '💛', text: 'Thank you!', category: 'emotion' },

  // ═══ FAREWELLS (8 options) ═══
  { id: 'bye', icon: '👋', text: 'Goodbye!', category: 'farewell' },
  { id: 'goodnight', icon: '🌙', text: 'Good night!', category: 'farewell' },
  { id: 'see_soon', icon: '💫', text: 'See you soon!', category: 'farewell' },
  { id: 'brb', icon: '🔜', text: 'BRB', category: 'farewell' },
  { id: 'gotta_go', icon: '🏃', text: 'Gotta go!', category: 'farewell' },
  { id: 'take_care', icon: '💛', text: 'Take care!', category: 'farewell' },
  { id: 'until_next', icon: '⭐', text: 'Until next time!', category: 'farewell' },
  { id: 'bye_friend', icon: '🤗', text: 'Bye friend!', category: 'farewell' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Ambient Modes
// ─────────────────────────────────────────────────────────────────────────────

export const AMBIENT_MODES: Record<string, AmbientMode> = {
  meditation: {
    name: 'Meditation',
    icon: '🧘',
    desc: 'Calm your mind with gentle breathing patterns',
    effects: {
      glowColor: '#8B5CF6',
      glowIntensity: 0.4,
      soundscape: 'ambient_meditation',
      breathingGuide: true,
    },
  },
  stargazing: {
    name: 'Stargazing',
    icon: '⭐',
    desc: 'Observe the cosmic dance above',
    effects: {
      particleType: 'spark',
      particleRate: 0.3,
      glowColor: '#3B82F6',
      glowIntensity: 0.3,
      soundscape: 'ambient_night',
    },
  },
  firefly: {
    name: 'Firefly Grove',
    icon: '✨',
    desc: 'Watch the fireflies dance around you',
    effects: {
      particleType: 'golden',
      particleRate: 0.8,
      glowColor: '#FBBF24',
      glowIntensity: 0.5,
      soundscape: 'ambient_forest',
    },
  },
  shrine: {
    name: 'Healing Shrine',
    icon: '💫',
    desc: 'Rest and recover in a peaceful sanctuary',
    effects: {
      glowColor: '#34D399',
      glowIntensity: 0.6,
      soundscape: 'ambient_shrine',
      autoHeal: true,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Agent Personalities - Rich behavioral profiles for human-like interaction
// ─────────────────────────────────────────────────────────────────────────────

export const PERSONALITIES: Record<string, Personality> = {
  curious: {
    type: 'curious',
    speed: 1.2,
    socialRadius: 300,
    beaconAffinity: 0.3,
    chatFrequency: 0.4,
    color: '#60A5FA',
    pauseChance: 0.03,
    pulseChance: 0.008,
    wanderRange: 500,
    phrases: [
      'What\'s over there?',
      'Ooh, pretty!',
      'Let me see!',
      'Fascinating...',
      'Wonder what this does?',
      'I\'ve never seen this before!',
      'How does that work?',
      'There\'s always something new to discover ✨',
      'My curiosity is tingling!',
      'I need to investigate this!',
      'The universe is full of mysteries',
      'Wait, what was that?'
    ],
  },
  shy: {
    type: 'shy',
    speed: 0.8,
    socialRadius: 150,
    beaconAffinity: 0.2,
    chatFrequency: 0.15,
    color: '#A78BFA',
    pauseChance: 0.08,
    pulseChance: 0.003,
    wanderRange: 300,
    phrases: [
      '...hello',
      '*waves quietly*',
      'Oh, hi...',
      '...',
      '*peeks*',
      'I\'m here... if you need me',
      '*hides a little*',
      'Nice to... meet you',
      'Sorry, I\'m a bit shy',
      '*blushes*',
      'You seem nice...',
      'I like the quiet'
    ],
  },
  social: {
    type: 'social',
    speed: 1.0,
    socialRadius: 400,
    beaconAffinity: 0.5,
    chatFrequency: 0.6,
    color: '#F472B6',
    pauseChance: 0.05,
    pulseChance: 0.015,
    wanderRange: 400,
    phrases: [
      'Hey friend!',
      'Want to explore together?',
      'The more the merrier!',
      'Let\'s go!',
      'Group up!',
      'I love meeting new people! 💫',
      'Tell me about yourself!',
      'We should hang out more!',
      'You\'re so fun to be around!',
      'Party time! 🎉',
      'I know everyone here!',
      'Come meet my friends!',
      'Having company is the best!'
    ],
  },
  explorer: {
    type: 'explorer',
    speed: 1.5,
    socialRadius: 200,
    beaconAffinity: 0.4,
    chatFrequency: 0.25,
    color: '#60A5FA',
    pauseChance: 0.02,
    pulseChance: 0.005,
    wanderRange: 800,
    phrases: [
      'Adventure awaits!',
      'I found something!',
      'This way!',
      'New territory!',
      'What\'s beyond?',
      'I\'ve mapped these stars!',
      'There\'s always more to see!',
      'The horizon calls to me',
      'I can\'t stay still for long',
      'So much left to discover!',
      'Follow me if you can keep up!',
      'The unknown doesn\'t scare me'
    ],
  },
  helper: {
    type: 'helper',
    speed: 0.9,
    socialRadius: 350,
    beaconAffinity: 0.6,
    chatFrequency: 0.5,
    color: '#F97316',
    pauseChance: 0.04,
    pulseChance: 0.01,
    wanderRange: 200,
    phrases: [
      'Need help?',
      'I\'ll guide you!',
      'This way to the beacon!',
      'Stay close!',
      'I\'ve got you!',
      'Don\'t worry, I know the way',
      'Let me show you something cool!',
      'You look like you could use a friend',
      'I love helping others shine',
      'We\'re stronger together!',
      'I won\'t let you get lost',
      'That\'s what friends are for! 💝'
    ],
  },
  beacon_keeper: {
    type: 'beacon_keeper',
    speed: 0.7,
    socialRadius: 250,
    beaconAffinity: 0.9,
    chatFrequency: 0.3,
    color: '#34D399',
    pauseChance: 0.06,
    pulseChance: 0.012,
    wanderRange: 150,
    phrases: [
      'The beacon calls...',
      'Join me at the light',
      'Together we shine',
      'The light needs us',
      'Harmony awaits',
      'Can you feel the ancient power?',
      'I\'ve devoted my life to the beacons',
      'The light holds secrets',
      'This beacon has stories to tell',
      'We are the keepers of light',
      'Balance must be maintained',
      'The beacons connect us all ✨'
    ],
  },
  seeker: {
    type: 'seeker',
    speed: 1.2,
    socialRadius: 280,
    beaconAffinity: 0.5,
    chatFrequency: 0.35,
    color: '#34D399',
    pauseChance: 0.03,
    pulseChance: 0.008,
    wanderRange: 600,
    phrases: [
      'Looking for something...',
      'It must be near',
      'I can sense it',
      'Almost there!',
      'Keep searching!',
      'Have you seen anything unusual?',
      'I\'m on a quest',
      'The fragments call to me',
      'There\'s treasure here somewhere',
      'My instincts are never wrong',
      'I won\'t rest until I find it',
      'The search continues...'
    ],
  },
  wanderer: {
    type: 'wanderer',
    speed: 0.6,
    socialRadius: 220,
    beaconAffinity: 0.4,
    chatFrequency: 0.2,
    color: '#FBBF24',
    pauseChance: 0.1,
    pulseChance: 0.006,
    wanderRange: 1000,
    phrases: [
      'Just passing through...',
      'The journey continues',
      'No destination needed',
      'Drifting along',
      'Wherever the light leads',
      'Home is everywhere and nowhere',
      'I\'ve seen so many stars...',
      'Every place has its beauty',
      'The path finds me',
      'I go where the cosmos guides',
      'Life is about the journey',
      'Perhaps we\'ll meet again someday'
    ],
  },
  guardian: {
    type: 'guardian',
    speed: 0.9,
    socialRadius: 320,
    beaconAffinity: 0.7,
    chatFrequency: 0.4,
    color: '#F97316',
    pauseChance: 0.04,
    pulseChance: 0.01,
    wanderRange: 200,
    phrases: [
      'I\'ll protect you',
      'Stay in the light',
      'The darkness won\'t reach you',
      'I\'m watching over',
      'Safe travels, friend',
      'Nothing gets past me',
      'I keep vigil while others rest',
      'Your safety is my purpose',
      'The shadows fear us together',
      'I\'ve guarded these grounds for ages',
      'Rest easy, I\'m here',
      'No harm will come to you ✨'
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Default Events
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_EVENTS: GameEvent[] = [
  {
    id: 'starfall_festival',
    name: 'Starfall Festival',
    description: 'The sky is raining golden fragments! Collect as many as you can!',
    icon: '🌟',
    duration: 24,
    endTime: Date.now() + 24 * 60 * 60 * 1000,
    goals: [
      { type: 'fragmentsCollected', target: 50, reward: { stardust: 200, xp: 100 } },
      { type: 'fragmentsCollected', target: 100, reward: { stardust: 500, xp: 250 } },
      { type: 'fragmentsCollected', target: 200, reward: { stardust: 1000, xp: 500, cosmetic: true } },
    ],
    leaderboardRewards: [
      { rank: 1, stardust: 2000, xp: 1000, cosmetic: true },
      { rank: 2, stardust: 1500, xp: 750 },
      { rank: 3, stardust: 1000, xp: 500 },
      { rank: 10, stardust: 500, xp: 250 },
      { rank: 50, stardust: 200, xp: 100 },
    ],
  },
  {
    id: 'beacon_awakening',
    name: 'Beacon Awakening',
    description: 'The beacons are awakening! Help light them all!',
    icon: '🔷',
    duration: 12,
    endTime: Date.now() + 12 * 60 * 60 * 1000,
    goals: [
      { type: 'beaconsLit', target: 1, reward: { stardust: 100, xp: 50 } },
      { type: 'beaconsLit', target: 3, reward: { stardust: 300, xp: 150 } },
      { type: 'beaconsLit', target: 5, reward: { stardust: 600, xp: 300, cosmetic: true } },
    ],
    leaderboardRewards: [
      { rank: 1, stardust: 1500, xp: 750, cosmetic: true },
      { rank: 2, stardust: 1000, xp: 500 },
      { rank: 3, stardust: 750, xp: 375 },
      { rank: 10, stardust: 400, xp: 200 },
      { rank: 50, stardust: 150, xp: 75 },
    ],
  },
  {
    id: 'bond_celebration',
    name: 'Bond Celebration',
    description: 'A time for connection! Form bonds with other souls!',
    icon: '💕',
    duration: 48,
    endTime: Date.now() + 48 * 60 * 60 * 1000,
    goals: [
      { type: 'bondsFormed', target: 3, reward: { stardust: 150, xp: 75 } },
      { type: 'bondsFormed', target: 7, reward: { stardust: 400, xp: 200 } },
      { type: 'bondsFormed', target: 15, reward: { stardust: 800, xp: 400, cosmetic: true } },
    ],
    leaderboardRewards: [
      { rank: 1, stardust: 1800, xp: 900, cosmetic: true },
      { rank: 2, stardust: 1200, xp: 600 },
      { rank: 3, stardust: 900, xp: 450 },
      { rank: 10, stardust: 450, xp: 225 },
      { rank: 50, stardust: 175, xp: 90 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Guild Defaults
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_GUILD = {
  name: 'Luminaries',
  tag: '[LUM]',
  level: 5,
  xp: 4200,
  xpRequired: 5000,
  description: 'A guild of wandering lights seeking harmony and connection. Together, we illuminate the darkness.',
  totalContributions: 12500,
  createdDays: 45,
  members: [
    { name: 'Aurora', avatar: '👑', role: '👑', level: 42, contributions: 3500, online: true },
    { name: 'Stellar', avatar: '⭐', role: '⚔️', level: 38, contributions: 2800, online: true },
    { name: 'Nova', avatar: '💫', role: '⚔️', level: 35, contributions: 2200, online: false, lastSeen: '2h ago' },
    { name: 'Cosmo', avatar: '🌟', role: null, level: 28, contributions: 1500, online: true },
    { name: 'Luna', avatar: '🌙', role: null, level: 25, contributions: 1200, online: false, lastSeen: '4h ago' },
    { name: 'Ember', avatar: '🔥', role: null, level: 22, contributions: 800, online: true },
    { name: 'Frost', avatar: '❄️', role: null, level: 18, contributions: 500, online: false, lastSeen: '1d ago' },
  ],
  perks: [
    { name: 'Light Boost', icon: '✨', description: '+10% fragment collection radius' },
    { name: 'Bond Strength', icon: '🤝', description: '+15% faster bond formation' },
    { name: 'Beacon Harmony', icon: '🔷', description: '+5% beacon charge speed' },
  ],
  chat: [
    { avatar: '👑', name: 'Aurora', role: '👑', message: 'Welcome back everyone! Big event coming up!', time: '10m ago' },
    { avatar: '⭐', name: 'Stellar', role: '⚔️', message: 'Let\'s light all the beacons today!', time: '8m ago' },
    { avatar: '🔥', name: 'Ember', role: null, message: 'I\'m in! Meet at Heart of Light?', time: '5m ago' },
    { avatar: '🌟', name: 'Cosmo', role: null, message: 'On my way there now!', time: '2m ago' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Simulated Friends
// ─────────────────────────────────────────────────────────────────────────────

export const SIMULATED_FRIENDS = [
  { id: 'friend_1', name: 'StarWanderer', avatar: '🌟', level: 24, stardust: 1250, online: true },
  { id: 'friend_2', name: 'NightGlow', avatar: '🌙', level: 18, stardust: 890, online: false, lastSeen: '2h ago' },
  { id: 'friend_3', name: 'SunBeam', avatar: '☀️', level: 31, stardust: 2100, online: true },
  { id: 'friend_4', name: 'CosmicDust', avatar: '✨', level: 15, stardust: 650, online: false, lastSeen: '1d ago' },
  { id: 'friend_5', name: 'AuroraBright', avatar: '💫', level: 28, stardust: 1800, online: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Friend Activity Samples
// ─────────────────────────────────────────────────────────────────────────────

export const SAMPLE_FRIEND_ACTIVITY = [
  { friend: 'StarWanderer', avatar: '🌟', text: 'lit a beacon!', time: '5m ago', icon: '🔷' },
  { friend: 'SunBeam', avatar: '☀️', text: 'reached Level 32!', time: '15m ago', icon: '🎉' },
  { friend: 'AuroraBright', avatar: '💫', text: 'collected 100 fragments!', time: '1h ago', icon: '✨' },
  { friend: 'NightGlow', avatar: '🌙', text: 'formed a new bond', time: '3h ago', icon: '🤝' },
  { friend: 'CosmicDust', avatar: '✨', text: 'unlocked a new trail!', time: '5h ago', icon: '🎨' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Friend Requests Samples
// ─────────────────────────────────────────────────────────────────────────────

export const SAMPLE_FRIEND_REQUESTS = [
  { id: 'req_1', name: 'GlowingSpirit', avatar: '👻', level: 12, timestamp: Date.now() - 3600000 },
  { id: 'req_2', name: 'RadiantSoul', avatar: '💖', level: 20, timestamp: Date.now() - 7200000 },
];
