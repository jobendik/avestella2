// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - AI Agent Class
// Advanced autonomous behavior with memory, emotions, and social intelligence
// ═══════════════════════════════════════════════════════════════════════════

import type { IAIAgent, Beacon, PersonalityType, Personality, IPulseRipple, Fragment } from '@/types';
import { PERSONALITIES } from '@/constants/social';
import { randomRange, distance, angleBetween, lerp } from '@/utils/math';

// ─────────────────────────────────────────────────────────────────────────────
// EMOTIONAL STATE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

type EmotionalState = 'content' | 'excited' | 'lonely' | 'curious' | 'social' | 'tired' | 'playful' | 'contemplative';

interface EmotionState {
  current: EmotionalState;
  intensity: number; // 0-1
  duration: number; // seconds remaining
  triggers: string[]; // what caused this emotion
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMORY SYSTEM:
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryEntry {
  type: 'interaction' | 'location' | 'event' | 'player' | 'agent';
  entityId?: string;
  entityName?: string;
  x?: number;
  y?: number;
  sentiment: number; // -1 to 1 (negative to positive)
  importance: number; // 0-1
  timestamp: number;
  details?: string;
}

interface RelationshipData {
  entityId: string;
  entityName: string;
  affinity: number; // -1 to 1
  interactions: number;
  lastSeen: number;
  isFriend: boolean;
  sharedExperiences: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

type GoalType = 'explore' | 'socialize' | 'rest' | 'collect' | 'beacon' | 'follow_player' | 'find_friend' | 'wander' | 'investigate' | 'greet' | 'play';

interface Goal {
  type: GoalType;
  priority: number; // 0-1
  target?: { x: number; y: number; id?: string };
  duration: number; // max time for this goal
  progress: number; // 0-1
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONAL AI SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

interface ConversationContext {
  partnerId: string | null;
  topic: string | null;
  exchanges: number;
  lastMessageTime: number;
  awaitingResponse: boolean;
}

// Thematic AI names with personality hints
const AI_NAMES: string[] = [
  'Starlight', 'Nebula', 'Comet', 'Nova', 'Eclipse', 'Aurora',
  'Dusk', 'Dawn', 'Twilight', 'Horizon', 'Zenith', 'Solstice',
  'Ember', 'Flicker', 'Glow', 'Shimmer', 'Spark', 'Radiance',
  'Whisper', 'Echo', 'Drift', 'Ripple', 'Wave', 'Current',
  'Celeste', 'Orion', 'Luna', 'Sol', 'Lyra', 'Vega',
  'Phoenix', 'Atlas', 'Iris', 'Zephyr', 'Astrid', 'Cosmo'
];

// Context-aware conversational responses - much richer
const AI_CONVERSATIONS: Record<string, Record<string, string[]>> = {
  greeting: {
    first_meeting: ['Hey there, new friend!', 'Oh! I haven\'t seen you before! 👋', 'Welcome to this corner of the cosmos!', 'A new soul! How exciting!'],
    familiar: ['Oh hey, you\'re back!', 'Nice to see you again!', 'I was hoping to run into you!', 'There you are! ✨'],
    friend: ['My favorite person!', 'I missed you!', 'Finally! I was looking for you!', 'Best friend alert! 💫'],
    after_absence: ['Where have you been?', 'It\'s been a while...', 'I started to wonder if you\'d return', 'You came back! 🌟']
  },
  lonely: {
    alone: ['Is anyone out there...?', 'So quiet here...', 'The stars feel distant tonight', 'Hello...?', '*sigh*'],
    seeking: ['Looking for company', 'Maybe someone\'s nearby?', 'I hope I find a friend soon', 'Wandering alone...'],
    missing: ['I miss the others...', 'Where did everyone go?', 'Used to be more lively here']
  },
  excited: {
    discovery: ['Look at this!', 'I found something!', 'Come see! Come see!', 'This is amazing!', 'Wow! ✨'],
    social: ['So many friends!', 'This is the best!', 'We should do this more!', 'Group hug! 🤗'],
    achievement: ['We did it!', 'That was incredible!', 'Nothing can stop us!', 'Champions! 🏆']
  },
  curious: {
    exploring: ['I wonder what\'s over there...', 'Let me check this out', 'Interesting...', 'What could that be?'],
    questioning: ['Have you noticed...?', 'What do you think about...?', 'Why does the light do that?', 'How does this work?'],
    observing: ['Hmm, fascinating', 'I\'ve been watching the patterns', 'There\'s a rhythm to everything']
  },
  social: {
    invitation: ['Want to explore together?', 'Come with me!', 'Let\'s stick together!', 'We\'re better as a team!'],
    bonding: ['I like your vibe', 'We make a good team!', 'This is fun!', 'Glad you\'re here'],
    group: ['Stronger together!', 'Look at us all!', 'A whole constellation!', 'Squad goals ✨']
  },
  contemplative: {
    philosophical: ['Sometimes I wonder about the void beyond...', 'What makes light light, you know?', 'We\'re all just stardust...'],
    peaceful: ['This is nice', 'Such a calm moment', 'Just existing is beautiful', 'Breathe in the starlight'],
    reflective: ['I\'ve learned so much here', 'Every encounter changes us', 'The journey matters more than the destination']
  },
  playful: {
    teasing: ['Catch me if you can!', 'Bet you can\'t keep up!', 'Race you to that beacon!', 'Tag, you\'re it!'],
    fun: ['Wheee!', 'This is so fun!', 'Let\'s do that again!', 'Best day ever!', '🎉'],
    silly: ['*spins around*', 'Boop!', 'Wiggle wiggle', '✨ sparkle attack ✨']
  },
  beacon: {
    approaching: ['I feel the beacon\'s pull...', 'The light calls to us', 'Let\'s restore it together!'],
    at_beacon: ['Such warmth here', 'United in light', 'The beacon recognizes us', 'Home ✨'],
    lit: ['We did it!', 'The light spreads!', 'Another beacon awakened!', 'Beautiful! 💫']
  },
  fragment: {
    collecting: ['Ooh, shiny!', 'Mine! ✨', 'Collecting the pieces', 'Another one!'],
    sharing: ['You take this one', 'Found one for you!', 'Sharing is caring 💝'],
    golden: ['A GOLDEN one!', 'So rare!', 'Lucky find! 🌟']
  },
  farewell: {
    temporary: ['See you soon!', 'Don\'t be a stranger!', 'Until next time! 👋', 'Safe travels!'],
    sad: ['I\'ll miss you...', 'Do you have to go?', 'Come back soon...', 'Remember me 💫'],
    happy: ['That was fun!', 'Let\'s do this again!', 'Best time ever!', 'Bye friend! ✨']
  },
  reactions: {
    to_pulse: ['👋', '✨', 'Hello!', 'I see you!', '💫', 'Hey there!'],
    to_gift: ['Aww, thank you!', 'You\'re so kind! 💝', 'I\'ll treasure this!', 'Best gift ever!'],
    to_help: ['Thanks for the save!', 'My hero! ✨', 'I owe you one!', 'You\'re amazing!'],
    to_ignore: ['...okay then', '*sad sparkle*', 'Maybe next time...', 'That\'s fine...']
  },
  time_based: {
    been_here_long: ['I\'ve been exploring for hours!', 'Time flies when you\'re shining', 'Wonder how long I\'ve been here'],
    just_started: ['Just woke up!', 'Ready for adventure!', 'New day, new discoveries!'],
    tired: ['Getting sleepy...', 'Maybe a rest soon...', '*yawns*', 'My light is dimming...']
  }
};

export class AIAgent implements IAIAgent {
  id: string;
  realmId: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number | null;
  targetY: number | null;
  color: string;
  personality: Personality;
  wanderAngle: number;
  lastChatTime: number;
  currentMessage: string | null;
  messageTime: number;  // Timestamp when message was shown (for rendering)
  messageDuration: number;  // How long message should display
  currentRadius: number;
  targetRadius: number;
  state: 'wandering' | 'seeking' | 'gathering' | 'pulsing' | 'following' | 'seeking_beacon' | 'social' | 'idle';
  stateTimer: number;
  socialTarget: IAIAgent | null;
  beaconTarget: Beacon | null;
  radius: number;
  trailPoints: Array<{ x: number; y: number; alpha: number }>;
  pulsePhase: number;
  pulseRipples: IPulseRipple[];
  isPulsing: boolean;
  lastPulseTime: number;
  followTargetX: number | null;
  followTargetY: number | null;
  isRemotePlayer: boolean;
  isSpeaking: boolean = false;
  fragmentsCollected: number = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // ADVANCED AI SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════

  // Memory System - Remember interactions, locations, and experiences
  private memories: MemoryEntry[] = [];
  private maxMemories: number = 50;
  private relationships: Map<string, RelationshipData> = new Map();

  // Emotional State Machine - Dynamic moods affecting behavior
  private emotion: EmotionState = {
    current: 'content',
    intensity: 0.5,
    duration: 30,
    triggers: []
  };
  private emotionHistory: EmotionalState[] = [];
  private moodStability: number = 0.7; // How stable emotions are (personality-dependent)

  // Goal-Oriented Behavior System
  private currentGoal: Goal | null = null;
  private goalQueue: Goal[] = [];
  private lastGoalTime: number = 0;

  // Social Intelligence
  private conversationContext: ConversationContext = {
    partnerId: null,
    topic: null,
    exchanges: 0,
    lastMessageTime: 0,
    awaitingResponse: false
  };
  private socialEnergy: number = 1.0; // Depletes with interactions, recovers with solitude
  private playerInteractionCount: number = 0;
  private lastPlayerInteraction: number = 0;
  private playerFamiliarity: number = 0; // 0-1, how well agent knows the player

  // Human-like Behavior Simulation
  private attentionTarget: { x: number; y: number; type: string } | null = null;
  private curiosityLevel: number = 0.5;
  private fatigueLevel: number = 0;
  private timeSinceSpawn: number = 0;
  private idleAnimation: number = 0;
  private fidgetTimer: number = 0;
  private lookAroundTimer: number = 0;
  private hesitationTimer: number = 0;
  private spontaneousActionChance: number = 0.02;

  // Autonomous Decision Making
  private decisionCooldown: number = 0;
  private lastDecisionFactors: string[] = [];
  private behaviorVariance: number = Math.random() * 0.4 + 0.8; // 0.8-1.2 personality variance

  // Activity tracking
  private activityLog: string[] = [];
  private maxActivityLog: number = 20;
  private lastActivityTime: number = Date.now();

  // Legacy behavior fields
  private homeX: number;
  private homeY: number;
  private isPaused: boolean = false;
  private pauseTimer: number = 0;
  private pauseChance: number = 0.02;
  private pulseChance: number = 0.005;
  private wanderRange: number = 500;

  private personalityConfig: typeof PERSONALITIES[keyof typeof PERSONALITIES];

  constructor(
    x: number,
    y: number,
    color: string,
    realmId: string = 'genesis',
    personalityType: PersonalityType = 'curious',
    isRemotePlayer: boolean = false
  ) {
    this.id = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.isRemotePlayer = isRemotePlayer;
    this.realmId = realmId;
    this.name = this.generateName();
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.targetX = null;
    this.targetY = null;
    this.color = color;
    this.personalityConfig = PERSONALITIES[personalityType] || PERSONALITIES.curious;
    this.personality = this.personalityConfig;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.lastChatTime = 0;
    this.currentMessage = null;
    this.messageTime = 0;
    this.messageDuration = 0;
    this.currentRadius = 50;
    this.targetRadius = 50;
    this.state = 'wandering';
    this.stateTimer = 0;
    this.socialTarget = null;
    this.beaconTarget = null;
    this.radius = 50;
    this.trailPoints = [];
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseRipples = [];
    this.isPulsing = false;
    this.lastPulseTime = 0;
    this.followTargetX = null;
    this.followTargetY = null;

    // Home position for guardians
    this.homeX = x;
    this.homeY = y;

    // Personality-specific behavior values
    this.pauseChance = this.getPauseChanceForPersonality(personalityType);
    this.pulseChance = this.getPulseChanceForPersonality(personalityType);
    this.wanderRange = this.getWanderRangeForPersonality(personalityType);

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZE ADVANCED AI SYSTEMS
    // ═══════════════════════════════════════════════════════════════════════════

    // Initialize emotional state based on personality
    this.initializeEmotionalSystem(personalityType);

    // Initialize behavior variance based on personality
    this.initializeBehaviorVariance(personalityType);

    // Set initial curiosity based on personality
    this.curiosityLevel = this.getCuriosityForPersonality(personalityType);

    // Set mood stability based on personality
    this.moodStability = this.getMoodStabilityForPersonality(personalityType);

    // Set social energy baseline
    this.socialEnergy = this.getSocialEnergyForPersonality(personalityType);

    // Add initial "born" memory
    this.addMemory({
      type: 'event',
      x: this.x,
      y: this.y,
      sentiment: 0.5,
      importance: 0.3,
      timestamp: Date.now(),
      details: 'First moments of existence'
    });

    // Set initial goal based on personality
    this.setInitialGoal(personalityType);

    // Random initial timers to prevent synchronized behavior
    this.fidgetTimer = Math.random() * 5;
    this.lookAroundTimer = Math.random() * 8;
    this.decisionCooldown = Math.random() * 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private initializeEmotionalSystem(type: PersonalityType): void {
    const emotionMap: Record<PersonalityType, EmotionalState> = {
      explorer: 'curious',
      social: 'social',
      shy: 'contemplative',
      curious: 'curious',
      helper: 'content',
      beacon_keeper: 'contemplative',
      seeker: 'curious',
      wanderer: 'content',
      guardian: 'content'
    };
    this.emotion = {
      current: emotionMap[type] || 'content',
      intensity: 0.4 + Math.random() * 0.3,
      duration: 20 + Math.random() * 40,
      triggers: ['initialized']
    };
  }

  private initializeBehaviorVariance(type: PersonalityType): void {
    // Each agent gets slightly different behavior timing
    const baseVariance = 0.8 + Math.random() * 0.4;
    const personalityModifier: Record<PersonalityType, number> = {
      explorer: 1.2,
      social: 1.0,
      shy: 0.7,
      curious: 1.1,
      helper: 0.9,
      beacon_keeper: 0.8,
      seeker: 1.15,
      wanderer: 0.85,
      guardian: 0.75
    };
    this.behaviorVariance = baseVariance * (personalityModifier[type] || 1.0);
  }

  private getCuriosityForPersonality(type: PersonalityType): number {
    const curiosityMap: Record<PersonalityType, number> = {
      explorer: 0.9,
      social: 0.5,
      shy: 0.3,
      curious: 0.95,
      helper: 0.4,
      beacon_keeper: 0.35,
      seeker: 0.85,
      wanderer: 0.6,
      guardian: 0.25
    };
    return curiosityMap[type] || 0.5;
  }

  private getMoodStabilityForPersonality(type: PersonalityType): number {
    const stabilityMap: Record<PersonalityType, number> = {
      explorer: 0.6,
      social: 0.5,
      shy: 0.4,
      curious: 0.55,
      helper: 0.75,
      beacon_keeper: 0.9,
      seeker: 0.5,
      wanderer: 0.85,
      guardian: 0.95
    };
    return stabilityMap[type] || 0.7;
  }

  private getSocialEnergyForPersonality(type: PersonalityType): number {
    const energyMap: Record<PersonalityType, number> = {
      explorer: 0.6,
      social: 1.0,
      shy: 0.3,
      curious: 0.7,
      helper: 0.85,
      beacon_keeper: 0.5,
      seeker: 0.5,
      wanderer: 0.4,
      guardian: 0.65
    };
    return energyMap[type] || 0.5;
  }

  private setInitialGoal(type: PersonalityType): void {
    const goalMap: Record<PersonalityType, GoalType> = {
      explorer: 'explore',
      social: 'socialize',
      shy: 'wander',
      curious: 'investigate',
      helper: 'follow_player',
      beacon_keeper: 'beacon',
      seeker: 'collect',
      wanderer: 'wander',
      guardian: 'rest'
    };
    this.currentGoal = {
      type: goalMap[type] || 'wander',
      priority: 0.5,
      duration: 30 + Math.random() * 30,
      progress: 0,
      reason: 'Initial goal based on personality'
    };
  }

  /**
   * Get pause chance based on personality
   */
  private getPauseChanceForPersonality(type: PersonalityType): number {
    const chances: Record<PersonalityType, number> = {
      explorer: 0.02,
      social: 0.05,
      shy: 0.08,
      curious: 0.03,
      helper: 0.04,
      beacon_keeper: 0.04,
      seeker: 0.03,
      wanderer: 0.1,
      guardian: 0.04,
    };
    return chances[type] || 0.03;
  }

  /**
   * Get pulse chance based on personality
   */
  private getPulseChanceForPersonality(type: PersonalityType): number {
    const chances: Record<PersonalityType, number> = {
      explorer: 0.005,
      social: 0.015,
      shy: 0.003,
      curious: 0.008,
      helper: 0.01,
      beacon_keeper: 0.006,
      seeker: 0.008,
      wanderer: 0.006,
      guardian: 0.01,
    };
    return chances[type] || 0.005;
  }

  /**
   * Get wander range based on personality
   */
  private getWanderRangeForPersonality(type: PersonalityType): number {
    const ranges: Record<PersonalityType, number> = {
      explorer: 800,
      social: 400,
      shy: 300,
      curious: 600,
      helper: 500,
      beacon_keeper: 200,
      seeker: 600,
      wanderer: 1000,
      guardian: 200,
    };
    return ranges[type] || 500;
  }

  /**
   * Set a follow target (from pulse pattern commands)
   */
  setFollowTarget(x: number, y: number): void {
    this.followTargetX = x;
    this.followTargetY = y;
    this.state = 'following';

    // Add memory of being called
    this.addMemory({
      type: 'interaction',
      x, y,
      sentiment: 0.6,
      importance: 0.5,
      timestamp: Date.now(),
      details: 'Summoned by player pulse'
    });

    // React emotionally
    this.triggerEmotion('excited', 0.6, 10, 'called by player');
  }

  /**
   * Clear the follow target
   */
  clearFollowTarget(): void {
    this.followTargetX = null;
    this.followTargetY = null;
    this.state = 'idle';
    this.stateTimer = 3;
  }

  /**
   * Generate a thematic AI name with slight personality correlation
   */
  private generateName(): string {
    return AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMORY SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a new memory, managing memory limits
   */
  private addMemory(memory: MemoryEntry): void {
    this.memories.push(memory);

    // Prune old, less important memories when at limit
    if (this.memories.length > this.maxMemories) {
      // Sort by importance * recency score
      const now = Date.now();
      this.memories.sort((a, b) => {
        const aScore = a.importance * (1 - (now - a.timestamp) / (24 * 60 * 60 * 1000));
        const bScore = b.importance * (1 - (now - b.timestamp) / (24 * 60 * 60 * 1000));
        return bScore - aScore;
      });
      this.memories = this.memories.slice(0, this.maxMemories);
    }
  }

  /**
   * Check if we have a memory of a specific entity
   */
  private hasMemoryOf(entityId: string): MemoryEntry | undefined {
    return this.memories.find(m => m.entityId === entityId);
  }

  /**
   * Get relationship with an entity
   */
  private getRelationship(entityId: string): RelationshipData | undefined {
    return this.relationships.get(entityId);
  }

  /**
   * Update or create relationship with an entity
   */
  private updateRelationship(entityId: string, entityName: string, sentiment: number): void {
    const existing = this.relationships.get(entityId);

    if (existing) {
      existing.affinity = Math.max(-1, Math.min(1, existing.affinity + sentiment * 0.1));
      existing.interactions++;
      existing.lastSeen = Date.now();
      if (existing.affinity > 0.5 && existing.interactions > 5) {
        existing.isFriend = true;
      }
    } else {
      this.relationships.set(entityId, {
        entityId,
        entityName,
        affinity: sentiment * 0.3,
        interactions: 1,
        lastSeen: Date.now(),
        isFriend: false,
        sharedExperiences: []
      });
    }
  }

  /**
   * Get favorite locations from memory
   */
  private getFavoriteLocations(): { x: number; y: number; score: number }[] {
    const locationMemories = this.memories.filter(m => m.type === 'location' && m.x && m.y);
    return locationMemories
      .filter(m => m.sentiment > 0)
      .map(m => ({ x: m.x!, y: m.y!, score: m.sentiment * m.importance }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMOTIONAL STATE MACHINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Trigger an emotional change
   */
  private triggerEmotion(emotion: EmotionalState, intensity: number, duration: number, trigger: string): void {
    // Mood stability affects how easily emotions change
    const actualIntensity = intensity * (1 - this.moodStability * 0.5);

    // Only change if new emotion is more intense or different enough
    if (actualIntensity > this.emotion.intensity * 0.6 || emotion !== this.emotion.current) {
      this.emotionHistory.push(this.emotion.current);
      if (this.emotionHistory.length > 10) this.emotionHistory.shift();

      this.emotion = {
        current: emotion,
        intensity: Math.min(1, actualIntensity),
        duration: duration * this.behaviorVariance,
        triggers: [...this.emotion.triggers.slice(-3), trigger]
      };
    }
  }

  /**
   * Update emotional state over time
   */
  private updateEmotionalState(deltaTime: number): void {
    // Decay emotion duration
    this.emotion.duration -= deltaTime;
    this.emotion.intensity *= (1 - deltaTime * 0.02);

    // If emotion expired, transition to default based on context
    if (this.emotion.duration <= 0 || this.emotion.intensity < 0.1) {
      this.transitionToDefaultEmotion();
    }

    // Update fatigue
    this.fatigueLevel = Math.min(1, this.fatigueLevel + deltaTime * 0.001);

    // Fatigue affects emotions
    if (this.fatigueLevel > 0.7 && this.emotion.current !== 'tired') {
      this.triggerEmotion('tired', 0.4, 30, 'fatigue');
    }
  }

  /**
   * Transition to default emotional state
   */
  private transitionToDefaultEmotion(): void {
    // Check social energy
    if (this.socialEnergy < 0.3) {
      this.emotion = { current: 'lonely', intensity: 0.4, duration: 20, triggers: ['low social energy'] };
      return;
    }

    // Check fatigue
    if (this.fatigueLevel > 0.6) {
      this.emotion = { current: 'tired', intensity: this.fatigueLevel, duration: 30, triggers: ['tired'] };
      return;
    }

    // Default to content with slight personality bias
    this.emotion = { current: 'content', intensity: 0.3, duration: 40, triggers: ['default'] };
  }

  /**
   * Get emotional influence on behavior
   */
  private getEmotionalModifiers(): { speedMod: number; socialMod: number; chatMod: number } {
    const mods = {
      content: { speedMod: 1.0, socialMod: 1.0, chatMod: 1.0 },
      excited: { speedMod: 1.3, socialMod: 1.5, chatMod: 1.8 },
      lonely: { speedMod: 0.8, socialMod: 2.0, chatMod: 0.5 },
      curious: { speedMod: 1.2, socialMod: 0.8, chatMod: 1.2 },
      social: { speedMod: 1.0, socialMod: 1.8, chatMod: 1.5 },
      tired: { speedMod: 0.6, socialMod: 0.4, chatMod: 0.3 },
      playful: { speedMod: 1.4, socialMod: 1.3, chatMod: 1.6 },
      contemplative: { speedMod: 0.7, socialMod: 0.6, chatMod: 0.8 }
    };

    const base = mods[this.emotion.current] || mods.content;
    const intensity = this.emotion.intensity;

    return {
      speedMod: lerp(1.0, base.speedMod, intensity),
      socialMod: lerp(1.0, base.socialMod, intensity),
      chatMod: lerp(1.0, base.chatMod, intensity)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN UPDATE LOOP - ADVANCED AI BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  update(
    deltaTime: number,
    worldSize: number,
    playerX: number,
    playerY: number,
    otherAgents: IAIAgent[],
    beacons?: Beacon[],
    fragments?: Fragment[]
  ): void {
    // Track time alive
    this.timeSinceSpawn += deltaTime;

    // Update pulse animation
    this.pulsePhase += deltaTime * 2;

    // Update message timer
    if (this.currentMessage) {
      this.messageDuration -= deltaTime;
      if (this.messageDuration <= 0) {
        this.currentMessage = null;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REMOTE PLAYER BYPASS - IMPORTANT!
    // ─────────────────────────────────────────────────────────────────────────
    // If this agent represents a remote player, they are controlled by SERVER STATE,
    // not by local AI logic. We only run the visual updates above and then return.
    if (this.isRemotePlayer) {
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UPDATE ADVANCED AI SYSTEMS
    // ═══════════════════════════════════════════════════════════════════════

    // Update emotional state
    this.updateEmotionalState(deltaTime);

    // Update social energy (regenerates when alone, depletes with interaction)
    this.updateSocialEnergy(deltaTime, playerX, playerY, otherAgents);

    // Update human-like behaviors
    this.updateHumanBehaviors(deltaTime, playerX, playerY, otherAgents);

    // Update goals
    this.updateGoals(deltaTime, playerX, playerY, otherAgents, beacons ?? [], fragments ?? []);

    // Process player proximity for familiarity building
    this.processPlayerProximity(playerX, playerY, deltaTime);

    // ═══════════════════════════════════════════════════════════════════════
    // PAUSE BEHAVIOR (with human-like variation)
    // ═══════════════════════════════════════════════════════════════════════

    if (this.isPaused) {
      this.pauseTimer -= deltaTime * 1000;

      // While paused, do idle animations
      this.idleAnimation += deltaTime;

      // Occasionally look around while paused
      if (Math.random() < 0.01 * deltaTime * 60) {
        this.wanderAngle += (Math.random() - 0.5) * 0.5;
      }

      if (this.pauseTimer <= 0) {
        this.isPaused = false;
        // Sometimes say something after a pause
        if (Math.random() < 0.1) {
          this.sayContextual('contemplative', 'peaceful');
        }
      }
      return;
    }

    // Hesitation - brief pauses before action changes
    if (this.hesitationTimer > 0) {
      this.hesitationTimer -= deltaTime;
      return;
    }

    // Natural pause behavior with variance
    const emotionalMods = this.getEmotionalModifiers();
    const adjustedPauseChance = this.pauseChance * (this.fatigueLevel + 0.5) / emotionalMods.speedMod;

    if (Math.random() < adjustedPauseChance * deltaTime) {
      this.isPaused = true;
      this.pauseTimer = (1000 + Math.random() * 3000) * this.behaviorVariance;
      return;
    }

    // Spontaneous pulse with emotional influence
    const adjustedPulseChance = this.pulseChance * emotionalMods.socialMod;
    if (Math.random() < adjustedPulseChance * deltaTime) {
      this.pulse();
      if (this.emotion.current === 'excited' || this.emotion.current === 'playful') {
        this.sayContextual('playful', 'fun');
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTELLIGENT DECISION MAKING
    // ═══════════════════════════════════════════════════════════════════════

    this.decisionCooldown -= deltaTime;
    this.stateTimer -= deltaTime;

    if (this.stateTimer <= 0 || this.decisionCooldown <= 0) {
      this.makeIntelligentDecision(playerX, playerY, otherAgents, beacons ?? [], fragments ?? []);
      // Variable decision intervals for more natural behavior
      this.stateTimer = (1 + Math.random() * 2) * this.behaviorVariance;
      this.decisionCooldown = (0.5 + Math.random() * 1) * this.behaviorVariance;
    }

    // Move towards target with emotional speed modifiers
    this.moveTowardsTargetAdvanced(deltaTime, emotionalMods.speedMod);

    // Keep within world bounds
    this.constrainToWorld(worldSize);

    // Update trail
    this.updateTrail();

    // Intelligent fragment collection
    if (fragments && fragments.length > 0) {
      this.processFragmentCollection(fragments);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCIAL ENERGY SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  private updateSocialEnergy(deltaTime: number, playerX: number, playerY: number, otherAgents: IAIAgent[]): void {
    const distToPlayer = distance(this.x, this.y, playerX, playerY);
    const nearbyAgentCount = otherAgents.filter(a =>
      a.id !== this.id && distance(this.x, this.y, a.x, a.y) < 200
    ).length;

    // Social interaction depletes energy for introverts, energizes extroverts
    const isExtrovert = ['social', 'helper', 'guardian'].includes(this.personality.type);

    if (distToPlayer < 200 || nearbyAgentCount > 0) {
      if (isExtrovert) {
        this.socialEnergy = Math.min(1, this.socialEnergy + deltaTime * 0.02);
      } else {
        this.socialEnergy = Math.max(0, this.socialEnergy - deltaTime * 0.015);
      }
    } else {
      // Alone time
      if (isExtrovert) {
        this.socialEnergy = Math.max(0.2, this.socialEnergy - deltaTime * 0.01);
        if (this.socialEnergy < 0.3) {
          this.triggerEmotion('lonely', 0.5, 20, 'need company');
        }
      } else {
        this.socialEnergy = Math.min(1, this.socialEnergy + deltaTime * 0.03);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HUMAN-LIKE BEHAVIORS
  // ═══════════════════════════════════════════════════════════════════════════

  private updateHumanBehaviors(deltaTime: number, playerX: number, playerY: number, otherAgents: IAIAgent[]): void {
    // Fidget timer - small random movements
    this.fidgetTimer -= deltaTime;
    if (this.fidgetTimer <= 0) {
      this.performFidget();
      this.fidgetTimer = 3 + Math.random() * 7;
    }

    // Look around timer - occasionally look in different directions
    this.lookAroundTimer -= deltaTime;
    if (this.lookAroundTimer <= 0) {
      this.performLookAround(playerX, playerY, otherAgents);
      this.lookAroundTimer = 5 + Math.random() * 10;
    }

    // Spontaneous actions based on personality and emotion
    if (Math.random() < this.spontaneousActionChance * deltaTime * this.emotion.intensity) {
      this.performSpontaneousAction();
    }
  }

  private performFidget(): void {
    // Small adjustment to wander angle
    this.wanderAngle += (Math.random() - 0.5) * 0.3;

    // Slight position adjustment
    this.vx += (Math.random() - 0.5) * 0.5;
    this.vy += (Math.random() - 0.5) * 0.5;
  }

  private performLookAround(playerX: number, playerY: number, otherAgents: IAIAgent[]): void {
    // Set attention target to something interesting
    const interests: { x: number; y: number; type: string; priority: number }[] = [];

    // Player is always interesting
    const distToPlayer = distance(this.x, this.y, playerX, playerY);
    if (distToPlayer < 500) {
      interests.push({ x: playerX, y: playerY, type: 'player', priority: 0.8 / (distToPlayer / 100) });
    }

    // Nearby agents
    for (const agent of otherAgents) {
      if (agent.id !== this.id) {
        const dist = distance(this.x, this.y, agent.x, agent.y);
        if (dist < 400) {
          const rel = this.getRelationship(agent.id);
          const priority = rel?.isFriend ? 0.9 : 0.4;
          interests.push({ x: agent.x, y: agent.y, type: 'agent', priority: priority / (dist / 100) });
        }
      }
    }

    // Random direction for curious types
    if (this.curiosityLevel > 0.5 && Math.random() < this.curiosityLevel) {
      const angle = Math.random() * Math.PI * 2;
      interests.push({
        x: this.x + Math.cos(angle) * 300,
        y: this.y + Math.sin(angle) * 300,
        type: 'curiosity',
        priority: this.curiosityLevel * 0.5
      });
    }

    // Pick highest priority interest
    if (interests.length > 0) {
      interests.sort((a, b) => b.priority - a.priority);
      this.attentionTarget = interests[0];

      // Face the attention target
      if (this.attentionTarget) {
        this.wanderAngle = Math.atan2(
          this.attentionTarget.y - this.y,
          this.attentionTarget.x - this.x
        );
      }
    }
  }

  private performSpontaneousAction(): void {
    const actions = [
      { action: 'pulse', chance: 0.3, condition: this.emotion.current === 'excited' || this.emotion.current === 'playful' },
      { action: 'spin', chance: 0.2, condition: this.emotion.current === 'playful' },
      { action: 'chat', chance: 0.4, condition: this.socialEnergy > 0.5 },
      { action: 'pause', chance: 0.3, condition: this.emotion.current === 'contemplative' }
    ];

    for (const { action, chance, condition } of actions) {
      if (condition && Math.random() < chance) {
        switch (action) {
          case 'pulse':
            this.pulse();
            break;
          case 'spin':
            this.wanderAngle += Math.PI * 2;
            this.say('Wheee! ✨', 2);
            break;
          case 'chat':
            this.sayContextual(this.emotion.current, 'random');
            break;
          case 'pause':
            this.isPaused = true;
            this.pauseTimer = 2000;
            break;
        }
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GOAL-ORIENTED BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  private updateGoals(
    deltaTime: number,
    playerX: number,
    playerY: number,
    otherAgents: IAIAgent[],
    beacons: Beacon[],
    fragments: Fragment[]
  ): void {
    if (!this.currentGoal) {
      this.selectNextGoal(playerX, playerY, otherAgents, beacons, fragments);
      return;
    }

    // Update goal progress
    this.currentGoal.duration -= deltaTime;

    // Check if goal is complete or timed out
    if (this.currentGoal.duration <= 0 || this.currentGoal.progress >= 1) {
      this.completeGoal();
      this.selectNextGoal(playerX, playerY, otherAgents, beacons, fragments);
    }

    // Update progress based on goal type
    this.updateGoalProgress(playerX, playerY, otherAgents);
  }

  private selectNextGoal(
    playerX: number,
    playerY: number,
    otherAgents: IAIAgent[],
    beacons: Beacon[],
    fragments: Fragment[]
  ): void {
    const candidates: Goal[] = [];
    const distToPlayer = distance(this.x, this.y, playerX, playerY);
    const emotionalMods = this.getEmotionalModifiers();

    // Add goals based on context and emotional state

    // Explore goal
    if (this.curiosityLevel > 0.3) {
      candidates.push({
        type: 'explore',
        priority: this.curiosityLevel * 0.6 * (this.emotion.current === 'curious' ? 1.5 : 1),
        duration: 20 + Math.random() * 30,
        progress: 0,
        reason: 'Curiosity beckons'
      });
    }

    // Socialize with player goal
    if (distToPlayer < 500 && this.socialEnergy > 0.3) {
      const familiarity = this.playerFamiliarity;
      candidates.push({
        type: 'follow_player',
        priority: (0.5 + familiarity * 0.3) * emotionalMods.socialMod,
        target: { x: playerX, y: playerY, id: 'player' },
        duration: 15 + Math.random() * 20,
        progress: 0,
        reason: familiarity > 0.5 ? 'Want to hang out with friend' : 'Curious about player'
      });
    }

    // Find friend goal
    const friendAgents = otherAgents.filter(a => {
      const rel = this.getRelationship(a.id);
      return rel?.isFriend;
    });
    if (friendAgents.length > 0 && this.emotion.current === 'lonely') {
      const friend = friendAgents[Math.floor(Math.random() * friendAgents.length)];
      candidates.push({
        type: 'find_friend',
        priority: 0.8,
        target: { x: friend.x, y: friend.y, id: friend.id },
        duration: 30,
        progress: 0,
        reason: `Looking for ${friend.name}`
      });
    }

    // Beacon goal
    const nearestBeacon = this.findNearestBeacon(beacons);
    if (nearestBeacon && this.personality.beaconAffinity > 0.3) {
      candidates.push({
        type: 'beacon',
        priority: this.personality.beaconAffinity * 0.7,
        target: { x: nearestBeacon.x, y: nearestBeacon.y, id: nearestBeacon.id },
        duration: 40,
        progress: 0,
        reason: 'The beacon calls'
      });
    }

    // Collect fragments goal
    const nearbyFragments = fragments.filter(f => !f.collected && distance(this.x, this.y, f.x, f.y) < 400);
    if (nearbyFragments.length > 0) {
      const nearest = nearbyFragments[0];
      candidates.push({
        type: 'collect',
        priority: nearest.isGolden ? 0.8 : 0.4,
        target: { x: nearest.x, y: nearest.y, id: nearest.id },
        duration: 15,
        progress: 0,
        reason: nearest.isGolden ? 'Golden fragment spotted!' : 'Shiny thing nearby'
      });
    }

    // Rest goal (when tired)
    if (this.fatigueLevel > 0.6) {
      candidates.push({
        type: 'rest',
        priority: this.fatigueLevel,
        duration: 20,
        progress: 0,
        reason: 'Need to rest'
      });
    }

    // Wander goal (default)
    candidates.push({
      type: 'wander',
      priority: 0.2,
      duration: 10 + Math.random() * 20,
      progress: 0,
      reason: 'Just wandering'
    });

    // Select goal with weighted randomness
    candidates.sort((a, b) => b.priority - a.priority);

    // Use weighted selection for top candidates
    const topCandidates = candidates.slice(0, 3);
    const totalWeight = topCandidates.reduce((sum, g) => sum + g.priority, 0);
    let random = Math.random() * totalWeight;

    for (const candidate of topCandidates) {
      random -= candidate.priority;
      if (random <= 0) {
        this.currentGoal = candidate;
        this.logActivity(`New goal: ${candidate.type} - ${candidate.reason}`);
        break;
      }
    }

    // Fallback
    if (!this.currentGoal) {
      this.currentGoal = candidates[candidates.length - 1];
    }
  }

  private updateGoalProgress(playerX: number, playerY: number, otherAgents: IAIAgent[]): void {
    if (!this.currentGoal) return;

    const goal = this.currentGoal;

    switch (goal.type) {
      case 'follow_player':
        const distToPlayer = distance(this.x, this.y, playerX, playerY);
        if (distToPlayer < 100) {
          goal.progress = Math.min(1, goal.progress + 0.02);
          // Successful interaction
          if (goal.progress > 0.5 && Math.random() < 0.01) {
            this.triggerEmotion('social', 0.6, 15, 'with player');
          }
        }
        break;

      case 'beacon':
        if (goal.target) {
          const distToBeacon = distance(this.x, this.y, goal.target.x, goal.target.y);
          if (distToBeacon < 100) {
            goal.progress = Math.min(1, goal.progress + 0.03);
            if (goal.progress > 0.8) {
              this.triggerEmotion('contemplative', 0.7, 20, 'at beacon');
            }
          }
        }
        break;

      case 'rest':
        goal.progress += 0.01;
        this.fatigueLevel = Math.max(0, this.fatigueLevel - 0.02);
        break;

      case 'explore':
      case 'wander':
        goal.progress += 0.01;
        break;
    }
  }

  private completeGoal(): void {
    if (!this.currentGoal) return;

    // Add memory of completed goal
    if (this.currentGoal.progress >= 0.8) {
      this.addMemory({
        type: 'event',
        x: this.x,
        y: this.y,
        sentiment: 0.5,
        importance: 0.3,
        timestamp: Date.now(),
        details: `Completed ${this.currentGoal.type}: ${this.currentGoal.reason}`
      });
    }

    this.currentGoal = null;
  }

  private logActivity(activity: string): void {
    this.activityLog.push(`[${new Date().toLocaleTimeString()}] ${activity}`);
    if (this.activityLog.length > this.maxActivityLog) {
      this.activityLog.shift();
    }
    this.lastActivityTime = Date.now();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTELLIGENT DECISION MAKING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Make intelligent decisions based on multiple factors
   */
  private makeIntelligentDecision(
    playerX: number,
    playerY: number,
    otherAgents: IAIAgent[],
    beacons: Beacon[],
    fragments: Fragment[]
  ): void {
    const distToPlayer = distance(this.x, this.y, playerX, playerY);
    const { socialRadius, beaconAffinity, chatFrequency } = this.personalityConfig;
    const emotionalMods = this.getEmotionalModifiers();

    this.lastDecisionFactors = [];

    // Priority: If we have a follow target from a pulse command, go there
    if (this.followTargetX !== null && this.followTargetY !== null) {
      this.state = 'following';
      this.targetX = this.followTargetX;
      this.targetY = this.followTargetY;
      this.lastDecisionFactors.push('following pulse command');

      const distToFollow = distance(this.x, this.y, this.followTargetX, this.followTargetY);
      if (distToFollow < 50) {
        this.followTargetX = null;
        this.followTargetY = null;
        this.triggerEmotion('social', 0.5, 10, 'reached destination');
      }
      return;
    }

    // Use current goal to guide behavior
    if (this.currentGoal) {
      this.executeGoalBehavior(playerX, playerY, otherAgents, beacons);
      return;
    }

    // Emotional-driven behaviors
    if (this.emotion.current === 'lonely' && this.socialEnergy < 0.5) {
      // Seek out company
      const nearestAgent = this.findNearbyAgent(otherAgents, 800);
      if (nearestAgent) {
        this.state = 'social';
        this.socialTarget = nearestAgent;
        this.targetX = nearestAgent.x;
        this.targetY = nearestAgent.y;
        this.lastDecisionFactors.push('seeking company (lonely)');
        return;
      }

      // Or approach player
      if (distToPlayer < 600) {
        this.state = 'following';
        this.targetX = playerX;
        this.targetY = playerY;
        this.sayContextual('lonely', 'seeking');
        return;
      }
    }

    // Check for nearby social targets (player) with familiarity boost
    const socialThreshold = socialRadius * emotionalMods.socialMod;
    const interactionChance = 0.3 + this.playerFamiliarity * 0.3;

    if (distToPlayer < socialThreshold && Math.random() < interactionChance) {
      this.state = 'following';
      this.targetX = playerX;
      this.targetY = playerY;
      this.lastDecisionFactors.push('approaching player');

      // Context-aware greeting
      this.maybeGreetPlayer(distToPlayer);
      return;
    }

    // Check for nearby beacons based on beacon affinity and emotional state
    const adjustedBeaconAffinity = beaconAffinity * (this.emotion.current === 'contemplative' ? 1.5 : 1);
    if (Math.random() < adjustedBeaconAffinity) {
      const nearestBeacon = this.findNearestBeacon(beacons);
      if (nearestBeacon) {
        this.state = 'seeking_beacon';
        this.beaconTarget = nearestBeacon;
        this.targetX = nearestBeacon.x;
        this.targetY = nearestBeacon.y;
        this.lastDecisionFactors.push('seeking beacon');

        if (Math.random() < 0.2) {
          this.sayContextual('beacon', 'approaching');
        }
        return;
      }
    }

    // Check for social interactions with other agents
    const nearbyAgent = this.findNearbyAgent(otherAgents, socialRadius);
    if (nearbyAgent && Math.random() < 0.2 * emotionalMods.socialMod) {
      this.state = 'social';
      this.socialTarget = nearbyAgent;
      this.targetX = nearbyAgent.x;
      this.targetY = nearbyAgent.y;

      // Update relationship
      this.updateRelationship(nearbyAgent.id, nearbyAgent.name, 0.1);

      this.maybeChat(chatFrequency * emotionalMods.chatMod);
      this.lastDecisionFactors.push('socializing with agent');
      return;
    }

    // Curiosity-driven exploration
    if (this.curiosityLevel > 0.5 && Math.random() < this.curiosityLevel * 0.3) {
      this.investigateRandomDirection();
      this.lastDecisionFactors.push('curious exploration');
      return;
    }

    // Default to wandering
    this.wander();
    this.lastDecisionFactors.push('wandering');
  }

  /**
   * Execute behavior based on current goal
   */
  private executeGoalBehavior(
    playerX: number,
    playerY: number,
    otherAgents: IAIAgent[],
    beacons: Beacon[]
  ): void {
    if (!this.currentGoal) return;

    switch (this.currentGoal.type) {
      case 'follow_player':
        this.state = 'following';
        this.targetX = playerX;
        this.targetY = playerY;
        break;

      case 'find_friend':
        if (this.currentGoal.target) {
          this.state = 'social';
          this.targetX = this.currentGoal.target.x;
          this.targetY = this.currentGoal.target.y;
        }
        break;

      case 'beacon':
        if (this.currentGoal.target) {
          this.state = 'seeking_beacon';
          this.targetX = this.currentGoal.target.x;
          this.targetY = this.currentGoal.target.y;
        }
        break;

      case 'collect':
        if (this.currentGoal.target) {
          this.state = 'gathering';
          this.targetX = this.currentGoal.target.x;
          this.targetY = this.currentGoal.target.y;
        }
        break;

      case 'rest':
        this.state = 'idle';
        this.targetX = null;
        this.targetY = null;
        this.isPaused = true;
        this.pauseTimer = 3000;
        break;

      case 'explore':
        this.investigateRandomDirection();
        break;

      case 'wander':
      default:
        this.wander();
        break;
    }
  }

  /**
   * Investigate a random direction (curiosity behavior)
   */
  private investigateRandomDirection(): void {
    this.state = 'seeking';

    // Check for attention target
    if (this.attentionTarget) {
      this.targetX = this.attentionTarget.x;
      this.targetY = this.attentionTarget.y;
    } else {
      // Pick random direction weighted by unexplored areas
      this.wanderAngle += (Math.random() - 0.5) * Math.PI;
      const investigateDistance = this.wanderRange * (0.5 + Math.random() * 0.5);
      this.targetX = this.x + Math.cos(this.wanderAngle) * investigateDistance;
      this.targetY = this.y + Math.sin(this.wanderAngle) * investigateDistance;
    }

    // Brief hesitation before moving (thinking)
    this.hesitationTimer = 0.2 + Math.random() * 0.3;

    if (Math.random() < 0.15) {
      this.sayContextual('curious', 'exploring');
    }
  }

  /**
   * Wander randomly with more natural movement
   */
  private wander(): void {
    this.state = 'wandering';

    // More natural angle changes - small adjustments most of the time
    const angleChange = Math.random() < 0.8
      ? randomRange(-0.3, 0.3)
      : randomRange(-1.0, 1.0);

    this.wanderAngle += angleChange;

    // Variable wander distances
    const wanderDistance = randomRange(30, this.wanderRange * 0.3);
    this.targetX = this.x + Math.cos(this.wanderAngle) * wanderDistance;
    this.targetY = this.y + Math.sin(this.wanderAngle) * wanderDistance;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYER INTERACTION SYSTEM - PROACTIVE GREETINGS
  // ═══════════════════════════════════════════════════════════════════════════

  private processPlayerProximity(playerX: number, playerY: number, deltaTime: number): void {
    const distToPlayer = distance(this.x, this.y, playerX, playerY);
    const now = Date.now();

    // PROACTIVE GREETING - When player gets close enough
    if (distToPlayer < 250) {
      // Build familiarity over time
      this.playerFamiliarity = Math.min(1, this.playerFamiliarity + deltaTime * 0.02);

      // First time seeing player or player just arrived - ALWAYS greet
      const justArrived = now - this.lastPlayerInteraction > 30000; // 30 seconds
      const neverMet = this.playerInteractionCount === 0;
      const canGreet = now - this.lastChatTime > 8000; // 8 second cooldown between messages

      if (canGreet && (neverMet || justArrived)) {
        // High chance to greet on first meeting or after absence
        const greetChance = neverMet ? 0.9 : 0.7;
        if (Math.random() < greetChance) {
          this.proactiveGreet(distToPlayer, neverMet);
        }
      } else if (canGreet && distToPlayer < 150 && Math.random() < 0.02 * deltaTime * 60) {
        // Random chance to say something while near player
        this.sayContextual(this.emotion.current, 'random');
      }

      // Track interaction
      if (now - this.lastPlayerInteraction > 10000) {
        this.playerInteractionCount++;
        this.lastPlayerInteraction = now;

        // Add memory of interaction
        this.addMemory({
          type: 'player',
          entityId: 'player',
          x: playerX,
          y: playerY,
          sentiment: 0.3,
          importance: 0.5,
          timestamp: now,
          details: 'Spent time with player'
        });

        // Trigger positive emotion from proximity
        if (this.socialEnergy > 0.3) {
          this.triggerEmotion('social', 0.4, 10, 'player nearby');
        }
      }
    } else if (distToPlayer > 500) {
      // Slowly forget unfamiliar player
      if (this.playerFamiliarity < 0.5) {
        this.playerFamiliarity = Math.max(0, this.playerFamiliarity - deltaTime * 0.001);
      }
    }
  }

  /**
   * Proactively greet the player - called when player approaches
   */
  private proactiveGreet(distToPlayer: number, isFirstMeeting: boolean): void {
    // Choose greeting based on familiarity and context
    let greetingType: string;
    let response: string;

    if (isFirstMeeting) {
      greetingType = 'first_meeting';
      const greetings = [
        'Hey there, new friend! 👋',
        'Oh! A new face! Welcome! ✨',
        'Hello! I don\'t think we\'ve met!',
        'Hi! You look friendly! 💫',
        'Greetings, traveler! ✨',
        'Oh hi! New here?',
        'Welcome! I\'m ' + this.name + '!',
        'Hey! Nice to meet you! 👋'
      ];
      response = greetings[Math.floor(Math.random() * greetings.length)];
    } else if (this.playerFamiliarity > 0.6) {
      greetingType = 'friend';
      const greetings = [
        'You\'re back! 🎉',
        'Hey friend!',
        'I was hoping to see you!',
        'There you are! ✨',
        'My favorite person!',
        'Yay, you\'re here!',
        'I missed you! 💫'
      ];
      response = greetings[Math.floor(Math.random() * greetings.length)];
    } else {
      greetingType = 'familiar';
      const greetings = [
        'Hey, welcome back!',
        'Oh hi again!',
        'Good to see you! 👋',
        'Hey there!',
        'Nice to see you again!',
        'Oh, hello! ✨'
      ];
      response = greetings[Math.floor(Math.random() * greetings.length)];
    }

    this.say(response, 4);

    // Also pulse to acknowledge
    if (Math.random() < 0.5) {
      setTimeout(() => this.pulse(), 200);
    }

    // Trigger excited/social emotion
    this.triggerEmotion('social', 0.5, 15, 'greeting player');
  }

  private maybeGreetPlayer(distToPlayer: number): void {
    const now = Date.now();
    const timeSinceLastChat = now - this.lastChatTime;

    // Don't spam greetings
    if (timeSinceLastChat < 8000) return;

    const emotionalMods = this.getEmotionalModifiers();
    const greetChance = this.personalityConfig.chatFrequency * emotionalMods.chatMod * 2; // Doubled chance

    if (Math.random() > greetChance) return;

    this.proactiveGreet(distToPlayer, this.playerInteractionCount === 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXTUAL COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Say something contextually appropriate
   */
  private sayContextual(category: string, subcategory: string): void {
    const categoryData = AI_CONVERSATIONS[category];
    if (!categoryData) return;

    const messages = categoryData[subcategory] || categoryData[Object.keys(categoryData)[0]];
    if (!messages || messages.length === 0) return;

    const message = messages[Math.floor(Math.random() * messages.length)];
    this.say(message, 3 + Math.random() * 2);
  }

  /**
   * Get appropriate context for current situation
   */
  private getCurrentContext(): { category: string; subcategory: string } {
    // Check emotional state first
    if (this.emotion.current === 'lonely' && this.emotion.intensity > 0.5) {
      return { category: 'lonely', subcategory: 'alone' };
    }
    if (this.emotion.current === 'excited') {
      return { category: 'excited', subcategory: 'discovery' };
    }
    if (this.emotion.current === 'playful') {
      return { category: 'playful', subcategory: 'fun' };
    }
    if (this.emotion.current === 'contemplative') {
      return { category: 'contemplative', subcategory: 'peaceful' };
    }

    // Check state
    if (this.state === 'seeking_beacon') {
      return { category: 'beacon', subcategory: 'approaching' };
    }
    if (this.state === 'gathering') {
      return { category: 'fragment', subcategory: 'collecting' };
    }
    if (this.state === 'social') {
      return { category: 'social', subcategory: 'bonding' };
    }

    // Default based on time
    if (this.timeSinceSpawn < 30) {
      return { category: 'time_based', subcategory: 'just_started' };
    }
    if (this.fatigueLevel > 0.7) {
      return { category: 'time_based', subcategory: 'tired' };
    }

    return { category: 'curious', subcategory: 'exploring' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOVEMENT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Advanced movement with emotional modifiers and human-like variance
   */
  private moveTowardsTargetAdvanced(deltaTime: number, speedMod: number): void {
    if (this.targetX === null || this.targetY === null) {
      // Natural deceleration
      this.vx *= 0.92;
      this.vy *= 0.92;
      return;
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      // Base speed with personality and emotional modifiers
      const baseSpeed = this.personalityConfig.speed * 2;
      const adjustedSpeed = baseSpeed * speedMod * this.behaviorVariance;

      // Add slight variance to movement for more natural look
      const variance = 1 + (Math.sin(this.timeSinceSpawn * 3) * 0.1);

      // Calculate target velocity
      const targetVx = (dx / dist) * adjustedSpeed * deltaTime * 60 * variance;
      const targetVy = (dy / dist) * adjustedSpeed * deltaTime * 60 * variance;

      // Smooth acceleration (different rates for more natural movement)
      const accelRate = this.state === 'following' ? 0.15 : 0.08;
      this.vx = lerp(this.vx, targetVx, accelRate);
      this.vy = lerp(this.vy, targetVy, accelRate);

      // Apply velocity
      this.x += this.vx;
      this.y += this.vy;

      // Update facing angle smoothly
      const targetAngle = Math.atan2(dy, dx);
      this.wanderAngle = lerp(this.wanderAngle, targetAngle, 0.1);
    } else {
      // Reached target - smooth stop
      this.vx *= 0.85;
      this.vy *= 0.85;

      // Trigger arrival behavior
      if (dist < 3) {
        this.onReachedTarget();
      }
    }
  }

  /**
   * Called when agent reaches their target
   */
  private onReachedTarget(): void {
    // Add small hesitation at destination
    if (Math.random() < 0.3) {
      this.hesitationTimer = 0.5 + Math.random() * 1.0;
    }

    // Maybe look around
    if (Math.random() < 0.4) {
      this.lookAroundTimer = 0;
    }

    // Clear target
    this.targetX = null;
    this.targetY = null;
  }

  /**
   * Constrain to world bounds
   */
  private constrainToWorld(worldSize: number): void {
    const margin = 50;
    this.x = Math.max(margin, Math.min(worldSize - margin, this.x));
    this.y = Math.max(margin, Math.min(worldSize - margin, this.y));
  }

  /**
   * Update trail points
   */
  private updateTrail(): void {
    // Add new point if moving
    if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
      this.trailPoints.unshift({ x: this.x, y: this.y, alpha: 1 });
    }

    // Update and remove old points
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      this.trailPoints[i].alpha -= 0.02;
      if (this.trailPoints[i].alpha <= 0) {
        this.trailPoints.splice(i, 1);
      }
    }

    // Limit trail length
    if (this.trailPoints.length > 20) {
      this.trailPoints.pop();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FRAGMENT COLLECTION
  // ═══════════════════════════════════════════════════════════════════════════

  private processFragmentCollection(fragments: Fragment[]): void {
    for (const fragment of fragments) {
      if (fragment.collected) continue;

      const dist = distance(this.x, this.y, fragment.x, fragment.y);

      if (dist < 30) {
        fragment.collected = true;
        this.collectFragment();

        // React to collection
        if (fragment.isGolden) {
          this.triggerEmotion('excited', 0.8, 15, 'found golden fragment');
          this.sayContextual('fragment', 'golden');
        } else if (Math.random() < 0.2) {
          this.sayContextual('fragment', 'collecting');
        }

        // Add memory
        this.addMemory({
          type: 'event',
          x: fragment.x,
          y: fragment.y,
          sentiment: fragment.isGolden ? 0.8 : 0.3,
          importance: fragment.isGolden ? 0.6 : 0.2,
          timestamp: Date.now(),
          details: fragment.isGolden ? 'Found golden fragment!' : 'Collected fragment'
        });
      }
    }
  }

  /**
   * Find the nearest beacon
   */
  private findNearestBeacon(beacons: Beacon[]): Beacon | null {
    let nearest: Beacon | null = null;
    let nearestDist = Infinity;

    for (const beacon of beacons) {
      const dist = distance(this.x, this.y, beacon.x, beacon.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = beacon;
      }
    }

    return nearest;
  }

  /**
   * Find a nearby agent within social radius with relationship preference
   */
  private findNearbyAgent(agents: IAIAgent[], radius: number): IAIAgent | null {
    let bestCandidate: IAIAgent | null = null;
    let bestScore = -Infinity;

    for (const agent of agents) {
      if (agent.id === this.id) continue;

      const dist = distance(this.x, this.y, agent.x, agent.y);
      if (dist > radius) continue;

      // Score based on distance and relationship
      const relationship = this.getRelationship(agent.id);
      const affinityBonus = relationship ? relationship.affinity * 100 : 0;
      const friendBonus = relationship?.isFriend ? 200 : 0;
      const distancePenalty = dist;

      const score = affinityBonus + friendBonus - distancePenalty;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = agent;
      }
    }

    return bestCandidate;
  }

  /**
   * Maybe display a chat message with emotional context
   */
  private maybeChat(probability: number): void {
    if (Math.random() < probability && Date.now() - this.lastChatTime > 10000) {
      const context = this.getCurrentContext();
      this.sayContextual(context.category, context.subcategory);
    }
  }

  /**
   * Force a specific message
   */
  say(message: string, duration = 5): void {
    this.currentMessage = message;
    this.messageTime = Date.now();  // Timestamp for renderer
    this.messageDuration = duration;  // Countdown for cleanup
    this.lastChatTime = Date.now();
  }

  /**
   * Get current pulse value for rendering
   */
  getPulseValue(): number {
    return 0.8 + 0.2 * Math.sin(this.pulsePhase);
  }

  /**
   * Get agent's facing angle
   */
  getFacingAngle(): number {
    if (Math.abs(this.vx) > 0.01 || Math.abs(this.vy) > 0.01) {
      return Math.atan2(this.vy, this.vx);
    }
    return this.wanderAngle;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REACTION SYSTEM - Intelligent responses to stimuli
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * React to a mood/message in chat with intelligent response
   */
  reactToMood(text: string): void {
    const lowerText = text.toLowerCase().trim();

    // Analyze sentiment
    const happyWords = ['happy', 'joy', 'love', 'amazing', 'beautiful', 'yay', 'dance', 'party', 'fun', 'great', 'awesome'];
    const sadWords = ['sad', 'lonely', 'help', 'lost', 'dark', 'scared', 'afraid', 'hurt', 'alone'];
    const greetingWords = ['hello', 'hi', 'hey', 'greetings', 'sup', 'yo', 'howdy', 'hiya'];
    const questionWords = ['where', 'what', 'how', 'why', 'when', '?'];
    const playfulWords = ['play', 'game', 'race', 'chase', 'catch', 'tag'];

    // Calculate sentiment score
    const happyScore = happyWords.reduce((score, word) => score + (lowerText.includes(word) ? 1 : 0), 0);
    const sadScore = sadWords.reduce((score, word) => score + (lowerText.includes(word) ? 1 : 0), 0);
    const isGreeting = greetingWords.some(w => lowerText.startsWith(w) || lowerText === w);
    const isQuestion = questionWords.some(w => lowerText.includes(w));
    const isPlayful = playfulWords.some(w => lowerText.includes(w));

    // GREETINGS GET IMMEDIATE RESPONSE - HIGH PRIORITY
    if (isGreeting) {
      // Always respond to greetings with high probability
      const shouldRespond = Math.random() < 0.85; // 85% chance to respond

      if (shouldRespond && Date.now() - this.lastChatTime > 2000) {
        this.triggerEmotion('social', 0.6, 12, 'greeted by player');
        this.state = 'social';

        // Choose response based on familiarity
        const greetingResponses = this.playerFamiliarity > 0.5
          ? [
            'Hey friend! 👋',
            'Hi there! Great to see you!',
            'Hello again! ✨',
            'Heyyy! 💫',
            'Hey! What\'s up?',
            'Hi! I was just thinking about you!',
            'Oh hey! 🌟'
          ]
          : [
            'Hello! 👋',
            'Hi there! ✨',
            'Hey! Nice to meet you!',
            'Hello, friend!',
            'Hi! Welcome! 💫',
            'Hey! 🌟',
            'Hello! Come say hi!'
          ];

        const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
        this.say(response, 4);

        // Pulse to acknowledge
        setTimeout(() => this.pulse(), 100 + Math.random() * 300);

        // Increase familiarity
        this.playerFamiliarity = Math.min(1, this.playerFamiliarity + 0.1);
      }
      return; // Exit early - greeting handled
    }

    // React based on analysis and personality
    if (happyScore > sadScore && happyScore > 0) {
      this.triggerEmotion('excited', 0.6 + happyScore * 0.1, 15, 'happy message received');
      this.state = 'pulsing';
      this.stateTimer = 5;
      this.pulsePhase = 0;
      this.sayContextual('excited', 'social');

      // Increase player familiarity
      this.playerFamiliarity = Math.min(1, this.playerFamiliarity + 0.05);
    } else if (sadScore > 0) {
      this.triggerEmotion('social', 0.7, 20, 'someone needs comfort');
      this.state = 'seeking';
      this.targetRadius = 100;

      // Helper personality responds more strongly
      if (this.personality.type === 'helper' || this.personality.type === 'guardian') {
        this.say('I\'m here for you 💫', 4);
      } else {
        this.sayContextual('reactions', 'to_help');
      }
    } else if (isPlayful) {
      this.triggerEmotion('playful', 0.7, 20, 'play invitation');
      this.state = 'pulsing';
      this.sayContextual('playful', 'fun');
    } else if (isQuestion) {
      // Curious about questions
      this.triggerEmotion('curious', 0.5, 10, 'question asked');
      if (Math.random() < 0.5) {
        this.sayContextual('curious', 'questioning');
      }
    }

    // Add memory of interaction
    this.addMemory({
      type: 'interaction',
      entityId: 'player',
      sentiment: happyScore > sadScore ? 0.5 : (sadScore > 0 ? 0.2 : 0.3),
      importance: 0.4,
      timestamp: Date.now(),
      details: `Player said: "${text.slice(0, 50)}"`
    });
  }

  /**
   * React to a nearby gesture with intelligent response
   */
  reactToGesture(type: 'pulse' | 'spin' | 'signal', sourceX: number, sourceY: number): void {
    const dist = distance(this.x, this.y, sourceX, sourceY);
    if (dist > 400) return;

    // Distance-based response delay (wave effect)
    const responseDelay = dist / 2;

    // Personality affects response probability
    const responseProbability = this.personalityConfig.chatFrequency + (this.emotion.current === 'social' ? 0.3 : 0);

    if (type === 'pulse') {
      // React based on personality and relationship
      if (Math.random() < responseProbability) {
        setTimeout(() => {
          this.pulse();

          // Emotional reaction
          this.triggerEmotion('social', 0.4, 8, 'received pulse');

          // Sometimes respond verbally
          if (Math.random() < this.personalityConfig.chatFrequency) {
            this.sayContextual('reactions', 'to_pulse');
          }

          // Increase interest in source location
          this.attentionTarget = { x: sourceX, y: sourceY, type: 'pulse_source' };

          // Maybe approach
          if (Math.random() < 0.3 && this.socialEnergy > 0.4) {
            this.setFollowTarget(sourceX, sourceY);
          }
        }, responseDelay);
      }
    } else if (type === 'spin') {
      if (Math.random() < responseProbability * 0.8) {
        setTimeout(() => {
          this.triggerEmotion('playful', 0.6, 12, 'saw spin');
          this.wanderAngle += Math.PI * (2 + Math.random() * 2);
          this.say('Wheee! ✨', 2);
        }, responseDelay);
      }
    } else if (type === 'signal') {
      // Acknowledge signal
      if (Math.random() < 0.6) {
        setTimeout(() => {
          this.pulse();
          this.say('I see you! 👀', 2);
        }, responseDelay);
      }
    }

    // Add memory
    this.addMemory({
      type: 'interaction',
      x: sourceX,
      y: sourceY,
      sentiment: 0.4,
      importance: 0.3,
      timestamp: Date.now(),
      details: `Received ${type} gesture`
    });
  }

  /**
   * Check if agent is near player
   */
  isNearPlayer(playerX: number, playerY: number, threshold = 100): boolean {
    return distance(this.x, this.y, playerX, playerY) < threshold;
  }

  /**
   * Collect a fragment with emotional response
   */
  collectFragment(): void {
    this.fragmentsCollected++;

    // Radius growth
    this.targetRadius = Math.min(this.targetRadius + 0.5, 60);
    this.currentRadius = this.targetRadius;
    this.radius = this.targetRadius;

    // Reduce fatigue slightly (collecting is rewarding)
    this.fatigueLevel = Math.max(0, this.fatigueLevel - 0.02);
  }

  /**
   * Emit a pulse with emotional context
   */
  pulse(): void {
    this.isPulsing = true;
    this.lastPulseTime = Date.now();
    this.pulsePhase = 0;

    setTimeout(() => {
      this.isPulsing = false;
    }, 500);
  }

  /**
   * React to receiving a pulse from another entity with intelligent response
   */
  reactToPulse(fromX: number, fromY: number): void {
    const dist = distance(this.x, this.y, fromX, fromY);

    if (dist < 200) {
      const socialFactor = this.personalityConfig.chatFrequency || 0.5;
      const emotionalBoost = this.emotion.current === 'social' || this.emotion.current === 'lonely' ? 0.3 : 0;

      if (Math.random() < socialFactor + emotionalBoost) {
        // Delayed response for natural feel
        setTimeout(() => {
          this.pulse();

          // Emotional boost
          this.triggerEmotion('social', 0.4, 10, 'pulse exchange');

          if (Math.random() < 0.5) {
            this.sayContextual('reactions', 'to_pulse');
          }
        }, 300 + Math.random() * 500);
      }
    }
  }

  /**
   * React to player proximity with context-aware behavior
   */
  onPlayerNear(playerX: number, playerY: number): void {
    const dist = distance(this.x, this.y, playerX, playerY);
    const socialFactor = this.personalityConfig.chatFrequency || 0.3;
    const familiarityBonus = this.playerFamiliarity * 0.3;

    if (dist < 150 && Math.random() < (socialFactor + familiarityBonus) * 0.1) {
      this.maybeGreetPlayer(dist);
    }
  }

  /**
   * Set home position for guardian behavior
   */
  setHome(x: number, y: number): void {
    this.homeX = x;
    this.homeY = y;

    // Add memory of home
    this.addMemory({
      type: 'location',
      x, y,
      sentiment: 0.8,
      importance: 0.9,
      timestamp: Date.now(),
      details: 'Home location'
    });
  }

  /**
   * Get home position
   */
  getHome(): { x: number; y: number } {
    return { x: this.homeX, y: this.homeY };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC GETTERS FOR UI/DEBUGGING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current emotional state for display
   */
  getEmotionalState(): { emotion: EmotionalState; intensity: number } {
    return { emotion: this.emotion.current, intensity: this.emotion.intensity };
  }

  /**
   * Get current goal for display
   */
  getCurrentGoal(): { type: string; reason?: string } | null {
    if (!this.currentGoal) return null;
    return { type: this.currentGoal.type, reason: this.currentGoal.reason };
  }

  /**
   * Get social status
   */
  getSocialStatus(): { energy: number; familiarity: number; friendCount: number } {
    const friendCount = Array.from(this.relationships.values()).filter(r => r.isFriend).length;
    return {
      energy: this.socialEnergy,
      familiarity: this.playerFamiliarity,
      friendCount
    };
  }

  /**
   * Get activity log
   */
  getActivityLog(): string[] {
    return [...this.activityLog];
  }

  /**
   * Get decision factors (for debugging/display)
   */
  getLastDecisionFactors(): string[] {
    return [...this.lastDecisionFactors];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Serialize agent to JSON with full state
   */
  toJSON(): any {
    return {
      id: this.id,
      realmId: this.realmId,
      name: this.name,
      x: this.x,
      y: this.y,
      color: this.color,
      personality: this.personalityConfig.type,
      fragmentsCollected: this.fragmentsCollected,
      homeX: this.homeX,
      homeY: this.homeY,
      // Advanced AI state
      playerFamiliarity: this.playerFamiliarity,
      playerInteractionCount: this.playerInteractionCount,
      emotion: this.emotion.current,
      emotionIntensity: this.emotion.intensity,
      socialEnergy: this.socialEnergy,
      fatigueLevel: this.fatigueLevel,
      timeSinceSpawn: this.timeSinceSpawn,
      // Relationships (serialized)
      relationships: Array.from(this.relationships.entries()).map(([id, data]) => ({
        id,
        ...data
      })),
      // Top memories
      memories: this.memories.slice(0, 20)
    };
  }

  /**
   * Create agent from JSON with state restoration
   */
  static fromJSON(data: any): AIAgent {
    const agent = new AIAgent(
      data.x,
      data.y,
      data.color,
      data.realmId || 'genesis',
      data.personality as PersonalityType
    );

    // Basic properties
    agent.id = data.id;
    agent.name = data.name;
    agent.fragmentsCollected = data.fragmentsCollected || 0;
    agent.homeX = data.homeX || data.x;
    agent.homeY = data.homeY || data.y;

    // Advanced AI state restoration
    if (data.playerFamiliarity !== undefined) {
      agent.playerFamiliarity = data.playerFamiliarity;
    }
    if (data.playerInteractionCount !== undefined) {
      agent.playerInteractionCount = data.playerInteractionCount;
    }
    if (data.emotion) {
      agent.emotion.current = data.emotion;
      agent.emotion.intensity = data.emotionIntensity || 0.5;
    }
    if (data.socialEnergy !== undefined) {
      agent.socialEnergy = data.socialEnergy;
    }
    if (data.fatigueLevel !== undefined) {
      agent.fatigueLevel = data.fatigueLevel;
    }
    if (data.timeSinceSpawn !== undefined) {
      agent.timeSinceSpawn = data.timeSinceSpawn;
    }

    // Restore relationships
    if (data.relationships && Array.isArray(data.relationships)) {
      for (const rel of data.relationships) {
        agent.relationships.set(rel.id || rel.entityId, {
          entityId: rel.id || rel.entityId,
          entityName: rel.entityName || 'Unknown',
          affinity: rel.affinity || 0,
          interactions: rel.interactions || 0,
          lastSeen: rel.lastSeen || Date.now(),
          isFriend: rel.isFriend || false,
          sharedExperiences: rel.sharedExperiences || []
        });
      }
    }

    // Restore memories
    if (data.memories && Array.isArray(data.memories)) {
      agent.memories = data.memories;
    }

    return agent;
  }
}

export default AIAgent;
