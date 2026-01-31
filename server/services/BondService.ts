// =============================================================================
// Bond Service - Manages player bonds, star memories, and constellations
// =============================================================================

import { EventEmitter } from 'events';
import { Bond, StarMemory, Constellation, type IBond, type IStarMemory, type IConstellation } from '../database/bondModels.js';
import { Progression } from '../database/progressionModels.js';
import { notificationService } from './NotificationService.js';

// ============================================
// BOND CONFIGURATION
// ============================================

const BOND_CONFIG = {
    DECAY_RATE: 0.03,           // Strength decay per hour of no interaction
    DECAY_INTERVAL: 60 * 60 * 1000, // Check decay every hour

    // Strength gains from interactions
    GAINS: {
        pulse: 5,
        whisper: 12,
        sing: 8,
        proximity: 1,           // Per minute near each other
        gift: 15,
        emote: 3,
        echo_resonate: 10,
        resonance: 10
    },

    // Thresholds
    WHISPER_THRESHOLD: 25,      // Strength needed for whisper mode
    VOICE_THRESHOLD: 75,        // Strength needed for voice mode
    SEAL_THRESHOLD: 90,         // Strength needed to seal a bond

    MAX_SHARED_MEMORIES: 50,
    MAX_STRENGTH: 100
};

// Constellation patterns (minimum bonds needed)
const CONSTELLATION_PATTERNS = {
    triangle: { minPlayers: 3, minBonds: 3, rarity: 'common' as const },
    square: { minPlayers: 4, minBonds: 4, rarity: 'rare' as const },
    star: { minPlayers: 5, minBonds: 5, rarity: 'epic' as const },
    galaxy: { minPlayers: 7, minBonds: 10, rarity: 'legendary' as const }
};

// ============================================
// BOND SERVICE
// ============================================

class BondService extends EventEmitter {
    private initialized: boolean = false;
    private decayInterval: NodeJS.Timeout | null = null;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        // Start decay timer
        this.decayInterval = setInterval(() => this.processDecay(), BOND_CONFIG.DECAY_INTERVAL);

        console.log('💫 Bond service initialized');
    }

    /**
     * Get or create a bond between two players
     * Always stores with player1Id < player2Id to ensure uniqueness
     */
    async getBond(playerId1: string, playerId2: string): Promise<IBond | null> {
        const [p1, p2] = [playerId1, playerId2].sort();

        try {
            return await Bond.findOne({ player1Id: p1, player2Id: p2 });
        } catch (error) {
            console.error('Error getting bond:', error);
            return null;
        }
    }

    /**
     * Create a new bond between two players
     */
    async createBond(
        playerId1: string,
        playerId2: string,
        realmId?: string
    ): Promise<IBond | null> {
        const [p1, p2] = [playerId1, playerId2].sort();

        try {
            // Check if bond already exists
            const existing = await this.getBond(p1, p2);
            if (existing) return existing;

            const bond = new Bond({
                player1Id: p1,
                player2Id: p2,
                strength: 1,
                consent: 'pending',
                mode: 'silent',
                realmId,
                lastInteraction: new Date()
            });

            await bond.save();
            this.emit('bond_created', { player1Id: p1, player2Id: p2 });

            return bond;
        } catch (error) {
            console.error('Error creating bond:', error);
            return null;
        }
    }

    /**
     * Update bond strength from an interaction
     */
    async updateBondStrength(
        playerId1: string,
        playerId2: string,
        interactionType: keyof typeof BOND_CONFIG.GAINS,
        realmId?: string
    ): Promise<{ bond: IBond | null; strengthDelta: number; modeChanged: boolean }> {
        const [p1, p2] = [playerId1, playerId2].sort();

        try {
            let bond = await this.getBond(p1, p2);

            // Create bond if doesn't exist
            if (!bond) {
                bond = await this.createBond(p1, p2, realmId);
                if (!bond) return { bond: null, strengthDelta: 0, modeChanged: false };
            }

            const gain = BOND_CONFIG.GAINS[interactionType] || 1;
            const oldStrength = bond.strength;
            const oldMode = bond.mode;

            // Update strength
            bond.strength = Math.min(BOND_CONFIG.MAX_STRENGTH, bond.strength + gain);
            bond.lastInteraction = new Date();

            // Update stats based on interaction
            if (interactionType === 'pulse') {
                bond.stats.pulsesSent += 1;
            } else if (interactionType === 'whisper') {
                bond.stats.whispersSent += 1;
            } else if (interactionType === 'gift') {
                bond.stats.lightGifted += 1;
            }

            // Check for mode upgrades
            let modeChanged = false;
            if (bond.strength >= BOND_CONFIG.VOICE_THRESHOLD && bond.mode !== 'voice') {
                bond.mode = 'voice';
                modeChanged = true;
            } else if (bond.strength >= BOND_CONFIG.WHISPER_THRESHOLD && bond.mode === 'silent') {
                bond.mode = 'whisper';
                modeChanged = true;
            }

            await bond.save();

            const strengthDelta = bond.strength - oldStrength;

            if (modeChanged) {
                this.emit('bond_mode_changed', {
                    player1Id: p1,
                    player2Id: p2,
                    oldMode,
                    newMode: bond.mode
                });
            }

            return { bond, strengthDelta, modeChanged };
        } catch (error) {
            console.error('Error updating bond strength:', error);
            return { bond: null, strengthDelta: 0, modeChanged: false };
        }
    }

    /**
     * Add a shared memory to a bond
     */
    async addSharedMemory(
        playerId1: string,
        playerId2: string,
        memoryText: string
    ): Promise<boolean> {
        const [p1, p2] = [playerId1, playerId2].sort();

        try {
            const bond = await this.getBond(p1, p2);
            if (!bond) return false;

            // Limit memories
            if (bond.sharedMemories.length >= BOND_CONFIG.MAX_SHARED_MEMORIES) {
                bond.sharedMemories.shift(); // Remove oldest
            }

            bond.sharedMemories.push({
                text: memoryText.substring(0, 200),
                timestamp: new Date()
            });

            await bond.save();
            return true;
        } catch (error) {
            console.error('Error adding shared memory:', error);
            return false;
        }
    }

    /**
     * Seal a bond, creating a star memory
     */
    async sealBond(
        playerId1: string,
        player1Name: string,
        player1Color: string,
        playerId2: string,
        player2Name: string,
        player2Color: string,
        word1: string,
        word2: string,
        realmId: string
    ): Promise<{ success: boolean; starMemory?: IStarMemory; error?: string }> {
        const [p1, p2] = [playerId1, playerId2].sort();
        const [w1, w2] = playerId1 < playerId2 ? [word1, word2] : [word2, word1];
        const [n1, n2] = playerId1 < playerId2 ? [player1Name, player2Name] : [player2Name, player1Name];
        const [c1, c2] = playerId1 < playerId2 ? [player1Color, player2Color] : [player2Color, player1Color];

        try {
            const bond = await this.getBond(p1, p2);

            if (!bond) {
                return { success: false, error: 'Bond does not exist' };
            }

            if (bond.sealed) {
                return { success: false, error: 'Bond is already sealed' };
            }

            if (bond.strength < BOND_CONFIG.SEAL_THRESHOLD) {
                return { success: false, error: `Bond strength must be at least ${BOND_CONFIG.SEAL_THRESHOLD}` };
            }

            // Mark bond as sealed
            bond.sealed = true;
            bond.sealWord1 = w1;
            bond.sealWord2 = w2;
            bond.sealedAt = new Date();
            await bond.save();

            // Create star memory
            const starMemory = new StarMemory({
                bondId: bond._id?.toString(),
                player1Id: p1,
                player1Name: n1,
                player1Color: c1,
                player2Id: p2,
                player2Name: n2,
                player2Color: c2,
                word1: w1,
                word2: w2,
                combinedPhrase: `${w1} & ${w2}`,
                sealedAt: new Date(),
                realmId,
                position: {
                    x: Math.random() * 2000 - 1000,
                    y: Math.random() * 2000 - 1000
                },
                brightness: Math.min(5, bond.strength / 20)
            });

            await starMemory.save();

            // Award stardust to both players
            await Promise.all([
                Progression.findOneAndUpdate(
                    { playerId: p1 },
                    { $inc: { stardust: 500 } }
                ),
                Progression.findOneAndUpdate(
                    { playerId: p2 },
                    { $inc: { stardust: 500 } }
                )
            ]);

            this.emit('bond_sealed', {
                player1Id: p1,
                player2Id: p2,
                starMemoryId: starMemory._id?.toString()
            });

            // Check for constellation formation
            await this.checkForConstellation([p1, p2], realmId);

            return { success: true, starMemory };
        } catch (error) {
            console.error('Error sealing bond:', error);
            return { success: false, error: 'Failed to seal bond' };
        }
    }

    /**
     * Get all bonds for a player
     */
    async getPlayerBonds(playerId: string): Promise<IBond[]> {
        try {
            return await Bond.find({
                $or: [
                    { player1Id: playerId },
                    { player2Id: playerId }
                ]
            }).sort({ strength: -1 });
        } catch (error) {
            console.error('Error getting player bonds:', error);
            return [];
        }
    }

    /**
     * Get all star memories for a player
     */
    async getPlayerStarMemories(playerId: string): Promise<IStarMemory[]> {
        try {
            return await StarMemory.find({
                $or: [
                    { player1Id: playerId },
                    { player2Id: playerId }
                ]
            }).sort({ sealedAt: -1 });
        } catch (error) {
            console.error('Error getting star memories:', error);
            return [];
        }
    }

    /**
     * Get star memories visible in a realm
     */
    async getRealmStarMemories(realmId: string, limit: number = 100): Promise<IStarMemory[]> {
        try {
            return await StarMemory.find({ realmId })
                .sort({ brightness: -1 })
                .limit(limit);
        } catch (error) {
            console.error('Error getting realm star memories:', error);
            return [];
        }
    }

    /**
     * Check if a constellation can be formed
     */
    async checkForConstellation(playerIds: string[], realmId: string): Promise<IConstellation | null> {
        try {
            // Get all sealed bonds among these players
            const bonds = await Bond.find({
                player1Id: { $in: playerIds },
                player2Id: { $in: playerIds },
                sealed: true
            });

            // Find connected players
            const connectedPlayers = new Set<string>();
            bonds.forEach(b => {
                connectedPlayers.add(b.player1Id);
                connectedPlayers.add(b.player2Id);
            });

            // Check against patterns
            for (const [patternName, pattern] of Object.entries(CONSTELLATION_PATTERNS)) {
                if (connectedPlayers.size >= pattern.minPlayers && bonds.length >= pattern.minBonds) {
                    // Check if this constellation already exists
                    const existingIds = Array.from(connectedPlayers).sort().join(',');
                    const existing = await Constellation.findOne({
                        playerIds: { $all: Array.from(connectedPlayers) },
                        realmId
                    });

                    if (existing) continue;

                    // Create new constellation
                    const starMemories = await StarMemory.find({
                        bondId: { $in: bonds.map(b => b._id?.toString()) }
                    });

                    const constellation = new Constellation({
                        name: `${patternName.charAt(0).toUpperCase() + patternName.slice(1)} of ${connectedPlayers.size}`,
                        description: `A ${patternName} constellation formed by ${connectedPlayers.size} souls`,
                        playerIds: Array.from(connectedPlayers),
                        starMemoryIds: starMemories.map(s => s._id?.toString()),
                        realmId,
                        rarity: pattern.rarity,
                        bonusAmount: pattern.rarity === 'legendary' ? 1000 :
                            pattern.rarity === 'epic' ? 500 :
                                pattern.rarity === 'rare' ? 250 : 100
                    });

                    await constellation.save();

                    // Award bonus to all players
                    await Progression.updateMany(
                        { playerId: { $in: Array.from(connectedPlayers) } },
                        { $inc: { stardust: constellation.bonusAmount } }
                    );

                    this.emit('constellation_formed', {
                        constellationId: constellation._id?.toString(),
                        playerIds: Array.from(connectedPlayers),
                        rarity: pattern.rarity
                    });

                    return constellation;
                }
            }

            return null;
        } catch (error) {
            console.error('Error checking for constellation:', error);
            return null;
        }
    }

    /**
     * Get constellations a player is part of
     */
    async getPlayerConstellations(playerId: string): Promise<IConstellation[]> {
        try {
            return await Constellation.find({
                playerIds: playerId
            }).sort({ formedAt: -1 });
        } catch (error) {
            console.error('Error getting player constellations:', error);
            return [];
        }
    }

    /**
     * Process bond decay for all bonds
     */
    private async processDecay(): Promise<void> {
        try {
            const cutoff = new Date(Date.now() - BOND_CONFIG.DECAY_INTERVAL);

            // Find bonds that haven't been interacted with recently
            const staleBonds = await Bond.find({
                lastInteraction: { $lt: cutoff },
                sealed: false, // Sealed bonds don't decay
                strength: { $gt: 0 }
            });

            for (const bond of staleBonds) {
                const hoursSinceInteraction = (Date.now() - bond.lastInteraction.getTime()) / (60 * 60 * 1000);
                const decay = BOND_CONFIG.DECAY_RATE * hoursSinceInteraction;

                bond.strength = Math.max(0, bond.strength - decay);

                // Downgrade mode if strength drops below threshold
                const oldMode = bond.mode;
                if (bond.strength < BOND_CONFIG.WHISPER_THRESHOLD && bond.mode !== 'silent') {
                    bond.mode = 'silent';
                } else if (bond.strength < BOND_CONFIG.VOICE_THRESHOLD && bond.mode === 'voice') {
                    bond.mode = 'whisper';
                }

                if (oldMode !== bond.mode) {
                    // Notify both players of the downgrade
                    const message = `Your bond strength has faded to ${bond.mode} mode. Interact to restore it!`;
                    notificationService.notify(bond.player1Id, 'connection_made', message, { priority: 'high' });
                    notificationService.notify(bond.player2Id, 'connection_made', message, { priority: 'high' });
                } else if (bond.strength < 5 && bond.strength > 0) {
                    // Critical low warning (throttle this? simplified for now)
                    const message = `A bond is becoming very weak. Reach out before it fades completely.`;
                    notificationService.notify(bond.player1Id, 'connection_made', message);
                    notificationService.notify(bond.player2Id, 'connection_made', message);
                }

                await bond.save();
            }
        } catch (error) {
            console.error('Error processing bond decay:', error);
        }
    }

    /**
     * Cleanup on shutdown
     */
    async shutdown(): Promise<void> {
        if (this.decayInterval) {
            clearInterval(this.decayInterval);
        }
    }
}

export const bondService = new BondService();
export { BondService };
