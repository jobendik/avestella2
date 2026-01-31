import React, { useState } from 'react';
import { useUI } from '@/contexts/UIContext';
import { useGame } from '@/contexts/GameContext';
import {
  Sparkles, X, Volume2, VolumeX, Eye, Monitor,
  Zap, Palette, MousePointer2, Bell, RefreshCw,
  Accessibility, Vibrate, User
} from 'lucide-react';

export function SettingsPanel() {
  const { closePanel } = useUI();
  const { audio, settings, gameState, tutorial } = useGame();
  const {
    settings: gameSettings,
    toggleSetting,
    cycleColorblindMode,
    cycleParticleDensity,
    updateSetting,
    resetSettings
  } = settings;

  // Player name state
  const [playerName, setPlayerName] = useState(gameState.gameState.current?.playerName || 'Wanderer');
  const [isEditingName, setIsEditingName] = useState(false);

  const handleNameChange = (newName: string) => {
    setPlayerName(newName);
  };

  const handleNameSubmit = () => {
    if (gameState.updatePlayerName) {
      gameState.updatePlayerName(playerName.trim() || 'Wanderer');
    }
    setIsEditingName(false);
  };

  const colorblindLabels: Record<string, string> = {
    none: 'None',
    protanopia: 'Protanopia (Red)',
    deuteranopia: 'Deuteranopia (Green)',
    tritanopia: 'Tritanopia (Blue)'
  };

  return (
    <div className="absolute top-16 right-4 w-96 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 p-4 z-20 pointer-events-auto max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          Settings
        </h3>
        <button onClick={closePanel} className="text-white/40 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Player Identity Settings */}
      <div className="mb-5">
        <label className="text-cyan-400 text-xs font-semibold mb-2 block uppercase tracking-wider">
          👤 Identity
        </label>
        <div className="space-y-2">
          {isEditingName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Enter your name..."
                maxLength={30}
                autoFocus
                className="flex-1 px-3 py-2.5 rounded-lg text-sm border bg-white/5 border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={handleNameSubmit}
                className="px-4 py-2.5 rounded-lg text-sm bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-all"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border transition-all bg-white/5 border-white/10 hover:bg-white/10 flex items-center justify-between text-white/80"
            >
              <div className="flex items-center gap-2">
                <User size={14} />
                <span>Player Name</span>
              </div>
              <span className="text-xs font-medium text-cyan-300">{playerName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Audio Settings */}
      <div className="mb-5">
        <label className="text-purple-400 text-xs font-semibold mb-2 block uppercase tracking-wider">
          🔊 Audio
        </label>
        <div className="space-y-2">
          <button
            onClick={() => audio.toggleMute()}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${audio.isMuted
                ? 'bg-red-500/20 border-red-500/30 text-red-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              {audio.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>Master Audio</span>
            </div>
            <span className="text-xs font-medium">{audio.isMuted ? 'MUTED' : 'ON'}</span>
          </button>

          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>Music Volume</span>
              <span>{Math.round(gameSettings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={gameSettings.musicVolume * 100}
              onChange={(e) => updateSetting('musicVolume', Number(e.target.value) / 100)}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>SFX Volume</span>
              <span>{Math.round(gameSettings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={gameSettings.sfxVolume * 100}
              onChange={(e) => updateSetting('sfxVolume', Number(e.target.value) / 100)}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Accessibility Settings */}
      <div className="mb-5">
        <label className="text-blue-400 text-xs font-semibold mb-2 block uppercase tracking-wider">
          ♿ Accessibility
        </label>
        <div className="space-y-2">
          <button
            onClick={() => toggleSetting('reducedMotion')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.reducedMotion
                ? 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <Monitor size={14} />
              <span>Reduced Motion</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.reducedMotion ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={cycleColorblindMode}
            className="w-full px-3 py-2.5 rounded-lg text-sm border transition-all bg-white/5 border-white/10 hover:bg-white/10 flex items-center justify-between text-white/80"
          >
            <div className="flex items-center gap-2">
              <Eye size={14} />
              <span>Colorblind Mode</span>
            </div>
            <span className="text-xs font-medium text-purple-300">
              {colorblindLabels[gameSettings.colorblindMode]}
            </span>
          </button>

          <button
            onClick={() => toggleSetting('highContrast')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.highContrast
                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <Accessibility size={14} />
              <span>High Contrast</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.highContrast ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => toggleSetting('screenReaderHints')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.screenReaderHints
                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <Bell size={14} />
              <span>Screen Reader Hints</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.screenReaderHints ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => toggleSetting('hapticFeedback')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.hapticFeedback
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <Vibrate size={14} />
              <span>Haptic Feedback</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.hapticFeedback ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Graphics Settings */}
      <div className="mb-5">
        <label className="text-amber-400 text-xs font-semibold mb-2 block uppercase tracking-wider">
          ✨ Graphics
        </label>
        <div className="space-y-2">
          <button
            onClick={cycleParticleDensity}
            className="w-full px-3 py-2.5 rounded-lg text-sm border transition-all bg-white/5 border-white/10 hover:bg-white/10 flex items-center justify-between text-white/80"
          >
            <div className="flex items-center gap-2">
              <Zap size={14} />
              <span>Particle Density</span>
            </div>
            <span className="text-xs font-medium text-amber-300 uppercase">
              {gameSettings.particleDensity}
            </span>
          </button>

          <button
            onClick={() => toggleSetting('glowEffects')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.glowEffects
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <Palette size={14} />
              <span>Glow Effects</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.glowEffects ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => toggleSetting('cameraShake')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.cameraShake
                ? 'bg-orange-500/20 border-orange-500/30 text-orange-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <MousePointer2 size={14} />
              <span>Camera Shake</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.cameraShake ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => toggleSetting('showFPS')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.showFPS
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <Monitor size={14} />
              <span>Show FPS Counter</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.showFPS ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Gameplay Settings */}
      <div className="mb-5">
        <label className="text-green-400 text-xs font-semibold mb-2 block uppercase tracking-wider">
          🎮 Gameplay
        </label>
        <div className="space-y-2">
          <button
            onClick={() => toggleSetting('autoSave')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.autoSave
                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={14} />
              <span>Auto-Save</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.autoSave ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => toggleSetting('tutorialHints')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.tutorialHints
                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <Bell size={14} />
              <span>Tutorial Hints</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.tutorialHints ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => {
              // Use context to replay tutorial
              // Note: We need to access useGame() to get the tutorial object if we updated the context
              // But inside this component, we can just grab it if we updated useGame hook usage?
              // The component uses `const { audio, settings, gameState } = useGame();`
              // We need to destructure tutorial from it.
              tutorial.replayTutorial();
              closePanel();
            }}
            className="w-full px-3 py-2.5 rounded-lg text-sm border transition-all bg-white/5 border-white/10 hover:bg-white/10 flex items-center justify-between text-white/80"
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={14} />
              <span>Reset Tutorial (Dev)</span>
            </div>
          </button>

          <button
            onClick={() => toggleSetting('showMinimap')}
            className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between
              ${gameSettings.showMinimap
                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
          >
            <div className="flex items-center gap-2">
              <Eye size={14} />
              <span>Show Minimap</span>
            </div>
            <span className="text-xs font-medium">{gameSettings.showMinimap ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={resetSettings}
          className="w-full px-3 py-2.5 rounded-lg text-sm border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw size={14} />
          Reset All Settings
        </button>
      </div>

      <div className="mt-4 text-center">
        <div className="text-[10px] text-white/30">AVESTELLA v2.0.0 (TypeScript Refactor)</div>
      </div>
    </div>
  );
}
