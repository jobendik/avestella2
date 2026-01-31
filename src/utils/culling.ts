// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Entity Culling & Render Optimization Utilities
// ═══════════════════════════════════════════════════════════════════════════

// Re-export basic culling from pooling.ts to avoid duplication
export type { CullableEntity } from './pooling';
export { isInViewport as isEntityInViewport, cullEntities } from './pooling';

/**
 * Viewport bounds for culling calculations
 */
export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Culling configuration
 */
export interface CullingConfig {
  /** Extra margin beyond viewport for culling (default: 100) */
  margin?: number;
  /** Distance threshold for update culling (default: 1500) */
  updateDistance?: number;
  /** Distance threshold for render culling (default: viewport + margin) */
  renderDistance?: number;
}

// Local interface for functions that need position-based entity
interface PositionedEntity {
  x: number;
  y: number;
  radius?: number;
}

const DEFAULT_CONFIG: Required<CullingConfig> = {
  margin: 100,
  updateDistance: 1500,
  renderDistance: 0, // Calculated from viewport
};

/**
 * Get viewport bounds from camera position and canvas size
 */
export function getViewportBounds(
  cameraX: number,
  cameraY: number,
  canvasWidth: number,
  canvasHeight: number,
  margin = 100
): ViewportBounds {
  return {
    left: cameraX - margin,
    top: cameraY - margin,
    right: cameraX + canvasWidth + margin,
    bottom: cameraY + canvasHeight + margin,
  };
}

/**
 * Check if an entity is within viewport bounds (for rendering)
 */
export function isInViewportBounds(
  entity: PositionedEntity,
  viewport: ViewportBounds
): boolean {
  const radius = entity.radius || 0;
  return (
    entity.x + radius >= viewport.left &&
    entity.x - radius <= viewport.right &&
    entity.y + radius >= viewport.top &&
    entity.y - radius <= viewport.bottom
  );
}

/**
 * Check if an entity is within update distance from player
 */
export function isInUpdateRange(
  entity: PositionedEntity,
  playerX: number,
  playerY: number,
  maxDistance = 1500
): boolean {
  const dx = entity.x - playerX;
  const dy = entity.y - playerY;
  const distSq = dx * dx + dy * dy;
  return distSq <= maxDistance * maxDistance;
}

/**
 * Filter entities that should be rendered (in viewport)
 */
export function filterForRender<T extends PositionedEntity>(
  entities: T[],
  viewport: ViewportBounds
): T[] {
  return entities.filter(entity => isInViewportBounds(entity, viewport));
}

/**
 * Filter entities that should be updated (in range)
 */
export function filterForUpdate<T extends PositionedEntity>(
  entities: T[],
  playerX: number,
  playerY: number,
  maxDistance = 1500
): T[] {
  return entities.filter(entity => isInUpdateRange(entity, playerX, playerY, maxDistance));
}

/**
 * Partition entities into update and skip groups
 * Returns [toUpdate, toSkip] for more control
 */
export function partitionForUpdate<T extends PositionedEntity>(
  entities: T[],
  playerX: number,
  playerY: number,
  maxDistance = 1500
): [T[], T[]] {
  const toUpdate: T[] = [];
  const toSkip: T[] = [];
  
  for (const entity of entities) {
    if (isInUpdateRange(entity, playerX, playerY, maxDistance)) {
      toUpdate.push(entity);
    } else {
      toSkip.push(entity);
    }
  }
  
  return [toUpdate, toSkip];
}

/**
 * Culling statistics for debugging/monitoring
 */
export interface CullingStats {
  totalEntities: number;
  renderedEntities: number;
  updatedEntities: number;
  culledFromRender: number;
  culledFromUpdate: number;
}

/**
 * Create a culling manager for consistent entity management
 */
export class CullingManager {
  private config: Required<CullingConfig>;
  private stats: CullingStats = {
    totalEntities: 0,
    renderedEntities: 0,
    updatedEntities: 0,
    culledFromRender: 0,
    culledFromUpdate: 0,
  };
  
  constructor(config: CullingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Get entities that should be updated this frame
   */
  getUpdatableEntities<T extends PositionedEntity>(
    entities: T[],
    playerX: number,
    playerY: number
  ): T[] {
    const result = filterForUpdate(entities, playerX, playerY, this.config.updateDistance);
    this.stats.totalEntities = entities.length;
    this.stats.updatedEntities = result.length;
    this.stats.culledFromUpdate = entities.length - result.length;
    return result;
  }
  
  /**
   * Get entities that should be rendered this frame
   */
  getRenderableEntities<T extends PositionedEntity>(
    entities: T[],
    viewport: ViewportBounds
  ): T[] {
    const result = filterForRender(entities, viewport);
    this.stats.renderedEntities = result.length;
    this.stats.culledFromRender = entities.length - result.length;
    return result;
  }
  
  /**
   * Get current culling statistics
   */
  getStats(): CullingStats {
    return { ...this.stats };
  }
  
  /**
   * Reset stats for new frame
   */
  resetStats(): void {
    this.stats = {
      totalEntities: 0,
      renderedEntities: 0,
      updatedEntities: 0,
      culledFromRender: 0,
      culledFromUpdate: 0,
    };
  }
}

/**
 * Spatial hash grid for efficient nearby entity queries
 * Useful for large numbers of entities
 */
export class SpatialHashGrid<T extends PositionedEntity> {
  private cellSize: number;
  private grid: Map<string, T[]> = new Map();
  
  constructor(cellSize = 200) {
    this.cellSize = cellSize;
  }
  
  /**
   * Clear the grid
   */
  clear(): void {
    this.grid.clear();
  }
  
  /**
   * Get cell key for a position
   */
  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
  
  /**
   * Insert an entity into the grid
   */
  insert(entity: T): void {
    const key = this.getCellKey(entity.x, entity.y);
    const cell = this.grid.get(key);
    if (cell) {
      cell.push(entity);
    } else {
      this.grid.set(key, [entity]);
    }
  }
  
  /**
   * Insert multiple entities
   */
  insertAll(entities: T[]): void {
    for (const entity of entities) {
      this.insert(entity);
    }
  }
  
  /**
   * Rebuild grid with new entities
   */
  rebuild(entities: T[]): void {
    this.clear();
    this.insertAll(entities);
  }
  
  /**
   * Get all entities in cells near a position
   */
  getNearby(x: number, y: number, radius: number): T[] {
    const result: T[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellY = Math.floor(y / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerCellX + dx},${centerCellY + dy}`;
        const cell = this.grid.get(key);
        if (cell) {
          result.push(...cell);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get entities within exact distance
   */
  getWithinRadius(x: number, y: number, radius: number): T[] {
    const candidates = this.getNearby(x, y, radius);
    const radiusSq = radius * radius;
    
    return candidates.filter(entity => {
      const dx = entity.x - x;
      const dy = entity.y - y;
      return dx * dx + dy * dy <= radiusSq;
    });
  }
}

// Export default instance for simple use cases
export const defaultCullingManager = new CullingManager();
