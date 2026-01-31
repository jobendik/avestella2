/**
 * Tests for Firebase Storage Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock Firebase Storage functions
const mockUploadScreenshot = vi.fn();
const mockUploadFile = vi.fn();
const mockUploadProfilePicture = vi.fn();
const mockUploadAlbumCover = vi.fn();
const mockDeleteFile = vi.fn();
const mockGetFileUrl = vi.fn();
const mockListPlayerScreenshots = vi.fn();

vi.mock('../firebase', () => ({
  uploadScreenshot: (...args: any[]) => mockUploadScreenshot(...args),
  uploadFile: (...args: any[]) => mockUploadFile(...args),
  uploadProfilePicture: (...args: any[]) => mockUploadProfilePicture(...args),
  uploadAlbumCover: (...args: any[]) => mockUploadAlbumCover(...args),
  deleteFile: (...args: any[]) => mockDeleteFile(...args),
  getFileUrl: (...args: any[]) => mockGetFileUrl(...args),
  listPlayerScreenshots: (...args: any[]) => mockListPlayerScreenshots(...args),
  generateUniqueFilename: () => 'test_123456_abc123.png',
  isFirebaseInitialized: () => true
}));

import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

describe('useFirebaseStorage', () => {
  const testPlayerId = 'test-player-123';
  const mockUploadResult = {
    downloadUrl: 'https://storage.test/file.png',
    storagePath: 'screenshots/test-player-123/file.png',
    size: 12345,
    uploadedAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadScreenshot.mockResolvedValue(mockUploadResult);
    mockUploadFile.mockResolvedValue(mockUploadResult);
    mockUploadProfilePicture.mockResolvedValue(mockUploadResult);
    mockUploadAlbumCover.mockResolvedValue(mockUploadResult);
    mockDeleteFile.mockResolvedValue(undefined);
    mockGetFileUrl.mockResolvedValue('https://storage.test/file.png');
    mockListPlayerScreenshots.mockResolvedValue(['path/to/screenshot1.png', 'path/to/screenshot2.png']);
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    expect(result.current.state.isUploading).toBe(false);
    expect(result.current.state.progress).toBe(0);
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.lastUpload).toBeNull();
  });

  it('should upload canvas screenshot successfully', async () => {
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    const dataUrl = 'data:image/png;base64,testdata';
    
    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadCanvasScreenshot(dataUrl);
    });
    
    expect(mockUploadScreenshot).toHaveBeenCalledWith(dataUrl, {
      playerId: testPlayerId,
      filename: 'test_123456_abc123.png',
      contentType: 'image/png'
    });
    
    expect(uploadResult).toEqual(mockUploadResult);
    expect(result.current.state.lastUpload).toEqual(mockUploadResult);
    expect(result.current.state.isUploading).toBe(false);
  });

  it('should handle upload errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockUploadScreenshot.mockRejectedValue(new Error(errorMessage));
    
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadCanvasScreenshot('data:image/png;base64,testdata');
    });
    
    expect(uploadResult).toBeNull();
    expect(result.current.state.error).toBe(errorMessage);
    expect(result.current.state.isUploading).toBe(false);
  });

  it('should upload file from input', async () => {
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    const mockFile = new File(['test content'], 'test.png', { type: 'image/png' });
    
    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadInputFile(mockFile);
    });
    
    expect(mockUploadFile).toHaveBeenCalledWith(mockFile, {
      playerId: testPlayerId,
      filename: 'test.png',
      contentType: 'image/png'
    });
    
    expect(uploadResult).toEqual(mockUploadResult);
  });

  it('should upload avatar', async () => {
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    const dataUrl = 'data:image/png;base64,avatardata';
    
    await act(async () => {
      await result.current.uploadAvatar(dataUrl);
    });
    
    expect(mockUploadProfilePicture).toHaveBeenCalledWith(dataUrl, testPlayerId);
  });

  it('should upload album cover', async () => {
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    const dataUrl = 'data:image/png;base64,coverdata';
    const albumId = 'album-123';
    
    await act(async () => {
      await result.current.uploadCover(dataUrl, albumId);
    });
    
    expect(mockUploadAlbumCover).toHaveBeenCalledWith(dataUrl, testPlayerId, albumId);
  });

  it('should delete file', async () => {
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    const storagePath = 'screenshots/test-player-123/file.png';
    
    let deleteResult: boolean;
    await act(async () => {
      deleteResult = await result.current.removeFile(storagePath);
    });
    
    expect(mockDeleteFile).toHaveBeenCalledWith(storagePath);
    expect(deleteResult!).toBe(true);
  });

  it('should get file URL', async () => {
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    const storagePath = 'screenshots/test-player-123/file.png';
    
    let url: string | null;
    await act(async () => {
      url = await result.current.getUrl(storagePath);
    });
    
    expect(mockGetFileUrl).toHaveBeenCalledWith(storagePath);
    expect(url!).toBe('https://storage.test/file.png');
  });

  it('should list player screenshots', async () => {
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    let paths: string[];
    await act(async () => {
      paths = await result.current.listScreenshots();
    });
    
    expect(mockListPlayerScreenshots).toHaveBeenCalledWith(testPlayerId);
    expect(paths!).toEqual(['path/to/screenshot1.png', 'path/to/screenshot2.png']);
  });

  it('should clear error', async () => {
    mockUploadScreenshot.mockRejectedValue(new Error('Test error'));
    
    const { result } = renderHook(() => useFirebaseStorage({ playerId: testPlayerId }));
    
    await act(async () => {
      await result.current.uploadCanvasScreenshot('data:image/png;base64,test');
    });
    
    expect(result.current.state.error).toBe('Test error');
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.state.error).toBeNull();
  });
});
