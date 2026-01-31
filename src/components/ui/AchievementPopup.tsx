// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Achievement Popup Component
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useUI, type Achievement } from '@/contexts/UIContext';

export function AchievementPopup(): JSX.Element | null {
  const { pendingAchievements, dismissAchievement } = useUI();

  if (pendingAchievements.length === 0) return null;

  const achievement = pendingAchievements[0];

  return (
    <div className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className="animate-achievement-popup pointer-events-auto"
        onClick={() => dismissAchievement(achievement.id)}
      >
        <AchievementCard achievement={achievement} />
      </div>
    </div>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
}

function AchievementCard({ achievement }: AchievementCardProps): JSX.Element {
  const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-orange-500',
  };

  const rarityGlow = {
    common: 'shadow-gray-500/30',
    rare: 'shadow-blue-500/50',
    epic: 'shadow-purple-500/50',
    legendary: 'shadow-yellow-500/50',
  };

  return (
    <div
      className={`
        relative bg-black/80 backdrop-blur-md rounded-2xl p-6
        border border-white/20 shadow-2xl ${rarityGlow[achievement.rarity]}
        min-w-[300px] max-w-[400px]
      `}
    >
      {/* Achievement Banner */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <div className={`
          px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider
          bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white
        `}>
          Achievement Unlocked!
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center gap-4 mt-4">
        {/* Icon */}
        <div className={`
          w-16 h-16 rounded-xl flex items-center justify-center text-3xl
          bg-gradient-to-br ${rarityColors[achievement.rarity]}
          shadow-lg animate-pulse-slow
        `}>
          {achievement.icon}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{achievement.name}</h3>
          <p className="text-sm text-white/70 mt-1">{achievement.description}</p>
        </div>
      </div>

      {/* Rarity */}
      <div className="mt-4 text-center">
        <span className={`
          text-xs font-medium uppercase tracking-wider
          bg-gradient-to-r ${rarityColors[achievement.rarity]}
          bg-clip-text text-transparent
        `}>
          {achievement.rarity}
        </span>
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/50 rounded-full animate-sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AchievementPopup;
