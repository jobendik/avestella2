// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Cosmetics Hook (Batch 2: Personalization)
// ═══════════════════════════════════════════════════════════════════════════
// Server-synced cosmetics - all data persisted to MongoDB via WebSocket

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useServerSync } from './useServerSync';
import { gameClient } from '@/services/GameClient';
import {
  TRAIL_STYLES,
  LIGHT_COLORS,
  AURA_EFFECTS,
  TITLES,
  COMPANION_TYPES,
  SOUND_PACKS,
  AVATAR_FRAMES,
  type CompanionType,
  type Title,
  type SoundPack,
  type AvatarFrame,
} from '@/constants/cosmetics';
import type { TrailStyle, LightColor, AuraEffect, Rarity } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Storage Key
// ─────────────────────────────────────────────────────────────────────────────

const COSMETICS_STORAGE_KEY = 'avestella_cosmetics_v1';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CosmeticsData {
  // Owned cosmetics
  ownedTrails: string[];
  ownedColors: string[];
  ownedAuras: string[];
  ownedTitles: string[];
  ownedCompanions: string[];
  ownedSoundPacks: string[];
  ownedFrames: string[];

  // Equipped cosmetics
  equippedTrail: string;
  equippedColor: string;
  equippedAura: string;
  equippedTitle: string;
  equippedCompanion: string | null;
  equippedSoundPack: string;
  equippedFrame: string;

  // Custom color (hex input feature)
  customColor: string | null;
  customColorUnlocked: boolean;

  // Preview state
  previewingItem: { type: string; id: string } | null;

  // Purchase history for analytics
  purchaseCount: number;
  totalSpent: number;
}

export interface CosmeticItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  rarity: Rarity;
  desc?: string;
  owned: boolean;
  equipped: boolean;
  locked: boolean;
  lockReason?: string;
}

export interface UseCosmeticsReturn {
  // State
  data: CosmeticsData;

  // Equipped items (quick access)
  currentTrail: TrailStyle;
  currentColor: LightColor;
  currentAura: AuraEffect;
  currentTitle: Title | null;
  currentCompanion: CompanionType | null;
  currentSoundPack: SoundPack;
  currentFrame: AvatarFrame;

  // Lists with ownership status
  getAllTrails: () => CosmeticItem[];
  getAllColors: () => CosmeticItem[];
  getAllAuras: () => CosmeticItem[];
  getAllTitles: () => CosmeticItem[];
  getAllCompanions: () => CosmeticItem[];
  getAllSoundPacks: () => CosmeticItem[];
  getAllFrames: () => CosmeticItem[];

  // Actions
  equipTrail: (trailId: string) => boolean;
  equipColor: (colorId: string) => boolean;
  equipAura: (auraId: string) => boolean;
  equipTitle: (titleId: string) => boolean;
  equipCompanion: (companionId: string | null) => boolean;
  equipSoundPack: (packId: string) => boolean;
  equipFrame: (frameId: string) => boolean;

  // Purchase
  purchaseTrail: (trailId: string, spendStardust: (amount: number) => boolean) => boolean;
  purchaseColor: (colorId: string, spendStardust: (amount: number) => boolean) => boolean;
  purchaseAura: (auraId: string, spendStardust: (amount: number) => boolean) => boolean;
  purchaseSoundPack: (packId: string, spendStardust: (amount: number) => boolean) => boolean;
  purchaseFrame: (frameId: string, spendStardust: (amount: number) => boolean) => boolean;

  // Unlock (for achievement/level based cosmetics)
  unlockTrail: (trailId: string) => boolean;
  unlockColor: (colorId: string) => boolean;
  unlockAura: (auraId: string) => boolean;
  unlockTitle: (titleId: string) => boolean;
  unlockCompanion: (companionId: string) => boolean;
  unlockSoundPack: (packId: string) => boolean;
  unlockFrame: (frameId: string) => boolean;

  // Custom color
  setCustomColor: (color: string) => void;
  unlockCustomColor: () => boolean;
  isValidHexColor: (color: string) => boolean;

  // Preview system
  startPreview: (type: string, id: string) => void;
  stopPreview: () => void;
  isPreviewActive: () => boolean;
  getPreviewItem: () => { type: string; id: string } | null;

  // Ownership checks
  ownsTrail: (trailId: string) => boolean;
  ownsColor: (colorId: string) => boolean;
  ownsAura: (auraId: string) => boolean;
  ownsTitle: (titleId: string) => boolean;
  ownsCompanion: (companionId: string) => boolean;
  ownsSoundPack: (packId: string) => boolean;
  ownsFrame: (frameId: string) => boolean;

  // Stats
  getOwnedCount: () => { trails: number; colors: number; auras: number; titles: number; companions: number; soundPacks: number; frames: number };
  getTotalCount: () => { trails: number; colors: number; auras: number; titles: number; companions: number; soundPacks: number; frames: number };

  // Persistence
  saveCosmetics: () => void;
  loadCosmetics: () => void;
  resetCosmetics: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default State
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_DATA: CosmeticsData = {
  ownedTrails: ['default'],
  ownedColors: ['amber'],
  ownedAuras: ['none'],
  ownedTitles: ['wanderer'],
  ownedCompanions: ['wisp'],
  ownedSoundPacks: ['default'],
  ownedFrames: ['none'],

  equippedTrail: 'default',
  equippedColor: 'amber',
  equippedAura: 'none',
  equippedTitle: 'wanderer',
  equippedCompanion: 'wisp',
  equippedSoundPack: 'default',
  equippedFrame: 'none',

  customColor: null,
  customColorUnlocked: false,

  previewingItem: null,

  purchaseCount: 0,
  totalSpent: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useCosmetics(playerId?: string): UseCosmeticsReturn {
  const [data, setData] = useState<CosmeticsData>(DEFAULT_DATA);

  // Server sync for persistence
  const serverSync = useServerSync(playerId || 'anonymous');

  // Sync from server when data arrives
  // Sync from server when data arrives
  useEffect(() => {
    if (serverSync.playerData?.cosmetics) {
      const cosmetics = serverSync.playerData.cosmetics;
      setData(prev => ({
        ...prev,
        // Parse owned items with prefix handling
        ownedTrails: cosmetics.ownedItems
          .filter(id => id in TRAIL_STYLES || id.startsWith('trail_'))
          .map(id => id.replace('trail_', '')),
        ownedColors: cosmetics.ownedItems
          .filter(id => id in LIGHT_COLORS || id.startsWith('color_'))
          .map(id => id.replace('color_', '')),
        ownedAuras: cosmetics.ownedItems
          .filter(id => id in AURA_EFFECTS || id.startsWith('aura_'))
          .map(id => id.replace('aura_', '')),
        ownedTitles: cosmetics.ownedItems
          .filter(id => id in TITLES || id.startsWith('title_'))
          .map(id => id.replace('title_', '')),
        ownedSoundPacks: cosmetics.ownedItems
          .filter(id => id in SOUND_PACKS || id.startsWith('sound_'))
          .map(id => id.replace('sound_', '')),
        ownedFrames: cosmetics.ownedItems
          .filter(id => id in AVATAR_FRAMES || id.startsWith('frame_'))
          .map(id => id.replace('frame_', '')),

        equippedTrail: cosmetics.equippedTrail || prev.equippedTrail,
        equippedAura: cosmetics.equippedAura || prev.equippedAura,
        equippedTitle: cosmetics.equippedTitle || prev.equippedTitle,
      }));
    }
  }, [serverSync.playerData?.cosmetics]);

  // ─────────────────────────────────────────────────────────────────────────
  // Current Equipped Items (memoized)
  // ─────────────────────────────────────────────────────────────────────────

  const currentTrail = useMemo(() => {
    return TRAIL_STYLES[data.equippedTrail] || TRAIL_STYLES.default;
  }, [data.equippedTrail]);

  const currentColor = useMemo(() => {
    return LIGHT_COLORS[data.equippedColor] || LIGHT_COLORS.amber;
  }, [data.equippedColor]);

  const currentAura = useMemo(() => {
    return AURA_EFFECTS[data.equippedAura] || AURA_EFFECTS.none;
  }, [data.equippedAura]);

  const currentTitle = useMemo(() => {
    return data.equippedTitle ? TITLES[data.equippedTitle] || null : null;
  }, [data.equippedTitle]);

  const currentCompanion = useMemo(() => {
    return data.equippedCompanion ? COMPANION_TYPES[data.equippedCompanion] || null : null;
  }, [data.equippedCompanion]);

  const currentSoundPack = useMemo(() => {
    return SOUND_PACKS[data.equippedSoundPack] || SOUND_PACKS.default;
  }, [data.equippedSoundPack]);

  const currentFrame = useMemo(() => {
    return AVATAR_FRAMES[data.equippedFrame] || AVATAR_FRAMES.none;
  }, [data.equippedFrame]);

  // ─────────────────────────────────────────────────────────────────────────
  // Get All Items with Status
  // ─────────────────────────────────────────────────────────────────────────

  const getAllTrails = useCallback((): CosmeticItem[] => {
    return Object.entries(TRAIL_STYLES).map(([id, trail]) => ({
      id,
      name: trail.name,
      icon: trail.icon,
      price: trail.price,
      rarity: trail.rarity,
      desc: trail.desc,
      owned: data.ownedTrails.includes(id),
      equipped: data.equippedTrail === id,
      locked: trail.unlock?.type !== 'default' && trail.unlock?.type !== 'purchase' && !data.ownedTrails.includes(id),
      lockReason: trail.requirement,
    }));
  }, [data.ownedTrails, data.equippedTrail]);

  const getAllColors = useCallback((): CosmeticItem[] => {
    return Object.entries(LIGHT_COLORS).map(([id, color]) => ({
      id,
      name: color.name,
      icon: '🎨',
      price: color.price,
      rarity: color.rarity,
      desc: color.desc,
      owned: data.ownedColors.includes(id),
      equipped: data.equippedColor === id,
      locked: color.unlock?.type !== 'default' && color.unlock?.type !== 'purchase' && !data.ownedColors.includes(id),
      lockReason: color.requirement,
    }));
  }, [data.ownedColors, data.equippedColor]);

  const getAllAuras = useCallback((): CosmeticItem[] => {
    return Object.entries(AURA_EFFECTS).map(([id, aura]) => ({
      id,
      name: aura.name,
      icon: aura.icon,
      price: aura.price,
      rarity: aura.rarity,
      desc: aura.desc,
      owned: data.ownedAuras.includes(id),
      equipped: data.equippedAura === id,
      locked: false,
    }));
  }, [data.ownedAuras, data.equippedAura]);

  const getAllTitles = useCallback((): CosmeticItem[] => {
    return Object.entries(TITLES).map(([id, title]) => ({
      id,
      name: title.name,
      icon: '🏷️',
      price: 0,
      rarity: 'common' as Rarity,
      owned: data.ownedTitles.includes(id),
      equipped: data.equippedTitle === id,
      locked: title.unlock !== 'default' && !data.ownedTitles.includes(id),
      lockReason: title.requirement,
    }));
  }, [data.ownedTitles, data.equippedTitle]);

  const getAllCompanions = useCallback((): CosmeticItem[] => {
    return Object.entries(COMPANION_TYPES).map(([id, companion]) => ({
      id,
      name: companion.name,
      icon: companion.icon,
      price: 0,
      rarity: 'common' as Rarity,
      owned: data.ownedCompanions.includes(id),
      equipped: data.equippedCompanion === id,
      locked: companion.unlock !== 'default' && !data.ownedCompanions.includes(id),
      lockReason: companion.requirement,
    }));
  }, [data.ownedCompanions, data.equippedCompanion]);

  const getAllSoundPacks = useCallback((): CosmeticItem[] => {
    return Object.entries(SOUND_PACKS).map(([id, pack]) => ({
      id,
      name: pack.name,
      icon: pack.icon,
      price: pack.price,
      rarity: pack.rarity,
      desc: pack.desc,
      owned: data.ownedSoundPacks.includes(id),
      equipped: data.equippedSoundPack === id,
      locked: pack.unlock?.type !== 'default' && pack.unlock?.type !== 'purchase' && !data.ownedSoundPacks.includes(id),
    }));
  }, [data.ownedSoundPacks, data.equippedSoundPack]);

  const getAllFrames = useCallback((): CosmeticItem[] => {
    return Object.entries(AVATAR_FRAMES).map(([id, frame]) => ({
      id,
      name: frame.name,
      icon: frame.icon,
      price: frame.price,
      rarity: frame.rarity,
      desc: frame.desc,
      owned: data.ownedFrames.includes(id),
      equipped: data.equippedFrame === id,
      locked: frame.unlock?.type !== 'default' && frame.unlock?.type !== 'purchase' && !data.ownedFrames.includes(id),
      lockReason: frame.requirement,
    }));
  }, [data.ownedFrames, data.equippedFrame]);

  // ─────────────────────────────────────────────────────────────────────────
  // Equip Actions - synced to server
  // ─────────────────────────────────────────────────────────────────────────

  const equipTrail = useCallback((trailId: string): boolean => {
    if (!data.ownedTrails.includes(trailId)) return false;
    setData(prev => ({ ...prev, equippedTrail: trailId }));
    serverSync.updateCosmetics({ equippedTrail: trailId });
    return true;
  }, [data.ownedTrails, serverSync]);

  const equipColor = useCallback((colorId: string): boolean => {
    if (!data.ownedColors.includes(colorId)) return false;
    setData(prev => ({ ...prev, equippedColor: colorId }));
    return true;
  }, [data.ownedColors]);

  const equipAura = useCallback((auraId: string): boolean => {
    if (!data.ownedAuras.includes(auraId)) return false;
    setData(prev => ({ ...prev, equippedAura: auraId }));
    serverSync.updateCosmetics({ equippedAura: auraId });
    return true;
  }, [data.ownedAuras, serverSync]);

  const equipTitle = useCallback((titleId: string): boolean => {
    if (!data.ownedTitles.includes(titleId)) return false;
    setData(prev => ({ ...prev, equippedTitle: titleId }));
    serverSync.updateCosmetics({ equippedTitle: titleId });
    return true;
  }, [data.ownedTitles, serverSync]);

  const equipCompanion = useCallback((companionId: string | null): boolean => {
    if (companionId !== null && !data.ownedCompanions.includes(companionId)) return false;
    setData(prev => ({ ...prev, equippedCompanion: companionId }));
    return true;
  }, [data.ownedCompanions]);

  const equipSoundPack = useCallback((packId: string): boolean => {
    if (!data.ownedSoundPacks.includes(packId)) return false;
    setData(prev => ({ ...prev, equippedSoundPack: packId }));
    return true;
  }, [data.ownedSoundPacks]);

  const equipFrame = useCallback((frameId: string): boolean => {
    if (!data.ownedFrames.includes(frameId)) return false;
    setData(prev => ({ ...prev, equippedFrame: frameId }));
    return true;
  }, [data.ownedFrames]);

  // ─────────────────────────────────────────────────────────────────────────
  // Purchase Actions
  // ─────────────────────────────────────────────────────────────────────────

  const purchaseTrail = useCallback((trailId: string, spendStardust: (amount: number) => boolean): boolean => {
    if (data.ownedTrails.includes(trailId)) return false;

    const trail = TRAIL_STYLES[trailId];
    if (!trail || trail.unlock?.type !== 'purchase') return false;

    if (!spendStardust(trail.price)) return false;

    // Server purchase
    gameClient.purchaseCosmetic(`trail_${trailId}`, trail.price);

    // Optimistic
    setData(prev => ({
      ...prev,
      ownedTrails: [...prev.ownedTrails, trailId],
      purchaseCount: prev.purchaseCount + 1,
      totalSpent: prev.totalSpent + trail.price,
    }));
    return true;
  }, [data.ownedTrails]);

  const purchaseColor = useCallback((colorId: string, spendStardust: (amount: number) => boolean): boolean => {
    if (data.ownedColors.includes(colorId)) return false;

    const color = LIGHT_COLORS[colorId];
    if (!color || color.unlock?.type !== 'purchase') return false;

    if (!spendStardust(color.price)) return false;

    // Server purchase
    gameClient.purchaseCosmetic(`color_${colorId}`, color.price);

    setData(prev => ({
      ...prev,
      ownedColors: [...prev.ownedColors, colorId],
      purchaseCount: prev.purchaseCount + 1,
      totalSpent: prev.totalSpent + color.price,
    }));
    return true;
  }, [data.ownedColors]);

  const purchaseAura = useCallback((auraId: string, spendStardust: (amount: number) => boolean): boolean => {
    if (data.ownedAuras.includes(auraId)) return false;

    const aura = AURA_EFFECTS[auraId];
    if (!aura) return false;

    if (!spendStardust(aura.price)) return false;

    // Server purchase
    gameClient.purchaseCosmetic(`aura_${auraId}`, aura.price);

    setData(prev => ({
      ...prev,
      ownedAuras: [...prev.ownedAuras, auraId],
      purchaseCount: prev.purchaseCount + 1,
      totalSpent: prev.totalSpent + aura.price,
    }));
    return true;
  }, [data.ownedAuras]);

  const purchaseSoundPack = useCallback((packId: string, spendStardust: (amount: number) => boolean): boolean => {
    if (data.ownedSoundPacks.includes(packId)) return false;

    const pack = SOUND_PACKS[packId];
    if (!pack || pack.unlock?.type !== 'purchase') return false;

    if (!spendStardust(pack.price)) return false;

    // Server purchase
    gameClient.purchaseCosmetic(`sound_${packId}`, pack.price);

    setData(prev => ({
      ...prev,
      ownedSoundPacks: [...prev.ownedSoundPacks, packId],
      purchaseCount: prev.purchaseCount + 1,
      totalSpent: prev.totalSpent + pack.price,
    }));
    return true;
  }, [data.ownedSoundPacks]);

  const purchaseFrame = useCallback((frameId: string, spendStardust: (amount: number) => boolean): boolean => {
    if (data.ownedFrames.includes(frameId)) return false;

    const frame = AVATAR_FRAMES[frameId];
    if (!frame || frame.unlock?.type !== 'purchase') return false;

    if (!spendStardust(frame.price)) return false;

    // Server purchase
    gameClient.purchaseCosmetic(`frame_${frameId}`, frame.price);

    setData(prev => ({
      ...prev,
      ownedFrames: [...prev.ownedFrames, frameId],
      purchaseCount: prev.purchaseCount + 1,
      totalSpent: prev.totalSpent + frame.price,
    }));
    return true;
  }, [data.ownedFrames]);

  // ─────────────────────────────────────────────────────────────────────────
  // Unlock Actions (for achievements/levels)
  // ─────────────────────────────────────────────────────────────────────────

  const unlockTrail = useCallback((trailId: string): boolean => {
    if (data.ownedTrails.includes(trailId)) return false;
    if (!TRAIL_STYLES[trailId]) return false;

    setData(prev => ({
      ...prev,
      ownedTrails: [...prev.ownedTrails, trailId],
    }));
    return true;
  }, [data.ownedTrails]);

  const unlockColor = useCallback((colorId: string): boolean => {
    if (data.ownedColors.includes(colorId)) return false;
    if (!LIGHT_COLORS[colorId]) return false;

    setData(prev => ({
      ...prev,
      ownedColors: [...prev.ownedColors, colorId],
    }));
    return true;
  }, [data.ownedColors]);

  const unlockAura = useCallback((auraId: string): boolean => {
    if (data.ownedAuras.includes(auraId)) return false;
    if (!AURA_EFFECTS[auraId]) return false;

    setData(prev => ({
      ...prev,
      ownedAuras: [...prev.ownedAuras, auraId],
    }));
    return true;
  }, [data.ownedAuras]);

  const unlockTitle = useCallback((titleId: string): boolean => {
    if (data.ownedTitles.includes(titleId)) return false;
    if (!TITLES[titleId]) return false;

    setData(prev => ({
      ...prev,
      ownedTitles: [...prev.ownedTitles, titleId],
    }));
    return true;
  }, [data.ownedTitles]);

  const unlockCompanion = useCallback((companionId: string): boolean => {
    if (data.ownedCompanions.includes(companionId)) return false;
    if (!COMPANION_TYPES[companionId]) return false;

    setData(prev => ({
      ...prev,
      ownedCompanions: [...prev.ownedCompanions, companionId],
    }));
    return true;
  }, [data.ownedCompanions]);

  const unlockSoundPack = useCallback((packId: string): boolean => {
    if (data.ownedSoundPacks.includes(packId)) return false;
    if (!SOUND_PACKS[packId]) return false;

    setData(prev => ({
      ...prev,
      ownedSoundPacks: [...prev.ownedSoundPacks, packId],
    }));
    return true;
  }, [data.ownedSoundPacks]);

  const unlockFrame = useCallback((frameId: string): boolean => {
    if (data.ownedFrames.includes(frameId)) return false;
    if (!AVATAR_FRAMES[frameId]) return false;

    setData(prev => ({
      ...prev,
      ownedFrames: [...prev.ownedFrames, frameId],
    }));
    return true;
  }, [data.ownedFrames]);

  // ─────────────────────────────────────────────────────────────────────────
  // Custom Color
  // ─────────────────────────────────────────────────────────────────────────

  const isValidHexColor = useCallback((color: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }, []);

  const setCustomColor = useCallback((color: string) => {
    if (!data.customColorUnlocked) return;
    if (!isValidHexColor(color)) return;
    setData(prev => ({ ...prev, customColor: color }));
  }, [data.customColorUnlocked, isValidHexColor]);

  const unlockCustomColor = useCallback((): boolean => {
    if (data.customColorUnlocked) return false;
    setData(prev => ({ ...prev, customColorUnlocked: true }));
    return true;
  }, [data.customColorUnlocked]);

  // ─────────────────────────────────────────────────────────────────────────
  // Preview System
  // ─────────────────────────────────────────────────────────────────────────

  const startPreview = useCallback((type: string, id: string) => {
    setData(prev => ({ ...prev, previewingItem: { type, id } }));
  }, []);

  const stopPreview = useCallback(() => {
    setData(prev => ({ ...prev, previewingItem: null }));
  }, []);

  const isPreviewActive = useCallback((): boolean => {
    return data.previewingItem !== null;
  }, [data.previewingItem]);

  const getPreviewItem = useCallback((): { type: string; id: string } | null => {
    return data.previewingItem;
  }, [data.previewingItem]);

  // ─────────────────────────────────────────────────────────────────────────
  // Ownership Checks
  // ─────────────────────────────────────────────────────────────────────────

  const ownsTrail = useCallback((trailId: string): boolean => {
    return data.ownedTrails.includes(trailId);
  }, [data.ownedTrails]);

  const ownsColor = useCallback((colorId: string): boolean => {
    return data.ownedColors.includes(colorId);
  }, [data.ownedColors]);

  const ownsAura = useCallback((auraId: string): boolean => {
    return data.ownedAuras.includes(auraId);
  }, [data.ownedAuras]);

  const ownsTitle = useCallback((titleId: string): boolean => {
    return data.ownedTitles.includes(titleId);
  }, [data.ownedTitles]);

  const ownsCompanion = useCallback((companionId: string): boolean => {
    return data.ownedCompanions.includes(companionId);
  }, [data.ownedCompanions]);

  const ownsSoundPack = useCallback((packId: string): boolean => {
    return data.ownedSoundPacks.includes(packId);
  }, [data.ownedSoundPacks]);

  const ownsFrame = useCallback((frameId: string): boolean => {
    return data.ownedFrames.includes(frameId);
  }, [data.ownedFrames]);

  // ─────────────────────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────────────────────

  const getOwnedCount = useCallback(() => ({
    trails: data.ownedTrails.length,
    colors: data.ownedColors.length,
    auras: data.ownedAuras.length,
    titles: data.ownedTitles.length,
    companions: data.ownedCompanions.length,
    soundPacks: data.ownedSoundPacks.length,
    frames: data.ownedFrames.length,
  }), [data]);

  const getTotalCount = useCallback(() => ({
    trails: Object.keys(TRAIL_STYLES).length,
    colors: Object.keys(LIGHT_COLORS).length,
    auras: Object.keys(AURA_EFFECTS).length,
    titles: Object.keys(TITLES).length,
    companions: Object.keys(COMPANION_TYPES).length,
    soundPacks: Object.keys(SOUND_PACKS).length,
    frames: Object.keys(AVATAR_FRAMES).length,
  }), []);

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence - now handled by server sync
  // ─────────────────────────────────────────────────────────────────────────

  const saveCosmetics = useCallback(() => {
    // No-op: Server sync handles persistence automatically
    console.log('[Cosmetics] saveCosmetics called - data is auto-synced to server');
  }, []);

  const loadCosmetics = useCallback(() => {
    // Request full sync from server
    serverSync.requestFullSync();
  }, [serverSync]);

  const resetCosmetics = useCallback(() => {
    setData(DEFAULT_DATA);
    serverSync.updateCosmetics({
      ownedItems: [...DEFAULT_DATA.ownedTrails, ...DEFAULT_DATA.ownedAuras],
      equippedTrail: DEFAULT_DATA.equippedTrail,
      equippedAura: DEFAULT_DATA.equippedAura,
      equippedTitle: DEFAULT_DATA.equippedTitle,
      equippedEmotes: [],
      equippedPulseEffect: null,
    });
  }, [serverSync]);

  // Load on mount - handled by serverSync
  // Note: serverSync automatically loads data on connect

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────

  return {
    data,
    currentTrail,
    currentColor,
    currentAura,
    currentTitle,
    currentCompanion,
    currentSoundPack,
    currentFrame,
    getAllTrails,
    getAllColors,
    getAllAuras,
    getAllTitles,
    getAllCompanions,
    getAllSoundPacks,
    getAllFrames,
    equipTrail,
    equipColor,
    equipAura,
    equipTitle,
    equipCompanion,
    equipSoundPack,
    equipFrame,
    purchaseTrail,
    purchaseColor,
    purchaseAura,
    purchaseSoundPack,
    purchaseFrame,
    unlockTrail,
    unlockColor,
    unlockAura,
    unlockTitle,
    unlockCompanion,
    unlockSoundPack,
    unlockFrame,
    setCustomColor,
    unlockCustomColor,
    isValidHexColor,
    startPreview,
    stopPreview,
    isPreviewActive,
    getPreviewItem,
    ownsTrail,
    ownsColor,
    ownsAura,
    ownsTitle,
    ownsCompanion,
    ownsSoundPack,
    ownsFrame,
    getOwnedCount,
    getTotalCount,
    saveCosmetics,
    loadCosmetics,
    resetCosmetics,
  };
}

export default useCosmetics;
