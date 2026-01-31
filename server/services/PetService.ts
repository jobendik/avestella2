// =============================================================================
// Pet Service - Backend logic for Pet System
// =============================================================================

import { EventEmitter } from 'events';
import { PlayerData } from '../database/playerDataModel.js';
import { mongoPersistence } from './MongoPersistenceService.js';

interface PetStats {
    happiness: number;
    hunger: number;
    lastInteracted: number;
}

export class PetService extends EventEmitter {
    private initialized: boolean = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        console.log('🐾 Pet Service initializing...');
        this.initialized = true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CORE OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    async adoptPet(playerId: string, petId: string): Promise<{ success: boolean; message: string }> {
        const player = await PlayerData.findOne({ playerId });
        if (!player) throw new Error('Player not found');

        if (player.pets.ownedIds.includes(petId)) {
            return { success: false, message: 'Pet already owned' };
        }

        // Initialize proper defaults using Mongoose Mixed type handling
        // We need to ensure the objects exist before setting properties
        if (!player.pets.petLevels) player.pets.petLevels = {};
        if (!player.pets.petXp) player.pets.petXp = {};
        if (!player.pets.petStats) player.pets.petStats = {};

        player.pets.ownedIds.push(petId);
        player.pets.petLevels[petId] = 1;
        player.pets.petXp[petId] = 0;
        player.pets.petStats[petId] = {
            happiness: 50,
            hunger: 50,
            lastInteracted: Date.now()
        };

        // If first pet, equip it
        if (!player.pets.equippedId) {
            player.pets.equippedId = petId;
        }

        player.markModified('pets');
        await player.save();

        this.emit('pet_adopted', { playerId, petId });
        return { success: true, message: 'Pet adopted successfully' };
    }

    async equipPet(playerId: string, petId: string): Promise<boolean> {
        const player = await PlayerData.findOne({ playerId });
        if (!player) return false;

        if (!player.pets.ownedIds.includes(petId) && petId !== null) {
            throw new Error('Pet not owned');
        }

        player.pets.equippedId = petId;

        // Mark as modified since pets is a nested object
        player.markModified('pets');
        await player.save();

        this.emit('pet_equipped', { playerId, petId });
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CARE & INTERACTION
    // ─────────────────────────────────────────────────────────────────────────

    async feedPet(playerId: string, petId: string): Promise<{ stats: PetStats; leveledUp: boolean }> {
        const player = await PlayerData.findOne({ playerId });
        if (!player) throw new Error('Player not found');

        if (!player.pets.ownedIds.includes(petId)) {
            throw new Error('Pet not owned');
        }

        const stats = player.pets.petStats[petId] || { happiness: 50, hunger: 50, lastInteracted: 0 };

        // Feeding logic: Increase hunger (fullness), slight happiness boost
        stats.hunger = Math.min(100, stats.hunger + 30);
        stats.happiness = Math.min(100, stats.happiness + 5);
        stats.lastInteracted = Date.now();

        // Grant XP for feeding
        const { leveledUp } = await this.addPetXp(player, petId, 10);

        player.pets.petStats[petId] = stats;
        player.markModified('pets');
        await player.save();

        this.emit('pet_fed', { playerId, petId, stats });
        return { stats, leveledUp };
    }

    async playWithPet(playerId: string, petId: string): Promise<{ stats: PetStats; leveledUp: boolean }> {
        const player = await PlayerData.findOne({ playerId });
        if (!player) throw new Error('Player not found');

        const stats = player.pets.petStats[petId] || { happiness: 50, hunger: 50, lastInteracted: 0 };

        // Playing logic: Increase happiness, decrease hunger slightly (workout)
        stats.happiness = Math.min(100, stats.happiness + 20);
        stats.hunger = Math.max(0, stats.hunger - 10);
        stats.lastInteracted = Date.now();

        // Grant XP for playing
        const { leveledUp } = await this.addPetXp(player, petId, 15);

        player.pets.petStats[petId] = stats;
        player.markModified('pets');
        await player.save();

        this.emit('pet_played', { playerId, petId, stats });
        return { stats, leveledUp };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LEVELING
    // ─────────────────────────────────────────────────────────────────────────

    private async addPetXp(player: any, petId: string, amount: number): Promise<{ leveledUp: boolean }> {
        const currentLevel = player.pets.petLevels[petId] || 1;
        const currentXp = player.pets.petXp[petId] || 0;

        // Simple XP curve: Level * 100
        const xpRequired = currentLevel * 100;
        let newXp = currentXp + amount;
        let leveledUp = false;
        let newLevel = currentLevel;

        if (newXp >= xpRequired) {
            newLevel++;
            newXp -= xpRequired;
            leveledUp = true;
            this.emit('pet_leveled_up', { playerId: player.playerId, petId, level: newLevel });
        }

        player.pets.petLevels[petId] = newLevel;
        player.pets.petXp[petId] = newXp;

        return { leveledUp };
    }

    async getPetDetails(playerId: string, petId: string): Promise<any> {
        const player = await PlayerData.findOne({ playerId });
        if (!player) return null;

        return {
            id: petId,
            level: player.pets.petLevels[petId] || 1,
            xp: player.pets.petXp[petId] || 0,
            stats: player.pets.petStats[petId] || { happiness: 50, hunger: 50, lastInteracted: 0 },
            isEquipped: player.pets.equippedId === petId
        };
    }
}

export const petService = new PetService();
