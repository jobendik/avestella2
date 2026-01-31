/**
 * Firebase module exports
 */

// Config
export {
  initializeFirebase,
  getFirebaseAuth,
  getFirebaseDb,
  getAppId,
  getFirebaseApp,
  isFirebaseInitialized,
  type FirebaseConfig,
} from './config';

// Auth
export {
  signInUser,
  onAuthChange,
  getCurrentUser,
  signOutUser,
  type User,
} from './auth';

// Database
export {
  updatePlayerPresence,
  deletePlayerPresence,
  subscribeToPlayers,
  sendChatMessage,
  subscribeToChat,
  placeEcho,
  subscribeToEchoes,
  cleanupPlayerPresence,
  type Player,
  type ChatMessage,
  type Echo,
} from './database';

// Storage
export {
  getFirebaseStorage,
  uploadScreenshot,
  uploadFile,
  uploadProfilePicture,
  uploadAlbumCover,
  deleteFile,
  getFileUrl,
  listPlayerScreenshots,
  deleteAllPlayerScreenshots,
  generateUniqueFilename,
  type UploadOptions,
  type UploadResultInfo,
} from './storage';

