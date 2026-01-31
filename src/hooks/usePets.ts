// =============================================================================
// Pet Hook - Frontend management for Pet System
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import { gameClient } from '@/services/GameClient';

export interface PetStats {
    happiness: number;
    hunger: number;
    lastInteracted: number;
}

export interface PetDetails {
    id: string;
    level: number;
    xp: number;
    stats: PetStats;
    isEquipped: boolean;
}

export interface UsePetsReturn {
    ownedPets: string[];
    equippedPetId: string | null;
    petLevels: Record<string, number>;
    petStats: Record<string, PetStats>;

    // Actions
    adoptPet: (petId: string) => void;
    equipPet: (petId: string | null) => void;
    feedPet: (petId: string) => void;
    playWithPet: (petId: string) => void;

    // Getters
    getPetLevel: (petId: string) => number;
    getPetStats: (petId: string) => PetStats | null;
    isOwned: (petId: string) => boolean;
}

export const usePets = (): UsePetsReturn => {
    const [ownedPets, setOwnedPets] = useState<string[]>([]);
    const [equippedPetId, setEquippedPetId] = useState<string | null>(null);
    const [petLevels, setPetLevels] = useState<Record<string, number>>({});
    const [petStats, setPetStats] = useState<Record<string, PetStats>>({});

    // Listen to server events
    useEffect(() => {
        const onPlayerData = (data: any) => {
            if (data.pets) {
                setOwnedPets(data.pets.ownedIds || []);
                setEquippedPetId(data.pets.equippedId || null);
                setPetLevels(data.pets.petLevels || {});
                setPetStats(data.pets.petStats || {});
            }
        };

        const onPetAdopted = (data: { petId: string }) => {
            setOwnedPets(prev => [...prev, data.petId]);
            // Initialize defaults
            setPetLevels(prev => ({ ...prev, [data.petId]: 1 }));
            setPetStats(prev => ({
                ...prev,
                [data.petId]: { happiness: 50, hunger: 50, lastInteracted: Date.now() }
            }));
        };

        const onPetEquipped = (data: { petId: string | null }) => {
            setEquippedPetId(data.petId);
        };

        const onPetUpdated = (data: { petId: string; stats: PetStats }) => {
            setPetStats(prev => ({
                ...prev,
                [data.petId]: data.stats
            }));
        };

        const onPetLeveledUp = (data: { petId: string; level?: number }) => {
            // If level is not provided in event, we might need to fetch it or increment
            // The handler currently sends { petId } only for level up notification, 
            // but handleFeedPet response type 'pet_leveled_up' payload is { petId }
            // Wait, handleFeedPet sends:
            // ctx.send(..., { type: 'pet_leveled_up', data: { petId } ... })
            // It doesn't send the new level.
            // But it ALSO sends 'pet_updated' which might not contain level.

            setPetLevels(prev => ({
                ...prev,
                [data.petId]: (prev[data.petId] || 1) + 1
            }));
        };

        gameClient.on('player_data', onPlayerData);
        gameClient.on('pet_adopted', onPetAdopted);
        gameClient.on('pet_equipped', onPetEquipped);
        gameClient.on('pet_updated', onPetUpdated);
        gameClient.on('pet_leveled_up', onPetLeveledUp);

        // Initial fetch if requested
        if (gameClient.isConnected()) {
            gameClient.requestPlayerData();
        }

        return () => {
            gameClient.off('player_data', onPlayerData);
            gameClient.off('pet_adopted', onPetAdopted);
            gameClient.off('pet_equipped', onPetEquipped);
            gameClient.off('pet_updated', onPetUpdated);
            gameClient.off('pet_leveled_up', onPetLeveledUp);
        };
    }, []);

    const adoptPet = useCallback((petId: string) => {
        gameClient.adoptPet(petId);
    }, []);

    const equipPet = useCallback((petId: string | null) => {
        gameClient.equipPet(petId);
    }, []);

    const feedPet = useCallback((petId: string) => {
        gameClient.feedPet(petId);
    }, []);

    const playWithPet = useCallback((petId: string) => {
        gameClient.playWithPet(petId);
    }, []);

    const getPetLevel = useCallback((petId: string) => {
        return petLevels[petId] || 1;
    }, [petLevels]);

    const getPetStats = useCallback((petId: string) => {
        return petStats[petId] || null;
    }, [petStats]);

    const isOwned = useCallback((petId: string) => {
        return ownedPets.includes(petId);
    }, [ownedPets]);

    return {
        ownedPets,
        equippedPetId,
        petLevels,
        petStats,
        adoptPet,
        equipPet,
        feedPet,
        playWithPet,
        getPetLevel,
        getPetStats,
        isOwned
    };
};
