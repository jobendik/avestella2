// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Companion Class
// ═══════════════════════════════════════════════════════════════════════════

import type { ICompanion, CompanionRarity } from '@/types';
import { randomRange, lerp, distance } from '@/utils/math';

export class Companion implements ICompanion {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  offsetAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  bobPhase: number;
  scale: number;
  emoji: string;
  rarity: CompanionRarity;
  unlocked: boolean;
  equipped: boolean;
  description: string;

  constructor(
    type: string,
    name: string,
    emoji: string,
    rarity: CompanionRarity,
    description: string
  ) {
    this.id = `companion_${type}`;
    this.type = type;
    this.name = name;
    this.emoji = emoji;
    this.rarity = rarity;
    this.description = description;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.offsetAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = 40 + Math.random() * 20;
    this.orbitSpeed = 1 + Math.random() * 0.5;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.scale = 1;
    this.unlocked = false;
    this.equipped = false;
  }

  /**
   * Update companion position to follow owner
   */
  update(deltaTime: number, ownerX: number, ownerY: number): void {
    // Update orbit angle
    this.offsetAngle += this.orbitSpeed * deltaTime;

    // Calculate target position (orbiting around owner)
    this.targetX = ownerX + Math.cos(this.offsetAngle) * this.orbitRadius;
    this.targetY = ownerY + Math.sin(this.offsetAngle) * this.orbitRadius;

    // Smoothly follow target
    this.x = lerp(this.x, this.targetX, 0.1);
    this.y = lerp(this.y, this.targetY, 0.1);

    // Bob up and down
    this.bobPhase += deltaTime * 3;
    this.y += Math.sin(this.bobPhase) * 3;
  }

  /**
   * Teleport companion to owner
   */
  teleportTo(x: number, y: number): void {
    this.x = x + Math.cos(this.offsetAngle) * this.orbitRadius;
    this.y = y + Math.sin(this.offsetAngle) * this.orbitRadius;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  /**
   * Get bob offset for rendering
   */
  getBobOffset(): number {
    return Math.sin(this.bobPhase) * 3;
  }

  /**
   * Get scale with pulse effect
   */
  getPulseScale(): number {
    return this.scale * (0.95 + 0.05 * Math.sin(this.bobPhase * 0.5));
  }

  /**
   * Get glow color based on rarity
   */
  getGlowColor(): string {
    switch (this.rarity) {
      case 'legendary':
        return '#ffd700';  // Gold
      case 'epic':
        return '#a855f7';  // Purple
      case 'rare':
        return '#3b82f6';  // Blue
      case 'uncommon':
        return '#22c55e';  // Green
      default:
        return '#9ca3af';  // Gray
    }
  }

  /**
   * Get glow intensity based on rarity
   */
  getGlowIntensity(): number {
    switch (this.rarity) {
      case 'legendary':
        return 25;
      case 'epic':
        return 20;
      case 'rare':
        return 15;
      case 'uncommon':
        return 10;
      default:
        return 5;
    }
  }

  /**
   * Draw companion with glow effect
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.equipped) return;

    const scale = this.getPulseScale();
    const glowColor = this.getGlowColor();
    const glowIntensity = this.getGlowIntensity();

    ctx.save();

    // Apply glow effect
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowIntensity + Math.sin(this.bobPhase) * 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw emoji with glow
    ctx.font = `${24 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, this.x, this.y);

    // Draw outer glow ring for legendary/epic
    if (this.rarity === 'legendary' || this.rarity === 'epic') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 18 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.bobPhase * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Set equipped state
   */
  equip(): void {
    this.equipped = true;
  }

  /**
   * Unequip companion
   */
  unequip(): void {
    this.equipped = false;
  }

  /**
   * Unlock companion
   */
  unlock(): void {
    this.unlocked = true;
  }

  /**
   * Get distance from owner
   */
  getDistanceFromOwner(ownerX: number, ownerY: number): number {
    return distance(this.x, this.y, ownerX, ownerY);
  }

  /**
   * Clone companion data for serialization
   */
  toJSON(): {
    id: string;
    type: string;
    name: string;
    emoji: string;
    rarity: CompanionRarity;
    description: string;
    unlocked: boolean;
    equipped: boolean;
  } {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      emoji: this.emoji,
      rarity: this.rarity,
      description: this.description,
      unlocked: this.unlocked,
      equipped: this.equipped,
    };
  }

  /**
   * Create companion from companion type definition
   */
  static fromDefinition(definition: {
    id: string;
    name: string;
    emoji: string;
    rarity: CompanionRarity;
    description: string;
  }): Companion {
    return new Companion(
      definition.id,
      definition.name,
      definition.emoji,
      definition.rarity,
      definition.description
    );
  }
}

export default Companion;
