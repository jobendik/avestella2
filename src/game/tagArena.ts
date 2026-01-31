/**
 * Tag Arena Game Mode
 * Ported from LEGACY/src/game/logic.ts (Tag Game Logic)
 * 
 * Features:
 * - Random IT player selection
 * - Tag collision detection with immunity period
 * - Survival time tracking
 * - Speed bonuses for IT player
 * - Game state management
 */

import { TAG_COLLISION_RADIUS, TAG_IMMUNITY_TIME, TAG_SPEED_MULTIPLIER, TAG_IT_SPEED_BONUS } from '@/constants/game';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TagGameState {
  active: boolean;
  sessionId: string | null;  // Added for server correlation
  itPlayerId: string | null;
  survivalTime: number;        // Seconds survived (for non-IT players)
  lastTagTime: number;         // Timestamp of last tag (for immunity)
  startTime: number;           // Game start timestamp
}

// ...

export interface TagPlayer {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface TagCollisionResult {
  tagged: boolean;
  newItId: string | null;
  tagPosition?: { x: number; y: number };  // For effects
}

export interface TagSpeedModifier {
  speedMultiplier: number;
  isIt: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default tag game configuration */
export const TAG_CONFIG = {
  collisionRadius: TAG_COLLISION_RADIUS,
  immunityTime: TAG_IMMUNITY_TIME,
  speedMultiplier: TAG_SPEED_MULTIPLIER,
  itSpeedBonus: TAG_IT_SPEED_BONUS,
  minPlayersToStart: 2,
};

export function createTagGameState(): TagGameState {
  return {
    active: false,
    sessionId: null,
    itPlayerId: null,
    survivalTime: 0,
    lastTagTime: 0,
    startTime: 0,
  };
}

/**
 * Initialize a new tag game
 * Randomly selects IT player from all participants
 */
export function initTagGame(
  localPlayerId: string,
  otherPlayerIds: string[]
): TagGameState {
  const allPlayerIds = [localPlayerId, ...otherPlayerIds];

  if (allPlayerIds.length < TAG_CONFIG.minPlayersToStart) {
    // Not enough players, return inactive state
    return createTagGameState();
  }

  // Pick a random player to be IT
  const itIndex = Math.floor(Math.random() * allPlayerIds.length);
  const itPlayerId = allPlayerIds[itIndex];
  const now = Date.now();

  return {
    active: true,
    sessionId: null, // Initialized without session ID until server confirms? Or this function is only for local? It should match interface.
    itPlayerId,
    survivalTime: 0,
    lastTagTime: now,  // Start with immunity to prevent immediate tag
    startTime: now,
  };
}

/**
 * End the tag game
 */
export function endTagGame(state: TagGameState): TagGameState {
  return {
    ...state,
    active: false,
  };
}

// ============================================================================
// Game Logic
// ============================================================================

/**
 * Check for tag collision between IT player and others
 * Returns collision result with new IT player ID if tag occurred
 */
export function checkTagCollision(
  player: TagPlayer,
  others: Map<string, TagPlayer>,
  state: TagGameState
): TagCollisionResult {
  const noTag: TagCollisionResult = { tagged: false, newItId: null };

  if (!state.active || !state.itPlayerId) {
    return noTag;
  }

  // Check immunity period
  const now = Date.now();
  if (now - state.lastTagTime < TAG_CONFIG.immunityTime) {
    return noTag;
  }

  const isPlayerIt = state.itPlayerId === player.id;

  if (isPlayerIt) {
    // Player is IT - check collision with others
    for (const [id, other] of others) {
      const dist = Math.hypot(player.x - other.x, player.y - other.y);
      const collisionDist = TAG_CONFIG.collisionRadius + player.radius + other.radius;

      if (dist < collisionDist) {
        // Tagged someone!
        return {
          tagged: true,
          newItId: id,
          tagPosition: {
            x: (player.x + other.x) / 2,
            y: (player.y + other.y) / 2,
          },
        };
      }
    }
  } else {
    // Check if IT player caught us
    const itPlayer = others.get(state.itPlayerId);
    if (itPlayer) {
      const dist = Math.hypot(player.x - itPlayer.x, player.y - itPlayer.y);
      const collisionDist = TAG_CONFIG.collisionRadius + player.radius + itPlayer.radius;

      if (dist < collisionDist) {
        // We got tagged!
        return {
          tagged: true,
          newItId: player.id,
          tagPosition: {
            x: (player.x + itPlayer.x) / 2,
            y: (player.y + itPlayer.y) / 2,
          },
        };
      }
    }
  }

  return noTag;
}

/**
 * Process a tag event
 * Updates game state with new IT player
 */
export function processTag(
  state: TagGameState,
  newItId: string
): TagGameState {
  return {
    ...state,
    itPlayerId: newItId,
    lastTagTime: Date.now(),
    survivalTime: 0,  // Reset survival time
  };
}

/**
 * Update survival time for non-IT players
 */
export function updateSurvivalTime(
  state: TagGameState,
  playerId: string,
  deltaTime: number
): TagGameState {
  if (!state.active || state.itPlayerId === playerId) {
    return state;
  }

  return {
    ...state,
    survivalTime: state.survivalTime + deltaTime,
  };
}

/**
 * Get speed modifier for a player in tag game
 */
export function getTagSpeedModifier(
  state: TagGameState,
  playerId: string
): TagSpeedModifier {
  if (!state.active) {
    return { speedMultiplier: 1.0, isIt: false };
  }

  const isIt = state.itPlayerId === playerId;

  // Everyone gets base speed boost in tag arena
  // IT player gets additional bonus
  const speedMultiplier = isIt
    ? TAG_CONFIG.speedMultiplier + TAG_CONFIG.itSpeedBonus
    : TAG_CONFIG.speedMultiplier;

  return { speedMultiplier, isIt };
}

/**
 * Check if a player is currently immune (just tagged or game just started)
 */
export function isPlayerImmune(state: TagGameState): boolean {
  if (!state.active) return false;
  return Date.now() - state.lastTagTime < TAG_CONFIG.immunityTime;
}

/**
 * Get the IT player's position for UI indicators
 */
export function getItPlayerPosition(
  state: TagGameState,
  others: Map<string, TagPlayer>
): { x: number; y: number } | null {
  if (!state.active || !state.itPlayerId) {
    return null;
  }

  const itPlayer = others.get(state.itPlayerId);
  if (!itPlayer) {
    return null;
  }

  return { x: itPlayer.x, y: itPlayer.y };
}

/**
 * Calculate distance and angle to IT player (for danger arrow)
 */
export function getItPlayerDirection(
  playerX: number,
  playerY: number,
  state: TagGameState,
  others: Map<string, TagPlayer>
): { distance: number; angle: number } | null {
  const itPos = getItPlayerPosition(state, others);
  if (!itPos) return null;

  const dx = itPos.x - playerX;
  const dy = itPos.y - playerY;

  return {
    distance: Math.hypot(dx, dy),
    angle: Math.atan2(dy, dx),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get formatted survival time string
 */
export function formatSurvivalTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

/**
 * Get game duration
 */
export function getGameDuration(state: TagGameState): number {
  if (!state.active || state.startTime === 0) {
    return 0;
  }
  return (Date.now() - state.startTime) / 1000;
}

/**
 * Check if enough players for tag game
 */
export function canStartTagGame(playerCount: number): boolean {
  return playerCount >= TAG_CONFIG.minPlayersToStart;
}
