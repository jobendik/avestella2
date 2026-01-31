/**
 * Tests for Phase 1 Backend Hooks
 * Tests the useGallery hook (most straightforward to test)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock data
const mockScreenshots = [
  {
    screenshotId: 'ss-1',
    playerId: 'test-player-123',
    playerName: 'TestPlayer',
    imageRef: 'https://storage.test/ss1.png',
    caption: 'My first screenshot',
    isPublic: false,
    likes: 5,
    shares: [],
    createdAt: new Date()
  }
];

const mockGalleryStats = {
  totalScreenshots: 1,
  totalAlbums: 0,
  totalLikes: 5,
  totalShares: 0,
  publicScreenshots: 0
};

// Mock the gameClient before imports
vi.mock('../services/GameClient', () => {
  const EventEmitter = require('events');
  
  class MockGameClient extends EventEmitter {
    private playerId = 'test-player-123';
    private realm = 'genesis';
    
    getPlayerId() { return this.playerId; }
    getRealm() { return this.realm; }
    
    // Gallery methods
    getGallery() { 
      setTimeout(() => {
        this.emit('gallery:list', { screenshots: mockScreenshots, count: 1 }); 
      }, 0);
    }
    getAlbums() { 
      setTimeout(() => {
        this.emit('gallery:albumsList', { albums: [] }); 
      }, 0);
    }
    getGalleryStats() { 
      setTimeout(() => {
        this.emit('gallery:stats', mockGalleryStats); 
      }, 0);
    }
    saveScreenshot(data: any) { 
      setTimeout(() => {
        this.emit('gallery:saved', { 
          success: true, 
          screenshot: { 
            screenshotId: 'new-1', 
            ...data, 
            playerId: 'test-player-123',
            playerName: 'TestPlayer',
            likes: 0,
            shares: [],
            createdAt: new Date() 
          } 
        }); 
      }, 0);
    }
    deleteScreenshot(id: string) { 
      setTimeout(() => {
        this.emit('gallery:deleted', { success: true, screenshotId: id }); 
      }, 0);
    }
    updateScreenshotCaption() {}
    toggleScreenshotPublic() {}
    likeScreenshot() {}
    createAlbum() {}
    addToAlbum() {}
    removeFromAlbum() {}
    getPublicGallery() {}
  }
  
  return {
    gameClient: new MockGameClient()
  };
});

// Mock Firebase
vi.mock('../firebase', () => ({
  isFirebaseInitialized: () => true,
  uploadScreenshot: vi.fn().mockResolvedValue({
    downloadUrl: 'https://storage.test/screenshot.png',
    storagePath: 'screenshots/test-player-123/screenshot.png',
    size: 12345,
    uploadedAt: new Date()
  }),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  generateUniqueFilename: () => 'screenshot_123456.png'
}));

// Import hooks after mocks are set up
import { useGallery } from '../hooks/useGallery';

describe('useGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load screenshots on mount', async () => {
    const { result } = renderHook(() => useGallery());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.screenshots).toHaveLength(1);
    expect(result.current.screenshots[0].screenshotId).toBe('ss-1');
  });

  it('should load gallery stats', async () => {
    const { result } = renderHook(() => useGallery());
    
    await waitFor(() => {
      expect(result.current.stats).toBeDefined();
    });
    
    expect(result.current.stats?.totalScreenshots).toBe(1);
    expect(result.current.stats?.totalLikes).toBe(5);
  });

  it('should delete screenshot', async () => {
    const { result } = renderHook(() => useGallery());
    
    await waitFor(() => {
      expect(result.current.screenshots).toHaveLength(1);
    });
    
    act(() => {
      result.current.deleteScreenshot('ss-1');
    });
    
    await waitFor(() => {
      expect(result.current.screenshots).toHaveLength(0);
    });
  });

  it('should save new screenshot', async () => {
    const { result } = renderHook(() => useGallery());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    act(() => {
      result.current.saveScreenshot({
        imageRef: 'https://storage.test/new.png',
        caption: 'New screenshot',
        isPublic: true
      });
    });
    
    await waitFor(() => {
      expect(result.current.screenshots.length).toBe(2);
    });
  });

  it('should have uploading state available', async () => {
    const { result } = renderHook(() => useGallery());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Check that uploading state exists and is false initially
    expect(result.current.uploading).toBe(false);
  });

  it('should have captureAndSave function available', async () => {
    const { result } = renderHook(() => useGallery());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(typeof result.current.captureAndSave).toBe('function');
  });
});
