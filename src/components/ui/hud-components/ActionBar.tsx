// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Action Bar Component
// Unified bottom action bar with primary and secondary actions
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { MessageCircle, Zap, Navigation, Star, Camera, Image } from 'lucide-react';
import { PulseButton } from './PulseButton';
import { VoiceButton } from './VoiceButton';
import { QuickChatWheel } from '../QuickChatWheel';
import { useSignals } from '@/hooks/useSignals';
import { useUI } from '@/contexts/UIContext';
import { useGameStateContext, useMediaContext } from '@/contexts/GameContext';

interface QuickActionProps {
  icon: React.ReactNode;
  onClick: () => void;
  hoverColor: string;
  label?: string;
  size?: number;
}

function QuickAction({ icon, onClick, hoverColor, label, size = 40 }: QuickActionProps): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        style={{ width: size, height: size }}
        className={`rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 ${hoverColor} transition-all shadow-lg active:scale-95`}
      >
        {icon}
      </button>
      {label && <span className="text-[8px] text-white/30">{label}</span>}
    </div>
  );
}

interface ActionBarProps {
  isMobile?: boolean;
}

export function ActionBar({ isMobile = false }: ActionBarProps): JSX.Element {
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const { sendLightSignal, sendSignalAtPosition } = useSignals();
  const { togglePanel, showToast } = useUI();
  const { getPlayerPosition, broadcastGesture, broadcastMessage, gameState } = useGameStateContext();
  const { addToGallery } = useMediaContext();

  // Capture screenshot of the game canvas
  const captureScreenshot = useCallback(async () => {
    if (isCapturing) return;

    setIsCapturing(true);

    try {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;

      if (!canvas) {
        showToast('Could not capture moment', 'error');
        return;
      }

      // Create a flash effect
      const flash = document.createElement('div');
      flash.className = 'fixed inset-0 bg-white pointer-events-none z-[9999]';
      flash.style.animation = 'flash 0.3s ease-out forwards';
      document.body.appendChild(flash);

      // Add flash animation style if not exists
      if (!document.getElementById('flash-animation')) {
        const style = document.createElement('style');
        style.id = 'flash-animation';
        style.textContent = `
          @keyframes flash {
            0% { opacity: 0.8; }
            100% { opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      const dataUrl = canvas.toDataURL('image/png');

      const current = gameState.current;
      const stats = {
        lightLevel: current ? Math.floor(current.playerRadius) : 0,
        bonds: current ? current.bonds.length : 0,
        fragments: current ? current.fragmentsCollected : 0,
        beacons: current ? current.beaconsLit : 0,
        stars: current ? current.stars.length : 0,
        tier: 1,
      };

      addToGallery(dataUrl, stats);

      setTimeout(() => {
        flash.remove();
      }, 300);

      showToast('📸 Moment captured!', 'success');

    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      showToast('Failed to capture moment', 'error');
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, gameState, addToGallery, showToast]);

  const handleQuickChatSelect = (id: string) => {
    const playerPos = getPlayerPosition();
    if (id.startsWith('signal_')) {
      broadcastGesture('signal', playerPos.x, playerPos.y);
      sendSignalAtPosition(playerPos.x, playerPos.y);
    } else {
      broadcastMessage(id, playerPos.x, playerPos.y);
    }
    showToast(`Sent: ${id}`);
    setShowQuickChat(false);
  };

  // Mobile layout: simplified, moved up for joystick
  if (isMobile) {
    return (
      <>
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="flex items-end gap-2">
            {/* Primary Actions (Pulse & Voice) - compact */}
            <div className="flex items-end gap-2 bg-black/40 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/10 shadow-2xl">
              <PulseButton />
              <VoiceButton />
            </div>

            {/* Essential secondary actions */}
            <QuickAction
              icon={<MessageCircle size={14} />}
              onClick={() => setShowQuickChat(!showQuickChat)}
              hoverColor="hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/50"
              size={34}
            />
            <QuickAction
              icon={<Camera size={14} />}
              onClick={captureScreenshot}
              hoverColor="hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/50"
              size={34}
            />
          </div>
        </div>

        {showQuickChat && (
          <QuickChatWheel
            isOpen={showQuickChat}
            onClose={() => setShowQuickChat(false)}
            onSelect={handleQuickChatSelect}
          />
        )}
      </>
    );
  }

  // Desktop layout: full action bar
  return (
    <>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex items-end gap-4">
          {/* Left Secondary Actions */}
          <div className="flex gap-2 mb-2">
            <QuickAction
              icon={<Zap size={16} />}
              onClick={sendLightSignal}
              hoverColor="hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
              label="Signal"
            />
            <QuickAction
              icon={<Navigation size={16} />}
              onClick={() => togglePanel('map')}
              hoverColor="hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
              label="Map"
            />
          </div>

          {/* Primary Actions (Pulse & Voice) */}
          <div className="flex items-end gap-3 bg-black/40 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 shadow-2xl">
            <div className="relative">
              <PulseButton />
            </div>
            <div className="relative">
              <VoiceButton />
            </div>
          </div>

          {/* Right Secondary Actions */}
          <div className="flex gap-2 mb-2">
            <QuickAction
              icon={<Star size={16} />}
              onClick={() => togglePanel('friends')}
              hoverColor="hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
              label="Friends"
            />
            <QuickAction
              icon={<Camera size={16} />}
              onClick={captureScreenshot}
              hoverColor="hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/50"
              label="Capture"
            />
            <QuickAction
              icon={<Image size={16} />}
              onClick={() => togglePanel('gallery')}
              hoverColor="hover:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50"
              label="Gallery"
            />
          </div>

          {/* Chat Button */}
          <div className="flex flex-col items-center gap-1 mb-2">
            <button
              onClick={() => setShowQuickChat(!showQuickChat)}
              className="w-12 h-12 rounded-xl bg-indigo-600 border border-indigo-400/50 flex items-center justify-center text-white hover:bg-indigo-500 active:scale-95 shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all"
            >
              <MessageCircle size={20} />
            </button>
            <span className="text-[8px] text-white/30">Chat</span>
          </div>
        </div>
      </div>

      {/* Quick Chat Wheel */}
      {showQuickChat && (
        <QuickChatWheel
          isOpen={showQuickChat}
          onClose={() => setShowQuickChat(false)}
          onSelect={handleQuickChatSelect}
        />
      )}
    </>
  );
}

export default ActionBar;
