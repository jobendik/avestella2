// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Signals Hook
// Handles signal broadcasting and visual signal creation
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback } from 'react';
import { useGameStateContext } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';

export interface SignalActions {
  sendLightSignal: () => void;
  sendSignalAtPosition: (x: number, y: number, color?: string) => void;
}

export function useSignals(): SignalActions {
  const { gameState, broadcastGesture, getPlayerPosition } = useGameStateContext();
  const { showToast } = useUI();

  const sendLightSignal = useCallback(() => {
    if (gameState.current) {
      gameState.current.signals.push({
        x: gameState.current.playerX,
        y: gameState.current.playerY,
        distance: 0,
        speed: 10,
        life: 100,
        color: '#00FFFF'
      });
      showToast('Signal sent');
      broadcastGesture('signal', gameState.current.playerX, gameState.current.playerY);
    }
  }, [gameState, broadcastGesture, showToast]);

  const sendSignalAtPosition = useCallback((x: number, y: number, color: string = '#00FFFF') => {
    if (gameState.current) {
      gameState.current.signals.push({
        x,
        y,
        distance: 0,
        speed: 10,
        life: 100,
        color
      });
      broadcastGesture('signal', x, y);
    }
  }, [gameState, broadcastGesture]);

  return {
    sendLightSignal,
    sendSignalAtPosition
  };
}

export default useSignals;
