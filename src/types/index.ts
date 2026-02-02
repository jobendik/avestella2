// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Core Game Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bond System
// ─────────────────────────────────────────────────────────────────────────────

export type BondConsent = 'pending' | 'mutual' | 'declined';

export interface IBond {
  id: string;
  targetId: string;
  targetName: string;
  targetColor: string;
  name: string;
  color: string;
  strength: number;
  consent: BondConsent;
  mode: 'silent' | 'whisper' | 'voice';
  lastInteraction: number;
  sealed: boolean;
  sealWord?: string;
  sealedAt?: number | null;
  createdAt: number;
  // Stats from App.jsx
  handshakeInitiated?: number | null;
  pulsesSent?: number;
  pulsesReceived?: number;
  lightGifted?: number;
  lightReceived?: number;
  sharedMemory?: Array<{ text: string; time: number }>;
  // Methods
  update?(deltaTime: number): void;
  shouldRemove?(): boolean;
  canVoice?(): boolean;
  canWhisper?(): boolean;
  addMemory?(memory: string): void;
  seal?(myWord: string, theirWord: string): StarMemory;
  toJSON?(): any;
  // Runtime properties for visual display
  light1?: { id: string; x: number; y: number; name: string; color: string };
  light2?: { id: string; x: number; y: number; name: string; color: string };
  realmId?: string; // The realm this bond was formed in or "lives" in
}

export interface StarMemory {
  targetId: string;
  targetName: string;
  targetColor: string;
  myWord: string;
  theirWord: string;
  sealedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Particle System
// ─────────────────────────────────────────────────────────────────────────────

export type ParticleType =
  | 'trail'
  | 'dust'
  | 'spark'
  | 'golden'
  | 'pulse'
  | 'wave'
  | 'darkness'
  | 'snow'
  | 'rain'
  | 'snowflake'
  | 'petal'
  | 'leaf'
  | 'sparkle'
  | 'burst'
  | 'ambient'
  | 'fragment';

export interface IParticle extends Position {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;
  shape?: string;
  alpha?: number;
  decay?: number;
  rotation?: number;
  rotationSpeed?: number;
  createdAt?: number;
  update?(deltaTime: number): void;
  isDead?(): boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual Effects
// ─────────────────────────────────────────────────────────────────────────────

export interface IRipple extends Position {
  radius: number;
  maxRadius: number;
  life?: number;
  alpha?: number;
  color: string;
  update?(deltaTime: number): void;
  isDone?(): boolean;
}

export interface IShockwave extends Position {
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  color: string;
  update?(deltaTime: number): void;
  isDone?(): boolean;
}

export interface IFloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  hue: number;
  size: number;
  life: number;
  decay: number;
  vy: number;
}

export interface IPulseRipple {
  radius: number;
  maxRadius: number;
  life: number;
  speed: number;
}

export interface ILightTrail {
  color: string;
  maxLength?: number;
  maxAge?: number;
  width?: number;
  points?: Array<{ x: number; y: number; age: number; alpha: number }>;
  x?: number;
  y?: number;
  createdAt?: number;
  duration?: number;
  time?: number;
  getCurrentAlpha?: () => number;
}

export interface ILightSignal extends Position {
  distance: number;
  speed: number;
  life: number;
  color: string;
}

export interface ILightBridge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color1: string;
  color2: string;
  life: number;
  particles: Array<Position & { life: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Agents
// ─────────────────────────────────────────────────────────────────────────────

export type PersonalityType =
  | 'curious'
  | 'shy'
  | 'social'
  | 'explorer'
  | 'helper'
  | 'beacon_keeper'
  | 'seeker'
  | 'wanderer'
  | 'guardian';

export interface Personality {
  type: PersonalityType;
  speed: number;
  socialRadius: number;
  beaconAffinity: number;
  chatFrequency: number;
  phrases: string[];
  // Legacy_2 behavior fields
  color?: string;
  pauseChance?: number;
  pulseChance?: number;
  wanderRange?: number;
}

export interface IAIAgent extends Position, Velocity {
  id: string;
  realmId: string; // The realm this agent belongs to
  name: string;
  color: string;
  personality: Personality;
  currentRadius: number;
  targetRadius: number;
  currentMessage: string | null;
  messageTime: number;
  pulseRipples: IPulseRipple[];
  isPulsing: boolean;
  // Interaction methods
  reactToMood?: (text: string) => void;
  reactToGesture?: (type: 'pulse' | 'spin' | 'signal', x: number, y: number) => void;
  setFollowTarget?: (x: number, y: number) => void;
  clearFollowTarget?: () => void;
  lastPulseTime: number;
  targetX: number | null;
  targetY: number | null;
  followTargetX?: number | null;
  followTargetY?: number | null;
  // Visual/Audio interactions
  pulse?(): void;
  say?(text: string, duration?: number): void;
  state: 'wandering' | 'seeking' | 'gathering' | 'pulsing' | 'following' | 'seeking_beacon' | 'social' | 'idle';
  stateTimer: number;
  isRemotePlayer?: boolean;
  update?(
    deltaTime: number,
    worldSize: number,
    playerX: number,
    playerY: number,
    otherAgents: IAIAgent[],
    beacons?: Beacon[],
    fragments?: Fragment[]
  ): void;
  toJSON?(): any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Companions
// ─────────────────────────────────────────────────────────────────────────────

export type CompanionRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ICompanion {
  id: string;
  type: string;
  name: string;
  emoji: string;
  rarity: CompanionRarity;
  description: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  offsetAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  bobPhase: number;
  scale: number;
  unlocked: boolean;
  equipped: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// World Objects (from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export interface Beacon {
  id: string;
  realmId?: string; // The realm this beacon belongs to
  x: number;
  y: number;
  color: string;
  active: boolean; // True if fully restored
  lit: boolean;    // True if currently lit by player
  lightLevel: number; // 0-1
  pulsePhase?: number;
  name: string;
  icon?: string;
  type?: string;
  rhythmPattern?: number[]; // Array of intervals for pulsing (e.g. [1, 0, 1, 0])
  rhythmOffset?: number;
  // Charging mechanics
  charge?: number;          // 0-100
  isCharging?: boolean;
  chargeRate?: number;
}

export interface BeaconState {
  active: boolean;
  charge: number;
  activeTimer: number;
  rhythmIndex: number;
}

export interface Fragment extends Position {
  id: string;
  realmId?: string; // The realm this fragment belongs to
  phase: number;
  pulsePhase: number;
  isGolden: boolean;
  value: number;
  collected: boolean;
}

export interface Echo extends Position {
  id: string;
  text: string;
  name: string;
  createdAt: number;
  /** Hue for color (0-360) */
  hue?: number;
  /** Radius for rendering */
  r?: number;
  /** Pulse animation state */
  pulse?: number;
  /** Current realm the echo is in */
  realm?: string;
  /** Number of times ignited/liked */
  ignited?: number;
  /** Player who created this echo */
  playerId?: string;
}

export interface Nebula extends Position {
  radius: number;
  hue: number;
  alpha: number;
}

export interface Star extends Position {
  size: number;
  alpha: number;
  twinklePhase: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Progression System
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyLoginData {
  lastLoginDate: string | null;
  currentStreak: number;
  longestStreak: number;
  claimedDays: number[];
  totalLogins: number;
}

export interface DailyReward {
  day: number;
  type: 'stardust' | 'xp' | 'trail' | 'color' | 'aura' | 'companion' | 'legendary' | 'special';
  amount?: number;
  name: string;
  icon: string;
  rewards?: {
    stardust?: number;
    xp?: number;
  };
  streakBonus?: {
    name: string;
    icon: string;
    multiplier: number;
  };
}

export interface DailyChallenge {
  id: string;
  type: 'fragment' | 'goldenFragment' | 'beacon' | 'bond' | 'pulse' | 'distance';
  desc: string;
  target: number;
  progress: number;
  difficulty: 'easy' | 'medium' | 'hard';
  reward: {
    stardust: number;
    xp: number;
  };
  completed: boolean;
  claimed: boolean;
}

export interface DailyChallengesState {
  challenges: DailyChallenge[];
  lastReset: string;
  completedToday: number;
  totalCompleted: number;
  rerollsAvailable: number;
}

export interface WeeklyChallenge extends DailyChallenge {
  isWeekly: boolean;
  bonusReward?: {
    stardust: number;
    xp: number;
  };
}

export interface WeeklyChallengesState {
  weekStart: string;
  challenges: WeeklyChallenge[];
  completedThisWeek: number;
  totalWeeklyCompleted: number;
}

export interface LevelUpData {
  level: number;
  isMilestone: boolean;
  rewards: {
    stardust: number;
    milestoneReward?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Season Pass
// ─────────────────────────────────────────────────────────────────────────────

export interface SeasonPassState {
  season: number;
  currentTier: number;
  seasonXP: number;
  isPremium: boolean;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
}

export interface SeasonReward {
  tier: number;
  free: {
    stardust: number;
    cosmetic?: {
      type: string;
      name: string;
      id: string;
    };
  };
  premium: {
    stardust: number;
    cosmetic?: {
      type: string;
      name: string;
      id: string;
    };
    title?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Social System
// ─────────────────────────────────────────────────────────────────────────────

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  level: number;
  stardust: number;
  online: boolean;
  lastSeen?: string;
}

export interface FriendRequest {
  id: string;
  name: string;
  avatar: string;
  level: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  from: 'player' | 'friend';
  text: string;
  timestamp: number;
}

export interface FriendActivity {
  friend: string;
  avatar: string;
  text: string;
  time: string;
  icon: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Guild System
// ─────────────────────────────────────────────────────────────────────────────

export interface GuildMember {
  name: string;
  avatar: string;
  role: string | null;
  level: number;
  contributions: number;
  online: boolean;
  lastSeen?: string;
}

export interface GuildPerk {
  name: string;
  icon: string;
  description: string;
}

export interface GuildChatMessage {
  avatar: string;
  name: string;
  role: string | null;
  message: string;
  time: string;
}

export interface Guild {
  id?: string;
  name: string;
  tag: string;
  level: number;
  xp: number;
  xpRequired: number;
  description: string;
  members: GuildMember[];
  perks: GuildPerk[];
  chat: GuildChatMessage[];
  totalContributions: number;
  createdDays: number;
}

export interface GuildContributions {
  stardust: number;
  challenges: number;
  xp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Events System
// ─────────────────────────────────────────────────────────────────────────────

export interface EventGoal {
  type: 'fragmentsCollected' | 'beaconsLit' | 'bondsFormed';
  target: number;
  reward: {
    stardust?: number;
    xp?: number;
    cosmetic?: boolean;
  };
}

export interface EventLeaderboardReward {
  rank: number;
  stardust: number;
  xp: number;
  cosmetic?: boolean;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  duration: number;
  endTime: number;
  goals: EventGoal[];
  leaderboardRewards: EventLeaderboardReward[];
}

export interface EventProgress {
  fragmentsCollected: number;
  beaconsLit: number;
  bondsFormed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cosmetics
// ─────────────────────────────────────────────────────────────────────────────

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface TrailStyle {
  name: string;
  icon: string;
  price: number;
  rarity: Rarity;
  desc?: string;
  unlock?: {
    type: string;
    value?: number | string;
  };
  requirement?: string;
}

export interface LightColor {
  name: string;
  color: string;
  icon?: string;
  price: number;
  rarity: Rarity;
  desc?: string;
  animated?: boolean;
  unlock?: {
    type: string;
    value?: number | string;
  };
  requirement?: string;
}

export interface AuraEffect {
  name: string;
  icon: string;
  price: number;
  rarity: Rarity;
  desc?: string;
  radius?: number;
  animated?: boolean;
  unlock?: {
    type: string;
    value?: number | string;
  };
}

export interface OwnedCosmetics {
  trails: string[];
  colors: string[];
  auras: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings & Accessibility
// ─────────────────────────────────────────────────────────────────────────────

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  particlesEnabled: boolean;
  screenShakeEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  showFPS: boolean;
  autoSave: boolean;
}

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsRetention {
  firstSession: number;
  sessionCount: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string;
}

export interface Analytics {
  sessionStart: number;
  totalPlaytime: number;
  events: Record<string, number>;
  milestones: string[];
  retention: AnalyticsRetention;
}

// ─────────────────────────────────────────────────────────────────────────────
// Screenshot System
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenshotFilter {
  id: string;
  name: string;
  style?: string;
}

export interface ShareTemplate {
  id: string;
  name: string;
}

export interface Screenshot {
  id: number;
  url: string;
  date: string;
  filter: string;
  template: string;
  stats: {
    fragments: number;
    bonds: number;
    beacons: number;
    stars: number;
    lightLevel?: number;
    tier?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tutorial
// ─────────────────────────────────────────────────────────────────────────────

export interface TutorialStep {
  title: string;
  text: string;
  skippable: boolean;
}

export interface TutorialProgress {
  collect_3_fragments: number;
  approach_soul: boolean;
  form_bond: boolean;
  visit_beacon: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaderboardPlayer {
  name: string;
  avatar: string;
  level: number;
  xp: number;
  stardust: number;
  challengesCompleted: number;
  seasonTier: number;
  isPlayer: boolean;
}

export type LeaderboardCategory = 'xp' | 'stardust' | 'challenges' | 'season';

// ─────────────────────────────────────────────────────────────────────────────
// Ladder/Competitive
// ─────────────────────────────────────────────────────────────────────────────

export interface LadderTier {
  name: string;
  icon: string;
  minPoints: number;
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Chat
// ─────────────────────────────────────────────────────────────────────────────

export type QuickChatCategory = 'greeting' | 'question' | 'response' | 'action' | 'emotion' | 'farewell';

export interface QuickChatOption {
  id: string;
  icon: string;
  text: string;
  category?: QuickChatCategory;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ambient Modes
// ─────────────────────────────────────────────────────────────────────────────

export interface AmbientModeEffects {
  particleType?: ParticleType;
  particleRate?: number;
  glowColor?: string;
  glowIntensity?: number;
  soundscape?: string;
  breathingGuide?: boolean;
  autoHeal?: boolean;
}

export interface AmbientMode {
  name: string;
  icon: string;
  desc: string;
  effects?: AmbientModeEffects;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seasons (Time-based, from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Season {
  name: string;
  color: string;
  particleType: string;
  bonusType?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trail Styles (from legacy_2)
// ─────────────────────────────────────────────────────────────────────────────

export type TrailStyleType =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'spark'
  | 'sparkles'
  | 'gradient'
  | 'rainbow';

// ─────────────────────────────────────────────────────────────────────────────
// Game State
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenFlash {
  color: string;
  intensity: number;
  decay: number;
}

export interface GameStateRef {
  // Player Position & Movement
  playerId: string;
  playerName: string;
  playerX: number;
  playerY: number;
  playerVX: number;
  playerVY: number;
  playerRadius: number;
  playerColor: string;
  playerAlpha: number;
  playerTrail: Array<{ x: number; y: number; time: number }>;

  // Camera
  cameraX: number;
  cameraY: number;
  cameraTargetX: number;
  cameraTargetY: number;
  cameraZoom: number;

  // World entities
  fragments: Fragment[];
  bonds: IBond[];
  aiAgents: IAIAgent[];
  particles: IParticle[];
  ripples: IRipple[];
  shockwaves: IShockwave[];
  floatingTexts: IFloatingText[];
  beacons: Beacon[];

  // Constellations (New)
  constellations: import('../rendering/constellations').Constellation[];

  // Tag Game (New)
  tagGameState?: import('../game/tagArena').TagGameState;

  // Visual Effects (Ported from App.jsx)
  nebulae: Nebula[];
  stars: Star[];
  lightTrails: ILightTrail[];
  localFragments: Fragment[]; // specific local subset for performance
  echoes: Echo[];
  signals: ILightSignal[];
  lightBridges: ILightBridge[];
  pulseRipples: IPulseRipple[];
  lastTrailPoint: number;

  // Environment
  currentSeason: string;
  currentRealm?: string;
  darknessIntensity: number;

  // Stats
  fragmentsCollected: number;
  goldenFragmentsCollected: number;
  totalBonds: number;
  beaconsLit: number;
  distanceTraveled: number;
  playTime: number;
  lightGifted: number;
  starMemories: Array<{ targetName: string; targetColor: string; sealedAt: number; myWord: string; theirWord: string }>;

  // Cold/Warmth Mechanics
  coldTimer: number;
  stationaryTimer: number;
  warmthLinger: number;
  wasNearWarmth: boolean;
  hasMoved: boolean;
  aloneTimer: number;

  // Constellation System
  inConstellation: boolean;
  constellationMembers: string[];
  constellationFormedAt: number | null;

  // State flags
  gameStarted: boolean;
  isPaused: boolean;
  isLoading: boolean;
  screenFlash: ScreenFlash | null;
  isPulsing?: boolean;
  lastProcessedPattern?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Biomes (Batch 1)
// ─────────────────────────────────────────────────────────────────────────────

export interface BiomeSpecialProperties {
  type: string; // e.g., 'lore_discovery', 'star_memory_showcase', 'meeting_hub', etc.
  mechanic?: string;
  lore?: string;
  effect?: string;
  rewards?: Record<string, number | boolean | string>;
  requirements?: {
    level?: number;
    achievement?: string;
  };
}

export interface Biome {
  id: string;
  name: string;
  color: string;
  particles: string;
  music: string;
  fragmentBonus: number;
  bounds: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  physics: {
    driftMultiplier: number;
    friction: number;
    gravity?: { x: number; y: number };
  };
  special?: BiomeSpecialProperties;
}

export interface PointOfInterest extends Position {
  id: string;
  type: 'viewpoint' | 'ruins' | 'pool' | 'constellation' | 'shrine' | 'secret';
  name: string;
  discovered: boolean;
  rewards?: {
    stardust?: number;
    xp?: number;
    cosmetic?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exploration (Batch 1)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExplorationState {
  exploredCells: Set<string>;
  discoveredBiomes: string[];
  discoveredPOIs: string[];
  discoveredSecrets: string[];
  explorationPercentage: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pets (Batch 4)
// ─────────────────────────────────────────────────────────────────────────────

export interface Pet {
  id: string;
  type: string;
  name: string;
  level: number;
  xp: number;
  abilities: string[];
  equipped: boolean;
}

export interface PetType {
  id: string;
  name: string;
  icon: string;
  baseColor: string;
  rarity: Rarity;
  abilities: string[];
  unlockRequirement?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extended Analytics Types (from legacy_2 - alternative structure)
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsEventDetail {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface AnalyticsMilestoneRecord {
  id: string;
  name: string;
  achievedAt: number;
  data?: Record<string, unknown>;
}

export interface AnalyticsRetentionDay {
  day: number;
  active: boolean;
  date: string;
}

export interface AnalyticsSessionRecord {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  events: AnalyticsEventDetail[];
}

export interface ExtendedAnalytics {
  sessions: AnalyticsSessionRecord[];
  milestones: AnalyticsMilestoneRecord[];
  retention: AnalyticsRetentionDay[];
  totalPlayTime: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Return Types (legacy_2)
// ─────────────────────────────────────────────────────────────────────────────

export interface UseXPReturn {
  xp: number;
  level: number;
  totalXP: number;
  xpToNextLevel: number;
  xpProgress: number;
  addXP: (amount: number, guildBonus?: number) => LevelUpData | null;
  getTotalXP: () => number;
  setLevel: (level: number) => void;
}

// Note: LevelUpData and LevelUpRewards are defined earlier in this file

export interface UseDailyLoginReturn {
  streak: number;
  longestStreak: number;
  totalLogins: number;
  lastLoginDate: string | null;
  todaysClaimed: boolean;
  currentReward: DailyReward | null;
  claimReward: () => FinalReward | null;
  getUpcomingRewards: (count?: number) => DailyReward[];
  onStreakLost?: () => void;
}

export interface FinalReward {
  reward: DailyReward;
  streakBonus: number;
  totalStardust: number;
  totalXP: number;
}

export interface UseAnalyticsReturn {
  trackEvent: (type: string, data?: Record<string, unknown>) => void;
  trackMilestone: (id: string, name: string, data?: Record<string, unknown>) => void;
  startSession: () => void;
  endSession: () => void;
  getAnalytics: () => Analytics;
  exportAnalytics: () => string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Data & Persistence (Moved from useServerSync.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerStats {
  starsLit: number;
  echoesCreated: number;
  sings: number;
  pulses: number;
  emotes: number;
  teleports: number;
  whispersSent: number;
  connections: number;
  fragmentsCollected: number;
  beaconsLit: number;
  bondsFormed: number;
  giftsGiven: number;
  giftsReceived: number;
  challengesCompleted: number;
  weeklyChallengesCompleted: number;
  questsCompleted: number;
}

export interface PlayerSettings {
  musicEnabled: boolean;
  soundEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  particlesEnabled: boolean;
  screenShake: boolean;
  reducedMotion: boolean;
  colorblindMode: string | null;
  highContrast: boolean;
  notifications: boolean;
  autoSave: boolean;
}

export interface PlayerCosmetics {
  ownedItems: string[];
  equippedTrail: string | null;
  equippedAura: string | null;
  equippedTitle: string | null;
  equippedEmotes: string[];
  equippedPulseEffect: string | null;
}

export interface PlayerCompanions {
  ownedIds: string[];
  activeId: string | null;
  companionLevels: { [key: string]: number };
  companionXp: { [key: string]: number };
}

export interface PlayerExploration {
  discoveredAreas: string[];
  visitedRealms: string[];
  totalDistance: number;
  explorationPercent: number;
  discoveries: { id: string; type: string; timestamp: number }[];
  x?: number;
  y?: number;
}

export interface PlayerQuests {
  activeQuestIds: string[];
  completedQuestIds: string[];
  questProgress: Record<string, number>;
}

export interface PlayerAnchoring {
  breathingCompleted: number;
  lastAnchorDate: string | null;
  preferredProvider: string | null;
  sessionHistory: { type: string; duration: number; timestamp: number }[];
}

export interface PlayerGameState {
  lastRealm: string;
  lastPosition: { x: number; y: number };
  litBeacons: string[];
  bonds: { targetId: string; strength: number; type: string }[];
  starMemories: { starId: string; memory: string; timestamp: number }[];
}

export interface PlayerLeaderboard {
  rankPoints: number;
  weeklyXp: number;
  weeklyWins: number;
  monthlyXp: number;
  peakRank: string;
}

export interface FullPlayerData {
  playerId: string;
  name: string;
  hue: number;
  avatar: string;
  xp: number;
  level: number;
  stardust: number;
  lifetimeStardust: number;
  seasonId: string;
  seasonXp: number;
  seasonLevel: number;
  seasonTier: number;
  claimedSeasonRewards: number[];
  dailyLoginStreak: number;
  longestStreak: number;
  totalLogins: number;
  lastLoginDate: string | null;
  currentMonth: string | null;
  claimedDailyRewards: number[];
  stats: PlayerStats;
  achievements: string[];
  cosmetics: PlayerCosmetics;
  companions: PlayerCompanions;
  exploration: PlayerExploration;
  quests: PlayerQuests;
  anchoring: PlayerAnchoring;
  gameState: PlayerGameState;
  leaderboard: PlayerLeaderboard;
  settings: PlayerSettings;
}

export interface DailyLoginResult {
  isNewDay: boolean;
  streak: number;
  rewards: { stardust: number; xp: number };
}
