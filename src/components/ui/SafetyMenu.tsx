import React, { useState, useEffect } from 'react';
import { useUI } from '@/contexts/UIContext';
import { useGameStateContext } from '@/contexts/GameContext';
import { Shield, EyeOff, VolumeX, X } from 'lucide-react';

export function SafetyMenu() {
    const { closePanel } = useUI();
    const { gameState, selectedEntity } = useGameStateContext();
    const [faded, setFaded] = useState(false);

    // Check if player is already faded (using generic 'isFaded' property if available, or local state)
    // For now, we simulate the effect

    const handleFadeAway = () => {
        setFaded(true);
        if (gameState.current) {
            gameState.current.playerAlpha = 0.3; // Visual fade
            // In a real multiplayer app, this would send a server event
        }

        setTimeout(() => {
            setFaded(false);
            if (gameState.current) {
                gameState.current.playerAlpha = 1;
            }
        }, 30000); // 30s duration
    };

    const handleMute = () => {
        if (selectedEntity) {
            // Add to mute list logic
            console.log('Muted entity:', selectedEntity.id);
            // In a real app, we'd persist this
        }
        closePanel();
    };

    return (
        <div className="absolute top-16 right-4 w-56 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 z-20 pointer-events-auto">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Shield size={16} className="text-green-400" />
                    Safety
                </h3>
                <button onClick={closePanel} className="text-white/40 hover:text-white">
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-2">
                <button
                    onClick={handleFadeAway}
                    disabled={faded}
                    className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-left disabled:opacity-50 transition-colors"
                >
                    <EyeOff size={16} className="text-purple-400" />
                    <div>
                        <div className="text-white text-sm">Fade Away</div>
                        <div className="text-white/40 text-xs">{faded ? 'Active (30s)' : 'Invisible for 30s'}</div>
                    </div>
                </button>

                {selectedEntity && (
                    <button
                        onClick={handleMute}
                        className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors"
                    >
                        <VolumeX size={16} className="text-rose-400" />
                        <div>
                            <div className="text-white text-sm">Mute</div>
                            <div className="text-white/40 text-xs">Hide this soul</div>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
