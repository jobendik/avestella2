// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - UI Context (Panels, Modals, Toasts)
// ═══════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PanelType =
  | 'profile'
  | 'shop'
  | 'friends'
  | 'friendsList'
  | 'guild'
  | 'events'
  | 'settings'
  | 'achievements'
  | 'seasonPass'
  | 'dailyRewards'
  | 'challenges'
  | 'screenshot'
  | 'quickChat'
  | 'map'
  | 'safety'
  | 'gallery'
  | 'leaderboard'
  | 'companions'
  | 'collectibles'
  | 'journal'
  | 'quests'
  | 'cosmos'
  | 'feedback'
  | null;

export type ModalType =
  | 'levelUp'
  | 'achievement'
  | 'purchase'
  | 'confirm'
  | 'tutorial'
  | null;

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
  position?: 'top-center' | 'top-right'; // top-center for critical alerts, top-right for general
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UIContextType {
  // Panel state
  activePanel: PanelType;
  openPanel: (panel: PanelType) => void;
  closePanel: () => void;
  togglePanel: (panel: PanelType) => void;
  isPanelOpen: (panel: PanelType) => boolean;

  // Modal state
  activeModal: ModalType;
  modalData: unknown;
  openModal: (modal: ModalType, data?: unknown) => void;
  closeModal: () => void;

  // Toast notifications
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type'], duration?: number, position?: Toast['position']) => void;
  dismissToast: (id: string) => void;

  // Achievement popups
  pendingAchievements: Achievement[];
  showAchievement: (achievement: Achievement) => void;
  dismissAchievement: (id: string) => void;

  // Level up popup
  showLevelUp: (newLevel: number) => void;
  levelUpData: { visible: boolean; level: number };
  dismissLevelUp: () => void;

  // UI state
  isHUDVisible: boolean;
  setHUDVisible: (visible: boolean) => void;
  isTutorialActive: boolean;
  setTutorialActive: (active: boolean) => void;

  // Emote Wheel
  isEmoteWheelOpen: boolean;
  emoteWheelPos: { x: number; y: number } | null;
  openEmoteWheel: (x: number, y: number) => void;
  closeEmoteWheel: () => void;
  toggleEmoteWheel: (x: number, y: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Creation
// ─────────────────────────────────────────────────────────────────────────────

const UIContext = createContext<UIContextType | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

export interface UIProviderProps {
  children: ReactNode;
}

export function UIProvider({ children }: UIProviderProps): JSX.Element {
  // Panel state
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<unknown>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Achievement state
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);

  // Level up state
  const [levelUpData, setLevelUpData] = useState({ visible: false, level: 0 });

  // UI visibility
  const [isHUDVisible, setHUDVisible] = useState(true);
  const [isTutorialActive, setTutorialActive] = useState(false);

  // Emote Wheel Logic
  const [isEmoteWheelOpen, setIsEmoteWheelOpen] = useState(false);
  const [emoteWheelPos, setEmoteWheelPos] = useState<{ x: number; y: number } | null>(null);

  const openEmoteWheel = useCallback((x: number, y: number) => {
    setEmoteWheelPos({ x, y });
    setIsEmoteWheelOpen(true);
  }, []);

  const closeEmoteWheel = useCallback(() => {
    setIsEmoteWheelOpen(false);
    setEmoteWheelPos(null);
  }, []);

  const toggleEmoteWheel = useCallback((x: number, y: number) => {
    setIsEmoteWheelOpen(prev => {
      if (!prev) setEmoteWheelPos({ x, y });
      else setEmoteWheelPos(null);
      return !prev;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Panel handlers
  // ─────────────────────────────────────────────────────────────────────────

  const openPanel = useCallback((panel: PanelType) => {
    setActivePanel(panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  const isPanelOpen = useCallback((panel: PanelType): boolean => {
    return activePanel === panel;
  }, [activePanel]);

  // ─────────────────────────────────────────────────────────────────────────
  // Modal handlers
  // ─────────────────────────────────────────────────────────────────────────

  const openModal = useCallback((modal: ModalType, data?: unknown) => {
    setActiveModal(modal);
    setModalData(data ?? null);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Toast handlers
  // ─────────────────────────────────────────────────────────────────────────

  const showToast = useCallback((
    message: string,
    type: Toast['type'] = 'info',
    duration = 4000,
    position: Toast['position'] = 'top-right'
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Limit toasts per position to prevent stacking issues
    setToasts(prev => {
      const samePositionToasts = prev.filter(t => (t.position || 'top-right') === position);
      const otherToasts = prev.filter(t => (t.position || 'top-right') !== position);
      // Keep only the last 3 toasts per position
      const limitedSamePosition = samePositionToasts.slice(-2);
      return [...otherToasts, ...limitedSamePosition, { id, message, type, duration, position }];
    });

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Achievement handlers
  // ─────────────────────────────────────────────────────────────────────────

  const showAchievement = useCallback((achievement: Achievement) => {
    setPendingAchievements(prev => [...prev, achievement]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setPendingAchievements(prev => prev.filter(a => a.id !== achievement.id));
    }, 5000);
  }, []);

  const dismissAchievement = useCallback((id: string) => {
    setPendingAchievements(prev => prev.filter(a => a.id !== id));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Level up handlers
  // ─────────────────────────────────────────────────────────────────────────

  const showLevelUp = useCallback((newLevel: number) => {
    setLevelUpData({ visible: true, level: newLevel });

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setLevelUpData(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const dismissLevelUp = useCallback(() => {
    setLevelUpData(prev => ({ ...prev, visible: false }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────────────────────

  const value: UIContextType = {
    activePanel,
    openPanel,
    closePanel,
    togglePanel,
    isPanelOpen,
    activeModal,
    modalData,
    openModal,
    closeModal,
    toasts,
    showToast,
    dismissToast,
    pendingAchievements,
    showAchievement,
    dismissAchievement,
    showLevelUp,
    levelUpData,
    dismissLevelUp,
    isHUDVisible,
    setHUDVisible,
    isTutorialActive,
    setTutorialActive,
    isEmoteWheelOpen,
    emoteWheelPos,
    openEmoteWheel,
    closeEmoteWheel,
    toggleEmoteWheel,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook for consuming context
// ─────────────────────────────────────────────────────────────────────────────

export function useUI(): UIContextType {
  const context = useContext(UIContext);

  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }

  return context;
}

export default UIContext;
