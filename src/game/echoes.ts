/**
 * Enhanced Echo System with Ignition Mechanics
 * Ported from LEGACY/src/game/entities.ts (Echo class)
 * 
 * Features:
 * - Echo class with ignition (like) counter
 * - Pulsing animation
 * - Realm-specific echoes
 * - Click-to-ignite interaction
 * - Ignited state visual effects
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EchoData {
  id: string;
  x: number;
  y: number;
  text: string;
  hue: number;
  name: string;
  realm: string;
  playerId: string;
  ignited: number;
  createdAt: number;
}

export interface EchoState {
  echoes: Map<string, Echo>;
  playerIgnitedEchoes: Set<string>; // Echoes the local player has ignited
}

export interface EchoInteractionResult {
  ignited: boolean;
  echoId: string;
  newIgniteCount: number;
}

// ============================================================================
// Constants
// ============================================================================

export const ECHO_BASE_RADIUS = 9;
export const ECHO_CLICK_RADIUS = 30;  // Clickable area
export const ECHO_VISIBILITY_RADIUS = 100;  // Distance to show text
export const ECHO_PULSE_SPEED = 0.05;
export const MAX_ECHOES = 100;

// ============================================================================
// Echo Class
// ============================================================================

export class Echo {
  id: string;
  x: number;
  y: number;
  text: string;
  hue: number;
  name: string;
  radius: number;
  pulse: number;
  realm: string;
  ignited: number;
  playerId: string;
  createdAt: number;

  constructor(data: EchoData) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.text = data.text;
    this.hue = data.hue;
    this.name = data.name;
    this.radius = ECHO_BASE_RADIUS;
    this.pulse = Math.random() * Math.PI * 2; // Random start phase
    this.realm = data.realm;
    this.playerId = data.playerId;
    this.ignited = data.ignited;
    this.createdAt = data.createdAt;
  }

  /**
   * Update echo animation state
   * @param deltaTime - Time since last frame in seconds
   */
  update(deltaTime: number): void {
    this.pulse += ECHO_PULSE_SPEED * deltaTime * 60;
    
    // Keep pulse in reasonable range
    if (this.pulse > Math.PI * 20) {
      this.pulse -= Math.PI * 20;
    }
  }

  /**
   * Get current visual radius including pulse effect
   */
  getVisualRadius(): number {
    const basePulse = Math.sin(this.pulse) * 2;
    const ignitedBonus = Math.min(this.ignited * 0.5, 5); // Bigger when more ignited
    return this.radius + basePulse + ignitedBonus;
  }

  /**
   * Get glow intensity based on ignite count
   */
  getGlowIntensity(): number {
    // Base glow + bonus for ignites (capped)
    return 0.4 + Math.min(this.ignited * 0.05, 0.4);
  }

  /**
   * Check if a point is within click range
   */
  isClickable(worldX: number, worldY: number): boolean {
    const dist = Math.hypot(worldX - this.x, worldY - this.y);
    return dist <= ECHO_CLICK_RADIUS;
  }

  /**
   * Ignite this echo (add a like)
   */
  ignite(): void {
    this.ignited++;
    // Add a visual pulse burst
    this.pulse = 0; // Reset pulse for burst effect
  }

  /**
   * Convert to serializable data
   */
  toData(): EchoData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      text: this.text,
      hue: this.hue,
      name: this.name,
      realm: this.realm,
      playerId: this.playerId,
      ignited: this.ignited,
      createdAt: this.createdAt,
    };
  }
}

// ============================================================================
// Echo Manager Functions
// ============================================================================

/**
 * Create initial echo state
 */
export function createEchoState(): EchoState {
  return {
    echoes: new Map(),
    playerIgnitedEchoes: new Set(),
  };
}

/**
 * Add or update an echo from server data
 */
export function upsertEcho(state: EchoState, data: EchoData): Echo {
  let echo = state.echoes.get(data.id);
  
  if (echo) {
    // Update existing echo
    echo.ignited = data.ignited;
    echo.text = data.text;
    // Position and other fields typically don't change
  } else {
    // Create new echo
    echo = new Echo(data);
    state.echoes.set(data.id, echo);
    
    // Prune if too many echoes
    if (state.echoes.size > MAX_ECHOES) {
      pruneOldestEchoes(state);
    }
  }
  
  return echo;
}

/**
 * Remove echo by ID
 */
export function removeEcho(state: EchoState, echoId: string): boolean {
  return state.echoes.delete(echoId);
}

/**
 * Update all echoes
 */
export function updateEchoes(state: EchoState, deltaTime: number): void {
  state.echoes.forEach((echo) => {
    echo.update(deltaTime);
  });
}

/**
 * Find echo at click position
 */
export function findEchoAtPosition(
  state: EchoState,
  worldX: number,
  worldY: number,
  realm: string
): Echo | null {
  for (const echo of state.echoes.values()) {
    if (echo.realm === realm && echo.isClickable(worldX, worldY)) {
      return echo;
    }
  }
  return null;
}

/**
 * Try to ignite an echo at a position
 * Returns interaction result if an echo was ignited
 */
export function tryIgniteEchoAt(
  state: EchoState,
  worldX: number,
  worldY: number,
  realm: string,
  playerId: string
): EchoInteractionResult | null {
  const echo = findEchoAtPosition(state, worldX, worldY, realm);
  
  if (!echo) return null;
  
  // Check if player already ignited this echo
  if (state.playerIgnitedEchoes.has(echo.id)) {
    return null; // Already ignited by this player
  }
  
  // Check if player is trying to ignite their own echo
  if (echo.playerId === playerId) {
    return null; // Can't ignite own echo
  }
  
  // Ignite the echo
  echo.ignite();
  state.playerIgnitedEchoes.add(echo.id);
  
  return {
    ignited: true,
    echoId: echo.id,
    newIgniteCount: echo.ignited,
  };
}

/**
 * Get echoes near a position
 */
export function getEchoesNearPosition(
  state: EchoState,
  x: number,
  y: number,
  radius: number,
  realm: string
): Echo[] {
  const nearby: Echo[] = [];
  const radiusSq = radius * radius;
  
  state.echoes.forEach((echo) => {
    if (echo.realm !== realm) return;
    
    const dx = echo.x - x;
    const dy = echo.y - y;
    if (dx * dx + dy * dy <= radiusSq) {
      nearby.push(echo);
    }
  });
  
  return nearby;
}

/**
 * Get all visible echoes in realm
 */
export function getEchoesInRealm(state: EchoState, realm: string): Echo[] {
  const echoes: Echo[] = [];
  
  state.echoes.forEach((echo) => {
    if (echo.realm === realm) {
      echoes.push(echo);
    }
  });
  
  return echoes;
}

/**
 * Remove oldest echoes when over limit
 */
function pruneOldestEchoes(state: EchoState, keepCount: number = MAX_ECHOES - 10): void {
  if (state.echoes.size <= keepCount) return;
  
  // Get all echoes sorted by creation time
  const sorted = Array.from(state.echoes.values()).sort(
    (a, b) => a.createdAt - b.createdAt
  );
  
  // Remove oldest until we're at keepCount
  const toRemove = sorted.slice(0, sorted.length - keepCount);
  toRemove.forEach((echo) => {
    state.echoes.delete(echo.id);
    state.playerIgnitedEchoes.delete(echo.id);
  });
}

/**
 * Create a new echo from player input
 */
export function createPlayerEcho(
  playerId: string,
  playerName: string,
  playerHue: number,
  x: number,
  y: number,
  text: string,
  realm: string
): EchoData {
  return {
    id: `echo-${playerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    x,
    y,
    text,
    hue: playerHue,
    name: playerName,
    realm,
    playerId,
    ignited: 0,
    createdAt: Date.now(),
  };
}

// ============================================================================
// Rendering Helpers
// ============================================================================

/**
 * Get echo color based on hue and ignited state
 */
export function getEchoColor(echo: Echo): string {
  const saturation = 72 + Math.min(echo.ignited * 2, 20);
  const lightness = 58 + Math.min(echo.ignited, 10);
  return `hsl(${echo.hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Get echo glow color (RGBA)
 */
export function getEchoGlowColor(echo: Echo, alpha: number = 0.4): string {
  const intensity = echo.getGlowIntensity();
  return `hsla(${echo.hue}, 72%, 58%, ${intensity * alpha})`;
}

/**
 * Check if echo text should be visible to player
 */
export function isEchoTextVisible(
  echo: Echo,
  playerX: number,
  playerY: number
): boolean {
  const dist = Math.hypot(playerX - echo.x, playerY - echo.y);
  return dist < ECHO_VISIBILITY_RADIUS;
}
