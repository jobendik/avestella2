// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Collectible Gallery (Batch 4: Collectibles & Pets)
// View constellation progress and earned achievements
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  CONSTELLATIONS,
  CONSTELLATION_PIECES,
  ACHIEVEMENT_BADGES,
  FRAGMENT_TYPES,
  Constellation,
  ConstellationPiece,
  AchievementBadge,
} from '@/constants/companions';
import type { Rarity } from '@/types';

// Rarity colors mapping
const RARITY_COLORS: Record<Rarity, { primary: string; secondary?: string }> = {
  common: { primary: '#9CA3AF' },
  uncommon: { primary: '#10B981' },
  rare: { primary: '#3B82F6' },
  epic: { primary: '#8B5CF6' },
  legendary: { primary: '#F59E0B', secondary: '#FBBF24' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CollectibleGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  ownedPieces: string[];
  completedConstellations: string[];
  earnedBadges: string[];
  onClaimReward: (constellationId: string) => boolean;
  stats: {
    fragmentsCollected: number;
    locationsDiscovered: number;
    friendsAdded: number;
    companionsOwned: number;
    playerLevel: number;
  };
}

type TabType = 'constellations' | 'badges' | 'fragments';
type BadgeCategory = 'all' | 'collection' | 'exploration' | 'social' | 'mastery' | 'special';

// ─────────────────────────────────────────────────────────────────────────────
// Tier Colors
// ─────────────────────────────────────────────────────────────────────────────

const TIER_COLORS = {
  bronze: { bg: '#CD7F32', text: '#FFE4C4' },
  silver: { bg: '#C0C0C0', text: '#FFFFFF' },
  gold: { bg: '#FFD700', text: '#FFF8DC' },
  platinum: { bg: '#E5E4E2', text: '#FFFFFF' },
  diamond: { bg: '#B9F2FF', text: '#FFFFFF' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Constellation Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface ConstellationCardProps {
  constellation: Constellation;
  ownedPieces: string[];
  isComplete: boolean;
  isClaimed: boolean;
  onClaim: () => void;
  onSelect: () => void;
}

const ConstellationCard: React.FC<ConstellationCardProps> = ({
  constellation,
  ownedPieces,
  isComplete,
  isClaimed,
  onClaim,
  onSelect,
}) => {
  const ownedCount = constellation.pieces.filter(p => ownedPieces.includes(p)).length;
  const totalCount = constellation.pieces.length;
  const percentage = Math.round((ownedCount / totalCount) * 100);

  return (
    <button
      onClick={onSelect}
      className={`
        relative w-full p-4 rounded-xl transition-all duration-200 text-left
        ${isComplete 
          ? 'bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-2 border-purple-500/50'
          : 'bg-slate-800/60 border border-white/10 hover:border-white/30'
        }
      `}
    >
      {/* Completion Badge */}
      {isComplete && (
        <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
          {isClaimed ? '✓ Claimed' : '⭐ Complete!'}
        </div>
      )}

      {/* Icon & Name */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{constellation.icon}</span>
        <div>
          <h3 className="text-white font-medium">{constellation.name}</h3>
          <p className="text-xs text-gray-500">{constellation.description}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{ownedCount} / {totalCount} pieces</span>
          <span className={isComplete ? 'text-green-400' : 'text-purple-400'}>{percentage}%</span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              background: isComplete
                ? 'linear-gradient(90deg, #10B981, #34D399)'
                : 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
            }}
          />
        </div>
      </div>

      {/* Reward Preview */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Reward:</span>
        <span className="text-yellow-400">
          {constellation.reward.type === 'stardust' && `⭐ ${constellation.reward.value}`}
          {constellation.reward.type === 'companion' && `🐾 ${constellation.reward.value}`}
          {constellation.reward.type === 'title' && `👑 "${constellation.reward.value}"`}
          {constellation.reward.type === 'cosmetic' && `✨ ${constellation.reward.value}`}
        </span>
      </div>

      {/* Claim Button */}
      {isComplete && !isClaimed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClaim();
          }}
          className="mt-3 w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
        >
          Claim Reward
        </button>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Constellation Detail View
// ─────────────────────────────────────────────────────────────────────────────

interface ConstellationDetailProps {
  constellation: Constellation;
  ownedPieces: string[];
  onBack: () => void;
}

const ConstellationDetail: React.FC<ConstellationDetailProps> = ({
  constellation,
  ownedPieces,
  onBack,
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          ←
        </button>
        <span className="text-2xl">{constellation.icon}</span>
        <h2 className="text-lg font-bold text-white">{constellation.name}</h2>
      </div>

      {/* Star Map (Visual) */}
      <div className="relative h-48 bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
        {/* Starfield background */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: Math.random() * 0.8 + 0.2,
              }}
            />
          ))}
        </div>

        {/* Constellation pieces */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-40 h-40">
            {constellation.pieces.map((pieceId, index) => {
              const piece = CONSTELLATION_PIECES[pieceId];
              const owned = ownedPieces.includes(pieceId);
              const angle = (index / constellation.pieces.length) * Math.PI * 2;
              const radius = 60;
              const x = Math.cos(angle) * radius + 80;
              const y = Math.sin(angle) * radius + 80;

              return (
                <div
                  key={pieceId}
                  className={`absolute w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                    owned ? 'bg-yellow-400/80 shadow-lg' : 'bg-gray-600/50'
                  }`}
                  style={{
                    left: x - 12,
                    top: y - 12,
                    boxShadow: owned ? '0 0 15px #FFD70080' : undefined,
                  }}
                >
                  <span className={`text-sm ${owned ? '' : 'opacity-30'}`}>
                    {piece?.icon || '✦'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pieces List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Star Pieces</h3>
        <div className="space-y-2">
          {constellation.pieces.map(pieceId => {
            const piece = CONSTELLATION_PIECES[pieceId];
            if (!piece) return null;

            const owned = ownedPieces.includes(pieceId);
            const rarityColors = RARITY_COLORS[piece.rarity];

            return (
              <div
                key={pieceId}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  owned ? 'bg-green-900/20 border border-green-500/30' : 'bg-black/20'
                }`}
              >
                <span className={`text-xl ${owned ? '' : 'opacity-30 grayscale'}`}>
                  {piece.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${owned ? 'text-white' : 'text-gray-500'}`}>
                      {piece.name}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: `${rarityColors.primary}20`,
                        color: rarityColors.primary,
                      }}
                    >
                      {piece.rarity}
                    </span>
                  </div>
                  <p className={`text-xs ${owned ? 'text-gray-400' : 'text-gray-600'}`}>
                    {piece.description}
                  </p>
                </div>
                {owned ? (
                  <span className="text-green-400">✓</span>
                ) : (
                  <span className="text-xs text-gray-500">
                    {(piece.dropChance * 100).toFixed(1)}% drop
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Achievement Badge Component
// ─────────────────────────────────────────────────────────────────────────────

interface BadgeCardProps {
  badge: AchievementBadge;
  isEarned: boolean;
  progress: number;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge, isEarned, progress }) => {
  const tierColor = TIER_COLORS[badge.tier];
  const percentage = Math.min(100, Math.round((progress / badge.requirement.value) * 100));

  return (
    <div
      className={`
        relative p-4 rounded-xl transition-all duration-200
        ${isEarned 
          ? 'bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/30'
          : 'bg-slate-800/40 border border-white/5'
        }
      `}
    >
      {/* Earned Badge */}
      {isEarned && (
        <div className="absolute -top-2 -right-2 text-lg">🏆</div>
      )}

      {/* Icon */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
            isEarned ? '' : 'opacity-40 grayscale'
          }`}
          style={{
            background: isEarned 
              ? `linear-gradient(135deg, ${tierColor.bg}40, ${tierColor.bg}20)`
              : 'rgba(255,255,255,0.05)',
            border: isEarned ? `2px solid ${tierColor.bg}60` : '2px solid transparent',
          }}
        >
          {badge.icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-medium text-sm ${isEarned ? 'text-white' : 'text-gray-500'}`}>
            {badge.name}
          </h3>
          <span
            className="text-xs px-1.5 py-0.5 rounded capitalize"
            style={{
              background: `${tierColor.bg}20`,
              color: tierColor.bg,
            }}
          >
            {badge.tier}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className={`text-xs mb-3 ${isEarned ? 'text-gray-400' : 'text-gray-600'}`}>
        {badge.description}
      </p>

      {/* Progress */}
      {!isEarned && (
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="text-purple-400">{progress} / {badge.requirement.value}</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Reward */}
      <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2 mt-2">
        <span className="text-gray-500">Reward</span>
        <div className="flex items-center gap-2">
          {badge.reward.stardust && (
            <span className="text-yellow-400">⭐ {badge.reward.stardust}</span>
          )}
          {badge.reward.title && (
            <span className="text-purple-400">👑 {badge.reward.title}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Fragment Gallery Component
// ─────────────────────────────────────────────────────────────────────────────

const FragmentGallery: React.FC = () => {
  const fragments = Object.values(FRAGMENT_TYPES);

  return (
    <div className="space-y-3">
      {fragments.map(fragment => {
        const rarityColors = RARITY_COLORS[
          fragment.spawnWeight >= 50 ? 'common' 
            : fragment.spawnWeight >= 15 ? 'uncommon'
            : fragment.spawnWeight >= 5 ? 'rare'
            : fragment.spawnWeight >= 2 ? 'epic'
            : 'legendary'
        ];

        return (
          <div
            key={fragment.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/60 border border-white/10"
          >
            {/* Fragment Visual */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${fragment.color}60 0%, ${fragment.glowColor}20 70%, transparent 100%)`,
                boxShadow: `0 0 20px ${fragment.glowColor}40`,
              }}
            >
              <span className="text-2xl">{fragment.icon}</span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-medium">{fragment.name}</h3>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: `${rarityColors.primary}20`,
                    color: rarityColors.primary,
                  }}
                >
                  {fragment.spawnWeight >= 50 ? 'Common' 
                    : fragment.spawnWeight >= 15 ? 'Uncommon'
                    : fragment.spawnWeight >= 5 ? 'Rare'
                    : fragment.spawnWeight >= 2 ? 'Epic'
                    : 'Legendary'}
                </span>
              </div>
              <p className="text-xs text-gray-400">{fragment.description}</p>
            </div>

            {/* Stats */}
            <div className="text-right text-sm">
              <div className="text-yellow-400">+{fragment.baseValue} ⭐</div>
              <div className="text-purple-400 text-xs">+{fragment.xpValue} XP</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const CollectibleGallery: React.FC<CollectibleGalleryProps> = ({
  isOpen,
  onClose,
  ownedPieces,
  completedConstellations,
  earnedBadges,
  onClaimReward,
  stats,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('constellations');
  const [badgeCategory, setBadgeCategory] = useState<BadgeCategory>('all');
  const [selectedConstellation, setSelectedConstellation] = useState<Constellation | null>(null);

  // Get all data
  const allConstellations = useMemo(() => Object.values(CONSTELLATIONS), []);
  const allBadges = useMemo(() => Object.values(ACHIEVEMENT_BADGES), []);

  // Filter badges
  const filteredBadges = useMemo(() => {
    if (badgeCategory === 'all') return allBadges;
    return allBadges.filter(b => b.category === badgeCategory);
  }, [allBadges, badgeCategory]);

  // Get stat value for a badge
  const getStatForBadge = (badge: AchievementBadge): number => {
    switch (badge.requirement.type) {
      case 'fragments_collected': return stats.fragmentsCollected;
      case 'locations_discovered': return stats.locationsDiscovered;
      case 'friends_added': return stats.friendsAdded;
      case 'companions_owned': return stats.companionsOwned;
      case 'player_level': return stats.playerLevel;
      default: return 0;
    }
  };

  // Stats
  const constellationProgress = useMemo(() => {
    const total = allConstellations.length;
    const complete = completedConstellations.length;
    return { total, complete, percentage: Math.round((complete / total) * 100) };
  }, [allConstellations, completedConstellations]);

  const badgeProgress = useMemo(() => {
    const total = allBadges.length;
    const earned = earnedBadges.length;
    return { total, earned, percentage: Math.round((earned / total) * 100) };
  }, [allBadges, earnedBadges]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-slate-900/95 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Constellation Detail View */}
        {selectedConstellation ? (
          <ConstellationDetail
            constellation={selectedConstellation}
            ownedPieces={ownedPieces}
            onBack={() => setSelectedConstellation(null)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">📚 Gallery</h2>
                <p className="text-xs text-gray-400">
                  Constellations & Achievements
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('constellations')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'constellations'
                    ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                ⭐ Stars ({constellationProgress.complete}/{constellationProgress.total})
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'badges'
                    ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🏆 Badges ({badgeProgress.earned}/{badgeProgress.total})
              </button>
              <button
                onClick={() => setActiveTab('fragments')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'fragments'
                    ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                ✦ Fragments
              </button>
            </div>

            {/* Badge Category Filter */}
            {activeTab === 'badges' && (
              <div className="flex gap-2 p-3 overflow-x-auto border-b border-white/5">
                {(['all', 'collection', 'exploration', 'social', 'mastery'] as BadgeCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setBadgeCategory(cat)}
                    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                      badgeCategory === cat
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'constellations' && (
                <div className="grid grid-cols-1 gap-3">
                  {allConstellations.map(constellation => {
                    const isComplete = constellation.pieces.every(p => ownedPieces.includes(p));
                    const isClaimed = completedConstellations.includes(constellation.id);

                    return (
                      <ConstellationCard
                        key={constellation.id}
                        constellation={constellation}
                        ownedPieces={ownedPieces}
                        isComplete={isComplete}
                        isClaimed={isClaimed}
                        onClaim={() => onClaimReward(constellation.id)}
                        onSelect={() => setSelectedConstellation(constellation)}
                      />
                    );
                  })}
                </div>
              )}

              {activeTab === 'badges' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBadges.map(badge => (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      isEarned={earnedBadges.includes(badge.id)}
                      progress={getStatForBadge(badge)}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'fragments' && <FragmentGallery />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CollectibleGallery;
