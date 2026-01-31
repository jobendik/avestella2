// =============================================================================
// Gift Streak Service - Complete backend service for daily gift exchanges
// =============================================================================

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { GiftStreak, DailyGiftLog, IGiftStreak, IDailyGiftLog } from '../database/socialModels.js';

// ============================================
// TYPES
// ============================================

interface GiftData {
    giftType: 'stardust' | 'crystal' | 'cosmetic' | 'xpBoost' | 'mysteryBox' | 'stardustBundle';
    amount: number;
    cosmeticId?: string;
    message?: string;
}

interface StreakMilestoneReward {
    milestone: number;
    rewards: {
        type: string;
        amount: number;
    }[];
}

interface SendGiftResult {
    gift: IDailyGiftLog;
    streak: IGiftStreak;
    milestoneReached: StreakMilestoneReward | null;
    streakIncreased: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const STREAK_MILESTONES: StreakMilestoneReward[] = [
    { milestone: 7, rewards: [{ type: 'stardust', amount: 500 }, { type: 'xpBoost', amount: 1 }] },
    { milestone: 14, rewards: [{ type: 'stardust', amount: 1000 }, { type: 'crystal', amount: 10 }] },
    { milestone: 30, rewards: [{ type: 'stardust', amount: 2500 }, { type: 'mysteryBox', amount: 1 }] },
    { milestone: 60, rewards: [{ type: 'stardust', amount: 5000 }, { type: 'crystal', amount: 50 }, { type: 'cosmetic_unlock', amount: 1 }] },
    { milestone: 90, rewards: [{ type: 'stardust', amount: 10000 }, { type: 'crystal', amount: 100 }, { type: 'exclusive_title', amount: 1 }] },
    { milestone: 180, rewards: [{ type: 'stardust', amount: 25000 }, { type: 'crystal', amount: 250 }, { type: 'legendary_cosmetic', amount: 1 }] },
    { milestone: 365, rewards: [{ type: 'stardust', amount: 100000 }, { type: 'crystal', amount: 1000 }, { type: 'eternal_flame_badge', amount: 1 }] },
];

const GIFT_EXPIRY_HOURS = 72; // 3 days to claim

// ============================================
// SERVICE CLASS
// ============================================

class GiftStreakService extends EventEmitter {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('🎁 Initializing Gift Streak Service...');

        // Schedule daily streak expiration check
        this.scheduleStreakExpirationCheck();

        this.initialized = true;
        console.log('🎁 Gift Streak Service initialized');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CORE GIFT OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Send a gift to a friend, updating streak data
     */
    async sendGift(
        senderId: string,
        senderName: string,
        receiverId: string,
        receiverName: string,
        giftData: GiftData
    ): Promise<SendGiftResult> {
        const today = this.getDateString();
        
        // Get or create streak record
        let streak = await GiftStreak.findOne({ playerId: senderId, friendId: receiverId });
        
        if (!streak) {
            streak = new GiftStreak({
                playerId: senderId,
                friendId: receiverId,
                currentStreak: 0,
                longestStreak: 0,
                lastGiftDate: '',
                lastReceivedDate: '',
                totalGiftsSent: 0,
                totalGiftsReceived: 0,
                milestonesClaimed: [],
                nextMilestone: 7,
                streakBroken: false,
                lastUpdated: new Date()
            });
        }

        // Check if already sent today
        if (streak.lastGiftDate === today) {
            throw new Error('Already sent a gift today');
        }

        // Calculate streak
        let streakIncreased = false;
        const yesterday = this.getDateString(-1);
        
        // Check if we received a gift from them recently (mutual exchange maintains streak)
        const reciprocalStreak = await GiftStreak.findOne({ playerId: receiverId, friendId: senderId });
        const theyGiftedYesterday = reciprocalStreak?.lastGiftDate === yesterday || reciprocalStreak?.lastGiftDate === today;
        
        if (streak.lastGiftDate === yesterday || theyGiftedYesterday) {
            // Streak continues
            streak.currentStreak++;
            streakIncreased = true;
        } else if (streak.lastGiftDate === '') {
            // First gift ever
            streak.currentStreak = 1;
            streakIncreased = true;
        } else {
            // Streak broken - start fresh
            if (streak.currentStreak > 0) {
                streak.streakBroken = true; // Flag for notification
            }
            streak.currentStreak = 1;
            streakIncreased = true;
        }

        // Update longest streak
        if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
        }

        // Update gift tracking
        streak.lastGiftDate = today;
        streak.totalGiftsSent++;
        streak.lastUpdated = new Date();

        // Calculate next milestone
        streak.nextMilestone = this.getNextMilestone(streak.currentStreak, streak.milestonesClaimed);

        // Check for milestone achievement
        let milestoneReached: StreakMilestoneReward | null = null;
        const achievedMilestone = STREAK_MILESTONES.find(
            m => streak!.currentStreak >= m.milestone && !streak!.milestonesClaimed.includes(m.milestone)
        );

        if (achievedMilestone) {
            milestoneReached = achievedMilestone;
            streak.milestonesClaimed.push(achievedMilestone.milestone);
        }

        await streak.save();

        // Create gift log
        const gift = new DailyGiftLog({
            giftId: crypto.randomBytes(12).toString('hex'),
            senderId,
            senderName,
            receiverId,
            receiverName,
            giftType: giftData.giftType,
            amount: giftData.amount,
            cosmeticId: giftData.cosmeticId,
            message: giftData.message,
            streakDay: streak.currentStreak,
            isBonusGift: !!milestoneReached,
            bonusRewards: milestoneReached?.rewards,
            claimedAt: null,
            expiresAt: new Date(Date.now() + GIFT_EXPIRY_HOURS * 60 * 60 * 1000)
        });

        await gift.save();

        // Update receiver's streak record (for tracking received gifts)
        await GiftStreak.findOneAndUpdate(
            { playerId: receiverId, friendId: senderId },
            { 
                $inc: { totalGiftsReceived: 1 },
                $set: { lastReceivedDate: today, lastUpdated: new Date() }
            },
            { upsert: true }
        );

        this.emit('gift_sent', {
            senderId,
            receiverId,
            giftId: gift.giftId,
            streak: streak.currentStreak,
            milestoneReached: milestoneReached?.milestone
        });

        return { gift, streak, milestoneReached, streakIncreased };
    }

    /**
     * Claim a received gift
     */
    async claimGift(giftId: string, playerId: string): Promise<IDailyGiftLog | null> {
        const gift = await DailyGiftLog.findOne({
            giftId,
            receiverId: playerId,
            claimedAt: null,
            expiresAt: { $gt: new Date() }
        });

        if (!gift) return null;

        gift.claimedAt = new Date();
        await gift.save();

        this.emit('gift_claimed', {
            giftId,
            receiverId: playerId,
            senderId: gift.senderId,
            type: gift.giftType,
            amount: gift.amount
        });

        return gift;
    }

    /**
     * Get all pending (unclaimed) gifts for a player
     */
    async getPendingGifts(playerId: string): Promise<IDailyGiftLog[]> {
        return DailyGiftLog.find({
            receiverId: playerId,
            claimedAt: null,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STREAK MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get streak data between two players
     */
    async getStreak(playerId: string, friendId: string): Promise<IGiftStreak | null> {
        return GiftStreak.findOne({ playerId, friendId });
    }

    /**
     * Get all streaks for a player
     */
    async getPlayerStreaks(playerId: string): Promise<IGiftStreak[]> {
        return GiftStreak.find({ playerId }).sort({ currentStreak: -1 });
    }

    /**
     * Get top streaks for a player (active ones)
     */
    async getActiveStreaks(playerId: string, limit: number = 10): Promise<IGiftStreak[]> {
        const today = this.getDateString();
        const yesterday = this.getDateString(-1);

        return GiftStreak.find({
            playerId,
            currentStreak: { $gt: 0 },
            lastGiftDate: { $in: [today, yesterday] }
        })
            .sort({ currentStreak: -1 })
            .limit(limit);
    }

    /**
     * Get friends with expiring streaks (haven't gifted today, but have active streak)
     */
    async getExpiringStreaks(playerId: string): Promise<IGiftStreak[]> {
        const today = this.getDateString();
        const yesterday = this.getDateString(-1);

        return GiftStreak.find({
            playerId,
            currentStreak: { $gt: 0 },
            lastGiftDate: yesterday // Gifted yesterday but not today
        }).sort({ currentStreak: -1 });
    }

    /**
     * Get streak leaderboard across all players
     */
    async getStreakLeaderboard(limit: number = 20): Promise<IGiftStreak[]> {
        return GiftStreak.find({ currentStreak: { $gt: 0 } })
            .sort({ currentStreak: -1 })
            .limit(limit);
    }

    /**
     * Claim a streak milestone reward
     */
    async claimMilestoneReward(
        playerId: string, 
        friendId: string, 
        milestone: number
    ): Promise<StreakMilestoneReward | null> {
        const streak = await GiftStreak.findOne({ playerId, friendId });
        if (!streak) return null;

        // Check if milestone is valid and hasn't been claimed
        const milestoneData = STREAK_MILESTONES.find(m => m.milestone === milestone);
        if (!milestoneData) return null;

        if (streak.milestonesClaimed.includes(milestone)) {
            throw new Error('Milestone already claimed');
        }

        if (streak.longestStreak < milestone) {
            throw new Error('Milestone not yet reached');
        }

        streak.milestonesClaimed.push(milestone);
        await streak.save();

        this.emit('milestone_claimed', {
            playerId,
            friendId,
            milestone,
            rewards: milestoneData.rewards
        });

        return milestoneData;
    }

    /**
     * Clear the "streak broken" notification flag
     */
    async acknowledgeStreakBroken(playerId: string, friendId: string): Promise<void> {
        await GiftStreak.updateOne(
            { playerId, friendId },
            { $set: { streakBroken: false } }
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GIFT HISTORY
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get sent gift history
     */
    async getSentGiftHistory(playerId: string, limit: number = 50): Promise<IDailyGiftLog[]> {
        return DailyGiftLog.find({ senderId: playerId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    /**
     * Get received gift history
     */
    async getReceivedGiftHistory(playerId: string, limit: number = 50): Promise<IDailyGiftLog[]> {
        return DailyGiftLog.find({ receiverId: playerId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    /**
     * Check if player can send gift to friend today
     */
    async canSendGiftToday(playerId: string, friendId: string): Promise<boolean> {
        const streak = await GiftStreak.findOne({ playerId, friendId });
        if (!streak) return true;
        return streak.lastGiftDate !== this.getDateString();
    }

    /**
     * Get friends who haven't received a gift today
     */
    async getFriendsToGift(playerId: string, friendIds: string[]): Promise<string[]> {
        const today = this.getDateString();
        
        const sentToday = await GiftStreak.find({
            playerId,
            friendId: { $in: friendIds },
            lastGiftDate: today
        }).select('friendId');

        const sentTodayIds = new Set(sentToday.map((s: IGiftStreak) => s.friendId));
        return friendIds.filter(id => !sentTodayIds.has(id));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATISTICS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get comprehensive gift statistics for a player
     */
    async getPlayerGiftStats(playerId: string): Promise<{
        totalGiftsSent: number;
        totalGiftsReceived: number;
        activeStreaks: number;
        longestEverStreak: number;
        currentLongestStreak: number;
        totalMilestonesClaimed: number;
        uniqueFriendsGifted: number;
    }> {
        const streaks = await GiftStreak.find({ playerId });
        
        const today = this.getDateString();
        const yesterday = this.getDateString(-1);

        let totalGiftsSent = 0;
        let totalGiftsReceived = 0;
        let activeStreaks = 0;
        let longestEverStreak = 0;
        let currentLongestStreak = 0;
        let totalMilestonesClaimed = 0;

        for (const streak of streaks) {
            totalGiftsSent += streak.totalGiftsSent;
            totalGiftsReceived += streak.totalGiftsReceived;
            totalMilestonesClaimed += streak.milestonesClaimed.length;

            if (streak.longestStreak > longestEverStreak) {
                longestEverStreak = streak.longestStreak;
            }

            const isActive = streak.lastGiftDate === today || streak.lastGiftDate === yesterday;
            if (isActive && streak.currentStreak > 0) {
                activeStreaks++;
                if (streak.currentStreak > currentLongestStreak) {
                    currentLongestStreak = streak.currentStreak;
                }
            }
        }

        return {
            totalGiftsSent,
            totalGiftsReceived,
            activeStreaks,
            longestEverStreak,
            currentLongestStreak,
            totalMilestonesClaimed,
            uniqueFriendsGifted: streaks.length
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private getDateString(offsetDays: number = 0): string {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return date.toISOString().split('T')[0];
    }

    private getNextMilestone(currentStreak: number, claimed: number[]): number {
        for (const milestone of STREAK_MILESTONES) {
            if (milestone.milestone > currentStreak && !claimed.includes(milestone.milestone)) {
                return milestone.milestone;
            }
        }
        return STREAK_MILESTONES[STREAK_MILESTONES.length - 1].milestone + 100; // Beyond all milestones
    }

    private scheduleStreakExpirationCheck(): void {
        // Check every hour for expiring streaks
        setInterval(async () => {
            const twoDaysAgo = this.getDateString(-2);

            // Mark streaks as broken if last gift was 2+ days ago
            const result = await GiftStreak.updateMany(
                {
                    currentStreak: { $gt: 0 },
                    lastGiftDate: { $lte: twoDaysAgo },
                    streakBroken: false
                },
                {
                    $set: { streakBroken: true, currentStreak: 0 }
                }
            );

            if (result.modifiedCount > 0) {
                console.log(`🔥 ${result.modifiedCount} streaks expired`);
            }
        }, 60 * 60 * 1000); // Every hour
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHUTDOWN
    // ─────────────────────────────────────────────────────────────────────────

    async shutdown(): Promise<void> {
        console.log('🎁 Gift Streak Service shutting down...');
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const giftStreakService = new GiftStreakService();
export { GiftStreakService };
