// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Minimap Component (Batch 1: World & Exploration)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useCallback, memo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { WORLD_SIZE, BEACONS } from '@/constants/game';
import { BIOMES, LANDMARKS, FOG_CELL_SIZE, BIOME_GRADIENTS } from '@/constants/world';
import { addAlpha } from '@/utils/colors';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

interface MinimapProps {
  size?: number;
  showFog?: boolean;
  showBeacons?: boolean;
  showLandmarks?: boolean;
  showBiomes?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** If true, renders inline without fixed positioning */
  inline?: boolean;
}

const DEFAULT_SIZE = 150;
const MARGIN = 16;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const Minimap = memo(function Minimap({
  size = DEFAULT_SIZE,
  showFog = true,
  showBeacons = true,
  showLandmarks = true,
  showBiomes = true,
  position = 'top-right',
  inline = false,
}: MinimapProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, exploration } = useGame();

  const scale = size / WORLD_SIZE;

  /**
   * Draw the minimap
   */
  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const state = gameState.gameState.current;
    if (!state) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background
    ctx.fillStyle = '#0a0a15';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, 8);
    ctx.fill();

    // Draw biomes
    if (showBiomes) {
      for (const biome of BIOMES) {
        const x1 = biome.bounds.x1 * scale;
        const y1 = biome.bounds.y1 * scale;
        const x2 = biome.bounds.x2 * scale;
        const y2 = biome.bounds.y2 * scale;

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        const colors = BIOME_GRADIENTS[biome.id] || { bg1: '#0a0a1a', bg2: '#0d0d20' };
        gradient.addColorStop(0, colors.bg1);
        gradient.addColorStop(1, colors.bg2);

        ctx.fillStyle = gradient;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

        // Biome border
        ctx.strokeStyle = addAlpha(biome.color, 0.3);
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      }
    }

    // Draw fog of war
    if (showFog && exploration) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';

      const cellScale = (FOG_CELL_SIZE * scale);
      const totalCells = Math.ceil(WORLD_SIZE / FOG_CELL_SIZE);

      for (let cellX = 0; cellX < totalCells; cellX++) {
        for (let cellY = 0; cellY < totalCells; cellY++) {
          const cellKey = `${cellX},${cellY}`;
          if (!exploration.exploredCells.has(cellKey)) {
            ctx.fillRect(
              cellX * cellScale,
              cellY * cellScale,
              cellScale + 0.5,
              cellScale + 0.5
            );
          }
        }
      }
    }

    // Draw beacons
    if (showBeacons) {
      const currentRealm = state.currentRealm || 'genesis';

      for (const beacon of state.beacons || BEACONS) {
        // Filter by Realm
        if (beacon.realmId && beacon.realmId !== currentRealm) continue;

        const x = beacon.x * scale;
        const y = beacon.y * scale;
        const isLit = beacon.lit;

        ctx.fillStyle = isLit ? beacon.color : addAlpha(beacon.color, 0.4);
        ctx.shadowColor = beacon.color;
        ctx.shadowBlur = isLit ? 8 : 2;

        ctx.beginPath();
        ctx.arc(x, y, isLit ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Count AI agents near this beacon (gathering indicator)
        const BEACON_GATHER_RADIUS = 150; // World units
        const nearbyCount = (state.aiAgents || []).filter((agent: any) => {
          const dx = agent.x - beacon.x;
          const dy = agent.y - beacon.y;
          return Math.sqrt(dx * dx + dy * dy) < BEACON_GATHER_RADIUS;
        }).length;

        // Draw gathering indicator if agents are nearby
        if (nearbyCount > 0) {
          // Draw count badge
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 8px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Badge background
          const badgeX = x + 5;
          const badgeY = y - 5;
          ctx.fillStyle = isLit ? '#22C55E' : '#6B7280';
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, 5, 0, Math.PI * 2);
          ctx.fill();

          // Badge text
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(String(nearbyCount), badgeX, badgeY);
        }
      }
    }

    // Draw landmarks
    if (showLandmarks) {
      for (const landmark of LANDMARKS) {
        const x = landmark.x * scale;
        const y = landmark.y * scale;

        // Check if discovered
        const isDiscovered = exploration?.discoveredLandmarks.includes(landmark.id);

        if (isDiscovered) {
          ctx.fillStyle = landmark.glow;
          ctx.shadowColor = landmark.glow;
          ctx.shadowBlur = 4;

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;
        }
      }
    }

    // Draw AI agents
    const currentRealm = state.currentRealm || 'genesis';
    for (const agent of state.aiAgents || []) {
      // Filter by Realm
      if (agent.realmId && agent.realmId !== currentRealm) continue;

      const x = agent.x * scale;
      const y = agent.y * scale;

      ctx.fillStyle = addAlpha(agent.color, 0.6);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player
    const playerX = state.playerX * scale;
    const playerY = state.playerY * scale;

    ctx.fillStyle = state.playerColor || '#FFD700';
    ctx.shadowColor = state.playerColor || '#FFD700';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.arc(playerX, playerY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player direction indicator
    const vx = state.playerVX || 0;
    const vy = state.playerVY || 0;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > 0.5) {
      const dirX = (vx / speed) * 8;
      const dirY = (vy / speed) * 8;

      ctx.strokeStyle = state.playerColor || '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playerX, playerY);
      ctx.lineTo(playerX + dirX, playerY + dirY);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, 8);
    ctx.stroke();

    // Draw View Radius Ring (Legacy Feature)
    // Helps players understand their connection/interaction range
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(playerX, playerY, (300 * scale), 0, Math.PI * 2); // 300 is MAX_CONNECTION_DIST
    ctx.stroke();
    ctx.setLineDash([]);
  }, [size, scale, showFog, showBeacons, showLandmarks, showBiomes, gameState, exploration]);

  // Redraw on animation frame
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      drawMinimap();
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [drawMinimap]);

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: MARGIN, left: MARGIN },
    'top-right': { top: MARGIN + 60, right: MARGIN },
    'bottom-left': { bottom: MARGIN + 60, left: MARGIN },
    'bottom-right': { bottom: MARGIN + 60, right: MARGIN },
  };

  const containerClass = inline
    ? "relative z-20 pointer-events-auto"
    : "fixed z-20 pointer-events-auto";

  return (
    <div
      className={containerClass}
      style={inline ? {} : positionStyles[position]}
    >
      {/* Current Biome/Area Name - ABOVE minimap */}
      {exploration?.currentBiome && (
        <div className="text-center mb-2">
          <span
            className="text-sm font-semibold px-3 py-1 rounded-lg inline-block"
            style={{
              background: addAlpha(exploration.currentBiome.color, 0.2),
              color: exploration.currentBiome.color,
              border: `1px solid ${addAlpha(exploration.currentBiome.color, 0.4)}`,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {exploration.currentBiome.name}
          </span>
        </div>
      )}

      {/* Minimap Canvas */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-lg shadow-lg"
        style={{
          background: 'rgba(10, 10, 20, 0.9)',
          backdropFilter: 'blur(4px)',
        }}
      />
    </div>
  );
});

export default Minimap;
