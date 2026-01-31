// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Mode Indicators Component
// Displays active game modes (ambient, seek, moment)
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Moon, Navigation, Camera } from 'lucide-react';
import { useGameModesContext } from '@/contexts/GameContext';

export function ModeIndicators(): JSX.Element | null {
  const gameModes = useGameModesContext();

  const hasActiveMode = gameModes.isInAmbientMode() || gameModes.isSeekModeActive() || gameModes.isMomentModeActive();

  if (!hasActiveMode) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Ambient Mode Indicator */}
      {gameModes.isInAmbientMode() && (
        <div className="bg-purple-900/50 rounded-lg px-3 py-2 border border-purple-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Moon size={14} className="text-purple-400" />
            <span className="text-xs text-purple-300 font-medium">
              {gameModes.ambientMode === 'firefly_watch' && '✨ Firefly Watch'}
              {gameModes.ambientMode === 'shrine_meditation' && '🧘 Meditating'}
              {gameModes.ambientMode === 'stargazing' && '🌌 Stargazing'}
              {gameModes.ambientMode === 'exploration' && '🧭 Free Exploration'}
            </span>
            <button
              onClick={() => gameModes.setAmbientMode('none')}
              className="ml-auto text-purple-400 hover:text-white text-xs"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {/* Seek Mode Indicator */}
      {gameModes.isSeekModeActive() && (
        <div className="bg-cyan-900/50 rounded-lg px-3 py-2 border border-cyan-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-cyan-400" />
            <span className="text-xs text-cyan-300 font-medium">
              Seeking: {gameModes.seekMode.targetType}
            </span>
            <div className="ml-auto w-8 h-1 bg-cyan-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all"
                style={{ width: `${gameModes.getSeekPulseProgress() * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Moment Mode Indicator */}
      {gameModes.isMomentModeActive() && (
        <div className="bg-amber-900/50 rounded-lg px-3 py-2 border border-amber-500/30 backdrop-blur-sm animate-pulse">
          <div className="flex items-center gap-2">
            <Camera size={14} className="text-amber-400" />
            <span className="text-xs text-amber-300 font-medium">
              📸 Moment Frozen ({Math.round(gameModes.getMomentDuration())}s)
            </span>
            <button
              onClick={() => gameModes.exitMomentMode()}
              className="ml-auto text-amber-400 hover:text-white text-xs"
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModeIndicators;
