import { useState, useEffect, useCallback, useRef } from 'react';
import type { UseAudioReturn } from '@/hooks/useAudio';
import { gameClient } from '@/services/GameClient';

export type DarknessPhase = 'calm' | 'warning' | 'active' | 'cooldown';

export interface DarknessState {
    phase: DarknessPhase;
    intensity: number; // 0 to 1
    timeRemaining: number;
}

export function useDarkness(audio?: UseAudioReturn) {
    const [state, setState] = useState<DarknessState>({
        phase: 'calm',
        intensity: 0,
        timeRemaining: 0,
    });

    const endTimeRef = useRef<number>(0);
    const rafRef = useRef<number>(0);

    // Sync state from server events
    useEffect(() => {
        const handleWarning = (data: any) => {
            if (!data) return;
            const duration = data.warningDuration || 15000;
            setState(prev => ({ ...prev, phase: 'warning', timeRemaining: duration }));
            endTimeRef.current = Date.now() + duration;
            if (audio) audio.playDarkness();
        };

        const handleActive = (data: any) => {
            if (!data) return;
            const duration = data.duration || 30000;
            setState(prev => ({ ...prev, phase: 'active', timeRemaining: duration }));
            endTimeRef.current = Date.now() + duration;
            if (audio) audio.playDarknessRumble(1);
        };

        const handleEnded = (data: any) => {
            if (!data) return;
            const cooldown = data.cooldown || 60000;
            setState(prev => ({ ...prev, phase: 'cooldown', timeRemaining: cooldown }));
            endTimeRef.current = Date.now() + cooldown;
            if (audio) audio.playDarknessRumble(0.2);
        };

        const handleCleared = () => {
            setState(prev => ({ ...prev, phase: 'calm', intensity: 0 }));
            endTimeRef.current = 0;
        };

        const handleInitialState = (data: any) => {
            // If we get specific darkness state in initial payload, use it.
            // Currently WebSocketHandler sends generic info, but we can infer or add specialized state later.
            // For now, we rely on the periodic updates or explicit 'request_darkness' if we added it.
            // Check if data contains darkness info:
            if (data.darkness) {
                const d = data.darkness;
                setState({
                    phase: d.phase,
                    intensity: d.intensity || 0,
                    timeRemaining: d.timeRemaining || 0
                });
                if (d.timeRemaining) {
                    endTimeRef.current = Date.now() + d.timeRemaining;
                }
            }
        };

        gameClient.on('darkness_warning', handleWarning);
        gameClient.on('darkness_active', handleActive);
        gameClient.on('darkness_ended', handleEnded);
        gameClient.on('darkness_cleared', handleCleared);
        gameClient.on('initial_state', handleInitialState);

        // Request current state on mount
        gameClient.requestWorldState();

        return () => {
            gameClient.off('darkness_warning', handleWarning);
            gameClient.off('darkness_active', handleActive);
            gameClient.off('darkness_ended', handleEnded);
            gameClient.off('darkness_cleared', handleCleared);
            gameClient.off('initial_state', handleInitialState);
        };
    }, [audio]);

    // Local interpolation for smooth UI/intensity
    const updateLoop = useCallback(() => {
        const now = Date.now();
        const timeRemaining = Math.max(0, endTimeRef.current - now);

        setState(prev => {
            // Auto-transition locally if time runs out, as a backup, 
            // but prefer server events.
            // We'll mostly just update timeRemaining and intensity here.

            let intensity = 0;
            switch (prev.phase) {
                case 'warning':
                    // Ramp up 0 -> 0.5
                    if (endTimeRef.current > 0) {
                        const totalDuration = 15000; // approx
                        intensity = 0.5 * (1 - (timeRemaining / totalDuration));
                    }
                    break;
                case 'active':
                    // Pulse
                    const pulse = Math.sin(now / 500) * 0.1;
                    intensity = 0.9 + pulse;
                    break;
                case 'cooldown':
                    // Ramp down
                    if (endTimeRef.current > 0) {
                        const totalDuration = 15000; // approx
                        intensity = 0.5 * (timeRemaining / totalDuration);
                    }
                    break;
                default:
                    intensity = 0;
            }

            return {
                ...prev,
                timeRemaining,
                intensity: Math.max(0, Math.min(1, intensity))
            };
        });

        rafRef.current = requestAnimationFrame(updateLoop);
    }, []);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(updateLoop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [updateLoop]);

    return state;
}
