// =============================================================================
// Gift Streak Routes - REST API endpoints for gift exchange system
// =============================================================================

import { Router, Request, Response } from 'express';
import { giftStreakService } from '../services/GiftStreakService.js';
import { IGiftStreak, IDailyGiftLog } from '../database/socialModels.js';

const router = Router();

// ============================================
// MIDDLEWARE - Extract player info from auth
// ============================================

interface AuthenticatedRequest extends Request {
    playerId?: string;
    playerName?: string;
}

// ============================================
// GIFT OPERATIONS
// ============================================

// Send a gift to a friend
router.post('/send', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { receiverId, receiverName, giftType, amount, cosmeticId, message } = req.body;
        const senderId = req.playerId || req.body.senderId;
        const senderName = req.playerName || req.body.senderName;

        if (!senderId || !senderName || !receiverId || !receiverName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!giftType) {
            return res.status(400).json({ error: 'Gift type is required' });
        }

        const validTypes = ['stardust', 'crystal', 'cosmetic', 'xpBoost', 'mysteryBox', 'stardustBundle'];
        if (!validTypes.includes(giftType)) {
            return res.status(400).json({ error: 'Invalid gift type' });
        }

        const result = await giftStreakService.sendGift(
            senderId,
            senderName,
            receiverId,
            receiverName,
            { giftType, amount: amount || 1, cosmeticId, message }
        );

        res.status(201).json({
            success: true,
            gift: result.gift,
            streak: {
                current: result.streak.currentStreak,
                longest: result.streak.longestStreak,
                totalSent: result.streak.totalGiftsSent
            },
            streakIncreased: result.streakIncreased,
            milestoneReached: result.milestoneReached
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to send gift' });
    }
});

// Claim a received gift
router.post('/claim/:giftId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { giftId } = req.params;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        const gift = await giftStreakService.claimGift(giftId, playerId);

        if (!gift) {
            return res.status(404).json({ error: 'Gift not found or already claimed' });
        }

        res.json({
            success: true,
            gift: {
                type: gift.giftType,
                amount: gift.amount,
                cosmeticId: gift.cosmeticId,
                bonusRewards: gift.bonusRewards
            }
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to claim gift' });
    }
});

// Get pending (unclaimed) gifts
router.get('/pending/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;

        const gifts = await giftStreakService.getPendingGifts(playerId);

        res.json({
            success: true,
            gifts: gifts.map((g: IDailyGiftLog) => ({
                giftId: g.giftId,
                senderId: g.senderId,
                senderName: g.senderName,
                giftType: g.giftType,
                amount: g.amount,
                message: g.message,
                streakDay: g.streakDay,
                isBonusGift: g.isBonusGift,
                expiresAt: g.expiresAt,
                createdAt: g.createdAt
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get pending gifts' });
    }
});

// ============================================
// STREAK DATA
// ============================================

// Get streak with specific friend
router.get('/streak/:playerId/:friendId', async (req: Request, res: Response) => {
    try {
        const { playerId, friendId } = req.params;

        const streak = await giftStreakService.getStreak(playerId, friendId);

        if (!streak) {
            return res.json({
                success: true,
                streak: {
                    current: 0,
                    longest: 0,
                    totalSent: 0,
                    totalReceived: 0,
                    nextMilestone: 7
                }
            });
        }

        res.json({
            success: true,
            streak: {
                current: streak.currentStreak,
                longest: streak.longestStreak,
                totalSent: streak.totalGiftsSent,
                totalReceived: streak.totalGiftsReceived,
                lastGiftDate: streak.lastGiftDate,
                nextMilestone: streak.nextMilestone,
                milestonesClaimed: streak.milestonesClaimed,
                streakBroken: streak.streakBroken
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get streak' });
    }
});

// Get all streaks for a player
router.get('/streaks/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;

        const streaks = await giftStreakService.getPlayerStreaks(playerId);

        res.json({
            success: true,
            streaks: streaks.map((s: IGiftStreak) => ({
                friendId: s.friendId,
                current: s.currentStreak,
                longest: s.longestStreak,
                totalSent: s.totalGiftsSent,
                totalReceived: s.totalGiftsReceived,
                lastGiftDate: s.lastGiftDate,
                nextMilestone: s.nextMilestone
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get streaks' });
    }
});

// Get active (non-expired) streaks
router.get('/streaks/:playerId/active', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;

        const streaks = await giftStreakService.getActiveStreaks(playerId, limit);

        res.json({
            success: true,
            streaks: streaks.map((s: IGiftStreak) => ({
                friendId: s.friendId,
                current: s.currentStreak,
                longest: s.longestStreak,
                lastGiftDate: s.lastGiftDate,
                nextMilestone: s.nextMilestone
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get active streaks' });
    }
});

// Get expiring streaks (need to gift today)
router.get('/streaks/:playerId/expiring', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;

        const streaks = await giftStreakService.getExpiringStreaks(playerId);

        res.json({
            success: true,
            expiring: streaks.map((s: IGiftStreak) => ({
                friendId: s.friendId,
                current: s.currentStreak,
                lastGiftDate: s.lastGiftDate
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get expiring streaks' });
    }
});

// ============================================
// MILESTONES
// ============================================

// Claim a milestone reward
router.post('/milestone/claim', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { friendId, milestone } = req.body;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId || !friendId || !milestone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const reward = await giftStreakService.claimMilestoneReward(playerId, friendId, milestone);

        if (!reward) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        res.json({
            success: true,
            milestone: reward.milestone,
            rewards: reward.rewards
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to claim milestone' });
    }
});

// Acknowledge streak broken notification
router.post('/streak/acknowledge', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { friendId } = req.body;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId || !friendId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await giftStreakService.acknowledgeStreakBroken(playerId, friendId);

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to acknowledge' });
    }
});

// ============================================
// HISTORY
// ============================================

// Get sent gift history
router.get('/history/sent/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const gifts = await giftStreakService.getSentGiftHistory(playerId, limit);

        res.json({
            success: true,
            gifts: gifts.map((g: IDailyGiftLog) => ({
                giftId: g.giftId,
                receiverId: g.receiverId,
                receiverName: g.receiverName,
                giftType: g.giftType,
                amount: g.amount,
                streakDay: g.streakDay,
                createdAt: g.createdAt
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get sent history' });
    }
});

// Get received gift history
router.get('/history/received/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const gifts = await giftStreakService.getReceivedGiftHistory(playerId, limit);

        res.json({
            success: true,
            gifts: gifts.map((g: IDailyGiftLog) => ({
                giftId: g.giftId,
                senderId: g.senderId,
                senderName: g.senderName,
                giftType: g.giftType,
                amount: g.amount,
                streakDay: g.streakDay,
                claimedAt: g.claimedAt,
                createdAt: g.createdAt
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get received history' });
    }
});

// ============================================
// STATISTICS
// ============================================

// Get comprehensive gift statistics
router.get('/stats/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;

        const stats = await giftStreakService.getPlayerGiftStats(playerId);

        res.json({
            success: true,
            stats
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get stats' });
    }
});

// Check if can send gift today
router.get('/can-send/:playerId/:friendId', async (req: Request, res: Response) => {
    try {
        const { playerId, friendId } = req.params;

        const canSend = await giftStreakService.canSendGiftToday(playerId, friendId);

        res.json({
            success: true,
            canSend
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to check' });
    }
});

// Get friends who haven't been gifted today
router.post('/friends-to-gift', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { friendIds } = req.body;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId || !Array.isArray(friendIds)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const toGift = await giftStreakService.getFriendsToGift(playerId, friendIds);

        res.json({
            success: true,
            friendsToGift: toGift
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get friends' });
    }
});

// ============================================
// LEADERBOARD
// ============================================

// Get streak leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;

        const streaks = await giftStreakService.getStreakLeaderboard(limit);

        res.json({
            success: true,
            leaderboard: streaks.map((s: IGiftStreak, index: number) => ({
                rank: index + 1,
                playerId: s.playerId,
                friendId: s.friendId,
                streak: s.currentStreak,
                longest: s.longestStreak
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get leaderboard' });
    }
});

export default router;
