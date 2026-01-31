// =============================================================================
// Mystery Box Handlers - Gacha/lootbox system
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { mysteryBoxService } from '../../services/MysteryBoxService.js';
import { progressionService } from '../../services/ProgressionService.js';

export class MysteryBoxHandlers {
    /**
     * Get mystery box info and player stats
     */
    static async handleGetMysteryBoxInfo(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const stats = await mysteryBoxService.getPlayerStats(connection.playerId);
            const boxConfigs = mysteryBoxService.getAllBoxConfigs();

            ctx.send(connection.ws, {
                type: 'mystery_box_info',
                data: {
                    boxes: boxConfigs,
                    playerStats: stats
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get mystery box info:', error);
        }
    }

    /**
     * Open a mystery box
     */
    static async handleOpenMysteryBox(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { tier } = data;

            if (!tier) {
                ctx.sendError(connection, 'Box tier required');
                return;
            }

            // Check if player can afford
            const config = mysteryBoxService.getBoxConfig(tier);
            if (!config) {
                ctx.sendError(connection, 'Invalid box tier');
                return;
            }

            const progression = await progressionService.getProgression(connection.playerId);
            
            // Check affordability
            const affordability = mysteryBoxService.canAffordBox(
                tier,
                progression.stardust,
                progression.crystals || 0
            );
            
            if (!affordability.canAfford) {
                ctx.sendError(connection, 'Insufficient stardust');
                return;
            }

            // Deduct cost
            await progressionService.spendStardust(connection.playerId, config.stardustCost);

            // Open box
            const result = await mysteryBoxService.openBox(connection.playerId, tier);

            if (result.success) {
                ctx.send(connection.ws, {
                    type: 'mystery_box_opened',
                    data: {
                        tier,
                        reward: result.reward,
                        pityProgress: result.pityProgress
                    },
                    timestamp: Date.now()
                });

                // Broadcast rare rewards
                if (result.reward && (result.reward.rarity === 'epic' || result.reward.rarity === 'legendary')) {
                    if (connection.realm && ctx.realms.has(connection.realm)) {
                        const realm = ctx.realms.get(connection.realm)!;
                        for (const conn of Array.from(realm.values())) {
                            if (conn.playerId !== connection.playerId) {
                                ctx.send(conn.ws, {
                                    type: 'rare_reward_obtained',
                                    data: {
                                        playerName: connection.playerName,
                                        rewardName: result.reward.displayName,
                                        rarity: result.reward.rarity
                                    },
                                    timestamp: Date.now()
                                });
                            }
                        }
                    }
                }
            } else {
                ctx.sendError(connection, result.error || 'Failed to open box');
            }
        } catch (error) {
            console.error('Failed to open mystery box:', error);
        }
    }

    /**
     * Get pity progress for a specific tier
     */
    static async handleGetPityProgress(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { tier } = data;

            if (!tier) {
                ctx.sendError(connection, 'Box tier required');
                return;
            }

            const pity = await mysteryBoxService.getPityProgress(connection.playerId, tier);

            ctx.send(connection.ws, {
                type: 'pity_progress',
                data: { tier, ...pity },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get pity progress:', error);
        }
    }

    /**
     * Get player's box opening stats
     */
    static async handleGetBoxStats(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const stats = await mysteryBoxService.getPlayerStats(connection.playerId);

            ctx.send(connection.ws, {
                type: 'box_stats',
                data: stats,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get box stats:', error);
        }
    }

    /**
     * Get global mystery box stats
     */
    static async handleGetGlobalBoxStats(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const stats = await mysteryBoxService.getGlobalStats();

            ctx.send(connection.ws, {
                type: 'global_box_stats',
                data: stats,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get global box stats:', error);
        }
    }
}
