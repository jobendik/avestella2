/**
 * Hover Tooltip Component
 * Ported from LEGACY main.ts - updateHoverTooltip, hover-tooltip HTML
 * 
 * Quick preview tooltip when hovering over another player
 */

import React, { useCallback, useEffect, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface HoveredPlayer {
  id: string;
  name: string;
  hue: number;
  level: number;
  xp?: number;
  title?: string;
  isOnline?: boolean;
}

export interface HoverTooltipProps {
  /** The player being hovered */
  player: HoveredPlayer | null;
  /** Screen X position (mouse position) */
  x: number;
  /** Screen Y position (mouse position) */
  y: number;
  /** Whether to show the tooltip */
  visible?: boolean;
  /** Offset from cursor */
  offset?: { x: number; y: number };
  /** Whether click profile card is open (hides tooltip) */
  profileCardOpen?: boolean;
}

export interface UseHoverTooltipOptions {
  /** Delay before showing tooltip (ms) */
  showDelay?: number;
  /** Offset from cursor position */
  offset?: { x: number; y: number };
}

export interface UseHoverTooltipReturn {
  /** The currently hovered player */
  hoveredPlayer: HoveredPlayer | null;
  /** Current tooltip position */
  position: { x: number; y: number };
  /** Whether tooltip is visible */
  isVisible: boolean;
  /** Call when hovering a player */
  onPlayerHover: (player: HoveredPlayer | null, x: number, y: number) => void;
  /** Call when mouse moves */
  onMouseMove: (x: number, y: number) => void;
  /** Clear the hover state */
  clear: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useHoverTooltip(
  options: UseHoverTooltipOptions = {}
): UseHoverTooltipReturn {
  const { showDelay = 0, offset = { x: 0, y: -10 } } = options;

  const [hoveredPlayer, setHoveredPlayer] = useState<HoveredPlayer | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const onPlayerHover = useCallback(
    (player: HoveredPlayer | null, x: number, y: number) => {
      if (player) {
        setHoveredPlayer(player);
        setPosition({ x: x + offset.x, y: y + offset.y });

        if (showDelay > 0) {
          setTimeout(() => setIsVisible(true), showDelay);
        } else {
          setIsVisible(true);
        }
      } else {
        setIsVisible(false);
        // Delay clearing player so tooltip can animate out
        setTimeout(() => setHoveredPlayer(null), 150);
      }
    },
    [offset.x, offset.y, showDelay]
  );

  const onMouseMove = useCallback(
    (x: number, y: number) => {
      if (hoveredPlayer) {
        setPosition({ x: x + offset.x, y: y + offset.y });
      }
    },
    [hoveredPlayer, offset.x, offset.y]
  );

  const clear = useCallback(() => {
    setIsVisible(false);
    setHoveredPlayer(null);
  }, []);

  return {
    hoveredPlayer,
    position,
    isVisible,
    onPlayerHover,
    onMouseMove,
    clear,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Calculate level from XP (matches LEGACY GameLogic.getLevel)
 */
export function getLevelFromXP(xp: number): number {
  // Simple formula: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(20, 25, 35, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    transform: 'translate(-50%, -100%)',
    transition: 'opacity 0.15s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    fontWeight: 500,
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  level: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.6)',
    padding: '2px 6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
  },
  title: {
    fontSize: '0.7rem',
    color: 'rgba(167, 139, 250, 0.9)',
    fontStyle: 'italic',
  },
  onlineIndicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    marginLeft: '-4px',
    boxShadow: '0 0 4px rgba(34, 197, 94, 0.6)',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const HoverTooltip: React.FC<HoverTooltipProps> = ({
  player,
  x,
  y,
  visible = true,
  offset = { x: 0, y: -10 },
  profileCardOpen = false,
}) => {
  // Hide if profile card is open
  if (profileCardOpen || !player) return null;

  const isVisible = visible && player !== null;

  const dotStyle: React.CSSProperties = {
    ...styles.dot,
    backgroundColor: `hsl(${player.hue}, 70%, 60%)`,
    boxShadow: `0 0 6px hsla(${player.hue}, 70%, 60%, 0.6)`,
  };

  return (
    <div
      style={{
        ...styles.container,
        left: x + offset.x,
        top: y + offset.y,
        ...(isVisible ? styles.visible : styles.hidden),
      }}
      role="tooltip"
      aria-label={`${player.name}, Level ${player.level}`}
    >
      <div style={dotStyle} />
      
      {player.isOnline && <div style={styles.onlineIndicator} />}
      
      <span style={styles.name}>{player.name}</span>
      
      <span style={styles.level}>Lv {player.level}</span>
      
      {player.title && <span style={styles.title}>{player.title}</span>}
    </div>
  );
};

// ============================================================================
// CLICK PROFILE CARD (companion component)
// ============================================================================

export interface ClickProfileCardProps {
  /** The player to show profile for */
  player: HoveredPlayer | null;
  /** Screen position */
  x: number;
  y: number;
  /** Whether the card is visible */
  isOpen: boolean;
  /** Close the card */
  onClose: () => void;
  /** Actions */
  onWhisper?: (playerId: string) => void;
  onAddFriend?: (playerId: string) => void;
  onInvite?: (playerId: string) => void;
  onBlock?: (playerId: string) => void;
}

const cardStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    width: '220px',
    padding: '16px',
    backgroundColor: 'rgba(20, 25, 35, 0.92)',
    backdropFilter: 'blur(16px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1001,
    transform: 'translate(-50%, -100%)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
  },
  visible: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
    transform: 'translate(-50%, -100%) scale(0.95)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  info: {
    flex: 1,
  },
  playerName: {
    fontWeight: 600,
    fontSize: '1rem',
    color: '#fff',
    marginBottom: '2px',
  },
  playerLevel: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  button: {
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  primaryButton: {
    backgroundColor: 'rgba(167, 139, 250, 0.3)',
    color: '#a78bfa',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
  },
};

export const ClickProfileCard: React.FC<ClickProfileCardProps> = ({
  player,
  x,
  y,
  isOpen,
  onClose,
  onWhisper,
  onAddFriend,
  onInvite,
  onBlock,
}) => {
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-card]')) {
        onClose();
      }
    };

    // Delay to prevent immediate close
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, onClose]);

  if (!player) return null;

  const avatarStyle: React.CSSProperties = {
    ...cardStyles.avatar,
    backgroundColor: `hsla(${player.hue}, 60%, 50%, 0.3)`,
    border: `2px solid hsl(${player.hue}, 60%, 50%)`,
  };

  return (
    <div
      data-profile-card
      style={{
        ...cardStyles.container,
        left: x,
        top: y - 10,
        ...(isOpen ? cardStyles.visible : cardStyles.hidden),
      }}
      role="dialog"
      aria-label={`Profile for ${player.name}`}
    >
      <div style={cardStyles.header}>
        <div style={avatarStyle}>✨</div>
        <div style={cardStyles.info}>
          <div style={cardStyles.playerName}>{player.name}</div>
          <div style={cardStyles.playerLevel}>
            Level {player.level}
            {player.title && ` • ${player.title}`}
          </div>
        </div>
      </div>

      <div style={cardStyles.actions}>
        {onWhisper && (
          <button
            style={{ ...cardStyles.button, ...cardStyles.primaryButton }}
            onClick={() => onWhisper(player.id)}
          >
            💬 Whisper
          </button>
        )}
        
        {onAddFriend && (
          <button
            style={{ ...cardStyles.button, ...cardStyles.secondaryButton }}
            onClick={() => onAddFriend(player.id)}
          >
            ⭐ Add Friend
          </button>
        )}
        
        {onInvite && (
          <button
            style={{ ...cardStyles.button, ...cardStyles.secondaryButton }}
            onClick={() => onInvite(player.id)}
          >
            🔗 Copy Invite Link
          </button>
        )}
        
        {onBlock && (
          <button
            style={{ ...cardStyles.button, ...cardStyles.dangerButton }}
            onClick={() => onBlock(player.id)}
          >
            🚫 Block
          </button>
        )}
      </div>
    </div>
  );
};

export default HoverTooltip;
