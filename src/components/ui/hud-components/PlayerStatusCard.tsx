// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Player Status Card Component
// Displays player level, XP, name, and social stats
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Users, Heart, Star, Flame } from 'lucide-react';
import { useProgressionContext, useSocialContext, useGameStateContext } from '@/contexts/GameContext';

interface PlayerStatusCardProps {
  isMobile?: boolean;
}

export function PlayerStatusCard({ isMobile = false }: PlayerStatusCardProps): JSX.Element {
  const { state: progressionState } = useProgressionContext();
  const { friends } = useSocialContext();
  const { gameState } = useGameStateContext();

  const bondsCount = gameState.current?.bonds?.length || 0;
  const starMemoriesCount = gameState.current?.bonds?.filter((b: any) => b.sealed)?.length || 0;

  // Mobile compact layout
  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        {/* Compact Level Badge */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold text-black border border-white/20 shadow-[0_0_10px_rgba(255,215,0,0.3)]">
          {progressionState.level}
        </div>
        {/* XP Bar only */}
        <div className="bg-black/40 h-1 w-16 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-300"
            style={{ width: `${(progressionState.xp / progressionState.xpToNextLevel) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // Desktop full layout
  return (
    <div className="flex items-center gap-3">
      {/* Level Badge */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black border-2 border-white/20 shadow-[0_0_15px_rgba(255,215,0,0.4)]">
          {progressionState.level}
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center border border-white/20">
          <span className="text-[8px] text-white">★</span>
        </div>
      </div>

      {/* Player Info */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 to-amber-300 drop-shadow-sm">
            Avestella Soul
          </span>
          {progressionState.dailyLoginStreak > 0 && (
            <div className="flex items-center gap-0.5 text-orange-400">
              <Flame size={10} />
              <span className="text-[10px] font-bold">{progressionState.dailyLoginStreak}</span>
            </div>
          )}
        </div>

        {/* Social Stats Row */}
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex gap-1.5 text-[10px] text-white/50">
            <span className="flex items-center gap-0.5">
              <Users size={8} className="text-blue-400" /> {friends.length}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart size={8} className="text-pink-400" /> {bondsCount}
            </span>
            <span className="flex items-center gap-0.5">
              <Star size={8} className="text-amber-400" /> {starMemoriesCount}
            </span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="bg-black/40 h-1.5 w-32 rounded-full mt-1 overflow-hidden border border-white/10 backdrop-blur-sm">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-300 shadow-[0_0_10px_#fbbf24]"
            style={{ width: `${(progressionState.xp / progressionState.xpToNextLevel) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default PlayerStatusCard;
