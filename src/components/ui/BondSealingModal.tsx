// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Bond Sealing Modal
// Creates a Star Memory from a mutual bond through a symbol selection ceremony
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { X, Star, Heart, Sparkles } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';

interface BondSealingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bondId: string;
  bondName: string;
  bondColor: string;
}

const SEAL_SYMBOLS = [
  { id: 'sparkle', emoji: '✨', name: 'Sparkle' },
  { id: 'star', emoji: '💫', name: 'Shooting Star' },
  { id: 'gold_star', emoji: '⭐', name: 'Golden Star' },
  { id: 'glowing_star', emoji: '🌟', name: 'Glowing Star' },
  { id: 'heart', emoji: '💛', name: 'Golden Heart' },
  { id: 'moon', emoji: '🌙', name: 'Crescent Moon' },
  { id: 'sun', emoji: '☀️', name: 'Sun' },
  { id: 'comet', emoji: '☄️', name: 'Comet' },
];

export function BondSealingModal({ 
  isOpen, 
  onClose, 
  bondId, 
  bondName, 
  bondColor 
}: BondSealingModalProps): JSX.Element | null {
  const { gameState, audio } = useGame();
  const { showToast } = useUI();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isSealing, setIsSealing] = useState(false);
  const [sealComplete, setSealComplete] = useState(false);
  const [theirSymbol, setTheirSymbol] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSymbolSelect = (symbolId: string) => {
    setSelectedSymbol(symbolId);
    audio.play('click');
  };

  const handleSeal = async () => {
    if (!selectedSymbol) return;

    setIsSealing(true);
    audio.playSeal();

    // Simulate the other player choosing a symbol
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const theirChoice = SEAL_SYMBOLS[Math.floor(Math.random() * SEAL_SYMBOLS.length)];
    setTheirSymbol(theirChoice.emoji);

    // Create the star memory
    const state = gameState.gameState.current;
    if (!state) {
      setIsSealing(false);
      return;
    }
    
    const mySymbol = SEAL_SYMBOLS.find(s => s.id === selectedSymbol)?.emoji || '✨';
    
    state.starMemories.push({
      targetName: bondName,
      targetColor: bondColor,
      sealedAt: Date.now(),
      myWord: mySymbol,
      theirWord: theirChoice.emoji
    });

    // Mark the bond as sealed
    const bond = state.bonds.find((b: any) => b.id === bondId) as any;
    if (bond) {
      bond.sealed = true;
      bond.sealedAt = Date.now();
    }

    // Visual effects
    state.screenFlash = { color: '#FFD700', intensity: 0.8, decay: 0.02 };
    state.shockwaves.push({
      x: state.playerX,
      y: state.playerY,
      radius: 1,
      maxRadius: 500,
      alpha: 1,
      color: '#FFD700',
      speed: 3
    } as any);

    setIsSealing(false);
    setSealComplete(true);
    
    showToast(`⭐ Star Memory created with ${bondName}!`, 'success');
  };

  const handleClose = () => {
    setSelectedSymbol(null);
    setIsSealing(false);
    setSealComplete(false);
    setTheirSymbol(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-b from-indigo-950/90 to-black/90 rounded-2xl border border-amber-400/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: bondColor }}
            >
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold">Seal Bond</h2>
              <p className="text-white/60 text-sm">with {bondName}</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!sealComplete ? (
            <>
              <p className="text-white/80 text-center mb-6">
                Choose a symbol to seal your bond into a <span className="text-amber-400">Star Memory</span>.
                <br />
                <span className="text-white/50 text-sm">Both symbols will combine to form your unique star.</span>
              </p>

              {/* Symbol Grid */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {SEAL_SYMBOLS.map(symbol => (
                  <button
                    key={symbol.id}
                    onClick={() => handleSymbolSelect(symbol.id)}
                    disabled={isSealing}
                    className={`
                      aspect-square rounded-xl border-2 transition-all duration-200
                      flex flex-col items-center justify-center gap-1
                      ${selectedSymbol === symbol.id 
                        ? 'border-amber-400 bg-amber-400/20 scale-105' 
                        : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40'}
                      ${isSealing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <span className="text-3xl">{symbol.emoji}</span>
                    <span className="text-[10px] text-white/50">{symbol.name}</span>
                  </button>
                ))}
              </div>

              {/* Seal Button */}
              <button
                onClick={handleSeal}
                disabled={!selectedSymbol || isSealing}
                className={`
                  w-full py-3 rounded-xl font-medium transition-all duration-200
                  flex items-center justify-center gap-2
                  ${selectedSymbol && !isSealing
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'}
                `}
              >
                {isSealing ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    <span>Sealing Bond...</span>
                  </>
                ) : (
                  <>
                    <Star className="w-5 h-5" />
                    <span>Seal Into Star Memory</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Seal Complete View */
            <div className="text-center py-4">
              <div className="mb-6">
                <div className="relative inline-block">
                  <div className="text-6xl mb-2 animate-pulse">
                    {SEAL_SYMBOLS.find(s => s.id === selectedSymbol)?.emoji}
                  </div>
                  <div className="absolute -top-2 -right-2 text-4xl animate-bounce">
                    {theirSymbol}
                  </div>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-amber-400 mb-2">
                ⭐ Star Memory Created!
              </h3>
              <p className="text-white/70 mb-6">
                Your bond with <span className="text-white font-medium">{bondName}</span> has been sealed forever in the stars.
              </p>

              <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl">{SEAL_SYMBOLS.find(s => s.id === selectedSymbol)?.emoji}</div>
                    <div className="text-xs text-white/50 mt-1">Your Symbol</div>
                  </div>
                  <Heart className="w-5 h-5 text-pink-400" />
                  <div className="text-center">
                    <div className="text-2xl">{theirSymbol}</div>
                    <div className="text-xs text-white/50 mt-1">{bondName}'s Symbol</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>
    </div>
  );
}

export default BondSealingModal;
