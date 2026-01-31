// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - World Map Panel (Batch 5: Wiring)
// Full-screen world map with points of interest
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useMemo } from 'react';
import { X, Compass, MapPin, Sparkles, Star } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { 
  useGameStateContext, 
  useExplorationContext,
  useProgressionContext
} from '@/contexts/GameContext';
import { WORLD_SIZE, BEACONS } from '@/constants/game';
import { BIOMES, LANDMARKS, POINTS_OF_INTEREST, getBiomeAtPosition } from '@/constants/world';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function WorldMapPanel(): JSX.Element {
  const { closePanel } = useUI();
  const gameState = useGameStateContext();
  const progression = useProgressionContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const state = gameState.gameState.current;
  const playerX = state?.playerX || WORLD_SIZE / 2;
  const playerY = state?.playerY || WORLD_SIZE / 2;
  const beacons = state?.beacons || [];

  // Calculate map scale
  const mapSize = 600;
  const scale = mapSize / WORLD_SIZE;

  // Draw the map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, mapSize, mapSize);

    // Draw biome regions (using bounds)
    BIOMES.forEach(biome => {
      ctx.fillStyle = biome.color + '30'; // Semi-transparent
      const x1 = biome.bounds.x1 * scale;
      const y1 = biome.bounds.y1 * scale;
      const w = (biome.bounds.x2 - biome.bounds.x1) * scale;
      const h = (biome.bounds.y2 - biome.bounds.y1) * scale;
      ctx.fillRect(x1, y1, w, h);
      
      // Biome label
      ctx.fillStyle = biome.color + '80';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(biome.name, x1 + w / 2, y1 + h / 2);
    });

    // Draw grid
    ctx.strokeStyle = '#ffffff10';
    ctx.lineWidth = 1;
    const gridSize = 500;
    for (let x = 0; x <= WORLD_SIZE; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, mapSize);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_SIZE; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(mapSize, y * scale);
      ctx.stroke();
    }

    // Draw landmarks
    LANDMARKS.forEach(landmark => {
      const x = landmark.x * scale;
      const y = landmark.y * scale;
      
      ctx.fillStyle = '#FFD70080';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(landmark.name, x, y + 18);
    });

    // Draw beacons
    beacons.forEach((beacon: any) => {
      const x = beacon.x * scale;
      const y = beacon.y * scale;
      
      if (beacon.lit) {
        // Lit beacon - golden glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FFD70000');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FFD700';
      } else {
        ctx.fillStyle = '#666666';
      }
      
      // Beacon marker
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw points of interest
    POINTS_OF_INTEREST.forEach(poi => {
      const x = poi.x * scale;
      const y = poi.y * scale;
      
      ctx.fillStyle = '#00FFFF60';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw player position
    const px = playerX * scale;
    const py = playerY * scale;
    
    // Player glow
    const playerGradient = ctx.createRadialGradient(px, py, 0, px, py, 20);
    playerGradient.addColorStop(0, '#FFD700');
    playerGradient.addColorStop(1, '#FFD70000');
    ctx.fillStyle = playerGradient;
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Player dot
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.stroke();

    // "You are here" text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('You', px, py - 12);

  }, [playerX, playerY, beacons, mapSize, scale]);

  // Stats
  const beaconsLit = beacons.filter((b: any) => b.lit).length;
  const totalBeacons = beacons.length;

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={closePanel}
    >
      <div
        className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-2 border-cyan-500/30 rounded-2xl shadow-2xl max-w-[700px] w-full overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900/80 to-blue-900/80 backdrop-blur-md p-4 border-b border-cyan-500/30">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
              <Compass className="w-6 h-6" />
              World Map
            </h2>
            <button
              onClick={closePanel}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="p-4 flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={mapSize}
              height={mapSize}
              className="rounded-lg border border-white/10"
            />
            
            {/* Map Legend */}
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="text-white/70">You</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-600" />
                <span className="text-white/70">Lit Beacon</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-white/70">Unlit Beacon</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400/60" />
                <span className="text-white/70">Point of Interest</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-black/30">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-cyan-400">{beaconsLit}/{totalBeacons}</div>
              <div className="text-xs text-white/50">Beacons Lit</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{progression.state.level}</div>
              <div className="text-xs text-white/50">Your Level</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{LANDMARKS.length}</div>
              <div className="text-xs text-white/50">Landmarks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorldMapPanel;
