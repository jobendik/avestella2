// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Joystick Control Component
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useCallback, useState } from 'react';
import { useInputContext } from '@/contexts/GameContext';

export interface JoystickProps {
  size?: number;
  baseColor?: string;
  stickColor?: string;
  position?: 'left' | 'right';
}

export function Joystick({
  size = 120,
  baseColor = 'rgba(255, 255, 255, 0.15)',
  stickColor = 'rgba(255, 255, 255, 0.5)',
  position = 'left',
}: JoystickProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });

  // Map pointer methods to the input context
  // Note: useInput provides handlePointerDown/Move/Up that accept PointerEvent/MouseEvent/TouchEvent
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useInputContext();

  const maxDistance = size / 2 - 20;

  const handleStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    // Forward to game input
    handlePointerDown(e);
  }, [handlePointerDown]);

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = e.clientX;
    const clientY = e.clientY;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Clamp to max distance
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    setStickPosition({ x: dx, y: dy });
    // Forward to game input
    handlePointerMove(e);
  }, [isDragging, maxDistance, handlePointerMove]);

  const handleEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setStickPosition({ x: 0, y: 0 });
    // Forward to game input
    handlePointerUp(e);
  }, [handlePointerUp]);

  const positionClass = position === 'left'
    ? 'left-8 bottom-8'
    : 'right-8 bottom-8';

  return (
    <div
      ref={containerRef}
      className={`fixed ${positionClass} z-30 touch-none`}
      style={{ width: size, height: size }}
      onPointerDown={handleStart}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      onPointerCancel={handleEnd}
    >
      {/* Base */}
      <div
        className="absolute rounded-full border-2 border-white/20"
        style={{
          width: size,
          height: size,
          backgroundColor: baseColor,
        }}
      />

      {/* Stick */}
      <div
        className="absolute rounded-full shadow-lg transition-transform duration-75"
        style={{
          width: size * 0.4,
          height: size * 0.4,
          backgroundColor: stickColor,
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${stickPosition.x}px), calc(-50% + ${stickPosition.y}px))`,
          boxShadow: isDragging ? '0 0 20px rgba(255, 255, 255, 0.3)' : 'none',
        }}
      />

      {/* Direction indicators */}
      {isDragging && (
        <>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/30 text-xs">▲</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/30 text-xs">▼</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">◀</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">▶</div>
        </>
      )}
    </div>
  );
}

export default Joystick;
