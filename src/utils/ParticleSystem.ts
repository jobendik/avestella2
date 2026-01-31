// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Particle System Utility (Ported from legacy_2)
// ═══════════════════════════════════════════════════════════════════════════

import { randomRange } from './math';
import type { IParticle, ParticleType } from '@/types';

export class Particle implements IParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    life: number;
    maxLife: number;
    decay: number;
    type: ParticleType;
    rotation: number;
    rotationSpeed: number;
    createdAt: number;
    shape?: string;

    constructor(
        x: number,
        y: number,
        color: string = '#FFFFFF',
        type: ParticleType = 'spark',
        options: Partial<IParticle> = {}
    ) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.createdAt = Date.now();

        // Default physics based on type
        this.vx = options.vx ?? (Math.random() - 0.5) * 4;
        this.vy = options.vy ?? (Math.random() - 0.5) * 4;
        this.size = options.size ?? randomRange(2, 5);
        this.maxLife = options.maxLife ?? randomRange(0.5, 1.5);
        this.life = this.maxLife;
        this.decay = options.decay ?? 1 / (this.maxLife * 60); // Decay per frame roughly
        this.alpha = options.alpha ?? 1;
        this.rotation = options.rotation ?? Math.random() * Math.PI * 2;
        this.rotationSpeed = options.rotationSpeed ?? (Math.random() - 0.5) * 0.1;
        this.shape = options.shape;

        // Type-specific adjustments
        this.applyTypeDefaults();
    }

    private applyTypeDefaults(): void {
        switch (this.type) {
            case 'trail':
                this.decay = 0.05;
                this.vx *= 0.2;
                this.vy *= 0.2;
                break;
            case 'dust':
                this.vx *= 0.1;
                this.vy *= 0.1;
                this.decay = 0.01;
                this.alpha = 0.3;
                break;
            case 'snow':
                this.vx = (Math.random() - 0.5) * 1;
                this.vy = randomRange(1, 2);
                this.decay = 0.005;
                this.shape = 'circle';
                break;
            case 'rain':
                this.vx = 0.5;
                this.vy = randomRange(10, 15);
                this.decay = 0.02;
                this.shape = 'line';
                break;
            case 'golden':
                this.shape = 'star';
                this.size *= 1.5;
                break;
            case 'fragment':
                this.shape = 'circle';
                this.vx *= 0.5;
                this.vy *= 0.5;
                break;
            default:
                this.shape = 'circle';
        }
    }

    update(deltaTime: number): void {
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;

        // Apply some gravity/wind based on type
        if (this.type === 'snow') {
            this.vx += Math.sin(Date.now() * 0.001 + this.x) * 0.01;
        }

        this.life -= this.decay * (deltaTime * 60);
        this.alpha = Math.max(0, this.life / this.maxLife);
        this.rotation += this.rotationSpeed;
    }

    isDead(): boolean {
        return this.life <= 0 || this.alpha <= 0;
    }

    /**
     * Draw the particle to context
     */
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;

        switch (this.shape) {
            case 'star':
                this.drawStar(ctx, 0, 0, 5, this.size, this.size / 2);
                break;
            case 'heart':
                this.drawHeart(ctx, 0, 0, this.size);
                break;
            case 'line':
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, this.size * 2);
                ctx.stroke();
                break;
            case 'circle':
            default:
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
        }

        ctx.restore();
    }

    private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spans: number, outer: number, inner: number): void {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spans;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outer);
        for (let i = 0; i < spans; i++) {
            x = cx + Math.cos(rot) * outer;
            y = cy + Math.sin(rot) * outer;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * inner;
            y = cy + Math.sin(rot) * inner;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outer);
        ctx.closePath();
        ctx.fill();
    }

    private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        ctx.beginPath();
        ctx.moveTo(x, y + size / 4);
        ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
        ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
        ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
        ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
        ctx.fill();
    }

    /**
     * Static helper to create a burst of particles
     */
    static createBurst(
        x: number,
        y: number,
        color: string,
        count: number = 10,
        type: ParticleType = 'spark',
        options: Partial<IParticle> = {}
    ): Particle[] {
        return Array.from({ length: count }, () => new Particle(x, y, color, type, options));
    }
}
