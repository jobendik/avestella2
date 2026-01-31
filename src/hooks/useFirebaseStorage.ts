/**
 * useFirebaseStorage hook
 * Provides easy access to Firebase Storage for file uploads
 */

import { useState, useCallback } from 'react';
import {
  uploadScreenshot,
  uploadFile,
  uploadProfilePicture,
  uploadAlbumCover,
  deleteFile,
  getFileUrl,
  listPlayerScreenshots,
  generateUniqueFilename,
  UploadResultInfo,
} from '../firebase';

export interface UseFirebaseStorageOptions {
  /** Player ID for organizing uploads */
  playerId: string;
}

export interface UploadState {
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Upload progress (0-100) */
  progress: number;
  /** Error message if upload failed */
  error: string | null;
  /** Result of last successful upload */
  lastUpload: UploadResultInfo | null;
}

export interface UseFirebaseStorageReturn {
  /** Current upload state */
  state: UploadState;
  
  /** Upload a screenshot from canvas data URL */
  uploadCanvasScreenshot: (dataUrl: string, filename?: string) => Promise<UploadResultInfo | null>;
  
  /** Upload a file from input */
  uploadInputFile: (file: File) => Promise<UploadResultInfo | null>;
  
  /** Upload a profile picture */
  uploadAvatar: (dataUrl: string) => Promise<UploadResultInfo | null>;
  
  /** Upload an album cover */
  uploadCover: (dataUrl: string, albumId: string) => Promise<UploadResultInfo | null>;
  
  /** Delete a file by storage path */
  removeFile: (storagePath: string) => Promise<boolean>;
  
  /** Get download URL for a storage path */
  getUrl: (storagePath: string) => Promise<string | null>;
  
  /** List all player screenshots */
  listScreenshots: () => Promise<string[]>;
  
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for Firebase Storage operations
 */
export function useFirebaseStorage(options: UseFirebaseStorageOptions): UseFirebaseStorageReturn {
  const { playerId } = options;
  
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    lastUpload: null,
  });

  const setUploading = useCallback((isUploading: boolean) => {
    setState(prev => ({ ...prev, isUploading, progress: isUploading ? 0 : 100 }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isUploading: false }));
  }, []);

  const setSuccess = useCallback((result: UploadResultInfo) => {
    setState(prev => ({
      ...prev,
      isUploading: false,
      progress: 100,
      error: null,
      lastUpload: result,
    }));
  }, []);

  const uploadCanvasScreenshot = useCallback(async (
    dataUrl: string,
    filename?: string
  ): Promise<UploadResultInfo | null> => {
    try {
      setUploading(true);
      const result = await uploadScreenshot(dataUrl, {
        playerId,
        filename: filename || generateUniqueFilename('screenshot'),
        contentType: 'image/png',
      });
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload screenshot';
      setError(message);
      return null;
    }
  }, [playerId, setUploading, setSuccess, setError]);

  const uploadInputFile = useCallback(async (file: File): Promise<UploadResultInfo | null> => {
    try {
      setUploading(true);
      const result = await uploadFile(file, {
        playerId,
        filename: file.name,
        contentType: file.type,
      });
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
      return null;
    }
  }, [playerId, setUploading, setSuccess, setError]);

  const uploadAvatar = useCallback(async (dataUrl: string): Promise<UploadResultInfo | null> => {
    try {
      setUploading(true);
      const result = await uploadProfilePicture(dataUrl, playerId);
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(message);
      return null;
    }
  }, [playerId, setUploading, setSuccess, setError]);

  const uploadCover = useCallback(async (
    dataUrl: string,
    albumId: string
  ): Promise<UploadResultInfo | null> => {
    try {
      setUploading(true);
      const result = await uploadAlbumCover(dataUrl, playerId, albumId);
      setSuccess(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload album cover';
      setError(message);
      return null;
    }
  }, [playerId, setUploading, setSuccess, setError]);

  const removeFile = useCallback(async (storagePath: string): Promise<boolean> => {
    try {
      await deleteFile(storagePath);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      setError(message);
      return false;
    }
  }, [setError]);

  const getUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    try {
      return await getFileUrl(storagePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get file URL';
      setError(message);
      return null;
    }
  }, [setError]);

  const listScreenshots = useCallback(async (): Promise<string[]> => {
    try {
      return await listPlayerScreenshots(playerId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list screenshots';
      setError(message);
      return [];
    }
  }, [playerId, setError]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    uploadCanvasScreenshot,
    uploadInputFile,
    uploadAvatar,
    uploadCover,
    removeFile,
    getUrl,
    listScreenshots,
    clearError,
  };
}
