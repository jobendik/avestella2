import { Router, Request, Response } from 'express';
import { dailyLoginService } from '../services/DailyLoginService.js';

const router = Router();

// ==========================================
// Daily Login
// ==========================================

// POST /api/daily/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const result = await dailyLoginService.processDailyLogin(playerId);
    res.json(result);
  } catch (error) {
    console.error('Error processing daily login:', error);
    res.status(500).json({ error: 'Failed to process daily login' });
  }
});

// GET /api/daily/streak/:playerId
router.get('/streak/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const streakInfo = await dailyLoginService.getStreakInfo(playerId);
    res.json(streakInfo);
  } catch (error) {
    console.error('Error getting streak info:', error);
    res.status(500).json({ error: 'Failed to get streak info' });
  }
});

// ==========================================
// Rewards Info
// ==========================================

// GET /api/daily/rewards
router.get('/rewards', async (req: Request, res: Response) => {
  try {
    const weeklyRewards = dailyLoginService.getWeeklyRewards();
    const milestones = dailyLoginService.getAllMilestones();
    
    res.json({ weeklyRewards, milestones });
  } catch (error) {
    console.error('Error getting rewards info:', error);
    res.status(500).json({ error: 'Failed to get rewards info' });
  }
});

// ==========================================
// Leaderboard
// ==========================================

// GET /api/daily/leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const leaderboard = await dailyLoginService.getStreakLeaderboard(
      limit ? parseInt(limit as string) : 50
    );
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error getting streak leaderboard:', error);
    res.status(500).json({ error: 'Failed to get streak leaderboard' });
  }
});

export default router;
