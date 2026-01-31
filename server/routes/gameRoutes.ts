// Game Routes - Routes for leaderboard, companions, quests, achievements, and analytics
// Complements existing progressionRoutes and socialRoutes

import express, { Request, Response, Router } from 'express';
import { leaderboardService } from '../services/LeaderboardService';
import { companionService } from '../services/CompanionService';
import { questService } from '../services/QuestService';
import { achievementService } from '../services/AchievementService';
import { analyticsService } from '../services/AnalyticsService';

const router: Router = express.Router();

// ============================================
// LEADERBOARD ROUTES
// ============================================

// Get leaderboard for a category
router.get('/leaderboard/:category', async (req: Request, res: Response) => {
    try {
        const { category } = req.params;
        const limit = parseInt(req.query.limit as string) || 100;
        
        // Map route categories to service categories
        const categoryMap: Record<string, string> = {
            'stardust': 'stardust',
            'level': 'xp',
            'bonds': 'connections',
            'reputation': 'reputation_explorer',
            'challenges': 'challenges',
            'stars': 'stars',
            'xp': 'xp'
        };
        
        const validCategories = Object.keys(categoryMap);
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid leaderboard category' });
        }
        
        const leaderboard = await leaderboardService.getLeaderboard(
            categoryMap[category] as any,
            limit
        );
        
        res.json({ leaderboard });
    } catch (error) {
        console.error('[Leaderboard] Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Get player rank in a category
router.get('/leaderboard/:category/:playerId', async (req: Request, res: Response) => {
    try {
        const { category, playerId } = req.params;
        
        const rankInfo = await leaderboardService.getPlayerRank(playerId, category as any);
        
        if (!rankInfo) {
            return res.status(404).json({ error: 'Player not found in leaderboard' });
        }
        
        res.json(rankInfo);
    } catch (error) {
        console.error('[Leaderboard] Error fetching player rank:', error);
        res.status(500).json({ error: 'Failed to fetch player rank' });
    }
});

// Update leaderboard entry - leaderboard updates automatically from player data
router.post('/leaderboard/update', async (req: Request, res: Response) => {
    try {
        // Leaderboard is derived from player data, no direct updates needed
        res.json({ success: true, message: 'Leaderboard updates automatically' });
    } catch (error) {
        console.error('[Leaderboard] Error updating score:', error);
        res.status(500).json({ error: 'Failed to update leaderboard' });
    }
});

// ============================================
// COMPANION ROUTES
// ============================================

// Get player's companion data
router.get('/companions/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const data = await companionService.getCompanionData(playerId);
        
        res.json({
            ownedCompanions: data.ownedCompanions,
            activeCompanionId: data.equippedCompanionId,
            totalXpEarned: data.totalCompanionXPEarned
        });
    } catch (error) {
        console.error('[Companions] Error fetching companions:', error);
        res.status(500).json({ error: 'Failed to fetch companions' });
    }
});

// Get active companion with bonuses
router.get('/companions/:playerId/active', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { companion, data } = await companionService.getEquippedCompanion(playerId);
        
        if (!companion || !data) {
            return res.json({ active: null });
        }
        
        res.json({ 
            active: { ...data, config: companion },
            bonuses: { effectType: companion.effectType, effectValue: companion.effectValue }
        });
    } catch (error) {
        console.error('[Companions] Error fetching active companion:', error);
        res.status(500).json({ error: 'Failed to fetch active companion' });
    }
});

// Unlock a companion
router.post('/companions/:playerId/unlock', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { companionId } = req.body;
        
        if (!companionId) {
            return res.status(400).json({ error: 'Missing companionId' });
        }
        
        const result = await companionService.unlockCompanion(playerId, companionId);
        
        if (!result) {
            return res.status(400).json({ error: 'Already owned or invalid companion' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Companions] Error unlocking companion:', error);
        res.status(500).json({ error: 'Failed to unlock companion' });
    }
});

// Set active companion
router.post('/companions/:playerId/set-active', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { companionId } = req.body;
        
        const success = await companionService.equipCompanion(playerId, companionId);
        
        if (!success) {
            return res.status(400).json({ error: 'Cannot equip companion' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Companions] Error setting active companion:', error);
        res.status(500).json({ error: 'Failed to set active companion' });
    }
});

// Add XP to companion
router.post('/companions/:playerId/add-xp', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { companionId, xp } = req.body;
        
        if (!companionId || !xp) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const result = await companionService.addCompanionXP(playerId, companionId, xp);
        
        res.json(result);
    } catch (error) {
        console.error('[Companions] Error adding XP:', error);
        res.status(500).json({ error: 'Failed to add companion XP' });
    }
});

// Get companion catalog
router.get('/companions/catalog/all', async (_req: Request, res: Response) => {
    try {
        // Return all companion configs from the service
        res.json({ companions: [] }); // Catalog endpoint - configs are client-side
    } catch (error) {
        console.error('[Companions] Error fetching catalog:', error);
        res.status(500).json({ error: 'Failed to fetch companion catalog' });
    }
});

// ============================================
// QUEST ROUTES
// ============================================

// Get daily quests
router.get('/quests/:playerId/daily', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const quests = await questService.getDailyQuests(playerId);
        
        res.json({ quests });
    } catch (error) {
        console.error('[Quests] Error fetching daily quests:', error);
        res.status(500).json({ error: 'Failed to fetch daily quests' });
    }
});

// Get weekly quests
router.get('/quests/:playerId/weekly', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const quests = await questService.getWeeklyQuests(playerId);
        
        res.json({ quests });
    } catch (error) {
        console.error('[Quests] Error fetching weekly quests:', error);
        res.status(500).json({ error: 'Failed to fetch weekly quests' });
    }
});

// Get available story quests
router.get('/quests/:playerId/story', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const quests = await questService.getAvailableStoryQuests(playerId);
        
        res.json({ quests });
    } catch (error) {
        console.error('[Quests] Error fetching story quests:', error);
        res.status(500).json({ error: 'Failed to fetch story quests' });
    }
});

// Get quest stats
router.get('/quests/:playerId/stats', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const stats = await questService.getQuestStats(playerId);
        
        res.json(stats);
    } catch (error) {
        console.error('[Quests] Error fetching quest stats:', error);
        res.status(500).json({ error: 'Failed to fetch quest stats' });
    }
});

// Start a quest
router.post('/quests/:playerId/start', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { questId } = req.body;
        
        if (!questId) {
            return res.status(400).json({ error: 'Missing questId' });
        }
        
        const result = await questService.startQuest(playerId, questId);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Quests] Error starting quest:', error);
        res.status(500).json({ error: 'Failed to start quest' });
    }
});

// Update quest progress
router.post('/quests/:playerId/progress', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { objectiveType, amount } = req.body;
        
        if (!objectiveType) {
            return res.status(400).json({ error: 'Missing objectiveType' });
        }
        
        const result = await questService.updateQuestProgress(playerId, objectiveType, amount || 1);
        
        res.json(result);
    } catch (error) {
        console.error('[Quests] Error updating progress:', error);
        res.status(500).json({ error: 'Failed to update quest progress' });
    }
});

// Claim quest reward
router.post('/quests/:playerId/claim', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { questId } = req.body;
        
        if (!questId) {
            return res.status(400).json({ error: 'Missing questId' });
        }
        
        const result = await questService.claimQuestReward(playerId, questId);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        
        res.json({ success: true, rewards: result.rewards });
    } catch (error) {
        console.error('[Quests] Error claiming reward:', error);
        res.status(500).json({ error: 'Failed to claim quest reward' });
    }
});

// Abandon quest
router.post('/quests/:playerId/abandon', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { questId } = req.body;
        
        if (!questId) {
            return res.status(400).json({ error: 'Missing questId' });
        }
        
        const success = await questService.abandonQuest(playerId, questId);
        
        res.json({ success });
    } catch (error) {
        console.error('[Quests] Error abandoning quest:', error);
        res.status(500).json({ error: 'Failed to abandon quest' });
    }
});

// ============================================
// ACHIEVEMENT ROUTES
// ============================================

// Get player achievements progress
router.get('/achievements/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const achievements = await achievementService.getAchievementProgress(playerId);
        
        res.json({ achievements });
    } catch (error) {
        console.error('[Achievements] Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// Get unlocked achievements
router.get('/achievements/:playerId/unlocked', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const unlocked = await achievementService.getUnlockedAchievements(playerId);
        
        res.json({ unlocked });
    } catch (error) {
        console.error('[Achievements] Error fetching unlocked:', error);
        res.status(500).json({ error: 'Failed to fetch unlocked achievements' });
    }
});

// Get achievement stats
router.get('/achievements/:playerId/stats', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const stats = await achievementService.getAchievementStats(playerId);
        
        res.json(stats);
    } catch (error) {
        console.error('[Achievements] Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch achievement stats' });
    }
});

// Get achievements by category
router.get('/achievements/:playerId/category/:category', async (req: Request, res: Response) => {
    try {
        const { playerId, category } = req.params;
        const achievements = await achievementService.getAchievementsByCategory(playerId, category);
        
        res.json({ achievements });
    } catch (error) {
        console.error('[Achievements] Error fetching by category:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// Update achievement progress
router.post('/achievements/:playerId/progress', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { type, value, absolute } = req.body;
        
        if (!type || value === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const result = await achievementService.updateProgress(playerId, type, value, absolute);
        
        res.json({
            updated: result.updated,
            unlocked: result.unlocked.map(a => ({
                id: a.id,
                name: a.name,
                description: a.description,
                rarity: a.rarity,
                rewards: a.rewards
            }))
        });
    } catch (error) {
        console.error('[Achievements] Error updating progress:', error);
        res.status(500).json({ error: 'Failed to update achievement progress' });
    }
});

// Get player badges
router.get('/achievements/:playerId/badges', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const badges = await achievementService.getPlayerBadges(playerId);
        
        res.json({ badges });
    } catch (error) {
        console.error('[Achievements] Error fetching badges:', error);
        res.status(500).json({ error: 'Failed to fetch badges' });
    }
});

// Set display badge
router.post('/achievements/:playerId/badges/display', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { badge } = req.body;
        
        const success = await achievementService.setDisplayBadge(playerId, badge);
        
        if (!success) {
            return res.status(400).json({ error: 'Badge not owned' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Achievements] Error setting badge:', error);
        res.status(500).json({ error: 'Failed to set display badge' });
    }
});

// Get achievement leaderboard
router.get('/achievements/leaderboard', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const leaderboard = await achievementService.getAchievementLeaderboard(limit);
        
        res.json({ leaderboard });
    } catch (error) {
        console.error('[Achievements] Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch achievement leaderboard' });
    }
});

// Get achievement catalog
router.get('/achievements/catalog', async (req: Request, res: Response) => {
    try {
        const includeHidden = req.query.includeHidden === 'true';
        const achievements = achievementService.getAllAchievements(includeHidden);
        const ranks = achievementService.getAchievementRanks();
        
        res.json({ achievements, ranks });
    } catch (error) {
        console.error('[Achievements] Error fetching catalog:', error);
        res.status(500).json({ error: 'Failed to fetch achievement catalog' });
    }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

// Start session
router.post('/analytics/:playerId/session/start', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        // platform and version logged but service only takes playerId
        await analyticsService.startSession(playerId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Analytics] Error starting session:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// End session
router.post('/analytics/:playerId/session/end', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        await analyticsService.endSession(playerId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Analytics] Error ending session:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// Track event
router.post('/analytics/:playerId/event', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { event, data } = req.body;
        
        if (!event) {
            return res.status(400).json({ error: 'Missing event name' });
        }
        
        await analyticsService.trackEvent(playerId, event, data);
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Analytics] Error tracking event:', error);
        res.status(500).json({ error: 'Failed to track event' });
    }
});

// Update playtime - tracked automatically during sessions
router.post('/analytics/:playerId/playtime', async (req: Request, res: Response) => {
    try {
        // Playtime is tracked automatically via startSession/endSession
        res.json({ success: true, message: 'Playtime tracked via sessions' });
    } catch (error) {
        console.error('[Analytics] Error updating playtime:', error);
        res.status(500).json({ error: 'Failed to update playtime' });
    }
});

// Get player analytics
router.get('/analytics/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const analytics = await analyticsService.getPlayerStats(playerId);
        
        res.json(analytics);
    } catch (error) {
        console.error('[Analytics] Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get engagement summary - returns player stats
router.get('/analytics/:playerId/engagement', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const stats = await analyticsService.getPlayerStats(playerId);
        
        res.json({
            totalPlaytime: stats.totalPlaytime,
            sessionsCount: stats.sessionsCount,
            averageSessionLength: stats.averageSessionLength,
            currentStreak: stats.currentStreak,
            daysActive: stats.daysActive
        });
    } catch (error) {
        console.error('[Analytics] Error fetching engagement:', error);
        res.status(500).json({ error: 'Failed to fetch engagement' });
    }
});

// Get global analytics (admin)
router.get('/analytics/global/stats', async (_req: Request, res: Response) => {
    try {
        const stats = await analyticsService.getDashboardSummary();
        res.json(stats);
    } catch (error) {
        console.error('[Analytics] Error fetching global stats:', error);
        res.status(500).json({ error: 'Failed to fetch global analytics' });
    }
});

// Get retention stats (admin)
router.get('/analytics/global/retention', async (req: Request, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 7;
        const today = new Date().toISOString().split('T')[0];
        const retention = await analyticsService.getRetentionCohort(today, days);
        
        res.json(retention);
    } catch (error) {
        console.error('[Analytics] Error fetching retention:', error);
        res.status(500).json({ error: 'Failed to fetch retention analytics' });
    }
});

export default router;
