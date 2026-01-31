import React, { useState } from 'react';
import { useGameStateContext, useAudioContext, useSocialContext } from '@/contexts/GameContext';
import { Gift, Star, Mic, MessageCircle, X } from 'lucide-react';
import { BondSealingModal } from './BondSealingModal';

export function SelectedEntityPanel() {
    const { selectedEntity, setSelectedEntity, gameState, giftLight } = useGameStateContext();
    const audio = useAudioContext();
    const [showSealModal, setShowSealModal] = useState(false);

    if (!selectedEntity) return null;

    // Access bonds from ref - note: this might not be reactive for bond updates while panel is open
    // unless something else triggers a re-render
    const bond = gameState.current?.bonds.find(b => b.targetId === selectedEntity.id);
    const color = selectedEntity.color || '#4ade80';

    const handleGift = () => {
        // Gift 10 light to the selected entity
        const success = giftLight(selectedEntity.id, 10);
        if (success) {
            audio.playGift();
        }
    };

    const handleSeal = () => {
        setShowSealModal(true);
    };

    return (
        <div className="absolute top-20 right-4 w-64 pointer-events-auto z-20">
            <div className="bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-white relative overflow-hidden">
                <button
                    onClick={() => setSelectedEntity(null)}
                    className="absolute top-2 right-2 text-white/40 hover:text-white p-1"
                >
                    <X size={14} />
                </button>

                <div className="flex items-center gap-3 mb-3">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl border border-white/20"
                        style={{ backgroundColor: color }}
                    >
                        ✨
                    </div>
                    <div>
                        <div className="font-bold text-sm truncate">{selectedEntity.name || 'Unknown'}</div>
                        <div className="text-xs text-white/60">{selectedEntity.personality.type}</div>
                    </div>
                </div>

                {bond && (
                    <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-white/60">Bond</span>
                            <span className="text-amber-400">{Math.round(bond.strength * 100)}%</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                                style={{ width: `${bond.strength * 100}%` }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${bond.consent === 'mutual'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-white/10 text-white/60 border border-white/10'
                                }`}>
                                {bond.consent === 'mutual' ? '✓ Bonded' : 'Pending'}
                            </span>
                            {bond.consent === 'mutual' && (
                                <span className="text-xs text-white/40">
                                    {bond.canVoice?.() ? '🎤 Voice' : bond.canWhisper?.() ? '💬 Whisper' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex gap-2 mt-3">
                    {bond?.consent === 'mutual' && (
                        <>
                            <button
                                onClick={handleGift}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs border border-amber-500/30"
                            >
                                <Gift size={14} />
                                Gift Light
                            </button>
                            {!bond.sealed && (
                                <button
                                    onClick={handleSeal}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs border border-purple-500/30"
                                >
                                    <Star size={14} />
                                    Seal
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Bond Sealing Modal */}
            {bond && (
                <BondSealingModal
                    isOpen={showSealModal}
                    onClose={() => setShowSealModal(false)}
                    bondId={bond.id}
                    bondName={bond.targetName}
                    bondColor={bond.targetColor}
                />
            )}
        </div>
    );
}
