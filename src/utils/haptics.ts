// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Haptics Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if Vibration API is available
 */
export function isHapticsAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger a simple vibration
 */
export function vibrate(duration: number): boolean {
  if (!isHapticsAvailable()) return false;
  
  try {
    navigator.vibrate(duration);
    return true;
  } catch {
    return false;
  }
}

/**
 * Trigger a vibration pattern
 */
export function vibratePattern(pattern: number[]): boolean {
  if (!isHapticsAvailable()) return false;
  
  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopVibration(): boolean {
  if (!isHapticsAvailable()) return false;
  
  try {
    navigator.vibrate(0);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-defined Haptic Patterns
// ─────────────────────────────────────────────────────────────────────────────

export const HAPTIC_PATTERNS = {
  // Quick feedback
  tap: 10,
  click: 5,
  
  // Collection
  fragment: 15,
  collect: [10, 30, 10],
  
  // Progression
  levelUp: [50, 50, 50, 50, 100],
  achievement: [30, 50, 30, 50, 100, 50, 30],
  
  // Interactions
  bond: [20, 50, 20],
  beacon: [100, 50, 100],
  
  // Alerts
  warning: [50, 100, 50],
  error: [100, 50, 100, 50, 100],
  success: [30, 30, 100],
  
  // Special
  heartbeat: [100, 200, 100, 500],
  pulse: [50, 100, 50, 100, 50],
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

/**
 * Play a predefined haptic pattern
 */
export function playHaptic(pattern: HapticPattern): boolean {
  const hapticValue = HAPTIC_PATTERNS[pattern];
  
  if (typeof hapticValue === 'number') {
    return vibrate(hapticValue);
  }
  
  return vibratePattern([...hapticValue]);
}

/**
 * Light impact feedback
 */
export function lightImpact(): void {
  vibrate(5);
}

/**
 * Medium impact feedback
 */
export function mediumImpact(): void {
  vibrate(15);
}

/**
 * Heavy impact feedback
 */
export function heavyImpact(): void {
  vibrate(30);
}

/**
 * Selection feedback
 */
export function selectionFeedback(): void {
  vibrate(3);
}

/**
 * Notification feedback
 */
export function notificationFeedback(type: 'success' | 'warning' | 'error'): void {
  playHaptic(type);
}
