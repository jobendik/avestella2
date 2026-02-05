// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Pulse Interaction Hook
// Handles pulse mechanics, pattern recognition, and bond formation
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { useGameStateContext, usePulsePatternsContext, useAudioContext } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';
import { gameClient } from '@/services/GameClient';

export interface PulseInteractionState {
  isPulsing: boolean;
  currentPattern: string | null;
  patternConfidence: number;
  isHolding: boolean;
}

export interface PulseInteractionActions {
  handlePulseStart: () => void;
  handlePulseEnd: () => void;
}

export function usePulseInteraction(): PulseInteractionState & PulseInteractionActions {
  const { gameState, broadcastGesture, formBond, addShockwave } = useGameStateContext();
  const { currentPattern, patternConfidence, isHolding, recordPulseStart, recordPulseEnd } = usePulsePatternsContext();
  const audio = useAudioContext();
  const { showToast } = useUI();

  const [isPulsing, setIsPulsing] = useState(false);

  const handlePulseStart = useCallback(() => {
    setIsPulsing(true);
    recordPulseStart();
    audio.playPulse();

    if (gameState.current) {
      const state = gameState.current;
      state.isPulsing = true;

      // Broadcast pulse to AI agents
      broadcastGesture('pulse', state.playerX, state.playerY);

      // Add visual ripple
      (state.pulseRipples as any[]).push({
        x: state.playerX,
        y: state.playerY,
        radius: 1,
        maxRadius: 300,
        alpha: 1,
        speed: 5,
        color: state.playerColor,
        life: 100
      });

      // ───────────────────────────────────────────────────────────────────────
      // Bond Formation Logic (Server-Authoritative)
      // ───────────────────────────────────────────────────────────────────────
      const INTERACTION_RADIUS = 100;
      const nearbyAgent = state.aiAgents.find(agent => {
        const dx = agent.x - state.playerX;
        const dy = agent.y - state.playerY;
        return Math.sqrt(dx * dx + dy * dy) < INTERACTION_RADIUS;
      });

      if (nearbyAgent) {
        // SERVER-AUTHORITATIVE: Send bond interaction to server for validation/persistence
        gameClient.createBondInteraction(nearbyAgent.id, 'pulse');

        // Optimistic UI update - local bond for immediate feedback
        const bond = formBond(nearbyAgent);
        if (bond) {
          audio.playBondFormed();
          addShockwave(nearbyAgent.x, nearbyAgent.y, { maxRadius: 100, color: '#FF69B4' });
          showToast(`Connection formed with ${nearbyAgent.name}!`, 'success');
        } else {
          // Wave back if no new bond
          nearbyAgent.currentMessage = "👋";
          nearbyAgent.messageTime = Date.now();
        }
      }
    }
  }, [gameState, broadcastGesture, formBond, addShockwave, audio, recordPulseStart, showToast]);

  const handlePulseEnd = useCallback(() => {
    setIsPulsing(false);
    recordPulseEnd();
    if (gameState.current) {
      (gameState.current as any).isPulsing = false;
    }
  }, [gameState, recordPulseEnd]);

  return {
    isPulsing,
    currentPattern,
    patternConfidence,
    isHolding,
    handlePulseStart,
    handlePulseEnd
  };
}

export default usePulseInteraction;
