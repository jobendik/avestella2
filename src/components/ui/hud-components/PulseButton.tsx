// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Pulse Button Component
// Interactive pulse button with pattern recognition feedback
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Heart } from 'lucide-react';
import { usePulseInteraction } from '@/hooks/usePulseInteraction';

export function PulseButton(): JSX.Element {
  const {
    isPulsing,
    currentPattern,
    patternConfidence,
    isHolding,
    handlePulseStart,
    handlePulseEnd
  } = usePulseInteraction();

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Pulse Pattern Indicator */}
      {currentPattern && (
        <div className="absolute -top-16 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm px-4 py-2 rounded-xl border border-white/30 shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {currentPattern === 'HI' && '👋'}
              {currentPattern === 'FOLLOW' && '🚶'}
              {currentPattern === 'BEACON' && '🔔'}
              {currentPattern === 'STAY' && '🛑'}
              {currentPattern === 'HELP' && '🆘'}
            </span>
            <span className="font-bold">{currentPattern}</span>
          </div>
          <div className="text-[10px] text-white/70 text-center mt-0.5">
            {Math.round(patternConfidence * 100)}% confidence
          </div>
        </div>
      )}

      {/* Pulse Button */}
      <button
        onMouseDown={handlePulseStart}
        onMouseUp={handlePulseEnd}
        onMouseLeave={handlePulseEnd}
        onTouchStart={handlePulseStart}
        onTouchEnd={handlePulseEnd}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 relative group ${isPulsing
          ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] scale-95'
          : 'bg-black/60 backdrop-blur-md text-amber-400 border-white/10 hover:bg-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
          }`}
      >
        <Heart size={24} fill={isPulsing ? "currentColor" : "none"} className={isPulsing ? 'animate-ping' : ''} />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]" />
      </button>

      {/* Label */}
      <div className="text-[9px] text-white/40 tracking-widest font-medium">PULSE</div>
      <div className="text-[8px] text-white/30 max-w-[80px] text-center">
        {isHolding ? 'Release...' : 'Hold for patterns'}
      </div>
    </div>
  );
}

export default PulseButton;
