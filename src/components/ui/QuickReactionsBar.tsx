/**
 * Quick Reactions Bar Component
 * Ported from LEGACY index.html quick-reactions section
 * 
 * Allows players to quickly send emoji reactions that appear as floating text
 */

import React, { useCallback, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface QuickReaction {
  emoji: string;
  label: string;
  hotkey?: string;
}

export interface QuickReactionsBarProps {
  /** Callback when a reaction is sent */
  onReaction: (emoji: string) => void;
  /** Custom reactions (defaults to LEGACY set) */
  reactions?: QuickReaction[];
  /** Whether the bar is visible */
  visible?: boolean;
  /** Position on screen */
  position?: 'bottom' | 'left' | 'right';
  /** Whether to show hotkey hints */
  showHotkeys?: boolean;
  /** Whether the bar is expanded */
  expanded?: boolean;
  /** Toggle expansion */
  onToggleExpand?: () => void;
}

// ============================================================================
// DEFAULT REACTIONS (from LEGACY index.html)
// ============================================================================

export const DEFAULT_REACTIONS: QuickReaction[] = [
  { emoji: '❤️', label: 'Love', hotkey: '1' },
  { emoji: '🔥', label: 'Fire', hotkey: '2' },
  { emoji: '✨', label: 'Sparkle', hotkey: '3' },
  { emoji: '👋', label: 'Wave', hotkey: '4' },
  { emoji: '😊', label: 'Smile', hotkey: '5' },
];

export const EXTENDED_REACTIONS: QuickReaction[] = [
  ...DEFAULT_REACTIONS,
  { emoji: '🎉', label: 'Celebrate', hotkey: '6' },
  { emoji: '💫', label: 'Dizzy', hotkey: '7' },
  { emoji: '🌟', label: 'Star', hotkey: '8' },
  { emoji: '💖', label: 'Heart', hotkey: '9' },
  { emoji: '🙌', label: 'Hands', hotkey: '0' },
];

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    zIndex: 99,
    transition: 'all 0.3s ease',
  },
  containerBottom: {
    bottom: '140px',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  containerLeft: {
    left: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    flexDirection: 'column',
  },
  containerRight: {
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    flexDirection: 'column',
  },
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
    transform: 'translateX(-50%) translateY(20px)',
  },
  button: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  buttonHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: 'scale(1.2)',
  },
  buttonActive: {
    transform: 'scale(0.9)',
  },
  hotkey: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '18px',
    height: '18px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '50%',
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
  },
  expandButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '50%',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tooltip: {
    position: 'absolute',
    top: '-30px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.15s ease',
  },
  tooltipVisible: {
    opacity: 1,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const QuickReactionsBar: React.FC<QuickReactionsBarProps> = ({
  onReaction,
  reactions = DEFAULT_REACTIONS,
  visible = true,
  position = 'bottom',
  showHotkeys = true,
  expanded = false,
  onToggleExpand,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [rippleEmoji, setRippleEmoji] = useState<string | null>(null);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const reactionList = expanded ? EXTENDED_REACTIONS : reactions;
      const reaction = reactionList.find(r => r.hotkey === e.key);
      
      if (reaction) {
        e.preventDefault();
        handleReaction(reaction.emoji, reactionList.indexOf(reaction));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, expanded, reactions]);

  // Handle reaction with visual feedback
  const handleReaction = useCallback((emoji: string, index: number) => {
    setActiveIndex(index);
    setRippleEmoji(emoji);
    
    // Trigger callback
    onReaction(emoji);
    
    // Clear active state
    setTimeout(() => {
      setActiveIndex(null);
      setRippleEmoji(null);
    }, 150);
  }, [onReaction]);

  // Get position styles
  const getPositionStyle = () => {
    switch (position) {
      case 'left':
        return styles.containerLeft;
      case 'right':
        return styles.containerRight;
      default:
        return styles.containerBottom;
    }
  };

  // Determine which reactions to show
  const displayReactions = expanded ? EXTENDED_REACTIONS : reactions;

  return (
    <>
      {/* Ripple effect for sent reaction */}
      {rippleEmoji && (
        <div
          style={{
            position: 'fixed',
            bottom: '150px',
            left: '50%',
            transform: 'translate(-50%, 0)',
            fontSize: '48px',
            opacity: 0.8,
            animation: 'float-up 0.5s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {rippleEmoji}
        </div>
      )}

      {/* Reactions bar */}
      <div
        style={{
          ...styles.container,
          ...getPositionStyle(),
          ...(visible ? {} : styles.hidden),
        }}
        role="toolbar"
        aria-label="Quick reactions"
      >
        {displayReactions.map((reaction, index) => (
          <button
            key={`${reaction.emoji}-${index}`}
            style={{
              ...styles.button,
              ...(hoveredIndex === index ? styles.buttonHover : {}),
              ...(activeIndex === index ? styles.buttonActive : {}),
            }}
            onClick={() => handleReaction(reaction.emoji, index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            aria-label={reaction.label}
            title={reaction.label}
          >
            {reaction.emoji}
            
            {/* Hotkey hint */}
            {showHotkeys && reaction.hotkey && (
              <span style={styles.hotkey}>{reaction.hotkey}</span>
            )}
            
            {/* Tooltip */}
            <span
              style={{
                ...styles.tooltip,
                ...(hoveredIndex === index ? styles.tooltipVisible : {}),
              }}
            >
              {reaction.label}
            </span>
          </button>
        ))}

        {/* Expand button */}
        {onToggleExpand && (
          <button
            style={styles.expandButton}
            onClick={onToggleExpand}
            aria-label={expanded ? 'Show fewer reactions' : 'Show more reactions'}
          >
            {expanded ? '−' : '+'}
          </button>
        )}
      </div>

      {/* Animation keyframes */}
      <style>
        {`
          @keyframes float-up {
            0% {
              opacity: 1;
              transform: translate(-50%, 0) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50px) scale(1.5);
            }
          }
        `}
      </style>
    </>
  );
};

export default QuickReactionsBar;
