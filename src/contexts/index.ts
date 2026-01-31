// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Contexts Barrel Export
// ═══════════════════════════════════════════════════════════════════════════

export { GameProvider, useGame, useGameStateContext, useProgressionContext, useAudioContext, useInputContext } from './GameContext';
export type { GameContextType, GameProviderProps } from './GameContext';

export { UIProvider, useUI } from './UIContext';
export type { UIContextType, UIProviderProps, PanelType, ModalType, Toast, Achievement } from './UIContext';

export { AnchoringProvider, useAnchoringContext } from './AnchoringContext';
export type { AnchoringContextType, AnchoringProviderProps, AnchorProvider, AnchorTrigger } from './AnchoringContext';
