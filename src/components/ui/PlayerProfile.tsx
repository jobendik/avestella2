// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Player Profile Panel (Batch 2: Personalization)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Panel } from './Panel';
import { useCosmeticsContext, useProgressionContext } from '@/contexts/GameContext';
import { useGame } from '@/contexts/GameContext';
import { LIGHT_COLORS } from '@/constants/cosmetics';
import type { CosmeticItem } from '@/hooks/useCosmetics';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ProfileTab = 'overview' | 'trails' | 'colors' | 'auras' | 'titles';

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color = 'text-white' }) => (
  <div className="bg-white/5 rounded-lg p-3 text-center">
    <div className="text-2xl mb-1">{icon}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Quick Equip Item
// ─────────────────────────────────────────────────────────────────────────────

interface QuickEquipProps {
  item: CosmeticItem;
  colorPreview?: string;
  onSelect: () => void;
  isSelected: boolean;
}

const QuickEquipItem: React.FC<QuickEquipProps> = ({ item, colorPreview, onSelect, isSelected }) => (
  <button
    onClick={onSelect}
    disabled={!item.owned}
    className={`
      relative p-2 rounded-lg transition-all duration-200
      ${item.owned ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed'}
      ${isSelected ? 'ring-2 ring-purple-500 bg-purple-500/20' : 'bg-white/5'}
    `}
  >
    {colorPreview ? (
      <div 
        className="w-8 h-8 rounded-full border-2 border-white/20 mx-auto"
        style={{ backgroundColor: colorPreview }}
      />
    ) : (
      <div className="text-2xl">{item.icon}</div>
    )}
    <p className="text-[10px] text-gray-400 mt-1 truncate">{item.name}</p>
    
    {isSelected && (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
        <span className="text-[8px]">✓</span>
      </div>
    )}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const PlayerProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const cosmetics = useCosmeticsContext();
  const progression = useProgressionContext();
  const { gameState: gameStateHook } = useGame();

  const formatPlayTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Player Card */}
      <div className="relative bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-xl p-4 border border-purple-500/30">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg"
            style={{ 
              backgroundColor: cosmetics.currentColor.color === 'rainbow' 
                ? '#FFD700' 
                : cosmetics.currentColor.color,
              boxShadow: `0 0 20px ${cosmetics.currentColor.color === 'rainbow' ? '#FFD700' : cosmetics.currentColor.color}40`
            }}
          >
            ✨
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">Player</span>
              {cosmetics.currentTitle && (
                <span className="px-2 py-0.5 bg-purple-500/30 rounded text-xs text-purple-300">
                  {cosmetics.currentTitle.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-300">Level {progression.state.level}</span>
              <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${progression.getProgressToNextLevel() * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Current Cosmetics */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10">
          <div className="flex-1 text-center">
            <span className="text-xl">{cosmetics.currentTrail.icon}</span>
            <p className="text-[10px] text-gray-400 mt-1">{cosmetics.currentTrail.name}</p>
          </div>
          <div className="flex-1 text-center">
            <div 
              className="w-6 h-6 rounded-full mx-auto border border-white/20"
              style={{ backgroundColor: cosmetics.currentColor.color === 'rainbow' ? '#FFD700' : cosmetics.currentColor.color }}
            />
            <p className="text-[10px] text-gray-400 mt-1">{cosmetics.currentColor.name}</p>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xl">{cosmetics.currentAura.icon}</span>
            <p className="text-[10px] text-gray-400 mt-1">{cosmetics.currentAura.name}</p>
          </div>
          {cosmetics.currentCompanion && (
            <div className="flex-1 text-center">
              <span className="text-xl">{cosmetics.currentCompanion.icon}</span>
              <p className="text-[10px] text-gray-400 mt-1">{cosmetics.currentCompanion.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard icon="💫" label="Stardust" value={progression.state.stardust.toLocaleString()} color="text-amber-400" />
        <StatCard icon="⭐" label="XP" value={progression.state.xp.toLocaleString()} color="text-purple-400" />
        <StatCard icon="🔥" label="Streak" value={progression.state.dailyLoginStreak} color="text-orange-400" />
        <StatCard icon="⏱️" label="Playtime" value={formatPlayTime(gameStateHook.gameState.current?.playTime || 0)} color="text-cyan-400" />
      </div>

      {/* Collection Progress */}
      <div className="bg-white/5 rounded-lg p-3">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Collection Progress</h3>
        <div className="space-y-2">
          {[
            { label: 'Trails', ...cosmetics.getOwnedCount(), key: 'trails' as const, icon: '✨' },
            { label: 'Colors', ...cosmetics.getOwnedCount(), key: 'colors' as const, icon: '🎨' },
            { label: 'Auras', ...cosmetics.getOwnedCount(), key: 'auras' as const, icon: '💠' },
            { label: 'Titles', ...cosmetics.getOwnedCount(), key: 'titles' as const, icon: '🏷️' },
          ].map(({ label, key, icon }) => {
            const owned = cosmetics.getOwnedCount()[key];
            const total = cosmetics.getTotalCount()[key];
            const pct = Math.round((owned / total) * 100);
            
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className="text-xs text-gray-400 w-14">{label}</span>
                <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-12 text-right">{owned}/{total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderQuickEquip = (
    items: CosmeticItem[],
    equipFn: (id: string) => void,
    showColors: boolean = false
  ) => (
    <div className="grid grid-cols-5 gap-2">
      {items
        .filter(item => item.owned)
        .map(item => (
          <QuickEquipItem
            key={item.id}
            item={item}
            colorPreview={showColors ? LIGHT_COLORS[item.id]?.color : undefined}
            onSelect={() => equipFn(item.id)}
            isSelected={item.equipped}
          />
        ))}
    </div>
  );

  const tabs: { id: ProfileTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '👤' },
    { id: 'trails', label: 'Trails', icon: '✨' },
    { id: 'colors', label: 'Colors', icon: '🎨' },
    { id: 'auras', label: 'Auras', icon: '💠' },
    { id: 'titles', label: 'Titles', icon: '🏷️' },
  ];

  return (
    <Panel title="Profile" icon="👤">
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                transition-all duration-200
                ${activeTab === tab.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === 'overview' && renderOverview()}
          
          {activeTab === 'trails' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Quick Equip Trails</h3>
              {renderQuickEquip(cosmetics.getAllTrails(), cosmetics.equipTrail)}
            </div>
          )}
          
          {activeTab === 'colors' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Quick Equip Colors</h3>
              {renderQuickEquip(cosmetics.getAllColors(), cosmetics.equipColor, true)}
            </div>
          )}
          
          {activeTab === 'auras' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Quick Equip Auras</h3>
              {renderQuickEquip(cosmetics.getAllAuras(), cosmetics.equipAura)}
            </div>
          )}
          
          {activeTab === 'titles' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Quick Equip Titles</h3>
              {renderQuickEquip(cosmetics.getAllTitles(), cosmetics.equipTitle)}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
};

export default PlayerProfile;
