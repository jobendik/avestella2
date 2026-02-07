// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Voice Button Component
// Toggle button for voice broadcasting
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useMobile } from '@/hooks/useMobile';

export function VoiceButton(): JSX.Element {
  const { voice } = useGame();
  const { isMobile } = useMobile();

  // PTT Logic:
  // Default state: Muted
  // Press down: Unmute
  // Release: Mute

  const handlePress = () => {
    if (!voice.isVoiceActive) void voice.joinVoice();
    voice.setMuted(false);
  };

  const handleRelease = () => {
    voice.setMuted(true);
  };

  const isTransmitting = voice.isVoiceActive && !voice.isMuted;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Broadcasting Indicator */}
      {isTransmitting && (
        <div className={`absolute bg-rose-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full border border-rose-400/50 animate-bounce shadow-lg whitespace-nowrap ${isMobile ? '-top-8 text-[9px]' : '-top-10 text-[10px]'}`}>
          Broadcasting...
        </div>
      )}

      {/* Voice Button */}
      <button
        onPointerDown={handlePress}
        onPointerUp={handleRelease}
        onPointerLeave={handleRelease}
        className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} rounded-full flex items-center justify-center border transition-all duration-300 ${isTransmitting
          ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.5)] scale-110'
          : 'bg-black/60 backdrop-blur-md text-white/60 border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
      >
        {isTransmitting ? <Mic size={isMobile ? 20 : 24} className="animate-pulse" /> : <MicOff size={isMobile ? 20 : 24} />}
      </button>

      {/* Label */}
      <div className="md:block hidden text-[9px] text-white/40 tracking-widest font-medium">HOLD TO SPEAK</div>
    </div>
  );
}

export default VoiceButton;
