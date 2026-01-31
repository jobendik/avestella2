// API Routes for Progression, Challenges, Social, and Guilds
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { progressionService } from '../services/ProgressionService.js';

const router = Router();

// Rate limiting for progression endpoints
const progressionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many requests' }
});

// Validation schemas
const PlayerIdSchema = z.string().min(5).max(50).regex(/^[a-zA-Z0-9\-_]+$/);
const GuildNameSchema = z.string().min(3).max(30).regex(/^[a-zA-Z0-9\s\-_]+$/);
const GuildTagSchema = z.string().min(2).max(4).regex(/^[a-zA-Z0-9]+$/);

// Helper for error responses
function formatZodError(error: z.ZodError): string {
    return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
}

// ============================================
// DAILY CHALLENGES
// ============================================

router.get('/challenges/daily/:playerId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const validation = PlayerIdSchema.safeParse(playerId);
        if (!validation.success) {
            return res.status(400).json({ error: 'Invalid player ID' });
        }

        const challenges = await progressionService.getDailyChallenges(playerId);
        res.json(challenges);
    } catch (error) {
        console.error('Error fetching daily challenges:', error);
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
});

router.post('/challenges/daily/:playerId/progress', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { type, amount } = req.body;

        if (!type || typeof type !== 'string') {
            return res.status(400).json({ error: 'Challenge type required' });
        }

        const result = await progressionService.updateChallengeProgress(playerId, type, amount || 1);
        
        // Also update weekly challenge progress
        await progressionService.updateWeeklyChallengeProgress(playerId, type, amount || 1);
        
        res.json(result);
    } catch (error) {
        console.error('Error updating challenge progress:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

router.post('/challenges/daily/:playerId/claim/:challengeId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId, challengeId } = req.params;
        const result = await progressionService.claimChallengeReward(playerId, challengeId);
        
        if (result.success && result.reward) {
            // Apply rewards to player
            await progressionService.addStardust(playerId, result.reward.stardust);
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error claiming challenge reward:', error);
        res.status(500).json({ error: 'Failed to claim reward' });
    }
});

router.post('/challenges/daily/:playerId/reroll/:challengeId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId, challengeId } = req.params;
        const result = await progressionService.rerollChallenge(playerId, challengeId);
        res.json(result);
    } catch (error) {
        console.error('Error rerolling challenge:', error);
        res.status(500).json({ error: 'Failed to reroll challenge' });
    }
});

// ============================================
// WEEKLY CHALLENGES
// ============================================

router.get('/challenges/weekly/:playerId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const challenges = await progressionService.getWeeklyChallenges(playerId);
        res.json(challenges);
    } catch (error) {
        console.error('Error fetching weekly challenges:', error);
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
});

// ============================================
// PROGRESSION
// ============================================

router.get('/progression/:playerId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const progression = await progressionService.getProgression(playerId);
        res.json(progression);
    } catch (error) {
        console.error('Error fetching progression:', error);
        res.status(500).json({ error: 'Failed to fetch progression' });
    }
});

router.put('/progression/:playerId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const updates = req.body;
        
        // Filter allowed fields
        const allowedFields = ['equippedCosmetics'];
        const filteredUpdates: any = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }
        
        await progressionService.updateProgression(playerId, filteredUpdates);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating progression:', error);
        res.status(500).json({ error: 'Failed to update progression' });
    }
});

router.post('/progression/:playerId/daily-reward', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const result = await progressionService.claimDailyReward(playerId);
        res.json(result);
    } catch (error) {
        console.error('Error claiming daily reward:', error);
        res.status(500).json({ error: 'Failed to claim daily reward' });
    }
});

router.post('/progression/:playerId/stardust', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { amount } = req.body;
        
        if (typeof amount !== 'number') {
            return res.status(400).json({ error: 'Amount required' });
        }
        
        const newTotal = await progressionService.addStardust(playerId, amount);
        res.json({ success: true, stardust: newTotal });
    } catch (error) {
        console.error('Error adding stardust:', error);
        res.status(500).json({ error: 'Failed to add stardust' });
    }
});

router.post('/progression/:playerId/spend-stardust', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { amount } = req.body;
        
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount required' });
        }
        
        const result = await progressionService.spendStardust(playerId, amount);
        res.json(result);
    } catch (error) {
        console.error('Error spending stardust:', error);
        res.status(500).json({ error: 'Failed to spend stardust' });
    }
});

router.post('/progression/:playerId/season-xp', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { amount } = req.body;
        
        if (typeof amount !== 'number') {
            return res.status(400).json({ error: 'Amount required' });
        }
        
        const result = await progressionService.addSeasonXP(playerId, amount);
        res.json(result);
    } catch (error) {
        console.error('Error adding season XP:', error);
        res.status(500).json({ error: 'Failed to add season XP' });
    }
});

router.post('/progression/:playerId/season-reward/:tier', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId, tier } = req.params;
        const result = await progressionService.claimSeasonReward(playerId, parseInt(tier));
        res.json(result);
    } catch (error) {
        console.error('Error claiming season reward:', error);
        res.status(500).json({ error: 'Failed to claim season reward' });
    }
});

router.post('/progression/:playerId/rank-points', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { points } = req.body;
        
        if (typeof points !== 'number') {
            return res.status(400).json({ error: 'Points required' });
        }
        
        const result = await progressionService.addRankPoints(playerId, points);
        res.json(result);
    } catch (error) {
        console.error('Error adding rank points:', error);
        res.status(500).json({ error: 'Failed to add rank points' });
    }
});

router.post('/progression/:playerId/cosmetic/unlock', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { cosmeticId } = req.body;
        
        if (!cosmeticId) {
            return res.status(400).json({ error: 'Cosmetic ID required' });
        }
        
        const success = await progressionService.unlockCosmetic(playerId, cosmeticId);
        res.json({ success });
    } catch (error) {
        console.error('Error unlocking cosmetic:', error);
        res.status(500).json({ error: 'Failed to unlock cosmetic' });
    }
});

router.post('/progression/:playerId/cosmetic/equip', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { slot, cosmeticId } = req.body;
        
        const validSlots = ['trail', 'aura', 'pulse', 'color', 'title'];
        if (!validSlots.includes(slot)) {
            return res.status(400).json({ error: 'Invalid slot' });
        }
        
        const success = await progressionService.equipCosmetic(playerId, slot, cosmeticId);
        res.json({ success });
    } catch (error) {
        console.error('Error equipping cosmetic:', error);
        res.status(500).json({ error: 'Failed to equip cosmetic' });
    }
});

// ============================================
// GIFTS
// ============================================

router.post('/gifts/send', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { fromPlayerId, toPlayerId, giftType, amount, message } = req.body;
        
        if (!fromPlayerId || !toPlayerId || !giftType) {
            return res.status(400).json({ error: 'Required fields missing' });
        }
        
        const validTypes = ['stardust', 'cosmetic', 'xpBoost', 'fragment'];
        if (!validTypes.includes(giftType)) {
            return res.status(400).json({ error: 'Invalid gift type' });
        }
        
        const result = await progressionService.sendGift(fromPlayerId, toPlayerId, giftType, amount || 1, message);
        res.json(result);
    } catch (error) {
        console.error('Error sending gift:', error);
        res.status(500).json({ error: 'Failed to send gift' });
    }
});

router.get('/gifts/pending/:playerId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const gifts = await progressionService.getPendingGifts(playerId);
        res.json(gifts);
    } catch (error) {
        console.error('Error fetching pending gifts:', error);
        res.status(500).json({ error: 'Failed to fetch gifts' });
    }
});

router.post('/gifts/claim/:giftId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { giftId } = req.params;
        const { playerId } = req.body;
        
        if (!playerId) {
            return res.status(400).json({ error: 'Player ID required' });
        }
        
        const result = await progressionService.claimGift(playerId, giftId);
        res.json(result);
    } catch (error) {
        console.error('Error claiming gift:', error);
        res.status(500).json({ error: 'Failed to claim gift' });
    }
});

router.get('/gifts/streak/:playerId/:friendId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId, friendId } = req.params;
        const streak = await progressionService.getGiftStreak(playerId, friendId);
        res.json(streak || { currentStreak: 0, longestStreak: 0, totalGiftsSent: 0 });
    } catch (error) {
        console.error('Error fetching gift streak:', error);
        res.status(500).json({ error: 'Failed to fetch gift streak' });
    }
});

// ============================================
// GUILDS
// ============================================

router.post('/guilds/create', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { leaderId, name, tag, description } = req.body;
        
        const nameValidation = GuildNameSchema.safeParse(name);
        const tagValidation = GuildTagSchema.safeParse(tag);
        
        if (!nameValidation.success) {
            return res.status(400).json({ error: 'Invalid guild name', details: formatZodError(nameValidation.error) });
        }
        if (!tagValidation.success) {
            return res.status(400).json({ error: 'Invalid guild tag', details: formatZodError(tagValidation.error) });
        }
        
        const result = await progressionService.createGuild(leaderId, name, tag, description);
        res.json(result);
    } catch (error) {
        console.error('Error creating guild:', error);
        res.status(500).json({ error: 'Failed to create guild' });
    }
});

router.get('/guilds/:guildId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { guildId } = req.params;
        const guild = await progressionService.getGuild(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        res.json(guild);
    } catch (error) {
        console.error('Error fetching guild:', error);
        res.status(500).json({ error: 'Failed to fetch guild' });
    }
});

router.get('/guilds/search/:query', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { query } = req.params;
        const limit = parseInt(req.query.limit as string) || 20;
        const guilds = await progressionService.searchGuilds(query, limit);
        res.json(guilds);
    } catch (error) {
        console.error('Error searching guilds:', error);
        res.status(500).json({ error: 'Failed to search guilds' });
    }
});

router.post('/guilds/:guildId/join', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { guildId } = req.params;
        const { playerId } = req.body;
        
        if (!playerId) {
            return res.status(400).json({ error: 'Player ID required' });
        }
        
        const result = await progressionService.joinGuild(playerId, guildId);
        res.json(result);
    } catch (error) {
        console.error('Error joining guild:', error);
        res.status(500).json({ error: 'Failed to join guild' });
    }
});

router.post('/guilds/leave', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.body;
        
        if (!playerId) {
            return res.status(400).json({ error: 'Player ID required' });
        }
        
        const result = await progressionService.leaveGuild(playerId);
        res.json(result);
    } catch (error) {
        console.error('Error leaving guild:', error);
        res.status(500).json({ error: 'Failed to leave guild' });
    }
});

router.post('/guilds/:guildId/contribute', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId, stardust } = req.body;
        
        if (!playerId || typeof stardust !== 'number' || stardust <= 0) {
            return res.status(400).json({ error: 'Player ID and valid stardust amount required' });
        }
        
        const result = await progressionService.contributeToGuild(playerId, stardust);
        res.json(result);
    } catch (error) {
        console.error('Error contributing to guild:', error);
        res.status(500).json({ error: 'Failed to contribute to guild' });
    }
});

// ============================================
// ACTIVITY FEED
// ============================================

router.get('/feed/:playerId', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const feed = await progressionService.getActivityFeed(playerId, limit);
        res.json(feed);
    } catch (error) {
        console.error('Error fetching activity feed:', error);
        res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
});

router.post('/feed/:playerId/read', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { entryIds } = req.body;
        await progressionService.markFeedAsRead(playerId, entryIds);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking feed as read:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

router.get('/feed/:playerId/unread', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const count = await progressionService.getUnreadCount(playerId);
        res.json({ unreadCount: count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// ============================================
// LEADERBOARDS
// ============================================

router.get('/leaderboard/progression', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const sortBy = (req.query.sortBy as 'stardust' | 'rankPoints' | 'dailyLoginStreak' | 'totalLogins') || 'rankPoints';
        const limit = parseInt(req.query.limit as string) || 50;
        const leaderboard = await progressionService.getProgressionLeaderboard(sortBy, limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching progression leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

router.get('/leaderboard/guilds', progressionLimiter, async (req: Request, res: Response) => {
    try {
        const sortBy = (req.query.sortBy as 'level' | 'members' | 'contributions') || 'level';
        const limit = parseInt(req.query.limit as string) || 20;
        const leaderboard = await progressionService.getGuildLeaderboard(sortBy, limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching guild leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

export default router;
