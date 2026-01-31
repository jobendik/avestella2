// =============================================================================
// Leaderboard Handlers - Leaderboards and rankings
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { leaderboardService } from '../../services/LeaderboardService.js';

export class LeaderboardHandlers {
    /**
     * Request leaderboard
     */
    static async handleRequestLeaderboard(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { type, limit } = data;
            const category = type || 'xp';

            const result = await leaderboardService.getLeaderboard(category, limit || 50);

            ctx.send(connection.ws, {
                type: 'leaderboard',
                data: {
                    leaderboardType: category,
                    entries: result.entries,
                    totalPlayers: result.totalPlayers,
                    lastUpdated: result.lastUpdated
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get leaderboard:', error);
        }
    }

    /**
     * Get player's rank
     */
    static async handleGetPlayerRank(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { type } = data;
            const category = type || 'xp';

            const rank = await leaderboardService.getPlayerRank(connection.playerId, category);

            if (rank) {
                ctx.send(connection.ws, {
                    type: 'player_rank',
                    data: {
                        leaderboardType: category,
                        rank: rank.rank,
                        value: rank.value,
                        percentile: rank.percentile
                    },
                    timestamp: Date.now()
                });
            } else {
                ctx.send(connection.ws, {
                    type: 'player_rank',
                    data: { leaderboardType: category, rank: null },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to get player rank:', error);
        }
    }

    /**
     * Get nearby players on leaderboard
     */
    static async handleGetNearbyRanks(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { type } = data;
            const category = type || 'xp';

            // getPlayerRank includes nearbyPlayers
            const rank = await leaderboardService.getPlayerRank(connection.playerId, category);

            ctx.send(connection.ws, {
                type: 'nearby_ranks',
                data: {
                    leaderboardType: category,
                    players: rank?.nearbyPlayers || [],
                    yourRank: rank?.rank
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get nearby ranks:', error);
        }
    }

    /**
     * Get friend leaderboard
     */
    static async handleGetFriendLeaderboard(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { type } = data;
            const category = type || 'xp';

            // Get full leaderboard and filter by friends
            const result = await leaderboardService.getLeaderboard(category, 1000);
            const friendIds = connection.friends ? Array.from(connection.friends) : [];
            friendIds.push(connection.playerId);
            
            const friendEntries = result.entries.filter(e => friendIds.includes(e.playerId));

            ctx.send(connection.ws, {
                type: 'friend_leaderboard',
                data: {
                    leaderboardType: category,
                    entries: friendEntries
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get friend leaderboard:', error);
        }
    }

    /**
     * Get realm leaderboard
     */
    static async handleGetRealmLeaderboard(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { type, limit } = data;
            const category = type || 'xp';
            const realm = connection.realm || 'genesis';

            // Get leaderboard and filter by current realm players
            const result = await leaderboardService.getLeaderboard(category, limit || 500);
            
            const realmPlayerIds: string[] = [];
            if (ctx.realms.has(realm)) {
                const realmMap = ctx.realms.get(realm)!;
                for (const [playerId] of Array.from(realmMap.entries())) {
                    realmPlayerIds.push(playerId);
                }
            }
            
            const realmEntries = result.entries.filter(e => realmPlayerIds.includes(e.playerId));

            ctx.send(connection.ws, {
                type: 'realm_leaderboard',
                data: {
                    realm,
                    leaderboardType: category,
                    entries: realmEntries
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get realm leaderboard:', error);
        }
    }

    /**
     * Get available leaderboard types
     */
    static handleGetLeaderboardTypes(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const types = [
                { id: 'xp', name: 'Experience Points', description: 'Total XP earned' },
                { id: 'stardust', name: 'Stardust Collectors', description: 'Total stardust collected' },
                { id: 'stars', name: 'Star Lighters', description: 'Stars lit' },
                { id: 'echoes', name: 'Echo Creators', description: 'Echoes created' },
                { id: 'connections', name: 'Social Butterflies', description: 'Connections made' },
                { id: 'challenges', name: 'Challenge Masters', description: 'Challenges completed' },
                { id: 'seasonXp', name: 'Season Champions', description: 'Season pass XP' },
                { id: 'reputation_explorer', name: 'Explorers', description: 'Explorer reputation' },
                { id: 'reputation_connector', name: 'Connectors', description: 'Connector reputation' },
                { id: 'reputation_guardian', name: 'Guardians', description: 'Guardian reputation' }
            ];

            ctx.send(connection.ws, {
                type: 'leaderboard_types',
                data: { types },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get leaderboard types:', error);
        }
    }

    /**
     * Get global stats
     */
    static async handleGetGlobalStats(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const stats = await leaderboardService.getGlobalStats();

            ctx.send(connection.ws, {
                type: 'global_stats',
                data: stats,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get global stats:', error);
        }
    }
}
