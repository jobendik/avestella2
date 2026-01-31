// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Particle Class
// ═══════════════════════════════════════════════════════════════════════════

import type { IParticle, ParticleType } from '@/types';
import { randomRange } from '@/utils/math';

export class Particle implements IParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: ParticleType;
  rotation: number;
  rotationSpeed: number;
  shape?: string;
  
  // Legacy_2 physics properties
  gravity: number;
  friction: number;
  fadeRate: number;

  constructor(
    x: number,
    y: number,
    options: Partial<{
      vx: number;
      vy: number;
      life: number;
      size: number;
      color: string;
      type: IParticle['type'];
      shape: string;
      gravity: number;
      friction: number;
      fadeRate: number;
    }> = {}
  ) {
    this.x = x;
    this.y = y;
    this.vx = options.vx ?? randomRange(-2, 2);
    this.vy = options.vy ?? randomRange(-2, 2);
    this.maxLife = options.life ?? randomRange(0.5, 1.5);
    this.life = this.maxLife;
    this.size = options.size ?? randomRange(2, 6);
    this.color = options.color ?? '#ffffff';
    this.alpha = 1;
    this.type = options.type ?? 'sparkle';
    this.shape = options.shape;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = randomRange(-5, 5);
    
    // Legacy_2 physics
    this.gravity = options.gravity ?? 0;
    this.friction = options.friction ?? 0.98;
    this.fadeRate = options.fadeRate ?? 0.02;
  }

  /**
   * Update particle state
   */
  update(deltaTime: number): void {
    // Apply legacy_2 physics
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;

    // Apply velocity
    this.x += this.vx * deltaTime * 60;
    this.y += this.vy * deltaTime * 60;

    // Apply gravity for certain types (backwards compat)
    if (this.type === 'fragment' && this.gravity === 0) {
      this.vy += 0.1 * deltaTime * 60;
    }

    // Update life
    this.life -= deltaTime;

    // Calculate alpha based on remaining life
    this.alpha = Math.max(0, this.life / this.maxLife);

    // Update rotation
    this.rotation += this.rotationSpeed * deltaTime;

    // Shrink for certain types
    if (this.type === 'burst') {
      this.size *= 0.98;
    }
  }

  /**
   * Check if particle should be removed
   */
  isDead(): boolean {
    return this.life <= 0 || this.alpha <= 0;
  }

  /**
   * Get rendering properties
   */
  getRenderProps(): {
    x: number;
    y: number;
    size: number;
    alpha: number;
    rotation: number;
    color: string;
  } {
    return {
      x: this.x,
      y: this.y,
      size: this.size,
      alpha: this.alpha,
      rotation: this.rotation,
      color: this.color,
    };
  }

  /**
   * Draw particle to canvas (from legacy_2)
   */
  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(screenX, screenY);
    ctx.rotate(this.rotation);

    switch (this.type) {
      case 'spark':
      case 'sparkle':
        this.drawSpark(ctx);
        break;
      case 'golden':
        this.drawGolden(ctx);
        break;
      case 'trail':
        this.drawTrail(ctx);
        break;
      case 'wave':
        this.drawWave(ctx);
        break;
      case 'pulse':
        this.drawPulse(ctx);
        break;
      case 'darkness':
        this.drawDarkness(ctx);
        break;
      case 'snow':
      case 'snowflake':
        this.drawSnow(ctx);
        break;
      case 'rain':
        this.drawRain(ctx);
        break;
      case 'dust':
        this.drawDust(ctx);
        break;
      case 'petal':
      case 'leaf':
        this.drawPetal(ctx);
        break;
      default:
        this.drawSpark(ctx);
    }

    ctx.restore();
  }

  private drawSpark(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGolden(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;

    // Star shape (from legacy_2)
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const outerR = this.size;
      const innerR = this.size * 0.4;

      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      } else {
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      }

      const innerAngle = angle + Math.PI / 5;
      ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWave(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * (1 - this.alpha + 0.5), 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawPulse(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3 * this.alpha;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 2 * (1 - this.alpha + 0.2), 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawDarkness(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSnow(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRain(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(0, this.size);
    ctx.stroke();
  }

  private drawDust(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPetal(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    // Simple ellipse for petal/leaf
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.5, this.rotation, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw heart/gift shape (from legacy_2)
   */
  drawGift(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    const s = this.size;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.5, -s, s * 0.5, 0, s);
    ctx.bezierCurveTo(s, s * 0.5, s, -s * 0.5, 0, s * 0.3);
    ctx.fill();
  }

  /**
   * Create a burst of particles at a location
   */
  static createBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    options: Partial<{
      speed: number;
      size: number;
      life: number;
    }> = {}
  ): Particle[] {
    const particles: Particle[] = [];
    const { speed = 5, size = 4, life = 0.8 } = options;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const velocity = speed * (0.5 + Math.random() * 0.5);

      particles.push(
        new Particle(x, y, {
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          size: size * (0.5 + Math.random() * 0.5),
          life: life * (0.5 + Math.random() * 0.5),
          color,
          type: 'burst',
        })
      );
    }

    return particles;
  }

  /**
   * Create trail particles
   */
  static createTrail(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    color: string
  ): Particle {
    return new Particle(x, y, {
      vx: -velocityX * 0.1 + randomRange(-0.5, 0.5),
      vy: -velocityY * 0.1 + randomRange(-0.5, 0.5),
      size: randomRange(2, 4),
      life: randomRange(0.2, 0.5),
      color,
      type: 'trail',
    });
  }

  /**
   * Create ambient floating particles
   */
  static createAmbient(
    x: number,
    y: number,
    color: string
  ): Particle {
    return new Particle(x, y, {
      vx: randomRange(-0.3, 0.3),
      vy: randomRange(-0.5, -0.1),
      size: randomRange(1, 3),
      life: randomRange(2, 5),
      color,
      type: 'ambient',
    });
  }

  /**
   * Create fragment collection particles
   */
  static createFragmentPickup(
    x: number,
    y: number,
    color: string
  ): Particle[] {
    const particles: Particle[] = [];

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      particles.push(
        new Particle(x, y, {
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          size: 3,
          life: 0.5,
          color,
          type: 'fragment',
        })
      );
    }

    return particles;
  }
}

export default Particle;
