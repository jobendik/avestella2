// =============================================================================
// Gift Service - Manages player-to-player gift sending and receiving
// =============================================================================
// REFACTORED: Uses models from progressionModels.ts to avoid Mongoose conflicts
// =============================================================================

import { EventEmitter } from 'events';
import { Gift, GiftStreak, Progression, type IGift, type IGiftStreak } from '../database/progressionModels.js';
import { PlayerData } from '../database/playerDataModel.js';
import { cosmeticsService } from './CosmeticsService.js';

// ============================================
// GIFT CONFIG
// ============================================

const GIFT_COSTS: Record<string, { currency: 'stardust' | 'crystals'; amount: number }> = {
    stardust: { currency: 'stardust', amount: 100 },
    xpBoost: { currency: 'stardust', amount: 500 },
    cosmetic: { currency: 'crystals', amount: 50 },
    fragment: { currency: 'stardust', amount: 50 },
};

const GIFT_VALUES: Record<string, number> = {
    stardust: 50,      // Recipient gets 50 stardust
    xpBoost: 1,        // 1 hour XP boost
    cosmetic: 1,       // 1 random cosmetic
    fragment: 1,       // 1 fragment
};

const GIFT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours between gifts to same player

// ============================================
// GIFT SERVICE
// ============================================

class GiftService extends EventEmitter {
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('🎁 Gift service initialized');
    }

    /**
     * Send a gift to another player
     */
    async sendGift(
        fromId: string,
        _fromName: string,
        toId: string,
        giftType: string,
        amount: number = 1,
        message?: string
    ): Promise<{
        success: boolean;
        giftId?: string;
        remainingBalance?: number;
        error?: string;
    }> {
        try {
            // Validate gift type
            if (!GIFT_COSTS[giftType]) {
                return { success: false, error: 'Invalid gift type' };
            }

            // Check cooldown
            const cooldownInfo = await this.getGiftCooldown(fromId, toId);
            if (!cooldownInfo.canGift) {
                return { success: false, error: `Can gift again in ${Math.ceil(cooldownInfo.remainingMs / 60000)} minutes` };
            }

            // Get sender's balance
            const sender = await Progression.findOne({ playerId: fromId });
            if (!sender) {
                return { success: false, error: 'Sender not found' };
            }

            const cost = GIFT_COSTS[giftType];
            const totalCost = cost.amount * amount;

            // Check balance
            if (cost.currency === 'stardust') {
                if (sender.stardust < totalCost) {
                    return { success: false, error: 'Not enough stardust' };
                }
            } else if (cost.currency === 'crystals') {
                if ((sender.crystals || 0) < totalCost) {
                    return { success: false, error: 'Not enough crystals' };
                }
            }

            // Deduct from sender
            const updateField = cost.currency === 'stardust' ? 'stardust' : 'crystals';
            await Progression.findOneAndUpdate(
                { playerId: fromId },
                { $inc: { [updateField]: -totalCost } }
            );

            // Create gift using progressionModels Gift schema
            const gift = new Gift({
                fromPlayerId: fromId,
                toPlayerId: toId,
                giftType: giftType as 'stardust' | 'cosmetic' | 'xpBoost' | 'fragment',
                amount: GIFT_VALUES[giftType] * amount,
                message: message?.trim().substring(0, 100),
                claimed: false
            });
            await gift.save();

            // Update streak
            await this.updateGiftStreak(fromId, toId);

            // Get remaining balance
            const updatedSender = await Progression.findOne({ playerId: fromId });
            const remainingBalance = cost.currency === 'stardust'
                ? updatedSender?.stardust
                : updatedSender?.crystals;

            const giftId = gift._id?.toString() || '';
            this.emit('gift_sent', { giftId, fromId, toId, giftType });

            return {
                success: true,
                giftId,
                remainingBalance: remainingBalance || 0
            };
        } catch (error) {
            console.error('Error sending gift:', error);
            return { success: false, error: 'Failed to send gift' };
        }
    }

    /**
     * Claim a received gift
     */
    async claimGift(playerId: string, giftId: string): Promise<{
        success: boolean;
        giftType?: string;
        amount?: number;
        newBalance?: number;
        error?: string;
    }> {
        try {
            const gift = await Gift.findOne({
                _id: giftId,
                toPlayerId: playerId,
                claimed: false
            });

            if (!gift) {
                return { success: false, error: 'Gift not found or already claimed' };
            }

            // Mark as claimed
            gift.claimed = true;
            gift.claimedAt = new Date();
            await gift.save();

            // Award to recipient based on gift type
            let newBalance = 0;

            switch (gift.giftType) {
                case 'stardust':
                    const result1 = await Progression.findOneAndUpdate(
                        { playerId },
                        { $inc: { stardust: gift.amount } },
                        { new: true, upsert: true }
                    );
                    newBalance = result1?.stardust || 0;
                    break;

                case 'xpBoost':
                    // Add XP boost to active boosts
                    await PlayerData.findOneAndUpdate(
                        { playerId },
                        {
                            $push: {
                                activeBoosts: {
                                    type: 'xp_gift',
                                    multiplier: 1.5,
                                    expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour 
                                }
                            }
                        }
                    );
                    break;

                case 'cosmetic':
                    // Add random cosmetic
                    await cosmeticsService.grantRandomCosmetic(playerId, 'gift');
                    break;

                case 'fragment':
                    const result2 = await PlayerData.findOneAndUpdate(
                        { playerId },
                        { $inc: { fragments: gift.amount } },
                        { new: true, upsert: true }
                    );
                    newBalance = result2?.fragments || 0;
                    break;
            }

            this.emit('gift_claimed', { giftId, playerId, giftType: gift.giftType });

            return {
                success: true,
                giftType: gift.giftType,
                amount: gift.amount,
                newBalance
            };
        } catch (error) {
            console.error('Error claiming gift:', error);
            return { success: false, error: 'Failed to claim gift' };
        }
    }

    /**
     * Get pending (unclaimed) gifts for a player
     */
    async getPendingGifts(playerId: string): Promise<IGift[]> {
        try {
            return await Gift.find({
                toPlayerId: playerId,
                claimed: false
            }).sort({ createdAt: -1 }).limit(50);
        } catch (error) {
            console.error('Error getting pending gifts:', error);
            return [];
        }
    }

    /**
     * Get gift history (sent and received)
     */
    async getGiftHistory(playerId: string, limit: number = 50): Promise<{
        sent: IGift[];
        received: IGift[];
    }> {
        try {
            const [sent, received] = await Promise.all([
                Gift.find({ fromPlayerId: playerId })
                    .sort({ createdAt: -1 })
                    .limit(limit),
                Gift.find({ toPlayerId: playerId })
                    .sort({ createdAt: -1 })
                    .limit(limit)
            ]);

            return { sent, received };
        } catch (error) {
            console.error('Error getting gift history:', error);
            return { sent: [], received: [] };
        }
    }

    /**
     * Check gift cooldown between two players
     */
    async getGiftCooldown(fromId: string, toId: string): Promise<{
        canGift: boolean;
        remainingMs: number;
        lastGiftTime?: number;
    }> {
        try {
            const lastGift = await Gift.findOne({
                fromPlayerId: fromId,
                toPlayerId: toId
            }).sort({ createdAt: -1 });

            if (!lastGift) {
                return { canGift: true, remainingMs: 0 };
            }

            const timeSinceLastGift = Date.now() - lastGift.createdAt.getTime();
            const remainingMs = Math.max(0, GIFT_COOLDOWN - timeSinceLastGift);

            return {
                canGift: remainingMs === 0,
                remainingMs,
                lastGiftTime: lastGift.createdAt.getTime()
            };
        } catch (error) {
            console.error('Error getting gift cooldown:', error);
            return { canGift: true, remainingMs: 0 };
        }
    }

    /**
     * Get gift streak between two players
     * Note: Uses 'friendId' field name to match progressionModels.ts schema
     */
    async getGiftStreak(fromId: string, toId: string): Promise<IGiftStreak | null> {
        try {
            return await GiftStreak.findOne({ playerId: fromId, friendId: toId });
        } catch (error) {
            console.error('Error getting gift streak:', error);
            return null;
        }
    }

    /**
     * Update gift streak after sending a gift
     * Note: Uses 'friendId' field name to match progressionModels.ts schema
     */
    private async updateGiftStreak(fromId: string, toId: string): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];

            let streak = await GiftStreak.findOne({ playerId: fromId, friendId: toId });

            if (!streak) {
                streak = new GiftStreak({
                    playerId: fromId,
                    friendId: toId,  // progressionModels uses 'friendId' not 'targetId'
                    currentStreak: 1,
                    longestStreak: 1,
                    lastGiftDate: today,
                    totalGiftsSent: 1,
                    totalGiftsReceived: 0
                });
            } else {
                // Check if continuing streak (must be consecutive days)
                const lastDate = streak.lastGiftDate;
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                if (lastDate === yesterday) {
                    // Continuing streak
                    streak.currentStreak += 1;
                    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
                } else if (lastDate !== today) {
                    // Streak broken
                    streak.currentStreak = 1;
                }
                // If same day, don't increment streak

                streak.lastGiftDate = today;
                streak.totalGiftsSent += 1;
            }

            await streak.save();
        } catch (error) {
            console.error('Error updating gift streak:', error);
        }
    }
}

export const giftService = new GiftService();
export { GiftService };
