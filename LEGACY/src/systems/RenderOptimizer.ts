// Render optimization utilities
// Implements: gradient caching, object pooling, spatial partitioning

import type { Particle } from '../types';
import { ObjectPool } from '../types/utilities';

// ============================================
// Gradient Cache
// ============================================

// GradientKey interface used internally by GradientCache
// @ts-ignore Reserved for future gradient caching improvements
interface GradientKey {
    type: 'radial' | 'linear';
    colors: string[];
    stops: number[];
    params: string; // Stringified position params
}

/**
 * Gradient cache to avoid recreating identical gradients
 */
export class GradientCache {
    private cache = new Map<string, CanvasGradient>();
    private ctx: CanvasRenderingContext2D;
    private maxSize: number;
    private hits = 0;
    private misses = 0;

    constructor(ctx: CanvasRenderingContext2D, maxSize = 100) {
        this.ctx = ctx;
        this.maxSize = maxSize;
    }

    /**
     * Get or create a radial gradient
     */
    getRadialGradient(
        x0: number,
        y0: number,
        r0: number,
        x1: number,
        y1: number,
        r1: number,
        colorStops: Array<[number, string]>
    ): CanvasGradient {
        // Round positions for better cache hits (reduce precision)
        const key = `r:${Math.round(x0)},${Math.round(y0)},${Math.round(r0)},${Math.round(x1)},${Math.round(y1)},${Math.round(r1)}:${colorStops.map(s => `${s[0]}:${s[1]}`).join(',')}`;

        let gradient = this.cache.get(key);
        if (gradient) {
            this.hits++;
            return gradient;
        }

        this.misses++;
        gradient = this.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
        for (const [stop, color] of colorStops) {
            gradient.addColorStop(stop, color);
        }

        // Evict oldest if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }

        this.cache.set(key, gradient);
        return gradient;
    }

    /**
     * Get or create a linear gradient
     */
    getLinearGradient(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        colorStops: Array<[number, string]>
    ): CanvasGradient {
        const key = `l:${Math.round(x0)},${Math.round(y0)},${Math.round(x1)},${Math.round(y1)}:${colorStops.map(s => `${s[0]}:${s[1]}`).join(',')}`;

        let gradient = this.cache.get(key);
        if (gradient) {
            this.hits++;
            return gradient;
        }

        this.misses++;
        gradient = this.ctx.createLinearGradient(x0, y0, x1, y1);
        for (const [stop, color] of colorStops) {
            gradient.addColorStop(stop, color);
        }

        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }

        this.cache.set(key, gradient);
        return gradient;
    }

    clear(): void {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    getStats(): { hits: number; misses: number; size: number; hitRate: number } {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            size: this.cache.size,
            hitRate: total > 0 ? this.hits / total : 0
        };
    }
}

// ============================================
// Particle Pool
// ============================================

/**
 * Pre-allocated particle pool
 */
export const particlePool = new ObjectPool<Particle>(
    // Factory
    () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 1,
        size: 2,
        hue: 0
    }),
    // Reset
    (p) => {
        p.x = 0;
        p.y = 0;
        p.vx = 0;
        p.vy = 0;
        p.life = 1;
        p.size = 2;
        p.hue = 0;
    },
    // Initial size
    200
);

/**
 * Create particle from pool
 */
export function createParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    hue: number,
    size = 2
): Particle {
    const p = particlePool.acquire();
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.hue = hue;
    p.size = size;
    p.life = 1;
    return p;
}

/**
 * Release particle back to pool
 */
export function releaseParticle(p: Particle): void {
    particlePool.release(p);
}

// ============================================
// Quadtree for Spatial Partitioning
// ============================================

interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface QuadtreeItem<T> {
    x: number;
    y: number;
    data: T;
}

/**
 * Quadtree for efficient spatial queries
 */
export class Quadtree<T> {
    private bounds: Bounds;
    private maxItems: number;
    private maxDepth: number;
    private depth: number;
    private items: QuadtreeItem<T>[] = [];
    private children: Quadtree<T>[] | null = null;

    constructor(
        bounds: Bounds,
        maxItems = 10,
        maxDepth = 5,
        depth = 0
    ) {
        this.bounds = bounds;
        this.maxItems = maxItems;
        this.maxDepth = maxDepth;
        this.depth = depth;
    }

    /**
     * Insert an item into the quadtree
     */
    insert(x: number, y: number, data: T): boolean {
        // Check if point is within bounds
        if (!this.containsPoint(x, y)) {
            return false;
        }

        // If we have space and no children, add here
        if (this.items.length < this.maxItems && !this.children) {
            this.items.push({ x, y, data });
            return true;
        }

        // Subdivide if necessary
        if (!this.children && this.depth < this.maxDepth) {
            this.subdivide();
        }

        // Try to insert into children
        if (this.children) {
            for (const child of this.children) {
                if (child.insert(x, y, data)) {
                    return true;
                }
            }
        }

        // Store here if can't go deeper
        this.items.push({ x, y, data });
        return true;
    }

    /**
     * Query items within a circular region
     */
    queryRadius(
        cx: number,
        cy: number,
        radius: number,
        results: T[] = []
    ): T[] {
        // Check if query circle intersects our bounds
        if (!this.intersectsCircle(cx, cy, radius)) {
            return results;
        }

        // Check items in this node
        const radiusSq = radius * radius;
        for (const item of this.items) {
            const dx = item.x - cx;
            const dy = item.y - cy;
            if (dx * dx + dy * dy <= radiusSq) {
                results.push(item.data);
            }
        }

        // Query children
        if (this.children) {
            for (const child of this.children) {
                child.queryRadius(cx, cy, radius, results);
            }
        }

        return results;
    }

    /**
     * Query items within a rectangular region
     */
    queryRect(
        x: number,
        y: number,
        width: number,
        height: number,
        results: T[] = []
    ): T[] {
        // Check if query rect intersects our bounds
        if (!this.intersectsRect(x, y, width, height)) {
            return results;
        }

        // Check items in this node
        for (const item of this.items) {
            if (
                item.x >= x &&
                item.x <= x + width &&
                item.y >= y &&
                item.y <= y + height
            ) {
                results.push(item.data);
            }
        }

        // Query children
        if (this.children) {
            for (const child of this.children) {
                child.queryRect(x, y, width, height, results);
            }
        }

        return results;
    }

    /**
     * Clear all items
     */
    clear(): void {
        this.items.length = 0;
        if (this.children) {
            for (const child of this.children) {
                child.clear();
            }
            this.children = null;
        }
    }

    /**
     * Get total item count
     */
    get size(): number {
        let count = this.items.length;
        if (this.children) {
            for (const child of this.children) {
                count += child.size;
            }
        }
        return count;
    }

    private subdivide(): void {
        const { x, y, width, height } = this.bounds;
        const hw = width / 2;
        const hh = height / 2;

        this.children = [
            new Quadtree<T>({ x, y, width: hw, height: hh }, this.maxItems, this.maxDepth, this.depth + 1),
            new Quadtree<T>({ x: x + hw, y, width: hw, height: hh }, this.maxItems, this.maxDepth, this.depth + 1),
            new Quadtree<T>({ x, y: y + hh, width: hw, height: hh }, this.maxItems, this.maxDepth, this.depth + 1),
            new Quadtree<T>({ x: x + hw, y: y + hh, width: hw, height: hh }, this.maxItems, this.maxDepth, this.depth + 1)
        ];

        // Redistribute existing items
        for (const item of this.items) {
            for (const child of this.children) {
                if (child.insert(item.x, item.y, item.data)) {
                    break;
                }
            }
        }
        this.items.length = 0;
    }

    private containsPoint(px: number, py: number): boolean {
        return (
            px >= this.bounds.x &&
            px <= this.bounds.x + this.bounds.width &&
            py >= this.bounds.y &&
            py <= this.bounds.y + this.bounds.height
        );
    }

    private intersectsCircle(cx: number, cy: number, radius: number): boolean {
        const { x, y, width, height } = this.bounds;

        // Find closest point on rectangle to circle center
        const closestX = Math.max(x, Math.min(cx, x + width));
        const closestY = Math.max(y, Math.min(cy, y + height));

        // Check if that point is within the circle
        const dx = cx - closestX;
        const dy = cy - closestY;
        return dx * dx + dy * dy <= radius * radius;
    }

    private intersectsRect(
        rx: number,
        ry: number,
        rwidth: number,
        rheight: number
    ): boolean {
        return !(
            rx > this.bounds.x + this.bounds.width ||
            rx + rwidth < this.bounds.x ||
            ry > this.bounds.y + this.bounds.height ||
            ry + rheight < this.bounds.y
        );
    }
}

// ============================================
// Render Batch Processor
// ============================================

interface RenderCommand {
    type: 'circle' | 'rect' | 'line' | 'text';
    x: number;
    y: number;
    color: string;
    params: Record<string, any>;
}

/**
 * Batch similar draw calls for efficiency
 */
export class RenderBatch {
    private commands: RenderCommand[] = [];
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    addCircle(
        x: number,
        y: number,
        radius: number,
        color: string,
        fill = true
    ): void {
        this.commands.push({
            type: 'circle',
            x,
            y,
            color,
            params: { radius, fill }
        });
    }

    addLine(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: string,
        width = 1
    ): void {
        this.commands.push({
            type: 'line',
            x: x1,
            y: y1,
            color,
            params: { x2, y2, width }
        });
    }

    addText(
        x: number,
        y: number,
        text: string,
        color: string,
        font = '12px sans-serif'
    ): void {
        this.commands.push({
            type: 'text',
            x,
            y,
            color,
            params: { text, font }
        });
    }

    /**
     * Execute all batched commands
     */
    flush(): void {
        // Group by type and color for efficiency
        const groups = new Map<string, RenderCommand[]>();

        for (const cmd of this.commands) {
            const key = `${cmd.type}:${cmd.color}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(cmd);
        }

        // Execute grouped commands
        for (const [key, cmds] of groups) {
            const [type, color] = key.split(':');

            if (type === 'circle') {
                const fillCmds = cmds.filter(c => c.params.fill);
                const strokeCmds = cmds.filter(c => !c.params.fill);

                if (fillCmds.length > 0) {
                    this.ctx.fillStyle = color;
                    this.ctx.beginPath();
                    for (const cmd of fillCmds) {
                        this.ctx.moveTo(cmd.x + cmd.params.radius, cmd.y);
                        this.ctx.arc(cmd.x, cmd.y, cmd.params.radius, 0, Math.PI * 2);
                    }
                    this.ctx.fill();
                }

                if (strokeCmds.length > 0) {
                    this.ctx.strokeStyle = color;
                    this.ctx.beginPath();
                    for (const cmd of strokeCmds) {
                        this.ctx.moveTo(cmd.x + cmd.params.radius, cmd.y);
                        this.ctx.arc(cmd.x, cmd.y, cmd.params.radius, 0, Math.PI * 2);
                    }
                    this.ctx.stroke();
                }
            } else if (type === 'line') {
                this.ctx.strokeStyle = color;
                this.ctx.beginPath();
                for (const cmd of cmds) {
                    this.ctx.moveTo(cmd.x, cmd.y);
                    this.ctx.lineTo(cmd.params.x2, cmd.params.y2);
                }
                this.ctx.stroke();
            } else if (type === 'text') {
                this.ctx.fillStyle = color;
                for (const cmd of cmds) {
                    this.ctx.font = cmd.params.font;
                    this.ctx.fillText(cmd.params.text, cmd.x, cmd.y);
                }
            }
        }

        this.commands.length = 0;
    }

    clear(): void {
        this.commands.length = 0;
    }
}

// ============================================
// Visibility Culling
// ============================================

/**
 * Check if a point is visible within the camera view
 */
export function isVisible(
    x: number,
    y: number,
    cameraX: number,
    cameraY: number,
    viewWidth: number,
    viewHeight: number,
    margin = 100
): boolean {
    return (
        x >= cameraX - margin &&
        x <= cameraX + viewWidth + margin &&
        y >= cameraY - margin &&
        y <= cameraY + viewHeight + margin
    );
}

/**
 * Get visible items from a collection
 */
export function getVisibleItems<T extends { x: number; y: number }>(
    items: T[],
    cameraX: number,
    cameraY: number,
    viewWidth: number,
    viewHeight: number,
    margin = 100
): T[] {
    return items.filter(item =>
        isVisible(item.x, item.y, cameraX, cameraY, viewWidth, viewHeight, margin)
    );
}

// ============================================
// Level of Detail (LOD)
// ============================================

export type LODLevel = 'high' | 'medium' | 'low' | 'minimal';

/**
 * Determine LOD level based on distance
 */
export function getLODLevel(distance: number, viewRadius: number): LODLevel {
    const ratio = distance / viewRadius;
    if (ratio < 0.3) return 'high';
    if (ratio < 0.6) return 'medium';
    if (ratio < 0.85) return 'low';
    return 'minimal';
}

/**
 * Get render detail settings based on LOD
 */
export function getLODSettings(lod: LODLevel): {
    drawTrail: boolean;
    drawGlow: boolean;
    drawName: boolean;
    drawEffects: boolean;
    particleCount: number;
} {
    switch (lod) {
        case 'high':
            return {
                drawTrail: true,
                drawGlow: true,
                drawName: true,
                drawEffects: true,
                particleCount: 1
            };
        case 'medium':
            return {
                drawTrail: true,
                drawGlow: true,
                drawName: true,
                drawEffects: false,
                particleCount: 0.5
            };
        case 'low':
            return {
                drawTrail: false,
                drawGlow: true,
                drawName: false,
                drawEffects: false,
                particleCount: 0.25
            };
        case 'minimal':
            return {
                drawTrail: false,
                drawGlow: false,
                drawName: false,
                drawEffects: false,
                particleCount: 0
            };
    }
}
