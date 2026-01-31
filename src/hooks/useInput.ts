// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Input Hook (Tap-to-Move & Interaction)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';

export interface InteractionState {
  isInteracting: boolean;
  targetX: number | null;
  targetY: number | null;
  pointerX: number;
  pointerY: number;
}

export type InteractionEvent =
  | { type: 'TAP', x: number, y: number }
  | { type: 'DOUBLE_TAP', x: number, y: number }
  | { type: 'HOLD', x: number, y: number };

export interface UseInputReturn {
  interaction: InteractionState;
  lastEvent: InteractionEvent | null;
  clearLastEvent: () => void;
  handlePointerDown: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
  handlePointerMove: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
  handlePointerUp: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
  keys: Record<string, boolean>;
}

const DEFAULT_INTERACTION: InteractionState = {
  isInteracting: false,
  targetX: null,
  targetY: null,
  pointerX: 0,
  pointerY: 0,
};

export function useInput(): UseInputReturn {
  const [interaction, setInteraction] = useState<InteractionState>(DEFAULT_INTERACTION);
  const lastEventRef = useRef<InteractionEvent | null>(null); // Changed type to InteractionEvent

  // We need to access gameState to update position directly on drag?
  // Actually, useInput likely returns handlers that App/GameCanvas uses.
  // Let's verify who calls updatePlayerPosition.

  const [lastEvent, setLastEvent] = useState<InteractionEvent | null>(null);

  const lastTapTime = useRef<number>(0);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const startPos = useRef<{ x: number, y: number } | null>(null);

  const clearLastEvent = useCallback(() => {
    setLastEvent(null);
  }, []);

  const getEventCoords = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    // Check if it's a TouchEvent
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        clientX: touch.clientX,
        clientY: touch.clientY
      };
    } else {
      // MouseEvent or PointerEvent
      // Cast to MouseEvent to access properties if TS complains
      const me = e as React.MouseEvent;
      const rect = (me.target as HTMLElement).getBoundingClientRect();
      return {
        x: me.clientX - rect.left,
        y: me.clientY - rect.top,
        clientX: me.clientX,
        clientY: me.clientY
      };
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    // Prevent default to stop scrolling/selection
    if (e.cancelable) e.preventDefault();

    const { x, y } = getEventCoords(e);
    const now = Date.now();
    const isDoubleTap = now - lastTapTime.current < 300;
    lastTapTime.current = now;
    startPos.current = { x, y };

    if (isDoubleTap) {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      setLastEvent({ type: 'DOUBLE_TAP', x, y });
      setInteraction(prev => ({ ...prev, isInteracting: false, targetX: null, targetY: null })); // Stop moving on double tap
      return;
    }

    setInteraction(prev => ({
      ...prev,
      isInteracting: true,
      targetX: x,
      targetY: y,
      pointerX: x,
      pointerY: y
    }));

    // Long press detection could go here if needed
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();

    const { x, y } = getEventCoords(e);
    
    // Always update pointer position for hover detection
    setInteraction(prev => ({
      ...prev,
      pointerX: x,
      pointerY: y,
      // Only update target if we are interacting (dragging)
      ...(prev.isInteracting ? { targetX: x, targetY: y } : {})
    }));
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();

    setInteraction(prev => ({
      ...prev,
      isInteracting: false,
      targetX: null, // Depending on desired feel, we might want to keep targetX/Y or nullify it. 
      // In App.jsx 'end' event: state.isInteracting = false; state.targetX = null;
      targetY: null
    }));

    if (startPos.current) {
      const { x, y } = getEventCoords(e);
      // If movement was small, treat as a TAP event for selection logic
      const dx = x - startPos.current.x;
      const dy = y - startPos.current.y;
      if (Math.hypot(dx, dy) < 10) {
        setLastEvent({ type: 'TAP', x, y });
      }
    }
    startPos.current = null;
  }, []);

  // Keyboard state
  const [keys, setKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.code.toLowerCase().replace('key', '')]: true, [e.code.toLowerCase()]: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.code.toLowerCase().replace('key', '')]: false, [e.code.toLowerCase()]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return {
    interaction,
    lastEvent,
    clearLastEvent,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    keys // Return keys
  };
}

export default useInput;
