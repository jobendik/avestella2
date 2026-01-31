// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Ambient Mode Selector Panel
// UI for entering special ambient/relaxation modes
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useGameModesContext } from '@/contexts/GameContext';
import type { AmbientModeType } from '@/hooks/useGameModes';

interface AmbientModeOption {
  id: AmbientModeType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const AMBIENT_MODES: AmbientModeOption[] = [
  {
    id: 'firefly_watch',
    name: 'Firefly Watch',
    description: 'Relax and watch fireflies dance in the darkness',
    icon: '✨',
    color: '#FFFF66',
  },
  {
    id: 'shrine_meditation',
    name: 'Shrine Meditation',
    description: 'Find peace at a beacon and meditate',
    icon: '🧘',
    color: '#9333EA',
  },
  {
    id: 'stargazing',
    name: 'Stargazing',
    description: 'Gaze at the constellations above',
    icon: '🌌',
    color: '#3B82F6',
  },
  {
    id: 'exploration',
    name: 'Free Exploration',
    description: 'Explore without HUD distractions',
    icon: '🧭',
    color: '#22C55E',
  },
];

interface AmbientModeSelectorProps {
  onClose?: () => void;
}

export function AmbientModeSelector({ onClose }: AmbientModeSelectorProps): JSX.Element {
  const gameModes = useGameModesContext();

  const handleSelectMode = (mode: AmbientModeType) => {
    gameModes.setAmbientMode(mode);
    onClose?.();
  };

  const handleExitMode = () => {
    gameModes.setAmbientMode('none');
    onClose?.();
  };

  const isInAmbientMode = gameModes.isInAmbientMode();
  const currentMode = gameModes.ambientMode;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-4 w-80 border border-purple-500/30 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">🌙</span>
          Ambient Modes
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-slate-400 mb-4">
        Enter a relaxation mode for peaceful exploration and mindfulness.
      </p>

      {/* Current Mode Indicator */}
      {isInAmbientMode && (
        <div 
          className="mb-4 p-3 rounded-lg border flex items-center justify-between"
          style={{ 
            backgroundColor: `${AMBIENT_MODES.find(m => m.id === currentMode)?.color}20`,
            borderColor: `${AMBIENT_MODES.find(m => m.id === currentMode)?.color}50`
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {AMBIENT_MODES.find(m => m.id === currentMode)?.icon}
            </span>
            <span className="text-white text-sm font-medium">
              Currently: {AMBIENT_MODES.find(m => m.id === currentMode)?.name}
            </span>
          </div>
          <button
            onClick={handleExitMode}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 
                       text-xs rounded-full transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {/* Mode Options */}
      <div className="space-y-2">
        {AMBIENT_MODES.map((mode) => {
          const isActive = currentMode === mode.id;
          
          return (
            <button
              key={mode.id}
              onClick={() => handleSelectMode(mode.id)}
              disabled={isActive}
              className={`
                w-full p-3 rounded-lg text-left transition-all
                ${isActive 
                  ? 'bg-purple-500/30 border-purple-500 cursor-default' 
                  : 'bg-slate-800/50 hover:bg-slate-700/50 border-transparent hover:border-purple-500/30'
                }
                border
              `}
              style={isActive ? { borderColor: mode.color } : {}}
            >
              <div className="flex items-start gap-3">
                <span 
                  className="text-2xl"
                  style={{ filter: isActive ? 'none' : 'grayscale(0.3)' }}
                >
                  {mode.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span 
                      className="font-medium"
                      style={{ color: isActive ? mode.color : '#E2E8F0' }}
                    >
                      {mode.name}
                    </span>
                    {isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {mode.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Effects Info */}
      {isInAmbientMode && (
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <h4 className="text-xs font-medium text-slate-300 mb-2">Active Effects:</h4>
          <div className="flex flex-wrap gap-2">
            {gameModes.getAmbientModeEffects().hideHUD && (
              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                HUD Hidden
              </span>
            )}
            {gameModes.getAmbientModeEffects().reducedParticles && (
              <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                Calm Visuals
              </span>
            )}
            {gameModes.getAmbientModeEffects().specialCamera && (
              <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded">
                Special Camera
              </span>
            )}
            {gameModes.getAmbientModeEffects().musicOverride && (
              <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
                Ambient Music
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tip */}
      <p className="text-xs text-slate-500 mt-4 text-center">
        💡 Press ESC to exit ambient mode at any time
      </p>
    </div>
  );
}

export default AmbientModeSelector;
