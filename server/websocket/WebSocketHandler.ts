// No-op for this thought process
// WebSocket Handler - SERVER-AUTHORITATIVE GAME STATE (Refactored)
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
// ARCHITECTURE:
// - Core lifecycle and routing in this file
// - Feature handlers in ./handlers/ directory
// - Types in ./types.ts
// - Bot logic in ./ServerBot.ts
// =============================================================================

import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';

// Services
import { mongoPersistence } from '../services/MongoPersistenceService.js';
import { progressionService } from '../services/ProgressionService.js';
import { playerDataService } from '../services/PlayerDataService.js';
import { worldEventsService } from '../services/WorldEventsService.js';
import { darknessService } from '../services/DarknessService.js';
import { powerUpService } from '../services/PowerUpService.js';
import { tagGameService } from '../services/TagGameService.js';
import { notificationService } from '../services/NotificationService.js';
import { activityTrackingService } from '../services/ActivityTrackingService.js';
import { friendshipService } from '../services/FriendshipService.js';
import { SHARED_CONFIG, getLevel } from '../common/constants.js';

// Types
import type { PlayerConnection, WebSocketMessage, HandlerContext, Echo, PowerUpInstance, WorldEvent, ServerFragment } from './types.js';

// Bot
import { ServerBot } from './ServerBot.js';

// Handlers
import {
    ProgressionHandlers,
    PlayerDataHandlers,
    CompanionHandlers,
    ChatHandlers,
    GameActionHandlers,
    WorldEventHandlers,
    PowerUpHandlers,
    TagGameHandlers,
    MysteryBoxHandlers,
    AnchoringHandlers,
    LeaderboardHandlers,
    QuestHandlers,
    SignalsHandlers,
    ExplorationHandlers,
    ReputationHandlers,
    NotificationHandlers,
    SnapshotHandlers,
    GuildHandlers,
    GiftHandlers,
    VoiceHandlers,
    BondHandlers,
    ReferralHandlers,
    MentorshipHandlers,
    // Phase 1 handlers
    setupSeasonHandlers,
    initializeSeasonEventListeners,
    setupGalleryHandlers,
    initializeGalleryEventListeners,
    setupDailyLoginHandlers,
    initializeDailyLoginEventListeners,
    setupConstellationHandlers,
    initializeConstellationEventListeners,
    setupActivityFeedHandlers,
    initializeActivityFeedEventListeners,
    // Phase 2 handlers (Backend Completeness)
    FriendHandlers,
    MapMarkerHandlers,
    // Phase 3 handlers (Game Modes & Analytics)
    SeekModeHandlers,
    AnalyticsHandlers,
    PetHandlers
} from './handlers/index.js';

// Phase 3 Security: Message validation
import { validateMessage, sanitizeString } from './validation/index.js';

/**
 * WebSocket server for real-time game synchronization
 * TRUE SERVER-AUTHORITATIVE ARCHITECTURE
 */
export class WebSocketHandler {
    private wss: WebSocketServer | null = null;
    private connections: Map<string, PlayerConnection> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;
    private gameLoopInterval: NodeJS.Timeout | null = null;
    private saveInterval: NodeJS.Timeout | null = null;

    // Server-authoritative bots
    private bots: Map<string, ServerBot> = new Map();
    private readonly MIN_POPULATION = 3;

    // Server-authoritative state
    private litStars: Set<string> = new Set();
    private echoes: Map<string, Echo> = new Map();
    private powerUps: Map<string, PowerUpInstance> = new Map();
    private worldEvents: Map<string, WorldEvent> = new Map();
    private realms: Map<string, Map<string, PlayerConnection>> = new Map();

    // Server-authoritative fragments (per realm)
    private fragments: Map<string, Map<string, ServerFragment>> = new Map();
    private readonly WORLD_SIZE = 8000;
    private readonly INITIAL_FRAGMENTS_PER_REALM = 150;
    private readonly MAX_FRAGMENTS_PER_REALM = 200;
    private readonly FRAGMENT_COLLECT_RADIUS = 60;
    private readonly FRAGMENT_SPAWN_INTERVAL = 5000; // 5 seconds
    private readonly XP_FRAGMENT_COLLECT = 1;
    private readonly XP_GOLDEN_FRAGMENT_COLLECT = 5;
    private fragmentIdCounter = 0;
    private lastFragmentSpawn: Map<string, number> = new Map();

    // Timing constants
    private readonly PLAYER_TIMEOUT = 30000;
    private readonly CLEANUP_INTERVAL = 10000;
    private readonly GAME_TICK_RATE = 50; // 20Hz server tick
    private readonly SAVE_INTERVAL = 30000;

    // Bond system constants
    private readonly BOND_DECAY_RATE = 0.03;
    private readonly BOND_WHISPER_GAIN = 12;
    private readonly BOND_SING_GAIN = 8;
    private readonly BOND_PULSE_GAIN = 5;
    private readonly BOND_THRESHOLD_NOTIFY = 25;

    // XP reward constants (server-authoritative)
    private readonly XP_STAR_LIT = SHARED_CONFIG.XP_STAR_LIT;
    private readonly XP_ECHO_PLANTED = SHARED_CONFIG.XP_ECHO_PLANTED;
    private readonly XP_WHISPER_SENT = SHARED_CONFIG.XP_WHISPER_SENT;
    private readonly XP_SING = 2;
    private readonly XP_PULSE = 1;
    private readonly XP_EMOTE = 1;
    private readonly XP_CONNECTION_MADE = 10;

    // Action cooldowns (in ms)
    private readonly COOLDOWN_SING = 2000;
    private readonly COOLDOWN_PULSE = 1500;
    private readonly COOLDOWN_ECHO = 5000;
    private readonly COOLDOWN_EMOTE = 1000;
    private actionCooldowns: Map<string, Map<string, number>> = new Map();

    // Rate limiting
    private readonly MESSAGE_RATE_LIMIT = 50;
    private readonly MESSAGE_RATE_WINDOW = 1000;
    private messageRateLimits: Map<string, { count: number; windowStart: number }> = new Map();

    // Player movement bounds
    private readonly MAX_COORDINATE = 50000;

    // Handler context - shared across all handlers
    private handlerContext!: HandlerContext;

    // Phase 1 handler instances (per-connection handlers)
    private seasonHandlers: Map<string, ReturnType<typeof setupSeasonHandlers>> = new Map();
    private galleryHandlers: Map<string, ReturnType<typeof setupGalleryHandlers>> = new Map();
    private dailyLoginHandlers: Map<string, ReturnType<typeof setupDailyLoginHandlers>> = new Map();
    private constellationHandlers: Map<string, ReturnType<typeof setupConstellationHandlers>> = new Map();
    private activityHandlers: Map<string, ReturnType<typeof setupActivityFeedHandlers>> = new Map();

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================

    /**
     * Initialize WebSocket server
     */
    init(server: Server): void {
        this.wss = new WebSocketServer({
            server,
            path: '/ws'
        });

        // Initialize realms
        this.initializeRealms();

        // Create handler context
        this.handlerContext = this.createHandlerContext();

        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            this.handleConnection(ws, req);
        });

        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleConnections();
        }, this.CLEANUP_INTERVAL);

        // Start server game loop
        this.gameLoopInterval = setInterval(() => {
            this.serverGameTick();
        }, this.GAME_TICK_RATE);

        // Start periodic save
        this.saveInterval = setInterval(() => {
            this.saveDirtyPlayers();
        }, this.SAVE_INTERVAL);

        // Load persisted data
        this.loadPersistedData();

        // Initialize service listeners
        this.initializeServices();

        console.log('🔌 WebSocket server initialized (modular architecture)');
        console.log('🎮 Server game loop running at 20Hz');
        console.log('💾 Player persistence enabled');
    }

    /**
     * Initialize realm structures
     */
    private initializeRealms(): void {
        const realmNames = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];
        for (const realm of realmNames) {
            this.realms.set(realm, new Map());
            // Initialize fragments for this realm with seeded random
            this.initializeFragmentsForRealm(realm);
            this.lastFragmentSpawn.set(realm, Date.now());
        }
        console.log(`✨ Initialized ${realmNames.length} realms with ${this.INITIAL_FRAGMENTS_PER_REALM} fragments each`);
    }

    /**
     * Seeded random number generator for consistent fragment placement
     * Using simple mulberry32 algorithm
     */
    private seededRandom(seed: number): () => number {
        return () => {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    /**
     * Initialize fragments for a realm using seeded random
     */
    private initializeFragmentsForRealm(realm: string): void {
        const realmFragments = new Map<string, ServerFragment>();
        // Use realm name as seed for consistent fragment placement across restarts
        const seed = realm.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 12345;
        const random = this.seededRandom(seed);

        for (let i = 0; i < this.INITIAL_FRAGMENTS_PER_REALM; i++) {
            const id = `frag_${realm}_${i}`;
            const isGolden = random() < 0.1; // 10% golden
            const fragment: ServerFragment = {
                id,
                x: 50 + random() * (this.WORLD_SIZE - 100),
                y: 50 + random() * (this.WORLD_SIZE - 100),
                realm,
                isGolden,
                value: isGolden ? 5 : 1,
                phase: random() * Math.PI * 2,
                spawnedAt: Date.now()
            };
            realmFragments.set(id, fragment);
        }
        this.fragments.set(realm, realmFragments);
    }

    /**
     * Spawn a new fragment in a realm
     */
    private spawnFragment(realm: string): ServerFragment | null {
        const realmFragments = this.fragments.get(realm);
        if (!realmFragments || realmFragments.size >= this.MAX_FRAGMENTS_PER_REALM) {
            return null;
        }

        this.fragmentIdCounter++;
        const id = `frag_${realm}_${Date.now()}_${this.fragmentIdCounter}`;
        const isGolden = Math.random() < 0.1;
        const fragment: ServerFragment = {
            id,
            x: 50 + Math.random() * (this.WORLD_SIZE - 100),
            y: 50 + Math.random() * (this.WORLD_SIZE - 100),
            realm,
            isGolden,
            value: isGolden ? 5 : 1,
            phase: Math.random() * Math.PI * 2,
            spawnedAt: Date.now()
        };
        realmFragments.set(id, fragment);
        return fragment;
    }

    /**
     * Get all fragments as a flat map (for handler context)
     */
    private getAllFragmentsFlat(): Map<string, ServerFragment> {
        const allFragments = new Map<string, ServerFragment>();
        for (const realmFragments of this.fragments.values()) {
            for (const [id, fragment] of realmFragments) {
                allFragments.set(id, fragment);
            }
        }
        return allFragments;
    }

    /**
     * Create handler context for all handlers
     */
    private createHandlerContext(): HandlerContext {
        return {
            connections: this.connections,
            realms: this.realms,
            bots: this.bots,
            echoes: this.echoes,
            powerUps: this.powerUps,
            worldEvents: this.worldEvents,
            litStars: this.litStars,
            fragments: this.getAllFragmentsFlat(),
            send: this.send.bind(this),
            broadcast: this.broadcast.bind(this),
            broadcastToRealm: this.broadcastToRealm.bind(this),
            sendError: this.sendError.bind(this)
        };
    }

    /**
     * Initialize service event listeners
     */
    private initializeServices(): void {
        // World Events Service
        worldEventsService.on('event_started', (event: any) => {
            this.broadcast({ type: 'world_event_started', data: { event } });
        });

        worldEventsService.on('event_ended', (event: any) => {
            this.broadcast({ type: 'world_event_ended', data: { eventId: event.id, event } });
        });

        // Darkness Service
        darknessService.on('darkness_warning', (darknessData: any) => {
            this.broadcastToRealm(darknessData.realm, { type: 'darkness_warning', data: darknessData });
        });

        darknessService.on('darkness_active', (darknessData: any) => {
            this.broadcastToRealm(darknessData.realm, { type: 'darkness_active', data: darknessData });
        });

        darknessService.on('darkness_ended', (darknessData: any) => {
            this.broadcastToRealm(darknessData.realm, { type: 'darkness_ended', data: darknessData });
        });

        // Power-up Service
        powerUpService.on('power_up_spawned', (powerUp: any) => {
            this.broadcastToRealm(powerUp.realm, { type: 'power_up_spawned', data: { powerUp } });
        });

        powerUpService.on('power_up_collected', (collectedData: any) => {
            this.broadcastToRealm(collectedData.realm, {
                type: 'power_up_collected',
                data: {
                    powerUpId: collectedData.powerUpId,
                    playerId: collectedData.playerId
                }
            });
        });

        // Tag Game Service
        tagGameService.on('session_created', (session: any) => {
            this.broadcast({
                type: 'tag_session_created',
                data: {
                    session: {
                        id: session.id,
                        realm: session.realm,
                        maxPlayers: session.maxPlayers,
                        duration: session.duration,
                        playerCount: session.players?.size || 0
                    }
                }
            });
        });

        tagGameService.on('game_started', (gameData: any) => {
            this.broadcastToTagSession(gameData.sessionId, {
                type: 'tag_game_started',
                data: { initialTagger: gameData.initialTagger }
            });
        });

        tagGameService.on('tag_occurred', (tagData: any) => {
            this.broadcastToTagSession(tagData.sessionId, {
                type: 'tag_occurred',
                data: {
                    tagger: tagData.tagger,
                    tagged: tagData.tagged
                }
            });
        });
    }

    // ==========================================================================
    // CONNECTION HANDLING
    // ==========================================================================

    /**
     * Handle new WebSocket connection
     */
    private handleConnection(ws: WebSocket, req: IncomingMessage): void {
        const playerId = this.extractPlayerId(req) || this.generatePlayerId();
        const realm = this.extractRealm(req) || 'genesis';

        console.log(`🔗 Player connected: ${playerId} to realm ${realm}`);

        // Initialize at world center (WORLD_SIZE = 8000, so center is 4000)
        const WORLD_CENTER = 4000;
        
        const connection: PlayerConnection = {
            ws,
            playerId,
            playerName: `Player_${playerId.substring(0, 6)}`,
            realm,
            lastSeen: Date.now(),
            x: WORLD_CENTER,
            y: WORLD_CENTER,
            color: Math.floor(Math.random() * 360),
            xp: 0,
            level: 1,
            isBot: false
        };

        // Store connection
        this.connections.set(playerId, connection);

        // Add to realm
        const realmConnections = this.realms.get(realm);
        if (realmConnections) {
            realmConnections.set(playerId, connection);
        }

        // Load player data from database
        this.loadPlayerData(connection);

        // Set up Phase 1 handlers for this connection
        this.setupPhase1Handlers(playerId, ws);

        // Set up message handler
        ws.on('message', (data) => {
            this.handleMessage(playerId, data.toString());
        });

        // Set up close handler
        ws.on('close', () => {
            this.handleDisconnect(playerId);
        });

        // Set up error handler
        ws.on('error', (error) => {
            console.error(`WebSocket error for ${playerId}:`, error);
        });

        // Send initial world state
        this.sendInitialWorldState(connection);
    }

    /**
     * Handle player disconnect
     */
    private async handleDisconnect(playerId: string): Promise<void> {
        console.log(`🔌 Player disconnected: ${playerId}`);

        const connection = this.connections.get(playerId);
        if (connection) {
            // Save player data
            await this.savePlayerData(connection);

            // Remove from realm
            const realmConnections = this.realms.get(connection.realm);
            if (realmConnections) {
                realmConnections.delete(playerId);
            }

            // Notify realm
            this.broadcastToRealm(connection.realm, {
                type: 'player_left',
                data: { playerId },
                timestamp: Date.now()
            }, playerId);
        }

        // Remove connection
        this.connections.delete(playerId);
        this.actionCooldowns.delete(playerId);
        this.messageRateLimits.delete(playerId);

        // Clean up Phase 1 handlers
        this.seasonHandlers.delete(playerId);
        this.galleryHandlers.delete(playerId);
        this.dailyLoginHandlers.delete(playerId);
        this.constellationHandlers.delete(playerId);
        this.activityHandlers.delete(playerId);
    }

    // ==========================================================================
    // MESSAGE ROUTING
    // ==========================================================================

    /**
     * Route incoming messages to appropriate handlers
     */
    private handleMessage(playerId: string, rawData: string): void {
        try {
            // Rate limiting
            if (this.isRateLimited(playerId)) {
                return;
            }

            const message: WebSocketMessage = JSON.parse(rawData);
            const connection = this.connections.get(playerId);

            if (!connection) return;

            connection.lastSeen = Date.now();
            const ctx = this.handlerContext;

            // Phase 3 Security: Validate message data with Zod schemas
            const validation = validateMessage(message.type, message.data);
            if (!validation.success) {
                const errorMsg = 'error' in validation ? validation.error : 'Validation failed';
                console.warn(`[Validation] ${playerId}: ${message.type} - ${errorMsg}`);
                this.sendError(connection, `Invalid ${message.type} payload: ${errorMsg}`);
                return;
            }

            // Use validated data - cast to any since handlers have varied type expectations
            const validatedData = validation.data as any;

            switch (message.type) {
                // === CORE GAME ACTIONS ===
                case 'player_update':
                    this.handlePlayerUpdate(playerId, connection, validatedData);
                    break;
                case 'collect_fragment':
                    this.handleCollectFragment(connection, validatedData);
                    break;
                case 'ping':
                    this.send(connection.ws, { type: 'pong', data: { timestamp: message.timestamp }, timestamp: Date.now() });
                    break;

                // === GAME ACTIONS ===
                case 'sing':
                    GameActionHandlers.handleSing(connection, validatedData, ctx);
                    break;
                case 'pulse':
                    GameActionHandlers.handlePulse(connection, validatedData, ctx);
                    break;
                case 'emote':
                    GameActionHandlers.handleEmote(connection, validatedData, ctx);
                    break;
                case 'echo':
                    GameActionHandlers.handleCreateEcho(connection, validatedData, ctx);
                    break;
                case 'echo_ignite':
                    GameActionHandlers.handleResonateEcho(connection, validatedData, ctx);
                    break;
                case 'star_lit':
                    GameActionHandlers.handleLightStar(connection, validatedData, ctx);
                    break;
                case 'wave':
                    GameActionHandlers.handleWave(connection, validatedData, ctx);
                    break;
                case 'resonance':
                    GameActionHandlers.handleResonance(connection, validatedData, ctx);
                    break;
                case 'pulse_pattern_completed':
                    GameActionHandlers.handlePulsePatternCompleted(connection, validatedData, ctx);
                    break;
                case 'record_pulse':
                    GameActionHandlers.handleRecordPulse(connection, validatedData, ctx);
                    break;
                case 'get_pulse_patterns':
                    GameActionHandlers.handleGetPulsePatterns(connection, validatedData, ctx);
                    break;

                // === CHAT ===
                case 'chat':
                    ChatHandlers.handleChatMessage(connection, validatedData, ctx);
                    break;
                case 'whisper':
                    ChatHandlers.handleWhisper(connection, validatedData, ctx);
                    break;
                case 'emoji_reaction':
                    ChatHandlers.handleEmojiReaction(connection, validatedData, ctx);
                    break;
                case 'typing':
                    ChatHandlers.handleTypingIndicator(connection, validatedData, ctx);
                    break;

                // === PROGRESSION ===
                case 'challenge_progress':
                    ProgressionHandlers.handleChallengeProgress(connection, validatedData, ctx);
                    break;
                case 'request_progression':
                    ProgressionHandlers.handleRequestProgression(connection, validatedData, ctx);
                    break;
                case 'claim_daily_reward':
                    ProgressionHandlers.handleClaimDailyReward(connection, validatedData, ctx);
                    break;
                case 'claim_challenge_reward':
                    ProgressionHandlers.handleClaimChallengeReward(connection, validatedData, ctx);
                    break;
                case 'claim_season_reward':
                    ProgressionHandlers.handleClaimSeasonReward(connection, validatedData, ctx);
                    break;
                case 'purchase_cosmetic':
                    ProgressionHandlers.handlePurchaseCosmetic(connection, validatedData, ctx);
                    break;
                case 'equip_cosmetic':
                    ProgressionHandlers.handleEquipCosmetic(connection, validatedData, ctx);
                    break;
                case 'get_activity_feed':
                    ProgressionHandlers.handleGetActivityFeed(connection, validatedData, ctx);
                    break;
                case 'mark_feed_read':
                    ProgressionHandlers.handleMarkFeedRead(connection, validatedData, ctx);
                    break;
                case 'get_unread_count':
                    ProgressionHandlers.handleGetUnreadCount(connection, validatedData, ctx);
                    break;

                // === PLAYER DATA ===
                case 'sync_player_data':
                    PlayerDataHandlers.handleSyncPlayerData(connection, validatedData, ctx);
                    break;
                case 'update_settings':
                    PlayerDataHandlers.handleUpdateSettings(connection, validatedData, ctx);
                    break;
                case 'request_player_data':
                    PlayerDataHandlers.handleRequestPlayerData(connection, validatedData, ctx);
                    break;
                case 'friend_request':
                    PlayerDataHandlers.handleFriendRequest(connection, validatedData, ctx);
                    break;
                case 'accept_friend':
                    PlayerDataHandlers.handleAcceptFriend(connection, validatedData, ctx);
                    break;
                case 'decline_friend':
                    PlayerDataHandlers.handleDeclineFriend(connection, validatedData, ctx);
                    break;
                case 'remove_friend':
                    PlayerDataHandlers.handleRemoveFriend(connection, validatedData, ctx);
                    break;
                case 'get_friends':
                    PlayerDataHandlers.handleGetFriends(connection, validatedData, ctx);
                    break;
                case 'get_pending_requests':
                    PlayerDataHandlers.handleGetPendingRequests(connection, validatedData, ctx);
                    break;
                case 'teleport_to_friend':
                    PlayerDataHandlers.handleTeleportToFriend(connection, validatedData, ctx);
                    break;

                // === COMMUNICATION SYNC ===
                case 'sync_communication':
                    PlayerDataHandlers.handleSyncCommunication(connection, validatedData, ctx);
                    break;
                case 'request_communication':
                    PlayerDataHandlers.handleRequestCommunication(connection, validatedData, ctx);
                    break;

                // === MAP MARKERS ===
                case 'place_map_marker':
                    PlayerDataHandlers.handlePlaceMapMarker(connection, validatedData, ctx);
                    break;
                case 'remove_map_marker':
                    PlayerDataHandlers.handleRemoveMapMarker(connection, validatedData, ctx);
                    break;
                case 'request_friend_markers':
                    PlayerDataHandlers.handleRequestFriendMarkers(connection, validatedData, ctx);
                    break;

                // === COMPANION ===
                case 'request_companion_data':
                    CompanionHandlers.handleRequestCompanionData(connection, validatedData, ctx);
                    break;
                case 'purchase_companion':
                    CompanionHandlers.handlePurchaseCompanion(connection, validatedData, ctx);
                    break;
                case 'equip_companion':
                    CompanionHandlers.handleEquipCompanion(connection, validatedData, ctx);
                    break;
                case 'unequip_companion':
                    CompanionHandlers.handleUnequipCompanion(connection, validatedData, ctx);
                    break;
                case 'feed_companion':
                    CompanionHandlers.handleFeedCompanion(connection, validatedData, ctx);
                    break;
                case 'rename_companion':
                    CompanionHandlers.handleRenameCompanion(connection, validatedData, ctx);
                    break;

                // === PETS ===
                case 'adopt_pet':
                    PetHandlers.handleAdoptPet(connection, validatedData, ctx);
                    break;
                case 'equip_pet':
                    PetHandlers.handleEquipPet(connection, validatedData, ctx);
                    break;
                case 'feed_pet':
                    PetHandlers.handleFeedPet(connection, validatedData, ctx);
                    break;
                case 'play_pet':
                    PetHandlers.handlePlayPet(connection, validatedData, ctx);
                    break;
                case 'get_pet_details':
                    PetHandlers.handleGetPetDetails(connection, validatedData, ctx);
                    break;

                // === WORLD EVENTS ===
                case 'request_world_events':
                    WorldEventHandlers.handleGetWorldEvents(connection, validatedData, ctx);
                    break;
                case 'join_world_event':
                    WorldEventHandlers.handleJoinWorldEvent(connection, validatedData, ctx);
                    break;
                case 'contribute_event':
                    WorldEventHandlers.handleContributeToEvent(connection, validatedData, ctx);
                    break;
                case 'get_event_progress':
                    WorldEventHandlers.handleGetEventProgress(connection, validatedData, ctx);
                    break;
                case 'get_event_leaderboard':
                    WorldEventHandlers.handleGetEventLeaderboard(connection, validatedData, ctx);
                    break;
                case 'claim_event_reward':
                    WorldEventHandlers.handleClaimEventReward(connection, validatedData, ctx);
                    break;
                case 'request_darkness':
                case 'get_darkness_level':
                    WorldEventHandlers.handleGetDarknessLevel(connection, validatedData, ctx);
                    break;
                case 'fight_darkness':
                    WorldEventHandlers.handleFightDarkness(connection, validatedData, ctx);
                    break;
                case 'get_darkness_hazards':
                    WorldEventHandlers.handleGetDarknessHazards(connection, validatedData, ctx);
                    break;

                // === WORLD STATE ===
                case 'request_world_state':
                    this.sendInitialWorldState(connection);
                    break;

                // === POWER-UPS ===
                case 'request_power_ups':
                    PowerUpHandlers.handleRequestPowerUps(connection, validatedData, ctx);
                    break;
                case 'collect_power_up':
                    PowerUpHandlers.handleCollectPowerUp(connection, validatedData, ctx);
                    break;
                case 'activate_power_up':
                    PowerUpHandlers.handleActivatePowerUp(connection, validatedData, ctx);
                    break;
                case 'get_active_power_ups':
                    PowerUpHandlers.handleGetActivePowerUps(connection, validatedData, ctx);
                    break;

                // === TAG GAME ===
                case 'tag_create':
                    TagGameHandlers.handleCreateTagGame(connection, validatedData, ctx);
                    break;
                case 'tag_join':
                    TagGameHandlers.handleJoinTagGame(connection, validatedData, ctx);
                    break;
                case 'tag_start':
                    TagGameHandlers.handleStartTagGame(connection, validatedData, ctx);
                    break;
                case 'tag_attempt':
                    TagGameHandlers.handleTag(connection, validatedData, ctx);
                    break;
                case 'tag_leave':
                    TagGameHandlers.handleLeaveTagGame(connection, validatedData, ctx);
                    break;
                case 'get_tag_games':
                    TagGameHandlers.handleGetTagGames(connection, validatedData, ctx);
                    break;

                // === MYSTERY BOX ===
                case 'request_mystery_boxes':
                case 'get_mystery_box_info':
                    MysteryBoxHandlers.handleGetMysteryBoxInfo(connection, validatedData, ctx);
                    break;
                case 'open_mystery_box':
                    MysteryBoxHandlers.handleOpenMysteryBox(connection, validatedData, ctx);
                    break;
                case 'request_box_stats':
                case 'get_box_stats':
                    MysteryBoxHandlers.handleGetBoxStats(connection, validatedData, ctx);
                    break;
                case 'get_pity_progress':
                    MysteryBoxHandlers.handleGetPityProgress(connection, validatedData, ctx);
                    break;
                case 'get_global_box_stats':
                    MysteryBoxHandlers.handleGetGlobalBoxStats(connection, validatedData, ctx);
                    break;

                // === ANCHORING / MINDFULNESS ===
                case 'request_anchoring_zones':
                    AnchoringHandlers.handleGetAnchoringZones(connection, validatedData, ctx);
                    break;
                case 'enter_anchoring_zone':
                    AnchoringHandlers.handleEnterAnchoringZone(connection, validatedData, ctx);
                    break;
                case 'leave_anchoring_zone':
                    AnchoringHandlers.handleLeaveAnchoringZone(connection, validatedData, ctx);
                    break;
                case 'start_meditation':
                    AnchoringHandlers.handleStartMeditation(connection, validatedData, ctx);
                    break;
                case 'end_meditation':
                    AnchoringHandlers.handleEndMeditation(connection, validatedData, ctx);
                    break;
                case 'request_mindfulness_stats':
                    AnchoringHandlers.handleGetMindfulnessStats(connection, validatedData, ctx);
                    break;
                case 'join_group_meditation':
                    AnchoringHandlers.handleJoinGroupMeditation(connection, validatedData, ctx);
                    break;
                case 'breathing_sync':
                    AnchoringHandlers.handleBreathingSync(connection, validatedData, ctx);
                    break;

                // === LEADERBOARD ===
                case 'request_leaderboard':
                    LeaderboardHandlers.handleRequestLeaderboard(connection, validatedData, ctx);
                    break;
                case 'request_player_rank':
                    LeaderboardHandlers.handleGetPlayerRank(connection, validatedData, ctx);
                    break;
                case 'request_nearby_ranks':
                    LeaderboardHandlers.handleGetNearbyRanks(connection, validatedData, ctx);
                    break;
                case 'request_friend_leaderboard':
                    LeaderboardHandlers.handleGetFriendLeaderboard(connection, validatedData, ctx);
                    break;
                case 'request_realm_leaderboard':
                    LeaderboardHandlers.handleGetRealmLeaderboard(connection, validatedData, ctx);
                    break;
                case 'get_leaderboard_types':
                    LeaderboardHandlers.handleGetLeaderboardTypes(connection, validatedData, ctx);
                    break;

                // === QUESTS ===
                case 'request_quests':
                case 'get_quests':
                    QuestHandlers.handleGetQuests(connection, validatedData, ctx);
                    break;
                case 'get_active_quests':
                case 'get_story_quests':
                    QuestHandlers.handleGetStoryQuests(connection, validatedData, ctx);
                    break;
                case 'start_quest':
                    QuestHandlers.handleStartQuest(connection, validatedData, ctx);
                    break;
                case 'update_quest_progress':
                    QuestHandlers.handleUpdateQuestProgress(connection, validatedData, ctx);
                    break;
                case 'claim_quest_reward':
                    QuestHandlers.handleClaimQuestReward(connection, validatedData, ctx);
                    break;
                case 'abandon_quest':
                    QuestHandlers.handleAbandonQuest(connection, validatedData, ctx);
                    break;
                case 'get_daily_quests':
                    QuestHandlers.handleGetDailyQuests(connection, validatedData, ctx);
                    break;
                case 'get_weekly_quests':
                    QuestHandlers.handleGetWeeklyQuests(connection, validatedData, ctx);
                    break;
                case 'get_quest_stats':
                    QuestHandlers.handleGetQuestStats(connection, validatedData, ctx);
                    break;

                // === SIGNALS ===
                case 'send_signal':
                    SignalsHandlers.handleSendSignal(connection, validatedData, ctx);
                    break;
                case 'request_signals':
                case 'get_signals':
                    SignalsHandlers.handleGetSignals(connection, validatedData, ctx);
                    break;
                case 'respond_signal':
                    SignalsHandlers.handleRespondToSignal(connection, validatedData, ctx);
                    break;
                case 'acknowledge_signal':
                    SignalsHandlers.handleAcknowledgeSignal(connection, validatedData, ctx);
                    break;
                case 'get_signal_types':
                    SignalsHandlers.handleGetSignalTypes(connection, validatedData, ctx);
                    break;
                case 'get_directed_signals':
                    SignalsHandlers.handleGetDirectedSignals(connection, validatedData, ctx);
                    break;
                case 'get_signal_cooldowns':
                    SignalsHandlers.handleGetSignalCooldowns(connection, validatedData, ctx);
                    break;

                // === EXPLORATION ===
                case 'update_exploration':
                    ExplorationHandlers.handleUpdateExploration(connection, validatedData, ctx);
                    break;
                case 'request_exploration_data':
                    ExplorationHandlers.handleGetExplorationData(connection, validatedData, ctx);
                    break;
                case 'discover_poi':
                    ExplorationHandlers.handleDiscoverPOI(connection, validatedData, ctx);
                    break;
                case 'get_nearby_pois':
                    ExplorationHandlers.handleGetNearbyPOIs(connection, validatedData, ctx);
                    break;
                case 'get_exploration_stats':
                    ExplorationHandlers.handleGetExplorationStats(connection, validatedData, ctx);
                    break;
                case 'get_region_info':
                    ExplorationHandlers.handleGetRegionInfo(connection, validatedData, ctx);
                    break;
                case 'discover_biome':
                    ExplorationHandlers.handleDiscoverBiome(connection, validatedData, ctx);
                    break;
                case 'reveal_fog':
                    ExplorationHandlers.handleRevealFog(connection, validatedData, ctx);
                    break;
                case 'get_exploration_milestones':
                    ExplorationHandlers.handleGetMilestones(connection, validatedData, ctx);
                    break;
                case 'get_discovered_biomes':
                    ExplorationHandlers.handleGetDiscoveredBiomes(connection, validatedData, ctx);
                    break;
                case 'get_available_time_secrets':
                    ExplorationHandlers.handleGetAvailableTimeSecrets(connection, validatedData, ctx);
                    break;
                case 'discover_time_secret':
                    ExplorationHandlers.handleDiscoverTimeSecret(connection, validatedData, ctx);
                    break;
                case 'get_all_time_secrets':
                    ExplorationHandlers.handleGetAllTimeSecrets(connection, validatedData, ctx);
                    break;

                // === REPUTATION ===
                case 'request_reputation':
                    ReputationHandlers.handleRequestReputation(connection, validatedData, ctx);
                    break;
                case 'track_reputation_action':
                    ReputationHandlers.handleTrackReputationAction(connection, validatedData, ctx);
                    break;
                case 'get_track_progress':
                    ReputationHandlers.handleGetTrackProgress(connection, validatedData, ctx);
                    break;
                case 'get_player_reputation':
                    ReputationHandlers.handleGetPlayerReputation(connection, validatedData, ctx);
                    break;
                case 'claim_reputation_reward':
                    ReputationHandlers.handleClaimReputationReward(connection, validatedData, ctx);
                    break;
                case 'get_reputation_leaderboard':
                    ReputationHandlers.handleGetReputationLeaderboard(connection, validatedData, ctx);
                    break;

                // === NOTIFICATIONS ===
                case 'get_notification_preferences':
                case 'get_notification_prefs':
                    NotificationHandlers.handleGetNotificationPrefs(connection, validatedData, ctx);
                    break;
                case 'update_notification_preferences':
                case 'update_notification_prefs':
                    NotificationHandlers.handleUpdateNotificationPrefs(connection, validatedData, ctx);
                    break;
                case 'get_notifications':
                    NotificationHandlers.handleGetNotifications(connection, validatedData, ctx);
                    break;
                case 'mark_notification_read':
                    NotificationHandlers.handleMarkNotificationRead(connection, validatedData, ctx);
                    break;
                case 'mark_all_notifications_read':
                case 'mark_all_read':
                    NotificationHandlers.handleMarkAllRead(connection, validatedData, ctx);
                    break;
                case 'clear_notifications':
                    NotificationHandlers.handleClearNotifications(connection, validatedData, ctx);
                    break;
                case 'mute_player':
                    NotificationHandlers.handleMutePlayer(connection, validatedData, ctx);
                    break;
                case 'unmute_player':
                    NotificationHandlers.handleUnmutePlayer(connection, validatedData, ctx);
                    break;

                case 'unmute_player':
                    NotificationHandlers.handleUnmutePlayer(connection, validatedData, ctx);
                    break;

                // === SNAPSHOTS ===
                case 'snapshot_taken':
                    SnapshotHandlers.handleSnapshotTaken(connection, validatedData, ctx);
                    break;

                // === GUILDS ===
                case 'guild_action':
                    GuildHandlers.handleGuildAction(connection, validatedData, ctx);
                    break;
                case 'guild_chat':
                    GuildHandlers.handleGuildChat(connection, validatedData, ctx);
                    break;
                case 'create_guild':
                    GuildHandlers.handleCreateGuild(connection, validatedData, ctx);
                    break;
                case 'join_guild':
                    GuildHandlers.handleJoinGuild(connection, validatedData, ctx);
                    break;
                case 'leave_guild':
                    GuildHandlers.handleLeaveGuild(connection, validatedData, ctx);
                    break;
                case 'list_guilds':
                    GuildHandlers.handleListGuilds(connection, validatedData, ctx);
                    break;
                case 'get_guild_info':
                    GuildHandlers.handleGetGuildInfo(connection, validatedData, ctx);
                    break;
                case 'guild_contribute':
                    GuildHandlers.handleGuildContribute(connection, validatedData, ctx);
                    break;

                // === GIFTS ===
                case 'send_gift':
                    GiftHandlers.handleSendGift(connection, validatedData, ctx);
                    break;
                case 'claim_gift':
                    GiftHandlers.handleClaimGift(connection, validatedData, ctx);
                    break;
                case 'get_pending_gifts':
                    GiftHandlers.handleGetPendingGifts(connection, validatedData, ctx);
                    break;
                case 'get_gift_history':
                    GiftHandlers.handleGetGiftHistory(connection, validatedData, ctx);
                    break;
                case 'get_gift_cooldown':
                    GiftHandlers.handleGetGiftCooldown(connection, validatedData, ctx);
                    break;
                case 'get_gift_streak':
                    GiftHandlers.handleGetGiftStreak(connection, validatedData, ctx);
                    break;

                // === VOICE CHAT ===
                case 'voice_signal':
                    VoiceHandlers.handleVoiceSignal(connection, validatedData, ctx);
                    break;
                case 'voice_join_room':
                    VoiceHandlers.handleJoinRoom(connection, validatedData, ctx);
                    break;
                case 'voice_leave_room':
                    VoiceHandlers.handleLeaveRoom(connection, validatedData, ctx);
                    break;
                case 'voice_mute':
                    VoiceHandlers.handleMute(connection, validatedData, ctx);
                    break;
                case 'voice_speaking':
                    VoiceHandlers.handleSpeaking(connection, validatedData, ctx);
                    break;
                case 'get_nearby_voice_peers':
                    VoiceHandlers.handleGetNearbyVoicePeers(connection, validatedData, ctx);
                    break;
                case 'get_voice_rooms':
                    VoiceHandlers.handleGetVoiceRooms(connection, validatedData, ctx);
                    break;

                // === FRIEND TELEPORT ===
                case 'teleport_to_friend':
                    PlayerDataHandlers.handleTeleportToFriend(connection, validatedData, ctx);
                    break;

                // === BONDS ===
                case 'get_bond':
                    BondHandlers.handleGetBond(connection, validatedData, ctx);
                    break;
                case 'get_all_bonds':
                    BondHandlers.handleGetAllBonds(connection, validatedData, ctx);
                    break;
                case 'bond_interaction':
                    BondHandlers.handleBondInteraction(connection, validatedData, ctx);
                    break;
                case 'add_bond_memory':
                    BondHandlers.handleAddMemory(connection, validatedData, ctx);
                    break;
                case 'seal_bond':
                    BondHandlers.handleSealBond(connection, validatedData, ctx);
                    break;
                case 'get_star_memories':
                    BondHandlers.handleGetStarMemories(connection, validatedData, ctx);
                    break;
                case 'get_realm_stars':
                    BondHandlers.handleGetRealmStars(connection, validatedData, ctx);
                    break;
                case 'get_constellations':
                    BondHandlers.handleGetConstellations(connection, validatedData, ctx);
                    break;

                // === REFERRALS ===
                case 'generate_referral_code':
                    ReferralHandlers.handleGenerateCode(connection, validatedData, ctx);
                    break;
                case 'apply_referral':
                    ReferralHandlers.handleApplyReferral(connection, validatedData, ctx);
                    break;
                case 'get_referral_stats':
                    ReferralHandlers.handleGetReferralStats(connection, validatedData, ctx);
                    break;
                case 'get_referred_players':
                    ReferralHandlers.handleGetReferredPlayers(connection, validatedData, ctx);
                    break;
                case 'claim_referral_reward':
                    ReferralHandlers.handleClaimReferralReward(connection, validatedData, ctx);
                    break;
                case 'get_my_referral_code':
                    ReferralHandlers.handleGetMyReferralCode(connection, validatedData, ctx);
                    break;
                case 'validate_referral_code':
                    ReferralHandlers.handleValidateReferralCode(connection, validatedData, ctx);
                    break;

                // === MENTORSHIP ===
                case 'become_mentor':
                    MentorshipHandlers.handleBecomeMentor(connection, validatedData, ctx);
                    break;
                case 'request_mentor':
                    MentorshipHandlers.handleRequestMentor(connection, validatedData, ctx);
                    break;
                case 'accept_mentee':
                    MentorshipHandlers.handleAcceptMentee(connection, validatedData, ctx);
                    break;
                case 'decline_mentee':
                    MentorshipHandlers.handleDeclineMentee(connection, validatedData, ctx);
                    break;
                case 'get_available_mentors':
                    MentorshipHandlers.handleGetAvailableMentors(connection, validatedData, ctx);
                    break;
                case 'get_mentorship_status':
                    MentorshipHandlers.handleGetMentorshipStatus(connection, validatedData, ctx);
                    break;
                case 'end_mentorship':
                    MentorshipHandlers.handleEndMentorship(connection, validatedData, ctx);
                    break;
                case 'send_mentor_tip':
                    MentorshipHandlers.handleSendMentorTip(connection, validatedData, ctx);
                    break;
                case 'rate_mentorship':
                    MentorshipHandlers.handleRateMentorship(connection, validatedData, ctx);
                    break;
                case 'get_pending_mentee_requests':
                    MentorshipHandlers.handleGetPendingMenteeRequests(connection, validatedData, ctx);
                    break;

                // === SEASON PASS (Phase 1) ===
                case 'season:getInfo':
                case 'season:getProgress':
                case 'season:addXP':
                case 'season:claimReward':
                case 'season:claimAll':
                case 'season:upgradePremium':
                case 'season:getRewards':
                case 'season:getHistory':
                    // Delegate to season handler setup
                    this.handleSeasonMessage(connection, message);
                    break;

                // === GALLERY (Phase 1) ===
                case 'gallery:save':
                case 'gallery:get':
                case 'gallery:getOne':
                case 'gallery:delete':
                case 'gallery:updateCaption':
                case 'gallery:togglePublic':
                case 'gallery:like':
                case 'gallery:getPublic':
                case 'gallery:trackShare':
                case 'gallery:getStats':
                case 'gallery:createAlbum':
                case 'gallery:getAlbums':
                case 'gallery:addToAlbum':
                case 'gallery:removeFromAlbum':
                case 'gallery:getAlbumScreenshots':
                    this.handleGalleryMessage(connection, message);
                    break;

                // === DAILY LOGIN (Phase 1) ===
                case 'daily:login':
                case 'daily:getStreak':
                case 'daily:getRewards':
                case 'daily:getLeaderboard':
                    this.handleDailyLoginMessage(connection, message);
                    break;

                // === CONSTELLATION (Phase 1) ===
                case 'constellation:form':
                case 'constellation:expand':
                case 'constellation:getPlayer':
                case 'constellation:getOne':
                case 'constellation:getRealm':
                case 'constellation:getStats':
                case 'constellation:checkPotential':
                case 'constellation:getGlobalStats':
                    this.handleConstellationMessage(connection, message);
                    break;

                // === ACTIVITY FEED (Phase 1) ===
                case 'activity:getFeed':
                case 'activity:getPlayer':
                case 'activity:getStats':
                case 'activity:recordLevelUp':
                case 'activity:recordAchievement':
                case 'activity:recordOnline':
                    this.handleActivityMessage(connection, message);
                    break;

                // === FRIEND STATUS (Phase 2 - Backend Completeness) ===
                case 'friend:getStatuses':
                    FriendHandlers.handleStatusRequest(connection, validatedData, ctx);
                    break;
                case 'friend:getPosition':
                    FriendHandlers.handleFriendPositionRequest(connection, validatedData, ctx);
                    break;
                case 'friend:teleportTo':
                    FriendHandlers.handleTeleportToFriend(connection, validatedData, ctx);
                    break;
                case 'friend:add':
                    FriendHandlers.handleAddFriend(connection, validatedData, ctx);
                    break;
                case 'friend:remove':
                    FriendHandlers.handleRemoveFriend(connection, validatedData, ctx);
                    break;
                case 'friend:acceptRequest':
                    FriendHandlers.handleAcceptFriendRequest(connection, validatedData, ctx);
                    break;
                case 'friend:declineRequest':
                    FriendHandlers.handleDeclineFriendRequest(connection, validatedData, ctx);
                    break;
                case 'friend:getPendingRequests':
                    FriendHandlers.handleGetPendingRequests(connection, validatedData, ctx);
                    break;

                // === MAP MARKERS (Phase 2 - Backend Completeness) ===
                case 'marker:create':
                    MapMarkerHandlers.handleCreateMarker(connection, validatedData, ctx);
                    break;
                case 'marker:get':
                    MapMarkerHandlers.handleGetMarkers(connection, validatedData, ctx);
                    break;
                case 'marker:update':
                    MapMarkerHandlers.handleUpdateMarker(connection, validatedData, ctx);
                    break;
                case 'marker:delete':
                    MapMarkerHandlers.handleDeleteMarker(connection, validatedData, ctx);
                    break;
                case 'marker:share':
                    MapMarkerHandlers.handleShareMarker(connection, validatedData, ctx);
                    break;
                case 'marker:acceptShare':
                    MapMarkerHandlers.handleAcceptShareInvite(connection, validatedData, ctx);
                    break;
                case 'marker:declineShare':
                    MapMarkerHandlers.handleDeclineShareInvite(connection, validatedData, ctx);
                    break;
                case 'marker:savePreset':
                    MapMarkerHandlers.handleSavePreset(connection, validatedData, ctx);
                    break;
                case 'marker:getPresets':
                    MapMarkerHandlers.handleGetPresets(connection, validatedData, ctx);
                    break;
                case 'marker:deletePreset':
                    MapMarkerHandlers.handleDeletePreset(connection, validatedData, ctx);
                    break;

                // =========================================================
                // SEEK MODE HANDLERS (Phase 1.6)
                // =========================================================
                case 'seek:createGame':
                    SeekModeHandlers.handleCreateSeekGame(connection.ws, validatedData);
                    break;
                case 'seek:joinGame':
                    SeekModeHandlers.handleJoinSeekGame(connection.ws, validatedData);
                    break;
                case 'seek:startGame':
                    SeekModeHandlers.handleStartSeekGame(connection.ws, validatedData);
                    break;
                case 'seek:confirmHiding':
                    SeekModeHandlers.handleConfirmHiding(connection.ws, validatedData);
                    break;
                case 'seek:attemptFind':
                    SeekModeHandlers.handleAttemptFind(connection.ws, validatedData);
                    break;
                case 'seek:leaveGame':
                    SeekModeHandlers.handleLeaveSeekGame(connection.ws);
                    break;
                case 'seek:getGames':
                    SeekModeHandlers.handleGetActiveSeekGames(connection.ws);
                    break;
                case 'seek:getHistory':
                    SeekModeHandlers.handleGetSeekHistory(connection.ws, validatedData);
                    break;
                case 'seek:getCurrent':
                    SeekModeHandlers.handleGetCurrentSeekGame(connection.ws);
                    break;

                // =========================================================
                // ANALYTICS HANDLERS (Phase 3.4-3.6)
                // =========================================================
                case 'analytics:getPreferences':
                    AnalyticsHandlers.handleGetPreferences(connection.ws);
                    break;
                case 'analytics:updatePreferences':
                    AnalyticsHandlers.handleUpdatePreferences(connection.ws, validatedData);
                    break;
                case 'analytics:updateFilters':
                    AnalyticsHandlers.handleUpdateVisualFilters(connection.ws, validatedData);
                    break;
                case 'analytics:startGameMode':
                    AnalyticsHandlers.handleStartGameMode(connection.ws, validatedData);
                    break;
                case 'analytics:endGameMode':
                    AnalyticsHandlers.handleEndGameMode(connection.ws, validatedData);
                    break;
                case 'analytics:getGameModeStats':
                    AnalyticsHandlers.handleGetGameModeStats(connection.ws);
                    break;
                case 'analytics:startAmbient':
                    AnalyticsHandlers.handleStartAmbientMode(connection.ws, validatedData);
                    break;
                case 'analytics:endAmbient':
                    AnalyticsHandlers.handleEndAmbientMode(connection.ws);
                    break;
                case 'analytics:getAmbientStats':
                    AnalyticsHandlers.handleGetAmbientStats(connection.ws);
                    break;
                case 'analytics:getGlobalGameModeStats':
                    AnalyticsHandlers.handleGetGlobalGameModeStats(connection.ws);
                    break;
                case 'analytics:getGlobalAmbientStats':
                    AnalyticsHandlers.handleGetGlobalAmbientStats(connection.ws);
                    break;

                default:
                    console.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error('Failed to handle message:', error);
        }
    }

    // ==========================================================================
    // CORE GAME LOGIC
    // ==========================================================================

    /**
     * Handle player position/state update
     */
    private handlePlayerUpdate(playerId: string, connection: PlayerConnection, data: any): void {
        // Bounds check and clamp coordinates
        if (typeof data.x === 'number') {
            connection.x = Math.max(-this.MAX_COORDINATE, Math.min(this.MAX_COORDINATE, data.x));
        }
        if (typeof data.y === 'number') {
            connection.y = Math.max(-this.MAX_COORDINATE, Math.min(this.MAX_COORDINATE, data.y));
        }
        
        // Debug log position updates occasionally
        if (Math.random() < 0.01) {
            console.log(`📍 Player ${playerId.substring(0,15)} position: (${Math.round(connection.x)}, ${Math.round(connection.y)})`);
        }

        // Validate and sanitize player name
        if (typeof data.name === 'string') {
            const sanitized = data.name.trim().substring(0, SHARED_CONFIG.MAX_PLAYER_NAME);
            if (sanitized.length > 0) {
                connection.playerName = sanitized;
            }
        }

        if (typeof data.hue === 'number') {
            connection.color = Math.max(0, Math.min(360, data.hue));
        }

        // Handle realm change
        if (data.realmChange && data.realm !== connection.realm) {
            const validRealms = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];
            if (!validRealms.includes(data.realm)) return;

            const oldRealm = connection.realm;

            // Remove from old realm
            const oldRealmConnections = this.realms.get(oldRealm);
            if (oldRealmConnections) {
                oldRealmConnections.delete(playerId);
            }

            // Add to new realm
            connection.realm = data.realm;
            const newRealmConnections = this.realms.get(data.realm);
            if (newRealmConnections) {
                newRealmConnections.set(playerId, connection);
            }

            // Notify realms
            this.broadcastToRealm(oldRealm, {
                type: 'player_leave',
                data: { playerId },
                timestamp: Date.now()
            }, playerId);

            this.broadcastToRealm(data.realm, {
                type: 'player_joined',
                data: { playerId },
                timestamp: Date.now()
            }, playerId);

            // Send initial state for new realm
            this.sendInitialWorldState(connection);
        }
    }

    /**
     * Handle fragment collection request from client
     */
    private handleCollectFragment(connection: PlayerConnection, data: any): void {
        const { fragmentId } = data;
        if (!fragmentId || typeof fragmentId !== 'string') {
            return;
        }

        const realm = connection.realm;
        const realmFragments = this.fragments.get(realm);
        if (!realmFragments) return;

        const fragment = realmFragments.get(fragmentId);
        if (!fragment) {
            // Fragment doesn't exist or already collected
            return;
        }

        // Validate distance - player must be within collect radius
        const dx = connection.x - fragment.x;
        const dy = connection.y - fragment.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.FRAGMENT_COLLECT_RADIUS * 1.5) {
            // Too far - possible cheat attempt, ignore
            return;
        }

        // Remove fragment from realm
        realmFragments.delete(fragmentId);

        // Award XP to player
        const xpReward = fragment.isGolden ? this.XP_GOLDEN_FRAGMENT_COLLECT : this.XP_FRAGMENT_COLLECT;
        connection.xp += xpReward;

        // Notify the collecting player
        this.send(connection.ws, {
            type: 'fragment_collected',
            data: {
                fragmentId,
                value: fragment.value,
                isGolden: fragment.isGolden,
                xpGained: xpReward,
                totalXp: connection.xp
            },
            timestamp: Date.now()
        });

        // Broadcast to realm that fragment was collected (so others remove it)
        this.broadcastToRealm(realm, {
            type: 'fragment_removed',
            data: { fragmentId },
            timestamp: Date.now()
        }, connection.playerId);
    }

    /**
     * Server game tick - runs at 20Hz
     */
    private serverGameTick(): void {
        const now = Date.now();

        // Update bots
        for (const bot of this.bots.values()) {
            const realmConnections = this.realms.get(bot.realm) || new Map();
            bot.update(realmConnections);
        }

        // Ensure minimum population
        this.ensureMinimumPopulation();

        // Clean up expired echoes
        for (const [id, echo] of this.echoes) {
            if (echo.expiresAt < now) {
                this.echoes.delete(id);
            }
        }

        // Clean up expired power-ups
        PowerUpHandlers.cleanupExpiredPowerUps(this.handlerContext);

        // Spawn fragments periodically in realms with players
        for (const [realmName, realmConnections] of this.realms) {
            if (realmConnections.size > 0) {
                const lastSpawn = this.lastFragmentSpawn.get(realmName) || 0;
                if (now - lastSpawn > this.FRAGMENT_SPAWN_INTERVAL) {
                    const newFragment = this.spawnFragment(realmName);
                    if (newFragment) {
                        // Broadcast new fragment to realm
                        this.broadcastToRealm(realmName, {
                            type: 'fragment_spawned',
                            data: {
                                id: newFragment.id,
                                x: Math.round(newFragment.x),
                                y: Math.round(newFragment.y),
                                isGolden: newFragment.isGolden,
                                value: newFragment.value,
                                phase: newFragment.phase
                            },
                            timestamp: now
                        });
                    }
                    this.lastFragmentSpawn.set(realmName, now);
                }
            }
        }

        // Detect constellations every 2 seconds (tick counter)
        if (now % 2000 < this.GAME_TICK_RATE) {
            for (const realmName of this.realms.keys()) {
                this.detectConstellations(realmName);
            }
        }

        // Broadcast world state to each realm
        for (const [realmName, realmConnections] of this.realms) {
            if (realmConnections.size > 0) {
                this.broadcastWorldState(realmName);
            }
        }
    }

    // Constellation detection state
    private lastConstellationDetection: Map<string, number> = new Map();
    private readonly CONSTELLATION_COOLDOWN = 30000; // 30 seconds between same constellation rewards

    /**
     * Detect constellation patterns formed by nearby players
     */
    private detectConstellations(realm: string): void {
        const realmConnections = this.realms.get(realm);
        if (!realmConnections || realmConnections.size < 3) return;

        const players = Array.from(realmConnections.values()).filter(c => !c.isBot);
        if (players.length < 3) return;

        // Check for triangle constellation (3 players within range of each other)
        const CONSTELLATION_RANGE = 300;
        const XP_BONUSES = {
            triangle: 25,
            square: 50,
            star: 100,
            galaxy: 200
        };

        // Find clusters of players
        for (let i = 0; i < players.length; i++) {
            const p1 = players[i];
            const nearbyPlayers: PlayerConnection[] = [p1];

            for (let j = 0; j < players.length; j++) {
                if (i === j) continue;
                const p2 = players[j];
                const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (dist <= CONSTELLATION_RANGE) {
                    nearbyPlayers.push(p2);
                }
            }

            // Determine constellation type based on cluster size
            let constellationType: 'triangle' | 'square' | 'star' | 'galaxy' | null = null;
            if (nearbyPlayers.length >= 7) {
                constellationType = 'galaxy';
            } else if (nearbyPlayers.length >= 5) {
                constellationType = 'star';
            } else if (nearbyPlayers.length >= 4) {
                constellationType = 'square';
            } else if (nearbyPlayers.length >= 3) {
                constellationType = 'triangle';
            }

            if (constellationType) {
                // Check cooldown for this constellation (based on sorted player IDs)
                const participantIds = nearbyPlayers.map(p => p.playerId).sort();
                const constellationKey = `${realm}:${participantIds.join(',')}`;
                const lastDetected = this.lastConstellationDetection.get(constellationKey) || 0;

                if (Date.now() - lastDetected < this.CONSTELLATION_COOLDOWN) {
                    continue; // Skip, recently awarded
                }

                this.lastConstellationDetection.set(constellationKey, Date.now());

                // Award XP to all participants
                const xpBonus = XP_BONUSES[constellationType];
                for (const player of nearbyPlayers) {
                    player.xp += xpBonus;

                    // Notify player
                    this.send(player.ws, {
                        type: 'constellation_formed',
                        data: {
                            constellationType,
                            xpBonus,
                            participants: participantIds,
                            participantCount: nearbyPlayers.length
                        },
                        timestamp: Date.now()
                    });
                }

                // Broadcast constellation event to realm
                this.broadcastToRealm(realm, {
                    type: 'constellation_visible',
                    data: {
                        constellationType,
                        centerX: nearbyPlayers.reduce((sum, p) => sum + p.x, 0) / nearbyPlayers.length,
                        centerY: nearbyPlayers.reduce((sum, p) => sum + p.y, 0) / nearbyPlayers.length,
                        participantCount: nearbyPlayers.length
                    },
                    timestamp: Date.now()
                });

                // Only detect one constellation per tick to avoid duplicates
                return;
            }
        }
    }

    /**
     * Broadcast world state to a realm
     */
    private broadcastWorldState(realm: string): void {
        const realmConnections = this.realms.get(realm);
        if (!realmConnections) return;

        // Gather player states
        const players: any[] = [];
        for (const conn of realmConnections.values()) {
            players.push({
                id: conn.playerId,
                name: conn.playerName,
                x: Math.round(conn.x),
                y: Math.round(conn.y),
                hue: conn.color,
                xp: conn.xp,
                level: conn.level,
                isBot: conn.isBot
            });
        }
        
        // Debug log if multiple players
        if (players.length > 1 && Math.random() < 0.02) {
            console.log(`🌐 Broadcasting to ${realm}: ${players.length} players`, players.map(p => `${p.id.substring(0,12)}@(${p.x},${p.y})`));
        }

        // Gather bot states in this realm
        const bots: any[] = [];
        for (const bot of this.bots.values()) {
            if (bot.realm === realm) {
                bots.push(bot.toPlayerData());
            }
        }

        // Gather echoes
        const echoes = Array.from(this.echoes.values())
            .filter(e => e.expiresAt > Date.now());

        // Gather fragments for this realm
        const realmFragments = this.fragments.get(realm);
        const fragmentsArray = realmFragments 
            ? Array.from(realmFragments.values()).map(f => ({
                id: f.id,
                x: Math.round(f.x),
                y: Math.round(f.y),
                isGolden: f.isGolden,
                value: f.value,
                phase: f.phase
            }))
            : [];

        const worldState = {
            type: 'world_state',
            data: {
                players,
                bots,
                echoes,
                fragments: fragmentsArray,
                litStars: Array.from(this.litStars),
                serverTime: Date.now()
            },
            timestamp: Date.now()
        };

        // Send to all players in realm
        for (const conn of realmConnections.values()) {
            if (conn.ws.readyState === WebSocket.OPEN) {
                this.send(conn.ws, worldState);
            }
        }
    }

    // ==========================================================================
    // UTILITY METHODS
    // ==========================================================================

    /**
     * Send message to a WebSocket
     */
    private send(ws: WebSocket, message: any): void {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    }

    /**
     * Send error message to connection
     */
    private sendError(connection: PlayerConnection, error: string): void {
        this.send(connection.ws, {
            type: 'error',
            data: { message: error },
            timestamp: Date.now()
        });
    }

    /**
     * Broadcast message to all connected clients
     */
    private broadcast(message: any, excludePlayerId?: string): void {
        for (const connection of this.connections.values()) {
            if (connection.playerId !== excludePlayerId) {
                this.send(connection.ws, message);
            }
        }
    }

    /**
     * Broadcast message to all players in a realm
     */
    private broadcastToRealm(realm: string, message: any, excludePlayerId?: string): void {
        const realmConnections = this.realms.get(realm);
        if (!realmConnections) return;

        for (const connection of realmConnections.values()) {
            if (connection.playerId !== excludePlayerId) {
                this.send(connection.ws, message);
            }
        }
    }

    /**
     * Broadcast to tag session participants
     */
    private broadcastToTagSession(sessionId: string, message: any): void {
        // Get session participants from tag game service
        const session = tagGameService.getSession(sessionId);
        if (!session) return;

        for (const playerId of Array.from(session.players.keys())) {
            const connection = this.connections.get(playerId);
            if (connection) {
                this.send(connection.ws, message);
            }
        }
    }

    /**
     * Check if player is rate limited
     */
    private isRateLimited(playerId: string): boolean {
        const now = Date.now();
        let limit = this.messageRateLimits.get(playerId);

        if (!limit || now - limit.windowStart > this.MESSAGE_RATE_WINDOW) {
            this.messageRateLimits.set(playerId, { count: 1, windowStart: now });
            return false;
        }

        limit.count++;
        return limit.count > this.MESSAGE_RATE_LIMIT;
    }

    /**
     * Get players near a bot for AI decisions
     */
    private getPlayersNearBot(bot: ServerBot): any {
        const nearby: any[] = [];
        const realmConnections = this.realms.get(bot.realm);

        if (realmConnections) {
            for (const conn of realmConnections.values()) {
                const dx = conn.x - bot.x;
                const dy = conn.y - bot.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 500) {
                    nearby.push({ ...conn, distance });
                }
            }
        }

        return {
            count: nearby.length,
            closest: nearby.sort((a, b) => a.distance - b.distance)[0] || null
        };
    }

    /**
     * Ensure minimum population with bots
     */
    private ensureMinimumPopulation(): void {
        for (const [realmName, realmConnections] of this.realms) {
            const botsInRealm = Array.from(this.bots.values()).filter(b => b.realm === realmName).length;
            const totalPopulation = realmConnections.size + botsInRealm;
            const botsNeeded = this.MIN_POPULATION - totalPopulation;

            for (let i = 0; i < botsNeeded; i++) {
                this.spawnBot(realmName);
            }
        }
    }

    /**
     * Spawn a bot in a realm
     */
    private spawnBot(realm: string): void {
        // Random spawn position within realm bounds
        const x = Math.random() * 2000 - 1000;
        const y = Math.random() * 2000 - 1000;
        const bot = new ServerBot(x, y, realm);
        this.bots.set(bot.id, bot);
    }

    /**
     * Extract player ID from request
     */
    private extractPlayerId(req: IncomingMessage): string | null {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        return url.searchParams.get('playerId');
    }

    /**
     * Extract realm from request
     */
    private extractRealm(req: IncomingMessage): string | null {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        return url.searchParams.get('realm');
    }

    /**
     * Generate unique player ID
     */
    private generatePlayerId(): string {
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ==========================================================================
    // DATA PERSISTENCE
    // ==========================================================================

    /**
     * Send initial world state to new connection
     */
    private sendInitialWorldState(connection: PlayerConnection): void {
        const realmConnections = this.realms.get(connection.realm);

        // Current players in realm
        const players: any[] = [];
        if (realmConnections) {
            for (const conn of realmConnections.values()) {
                if (conn.playerId !== connection.playerId) {
                    players.push({
                        id: conn.playerId,
                        name: conn.playerName,
                        x: conn.x,
                        y: conn.y,
                        hue: conn.color,
                        xp: conn.xp,
                        level: conn.level
                    });
                }
            }
        }

        // Bots in realm
        const bots = Array.from(this.bots.values())
            .filter(b => b.realm === connection.realm)
            .map(b => b.toPlayerData());

        // Echoes
        const echoes = Array.from(this.echoes.values())
            .filter(e => e.expiresAt > Date.now());

        this.send(connection.ws, {
            type: 'initial_state',
            data: {
                playerId: connection.playerId,
                realm: connection.realm,
                players,
                bots,
                echoes,
                litStars: Array.from(this.litStars),
                serverTime: Date.now()
            },
            timestamp: Date.now()
        });
    }

    /**
     * Load player data from database
     */
    private async loadPlayerData(connection: PlayerConnection): Promise<void> {
        try {
            const data = await playerDataService.getPlayerData(connection.playerId);
            if (data) {
                connection.xp = data.xp || 0;
                connection.level = getLevel(connection.xp);
                connection.playerName = data.name || connection.playerName;
                connection.color = data.hue || connection.color;
            }
        } catch (error) {
            console.error('Failed to load player data:', error);
        }
    }

    /**
     * Save player data to database
     */
    private async savePlayerData(connection: PlayerConnection): Promise<void> {
        try {
            await playerDataService.updatePlayerData(connection.playerId, {
                name: connection.playerName,
                xp: connection.xp,
                hue: connection.color,
                lastSeen: new Date()
            } as any);
        } catch (error) {
            console.error('Failed to save player data:', error);
        }
    }

    /**
     * Save all dirty players
     */
    private async saveDirtyPlayers(): Promise<void> {
        for (const connection of this.connections.values()) {
            await this.savePlayerData(connection);
        }
    }

    /**
     * Load persisted data on startup
     */
    private async loadPersistedData(): Promise<void> {
        try {
            // Load any persisted world state if needed
            console.log('📥 Loading persisted data...');
        } catch (error) {
            console.error('Failed to load persisted data:', error);
        }
    }

    /**
     * Cleanup stale connections
     */
    private cleanupStaleConnections(): void {
        const now = Date.now();

        for (const [playerId, connection] of this.connections) {
            if (now - connection.lastSeen > this.PLAYER_TIMEOUT) {
                console.log(`⏰ Cleaning up stale connection: ${playerId}`);
                connection.ws.close();
                this.handleDisconnect(playerId);
            }
        }
    }

    /**
     * Shutdown handler
     */
    shutdown(): void {
        console.log('🔌 Shutting down WebSocket server...');

        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
        if (this.saveInterval) clearInterval(this.saveInterval);

        // Save all player data
        this.saveDirtyPlayers();

        // Close all connections
        for (const connection of this.connections.values()) {
            connection.ws.close();
        }

        if (this.wss) {
            this.wss.close();
        }
    }

    // Getter for external access
    get players(): Map<string, PlayerConnection> {
        return this.connections;
    }

    // ==========================================================================
    // PHASE 1 HANDLERS
    // ==========================================================================

    /**
     * Set up Phase 1 handlers for a new connection
     */
    private setupPhase1Handlers(playerId: string, ws: WebSocket): void {
        const broadcast = (message: any, excludeWs?: WebSocket) => {
            this.broadcastToAll(message, excludeWs);
        };

        this.seasonHandlers.set(playerId, setupSeasonHandlers(ws, broadcast));
        this.galleryHandlers.set(playerId, setupGalleryHandlers(ws, broadcast));
        this.dailyLoginHandlers.set(playerId, setupDailyLoginHandlers(ws, broadcast));
        this.constellationHandlers.set(playerId, setupConstellationHandlers(ws, broadcast));
        this.activityHandlers.set(playerId, setupActivityFeedHandlers(ws, broadcast));
    }

    /**
     * Handle season-related messages
     */
    private handleSeasonMessage(connection: PlayerConnection, message: any): void {
        const handler = this.seasonHandlers.get(connection.playerId);
        if (handler) {
            handler.handleSeasonMessage({
                type: message.type,
                playerId: connection.playerId,
                ...message.data
            });
        }
    }

    /**
     * Handle gallery-related messages
     */
    private handleGalleryMessage(connection: PlayerConnection, message: any): void {
        const handler = this.galleryHandlers.get(connection.playerId);
        if (handler) {
            handler.handleGalleryMessage({
                type: message.type,
                playerId: connection.playerId,
                playerName: connection.playerName,
                ...message.data
            });
        }
    }

    /**
     * Handle daily login messages
     */
    private handleDailyLoginMessage(connection: PlayerConnection, message: any): void {
        const handler = this.dailyLoginHandlers.get(connection.playerId);
        if (handler) {
            handler.handleDailyLoginMessage({
                type: message.type,
                playerId: connection.playerId
            });
        }
    }

    /**
     * Handle constellation messages
     */
    private handleConstellationMessage(connection: PlayerConnection, message: any): void {
        const handler = this.constellationHandlers.get(connection.playerId);
        if (handler) {
            handler.handleConstellationMessage({
                type: message.type,
                playerId: connection.playerId,
                ...message.data
            });
        }
    }

    /**
     * Handle activity feed messages
     */
    private handleActivityMessage(connection: PlayerConnection, message: any): void {
        const handler = this.activityHandlers.get(connection.playerId);
        if (handler) {
            handler.handleActivityMessage({
                type: message.type,
                playerId: connection.playerId,
                playerName: connection.playerName,
                ...message.data
            });
        }
    }

    /**
     * Broadcast to all connected players
     */
    private broadcastToAll(message: any, excludeWs?: WebSocket): void {
        const data = JSON.stringify(message);
        for (const connection of this.connections.values()) {
            if (connection.ws !== excludeWs && connection.ws.readyState === 1) {
                connection.ws.send(data);
            }
        }
    }

    /**
     * Send message to a specific player
     */
    private sendToPlayer(playerId: string, message: any): void {
        const connection = this.connections.get(playerId);
        if (connection && connection.ws.readyState === 1) {
            connection.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Get friend IDs for a player (for activity feed)
     */
    private async getPlayerFriends(playerId: string): Promise<string[]> {
        try {
            const friends = await friendshipService.getFriends(playerId);
            return friends.map((f: any) => f.friendId || f.playerId);
        } catch (error) {
            return [];
        }
    }
}

export const websocketHandler = new WebSocketHandler();

/**
 * Setup WebSocket server and attach to HTTP server
 */
export function setupWebSocket(server: import('http').Server): WebSocketHandler {
    websocketHandler.init(server);
    return websocketHandler;
}
