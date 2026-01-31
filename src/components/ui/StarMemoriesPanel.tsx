// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Star Memories Panel
// Displays all sealed bonds as constellations in the night sky
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { X, Star, Sparkles } from 'lucide-react';
import { useGameStateContext } from '@/contexts/GameContext';

interface StarMemoriesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StarMemoriesPanel({ isOpen, onClose }: StarMemoriesPanelProps): JSX.Element | null {
  const { gameState } = useGameStateContext();
  
  if (!isOpen) return null;

  const state = gameState.current;
  const starMemories = state?.starMemories || [];
  const sealedBonds = state?.bonds?.filter((b: any) => b.sealed) || [];

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg">
      <div className="relative w-full max-w-2xl max-h-[80vh] mx-4 overflow-hidden">
        {/* Animated star background */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                opacity: Math.random() * 0.7 + 0.3,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 2 + 1}s`
              }}
            />
          ))}
        </div>

        <div className="relative bg-gradient-to-b from-indigo-950/80 to-black/80 rounded-2xl border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Star Memories</h2>
                <p className="text-white/50 text-sm">
                  {starMemories.length} {starMemories.length === 1 ? 'memory' : 'memories'} sealed in the stars
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {starMemories.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-16 h-16 mx-auto text-white/20 mb-4" />
                <h3 className="text-white/60 text-lg mb-2">No Star Memories Yet</h3>
                <p className="text-white/40 text-sm max-w-xs mx-auto">
                  Seal a mutual bond to create a star memory that will shine forever in your constellation.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {starMemories.map((memory: any, index: number) => (
                  <div
                    key={index}
                    className="relative bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-colors overflow-hidden group"
                  >
                    {/* Glow effect */}
                    <div 
                      className="absolute top-0 left-0 w-32 h-32 opacity-20 group-hover:opacity-40 transition-opacity rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
                      style={{ backgroundColor: memory.targetColor }}
                    />

                    <div className="relative flex items-center gap-4">
                      {/* Symbol display */}
                      <div className="flex items-center justify-center gap-2">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-white/20"
                          style={{ backgroundColor: memory.targetColor + '40' }}
                        >
                          {memory.myWord}
                        </div>
                        <Star className="w-4 h-4 text-amber-400" />
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-white/20"
                          style={{ backgroundColor: memory.targetColor + '40' }}
                        >
                          {memory.theirWord}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: memory.targetColor }}
                          />
                          <span className="text-white font-medium truncate">
                            {memory.targetName}
                          </span>
                        </div>
                        <p className="text-white/50 text-sm">
                          Sealed on {formatDate(memory.sealedAt)}
                        </p>
                      </div>

                      {/* Star icon */}
                      <div className="text-2xl animate-pulse">⭐</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with stats */}
          {starMemories.length > 0 && (
            <div className="p-4 border-t border-white/10 flex items-center justify-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-amber-400 font-bold text-lg">{starMemories.length}</div>
                <div className="text-white/50">Stars</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-purple-400 font-bold text-lg">
                  {sealedBonds.length}
                </div>
                <div className="text-white/50">Sealed Bonds</div>
              </div>
            </div>
          )}
        </div>

        {/* Decorative shooting star */}
        <div className="absolute top-10 right-10 w-1 h-1 bg-white rounded-full animate-ping" />
      </div>
    </div>
  );
}

export default StarMemoriesPanel;
