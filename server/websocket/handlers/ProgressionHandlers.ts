// =============================================================================
// Progression Handlers - Challenges, XP, Season Pass
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { progressionService } from '../../services/ProgressionService.js';
import { playerDataService } from '../../services/PlayerDataService.js';
import { achievementService } from '../../services/AchievementService.js';

// Server-side achievement validation definitions
// Maps achievement IDs to their validation requirements
const ACHIEVEMENT_REQUIREMENTS: Map<string, {
    stat: string;
    target: number;
    compareFn?: (value: number, target: number) => boolean;
}> = new Map([
    ['beacon', { stat: 'beaconsLit', target: 1 }],
    ['master', { stat: 'beaconsLit', target: 5 }],
    ['collector', { stat: 'fragmentsCollected', target: 5 }],
    ['hoarder', { stat: 'fragmentsCollected', target: 50 }],
    ['social', { stat: 'connections', target: 10 }],
    ['popular', { stat: 'connections', target: 5 }],
    ['constellation', { stat: 'bondsFormed', target: 3 }],
    ['echo', { stat: 'echoesCreated', target: 1 }],
    ['storyteller', { stat: 'echoesCreated', target: 10 }],
    ['first_steps', { stat: 'fragmentsCollected', target: 1 }],
    ['light_seeker', { stat: 'fragmentsCollected', target: 25 }],
    ['light_master', { stat: 'fragmentsCollected', target: 100 }],
    ['stargazer', { stat: 'starsLit', target: 5 }],
    ['star_master', { stat: 'starsLit', target: 25 }],
    ['cosmic_wanderer', { stat: 'teleports', target: 10 }],
    ['realm_hopper', { stat: 'teleports', target: 50 }],
    ['bonded', { stat: 'bondsFormed', target: 1 }],
    ['soulmate', { stat: 'bondsFormed', target: 5 }],
    ['singer', { stat: 'sings', target: 10 }],
    ['chorus', { stat: 'sings', target: 50 }],
    ['pulsar', { stat: 'pulses', target: 10 }],
    ['nova', { stat: 'pulses', target: 50 }],
    ['generous', { stat: 'giftsGiven', target: 5 }],
    ['philanthropist', { stat: 'giftsGiven', target: 25 }],
    ['grateful', { stat: 'giftsReceived', target: 5 }],
    ['beloved', { stat: 'giftsReceived', target: 25 }],
    ['challenger', { stat: 'challengesCompleted', target: 5 }],
    ['completionist', { stat: 'challengesCompleted', target: 25 }],
    ['weekly_warrior', { stat: 'weeklyChallengesCompleted', target: 4 }],
    ['weekly_legend', { stat: 'weeklyChallengesCompleted', target: 12 }],
]);

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
    /**
     * Handle reroll challenge
     */
    static async handleRerollChallenge(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { challengeId } = data;
            // Logic to reroll would go here
            ctx.send(connection.ws, {
                type: 'challenge_rerolled',
                data: { challengeId, success: true }, // Simplified
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to reroll challenge:', error);
        }
    }

    /**
     * Handle update event progress
     */
    static async handleUpdateEventProgress(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            // Logic to update event progress
        } catch (error) {
            console.error('Failed to update event progress:', error);
        }
    }

    /**
     * Handle add achievement - SERVER-VALIDATED
     * Validates that the player actually meets achievement requirements before granting
     */
    static async handleAddAchievement(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { achievementId } = data;
            
            if (!achievementId || typeof achievementId !== 'string') {
                ctx.sendError(connection, 'Invalid achievement ID');
                return;
            }

            // 1. Get player data to check stats and existing achievements
            const playerData = await playerDataService.getPlayerData(connection.playerId);
            if (!playerData) {
                ctx.sendError(connection, 'Player data not found');
                return;
            }

            // 2. Check if already unlocked
            if (playerData.achievements.includes(achievementId)) {
                // Silently ignore duplicate unlock attempts
                return;
            }

            // 3. Validate achievement requirements
            const requirement = ACHIEVEMENT_REQUIREMENTS.get(achievementId);
            
            if (requirement) {
                // Get the stat value from player data
                const statValue = (playerData.stats as any)[requirement.stat] || 0;
                const compareFn = requirement.compareFn || ((v, t) => v >= t);
                
                if (!compareFn(statValue, requirement.target)) {
                    console.warn(`[Achievement] Rejected: ${achievementId} for ${connection.playerId} - stat ${requirement.stat}=${statValue}, required=${requirement.target}`);
                    ctx.sendError(connection, 'Achievement requirements not met');
                    return;
                }
            }
            // Note: If achievement not in our map, we still allow it (for tutorial/special achievements)
            // But we log it for monitoring
            if (!requirement) {
                console.log(`[Achievement] Unlocking unmapped achievement: ${achievementId} for ${connection.playerId}`);
            }

            // 4. Grant the achievement via service (persists to DB)
            await playerDataService.addAchievement(connection.playerId, achievementId);
            
            // 5. Also use achievementService for additional tracking/rewards
            const unlocked = await achievementService.unlockAchievement(connection.playerId, achievementId);
            
            // 6. Grant XP reward
            await progressionService.addXP(connection.playerId, 50, 'achievement');

            // 7. Notify client of successful unlock
            ctx.send(connection.ws, {
                type: 'achievement_unlocked',
                data: { 
                    achievementId,
                    validated: true,
                    xpAwarded: 50
                },
                timestamp: Date.now()
            });

            console.log(`[Achievement] Validated and unlocked: ${achievementId} for ${connection.playerId}`);
        } catch (error) {
            console.error('Failed to add achievement:', error);
            ctx.sendError(connection, 'Failed to unlock achievement');
        }
    }
}
