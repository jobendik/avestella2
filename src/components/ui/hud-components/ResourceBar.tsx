// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Resource Bar Component
// Displays currencies and resources (stardust, streak, etc.)
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Star, Flame } from 'lucide-react';
import { useProgressionContext } from '@/contexts/GameContext';

export function ResourceBar(): JSX.Element {
  const { state: progressionState } = useProgressionContext();

  return (
    <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
      {/* Stardust */}
      <div className="flex items-center gap-1.5">
        <Star size={14} className="text-amber-400 fill-amber-400" />
        <span className="text-white font-bold text-xs">{progressionState.stardust}</span>
      </div>

      <div className="w-px h-3 bg-white/20" />

      {/* Daily Login Streak */}
      <div className="flex items-center gap-1.5">
        <Flame size={14} className="text-orange-400" />
        <span className="text-white font-bold text-xs">{progressionState.dailyLoginStreak}</span>
      </div>
    </div>
  );
}

export default ResourceBar;
