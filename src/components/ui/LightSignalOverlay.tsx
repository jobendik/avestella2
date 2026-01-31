// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Light Signal Overlay (Batch 3: Communication)
// Renders expanding light signals on the game canvas
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LightSignal {
  id: string;
  playerId: string;
  type: 'ping' | 'beacon' | 'help' | 'follow' | 'celebrate';
  x: number;
  y: number;
  timestamp: number;
  expiresAt: number;
}

interface LightSignalOverlayProps {
  signals: LightSignal[];
  canvasWidth: number;
  canvasHeight: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal Config
// ─────────────────────────────────────────────────────────────────────────────

const SIGNAL_CONFIG = {
  ping: {
    color: '#4D96FF',
    maxRadius: 100,
    rings: 3,
    icon: '📍',
    pulseSpeed: 1.5,
  },
  beacon: {
    color: '#FFD700',
    maxRadius: 200,
    rings: 5,
    icon: '🔷',
    pulseSpeed: 1.0,
  },
  help: {
    color: '#FF6B6B',
    maxRadius: 150,
    rings: 4,
    icon: '🆘',
    pulseSpeed: 2.0,
  },
  follow: {
    color: '#50C878',
    maxRadius: 120,
    rings: 3,
    icon: '👣',
    pulseSpeed: 1.2,
  },
  celebrate: {
    color: '#E040FB',
    maxRadius: 180,
    rings: 6,
    icon: '🎆',
    pulseSpeed: 0.8,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Single Signal Component (using CSS animations)
// ─────────────────────────────────────────────────────────────────────────────

interface SignalProps {
  signal: LightSignal;
}

const Signal: React.FC<SignalProps> = ({ signal }) => {
  const config = SIGNAL_CONFIG[signal.type];
  const now = Date.now();
  const elapsed = now - signal.timestamp;
  const duration = signal.expiresAt - signal.timestamp;
  const progress = Math.min(1, elapsed / duration);
  const fadeOpacity = Math.max(0, 1 - progress);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: signal.x,
        top: signal.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Expanding rings */}
      {Array.from({ length: config.rings }).map((_, i) => {
        const delay = (i / config.rings) * (1000 / config.pulseSpeed);
        const animDuration = 1000 / config.pulseSpeed;
        
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: config.maxRadius * 2,
              height: config.maxRadius * 2,
              left: -config.maxRadius,
              top: -config.maxRadius,
              border: `2px solid ${config.color}`,
              opacity: fadeOpacity * 0.6,
              animation: `ping ${animDuration}ms ease-out infinite`,
              animationDelay: `${delay}ms`,
              boxShadow: `0 0 20px ${config.color}40, inset 0 0 20px ${config.color}20`,
            }}
          />
        );
      })}

      {/* Center glow */}
      <div
        className="absolute w-12 h-12 rounded-full flex items-center justify-center animate-pulse"
        style={{
          background: `radial-gradient(circle, ${config.color}80 0%, transparent 70%)`,
          left: -24,
          top: -24,
          opacity: fadeOpacity,
          boxShadow: `0 0 30px ${config.color}80`,
        }}
      >
        <span className="text-2xl">{config.icon}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Canvas-based Signal Renderer (for better performance)
// ─────────────────────────────────────────────────────────────────────────────

const LightSignalCanvas: React.FC<LightSignalOverlayProps> = ({
  signals,
  canvasWidth,
  canvasHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Filter active signals
  const activeSignals = useMemo(() => {
    const now = Date.now();
    return signals.filter(s => s.expiresAt > now);
  }, [signals]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      const now = Date.now();

      activeSignals.forEach(signal => {
        const config = SIGNAL_CONFIG[signal.type];
        const elapsed = now - signal.timestamp;
        const duration = signal.expiresAt - signal.timestamp;
        const progress = Math.min(1, elapsed / duration);
        const fadeOpacity = Math.max(0, 1 - progress);

        if (fadeOpacity <= 0) return;

        // Draw expanding rings
        for (let i = 0; i < config.rings; i++) {
          const ringProgress = ((elapsed / (1000 / config.pulseSpeed)) + (i / config.rings)) % 1;
          const radius = ringProgress * config.maxRadius;
          const ringOpacity = fadeOpacity * (1 - ringProgress) * 0.6;

          if (ringOpacity <= 0) continue;

          ctx.beginPath();
          ctx.arc(signal.x, signal.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = config.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = ringOpacity;
          ctx.stroke();
          ctx.closePath();
        }

        // Draw center glow
        const gradient = ctx.createRadialGradient(
          signal.x, signal.y, 0,
          signal.x, signal.y, 30
        );
        gradient.addColorStop(0, config.color + 'cc');
        gradient.addColorStop(0.5, config.color + '40');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(signal.x, signal.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = fadeOpacity;
        ctx.fill();
        ctx.closePath();

        ctx.globalAlpha = 1;
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeSignals, canvasWidth, canvasHeight]);

  if (activeSignals.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="absolute inset-0 pointer-events-none"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component (uses CSS for icons, canvas for rings)
// ─────────────────────────────────────────────────────────────────────────────

export const LightSignalOverlay: React.FC<LightSignalOverlayProps> = ({
  signals,
  canvasWidth,
  canvasHeight,
}) => {
  // Filter active signals
  const activeSignals = useMemo(() => {
    const now = Date.now();
    return signals.filter(s => s.expiresAt > now);
  }, [signals]);

  if (activeSignals.length === 0) return null;

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {/* Canvas layer for animated rings */}
      <LightSignalCanvas
        signals={signals}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />

      {/* Icon layer */}
      {activeSignals.map(signal => {
        const config = SIGNAL_CONFIG[signal.type];
        const now = Date.now();
        const progress = Math.min(1, (now - signal.timestamp) / (signal.expiresAt - signal.timestamp));
        const fadeOpacity = Math.max(0, 1 - progress);

        return (
          <div
            key={signal.id}
            className="absolute animate-pulse"
            style={{
              left: signal.x,
              top: signal.y,
              transform: 'translate(-50%, -50%)',
              opacity: fadeOpacity,
            }}
          >
            <span className="text-3xl drop-shadow-lg">{config.icon}</span>
          </div>
        );
      })}
    </div>
  );
};

export default LightSignalOverlay;
