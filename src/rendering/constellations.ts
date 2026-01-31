/**
 * Constellation Detection & Rendering System
 * Ported from LEGACY logic.ts (findConstellations) and renderer.ts (renderConstellations)
 * 
 * Detects triangular patterns of lit stars and renders glowing connections
 */

import type { CanvasContext } from './utils';

// ============================================================================
// TYPES
// ============================================================================

export interface Star {
  id: string;
  x: number;
  y: number;
  lit: boolean;
  brightness?: number;
  hue?: number;
}

export interface Constellation {
  id: string;
  stars: [Star, Star, Star];
  centroid: { x: number; y: number };
  createdAt: number;
}

export interface ConstellationConfig {
  /** Maximum distance between stars to form constellation edge (default: 450) */
  maxEdgeDistance: number;
  /** View radius for star detection (default: 1500) */
  viewRadius: number;
  /** Minimum brightness for star to be considered lit (default: 0.5) */
  litThreshold: number;
  /** Glow color for constellation fill */
  glowColor: string;
  /** Stroke color for constellation lines */
  strokeColor: string;
  /** Inner glow radius */
  glowRadius: number;
}

export interface ConstellationRenderOptions {
  /** Animation time for pulsing effect */
  time?: number;
  /** Overall opacity multiplier */
  opacity?: number;
  /** Whether to render glow fill */
  showGlow?: boolean;
  /** Whether to render edge lines */
  showLines?: boolean;
}

// ============================================================================
// CONFIG
// ============================================================================

export const CONSTELLATION_CONFIG: ConstellationConfig = {
  maxEdgeDistance: 450,
  viewRadius: 1500,
  litThreshold: 0.5,
  glowColor: 'rgba(125, 211, 252, 0.05)',
  strokeColor: 'rgba(125, 211, 252, 0.22)',
  glowRadius: 170,
};

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Find all valid constellations from lit stars in view
 * A constellation is 3 lit stars forming a triangle where all edges < maxDistance
 */
export function findConstellations(
  stars: Star[],
  playerX: number,
  playerY: number,
  config: Partial<ConstellationConfig> = {}
): Constellation[] {
  const { maxEdgeDistance, viewRadius, litThreshold } = {
    ...CONSTELLATION_CONFIG,
    ...config,
  };

  // Filter to lit stars within view radius
  const litStars = stars.filter((star) => {
    if (!star.lit) return false;
    if (star.brightness !== undefined && star.brightness < litThreshold) return false;
    
    const dist = Math.hypot(star.x - playerX, star.y - playerY);
    return dist < viewRadius;
  });

  const constellations: Constellation[] = [];
  const usedCombinations = new Set<string>();

  // Check all combinations of 3 stars
  for (let i = 0; i < litStars.length; i++) {
    for (let j = i + 1; j < litStars.length; j++) {
      for (let k = j + 1; k < litStars.length; k++) {
        const a = litStars[i];
        const b = litStars[j];
        const c = litStars[k];

        // Check all edge distances
        const d1 = Math.hypot(a.x - b.x, a.y - b.y);
        const d2 = Math.hypot(b.x - c.x, b.y - c.y);
        const d3 = Math.hypot(c.x - a.x, c.y - a.y);

        if (d1 < maxEdgeDistance && d2 < maxEdgeDistance && d3 < maxEdgeDistance) {
          // Create unique ID for this combination
          const ids = [a.id, b.id, c.id].sort();
          const combinationId = ids.join('-');

          if (!usedCombinations.has(combinationId)) {
            usedCombinations.add(combinationId);

            const centroid = {
              x: (a.x + b.x + c.x) / 3,
              y: (a.y + b.y + c.y) / 3,
            };

            constellations.push({
              id: combinationId,
              stars: [a, b, c],
              centroid,
              createdAt: Date.now(),
            });
          }
        }
      }
    }
  }

  return constellations;
}

/**
 * Filter stars by realm key prefix
 */
export function filterStarsByRealm(
  starsMap: Map<string, Star[]>,
  realm: string
): Star[] {
  const result: Star[] = [];
  
  for (const [key, stars] of starsMap) {
    if (key.startsWith(`${realm}:`)) {
      result.push(...stars);
    }
  }
  
  return result;
}

/**
 * Calculate constellation stats
 */
export function getConstellationStats(constellations: Constellation[]): {
  count: number;
  totalStars: number;
  uniqueStars: Set<string>;
  averageSize: number;
} {
  const uniqueStars = new Set<string>();
  let totalSize = 0;

  for (const constellation of constellations) {
    for (const star of constellation.stars) {
      uniqueStars.add(star.id);
    }

    // Calculate triangle area using cross product
    const [a, b, c] = constellation.stars;
    const area = Math.abs(
      (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)
    ) / 2;
    totalSize += area;
  }

  return {
    count: constellations.length,
    totalStars: uniqueStars.size,
    uniqueStars,
    averageSize: constellations.length > 0 ? totalSize / constellations.length : 0,
  };
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

/**
 * Render all constellations with glowing triangular fill and edge lines
 */
export function renderConstellations(
  context: CanvasContext,
  constellations: Constellation[],
  options: ConstellationRenderOptions = {}
): void {
  if (constellations.length === 0) return;

  const { ctx } = context;
  const { time = Date.now(), opacity = 1, showGlow = true, showLines = true } = options;

  // Use additive blending for glow effect
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const constellation of constellations) {
    const [a, b, c] = constellation.stars;
    const { centroid } = constellation;

    // Subtle pulse animation
    const age = (time - constellation.createdAt) / 1000;
    const pulse = 0.8 + Math.sin(age * 2) * 0.2;
    const baseOpacity = opacity * pulse;

    if (showGlow) {
      // Create radial gradient from centroid
      const gradient = ctx.createRadialGradient(
        centroid.x,
        centroid.y,
        0,
        centroid.x,
        centroid.y,
        CONSTELLATION_CONFIG.glowRadius
      );
      gradient.addColorStop(0, `rgba(125, 211, 252, ${0.05 * baseOpacity})`);
      gradient.addColorStop(1, 'rgba(125, 211, 252, 0)');

      // Draw filled triangle
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fill();
    }

    if (showLines) {
      // Draw triangle outline
      ctx.strokeStyle = `rgba(125, 211, 252, ${0.22 * baseOpacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/**
 * Render a single constellation with custom styling
 */
export function renderConstellation(
  context: CanvasContext,
  constellation: Constellation,
  options: {
    fillColor?: string;
    strokeColor?: string;
    lineWidth?: number;
    opacity?: number;
  } = {}
): void {
  const { ctx } = context;
  const {
    fillColor = CONSTELLATION_CONFIG.glowColor,
    strokeColor = CONSTELLATION_CONFIG.strokeColor,
    lineWidth = 1,
    opacity = 1,
  } = options;

  const [a, b, c] = constellation.stars;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';

  // Fill
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.closePath();
  ctx.fill();

  // Stroke
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/**
 * Render constellation connection lines only (no fill)
 */
export function renderConstellationLinesOnly(
  context: CanvasContext,
  constellations: Constellation[],
  options: {
    color?: string;
    lineWidth?: number;
    opacity?: number;
    dashed?: boolean;
  } = {}
): void {
  if (constellations.length === 0) return;

  const { ctx } = context;
  const {
    color = 'rgba(125, 211, 252, 0.3)',
    lineWidth = 1,
    opacity = 1,
    dashed = false,
  } = options;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  if (dashed) {
    ctx.setLineDash([5, 5]);
  }

  for (const constellation of constellations) {
    const [a, b, c] = constellation.stars;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.stroke();
  }

  if (dashed) {
    ctx.setLineDash([]);
  }

  ctx.restore();
}

export default {
  findConstellations,
  filterStarsByRealm,
  getConstellationStats,
  renderConstellations,
  renderConstellation,
  renderConstellationLinesOnly,
  CONSTELLATION_CONFIG,
};
