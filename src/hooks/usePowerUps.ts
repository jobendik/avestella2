import { useState, useEffect, useRef, useCallback } from 'react';
import { PowerUp, updatePowerUps, checkPowerUpCollection, PowerUpType } from '@/classes/PowerUp';
import { useGameStateContext } from '@/contexts/GameContext';
import { useAudioContext } from '@/contexts/GameContext';
import { gameClient } from '@/services/GameClient';

export interface UsePowerUpsReturn {
    powerups: PowerUp[];
    activePowerUps: Map<PowerUpType, number>; // type -> expiration time
    spawnPowerUp: (x: number, y: number, realm: string) => void;
    update: (deltaTime: number, playerX: number, playerY: number, playerRadius: number, realm: string) => void;
    getPowerUpMultiplier: (type: PowerUpType) => number;
}

export function usePowerUps(): UsePowerUpsReturn {
    const [powerups, setPowerups] = useState<PowerUp[]>([]);
    const activePowerUpsRef = useRef<Map<PowerUpType, number>>(new Map());
    // Force update for active powerups UI
    const [, setTick] = useState(0);

    // Initial load
    useEffect(() => {
        if (gameClient.isConnected()) {
            gameClient.requestPowerUps();
        }

        const handleConnect = () => {
            gameClient.requestPowerUps();
        };

        const handleSpawn = (data: { powerUp: any }) => {
            if (!data?.powerUp) return;
            const p = data.powerUp;
            setPowerups(prev => {
                // Avoid duplicates
                if (prev.find(existing => existing.id === p.id)) return prev;
                return [...prev, new PowerUp(p.id, p.x, p.y, p.type, p.realm, p.life)];
            });
        };

        const handleCollected = (data: { powerUpId: string, playerId: string }) => {
            if (!data?.powerUpId) return;
            setPowerups(prev => prev.filter(p => p.id !== data.powerUpId));
        };

        const handleExpired = (data: { powerUpId: string }) => {
            if (!data?.powerUpId) return;
            setPowerups(prev => prev.filter(p => p.id !== data.powerUpId));
        };

        const handleState = (data: { powerUps: any[], activeEffects: any[] }) => {
            if (!data?.powerUps) return;
            // Sync full state
            const newPowerUps = data.powerUps.map((p: any) => new PowerUp(p.id, p.x, p.y, p.type, p.realm, p.life));
            setPowerups(newPowerUps);

            // Sync active effects
            activePowerUpsRef.current.clear();
            data.activeEffects.forEach((e: any) => {
                activePowerUpsRef.current.set(e.type, Date.now() + e.remainingMs);
            });
            setTick(t => t + 1);
        };

        const handleEffectApplied = (data: { effect: any }) => {
            if (!data?.effect) return;
            const { type, duration } = data.effect;
            const expiry = Date.now() + duration;
            activePowerUpsRef.current.set(type, expiry);
            setTick(t => t + 1);
        };

        const handleEffectEnded = (data: { effectType: string }) => {
            if (!data?.effectType) return;
            activePowerUpsRef.current.delete(data.effectType as PowerUpType);
            setTick(t => t + 1);
        };

        gameClient.on('connect', handleConnect);
        gameClient.on('power_up_spawned', handleSpawn);
        gameClient.on('power_up_collected', handleCollected);
        gameClient.on('power_up_expired', handleExpired);
        gameClient.on('power_ups_state', handleState);
        gameClient.on('power_up_effect_applied', handleEffectApplied);
        gameClient.on('power_up_effect_ended', handleEffectEnded);

        return () => {
            gameClient.off('connect', handleConnect);
            gameClient.off('power_up_spawned', handleSpawn);
            gameClient.off('power_up_collected', handleCollected);
            gameClient.off('power_up_expired', handleExpired);
            gameClient.off('power_ups_state', handleState);
            gameClient.off('power_up_effect_applied', handleEffectApplied);
            gameClient.off('power_up_effect_ended', handleEffectEnded);
        };
    }, []);

    // Deprecated local spawn - kept empty to satisfy interface or dev testing if needed
    const spawn = useCallback((x: number, y: number, realm: string) => {
        // console.warn('Local spawn deprecated. Server handles spawning.');
        // If we wanted to test locally without server, we could uncomment logic here, 
        // but for now we enforce server authority.
    }, []);

    const update = useCallback((deltaTime: number, playerX: number, playerY: number, playerRadius: number, realm: string) => {
        // Update active power-up effects
        const now = Date.now();
        let effectsChanged = false;

        activePowerUpsRef.current.forEach((expiry, type) => {
            if (now > expiry) {
                activePowerUpsRef.current.delete(type);
                effectsChanged = true;
            }
        });

        if (effectsChanged) {
            setTick(t => t + 1);
        }

        setPowerups(prev => {
            // 1. Update existing power-ups (animation, lifetime)
            // Filter out those that are already collected locally (optimistic)
            const updated = updatePowerUps(prev, deltaTime);

            // 2. Check for collection
            // We pass a copy or rely on checkPowerUpCollection to modify 'collected' flag
            // checkPowerUpCollection iterates and marks .collected = true if collision
            const collected = checkPowerUpCollection(playerX, playerY, playerRadius, updated, realm);

            if (collected) {
                // Send to server
                gameClient.collectPowerUp(collected.id, collected.x, collected.y);

                // Optimistically remove from view or let next render handle it via 'updated' filter
                // checkPowerUpCollection set collected=true, so next updatePowerUps will filter it out.
                // However, we are returning 'updated' right now.
                // We should filter it out immediately to make it disappear instantly.
                return updated.filter(p => p.id !== collected.id);
            }

            return updated;
        });
    }, []);

    const getPowerUpMultiplier = useCallback((type: PowerUpType): number => {
        if (!activePowerUpsRef.current.has(type)) return 1;

        switch (type) {
            case 'speed': return 2.2;
            case 'xp': return 1;
            case 'shield': return 1;
            case 'magnet': return 1;
            default: return 1;
        }
    }, []);

    return {
        powerups,
        activePowerUps: activePowerUpsRef.current,
        spawnPowerUp: spawn,
        update,
        getPowerUpMultiplier
    };
}
