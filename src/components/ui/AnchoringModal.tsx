// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Anchoring Modal
// "Do you want this to last?" - Atmospheric, emotional persistence prompt
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, X } from 'lucide-react';
import { useAnchoringContext, type AnchorTrigger } from '@/contexts/AnchoringContext';

// ─────────────────────────────────────────────────────────────────────────────
// Atmospheric Copy for Each Trigger
// ─────────────────────────────────────────────────────────────────────────────

interface TriggerCopy {
  title: string;
  subtitle: string;
  body: string;
}

const TRIGGER_COPY: Record<AnchorTrigger, TriggerCopy> = {
  first_bond_sealed: {
    title: "This bond is now eternal.",
    subtitle: "Do you want it to stay that way?",
    body: "Phones break. Apps get deleted. But anchored lights can always find each other again.",
  },
  star_memory_created: {
    title: "A star was born.",
    subtitle: "Will it outlive this moment?",
    body: "Your constellation is growing. Anchor yourself so these memories remain, no matter what.",
  },
  voice_unlocked: {
    title: "Your voice can now be heard.",
    subtitle: "Should it be remembered?",
    body: "Voice connections are intimate. Anchor yourself so those who hear you can find you again.",
  },
  companion_acquired: {
    title: "A companion joins you.",
    subtitle: "Will they stay by your side?",
    body: "Companions are loyal, but they need an anchor to follow across devices and time.",
  },
  guild_joined: {
    title: "You've found your people.",
    subtitle: "Will they be able to find you?",
    body: "Your guild is counting on you. Anchor yourself so your place among them is never lost.",
  },
  first_golden_fragment: {
    title: "Something rare found you.",
    subtitle: "Will you keep it?",
    body: "Golden fragments are precious. They deserve to be anchored somewhere safe.",
  },
  friend_request_received: {
    title: "Someone is reaching out.",
    subtitle: "Should they be able to find you again?",
    body: "A light wants to connect with you. Anchor yourself so this connection can grow.",
  },
  level_milestone: {
    title: "Look how far you've come.",
    subtitle: "Should this progress be protected?",
    body: "Your journey has meaning. Anchor yourself so it can continue, wherever you go.",
  },
  cosmetic_unlocked: {
    title: "Your light is unique now.",
    subtitle: "Should it stay that way?",
    body: "You've made this light your own. Anchor yourself so your identity persists.",
  },
  stardust_threshold: {
    title: "Your light is growing brighter.",
    subtitle: "Shall it shine beyond this device?",
    body: "You've gathered much. Anchor yourself so your brightness is never dimmed.",
  },
  manual: {
    title: "Anchor yourself.",
    subtitle: "Make your light permanent.",
    body: "If you change phones or lose access, unanchored lights can fade away. You can anchor now — or continue as you are.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AnchoringModal(): JSX.Element | null {
  const {
    isModalOpen,
    currentTrigger,
    valuableAssets,
    dismissAnchorPrompt,
    anchorWithGoogle,
    isLoading,
    error,
  } = useAnchoringContext();

  const [isAnchoring, setIsAnchoring] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  // Generate floating particles for ambience
  useEffect(() => {
    if (isModalOpen) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
      }));
      setParticles(newParticles);
    }
  }, [isModalOpen]);

  if (!isModalOpen || !currentTrigger) return null;

  const copy = TRIGGER_COPY[currentTrigger];

  // Calculate what they'd lose (only show if meaningful)
  const lossItems: string[] = [];
  if (valuableAssets.bonds > 0) lossItems.push(`${valuableAssets.bonds} bond${valuableAssets.bonds > 1 ? 's' : ''}`);
  if (valuableAssets.starMemories > 0) lossItems.push(`${valuableAssets.starMemories} star memor${valuableAssets.starMemories > 1 ? 'ies' : 'y'}`);
  if (valuableAssets.stardust >= 100) lossItems.push(`${valuableAssets.stardust.toLocaleString()} stardust`);
  if (valuableAssets.companions > 0) lossItems.push(`${valuableAssets.companions} companion${valuableAssets.companions > 1 ? 's' : ''}`);
  if (valuableAssets.achievements >= 3) lossItems.push(`${valuableAssets.achievements} achievements`);

  const handleGoogle = async () => {
    setIsAnchoring(true);
    const success = await anchorWithGoogle();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsAnchoring(false);
      }, 2000);
    } else {
      setIsAnchoring(false);
    }
  };

  // Success state
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
        
        {/* Success Content */}
        <div className="relative flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
          <div className="w-20 h-20 rounded-full bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(16,185,129,0.3)]">
            <Shield size={32} strokeWidth={1} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-serif text-emerald-100/90 mb-2">You're anchored.</h2>
          <p className="text-emerald-100/60 font-light">Your light will persist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
      {/* Backdrop with floating particles */}
      <div 
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-500"
        onClick={dismissAnchorPrompt}
      >
        {/* Ambient particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute w-1 h-1 bg-indigo-400/30 rounded-full animate-pulse"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: '3s',
            }}
          />
        ))}
        
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Modal Content */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 flex flex-col items-center text-center animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
        
        {/* Close button */}
        <button
          onClick={dismissAnchorPrompt}
          className="absolute top-4 right-4 p-2 text-white/30 hover:text-white/60 transition-colors rounded-full hover:bg-white/5"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-indigo-900/30 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
          <Sparkles size={24} strokeWidth={1.5} className="text-indigo-300" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-serif text-white mb-2">
          {copy.title}
        </h3>
        
        {/* Subtitle */}
        <p className="text-lg text-indigo-200/80 font-light mb-4">
          {copy.subtitle}
        </p>
        
        {/* Body */}
        <p className="text-slate-400 font-light text-sm leading-relaxed mb-4">
          {copy.body}
        </p>

        {/* What they'd lose */}
        {lossItems.length > 0 && (
          <div className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/5 mb-6">
            <p className="text-xs text-white/40 mb-1">Without an anchor, you could lose:</p>
            <p className="text-sm text-indigo-200/80">
              {lossItems.join(' · ')}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="w-full py-2 px-4 rounded-lg bg-red-900/20 border border-red-500/20 mb-4">
            <p className="text-sm text-red-300/80">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="w-full space-y-3">
          <button 
            onClick={handleGoogle}
            disabled={isAnchoring || isLoading}
            className="w-full py-3.5 bg-white text-black rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            {isAnchoring ? 'Anchoring...' : 'Continue with Google'}
          </button>
        </div>

        {/* Not now - always prominent */}
        <button 
          onClick={dismissAnchorPrompt}
          className="mt-6 py-2 px-4 text-slate-400 text-sm hover:text-slate-200 transition-colors rounded-lg hover:bg-white/5"
        >
          Not now
        </button>
        
        {/* Reassurance */}
        <p className="mt-4 text-xs text-slate-500/60">
          You can always anchor later from settings
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Icon (Simple SVG)
// ─────────────────────────────────────────────────────────────────────────────

function GoogleIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default AnchoringModal;
