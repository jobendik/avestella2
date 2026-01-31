// =============================================================================
// Economy Routes - Mystery boxes, crystals, and shop endpoints
// =============================================================================

import { Router, Request, Response } from 'express';
import { mysteryBoxService } from '../services/MysteryBoxService.js';
import { cosmeticsService } from '../services/CosmeticsService.js';

const router = Router();

// =========================================================================
// Mystery Box Routes
// =========================================================================

/**
 * GET /api/economy/boxes
 * Get all available mystery box configurations
 */
router.get('/boxes', async (req: Request, res: Response) => {
    try {
        const boxes = mysteryBoxService.getAllBoxConfigs();
        res.json({ success: true, boxes });
    } catch (error) {
        console.error('Error fetching box configs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch box configurations' });
    }
});

/**
 * GET /api/economy/boxes/:tier
 * Get specific box configuration
 */
router.get('/boxes/:tier', async (req: Request, res: Response) => {
    try {
        const { tier } = req.params;
        const box = mysteryBoxService.getBoxConfig(tier as any);
        
        if (!box) {
            return res.status(404).json({ success: false, error: 'Box tier not found' });
        }
        
        res.json({ success: true, box });
    } catch (error) {
        console.error('Error fetching box config:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch box configuration' });
    }
});

/**
 * POST /api/economy/boxes/:tier/open
 * Open a mystery box (requires payment verification)
 */
router.post('/boxes/:tier/open', async (req: Request, res: Response) => {
    try {
        const { tier } = req.params;
        const { playerId, paymentVerified } = req.body;

        if (!playerId) {
            return res.status(400).json({ success: false, error: 'Player ID required' });
        }

        // In production, payment verification should happen server-side
        if (!paymentVerified) {
            return res.status(400).json({ success: false, error: 'Payment not verified' });
        }

        const result = await mysteryBoxService.openBox(playerId, tier as any);
        res.json(result);
    } catch (error) {
        console.error('Error opening mystery box:', error);
        res.status(500).json({ success: false, error: 'Failed to open mystery box' });
    }
});

/**
 * GET /api/economy/boxes/:tier/pity/:playerId
 * Get pity progress for a player
 */
router.get('/boxes/:tier/pity/:playerId', async (req: Request, res: Response) => {
    try {
        const { tier, playerId } = req.params;
        const pityProgress = await mysteryBoxService.getPityProgress(playerId, tier as any);
        res.json({ success: true, pityProgress });
    } catch (error) {
        console.error('Error fetching pity progress:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch pity progress' });
    }
});

/**
 * GET /api/economy/boxes/stats/:playerId
 * Get player's mystery box stats
 */
router.get('/boxes/stats/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const stats = await mysteryBoxService.getPlayerStats(playerId);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching box stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch box stats' });
    }
});

/**
 * POST /api/economy/boxes/afford
 * Check if player can afford a box
 */
router.post('/boxes/afford', async (req: Request, res: Response) => {
    try {
        const { tier, stardust, crystals } = req.body;
        
        const result = mysteryBoxService.canAffordBox(tier, stardust || 0, crystals || 0);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error checking affordability:', error);
        res.status(500).json({ success: false, error: 'Failed to check affordability' });
    }
});

// =========================================================================
// Cosmetics Shop Routes
// =========================================================================

/**
 * GET /api/economy/shop
 * Get all purchasable cosmetic items
 */
router.get('/shop', async (req: Request, res: Response) => {
    try {
        const items = cosmeticsService.getShopItems();
        res.json({ success: true, items });
    } catch (error) {
        console.error('Error fetching shop items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shop items' });
    }
});

/**
 * GET /api/economy/shop/category/:type
 * Get cosmetics by category
 */
router.get('/shop/category/:type', async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const items = cosmeticsService.getCatalogByType(type as any);
        res.json({ success: true, items });
    } catch (error) {
        console.error('Error fetching category items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch category items' });
    }
});

/**
 * GET /api/economy/inventory/:playerId
 * Get player's cosmetic inventory
 */
router.get('/inventory/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const cosmetics = await cosmeticsService.getPlayerCosmetics(playerId);
        res.json({ success: true, cosmetics });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
    }
});

/**
 * POST /api/economy/purchase
 * Purchase a cosmetic item
 */
router.post('/purchase', async (req: Request, res: Response) => {
    try {
        const { playerId, itemId, currency, paymentVerified } = req.body;

        if (!playerId || !itemId || !currency) {
            return res.status(400).json({ 
                success: false, 
                error: 'Player ID, item ID, and currency required' 
            });
        }

        const result = await cosmeticsService.purchaseCosmetic(
            playerId, 
            itemId, 
            currency, 
            paymentVerified === true
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error purchasing cosmetic:', error);
        res.status(500).json({ success: false, error: 'Failed to purchase cosmetic' });
    }
});

/**
 * POST /api/economy/equip
 * Equip a cosmetic item
 */
router.post('/equip', async (req: Request, res: Response) => {
    try {
        const { playerId, itemId } = req.body;

        if (!playerId || !itemId) {
            return res.status(400).json({ success: false, error: 'Player ID and item ID required' });
        }

        const result = await cosmeticsService.equipCosmetic(playerId, itemId);
        res.json(result);
    } catch (error) {
        console.error('Error equipping cosmetic:', error);
        res.status(500).json({ success: false, error: 'Failed to equip cosmetic' });
    }
});

/**
 * POST /api/economy/unequip
 * Unequip a cosmetic item
 */
router.post('/unequip', async (req: Request, res: Response) => {
    try {
        const { playerId, itemId } = req.body;

        if (!playerId || !itemId) {
            return res.status(400).json({ success: false, error: 'Player ID and item ID required' });
        }

        const result = await cosmeticsService.unequipCosmetic(playerId, itemId);
        res.json(result);
    } catch (error) {
        console.error('Error unequipping cosmetic:', error);
        res.status(500).json({ success: false, error: 'Failed to unequip cosmetic' });
    }
});

/**
 * GET /api/economy/equipped/:playerId
 * Get player's equipped cosmetics
 */
router.get('/equipped/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const equipped = await cosmeticsService.getEquippedCosmetics(playerId);
        res.json({ success: true, equipped });
    } catch (error) {
        console.error('Error fetching equipped cosmetics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch equipped cosmetics' });
    }
});

/**
 * POST /api/economy/favorite
 * Toggle favorite status for a cosmetic
 */
router.post('/favorite', async (req: Request, res: Response) => {
    try {
        const { playerId, itemId } = req.body;

        if (!playerId || !itemId) {
            return res.status(400).json({ success: false, error: 'Player ID and item ID required' });
        }

        const result = await cosmeticsService.toggleFavorite(playerId, itemId);
        res.json(result);
    } catch (error) {
        console.error('Error toggling favorite:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle favorite' });
    }
});

/**
 * GET /api/economy/set/:setId
 * Get all items in a cosmetic set
 */
router.get('/set/:setId', async (req: Request, res: Response) => {
    try {
        const { setId } = req.params;
        const items = cosmeticsService.getItemsInSet(setId);
        res.json({ success: true, items });
    } catch (error) {
        console.error('Error fetching set items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch set items' });
    }
});

/**
 * GET /api/economy/set/:setId/progress/:playerId
 * Get player's progress on a cosmetic set
 */
router.get('/set/:setId/progress/:playerId', async (req: Request, res: Response) => {
    try {
        const { setId, playerId } = req.params;
        const progress = await cosmeticsService.getSetCompletionStatus(playerId, setId);
        res.json({ success: true, progress });
    } catch (error) {
        console.error('Error fetching set progress:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch set progress' });
    }
});

/**
 * GET /api/economy/popular
 * Get most popular cosmetics
 */
router.get('/popular', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const popular = await cosmeticsService.getPopularCosmetics(limit);
        res.json({ success: true, popular });
    } catch (error) {
        console.error('Error fetching popular cosmetics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch popular cosmetics' });
    }
});

/**
 * GET /api/economy/stats
 * Get global economy stats
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const boxStats = await mysteryBoxService.getGlobalStats();
        res.json({ success: true, stats: { mysteryBoxes: boxStats } });
    } catch (error) {
        console.error('Error fetching economy stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch economy stats' });
    }
});

export default router;
