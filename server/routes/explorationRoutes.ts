// =============================================================================
// Exploration Routes - Fog of war, POI discovery, and exploration endpoints
// =============================================================================

import { Router, Request, Response } from 'express';
import { explorationService } from '../services/ExplorationService.js';

const router = Router();

// =========================================================================
// Player Exploration Data
// =========================================================================

/**
 * GET /api/exploration/player/:playerId
 * Get player's exploration data
 */
router.get('/player/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const exploration = await explorationService.getPlayerExploration(playerId);
        res.json({ success: true, exploration });
    } catch (error) {
        console.error('Error fetching exploration data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch exploration data' });
    }
});

/**
 * GET /api/exploration/player/:playerId/stats
 * Get player's exploration statistics
 */
router.get('/player/:playerId/stats', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const stats = await explorationService.getExplorationStats(playerId);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching exploration stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch exploration stats' });
    }
});

/**
 * GET /api/exploration/player/:playerId/milestones
 * Get player's exploration milestones
 */
router.get('/player/:playerId/milestones', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const milestones = await explorationService.getMilestones(playerId);
        res.json({ success: true, milestones });
    } catch (error) {
        console.error('Error fetching milestones:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch milestones' });
    }
});

// =========================================================================
// Fog of War
// =========================================================================

/**
 * POST /api/exploration/reveal
 * Reveal fog at a position
 */
router.post('/reveal', async (req: Request, res: Response) => {
    try {
        const { playerId, position, realm, radius } = req.body;

        if (!playerId || !position || !realm) {
            return res.status(400).json({ 
                success: false, 
                error: 'Player ID, position, and realm required' 
            });
        }

        const result = await explorationService.revealFog(playerId, position, realm, radius);
        res.json(result);
    } catch (error) {
        console.error('Error revealing fog:', error);
        res.status(500).json({ success: false, error: 'Failed to reveal fog' });
    }
});

/**
 * POST /api/exploration/explored
 * Check if a position is explored
 */
router.post('/explored', async (req: Request, res: Response) => {
    try {
        const { playerId, position, realm } = req.body;

        if (!playerId || !position || !realm) {
            return res.status(400).json({ 
                success: false, 
                error: 'Player ID, position, and realm required' 
            });
        }

        const explored = await explorationService.isExplored(playerId, realm, position.x, position.y);
        res.json({ success: true, explored });
    } catch (error) {
        console.error('Error checking explored status:', error);
        res.status(500).json({ success: false, error: 'Failed to check explored status' });
    }
});

/**
 * GET /api/exploration/player/:playerId/fog/:realm
 * Get fog data for a realm
 */
router.get('/player/:playerId/fog/:realm', async (req: Request, res: Response) => {
    try {
        const { playerId, realm } = req.params;
        const fogData = await explorationService.exploredAreas(playerId, realm);
        res.json({ success: true, fogData });
    } catch (error) {
        console.error('Error fetching fog data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fog data' });
    }
});

// =========================================================================
// Points of Interest
// =========================================================================

/**
 * GET /api/exploration/pois/:realm
 * Get POIs in a realm
 */
router.get('/pois/:realm', async (req: Request, res: Response) => {
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
 * POST /api/exploration/pois/nearby
 * Get POIs near a position
 */
router.post('/pois/nearby', async (req: Request, res: Response) => {
    try {
        const { position, realm, maxDistance } = req.body;

        if (!position || !realm) {
            return res.status(400).json({ success: false, error: 'Position and realm required' });
        }

        const pois = explorationService.getPOIsNearPosition(realm, position.x, position.y, maxDistance);
        res.json({ success: true, pois });
    } catch (error) {
        console.error('Error fetching nearby POIs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch nearby POIs' });
    }
});

/**
 * POST /api/exploration/pois/discover
 * Discover a POI
 */
router.post('/pois/discover', async (req: Request, res: Response) => {
    try {
        const { playerId, poiId, position } = req.body;

        if (!playerId || !poiId) {
            return res.status(400).json({ success: false, error: 'Player ID and POI ID required' });
        }

        const result = await explorationService.discoverPOI(playerId, poiId);
        res.json(result);
    } catch (error) {
        console.error('Error discovering POI:', error);
        res.status(500).json({ success: false, error: 'Failed to discover POI' });
    }
});

/**
 * GET /api/exploration/player/:playerId/pois
 * Get player's discovered POIs
 */
router.get('/player/:playerId/pois', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const exploration = await explorationService.getPlayerExploration(playerId);
        res.json({ success: true, discoveredPOIs: exploration.discoveredPOIs });
    } catch (error) {
        console.error('Error fetching discovered POIs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch discovered POIs' });
    }
});

// =========================================================================
// Biomes
// =========================================================================

/**
 * GET /api/exploration/biomes/:realm
 * Get biomes in a realm
 */
router.get('/biomes/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const biomes = explorationService.getBiomesInRealm(realm);
        res.json({ success: true, biomes });
    } catch (error) {
        console.error('Error fetching biomes:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch biomes' });
    }
});

/**
 * POST /api/exploration/biomes/discover
 * Discover a biome
 */
router.post('/biomes/discover', async (req: Request, res: Response) => {
    try {
        const { playerId, biomeId, position } = req.body;

        if (!playerId || !biomeId) {
            return res.status(400).json({ success: false, error: 'Player ID and biome ID required' });
        }

        const result = await explorationService.discoverBiome(playerId, biomeId);
        res.json(result);
    } catch (error) {
        console.error('Error discovering biome:', error);
        res.status(500).json({ success: false, error: 'Failed to discover biome' });
    }
});

/**
 * GET /api/exploration/player/:playerId/biomes
 * Get player's discovered biomes
 */
router.get('/player/:playerId/biomes', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const discoveredBiomes = await explorationService.discoveredBiomes(playerId);
        res.json({ success: true, discoveredBiomes });
    } catch (error) {
        console.error('Error fetching discovered biomes:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch discovered biomes' });
    }
});

// =========================================================================
// Secrets
// =========================================================================

/**
 * POST /api/exploration/secrets/discover
 * Discover a secret
 */
router.post('/secrets/discover', async (req: Request, res: Response) => {
    try {
        const { playerId, secretId, position } = req.body;

        if (!playerId || !secretId) {
            return res.status(400).json({ success: false, error: 'Player ID and secret ID required' });
        }

        const result = await explorationService.discoverSecret(playerId, secretId);
        res.json(result);
    } catch (error) {
        console.error('Error discovering secret:', error);
        res.status(500).json({ success: false, error: 'Failed to discover secret' });
    }
});

/**
 * GET /api/exploration/player/:playerId/secrets
 * Get player's discovered secrets
 */
router.get('/player/:playerId/secrets', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const discoveredSecrets = await explorationService.discoveredSecrets(playerId);
        res.json({ success: true, discoveredSecrets });
    } catch (error) {
        console.error('Error fetching discovered secrets:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch discovered secrets' });
    }
});

export default router;
