// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Anchoring Hook
// "Need Before Solution" - Only prompt for persistence when value exists
// Server-synced anchoring sessions - data persisted to MongoDB via WebSocket
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useServerSync } from './useServerSync';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AnchorProvider = 'google' | null;

export type AnchorTrigger =
  | 'first_bond_sealed'      // Most emotional - a permanent star memory
  | 'first_golden_fragment'  // Rare collectible
  | 'guild_joined'           // Social belonging
  | 'level_milestone'        // Level 5, 10, 15...
  | 'voice_unlocked'         // About to get personal
  | 'stardust_threshold'     // Currency accumulation
  | 'star_memory_created'    // Permanent constellation
  | 'companion_acquired'     // Purchased something
  | 'cosmetic_unlocked'      // Customization investment
  | 'friend_request_received' // Someone wants to connect
  | 'manual';                // User opens settings

export interface AnchorState {
  isAnchored: boolean;
  provider: AnchorProvider;
  anchoredAt: number | null;
  
  // Tracking dismissed prompts (respect "not now")
  dismissedAt: number | null;
  dismissCount: number;
  lastTrigger: AnchorTrigger | null;
  
  // What they'd lose (for emotional display)
  valuableAssets: {
    bonds: number;
    starMemories: number;
    stardust: number;
    level: number;
    achievements: number;
    companions: number;
    cosmetics: number;
  };
}

export interface UseAnchoringReturn {
  // State
  isAnchored: boolean;
  isModalOpen: boolean;
  provider: AnchorProvider;
  currentTrigger: AnchorTrigger | null;
  valuableAssets: AnchorState['valuableAssets'];
  
  // Actions
  triggerAnchorPrompt: (trigger: AnchorTrigger) => boolean;
  completeAnchoring: (provider: AnchorProvider) => Promise<boolean>;
  dismissAnchorPrompt: () => void;
  closeModal: () => void;
  resetAnchorState: () => void;
  
  // Checks
  shouldPromptForAnchor: (trigger: AnchorTrigger) => boolean;
  canShowAnchorPrompt: (bypassCooldown?: boolean) => boolean;
  
  // Asset tracking (called by other hooks)
  updateAssets: (assets: Partial<AnchorState['valuableAssets']>) => void;
  
  // Persistence
  saveAnchorState: () => void;
  loadAnchorState: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'anchor_state';

// Cooldown after dismissal (in ms) - increases with each dismissal
const BASE_COOLDOWN = 30 * 60 * 1000; // 30 minutes
const MAX_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days

// Thresholds that make anchoring valuable
const VALUE_THRESHOLDS = {
  bonds: 1,
  starMemories: 1,
  stardust: 500,
  level: 5,
  achievements: 3,
  companions: 1,
  cosmetics: 2,
};

// Priority of triggers (higher = more likely to prompt)
const TRIGGER_PRIORITY: Record<AnchorTrigger, number> = {
  first_bond_sealed: 10,      // Highest - emotional peak
  star_memory_created: 9,
  voice_unlocked: 8,
  companion_acquired: 7,
  guild_joined: 7,
  first_golden_fragment: 6,
  friend_request_received: 5,
  level_milestone: 4,
  cosmetic_unlocked: 4,
  stardust_threshold: 3,
  manual: 10,                 // Always allow manual
};

// Triggers that should only fire once per session
const ONCE_PER_SESSION_TRIGGERS: AnchorTrigger[] = [
  'first_bond_sealed',
  'first_golden_fragment',
  'voice_unlocked',
];

const DEFAULT_STATE: AnchorState = {
  isAnchored: false,
  provider: null,
  anchoredAt: null,
  dismissedAt: null,
  dismissCount: 0,
  lastTrigger: null,
  valuableAssets: {
    bonds: 0,
    starMemories: 0,
    stardust: 0,
    level: 1,
    achievements: 0,
    companions: 0,
    cosmetics: 0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useAnchoring(playerId?: string): UseAnchoringReturn {
  const [state, setState] = useState<AnchorState>(DEFAULT_STATE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState<AnchorTrigger | null>(null);
  const [sessionTriggeredOnce, setSessionTriggeredOnce] = useState<Set<AnchorTrigger>>(new Set());
  
  // Server sync for persistence
  const serverSync = useServerSync(playerId || 'anonymous');
  
  // Sync from server when data arrives
  useEffect(() => {
    if (serverSync.playerData?.anchoring) {
      const anchoring = serverSync.playerData.anchoring;
      setState(prev => ({
        ...prev,
        isAnchored: anchoring.breathingCompleted > 0,
        anchoredAt: anchoring.lastAnchorDate ? new Date(anchoring.lastAnchorDate).getTime() : null,
      }));
    }
  }, [serverSync.playerData?.anchoring]);

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence - now handled by server sync
  // ─────────────────────────────────────────────────────────────────────────

  const saveAnchorState = useCallback(() => {
    // No-op: Server sync handles persistence automatically
    console.log('[Anchoring] saveAnchorState called - data is auto-synced to server');
  }, []);

  const loadAnchorState = useCallback(() => {
    // Request full sync from server
    serverSync.requestFullSync();
  }, [serverSync]);

  // ─────────────────────────────────────────────────────────────────────────
  // Value Calculation
  // ─────────────────────────────────────────────────────────────────────────

  const hasSignificantValue = useMemo(() => {
    const { valuableAssets } = state;
    return (
      valuableAssets.bonds >= VALUE_THRESHOLDS.bonds ||
      valuableAssets.starMemories >= VALUE_THRESHOLDS.starMemories ||
      valuableAssets.stardust >= VALUE_THRESHOLDS.stardust ||
      valuableAssets.level >= VALUE_THRESHOLDS.level ||
      valuableAssets.achievements >= VALUE_THRESHOLDS.achievements ||
      valuableAssets.companions >= VALUE_THRESHOLDS.companions ||
      valuableAssets.cosmetics >= VALUE_THRESHOLDS.cosmetics
    );
  }, [state.valuableAssets]);

  // ─────────────────────────────────────────────────────────────────────────
  // Cooldown Management
  // ─────────────────────────────────────────────────────────────────────────

  const getCooldownDuration = useCallback(() => {
    // Exponential backoff: 30min, 1h, 2h, 4h, 8h, 16h, 32h, then cap at 7 days
    const multiplier = Math.pow(2, Math.min(state.dismissCount, 7));
    return Math.min(BASE_COOLDOWN * multiplier, MAX_COOLDOWN);
  }, [state.dismissCount]);

  const isInCooldown = useCallback(() => {
    if (!state.dismissedAt) return false;
    const cooldown = getCooldownDuration();
    return Date.now() - state.dismissedAt < cooldown;
  }, [state.dismissedAt, getCooldownDuration]);

  // ─────────────────────────────────────────────────────────────────────────
  // Prompt Logic
  // ─────────────────────────────────────────────────────────────────────────

  const canShowAnchorPrompt = useCallback((bypassCooldown = false) => {
    // Already anchored? No need
    if (state.isAnchored) return false;
    
    // In cooldown? Respect the "not now" (unless bypassing for manual trigger)
    if (!bypassCooldown && isInCooldown()) return false;
    
    // Modal already open?
    if (isModalOpen) return false;
    
    return true;
  }, [state.isAnchored, isInCooldown, isModalOpen]);

  const shouldPromptForAnchor = useCallback((trigger: AnchorTrigger) => {
    // Manual trigger should always work (bypass cooldown)
    const bypassCooldown = trigger === 'manual';
    
    if (!canShowAnchorPrompt(bypassCooldown)) return false;
    
    // Check if this is a once-per-session trigger that already fired
    if (ONCE_PER_SESSION_TRIGGERS.includes(trigger) && sessionTriggeredOnce.has(trigger)) {
      return false;
    }
    
    // For non-manual triggers, require significant value
    if (trigger !== 'manual' && !hasSignificantValue) {
      return false;
    }
    
    // Check priority - lower priority triggers need more dismissals to be ignored
    const priority = TRIGGER_PRIORITY[trigger];
    const threshold = Math.floor(state.dismissCount / 2);
    
    return priority > threshold;
  }, [canShowAnchorPrompt, hasSignificantValue, state.dismissCount, sessionTriggeredOnce]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const triggerAnchorPrompt = useCallback((trigger: AnchorTrigger): boolean => {
    if (!shouldPromptForAnchor(trigger)) {
      return false;
    }
    
    // Mark once-per-session triggers
    if (ONCE_PER_SESSION_TRIGGERS.includes(trigger)) {
      setSessionTriggeredOnce(prev => new Set(prev).add(trigger));
    }
    
    setCurrentTrigger(trigger);
    setIsModalOpen(true);
    
    setState(prev => ({
      ...prev,
      lastTrigger: trigger,
    }));
    
    return true;
  }, [shouldPromptForAnchor]);

  const completeAnchoring = useCallback(async (provider: AnchorProvider): Promise<boolean> => {
    if (!provider) return false;
    
    try {
      // The actual Firebase linking will be handled by the AnchoringContext
      // This hook just manages state
      setState(prev => ({
        ...prev,
        isAnchored: true,
        provider,
        anchoredAt: Date.now(),
      }));
      
      // Sync anchoring session to server
      serverSync.addAnchoringSession('anchoring', 0);
      
      setIsModalOpen(false);
      setCurrentTrigger(null);
      
      return true;
    } catch (error) {
      console.error('Anchoring failed:', error);
      return false;
    }
  }, [serverSync]);

  const dismissAnchorPrompt = useCallback(() => {
    setState(prev => ({
      ...prev,
      dismissedAt: Date.now(),
      dismissCount: prev.dismissCount + 1,
    }));
    
    setIsModalOpen(false);
    setCurrentTrigger(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setCurrentTrigger(null);
  }, []);

  const resetAnchorState = useCallback(() => {
    setState(DEFAULT_STATE);
    setIsModalOpen(false);
    setCurrentTrigger(null);
    setSessionTriggeredOnce(new Set());
    // Note: Server will handle state reset
    console.log('[Anchoring] State reset locally');
  }, []);

  const updateAssets = useCallback((assets: Partial<AnchorState['valuableAssets']>) => {
    setState(prev => ({
      ...prev,
      valuableAssets: {
        ...prev.valuableAssets,
        ...assets,
      },
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // State
    isAnchored: state.isAnchored,
    isModalOpen,
    provider: state.provider,
    currentTrigger,
    valuableAssets: state.valuableAssets,
    
    // Actions
    triggerAnchorPrompt,
    completeAnchoring,
    dismissAnchorPrompt,
    closeModal,
    resetAnchorState,
    
    // Checks
    shouldPromptForAnchor,
    canShowAnchorPrompt,
    
    // Asset tracking
    updateAssets,
    
    // Persistence
    saveAnchorState,
    loadAnchorState,
  };
}
