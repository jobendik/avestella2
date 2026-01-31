import React from 'react';
import { useGame } from '@/contexts/GameContext';

export const RealmTransition: React.FC = () => {
    const { gameState } = useGame();

    // Guard clause if not available yet (during init)
    if (!gameState || !gameState.isTransitioning) return null;

    const { isTransitioning, targetRealmName, targetRealmIcon } = gameState;

    return (
        <div
            className={`fixed inset-0 z-[400] flex flex-col items-center justify-center bg-black transition-opacity duration-400 ease-in-out pointer-events-none ${isTransitioning ? 'opacity-100 pointer-events-auto' : 'opacity-0'
                }`}
        >
            <div className="text-6xl mb-4 animate-pulse transform scale-100 opacity-75">
                {targetRealmIcon || '🌌'}
            </div>
            <div className="font-serif text-3xl font-light tracking-[0.15em] text-cyan-300">
                {targetRealmName || 'Unknown Realm'}
            </div>
        </div>
    );
};
