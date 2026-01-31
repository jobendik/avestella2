// =============================================================================
// Quest Handlers - Quest system
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { questService } from '../../services/QuestService.js';

export class QuestHandlers {
    /**
     * Get all player quests (daily, weekly, story)
     */
    static async handleGetQuests(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const quests = await questService.getPlayerQuests(connection.playerId);

            ctx.send(connection.ws, {
                type: 'quests_data',
                data: quests,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get quests:', error);
        }
    }

    /**
     * Get daily quests
     */
    static async handleGetDailyQuests(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const quests = await questService.getDailyQuests(connection.playerId);

            ctx.send(connection.ws, {
                type: 'daily_quests',
                data: { quests },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get daily quests:', error);
        }
    }

    /**
     * Get weekly quests
     */
    static async handleGetWeeklyQuests(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const quests = await questService.getWeeklyQuests(connection.playerId);

            ctx.send(connection.ws, {
                type: 'weekly_quests',
                data: { quests },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get weekly quests:', error);
        }
    }

    /**
     * Get available story quests
     */
    static async handleGetStoryQuests(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const quests = await questService.getAvailableStoryQuests(connection.playerId);

            ctx.send(connection.ws, {
                type: 'story_quests',
                data: { quests },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get story quests:', error);
        }
    }

    /**
     * Start a quest
     */
    static async handleStartQuest(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { questId } = data;

            if (!questId) {
                ctx.sendError(connection, 'Quest ID required');
                return;
            }

            const result = await questService.startQuest(connection.playerId, questId);

            if (result.success) {
                ctx.send(connection.ws, {
                    type: 'quest_started',
                    data: { questId },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, result.error || 'Cannot start quest');
            }
        } catch (error) {
            console.error('Failed to start quest:', error);
        }
    }

    /**
     * Update quest progress
     */
    static async handleUpdateQuestProgress(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { objectiveType, amount } = data;

            if (!objectiveType) {
                return;
            }

            const result = await questService.updateQuestProgress(
                connection.playerId,
                objectiveType,
                amount || 1
            );

            if (result.updated) {
                ctx.send(connection.ws, {
                    type: 'quest_progress_updated',
                    data: {
                        objectiveType,
                        completedQuests: result.completedQuests
                    },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to update quest progress:', error);
        }
    }

    /**
     * Claim quest reward
     */
    static async handleClaimQuestReward(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { questId } = data;

            if (!questId) {
                ctx.sendError(connection, 'Quest ID required');
                return;
            }

            const result = await questService.claimQuestReward(connection.playerId, questId);

            if (result.success) {
                ctx.send(connection.ws, {
                    type: 'quest_reward_claimed',
                    data: {
                        questId,
                        rewards: result.rewards
                    },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, result.error || 'Cannot claim reward');
            }
        } catch (error) {
            console.error('Failed to claim quest reward:', error);
        }
    }

    /**
     * Abandon quest
     */
    static async handleAbandonQuest(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { questId } = data;

            if (!questId) {
                ctx.sendError(connection, 'Quest ID required');
                return;
            }

            const success = await questService.abandonQuest(connection.playerId, questId);

            if (success) {
                ctx.send(connection.ws, {
                    type: 'quest_abandoned',
                    data: { questId },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, 'Cannot abandon quest');
            }
        } catch (error) {
            console.error('Failed to abandon quest:', error);
        }
    }

    /**
     * Get quest stats
     */
    static async handleGetQuestStats(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const stats = await questService.getQuestStats(connection.playerId);

            ctx.send(connection.ws, {
                type: 'quest_stats',
                data: stats,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get quest stats:', error);
        }
    }
}
