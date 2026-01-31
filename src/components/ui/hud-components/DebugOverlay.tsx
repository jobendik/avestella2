// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Debug Overlay Component
// FPS counter and debug information display
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { useSettingsContext } from '@/contexts/GameContext';

export function DebugOverlay(): JSX.Element | null {
  const { settings } = useSettingsContext();
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!settings.showFPS) return;

    let animationFrameId: number;

    const updateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameId = requestAnimationFrame(updateFPS);
    };

    animationFrameId = requestAnimationFrame(updateFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [settings.showFPS]);

  if (!settings.showFPS) return null;

  return (
    <div className="absolute bottom-4 right-4 pointer-events-none">
      <div className="bg-black/70 px-2 py-1 rounded text-xs font-mono text-green-400 border border-green-500/30">
        {fps} FPS
      </div>
    </div>
  );
}

export default DebugOverlay;
