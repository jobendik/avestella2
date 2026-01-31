// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Pulse Pattern Detection Hook
// ═══════════════════════════════════════════════════════════════════════════
// Detects player pulse patterns for communication:
// - HI: 2 quick pulses
// - FOLLOW: 3 pulses
// - BEACON: 4 pulses (call nearby agents to you)
// - STAY: 1 long hold
// - HELP: SOS pattern (... --- ...)

import { useRef, useCallback, useState } from 'react';

export type PulsePattern = 'HI' | 'FOLLOW' | 'BEACON' | 'STAY' | 'HELP' | null;

export interface PulseEvent {
  timestamp: number;
  duration: number; // How long the pulse was held
}

export interface UsePulsePatternReturn {
  currentPattern: PulsePattern;
  patternConfidence: number;
  isHolding: boolean;
  recordPulseStart: () => void;
  recordPulseEnd: () => void;
  clearPattern: () => void;
}

// Timing thresholds (in ms)
const QUICK_PULSE_MAX = 200;       // Max duration for a "quick" pulse
const LONG_PULSE_MIN = 600;        // Min duration for a "long" pulse
const PATTERN_WINDOW = 2000;       // Time window to detect pattern
const PATTERN_COOLDOWN = 500;      // Cooldown after pattern detection
const SOS_DOT_MAX = 150;           // Max duration for SOS dot
const SOS_DASH_MIN = 300;          // Min duration for SOS dash

export function usePulsePatterns(): UsePulsePatternReturn {
  const [currentPattern, setCurrentPattern] = useState<PulsePattern>(null);
  const [patternConfidence, setPatternConfidence] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const pulseHistory = useRef<PulseEvent[]>([]);
  const pulseStartTime = useRef<number | null>(null);
  const patternCooldownRef = useRef<number>(0);

  const analyzePattern = useCallback((): PulsePattern => {
    const now = Date.now();
    
    // Filter to recent pulses within the window
    const recentPulses = pulseHistory.current.filter(
      p => now - p.timestamp < PATTERN_WINDOW
    );

    if (recentPulses.length === 0) return null;

    // Check for STAY pattern (1 long pulse)
    if (recentPulses.length === 1 && recentPulses[0].duration >= LONG_PULSE_MIN) {
      setPatternConfidence(0.9);
      return 'STAY';
    }

    // Check for HI pattern (2 quick pulses)
    if (recentPulses.length === 2) {
      const allQuick = recentPulses.every(p => p.duration <= QUICK_PULSE_MAX);
      if (allQuick) {
        setPatternConfidence(0.85);
        return 'HI';
      }
    }

    // Check for FOLLOW pattern (3 pulses)
    if (recentPulses.length === 3) {
      const allQuick = recentPulses.every(p => p.duration <= QUICK_PULSE_MAX);
      if (allQuick) {
        setPatternConfidence(0.88);
        return 'FOLLOW';
      }
    }

    // Check for BEACON pattern (4 pulses)
    if (recentPulses.length === 4) {
      const allQuick = recentPulses.every(p => p.duration <= QUICK_PULSE_MAX);
      if (allQuick) {
        setPatternConfidence(0.92);
        return 'BEACON';
      }
    }

    // Check for HELP pattern (SOS: 3 short, 3 long, 3 short)
    if (recentPulses.length >= 9) {
      const lastNine = recentPulses.slice(-9);
      const first3Short = lastNine.slice(0, 3).every(p => p.duration <= SOS_DOT_MAX);
      const middle3Long = lastNine.slice(3, 6).every(p => p.duration >= SOS_DASH_MIN);
      const last3Short = lastNine.slice(6, 9).every(p => p.duration <= SOS_DOT_MAX);
      
      if (first3Short && middle3Long && last3Short) {
        setPatternConfidence(0.95);
        return 'HELP';
      }
    }

    return null;
  }, []);

  const recordPulseStart = useCallback(() => {
    pulseStartTime.current = Date.now();
    setIsHolding(true);
  }, []);

  const recordPulseEnd = useCallback(() => {
    const now = Date.now();
    setIsHolding(false);

    // Check cooldown
    if (now < patternCooldownRef.current) return;

    if (pulseStartTime.current !== null) {
      const duration = now - pulseStartTime.current;
      
      // Record this pulse
      pulseHistory.current.push({
        timestamp: now,
        duration
      });

      // Keep only recent history
      pulseHistory.current = pulseHistory.current.filter(
        p => now - p.timestamp < PATTERN_WINDOW * 2
      );

      // Analyze the pattern after a short delay (to allow for more pulses)
      setTimeout(() => {
        const pattern = analyzePattern();
        if (pattern) {
          setCurrentPattern(pattern);
          patternCooldownRef.current = Date.now() + PATTERN_COOLDOWN;
          
          // Auto-clear pattern after a bit
          setTimeout(() => {
            setCurrentPattern(null);
            setPatternConfidence(0);
          }, 1500);
        }
      }, 300);

      pulseStartTime.current = null;
    }
  }, [analyzePattern]);

  const clearPattern = useCallback(() => {
    setCurrentPattern(null);
    setPatternConfidence(0);
    pulseHistory.current = [];
  }, []);

  return {
    currentPattern,
    patternConfidence,
    isHolding,
    recordPulseStart,
    recordPulseEnd,
    clearPattern
  };
}
