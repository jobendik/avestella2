import { useState, useCallback, useRef, useEffect } from 'react';
import constellations, { CONSTELLATION_CONFIG } from '@/rendering/constellations';
import type { Constellation } from '@/rendering/constellations';
import type { Star } from '@/types';
import { useGameStateContext } from '@/contexts/GameContext';

export interface UseConstellationsReturn {
    constellations: Constellation[];
    detectConstellations: (stars: Star[], playerX: number, playerY: number) => void;
}

export function useConstellations(): UseConstellationsReturn {
    const [activeConstellations, setActiveConstellations] = useState<Constellation[]>([]);
    const lastDetectionTime = useRef(0);
    const DETECTION_INTERVAL = 1000; // Check every second

    const detect = useCallback((stars: Star[], playerX: number, playerY: number) => {
        const now = Date.now();
        if (now - lastDetectionTime.current < DETECTION_INTERVAL) return;

        lastDetectionTime.current = now;

        // Use the logic from rendering/constellations.ts
        // Note: We cast Star from types/index.ts to rendering/constellations.ts Star if needed, 
        // but they should be compatible or we map them.
        // The legacy logic finds triangles.

        const found = constellations.findConstellations(
            stars as any[], // cast to avoid minor type mismatches if any
            playerX,
            playerY,
            CONSTELLATION_CONFIG
        );

        if (found.length > 0) {
            setActiveConstellations(found);
        }
    }, []);

    return {
        constellations: activeConstellations,
        detectConstellations: detect
    };
}
