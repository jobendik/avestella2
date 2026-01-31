// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Chat Bubbles Overlay (Batch 3: Communication)
// Renders floating chat bubbles above players
// ═══════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatBubble {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  icon?: string;
  timestamp: number;
  expiresAt: number;
  type: 'quick' | 'custom' | 'emote';
}

interface PlayerPosition {
  playerId: string;
  x: number;
  y: number;
  color: string;
}

interface ChatBubblesProps {
  bubbles: ChatBubble[];
  playerPositions: PlayerPosition[];
  canvasWidth: number;
  canvasHeight: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Bubble Component
// ─────────────────────────────────────────────────────────────────────────────

interface BubbleProps {
  bubble: ChatBubble;
  x: number;
  y: number;
  playerColor: string;
}

const Bubble: React.FC<BubbleProps> = ({ bubble, x, y, playerColor }) => {
  // Calculate fade based on remaining time
  const now = Date.now();
  const remaining = bubble.expiresAt - now;
  const fadeStart = 1000; // Start fading 1 second before expiry
  const opacity = remaining < fadeStart ? remaining / fadeStart : 1;

  // Animation class based on type
  const animationClass = useMemo(() => {
    switch (bubble.type) {
      case 'emote':
        return 'animate-bounce';
      case 'quick':
        return 'animate-pulse';
      default:
        return '';
    }
  }, [bubble.type]);

  // Bubble style based on type
  const bubbleStyle = useMemo(() => {
    const baseStyle = {
      opacity,
      transform: `translate(-50%, -100%) translateY(-20px)`,
      left: x,
      top: y,
    };

    switch (bubble.type) {
      case 'emote':
        return {
          ...baseStyle,
          background: 'transparent',
        };
      default:
        return baseStyle;
    }
  }, [bubble.type, x, y, opacity]);

  // Render emote differently
  if (bubble.type === 'emote') {
    return (
      <div
        className={`absolute pointer-events-none ${animationClass}`}
        style={bubbleStyle}
      >
        <span className="text-4xl drop-shadow-lg">
          {bubble.icon || bubble.message}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`absolute pointer-events-none max-w-48 ${animationClass}`}
      style={bubbleStyle}
    >
      {/* Chat Bubble */}
      <div
        className="relative px-3 py-2 rounded-xl text-sm font-medium text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${playerColor}dd, ${playerColor}99)`,
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Icon prefix */}
        {bubble.icon && (
          <span className="mr-1.5">{bubble.icon}</span>
        )}
        
        {/* Message text */}
        <span>{bubble.message}</span>

        {/* Pointer */}
        <div
          className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `8px solid ${playerColor}99`,
          }}
        />
      </div>

      {/* Player name */}
      <div className="mt-1 text-center text-xs text-white/60 font-medium truncate">
        {bubble.playerName}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const ChatBubbles: React.FC<ChatBubblesProps> = ({
  bubbles,
  playerPositions,
  canvasWidth,
  canvasHeight,
}) => {
  // Map player positions for quick lookup
  const positionMap = useMemo(() => {
    const map = new Map<string, PlayerPosition>();
    playerPositions.forEach(pos => map.set(pos.playerId, pos));
    return map;
  }, [playerPositions]);

  // Filter and position bubbles
  const visibleBubbles = useMemo(() => {
    const now = Date.now();
    return bubbles
      .filter(bubble => bubble.expiresAt > now)
      .map(bubble => {
        const position = positionMap.get(bubble.playerId);
        if (!position) return null;

        return {
          bubble,
          x: position.x,
          y: position.y,
          color: position.color,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);
  }, [bubbles, positionMap]);

  if (visibleBubbles.length === 0) return null;

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {visibleBubbles.map(({ bubble, x, y, color }) => (
        <Bubble
          key={bubble.id}
          bubble={bubble}
          x={x}
          y={y}
          playerColor={color}
        />
      ))}
    </div>
  );
};

export default ChatBubbles;
