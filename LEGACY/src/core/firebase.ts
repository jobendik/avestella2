// Firebase configuration module
import type { FirebaseConfig } from '../types';

// Load from environment variables or use defaults
export const firebaseConfig: FirebaseConfig | null = (() => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    
    if (!apiKey) {
        console.warn('Firebase not configured. Running in local-only mode.');
        return null;
    }
    
    return {
        apiKey,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
})();

// Initialize Firebase (placeholder - requires firebase SDK)
export function initFirebase() {
    if (!firebaseConfig) {
        console.log('Running without Firebase backend');
        return null;
    }
    
    // TODO: Initialize Firebase SDK when added
    console.log('Firebase config loaded');
    return null;
}
