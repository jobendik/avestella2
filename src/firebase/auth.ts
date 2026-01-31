/**
 * Firebase authentication utilities
 * Ported from legacy_3/src/firebase/auth.ts
 * 
 * NOTE: Requires 'firebase' package to be installed:
 * npm install firebase
 */

import { 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

/**
 * Sign in user (anonymous or with custom token)
 */
export const signInUser = async (customToken?: string): Promise<User> => {
  const auth = getFirebaseAuth();
  
  if (customToken) {
    const result = await signInWithCustomToken(auth, customToken);
    return result.user;
  } else {
    const result = await signInAnonymously(auth);
    return result.user;
  }
};

/**
 * Listen for auth state changes
 */
export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): User | null => {
  const auth = getFirebaseAuth();
  return auth.currentUser;
};

/**
 * Sign out current user
 */
export const signOutUser = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  await auth.signOut();
};

export type { User };
