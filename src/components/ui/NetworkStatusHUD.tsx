/**
 * Network Status HUD Components
 * Ported from LEGACY main.ts - updateSignalHUD, cluster-hud
 * 
 * Shows signal strength (latency) and nearby player count
 */

import React, { useEffect, useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type SignalQuality = 'excellent' | 'good' | 'weak' | 'poor' | 'disconnected';

export interface SignalHUDProps {
  /** Current latency in milliseconds */
  latency: number;
  /** Whether connected to server */
  isConnected: boolean;
  /** Whether to show the HUD */
  visible?: boolean;
  /** Position on screen */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export interface ClusterHUDProps {
  /** Number of players nearby */
  nearbyCount: number;
  /** Whether to show the HUD (auto-hides when count is 0) */
  visible?: boolean;
  /** Position on screen */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  /** Distance threshold used for nearby detection */
  threshold?: number;
}

export interface NetworkStatusHUDProps extends SignalHUDProps, Omit<ClusterHUDProps, 'visible' | 'position'> {
  /** Show cluster count */
  showCluster?: boolean;
  /** Exploration percentage (0-100) */
  explorationPercent?: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Convert latency to signal strength percentage
 * 0ms = 100%, 500ms+ = 0%
 */
export function latencyToStrength(latency: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - latency / 5)));
}

/**
 * Get signal quality category from strength
 */
export function getSignalQuality(strength: number, connected: boolean): SignalQuality {
  if (!connected) return 'disconnected';
  if (strength >= 80) return 'excellent';
  if (strength >= 60) return 'good';
  if (strength >= 40) return 'weak';
  return 'poor';
}

/**
 * Get color for signal quality
 */
export function getSignalColor(quality: SignalQuality): string {
  switch (quality) {
    case 'excellent':
      return '#22c55e'; // Green
    case 'good':
      return '#a78bfa'; // Purple (accent)
    case 'weak':
      return '#f59e0b'; // Yellow
    case 'poor':
      return '#ef4444'; // Red
    case 'disconnected':
      return '#6b7280'; // Gray
  }
}

// ============================================================================
// STYLES
// ============================================================================

const baseStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 50,
    opacity: 0.7,
    transition: 'opacity 0.3s ease',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  containerHover: {
    opacity: 1,
  },
  icon: {
    fontSize: '1rem',
  },
  value: {
    fontSize: '0.85rem',
    fontWeight: 500,
    fontFamily: 'JetBrains Mono, monospace',
  },
};

const clusterStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '10px 14px',
    backgroundColor: 'rgba(20, 25, 35, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 50,
    opacity: 0,
    transform: 'translateY(10px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    pointerEvents: 'none',
  },
  containerVisible: {
    opacity: 1,
    transform: 'translateY(0)',
    pointerEvents: 'auto',
  },
  count: {
    fontSize: '1.8rem',
    fontWeight: 600,
    color: '#a78bfa',
    lineHeight: 1,
  },
  label: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '2px',
  },
};

// ============================================================================
// POSITION HELPERS
// ============================================================================

const getPositionStyles = (position: string): React.CSSProperties => {
  switch (position) {
    case 'bottom-right':
      return { bottom: '20px', right: '20px' };
    case 'bottom-left':
      return { bottom: '20px', left: '20px' };
    case 'top-right':
      return { top: '20px', right: '20px' };
    case 'top-left':
      return { top: '20px', left: '20px' };
    default:
      return { bottom: '20px', right: '20px' };
  }
};

// ============================================================================
// SIGNAL HUD COMPONENT
// ============================================================================

export const SignalHUD: React.FC<SignalHUDProps> = ({
  latency,
  isConnected,
  visible = true,
  position = 'bottom-right',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const strength = useMemo(() => latencyToStrength(latency), [latency]);
  const quality = useMemo(() => getSignalQuality(strength, isConnected), [strength, isConnected]);
  const color = useMemo(() => getSignalColor(quality), [quality]);

  const displayText = isConnected ? `${strength}%` : 'OFFLINE';

  if (!visible) return null;

  return (
    <div
      style={{
        ...baseStyles.container,
        ...getPositionStyles(position),
        ...(isHovered ? baseStyles.containerHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`Latency: ${latency}ms`}
      role="status"
      aria-label={`Signal strength: ${displayText}`}
    >
      <span style={baseStyles.icon}>📡</span>
      <span
        style={{
          ...baseStyles.value,
          color,
        }}
      >
        {displayText}
      </span>
    </div>
  );
};

// ============================================================================
// CLUSTER HUD COMPONENT
// ============================================================================

export const ClusterHUD: React.FC<ClusterHUDProps> = ({
  nearbyCount,
  visible = true,
  position = 'bottom-left',
  threshold = 400,
}) => {
  const isVisible = visible && nearbyCount > 0;

  return (
    <div
      style={{
        ...clusterStyles.container,
        ...getPositionStyles(position),
        ...(isVisible ? clusterStyles.containerVisible : {}),
      }}
      role="status"
      aria-label={`${nearbyCount} souls nearby`}
    >
      <span style={clusterStyles.count}>{nearbyCount}</span>
      <span style={clusterStyles.label}>
        {nearbyCount === 1 ? 'Soul nearby' : 'Souls nearby'}
      </span>
    </div>
  );
};

// ============================================================================
// COMBINED NETWORK STATUS HUD
// ============================================================================

export const NetworkStatusHUD: React.FC<NetworkStatusHUDProps> = ({
  latency,
  isConnected,
  nearbyCount,
  visible = true,
  showCluster = true,
  explorationPercent,
}) => {
  const strength = useMemo(() => latencyToStrength(latency), [latency]);
  const quality = useMemo(() => getSignalQuality(strength, isConnected), [strength, isConnected]);
  const color = useMemo(() => getSignalColor(quality), [quality]);

  if (!visible) return null;

  // Inline mode - compact display without fixed positioning
  if (!showCluster) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '14px',
          fontSize: '0.75rem',
          color: '#94a3b8',
        }}
        title={`Latency: ${latency}ms`}
      >
        {/* Exploration percentage */}
        {explorationPercent !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🗺️</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 500, color: '#a78bfa' }}>
              {explorationPercent.toFixed(1)}%
            </span>
          </span>
        )}
        
        {/* Signal strength */}
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📡</span>
          <span style={{ color, fontFamily: 'monospace', fontWeight: 500 }}>
            {isConnected ? `${strength}%` : 'OFFLINE'}
          </span>
        </span>
        
        {/* Nearby players */}
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>👥</span>
          <span>{nearbyCount}</span>
        </span>
      </div>
    );
  }

  // Full mode - fixed positioned components
  return (
    <>
      <SignalHUD
        latency={latency}
        isConnected={isConnected}
        visible={visible}
        position="bottom-right"
      />
      <ClusterHUD
        nearbyCount={nearbyCount}
        visible={visible}
        position="bottom-left"
      />
    </>
  );
};

export default NetworkStatusHUD;
