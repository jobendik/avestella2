// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Companion Shop (Batch 4: Collectibles & Pets)
// Browse, purchase, and manage companions
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback } from 'react';
import { 
  COMPANIONS, 
  COMPANION_LEVELS,
  Companion,
  CompanionAbility,
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

interface OwnedCompanion {
  id: string;
  level: number;
  xp: number;
  acquiredAt: number;
}

interface CompanionShopProps {
  isOpen: boolean;
  onClose: () => void;
  stardust: number;
  ownedCompanions: Record<string, OwnedCompanion>;
  equippedCompanionId: string | null;
  onPurchase: (id: string) => boolean;
  onEquip: (id: string | null) => void;
  playerLevel: number;
}

type TabType = 'shop' | 'owned' | 'details';
type FilterRarity = 'all' | Rarity;

// ─────────────────────────────────────────────────────────────────────────────
// Rarity Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const RarityBadge: React.FC<{ rarity: Rarity }> = ({ rarity }) => {
  const colors = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  
  return (
    <span
      className="px-2 py-0.5 text-xs font-bold rounded uppercase"
      style={{
        background: `${colors.primary}30`,
        color: colors.primary,
        border: `1px solid ${colors.primary}50`,
      }}
    >
      {rarity}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Ability Display Component
// ─────────────────────────────────────────────────────────────────────────────

const AbilityDisplay: React.FC<{ ability: CompanionAbility; level?: number }> = ({ 
  ability, 
  level = 1 
}) => {
  const currentBonus = ability.baseValue + (ability.levelScale * (level - 1));
  
  const effectIcons: Record<string, string> = {
    fragment_magnet: '🧲',
    xp_boost: '📚',
    stardust_boost: '💫',
    speed_boost: '⚡',
    glow_aura: '✨',
    lucky_find: '🍀',
  };

  return (
    <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-1">
        <span>{effectIcons[ability.effect] || '⭐'}</span>
        <span className="text-sm font-medium text-purple-300">{ability.name}</span>
      </div>
      <p className="text-xs text-gray-400 mb-2">{ability.description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Effect at Lv.{level}</span>
        <span className="text-green-400 font-medium">+{currentBonus.toFixed(1)}%</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Companion Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface CompanionCardProps {
  companion: Companion;
  owned?: OwnedCompanion;
  isEquipped: boolean;
  canAfford: boolean;
  canUnlock: boolean;
  onClick: () => void;
}

const CompanionCard: React.FC<CompanionCardProps> = ({
  companion,
  owned,
  isEquipped,
  canAfford,
  canUnlock,
  onClick,
}) => {
  const colors = RARITY_COLORS[companion.rarity] || RARITY_COLORS.common;
  const isLocked = !owned && !canUnlock;

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full p-4 rounded-xl transition-all duration-200
        ${owned 
          ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2'
          : isLocked
            ? 'bg-slate-900/50 border border-gray-700/50 opacity-60'
            : 'bg-slate-800/60 border border-white/10 hover:border-white/30'
        }
        ${isEquipped ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900' : ''}
      `}
      style={{
        borderColor: owned ? `${colors.primary}60` : undefined,
      }}
    >
      {/* Equipped Badge */}
      {isEquipped && (
        <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
          Active
        </div>
      )}

      {/* Companion Icon */}
      <div
        className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${companion.color}40 0%, transparent 70%)`,
          boxShadow: owned ? `0 0 20px ${companion.glowColor}40` : undefined,
        }}
      >
        <span className="text-3xl">{companion.icon}</span>
      </div>

      {/* Name & Rarity */}
      <h3 className="text-white font-medium text-sm mb-1 truncate">
        {companion.name}
      </h3>
      <RarityBadge rarity={companion.rarity} />

      {/* Level or Price */}
      <div className="mt-3">
        {owned ? (
          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="text-purple-400">Lv.{owned.level}</span>
            <span className="text-gray-500">/</span>
            <span className="text-gray-500">{companion.maxLevel}</span>
          </div>
        ) : isLocked ? (
          <div className="text-xs text-gray-500">
            {companion.unlock.type === 'level' && `Requires Lv.${companion.unlock.value}`}
            {companion.unlock.type === 'achievement' && '🏆 Achievement'}
            {companion.unlock.type === 'hidden' && '❓ Hidden'}
            {companion.unlock.type === 'event' && '🎉 Event'}
          </div>
        ) : (
          <div className={`text-sm font-medium ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
            ⭐ {companion.price.toLocaleString()}
          </div>
        )}
      </div>

      {/* Ability Indicator */}
      {companion.ability && (
        <div className="absolute top-2 left-2 text-xs" title={companion.ability.name}>
          ✨
        </div>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Companion Details Panel
// ─────────────────────────────────────────────────────────────────────────────

interface CompanionDetailsProps {
  companion: Companion;
  owned?: OwnedCompanion;
  isEquipped: boolean;
  stardust: number;
  canUnlock: boolean;
  onBack: () => void;
  onPurchase: () => void;
  onEquip: () => void;
  onUnequip: () => void;
}

const CompanionDetails: React.FC<CompanionDetailsProps> = ({
  companion,
  owned,
  isEquipped,
  stardust,
  canUnlock,
  onBack,
  onPurchase,
  onEquip,
  onUnequip,
}) => {
  const colors = RARITY_COLORS[companion.rarity] || RARITY_COLORS.common;
  const canAfford = stardust >= companion.price;

  // XP Progress
  const xpProgress = useMemo(() => {
    if (!owned) return null;
    
    const currentLevel = COMPANION_LEVELS[owned.level - 1];
    const nextLevel = COMPANION_LEVELS[owned.level];
    
    if (!nextLevel) return { current: owned.xp, required: owned.xp, percentage: 100 };
    
    const currentThreshold = currentLevel?.xpRequired || 0;
    const xpInLevel = owned.xp - currentThreshold;
    const xpNeeded = nextLevel.xpRequired - currentThreshold;
    
    return {
      current: xpInLevel,
      required: xpNeeded,
      percentage: Math.round((xpInLevel / xpNeeded) * 100),
    };
  }, [owned]);

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
        <h2 className="text-lg font-bold text-white flex-1">{companion.name}</h2>
        <RarityBadge rarity={companion.rarity} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center animate-pulse"
            style={{
              background: `radial-gradient(circle, ${companion.color}60 0%, ${companion.color}20 50%, transparent 80%)`,
              boxShadow: `0 0 40px ${companion.glowColor}40`,
            }}
          >
            <span className="text-6xl">{companion.icon}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-center text-gray-400 text-sm mb-6 italic">
          "{companion.description}"
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Orbit Radius</div>
            <div className="text-white font-medium">{companion.orbitRadius}px</div>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Orbit Speed</div>
            <div className="text-white font-medium">{companion.orbitSpeed}x</div>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Size</div>
            <div className="text-white font-medium">{companion.size}px</div>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Particles</div>
            <div className="text-white font-medium capitalize">{companion.particleType}</div>
          </div>
        </div>

        {/* Level Progress (if owned) */}
        {owned && xpProgress && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Level {owned.level}</span>
              <span className="text-xs text-gray-500">
                {xpProgress.current} / {xpProgress.required} XP
              </span>
            </div>
            <div className="h-2 bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${xpProgress.percentage}%`,
                  background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary || colors.primary})`,
                }}
              />
            </div>
            {owned.level < companion.maxLevel && (
              <div className="text-xs text-gray-500 mt-1 text-center">
                Next level at {COMPANION_LEVELS[owned.level]?.xpRequired} total XP
              </div>
            )}
          </div>
        )}

        {/* Ability */}
        {companion.ability && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Special Ability</h3>
            <AbilityDisplay ability={companion.ability} level={owned?.level || 1} />
          </div>
        )}

        {/* Unlock Requirements */}
        {!owned && companion.unlock.type !== 'purchase' && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <span>🔒</span>
              <span>
                {companion.unlock.type === 'level' && `Reach Level ${companion.unlock.value} to unlock`}
                {companion.unlock.type === 'achievement' && `Earn the "${companion.unlock.value}" achievement`}
                {companion.unlock.type === 'event' && 'Available during special events'}
                {companion.unlock.type === 'hidden' && 'Discover the secret to unlock this companion'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        {owned ? (
          <div className="flex gap-3">
            {isEquipped ? (
              <button
                onClick={onUnequip}
                className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
              >
                Unequip
              </button>
            ) : (
              <button
                onClick={onEquip}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
              >
                Equip Companion
              </button>
            )}
          </div>
        ) : canUnlock ? (
          <button
            onClick={onPurchase}
            disabled={!canAfford}
            className={`
              w-full py-3 rounded-xl font-medium transition-colors
              ${canAfford
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {canAfford ? (
              <span>Purchase for ⭐ {companion.price.toLocaleString()}</span>
            ) : (
              <span>Need ⭐ {(companion.price - stardust).toLocaleString()} more</span>
            )}
          </button>
        ) : (
          <div className="text-center text-gray-500 text-sm">
            Complete requirements to unlock
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const CompanionShop: React.FC<CompanionShopProps> = ({
  isOpen,
  onClose,
  stardust,
  ownedCompanions,
  equippedCompanionId,
  onPurchase,
  onEquip,
  playerLevel,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('shop');
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all');
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);

  // Get all companions
  const allCompanions = useMemo(() => Object.values(COMPANIONS), []);

  // Filter companions
  const filteredCompanions = useMemo(() => {
    let companions = allCompanions;

    // Filter by ownership for "owned" tab
    if (activeTab === 'owned') {
      companions = companions.filter(c => c.id in ownedCompanions);
    }

    // Filter by rarity
    if (filterRarity !== 'all') {
      companions = companions.filter(c => c.rarity === filterRarity);
    }

    // Sort: owned first, then by rarity, then by price
    const rarityOrder: Record<Rarity, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    companions.sort((a, b) => {
      const aOwned = a.id in ownedCompanions ? 1 : 0;
      const bOwned = b.id in ownedCompanions ? 1 : 0;
      if (aOwned !== bOwned) return bOwned - aOwned;
      
      const aRarity = rarityOrder[a.rarity] || 0;
      const bRarity = rarityOrder[b.rarity] || 0;
      if (aRarity !== bRarity) return bRarity - aRarity;
      
      return a.price - b.price;
    });

    return companions;
  }, [allCompanions, activeTab, filterRarity, ownedCompanions]);

  // Check if companion can be unlocked
  const canUnlock = useCallback((companion: Companion): boolean => {
    if (companion.unlock.type === 'purchase') return true;
    if (companion.unlock.type === 'level' && typeof companion.unlock.value === 'number') {
      return playerLevel >= companion.unlock.value;
    }
    // Achievement, event, hidden - need external check
    return false;
  }, [playerLevel]);

  // Handle companion selection
  const handleSelectCompanion = useCallback((companion: Companion) => {
    setSelectedCompanion(companion);
    setActiveTab('details');
  }, []);

  // Handle purchase
  const handlePurchase = useCallback(() => {
    if (!selectedCompanion) return;
    if (onPurchase(selectedCompanion.id)) {
      // Stay on details to show equipped state
    }
  }, [selectedCompanion, onPurchase]);

  // Handle equip
  const handleEquip = useCallback(() => {
    if (!selectedCompanion) return;
    onEquip(selectedCompanion.id);
  }, [selectedCompanion, onEquip]);

  // Handle unequip
  const handleUnequip = useCallback(() => {
    onEquip(null);
  }, [onEquip]);

  // Stats
  const ownedCount = Object.keys(ownedCompanions).length;
  const totalCount = allCompanions.length;

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
        {/* Show details panel */}
        {activeTab === 'details' && selectedCompanion ? (
          <CompanionDetails
            companion={selectedCompanion}
            owned={ownedCompanions[selectedCompanion.id]}
            isEquipped={equippedCompanionId === selectedCompanion.id}
            stardust={stardust}
            canUnlock={canUnlock(selectedCompanion)}
            onBack={() => setActiveTab('shop')}
            onPurchase={handlePurchase}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">🐾 Companions</h2>
                <p className="text-xs text-gray-400">
                  {ownedCount} / {totalCount} collected
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-yellow-400 text-sm font-medium">
                  <span>⭐</span>
                  <span>{stardust.toLocaleString()}</span>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('shop')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'shop'
                    ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setActiveTab('owned')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'owned'
                    ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Owned ({ownedCount})
              </button>
            </div>

            {/* Rarity Filter */}
            <div className="flex gap-2 p-3 overflow-x-auto border-b border-white/5">
              {(['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'] as FilterRarity[]).map(rarity => (
                <button
                  key={rarity}
                  onClick={() => setFilterRarity(rarity)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                    filterRarity === rarity
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {rarity === 'all' ? 'All' : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                </button>
              ))}
            </div>

            {/* Companion Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredCompanions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <span className="text-4xl mb-3 block">🐾</span>
                  <p>No companions found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredCompanions.map(companion => (
                    <CompanionCard
                      key={companion.id}
                      companion={companion}
                      owned={ownedCompanions[companion.id]}
                      isEquipped={equippedCompanionId === companion.id}
                      canAfford={stardust >= companion.price}
                      canUnlock={canUnlock(companion)}
                      onClick={() => handleSelectCompanion(companion)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanionShop;
