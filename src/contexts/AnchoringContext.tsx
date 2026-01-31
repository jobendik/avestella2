// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Anchoring Context
// Global state management for the "Anchor" (persistent identity) system
// ═══════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useCallback, useEffect, useState, useRef, type ReactNode } from 'react';
import { useAnchoring, type UseAnchoringReturn, type AnchorProvider, type AnchorTrigger } from '@/hooks/useAnchoring';

type User = any; // Simplified for when Firebase isn't available

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AnchoringContextType extends UseAnchoringReturn {
  // Firebase user state
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Enhanced actions that handle Firebase
  anchorWithGoogle: () => Promise<boolean>;
  
  // Light identity (the "you exist immediately" part)
  lightId: string | null;
  lightName: string;
  setLightName: (name: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Creation
// ─────────────────────────────────────────────────────────────────────────────

const AnchoringContext = createContext<AnchoringContextType | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

export interface AnchoringProviderProps {
  children: ReactNode;
}

export function AnchoringProvider({ children }: AnchoringProviderProps): JSX.Element {
  const anchoring = useAnchoring();
  
  // Firebase state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Light identity (works without anchoring)
  const [lightName, setLightName] = useState(() => {
    const saved = localStorage.getItem('avestella_light_name');
    return saved || generateLightName();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Anonymous Sign-In on First Launch (Firebase optional)
  // ─────────────────────────────────────────────────────────────────────────

  const firebaseModulesRef = useRef<any>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initializeAuth = async () => {
      try {
        // Dynamically import Firebase modules
        const [firebaseAuthModule, firebaseConfigModule] = await Promise.all([
          import('firebase/auth'),
          import('@/firebase/config')
        ]);
        
        firebaseModulesRef.current = firebaseAuthModule;
        
        const auth = firebaseConfigModule.getFirebaseAuth();
        
        // Listen for auth state changes
        unsubscribe = firebaseAuthModule.onAuthStateChanged(auth, async (firebaseUser: any) => {
          if (firebaseUser) {
            setUser(firebaseUser);
            
            // Check if this is a linked (anchored) account
            const isAnonymous = firebaseUser.isAnonymous;
            if (!isAnonymous && !anchoring.isAnchored) {
              // User was previously anchored, restore state
              const provider = firebaseUser.providerData[0]?.providerId;
              if (provider === 'google.com') {
                anchoring.completeAnchoring('google');
              }
            }
          } else {
            // No user, sign in anonymously (the "Light exists immediately" principle)
            try {
              await firebaseAuthModule.signInAnonymously(auth);
            } catch (err) {
              console.warn('Anonymous sign-in failed:', err);
              // Don't show error - just work in demo mode
            }
          }
          
          setIsLoading(false);
        });
      } catch (err) {
        console.log('Anchoring: Firebase not configured, running in demo mode');
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Persist Light Name
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('avestella_light_name', lightName);
  }, [lightName]);

  // ─────────────────────────────────────────────────────────────────────────
  // Account Linking (The "Anchoring" Action)
  // ─────────────────────────────────────────────────────────────────────────

  const anchorWithGoogle = useCallback(async (): Promise<boolean> => {
    const firebaseAuth = firebaseModulesRef.current;
    
    // Demo mode - just complete anchoring without Firebase
    if (!firebaseAuth) {
      console.log('Anchoring: Demo mode - simulating Google sign-in');
      await anchoring.completeAnchoring('google');
      return true;
    }
    
    if (!user) {
      // In demo mode, still allow anchoring
      console.log('Anchoring: No user, completing in demo mode');
      await anchoring.completeAnchoring('google');
      return true;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const { getFirebaseAuth } = await import('@/firebase/config');
      const auth = getFirebaseAuth();
      const provider = new firebaseAuth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      if (user.isAnonymous) {
        // Link the anonymous account to Google
        await firebaseAuth.linkWithPopup(user, provider);
      } else {
        // Already signed in with a provider
        await firebaseAuth.signInWithPopup(auth, provider);
      }
      
      await anchoring.completeAnchoring('google');
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('Google anchoring failed:', err);
      
      if (err.code === 'auth/credential-already-in-use') {
        setError('This anchor is already connected to another light.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else {
        setError('The anchor could not be set. Please try again.');
      }
      
      setIsLoading(false);
      return false;
    }
  }, [user, anchoring]);

  // ─────────────────────────────────────────────────────────────────────────
  // Context Value
  // ─────────────────────────────────────────────────────────────────────────

  const value: AnchoringContextType = {
    ...anchoring,
    
    // Firebase state
    user,
    isLoading,
    error,
    
    // Enhanced actions
    anchorWithGoogle,
    
    // Light identity
    lightId: user?.uid || null,
    lightName,
    setLightName,
  };

  return (
    <AnchoringContext.Provider value={value}>
      {children}
    </AnchoringContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook for Consuming Context
// ─────────────────────────────────────────────────────────────────────────────

export function useAnchoringContext(): AnchoringContextType {
  const context = useContext(AnchoringContext);
  
  if (!context) {
    throw new Error('useAnchoringContext must be used within an AnchoringProvider');
  }
  
  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Generate Atmospheric Light Name
// ─────────────────────────────────────────────────────────────────────────────

function generateLightName(): string {
  const prefixes = [
    'Wandering', 'Gentle', 'Quiet', 'Distant', 'Soft',
    'Fading', 'Warm', 'Glowing', 'Drifting', 'Silent',
    'Bright', 'Pale', 'Flickering', 'Steady', 'Ancient',
  ];
  
  const suffixes = [
    'Light', 'Glow', 'Spark', 'Star', 'Flame',
    'Beam', 'Ray', 'Shimmer', 'Flash', 'Gleam',
  ];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix} ${suffix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export type { AnchorProvider, AnchorTrigger };
