import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupWebSocket } from './websocket/WebSocketHandler';
import { mongoPersistence } from './services/MongoPersistenceService';
import { progressionService } from './services/ProgressionService';
import { playerDataService } from './services/PlayerDataService';
import { reputationService } from './services/ReputationService';
import { referralService } from './services/ReferralService';
import { mentorshipService } from './services/MentorshipService';
import { economyService } from './services/EconomyService';
import { friendshipService } from './services/FriendshipService';
import { leaderboardService } from './services/LeaderboardService';
import { companionService } from './services/CompanionService';
import { questService } from './services/QuestService';
import { achievementService } from './services/AchievementService';
import { analyticsService } from './services/AnalyticsService';
import { worldEventsService } from './services/WorldEventsService';
import { darknessService } from './services/DarknessService';
import { powerUpService } from './services/PowerUpService';
import { tagGameService } from './services/TagGameService';
import { notificationService } from './services/NotificationService';
import { activityTrackingService } from './services/ActivityTrackingService';
import { beaconService } from './services/BeaconService';
import { explorationService } from './services/ExplorationService';
import { mysteryBoxService } from './services/MysteryBoxService';
import { cosmeticsService } from './services/CosmeticsService';
import { anchoringService } from './services/AnchoringService';
import { voiceChannelService } from './services/VoiceChannelService';
import { signalsService } from './services/SignalsService';
import { realmStatsService } from './services/RealmStatsService';
// NEW Phase 1 Services
import { seasonPassService } from './services/SeasonPassService';
import { dailyLoginService } from './services/DailyLoginService';
import { galleryService } from './services/GalleryService';
import { constellationService } from './services/ConstellationService';
import { activityFeedService } from './services/ActivityFeedService';
// NEW Phase 2 Services (Backend Completeness)
import { leaderboardResetService } from './services/LeaderboardResetService';
import { pulsePatternService } from './services/PulsePatternService';
import { warmthService } from './services/WarmthService';
import { worldEventSchedulerService } from './services/WorldEventSchedulerService';
// NEW Phase 3 Services (Game Modes & Media)
import { seekModeService } from './services/SeekModeService';
import { mediaStorageService } from './services/MediaStorageService';
import { gameModeAnalyticsService } from './services/GameModeAnalyticsService';
// NEW Phase 4 Services (Backend Completeness - Guilds, Gifts)
import { guildService } from './services/GuildService';
import { giftStreakService } from './services/GiftStreakService';
import progressionRoutes from './routes/progressionRoutes';
import playerDataRoutes from './routes/playerDataRoutes';
import socialRoutes from './routes/socialRoutes';
import gameRoutes from './routes/gameRoutes';
import economyRoutes from './routes/economyRoutes';
import mindfulnessRoutes from './routes/mindfulnessRoutes';
import voiceRoutes from './routes/voiceRoutes';
import signalsRoutes from './routes/signalsRoutes';
import realmRoutes from './routes/realmRoutes';
import beaconRoutes from './routes/beaconRoutes';
import explorationRoutes from './routes/explorationRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import adminRoutes from './routes/adminRoutes';
// NEW Phase 1 Routes
import seasonRoutes from './routes/seasonRoutes';
import galleryRoutes from './routes/galleryRoutes';
import dailyRoutes from './routes/dailyRoutes';
import constellationRoutes from './routes/constellationRoutes';
import activityRoutes from './routes/activityRoutes';
// NEW Phase 3 Routes
import mediaRoutes from './routes/mediaRoutes';
// NEW Phase 4 Routes (Backend Completeness - Guilds, Gifts)
import guildRoutes from './routes/guildRoutes';
import giftRoutes from './routes/giftRoutes';
import { z } from 'zod';
import {
    CreateEchoSchema,
    RealmIdSchema,
    PlayerIdSchema,
    PlayerNameSchema,
    HueSchema,
    CoordinateSchema,
    formatZodError
} from './middleware/validation';
import {
    type BotState,
    createBot,
    updateBot,
    shouldBotSing,
    triggerBotSing
} from './common/bot';

// Generate secure random ID
function generateId(): string {
    return crypto.randomBytes(8).toString('hex');
}

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGODB_DB || 'aura';

// Initialize WebSocket server
// @ts-ignore wsHandler manages WebSocket lifecycle
const wsHandler = setupWebSocket(server);

// CORS configuration - restrict to allowed origins
const allowedOrigins = [
    'https://playrift.no',
    'https://www.playrift.no',
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000'   // Local testing
];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check allowed exact origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow local network IPs (IPv4)
        // Matches 192.168.x.x, 10.x.x.x, 172.16-31.x.x
        const localIpRegex = /^(http|https):\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/;
        if (localIpRegex.test(origin)) {
            return callback(null, true);
        }

        // Unknown origins: don't set CORS headers (browser blocks), but no 500 error
        return callback(null, false);
    },
    credentials: true
};

// Rate limiting - prevent spam and DoS
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

const postLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 POST requests per minute
    message: { error: 'Too many requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' })); // Limit body size to 10KB
app.use(express.json({ limit: '10kb' })); // Limit body size to 10KB
app.use(generalLimiter);

// Serve static files in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if public folder exists (production)
// Or serves from ../dist (if running locally with separate build)
const staticPath = path.join(__dirname, 'public');
app.use(express.static(staticPath));

// In-memory state
interface PlayerState {
    id: string;
    name: string;
    x: number;
    y: number;
    realm: string;
    hue: number;
    xp: number;
    lastSeen: number;
    // Transient visual states
    singing?: number;
    pulsing?: number;
    emoting?: string | null;
    isBot?: boolean;
}

// @ts-ignore Echo interface used for type reference
interface Echo {
    id: string;
    x: number;
    y: number;
    text: string;
    hue: number;
    name: string;
    realm: string;
    timestamp: number;
}

const players = new Map<string, PlayerState>();
const litStars = new Set<string>(); // In-memory cache, synced with MongoDB

// Flag to track MongoDB availability
let mongoConnected = false;

// Bot Logic - Using shared implementation from common/bot.ts
const bots: BotState[] = [];
const MIN_POPULATION = 3;

// Helper to convert BotState to PlayerState for HTTP API
function botToPlayerState(bot: BotState): PlayerState {
    return {
        id: bot.id,
        name: bot.name,
        x: bot.x,
        y: bot.y,
        realm: bot.realm,
        hue: bot.hue,
        xp: bot.xp,
        lastSeen: Date.now(),
        isBot: true,
        singing: bot.singing,
        pulsing: bot.pulsing,
        emoting: bot.emoting
    };
}

// Server loop for bots (20Hz)
setInterval(() => {
    // Manage population
    if (players.size + bots.length < MIN_POPULATION) {
        if (Math.random() < 0.01) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 500 + Math.random() * 500;
            bots.push(createBot(Math.cos(angle) * dist, Math.sin(angle) * dist));
        }
    } else if (players.size + bots.length > MIN_POPULATION && bots.length > 0) {
        if (Math.random() < 0.005) bots.pop();
    }

    // Update bots using shared logic
    bots.forEach(bot => {
        updateBot(bot);
        if (shouldBotSing(bot)) {
            triggerBotSing(bot);
        }
    });
}, 50);

const PLAYER_TIMEOUT = 10000; // 10 seconds to consider a player offline

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Mount progression routes (challenges, progression, gifts, guilds)
app.use('/api', progressionRoutes);

// Mount player data routes (full player state sync)
app.use('/api', playerDataRoutes);

// Mount social routes (reputation, referral, mentorship, economy, friends)
app.use('/api', socialRoutes);

// Mount game routes (leaderboard, companions, quests, achievements, analytics)
app.use('/api', gameRoutes);

// Mount economy routes (mystery boxes, cosmetics shop)
app.use('/api/economy', economyRoutes);

// Mount mindfulness routes (anchoring, meditation)
app.use('/api/mindfulness', mindfulnessRoutes);

// Mount voice routes (voice channels, rooms)
app.use('/api/voice', voiceRoutes);

// Mount signals routes (player-to-player signaling)
app.use('/api/signals', signalsRoutes);

// Mount realm routes (realm info, statistics, beacons, exploration)
app.use('/api/realms', realmRoutes);

// Mount beacon routes (beacon lighting, charging, protection)
app.use('/api/beacons', beaconRoutes);

// Mount exploration routes (fog of war, POIs, biomes)
app.use('/api/exploration', explorationRoutes);

// Mount feedback routes (bug reports, suggestions, feedback)
app.use('/api/feedback', feedbackRoutes);

// Mount admin routes (analytics aggregation, dashboard)
app.use('/api/admin', adminRoutes);

// NEW Phase 1 Routes
// Mount season pass routes (season progress, rewards, tiers)
app.use('/api/season', seasonRoutes);

// Mount gallery routes (screenshots, albums, sharing)
app.use('/api/gallery', galleryRoutes);

// Mount daily login routes (streaks, rewards)
app.use('/api/daily', dailyRoutes);

// Mount constellation routes (formation, rewards)
app.use('/api/constellations', constellationRoutes);

// Mount activity feed routes (friend activity, notifications)
app.use('/api/activity', activityRoutes);

// NEW Phase 3 Routes
// Mount media routes (recordings, uploads, storage)
app.use('/api/media', mediaRoutes);

// NEW Phase 4 Routes (Backend Completeness)
// Mount guild routes (guild management, chat, contributions)
app.use('/api/guilds', guildRoutes);

// Mount gift routes (gift streaks, milestones, history)
app.use('/api/gifts', giftRoutes);

// Player endpoints
app.get('/api/players', (req, res) => {
    try {
        const realm = req.query.realm as string;
        const now = Date.now();

        // Cleanup stale players
        const toRemove: string[] = [];
        for (const [id, p] of players.entries()) {
            if (now - p.lastSeen > PLAYER_TIMEOUT) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => players.delete(id));

        // Filter by realm
        const activePlayers = Array.from(players.values()).filter(p => {
            if (realm && p.realm !== realm) return false;
            return true;
        });

        // Add bots to valid players list (using helper function)
        const activeBots = bots
            .filter(b => !realm || b.realm === realm)
            .map(b => botToPlayerState(b));

        // Debug logging
        console.log(`📡 GET /api/players - ${activePlayers.length} players, ${activeBots.length} bots in realm: ${realm}`);
        if (activePlayers.length > 0) {
            console.log('   Players:', activePlayers.map(p => `${p.name}(${p.id.slice(0, 10)}) at (${p.x}, ${p.y})`).join(', '));
        }

        res.json([...activePlayers, ...activeBots]);
    } catch (err) {
        console.error('Error in /api/players:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Events endpoint - updates player state from client heartbeats/actions
app.post('/api/events', postLimiter, (req, res) => {
    const event = req.body;

    // Debug logging
    console.log('📨 Event received:', event.type, 'from', event.uid, 'at', event.x?.toFixed(0), event.y?.toFixed(0));

    // Handle star lighting
    if (event.type === 'star_lit' && event.starId) {
        litStars.add(event.starId);

        // Persist to MongoDB if connected
        if (mongoConnected && event.uid) {
            mongoPersistence.litStar(
                event.starId,
                event.realm || 'genesis',
                event.uid
            ).catch(err => console.error('Failed to persist lit star:', err));
        }

        res.json({ success: true });
        return;
    }

    if (event.uid) {
        const existing = players.get(event.uid);
        const p: PlayerState = existing || {
            id: event.uid,
            name: event.name || 'Wanderer',
            x: event.x || 0,
            y: event.y || 0,
            realm: event.realm || 'genesis',
            hue: event.hue || 0,
            xp: event.xp || 0,
            lastSeen: Date.now()
        };

        p.lastSeen = Date.now();
        if (typeof event.x === 'number') p.x = event.x;
        if (typeof event.y === 'number') p.y = event.y;
        if (event.name) p.name = event.name;
        if (event.realm) p.realm = event.realm;
        if (typeof event.hue === 'number') p.hue = event.hue;
        if (typeof event.xp === 'number') p.xp = event.xp;

        // Handle transient actions
        if (typeof event.singing === 'number') p.singing = event.singing;
        if (typeof event.pulsing === 'number') p.pulsing = event.pulsing;
        if (event.type === 'emote' || typeof event.emoting !== 'undefined') {
            if (event.emoji) p.emoting = event.emoji;
            else p.emoting = event.emoting || null;
        }

        // Fallback for one-off events
        if (event.type === 'sing') p.singing = 1;
        if (event.type === 'pulse') p.pulsing = 1;

        players.set(event.uid, p);
    }

    res.json({ success: true });
});

// Lit Stars endpoint - now synced with MongoDB
app.get('/api/stars/lit', async (req, res) => {
    try {
        const realm = req.query.realm as string;

        if (mongoConnected) {
            const stars = await mongoPersistence.getLitStars(realm);
            res.json(stars);
        } else {
            // Fallback to in-memory cache
            if (realm) {
                const filtered = Array.from(litStars).filter(id => id.startsWith(realm + ':'));
                res.json(filtered);
            } else {
                res.json(Array.from(litStars));
            }
        }
    } catch (error) {
        console.error('Error fetching lit stars:', error);
        res.status(500).json({ error: 'Failed to fetch lit stars' });
    }
});

// Echoes endpoint - now using MongoDB
app.get('/api/echoes', async (req, res) => {
    try {
        const realm = req.query.realm as string;

        if (mongoConnected) {
            const echoes = realm
                ? await mongoPersistence.getEchoes(realm)
                : await mongoPersistence.getEchoes('genesis'); // Default realm
            res.json(echoes);
        } else {
            // Fallback: return empty array if MongoDB not connected
            res.json([]);
        }
    } catch (error) {
        console.error('Error fetching echoes:', error);
        res.status(500).json({ error: 'Failed to fetch echoes' });
    }
});

app.post('/api/echoes', postLimiter, async (req, res) => {
    try {
        // Validate input
        const parseResult = CreateEchoSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: formatZodError(parseResult.error)
            });
        }

        const echoData = parseResult.data;
        const echoId = generateId();

        const newEcho = {
            id: echoId,
            x: echoData.x,
            y: echoData.y,
            text: echoData.text,
            hue: echoData.hue,
            name: echoData.name,
            realm: echoData.realm,
            timestamp: Date.now(),
            authorId: req.body.authorId || req.body.uid || 'anonymous'
        };

        if (mongoConnected) {
            await mongoPersistence.createEcho(newEcho);
        }

        res.json({ success: true, id: echoId });
    } catch (error) {
        console.error('Error creating echo:', error);
        res.status(500).json({ error: 'Failed to create echo' });
    }
});

// Vote on an echo
app.post('/api/echoes/:echoId/vote', postLimiter, async (req, res) => {
    try {
        const { echoId } = req.params;
        const { delta } = req.body; // +1 for upvote, -1 for downvote

        if (!mongoConnected) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const newVotes = await mongoPersistence.voteEcho(echoId, delta || 1);
        res.json({ success: true, votes: newVotes });
    } catch (error) {
        console.error('Error voting on echo:', error);
        res.status(500).json({ error: 'Failed to vote on echo' });
    }
});

// Get echoes near a position
app.get('/api/echoes/near', async (req, res) => {
    try {
        const { realm, x, y, radius } = req.query;

        if (!mongoConnected) {
            return res.json([]);
        }

        const echoes = await mongoPersistence.getEchoesNear(
            realm as string || 'genesis',
            parseFloat(x as string) || 0,
            parseFloat(y as string) || 0,
            parseFloat(radius as string) || 1000
        );
        res.json(echoes);
    } catch (error) {
        console.error('Error fetching nearby echoes:', error);
        res.status(500).json({ error: 'Failed to fetch nearby echoes' });
    }
});

// Messages/Whispers endpoints - Validation schema
const CreateMessageSchema = z.object({
    fromId: PlayerIdSchema.optional(),
    uid: PlayerIdSchema.optional(),
    fromName: PlayerNameSchema.optional(),
    name: PlayerNameSchema.optional(),
    toId: PlayerIdSchema.optional(),
    target: PlayerIdSchema.optional(),
    toName: PlayerNameSchema.optional(),
    text: z.string().min(1).max(500),
    x: CoordinateSchema.optional().default(0),
    y: CoordinateSchema.optional().default(0),
    realm: RealmIdSchema.optional().default('genesis'),
    type: z.enum(['whisper', 'broadcast', 'system']).optional().default('whisper')
});

app.post('/api/messages', postLimiter, async (req, res) => {
    try {
        // Validate input
        const parseResult = CreateMessageSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: formatZodError(parseResult.error)
            });
        }

        const msgData = parseResult.data;
        const messageId = generateId();

        const newMessage = {
            id: messageId,
            fromId: msgData.fromId || msgData.uid || 'anonymous',
            fromName: msgData.fromName || msgData.name || 'Anonymous',
            toId: msgData.toId || msgData.target,
            toName: msgData.toName,
            text: msgData.text,
            x: msgData.x,
            y: msgData.y,
            realm: msgData.realm,
            type: msgData.type,
            timestamp: Date.now()
        };

        if (mongoConnected) {
            await mongoPersistence.saveMessage(newMessage);
        }

        res.json({ success: true, id: messageId });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// Get message history for a player
app.get('/api/messages/history/:playerId', async (req, res) => {
    try {
        const { playerId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        if (!mongoConnected) {
            return res.json([]);
        }

        const messages = await mongoPersistence.getMessageHistory(playerId, limit);
        res.json(messages);
    } catch (error) {
        console.error('Error fetching message history:', error);
        res.status(500).json({ error: 'Failed to fetch message history' });
    }
});

// Get conversation between two players
app.get('/api/messages/conversation', async (req, res) => {
    try {
        const { player1, player2, limit } = req.query;

        if (!mongoConnected || !player1 || !player2) {
            return res.json([]);
        }

        const messages = await mongoPersistence.getConversation(
            player1 as string,
            player2 as string,
            parseInt(limit as string) || 50
        );
        res.json(messages);
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

// Player data endpoints
app.get('/api/player/:playerId', async (req, res) => {
    try {
        const { playerId } = req.params;

        if (!mongoConnected) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const player = await mongoPersistence.getOrCreatePlayer(playerId);
        res.json(player);
    } catch (error) {
        console.error('Error fetching player:', error);
        res.status(500).json({ error: 'Failed to fetch player' });
    }
});

app.put('/api/player/:playerId', async (req, res) => {
    try {
        const { playerId } = req.params;
        const updates = req.body;

        if (!mongoConnected) {
            return res.status(503).json({ error: 'Database not available' });
        }

        await mongoPersistence.updatePlayer(playerId, updates);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ error: 'Failed to update player' });
    }
});

// Increment player stats
app.post('/api/player/:playerId/stats', postLimiter, async (req, res) => {
    try {
        const { playerId } = req.params;
        const stats = req.body;

        if (!mongoConnected) {
            return res.status(503).json({ error: 'Database not available' });
        }

        await mongoPersistence.incrementPlayerStats(playerId, stats);
        res.json({ success: true });
    } catch (error) {
        console.error('Error incrementing stats:', error);
        res.status(500).json({ error: 'Failed to increment stats' });
    }
});

// Add achievement
app.post('/api/player/:playerId/achievement', postLimiter, async (req, res) => {
    try {
        const { playerId } = req.params;
        const { achievementId } = req.body;

        if (!mongoConnected) {
            return res.status(503).json({ error: 'Database not available' });
        }

        await mongoPersistence.addAchievement(playerId, achievementId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding achievement:', error);
        res.status(500).json({ error: 'Failed to add achievement' });
    }
});

// Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const sortBy = (req.query.sortBy as 'xp' | 'stars' | 'echoesCreated') || 'xp';
        const limit = parseInt(req.query.limit as string) || 10;

        if (!mongoConnected) {
            return res.json([]);
        }

        const leaderboard = await mongoPersistence.getLeaderboard(sortBy, limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Echo stats
app.get('/api/stats/echoes', async (_req, res) => {
    try {
        if (!mongoConnected) {
            return res.json({});
        }

        const stats = await mongoPersistence.getEchoStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching echo stats:', error);
        res.status(500).json({ error: 'Failed to fetch echo stats' });
    }
});

// Admin Stats Endpoint
app.get('/api/admin/stats', async (req, res) => {
    try {
        const apiKey = req.headers['x-admin-key'];
        const validKey = process.env.ADMIN_SECRET || 'Abcd1234';

        if (apiKey !== validKey) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!mongoConnected) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const stats = await mongoPersistence.getGlobalStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

// Database status endpoint
app.get('/api/db/status', (_req, res) => {
    res.json({
        connected: mongoConnected,
        type: 'mongodb'
    });
});

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// SPA Fallback - Serve index.html for unknown routes (frontend routing)
app.get('*', (_req, res) => {
    // Only serve index.html if it exists, otherwise 404 (or API 404s handled above?)
    // Actually API routes are matched first.
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Initialize MongoDB and start server
async function startServer() {
    // Try to connect to MongoDB
    try {
        console.log('🔌 Attempting MongoDB connection...');
        await mongoPersistence.init(MONGO_URI, MONGO_DB);
        mongoConnected = true;
        console.log('✅ MongoDB connected - persistence enabled');

        // Initialize progression service
        await progressionService.init();
        console.log('📊 Progression service initialized');

        // Initialize player data service
        await playerDataService.init();
        console.log('👤 PlayerData service initialized');

        // Initialize social services
        await Promise.all([
            reputationService.init(),
            referralService.init(),
            mentorshipService.init(),
            economyService.init(),
            friendshipService.init()
        ]);
        console.log('🤝 Social services initialized (reputation, referral, mentorship, economy, friendship)');

        // Initialize game services
        await Promise.all([
            leaderboardService.init(),
            companionService.init(),
            questService.init(),
            achievementService.init(),
            analyticsService.init()
        ]);
        console.log('🎮 Game services initialized (leaderboard, companions, quests, achievements, analytics)');

        // Initialize world/event services
        await Promise.all([
            worldEventsService.initialize(),
            darknessService.initialize(),
            powerUpService.initialize(),
            tagGameService.initialize(),
            notificationService.initialize(),
            activityTrackingService.initialize()
        ]);
        console.log('🌍 World services initialized (events, darkness, power-ups, tag game, notifications, activity tracking)');

        // Initialize new feature services
        await Promise.all([
            beaconService.initialize(),
            explorationService.initialize(),
            mysteryBoxService.initialize(),
            cosmeticsService.initialize(),
            anchoringService.initialize(),
            voiceChannelService.initialize(),
            signalsService.initialize(),
            realmStatsService.initialize()
        ]);
        console.log('✨ Feature services initialized (beacons, exploration, mystery boxes, cosmetics, anchoring, voice, signals, realms)');

        // Initialize Phase 1 Critical services
        await Promise.all([
            seasonPassService.initialize(),
            dailyLoginService.initialize(),
            galleryService.initialize(),
            constellationService.initialize(),
            activityFeedService.initialize()
        ]);
        console.log('🌟 Phase 1 services initialized (season pass, daily login, gallery, constellations, activity feed)');

        // Initialize Phase 2 Backend Completeness services
        await Promise.all([
            leaderboardResetService.initialize(),
            pulsePatternService.initialize(),
            warmthService.initialize(),
            worldEventSchedulerService.initialize()
        ]);
        console.log('🔧 Phase 2 services initialized (leaderboard reset, pulse patterns, warmth, world events scheduler)');

        // Initialize Phase 3 Game Mode & Media services
        await Promise.all([
            seekModeService.initialize(),
            mediaStorageService.initialize(),
            gameModeAnalyticsService.initialize()
        ]);
        console.log('🎮 Phase 3 services initialized (seek mode, media storage, game mode analytics)');

        // Initialize Phase 4 Backend Completeness services (Guilds, Gifts)
        await Promise.all([
            guildService.initialize(),
            giftStreakService.initialize()
        ]);
        console.log('🏛️ Phase 4 services initialized (guilds, gift streaks)');

        // Load cached lit stars from database
        const cachedStars = await mongoPersistence.getLitStars();
        cachedStars.forEach(starId => litStars.add(starId));
        console.log(`⭐ Loaded ${cachedStars.length} lit stars from database`);

    } catch (error) {
        console.warn('⚠️ MongoDB connection failed - running without persistence');
        console.warn('   Echoes and messages will not be saved');
        console.warn('   Set MONGODB_URI environment variable to enable persistence');
        mongoConnected = false;
    }

    // Start HTTP server
    server.listen(PORT, () => {
        console.log(`🌌 AURA Backend Server running on http://localhost:${PORT}`);
        console.log(`📡 API available at http://localhost:${PORT}/api`);
        console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
        console.log(`💾 Database: ${mongoConnected ? 'MongoDB connected' : 'In-memory only'}`);
    });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    // Shutdown Phase 2 services
    leaderboardResetService.shutdown();
    worldEventSchedulerService.shutdown();
    await warmthService.shutdown();
    // Shutdown Phase 4 services
    await guildService.shutdown();
    await giftStreakService.shutdown();
    if (mongoConnected) {
        await mongoPersistence.shutdown();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    // Shutdown Phase 2 services
    leaderboardResetService.shutdown();
    worldEventSchedulerService.shutdown();
    await warmthService.shutdown();
    // Shutdown Phase 4 services
    await guildService.shutdown();
    await giftStreakService.shutdown();
    if (mongoConnected) {
        await mongoPersistence.shutdown();
    }
    process.exit(0);
});

// Start the server
startServer().catch(console.error);

export default app;
