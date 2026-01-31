// =============================================================================
// World Event Handlers - Server-wide events and darkness system
// =============================================================================

import type { PlayerConnection, HandlerContext, WorldEvent } from '../types.js';
import { worldEventsService } from '../../services/WorldEventsService.js';
import { darknessService } from '../../services/DarknessService.js';
import { eventProgressService } from '../../services/EventProgressService.js';

export class WorldEventHandlers {
    /**
     * Get active world events
     */
    static handleGetWorldEvents(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const events = worldEventsService.getActiveEvents(connection.realm);

            ctx.send(connection.ws, {
                type: 'world_events',
                data: { events },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get world events:', error);
        }
    }

    /**
     * Join/participate in a world event
     */
    static async handleJoinWorldEvent(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { eventId, eventName } = data;

            if (!eventId) {
                ctx.sendError(connection, 'Event ID required');
                return;
            }

            const isNew = worldEventsService.participateInEvent(eventId, connection.playerId);
            
            // Persist player's event progress
            const progress = await eventProgressService.getPlayerProgress(
                connection.playerId,
                eventId,
                eventName
            );

            ctx.send(connection.ws, {
                type: 'event_joined',
                data: { 
                    eventId, 
                    isNewParticipant: isNew,
                    progress: {
                        contributions: progress.contributions,
                        totalContribution: progress.totalContribution,
                        rank: progress.rank
                    }
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to join event:', error);
        }
    }

    /**
     * Contribute to a world event (for goal-based events)
     */
    static async handleContributeToEvent(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { eventId, contribution, amount, eventName } = data;

            if (!eventId || !contribution) {
                return;
            }

            worldEventsService.updateEventProgress(eventId, contribution, amount || 1);
            worldEventsService.participateInEvent(eventId, connection.playerId);
            
            // Persist the contribution to MongoDB
            const result = await eventProgressService.addContribution(
                connection.playerId,
                eventId,
                contribution,
                amount || 1,
                eventName
            );

            ctx.send(connection.ws, {
                type: 'event_contribution',
                data: { 
                    eventId, 
                    contribution, 
                    amount: amount || 1,
                    newTotal: result.newTotal
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to contribute to event:', error);
        }
    }

    /**
     * Get player's event progress
     */
    static async handleGetEventProgress(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { eventId } = data;
            
            if (!eventId) {
                ctx.sendError(connection, 'Event ID required');
                return;
            }
            
            const progress = await eventProgressService.getPlayerProgress(
                connection.playerId,
                eventId
            );
            
            ctx.send(connection.ws, {
                type: 'event_progress',
                data: { 
                    eventId,
                    progress: {
                        contributions: progress.contributions,
                        totalContribution: progress.totalContribution,
                        rank: progress.rank,
                        rewardsClaimed: progress.rewardsClaimed
                    }
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get event progress:', error);
        }
    }

    /**
     * Get event leaderboard
     */
    static async handleGetEventLeaderboard(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { eventId, limit } = data;
            
            if (!eventId) {
                ctx.sendError(connection, 'Event ID required');
                return;
            }
            
            const leaderboard = await eventProgressService.getLeaderboard(eventId, limit || 50);
            
            ctx.send(connection.ws, {
                type: 'event_leaderboard',
                data: { eventId, leaderboard },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get event leaderboard:', error);
        }
    }

    /**
     * Claim event reward
     */
    static async handleClaimEventReward(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { eventId, rewardId } = data;
            
            if (!eventId || !rewardId) {
                ctx.sendError(connection, 'Event ID and Reward ID required');
                return;
            }
            
            const result = await eventProgressService.claimReward(
                connection.playerId,
                eventId,
                rewardId
            );
            
            ctx.send(connection.ws, {
                type: 'event_reward_claimed',
                data: { 
                    eventId, 
                    rewardId,
                    success: result.success,
                    alreadyClaimed: result.alreadyClaimed
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to claim event reward:', error);
        }
    }

    /**
     * Get event history
     */
    static handleGetEventHistory(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { limit } = data;
            const history = worldEventsService.getEventHistory(limit || 20);

            ctx.send(connection.ws, {
                type: 'event_history',
                data: { events: history },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get event history:', error);
        }
    }

    /**
     * Get current bonuses from active events
     * Note: Returns event data that may contain bonuses
     */
    static handleGetEventBonuses(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            // Get active events which may contain bonus information
            const events = worldEventsService.getActiveEvents(connection.realm);
            const bonuses = events
                .filter((e: any) => e.rewards)
                .map((e: any) => ({ eventId: e.id, ...e.rewards }));

            ctx.send(connection.ws, {
                type: 'event_bonuses',
                data: { bonuses },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get event bonuses:', error);
        }
    }

    // =========================================================================
    // Darkness System
    // =========================================================================

    /**
     * Get current darkness level
     */
    static handleGetDarknessLevel(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const realm = connection.realm || 'genesis';
            const level = darknessService.getDangerLevel(realm);
            const state = darknessService.getSerializedState(realm);

            ctx.send(connection.ws, {
                type: 'darkness_level',
                data: { 
                    level, 
                    intensity: state?.intensity || 0, 
                    phase: state?.phase || 'calm',
                    realm 
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get darkness level:', error);
        }
    }

    /**
     * Fight back darkness (collective action)
     * Note: Uses clearDarkness for emergency clear, or relies on beacon system
     */
    static handleFightDarkness(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { power } = data;
            const realm = connection.realm || 'genesis';

            // Darkness reduction is handled via beacon system
            // This just acknowledges the action
            ctx.send(connection.ws, {
                type: 'darkness_fought',
                data: { power: power || 1, realm },
                timestamp: Date.now()
            });

            // Send updated darkness state to realm
            if (ctx.realms.has(realm)) {
                const realmMap = ctx.realms.get(realm)!;
                const state = darknessService.getSerializedState(realm);
                
                for (const conn of Array.from(realmMap.values())) {
                    ctx.send(conn.ws, {
                        type: 'darkness_update',
                        data: state || { intensity: 0, phase: 'calm' },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fight darkness:', error);
        }
    }

    /**
     * Get darkness safe zones (beacon-protected areas)
     */
    static handleGetDarknessHazards(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const realm = connection.realm || 'genesis';
            const state = darknessService.getSerializedState(realm);
            const isInSafeZone = darknessService.isInSafeZone(realm, connection.x, connection.y);

            ctx.send(connection.ws, {
                type: 'darkness_hazards',
                data: { 
                    inSafeZone: isInSafeZone,
                    phase: state?.phase || 'calm',
                    intensity: state?.intensity || 0
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get darkness hazards:', error);
        }
    }
}
