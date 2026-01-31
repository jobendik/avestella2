// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Level Up Popup Component
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useUI } from '@/contexts/UIContext';
import { Star, Sparkles } from 'lucide-react';

export function LevelUpPopup(): JSX.Element | null {
  const { levelUpData, dismissLevelUp } = useUI();

  if (!levelUpData.visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={dismissLevelUp}
    >
      <div
        className="relative animate-level-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Card */}
        <div className="bg-gradient-to-b from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-3xl p-8 border border-yellow-500/30 shadow-2xl shadow-yellow-500/30 min-w-[320px]">
          {/* Stars decoration */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1">
              <Star className="w-6 h-6 text-yellow-400 animate-pulse" fill="currentColor" />
              <Star className="w-8 h-8 text-yellow-400 animate-pulse" fill="currentColor" style={{ animationDelay: '0.1s' }} />
              <Star className="w-6 h-6 text-yellow-400 animate-pulse" fill="currentColor" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              LEVEL UP!
              <Sparkles className="w-6 h-6" />
            </h2>
          </div>

          {/* Level Circle */}
          <div className="flex justify-center my-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-pulse-slow">
                <span className="text-5xl font-bold text-black">{levelUpData.level}</span>
              </div>
              {/* Rotating ring */}
              <div className="absolute inset-0 animate-spin-slow">
                <div className="w-full h-full rounded-full border-4 border-transparent border-t-yellow-300 border-r-yellow-300" />
              </div>
            </div>
          </div>

          {/* Message */}
          <p className="text-center text-white/80 text-lg">
            You've reached <span className="text-yellow-400 font-bold">Level {levelUpData.level}</span>!
          </p>

          {/* Rewards Preview */}
          <div className="mt-6 p-4 bg-black/30 rounded-xl">
            <div className="text-center text-sm text-white/60 mb-2">Rewards Unlocked:</div>
            <div className="flex justify-center gap-4">
              <RewardItem icon="⭐" label="100 Stardust" />
              <RewardItem icon="🎨" label="New Colors" />
            </div>
          </div>

          {/* Tap to continue */}
          <p className="text-center text-white/50 text-sm mt-6 animate-pulse">
            Tap anywhere to continue
          </p>
        </div>

        {/* Particle effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: '-10%',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface RewardItemProps {
  icon: string;
  label: string;
}

function RewardItem({ icon, label }: RewardItemProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-white/80">{label}</span>
    </div>
  );
}

export default LevelUpPopup;
