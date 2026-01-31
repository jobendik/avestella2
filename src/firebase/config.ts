/**
 * Firebase configuration and initialization
 * Ported from legacy_3/src/firebase/config.ts
 * 
 * NOTE: Requires 'firebase' package to be installed:
 * npm install firebase
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let appId: string = 'default-app-id';

/**
 * Initialize Firebase with configuration
 */
export const initializeFirebase = (config: FirebaseConfig, id?: string): void => {
  if (app) return; // Already initialized

  app = initializeApp(config);
  auth = getAuth(app);
  auth = getAuth(app);
  db = getFirestore(app);

  // Initialize Analytics conditionally (only in browser environments)
  isSupported().then(yes => {
    if (yes && config.measurementId) {
      analytics = getAnalytics(app as FirebaseApp);
      console.log('📊 Firebase Analytics initialized');
    }
  });

  if (id) {
    appId = id;
  }
};

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return auth;
};

/**
 * Get Firestore database instance
 */
export const getFirebaseDb = (): Firestore => {
  if (!db) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return db;
};

/**
 * Get Analytics instance (might be null if not supported/initialized)
 */
export const getFirebaseAnalytics = (): Analytics | null => {
  return analytics;
};

/**
 * Get current app ID
 */
export const getAppId = (): string => {
  return appId;
};

/**
 * Get Firebase App instance
 */
export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return app;
};

/**
 * Check if Firebase is initialized
 */
export const isFirebaseInitialized = (): boolean => {
  return app !== null;
};
