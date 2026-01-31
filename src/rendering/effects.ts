/**
 * Visual effects rendering - particles, ripples, shockwaves, fragments, echoes
 * Ported from legacy_3/src/rendering/effects.ts
 */

import type { CanvasContext } from './utils';
import { isInViewport, worldToScreen, hexToRgb } from './utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Fragment {
  x: number;
  y: number;
  phase: number;
}

export interface Echo {
  id: string;
  x: number;
  y: number;
  text: string;
  uid: string;
  name: string;
  createdAt: number;
}

export interface ScreenFlash {
  color: string;
  intensity: number;
  decay: number;
}

export interface ParticleData {
  x: number;
  y: number;
  life: number;
  size: number;
  color: string;
}

export interface RippleData {
  x: number;
  y: number;
  radius: number;
  life: number;
}

export interface ShockwaveData {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRAGMENTS - Collectible light orbs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render pulsing golden light fragments
 */
export const renderFragments = (
  context: CanvasContext,
  fragments: Fragment[],
  time: number
): void => {
  const { ctx, width, height, offsetX, offsetY } = context;
  
  fragments.forEach(fragment => {
    const screen = worldToScreen(fragment.x, fragment.y, offsetX, offsetY);
    
    // Viewport culling for performance
    if (!isInViewport(screen.x, screen.y, width, height, 50)) return;
    
    // Pulsing animation based on phase
    const pulse = Math.sin((time / 500) + fragment.phase) * 5;
    
    // Use screen blend mode for additive glow
    ctx.globalCompositeOperation = 'screen';
    
    // Create radial gradient for glow effect
    const grad = ctx.createRadialGradient(
      screen.x, screen.y, 1,
      screen.x, screen.y, 25 + pulse
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.3, 'rgba(255, 215, 0, 0.6)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 25 + pulse, 0, Math.PI * 2);
    ctx.fill();
    
    // Bright core
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';
};

// ═══════════════════════════════════════════════════════════════════════════════
// ECHOES - Persistent player messages
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render echo messages left by players
 */
export const renderEchoes = (
  context: CanvasContext,
  echoes: Echo[],
  playerX: number,
  playerY: number
): void => {
  const { ctx, width, height, offsetX, offsetY } = context;
  
  echoes.forEach(echo => {
    const screen = worldToScreen(echo.x, echo.y, offsetX, offsetY);
    
    // Viewport culling
    if (!isInViewport(screen.x, screen.y, width, height, 100)) return;
    
    // Purple glow for echoes
    ctx.globalCompositeOperation = 'screen';
    const grad = ctx.createRadialGradient(
      screen.x, screen.y, 5,
      screen.x, screen.y, 40
    );
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Show message if player is near
    const distToPlayer = Math.hypot(playerX - echo.x, playerY - echo.y);
    if (distToPlayer < 100) {
      ctx.globalCompositeOperation = 'source-over';
      
      // Message text
      ctx.font = '11px sans-serif';
      ctx.fillStyle = 'rgba(167, 139, 250, 0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(echo.text, screen.x, screen.y - 50);
      
      // Author name
      ctx.font = '9px sans-serif';
      ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
      ctx.fillText(`- ${echo.name}`, screen.x, screen.y - 35);
    }
  });
  
  ctx.globalCompositeOperation = 'source-over';
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render particles with screen blend mode
 */
export const renderParticles = (
  context: CanvasContext,
  particles: ParticleData[]
): void => {
  const { ctx, offsetX, offsetY } = context;
  
  ctx.globalCompositeOperation = 'screen';
  
  particles.forEach(particle => {
    const screen = worldToScreen(particle.x, particle.y, offsetX, offsetY);
    
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.life;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
};

// ═══════════════════════════════════════════════════════════════════════════════
// RIPPLES - Ambient breathing rings
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render expanding ripple rings
 */
export const renderRipples = (
  context: CanvasContext,
  ripples: RippleData[]
): void => {
  const { ctx, offsetX, offsetY } = context;
  
  ctx.globalCompositeOperation = 'screen';
  
  ripples.forEach(ripple => {
    const screen = worldToScreen(ripple.x, ripple.y, offsetX, offsetY);
    
    ctx.strokeStyle = `rgba(255, 215, 0, ${ripple.life * 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, ripple.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
  
  ctx.globalCompositeOperation = 'source-over';
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHOCKWAVES - Major event effects
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render expanding shockwave rings
 */
export const renderShockwaves = (
  context: CanvasContext,
  shockwaves: ShockwaveData[]
): void => {
  const { ctx, offsetX, offsetY } = context;
  
  ctx.globalCompositeOperation = 'screen';
  
  shockwaves.forEach(wave => {
    const screen = worldToScreen(wave.x, wave.y, offsetX, offsetY);
    
    // Gradient ring effect
    const waveGrad = ctx.createRadialGradient(
      screen.x, screen.y, Math.max(0, wave.radius - 80),
      screen.x, screen.y, wave.radius
    );
    waveGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    waveGrad.addColorStop(0.5, `rgba(253, 186, 19, ${wave.alpha})`);
    waveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = waveGrad;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, wave.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.globalCompositeOperation = 'source-over';
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN EFFECTS - Full-screen visual effects
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render a screen-wide flash effect
 */
export const renderScreenFlash = (
  context: CanvasContext,
  flash: ScreenFlash
): void => {
  if (flash.intensity <= 0) return;
  
  const { ctx, width, height, centerX, centerY } = context;
  
  // Radial gradient flash from center
  const flashGrad = ctx.createRadialGradient(
    centerX, centerY, height / 2,
    centerX, centerY, height
  );
  flashGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  
  // Convert intensity to hex alpha
  const alphaVal = Math.min(255, Math.max(0, Math.floor(flash.intensity * 255)));
  const alphaHex = alphaVal.toString(16).padStart(2, '0');
  
  try {
    flashGrad.addColorStop(1, `${flash.color}${alphaHex}`);
    ctx.fillStyle = flashGrad;
    ctx.fillRect(0, 0, width, height);
  } catch (e) {
    // Invalid color, skip
  }
};

/**
 * Render cold/darkness vignette effect at screen edges
 */
export const renderVignette = (
  context: CanvasContext,
  coldTimer: number,
  coldOnsetDelay: number = 8000
): void => {
  const { ctx, width, height, centerX, centerY } = context;
  
  // Only show vignette after cold onset delay
  const coldThreshold = coldOnsetDelay / 16; // Convert ms to frames (approx)
  if (coldTimer <= coldThreshold) return;
  
  ctx.globalCompositeOperation = 'source-over';
  
  // Calculate cold intensity (0 to 1)
  const coldRatio = Math.min(1, (coldTimer - coldThreshold) / 200);
  
  // Dark blue vignette from edges
  const vig = ctx.createRadialGradient(
    centerX, centerY, height / 3,
    centerX, centerY, height
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, `rgba(10, 20, 30, ${coldRatio * 0.9})`);
  
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
};

/**
 * Render warmth glow effect (opposite of vignette)
 */
export const renderWarmthGlow = (
  context: CanvasContext,
  warmthIntensity: number
): void => {
  if (warmthIntensity <= 0) return;
  
  const { ctx, width, height, centerX, centerY } = context;
  
  ctx.globalCompositeOperation = 'screen';
  
  // Warm golden glow from center
  const warmGrad = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, height / 2
  );
  warmGrad.addColorStop(0, `rgba(255, 200, 100, ${warmthIntensity * 0.1})`);
  warmGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = warmGrad;
  ctx.fillRect(0, 0, width, height);
  
  ctx.globalCompositeOperation = 'source-over';
};
