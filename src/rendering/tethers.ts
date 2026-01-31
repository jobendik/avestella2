/**
 * Tether & Bond Rendering Utilities
 * Ported from LEGACY/src/game/renderer.ts (renderTethers, renderSocialClusters)
 * 
 * Features:
 * - Gradient lines between bonded players
 * - Opacity scales with bond strength (non-linear for visibility)
 * - Line thickness scales with bond strength
 * - Social network graph visualization (connections between nearby players)
 * - Social cluster detection and rendering
 */

import type { CanvasContext } from './utils';
import { TETHER_DISTANCE } from '@/constants/game';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TetherEntity {
  id: string;
  x: number;
  y: number;
  hue: number;
}

export interface BondedEntity extends TetherEntity {
  bondStrength: number;  // 0-100
  bondToViewer?: number; // Server-provided bond value
}

export interface TetherRenderOptions {
  /** Distance threshold for tether visibility */
  maxDistance?: number;
  /** Minimum bond strength to show tether (default: 0.1) */
  minBondStrength?: number;
  /** Enable social graph between nearby entities */
  showSocialGraph?: boolean;
  /** Enable cluster indicators */
  showClusters?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default tether render options */
const DEFAULT_TETHER_OPTIONS: Required<TetherRenderOptions> = {
  maxDistance: TETHER_DISTANCE,
  minBondStrength: 0.1,
  showSocialGraph: true,
  showClusters: true,
};

/** Minimum cluster size to render */
const MIN_CLUSTER_SIZE = 3;

// ============================================================================
// Rendering Functions
// ============================================================================

/**
 * Render tethers from player to all bonded others
 * Uses gradient lines with opacity and thickness based on bond strength
 */
export function renderPlayerTethers(
  context: CanvasContext,
  player: TetherEntity,
  others: Map<string, BondedEntity>,
  bonds: Map<string, number>,
  options: TetherRenderOptions = {}
): void {
  const { ctx } = context;
  const opts = { ...DEFAULT_TETHER_OPTIONS, ...options };

  others.forEach((other) => {
    // Use server-provided bond strength, or fall back to local bonds
    const bondStrength = other.bondToViewer ?? (bonds.get(other.id) || 0);

    if (bondStrength <= opts.minBondStrength) return;

    const dx = player.x - other.x;
    const dy = player.y - other.y;
    const dist = Math.hypot(dx, dy);

    if (dist >= opts.maxDistance) return;

    // Non-linear scaling: bonds become visible quickly
    // At b=5: ~0.15 opacity. At b=50: ~0.4 opacity. At b=100: ~0.8 opacity
    const normalizedBond = Math.min(1, bondStrength / 100);
    const baseOpacity = 0.1 + Math.pow(normalizedBond, 0.5) * 0.7;
    const distanceFalloff = 1 - dist / opts.maxDistance;
    const alpha = baseOpacity * distanceFalloff;

    // Use lighter blend mode for ethereal look
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Create gradient from player color to other's color
    const gradient = ctx.createLinearGradient(player.x, player.y, other.x, other.y);
    gradient.addColorStop(0, `hsla(${player.hue}, 72%, 58%, 0)`);
    gradient.addColorStop(0.15, `hsla(${player.hue}, 72%, 58%, ${alpha})`);
    gradient.addColorStop(0.85, `hsla(${other.hue}, 72%, 58%, ${alpha})`);
    gradient.addColorStop(1, `hsla(${other.hue}, 72%, 58%, 0)`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1 + normalizedBond * 2.5; // Thicker as bond grows
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(other.x, other.y);
    ctx.stroke();

    ctx.restore();
  });
}

/**
 * Render social network graph between nearby entities
 * Creates faint connections between entities that are close together
 * This visualizes the "social graph" effect
 */
export function renderSocialGraph(
  context: CanvasContext,
  player: TetherEntity,
  others: Map<string, TetherEntity>,
  options: TetherRenderOptions = {}
): void {
  const { ctx } = context;
  const opts = { ...DEFAULT_TETHER_OPTIONS, ...options };

  if (!opts.showSocialGraph) return;

  // Filter to nearby entities
  const nearbyEntities = Array.from(others.values()).filter((o) => {
    const dist = Math.hypot(player.x - o.x, player.y - o.y);
    return dist < opts.maxDistance * 1.5;
  });

  // Draw connections between pairs of nearby entities
  for (let i = 0; i < nearbyEntities.length; i++) {
    for (let j = i + 1; j < nearbyEntities.length; j++) {
      const a = nearbyEntities[i];
      const b = nearbyEntities[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);

      // Only connect if they're close to each other
      const connectionThreshold = opts.maxDistance * 0.8;
      if (dist >= connectionThreshold) continue;

      // Faint connection (graph edge)
      const strength = 1 - dist / connectionThreshold;
      const alpha = strength * 0.15;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      gradient.addColorStop(0, `hsla(${a.hue}, 60%, 50%, 0)`);
      gradient.addColorStop(0.3, `hsla(${a.hue}, 60%, 50%, ${alpha})`);
      gradient.addColorStop(0.7, `hsla(${b.hue}, 60%, 50%, ${alpha})`);
      gradient.addColorStop(1, `hsla(${b.hue}, 60%, 50%, 0)`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      ctx.restore();
    }
  }
}

/**
 * Detect and render social clusters
 * A cluster is 3+ entities close together, rendered as a subtle glow
 */
export function renderSocialClusters(
  context: CanvasContext,
  player: TetherEntity,
  others: Map<string, TetherEntity>,
  viewRadius: number,
  options: TetherRenderOptions = {}
): void {
  const { ctx } = context;
  const opts = { ...DEFAULT_TETHER_OPTIONS, ...options };

  if (!opts.showClusters) return;

  // Gather all visible entities
  const entities: TetherEntity[] = [
    player,
    ...Array.from(others.values()).filter(
      (o) => Math.hypot(o.x - player.x, o.y - player.y) < viewRadius
    ),
  ];

  if (entities.length < MIN_CLUSTER_SIZE) return;

  // Simple cluster detection: find entities with 2+ neighbors within threshold
  const clusterThreshold = opts.maxDistance * 0.5;
  const clusters: TetherEntity[][] = [];
  const assigned = new Set<string>();

  for (const entity of entities) {
    if (assigned.has(entity.id)) continue;

    // Find neighbors
    const neighbors = entities.filter(
      (other) =>
        other.id !== entity.id &&
        Math.hypot(entity.x - other.x, entity.y - other.y) < clusterThreshold
    );

    if (neighbors.length >= MIN_CLUSTER_SIZE - 1) {
      // Found a cluster
      const cluster = [entity, ...neighbors];
      cluster.forEach((e) => assigned.add(e.id));
      clusters.push(cluster);
    }
  }

  // Render each cluster
  clusters.forEach((cluster) => {
    // Calculate cluster center
    const centerX = cluster.reduce((sum, e) => sum + e.x, 0) / cluster.length;
    const centerY = cluster.reduce((sum, e) => sum + e.y, 0) / cluster.length;

    // Calculate average hue
    const avgHue = cluster.reduce((sum, e) => sum + e.hue, 0) / cluster.length;

    // Calculate cluster radius (max distance from center to any member)
    const radius = Math.max(
      ...cluster.map((e) => Math.hypot(e.x - centerX, e.y - centerY))
    ) + 30;

    // Draw subtle cluster glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, `hsla(${avgHue}, 60%, 50%, 0.08)`);
    gradient.addColorStop(0.5, `hsla(${avgHue}, 60%, 50%, 0.04)`);
    gradient.addColorStop(1, `hsla(${avgHue}, 60%, 50%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

/**
 * Render all tether-related effects
 * Convenience function that calls all tether rendering functions
 */
export function renderAllTethers(
  context: CanvasContext,
  player: TetherEntity,
  others: Map<string, BondedEntity>,
  bonds: Map<string, number>,
  viewRadius: number,
  options: TetherRenderOptions = {}
): void {
  // Render order: clusters (back) -> social graph -> player tethers (front)
  renderSocialClusters(context, player, others, viewRadius, options);
  renderSocialGraph(context, player, others, options);
  renderPlayerTethers(context, player, others, bonds, options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate bond strength between two entities
 * Used for determining tether visibility and thickness
 */
export function calculateTetherStrength(
  distance: number,
  bondStrength: number,
  maxDistance: number = TETHER_DISTANCE
): { alpha: number; lineWidth: number } {
  const normalizedBond = Math.min(1, bondStrength / 100);
  const baseOpacity = 0.1 + Math.pow(normalizedBond, 0.5) * 0.7;
  const distanceFalloff = Math.max(0, 1 - distance / maxDistance);
  
  return {
    alpha: baseOpacity * distanceFalloff,
    lineWidth: 1 + normalizedBond * 2.5,
  };
}

/**
 * Check if an entity is within tether range
 */
export function isInTetherRange(
  entity1: { x: number; y: number },
  entity2: { x: number; y: number },
  maxDistance: number = TETHER_DISTANCE
): boolean {
  const dist = Math.hypot(entity1.x - entity2.x, entity1.y - entity2.y);
  return dist < maxDistance;
}

/**
 * Get all entities within tether range of a position
 */
export function getEntitiesInTetherRange<T extends { x: number; y: number }>(
  x: number,
  y: number,
  entities: T[],
  maxDistance: number = TETHER_DISTANCE
): T[] {
  return entities.filter((entity) =>
    Math.hypot(entity.x - x, entity.y - y) < maxDistance
  );
}
