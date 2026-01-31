// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Visual Effects Classes (Ripple, Shockwave, LightTrail)
// ═══════════════════════════════════════════════════════════════════════════

import type { IRipple, IShockwave, ILightTrail } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Ripple Effect
// ─────────────────────────────────────────────────────────────────────────────

export class Ripple implements IRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;

  constructor(
    x: number,
    y: number,
    options: Partial<{
      maxRadius: number;
      color: string;
      speed: number;
    }> = {}
  ) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = options.maxRadius ?? 100;
    this.alpha = 1;
    this.color = options.color ?? '#ffffff';
    this.speed = options.speed ?? 150;
  }

  update(deltaTime: number): void {
    this.radius += this.speed * deltaTime;
    this.alpha = 1 - (this.radius / this.maxRadius);
  }

  isDone(): boolean {
    return this.radius >= this.maxRadius || this.alpha <= 0;
  }

  getProgress(): number {
    return this.radius / this.maxRadius;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shockwave Effect
// ─────────────────────────────────────────────────────────────────────────────

export class Shockwave implements IShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  thickness: number;
  alpha: number;
  color: string;
  speed: number;

  constructor(
    x: number,
    y: number,
    options: Partial<{
      maxRadius: number;
      thickness: number;
      color: string;
      speed: number;
    }> = {}
  ) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = options.maxRadius ?? 200;
    this.thickness = options.thickness ?? 10;
    this.alpha = 1;
    this.color = options.color ?? '#ffffff';
    this.speed = options.speed ?? 300;
  }

  update(deltaTime: number): void {
    this.radius += this.speed * deltaTime;
    this.alpha = 1 - (this.radius / this.maxRadius);
    // Thickness shrinks as it expands
    this.thickness = Math.max(1, 10 * (1 - this.radius / this.maxRadius));
  }

  isDone(): boolean {
    return this.radius >= this.maxRadius || this.alpha <= 0;
  }

  getProgress(): number {
    return this.radius / this.maxRadius;
  }

  /**
   * Check if a point is within the shockwave ring
   */
  containsPoint(x: number, y: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.abs(dist - this.radius) <= this.thickness;
  }

  /**
   * Draw shockwave with inner glow gradient effect
   */
  draw(ctx: CanvasRenderingContext2D, cameraX: number = 0, cameraY: number = 0): void {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();
    ctx.globalAlpha = this.alpha * 0.5;

    // Outer ring
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.thickness * this.alpha;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow gradient
    const innerRadius = Math.max(0, this.radius - this.thickness);
    const gradient = ctx.createRadialGradient(
      screenX, screenY, innerRadius,
      screenX, screenY, this.radius
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Light Trail
// ─────────────────────────────────────────────────────────────────────────────

import type { TrailStyleType } from '@/types';

export interface TrailPoint {
  x: number;
  y: number;
  age: number;
  alpha: number;
  time: number;
}

export class LightTrail implements ILightTrail {
  points: TrailPoint[];
  color: string;
  style: TrailStyleType;
  maxLength: number;
  maxAge: number;
  width: number;
  fadeTime: number;

  constructor(
    color: string,
    options: Partial<{
      maxLength: number;
      maxAge: number;
      width: number;
      style: TrailStyleType;
      fadeTime: number;
    }> = {}
  ) {
    this.points = [];
    this.color = color;
    this.style = options.style ?? 'solid';
    this.maxLength = options.maxLength ?? 50;
    this.maxAge = options.maxAge ?? 0.5;
    this.width = options.width ?? 3;
    this.fadeTime = options.fadeTime ?? 3000;
  }

  /**
   * Add a new point to the trail
   */
  addPoint(x: number, y: number): void {
    this.points.unshift({
      x,
      y,
      age: 0,
      alpha: 1,
      time: Date.now(),
    });

    // Limit trail length
    if (this.points.length > this.maxLength) {
      this.points.pop();
    }
  }

  /**
   * Update trail points (age and fade)
   */
  update(deltaTime: number): void {
    const now = Date.now();
    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i];
      point.age += deltaTime;
      // Use fadeTime for timestamp-based alpha, or maxAge for deltaTime-based
      const age = now - point.time;
      point.alpha = Math.max(0, 1 - (age / this.fadeTime));

      if (point.alpha <= 0) {
        this.points.splice(i, 1);
      }
    }
  }

  /**
   * Draw the trail with style-specific decorations
   */
  draw(ctx: CanvasRenderingContext2D, cameraX: number = 0, cameraY: number = 0): void {
    if (this.points.length < 2) return;

    ctx.save();

    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      const prev = this.points[i - 1];

      const screenX = point.x - cameraX;
      const screenY = point.y - cameraY;
      const prevScreenX = prev.x - cameraX;
      const prevScreenY = prev.y - cameraY;

      ctx.globalAlpha = point.alpha * 0.6;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.width + point.alpha * 3;
      ctx.lineCap = 'round';

      // Set line dash based on style
      if (this.style === 'dashed') {
        ctx.setLineDash([8, 4]);
      } else if (this.style === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(prevScreenX, prevScreenY);
      ctx.lineTo(screenX, screenY);
      ctx.stroke();

      // Style-specific decorations
      this.drawStyleDecoration(ctx, screenX, screenY, point.alpha);
    }

    ctx.restore();
  }

  /**
   * Draw style-specific decorations at trail points
   */
  private drawStyleDecoration(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number): void {
    switch (this.style) {
      case 'spark':
      case 'sparkles':
        if (Math.random() < 0.3) {
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'rainbow':
        // Draw a small rainbow hue circle
        const hue = (Date.now() / 10 + x) % 360;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'gradient':
        // Draw glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8 * alpha;
        break;

      default:
        // solid, dashed, dotted - no extra decoration
        break;
    }
  }

  /**
   * Clear all trail points
   */
  clear(): void {
    this.points = [];
  }

  /**
   * Get trail length
   */
  getLength(): number {
    return this.points.length;
  }

  /**
   * Check if trail is empty
   */
  isEmpty(): boolean {
    return this.points.length === 0;
  }

  /**
   * Get points for rendering
   */
  getPoints(): TrailPoint[] {
    return this.points;
  }

  /**
   * Set trail style
   */
  setStyle(style: TrailStyleType): void {
    this.style = style;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Light Bridge (for connecting beacons) - Enhanced with legacy_2 features
// ─────────────────────────────────────────────────────────────────────────────

import { hexToRgb } from '@/utils/colors';

export class LightBridge {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  active: boolean;
  color: string;
  pulsePhase: number;
  width: number;

  constructor(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color = '#ffffff'
  ) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.progress = 0;
    this.active = true;
    this.color = color;
    this.pulsePhase = 0;
    this.width = 4;
  }

  update(deltaTime: number): void {
    if (this.progress < 1) {
      this.progress = Math.min(1, this.progress + deltaTime * 0.5);
    }
    this.pulsePhase += deltaTime * 3;
  }

  getPulseValue(): number {
    return 0.7 + 0.3 * Math.sin(this.pulsePhase);
  }

  getLength(): number {
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getCurrentEnd(): { x: number; y: number } {
    return {
      x: this.startX + (this.endX - this.startX) * this.progress,
      y: this.startY + (this.endY - this.startY) * this.progress,
    };
  }

  isComplete(): boolean {
    return this.progress >= 1;
  }

  /**
   * Set bridge endpoints (legacy_2 compatibility)
   */
  setPositions(x1: number, y1: number, x2: number, y2: number): void {
    this.startX = x1;
    this.startY = y1;
    this.endX = x2;
    this.endY = y2;
  }

  /**
   * Check if a point is near the bridge line (legacy_2 feature)
   */
  isNearPoint(x: number, y: number, threshold = 20): boolean {
    // Point-to-line-segment distance calculation
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      // Bridge is a point
      const pdx = x - this.startX;
      const pdy = y - this.startY;
      return Math.sqrt(pdx * pdx + pdy * pdy) <= threshold;
    }

    // Project point onto line segment
    const t = Math.max(
      0,
      Math.min(1, ((x - this.startX) * dx + (y - this.startY) * dy) / lengthSq)
    );
    const projX = this.startX + t * dx;
    const projY = this.startY + t * dy;

    const distX = x - projX;
    const distY = y - projY;
    return Math.sqrt(distX * distX + distY * distY) <= threshold;
  }

  /**
   * Draw the light bridge with gradient and glow (legacy_2 feature)
   */
  draw(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number
  ): void {
    if (!this.active) return;

    const screenX1 = this.startX - cameraX;
    const screenY1 = this.startY - cameraY;
    const currentEnd = this.getCurrentEnd();
    const screenX2 = currentEnd.x - cameraX;
    const screenY2 = currentEnd.y - cameraY;

    const pulse = this.getPulseValue();
    const rgb = hexToRgb(this.color);
    const r = rgb?.r ?? 255;
    const g = rgb?.g ?? 255;
    const b = rgb?.b ?? 255;

    // Outer glow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(screenX1, screenY1);
    ctx.lineTo(screenX2, screenY2);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.2 * pulse})`;
    ctx.lineWidth = this.width * 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Main gradient line
    const gradient = ctx.createLinearGradient(
      screenX1,
      screenY1,
      screenX2,
      screenY2
    );
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.9 * pulse})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${pulse})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${0.9 * pulse})`);

    ctx.beginPath();
    ctx.moveTo(screenX1, screenY1);
    ctx.lineTo(screenX2, screenY2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = this.width;
    ctx.stroke();

    // Inner bright core
    ctx.beginPath();
    ctx.moveTo(screenX1, screenY1);
    ctx.lineTo(screenX2, screenY2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * pulse})`;
    ctx.lineWidth = this.width * 0.5;
    ctx.stroke();

    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Light Signal (for communication between lights) - Enhanced with legacy_2
// ─────────────────────────────────────────────────────────────────────────────

export class LightSignal {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  color: string;
  size: number;
  speed: number;
  arrived: boolean;
  icon: string;

  // Legacy_2 beacon signal properties
  radius: number;
  maxRadius: number;
  alpha: number;
  dashOffset: number;

  constructor(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    options: Partial<{
      color: string;
      size: number;
      speed: number;
      icon: string;
      maxRadius: number;
    }> = {}
  ) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.progress = 0;
    this.color = options.color ?? '#ffffff';
    this.size = options.size ?? 8;
    this.speed = options.speed ?? 200;
    this.arrived = false;
    this.icon = options.icon ?? '💫';

    // Legacy_2 expanding circle signal
    this.radius = 0;
    this.maxRadius = options.maxRadius ?? 80;
    this.alpha = 1;
    this.dashOffset = 0;
  }

  update(deltaTime: number): void {
    // Update expanding circle (legacy_2 beacon rhythm)
    this.radius += this.speed * deltaTime;
    this.alpha = 1 - this.radius / this.maxRadius;
    this.dashOffset += deltaTime * 50;

    // Update traveling signal
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 10) {
      this.arrived = true;
      this.x = this.targetX;
      this.y = this.targetY;
    } else {
      const moveDistance = this.speed * deltaTime;
      this.x += (dx / distance) * moveDistance;
      this.y += (dy / distance) * moveDistance;
      this.progress = 1 - distance / this.getInitialDistance();
    }
  }

  private initialDistance: number | null = null;

  getInitialDistance(): number {
    if (this.initialDistance === null) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      this.initialDistance = Math.sqrt(dx * dx + dy * dy);
    }
    return this.initialDistance;
  }

  isDone(): boolean {
    return this.arrived || this.radius >= this.maxRadius;
  }

  /**
   * Draw the light signal as a dashed expanding circle (legacy_2 beacon)
   */
  draw(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number
  ): void {
    if (this.alpha <= 0) return;

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    const rgb = hexToRgb(this.color);
    const r = rgb?.r ?? 255;
    const g = rgb?.g ?? 255;
    const b = rgb?.b ?? 255;

    ctx.save();
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = this.dashOffset;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Create a burst of signals (legacy_2 feature)
   */
  static createBurst(
    x: number,
    y: number,
    color: string,
    count = 3,
    maxRadius = 80
  ): LightSignal[] {
    const signals: LightSignal[] = [];
    for (let i = 0; i < count; i++) {
      const signal = new LightSignal(x, y, x, y, {
        color,
        speed: 60 + i * 20,
        maxRadius: maxRadius + i * 30,
      });
      signals.push(signal);
    }
    return signals;
  }
}
