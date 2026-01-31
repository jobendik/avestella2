/**
 * Nebula Background Rendering
 * Ported from LEGACY/src/game/renderer.ts (renderBackground, renderNebula)
 * 
 * Features:
 * - Realm-specific gradient backgrounds
 * - Animated nebula clouds
 * - Parallax star layers
 * - Ambient particle effects
 */

import type { CanvasContext } from './utils';
import type { RealmData } from '@/constants/realms';
import { WORLD_SIZE } from '@/constants/game';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
  opacity: number;
}

export interface BackgroundOptions {
  /** Time for animations (Date.now() or custom) */
  time?: number;
  /** Parallax offset based on player position */
  parallaxX?: number;
  parallaxY?: number;
  /** Enable animated nebula clouds */
  animatedClouds?: boolean;
  /** Cloud density (0-1) */
  cloudDensity?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CLOUD_COUNT = 5;
const PARALLAX_FACTOR = 0.1;

// ============================================================================
// Background Rendering
// ============================================================================

/**
 * Render solid realm background color
 */
export function renderBackground(
  context: CanvasContext,
  bgColor: [number, number, number]
): void {
  const { ctx, width, height } = context;

  ctx.fillStyle = `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Render full realm background with nebula effect
 */
export function renderRealmBackground(
  context: CanvasContext,
  realm: RealmData,
  options: BackgroundOptions = {}
): void {
  // Atmospheric Depth (Restored)
  // Calculate distance from center to dim the world at edges
  const { centerX, centerY, offsetX, offsetY } = context;
  const playerX = centerX - offsetX;
  const playerY = centerY - offsetY;

  const dx = playerX - WORLD_SIZE / 2;
  const dy = playerY - WORLD_SIZE / 2;
  const distFromCenter = Math.sqrt(dx * dx + dy * dy);

  // Falloff factor: 1.0 at center, drops to 0.4 at edges
  const maxDist = WORLD_SIZE / 2;
  const falloff = Math.max(0.4, 1 - (distFromCenter / maxDist) * 0.6);

  // Apply falloff to background colors
  const bg: [number, number, number] = [
    realm.bg[0] * falloff,
    realm.bg[1] * falloff,
    realm.bg[2] * falloff
  ];

  const n1: [number, number, number] = [
    realm.n1[0] * falloff,
    realm.n1[1] * falloff,
    realm.n1[2] * falloff
  ];

  const n2: [number, number, number] = [
    realm.n2[0] * falloff,
    realm.n2[1] * falloff,
    realm.n2[2] * falloff
  ];

  // Solid background first
  renderBackground(context, bg);

  // Add nebula gradient overlay
  renderNebulaGradient(context, n1, n2, options);

  // Add animated clouds if enabled
  if (options.animatedClouds !== false) {
    renderNebulaClouds(context, n1, n2, options);
  }
}

/**
 * Render nebula gradient overlay
 */
export function renderNebulaGradient(
  context: CanvasContext,
  color1: [number, number, number],
  color2: [number, number, number],
  options: BackgroundOptions = {}
): void {
  const { ctx, width, height } = context;
  const time = options.time ?? Date.now();
  const parallaxX = (options.parallaxX ?? 0) * PARALLAX_FACTOR;
  const parallaxY = (options.parallaxY ?? 0) * PARALLAX_FACTOR;

  ctx.save();

  // Animated gradient position
  const phase = (time % 60000) / 60000;
  const gradX = width * 0.3 + Math.sin(phase * Math.PI * 2) * width * 0.2 - parallaxX;
  const gradY = height * 0.3 + Math.cos(phase * Math.PI * 2) * height * 0.2 - parallaxY;

  // Create radial gradient
  const gradient = ctx.createRadialGradient(
    gradX, gradY, 0,
    gradX, gradY, Math.max(width, height) * 0.8
  );

  gradient.addColorStop(0, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0.15)`);
  gradient.addColorStop(0.5, `rgba(${color2[0]}, ${color2[1]}, ${color2[2]}, 0.08)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Second gradient for depth
  const phase2 = ((time + 30000) % 60000) / 60000;
  const grad2X = width * 0.7 + Math.cos(phase2 * Math.PI * 2) * width * 0.2 - parallaxX;
  const grad2Y = height * 0.7 + Math.sin(phase2 * Math.PI * 2) * height * 0.2 - parallaxY;

  const gradient2 = ctx.createRadialGradient(
    grad2X, grad2Y, 0,
    grad2X, grad2Y, Math.max(width, height) * 0.6
  );

  gradient2.addColorStop(0, `rgba(${color2[0]}, ${color2[1]}, ${color2[2]}, 0.1)`);
  gradient2.addColorStop(0.6, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0.05)`);
  gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient2;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Render animated nebula clouds
 */
export function renderNebulaClouds(
  context: CanvasContext,
  color1: [number, number, number],
  color2: [number, number, number],
  options: BackgroundOptions = {}
): void {
  const { ctx, width, height } = context;
  const time = options.time ?? Date.now();
  const density = options.cloudDensity ?? 0.5;
  const cloudCount = Math.floor(DEFAULT_CLOUD_COUNT * density);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < cloudCount; i++) {
    // Deterministic cloud positions based on index
    const seed = i * 12.9898;
    const cloudX = (Math.sin(seed) * 0.5 + 0.5) * width;
    const cloudY = (Math.sin(seed * 78.233) * 0.5 + 0.5) * height;
    const cloudRadius = width * (0.1 + (Math.sin(seed * 43.12) * 0.5 + 0.5) * 0.2);
    const phase = (time / 10000 + seed) % 1;

    // Choose color based on index
    const color = i % 2 === 0 ? color1 : color2;
    const opacity = 0.03 + Math.sin(phase * Math.PI * 2) * 0.02;

    // Animate position slightly
    const animX = cloudX + Math.sin(time / 5000 + i) * 20;
    const animY = cloudY + Math.cos(time / 7000 + i) * 15;

    const gradient = ctx.createRadialGradient(
      animX, animY, 0,
      animX, animY, cloudRadius
    );

    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`);
    gradient.addColorStop(0.5, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(animX, animY, cloudRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ============================================================================
// Vignette Effect
// ============================================================================

/**
 * Render vignette (darkened edges)
 */
export function renderVignette(
  context: CanvasContext,
  intensity: number = 0.4
): void {
  const { ctx, width, height } = context;

  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, width * 0.3,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// ============================================================================
// Ambient Particles
// ============================================================================

export interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
}

/**
 * Generate ambient particles for a realm
 */
export function generateAmbientParticles(
  width: number,
  height: number,
  count: number,
  particleMultiplier: number = 1.0
): AmbientParticle[] {
  const particles: AmbientParticle[] = [];
  const adjustedCount = Math.floor(count * particleMultiplier);

  for (let i = 0; i < adjustedCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 1 + Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
    });
  }

  return particles;
}

/**
 * Update ambient particles
 */
export function updateAmbientParticles(
  particles: AmbientParticle[],
  width: number,
  height: number,
  deltaTime: number
): void {
  for (const p of particles) {
    p.x += p.vx * deltaTime * 60;
    p.y += p.vy * deltaTime * 60;
    p.phase += 0.02 * deltaTime * 60;

    // Wrap around screen
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
  }
}

/**
 * Render ambient particles
 */
export function renderAmbientParticles(
  context: CanvasContext,
  particles: AmbientParticle[],
  color: [number, number, number]
): void {
  const { ctx } = context;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (const p of particles) {
    const twinkle = 0.5 + Math.sin(p.phase) * 0.5;
    const alpha = p.opacity * twinkle;

    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ============================================================================
// Special Realm Effects
// ============================================================================

/**
 * Render falling leaves (Sanctuary realm zen effect)
 */
export function renderFallingLeaves(
  context: CanvasContext,
  time: number
): void {
  const { ctx, width, height } = context;
  const leafCount = 8;

  ctx.save();
  ctx.globalAlpha = 0.3;

  for (let i = 0; i < leafCount; i++) {
    const seed = i * 0.7;
    const x = (seed * width + time * 0.02) % width;
    const y = (seed * 100 + time * 0.03) % height;
    const rotation = time * 0.001 + i;
    const size = 8 + Math.sin(seed * 10) * 4;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = 'rgba(255, 200, 150, 0.5)';

    // Simple leaf shape
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Render confetti effect (Nebula realm)
 */
export function renderConfetti(
  context: CanvasContext,
  centerX: number,
  centerY: number,
  intensity: number = 1.0,
  time: number
): void {
  const { ctx } = context;
  const particleCount = Math.floor(20 * intensity);
  const colors = ['#FF6B9D', '#A855F7', '#22D3EE', '#FFD700', '#4ADE80'];

  ctx.save();

  for (let i = 0; i < particleCount; i++) {
    const seed = i * 123.456;
    const age = (time / 1000 + seed) % 2;
    const progress = age / 2;

    if (progress > 1) continue;

    const angle = seed * 0.1;
    const speed = 50 + (seed % 100);
    const x = centerX + Math.cos(angle) * speed * progress;
    const y = centerY + Math.sin(angle) * speed * progress + progress * progress * 50;
    const rotation = time * 0.01 + seed;
    const alpha = 1 - progress;
    const size = 4 + (seed % 4);
    const color = colors[i % colors.length];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }

  ctx.restore();
}
