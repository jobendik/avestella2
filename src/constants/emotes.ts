// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Emotes System Constants
// ═══════════════════════════════════════════════════════════════════════════
// Per lumina-viral-bible.md Section 5.4 - Non-Verbal Communication

// ─────────────────────────────────────────────────────────────────────────────
// Status Indicators
// ─────────────────────────────────────────────────────────────────────────────

export type PlayerStatus = 
  | 'available' 
  | 'busy' 
  | 'do_not_disturb' 
  | 'afk' 
  | 'looking_for_group' 
  | 'new_player' 
  | 'mentor';

export interface StatusIndicator {
  id: PlayerStatus;
  name: string;
  icon: string;
  color: string;
  glowColor: string;
  description: string;
}

export const STATUS_INDICATORS: StatusIndicator[] = [
  {
    id: 'available',
    name: 'Available',
    icon: '🟢',
    color: '#22C55E',
    glowColor: 'rgba(34, 197, 94, 0.5)',
    description: 'Open to interactions',
  },
  {
    id: 'busy',
    name: 'Busy',
    icon: '🟡',
    color: '#EAB308',
    glowColor: 'rgba(234, 179, 8, 0.5)',
    description: 'Focused on something',
  },
  {
    id: 'do_not_disturb',
    name: 'Do Not Disturb',
    icon: '🔴',
    color: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    description: 'Not available for interaction',
  },
  {
    id: 'afk',
    name: 'AFK',
    icon: '⚫',
    color: '#6B7280',
    glowColor: 'rgba(107, 114, 128, 0.5)',
    description: 'Away from keyboard',
  },
  {
    id: 'looking_for_group',
    name: 'Looking for Group',
    icon: '🔵',
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    description: 'Seeking companions',
  },
  {
    id: 'new_player',
    name: 'New Player',
    icon: '🌈',
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.5)',
    description: 'Just starting the journey',
  },
  {
    id: 'mentor',
    name: 'Mentor',
    icon: '👑',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    description: 'Experienced guide available to help',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Emote Categories
// ─────────────────────────────────────────────────────────────────────────────

export type EmoteCategory = 'movement' | 'expression' | 'interactive';

export interface Emote {
  id: string;
  name: string;
  icon: string;
  category: EmoteCategory;
  animation?: string;
  duration: number; // ms
  requiresPartner?: boolean;
  sound?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Movement Emotes
// ─────────────────────────────────────────────────────────────────────────────

export const MOVEMENT_EMOTES: Emote[] = [
  {
    id: 'wave',
    name: 'Wave',
    icon: '👋',
    category: 'movement',
    animation: 'wave_anim',
    duration: 1500,
    sound: 'emote_wave',
  },
  {
    id: 'dance',
    name: 'Dance',
    icon: '💃',
    category: 'movement',
    animation: 'dance_anim',
    duration: 4000,
    sound: 'emote_dance',
  },
  {
    id: 'dance_2',
    name: 'Groove',
    icon: '🕺',
    category: 'movement',
    animation: 'dance_groove_anim',
    duration: 4000,
    sound: 'emote_groove',
  },
  {
    id: 'bow',
    name: 'Bow',
    icon: '🙇',
    category: 'movement',
    animation: 'bow_anim',
    duration: 2000,
    sound: 'emote_bow',
  },
  {
    id: 'jump',
    name: 'Jump',
    icon: '🦘',
    category: 'movement',
    animation: 'jump_anim',
    duration: 1000,
    sound: 'emote_jump',
  },
  {
    id: 'spin',
    name: 'Spin',
    icon: '🌀',
    category: 'movement',
    animation: 'spin_anim',
    duration: 1500,
    sound: 'emote_spin',
  },
  {
    id: 'sit',
    name: 'Sit',
    icon: '🧘',
    category: 'movement',
    animation: 'sit_anim',
    duration: -1, // Continuous until cancelled
  },
  {
    id: 'sleep',
    name: 'Sleep',
    icon: '😴',
    category: 'movement',
    animation: 'sleep_anim',
    duration: -1,
    sound: 'emote_snore',
  },
  {
    id: 'meditate',
    name: 'Meditate',
    icon: '🧘‍♀️',
    category: 'movement',
    animation: 'meditate_anim',
    duration: -1,
    sound: 'ambient_meditation',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Expression Emotes
// ─────────────────────────────────────────────────────────────────────────────

export const EXPRESSION_EMOTES: Emote[] = [
  {
    id: 'happy_bounce',
    name: 'Happy Bounce',
    icon: '😊',
    category: 'expression',
    animation: 'bounce_happy_anim',
    duration: 2000,
    sound: 'emote_happy',
  },
  {
    id: 'sad_droop',
    name: 'Sad Droop',
    icon: '😢',
    category: 'expression',
    animation: 'droop_sad_anim',
    duration: 2500,
    sound: 'emote_sad',
  },
  {
    id: 'excited_sparkle',
    name: 'Excited Sparkle',
    icon: '🤩',
    category: 'expression',
    animation: 'sparkle_excited_anim',
    duration: 2000,
    sound: 'emote_excited',
  },
  {
    id: 'scared_shake',
    name: 'Scared Shake',
    icon: '😨',
    category: 'expression',
    animation: 'shake_scared_anim',
    duration: 2000,
    sound: 'emote_scared',
  },
  {
    id: 'love_hearts',
    name: 'Love Hearts',
    icon: '😍',
    category: 'expression',
    animation: 'hearts_love_anim',
    duration: 3000,
    sound: 'emote_love',
  },
  {
    id: 'angry_vibrate',
    name: 'Angry Vibrate',
    icon: '😠',
    category: 'expression',
    animation: 'vibrate_angry_anim',
    duration: 1500,
    sound: 'emote_angry',
  },
  {
    id: 'confused_spiral',
    name: 'Confused Spiral',
    icon: '😕',
    category: 'expression',
    animation: 'spiral_confused_anim',
    duration: 2000,
  },
  {
    id: 'curious_lean',
    name: 'Curious Lean',
    icon: '🤔',
    category: 'expression',
    animation: 'lean_curious_anim',
    duration: 2500,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Emotes (Require Partner)
// ─────────────────────────────────────────────────────────────────────────────

export const INTERACTIVE_EMOTES: Emote[] = [
  {
    id: 'high_five',
    name: 'High Five',
    icon: '🙌',
    category: 'interactive',
    animation: 'high_five_anim',
    duration: 1500,
    requiresPartner: true,
    sound: 'emote_highfive',
  },
  {
    id: 'hug',
    name: 'Hug',
    icon: '🤗',
    category: 'interactive',
    animation: 'hug_anim',
    duration: 3000,
    requiresPartner: true,
    sound: 'emote_hug',
  },
  {
    id: 'dance_together',
    name: 'Dance Together',
    icon: '👯',
    category: 'interactive',
    animation: 'dance_together_anim',
    duration: 5000,
    requiresPartner: true,
    sound: 'emote_dance_duo',
  },
  {
    id: 'bow_mutual',
    name: 'Bow to Each Other',
    icon: '🙇‍♂️',
    category: 'interactive',
    animation: 'bow_mutual_anim',
    duration: 2500,
    requiresPartner: true,
    sound: 'emote_bow',
  },
  {
    id: 'gift_exchange',
    name: 'Gift Exchange',
    icon: '🎁',
    category: 'interactive',
    animation: 'gift_exchange_anim',
    duration: 3000,
    requiresPartner: true,
    sound: 'emote_gift',
  },
  {
    id: 'photo_pose',
    name: 'Photo Pose',
    icon: '📸',
    category: 'interactive',
    animation: 'photo_pose_anim',
    duration: 4000,
    requiresPartner: true,
    sound: 'camera_shutter',
  },
  {
    id: 'group_circle',
    name: 'Group Circle',
    icon: '⭕',
    category: 'interactive',
    animation: 'group_circle_anim',
    duration: 6000,
    requiresPartner: true,
    sound: 'emote_circle',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// All Emotes Combined
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_EMOTES: Emote[] = [
  ...MOVEMENT_EMOTES,
  ...EXPRESSION_EMOTES,
  ...INTERACTIVE_EMOTES,
];

// ─────────────────────────────────────────────────────────────────────────────
// Activity Indicators (shown to others)
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityType = 
  | 'typing'
  | 'voice_active'
  | 'charging_beacon'
  | 'in_darkness'
  | 'low_light'
  | 'gifting';

export interface ActivityIndicator {
  id: ActivityType;
  name: string;
  icon: string;
  animation?: string;
}

export const ACTIVITY_INDICATORS: ActivityIndicator[] = [
  { id: 'typing', name: 'Typing...', icon: '💬', animation: 'pulse' },
  { id: 'voice_active', name: 'Speaking', icon: '🎙️', animation: 'pulse' },
  { id: 'charging_beacon', name: 'Charging Beacon', icon: '⚡', animation: 'glow' },
  { id: 'in_darkness', name: 'In Darkness', icon: '🌑', animation: 'shake' },
  { id: 'low_light', name: 'Low Light Warning', icon: '⚠️', animation: 'blink' },
  { id: 'gifting', name: 'Gifting', icon: '🎁', animation: 'sparkle' },
];
