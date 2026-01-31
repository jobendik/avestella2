// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Stats Display Component
// Shows light level, nearby souls, ladder tier, and fragments
// ═══════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { Sparkles, Users } from 'lucide-react';
import { useGameStateContext, useProgressionContext } from '@/contexts/GameContext';
import { LADDER_TIERS, getCurrentTier } from '@/constants/progression';

export function StatsDisplay(): JSX.Element {
  const { gameState } = useGameStateContext();
  const { state: progressionState } = useProgressionContext();

  const playerRadius = gameState.current?.playerRadius || 50;
  const fragmentsCollected = gameState.current?.fragmentsCollected || 0;
  const lightLevel = Math.round(((playerRadius - 30) / (180 - 30)) * 100);

  const nearbyAgentsCount = gameState.current?.aiAgents?.filter((a: any) => {
    if (!gameState.current) return false;
    const dx = a.x - gameState.current.playerX;
    const dy = a.y - gameState.current.playerY;
    return Math.sqrt(dx * dx + dy * dy) < 200;
  }).length || 0;

  const totalSoulsMet = gameState.current?.totalBonds || 0;

  // Ladder tier calculation
  const ladderScore = fragmentsCollected + (progressionState.stardust || 0);
  const currentLadderTier = useMemo(() => getCurrentTier(ladderScore), [ladderScore]);
  const nextTierIndex = LADDER_TIERS.findIndex(t => t.minPoints > ladderScore);
  const nextTier = nextTierIndex >= 0 ? LADDER_TIERS[nextTierIndex] : null;
  const progressToNextTier = nextTier
    ? ((ladderScore - currentLadderTier.minPoints) / (nextTier.minPoints - currentLadderTier.minPoints)) * 100
    : 100;

  return (
    <div className="flex flex-col gap-2">
      {/* Fragment Counter */}
      <div className="flex items-center gap-2 text-xs text-white/60">
        <Sparkles size={12} className="text-amber-400" />
        <span>{fragmentsCollected} fragments</span>
      </div>

      {/* Light Level Bar */}
      <div className="bg-black/40 rounded-lg p-2 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/40">LIGHT</span>
          <span className="text-[10px] text-amber-400 font-bold">{lightLevel}%</span>
        </div>
        <div className="h-2 w-28 rounded-full bg-black/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-white transition-all duration-300"
            style={{ width: `${lightLevel}%` }}
          />
        </div>
      </div>

      {/* Nearby Souls & Total Met */}
      <div className="flex gap-3 text-[10px]">
        <div className="bg-black/40 rounded-lg px-2 py-1 border border-white/10 flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white/60">{nearbyAgentsCount} nearby</span>
        </div>
        <div className="bg-black/40 rounded-lg px-2 py-1 border border-white/10 flex items-center gap-1">
          <Users size={10} className="text-purple-400" />
          <span className="text-white/60">{totalSoulsMet} met</span>
        </div>
      </div>

      {/* Ladder Tier Display */}
      <div className="bg-black/40 rounded-lg p-2 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{currentLadderTier.icon}</span>
          <div>
            <span
              className="text-xs font-bold"
              style={{ color: currentLadderTier.color }}
            >
              {currentLadderTier.name}
            </span>
            {nextTier && (
              <span className="text-[9px] text-white/40 ml-1">
                → {nextTier.name}
              </span>
            )}
          </div>
        </div>
        <div className="h-1.5 w-28 rounded-full bg-black/60 overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progressToNextTier}%`,
              background: `linear-gradient(90deg, ${currentLadderTier.color}, ${nextTier?.color || currentLadderTier.color})`
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-white/30">{ladderScore} pts</span>
          {nextTier && (
            <span className="text-[8px] text-white/30">{nextTier.minPoints} pts</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatsDisplay;
