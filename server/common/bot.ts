// Shared Bot/Guardian logic between client and server
import { SHARED_CONFIG } from './constants';

/**
 * Bot thoughts - messages bots say occasionally
 */
export const BOT_THOUGHTS = [
    "Do you hear the music?",
    "We drift together...",
    "The light is strong here",
    "I'm waiting for more",
    "Do you see the stars?",
    "Welcome, wanderer",
    "The cosmos breathes",
    "Not alone anymore",
    "Time flows differently here",
    "Every connection matters",
    "The void listens",
    "Stars remember us"
] as const;

/**
 * Bot responses when players interact with them (whisper, sing, pulse nearby)
 * Inspired by CONSTEL and Voices in the Dark prototypes
 */
export const BOT_RESPONSES = [
    "I see you!",
    "Hello there.",
    "Connecting...",
    "Signal received.",
    "Stay close.",
    "Nice to meet you.",
    "Join the cluster.",
    "Bright light!",
    "The warmth of company...",
    "You found me.",
    "Is someone there?",
    "Don't leave me.",
    "I'm with you now.",
    "Connection made."
] as const;

/**
 * Get a random bot response for when players interact
 */
export function getRandomBotResponse(): string {
    return BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
}

/**
 * Bot state interface - used by both client and server
 */
export interface BotState {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    hue: number;
    name: string;
    xp: number;
    moveAngle: number;
    timer: number;
    actionTimer: number;
    thinkTimer: number;
    realm: string;
    // Visual states (server-managed)
    singing: number;
    pulsing: number;
    emoting: string | null;
    // Message system (for bot speaking)
    currentMessage: string | null;
    messageTimer: number;
    // Bond system (social connections)
    bonds: Map<string, number>;  // playerId -> bond strength (0-100)
}

/**
 * Create a new bot with default values
 */
export function createBot(x: number, y: number, realm: string = 'genesis'): BotState {
    return {
        id: 'bot-' + Math.random().toString(36).substr(2, 9),
        x,
        y,
        vx: 0,
        vy: 0,
        hue: 180 + Math.random() * 60, // Bluish tones
        name: 'Guardian',
        xp: 100 + Math.random() * 800,
        moveAngle: Math.random() * Math.PI * 2,
        timer: 0,
        actionTimer: 0,
        thinkTimer: 0,
        realm,
        // Visual states (server-managed)
        singing: 0,
        pulsing: 0,
        emoting: null,
        // Message system (for bot speaking)
        currentMessage: null,
        messageTimer: 0,
        // Bond system (social connections)
        bonds: new Map()
    };
}

/**
 * Update bot position and timers
 */
export function updateBot(bot: BotState, targetX?: number, targetY?: number): void {
    bot.timer++;
    bot.actionTimer++;
    bot.thinkTimer++;

    // Change movement direction
    if (Math.random() < 0.02) {
        bot.moveAngle += (Math.random() - 0.5) * 2;
    }

    // Move toward target if provided (Social Gravity)
    if (targetX !== undefined && targetY !== undefined) {
        const distToTarget = Math.hypot(bot.x - targetX, bot.y - targetY);
        if (distToTarget < 400 && distToTarget > 100) {
            const angleToTarget = Math.atan2(targetY - bot.y, targetX - bot.x);
            bot.moveAngle = bot.moveAngle * 0.95 + angleToTarget * 0.05;
        }
    }

    // Stay near campfire (center)
    const distToCenter = Math.hypot(bot.x, bot.y);
    if (distToCenter > SHARED_CONFIG.CAMPFIRE_RADIUS) {
        const angleToCenter = Math.atan2(-bot.y, -bot.x);
        bot.moveAngle = bot.moveAngle * 0.9 + angleToCenter * 0.1;
    }

    // Apply movement with friction
    bot.vx += Math.cos(bot.moveAngle) * 0.2;
    bot.vy += Math.sin(bot.moveAngle) * 0.2;
    bot.vx *= 0.94;
    bot.vy *= 0.94;
    bot.x += bot.vx;
    bot.y += bot.vy;
}

/**
 * Check if bot should sing
 */
export function shouldBotSing(bot: BotState): boolean {
    return bot.actionTimer > 300 && Math.random() < 0.005;
}

/**
 * Check if bot should speak a thought
 * Cooldown: 400 ticks (~20 seconds at 20Hz), then 0.5% chance per tick
 */
export function shouldBotSpeak(bot: BotState): boolean {
    return bot.thinkTimer > 400 && Math.random() < 0.005;
}

/**
 * Get a random bot thought
 */
export function getRandomBotThought(): string {
    return BOT_THOUGHTS[Math.floor(Math.random() * BOT_THOUGHTS.length)];
}

/**
 * Reset bot action timer after performing action
 */
export function resetBotActionTimer(bot: BotState): void {
    bot.actionTimer = 0;
}

/**
 * Reset bot think timer after speaking
 */
export function resetBotThinkTimer(bot: BotState): void {
    bot.thinkTimer = 0;
}

/**
 * Decay visual states (call on server tick)
 */
export function decayBotVisualStates(bot: BotState, decayRate: number = 0.02): void {
    bot.singing = Math.max(0, bot.singing - decayRate);
    bot.pulsing = Math.max(0, bot.pulsing - decayRate);
}

/**
 * Trigger bot singing
 */
export function triggerBotSing(bot: BotState): void {
    bot.singing = 1;
    bot.actionTimer = 0;
}

/**
 * Trigger bot to speak a thought
 */
export function triggerBotSpeak(bot: BotState, message?: string): void {
    bot.currentMessage = message || getRandomBotThought();
    bot.messageTimer = 180; // ~3 seconds at 60fps
    bot.thinkTimer = 0;
}

/**
 * Decay bot message timer (call on server tick)
 */
export function decayBotMessageTimer(bot: BotState): void {
    if (bot.messageTimer > 0) {
        bot.messageTimer--;
        if (bot.messageTimer <= 0) {
            bot.currentMessage = null;
        }
    }
}

/**
 * Convert bot state to player data for network broadcasting
 */
export function botToPlayerData(bot: BotState, viewerPlayerId?: string): {
    id: string;
    name: string;
    x: number;
    y: number;
    hue: number;
    xp: number;
    singing: number;
    pulsing: number;
    emoting: string | null;
    isBot: boolean;
    realm: string;
    message?: string;
    messageTimer?: number;
    bondToViewer?: number;
} {
    return {
        id: bot.id,
        name: bot.name,
        x: Math.round(bot.x),
        y: Math.round(bot.y),
        hue: bot.hue,
        xp: bot.xp,
        singing: bot.singing,
        pulsing: bot.pulsing,
        emoting: bot.emoting,
        isBot: true,
        realm: bot.realm,
        message: bot.currentMessage || undefined,
        messageTimer: bot.messageTimer > 0 ? bot.messageTimer : undefined,
        bondToViewer: viewerPlayerId ? (bot.bonds.get(viewerPlayerId) || 0) : undefined
    };
}

// ============================================================================
// BOND SYSTEM FUNCTIONS
// ============================================================================

/**
 * Strengthen bond between bot and a player
 * @param bot The bot state
 * @param playerId The player ID to bond with
 * @param amount Amount to increase bond (default 15)
 */
export function strengthenBotBond(bot: BotState, playerId: string, amount: number = 15): void {
    const currentBond = bot.bonds.get(playerId) || 0;
    bot.bonds.set(playerId, Math.min(100, currentBond + amount));
}

/**
 * Decay all bot bonds over time (call every server tick)
 * @param bot The bot state
 * @param decayRate Rate of decay per tick (default 0.05)
 */
export function decayBotBonds(bot: BotState, decayRate: number = 0.05): void {
    for (const [playerId, strength] of bot.bonds.entries()) {
        const newStrength = strength - decayRate;
        if (newStrength <= 0) {
            bot.bonds.delete(playerId);
        } else {
            bot.bonds.set(playerId, newStrength);
        }
    }
}

/**
 * Get the player ID with strongest bond to this bot
 * @param bot The bot state
 * @returns Player ID with strongest bond, or null if no bonds
 */
export function getStrongestBond(bot: BotState): string | null {
    let strongestId: string | null = null;
    let strongestValue = 0;

    for (const [playerId, strength] of bot.bonds.entries()) {
        if (strength > strongestValue) {
            strongestValue = strength;
            strongestId = playerId;
        }
    }

    return strongestId;
}

/**
 * Apply social gravity - bot moves toward strongly bonded players
 * @param bot The bot state
 * @param players Map of player positions { id -> { x, y } }
 * @param gravityStrength How strongly bonded bots are pulled (default 0.003)
 */
export function applySocialGravity(
    bot: BotState,
    players: Map<string, { x: number; y: number }>,
    gravityStrength: number = 0.003
): void {
    for (const [playerId, strength] of bot.bonds.entries()) {
        if (strength < 20) continue; // Only apply gravity for notable bonds

        const playerPos = players.get(playerId);
        if (!playerPos) continue;

        const dx = playerPos.x - bot.x;
        const dy = playerPos.y - bot.y;
        const dist = Math.hypot(dx, dy);

        // Don't pull if already close
        if (dist < 80 || dist > 600) continue;

        // Apply gentle pull toward bonded player
        const force = (strength / 100) * gravityStrength;
        bot.vx += (dx / dist) * force * dist;
        bot.vy += (dy / dist) * force * dist;
    }
}

/**
 * Get total bond count for a bot (bonds > 10 strength)
 */
export function getBotBondCount(bot: BotState): number {
    let count = 0;
    for (const strength of bot.bonds.values()) {
        if (strength > 10) count++;
    }
    return count;
}
