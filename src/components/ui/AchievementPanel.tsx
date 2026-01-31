// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Achievement Panel (Batch 5: Wiring)
// View and track achievement progress
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { X, Trophy, Star, Users, Compass, Sparkles, Award } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { 
  useProgressionContext, 
  useGameStateContext, 
  useSocialContext,
  useCompanionsContext,
  useExplorationContext
} from '@/contexts/GameContext';
import { ACHIEVEMENT_BADGES, AchievementBadge } from '@/constants/companions';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CategoryFilter = 'all' | 'collection' | 'exploration' | 'social' | 'mastery' | 'special' | 'secret';

const TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  bronze: { bg: 'from-amber-900/50 to-orange-900/50', border: 'border-amber-600/50', text: 'text-amber-400' },
  silver: { bg: 'from-slate-600/50 to-slate-700/50', border: 'border-slate-400/50', text: 'text-slate-300' },
  gold: { bg: 'from-yellow-700/50 to-amber-700/50', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  platinum: { bg: 'from-cyan-800/50 to-teal-800/50', border: 'border-cyan-400/50', text: 'text-cyan-300' },
  diamond: { bg: 'from-purple-800/50 to-pink-800/50', border: 'border-purple-400/50', text: 'text-purple-300' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Trophy size={14} />,
  collection: <Star size={14} />,
  exploration: <Compass size={14} />,
  social: <Users size={14} />,
  mastery: <Sparkles size={14} />,
  special: <Award size={14} />,
  secret: <span className="text-sm">🔒</span>,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AchievementPanel(): JSX.Element {
  const { closePanel, showToast } = useUI();
  const progression = useProgressionContext();
  const gameState = useGameStateContext();
  const social = useSocialContext();
  const companions = useCompanionsContext();

  const [category, setCategory] = useState<CategoryFilter>('all');

  // Calculate current stats for achievement progress
  const stats = useMemo(() => ({
    fragments_collected: gameState.gameState.current?.fragmentsCollected || 0,
    companions_owned: companions.getOwnedCompanionCount(),
    locations_discovered: 0, // Would need exploration tracking
    friends_added: social.friends.length,
    level: progression.state.level,
    bonds_formed: gameState.gameState.current?.bonds?.length || 0,
    beacons_lit: gameState.gameState.current?.beaconsLit || 0,
  }), [gameState.gameState.current, companions, social.friends.length, progression.state.level]);

  // Get all achievements with their unlock status
  const achievements = useMemo(() => {
    return Object.values(ACHIEVEMENT_BADGES).map(badge => {
      const isUnlocked = progression.hasAchievement(badge.id);
      const currentValue = stats[badge.requirement.type as keyof typeof stats] || 0;
      const progress = Math.min(100, (currentValue / badge.requirement.value) * 100);
      
      return {
        ...badge,
        isUnlocked,
        currentValue,
        progress,
      };
    });
  }, [progression, stats]);

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    if (category === 'all') return achievements;
    return achievements.filter(a => a.category === category);
  }, [achievements, category]);

  // Stats summary
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalCount = achievements.length;

  const categories: CategoryFilter[] = ['all', 'collection', 'exploration', 'social', 'mastery', 'special', 'secret'];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={closePanel}
    >
      <div
        className="bg-gradient-to-br from-amber-950/95 to-slate-900/95 border-2 border-amber-500/30 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/80 to-orange-900/80 backdrop-blur-md p-6 border-b border-amber-500/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-amber-400 flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              Achievements
            </h2>
            <button
              onClick={closePanel}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Summary */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 bg-black/30 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-amber-300 font-bold text-lg">{unlockedCount}/{totalCount}</span>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  category === cat
                    ? 'bg-amber-500 text-black shadow-lg'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {CATEGORY_ICONS[cat]}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Achievement List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3">
            {filteredAchievements.map(achievement => {
              const tierColors = TIER_COLORS[achievement.tier] || TIER_COLORS.bronze;
              
              return (
                <div
                  key={achievement.id}
                  className={`relative bg-gradient-to-r ${tierColors.bg} border ${tierColors.border} rounded-xl p-4 transition-all ${
                    achievement.isUnlocked ? 'opacity-100' : 'opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon - for secret achievements, show lock icon if not unlocked */}
                    <div className={`text-4xl ${achievement.isUnlocked ? '' : 'grayscale opacity-50'}`}>
                      {achievement.secret && !achievement.isUnlocked ? '🔒' : achievement.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold ${tierColors.text}`}>
                          {achievement.secret && !achievement.isUnlocked ? '???' : achievement.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize bg-black/30 ${tierColors.text}`}>
                          {achievement.tier}
                        </span>
                        {achievement.secret && !achievement.isUnlocked && (
                          <span className="text-purple-400 text-xs">🔮 Secret</span>
                        )}
                        {achievement.isUnlocked && (
                          <span className="text-green-400 text-sm">✓ Unlocked</span>
                        )}
                      </div>
                      
                      <p className="text-white/60 text-sm mb-2">
                        {achievement.secret && !achievement.isUnlocked 
                          ? (achievement.hiddenDescription || 'Secret achievement') 
                          : achievement.description}
                      </p>

                      {/* Progress Bar - hidden for secret achievements */}
                      {!achievement.isUnlocked && !achievement.secret && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-black/30 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all`}
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/50">
                            {achievement.currentValue}/{achievement.requirement.value}
                          </span>
                        </div>
                      )}

                      {/* Rewards */}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {achievement.reward.stardust && (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Star size={12} className="fill-amber-400" />
                            {achievement.reward.stardust}
                          </span>
                        )}
                        {achievement.reward.title && (
                          <span className="text-purple-400">
                            🏷️ Title: {achievement.reward.title}
                          </span>
                        )}
                        {achievement.reward.unlock && (
                          <span className="text-cyan-400">
                            🔓 {achievement.reward.unlock}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Completed Checkmark */}
                  {achievement.isUnlocked && (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center">
                      <span className="text-green-400 text-lg">✓</span>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredAchievements.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                <p>No achievements in this category</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-500/20 bg-black/30 text-center">
          <p className="text-white/40 text-sm">
            Complete achievements to earn Stardust and unlock special rewards!
          </p>
        </div>
      </div>
    </div>
  );
}

export default AchievementPanel;
