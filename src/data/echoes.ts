/**
 * Echo system - persistent world messages
 */

import type { Echo } from '@/rendering/effects';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const ECHO_VISIBILITY_RADIUS = 100;
export const ECHO_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_ECHOES_PER_PLAYER = 10;
export const MAX_ECHOES_IN_VIEW = 50;

// ═══════════════════════════════════════════════════════════════════════════════
// ECHO MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new echo
 */
export const createEcho = (
  x: number,
  y: number,
  text: string,
  uid: string,
  name: string
): Echo => ({
  id: `echo_${uid}_${Date.now()}`,
  x,
  y,
  text: text.slice(0, 100), // Limit length
  uid,
  name,
  createdAt: Date.now()
});

/**
 * Filter echoes to only those near the player
 */
export const getNearbyEchoes = (
  echoes: Echo[],
  playerX: number,
  playerY: number,
  maxDistance: number = 500
): Echo[] => {
  return echoes.filter(echo => {
    const dist = Math.hypot(playerX - echo.x, playerY - echo.y);
    return dist <= maxDistance;
  });
};

/**
 * Filter out expired echoes
 */
export const pruneExpiredEchoes = (
  echoes: Echo[],
  maxAgeMs: number = ECHO_LIFETIME_MS
): Echo[] => {
  const now = Date.now();
  return echoes.filter(echo => now - echo.createdAt < maxAgeMs);
};

/**
 * Limit echoes per player
 */
export const limitPlayerEchoes = (
  echoes: Echo[],
  uid: string,
  maxPerPlayer: number = MAX_ECHOES_PER_PLAYER
): Echo[] => {
  const playerEchoes = echoes.filter(e => e.uid === uid);
  const otherEchoes = echoes.filter(e => e.uid !== uid);
  
  // Keep most recent echoes from this player
  const sortedPlayerEchoes = playerEchoes
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, maxPerPlayer);
  
  return [...otherEchoes, ...sortedPlayerEchoes];
};

/**
 * Check if player is near an echo (for text display)
 */
export const isNearEcho = (
  echo: Echo,
  playerX: number,
  playerY: number,
  radius: number = ECHO_VISIBILITY_RADIUS
): boolean => {
  const dist = Math.hypot(playerX - echo.x, playerY - echo.y);
  return dist < radius;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ECHO MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages echo state for easy integration
 */
export class EchoManager {
  echoes: Echo[];
  
  constructor(initialEchoes: Echo[] = []) {
    this.echoes = initialEchoes;
  }
  
  /**
   * Add a new echo
   */
  addEcho(x: number, y: number, text: string, uid: string, name: string): Echo {
    const echo = createEcho(x, y, text, uid, name);
    this.echoes.push(echo);
    this.echoes = limitPlayerEchoes(this.echoes, uid);
    return echo;
  }
  
  /**
   * Get echoes near player for rendering
   */
  getNearby(playerX: number, playerY: number, maxDistance: number = 500): Echo[] {
    return getNearbyEchoes(this.echoes, playerX, playerY, maxDistance);
  }
  
  /**
   * Prune old echoes
   */
  prune(): void {
    this.echoes = pruneExpiredEchoes(this.echoes);
  }
  
  /**
   * Get all echoes
   */
  getAll(): Echo[] {
    return this.echoes;
  }
  
  /**
   * Set echoes (for loading from database)
   */
  setEchoes(echoes: Echo[]): void {
    this.echoes = echoes;
  }
  
  /**
   * Get echo count
   */
  getCount(): number {
    return this.echoes.length;
  }
  
  /**
   * Get player's echo count
   */
  getPlayerEchoCount(uid: string): number {
    return this.echoes.filter(e => e.uid === uid).length;
  }
}
