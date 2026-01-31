/**
 * Realm Selector Component
 * Ported from LEGACY index.html #realms
 * 
 * Left-side vertical menu for switching between realms/minigames
 */

import React, { useState, useCallback } from 'react';
import { REALMS, RealmId } from '@/constants/realms';
import { useGame } from '@/contexts/GameContext';

// ============================================================================
// TYPES
// ============================================================================

export interface RealmSelectorProps {
  /** Current active realm */
  currentRealm?: RealmId;
  /** Player's current level (for unlock checking) */
  playerLevel?: number;
  /** Callback when realm is selected */
  onRealmChange?: (realmId: RealmId) => void;
  /** Whether to show the selector */
  visible?: boolean;
}

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 100,
    pointerEvents: 'auto',
  },
  realmButton: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative' as const,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
  },
  realmButtonActive: {
    border: '2px solid rgba(168, 85, 247, 0.6)',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    boxShadow: '0 0 12px rgba(168, 85, 247, 0.3)',
  },
  realmButtonLocked: {
    opacity: 0.4,
    cursor: 'not-allowed',
    filter: 'grayscale(0.8)',
  },
  tooltip: {
    position: 'absolute' as const,
    left: '56px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '8px',
    padding: '8px 12px',
    whiteSpace: 'nowrap' as const,
    zIndex: 101,
    pointerEvents: 'none' as const,
    opacity: 0,
    transition: 'opacity 0.15s ease',
  },
  tooltipVisible: {
    opacity: 1,
  },
  tooltipName: {
    color: '#e2e8f0',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '2px',
  },
  tooltipDesc: {
    color: '#94a3b8',
    fontSize: '0.7rem',
  },
  tooltipLock: {
    color: '#f59e0b',
    fontSize: '0.65rem',
    marginTop: '4px',
  },
  lockIcon: {
    position: 'absolute' as const,
    bottom: '-2px',
    right: '-2px',
    fontSize: '0.7rem',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '50%',
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// ============================================================================
// REALM ORDER (matches LEGACY)
// ============================================================================

const REALM_ORDER: RealmId[] = [
  'genesis',
  'nebula',
  'void',
  'tagarena',
  'starforge',
  'abyss',
  'crystal',
  'sanctuary',
  'celestial',
];

// ============================================================================
// COMPONENT
// ============================================================================

export const RealmSelector: React.FC<RealmSelectorProps> = ({
  currentRealm = 'genesis',
  playerLevel = 1,
  onRealmChange,
  visible = true,
}) => {
  const [hoveredRealm, setHoveredRealm] = useState<RealmId | null>(null);

  const handleRealmClick = useCallback((realmId: RealmId) => {
    const realm = REALMS[realmId];
    if (realm && playerLevel >= realm.unlock) {
      onRealmChange?.(realmId);
    }
  }, [playerLevel, onRealmChange]);

  if (!visible) return null;

  return (
    <div style={styles.container}>
      {REALM_ORDER.map((realmId) => {
        const realm = REALMS[realmId];
        if (!realm) return null;

        const isActive = realmId === currentRealm;
        const isLocked = playerLevel < realm.unlock;
        const isHovered = hoveredRealm === realmId;

        return (
          <div
            key={realmId}
            style={{
              ...styles.realmButton,
              ...(isActive ? styles.realmButtonActive : {}),
              ...(isLocked ? styles.realmButtonLocked : {}),
            }}
            onClick={() => handleRealmClick(realmId)}
            onMouseEnter={() => setHoveredRealm(realmId)}
            onMouseLeave={() => setHoveredRealm(null)}
            title={isLocked ? `Unlock at Lv ${realm.unlock}` : realm.name}
          >
            <span>{realm.icon}</span>

            {/* Lock icon for locked realms */}
            {isLocked && (
              <div style={styles.lockIcon}>🔒</div>
            )}

            {/* Tooltip */}
            <div
              style={{
                ...styles.tooltip,
                ...(isHovered ? styles.tooltipVisible : {}),
              }}
            >
              <div style={styles.tooltipName}>{realm.name}</div>
              <div style={styles.tooltipDesc}>{realm.desc}</div>
              {isLocked && (
                <div style={styles.tooltipLock}>🔒 Unlock at Lv {realm.unlock}</div>
              )}
              {realm.special === 'tag' && !isLocked && (
                <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '4px' }}>
                  ⚡ Tag Arena Mode
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// REALM PILL (current realm indicator for HUD)
// ============================================================================

export interface RealmPillProps {
  realmId: RealmId;
  onClick?: () => void;
}

export const RealmPill: React.FC<RealmPillProps> = ({ realmId, onClick }) => {
  const realm = REALMS[realmId];
  if (!realm) return null;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{realm.icon}</span>
      <span style={{ color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 500 }}>
        {realm.name}
      </span>
    </div>
  );
};

// ============================================================================
// CONNECTED VERSION (uses GameContext)
// ============================================================================

export const ConnectedRealmSelector: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
  const { gameState, progression, audio } = useGame();
  const [currentRealm, setCurrentRealm] = useState<RealmId>('genesis');
  const playerLevel = progression.state.level;

  const handleRealmChange = useCallback((realmId: RealmId) => {
    const realm = REALMS[realmId];
    if (!realm) return;

    // Use the authentic transition system
    // This handles the fade out, state update, and fade in sequence
    gameState.switchRealm(realmId, realm.name, realm.icon);

    // Play sound effect
    audio.playBeaconActivation();

    // Log for debug
    console.log(`🌌 Initiating transition to ${realm.name}...`);

    // Update local state (for UI highlight)
    setCurrentRealm(realmId);
  }, [gameState, audio]);

  return (
    <RealmSelector
      currentRealm={currentRealm}
      playerLevel={playerLevel}
      onRealmChange={handleRealmChange}
      visible={visible}
    />
  );
};

export default RealmSelector;
