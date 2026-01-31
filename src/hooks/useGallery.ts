// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Gallery Hook
// ═══════════════════════════════════════════════════════════════════════════
// Connects to backend GalleryService for screenshot management
// Integrates Firebase Storage for image blob uploads
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { gameClient } from '../services/GameClient';
import { 
  uploadScreenshot as uploadToStorage, 
  deleteFile as deleteFromStorage,
  generateUniqueFilename,
  isFirebaseInitialized 
} from '../firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Screenshot {
  screenshotId: string;
  playerId: string;
  playerName: string;
  imageRef: string;
  caption?: string;
  filter?: string;
  template?: string;
  location: {
    x: number;
    y: number;
    realm: string;
  };
  visiblePlayers: string[];
  isPublic: boolean;
  likes: number;
  shares: Array<{ platform: string; timestamp: Date }>;
  createdAt: Date;
}

export interface Album {
  albumId: string;
  playerId: string;
  name: string;
  description?: string;
  coverImageRef?: string;
  screenshotIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GalleryStats {
  totalScreenshots: number;
  totalAlbums: number;
  totalLikes: number;
  totalShares: number;
  publicScreenshots: number;
}

export interface UseGalleryReturn {
  // State
  loading: boolean;
  error: string | null;
  uploading: boolean;
  
  // Gallery data
  screenshots: Screenshot[];
  albums: Album[];
  publicGallery: Screenshot[];
  stats: GalleryStats | null;
  
  // Pagination
  hasMore: boolean;
  totalCount: number;
  
  // Actions (with Firebase Storage integration)
  captureAndSave: (options: {
    canvas: HTMLCanvasElement;
    caption?: string;
    filter?: string;
    template?: string;
    location?: { x: number; y: number; realm: string };
    visiblePlayers?: string[];
    isPublic?: boolean;
  }) => Promise<void>;
  
  saveScreenshot: (data: {
    imageRef: string;
    caption?: string;
    filter?: string;
    template?: string;
    location?: { x: number; y: number; realm: string };
    visiblePlayers?: string[];
    isPublic?: boolean;
  }) => void;
  deleteScreenshot: (screenshotId: string, storagePath?: string) => void;
  updateCaption: (screenshotId: string, caption: string) => void;
  togglePublic: (screenshotId: string) => void;
  likeScreenshot: (screenshotId: string) => void;
  
  // Album actions
  createAlbum: (name: string, description?: string) => void;
  addToAlbum: (albumId: string, screenshotId: string) => void;
  removeFromAlbum: (albumId: string, screenshotId: string) => void;
  
  // Navigation
  loadMore: () => void;
  loadPublicGallery: (options?: { realm?: string; sortBy?: 'recent' | 'popular' }) => void;
  refresh: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useGallery(): UseGalleryReturn {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [publicGallery, setPublicGallery] = useState<Screenshot[]>([]);
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;
  
  // Track storage paths for cleanup on delete
  const storagePathsRef = useRef<Map<string, string>>(new Map());

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleGalleryList = (data: any) => {
      setLoading(false);
      if (data?.screenshots) {
        const parsed = data.screenshots.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        }));
        setScreenshots(parsed);
        setTotalCount(data.count || parsed.length);
        setHasMore(parsed.length >= LIMIT);
      }
    };

    const handleScreenshotSaved = (data: any) => {
      if (data?.success && data.screenshot) {
        setScreenshots(prev => [
          { ...data.screenshot, createdAt: new Date(data.screenshot.createdAt) },
          ...prev
        ]);
        setTotalCount(prev => prev + 1);
      } else if (data?.error) {
        setError(data.error);
      }
    };

    const handleScreenshotDeleted = (data: any) => {
      if (data?.success) {
        setScreenshots(prev => prev.filter(s => s.screenshotId !== data.screenshotId));
        setTotalCount(prev => prev - 1);
      }
    };

    const handlePublicToggled = (data: any) => {
      if (data?.success) {
        setScreenshots(prev => prev.map(s => 
          s.screenshotId === data.screenshotId 
            ? { ...s, isPublic: data.isPublic } 
            : s
        ));
      }
    };

    const handleLiked = (data: any) => {
      if (data?.success) {
        setScreenshots(prev => prev.map(s => 
          s.screenshotId === data.screenshotId 
            ? { ...s, likes: data.likes } 
            : s
        ));
        setPublicGallery(prev => prev.map(s => 
          s.screenshotId === data.screenshotId 
            ? { ...s, likes: data.likes } 
            : s
        ));
      }
    };

    const handlePublicList = (data: any) => {
      setLoading(false);
      if (data?.screenshots) {
        const parsed = data.screenshots.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        }));
        setPublicGallery(parsed);
      }
    };

    const handleAlbumsList = (data: any) => {
      if (data?.albums) {
        const parsed = data.albums.map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt)
        }));
        setAlbums(parsed);
      }
    };

    const handleAlbumCreated = (data: any) => {
      if (data?.success && data.album) {
        setAlbums(prev => [
          { ...data.album, createdAt: new Date(data.album.createdAt), updatedAt: new Date(data.album.updatedAt) },
          ...prev
        ]);
      }
    };

    const handleStats = (data: any) => {
      if (data) {
        setStats(data);
      }
    };

    const handleReceivedLike = (data: any) => {
      // Could show notification
      console.log('💖 Someone liked your screenshot!', data);
    };

    // Subscribe to events
    gameClient.on('gallery:list', handleGalleryList);
    gameClient.on('gallery:saved', handleScreenshotSaved);
    gameClient.on('gallery:deleted', handleScreenshotDeleted);
    gameClient.on('gallery:publicToggled', handlePublicToggled);
    gameClient.on('gallery:liked', handleLiked);
    gameClient.on('gallery:publicList', handlePublicList);
    gameClient.on('gallery:albumsList', handleAlbumsList);
    gameClient.on('gallery:albumCreated', handleAlbumCreated);
    gameClient.on('gallery:stats', handleStats);
    gameClient.on('gallery:receivedLike', handleReceivedLike);

    // Initial load
    gameClient.getGallery({ limit: LIMIT, offset: 0 });
    gameClient.getAlbums();
    gameClient.getGalleryStats();

    return () => {
      gameClient.off('gallery:list', handleGalleryList);
      gameClient.off('gallery:saved', handleScreenshotSaved);
      gameClient.off('gallery:deleted', handleScreenshotDeleted);
      gameClient.off('gallery:publicToggled', handlePublicToggled);
      gameClient.off('gallery:liked', handleLiked);
      gameClient.off('gallery:publicList', handlePublicList);
      gameClient.off('gallery:albumsList', handleAlbumsList);
      gameClient.off('gallery:albumCreated', handleAlbumCreated);
      gameClient.off('gallery:stats', handleStats);
      gameClient.off('gallery:receivedLike', handleReceivedLike);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Capture canvas, upload to Firebase Storage, then save metadata to backend
   * This is the recommended way to save screenshots
   */
  const captureAndSave = useCallback(async (options: {
    canvas: HTMLCanvasElement;
    caption?: string;
    filter?: string;
    template?: string;
    location?: { x: number; y: number; realm: string };
    visiblePlayers?: string[];
    isPublic?: boolean;
  }) => {
    const playerId = gameClient.getPlayerId();
    if (!playerId) {
      setError('Not connected to server');
      return;
    }

    if (!isFirebaseInitialized()) {
      setError('Firebase Storage not initialized');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Convert canvas to data URL
      const dataUrl = options.canvas.toDataURL('image/png');
      
      // Upload to Firebase Storage
      const result = await uploadToStorage(dataUrl, {
        playerId,
        filename: generateUniqueFilename('screenshot'),
        contentType: 'image/png',
        metadata: {
          filter: options.filter || '',
          template: options.template || '',
          realm: options.location?.realm || '',
        },
      });

      // Save metadata to backend (imageRef is now the download URL)
      gameClient.saveScreenshot({
        imageRef: result.downloadUrl,
        caption: options.caption,
        filter: options.filter,
        template: options.template,
        location: options.location,
        visiblePlayers: options.visiblePlayers,
        isPublic: options.isPublic,
      });

      // Track storage path for cleanup
      // The screenshotId will be returned in gallery:saved event
      // We'll store it temporarily with the downloadUrl as key
      storagePathsRef.current.set(result.downloadUrl, result.storagePath);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload screenshot';
      setError(message);
    } finally {
      setUploading(false);
    }
  }, []);

  const saveScreenshot = useCallback((data: {
    imageRef: string;
    caption?: string;
    filter?: string;
    template?: string;
    location?: { x: number; y: number; realm: string };
    visiblePlayers?: string[];
    isPublic?: boolean;
  }) => {
    gameClient.saveScreenshot(data);
  }, []);

  const deleteScreenshot = useCallback(async (screenshotId: string, storagePath?: string) => {
    // Find the screenshot to get its imageRef
    const screenshot = screenshots.find(s => s.screenshotId === screenshotId);
    
    // Try to delete from Firebase Storage if we have a storage path
    let pathToDelete = storagePath;
    if (!pathToDelete && screenshot?.imageRef) {
      pathToDelete = storagePathsRef.current.get(screenshot.imageRef);
    }
    
    if (pathToDelete) {
      try {
        await deleteFromStorage(pathToDelete);
        storagePathsRef.current.delete(screenshot?.imageRef || '');
      } catch (err) {
        console.warn('Failed to delete from storage:', err);
        // Continue with backend deletion even if storage delete fails
      }
    }
    
    gameClient.deleteScreenshot(screenshotId);
  }, [screenshots]);

  const updateCaption = useCallback((screenshotId: string, caption: string) => {
    gameClient.updateScreenshotCaption(screenshotId, caption);
  }, []);

  const togglePublic = useCallback((screenshotId: string) => {
    gameClient.toggleScreenshotPublic(screenshotId);
  }, []);

  const likeScreenshot = useCallback((screenshotId: string) => {
    gameClient.likeScreenshot(screenshotId);
  }, []);

  const createAlbum = useCallback((name: string, description?: string) => {
    gameClient.createAlbum(name, description);
  }, []);

  const addToAlbum = useCallback((albumId: string, screenshotId: string) => {
    gameClient.addToAlbum(albumId, screenshotId);
  }, []);

  const removeFromAlbum = useCallback((albumId: string, screenshotId: string) => {
    gameClient.removeFromAlbum(albumId, screenshotId);
  }, []);

  const loadMore = useCallback(() => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    gameClient.getGallery({ limit: LIMIT, offset: newOffset });
  }, [offset]);

  const loadPublicGallery = useCallback((options?: { realm?: string; sortBy?: 'recent' | 'popular' }) => {
    setLoading(true);
    gameClient.getPublicGallery(options);
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setOffset(0);
    gameClient.getGallery({ limit: LIMIT, offset: 0 });
    gameClient.getAlbums();
    gameClient.getGalleryStats();
  }, []);

  return {
    loading,
    error,
    uploading,
    screenshots,
    albums,
    publicGallery,
    stats,
    hasMore,
    totalCount,
    captureAndSave,
    saveScreenshot,
    deleteScreenshot,
    updateCaption,
    togglePublic,
    likeScreenshot,
    createAlbum,
    addToAlbum,
    removeFromAlbum,
    loadMore,
    loadPublicGallery,
    refresh
  };
}

export default useGallery;
