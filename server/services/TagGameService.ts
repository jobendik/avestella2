// =============================================================================
// TagGameService - Server-Authoritative Tag Game Mode
// =============================================================================
// Manages the spontaneous "Tag" minigame that can occur in any realm.
// Players can tag each other, and being "it" provides bonus XP for tagging others.
//
// Features:
// - Automatic game sessions
// - Tag cooldowns
// - Scoring and leaderboards
// - Chain bonuses
// =============================================================================

import { EventEmitter } from 'events';

export interface TagPlayer {
    playerId: string;
    playerName: string;
    isIt: boolean;
    tagCount: number;          // How many times they tagged others
    wasTaggedCount: number;    // How many times they were tagged
    score: number;
    chainBonus: number;        // Consecutive tag bonus
    lastTagTime: number;       // When they last tagged someone
    lastTaggedTime: number;    // When they were last tagged
    joinedAt: number;
}

export interface TagGameSession {
    id: string;
    realm: string;
    status: 'waiting' | 'active' | 'ending' | 'ended';
    startTime: number;
    endTime: number | null;
    duration: number;          // Planned duration in seconds
    players: Map<string, TagPlayer>;
    currentIt: string | null;  // Player ID of current "it"
    itHistory: string[];       // History of who was "it"
    minPlayers: number;
    maxPlayers: number;
}

export interface TagResult {
    success: boolean;
    message?: string;
    taggerScore?: number;
    taggedScore?: number;
    chainBonus?: number;
}

export interface TagGameConfig {
    minPlayers: number;
    maxPlayers: number;
    gameDuration: number;      // Seconds
    tagCooldown: number;       // Seconds between tags by same player
    tagRange: number;          // Pixels
    itBonusXp: number;         // XP per successful tag
    taggedPenalty: number;     // Score penalty when tagged
    chainBonusMultiplier: number; // Each consecutive tag multiplies by this
    maxChainBonus: number;
}

const DEFAULT_CONFIG: TagGameConfig = {
    minPlayers: 2,
    maxPlayers: 20,
    gameDuration: 180,         // 3 minutes
    tagCooldown: 3,            // 3 seconds
    tagRange: 80,              // Close range
    itBonusXp: 10,
    taggedPenalty: 5,
    chainBonusMultiplier: 1.25,
    maxChainBonus: 4.0
};

export class TagGameService extends EventEmitter {
    private static instance: TagGameService;
    private sessions: Map<string, TagGameSession> = new Map();
    private playerSessions: Map<string, string> = new Map(); // playerId -> sessionId
    private updateInterval: NodeJS.Timeout | null = null;
    private ready = false;

    private config: TagGameConfig = DEFAULT_CONFIG;
    private readonly UPDATE_RATE = 1000;

    // Singleton
    static getInstance(): TagGameService {
        if (!TagGameService.instance) {
            TagGameService.instance = new TagGameService();
        }
        return TagGameService.instance;
    }

    async initialize(config?: Partial<TagGameConfig>): Promise<void> {
        if (this.ready) return;

        if (config) {
            this.config = { ...DEFAULT_CONFIG, ...config };
        }

        // Start update loop
        this.updateInterval = setInterval(() => {
            this.update();
        }, this.UPDATE_RATE);

        this.ready = true;
        console.log('🏷️ TagGameService initialized');
    }

    isReady(): boolean {
        return this.ready;
    }

    /**
     * Main update loop
     */
    private update(): void {
        const now = Date.now();

        for (const [sessionId, session] of this.sessions) {
            if (session.status === 'active' && session.endTime && now >= session.endTime) {
                this.endGame(sessionId);
            } else if (session.status === 'waiting') {
                // Check if enough players to start
                if (session.players.size >= session.minPlayers) {
                    this.startGame(sessionId);
                }
            }
        }
    }

    /**
     * Create a new tag game session
     */
    createSession(realm: string, initiatorId: string, initiatorName: string): TagGameSession | null {
        // Check if there's already an active session in this realm
        const existingSession = Array.from(this.sessions.values())
            .find(s => s.realm === realm && (s.status === 'waiting' || s.status === 'active'));

        if (existingSession) {
            return existingSession; // Return existing session to join
        }

        const now = Date.now();
        const sessionId = `tag-${realm}-${now}`;

        const session: TagGameSession = {
            id: sessionId,
            realm,
            status: 'waiting',
            startTime: 0,
            endTime: null,
            duration: this.config.gameDuration,
            players: new Map(),
            currentIt: null,
            itHistory: [],
            minPlayers: this.config.minPlayers,
            maxPlayers: this.config.maxPlayers
        };

        this.sessions.set(sessionId, session);

        // Add initiator as first player
        this.joinGame(sessionId, initiatorId, initiatorName);

        this.emit('session_created', {
            sessionId,
            realm,
            initiatorId,
            initiatorName,
            minPlayers: session.minPlayers
        });

        console.log(`🏷️ Tag game session created in ${realm} by ${initiatorName}`);

        return session;
    }

    /**
     * Join an existing tag game
     */
    joinGame(sessionId: string, playerId: string, playerName: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        // Check if already in a game
        const existingSession = this.playerSessions.get(playerId);
        if (existingSession && existingSession !== sessionId) {
            this.leaveGame(existingSession, playerId);
        }

        // Check if game is full or already active
        if (session.players.size >= session.maxPlayers) {
            return false;
        }

        const now = Date.now();
        const player: TagPlayer = {
            playerId,
            playerName,
            isIt: false,
            tagCount: 0,
            wasTaggedCount: 0,
            score: 0,
            chainBonus: 1.0,
            lastTagTime: 0,
            lastTaggedTime: 0,
            joinedAt: now
        };

        session.players.set(playerId, player);
        this.playerSessions.set(playerId, sessionId);

        this.emit('player_joined', {
            sessionId,
            playerId,
            playerName,
            playerCount: session.players.size,
            minPlayers: session.minPlayers
        });

        console.log(`🏷️ ${playerName} joined tag game (${session.players.size}/${session.minPlayers} needed)`);

        return true;
    }

    /**
     * Leave a tag game
     */
    leaveGame(sessionId: string, playerId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const player = session.players.get(playerId);
        if (!player) return;

        session.players.delete(playerId);
        this.playerSessions.delete(playerId);

        // If the "it" player left, choose a new "it"
        if (session.currentIt === playerId && session.status === 'active') {
            this.selectNewIt(sessionId);
        }

        this.emit('player_left', {
            sessionId,
            playerId,
            playerName: player.playerName,
            playerCount: session.players.size
        });

        // End game if not enough players
        if (session.status === 'active' && session.players.size < session.minPlayers) {
            this.endGame(sessionId);
        }

        // Clean up empty sessions
        if (session.players.size === 0) {
            this.sessions.delete(sessionId);
        }
    }

    /**
     * Start the tag game
     */
    private startGame(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'waiting') return;

        const now = Date.now();
        session.status = 'active';
        session.startTime = now;
        session.endTime = now + (session.duration * 1000);

        // Select random "it" player
        this.selectNewIt(sessionId, true);

        this.emit('game_started', {
            sessionId,
            realm: session.realm,
            duration: session.duration,
            currentIt: session.currentIt,
            playerCount: session.players.size
        });

        console.log(`🏷️ Tag game started in ${session.realm}!`);
    }

    /**
     * Select a new "it" player
     */
    private selectNewIt(sessionId: string, isInitial: boolean = false): void {
        const session = this.sessions.get(sessionId);
        if (!session || session.players.size === 0) return;

        const players = Array.from(session.players.keys());
        let newIt: string;

        if (isInitial) {
            // Random selection for initial "it"
            newIt = players[Math.floor(Math.random() * players.length)];
        } else {
            // Exclude current "it" and recently tagged players
            const eligiblePlayers = players.filter(p => p !== session.currentIt);
            if (eligiblePlayers.length === 0) {
                newIt = players[0];
            } else {
                newIt = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
            }
        }

        // Clear previous "it"
        if (session.currentIt) {
            const prevIt = session.players.get(session.currentIt);
            if (prevIt) {
                prevIt.isIt = false;
            }
        }

        // Set new "it"
        session.currentIt = newIt;
        const newItPlayer = session.players.get(newIt);
        if (newItPlayer) {
            newItPlayer.isIt = true;
            newItPlayer.chainBonus = 1.0; // Reset chain bonus
            session.itHistory.push(newIt);
        }

        this.emit('it_changed', {
            sessionId,
            newItId: newIt,
            newItName: newItPlayer?.playerName
        });
    }

    /**
     * Attempt to tag another player
     */
    attemptTag(
        sessionId: string, 
        taggerId: string, 
        targetId: string,
        distance: number
    ): TagResult {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'active') {
            return { success: false, message: 'Game not active' };
        }

        // Verify tagger is "it"
        if (session.currentIt !== taggerId) {
            return { success: false, message: 'You are not it!' };
        }

        const tagger = session.players.get(taggerId);
        const target = session.players.get(targetId);

        if (!tagger || !target) {
            return { success: false, message: 'Player not found' };
        }

        // Check distance
        if (distance > this.config.tagRange) {
            return { success: false, message: 'Too far away' };
        }

        // Check cooldown
        const now = Date.now();
        if (now - tagger.lastTagTime < this.config.tagCooldown * 1000) {
            return { success: false, message: 'Tag on cooldown' };
        }

        // Successful tag!
        tagger.lastTagTime = now;
        tagger.tagCount++;
        target.wasTaggedCount++;
        target.lastTaggedTime = now;

        // Calculate scores
        const basePoints = this.config.itBonusXp;
        const chainPoints = Math.floor(basePoints * tagger.chainBonus);
        
        tagger.score += chainPoints;
        target.score = Math.max(0, target.score - this.config.taggedPenalty);

        // Update chain bonus
        tagger.chainBonus = Math.min(
            this.config.maxChainBonus,
            tagger.chainBonus * this.config.chainBonusMultiplier
        );

        // Transfer "it" status
        tagger.isIt = false;
        target.isIt = true;
        target.chainBonus = 1.0; // Reset their chain

        session.currentIt = targetId;
        session.itHistory.push(targetId);

        this.emit('player_tagged', {
            sessionId,
            taggerId,
            taggerName: tagger.playerName,
            targetId,
            targetName: target.playerName,
            taggerScore: tagger.score,
            targetScore: target.score,
            chainBonus: tagger.chainBonus
        });

        console.log(`🏷️ ${tagger.playerName} tagged ${target.playerName}! (+${chainPoints} pts)`);

        return {
            success: true,
            taggerScore: tagger.score,
            taggedScore: target.score,
            chainBonus: tagger.chainBonus
        };
    }

    /**
     * End the tag game
     */
    endGame(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session || session.status === 'ended') return;

        session.status = 'ended';

        // Calculate final standings
        const standings = Array.from(session.players.values())
            .sort((a, b) => b.score - a.score)
            .map((p, i) => ({
                rank: i + 1,
                playerId: p.playerId,
                playerName: p.playerName,
                score: p.score,
                tagCount: p.tagCount,
                wasTaggedCount: p.wasTaggedCount
            }));

        this.emit('game_ended', {
            sessionId,
            realm: session.realm,
            standings,
            duration: session.duration,
            totalTags: session.itHistory.length - 1 // Subtract initial "it" selection
        });

        console.log(`🏷️ Tag game ended in ${session.realm}! Winner: ${standings[0]?.playerName}`);

        // Clean up player session mappings
        for (const playerId of session.players.keys()) {
            this.playerSessions.delete(playerId);
        }

        // Remove session after a delay (for clients to receive results)
        setTimeout(() => {
            this.sessions.delete(sessionId);
        }, 5000);
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): TagGameSession | null {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Get session a player is in
     */
    getPlayerSession(playerId: string): TagGameSession | null {
        const sessionId = this.playerSessions.get(playerId);
        if (!sessionId) return null;
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Get active session for a realm
     */
    getRealmSession(realm: string): TagGameSession | null {
        return Array.from(this.sessions.values())
            .find(s => s.realm === realm && (s.status === 'waiting' || s.status === 'active')) || null;
    }

    /**
     * Get serialized session state for network
     */
    getSerializedSession(sessionId: string): any {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        return {
            id: session.id,
            realm: session.realm,
            status: session.status,
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration,
            currentIt: session.currentIt,
            players: Array.from(session.players.values()).map(p => ({
                playerId: p.playerId,
                playerName: p.playerName,
                isIt: p.isIt,
                tagCount: p.tagCount,
                score: p.score
            })),
            playerCount: session.players.size,
            minPlayers: session.minPlayers,
            maxPlayers: session.maxPlayers
        };
    }

    /**
     * Get all active sessions
     */
    getActiveSessions(): any[] {
        return Array.from(this.sessions.values())
            .filter(s => s.status === 'waiting' || s.status === 'active')
            .map(s => this.getSerializedSession(s.id));
    }

    /**
     * Update config
     */
    updateConfig(config: Partial<TagGameConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current config
     */
    getConfig(): TagGameConfig {
        return { ...this.config };
    }

    /**
     * Force end all games (admin)
     */
    forceEndAllGames(): void {
        for (const sessionId of this.sessions.keys()) {
            this.endGame(sessionId);
        }
    }

    /**
     * Shutdown service
     */
    shutdown(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.forceEndAllGames();
        this.sessions.clear();
        this.playerSessions.clear();
        this.ready = false;
        console.log('🏷️ TagGameService shut down');
    }
}

// Export singleton
export const tagGameService = TagGameService.getInstance();
