// =============================================================================
// Progression Handlers - Challenges, XP, Season Pass
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { progressionService } from '../../services/ProgressionService.js';

export class ProgressionHandlers {
    /**
     * Handle challenge progress update from client
     */
    static async handleChallengeProgress(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { type, amount } = data;
            const updateType = type || data.challengeType;
            const updateAmount = typeof amount === 'number' ? amount : 1;

            if (!updateType) return;

            await progressionService.updateChallengeProgress(connection.playerId, updateType, updateAmount);
            await progressionService.updateWeeklyChallengeProgress(connection.playerId, updateType, updateAmount);
        } catch (error) {
            console.error('Failed to update challenge progress:', error);
        }
    }

    /**
     * Request full progression data
     */
    static async handleRequestProgression(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const [progression, dailyChallenges, weeklyChallenges] = await Promise.all([
                progressionService.getProgression(connection.playerId),
                progressionService.getDailyChallenges(connection.playerId),
                progressionService.getWeeklyChallenges(connection.playerId)
            ]);

            ctx.send(connection.ws, {
                type: 'progression_data',
                data: {
                    ...progression,
                    dailyChallenges: dailyChallenges?.challenges || [],
                    weeklyChallenges: weeklyChallenges?.challenges || []
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get progression:', error);
        }
    }

    /**
     * Claim daily reward
     */
    static async handleClaimDailyReward(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const result = await progressionService.claimDailyReward(connection.playerId);

            ctx.send(connection.ws, {
                type: 'daily_reward_claimed',
                data: result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to claim daily reward:', error);
        }
    }

    /**
     * Claim challenge reward
     */
    static async handleClaimChallengeReward(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { challengeId } = data;

            // Use the unified claimChallengeReward method for both daily and weekly
            const result = await progressionService.claimChallengeReward(connection.playerId, challengeId);

            if (result?.success) {
                ctx.send(connection.ws, {
                    type: 'challenge_reward_claimed',
                    data: { challengeId, reward: result.reward },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to claim challenge reward:', error);
        }
    }

    /**
     * Claim season pass tier reward
     */
    static async handleClaimSeasonReward(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { tier } = data;
            const result = await progressionService.claimSeasonReward(connection.playerId, tier);

            ctx.send(connection.ws, {
                type: 'season_reward_claimed',
                data: result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to claim season reward:', error);
        }
    }

    /**
     * Purchase cosmetic
     */
    static async handlePurchaseCosmetic(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { cosmeticId, cost } = data;

            const progression = await progressionService.getProgression(connection.playerId);
            if (!progression || progression.stardust < cost) {
                ctx.sendError(connection, 'Insufficient stardust');
                return;
            }

            await progressionService.spendStardust(connection.playerId, cost);
            await progressionService.unlockCosmetic(connection.playerId, cosmeticId);

            ctx.send(connection.ws, {
                type: 'cosmetic_purchased',
                data: { cosmeticId, newStardust: progression.stardust - cost },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to purchase cosmetic:', error);
        }
    }

    /**
     * Equip cosmetic
     */
    static async handleEquipCosmetic(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { slot, cosmeticId } = data;
            await progressionService.equipCosmetic(connection.playerId, slot, cosmeticId);

            ctx.send(connection.ws, {
                type: 'cosmetic_equipped',
                data: { slot, cosmeticId },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to equip cosmetic:', error);
        }
    }

    // =========================================================================
    // Activity Feed
    // =========================================================================

    /**
     * Get activity feed for player
     */
    static async handleGetActivityFeed(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const limit = data?.limit || 50;
            const feed = await progressionService.getActivityFeed(connection.playerId, limit);
            const unreadCount = await progressionService.getUnreadCount(connection.playerId);

            ctx.send(connection.ws, {
                type: 'activity_feed',
                data: { 
                    feed,
                    unreadCount,
                    total: feed.length
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get activity feed:', error);
        }
    }

    /**
     * Mark activity feed items as read
     */
    static async handleMarkFeedRead(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { entryIds } = data;
            await progressionService.markFeedAsRead(connection.playerId, entryIds);

            ctx.send(connection.ws, {
                type: 'feed_marked_read',
                data: { 
                    entryIds: entryIds || 'all',
                    success: true
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to mark feed as read:', error);
        }
    }

    /**
     * Get unread count for activity feed
     */
    static async handleGetUnreadCount(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const unreadCount = await progressionService.getUnreadCount(connection.playerId);

            ctx.send(connection.ws, {
                type: 'unread_count',
                data: { unreadCount },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get unread count:', error);
        }
    }
}
