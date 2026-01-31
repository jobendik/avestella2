import { Router, Request, Response } from 'express';
import { galleryService } from '../services/GalleryService.js';

const router = Router();

// ==========================================
// Screenshot Management
// ==========================================

// POST /api/gallery/screenshot
router.post('/screenshot', async (req: Request, res: Response) => {
  try {
    const { playerId, playerName, ...screenshotData } = req.body;
    
    if (!playerId || !playerName) {
      return res.status(400).json({ error: 'playerId and playerName are required' });
    }
    
    if (!screenshotData.imageRef) {
      return res.status(400).json({ error: 'imageRef is required' });
    }
    
    if (!screenshotData.location?.x || !screenshotData.location?.y || !screenshotData.location?.realm) {
      return res.status(400).json({ error: 'location (x, y, realm) is required' });
    }
    
    const result = await galleryService.saveScreenshot(playerId, playerName, screenshotData);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error saving screenshot:', error);
    res.status(500).json({ error: 'Failed to save screenshot' });
  }
});

// GET /api/gallery/:playerId
router.get('/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const { limit, offset, filter, template, realm, sortBy } = req.query;
    
    const screenshots = await galleryService.getGallery(playerId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      filter: filter as string,
      template: template as string,
      realm: realm as string,
      sortBy: sortBy as 'recent' | 'popular'
    });
    
    const count = await galleryService.getGalleryCount(playerId);
    
    res.json({ screenshots, count });
  } catch (error) {
    console.error('Error getting gallery:', error);
    res.status(500).json({ error: 'Failed to get gallery' });
  }
});

// GET /api/gallery/screenshot/:screenshotId
router.get('/screenshot/:screenshotId', async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const screenshot = await galleryService.getScreenshot(screenshotId);
    
    if (!screenshot) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }
    
    res.json(screenshot);
  } catch (error) {
    console.error('Error getting screenshot:', error);
    res.status(500).json({ error: 'Failed to get screenshot' });
  }
});

// DELETE /api/gallery/screenshot/:screenshotId
router.delete('/screenshot/:screenshotId', async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const success = await galleryService.deleteScreenshot(playerId, screenshotId);
    
    if (!success) {
      return res.status(404).json({ error: 'Screenshot not found or unauthorized' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting screenshot:', error);
    res.status(500).json({ error: 'Failed to delete screenshot' });
  }
});

// PATCH /api/gallery/screenshot/:screenshotId/caption
router.patch('/screenshot/:screenshotId/caption', async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const { playerId, caption } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const success = await galleryService.updateCaption(playerId, screenshotId, caption || '');
    
    if (!success) {
      return res.status(404).json({ error: 'Screenshot not found or unauthorized' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating caption:', error);
    res.status(500).json({ error: 'Failed to update caption' });
  }
});

// ==========================================
// Public Gallery & Social
// ==========================================

// GET /api/gallery/public/feed
router.get('/public/feed', async (req: Request, res: Response) => {
  try {
    const { limit, offset, sortBy, realm, filter } = req.query;
    
    const screenshots = await galleryService.getPublicGallery({
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      sortBy: sortBy as 'recent' | 'popular',
      realm: realm as string,
      filter: filter as string
    });
    
    res.json({ screenshots });
  } catch (error) {
    console.error('Error getting public gallery:', error);
    res.status(500).json({ error: 'Failed to get public gallery' });
  }
});

// POST /api/gallery/screenshot/:screenshotId/toggle-public
router.post('/screenshot/:screenshotId/toggle-public', async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const result = await galleryService.togglePublic(playerId, screenshotId);
    res.json(result);
  } catch (error) {
    console.error('Error toggling public:', error);
    res.status(500).json({ error: 'Failed to toggle public visibility' });
  }
});

// POST /api/gallery/screenshot/:screenshotId/like
router.post('/screenshot/:screenshotId/like', async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const result = await galleryService.likeScreenshot(screenshotId, playerId);
    res.json(result);
  } catch (error) {
    console.error('Error liking screenshot:', error);
    res.status(500).json({ error: 'Failed to like screenshot' });
  }
});

// POST /api/gallery/screenshot/:screenshotId/unlike
router.post('/screenshot/:screenshotId/unlike', async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const result = await galleryService.unlikeScreenshot(screenshotId, playerId);
    res.json(result);
  } catch (error) {
    console.error('Error unliking screenshot:', error);
    res.status(500).json({ error: 'Failed to unlike screenshot' });
  }
});

// POST /api/gallery/screenshot/:screenshotId/share
router.post('/screenshot/:screenshotId/share', async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const { platform } = req.body;
    
    if (!platform) {
      return res.status(400).json({ error: 'platform is required' });
    }
    
    await galleryService.trackShare(screenshotId, platform);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking share:', error);
    res.status(500).json({ error: 'Failed to track share' });
  }
});

// ==========================================
// Albums
// ==========================================

// POST /api/gallery/albums
router.post('/albums', async (req: Request, res: Response) => {
  try {
    const { playerId, name, description } = req.body;
    
    if (!playerId || !name) {
      return res.status(400).json({ error: 'playerId and name are required' });
    }
    
    const result = await galleryService.createAlbum(playerId, name, description);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ error: 'Failed to create album' });
  }
});

// GET /api/gallery/albums/:playerId
router.get('/albums/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const albums = await galleryService.getAlbums(playerId);
    res.json({ albums });
  } catch (error) {
    console.error('Error getting albums:', error);
    res.status(500).json({ error: 'Failed to get albums' });
  }
});

// GET /api/gallery/albums/view/:albumId
router.get('/albums/view/:albumId', async (req: Request, res: Response) => {
  try {
    const { albumId } = req.params;
    const album = await galleryService.getAlbum(albumId);
    
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    const screenshots = await galleryService.getAlbumScreenshots(albumId);
    
    res.json({ album, screenshots });
  } catch (error) {
    console.error('Error getting album:', error);
    res.status(500).json({ error: 'Failed to get album' });
  }
});

// POST /api/gallery/albums/:albumId/add
router.post('/albums/:albumId/add', async (req: Request, res: Response) => {
  try {
    const { albumId } = req.params;
    const { playerId, screenshotId } = req.body;
    
    if (!playerId || !screenshotId) {
      return res.status(400).json({ error: 'playerId and screenshotId are required' });
    }
    
    const success = await galleryService.addToAlbum(playerId, albumId, screenshotId);
    res.json({ success });
  } catch (error) {
    console.error('Error adding to album:', error);
    res.status(500).json({ error: 'Failed to add to album' });
  }
});

// POST /api/gallery/albums/:albumId/remove
router.post('/albums/:albumId/remove', async (req: Request, res: Response) => {
  try {
    const { albumId } = req.params;
    const { playerId, screenshotId } = req.body;
    
    if (!playerId || !screenshotId) {
      return res.status(400).json({ error: 'playerId and screenshotId are required' });
    }
    
    const success = await galleryService.removeFromAlbum(playerId, albumId, screenshotId);
    res.json({ success });
  } catch (error) {
    console.error('Error removing from album:', error);
    res.status(500).json({ error: 'Failed to remove from album' });
  }
});

// DELETE /api/gallery/albums/:albumId
router.delete('/albums/:albumId', async (req: Request, res: Response) => {
  try {
    const { albumId } = req.params;
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const success = await galleryService.deleteAlbum(playerId, albumId);
    res.json({ success });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: 'Failed to delete album' });
  }
});

// ==========================================
// Stats
// ==========================================

// GET /api/gallery/stats/:playerId
router.get('/stats/:playerId', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const stats = await galleryService.getPlayerGalleryStats(playerId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting gallery stats:', error);
    res.status(500).json({ error: 'Failed to get gallery stats' });
  }
});

// ==========================================
// Reporting
// ==========================================

// POST /api/gallery/screenshot/:screenshotId/report
router.post('/screenshot/:screenshotId/report', async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const { reporterId, reason, details } = req.body;
    
    if (!reporterId || !reason) {
      return res.status(400).json({ error: 'reporterId and reason are required' });
    }
    
    const success = await galleryService.reportScreenshot(screenshotId, reporterId, reason, details);
    res.json({ success });
  } catch (error) {
    console.error('Error reporting screenshot:', error);
    res.status(500).json({ error: 'Failed to report screenshot' });
  }
});

export default router;
