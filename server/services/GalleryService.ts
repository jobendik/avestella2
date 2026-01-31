import { EventEmitter } from 'events';
import {
  Screenshot,
  IScreenshot,
  GalleryAlbum,
  IGalleryAlbum,
  FeaturedScreenshot,
  IFeaturedScreenshot,
  ScreenshotReport
} from '../database/mediaModels.js';
import { PlayerData } from '../database/playerDataModel.js';
import crypto from 'crypto';

interface ScreenshotData {
  imageRef: string;
  thumbnailRef?: string;
  filter?: string;
  template?: string;
  caption?: string;
  stats: {
    fragments: number;
    bonds: number;
    beacons: number;
    level: number;
    stardust?: number;
  };
  location: {
    x: number;
    y: number;
    realm: string;
    biome?: string;
  };
  visiblePlayers?: Array<{ playerId: string; playerName: string }>;
  fileSize?: number;
  dimensions?: { width: number; height: number };
}

interface GalleryQuery {
  limit?: number;
  offset?: number;
  filter?: string;
  template?: string;
  realm?: string;
  albumId?: string;
  sortBy?: 'recent' | 'popular';
}

interface SaveResult {
  success: boolean;
  screenshot?: IScreenshot;
  error?: string;
}

class GalleryService extends EventEmitter {
  private readonly MAX_GALLERY_SIZE = 100;        // Max screenshots per player
  private readonly MAX_ALBUMS = 10;               // Max albums per player
  private readonly MAX_ALBUM_SIZE = 50;           // Max screenshots per album

  async initialize(): Promise<void> {
    console.log('📸 Gallery Service initialized');
  }

  // ==========================================
  // Screenshot Management
  // ==========================================

  async saveScreenshot(playerId: string, playerName: string, data: ScreenshotData): Promise<SaveResult> {
    try {
      // Check gallery limit
      const count = await Screenshot.countDocuments({ playerId });
      if (count >= this.MAX_GALLERY_SIZE) {
        // Delete oldest screenshot
        const oldest = await Screenshot.findOne({ playerId }).sort({ createdAt: 1 });
        if (oldest) {
          await Screenshot.deleteOne({ _id: oldest._id });
          this.emit('screenshot_deleted', { playerId, screenshotId: oldest.screenshotId, reason: 'gallery_full' });
        }
      }

      const screenshotId = `ss_${playerId}_${crypto.randomBytes(8).toString('hex')}`;

      const screenshot = new Screenshot({
        screenshotId,
        playerId,
        playerName,
        imageRef: data.imageRef,
        thumbnailRef: data.thumbnailRef,
        filter: data.filter || 'none',
        template: data.template || 'minimal',
        caption: data.caption?.substring(0, 200),
        stats: {
          fragments: data.stats.fragments || 0,
          bonds: data.stats.bonds || 0,
          beacons: data.stats.beacons || 0,
          level: data.stats.level || 1,
          stardust: data.stats.stardust || 0
        },
        location: {
          x: data.location.x,
          y: data.location.y,
          realm: data.location.realm,
          biome: data.location.biome
        },
        visiblePlayers: data.visiblePlayers || [],
        shares: [],
        isPublic: false,
        likes: 0,
        likedBy: [],
        fileSize: data.fileSize || 0,
        dimensions: data.dimensions || { width: 1920, height: 1080 }
      });

      await screenshot.save();

      this.emit('screenshot_saved', { 
        playerId, 
        screenshotId, 
        realm: data.location.realm 
      });

      return { success: true, screenshot };
    } catch (error) {
      console.error('Error saving screenshot:', error);
      return { success: false, error: 'Failed to save screenshot' };
    }
  }

  async getScreenshot(screenshotId: string): Promise<IScreenshot | null> {
    return Screenshot.findOne({ screenshotId });
  }

  async getGallery(playerId: string, query?: GalleryQuery): Promise<IScreenshot[]> {
    const limit = query?.limit || 20;
    const offset = query?.offset || 0;

    let findQuery: any = { playerId };

    if (query?.filter && query.filter !== 'all') {
      findQuery.filter = query.filter;
    }

    if (query?.template && query.template !== 'all') {
      findQuery.template = query.template;
    }

    if (query?.realm) {
      findQuery['location.realm'] = query.realm;
    }

    const sortField: Record<string, 1 | -1> = query?.sortBy === 'popular' 
      ? { likes: -1, createdAt: -1 } 
      : { createdAt: -1 };

    return Screenshot.find(findQuery)
      .sort(sortField)
      .skip(offset)
      .limit(limit);
  }

  async getGalleryCount(playerId: string): Promise<number> {
    return Screenshot.countDocuments({ playerId });
  }

  async deleteScreenshot(playerId: string, screenshotId: string): Promise<boolean> {
    const result = await Screenshot.deleteOne({ screenshotId, playerId });
    
    if (result.deletedCount > 0) {
      // Remove from any albums
      await GalleryAlbum.updateMany(
        { playerId },
        { $pull: { screenshotIds: screenshotId } }
      );

      this.emit('screenshot_deleted', { playerId, screenshotId, reason: 'user_deleted' });
      return true;
    }
    return false;
  }

  async updateCaption(playerId: string, screenshotId: string, caption: string): Promise<boolean> {
    const result = await Screenshot.findOneAndUpdate(
      { screenshotId, playerId },
      { $set: { caption: caption.substring(0, 200) } }
    );
    return !!result;
  }

  // ==========================================
  // Public Gallery & Social
  // ==========================================

  async togglePublic(playerId: string, screenshotId: string): Promise<{ success: boolean; isPublic: boolean }> {
    const screenshot = await Screenshot.findOne({ screenshotId, playerId });
    if (!screenshot) {
      return { success: false, isPublic: false };
    }

    screenshot.isPublic = !screenshot.isPublic;
    await screenshot.save();

    this.emit('visibility_changed', { 
      playerId, 
      screenshotId, 
      isPublic: screenshot.isPublic 
    });

    return { success: true, isPublic: screenshot.isPublic };
  }

  async likeScreenshot(screenshotId: string, likerPlayerId: string): Promise<{ success: boolean; likes: number }> {
    const screenshot = await Screenshot.findOne({ screenshotId, isPublic: true });
    if (!screenshot) {
      return { success: false, likes: 0 };
    }

    // Check if already liked
    if (screenshot.likedBy.includes(likerPlayerId)) {
      return { success: false, likes: screenshot.likes };
    }

    screenshot.likes += 1;
    screenshot.likedBy.push(likerPlayerId);
    await screenshot.save();

    this.emit('screenshot_liked', { 
      screenshotId, 
      ownerId: screenshot.playerId, 
      likerId: likerPlayerId,
      totalLikes: screenshot.likes
    });

    return { success: true, likes: screenshot.likes };
  }

  async unlikeScreenshot(screenshotId: string, likerPlayerId: string): Promise<{ success: boolean; likes: number }> {
    const result = await Screenshot.findOneAndUpdate(
      { screenshotId, isPublic: true, likedBy: likerPlayerId },
      { 
        $inc: { likes: -1 },
        $pull: { likedBy: likerPlayerId }
      },
      { new: true }
    );

    if (!result) {
      return { success: false, likes: 0 };
    }

    return { success: true, likes: result.likes };
  }

  async getPublicGallery(query?: {
    limit?: number;
    offset?: number;
    sortBy?: 'recent' | 'popular';
    realm?: string;
    filter?: string;
  }): Promise<IScreenshot[]> {
    const limit = query?.limit || 20;
    const offset = query?.offset || 0;
    
    let findQuery: any = { isPublic: true };
    
    if (query?.realm) {
      findQuery['location.realm'] = query.realm;
    }
    
    if (query?.filter && query.filter !== 'all') {
      findQuery.filter = query.filter;
    }

    const sortField: Record<string, 1 | -1> = query?.sortBy === 'popular' 
      ? { likes: -1, createdAt: -1 } 
      : { createdAt: -1 };

    return Screenshot.find(findQuery)
      .sort(sortField)
      .skip(offset)
      .limit(limit);
  }

  // ==========================================
  // Share Tracking
  // ==========================================

  async trackShare(screenshotId: string, platform: string): Promise<void> {
    await Screenshot.findOneAndUpdate(
      { screenshotId },
      { $push: { shares: { platform, timestamp: new Date() } } }
    );

    this.emit('screenshot_shared', { screenshotId, platform });
  }

  async getShareStats(playerId: string): Promise<{
    totalShares: number;
    byPlatform: Record<string, number>;
  }> {
    const screenshots = await Screenshot.find({ playerId });
    
    const stats = {
      totalShares: 0,
      byPlatform: {} as Record<string, number>
    };

    screenshots.forEach(ss => {
      ss.shares.forEach(share => {
        stats.totalShares++;
        stats.byPlatform[share.platform] = (stats.byPlatform[share.platform] || 0) + 1;
      });
    });

    return stats;
  }

  // ==========================================
  // Album Management
  // ==========================================

  async createAlbum(playerId: string, name: string, description?: string): Promise<{ success: boolean; album?: IGalleryAlbum; error?: string }> {
    const albumCount = await GalleryAlbum.countDocuments({ playerId });
    if (albumCount >= this.MAX_ALBUMS) {
      return { success: false, error: 'Maximum albums reached' };
    }

    const albumId = `album_${playerId}_${crypto.randomBytes(6).toString('hex')}`;

    const album = new GalleryAlbum({
      albumId,
      playerId,
      name: name.substring(0, 50),
      description: description?.substring(0, 200),
      screenshotIds: [],
      isDefault: false
    });

    await album.save();

    return { success: true, album };
  }

  async getAlbums(playerId: string): Promise<IGalleryAlbum[]> {
    return GalleryAlbum.find({ playerId }).sort({ createdAt: -1 });
  }

  async getAlbum(albumId: string): Promise<IGalleryAlbum | null> {
    return GalleryAlbum.findOne({ albumId });
  }

  async addToAlbum(playerId: string, albumId: string, screenshotId: string): Promise<boolean> {
    const album = await GalleryAlbum.findOne({ albumId, playerId });
    if (!album) return false;

    if (album.screenshotIds.length >= this.MAX_ALBUM_SIZE) {
      return false;
    }

    if (album.screenshotIds.includes(screenshotId)) {
      return true; // Already in album
    }

    album.screenshotIds.push(screenshotId);
    
    // Set cover if empty
    if (!album.coverScreenshotId) {
      album.coverScreenshotId = screenshotId;
    }

    await album.save();
    return true;
  }

  async removeFromAlbum(playerId: string, albumId: string, screenshotId: string): Promise<boolean> {
    const result = await GalleryAlbum.findOneAndUpdate(
      { albumId, playerId },
      { $pull: { screenshotIds: screenshotId } }
    );
    return !!result;
  }

  async deleteAlbum(playerId: string, albumId: string): Promise<boolean> {
    const result = await GalleryAlbum.deleteOne({ albumId, playerId, isDefault: false });
    return result.deletedCount > 0;
  }

  async getAlbumScreenshots(albumId: string): Promise<IScreenshot[]> {
    const album = await GalleryAlbum.findOne({ albumId });
    if (!album || album.screenshotIds.length === 0) {
      return [];
    }

    return Screenshot.find({ 
      screenshotId: { $in: album.screenshotIds } 
    }).sort({ createdAt: -1 });
  }

  // ==========================================
  // Featured Screenshots (Admin)
  // ==========================================

  async featureScreenshot(
    screenshotId: string, 
    featuredBy: string, 
    category: string, 
    reason?: string
  ): Promise<IFeaturedScreenshot | null> {
    const screenshot = await Screenshot.findOne({ screenshotId, isPublic: true });
    if (!screenshot) return null;

    const featured = new FeaturedScreenshot({
      screenshotId,
      featuredBy,
      featuredReason: reason,
      category,
      priority: 0,
      isActive: true
    });

    await featured.save();

    this.emit('screenshot_featured', { 
      screenshotId, 
      category, 
      ownerId: screenshot.playerId 
    });

    return featured;
  }

  async getFeaturedScreenshots(category?: string): Promise<IFeaturedScreenshot[]> {
    const query: any = { isActive: true };
    if (category) {
      query.category = category;
    }

    const featured = await FeaturedScreenshot
      .find(query)
      .sort({ priority: -1, featuredAt: -1 })
      .limit(20);

    return featured;
  }

  // ==========================================
  // Reporting
  // ==========================================

  async reportScreenshot(
    screenshotId: string, 
    reporterId: string, 
    reason: string, 
    details?: string
  ): Promise<boolean> {
    const reportId = `report_${crypto.randomBytes(8).toString('hex')}`;

    const report = new ScreenshotReport({
      reportId,
      screenshotId,
      reporterId,
      reason,
      details,
      status: 'pending'
    });

    await report.save();

    this.emit('screenshot_reported', { screenshotId, reporterId, reason });

    return true;
  }

  // ==========================================
  // Stats
  // ==========================================

  async getPlayerGalleryStats(playerId: string): Promise<{
    totalScreenshots: number;
    publicScreenshots: number;
    totalLikes: number;
    totalShares: number;
    albumCount: number;
    topFilters: Array<{ filter: string; count: number }>;
  }> {
    const screenshots = await Screenshot.find({ playerId });
    const albums = await GalleryAlbum.countDocuments({ playerId });

    const filterCounts: Record<string, number> = {};
    let totalLikes = 0;
    let totalShares = 0;
    let publicCount = 0;

    screenshots.forEach(ss => {
      filterCounts[ss.filter] = (filterCounts[ss.filter] || 0) + 1;
      totalLikes += ss.likes;
      totalShares += ss.shares.length;
      if (ss.isPublic) publicCount++;
    });

    const topFilters = Object.entries(filterCounts)
      .map(([filter, count]) => ({ filter, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalScreenshots: screenshots.length,
      publicScreenshots: publicCount,
      totalLikes,
      totalShares,
      albumCount: albums,
      topFilters
    };
  }
}

export const galleryService = new GalleryService();
export { GalleryService };
