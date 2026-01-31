/**
 * Hint Pill Component
 * Ported from LEGACY main.ts - fadeHintPill, hint-pill HTML
 * 
 * Shows a one-time hint message that fades out on first interaction
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface HintPillProps {
  /** The hint message to display */
  message: string;
  /** Custom icon (emoji or element) */
  icon?: React.ReactNode;
  /** Auto-dismiss after duration (ms), 0 = never */
  autoDismissAfter?: number;
  /** Dismiss on any user interaction */
  dismissOnInteraction?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Whether the hint has been seen (persisted state) */
  hasBeenSeen?: boolean;
  /** Position on screen */
  position?: 'top' | 'bottom';
}

export interface UseHintPillOptions {
  /** Storage key for persistence */
  storageKey?: string;
  /** Initial visible state */
  initialVisible?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useHintPill(options: UseHintPillOptions = {}): {
  isVisible: boolean;
  dismiss: () => void;
  reset: () => void;
} {
  const { storageKey = 'aura-hint-seen', initialVisible = true } = options;

  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return initialVisible;
    const seen = localStorage.getItem(storageKey);
    return seen !== 'true' && initialVisible;
  });

  const dismiss = useCallback(() => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  const reset = useCallback(() => {
    setIsVisible(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return { isVisible, dismiss, reset };
}

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '10px 20px',
    borderRadius: '24px',
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.9)',
    zIndex: 200,
    pointerEvents: 'none',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'opacity 1s ease, transform 1s ease',
  },
  top: {
    top: '20px',
  },
  bottom: {
    bottom: '20px',
  },
  visible: {
    opacity: 1,
    transform: 'translateX(-50%) translateY(0)',
  },
  hidden: {
    opacity: 0,
    transform: 'translateX(-50%) translateY(-10px)',
    pointerEvents: 'none',
  },
  hiddenBottom: {
    opacity: 0,
    transform: 'translateX(-50%) translateY(10px)',
    pointerEvents: 'none',
  },
  icon: {
    fontSize: '1.1rem',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const HintPill: React.FC<HintPillProps> = ({
  message,
  icon = '✨',
  autoDismissAfter = 0,
  dismissOnInteraction = true,
  onDismiss,
  hasBeenSeen = false,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(!hasBeenSeen);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleDismiss = useCallback(() => {
    if (!isVisible || isAnimatingOut) return;
    setIsAnimatingOut(true);
    
    // Wait for animation to complete
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 1000);
  }, [isVisible, isAnimatingOut, onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissAfter > 0 && isVisible && !isAnimatingOut) {
      const timer = setTimeout(handleDismiss, autoDismissAfter);
      return () => clearTimeout(timer);
    }
  }, [autoDismissAfter, isVisible, isAnimatingOut, handleDismiss]);

  // Dismiss on user interaction
  useEffect(() => {
    if (!dismissOnInteraction || !isVisible || isAnimatingOut) return;

    const handleInteraction = () => handleDismiss();

    // Movement keys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        handleDismiss();
      }
    };

    document.addEventListener('mousedown', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismissOnInteraction, isVisible, isAnimatingOut, handleDismiss]);

  // Don't render if already seen
  if (hasBeenSeen && !isVisible) return null;
  if (!isVisible) return null;

  const hiddenStyle = position === 'bottom' ? styles.hiddenBottom : styles.hidden;

  return (
    <div
      style={{
        ...styles.container,
        ...(position === 'top' ? styles.top : styles.bottom),
        ...(isAnimatingOut ? hiddenStyle : styles.visible),
      }}
      role="status"
      aria-live="polite"
    >
      {icon && <span style={styles.icon}>{icon}</span>}
      <span>{message}</span>
    </div>
  );
};

// ============================================================================
// PRESET HINTS
// ============================================================================

export const HINT_MESSAGES = {
  welcome: 'You are not alone. Drift to find others.',
  movement: 'Use WASD or arrow keys to move around.',
  pulse: 'Hold SPACE to pulse and attract nearby stars.',
  chat: 'Press ENTER to chat with nearby players.',
  voice: 'Click the mic icon to enable voice chat.',
  bond: 'Stay close to others to form bonds.',
  constellation: 'Light 3 nearby stars to form a constellation.',
  boost: 'Collect ⚡ power-ups for a speed boost!',
};

export default HintPill;
