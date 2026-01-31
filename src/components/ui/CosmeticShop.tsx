// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Cosmetic Shop Panel (Batch 2: Personalization)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { Panel } from './Panel';
import { CosmeticPreview } from './CosmeticPreview';
import { ColorPicker } from './ColorPicker';
import { useCosmeticsContext, useProgressionContext } from '@/contexts/GameContext';
import {
  TRAIL_STYLES,
  LIGHT_COLORS,
  AURA_EFFECTS,
  SOUND_PACKS,
  AVATAR_FRAMES,
  getRarityColor,
  getRarityBorder,
  getRarityBackground,
} from '@/constants/cosmetics';
import type { Rarity } from '@/types';
import type { CosmeticItem } from '@/hooks/useCosmetics';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ShopTab = 'trails' | 'colors' | 'auras' | 'sounds' | 'frames';

// ─────────────────────────────────────────────────────────────────────────────
// Tab Button
// ─────────────────────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium 
      transition-all duration-200
      ${active 
        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30' 
        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
      }
    `}
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Cosmetic Card
// ─────────────────────────────────────────────────────────────────────────────

interface CosmeticCardProps {
  item: CosmeticItem;
  colorPreview?: string;
  onEquip: () => void;
  onPurchase: () => void;
  onPreview?: () => void;
  canAfford: boolean;
}

const CosmeticCard: React.FC<CosmeticCardProps> = ({
  item,
  colorPreview,
  onEquip,
  onPurchase,
  onPreview,
  canAfford,
}) => {
  const isLocked = item.locked && !item.owned;
  const isPurchasable = !item.owned && !item.locked && item.price > 0;
  const isFree = !item.owned && !item.locked && item.price === 0;

  return (
    <div
      className={`
        relative p-3 rounded-xl border-2 transition-all duration-300
        ${item.equipped 
          ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900' 
          : ''
        }
        ${getRarityBorder(item.rarity)}
        ${getRarityBackground(item.rarity)}
        ${isLocked ? 'opacity-50' : 'hover:scale-[1.02]'}
      `}
    >
      {/* Equipped badge */}
      {item.equipped && (
        <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          EQUIPPED
        </div>
      )}

      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10">
          <div className="text-center">
            <span className="text-2xl">🔒</span>
            {item.lockReason && (
              <p className="text-xs text-gray-400 mt-1 px-2">{item.lockReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Icon / Color Preview */}
      <div className="flex items-center gap-3 mb-2">
        {colorPreview ? (
          <div 
            className="w-10 h-10 rounded-full border-2 border-white/20"
            style={{ backgroundColor: colorPreview }}
          />
        ) : (
          <span className="text-3xl">{item.icon}</span>
        )}
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
          <span className={`text-xs capitalize ${getRarityColor(item.rarity)}`}>
            {item.rarity}
          </span>
        </div>

        {/* Preview Button */}
        {onPreview && !isLocked && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all"
            title="Preview"
          >
            👁️
          </button>
        )}
      </div>

      {/* Description */}
      {item.desc && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{item.desc}</p>
      )}

      {/* Action Button */}
      <div className="mt-auto">
        {item.owned ? (
          <button
            onClick={onEquip}
            disabled={item.equipped}
            className={`
              w-full py-2 rounded-lg text-sm font-medium transition-all
              ${item.equipped 
                ? 'bg-white/10 text-gray-500 cursor-default' 
                : 'bg-purple-600 hover:bg-purple-500 text-white'
              }
            `}
          >
            {item.equipped ? '✓ Equipped' : 'Equip'}
          </button>
        ) : isPurchasable ? (
          <button
            onClick={onPurchase}
            disabled={!canAfford}
            className={`
              w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
              ${canAfford 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white' 
                : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <span>💫</span>
            <span>{item.price.toLocaleString()}</span>
          </button>
        ) : isFree ? (
          <button
            onClick={onPurchase}
            className="w-full py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-all"
          >
            Claim Free
          </button>
        ) : null}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const CosmeticShop: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ShopTab>('trails');
  const [previewItem, setPreviewItem] = useState<{ type: 'trail' | 'color' | 'aura' | 'frame'; id: string } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const cosmetics = useCosmeticsContext();
  const progression = useProgressionContext();

  // Get items based on active tab
  const items = useMemo(() => {
    switch (activeTab) {
      case 'trails':
        return cosmetics.getAllTrails();
      case 'colors':
        return cosmetics.getAllColors();
      case 'auras':
        return cosmetics.getAllAuras();
      case 'sounds':
        return cosmetics.getAllSoundPacks();
      case 'frames':
        return cosmetics.getAllFrames();
      default:
        return [];
    }
  }, [activeTab, cosmetics]);

  // Sort items: equipped first, then owned, then purchasable, then locked
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
      if (a.owned !== b.owned) return a.owned ? -1 : 1;
      if (a.locked !== b.locked) return a.locked ? 1 : -1;
      return a.price - b.price;
    });
  }, [items]);

  // Handle equip
  const handleEquip = (itemId: string) => {
    switch (activeTab) {
      case 'trails':
        cosmetics.equipTrail(itemId);
        break;
      case 'colors':
        cosmetics.equipColor(itemId);
        break;
      case 'auras':
        cosmetics.equipAura(itemId);
        break;
      case 'sounds':
        cosmetics.equipSoundPack(itemId);
        break;
      case 'frames':
        cosmetics.equipFrame(itemId);
        break;
    }
  };

  // Handle purchase
  const handlePurchase = (itemId: string) => {
    switch (activeTab) {
      case 'trails':
        cosmetics.purchaseTrail(itemId, progression.spendStardust);
        break;
      case 'colors':
        cosmetics.purchaseColor(itemId, progression.spendStardust);
        break;
      case 'auras':
        cosmetics.purchaseAura(itemId, progression.spendStardust);
        break;
      case 'sounds':
        cosmetics.purchaseSoundPack(itemId, progression.spendStardust);
        break;
      case 'frames':
        cosmetics.purchaseFrame(itemId, progression.spendStardust);
        break;
    }
  };

  // Get color preview for color items
  const getColorPreview = (itemId: string): string | undefined => {
    if (activeTab !== 'colors') return undefined;
    const color = LIGHT_COLORS[itemId];
    return color?.color === 'rainbow' ? undefined : color?.color;
  };

  // Get count key for current tab
  const getCountKey = (): 'trails' | 'colors' | 'auras' | 'soundPacks' | 'frames' => {
    switch (activeTab) {
      case 'trails': return 'trails';
      case 'colors': return 'colors';
      case 'auras': return 'auras';
      case 'sounds': return 'soundPacks';
      case 'frames': return 'frames';
    }
  };

  // Get preview type for current tab
  const getPreviewType = (): 'trail' | 'color' | 'aura' | 'frame' | null => {
    switch (activeTab) {
      case 'trails': return 'trail';
      case 'colors': return 'color';
      case 'auras': return 'aura';
      case 'frames': return 'frame';
      default: return null;
    }
  };

  // Handle preview
  const handlePreview = (itemId: string) => {
    const type = getPreviewType();
    if (type) {
      setPreviewItem({ type, id: itemId });
    }
  };

  return (
    <Panel title="Cosmetic Shop" icon="🛒">
      <div className="space-y-4">
        {/* Preview Modal */}
        {previewItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
            <div className="bg-slate-800 rounded-2xl p-6 border border-white/10 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Preview</h3>
                <button onClick={() => setPreviewItem(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="flex justify-center mb-4">
                <CosmeticPreview type={previewItem.type} itemId={previewItem.id} size={160} />
              </div>
              <p className="text-center text-gray-400 text-sm">Click anywhere to close</p>
            </div>
          </div>
        )}

        {/* Color Picker Modal */}
        {showColorPicker && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowColorPicker(false)}>
            <div onClick={e => e.stopPropagation()}>
              <ColorPicker onClose={() => setShowColorPicker(false)} />
            </div>
          </div>
        )}

        {/* Stardust Balance */}
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg p-3 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💫</span>
            <div>
              <p className="text-xs text-amber-300">Your Balance</p>
              <p className="text-lg font-bold text-white">{progression.state.stardust.toLocaleString()}</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Owned: {cosmetics.getOwnedCount()[getCountKey()]}</p>
            <p>Total: {cosmetics.getTotalCount()[getCountKey()]}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 flex-wrap">
          <TabButton
            label="Trails"
            icon="✨"
            active={activeTab === 'trails'}
            onClick={() => setActiveTab('trails')}
          />
          <TabButton
            label="Colors"
            icon="🎨"
            active={activeTab === 'colors'}
            onClick={() => setActiveTab('colors')}
          />
          <TabButton
            label="Auras"
            icon="💠"
            active={activeTab === 'auras'}
            onClick={() => setActiveTab('auras')}
          />
          <TabButton
            label="Sounds"
            icon="🔔"
            active={activeTab === 'sounds'}
            onClick={() => setActiveTab('sounds')}
          />
          <TabButton
            label="Frames"
            icon="🖼️"
            active={activeTab === 'frames'}
            onClick={() => setActiveTab('frames')}
          />
        </div>

        {/* Custom Color Button (only on colors tab) */}
        {activeTab === 'colors' && (
          <button
            onClick={() => setShowColorPicker(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-white font-medium flex items-center justify-center gap-2 hover:from-purple-600/30 hover:to-pink-600/30 transition-all"
          >
            <span>🎨</span>
            <span>Custom Color Picker</span>
            {cosmetics.data.customColorUnlocked && cosmetics.data.customColor && (
              <div 
                className="w-5 h-5 rounded-full border-2 border-white/30 ml-2"
                style={{ backgroundColor: cosmetics.data.customColor }}
              />
            )}
          </button>
        )}

        {/* Items Grid */}
        <div className="max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {sortedItems.map(item => (
              <CosmeticCard
                key={item.id}
                item={item}
                colorPreview={getColorPreview(item.id)}
                onEquip={() => handleEquip(item.id)}
                onPurchase={() => handlePurchase(item.id)}
                onPreview={getPreviewType() ? () => handlePreview(item.id) : undefined}
                canAfford={progression.state.stardust >= item.price}
              />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
};

export default CosmeticShop;
