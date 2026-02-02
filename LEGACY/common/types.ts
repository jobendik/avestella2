// Shared type definitions between client and server

import type { RealmId } from './constants';

/**
 * Trail point for player movement visualization
 */
export interface TrailPoint {
    x: number;
    y: number;
    life: number;
}

/**
 * Base player data shared between client and server
 */
export interface BasePlayer {
    id: string;
    name: string;
    x: number;
    y: number;
    hue: number;
    xp: number;
    stars: number;
    echoes: number;
}

/**
 * Bond connection between two entities
 */
export interface BondData {
    strength: number;  // 0-100
    lastInteraction: number;  // timestamp
}

/**
 * Player state as stored on server
 */
export interface ServerPlayer extends BasePlayer {
    realm: RealmId;
    lastSeen: number;
    singing?: number;
    pulsing?: number;
    emoting?: string | null;
    isBot?: boolean;
    bonds?: Record<string, BondData>;  // Bonds to other players/bots
}

/**
 * Other player as seen by client
 */
export interface OtherPlayer extends BasePlayer {
    vx?: number;
    vy?: number;
    r: number;
    halo: number;
    singing: number;
    pulsing: number;
    emoting: string | null;
    emoteT: number;
    trail: TrailPoint[];
    born: number;
    speaking: boolean;
    isBot: boolean;
}

/**
 * Echo message persisted in the world
 */
export interface Echo {
    id?: string;
    x: number;
    y: number;
    text: string;
    hue: number;
    name: string;
    realm: RealmId;
    timestamp?: number;
}

/**
 * Network event types
 */
export type NetworkEventType = 'whisper' | 'sing' | 'pulse' | 'echo' | 'emote' | 'star_lit';

/**
 * Base network event
 */
export interface BaseNetworkEvent {
    type: NetworkEventType;
    x: number;
    y: number;
    uid: string;
    name: string;
    realm: RealmId;
    t: number;
}

/**
 * Whisper/position update event
 */
export interface WhisperEvent extends BaseNetworkEvent {
    type: 'whisper';
    text?: string;
    dx?: number;
    dy?: number;
    target?: string;
    hue?: number;
    xp?: number;
    singing?: number;
    pulsing?: number;
    emoting?: string | null;
}

/**
 * Sing event
 */
export interface SingEvent extends BaseNetworkEvent {
    type: 'sing';
    hue?: number;
}

/**
 * Pulse event
 */
export interface PulseEvent extends BaseNetworkEvent {
    type: 'pulse';
}

/**
 * Echo creation event
 */
export interface EchoEvent extends BaseNetworkEvent {
    type: 'echo';
    text: string;
    hue?: number;
}

/**
 * Emote event
 */
export interface EmoteEvent extends BaseNetworkEvent {
    type: 'emote';
    emoji: string;
}

/**
 * Star lit event
 */
export interface StarLitEvent extends BaseNetworkEvent {
    type: 'star_lit';
    starId: string;
}

/**
 * Union of all network events
 */
export type NetworkEvent =
    | WhisperEvent
    | SingEvent
    | PulseEvent
    | EchoEvent
    | EmoteEvent
    | StarLitEvent;
