import React, { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';
import { Heart, Navigation, Radio, XCircle, HelpCircle } from 'lucide-react';

interface EmoteOption {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
}

const EMOTES: EmoteOption[] = [
    { id: 'HI', label: 'Hi!', icon: <Heart size={24} />, color: '#F472B6' },
    { id: 'FOLLOW', label: 'Follow', icon: <Navigation size={24} />, color: '#60A5FA' },
    { id: 'BEACON', label: 'Beacon', icon: <Radio size={24} />, color: '#FBBF24' },
    { id: 'STAY', label: 'Stay', icon: <XCircle size={24} />, color: '#EF4444' },
    { id: 'HELP', label: 'Help', icon: <HelpCircle size={24} />, color: '#A78BFA' }
];

export const EmoteWheel: React.FC = () => {
    const { isEmoteWheelOpen, emoteWheelPos, closeEmoteWheel } = useUI();
    const { gameState, pulsePatterns } = useGame();

    if (!isEmoteWheelOpen || !emoteWheelPos) return null;

    const handleEmote = (emoteId: string) => {
        // 1. Broadcast the gesture
        // 2. Trigger local effect via pulsePatterns or directly

        // We can simulate a pulse pattern detection for immediate effect
        // Or just rely on broadcast if implemented.
        // For now, let's use the 'currentPattern' ref approach if accessible, or broadcastGesture directly.

        if (!gameState.gameState.current) return;

        gameState.broadcastGesture('signal', gameState.gameState.current.playerX, gameState.gameState.current.playerY);

        // Show local feedback via UI (optional, could use showToast if imported)
        // For now relying on network loop or generic feedback

        closeEmoteWheel();
    };

    return (
        <div
            className="fixed z-50 pointer-events-auto"
            style={{
                left: emoteWheelPos.x,
                top: emoteWheelPos.y,
                transform: 'translate(-50%, -50%)'
            }}
        >
            <div className="relative w-64 h-64">
                {/* Center Close Button */}
                <button
                    onClick={closeEmoteWheel}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900/90 rounded-full flex items-center justify-center border-2 border-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                    <XCircle size={24} />
                </button>

                {/* Emote Buttons */}
                {EMOTES.map((emote, index) => {
                    const angle = (index / EMOTES.length) * Math.PI * 2 - Math.PI / 2;
                    const radius = 100; // Distance from center
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                        <button
                            key={emote.id}
                            onClick={() => handleEmote(emote.id)}
                            className="absolute w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all hover:scale-110 shadow-lg backdrop-blur-md"
                            style={{
                                left: `calc(50% + ${x}px)`,
                                top: `calc(50% + ${y}px)`,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: `${emote.color}40`, // 25% opacity
                                borderColor: emote.color,
                                borderWidth: '2px'
                            }}
                        >
                            <div style={{ color: emote.color }}>{emote.icon}</div>
                            <span
                                className="text-[10px] font-bold mt-1 text-white drop-shadow-md"
                                style={{ textShadow: '0 1px 2px black' }}
                            >
                                {emote.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
