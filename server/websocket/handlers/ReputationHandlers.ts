// =============================================================================
// Reputation Handlers - Player reputation system
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { reputationService } from '../../services/ReputationService.js';

export class ReputationHandlers {
    /**
     * Get player's reputation
     */
    static async handleRequestReputation(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const reputation = await reputationService.getReputation(connection.playerId);

            ctx.send(connection.ws, {
                type: 'reputation_data',
                data: reputation,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get reputation:', error);
        }
    }

    /**
     * Track a reputation action
     */
    static async handleTrackReputationAction(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { action, multiplier } = data;

            if (!action) {
                return;
            }

            const result = await reputationService.addReputationXP(
                connection.playerId,
                action,
                multiplier || 1
            );

            if (result && result.xpGained > 0) {
                ctx.send(connection.ws, {
                    type: 'reputation_updated',
                    data: {
                        action,
                        xpGained: result.xpGained,
                        track: result.track,
                        leveledUp: result.leveledUp
                    },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to track reputation action:', error);
        }
    }

    /**
     * Get track progress
     */
    static async handleGetTrackProgress(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { track } = data;

            if (!track) {
                ctx.sendError(connection, 'Track name required');
                return;
            }

            const progress = await reputationService.getTrackProgress(connection.playerId, track);

            ctx.send(connection.ws, {
                type: 'track_progress',
                data: { track, ...progress },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get track progress:', error);
        }
    }

    /**
     * Get reputation levels info (static data)
     */
    static handleGetReputationLevels(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            // Static level thresholds matching ReputationService
            const levels = [0, 100, 500, 1500, 4000, 8000, 15000, 30000, 50000, 100000];

            ctx.send(connection.ws, {
                type: 'reputation_levels',
                data: { levels },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get reputation levels:', error);
        }
    }

    /**
     * Claim reputation reward
     */
    static async handleClaimReputationReward(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { rewardId } = data;

            if (!rewardId) {
                ctx.sendError(connection, 'Reward ID required');
                return;
            }

            const success = await reputationService.claimReward(connection.playerId, rewardId);

            if (success) {
                ctx.send(connection.ws, {
                    type: 'reputation_reward_claimed',
                    data: { rewardId },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, 'Cannot claim reward');
            }
        } catch (error) {
            console.error('Failed to claim reward:', error);
        }
    }

    /**
     * Get reputation leaderboard for a track
     */
    static async handleGetReputationLeaderboard(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { track, limit } = data;

            if (!track) {
                ctx.sendError(connection, 'Track name required');
                return;
            }

            const leaderboard = await reputationService.getReputationLeaderboard(track, limit || 50);

            ctx.send(connection.ws, {
                type: 'reputation_leaderboard',
                data: { track, entries: leaderboard },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get reputation leaderboard:', error);
        }
    }

    /**
     * Get another player's public reputation
     */
    static async handleGetPlayerReputation(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { playerId } = data;

            if (!playerId) {
                ctx.sendError(connection, 'Player ID required');
                return;
            }

            const reputation = await reputationService.getReputation(playerId);

            // Return public view only (tracks and levels, not all details)
            ctx.send(connection.ws, {
                type: 'player_reputation',
                data: {
                    playerId,
                    tracks: reputation.tracks
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get player reputation:', error);
        }
    }
}
