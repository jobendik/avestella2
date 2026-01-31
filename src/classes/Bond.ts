// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Bond Class (Extracted from App.jsx)
// The Heart of Connection
// ═══════════════════════════════════════════════════════════════════════════

import { IBond, BondConsent, Position, StarMemory } from '@/types';
import { BOND_GROW_RATE, BOND_DECAY_RATE } from '@/constants/game';

// ILight represents any entity that can form a bond (player, AI agent, etc.)
export interface ILight extends Position {
  id: string;
  name: string;
  color: string;
}

export interface SharedMemory {
  text: string;
  time: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bond Memory System - Stores meaningful interaction memories
// ─────────────────────────────────────────────────────────────────────────────

export type BondMemoryType =
  | 'first_meeting'      // When bond was first formed
  | 'pulse_exchange'     // When players exchanged pulses
  | 'light_gift'         // When light was gifted
  | 'survived_darkness'  // Survived darkness wave together
  | 'found_treasure'     // Found golden fragment together
  | 'constellation'      // Formed constellation together
  | 'beacon_lit'         // Lit a beacon together
  | 'milestone'          // Reached bond strength milestone
  | 'chat_message'       // Chat/whisper exchange
  | 'sealed'             // Bond was sealed
  | 'custom';            // Custom memory

export interface BondMemory {
  id: string;
  type: BondMemoryType;
  description: string;
  timestamp: number;
  location?: { x: number; y: number };
  data?: Record<string, unknown>;
}

const MAX_MEMORIES = 50;
const MEMORY_DESCRIPTIONS: Record<BondMemoryType, string> = {
  first_meeting: 'First touched light with',
  pulse_exchange: 'Shared a heartfelt pulse',
  light_gift: 'Gift of light exchanged',
  survived_darkness: 'Survived the darkness together',
  found_treasure: 'Discovered treasure side by side',
  constellation: 'Formed a beautiful constellation',
  beacon_lit: 'Lit a beacon as one',
  milestone: 'Reached new bond strength',
  chat_message: 'Shared words',
  sealed: 'Sealed eternal bond',
  custom: 'A special moment',
};

export class Bond implements IBond {
  // Core properties from App.jsx
  id: string;
  targetId: string;
  targetName: string;
  targetColor: string;
  name: string;
  color: string;
  strength: number;
  consent: BondConsent;
  mode: 'silent' | 'whisper' | 'voice';
  sharedMemory: SharedMemory[];
  createdAt: number;
  lastInteraction: number;

  // Tracking stats from App.jsx
  handshakeInitiated: number | null;
  pulsesSent: number;
  pulsesReceived: number;
  lightGifted: number;
  lightReceived: number;

  // Star memory seal
  sealed: boolean;
  sealedAt: number | null;
  sealWord?: string;

  // Runtime visual properties
  pulsePhase: number;
  light1?: ILight;
  light2?: ILight;

  // Bond Memory System
  memories: BondMemory[];
  lastMilestoneStrength: number; // Track milestones (0.25, 0.5, 0.75, 1.0)

  constructor(targetId: string, targetName: string, targetColor: string) {
    this.id = `bond_${targetId}_${Date.now()}`;
    this.targetId = targetId;
    this.targetName = targetName;
    this.targetColor = targetColor;
    this.name = targetName;
    this.color = targetColor;

    this.strength = 0;
    this.consent = 'pending';
    this.mode = 'silent';
    this.sharedMemory = [];
    this.createdAt = Date.now();
    this.lastInteraction = Date.now();

    this.handshakeInitiated = null;
    this.pulsesSent = 0;
    this.pulsesReceived = 0;
    this.lightGifted = 0;
    this.lightReceived = 0;

    this.sealed = false;
    this.sealedAt = null;

    this.pulsePhase = Math.random() * Math.PI * 2;

    // Initialize memory system
    this.memories = [];
    this.lastMilestoneStrength = 0;

    // Record first meeting
    this.recordMemory('first_meeting', `${targetName}`);
  }

  /**
   * Check if this bond can use voice chat (from App.jsx)
   */
  canVoice(): boolean {
    return this.consent === 'mutual' && this.strength > 0.5;
  }

  /**
   * Check if this bond can whisper (from App.jsx)
   */
  canWhisper(): boolean {
    return this.consent === 'mutual' && this.strength > 0.2;
  }

  /**
   * Pulse received from the target
   */
  recordPulseReceived(): void {
    this.pulsesReceived++;
    this.lastInteraction = Date.now();
  }

  /**
   * Check if bond can be sealed (Legacy threshold: 0.8)
   */
  canSeal(): boolean {
    return this.strength >= 0.8 && this.consent === 'mutual' && !this.sealed;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bond Memory System Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Record a new memory to this bond
   */
  recordMemory(
    type: BondMemoryType,
    customDescription?: string,
    location?: { x: number; y: number },
    data?: Record<string, unknown>
  ): BondMemory {
    const memory: BondMemory = {
      id: `memory_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      description: customDescription || MEMORY_DESCRIPTIONS[type],
      timestamp: Date.now(),
      location,
      data,
    };

    this.memories.push(memory);

    // Trim old memories if over limit (keep first meeting and sealed always)
    while (this.memories.length > MAX_MEMORIES) {
      const indexToRemove = this.memories.findIndex(
        (m, i) => i > 0 && m.type !== 'first_meeting' && m.type !== 'sealed'
      );
      if (indexToRemove > 0) {
        this.memories.splice(indexToRemove, 1);
      } else {
        break;
      }
    }

    return memory;
  }

  /**
   * Get all memories of a specific type
   */
  getMemoriesByType(type: BondMemoryType): BondMemory[] {
    return this.memories.filter(m => m.type === type);
  }

  /**
   * Get recent memories (last N)
   */
  getRecentMemories(count: number = 10): BondMemory[] {
    return this.memories.slice(-count);
  }

  /**
   * Get memories from a specific time range
   */
  getMemoriesInRange(startTime: number, endTime: number): BondMemory[] {
    return this.memories.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * Get total memory count
   */
  getMemoryCount(): number {
    return this.memories.length;
  }

  /**
   * Check and record strength milestone memories
   */
  checkMilestones(): void {
    const milestones = [0.25, 0.5, 0.75, 1.0];
    for (const milestone of milestones) {
      if (this.strength >= milestone && this.lastMilestoneStrength < milestone) {
        this.recordMemory('milestone', `Bond strength reached ${Math.round(milestone * 100)}%`);
        this.lastMilestoneStrength = milestone;
      }
    }
  }

  /**
   * Record a pulse exchange memory
   */
  recordPulseExchange(sent: boolean): void {
    if (sent) {
      this.pulsesSent++;
    } else {
      this.pulsesReceived++;
    }

    // Only record milestone pulse counts (every 10)
    const total = this.pulsesSent + this.pulsesReceived;
    if (total > 0 && total % 10 === 0) {
      this.recordMemory('pulse_exchange', `${total} pulses shared`);
    }
  }

  /**
   * Record a light gift
   */
  recordLightGift(amount: number): void {
    this.lightGifted += amount;
    this.lastInteraction = Date.now();

    // Legacy: Gifting light boosts bond strength
    // 0.05 strength boost per gift unit (to match legacy feeling)
    this.strength = Math.min(1, this.strength + amount * 0.05);
    this.recordMemory('light_gift', `Gifted ${amount} light`);
  }

  /**
   * Get bond summary with key memories
   */
  getBondSummary(): {
    totalTime: number;
    memoriesCount: number;
    significantMoments: string[];
    stats: {
      pulsesSent: number;
      pulsesReceived: number;
      lightGifted: number;
      lightReceived: number;
    };
  } {
    const significantTypes: BondMemoryType[] = [
      'first_meeting', 'survived_darkness', 'found_treasure',
      'constellation', 'beacon_lit', 'sealed'
    ];

    return {
      totalTime: (Date.now() - this.createdAt) / 1000,
      memoriesCount: this.memories.length,
      significantMoments: this.memories
        .filter(m => significantTypes.includes(m.type))
        .map(m => m.description),
      stats: {
        pulsesSent: this.pulsesSent,
        pulsesReceived: this.pulsesReceived,
        lightGifted: this.lightGifted,
        lightReceived: this.lightReceived,
      },
    };
  }

  /**
   * Add a shared memory to this bond (from App.jsx)
   */
  addMemory(memory: string): void {
    if (this.sharedMemory.length < 10) {
      this.sharedMemory.push({ text: memory, time: Date.now() });
    }
  }

  /**
   * Seal this bond into a Star Memory (from App.jsx)
   */
  seal(myWord: string, theirWord: string): StarMemory {
    this.sealed = true;
    this.sealedAt = Date.now();
    this.sharedMemory.push({ text: `Sealed: ${myWord} + ${theirWord}`, time: Date.now() });

    return {
      targetId: this.targetId,
      targetName: this.targetName,
      targetColor: this.targetColor,
      myWord,
      theirWord,
      sealedAt: this.sealedAt,
    };
  }

  /**
   * Update bond strength based on distance
   */
  update(deltaTime: number): void {
    if (!this.light1 || !this.light2) return;

    const dx = this.light2.x - this.light1.x;
    const dy = this.light1.y - this.light2.y; // Changed from light2.y - light1.y
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Bonds strengthen when lights are close, weaken when far
    // Legacy constants: MAX_CONNECTION_DIST = 300, OPTIMAL_DISTANCE = 120
    const maxDistance = 300;



    // ... (existing code)

    if (distance <= maxDistance) {
      // Within connection range - strengthen
      // Use multiplier 60 to convert per-frame rate to per-second (since deltaTime is in seconds)
      this.strength = Math.min(1, this.strength + deltaTime * (BOND_GROW_RATE * 60));
      this.lastInteraction = Date.now();
    } else if (!this.sealed) { // Legacy: Sealed bonds do not decay
      // Out of range - decay
      this.strength = Math.max(0, this.strength - deltaTime * (BOND_DECAY_RATE * 60));
    }

    // Update pulse phase
    this.pulsePhase += deltaTime * 2;
  }

  /**
   * Check if bond should be removed
   */
  shouldRemove(): boolean {
    // Release bond when strength reaches 0, unless it's sealed
    // Declined bonds are also removed
    return (this.strength <= 0 && !this.sealed) || this.consent === 'declined';
  }

  /**
   * Get the current pulse value (for visual effects)
   */
  getPulseValue(): number {
    return 0.5 + 0.5 * Math.sin(this.pulsePhase);
  }

  /**
   * Get midpoint of the bond
   */
  getMidpoint(): { x: number; y: number } {
    if (!this.light1 || !this.light2) return { x: 0, y: 0 };
    return {
      x: (this.light1.x + this.light2.x) / 2,
      y: (this.light1.y + this.light2.y) / 2,
    };
  }

  /**
   * Get distance between the two lights
   */
  getDistance(): number {
    if (!this.light1 || !this.light2) return 0;
    const dx = this.light2.x - this.light1.x;
    const dy = this.light2.y - this.light1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get angle of bond line
   */
  getAngle(): number {
    if (!this.light1 || !this.light2) return 0;
    return Math.atan2(
      this.light2.y - this.light1.y,
      this.light2.x - this.light1.x
    );
  }

  /**
   * Get age in seconds
   */
  getAge(): number {
    return (Date.now() - this.createdAt) / 1000;
  }

  /**
   * Check if this bond involves a specific light
   */
  involvesLight(light: ILight): boolean {
    if (!this.light1 || !this.light2) return false;
    return this.light1.id === light.id || this.light2.id === light.id;
  }

  /**
   * Get the other light in the bond
   */
  getOtherLight(light: ILight): ILight | null {
    if (!this.light1 || !this.light2) return null;
    if (this.light1.id === light.id) return this.light2;
    if (this.light2.id === light.id) return this.light1;
    return null;
  }
  /**
   * Get bond level description (from legacy_2)
   */
  getLevel(): string {
    if (this.strength < 0.2) return 'Stranger';
    if (this.strength < 0.4) return 'Acquaintance';
    if (this.strength < 0.6) return 'Friend';
    if (this.strength < 0.8) return 'Close Friend';
    return 'Kindred Spirit';
  }

  /**
   * Get bond age in human readable format (from legacy_2)
   */
  getAgeReadable(): string {
    const ms = Date.now() - this.createdAt;
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  }

  /**
   * Gift light to this bond partner (from legacy_2)
   * Increases bond strength based on amount
   */
  giftLight(amount: number): void {
    this.lightGifted += amount;
    this.grow(0.05 * amount);
    this.recordMemory('light_gift', `Gifted ${amount} light`);
  }

  /**
   * Decay bond strength over time (from legacy_2)
   * Respects sealed status - sealed bonds don't decay
   */
  decay(amount: number): void {
    if (!this.sealed) {
      this.strength = Math.max(0, this.strength - amount);
    }
  }

  /**
   * Grow bond strength (from legacy_2)
   */
  grow(amount: number): void {
    const previousStrength = this.strength;
    this.strength = Math.min(1, this.strength + amount);
    this.lastInteraction = Date.now();

    // Check for milestone
    this.checkStrengthMilestone(previousStrength);
  }

  /**
   * Check and record strength milestones
   */
  private checkStrengthMilestone(previousStrength: number): void {
    const milestones = [0.25, 0.5, 0.75, 1.0];
    for (const milestone of milestones) {
      if (previousStrength < milestone && this.strength >= milestone) {
        this.recordMemory('milestone', `Reached ${Math.round(milestone * 100)}% bond strength`);
        this.lastMilestoneStrength = milestone;
        break;
      }
    }
  }

  /**
   * Export bond data for saving (from legacy_2)
   */
  toJSON(): object {
    return {
      id: this.id,
      targetId: this.targetId,
      targetName: this.targetName,
      targetColor: this.targetColor,
      strength: this.strength,
      consent: this.consent,
      mode: this.mode,
      lastInteraction: this.lastInteraction,
      createdAt: this.createdAt,
      lightGifted: this.lightGifted,
      lightReceived: this.lightReceived,
      sealed: this.sealed,
      sealedAt: this.sealedAt,
      sealWord: this.sealWord,
      sharedMemory: this.sharedMemory,
      memories: this.memories,
      pulsesSent: this.pulsesSent,
      pulsesReceived: this.pulsesReceived,
    };
  }

  /**
   * Create Bond from saved data (from legacy_2)
   */
  static fromJSON(data: Record<string, unknown>): Bond {
    const bond = new Bond(
      data.targetId as string,
      data.targetName as string,
      data.targetColor as string
    );

    bond.id = (data.id as string) || bond.id;
    bond.strength = (data.strength as number) || 0;
    bond.consent = (data.consent as BondConsent) || 'pending';
    bond.mode = (data.mode as 'silent' | 'whisper' | 'voice') || 'silent';
    bond.lastInteraction = (data.lastInteraction as number) || Date.now();
    bond.createdAt = (data.createdAt as number) || Date.now();
    bond.lightGifted = (data.lightGifted as number) || 0;
    bond.lightReceived = (data.lightReceived as number) || 0;
    bond.sealed = (data.sealed as boolean) || false;
    bond.sealedAt = (data.sealedAt as number | null) || null;
    bond.sealWord = data.sealWord as string | undefined;
    bond.sharedMemory = (data.sharedMemory as SharedMemory[]) || [];
    bond.memories = (data.memories as BondMemory[]) || [];
    bond.pulsesSent = (data.pulsesSent as number) || 0;
    bond.pulsesReceived = (data.pulsesReceived as number) || 0;

    return bond;
  }
}

export default Bond;
