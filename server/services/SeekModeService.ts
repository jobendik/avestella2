// =============================================================================
// Seek Mode Service - Server-authoritative hide and seek validation
// =============================================================================
// Phase 1.6: Seek Mode Server Validation
// =============================================================================

import { EventEmitter } from 'events';
import mongoose, { Schema, Document, Model } from 'mongoose';
// @ts-ignore - uuid package types
import { v4 as uuidv4 } from 'uuid';

// ============================================
// SEEK GAME SESSION MODEL
// ============================================

export interface ISeekGameSession extends Document {
    gameId: string;
    realm: string;
    state: 'waiting' | 'hiding' | 'seeking' | 'ended';
    hostId: string;
    hostName: string;
    seekerId: string | null;
    seekerName: string | null;
    hiders: {
        playerId: string;
        playerName: string;
        hidden: boolean;
        position: { x: number; y: number } | null;
        foundAt: Date | null;
        foundBy: string | null;
    }[];
    settings: {
        hidingTime: number;         // Seconds to hide
        seekingTime: number;        // Max seek duration
        maxPlayers: number;
        allowHints: boolean;
        boundaryRadius: number;     // Game area radius
        centerX: number;
        centerY: number;
    };
    startedAt: Date | null;
    hidingEndsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    results?: {
        winnerId: string;
        winnerName: string;
        hidersFound: number;
        totalHiders: number;
        duration: number;
    };
}

const SeekGameSessionSchema = new Schema<ISeekGameSession>({
    gameId: { type: String, required: true, unique: true, index: true },
    realm: { type: String, required: true, index: true },
    state: { 
        type: String, 
        enum: ['waiting', 'hiding', 'seeking', 'ended'],
        default: 'waiting'
    },
    hostId: { type: String, required: true },
    hostName: { type: String, required: true },
    seekerId: { type: String, default: null },
    seekerName: { type: String, default: null },
    hiders: [{
        playerId: String,
        playerName: String,
        hidden: { type: Boolean, default: false },
        position: {
            x: Number,
            y: Number
        },
        foundAt: Date,
        foundBy: String
    }],
    settings: {
        hidingTime: { type: Number, default: 30 },
        seekingTime: { type: Number, default: 180 },
        maxPlayers: { type: Number, default: 10 },
        allowHints: { type: Boolean, default: true },
        boundaryRadius: { type: Number, default: 500 },
        centerX: { type: Number, default: 0 },
        centerY: { type: Number, default: 0 }
    },
    startedAt: { type: Date, default: null },
    hidingEndsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    results: {
        winnerId: String,
        winnerName: String,
        hidersFound: Number,
        totalHiders: Number,
        duration: Number
    }
}, { collection: 'seekGameSessions' });

const SeekGameSession = (mongoose.models.SeekGameSession || 
    mongoose.model<ISeekGameSession>('SeekGameSession', SeekGameSessionSchema)) as Model<ISeekGameSession>;

// ============================================
// SEEK MODE SERVICE
// ============================================

interface ActiveGame {
    gameId: string;
    session: ISeekGameSession;
    hidingTimer: NodeJS.Timeout | null;
    seekingTimer: NodeJS.Timeout | null;
    hintInterval: NodeJS.Timeout | null;
}

class SeekModeService extends EventEmitter {
    private initialized: boolean = false;
    private activeGames: Map<string, ActiveGame> = new Map();
    private playerToGame: Map<string, string> = new Map();

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        // Load any active games from database
        const activeSessions = await SeekGameSession.find({
            state: { $in: ['waiting', 'hiding', 'seeking'] }
        });

        for (const session of activeSessions) {
            this.activeGames.set(session.gameId, {
                gameId: session.gameId,
                session,
                hidingTimer: null,
                seekingTimer: null,
                hintInterval: null
            });

            // Map players to game
            if (session.seekerId) {
                this.playerToGame.set(session.seekerId, session.gameId);
            }
            for (const hider of session.hiders) {
                this.playerToGame.set(hider.playerId, session.gameId);
            }
        }

        console.log(`🔍 Seek mode service initialized with ${activeSessions.length} active games`);
    }

    // =========================================================================
    // GAME LIFECYCLE
    // =========================================================================

    async createGame(
        hostId: string,
        hostName: string,
        realm: string,
        centerX: number,
        centerY: number,
        settings?: Partial<ISeekGameSession['settings']>
    ): Promise<ISeekGameSession | null> {
        // Check if player already in a game
        if (this.playerToGame.has(hostId)) {
            return null;
        }

        const gameId = `seek_${uuidv4()}`;
        const gameSettings = {
            hidingTime: settings?.hidingTime || 30,
            seekingTime: settings?.seekingTime || 180,
            maxPlayers: settings?.maxPlayers || 10,
            allowHints: settings?.allowHints ?? true,
            boundaryRadius: settings?.boundaryRadius || 500,
            centerX,
            centerY
        };

        const session = await SeekGameSession.create({
            gameId,
            realm,
            state: 'waiting',
            hostId,
            hostName,
            seekerId: hostId, // Host is seeker by default
            seekerName: hostName,
            hiders: [],
            settings: gameSettings
        });

        this.activeGames.set(gameId, {
            gameId,
            session,
            hidingTimer: null,
            seekingTimer: null,
            hintInterval: null
        });

        this.playerToGame.set(hostId, gameId);
        this.emit('game_created', session);

        return session;
    }

    async joinGame(
        gameId: string,
        playerId: string,
        playerName: string
    ): Promise<{ success: boolean; error?: string; session?: ISeekGameSession }> {
        const game = this.activeGames.get(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (game.session.state !== 'waiting') {
            return { success: false, error: 'Game already started' };
        }

        if (this.playerToGame.has(playerId)) {
            return { success: false, error: 'Already in a game' };
        }

        if (game.session.hiders.length >= game.session.settings.maxPlayers - 1) {
            return { success: false, error: 'Game is full' };
        }

        // Add as hider
        game.session.hiders.push({
            playerId,
            playerName,
            hidden: false,
            position: null,
            foundAt: null,
            foundBy: null
        });

        await SeekGameSession.findOneAndUpdate(
            { gameId },
            { $push: { hiders: { playerId, playerName, hidden: false } } }
        );

        this.playerToGame.set(playerId, gameId);
        this.emit('player_joined', { gameId, playerId, playerName });

        return { success: true, session: game.session };
    }

    async startGame(gameId: string, requesterId: string): Promise<{ success: boolean; error?: string }> {
        const game = this.activeGames.get(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (game.session.hostId !== requesterId) {
            return { success: false, error: 'Only host can start' };
        }

        if (game.session.state !== 'waiting') {
            return { success: false, error: 'Game already started' };
        }

        if (game.session.hiders.length < 1) {
            return { success: false, error: 'Need at least 1 hider' };
        }

        // Start hiding phase
        const now = new Date();
        const hidingEndsAt = new Date(now.getTime() + game.session.settings.hidingTime * 1000);

        game.session.state = 'hiding';
        game.session.startedAt = now;
        game.session.hidingEndsAt = hidingEndsAt;

        await SeekGameSession.findOneAndUpdate(
            { gameId },
            { 
                state: 'hiding',
                startedAt: now,
                hidingEndsAt
            }
        );

        // Set timer for hiding phase end
        game.hidingTimer = setTimeout(() => {
            this.startSeekingPhase(gameId);
        }, game.session.settings.hidingTime * 1000);

        this.emit('game_started', { gameId, phase: 'hiding', endsAt: hidingEndsAt });

        return { success: true };
    }

    private async startSeekingPhase(gameId: string): Promise<void> {
        const game = this.activeGames.get(gameId);
        if (!game) return;

        const now = new Date();
        const endsAt = new Date(now.getTime() + game.session.settings.seekingTime * 1000);

        game.session.state = 'seeking';
        game.session.endsAt = endsAt;

        await SeekGameSession.findOneAndUpdate(
            { gameId },
            { state: 'seeking', endsAt }
        );

        // Clear hiding timer
        if (game.hidingTimer) {
            clearTimeout(game.hidingTimer);
            game.hidingTimer = null;
        }

        // Set timer for game end
        game.seekingTimer = setTimeout(() => {
            this.endGame(gameId, 'timeout');
        }, game.session.settings.seekingTime * 1000);

        // Set hint interval if enabled
        if (game.session.settings.allowHints) {
            game.hintInterval = setInterval(() => {
                this.sendHint(gameId);
            }, 30000); // Hint every 30 seconds
        }

        this.emit('seeking_started', { gameId, endsAt });
    }

    // =========================================================================
    // GAME ACTIONS
    // =========================================================================

    /**
     * Hider confirms their hiding position
     */
    async confirmHidingPosition(
        gameId: string,
        playerId: string,
        x: number,
        y: number
    ): Promise<{ success: boolean; error?: string }> {
        const game = this.activeGames.get(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (game.session.state !== 'hiding') {
            return { success: false, error: 'Not in hiding phase' };
        }

        // Validate position is within bounds
        const settings = game.session.settings;
        const dx = x - settings.centerX;
        const dy = y - settings.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > settings.boundaryRadius) {
            return { success: false, error: 'Position outside game boundary' };
        }

        // Find and update hider
        const hiderIndex = game.session.hiders.findIndex(h => h.playerId === playerId);
        if (hiderIndex === -1) {
            return { success: false, error: 'Not a hider in this game' };
        }

        game.session.hiders[hiderIndex].hidden = true;
        game.session.hiders[hiderIndex].position = { x, y };

        await SeekGameSession.findOneAndUpdate(
            { gameId, 'hiders.playerId': playerId },
            { 
                $set: { 
                    'hiders.$.hidden': true,
                    'hiders.$.position': { x, y }
                }
            }
        );

        this.emit('hider_hidden', { gameId, playerId });

        return { success: true };
    }

    /**
     * Seeker attempts to find a hider
     */
    async attemptFind(
        gameId: string,
        seekerId: string,
        targetX: number,
        targetY: number
    ): Promise<{ success: boolean; found?: boolean; playerId?: string; playerName?: string; error?: string }> {
        const game = this.activeGames.get(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (game.session.state !== 'seeking') {
            return { success: false, error: 'Not in seeking phase' };
        }

        if (game.session.seekerId !== seekerId) {
            return { success: false, error: 'Not the seeker' };
        }

        // Check if any unfound hider is at this position (within 50 units)
        const FIND_RADIUS = 50;

        for (let i = 0; i < game.session.hiders.length; i++) {
            const hider = game.session.hiders[i];
            if (hider.foundAt) continue; // Already found
            if (!hider.position) continue; // Not hidden yet

            const dx = targetX - hider.position.x;
            const dy = targetY - hider.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= FIND_RADIUS) {
                // Found!
                game.session.hiders[i].foundAt = new Date();
                game.session.hiders[i].foundBy = seekerId;

                await SeekGameSession.findOneAndUpdate(
                    { gameId, 'hiders.playerId': hider.playerId },
                    { 
                        $set: { 
                            'hiders.$.foundAt': new Date(),
                            'hiders.$.foundBy': seekerId
                        }
                    }
                );

                this.emit('hider_found', { 
                    gameId, 
                    hiderId: hider.playerId, 
                    hiderName: hider.playerName,
                    seekerId 
                });

                // Check if all hiders found
                const allFound = game.session.hiders.every(h => h.foundAt !== null);
                if (allFound) {
                    this.endGame(gameId, 'all_found');
                }

                return { 
                    success: true, 
                    found: true, 
                    playerId: hider.playerId,
                    playerName: hider.playerName 
                };
            }
        }

        return { success: true, found: false };
    }

    // =========================================================================
    // HINTS
    // =========================================================================

    private sendHint(gameId: string): void {
        const game = this.activeGames.get(gameId);
        if (!game || game.session.state !== 'seeking') return;

        // Find an unfound hider and send a general direction hint
        const unfoundHiders = game.session.hiders.filter(h => !h.foundAt && h.position);
        if (unfoundHiders.length === 0) return;

        // Pick random unfound hider
        const hider = unfoundHiders[Math.floor(Math.random() * unfoundHiders.length)];
        if (!hider.position) return;

        // Calculate general direction (8-directional)
        const dx = hider.position.x - game.session.settings.centerX;
        const dy = hider.position.y - game.session.settings.centerY;
        const angle = Math.atan2(dy, dx);
        
        let direction: string;
        if (angle > -Math.PI/8 && angle <= Math.PI/8) direction = 'east';
        else if (angle > Math.PI/8 && angle <= 3*Math.PI/8) direction = 'southeast';
        else if (angle > 3*Math.PI/8 && angle <= 5*Math.PI/8) direction = 'south';
        else if (angle > 5*Math.PI/8 && angle <= 7*Math.PI/8) direction = 'southwest';
        else if (angle > 7*Math.PI/8 || angle <= -7*Math.PI/8) direction = 'west';
        else if (angle > -7*Math.PI/8 && angle <= -5*Math.PI/8) direction = 'northwest';
        else if (angle > -5*Math.PI/8 && angle <= -3*Math.PI/8) direction = 'north';
        else direction = 'northeast';

        this.emit('hint', { gameId, direction, remainingHiders: unfoundHiders.length });
    }

    // =========================================================================
    // GAME END
    // =========================================================================

    async endGame(gameId: string, reason: 'all_found' | 'timeout' | 'cancelled'): Promise<void> {
        const game = this.activeGames.get(gameId);
        if (!game) return;

        // Clear timers
        if (game.hidingTimer) clearTimeout(game.hidingTimer);
        if (game.seekingTimer) clearTimeout(game.seekingTimer);
        if (game.hintInterval) clearInterval(game.hintInterval);

        // Calculate results
        const foundCount = game.session.hiders.filter(h => h.foundAt).length;
        const totalHiders = game.session.hiders.length;
        const duration = game.session.startedAt 
            ? (Date.now() - game.session.startedAt.getTime()) / 1000
            : 0;

        // Determine winner
        let winnerId: string;
        let winnerName: string;

        if (reason === 'all_found') {
            // Seeker wins
            winnerId = game.session.seekerId!;
            winnerName = game.session.seekerName!;
        } else if (reason === 'timeout') {
            // Hiders who weren't found win
            const unfound = game.session.hiders.filter(h => !h.foundAt);
            if (unfound.length > 0) {
                winnerId = unfound[0].playerId;
                winnerName = unfound[0].playerName;
            } else {
                winnerId = game.session.seekerId!;
                winnerName = game.session.seekerName!;
            }
        } else {
            winnerId = game.session.hostId;
            winnerName = game.session.hostName;
        }

        game.session.state = 'ended';
        game.session.results = {
            winnerId,
            winnerName,
            hidersFound: foundCount,
            totalHiders,
            duration
        };

        await SeekGameSession.findOneAndUpdate(
            { gameId },
            { 
                state: 'ended',
                results: game.session.results
            }
        );

        // Clean up player mappings
        if (game.session.seekerId) {
            this.playerToGame.delete(game.session.seekerId);
        }
        for (const hider of game.session.hiders) {
            this.playerToGame.delete(hider.playerId);
        }

        this.activeGames.delete(gameId);

        this.emit('game_ended', { 
            gameId, 
            reason, 
            results: game.session.results 
        });
    }

    async leaveGame(playerId: string): Promise<void> {
        const gameId = this.playerToGame.get(playerId);
        if (!gameId) return;

        const game = this.activeGames.get(gameId);
        if (!game) {
            this.playerToGame.delete(playerId);
            return;
        }

        // If host leaves, end the game
        if (game.session.hostId === playerId) {
            await this.endGame(gameId, 'cancelled');
            return;
        }

        // Remove from hiders
        game.session.hiders = game.session.hiders.filter(h => h.playerId !== playerId);
        await SeekGameSession.findOneAndUpdate(
            { gameId },
            { $pull: { hiders: { playerId } } }
        );

        this.playerToGame.delete(playerId);
        this.emit('player_left', { gameId, playerId });
    }

    // =========================================================================
    // QUERIES
    // =========================================================================

    getPlayerGame(playerId: string): ISeekGameSession | null {
        const gameId = this.playerToGame.get(playerId);
        if (!gameId) return null;

        const game = this.activeGames.get(gameId);
        return game?.session || null;
    }

    async getActiveGames(realm: string): Promise<any[]> {
        return SeekGameSession.find({
            realm,
            state: { $in: ['waiting', 'hiding', 'seeking'] }
        }).lean();
    }

    async getGameHistory(playerId: string, limit: number = 10): Promise<any[]> {
        return SeekGameSession.find({
            state: 'ended',
            $or: [
                { seekerId: playerId },
                { 'hiders.playerId': playerId }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    // =========================================================================
    // VALIDATION
    // =========================================================================

    isPlayerInBounds(gameId: string, x: number, y: number): boolean {
        const game = this.activeGames.get(gameId);
        if (!game) return false;

        const settings = game.session.settings;
        const dx = x - settings.centerX;
        const dy = y - settings.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= settings.boundaryRadius;
    }
}

export const seekModeService = new SeekModeService();
