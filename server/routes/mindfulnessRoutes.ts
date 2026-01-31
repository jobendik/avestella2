// =============================================================================
// Mindfulness Routes - Anchoring, meditation, and mindfulness endpoints
// =============================================================================

import { Router, Request, Response } from 'express';
import { anchoringService } from '../services/AnchoringService.js';

const router = Router();

// =========================================================================
// Zone Routes
// =========================================================================

/**
 * GET /api/mindfulness/zones
 * Get all anchoring zones
 */
router.get('/zones', async (req: Request, res: Response) => {
    try {
        const zones = anchoringService.getAllZones();
        res.json({ success: true, zones });
    } catch (error) {
        console.error('Error fetching zones:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch zones' });
    }
});

/**
 * GET /api/mindfulness/zones/realm/:realm
 * Get zones by realm
 */
router.get('/zones/realm/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const zones = anchoringService.getZonesByRealm(realm);
        res.json({ success: true, zones });
    } catch (error) {
        console.error('Error fetching realm zones:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch realm zones' });
    }
});

/**
 * GET /api/mindfulness/zones/accessible/:playerId
 * Get zones accessible to player based on their mindfulness level
 */
router.get('/zones/accessible/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const zones = await anchoringService.getAccessibleZones(playerId);
        res.json({ success: true, zones });
    } catch (error) {
        console.error('Error fetching accessible zones:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch accessible zones' });
    }
});

/**
 * POST /api/mindfulness/zones/find
 * Find zone at a given position
 */
router.post('/zones/find', async (req: Request, res: Response) => {
    try {
        const { position, realm } = req.body;
        
        if (!position || !realm) {
            return res.status(400).json({ success: false, error: 'Position and realm required' });
        }

        const zone = anchoringService.findZoneAtPosition(position, realm);
        res.json({ success: true, zone });
    } catch (error) {
        console.error('Error finding zone:', error);
        res.status(500).json({ success: false, error: 'Failed to find zone' });
    }
});

// =========================================================================
// Session Routes
// =========================================================================

/**
 * POST /api/mindfulness/session/start
 * Start a meditation session
 */
router.post('/session/start', async (req: Request, res: Response) => {
    try {
        const { playerId, zoneId, position } = req.body;

        if (!playerId || !zoneId || !position) {
            return res.status(400).json({ 
                success: false, 
                error: 'Player ID, zone ID, and position required' 
            });
        }

        const result = await anchoringService.startSession(playerId, zoneId, position);
        res.json(result);
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ success: false, error: 'Failed to start session' });
    }
});

/**
 * POST /api/mindfulness/session/end
 * End a meditation session
 */
router.post('/session/end', async (req: Request, res: Response) => {
    try {
        const { playerId, interrupted } = req.body;

        if (!playerId) {
            return res.status(400).json({ success: false, error: 'Player ID required' });
        }

        const result = await anchoringService.endSession(playerId, interrupted === true);
        res.json(result);
    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ success: false, error: 'Failed to end session' });
    }
});

/**
 * GET /api/mindfulness/session/:playerId
 * Get active session for player
 */
router.get('/session/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const session = anchoringService.getActiveSession(playerId);
        res.json({ success: true, session });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch session' });
    }
});

// =========================================================================
// Player Mindfulness Routes
// =========================================================================

/**
 * GET /api/mindfulness/player/:playerId
 * Get player's mindfulness data
 */
router.get('/player/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const mindfulness = await anchoringService.getPlayerMindfulness(playerId);
        res.json({ success: true, mindfulness });
    } catch (error) {
        console.error('Error fetching mindfulness:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch mindfulness data' });
    }
});

/**
 * GET /api/mindfulness/daily/:playerId
 * Get player's daily meditation progress
 */
router.get('/daily/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const progress = await anchoringService.getDailyProgress(playerId);
        res.json({ success: true, progress });
    } catch (error) {
        console.error('Error fetching daily progress:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch daily progress' });
    }
});

/**
 * POST /api/mindfulness/daily/goal
 * Set player's daily meditation goal
 */
router.post('/daily/goal', async (req: Request, res: Response) => {
    try {
        const { playerId, targetSeconds } = req.body;

        if (!playerId || targetSeconds === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'Player ID and target seconds required' 
            });
        }

        await anchoringService.setDailyGoal(playerId, targetSeconds);
        res.json({ success: true });
    } catch (error) {
        console.error('Error setting daily goal:', error);
        res.status(500).json({ success: false, error: 'Failed to set daily goal' });
    }
});

// =========================================================================
// Level Info Routes
// =========================================================================

/**
 * GET /api/mindfulness/levels
 * Get all mindfulness level information
 */
router.get('/levels', async (req: Request, res: Response) => {
    try {
        const levels = anchoringService.getAllLevelInfo();
        res.json({ success: true, levels });
    } catch (error) {
        console.error('Error fetching levels:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch level info' });
    }
});

/**
 * GET /api/mindfulness/levels/:level
 * Get specific level information
 */
router.get('/levels/:level', async (req: Request, res: Response) => {
    try {
        const level = parseInt(req.params.level);
        const levelInfo = anchoringService.getLevelInfo(level);
        
        if (!levelInfo) {
            return res.status(404).json({ success: false, error: 'Level not found' });
        }
        
        res.json({ success: true, levelInfo });
    } catch (error) {
        console.error('Error fetching level info:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch level info' });
    }
});

export default router;
