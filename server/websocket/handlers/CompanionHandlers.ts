// =============================================================================
// Companion Handlers - Pet companions system
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { companionService } from '../../services/CompanionService.js';
import { progressionService } from '../../services/ProgressionService.js';

export class CompanionHandlers {
    /**
     * Request companion data
     */
    static async handleRequestCompanionData(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const data = await companionService.getCompanionData(connection.playerId);
            ctx.send(connection.ws, {
                type: 'companion_data',
                data,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get companion data:', error);
        }
    }

    /**
     * Purchase a companion
     */
    static async handlePurchaseCompanion(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { companionId } = data;
            const config = companionService.getCompanionConfig(companionId);

            if (!config) {
                ctx.sendError(connection, 'Companion not found');
                return;
            }

            // Check if already owned
            const companionData = await companionService.getCompanionData(connection.playerId);
            if (companionData.ownedCompanions.some(c => c.companionId === companionId)) {
                ctx.sendError(connection, 'Companion already owned');
                return;
            }

            // Check currency
            const progression = await progressionService.getProgression(connection.playerId);
            if (!progression || progression.stardust < config.price) {
                ctx.sendError(connection, 'Insufficient stardust');
                return;
            }

            // Purchase
            await progressionService.spendStardust(connection.playerId, config.price);
            await companionService.unlockCompanion(connection.playerId, companionId);

            ctx.send(connection.ws, {
                type: 'companion_purchased',
                data: {
                    companionId,
                    newStardust: progression.stardust - config.price
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to purchase companion:', error);
        }
    }

    /**
     * Equip/activate a companion
     */
    static async handleEquipCompanion(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { companionId } = data;
            const result = await companionService.equipCompanion(connection.playerId, companionId);

            if (result) {
                ctx.send(connection.ws, {
                    type: 'companion_equipped',
                    data: { companionId },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, 'Failed to equip companion');
            }
        } catch (error) {
            console.error('Failed to equip companion:', error);
        }
    }

    /**
     * Unequip companion
     */
    static async handleUnequipCompanion(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            // Pass null to unequip
            await companionService.equipCompanion(connection.playerId, null);

            ctx.send(connection.ws, {
                type: 'companion_unequipped',
                data: { success: true },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to unequip companion:', error);
        }
    }

    /**
     * Feed companion (add XP)
     */
    static async handleFeedCompanion(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { companionId, xpAmount } = data;
            
            if (!companionId) {
                ctx.sendError(connection, 'Companion ID required');
                return;
            }

            const result = await companionService.addCompanionXP(
                connection.playerId,
                companionId,
                xpAmount || 10
            );

            if (result.success) {
                ctx.send(connection.ws, {
                    type: 'companion_fed',
                    data: {
                        newXP: result.newXP,
                        newLevel: result.newLevel,
                        levelUp: result.leveledUp
                    },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, 'Failed to feed companion');
            }
        } catch (error) {
            console.error('Failed to feed companion:', error);
        }
    }

    /**
     * Rename companion - Note: This needs to be added to CompanionService if needed
     */
    static async handleRenameCompanion(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { name } = data;
            if (!name || name.length > 20) {
                ctx.sendError(connection, 'Invalid name');
                return;
            }

            // Note: renameCompanion method would need to be added to CompanionService
            ctx.send(connection.ws, {
                type: 'companion_renamed',
                data: { name },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to rename companion:', error);
        }
    }
}
