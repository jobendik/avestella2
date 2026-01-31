// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Instant Chat (LEGACY-style)
// Always visible as a pillbox, click or press ENTER to type
// Messages appear as floating text above player with XP reward
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';

const MESSAGE_XP_REWARD = 1;  // XP gained per message sent

export function InstantChat(): JSX.Element {
  const { gameState, audio, progression } = useGame();
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle global keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if already typing in another input (except our own)
      const activeEl = document.activeElement;
      const isOurInput = activeEl === inputRef.current;
      const isTypingElsewhere = activeEl && !isOurInput && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).contentEditable === 'true'
      );

      // If chat is not active, ENTER activates it
      if (!isActive && e.key === 'Enter' && !isTypingElsewhere) {
        e.preventDefault();
        setIsActive(true);
        return;
      }

      // If chat is active
      if (isActive) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsActive(false);
          setMessage('');
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  // Focus input when activated
  useEffect(() => {
    if (isActive && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isActive]);

  // Send message
  const handleSend = useCallback(() => {
    if (!message.trim()) {
      setIsActive(false);
      inputRef.current?.blur();
      return;
    }

    const state = gameState.gameState.current;
    if (!state) {
      setIsActive(false);
      setMessage('');
      return;
    }

    const text = message.trim();
    const playerX = state.playerX;
    const playerY = state.playerY;
    const playerRadius = state.playerRadius || 20;

    // Add floating message text above player (💬 prefix like LEGACY)
    gameState.addFloatingText(
      `💬 ${text}`,
      playerX,
      playerY - playerRadius - 30,
      { hue: 90, size: 18, duration: 4 }
    );

    // Add XP floating text above that
    gameState.addFloatingText(
      `+${MESSAGE_XP_REWARD} XP`,
      playerX,
      playerY - playerRadius - 60,
      { hue: 50, size: 14, duration: 1.2 }
    );

    // Grant XP
    progression.addXP(MESSAGE_XP_REWARD);

    // Play sound (using collect as chat sound)
    try {
      audio.play('collect');
    } catch {
      // Ignore audio errors
    }

    // Clear and deactivate
    setMessage('');
    setIsActive(false);
    inputRef.current?.blur();
  }, [message, gameState, audio, progression]);

  // Handle key events on input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Activate when clicking the pill
  const handlePillClick = useCallback(() => {
    setIsActive(true);
  }, []);

  return (
    <div className="fixed bottom-36 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto">
      <div 
        className={`
          flex items-center justify-center
          bg-black/60 backdrop-blur-xl rounded-full 
          border transition-all duration-200 cursor-text
          ${isActive 
            ? 'border-purple-500/50 bg-black/80 px-4 py-2 w-80' 
            : 'border-white/10 hover:border-white/20 px-6 py-2.5 w-64'
          }
        `}
        onClick={handlePillClick}
      >
        {isActive ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Deactivate on blur if empty
                if (!message.trim()) {
                  setTimeout(() => setIsActive(false), 100);
                }
              }}
              placeholder="Say something..."
              maxLength={100}
              className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/40"
              autoComplete="off"
            />
            <button
              onClick={handleSend}
              className="ml-2 text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium"
            >
              ➤
            </button>
          </>
        ) : (
          <span className="text-white/40 text-sm select-none">
            Press Enter to chat...
          </span>
        )}
      </div>
    </div>
  );
}

export default InstantChat;
