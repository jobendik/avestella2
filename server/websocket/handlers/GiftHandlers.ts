// =============================================================================
// Gift Handlers - WebSocket message handlers for player-to-player gifts
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { giftService } from '../../services/GiftService.js';
import { notificationService } from '../../services/NotificationService.js';

export class GiftHandlers {
    /**
     * Send a gift to another player
     */
    static async handleSendGift(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { toPlayerId, giftType, amount, message } = data;

            if (!toPlayerId) {
                ctx.sendError(connection, 'Recipient ID required');
                return;
            }

            if (!giftType) {
                ctx.sendError(connection, 'Gift type required');
                return;
            }

            // Cannot gift yourself
            if (toPlayerId === connection.playerId) {
                ctx.sendError(connection, 'Cannot send gift to yourself');
                return;
            }

            const result = await giftService.sendGift(
                connection.playerId,
                connection.playerName,
                toPlayerId,
                giftType,
                amount || 1,
                message
            );

            if (result.success) {
                // Confirm to sender
                ctx.send(connection.ws, {
                    type: 'gift_sent',
                    data: {
                        giftId: result.giftId,
                        toPlayerId,
                        giftType,
                        amount: amount || 1,
                        remainingBalance: result.remainingBalance
                    },
                    timestamp: Date.now()
                });

                // Notify recipient if online
                const recipientConn = ctx.connections.get(toPlayerId);
                if (recipientConn) {
                    ctx.send(recipientConn.ws, {
                        type: 'gift_received',
                        data: {
                            giftId: result.giftId,
                            fromId: connection.playerId,
                            fromName: connection.playerName,
                            giftType,
                            amount: amount || 1,
                            message
                        },
                        timestamp: Date.now()
                    });
                }

                // Send notification (persisted for offline players)
                await notificationService.notifyGift(
                    toPlayerId,
                    connection.playerId,
                    connection.playerName,
                    giftType
                );
            } else {
                ctx.sendError(connection, result.error || 'Failed to send gift');
            }
        } catch (error) {
            console.error('Error sending gift:', error);
            ctx.sendError(connection, 'Failed to send gift');
        }
    }

    /**
     * Claim a received gift
     */
    static async handleClaimGift(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { giftId } = data;

            if (!giftId) {
                ctx.sendError(connection, 'Gift ID required');
                return;
            }

            const result = await giftService.claimGift(connection.playerId, giftId);

            if (result.success) {
                ctx.send(connection.ws, {
                    type: 'gift_claimed',
                    data: {
                        giftId,
                        giftType: result.giftType,
                        amount: result.amount,
                        newBalance: result.newBalance
                    },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, result.error || 'Failed to claim gift');
            }
        } catch (error) {
            console.error('Error claiming gift:', error);
            ctx.sendError(connection, 'Failed to claim gift');
        }
    }

    /**
     * Get pending gifts
     */
    static async handleGetPendingGifts(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const gifts = await giftService.getPendingGifts(connection.playerId);

            ctx.send(connection.ws, {
                type: 'pending_gifts',
                data: { gifts },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting pending gifts:', error);
            ctx.sendError(connection, 'Failed to get pending gifts');
        }
    }

    /**
     * Get gift history
     */
    static async handleGetGiftHistory(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { limit = 50 } = data;
            const history = await giftService.getGiftHistory(connection.playerId, limit);

            ctx.send(connection.ws, {
                type: 'gift_history',
                data: { history },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting gift history:', error);
            ctx.sendError(connection, 'Failed to get gift history');
        }
    }

    /**
     * Get gift cooldown info
     */
    static async handleGetGiftCooldown(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId } = data;
            const cooldownInfo = await giftService.getGiftCooldown(connection.playerId, targetId);

            ctx.send(connection.ws, {
                type: 'gift_cooldown',
                data: cooldownInfo,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting gift cooldown:', error);
            ctx.sendError(connection, 'Failed to get gift cooldown');
        }
    }

    /**
     * Get gift streak with a player
     */
    static async handleGetGiftStreak(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId } = data;
            const streakInfo = await giftService.getGiftStreak(connection.playerId, targetId);

            ctx.send(connection.ws, {
                type: 'gift_streak',
                data: streakInfo,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting gift streak:', error);
            ctx.sendError(connection, 'Failed to get gift streak');
        }
    }
}
