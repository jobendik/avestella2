// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Cosmetic Preview (Batch 2: Personalization)
// Animated previews for trails, auras, and colors
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useCallback } from 'react';
import {
  TRAIL_STYLES,
  LIGHT_COLORS,
  AURA_EFFECTS,
  AVATAR_FRAMES,
} from '@/constants/cosmetics';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CosmeticPreviewProps {
  type: 'trail' | 'color' | 'aura' | 'frame';
  itemId: string;
  size?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trail Preview Canvas
// ─────────────────────────────────────────────────────────────────────────────

const TrailPreview: React.FC<{ trailId: string; size: number }> = ({ trailId, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const angleRef = useRef(0);

  const trail = TRAIL_STYLES[trailId];
  const color = trail ? '#FFD700' : '#FFA500';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const orbitRadius = size * 0.3;

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, size, size);

      // Orbit the light
      angleRef.current += 0.03;
      const lightX = centerX + Math.cos(angleRef.current) * orbitRadius;
      const lightY = centerY + Math.sin(angleRef.current) * orbitRadius;

      // Create trail particles
      const trailType = trailId;
      for (let i = 0; i < 2; i++) {
        particlesRef.current.push({
          x: lightX + (Math.random() - 0.5) * 8,
          y: lightY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 1,
          maxLife: 1,
          size: 2 + Math.random() * 3,
          color: getTrailColor(trailType, angleRef.current),
          alpha: 1,
        });
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.alpha = p.life;
        p.size *= 0.98;

        if (p.life <= 0) return false;

        ctx.globalAlpha = p.alpha * 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        return true;
      });

      // Draw main light
      ctx.globalAlpha = 1;
      const gradient = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 12);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + '80');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(lightX, lightY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      ctx.beginPath();
      ctx.arc(lightX, lightY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [trailId, size, color]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
      style={{ background: 'radial-gradient(circle, #1a1a2e 0%, #0f0f1a 100%)' }}
    />
  );
};

// Get trail-specific color
function getTrailColor(trailId: string, angle: number): string {
  switch (trailId) {
    case 'rainbow':
      return `hsl(${(angle * 60) % 360}, 80%, 60%)`;
    case 'flame':
      return Math.random() > 0.5 ? '#FF6B35' : '#FFD700';
    case 'frost':
      return Math.random() > 0.5 ? '#E0FFFF' : '#00CED1';
    case 'galaxy':
      return Math.random() > 0.5 ? '#E040FB' : '#9B59B6';
    case 'hearts':
      return '#FF69B4';
    case 'stardust':
      return '#FFD700';
    case 'aurora':
      return `hsl(${120 + Math.sin(angle) * 60}, 70%, 50%)`;
    default:
      return '#FFA500';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Aura Preview Canvas
// ─────────────────────────────────────────────────────────────────────────────

const AuraPreview: React.FC<{ auraId: string; size: number }> = ({ auraId, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  const aura = AURA_EFFECTS[auraId];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, size, size);

      timeRef.current += 0.02;

      // Draw aura effect based on type
      drawAuraEffect(ctx, auraId, centerX, centerY, size, timeRef.current, particlesRef);

      // Draw center light
      ctx.globalAlpha = 1;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 15);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.3, '#FFA500');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [auraId, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
      style={{ background: 'radial-gradient(circle, #1a1a2e 0%, #0f0f1a 100%)' }}
    />
  );
};

function drawAuraEffect(
  ctx: CanvasRenderingContext2D,
  auraId: string,
  cx: number,
  cy: number,
  size: number,
  time: number,
  particlesRef: React.MutableRefObject<Particle[]>
) {
  switch (auraId) {
    case 'gentle':
      // Pulsing glow
      const pulseRadius = 25 + Math.sin(time * 2) * 8;
      ctx.globalAlpha = 0.3 + Math.sin(time * 2) * 0.1;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseRadius);
      gradient.addColorStop(0, '#FFA500');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'radiant':
      // Rays of light
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + time * 0.5;
        const length = 30 + Math.sin(time * 3 + i) * 10;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
        ctx.stroke();
      }
      break;

    case 'ethereal':
      // Ghostly wisps
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + time;
        const radius = 20 + Math.sin(time * 2 + i) * 10;
        const wx = cx + Math.cos(angle) * radius;
        const wy = cy + Math.sin(angle) * radius;
        const grad = ctx.createRadialGradient(wx, wy, 0, wx, wy, 8);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(wx, wy, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'electric':
      // Lightning bolts
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#4D96FF';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        if (Math.random() > 0.7) {
          const angle = Math.random() * Math.PI * 2;
          let x = cx;
          let y = cy;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let j = 0; j < 4; j++) {
            x += Math.cos(angle + (Math.random() - 0.5)) * 8;
            y += Math.sin(angle + (Math.random() - 0.5)) * 8;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      break;

    case 'flames':
      // Fire particles
      if (Math.random() > 0.5) {
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -1 - Math.random() * 0.5,
          life: 1,
          maxLife: 1,
          size: 3 + Math.random() * 4,
          color: Math.random() > 0.5 ? '#FF6B35' : '#FFD700',
          alpha: 1,
        });
      }
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        p.alpha = p.life;
        if (p.life <= 0) return false;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        return true;
      });
      break;

    case 'frost':
      // Ice crystals
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + time * 0.3;
        const dist = 25 + Math.sin(time * 2 + i * 0.5) * 5;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        ctx.fillStyle = '#E0FFFF';
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x + 3, y);
        ctx.lineTo(x, y + 4);
        ctx.lineTo(x - 3, y);
        ctx.closePath();
        ctx.fill();
      }
      break;

    case 'celestial':
      // Orbiting stars
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + time * 0.5;
        const dist = 30;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        ctx.globalAlpha = 0.6 + Math.sin(time * 3 + i) * 0.3;
        ctx.fillStyle = '#FFEB3B';
        drawStar(ctx, x, y, 4, 5, 0.5);
      }
      break;

    case 'void':
      // Dark swirl
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + time;
        const dist = 15 + (i / 12) * 20;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 5);
        grad.addColorStop(0, '#1A1A2E');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'legendary':
      // Crown effect
      ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.2;
      const crownGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 35);
      crownGrad.addColorStop(0, '#FFD700');
      crownGrad.addColorStop(0.5, '#FFA500');
      crownGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = crownGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.fill();
      // Crown spikes
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI - Math.PI / 2 + Math.PI / 10;
        const tipX = cx + Math.cos(angle) * 40;
        const tipY = cy + Math.sin(angle) * 40 - 5;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - 4, tipY + 10);
        ctx.lineTo(tipX + 4, tipY + 10);
        ctx.closePath();
        ctx.fill();
      }
      break;
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, spikes: number, inset: number) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? size : size * inset;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame Preview
// ─────────────────────────────────────────────────────────────────────────────

const FramePreview: React.FC<{ frameId: string; size: number }> = ({ frameId, size }) => {
  const frame = AVATAR_FRAMES[frameId];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      timeRef.current += 0.02;

      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.35;

      // Background glow
      if (frame?.glowColor) {
        ctx.globalAlpha = 0.3 + Math.sin(timeRef.current * 2) * 0.1;
        const glow = ctx.createRadialGradient(cx, cy, radius, cx, cy, radius + 15);
        glow.addColorStop(0, frame.glowColor);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Avatar circle (placeholder)
      ctx.globalAlpha = 1;
      const avatarGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      avatarGrad.addColorStop(0, '#FFA500');
      avatarGrad.addColorStop(1, '#FF6B35');
      ctx.fillStyle = avatarGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Frame border
      if (frame && frame.borderWidth > 0) {
        ctx.strokeStyle = frame.borderColor;
        ctx.lineWidth = frame.borderWidth;
        
        // Animated dash for animated frames
        if (frame.animated) {
          ctx.setLineDash([8, 4]);
          ctx.lineDashOffset = -timeRef.current * 20;
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius + frame.borderWidth / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Inner highlight
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [frameId, size, frame]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
      style={{ background: 'radial-gradient(circle, #1a1a2e 0%, #0f0f1a 100%)' }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Color Preview
// ─────────────────────────────────────────────────────────────────────────────

const ColorPreview: React.FC<{ colorId: string; size: number }> = ({ colorId, size }) => {
  const colorData = LIGHT_COLORS[colorId];
  const color = colorData?.color || '#FFA500';
  const isRainbow = color === 'rainbow';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, size, size);

      timeRef.current += 0.02;
      const cx = size / 2;
      const cy = size / 2;

      // Pulsing effect
      const pulseSize = 20 + Math.sin(timeRef.current * 3) * 5;
      
      // Get color (rainbow cycles)
      const displayColor = isRainbow
        ? `hsl(${(timeRef.current * 50) % 360}, 80%, 60%)`
        : color;

      // Outer glow
      ctx.globalAlpha = 0.3;
      const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize + 15);
      outerGlow.addColorStop(0, displayColor);
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseSize + 15, 0, Math.PI * 2);
      ctx.fill();

      // Main light
      ctx.globalAlpha = 1;
      const mainGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize);
      mainGrad.addColorStop(0, '#FFFFFF');
      mainGrad.addColorStop(0.3, displayColor);
      mainGrad.addColorStop(1, displayColor + '00');
      ctx.fillStyle = mainGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
      ctx.fill();

      // Center core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [colorId, size, color, isRainbow]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
      style={{ background: 'radial-gradient(circle, #1a1a2e 0%, #0f0f1a 100%)' }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const CosmeticPreview: React.FC<CosmeticPreviewProps> = ({
  type,
  itemId,
  size = 100,
  className = '',
}) => {
  return (
    <div className={`inline-block ${className}`}>
      {type === 'trail' && <TrailPreview trailId={itemId} size={size} />}
      {type === 'aura' && <AuraPreview auraId={itemId} size={size} />}
      {type === 'frame' && <FramePreview frameId={itemId} size={size} />}
      {type === 'color' && <ColorPreview colorId={itemId} size={size} />}
    </div>
  );
};

export default CosmeticPreview;
