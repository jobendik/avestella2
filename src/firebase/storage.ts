/**
 * Firebase Storage service for file uploads
 * Handles screenshot uploads for the Gallery feature
 */

import { getStorage, ref, uploadBytes, uploadString, getDownloadURL, deleteObject, listAll, StorageReference, UploadResult } from 'firebase/storage';
import { getFirebaseApp, isFirebaseInitialized } from './config';

// Storage instance (lazy initialized)
let storage: ReturnType<typeof getStorage> | null = null;

/**
 * Get Firebase Storage instance
 */
export const getFirebaseStorage = () => {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
};

/**
 * Upload options for screenshots
 */
export interface UploadOptions {
  /** Player ID for organizing uploads */
  playerId: string;
  /** Optional custom filename (defaults to timestamp) */
  filename?: string;
  /** Content type of the file */
  contentType?: string;
  /** Optional metadata */
  metadata?: Record<string, string>;
}

/**
 * Upload result with URL and path
 */
export interface UploadResultInfo {
  /** Download URL for the uploaded file */
  downloadUrl: string;
  /** Storage path for the file */
  storagePath: string;
  /** File size in bytes */
  size: number;
  /** Upload timestamp */
  uploadedAt: Date;
}

/**
 * Upload a screenshot as base64 data URL
 * @param dataUrl - Base64 data URL (e.g., from canvas.toDataURL())
 * @param options - Upload options
 * @returns Upload result with download URL
 */
export const uploadScreenshot = async (
  dataUrl: string,
  options: UploadOptions
): Promise<UploadResultInfo> => {
  const storage = getFirebaseStorage();
  
  const filename = options.filename || `screenshot_${Date.now()}.png`;
  const storagePath = `screenshots/${options.playerId}/${filename}`;
  const storageRef = ref(storage, storagePath);
  
  // Upload the base64 data URL
  const result = await uploadString(storageRef, dataUrl, 'data_url', {
    contentType: options.contentType || 'image/png',
    customMetadata: options.metadata,
  });
  
  // Get the download URL
  const downloadUrl = await getDownloadURL(result.ref);
  
  return {
    downloadUrl,
    storagePath,
    size: result.metadata.size || 0,
    uploadedAt: new Date(),
  };
};

/**
 * Upload a file blob (e.g., from file input)
 * @param file - File or Blob to upload
 * @param options - Upload options
 * @returns Upload result with download URL
 */
export const uploadFile = async (
  file: Blob | File,
  options: UploadOptions
): Promise<UploadResultInfo> => {
  const storage = getFirebaseStorage();
  
  const filename = options.filename || 
    (file instanceof File ? file.name : `file_${Date.now()}`);
  const storagePath = `uploads/${options.playerId}/${filename}`;
  const storageRef = ref(storage, storagePath);
  
  // Upload the blob
  const result = await uploadBytes(storageRef, file, {
    contentType: options.contentType || file.type || 'application/octet-stream',
    customMetadata: options.metadata,
  });
  
  // Get the download URL
  const downloadUrl = await getDownloadURL(result.ref);
  
  return {
    downloadUrl,
    storagePath,
    size: result.metadata.size || 0,
    uploadedAt: new Date(),
  };
};

/**
 * Upload a profile picture
 * @param dataUrl - Base64 data URL
 * @param playerId - Player ID
 * @returns Upload result with download URL
 */
export const uploadProfilePicture = async (
  dataUrl: string,
  playerId: string
): Promise<UploadResultInfo> => {
  const storage = getFirebaseStorage();
  
  const storagePath = `profiles/${playerId}/avatar.png`;
  const storageRef = ref(storage, storagePath);
  
  const result = await uploadString(storageRef, dataUrl, 'data_url', {
    contentType: 'image/png',
    customMetadata: {
      playerId,
      uploadedAt: new Date().toISOString(),
    },
  });
  
  const downloadUrl = await getDownloadURL(result.ref);
  
  return {
    downloadUrl,
    storagePath,
    size: result.metadata.size || 0,
    uploadedAt: new Date(),
  };
};

/**
 * Upload an album cover image
 * @param dataUrl - Base64 data URL
 * @param playerId - Player ID
 * @param albumId - Album ID
 * @returns Upload result with download URL
 */
export const uploadAlbumCover = async (
  dataUrl: string,
  playerId: string,
  albumId: string
): Promise<UploadResultInfo> => {
  const storage = getFirebaseStorage();
  
  const storagePath = `albums/${playerId}/${albumId}/cover.png`;
  const storageRef = ref(storage, storagePath);
  
  const result = await uploadString(storageRef, dataUrl, 'data_url', {
    contentType: 'image/png',
    customMetadata: {
      playerId,
      albumId,
      uploadedAt: new Date().toISOString(),
    },
  });
  
  const downloadUrl = await getDownloadURL(result.ref);
  
  return {
    downloadUrl,
    storagePath,
    size: result.metadata.size || 0,
    uploadedAt: new Date(),
  };
};

/**
 * Delete a file from storage
 * @param storagePath - Full storage path
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
};

/**
 * Get download URL for a storage path
 * @param storagePath - Full storage path
 * @returns Download URL
 */
export const getFileUrl = async (storagePath: string): Promise<string> => {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, storagePath);
  return getDownloadURL(storageRef);
};

/**
 * List all screenshots for a player
 * @param playerId - Player ID
 * @returns Array of storage paths
 */
export const listPlayerScreenshots = async (playerId: string): Promise<string[]> => {
  const storage = getFirebaseStorage();
  const folderRef = ref(storage, `screenshots/${playerId}`);
  
  const result = await listAll(folderRef);
  return result.items.map(item => item.fullPath);
};

/**
 * Delete all screenshots for a player
 * @param playerId - Player ID
 */
export const deleteAllPlayerScreenshots = async (playerId: string): Promise<void> => {
  const paths = await listPlayerScreenshots(playerId);
  await Promise.all(paths.map(path => deleteFile(path)));
};

/**
 * Generate a unique filename with timestamp
 * @param prefix - Filename prefix
 * @param extension - File extension (default: png)
 * @returns Unique filename
 */
export const generateUniqueFilename = (
  prefix: string = 'file',
  extension: string = 'png'
): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
};
