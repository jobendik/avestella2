// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Analytics Hook
// Tracks player behavior, session data, and game events for insights
// INTEGRATED WITH FIREBASE ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { getFirebaseAnalytics } from '@/firebase/config';
import { logEvent } from 'firebase/analytics';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  id: string;
  type: string;
  category: 'gameplay' | 'social' | 'progression' | 'economy' | 'ui' | 'system';
  data?: Record<string, any>;
  timestamp: number;
  sessionId: string;
}

export interface AnalyticsMilestone {
  id: string;
  name: string;
  achievedAt: number;
  sessionId: string;
}

export interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  eventsCount: number;
  fragmentsCollected: number;
  bondsFormed: number;
  beaconsLit: number;
  distanceTraveled: number;
}

export interface AnalyticsState {
  // Current session
  currentSessionId: string;
  sessionStartTime: number;

  // All-time stats
  totalSessions: number;
  totalPlayTime: number;
  totalEvents: number;

  // Events log (last 500 events)
  events: AnalyticsEvent[];

  // Milestones achieved
  milestones: AnalyticsMilestone[];

  // Session history (last 30 sessions)
  sessionHistory: SessionData[];

  // Retention metrics
  firstPlayDate: string | null;
  lastPlayDate: string | null;
  daysPlayed: number;
  longestStreak: number;
  currentStreak: number;

  // Feature usage tracking
  featureUsage: Record<string, number>;
}

export interface UseAnalyticsReturn {
  state: AnalyticsState;
  trackEvent: (type: string, category: AnalyticsEvent['category'], data?: Record<string, any>) => void;
  trackMilestone: (id: string, name: string) => void;
  startSession: () => void;
  endSession: (sessionStats?: Partial<SessionData>) => void;
  trackFeatureUsage: (feature: string) => void;
  getSessionDuration: () => number;
  exportAnalytics: () => string;
  clearAnalytics: () => void;
  getRetentionMetrics: () => { daysSinceFirst: number; retention: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'avestella_analytics';
const MAX_EVENTS = 500;
const MAX_SESSIONS = 30;

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_STATE: AnalyticsState = {
  currentSessionId: '',
  sessionStartTime: 0,
  totalSessions: 0,
  totalPlayTime: 0,
  totalEvents: 0,
  events: [],
  milestones: [],
  sessionHistory: [],
  firstPlayDate: null,
  lastPlayDate: null,
  daysPlayed: 0,
  longestStreak: 0,
  currentStreak: 0,
  featureUsage: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAnalytics(): UseAnalyticsReturn {
  const [state, setState] = useState<AnalyticsState>(() => {
    const saved = loadFromStorage<AnalyticsState>(STORAGE_KEY, DEFAULT_STATE);
    return { ...DEFAULT_STATE, ...saved };
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save
  const debouncedSave = useCallback((newState: AnalyticsState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(STORAGE_KEY, newState);
    }, 1000);
  }, []);

  // Start a new session
  const startSession = useCallback(() => {
    const sessionId = generateSessionId();
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    setState(prev => {
      const isNewDay = prev.lastPlayDate !== today;
      const isConsecutiveDay = prev.lastPlayDate &&
        (new Date(today).getTime() - new Date(prev.lastPlayDate).getTime()) === 86400000;

      const newState: AnalyticsState = {
        ...prev,
        currentSessionId: sessionId,
        sessionStartTime: now,
        totalSessions: prev.totalSessions + 1,
        firstPlayDate: prev.firstPlayDate || today,
        lastPlayDate: today,
        daysPlayed: isNewDay ? prev.daysPlayed + 1 : prev.daysPlayed,
        currentStreak: isConsecutiveDay ? prev.currentStreak + 1 : (isNewDay ? 1 : prev.currentStreak),
        longestStreak: Math.max(prev.longestStreak, isConsecutiveDay ? prev.currentStreak + 1 : 1),
      };

      debouncedSave(newState);

      // Firebase Analytics: Start Session
      const analytics = getFirebaseAnalytics();
      if (analytics) {
        logEvent(analytics, 'session_start', {
          session_id: sessionId,
          timestamp: now
        });
      }

      return newState;
    });
  }, [debouncedSave]);

  // End current session
  const endSession = useCallback((sessionStats?: Partial<SessionData>) => {
    const now = Date.now();

    setState(prev => {
      if (!prev.currentSessionId) return prev;

      const duration = Math.floor((now - prev.sessionStartTime) / 1000);

      const session: SessionData = {
        id: prev.currentSessionId,
        startTime: prev.sessionStartTime,
        endTime: now,
        duration,
        eventsCount: prev.events.filter(e => e.sessionId === prev.currentSessionId).length,
        fragmentsCollected: sessionStats?.fragmentsCollected || 0,
        bondsFormed: sessionStats?.bondsFormed || 0,
        beaconsLit: sessionStats?.beaconsLit || 0,
        distanceTraveled: sessionStats?.distanceTraveled || 0,
      };

      const newState: AnalyticsState = {
        ...prev,
        totalPlayTime: prev.totalPlayTime + duration,
        sessionHistory: [session, ...prev.sessionHistory].slice(0, MAX_SESSIONS),
        currentSessionId: '',
        sessionStartTime: 0,
      };

      debouncedSave(newState);

      // Firebase Analytics: End Session
      const analytics = getFirebaseAnalytics();
      if (analytics) {
        logEvent(analytics, 'session_end', {
          session_id: prev.currentSessionId,
          duration,
          events_count: prev.events.filter(e => e.sessionId === prev.currentSessionId).length,
          ...sessionStats
        });
      }

      return newState;
    });
  }, [debouncedSave]);

  // Track an event
  const trackEvent = useCallback((
    type: string,
    category: AnalyticsEvent['category'],
    data?: Record<string, any>
  ) => {
    setState(prev => {
      if (!prev.currentSessionId) return prev;

      const event: AnalyticsEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type,
        category,
        data,
        timestamp: Date.now(),
        sessionId: prev.currentSessionId,
      };

      const newState: AnalyticsState = {
        ...prev,
        events: [event, ...prev.events].slice(0, MAX_EVENTS),
        totalEvents: prev.totalEvents + 1,
      };

      debouncedSave(newState);

      // Firebase Analytics: Track Event
      const analytics = getFirebaseAnalytics();
      if (analytics) {
        logEvent(analytics, type, {
          category,
          session_id: prev.currentSessionId,
          ...data
        });
      }

      return newState;
    });
  }, [debouncedSave]);

  // Track a milestone
  const trackMilestone = useCallback((id: string, name: string) => {
    setState(prev => {
      // Don't duplicate milestones
      if (prev.milestones.some(m => m.id === id)) return prev;

      const milestone: AnalyticsMilestone = {
        id,
        name,
        achievedAt: Date.now(),
        sessionId: prev.currentSessionId,
      };

      const newState: AnalyticsState = {
        ...prev,
        milestones: [...prev.milestones, milestone],
      };

      debouncedSave(newState);

      // Firebase Analytics: Track Milestone
      const analytics = getFirebaseAnalytics();
      if (analytics) {
        logEvent(analytics, 'milestone_unlocked', {
          milestone_id: id,
          milestone_name: name,
          session_id: prev.currentSessionId
        });
      }

      return newState;
    });
  }, [debouncedSave]);

  // Track feature usage
  const trackFeatureUsage = useCallback((feature: string) => {
    setState(prev => {
      const newState: AnalyticsState = {
        ...prev,
        featureUsage: {
          ...prev.featureUsage,
          [feature]: (prev.featureUsage[feature] || 0) + 1,
        },
      };

      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);

  // Get current session duration
  const getSessionDuration = useCallback(() => {
    if (!state.sessionStartTime) return 0;
    return Math.floor((Date.now() - state.sessionStartTime) / 1000);
  }, [state.sessionStartTime]);

  // Export analytics to JSON
  const exportAnalytics = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      ...state,
    };
    return JSON.stringify(exportData, null, 2);
  }, [state]);

  // Clear all analytics
  const clearAnalytics = useCallback(() => {
    setState(DEFAULT_STATE);
    saveToStorage(STORAGE_KEY, DEFAULT_STATE);
  }, []);

  // Get retention metrics
  const getRetentionMetrics = useCallback(() => {
    if (!state.firstPlayDate) {
      return { daysSinceFirst: 0, retention: 0 };
    }

    const firstDate = new Date(state.firstPlayDate);
    const now = new Date();
    const daysSinceFirst = Math.floor((now.getTime() - firstDate.getTime()) / 86400000);

    // Retention = days played / days since first play
    const retention = daysSinceFirst > 0 ? (state.daysPlayed / daysSinceFirst) * 100 : 100;

    return { daysSinceFirst, retention: Math.round(retention) };
  }, [state.firstPlayDate, state.daysPlayed]);

  // Auto-start session on mount
  useEffect(() => {
    if (!state.currentSessionId) {
      startSession();
    }

    // End session on unmount
    return () => {
      if (state.currentSessionId) {
        endSession();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state,
    trackEvent,
    trackMilestone,
    startSession,
    endSession,
    trackFeatureUsage,
    getSessionDuration,
    exportAnalytics,
    clearAnalytics,
    getRetentionMetrics,
  };
}

export default useAnalytics;
