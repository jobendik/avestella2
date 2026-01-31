// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Particle Pool System
// Efficient particle object reuse for performance optimization
// ═══════════════════════════════════════════════════════════════════════════

import type { IParticle } from '@/types';

/**
 * Object pool for particle reuse - avoids garbage collection overhead
 * by recycling particle objects instead of creating/destroying them.
 */
export class ParticlePool {
  private pool: IParticle[] = [];
  private activeParticles: Set<IParticle> = new Set();
  private maxPoolSize: number;
  private createCount = 0;
  private reuseCount = 0;

  constructor(initialSize = 100, maxPoolSize = 500) {
    this.maxPoolSize = maxPoolSize;
    
    // Pre-allocate particles
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  /**
   * Creates an empty particle template
   */
  private createEmptyParticle(): IParticle {
    this.createCount++;
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      type: 'spark',
      color: '#ffffff',
      size: 1,
      alpha: 1,
      decay: 0,
      rotation: 0,
      rotationSpeed: 0,
      createdAt: 0
    };
  }

  /**
   * Acquire a particle from the pool or create a new one
   */
  acquire(config: Partial<IParticle> & { type: IParticle['type']; color: string }): IParticle {
    let particle: IParticle;

    if (this.pool.length > 0) {
      particle = this.pool.pop()!;
      this.reuseCount++;
    } else {
      particle = this.createEmptyParticle();
    }

    // Apply configuration
    particle.x = config.x ?? 0;
    particle.y = config.y ?? 0;
    particle.vx = config.vx ?? 0;
    particle.vy = config.vy ?? 0;
    particle.life = config.life ?? 1;
    particle.maxLife = config.maxLife ?? config.life ?? 1;
    particle.type = config.type;
    particle.color = config.color;
    particle.size = config.size ?? 1;
    particle.alpha = config.alpha ?? 1;
    particle.decay = config.decay ?? 0;
    particle.rotation = config.rotation ?? 0;
    particle.rotationSpeed = config.rotationSpeed ?? 0;
    particle.createdAt = config.createdAt ?? Date.now();

    this.activeParticles.add(particle);
    return particle;
  }

  /**
   * Return a particle to the pool for reuse
   */
  release(particle: IParticle): void {
    if (!this.activeParticles.has(particle)) {
      return; // Already released or not from this pool
    }

    this.activeParticles.delete(particle);

    // Only keep if under max pool size
    if (this.pool.length < this.maxPoolSize) {
      // Reset particle state
      particle.life = 0;
      particle.maxLife = 0;
      particle.vx = 0;
      particle.vy = 0;
      particle.alpha = 1;
      this.pool.push(particle);
    }
  }

  /**
   * Release all active particles
   */
  releaseAll(): void {
    this.activeParticles.forEach(p => this.release(p));
    this.activeParticles.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    pooled: number;
    active: number;
    created: number;
    reused: number;
    reuseRate: number;
  } {
    const total = this.createCount + this.reuseCount;
    return {
      pooled: this.pool.length,
      active: this.activeParticles.size,
      created: this.createCount,
      reused: this.reuseCount,
      reuseRate: total > 0 ? this.reuseCount / total : 0
    };
  }

  /**
   * Clear all particles and reset pool
   */
  clear(): void {
    this.releaseAll();
    this.pool = [];
    this.createCount = 0;
    this.reuseCount = 0;
  }

  /**
   * Pre-warm the pool with particles
   */
  prewarm(count: number): void {
    for (let i = 0; i < count && this.pool.length < this.maxPoolSize; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  /**
   * Get active particle count
   */
  get activeCount(): number {
    return this.activeParticles.size;
  }

  /**
   * Get pooled (available) particle count
   */
  get pooledCount(): number {
    return this.pool.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Generic Object Pool
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generic object pool for any type of object
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (item: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    reset: (item: T) => void,
    initialSize = 50,
    maxSize = 200
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;

    // Pre-allocate
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(item);
      this.pool.push(item);
    }
  }

  prewarm(count: number): void {
    for (let i = 0; i < count && this.pool.length < this.maxSize; i++) {
      this.pool.push(this.factory());
    }
  }

  clear(): void {
    this.pool = [];
  }

  get size(): number {
    return this.pool.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Spatial Hash for Entity Culling
// ═══════════════════════════════════════════════════════════════════════════

interface HasPosition {
  x: number;
  y: number;
}

/**
 * Spatial hash grid for efficient nearby entity queries
 * Used for entity culling and collision detection
 */
export class SpatialHash<T extends HasPosition> {
  private cellSize: number;
  private cells: Map<string, T[]> = new Map();
  private entityCells: Map<T, string> = new Map();

  constructor(cellSize = 200) {
    this.cellSize = cellSize;
  }

  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  /**
   * Add or update an entity's position
   */
  insert(entity: T): void {
    const newKey = this.getKey(entity.x, entity.y);
    const oldKey = this.entityCells.get(entity);

    if (oldKey === newKey) return; // No change

    // Remove from old cell
    if (oldKey) {
      const oldCell = this.cells.get(oldKey);
      if (oldCell) {
        const idx = oldCell.indexOf(entity);
        if (idx !== -1) oldCell.splice(idx, 1);
        if (oldCell.length === 0) this.cells.delete(oldKey);
      }
    }

    // Add to new cell
    let cell = this.cells.get(newKey);
    if (!cell) {
      cell = [];
      this.cells.set(newKey, cell);
    }
    cell.push(entity);
    this.entityCells.set(entity, newKey);
  }

  /**
   * Remove an entity
   */
  remove(entity: T): void {
    const key = this.entityCells.get(entity);
    if (!key) return;

    const cell = this.cells.get(key);
    if (cell) {
      const idx = cell.indexOf(entity);
      if (idx !== -1) cell.splice(idx, 1);
      if (cell.length === 0) this.cells.delete(key);
    }
    this.entityCells.delete(entity);
  }

  /**
   * Get all entities within a rectangle
   */
  queryRect(x: number, y: number, width: number, height: number): T[] {
    const result: T[] = [];
    const startX = Math.floor(x / this.cellSize);
    const startY = Math.floor(y / this.cellSize);
    const endX = Math.floor((x + width) / this.cellSize);
    const endY = Math.floor((y + height) / this.cellSize);

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (cell) {
          for (const entity of cell) {
            if (
              entity.x >= x &&
              entity.x <= x + width &&
              entity.y >= y &&
              entity.y <= y + height
            ) {
              result.push(entity);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Get all entities within a radius
   */
  queryRadius(x: number, y: number, radius: number): T[] {
    const result: T[] = [];
    const radiusSq = radius * radius;
    
    // Query bounding box
    const candidates = this.queryRect(
      x - radius,
      y - radius,
      radius * 2,
      radius * 2
    );

    // Filter by actual radius
    for (const entity of candidates) {
      const dx = entity.x - x;
      const dy = entity.y - y;
      if (dx * dx + dy * dy <= radiusSq) {
        result.push(entity);
      }
    }

    return result;
  }

  /**
   * Get entities visible in viewport
   */
  queryViewport(
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number,
    margin = 100
  ): T[] {
    return this.queryRect(
      cameraX - margin,
      cameraY - margin,
      viewportWidth + margin * 2,
      viewportHeight + margin * 2
    );
  }

  /**
   * Clear all entities
   */
  clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }

  /**
   * Get stats
   */
  getStats(): { cells: number; entities: number } {
    return {
      cells: this.cells.size,
      entities: this.entityCells.size
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Render Culling Utilities
// ═══════════════════════════════════════════════════════════════════════════

export interface CullableEntity {
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
}

/**
 * Check if an entity is visible in the viewport
 */
export function isInViewport(
  entity: CullableEntity,
  cameraX: number,
  cameraY: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 50
): boolean {
  const radius = entity.radius ?? Math.max(entity.width ?? 0, entity.height ?? 0) / 2;
  
  return (
    entity.x + radius >= cameraX - margin &&
    entity.x - radius <= cameraX + viewportWidth + margin &&
    entity.y + radius >= cameraY - margin &&
    entity.y - radius <= cameraY + viewportHeight + margin
  );
}

/**
 * Cull an array of entities to only those visible
 */
export function cullEntities<T extends CullableEntity>(
  entities: T[],
  cameraX: number,
  cameraY: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 50
): T[] {
  return entities.filter(e => 
    isInViewport(e, cameraX, cameraY, viewportWidth, viewportHeight, margin)
  );
}

// Create a default particle pool instance
export const defaultParticlePool = new ParticlePool(200, 1000);
