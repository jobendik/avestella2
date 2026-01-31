// =============================================================================
// Beacon Routes - Beacon lighting and management endpoints
// =============================================================================

import { Router, Request, Response } from 'express';
import { beaconService } from '../services/BeaconService.js';

const router = Router();

// =========================================================================
// Beacon Discovery
// =========================================================================

/**
 * GET /api/beacons/realm/:realm
 * Get all beacons in a realm
 */
router.get('/realm/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const beacons = beaconService.getBeaconsInRealm(realm);
        res.json({ success: true, beacons });
    } catch (error) {
        console.error('Error fetching beacons:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch beacons' });
    }
});

/**
 * GET /api/beacons/:beaconId
 * Get specific beacon
 */
router.get('/:beaconId', async (req: Request, res: Response) => {
    try {
        const { beaconId } = req.params;
        const beacon = beaconService.getBeacon(beaconId);
        
        if (!beacon) {
            return res.status(404).json({ success: false, error: 'Beacon not found' });
        }
        
        res.json({ success: true, beacon });
    } catch (error) {
        console.error('Error fetching beacon:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch beacon' });
    }
});

/**
 * POST /api/beacons/nearby
 * Get beacons near a position
 */
router.post('/nearby', async (req: Request, res: Response) => {
    try {
        const { position, realm, maxDistance } = req.body;

        if (!position || !realm) {
            return res.status(400).json({ success: false, error: 'Position and realm required' });
        }

        const beacons = beaconService.getBeaconsNearPosition(position, realm, maxDistance);
        res.json({ success: true, beacons });
    } catch (error) {
        console.error('Error fetching nearby beacons:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch nearby beacons' });
    }
});

// =========================================================================
// Beacon Interaction
// =========================================================================

/**
 * POST /api/beacons/light
 * Light a beacon
 */
router.post('/light', async (req: Request, res: Response) => {
    try {
        const { playerId, beaconId, position } = req.body;

        if (!playerId || !beaconId) {
            return res.status(400).json({ success: false, error: 'Player ID and beacon ID required' });
        }

        const result = await beaconService.lightBeacon(playerId, beaconId, position);
        res.json(result);
    } catch (error) {
        console.error('Error lighting beacon:', error);
        res.status(500).json({ success: false, error: 'Failed to light beacon' });
    }
});

/**
 * POST /api/beacons/charge
 * Charge a beacon
 */
router.post('/charge', async (req: Request, res: Response) => {
    try {
        const { playerId, beaconId, chargeAmount } = req.body;

        if (!playerId || !beaconId) {
            return res.status(400).json({ success: false, error: 'Player ID and beacon ID required' });
        }

        const result = await beaconService.chargeBeacon(playerId, beaconId, chargeAmount || 10);
        res.json(result);
    } catch (error) {
        console.error('Error charging beacon:', error);
        res.status(500).json({ success: false, error: 'Failed to charge beacon' });
    }
});

/**
 * POST /api/beacons/protect
 * Get protection from a beacon
 */
router.post('/protect', async (req: Request, res: Response) => {
    try {
        const { playerId, beaconId, position } = req.body;

        if (!playerId || !beaconId || !position) {
            return res.status(400).json({ 
                success: false, 
                error: 'Player ID, beacon ID, and position required' 
            });
        }

        const result = await beaconService.getBeaconProtection(playerId, beaconId, position);
        res.json(result);
    } catch (error) {
        console.error('Error getting beacon protection:', error);
        res.status(500).json({ success: false, error: 'Failed to get beacon protection' });
    }
});

// =========================================================================
// Player Beacon Stats
// =========================================================================

/**
 * GET /api/beacons/player/:playerId
 * Get player's beacon statistics
 */
router.get('/player/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const stats = await beaconService.getPlayerBeaconStats(playerId);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching player beacon stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch player beacon stats' });
    }
});

/**
 * GET /api/beacons/player/:playerId/lit
 * Get beacons lit by player
 */
router.get('/player/:playerId/lit', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const beacons = beaconService.getBeaconsLitByPlayer(playerId);
        res.json({ success: true, beacons });
    } catch (error) {
        console.error('Error fetching player lit beacons:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch player lit beacons' });
    }
});

// =========================================================================
// Beacon Status
// =========================================================================

/**
 * GET /api/beacons/lit/:realm
 * Get all lit beacons in a realm
 */
router.get('/lit/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const beacons = beaconService.getLitBeacons(realm);
        res.json({ success: true, beacons });
    } catch (error) {
        console.error('Error fetching lit beacons:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch lit beacons' });
    }
});

/**
 * GET /api/beacons/stats
 * Get global beacon statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = beaconService.getGlobalStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching beacon stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch beacon stats' });
    }
});

export default router;
