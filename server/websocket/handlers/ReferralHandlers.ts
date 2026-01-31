// =============================================================================
// Referral Handlers - WebSocket message handlers for referral system
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { referralService } from '../../services/ReferralService.js';
import { notificationService } from '../../services/NotificationService.js';

export class ReferralHandlers {
    /**
     * Generate a referral code for the player
     */
    static async handleGenerateCode(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const result = await referralService.generateReferralCode(
                connection.playerId,
                connection.playerName || 'Player'
            );

            ctx.send(connection.ws, {
                type: 'referral_code_generated',
                data: result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error generating referral code:', error);
            ctx.send(connection.ws, {
                type: 'referral_error',
                data: { error: 'Failed to generate referral code' },
                timestamp: Date.now()
            });
        }
    }

    /**
     * Apply a referral code (new player using someone's code)
     */
    static async handleApplyReferral(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { code } = data;
            if (!code) {
                ctx.send(connection.ws, {
                    type: 'referral_error',
                    data: { error: 'No referral code provided' },
                    timestamp: Date.now()
                });
                return;
            }

            const result = await referralService.applyReferralCode(
                connection.playerId,
                code.toUpperCase()
            );

            ctx.send(connection.ws, {
                type: 'referral_applied',
                data: result,
                timestamp: Date.now()
            });

            if (result.success && result.referrerId) {
                // Notify the referrer
                notificationService.notify(result.referrerId, {
                    type: 'referral',
                    title: 'New Referral!',
                    message: `${connection.playerName || 'Someone'} used your referral code!`
                });

                // If referrer is online, send them an update
                const referrerConn = ctx.connections.get(result.referrerId);
                if (referrerConn) {
                    ctx.send(referrerConn.ws, {
                        type: 'referral_used',
                        data: {
                            playerId: connection.playerId,
                            playerName: connection.playerName
                        },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Error applying referral:', error);
            ctx.send(connection.ws, {
                type: 'referral_error',
                data: { error: 'Failed to apply referral code' },
                timestamp: Date.now()
            });
        }
    }

    /**
     * Get referral stats for the player
     */
    static async handleGetReferralStats(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const stats = await referralService.getReferralStats(connection.playerId);

            ctx.send(connection.ws, {
                type: 'referral_stats',
                data: stats,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting referral stats:', error);
        }
    }

    /**
     * Get list of referred players
     */
    static async handleGetReferredPlayers(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const referred = await referralService.getReferredPlayers(connection.playerId);

            // Add online status
            const referredWithStatus = referred.map((player: any) => ({
                ...player,
                isOnline: ctx.connections.has(player.playerId)
            }));

            ctx.send(connection.ws, {
                type: 'referred_players',
                data: { players: referredWithStatus },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting referred players:', error);
        }
    }

    /**
     * Claim referral milestone reward
     */
    static async handleClaimReferralReward(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { milestoneId } = data;
            if (!milestoneId) return;

            const result = await referralService.claimMilestoneReward(
                connection.playerId,
                milestoneId
            );

            ctx.send(connection.ws, {
                type: 'referral_reward_claimed',
                data: result,
                timestamp: Date.now()
            });

            if (result.success) {
                notificationService.notify(connection.playerId, {
                    type: 'reward',
                    title: 'Referral Reward!',
                    message: `You earned ${result.reward?.amount} ${result.reward?.type}!`
                });
            }
        } catch (error) {
            console.error('Error claiming referral reward:', error);
        }
    }

    /**
     * Get referral code info (for sharing)
     */
    static async handleGetMyReferralCode(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const codeInfo = await referralService.getPlayerReferralCode(connection.playerId);

            ctx.send(connection.ws, {
                type: 'my_referral_code',
                data: codeInfo,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting referral code:', error);
        }
    }

    /**
     * Check if a referral code is valid (preview before applying)
     */
    static async handleValidateReferralCode(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { code } = data;
            if (!code) return;

            const result = await referralService.validateCode(code.toUpperCase());

            ctx.send(connection.ws, {
                type: 'referral_code_validated',
                data: {
                    code: code.toUpperCase(),
                    isValid: result.isValid,
                    ownerName: result.ownerName,
                    error: result.error
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error validating referral code:', error);
        }
    }
}
