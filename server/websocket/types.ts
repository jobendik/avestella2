// =============================================================================
// WebSocket Types & Interfaces
// =============================================================================

import type { WebSocket } from 'ws';
import type { ServerBot } from './ServerBot.js';

/**
 * Player connection state - all data about a connected player
 */
export interface PlayerConnection {
    ws: WebSocket;
    playerId: string;
    playerName: string;
    realm: string;
    lastSeen: number;
    x: number;
    y: number;
    color: number;  // Hue value 0-360
    xp: number;
    level: number;
    isBot: boolean;

    // Optional extended state
    stars?: number;
    echoes?: number;
    sings?: number;
    pulses?: number;
    emotes?: number;
    teleports?: number;
    bonds?: Map<string, number>;
    friends?: Set<string>;
    achievements?: string[];
    dirty?: boolean;
    speaking?: boolean;

    // Social State (Synced)
    currentMessage?: string;
    messageExpiresAt?: number;
    isPulsing?: boolean;
    pulseExpiresAt?: number;
    isSpeaking?: boolean;

    // Chat rate limiting
    lastChatTime?: number;
    mutedPlayers?: Set<string>;

    // Voice Chat
    voiceRoom?: string;

    // Anchoring/Mindfulness
    currentAnchoringZone?: string;
    anchoringStartTime?: number;
    meditationSession?: {
        id: string;
        type: string;
        startTime: number;
        duration: number;
    };

    // Power-ups
    activePowerUps?: Map<string, PowerUpInstance & { activeUntil: number }>;
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: number;
}

/**
 * Echo - player-placed message in the world
 */
export interface Echo {
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    x: number;
    y: number;
    createdAt: number;
    expiresAt: number;
    resonanceCount: number;
    hue?: number;
    likedBy?: Set<string>;
}

/**
 * Power-up instance in the world
 */
export interface PowerUpInstance {
    id: string;
    type: string;
    x: number;
    y: number;
    spawnedAt: number;
    expiresAt: number;
    config?: {
        duration?: number;
        effect?: string;
        multiplier?: number;
        intensity?: number;
        range?: number;
        strength?: number;
        opacity?: number;
    };
    collectedBy?: string;
}

/**
 * World event definition
 */
export interface WorldEvent {
    id: string;
    type: string;
    name: string;
    description?: string;
    startTime: number;
    endTime: number;
    progress?: number;
    goal?: number;
    rewards?: any;
    participants?: Set<string>;
    contributions?: { [playerId: string]: number };
    completed?: boolean;
    completedAt?: number;
}

/**
 * Handler context - passed to all message handlers
 * Contains shared state and utility methods
 */
export interface HandlerContext {
    // Shared state
    connections: Map<string, PlayerConnection>;
    realms: Map<string, Map<string, PlayerConnection>>;
    bots: Map<string, ServerBot>;
    echoes: Map<string, Echo>;
    powerUps: Map<string, PowerUpInstance>;
    worldEvents: Map<string, WorldEvent>;
    litStars: Set<string>;
    fragments: Map<string, ServerFragment>;

    // Helper methods
    send: (ws: WebSocket, message: any) => void;
    sendError: (connection: PlayerConnection, message: string) => void;
    broadcast: (message: any, excludePlayerId?: string) => void;
    broadcastToRealm: (realm: string, message: any, excludePlayerId?: string) => void;
}

/**
 * Base handler interface for message handlers
 */
export interface MessageHandler {
    handle(connection: PlayerConnection, data: any, context: HandlerContext): void | Promise<void>;
}

/**
 * Server-authoritative fragment
 */
export interface ServerFragment {
    id: string;
    x: number;
    y: number;
    realm: string;
    isGolden: boolean;
    value: number;
    phase: number;
    spawnedAt: number;
}

/**
 * Realm state snapshot
 */
export interface RealmState {
    echoes: Map<string, Echo>;
    powerUps: Map<string, PowerUpInstance>;
    activeEvents: WorldEvent[];
    fragments: Map<string, ServerFragment>;
}
