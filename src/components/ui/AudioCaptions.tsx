// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Audio Captions Component
// Displays text captions for sound events (accessibility feature)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Volume2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AudioCaption {
  id: string;
  text: string;
  icon?: string;
  direction?: 'left' | 'center' | 'right';
  timestamp: number;
}

interface AudioCaptionsProps {
  enabled?: boolean;
  maxCaptions?: number;
  displayDuration?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Caption Definitions (map sound events to readable text)
// ─────────────────────────────────────────────────────────────────────────────

export const SOUND_CAPTIONS: Record<string, { text: string; icon?: string }> = {
  // Movement & Interaction
  move: { text: '♪ footsteps', icon: '👣' },
  pulse: { text: '♪ light pulse', icon: '✨' },
  bloom: { text: '♪ bloom burst', icon: '🌸' },
  
  // Collection
  fragmentCollect: { text: '♪ fragment collected', icon: '💎' },
  goldenCollect: { text: '♪ golden fragment!', icon: '🌟' },
  
  // Social
  bond: { text: '♪ connection formed', icon: '💕' },
  handshake: { text: '♪ mutual bond sealed', icon: '🤝' },
  harmonic: { text: '♪ harmonious resonance', icon: '🎵' },
  
  // Environment
  beaconLight: { text: '♪ beacon ignited', icon: '🔥' },
  beaconCharge: { text: '♪ beacon charging...', icon: '⚡' },
  iceCrack: { text: '♪ ice cracking', icon: '🧊' },
  darknessRumble: { text: '♪ darkness approaching...', icon: '🌑' },
  
  // Ambient
  warmth: { text: '♪ warmth surrounds you', icon: '☀️' },
  cold: { text: '♪ coldness creeping in', icon: '❄️' },
  
  // Discovery
  discovery: { text: '♪ new discovery!', icon: '🗺️' },
  landmark: { text: '♪ landmark found', icon: '📍' },
  
  // UI
  achievement: { text: '♪ achievement unlocked!', icon: '🏆' },
  levelUp: { text: '♪ level up!', icon: '⬆️' },
  reward: { text: '♪ reward received', icon: '🎁' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Global caption emitter (to be called from audio hooks)
// ─────────────────────────────────────────────────────────────────────────────

type CaptionListener = (caption: AudioCaption) => void;
const listeners: Set<CaptionListener> = new Set();

export function emitCaption(soundKey: string, direction?: 'left' | 'center' | 'right') {
  const captionDef = SOUND_CAPTIONS[soundKey];
  if (!captionDef) return;
  
  const caption: AudioCaption = {
    id: `caption_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    text: captionDef.text,
    icon: captionDef.icon,
    direction: direction || 'center',
    timestamp: Date.now(),
  };
  
  listeners.forEach(listener => listener(caption));
}

export function subscribeToCaption(listener: CaptionListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const AudioCaptions = memo(function AudioCaptions({
  enabled = true,
  maxCaptions = 3,
  displayDuration = 3000,
}: AudioCaptionsProps): JSX.Element | null {
  const [captions, setCaptions] = useState<AudioCaption[]>([]);
  
  // Subscribe to caption events
  useEffect(() => {
    if (!enabled) return;
    
    const handleCaption = (caption: AudioCaption) => {
      setCaptions(prev => [caption, ...prev].slice(0, maxCaptions));
    };
    
    const unsubscribe = subscribeToCaption(handleCaption);
    return () => { unsubscribe(); };
  }, [enabled, maxCaptions]);
  
  // Auto-remove old captions
  useEffect(() => {
    if (captions.length === 0) return;
    
    const timer = setInterval(() => {
      const now = Date.now();
      setCaptions(prev => prev.filter(c => now - c.timestamp < displayDuration));
    }, 500);
    
    return () => clearInterval(timer);
  }, [captions, displayDuration]);
  
  if (!enabled || captions.length === 0) return null;
  
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex flex-col items-center gap-1">
        {captions.map((caption) => {
          const age = Date.now() - caption.timestamp;
          const opacity = Math.max(0, 1 - (age / displayDuration));
          
          return (
            <div
              key={caption.id}
              className="flex items-center gap-2 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 shadow-lg transition-opacity"
              style={{ opacity }}
            >
              {/* Direction indicator */}
              {caption.direction === 'left' && (
                <span className="text-white/50">←</span>
              )}
              
              {/* Icon */}
              <Volume2 size={14} className="text-blue-400" />
              
              {/* Caption text */}
              <span className="text-white text-sm font-medium">
                {caption.icon && <span className="mr-1">{caption.icon}</span>}
                {caption.text}
              </span>
              
              {/* Direction indicator */}
              {caption.direction === 'right' && (
                <span className="text-white/50">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default AudioCaptions;
