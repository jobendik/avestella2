import { Router, Request, Response } from 'express';
import { seasonPassService } from '../services/SeasonPassService.js';

const router = Router();

// ==========================================
// Season Info
// ==========================================

// GET /api/season/current
router.get('/current', async (req: Request, res: Response) => {
  try {
    const season = await seasonPassService.getCurrentSeason();
    if (!season) {
      return res.status(404).json({ error: 'No active season' });
    }
    res.json(season);
  } catch (error) {
    console.error('Error getting current season:', error);
    res.status(500).json({ error: 'Failed to get current season' });
  }
});

// GET /api/season/rewards
router.get('/rewards', async (req: Request, res: Response) => {
  try {
    const rewards = await seasonPassService.getSeasonRewards();
    res.json({ rewards });
  } catch (error) {
    console.error('Error getting season rewards:', error);
    res.status(500).json({ error: 'Failed to get season rewards' });
  }
});

// ==========================================
// Player Progress
// ==========================================

// GET /api/season/progress/:playerId
router.get('/progress/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const progress = await seasonPassService.getPlayerProgress(playerId);
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }
    
    res.json(progress);
  } catch (error) {
    console.error('Error getting player progress:', error);
    res.status(500).json({ error: 'Failed to get player progress' });
  }
});

// POST /api/season/xp
router.post('/xp', async (req: Request, res: Response) => {
  try {
    const { playerId, xp, source } = req.body;
    
    if (!playerId || typeof xp !== 'number') {
      return res.status(400).json({ error: 'playerId and xp are required' });
    }
    
    const result = await seasonPassService.addSeasonXP(playerId, xp, source);
    
    if (!result) {
      return res.status(404).json({ error: 'Failed to add XP' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error adding season XP:', error);
    res.status(500).json({ error: 'Failed to add season XP' });
  }
});

// ==========================================
// Rewards
// ==========================================

// POST /api/season/claim
router.post('/claim', async (req: Request, res: Response) => {
  try {
    const { playerId, tier, claimPremium } = req.body;
    
    if (!playerId || typeof tier !== 'number') {
      return res.status(400).json({ error: 'playerId and tier are required' });
    }
    
    const result = await seasonPassService.claimTierReward(playerId, tier, claimPremium || false);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

// POST /api/season/claim-all
router.post('/claim-all', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const result = await seasonPassService.claimAllAvailableRewards(playerId);
    res.json(result);
  } catch (error) {
    console.error('Error claiming all rewards:', error);
    res.status(500).json({ error: 'Failed to claim rewards' });
  }
});

// ==========================================
// Premium Pass
// ==========================================

// POST /api/season/upgrade-premium
router.post('/upgrade-premium', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const result = await seasonPassService.upgradeToPremium(playerId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error upgrading to premium:', error);
    res.status(500).json({ error: 'Failed to upgrade to premium' });
  }
});

// ==========================================
// History
// ==========================================

// GET /api/season/history/:playerId
router.get('/history/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const history = await seasonPassService.getPlayerSeasonHistory(playerId);
    res.json({ history });
  } catch (error) {
    console.error('Error getting season history:', error);
    res.status(500).json({ error: 'Failed to get season history' });
  }
});

export default router;
