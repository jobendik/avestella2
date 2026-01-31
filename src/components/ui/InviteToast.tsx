/**
 * Invite Toast Component
 * Ported from LEGACY main.ts - showInviteToast, invite-toast HTML
 * 
 * Shows a brief notification when an invite link is copied
 */

import React, { useEffect, useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface InviteToastProps {
  /** Whether the toast is visible */
  visible: boolean;
  /** Message to display */
  message?: string;
  /** Duration in ms before auto-hide */
  duration?: number;
  /** Callback when toast hides */
  onHide?: () => void;
}

export interface UseInviteToastReturn {
  /** Whether toast is visible */
  isVisible: boolean;
  /** Show the toast */
  show: (message?: string) => void;
  /** Hide the toast */
  hide: () => void;
  /** Generate and copy invite link */
  copyInviteLink: (playerX: number, playerY: number) => Promise<boolean>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useInviteToast(duration = 2500): UseInviteToastReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message?: string) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setIsVisible(true);

    // Auto-hide after duration
    const id = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    setTimeoutId(id);
  }, [duration, timeoutId]);

  const hide = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  }, [timeoutId]);

  /**
   * Generate invite link based on player position and copy to clipboard
   */
  const copyInviteLink = useCallback(async (playerX: number, playerY: number): Promise<boolean> => {
    // Generate seed from position (matches LEGACY logic)
    const seedVal = Math.floor(playerX) + Math.floor(playerY) * 10000;
    const url = `${window.location.origin}${window.location.pathname}?seed=${seedVal}`;

    try {
      await navigator.clipboard.writeText(url);
      show();
      return true;
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      const success = document.execCommand('copy');
      document.body.removeChild(input);
      
      if (success) {
        show();
      }
      return success;
    }
  }, [show]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return {
    isVisible,
    show,
    hide,
    copyInviteLink,
  };
}

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    color: '#d1fae5',
    padding: '10px 20px',
    borderRadius: '24px',
    fontSize: '0.85rem',
    zIndex: 300,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
  },
  visible: {
    opacity: 1,
    transform: 'translateX(-50%) translateY(0)',
  },
  hidden: {
    opacity: 0,
    transform: 'translateX(-50%) translateY(-10px)',
  },
  icon: {
    fontSize: '1rem',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const InviteToast: React.FC<InviteToastProps> = ({
  visible,
  message = '🔗 Invite link copied!',
  duration = 2500,
  onHide,
}) => {
  useEffect(() => {
    if (visible && onHide) {
      const timer = setTimeout(onHide, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  return (
    <div
      style={{
        ...styles.container,
        ...(visible ? styles.visible : styles.hidden),
      }}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
    </div>
  );
};

export default InviteToast;
