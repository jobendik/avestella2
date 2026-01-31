// =============================================================================
// Realm Routes - Realm information and statistics endpoints
// =============================================================================

import { Router, Request, Response } from 'express';
import { realmStatsService } from '../services/RealmStatsService.js';
import { beaconService } from '../services/BeaconService.js';
import { explorationService } from '../services/ExplorationService.js';

const router = Router();

// =========================================================================
// Realm Information
// =========================================================================

/**
 * GET /api/realms
 * Get all realm information
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const realms = realmStatsService.getAllRealmInfo();
        res.json({ success: true, realms });
    } catch (error) {
        console.error('Error fetching realms:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch realms' });
    }
});

/**
 * GET /api/realms/:realm
 * Get specific realm information
 */
router.get('/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const info = realmStatsService.getRealmInfo(realm as any);
        
        if (!info) {
            return res.status(404).json({ success: false, error: 'Realm not found' });
        }
        
        res.json({ success: true, realm: info });
    } catch (error) {
        console.error('Error fetching realm:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch realm' });
    }
});

// =========================================================================
// Realm Statistics
// =========================================================================

/**
 * GET /api/realms/stats/all
 * Get statistics for all realms
 */
router.get('/stats/all', async (req: Request, res: Response) => {
    try {
        const stats = realmStatsService.getAllRealmStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching realm stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch realm stats' });
    }
});

/**
 * GET /api/realms/stats/:realm
 * Get statistics for a specific realm
 */
router.get('/stats/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const stats = realmStatsService.getRealmStats(realm as any);
        
        if (!stats) {
            return res.status(404).json({ success: false, error: 'Realm not found' });
        }
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching realm stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch realm stats' });
    }
});

/**
 * GET /api/realms/population/:realm
 * Get current population for a realm
 */
router.get('/population/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const population = realmStatsService.getRealmPopulation(realm as any);
        res.json({ success: true, population });
    } catch (error) {
        console.error('Error fetching population:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch population' });
    }
});

/**
 * GET /api/realms/players/:realm
 * Get list of players in a realm
 */
router.get('/players/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const players = realmStatsService.getPlayersInRealm(realm as any);
        res.json({ success: true, players, count: players.length });
    } catch (error) {
        console.error('Error fetching realm players:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch realm players' });
    }
});

// =========================================================================
// Server Statistics
// =========================================================================

/**
 * GET /api/realms/server/stats
 * Get overall server statistics
 */
router.get('/server/stats', async (req: Request, res: Response) => {
    try {
        const stats = realmStatsService.getServerStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching server stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch server stats' });
    }
});

/**
 * GET /api/realms/server/online
 * Get total online player count
 */
router.get('/server/online', async (req: Request, res: Response) => {
    try {
        const total = realmStatsService.getTotalOnline();
        res.json({ success: true, online: total });
    } catch (error) {
        console.error('Error fetching online count:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch online count' });
    }
});

// =========================================================================
// Recommendations
// =========================================================================

/**
 * POST /api/realms/recommend
 * Get realm recommendation for a player
 */
router.post('/recommend', async (req: Request, res: Response) => {
    try {
        const { playerLevel, preferQuiet, preferActive, preferChallenging } = req.body;

        const recommended = realmStatsService.getRecommendedRealm(
            playerLevel || 1,
            { preferQuiet, preferActive, preferChallenging }
        );

        const info = realmStatsService.getRealmInfo(recommended);
        const stats = realmStatsService.getRealmStats(recommended);

        res.json({ 
            success: true, 
            recommended,
            info,
            stats
        });
    } catch (error) {
        console.error('Error getting recommendation:', error);
        res.status(500).json({ success: false, error: 'Failed to get recommendation' });
    }
});

// =========================================================================
// Player Activity Tracking
// =========================================================================

/**
 * POST /api/realms/player/join
 * Record player joining a realm
 */
router.post('/player/join', async (req: Request, res: Response) => {
    try {
        const { playerId, realm, position } = req.body;

        if (!playerId || !realm || !position) {
            return res.status(400).json({ 
                success: false, 
                error: 'Player ID, realm, and position required' 
            });
        }

        realmStatsService.playerJoined(playerId, realm, position);
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording player join:', error);
        res.status(500).json({ success: false, error: 'Failed to record player join' });
    }
});

/**
 * POST /api/realms/player/leave
 * Record player leaving
 */
router.post('/player/leave', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.body;

        if (!playerId) {
            return res.status(400).json({ success: false, error: 'Player ID required' });
        }

        realmStatsService.playerLeft(playerId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording player leave:', error);
        res.status(500).json({ success: false, error: 'Failed to record player leave' });
    }
});

/**
 * POST /api/realms/player/change
 * Record player changing realms
 */
router.post('/player/change', async (req: Request, res: Response) => {
    try {
        const { playerId, newRealm, position } = req.body;

        if (!playerId || !newRealm || !position) {
            return res.status(400).json({ 
                success: false, 
                error: 'Player ID, new realm, and position required' 
            });
        }

        realmStatsService.playerChangedRealm(playerId, newRealm, position);
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording realm change:', error);
        res.status(500).json({ success: false, error: 'Failed to record realm change' });
    }
});

/**
 * GET /api/realms/player/:playerId/activity
 * Get player's current activity
 */
router.get('/player/:playerId/activity', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const activity = realmStatsService.getPlayerActivity(playerId);
        res.json({ success: true, activity });
    } catch (error) {
        console.error('Error fetching player activity:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch player activity' });
    }
});

// =========================================================================
// Beacons in Realm
// =========================================================================

/**
 * GET /api/realms/:realm/beacons
 * Get all beacons in a realm
 */
router.get('/:realm/beacons', async (req: Request, res: Response) => {
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
 * POST /api/realms/beacons/nearby
 * Get beacons near a position
 */
router.post('/beacons/nearby', async (req: Request, res: Response) => {
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
// Exploration in Realm
// =========================================================================

/**
 * GET /api/realms/:realm/pois
 * Get points of interest in a realm
 */
router.get('/:realm/pois', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const pois = explorationService.getPOIsInRealm(realm);
        res.json({ success: true, pois });
    } catch (error) {
        console.error('Error fetching POIs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch POIs' });
    }
});

/**
 * GET /api/realms/:realm/biomes
 * Get biomes in a realm
 */
router.get('/:realm/biomes', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const biomes = explorationService.getBiomesInRealm(realm);
        res.json({ success: true, biomes });
    } catch (error) {
        console.error('Error fetching biomes:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch biomes' });
    }
});

export default router;
