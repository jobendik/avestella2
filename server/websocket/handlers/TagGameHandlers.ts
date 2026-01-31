// =============================================================================
// Tag Game Handlers - Tag minigame system
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { progressionService } from '../../services/ProgressionService.js';

interface TagGame {
    id: string;
    realm: string;
    createdBy: string;
    taggerId: string;
    players: Set<string>;
    startTime: number;
    endTime: number;
    tagCount: Map<string, number>;
    status: 'waiting' | 'active' | 'ended';
    minPlayers: number;
    maxPlayers: number;
}

export class TagGameHandlers {
    private static activeGames: Map<string, TagGame> = new Map();

    /**
     * Create a new tag game
     */
    static handleCreateTagGame(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { duration, minPlayers, maxPlayers } = data;

            // Check if player is already in a game
            for (const game of TagGameHandlers.activeGames.values()) {
                if (game.players.has(connection.playerId)) {
                    ctx.sendError(connection, 'Already in a tag game');
                    return;
                }
            }

            const gameId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const game: TagGame = {
                id: gameId,
                realm: connection.realm || 'default',
                createdBy: connection.playerId,
                taggerId: connection.playerId, // Creator starts as tagger
                players: new Set([connection.playerId]),
                startTime: 0,
                endTime: 0,
                tagCount: new Map([[connection.playerId, 0]]),
                status: 'waiting',
                minPlayers: Math.max(2, minPlayers || 2),
                maxPlayers: Math.min(20, maxPlayers || 10)
            };

            TagGameHandlers.activeGames.set(gameId, game);

            ctx.send(connection.ws, {
                type: 'tag_game_created',
                data: {
                    gameId,
                    status: 'waiting',
                    players: [connection.playerId],
                    minPlayers: game.minPlayers,
                    maxPlayers: game.maxPlayers
                },
                timestamp: Date.now()
            });

            // Broadcast to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    if (conn.playerId !== connection.playerId) {
                        ctx.send(conn.ws, {
                            type: 'tag_game_available',
                            data: {
                                gameId,
                                createdBy: connection.playerName,
                                playersNeeded: game.minPlayers - 1
                            },
                            timestamp: Date.now()
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to create tag game:', error);
        }
    }

    /**
     * Join a tag game
     */
    static handleJoinTagGame(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { gameId } = data;

            const game = TagGameHandlers.activeGames.get(gameId);
            if (!game) {
                ctx.sendError(connection, 'Game not found');
                return;
            }

            if (game.status !== 'waiting') {
                ctx.sendError(connection, 'Game already started');
                return;
            }

            if (game.players.size >= game.maxPlayers) {
                ctx.sendError(connection, 'Game is full');
                return;
            }

            // Check if already in another game
            for (const g of TagGameHandlers.activeGames.values()) {
                if (g.id !== gameId && g.players.has(connection.playerId)) {
                    ctx.sendError(connection, 'Already in another game');
                    return;
                }
            }

            game.players.add(connection.playerId);
            game.tagCount.set(connection.playerId, 0);

            const now = Date.now();

            // Notify all players in game
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    if (game.players.has(conn.playerId)) {
                        ctx.send(conn.ws, {
                            type: 'player_joined_tag',
                            data: {
                                gameId,
                                playerId: connection.playerId,
                                playerName: connection.playerName,
                                playerCount: game.players.size,
                                canStart: game.players.size >= game.minPlayers
                            },
                            timestamp: now
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to join tag game:', error);
        }
    }

    /**
     * Start a tag game
     */
    static handleStartTagGame(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { gameId } = data;

            const game = TagGameHandlers.activeGames.get(gameId);
            if (!game) {
                ctx.sendError(connection, 'Game not found');
                return;
            }

            if (game.createdBy !== connection.playerId) {
                ctx.sendError(connection, 'Only creator can start the game');
                return;
            }

            if (game.players.size < game.minPlayers) {
                ctx.sendError(connection, `Need at least ${game.minPlayers} players`);
                return;
            }

            const now = Date.now();
            game.status = 'active';
            game.startTime = now;
            game.endTime = now + (data.duration || 180000); // 3 minutes default

            // Notify all players
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    if (game.players.has(conn.playerId)) {
                        ctx.send(conn.ws, {
                            type: 'tag_game_started',
                            data: {
                                gameId,
                                taggerId: game.taggerId,
                                endTime: game.endTime,
                                players: Array.from(game.players)
                            },
                            timestamp: now
                        });
                    }
                }
            }

            // Schedule end
            setTimeout(() => {
                TagGameHandlers.endTagGame(gameId, ctx);
            }, game.endTime - now);
        } catch (error) {
            console.error('Failed to start tag game:', error);
        }
    }

    /**
     * Handle tagging another player
     */
    static async handleTag(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { gameId, targetId } = data;

            const game = TagGameHandlers.activeGames.get(gameId);
            if (!game) {
                ctx.sendError(connection, 'Game not found');
                return;
            }

            if (game.status !== 'active') {
                ctx.sendError(connection, 'Game not active');
                return;
            }

            if (game.taggerId !== connection.playerId) {
                ctx.sendError(connection, 'You are not the tagger');
                return;
            }

            if (!game.players.has(targetId)) {
                ctx.sendError(connection, 'Target not in game');
                return;
            }

            // Check distance (server-side validation)
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                const targetConn = realm.get(targetId);

                if (targetConn) {
                    const dx = targetConn.x - connection.x;
                    const dy = targetConn.y - connection.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 50) {
                        ctx.sendError(connection, 'Too far to tag');
                        return;
                    }
                }
            }

            // Increment tag count
            game.tagCount.set(connection.playerId, (game.tagCount.get(connection.playerId) || 0) + 1);

            // Transfer tagger
            game.taggerId = targetId;

            const now = Date.now();

            // Notify all players
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    if (game.players.has(conn.playerId)) {
                        ctx.send(conn.ws, {
                            type: 'player_tagged',
                            data: {
                                gameId,
                                taggerId: connection.playerId,
                                taggedId: targetId,
                                newTaggerId: targetId
                            },
                            timestamp: now
                        });
                    }
                }
            }

            // Award XP
            await progressionService.addXP(connection.playerId, 10, 'tag_player');
        } catch (error) {
            console.error('Failed to handle tag:', error);
        }
    }

    /**
     * Leave a tag game
     */
    static handleLeaveTagGame(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { gameId } = data;

            const game = TagGameHandlers.activeGames.get(gameId);
            if (!game) return;

            game.players.delete(connection.playerId);

            // If tagger leaves, pick new tagger
            if (game.taggerId === connection.playerId && game.players.size > 0) {
                game.taggerId = Array.from(game.players)[0];
            }

            // If not enough players, end game
            if (game.players.size < 2 && game.status === 'active') {
                TagGameHandlers.endTagGame(gameId, ctx);
                return;
            }

            // If creator leaves during waiting, cancel game
            if (game.createdBy === connection.playerId && game.status === 'waiting') {
                TagGameHandlers.activeGames.delete(gameId);
            }

            const now = Date.now();

            // Notify remaining players
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    if (game.players.has(conn.playerId)) {
                        ctx.send(conn.ws, {
                            type: 'player_left_tag',
                            data: {
                                gameId,
                                playerId: connection.playerId,
                                newTaggerId: game.taggerId,
                                playerCount: game.players.size
                            },
                            timestamp: now
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to leave tag game:', error);
        }
    }

    /**
     * End a tag game
     */
    static async endTagGame(gameId: string, ctx: HandlerContext): Promise<void> {
        try {
            const game = TagGameHandlers.activeGames.get(gameId);
            if (!game) return;

            game.status = 'ended';

            // Calculate scores and winner
            const scores = Array.from(game.tagCount.entries())
                .map(([playerId, tags]) => ({ playerId, tags }))
                .sort((a, b) => b.tags - a.tags);

            const winner = scores[0];

            const now = Date.now();

            // Notify all players and award XP
            for (const playerId of game.players) {
                // Find connection
                for (const realm of ctx.realms.values()) {
                    const conn = realm.get(playerId);
                    if (conn) {
                        const playerScore = scores.find(s => s.playerId === playerId);
                        const rank = scores.findIndex(s => s.playerId === playerId) + 1;

                        ctx.send(conn.ws, {
                            type: 'tag_game_ended',
                            data: {
                                gameId,
                                winner: winner.playerId,
                                scores,
                                yourRank: rank,
                                yourTags: playerScore?.tags || 0
                            },
                            timestamp: now
                        });

                        // Award XP based on performance
                        const xpReward = rank === 1 ? 50 : rank === 2 ? 30 : rank === 3 ? 20 : 10;
                        await progressionService.addXP(playerId, xpReward, 'tag_game_complete');
                    }
                }
            }

            // Clean up
            TagGameHandlers.activeGames.delete(gameId);
        } catch (error) {
            console.error('Failed to end tag game:', error);
        }
    }

    /**
     * Get available tag games
     */
    static handleGetTagGames(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const games = Array.from(TagGameHandlers.activeGames.values())
                .filter(g => g.realm === connection.realm && g.status === 'waiting')
                .map(g => ({
                    gameId: g.id,
                    createdBy: g.createdBy,
                    playerCount: g.players.size,
                    minPlayers: g.minPlayers,
                    maxPlayers: g.maxPlayers
                }));

            ctx.send(connection.ws, {
                type: 'tag_games_list',
                data: { games },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get tag games:', error);
        }
    }
}
