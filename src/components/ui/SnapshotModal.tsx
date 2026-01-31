/**
 * Snapshot Modal Component
 * Ported from LEGACY index.html snapshot-modal section
 * 
 * Displays captured snapshot with download/share options
 */

import React, { useEffect, useCallback } from 'react';
import type { SnapshotData } from '@/hooks/useSnapshot';

// ============================================================================
// TYPES
// ============================================================================

export interface SnapshotModalProps {
  /** The snapshot data to display */
  snapshot: SnapshotData | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Handler to download the snapshot */
  onDownload: () => void;
  /** Handler to copy to clipboard */
  onCopy?: () => Promise<boolean>;
  /** Handler to share */
  onShare?: () => Promise<boolean>;
  /** Whether sharing is supported */
  canShare?: boolean;
}

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease',
  },
  overlayActive: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  modal: {
    position: 'relative',
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    transform: 'scale(0.9)',
    transition: 'transform 0.3s ease',
  },
  modalActive: {
    transform: 'scale(1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#fff',
  },
  headerIcon: {
    fontSize: '24px',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  image: {
    display: 'block',
    maxWidth: '70vw',
    maxHeight: '60vh',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  timestamp: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'rgba(255, 255, 255, 0.8)',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  successButton: {
    backgroundColor: '#22c55e',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  info: {
    display: 'flex',
    gap: '20px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '12px',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  snapshot,
  isOpen,
  onClose,
  onDownload,
  onCopy,
  onShare,
  canShare = typeof navigator !== 'undefined' && !!navigator.share,
}) => {
  const [copySuccess, setCopySuccess] = React.useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle copy with feedback
  const handleCopy = useCallback(async () => {
    if (!onCopy) return;
    
    const success = await onCopy();
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [onCopy]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!snapshot) return null;

  const formattedDate = new Date(snapshot.timestamp).toLocaleString();

  return (
    <div
      style={{
        ...styles.overlay,
        ...(isOpen ? styles.overlayActive : {}),
      }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="snapshot-title"
    >
      <div
        style={{
          ...styles.modal,
          ...(isOpen ? styles.modalActive : {}),
        }}
      >
        {/* Close Button */}
        <button
          style={styles.closeButton}
          onClick={onClose}
          aria-label="Close snapshot modal"
        >
          ✕
        </button>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon}>📸</span>
          <span id="snapshot-title">Snapshot Captured!</span>
        </div>

        {/* Image Preview */}
        <div style={styles.imageContainer}>
          <img
            src={snapshot.dataUrl}
            alt={`Snapshot by ${snapshot.playerName}`}
            style={styles.image}
          />
          <div style={styles.timestamp}>{formattedDate}</div>
        </div>

        {/* Info */}
        <div style={styles.info}>
          <span>Player: {snapshot.playerName}</span>
          <span>•</span>
          <span>{snapshot.dimensions.width} × {snapshot.dimensions.height}</span>
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={onDownload}
          >
            💾 Download
          </button>

          {onCopy && (
            <button
              style={{
                ...styles.button,
                ...(copySuccess ? styles.successButton : styles.secondaryButton),
              }}
              onClick={handleCopy}
            >
              {copySuccess ? '✓ Copied!' : '📋 Copy'}
            </button>
          )}

          {canShare && onShare && (
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={onShare}
            >
              🔗 Share
            </button>
          )}

          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SnapshotModal;
