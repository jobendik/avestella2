// API Routes for Player Data - Full state sync
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { playerDataService } from '../services/PlayerDataService.js';

const router = Router();

// Rate limiting
const dataLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: { error: 'Too many requests' }
});

router.use(dataLimiter);

// ============================================
// CORE DATA ENDPOINTS
// ============================================

// Get full player data
router.get('/player/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.getOrCreatePlayerData(playerId);
        res.json(data);
    } catch (error) {
        console.error('Get player data error:', error);
        res.status(500).json({ error: 'Failed to get player data' });
    }
});

// Update player data (partial)
router.patch('/player/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const updates = req.body;
        const data = await playerDataService.updatePlayerData(playerId, updates);
        res.json(data);
    } catch (error) {
        console.error('Update player data error:', error);
        res.status(500).json({ error: 'Failed to update player data' });
    }
});

// ============================================
// PROGRESSION ENDPOINTS
// ============================================

router.patch('/player/:playerId/progression', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.updateProgression(playerId, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update progression' });
    }
});

// ============================================
// STATS ENDPOINTS
// ============================================

router.patch('/player/:playerId/stats', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.updateStats(playerId, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update stats' });
    }
});

router.post('/player/:playerId/stats/increment', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { stat, amount } = req.body;
        const data = await playerDataService.incrementStat(playerId, stat, amount);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to increment stat' });
    }
});

// ============================================
// SETTINGS ENDPOINTS
// ============================================

router.patch('/player/:playerId/settings', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.updateSettings(playerId, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ============================================
// COSMETICS ENDPOINTS
// ============================================

router.patch('/player/:playerId/cosmetics', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.updateCosmetics(playerId, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update cosmetics' });
    }
});

router.post('/player/:playerId/cosmetics/purchase', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { itemId } = req.body;
        const data = await playerDataService.addOwnedCosmetic(playerId, itemId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to purchase cosmetic' });
    }
});

// ============================================
// COMPANIONS ENDPOINTS
// ============================================

router.patch('/player/:playerId/companions', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.updateCompanions(playerId, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update companions' });
    }
});

router.post('/player/:playerId/companions/add', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { companionId } = req.body;
        const data = await playerDataService.addCompanion(playerId, companionId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add companion' });
    }
});

// ============================================
// EXPLORATION ENDPOINTS
// ============================================

router.patch('/player/:playerId/exploration', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.updateExploration(playerId, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update exploration' });
    }
});

router.post('/player/:playerId/exploration/discover', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { id, type } = req.body;
        const data = await playerDataService.addDiscovery(playerId, { id, type });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add discovery' });
    }
});

// ============================================
// QUESTS ENDPOINTS
// ============================================

router.patch('/player/:playerId/quests', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.updateQuests(playerId, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update quests' });
    }
});

router.post('/player/:playerId/quests/progress', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { questId, progress } = req.body;
        const data = await playerDataService.updateQuestProgress(playerId, questId, progress);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update quest progress' });
    }
});

router.post('/player/:playerId/quests/complete', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { questId } = req.body;
        const data = await playerDataService.completeQuest(playerId, questId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to complete quest' });
    }
});

// ============================================
// ANCHORING ENDPOINTS
// ============================================

router.patch('/player/:playerId/anchoring', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.updateAnchoring(playerId, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update anchoring' });
    }
});

router.post('/player/:playerId/anchoring/session', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { type, duration } = req.body;
        const data = await playerDataService.addAnchoringSession(playerId, { type, duration });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add anchoring session' });
    }
});

// ============================================
// GAME STATE ENDPOINTS
// ============================================

router.patch('/player/:playerId/gamestate', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await playerDataService.updateGameState(playerId, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update game state' });
    }
});

router.post('/player/:playerId/bonds', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { targetId, strength, type } = req.body;
        const data = await playerDataService.addBond(playerId, { targetId, strength, type });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add bond' });
    }
});

router.post('/player/:playerId/starmemory', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { starId, memory } = req.body;
        const data = await playerDataService.addStarMemory(playerId, { starId, memory });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add star memory' });
    }
});

// ============================================
// ACHIEVEMENTS ENDPOINTS
// ============================================

router.post('/player/:playerId/achievements', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { achievementId } = req.body;
        const data = await playerDataService.addAchievement(playerId, achievementId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add achievement' });
    }
});

// ============================================
// DAILY LOGIN ENDPOINTS
// ============================================

router.post('/player/:playerId/daily-login', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const result = await playerDataService.processDailyLogin(playerId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to process daily login' });
    }
});

// ============================================
// SOCIAL ENDPOINTS
// ============================================

router.post('/player/:playerId/friends/add', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { friendId } = req.body;
        const data = await playerDataService.addFriend(playerId, friendId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add friend' });
    }
});

router.post('/player/:playerId/friends/remove', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { friendId } = req.body;
        const data = await playerDataService.removeFriend(playerId, friendId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

router.post('/player/:playerId/block', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { blockedId } = req.body;
        const data = await playerDataService.blockPlayer(playerId, blockedId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to block player' });
    }
});

// ============================================
// LEADERBOARD ENDPOINTS
// ============================================

router.get('/leaderboards/:type', async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const validTypes = ['xp', 'stardust', 'rankPoints', 'challenges'];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid leaderboard type' });
        }
        
        const data = await playerDataService.getLeaderboard(type as any, limit);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

router.get('/leaderboards/:type/rank/:playerId', async (req: Request, res: Response) => {
    try {
        const { type, playerId } = req.params;
        const validTypes = ['xp', 'stardust', 'rankPoints', 'challenges'];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid leaderboard type' });
        }
        
        const rank = await playerDataService.getPlayerRank(playerId, type as any);
        res.json({ rank });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get player rank' });
    }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

router.post('/player/:playerId/analytics/session', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { action } = req.body;
        await playerDataService.trackSession(playerId, action);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track session' });
    }
});

router.post('/player/:playerId/analytics/event', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { type, data } = req.body;
        await playerDataService.addAnalyticsEvent(playerId, { type, data });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add analytics event' });
    }
});

router.post('/player/:playerId/analytics/milestone', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { milestoneId } = req.body;
        const data = await playerDataService.addMilestone(playerId, milestoneId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add milestone' });
    }
});

export default router;
