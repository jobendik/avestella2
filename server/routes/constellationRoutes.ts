import { Router, Request, Response } from 'express';
import { constellationService } from '../services/ConstellationService.js';

const router = Router();

// ==========================================
// Constellation Formation
// ==========================================

// POST /api/constellations/form
router.post('/form', async (req: Request, res: Response) => {
  try {
    const { playerIds, starMemoryIds, realmId, name, description } = req.body;

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ error: 'playerIds array is required' });
    }

    if (!starMemoryIds || !Array.isArray(starMemoryIds) || starMemoryIds.length === 0) {
      return res.status(400).json({ error: 'starMemoryIds array is required' });
    }

    if (!realmId) {
      return res.status(400).json({ error: 'realmId is required' });
    }

    const result = await constellationService.formConstellation({
      playerIds,
      starMemoryIds,
      realmId,
      name,
      description
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('Error forming constellation:', error);
    res.status(500).json({ error: 'Failed to form constellation' });
  }
});


// POST /api/constellations/expand
router.post('/expand', async (req: Request, res: Response) => {
  try {
    const { constellationId, newStarMemoryIds } = req.body;

    if (!constellationId) return res.status(400).json({ error: 'constellationId is required' });
    if (!newStarMemoryIds || !Array.isArray(newStarMemoryIds) || newStarMemoryIds.length === 0) {
      return res.status(400).json({ error: 'newStarMemoryIds is required' });
    }

    const result = await constellationService.expandConstellation(constellationId, newStarMemoryIds);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error expanding constellation:', error);
    res.status(500).json({ error: 'Failed to expand constellation' });
  }
});

// ==========================================
// Queries
// ==========================================

// GET /api/constellations/player/:playerId
router.get('/player/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const constellations = await constellationService.getPlayerConstellations(playerId);
    res.json({ constellations });
  } catch (error) {
    console.error('Error getting player constellations:', error);
    res.status(500).json({ error: 'Failed to get player constellations' });
  }
});

// GET /api/constellations/:constellationId
router.get('/:constellationId', async (req: Request, res: Response) => {
  try {
    const { constellationId } = req.params;
    const result = await constellationService.getConstellationWithStars(constellationId);

    if (!result.constellation) {
      return res.status(404).json({ error: 'Constellation not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting constellation:', error);
    res.status(500).json({ error: 'Failed to get constellation' });
  }
});

// GET /api/constellations/realm/:realmId
router.get('/realm/:realmId', async (req: Request, res: Response) => {
  try {
    const { realmId } = req.params;
    const { limit } = req.query;

    const constellations = await constellationService.getRealmConstellations(
      realmId,
      limit ? parseInt(limit as string) : 50
    );

    res.json({ constellations });
  } catch (error) {
    console.error('Error getting realm constellations:', error);
    res.status(500).json({ error: 'Failed to get realm constellations' });
  }
});

// ==========================================
// Stats & Discovery
// ==========================================

// GET /api/constellations/stats/:playerId
router.get('/stats/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const stats = await constellationService.getPlayerConstellationStats(playerId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting constellation stats:', error);
    res.status(500).json({ error: 'Failed to get constellation stats' });
  }
});

// GET /api/constellations/potential/:playerId
router.get('/potential/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const potential = await constellationService.checkForPotentialConstellations(playerId);
    res.json({ potential });
  } catch (error) {
    console.error('Error checking potential constellations:', error);
    res.status(500).json({ error: 'Failed to check potential constellations' });
  }
});

// GET /api/constellations/global/stats
router.get('/global/stats', async (req: Request, res: Response) => {
  try {
    const stats = await constellationService.getGlobalConstellationStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting global constellation stats:', error);
    res.status(500).json({ error: 'Failed to get global constellation stats' });
  }
});

export default router;
