/**
 * Entity rendering - beacons, players, AI agents, connections
 * Ported from legacy_3/src/rendering/entities.ts
 */

import type { CanvasContext } from './utils';
import { isInViewport, worldToScreen, hexToRgb, drawRoundedRect } from './utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Beacon {
  id: string;
  x: number;
  y: number;
  icon: string;
  type: 'sanctuary' | 'wisdom' | 'hope' | 'courage' | 'unity' | 'solitude' | 'mystery';
}

export interface BeaconState {
  charge: number;
  active: boolean;
  activeTimer: number;
}

export interface LocalMessage {
  text: string;
  time: number;
}

export interface RenderableEntity {
  x: number;
  y: number;
  radius: number;
  color?: string;
  currentMessage?: string | null;
  messageTime?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAT_BUBBLE_DURATION = 8000;

// Default beacon positions (7 beacons per lumina-viral-bible.md Section 11.1)
export const BEACONS: Beacon[] = [
  { id: 'b1', x: 4000, y: 4000, icon: '🌟', type: 'sanctuary' },   // Center - Community hub
  { id: 'b2', x: 1500, y: 1500, icon: '🔮', type: 'wisdom' },       // Northwest - Knowledge rewards
  { id: 'b3', x: 6500, y: 6500, icon: '✨', type: 'hope' },         // Southeast - Healing bonuses
  { id: 'b4', x: 6500, y: 1500, icon: '⚡', type: 'courage' },      // Northeast - Challenge location
  { id: 'b5', x: 1500, y: 6500, icon: '💫', type: 'unity' },        // Southwest - Group requirements
  { id: 'b6', x: 4000, y: 500, icon: '🌙', type: 'solitude' },      // Far North - Solo achievement
  { id: 'b7', x: 7500, y: 4000, icon: '❓', type: 'mystery' },      // Hidden - Discovery reward
];

// ═══════════════════════════════════════════════════════════════════════════════
// BEACONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render all beacons with glow and charge indicators
 */
export const renderBeacons = (
  context: CanvasContext,
  beaconStates: Record<string, BeaconState>,
  time: number,
  beacons: Beacon[] = BEACONS
): void => {
  const { ctx, width, height, offsetX, offsetY } = context;

  beacons.forEach(beacon => {
    const screen = worldToScreen(beacon.x, beacon.y, offsetX, offsetY);

    // Viewport culling with larger padding for glow
    if (!isInViewport(screen.x, screen.y, width, height, 300)) return;

    const beaconState = beaconStates[beacon.id] || { charge: 0, active: false, activeTimer: 0 };
    const isActive = beaconState.active;

    // Glow radius - larger when active, pulses
    const glowR = isActive
      ? 300 + Math.sin(time / 500) * 20
      : 100 + beaconState.charge;

    // Beacon Glow
    ctx.globalCompositeOperation = 'screen';
    const grad = ctx.createRadialGradient(
      screen.x, screen.y, 10,
      screen.x, screen.y, glowR
    );
    grad.addColorStop(0, isActive ? 'rgba(150, 220, 255, 0.8)' : 'rgba(150, 150, 150, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    // Charge track (background ring)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Charge progress arc
    if (beaconState.charge > 0) {
      ctx.strokeStyle = isActive
        ? 'rgba(150, 220, 255, 0.9)'
        : `rgba(100, 200, 255, ${beaconState.charge / 100})`;
      ctx.lineWidth = isActive ? 6 : 4;
      ctx.beginPath();
      ctx.arc(
        screen.x, screen.y, 40,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * (beaconState.charge / 100))
      );
      ctx.stroke();
    }

    // Beacon symbol (triangle)
    ctx.fillStyle = isActive ? '#FFFFFF' : '#888888';
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y - 40);
    ctx.lineTo(screen.x + 15, screen.y + 20);
    ctx.lineTo(screen.x - 15, screen.y + 20);
    ctx.closePath();
    ctx.fill();
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTIONS & BONDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render constellation lines connecting nearby entities
 */
export const renderConstellationLines = (
  context: CanvasContext,
  nearbyEntities: Array<{ x: number; y: number }>,
  constellationBonus: number
): void => {
  // Only show when 2+ nearby and bonus is significant
  if (nearbyEntities.length < 2 || constellationBonus <= 10) return;

  const { ctx, centerX, centerY, offsetX, offsetY } = context;

  ctx.globalCompositeOperation = 'screen';

  nearbyEntities.forEach(entity => {
    const screen = worldToScreen(entity.x, entity.y, offsetX, offsetY);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(screen.x, screen.y);
    ctx.strokeStyle = `rgba(255, 215, 100, ${constellationBonus / 80})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  ctx.globalCompositeOperation = 'source-over';
};

/**
 * Render elastic tether between linked players
 */
export const renderTether = (
  context: CanvasContext,
  hostX: number,
  hostY: number,
  tetherStressTimer: number,
  tetherSnapTime: number = 180
): void => {
  const { ctx, centerX, centerY, offsetX, offsetY } = context;
  const screen = worldToScreen(hostX, hostY, offsetX, offsetY);

  ctx.globalCompositeOperation = 'screen';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);

  // Curved bezier for elastic feel
  const mx = (centerX + screen.x) / 2;
  const my = (centerY + screen.y) / 2 + 50; // Sag in the middle
  ctx.quadraticCurveTo(mx, my, screen.x, screen.y);

  // Color shifts from gold to red as stress increases
  const stress = Math.min(1, tetherStressTimer / tetherSnapTime);
  ctx.strokeStyle = `rgba(255, ${215 * (1 - stress)}, ${255 * stress}, ${0.5 + stress * 0.5})`;
  ctx.lineWidth = 1 + stress * 2;
  ctx.stroke();

  ctx.globalCompositeOperation = 'source-over';
};

/**
 * Render bond lines with gradient based on strength
 */
export const renderBondLines = (
  context: CanvasContext,
  entity: { x: number; y: number; id: string },
  playerX: number,
  playerY: number,
  bondStrength: number,
  maxDistance: number = 300
): void => {
  const dist = Math.hypot(entity.x - playerX, entity.y - playerY);

  // Don't render if too far or no bond
  if (dist >= maxDistance * 1.5 || bondStrength <= 0) return;

  const { ctx, centerX, centerY, offsetX, offsetY } = context;
  const screen = worldToScreen(entity.x, entity.y, offsetX, offsetY);

  ctx.globalCompositeOperation = 'screen';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(screen.x, screen.y);

  // Gradient from white (player) to gold (entity)
  const gradient = ctx.createLinearGradient(centerX, centerY, screen.x, screen.y);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${bondStrength})`);
  gradient.addColorStop(1, `rgba(255, 200, 100, ${bondStrength * 0.5})`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1 + bondStrength * 3;
  ctx.stroke();

  ctx.globalCompositeOperation = 'source-over';
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITIES (PLAYERS & AI)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render a generic entity with glow and optional chat bubble
 */
export const renderEntity = (
  context: CanvasContext,
  entity: RenderableEntity
): void => {
  const { ctx, width, height, offsetX, offsetY } = context;
  const screen = worldToScreen(entity.x, entity.y, offsetX, offsetY);

  // Viewport culling
  if (!isInViewport(screen.x, screen.y, width, height, 150)) return;

  const r = entity.radius || 60;

  // Entity glow
  ctx.globalCompositeOperation = 'screen';
  const grad = ctx.createRadialGradient(
    screen.x, screen.y, 2,
    screen.x, screen.y, Math.max(0, r)
  );

  const colorRgb = entity.color ? hexToRgb(entity.color) : { r: 255, g: 200, b: 100 };
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.4, `rgba(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b}, 0.6)`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Chat bubble (styled to match floating text)
  if (entity.currentMessage && entity.messageTime) {
    const msgAge = Date.now() - entity.messageTime;
    const msgAlpha = Math.min(1, (CHAT_BUBBLE_DURATION - msgAge) / 1000);

    if (msgAlpha > 0) {
      const bubbleY = screen.y - r - 30;

      ctx.globalCompositeOperation = 'source-over';
      ctx.font = '600 22px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(entity.currentMessage).width;

      // Bubble background
      ctx.fillStyle = `rgba(10, 10, 10, ${msgAlpha * 0.8})`;
      drawRoundedRect(ctx, screen.x - textWidth / 2 - 8, bubbleY - 10, textWidth + 16, 20, 10);
      ctx.fill();

      // Bubble text
      ctx.fillStyle = `rgba(255, 255, 255, ${msgAlpha})`;
      ctx.textAlign = 'center';
      ctx.fillText(entity.currentMessage, screen.x, bubbleY + 4);
    }
  }

  ctx.globalCompositeOperation = 'source-over';
};

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER (SELF)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render the local player with pulsing glow and messages
 */
export const renderPlayer = (
  context: CanvasContext,
  radius: number,
  messages: LocalMessage[],
  time: number
): void => {
  const { ctx, centerX, centerY } = context;

  // Pulsing animation
  const selfPulse = Math.sin(time / 1000) * 2;

  // Player glow gradient
  const selfGrad = ctx.createRadialGradient(
    centerX, centerY, 5,
    centerX, centerY, radius + selfPulse
  );
  selfGrad.addColorStop(0, '#FFFFFF');
  selfGrad.addColorStop(0.15, '#FFD700');
  selfGrad.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)');
  selfGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = selfGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + selfPulse, 0, Math.PI * 2);
  ctx.fill();

  // Player chat messages (stacked)
  ctx.globalCompositeOperation = 'source-over';
  messages.forEach((msg, i) => {
    const age = Date.now() - msg.time;
    const alpha = Math.min(1, (CHAT_BUBBLE_DURATION - age) / 1000);
    const yOffset = -radius - 40 - i * 30;

    if (alpha > 0) {
      ctx.font = '600 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillText(msg.text, centerX, centerY + yOffset);
    }
  });
};
