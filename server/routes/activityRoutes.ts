import { Router, Request, Response } from 'express';
import { activityFeedService } from '../services/ActivityFeedService.js';

const router = Router();

// ==========================================
// Activity Feed
// ==========================================

// GET /api/activity/feed/:playerId
router.get('/feed/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const { limit } = req.query;
    
    const activities = await activityFeedService.getFriendActivityFeed(
      playerId,
      limit ? parseInt(limit as string) : 50
    );
    
    res.json({ activities });
  } catch (error) {
    console.error('Error getting activity feed:', error);
    res.status(500).json({ error: 'Failed to get activity feed' });
  }
});

// GET /api/activity/player/:playerId
router.get('/player/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const { limit } = req.query;
    
    const activities = await activityFeedService.getPlayerActivities(
      playerId,
      limit ? parseInt(limit as string) : 20
    );
    
    res.json({ activities });
  } catch (error) {
    console.error('Error getting player activities:', error);
    res.status(500).json({ error: 'Failed to get player activities' });
  }
});

// GET /api/activity/stats/:playerId
router.get('/stats/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const stats = await activityFeedService.getPlayerActivityStats(playerId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting activity stats:', error);
    res.status(500).json({ error: 'Failed to get activity stats' });
  }
});

// GET /api/activity/type/:activityType
router.get('/type/:activityType', async (req: Request, res: Response) => {
  try {
    const { activityType } = req.params;
    const { limit } = req.query;
    
    const activities = await activityFeedService.getRecentActivitiesByType(
      activityType as any,
      limit ? parseInt(limit as string) : 20
    );
    
    res.json({ activities });
  } catch (error) {
    console.error('Error getting activities by type:', error);
    res.status(500).json({ error: 'Failed to get activities by type' });
  }
});

export default router;
