// =============================================================================
// WebSocket Handler - SERVER-AUTHORITATIVE GAME STATE
// =============================================================================
// This is the heart of the server-authoritative architecture.
// ALL game state (players, bots, actions) is managed here.
//
// Key principles:
// 1. Server runs the game loop at 20Hz (serverGameTick)
// 2. Server broadcasts world_state to all clients every tick
// 3. Clients RECEIVE state, they don't dictate it (except player input)
// 4. Bots are 100% server-controlled (ServerBot class)
// 5. Actions (sing, pulse, emote, echo) are validated server-side
// 6. XP is calculated SERVER-SIDE only - client cannot manipulate
// 7. Player data is persisted to MongoDB on disconnect
//
// Flow: Client sends input → Server validates → Server calculates XP → Server broadcasts state
// =============================================================================

import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { mongoPersistence } from '../services/MongoPersistenceService';
import { SHARED_CONFIG, getLevel } from '../../common/constants';

interface PlayerConnection {
    ws: WebSocket;
    playerId: string;
    realm: string;
    lastSeen: number;
    x: number;
    y: number;
    name: string;
    hue: number;
    xp: number;
    stars: number;
    echoes: number;
    sings: number;
    pulses: number;
    emotes: number;
    teleports: number;
    level: number;
    bonds: Map<string, number>;  // Bond strength to other players/bots (0-100)
    friends: Set<string>;  // Friend IDs from database
    achievements: string[];
    dirty: boolean;  // Needs to be saved to database
    speaking: boolean;  // Voice chat speaking state
}

interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: number;
}

// Bot names for variety
const BOT_NAMES = ['Luna', 'Sol', 'Nova', 'Atlas', 'Lyra', 'Echo', 'Zen', 'Mira', 'Orion', 'Flux', 'Vega', 'Kai', 'Iris', 'Aria', 'Juno', 'Nix', 'Ember', 'Sage', 'River', 'Sky'];

// Bot chat messages - more conversational and social
const BOT_GREETINGS = ['Hello! ✨', 'Hi there!', 'Welcome!', 'Hey!', '*waves*', 'Nice to see you!', 'Hello friend!'];
const BOT_THOUGHTS = ['The stars are beautiful tonight...', 'I love this place', 'So peaceful here', 'Anyone want to explore?', 'Let\'s light some stars!', 'Connection is everything', 'Together we shine brighter', 'The void speaks to me...', 'I sense kindred spirits nearby', 'What brings you here?'];
const BOT_REACTIONS = ['Wow!', 'Beautiful!', 'Amazing!', '✨✨✨', 'Love it!', 'So cool!', 'Yes!', 'Incredible!'];
const BOT_QUESTIONS = ['How are you?', 'What\'s your name?', 'Seen any new stars?', 'Want to connect?', 'Shall we explore together?', 'Feeling the cosmic energy?'];

// Server-side Bot class - Enhanced for social interactions
class ServerBot {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    hue: number;
    name: string;
    xp: number;
    moveAngle: number;
    actionTimer: number;
    thinkTimer: number;
    chatTimer: number;  // NEW: Chat cooldown
    realm: string;
    singing: number;
    pulsing: number;
    emoting: string | null;
    bonds: Map<string, number>;
    // NEW: Enhanced behavior state
    currentMessage: string | null;
    messageTimer: number;
    targetPlayerId: string | null;  // Bot can focus on a specific player
    personality: 'social' | 'explorer' | 'mystic';  // Behavior type
    lastGreeted: Set<string>;  // Track who we've greeted
    excitement: number;  // Rises when near players/activity

    constructor(x: number, y: number, realm: string = 'genesis') {
        this.id = 'bot-' + Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hue = Math.random() * 360;  // Full color spectrum
        this.name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        this.xp = 100 + Math.random() * 800;
        this.moveAngle = Math.random() * Math.PI * 2;
        this.actionTimer = Math.floor(Math.random() * 100);  // Stagger initial actions
        this.thinkTimer = Math.floor(Math.random() * 200);
        this.chatTimer = 0;
        this.realm = realm;
        this.singing = 0;
        this.pulsing = 0;
        this.emoting = null;
        this.bonds = new Map();
        // NEW: Enhanced state
        this.currentMessage = null;
        this.messageTimer = 0;
        this.targetPlayerId = null;
        this.personality = ['social', 'explorer', 'mystic'][Math.floor(Math.random() * 3)] as 'social' | 'explorer' | 'mystic';
        this.lastGreeted = new Set();
        this.excitement = 0;
    }

    // Check if there are nearby players and get the closest one
    findNearbyPlayers(connections: Map<string, PlayerConnection>): { closest: PlayerConnection | null; count: number; avgDist: number } {
        let closest: PlayerConnection | null = null;
        let closestDist = Infinity;
        let count = 0;
        let totalDist = 0;

        for (const conn of connections.values()) {
            if (conn.realm !== this.realm) continue;
            const dist = Math.hypot(conn.x - this.x, conn.y - this.y);
            if (dist < 600) {
                count++;
                totalDist += dist;
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = conn;
                }
            }
        }

        return { closest, count, avgDist: count > 0 ? totalDist / count : 0 };
    }

    update(connections: Map<string, PlayerConnection>): { action: string | null; data?: any } {
        const nearby = this.findNearbyPlayers(connections);
        let actionResult: { action: string | null; data?: any } = { action: null };

        // Update excitement based on nearby activity
        if (nearby.count > 0) {
            this.excitement = Math.min(1, this.excitement + 0.02 * nearby.count);
        } else {
            this.excitement = Math.max(0, this.excitement - 0.005);
        }

        // ===== MOVEMENT LOGIC =====
        const distToCenter = Math.hypot(this.x, this.y);

        // Personality-based movement
        if (this.personality === 'social' && nearby.closest) {
            // Social bots actively seek players
            const targetDist = Math.hypot(nearby.closest.x - this.x, nearby.closest.y - this.y);
            if (targetDist > 80 && targetDist < 500) {
                // Move toward the player
                const angleToPlayer = Math.atan2(nearby.closest.y - this.y, nearby.closest.x - this.x);
                this.moveAngle = this.moveAngle * 0.85 + angleToPlayer * 0.15;
            } else if (targetDist <= 80) {
                // Orbit around them gently
                this.moveAngle += 0.03;
            }
        } else if (this.personality === 'explorer') {
            // Explorers wander more actively
            if (Math.random() < 0.04) {
                this.moveAngle += (Math.random() - 0.5) * 2.5;
            }
        } else {
            // Mystic - moves slowly, gravitates to clusters
            if (Math.random() < 0.01) {
                this.moveAngle += (Math.random() - 0.5) * 1.5;
            }
        }

        // Stay within bounds but allow more range
        if (distToCenter > 1800) {
            const angleToCenter = Math.atan2(-this.y, -this.x);
            this.moveAngle = this.moveAngle * 0.8 + angleToCenter * 0.2;
        }

        // Apply movement with personality-based speed
        const speed = this.personality === 'explorer' ? 0.35 : (this.personality === 'social' ? 0.25 : 0.15);
        this.vx += Math.cos(this.moveAngle) * speed;
        this.vy += Math.sin(this.moveAngle) * speed;
        this.vx *= 0.94;
        this.vy *= 0.94;
        this.x += this.vx;
        this.y += this.vy;

        // Update timers
        this.actionTimer++;
        this.thinkTimer++;
        this.chatTimer = Math.max(0, this.chatTimer - 1);

        // Decay visual effects
        this.singing = Math.max(0, this.singing - 0.02);
        this.pulsing = Math.max(0, this.pulsing - 0.02);

        // Decay message timer
        if (this.messageTimer > 0) {
            this.messageTimer--;
            if (this.messageTimer <= 0) {
                this.currentMessage = null;
            }
        }

        // ===== ACTION LOGIC (More Active!) =====

        // Greet new nearby players
        if (nearby.closest && !this.lastGreeted.has(nearby.closest.playerId) && this.chatTimer === 0) {
            const greetChance = this.personality === 'social' ? 0.15 : 0.05;
            if (Math.random() < greetChance) {
                this.speak(BOT_GREETINGS[Math.floor(Math.random() * BOT_GREETINGS.length)]);
                this.lastGreeted.add(nearby.closest.playerId);
                this.chatTimer = 120;  // Cooldown
                actionResult = { action: 'greet', data: { targetId: nearby.closest.playerId } };
            }
        }

        // Random chat based on excitement and personality
        if (this.chatTimer === 0 && this.thinkTimer > 150) {
            let chatChance = 0.003 + this.excitement * 0.01;  // More likely when excited
            if (this.personality === 'social') chatChance *= 2;
            if (this.personality === 'mystic') chatChance *= 1.5;

            if (Math.random() < chatChance && nearby.count > 0) {
                // Choose message type based on personality
                let message: string;
                if (this.personality === 'social' && Math.random() < 0.4) {
                    message = BOT_QUESTIONS[Math.floor(Math.random() * BOT_QUESTIONS.length)];
                } else if (this.personality === 'mystic' && Math.random() < 0.5) {
                    message = BOT_THOUGHTS[Math.floor(Math.random() * BOT_THOUGHTS.length)];
                } else {
                    const allMessages = [...BOT_THOUGHTS, ...BOT_REACTIONS];
                    message = allMessages[Math.floor(Math.random() * allMessages.length)];
                }
                this.speak(message);
                this.thinkTimer = 0;
                this.chatTimer = 180;  // Longer cooldown after speaking
            }
        }

        // Sing more often when excited or near players
        const singChance = 0.003 + this.excitement * 0.008;
        if (this.actionTimer > 150 && Math.random() < singChance && nearby.count > 0) {
            this.actionTimer = 0;
            this.singing = 1;
            actionResult = { action: 'sing' };
        }

        // Pulse when very excited
        if (this.excitement > 0.7 && Math.random() < 0.005) {
            this.pulsing = 1;
            actionResult = { action: 'pulse' };
        }

        // Emote occasionally
        if (Math.random() < 0.002 && nearby.count > 0) {
            const emotes = ['✨', '💫', '🌟', '❤️', '👋', '🎵'];
            this.emoting = emotes[Math.floor(Math.random() * emotes.length)];
            setTimeout(() => { this.emoting = null; }, 2000);
        }

        // Clean up old greetings periodically
        if (Math.random() < 0.001) {
            this.lastGreeted.clear();
        }

        return actionResult;
    }

    // React to nearby activity (called when players do actions)
    react(actionType: 'sing' | 'pulse' | 'whisper' | 'emote', distance: number): void {
        if (distance > 400) return;  // Too far to react

        // Increase excitement from nearby activity
        this.excitement = Math.min(1, this.excitement + 0.15);

        // Chance to react based on distance and personality
        const reactChance = (1 - distance / 400) * (this.personality === 'social' ? 0.4 : 0.2);

        if (Math.random() < reactChance && this.chatTimer === 0) {
            if (actionType === 'sing') {
                // Echo the sing or react
                if (Math.random() < 0.3) {
                    this.singing = 1;
                } else {
                    this.speak(BOT_REACTIONS[Math.floor(Math.random() * BOT_REACTIONS.length)]);
                }
            } else if (actionType === 'pulse') {
                if (Math.random() < 0.3) {
                    this.pulsing = 1;
                }
            }
            this.chatTimer = 60;
        }
    }

    speak(message: string): void {
        this.currentMessage = message;
        this.messageTimer = 180;  // ~3 seconds at 60fps equivalent
    }

    toPlayerData(): any {
        return {
            id: this.id,
            name: this.name,
            x: Math.round(this.x),
            y: Math.round(this.y),
            hue: this.hue,
            xp: this.xp,
            singing: this.singing,
            pulsing: this.pulsing,
            emoting: this.emoting,
            isBot: true,
            realm: this.realm,
            message: this.currentMessage,
            messageTimer: this.messageTimer
        };
    }
}

/**
 * WebSocket server for real-time game synchronization
 * TRUE SERVER-AUTHORITATIVE ARCHITECTURE
 */
export class WebSocketHandler {
    private wss: WebSocketServer | null = null;
    private connections: Map<string, PlayerConnection> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;
    // @ts-ignore Used for cleanup on shutdown
    private gameLoopInterval: NodeJS.Timeout | null = null;
    private saveInterval: NodeJS.Timeout | null = null;

    // Server-authoritative bots
    private bots: Map<string, ServerBot> = new Map();
    private readonly MIN_POPULATION = 3;

    // Server-authoritative state
    private litStars: Set<string> = new Set();
    private echoes: Map<string, any> = new Map();

    // Timeout for considering a player disconnected (30 seconds)
    private readonly PLAYER_TIMEOUT = 30000;
    private readonly CLEANUP_INTERVAL = 10000;
    private readonly GAME_TICK_RATE = 50; // 20Hz server tick
    private readonly SAVE_INTERVAL = 30000; // Save dirty players every 30 seconds

    // Bond system constants
    private readonly BOND_DECAY_RATE = 0.03;  // Per tick (20Hz = ~0.6/sec)
    private readonly BOND_WHISPER_GAIN = 12;  // Per whisper hit
    private readonly BOND_SING_GAIN = 8;      // Per sing near
    private readonly BOND_PULSE_GAIN = 5;     // Per pulse near
    private readonly BOND_THRESHOLD_NOTIFY = 25;  // Notify when bond crosses this

    // XP reward constants (server-authoritative)
    private readonly XP_STAR_LIT = SHARED_CONFIG.XP_STAR_LIT;
    private readonly XP_ECHO_PLANTED = SHARED_CONFIG.XP_ECHO_PLANTED;
    private readonly XP_WHISPER_SENT = SHARED_CONFIG.XP_WHISPER_SENT;
    private readonly XP_SING = 2;
    private readonly XP_PULSE = 1;
    private readonly XP_EMOTE = 1;
    private readonly XP_CONNECTION_MADE = 10;

    // Action cooldowns (in ms) to prevent spam
    private readonly COOLDOWN_SING = 2000;
    private readonly COOLDOWN_PULSE = 1500;
    private readonly COOLDOWN_ECHO = 5000;
    private readonly COOLDOWN_EMOTE = 1000;
    private actionCooldowns: Map<string, Map<string, number>> = new Map();

    // Rate limiting for WebSocket messages
    private readonly MESSAGE_RATE_LIMIT = 50; // Max messages per second
    private readonly MESSAGE_RATE_WINDOW = 1000; // 1 second window
    private messageRateLimits: Map<string, { count: number; windowStart: number }> = new Map();

    // Player movement bounds
    private readonly MAX_COORDINATE = 50000; // Maximum allowed coordinate value

    /**
     * Initialize WebSocket server
     */
    init(server: Server): void {
        this.wss = new WebSocketServer({
            server,
            path: '/ws'
        });

        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            this.handleConnection(ws, req);
        });

        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleConnections();
        }, this.CLEANUP_INTERVAL);

        // Start server game loop - THIS IS THE AUTHORITATIVE GAME STATE
        this.gameLoopInterval = setInterval(() => {
            this.serverGameTick();
        }, this.GAME_TICK_RATE);

        // Start periodic save of dirty player data
        this.saveInterval = setInterval(() => {
            this.saveDirtyPlayers();
        }, this.SAVE_INTERVAL);

        // Load persisted data on startup
        this.loadPersistedData();

        console.log('🔌 WebSocket server initialized');
        console.log('🎮 Server game loop running at 20Hz');
        console.log('💾 Player persistence enabled');
    }

    /**
     * Load persisted stars and echoes from database
     */
    private async loadPersistedData(): Promise<void> {
        try {
            if (mongoPersistence.isReady()) {
                // Load lit stars for all realms
                const stars = await mongoPersistence.getLitStars();
                for (const starId of stars) {
                    this.litStars.add(starId);
                }
                console.log(`✨ Loaded ${this.litStars.size} lit stars from database`);

                // Load echoes for each realm
                const realms = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];
                for (const realm of realms) {
                    const realmEchoes = await mongoPersistence.getEchoes(realm, 200);
                    for (const echo of realmEchoes) {
                        this.echoes.set(echo.id, echo);
                    }
                }
                console.log(`📢 Loaded ${this.echoes.size} echoes from database`);
            }
        } catch (error) {
            console.error('Failed to load persisted data:', error);
        }
    }

    /**
     * Save all players marked as dirty to database
     */
    private async saveDirtyPlayers(): Promise<void> {
        if (!mongoPersistence.isReady()) return;

        for (const conn of this.connections.values()) {
            if (conn.dirty) {
                try {
                    await mongoPersistence.updatePlayer(conn.playerId, {
                        name: conn.name,
                        hue: conn.hue,
                        xp: conn.xp,
                        level: conn.level,
                        stars: conn.stars,
                        echoesCreated: conn.echoes,
                        sings: conn.sings,
                        pulses: conn.pulses,
                        emotes: conn.emotes,
                        teleports: conn.teleports,
                        lastRealm: conn.realm,
                        lastPosition: { x: conn.x, y: conn.y }
                    });
                    conn.dirty = false;
                } catch (error) {
                    console.error(`Failed to save player ${conn.playerId}:`, error);
                }
            }
        }
    }

    /**
     * Validate player ID format
     */
    private isValidPlayerId(playerId: string): boolean {
        // Must be 5-50 chars, alphanumeric with hyphens allowed
        if (playerId.length < 5 || playerId.length > 50) return false;
        // Only allow safe characters
        if (!/^[a-zA-Z0-9\-_]+$/.test(playerId)) return false;
        return true;
    }

    /**
     * Validate star ID format
     */
    private isValidStarId(starId: string): boolean {
        // Star IDs should match format: realm:cellX,cellY:index or realm:cellX:cellY:index
        if (starId.length > 100) return false;
        // Must start with a valid realm name
        const validRealms = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];
        const parts = starId.split(':');
        if (parts.length < 2) return false;
        if (!validRealms.includes(parts[0])) return false;
        // Only allow safe characters
        if (!/^[a-zA-Z0-9:,\-_]+$/.test(starId)) return false;
        return true;
    }

    /**
     * Sanitize text content to prevent XSS
     */
    private sanitizeText(text: string, maxLength: number): string {
        return text
            .trim()
            .substring(0, maxLength)
            .replace(/[<>&"'`]/g, '') // Remove HTML-sensitive chars
            .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control chars
    }

    /**
     * Check if action is on cooldown
     */
    private isOnCooldown(playerId: string, action: string, cooldownMs: number): boolean {
        const now = Date.now();
        let playerCooldowns = this.actionCooldowns.get(playerId);
        if (!playerCooldowns) {
            playerCooldowns = new Map();
            this.actionCooldowns.set(playerId, playerCooldowns);
        }

        const lastAction = playerCooldowns.get(action) || 0;
        if (now - lastAction < cooldownMs) {
            return true;
        }

        playerCooldowns.set(action, now);
        return false;
    }

    /**
     * Send cooldown error to client
     */
    private sendCooldownError(connection: PlayerConnection, action: string, cooldownMs: number): void {
        if (connection.ws.readyState === WebSocket.OPEN) {
            const playerCooldowns = this.actionCooldowns.get(connection.playerId);
            const lastAction = playerCooldowns?.get(action) || 0;
            const remaining = Math.max(0, cooldownMs - (Date.now() - lastAction));

            this.send(connection.ws, {
                type: 'cooldown',
                data: {
                    action,
                    remainingMs: remaining
                },
                timestamp: Date.now()
            });
        }
    }

    /**
     * Award XP to a player (server-authoritative)
     */
    private awardXP(connection: PlayerConnection, amount: number, reason: string): void {
        const oldLevel = connection.level;
        connection.xp += amount;
        connection.level = getLevel(connection.xp);
        connection.dirty = true;

        // Send XP gain notification to player
        if (connection.ws.readyState === WebSocket.OPEN) {
            this.send(connection.ws, {
                type: 'xp_gain',
                data: {
                    amount,
                    reason,
                    newXp: connection.xp,
                    newLevel: connection.level,
                    leveledUp: connection.level > oldLevel
                },
                timestamp: Date.now()
            });
        }

        if (connection.level > oldLevel) {
            console.log(`⬆️ ${connection.name} leveled up to ${connection.level}!`);
        }
    }

    /**
     * Server game tick - updates all server-authoritative state and broadcasts to all clients
     */
    private serverGameTick(): void {
        // Manage bot population per realm
        this.manageBotPopulation();

        // Decay all player bonds
        this.decayAllPlayerBonds();

        // Build player position map for social gravity
        const playerPositions = new Map<string, { x: number; y: number }>();
        for (const conn of this.connections.values()) {
            playerPositions.set(conn.playerId, { x: conn.x, y: conn.y });
        }

        // Update all bots with connection awareness
        for (const bot of this.bots.values()) {
            const actionResult = bot.update(this.connections);

            // Decay bot bonds
            this.decayBotBonds(bot);

            // Apply social gravity - pull bots toward bonded players
            this.applyBotSocialGravity(bot, playerPositions);

            // Broadcast bot actions if needed
            if (actionResult.action === 'sing') {
                // Strengthen bonds with nearby players when bot sings
                for (const conn of this.connections.values()) {
                    if (conn.realm !== bot.realm) continue;
                    const dist = Math.hypot(conn.x - bot.x, conn.y - bot.y);
                    if (dist < 300) {
                        this.strengthenBotBond(bot, conn.playerId, 5);
                    }
                }
            }
        }

        // Broadcast world state to all connected clients
        this.broadcastWorldState();
    }

    /**
     * Decay all player-to-player bonds over time
     */
    private decayAllPlayerBonds(): void {
        for (const conn of this.connections.values()) {
            for (const [targetId, strength] of conn.bonds.entries()) {
                const newStrength = strength - this.BOND_DECAY_RATE;
                if (newStrength <= 0) {
                    conn.bonds.delete(targetId);
                } else {
                    conn.bonds.set(targetId, newStrength);
                }
            }
        }
    }

    /**
     * Decay bot bonds over time
     */
    private decayBotBonds(bot: ServerBot): void {
        for (const [playerId, strength] of bot.bonds.entries()) {
            const newStrength = strength - this.BOND_DECAY_RATE;
            if (newStrength <= 0) {
                bot.bonds.delete(playerId);
            } else {
                bot.bonds.set(playerId, newStrength);
            }
        }
    }

    /**
     * Apply social gravity - pull bot toward strongly bonded players
     */
    private applyBotSocialGravity(bot: ServerBot, playerPositions: Map<string, { x: number; y: number }>): void {
        for (const [playerId, strength] of bot.bonds.entries()) {
            if (strength < 20) continue; // Only apply for notable bonds

            const playerPos = playerPositions.get(playerId);
            if (!playerPos) continue;

            const dx = playerPos.x - bot.x;
            const dy = playerPos.y - bot.y;
            const dist = Math.hypot(dx, dy);

            // Don't pull if already close or too far
            if (dist < 80 || dist > 600) continue;

            // Apply gentle pull toward bonded player
            const force = (strength / 100) * 0.003;
            bot.vx += (dx / dist) * force * dist;
            bot.vy += (dy / dist) * force * dist;
        }
    }

    /**
     * Strengthen bond between two players
     * @returns true if bond crossed the notification threshold
     */
    private strengthenPlayerBond(fromId: string, toId: string, amount: number): boolean {
        const fromConn = this.connections.get(fromId);
        if (!fromConn) return false;

        const previousStrength = fromConn.bonds.get(toId) || 0;
        const newStrength = Math.min(100, previousStrength + amount);
        fromConn.bonds.set(toId, newStrength);

        if (Math.random() < 0.05) console.log(`Bond strengthened: ${fromId} -> ${toId} = ${newStrength.toFixed(1)}`);

        // Return true if we just crossed the notification threshold
        return previousStrength < this.BOND_THRESHOLD_NOTIFY && newStrength >= this.BOND_THRESHOLD_NOTIFY;
    }

    /**
     * Strengthen bond between player and bot
     */
    private strengthenBotBond(bot: ServerBot, playerId: string, amount: number): void {
        const currentBond = bot.bonds.get(playerId) || 0;
        bot.bonds.set(playerId, Math.min(100, currentBond + amount));
    }

    /**
     * Strengthen bonds between a player and all nearby players and bots
     */
    private strengthenNearbyBonds(sender: PlayerConnection, amount: number, range: number): void {
        // Strengthen bonds with nearby players
        for (const conn of this.connections.values()) {
            if (conn.playerId === sender.playerId) continue;
            if (conn.realm !== sender.realm) continue;

            const dist = Math.hypot(conn.x - sender.x, conn.y - sender.y);
            if (dist <= range) {
                // Bond gain scales with proximity
                const proximityFactor = 1 - (dist / range) * 0.5;
                const scaledAmount = amount * proximityFactor;

                // Strengthen both ways
                const crossedThreshold = this.strengthenPlayerBond(sender.playerId, conn.playerId, scaledAmount);
                this.strengthenPlayerBond(conn.playerId, sender.playerId, scaledAmount);

                // Notify if bond just became significant
                if (crossedThreshold) {
                    this.notifyConnectionMade(sender, conn);
                }
            }
        }

        // Strengthen bonds with nearby bots
        for (const bot of this.bots.values()) {
            if (bot.realm !== sender.realm) continue;

            const dist = Math.hypot(bot.x - sender.x, bot.y - sender.y);
            if (dist <= range) {
                const proximityFactor = 1 - (dist / range) * 0.5;
                this.strengthenBotBond(bot, sender.playerId, amount * proximityFactor);
            }
        }
    }

    /**
     * Notify both players when a significant connection is made
     */
    private notifyConnectionMade(player1: PlayerConnection, player2: PlayerConnection): void {
        const eventData = {
            type: 'connection_made',
            data: {
                player1Id: player1.playerId,
                player1Name: player1.name,
                player2Id: player2.playerId,
                player2Name: player2.name
            },
            timestamp: Date.now()
        };

        if (player1.ws.readyState === WebSocket.OPEN) {
            this.send(player1.ws, eventData);
        }
        if (player2.ws.readyState === WebSocket.OPEN) {
            this.send(player2.ws, eventData);
        }

        // Award XP for making a connection (server-authoritative)
        this.awardXP(player1, this.XP_CONNECTION_MADE, 'connection');
        this.awardXP(player2, this.XP_CONNECTION_MADE, 'connection');

        // Increment stats
        if (mongoPersistence.isReady()) {
            mongoPersistence.incrementPlayerStats(player1.playerId, { connections: 1 }).catch(() => { });
            mongoPersistence.incrementPlayerStats(player2.playerId, { connections: 1 }).catch(() => { });
        }

        console.log(`🔗 Connection made: ${player1.name} <-> ${player2.name}`);
    }

    /**
     * Manage bot population (server-authoritative)
     */
    private manageBotPopulation(): void {
        const realms = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];

        for (const realm of realms) {
            const playersInRealm = Array.from(this.connections.values()).filter(c => c.realm === realm).length;
            const botsInRealm = Array.from(this.bots.values()).filter(b => b.realm === realm).length;
            const totalPopulation = playersInRealm + botsInRealm;

            // Spawn bots if population too low
            if (totalPopulation < this.MIN_POPULATION && Math.random() < 0.02) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 300 + Math.random() * 700;
                const bot = new ServerBot(
                    Math.cos(angle) * dist,
                    Math.sin(angle) * dist,
                    realm
                );
                this.bots.set(bot.id, bot);
                console.log(`🤖 Guardian spawned in ${realm}. Population: ${totalPopulation + 1}`);
            }
            // Remove bots if too many (real players joining)
            else if (totalPopulation > this.MIN_POPULATION + 2 && botsInRealm > 0 && Math.random() < 0.01) {
                const realmBots = Array.from(this.bots.values()).filter(b => b.realm === realm);
                if (realmBots.length > 0) {
                    const botToRemove = realmBots[0];
                    this.bots.delete(botToRemove.id);
                    console.log(`👋 Guardian departed from ${realm}. Population: ${totalPopulation - 1}`);
                }
            }
        }
    }

    /**
     * Broadcast complete world state to all clients
     */
    private broadcastWorldState(): void {
        // Group connections by realm
        const realmConnections = new Map<string, PlayerConnection[]>();
        for (const conn of this.connections.values()) {
            if (!realmConnections.has(conn.realm)) {
                realmConnections.set(conn.realm, []);
            }
            realmConnections.get(conn.realm)!.push(conn);
        }

        // Broadcast to each realm
        for (const [realm, connections] of realmConnections) {
            // Get all bots in this realm
            const realmBots = Array.from(this.bots.values()).filter(b => b.realm === realm);

            // Broadcast personalized world state to each player (includes bond data)
            for (const viewerConn of connections) {
                if (viewerConn.ws.readyState !== WebSocket.OPEN) continue;

                // Build player entities with bond info
                const players = connections.map(c => ({
                    id: c.playerId,
                    name: c.name || 'Wanderer',
                    x: c.x,
                    y: c.y,
                    hue: c.hue || 200,
                    xp: c.xp || 0,
                    isBot: false,
                    bondToViewer: viewerConn.bonds.get(c.playerId) || 0,
                    speaking: c.speaking || false  // Voice chat speaking state
                }));

                // Build bot entities with bond info
                const botEntities = realmBots.map(b => ({
                    ...b.toPlayerData(),
                    bondToViewer: b.bonds.get(viewerConn.playerId) || 0
                }));

                // Combine all entities
                const allEntities = [...players, ...botEntities];

                // World state with bond data and cluster count
                const linkedCount = this.getLinkedCount(viewerConn);

                // Include echoes in world state broadcast (so new players see them)
                const realmEchoes = Array.from(this.echoes.values()).filter(e => e.realm === realm);

                const worldState = {
                    type: 'world_state',
                    data: {
                        entities: allEntities,
                        litStars: Array.from(this.litStars).filter(s => s.startsWith(realm)),
                        echoes: realmEchoes,  // Include echoes in every broadcast
                        linkedCount,  // Number of significant connections
                        timestamp: Date.now()
                    },
                    timestamp: Date.now()
                };

                this.send(viewerConn.ws, worldState);
            }
        }
    }

    /**
     * Get count of significant connections for a player
     */
    private getLinkedCount(conn: PlayerConnection): number {
        let count = 0;
        for (const strength of conn.bonds.values()) {
            if (strength >= this.BOND_THRESHOLD_NOTIFY) count++;
        }
        return count;
    }

    /**
     * Handle new WebSocket connection
     */
    private handleConnection(ws: WebSocket, req: IncomingMessage): void {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const playerId = url.searchParams.get('playerId');
        const realm = url.searchParams.get('realm') || 'genesis';

        if (!playerId) {
            ws.close(4000, 'Player ID required');
            return;
        }

        // Validate player ID format and length
        if (!this.isValidPlayerId(playerId)) {
            ws.close(4001, 'Invalid player ID format');
            return;
        }

        // Validate realm
        const validRealms = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];
        const validatedRealm = validRealms.includes(realm) ? realm : 'genesis';

        console.log(`🔌 Player connected: ${playerId} in realm: ${validatedRealm}`);

        // Create connection with defaults, then load from DB
        const connection: PlayerConnection = {
            ws,
            playerId,
            realm: validatedRealm,
            lastSeen: Date.now(),
            x: 0,
            y: 0,
            name: 'Wanderer',
            hue: 200,
            xp: 0,
            stars: 0,
            echoes: 0,
            sings: 0,
            pulses: 0,
            emotes: 0,
            teleports: 0,
            level: 1,
            bonds: new Map(),
            friends: new Set(),
            achievements: [],
            dirty: false,
            speaking: false
        };
        this.connections.set(playerId, connection);

        // Load player data from database asynchronously
        this.loadPlayerData(playerId, connection);

        // Notify other players in same realm
        this.broadcastToRealm(realm, {
            type: 'player_joined',
            data: { playerId },
            timestamp: Date.now()
        }, playerId);

        // Send current world state immediately
        this.sendInitialWorldState(ws, realm, playerId);

        // Handle messages
        ws.on('message', (data: Buffer) => {
            this.handleMessage(playerId, data.toString());
        });

        // Handle disconnection
        ws.on('close', () => {
            this.handleDisconnect(playerId);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`WebSocket error for ${playerId}:`, error);
        });

        // Send ping for connection health
        ws.on('pong', () => {
            const conn = this.connections.get(playerId);
            if (conn) {
                conn.lastSeen = Date.now();
            }
        });
    }

    /**
     * Load player data from database
     */
    private async loadPlayerData(playerId: string, connection: PlayerConnection): Promise<void> {
        try {
            if (!mongoPersistence.isReady()) return;

            const playerData = await mongoPersistence.getOrCreatePlayer(playerId, connection.name);
            connection.name = playerData.name;
            connection.hue = playerData.hue;
            connection.xp = playerData.xp;
            connection.level = playerData.level;
            connection.stars = playerData.stars;
            connection.echoes = playerData.echoesCreated;
            connection.sings = playerData.sings || 0;
            connection.pulses = playerData.pulses || 0;
            connection.emotes = playerData.emotes || 0;
            connection.teleports = playerData.teleports || 0;
            connection.achievements = playerData.achievements || [];

            // Load friends
            const friends = await mongoPersistence.getFriends(playerId);
            connection.friends = new Set(friends.map(f => f.friendId));

            // Send player data to client (including stats for achievements)
            if (connection.ws.readyState === WebSocket.OPEN) {
                this.send(connection.ws, {
                    type: 'player_data',
                    data: {
                        id: playerId,
                        name: playerData.name,
                        hue: playerData.hue,
                        xp: playerData.xp,
                        level: playerData.level,
                        stars: playerData.stars,
                        echoes: playerData.echoesCreated,
                        sings: playerData.sings || 0,
                        pulses: playerData.pulses || 0,
                        emotes: playerData.emotes || 0,
                        teleports: playerData.teleports || 0,
                        achievements: playerData.achievements,
                        friends: friends.map(f => ({ id: f.friendId, name: f.friendName })),
                        lastRealm: playerData.lastRealm,
                        lastPosition: playerData.lastPosition
                    },
                    timestamp: Date.now()
                });
            }

            console.log(`📂 Loaded player data for ${playerData.name} (Level ${playerData.level})`);
        } catch (error) {
            console.error(`Failed to load player data for ${playerId}:`, error);
        }
    }

    /**
     * Send initial world state to newly connected player
     */
    private sendInitialWorldState(ws: WebSocket, realm: string, excludePlayerId: string): void {
        // Get all players in this realm
        const players = Array.from(this.connections.values())
            .filter(c => c.realm === realm && c.playerId !== excludePlayerId)
            .map(c => ({
                id: c.playerId,
                name: c.name || 'Wanderer',
                x: c.x,
                y: c.y,
                hue: c.hue || 200,
                xp: c.xp || 0,
                isBot: false
            }));

        // Get all bots in this realm
        const realmBots = Array.from(this.bots.values())
            .filter(b => b.realm === realm)
            .map(b => b.toPlayerData());

        // Send initial state
        this.send(ws, {
            type: 'world_state',
            data: {
                entities: [...players, ...realmBots],
                litStars: Array.from(this.litStars).filter(s => s.startsWith(realm)),
                echoes: Array.from(this.echoes.values()).filter(e => e.realm === realm),
                timestamp: Date.now()
            },
            timestamp: Date.now()
        });
    }

    /**
     * Check if player is rate limited
     */
    private isRateLimited(playerId: string): boolean {
        const now = Date.now();
        let rateData = this.messageRateLimits.get(playerId);

        if (!rateData || now - rateData.windowStart > this.MESSAGE_RATE_WINDOW) {
            // New window
            this.messageRateLimits.set(playerId, { count: 1, windowStart: now });
            return false;
        }

        rateData.count++;
        if (rateData.count > this.MESSAGE_RATE_LIMIT) {
            console.warn(`⚠️ Rate limiting player ${playerId}: ${rateData.count} msgs in ${this.MESSAGE_RATE_WINDOW}ms`);
            return true;
        }

        return false;
    }

    /**
     * Handle incoming message from client
     */
    private handleMessage(playerId: string, rawData: string): void {
        try {
            // Rate limiting check
            if (this.isRateLimited(playerId)) {
                return; // Drop message silently
            }

            const message: WebSocketMessage = JSON.parse(rawData);
            const connection = this.connections.get(playerId);

            if (!connection) return;

            connection.lastSeen = Date.now();

            switch (message.type) {
                case 'player_update':
                    this.handlePlayerUpdate(playerId, connection, message.data);
                    break;
                case 'whisper':
                    this.handleWhisper(connection, message.data);
                    break;
                case 'sing':
                    this.handleSing(connection, message.data);
                    break;
                case 'pulse':
                    this.handlePulse(connection, message.data);
                    break;
                case 'emote':
                    this.handleEmote(connection, message.data);
                    break;
                case 'echo':
                    this.handleEcho(connection, message.data);
                    break;
                case 'echo_ignite':
                    this.handleEchoIgnite(connection, message.data);
                    break;
                case 'star_lit':
                    this.handleStarLit(connection, message.data);
                    break;
                case 'add_friend':
                    this.handleAddFriend(connection, message.data);
                    break;
                case 'remove_friend':
                    this.handleRemoveFriend(connection, message.data);
                    break;
                case 'teleport_to_friend':
                    this.handleTeleportToFriend(connection, message.data);
                    break;
                case 'voice_signal':
                    this.handleVoiceSignal(connection, message.data);
                    break;
                case 'speaking':
                    this.handleSpeaking(connection, message.data);
                    break;
                case 'ping':
                    // Respond to ping - echo back client's timestamp for latency calculation
                    this.send(connection.ws, { type: 'pong', data: { timestamp: message.timestamp }, timestamp: Date.now() });
                    break;
            }
        } catch (error) {
            console.error('Failed to handle message:', error);
        }
    }

    /**
     * Handle player position/state update
     */
    private handlePlayerUpdate(playerId: string, connection: PlayerConnection, data: any): void {
        // Update stored position and data
        // Bounds check and clamp coordinates
        if (typeof data.x === 'number') {
            connection.x = Math.max(-this.MAX_COORDINATE, Math.min(this.MAX_COORDINATE, data.x));
        }
        if (typeof data.y === 'number') {
            connection.y = Math.max(-this.MAX_COORDINATE, Math.min(this.MAX_COORDINATE, data.y));
        }

        // Validate and sanitize player name
        if (typeof data.name === 'string') {
            const sanitizedName = this.sanitizePlayerName(data.name);
            if (sanitizedName) {
                connection.name = sanitizedName;
            }
        }

        if (typeof data.hue === 'number') connection.hue = Math.max(0, Math.min(360, data.hue));
        // Note: XP is now server-authoritative, ignore client-sent XP
        // if (typeof data.xp === 'number') connection.xp = data.xp;

        // Handle realm change
        if (data.realmChange && data.realm !== connection.realm) {
            // Validate realm
            const validRealms = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];
            if (!validRealms.includes(data.realm)) return;

            const oldRealm = connection.realm;
            connection.realm = data.realm;

            // Notify old realm of departure
            this.broadcastToRealm(oldRealm, {
                type: 'player_leave',
                data: { playerId },
                timestamp: Date.now()
            }, playerId);

            // Notify new realm of arrival
            this.broadcastToRealm(data.realm, {
                type: 'player_joined',
                data: { playerId },
                timestamp: Date.now()
            }, playerId);

            // Send current world state to player entering new realm
            this.sendInitialWorldState(connection.ws, data.realm, playerId);
        }

        // Note: Position updates are broadcast via broadcastWorldState() at 20Hz
        // No need to broadcast individual player_update messages here
    }

    /**
     * Sanitize player name to prevent XSS and enforce limits
     */
    private sanitizePlayerName(name: string): string | null {
        // Trim and limit length
        let sanitized = name.trim().substring(0, SHARED_CONFIG.MAX_PLAYER_NAME);

        // Remove potentially dangerous characters (HTML/script injection)
        sanitized = sanitized.replace(/[<>&"'`]/g, '');

        // Remove control characters
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

        // Must have at least 1 visible character
        if (sanitized.length === 0) {
            return null;
        }

        return sanitized;
    }

    /**
     * Handle whisper message
     */
    private handleWhisper(connection: PlayerConnection, data: any): void {
        // Validate and sanitize whisper text
        const text = this.sanitizeText(data.text || '', SHARED_CONFIG.MAX_WHISPER_LENGTH);
        if (!text) return;

        // Track whispers sent stat
        // Note: We don't have whispersSent in PlayerConnection, update in DB directly
        if (mongoPersistence.isReady()) {
            mongoPersistence.incrementPlayerStats(connection.playerId, { whispersSent: 1 }).catch(() => { });
        }

        // Award XP for sending whisper (server-authoritative)
        this.awardXP(connection, this.XP_WHISPER_SENT, 'whisper');
        connection.dirty = true;

        if (data.targetId) {
            // Direct whisper to specific player - strong bond gain
            const target = this.connections.get(data.targetId);
            if (target && target.ws.readyState === WebSocket.OPEN) {
                this.send(target.ws, {
                    type: 'whisper',
                    data: { ...data, text },
                    timestamp: Date.now()
                });

                // Strengthen bond with target (both ways)
                const crossedThreshold = this.strengthenPlayerBond(connection.playerId, data.targetId, this.BOND_WHISPER_GAIN);
                this.strengthenPlayerBond(data.targetId, connection.playerId, this.BOND_WHISPER_GAIN);

                if (crossedThreshold) {
                    this.notifyConnectionMade(connection, target);
                }
            }
        } else {
            // Broadcast whisper to nearby players (within range)
            this.broadcastToNearby(connection, { ...data, text }, 'whisper', 500);

            // Strengthen bonds with nearby players and bots
            this.strengthenNearbyBonds(connection, this.BOND_WHISPER_GAIN * 0.5, 200);
        }
    }

    /**
     * Handle sing action - broadcast to ALL players including sender (server-authoritative)
     */
    private handleSing(connection: PlayerConnection, data: any): void {
        // Check cooldown
        if (this.isOnCooldown(connection.playerId, 'sing', this.COOLDOWN_SING)) {
            this.sendCooldownError(connection, 'sing', this.COOLDOWN_SING);
            return;
        }

        // Track stats
        connection.sings++;
        connection.dirty = true;

        // Award XP (server-authoritative)
        this.awardXP(connection, this.XP_SING, 'sing');

        // Broadcast to ALL players in realm INCLUDING sender
        this.broadcastToRealmAll(connection.realm, {
            type: 'sing',
            data: {
                ...data,
                playerId: connection.playerId
            },
            timestamp: Date.now()
        });

        // Strengthen bonds with nearby players and bots (singing has wider range)
        this.strengthenNearbyBonds(connection, this.BOND_SING_GAIN, 300);

        // Make nearby bots react to the sing
        for (const bot of this.bots.values()) {
            if (bot.realm !== connection.realm) continue;
            const dist = Math.hypot(bot.x - connection.x, bot.y - connection.y);
            bot.react('sing', dist);
        }
    }

    /**
     * Handle pulse action - broadcast to ALL players including sender (server-authoritative)
     */
    private handlePulse(connection: PlayerConnection, data: any): void {
        // Check cooldown
        if (this.isOnCooldown(connection.playerId, 'pulse', this.COOLDOWN_PULSE)) {
            this.sendCooldownError(connection, 'pulse', this.COOLDOWN_PULSE);
            return;
        }

        // Track stats
        connection.pulses++;
        connection.dirty = true;

        // Award XP (server-authoritative)
        this.awardXP(connection, this.XP_PULSE, 'pulse');

        // Broadcast to ALL players in realm INCLUDING sender
        this.broadcastToRealmAll(connection.realm, {
            type: 'pulse',
            data: {
                ...data,
                playerId: connection.playerId
            },
            timestamp: Date.now()
        });

        // Strengthen bonds with nearby players and bots (medium range)
        this.strengthenNearbyBonds(connection, this.BOND_PULSE_GAIN, 250);

        // Make nearby bots react to the pulse
        for (const bot of this.bots.values()) {
            if (bot.realm !== connection.realm) continue;
            const dist = Math.hypot(bot.x - connection.x, bot.y - connection.y);
            bot.react('pulse', dist);
        }
    }

    /**
     * Handle emote action - broadcast to ALL players including sender (server-authoritative)
     */
    private handleEmote(connection: PlayerConnection, data: any): void {
        // Check cooldown
        if (this.isOnCooldown(connection.playerId, 'emote', this.COOLDOWN_EMOTE)) {
            this.sendCooldownError(connection, 'emote', this.COOLDOWN_EMOTE);
            return;
        }

        // Track stats
        connection.emotes++;
        connection.dirty = true;

        // Award XP (server-authoritative)
        this.awardXP(connection, this.XP_EMOTE, 'emote');

        // Broadcast to ALL players in realm INCLUDING sender
        this.broadcastToRealmAll(connection.realm, {
            type: 'emote',
            data: {
                ...data,
                playerId: connection.playerId
            },
            timestamp: Date.now()
        });
    }

    /**
     * Handle echo creation - broadcast to ALL players including sender (server-authoritative)
     */
    private handleEcho(connection: PlayerConnection, data: any): void {
        // Check cooldown
        if (this.isOnCooldown(connection.playerId, 'echo', this.COOLDOWN_ECHO)) {
            this.sendCooldownError(connection, 'echo', this.COOLDOWN_ECHO);
            return;
        }

        // Check echo count limit per realm
        const realmEchoCount = Array.from(this.echoes.values()).filter(e => e.realm === connection.realm).length;
        if (realmEchoCount >= SHARED_CONFIG.MAX_ECHOES_PER_REALM) {
            if (connection.ws.readyState === WebSocket.OPEN) {
                this.send(connection.ws, {
                    type: 'error',
                    data: { message: 'This realm has reached its echo limit' },
                    timestamp: Date.now()
                });
            }
            return;
        }

        // Validate and sanitize echo text (XSS prevention)
        const text = this.sanitizeText(data.text || '', SHARED_CONFIG.MAX_ECHO_LENGTH);
        if (!text) return;

        // Generate echo ID
        const echoId = `echo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Store echo in memory
        const echo = {
            id: echoId,
            x: connection.x,
            y: connection.y,
            text,
            hue: connection.hue,
            name: connection.name,
            realm: connection.realm,
            timestamp: Date.now(),
            authorId: connection.playerId
        };
        this.echoes.set(echoId, echo);

        // Persist to database
        if (mongoPersistence.isReady()) {
            mongoPersistence.createEcho(echo).catch(err => {
                console.error('Failed to persist echo:', err);
            });
        }

        // Award XP and increment counter (server-authoritative)
        connection.echoes++;
        connection.dirty = true;
        this.awardXP(connection, this.XP_ECHO_PLANTED, 'echo');

        // Broadcast to ALL players in realm INCLUDING sender
        this.broadcastToRealmAll(connection.realm, {
            type: 'echo',
            data: {
                ...data,
                text,
                playerId: connection.playerId,
                echoId,
                ignited: 0
            },
            timestamp: Date.now()
        });
    }

    /**
     * Handle echo ignite (like) event
     */
    private handleEchoIgnite(connection: PlayerConnection, data: any): void {
        const echoId = data.echoId;
        if (!echoId) return;

        const echo = this.echoes.get(echoId);
        if (!echo) return;

        // Prevent self-ignite or spam (simple check)
        // ideally we track who ignited what, but for now just global count

        // Update in-memory
        echo.ignited = (echo.ignited || 0) + 1;

        // Persist update (async)
        if (mongoPersistence.isReady()) {
            mongoPersistence.igniteEcho(echoId).catch(console.error);
        }

        // Broadcast update to all in realm
        this.broadcastToRealmAll(echo.realm, {
            type: 'echo_ignited',
            data: {
                echoId,
                ignited: echo.ignited,
                ignitedBy: connection.playerId
            },
            timestamp: Date.now()
        });
    }

    /**
     * Handle star lit event - PERSIST and broadcast to ALL players including sender (server-authoritative)
     */
    private handleStarLit(connection: PlayerConnection, data: any): void {
        const starIds: string[] = data.starIds || [];
        if (starIds.length === 0) return;

        // Validate and filter star IDs
        const validStarIds = starIds.filter(id => this.isValidStarId(id));
        if (validStarIds.length === 0) return;

        // Limit batch size to prevent abuse
        const limitedStarIds = validStarIds.slice(0, 50);

        // Filter to only stars not already lit
        const newStars = limitedStarIds.filter(id => !this.litStars.has(id));
        if (newStars.length === 0) return;

        // Add to in-memory set
        for (const starId of newStars) {
            this.litStars.add(starId);
        }

        // Persist to database
        if (mongoPersistence.isReady()) {
            mongoPersistence.litStarsBatch(newStars, connection.realm, connection.playerId).catch(err => {
                console.error('Failed to persist lit stars:', err);
            });
        }

        // Award XP for stars lit (server-authoritative)
        const xpGain = newStars.length * this.XP_STAR_LIT;
        connection.stars += newStars.length;
        connection.dirty = true;
        this.awardXP(connection, xpGain, 'stars_lit');

        // Broadcast to ALL players in realm INCLUDING sender
        this.broadcastToRealmAll(connection.realm, {
            type: 'star_lit',
            data: {
                ...data,
                starIds: newStars,  // Only broadcast newly lit stars
                playerId: connection.playerId
            },
            timestamp: Date.now()
        });
    }

    /**
     * Handle add friend request - creates BIDIRECTIONAL friendship
     */
    private async handleAddFriend(connection: PlayerConnection, data: any): Promise<void> {
        try {
            const friendId = data.friendId;
            const friendName = data.friendName || 'Unknown';

            if (!friendId || friendId === connection.playerId) return;

            // Add to local set (A → B)
            connection.friends.add(friendId);

            // Persist both directions to database
            if (mongoPersistence.isReady()) {
                // A → B
                await mongoPersistence.addFriend(connection.playerId, friendId, friendName);
                // B → A (reverse direction)
                await mongoPersistence.addFriend(friendId, connection.playerId, connection.name);
            }

            // Confirm to requester
            if (connection.ws.readyState === WebSocket.OPEN) {
                this.send(connection.ws, {
                    type: 'friend_added',
                    data: { friendId, friendName },
                    timestamp: Date.now()
                });
            }

            // Also notify the friend if online (add reverse friendship to their local set)
            const friendConnection = this.connections.get(friendId);
            if (friendConnection) {
                friendConnection.friends.add(connection.playerId);
                if (friendConnection.ws.readyState === WebSocket.OPEN) {
                    this.send(friendConnection.ws, {
                        type: 'friend_added',
                        data: { friendId: connection.playerId, friendName: connection.name },
                        timestamp: Date.now()
                    });
                }
            }

            console.log(`👥 ${connection.name} ↔ ${friendName} are now friends (bidirectional)`);
        } catch (error) {
            console.error(`Failed to add friend for ${connection.playerId}:`, error);
        }
    }

    /**
     * Handle remove friend request - removes BIDIRECTIONAL friendship
     */
    private async handleRemoveFriend(connection: PlayerConnection, data: any): Promise<void> {
        try {
            const friendId = data.friendId;

            if (!friendId) return;

            // Remove from local set (A → B)
            connection.friends.delete(friendId);

            // Remove both directions from database
            if (mongoPersistence.isReady()) {
                // A → B
                await mongoPersistence.removeFriend(connection.playerId, friendId);
                // B → A (reverse direction)
                await mongoPersistence.removeFriend(friendId, connection.playerId);
            }

            // Confirm to requester
            if (connection.ws.readyState === WebSocket.OPEN) {
                this.send(connection.ws, {
                    type: 'friend_removed',
                    data: { friendId },
                    timestamp: Date.now()
                });
            }

            // Also notify the friend if online
            const friendConnection = this.connections.get(friendId);
            if (friendConnection) {
                friendConnection.friends.delete(connection.playerId);
                if (friendConnection.ws.readyState === WebSocket.OPEN) {
                    this.send(friendConnection.ws, {
                        type: 'friend_removed',
                        data: { friendId: connection.playerId },
                        timestamp: Date.now()
                    });
                }
            }

            console.log(`💔 ${connection.name} ↔ ${friendId} friendship removed (bidirectional)`);
        } catch (error) {
            console.error(`Failed to remove friend for ${connection.playerId}:`, error);
        }
    }

    /**
     * Handle teleport to friend request (with server validation)
     */
    private handleTeleportToFriend(connection: PlayerConnection, data: any): void {
        const friendId = data.friendId;

        if (!friendId) return;

        // Validate they are actually friends
        if (!connection.friends.has(friendId)) {
            if (connection.ws.readyState === WebSocket.OPEN) {
                this.send(connection.ws, {
                    type: 'error',
                    data: { message: 'You can only teleport to friends' },
                    timestamp: Date.now()
                });
            }
            return;
        }

        // Find friend's connection
        const friend = this.connections.get(friendId);
        if (!friend) {
            if (connection.ws.readyState === WebSocket.OPEN) {
                this.send(connection.ws, {
                    type: 'error',
                    data: { message: 'Friend is not online' },
                    timestamp: Date.now()
                });
            }
            return;
        }

        // Validate same realm
        if (friend.realm !== connection.realm) {
            if (connection.ws.readyState === WebSocket.OPEN) {
                this.send(connection.ws, {
                    type: 'error',
                    data: { message: 'Friend is in a different realm' },
                    timestamp: Date.now()
                });
            }
            return;
        }

        // Calculate teleport position (near friend, not on top)
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 50;
        const newX = friend.x + Math.cos(angle) * distance;
        const newY = friend.y + Math.sin(angle) * distance;

        // Update player position
        connection.x = newX;
        connection.y = newY;

        // Track teleport stats
        connection.teleports++;
        connection.dirty = true;

        // Send teleport confirmation with new position
        if (connection.ws.readyState === WebSocket.OPEN) {
            this.send(connection.ws, {
                type: 'teleport_success',
                data: {
                    x: newX,
                    y: newY,
                    friendId,
                    friendName: friend.name
                },
                timestamp: Date.now()
            });
        }

        console.log(`🌀 ${connection.name} teleported to ${friend.name}`);
    }

    /**
     * Handle WebRTC voice signaling
     */
    private handleVoiceSignal(connection: PlayerConnection, data: any): void {
        const targetId = data.targetId;
        const signalType = data.signalType; // 'offer', 'answer', 'ice-candidate'
        const signalData = data.signalData;

        if (!targetId || !signalType || !signalData) return;

        const target = this.connections.get(targetId);
        if (!target || target.ws.readyState !== WebSocket.OPEN) return;

        // Only allow voice signaling within same realm
        if (target.realm !== connection.realm) return;

        // Forward the signal to the target
        this.send(target.ws, {
            type: 'voice_signal',
            data: {
                fromId: connection.playerId,
                fromName: connection.name,
                signalType,
                signalData
            },
            timestamp: Date.now()
        });
    }

    /**
     * Handle speaking state update from voice chat
     */
    private handleSpeaking(connection: PlayerConnection, data: any): void {
        if (typeof data.speaking === 'boolean') {
            connection.speaking = data.speaking;
            
            // Strengthen bonds with nearby players when speaking (promotes social interaction)
            if (data.speaking) {
                this.strengthenNearbyBonds(connection, 2, 400);  // Voice range bond strengthening
            }
        }
    }

    /**
     * Handle player disconnect
     */
    private handleDisconnect(playerId: string): void {
        const connection = this.connections.get(playerId);
        if (connection) {
            console.log(`🔌 Player disconnected: ${playerId}`);

            // Save player data to database before removing
            if (mongoPersistence.isReady()) {
                mongoPersistence.updatePlayer(playerId, {
                    name: connection.name,
                    hue: connection.hue,
                    xp: connection.xp,
                    level: connection.level,
                    stars: connection.stars,
                    echoesCreated: connection.echoes,
                    sings: connection.sings,
                    pulses: connection.pulses,
                    emotes: connection.emotes,
                    teleports: connection.teleports,
                    lastRealm: connection.realm,
                    lastPosition: { x: connection.x, y: connection.y }
                }).then(() => {
                    console.log(`💾 Saved player data for ${connection.name}`);
                }).catch(err => {
                    console.error(`Failed to save player ${playerId}:`, err);
                });
            }

            // Notify other players in realm
            this.broadcastToRealm(connection.realm, {
                type: 'player_leave',
                data: { playerId },
                timestamp: Date.now()
            }, playerId);

            // Clean up cooldowns
            this.actionCooldowns.delete(playerId);

            this.connections.delete(playerId);
        }
    }

    /**
     * Send message to specific WebSocket
     */
    private send(ws: WebSocket, message: WebSocketMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Broadcast message to all players in a realm (optionally excluding one)
     */
    private broadcastToRealm(realm: string, message: WebSocketMessage, excludePlayerId?: string): void {
        for (const [playerId, connection] of this.connections) {
            if (connection.realm === realm &&
                playerId !== excludePlayerId &&
                connection.ws.readyState === WebSocket.OPEN) {
                this.send(connection.ws, message);
            }
        }
    }

    /**
     * Broadcast message to ALL players in a realm (including sender - server-authoritative)
     */
    private broadcastToRealmAll(realm: string, message: WebSocketMessage): void {
        for (const [, connection] of this.connections) {
            if (connection.realm === realm && connection.ws.readyState === WebSocket.OPEN) {
                this.send(connection.ws, message);
            }
        }
    }

    /**
     * Broadcast message to nearby players
     */
    private broadcastToNearby(
        sender: PlayerConnection,
        data: any,
        messageType: string,
        range: number
    ): void {
        for (const [playerId, connection] of this.connections) {
            if (connection.realm !== sender.realm) continue;
            if (playerId === sender.playerId) continue;
            if (connection.ws.readyState !== WebSocket.OPEN) continue;

            const dist = Math.hypot(connection.x - sender.x, connection.y - sender.y);
            if (dist <= range) {
                this.send(connection.ws, {
                    type: messageType,
                    data,
                    timestamp: Date.now()
                });
            }
        }
    }

    /**
     * Send list of current players in realm to a specific connection
     * Reserved for future use in player list sync
     */
    // @ts-ignore Method reserved for future player list synchronization
    private sendPlayersInRealm(ws: WebSocket, realm: string, excludePlayerId: string): void {
        const players: any[] = [];

        for (const [playerId, connection] of this.connections) {
            if (connection.realm === realm && playerId !== excludePlayerId) {
                players.push({
                    id: playerId,
                    x: connection.x,
                    y: connection.y
                });
            }
        }

        this.send(ws, {
            type: 'players_list',
            data: { players },
            timestamp: Date.now()
        });
    }

    /**
     * Clean up stale connections
     */
    private cleanupStaleConnections(): void {
        const now = Date.now();
        const staleIds: string[] = [];

        for (const [playerId, connection] of this.connections) {
            if (now - connection.lastSeen > this.PLAYER_TIMEOUT) {
                staleIds.push(playerId);
            } else if (connection.ws.readyState === WebSocket.OPEN) {
                // Send ping to check connection
                connection.ws.ping();
            }
        }

        for (const playerId of staleIds) {
            console.log(`🧹 Cleaning up stale connection: ${playerId}`);
            this.handleDisconnect(playerId);
        }
    }

    /**
     * Get player count by realm
     */
    getPlayerCounts(): Record<string, number> {
        const counts: Record<string, number> = {};

        for (const connection of this.connections.values()) {
            counts[connection.realm] = (counts[connection.realm] || 0) + 1;
        }

        return counts;
    }

    /**
     * Get total connected players
     */
    getTotalPlayers(): number {
        return this.connections.size;
    }

    /**
     * Shutdown WebSocket server
     */
    shutdown(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }

        // Save all player data before shutdown
        this.saveDirtyPlayers();

        // Close all connections
        for (const connection of this.connections.values()) {
            connection.ws.close(1001, 'Server shutdown');
        }
        this.connections.clear();

        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }

        console.log('🔌 WebSocket server shut down');
    }
}

// Export singleton instance
export const wsHandler = new WebSocketHandler();

// Export factory function for compatibility
export function setupWebSocket(server: Server): WebSocketHandler {
    const handler = new WebSocketHandler();
    handler.init(server);
    return handler;
}
