/**
 * Game Mode Overlay Rendering
 * Ported from LEGACY/src/game/renderer.ts
 * 
 * Features:
 * - Tag Arena overlay (IT indicator, danger arrows, survival glow)
 * - Boost effect rendering (speed lines, glow)
 * - Navigation compass (distance from center)
 * - Voice proximity ring
 */

import type { CanvasContext } from './utils';
import type { TagGameState } from '@/game/tagArena';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface OverlayOptions {
  screenWidth: number;
  screenHeight: number;
}

export interface BoostState {
  active: boolean;
  type: 'speed' | 'shield' | 'magnet' | 'xp';
  remainingTime: number;
  totalDuration: number;
}

export interface VoiceProximityOptions {
  enabled: boolean;
  range: number;
  speakingPeers: Array<{ id: string; x: number; y: number; speaking: boolean }>;
  connectedPeers: Set<string>;
}

// ============================================================================
// Tag Arena Overlay
// ============================================================================

/**
 * Render Tag Arena game overlay
 * - Red vignette and "YOU ARE IT" banner when IT
 * - Danger arrows pointing to IT when not IT
 * - Survival glow effect
 */
export function renderTagOverlay(
  context: CanvasContext,
  tagState: TagGameState,
  playerId: string,
  playerX: number,
  playerY: number,
  itPlayerPosition: { x: number; y: number } | null,
  options: OverlayOptions
): void {
  if (!tagState.active) return;

  const { ctx } = context;
  const { screenWidth: W, screenHeight: H } = options;
  const isIt = tagState.itPlayerId === playerId;

  ctx.save();

  if (isIt) {
    // ═══════════════════════════════════════════════════════════════════
    // IT PLAYER OVERLAY
    // ═══════════════════════════════════════════════════════════════════

    // Red vignette edge
    const vignette = ctx.createRadialGradient(
      W / 2, H / 2, W * 0.3,
      W / 2, H / 2, W * 0.7
    );
    vignette.addColorStop(0, 'rgba(255, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(255, 0, 0, 0.15)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // "YOU ARE IT" banner
    ctx.fillStyle = 'rgba(255, 68, 102, 0.9)';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText('👑 YOU ARE IT!', W / 2, 80);
    ctx.fillText('👑 YOU ARE IT!', W / 2, 80);

  } else if (itPlayerPosition) {
    // ═══════════════════════════════════════════════════════════════════
    // NON-IT PLAYER OVERLAY
    // ═══════════════════════════════════════════════════════════════════

    const dx = itPlayerPosition.x - playerX;
    const dy = itPlayerPosition.y - playerY;
    const dist = Math.hypot(dx, dy);

    // Show danger arrow when IT is far away
    if (dist > 400) {
      const angle = Math.atan2(dy, dx);
      const arrowDist = Math.min(150, W * 0.25);
      const arrowX = W / 2 + Math.cos(angle) * arrowDist;
      const arrowY = H / 2 + Math.sin(angle) * arrowDist;

      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.rotate(angle);

      // Danger arrow
      ctx.fillStyle = 'rgba(255, 68, 102, 0.85)';
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-10, 10);
      ctx.lineTo(-10, -10);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Distance text
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 68, 102, 0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠️ ${Math.round(dist)}`, arrowX, arrowY + 25);
    }

    // Survival glow effect (green edge when safe)
    if (tagState.survivalTime > 0) {
      const pulseIntensity = Math.sin(tagState.survivalTime * 2) * 0.02 + 0.05;

      const safeGlow = ctx.createRadialGradient(
        W / 2, H / 2, W * 0.4,
        W / 2, H / 2, W * 0.7
      );
      safeGlow.addColorStop(0, 'rgba(68, 255, 136, 0)');
      safeGlow.addColorStop(1, `rgba(68, 255, 136, ${pulseIntensity})`);
      ctx.fillStyle = safeGlow;
      ctx.fillRect(0, 0, W, H);
    }
  }

  ctx.restore();
}

// ============================================================================
// Boost Effect Overlay
// ============================================================================

/**
 * Render boost effect overlay
 * - Speed lines radiating from center
 * - Colored glow based on boost type
 */
export function renderBoostOverlay(
  context: CanvasContext,
  boost: BoostState,
  options: OverlayOptions
): void {
  if (!boost.active) return;

  const { ctx } = context;
  const { screenWidth: W, screenHeight: H } = options;
  const progress = boost.remainingTime / boost.totalDuration;

  ctx.save();

  // Get color based on boost type
  const colors = getBoostColors(boost.type);

  // Radial glow from edges
  const glow = ctx.createRadialGradient(
    W / 2, H / 2, W * 0.3,
    W / 2, H / 2, W * 0.6
  );
  glow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  glow.addColorStop(1, colors.glow);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Speed lines (for speed boost)
  if (boost.type === 'speed') {
    renderSpeedLines(ctx, W, H, progress);
  }

  // Shield ring (for shield boost)
  if (boost.type === 'shield') {
    renderShieldRing(ctx, W, H, progress, colors.main);
  }

  // Magnet particles (for magnet boost)
  if (boost.type === 'magnet') {
    renderMagnetEffect(ctx, W, H, progress, colors.main);
  }

  ctx.restore();
}

/**
 * Get boost effect colors based on type
 */
function getBoostColors(type: BoostState['type']): { main: string; glow: string } {
  switch (type) {
    case 'speed':
      return { main: 'rgba(255, 215, 0, 0.8)', glow: 'rgba(255, 215, 0, 0.1)' };
    case 'shield':
      return { main: 'rgba(0, 206, 209, 0.8)', glow: 'rgba(0, 206, 209, 0.1)' };
    case 'magnet':
      return { main: 'rgba(255, 105, 180, 0.8)', glow: 'rgba(255, 105, 180, 0.1)' };
    case 'xp':
      return { main: 'rgba(123, 104, 238, 0.8)', glow: 'rgba(123, 104, 238, 0.1)' };
    default:
      return { main: 'rgba(255, 255, 255, 0.8)', glow: 'rgba(255, 255, 255, 0.1)' };
  }
}

/**
 * Render speed lines radiating from center
 */
function renderSpeedLines(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  progress: number
): void {
  const lineCount = 12;
  const time = Date.now() / 100;

  ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 * progress})`;
  ctx.lineWidth = 2;

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2 + time * 0.1;
    const innerRadius = W * 0.35 + Math.sin(time + i) * 20;
    const outerRadius = W * 0.5 + Math.sin(time + i * 0.5) * 30;

    const x1 = W / 2 + Math.cos(angle) * innerRadius;
    const y1 = H / 2 + Math.sin(angle) * innerRadius;
    const x2 = W / 2 + Math.cos(angle) * outerRadius;
    const y2 = H / 2 + Math.sin(angle) * outerRadius;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

/**
 * Render shield ring effect
 */
function renderShieldRing(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  progress: number,
  color: string
): void {
  const time = Date.now() / 1000;
  const radius = Math.min(W, H) * 0.35;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);
  ctx.lineDashOffset = time * 50;

  ctx.beginPath();
  ctx.arc(W / 2, H / 2, radius, 0, Math.PI * 2);
  ctx.globalAlpha = progress;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

/**
 * Render magnet attraction effect
 */
function renderMagnetEffect(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  progress: number,
  color: string
): void {
  const time = Date.now() / 500;
  const particleCount = 8;

  ctx.fillStyle = color;

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const dist = W * 0.3 * (1 - ((time + i) % 1));

    const x = W / 2 + Math.cos(angle) * dist;
    const y = H / 2 + Math.sin(angle) * dist;
    const size = 4 * progress * (1 - ((time + i) % 1));

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// Navigation Compass
// ============================================================================

/**
 * Render navigation compass showing distance from campfire center
 */
export function renderNavigationCompass(
  context: CanvasContext,
  playerX: number,
  playerY: number,
  campfireCenter: { x: number; y: number },
  campfireRadius: number,
  options: OverlayOptions
): void {
  const { ctx } = context;
  const { screenWidth: W, screenHeight: H } = options;

  const dx = campfireCenter.x - playerX;
  const dy = campfireCenter.y - playerY;
  const dist = Math.hypot(dx, dy);

  // Only show compass when far from center
  if (dist < campfireRadius * 0.5) return;

  ctx.save();

  // Position compass in top-right corner
  const compassX = W - 80;
  const compassY = 80;
  const compassRadius = 35;

  // Draw compass background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.arc(compassX, compassY, compassRadius + 5, 0, Math.PI * 2);
  ctx.fill();

  // Draw compass ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw direction arrow to center
  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(compassX, compassY);
  ctx.rotate(angle);

  // Arrow
  const isOutsideCampfire = dist > campfireRadius;
  ctx.fillStyle = isOutsideCampfire
    ? 'rgba(255, 107, 157, 0.9)'  // Pink when outside (danger)
    : 'rgba(78, 205, 196, 0.9)';  // Teal when inside (safe)

  ctx.beginPath();
  ctx.moveTo(compassRadius - 8, 0);
  ctx.lineTo(compassRadius - 20, -6);
  ctx.lineTo(compassRadius - 20, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Distance text
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.textAlign = 'center';

  if (dist >= 1000) {
    ctx.fillText(`${(dist / 1000).toFixed(1)}k`, compassX, compassY + compassRadius + 18);
  } else {
    ctx.fillText(`${Math.round(dist)}`, compassX, compassY + compassRadius + 18);
  }

  // Status text
  ctx.font = '8px Inter, sans-serif';
  ctx.fillStyle = isOutsideCampfire ? 'rgba(255, 107, 157, 0.8)' : 'rgba(78, 205, 196, 0.8)';
  ctx.fillText(isOutsideCampfire ? 'OUTSIDE' : 'INSIDE', compassX, compassY + compassRadius + 30);

  ctx.restore();
}

// ============================================================================
// Voice Proximity Ring
// ============================================================================

/**
 * Render voice proximity indicator ring
 */
export function renderVoiceProximityRing(
  context: CanvasContext,
  playerX: number,
  playerY: number,
  voiceOptions: VoiceProximityOptions,
  options: OverlayOptions
): void {
  if (!voiceOptions.enabled) return;

  const { ctx, offsetX, offsetY } = context;
  const { screenWidth: W, screenHeight: H } = options;

  // Check if any nearby speakers
  const nearbySpeakers = voiceOptions.speakingPeers.filter(
    (p) => Math.hypot(p.x - playerX, p.y - playerY) <= voiceOptions.range
  );

  if (nearbySpeakers.length === 0) return;

  ctx.save();

  // Convert player position to screen coordinates
  const screenX = playerX - offsetX + W / 2;
  const screenY = playerY - offsetY + H / 2;

  // Draw voice range circle
  const phase = (Date.now() % 4000) / 4000;
  ctx.beginPath();
  ctx.arc(screenX, screenY, voiceOptions.range, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(34, 197, 94, ${0.08 + Math.sin(phase * Math.PI * 2) * 0.03})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([10, 20]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw connection lines to speakers
  for (const peer of nearbySpeakers) {
    const isConnected = voiceOptions.connectedPeers.has(peer.id);
    const dist = Math.hypot(peer.x - playerX, peer.y - playerY);
    const alpha = (1 - dist / voiceOptions.range) * 0.3;

    if (isConnected) {
      const peerScreenX = peer.x - offsetX + W / 2;
      const peerScreenY = peer.y - offsetY + H / 2;

      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(peerScreenX, peerScreenY);
      ctx.strokeStyle = `rgba(34, 197, 94, ${alpha})`;
      ctx.lineWidth = peer.speaking ? 2 : 1;
      ctx.stroke();

      // Pulsing effect when speaking
      if (peer.speaking) {
        const pulsePhase = (Date.now() % 500) / 500;
        const midX = (screenX + peerScreenX) / 2;
        const midY = (screenY + peerScreenY) / 2;
        ctx.beginPath();
        ctx.arc(midX, midY, 4 + pulsePhase * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 197, 94, ${(1 - pulsePhase) * 0.6})`;
        ctx.fill();
      }
    }
  }

  ctx.restore();
}
