// =============================================================================
// Exploration Handlers - Exploration and POI discovery
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { explorationService } from '../../services/ExplorationService.js';
import { progressionService } from '../../services/ProgressionService.js';

export class ExplorationHandlers {
    /**
     * Update exploration data (player position)
     */
    static async handleUpdateExploration(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { x, y, region } = data;

            // Update player's position and get exploration results
            const result = await explorationService.updatePlayerPosition(
                connection.playerId,
                region || connection.realm || 'genesis',
                x ?? connection.x,
                y ?? connection.y
            );

            // Notify about new discoveries
            if (result.newPOI || result.newBiome || result.newRealm) {
                ctx.send(connection.ws, {
                    type: 'exploration_update',
                    data: {
                        newPOI: result.newPOI,
                        newBiome: result.newBiome,
                        newRealm: result.newRealm,
                        cellsRevealed: result.cellsRevealed,
                        xpEarned: result.xpEarned
                    },
                    timestamp: Date.now()
                });
            }

            // Award XP for exploration
            if (result.xpEarned > 0) {
                await progressionService.addXP(
                    connection.playerId,
                    result.xpEarned,
                    'exploration'
                );
            }

            // Notify about milestones
            if (result.milestonesUnlocked.length > 0) {
                ctx.send(connection.ws, {
                    type: 'milestones_unlocked',
                    data: { milestones: result.milestonesUnlocked },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to update exploration:', error);
        }
    }

    /**
     * Get exploration data
     */
    static async handleGetExplorationData(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const data = await explorationService.getPlayerExploration(connection.playerId);

            ctx.send(connection.ws, {
                type: 'exploration_data',
                data,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get exploration data:', error);
        }
    }

    /**
     * Discover a point of interest
     */
    static async handleDiscoverPOI(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { poiId } = data;

            if (!poiId) {
                ctx.sendError(connection, 'POI ID required');
                return;
            }

            const result = await explorationService.discoverPOI(connection.playerId, poiId);

            if (!result.success) {
                ctx.sendError(connection, result.error || 'Cannot discover POI');
                return;
            }

            ctx.send(connection.ws, {
                type: 'poi_discovered',
                data: {
                    poiId,
                    poi: result.poi,
                    xpEarned: result.xpEarned,
                    firstDiscoverer: result.firstDiscoverer
                },
                timestamp: Date.now()
            });

            // Award XP
            if (result.xpEarned) {
                await progressionService.addXP(connection.playerId, result.xpEarned, 'poi_discovery');
            }

            // Broadcast first discoveries
            if (result.firstDiscoverer && connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of Array.from(realm.values())) {
                    if (conn.playerId !== connection.playerId) {
                        ctx.send(conn.ws, {
                            type: 'poi_first_discovery',
                            data: {
                                playerId: connection.playerId,
                                playerName: connection.playerName,
                                poiName: result.poi?.name
                            },
                            timestamp: Date.now()
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to discover POI:', error);
        }
    }

    /**
     * Get nearby POIs
     */
    static async handleGetNearbyPOIs(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { radius } = data;

            const pois = explorationService.getPOIsNearPosition(
                connection.realm || 'genesis',
                connection.x,
                connection.y,
                radius || 500
            );

            ctx.send(connection.ws, {
                type: 'nearby_pois',
                data: { pois },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get nearby POIs:', error);
        }
    }

    /**
     * Get exploration stats
     */
    static async handleGetExplorationStats(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const stats = await explorationService.getExplorationStats(connection.playerId);

            ctx.send(connection.ws, {
                type: 'exploration_stats',
                data: stats,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get exploration stats:', error);
        }
    }

    /**
     * Get region/realm info
     */
    static async handleGetRegionInfo(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { regionId } = data;
            const realm = regionId || connection.realm || 'genesis';

            // Get explored areas for the realm
            const exploredData = await explorationService.exploredAreas(connection.playerId, realm);

            ctx.send(connection.ws, {
                type: 'region_info',
                data: {
                    realm,
                    exploredCells: exploredData.totalCells,
                    cells: exploredData.cells
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get region info:', error);
        }
    }

    /**
     * Discover a new biome
     */
    static async handleDiscoverBiome(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { biomeId } = data;

            if (!biomeId) {
                ctx.sendError(connection, 'Biome ID required');
                return;
            }

            const result = await explorationService.discoverBiome(connection.playerId, biomeId);

            if (!result.success) {
                ctx.sendError(connection, result.error || 'Cannot discover biome');
                return;
            }

            ctx.send(connection.ws, {
                type: 'biome_discovered',
                data: {
                    biomeId,
                    biome: result.biome,
                    xpEarned: result.xpEarned
                },
                timestamp: Date.now()
            });

            // Award XP
            if (result.xpEarned) {
                await progressionService.addXP(connection.playerId, result.xpEarned, 'biome_discovery');
            }
        } catch (error) {
            console.error('Failed to discover biome:', error);
        }
    }

    /**
     * Reveal fog at a position
     */
    static async handleRevealFog(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { x, y, realm } = data;
            
            const result = await explorationService.revealFog(
                connection.playerId,
                realm || connection.realm || 'genesis',
                x ?? connection.x,
                y ?? connection.y
            );

            ctx.send(connection.ws, {
                type: 'fog_revealed',
                data: result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to reveal fog:', error);
        }
    }

    /**
     * Get milestones
     */
    static async handleGetMilestones(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const milestones = await explorationService.getMilestones(connection.playerId);

            ctx.send(connection.ws, {
                type: 'exploration_milestones',
                data: milestones,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get milestones:', error);
        }
    }

    /**
     * Get discovered biomes
     */
    static async handleGetDiscoveredBiomes(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const biomes = await explorationService.discoveredBiomes(connection.playerId);

            ctx.send(connection.ws, {
                type: 'discovered_biomes',
                data: { biomes },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get discovered biomes:', error);
        }
    }

    // =========================================================================
    // Time-Based Secrets
    // =========================================================================

    /**
     * Get available time secrets (currently active windows)
     */
    static async handleGetAvailableTimeSecrets(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const available = explorationService.getAvailableTimeSecrets();
            const discovered = await explorationService.getDiscoveredTimeSecrets(connection.playerId);
            const discoveredIds = new Set(discovered.map(d => d.id));

            // Filter out already discovered secrets
            const availableNew = available.filter(s => !discoveredIds.has(s.id));

            ctx.send(connection.ws, {
                type: 'available_time_secrets',
                data: { 
                    secrets: availableNew,
                    hasAvailable: availableNew.length > 0 
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get available time secrets:', error);
        }
    }

    /**
     * Discover a time-based secret
     */
    static async handleDiscoverTimeSecret(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { secretId } = data;

            if (!secretId) {
                ctx.sendError(connection, 'Secret ID required');
                return;
            }

            const result = await explorationService.discoverTimeSecret(connection.playerId, secretId);

            if (!result.success) {
                ctx.send(connection.ws, {
                    type: 'time_secret_error',
                    data: { 
                        error: result.error,
                        alreadyDiscovered: result.alreadyDiscovered
                    },
                    timestamp: Date.now()
                });
                return;
            }

            ctx.send(connection.ws, {
                type: 'time_secret_discovered',
                data: {
                    secret: result.secret,
                    xpEarned: result.xpEarned
                },
                timestamp: Date.now()
            });

            // Award XP
            if (result.xpEarned) {
                await progressionService.addXP(connection.playerId, result.xpEarned, 'time_secret');
            }
        } catch (error) {
            console.error('Failed to discover time secret:', error);
        }
    }

    /**
     * Get all time secrets (with discovered status)
     */
    static async handleGetAllTimeSecrets(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const secrets = await explorationService.getAllTimeSecrets(connection.playerId);

            ctx.send(connection.ws, {
                type: 'all_time_secrets',
                data: { 
                    secrets,
                    totalDiscovered: secrets.filter(s => s.isDiscovered).length,
                    total: secrets.length
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get all time secrets:', error);
        }
    }
}
