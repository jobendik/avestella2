// =============================================================================
// Bond Handlers - WebSocket message handlers for bond system
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { bondService } from '../../services/BondService.js';
import { notificationService } from '../../services/NotificationService.js';

export class BondHandlers {
    /**
     * Get bond with another player
     */
    static async handleGetBond(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId } = data;
            if (!targetId) return;

            const bond = await bondService.getBond(connection.playerId, targetId);

            ctx.send(connection.ws, {
                type: 'bond_data',
                data: { 
                    targetId,
                    bond: bond ? {
                        strength: bond.strength,
                        consent: bond.consent,
                        mode: bond.mode,
                        sealed: bond.sealed,
                        sealWord1: bond.sealWord1,
                        sealWord2: bond.sealWord2,
                        sealedAt: bond.sealedAt,
                        lastInteraction: bond.lastInteraction,
                        stats: bond.stats,
                        sharedMemories: bond.sharedMemories.slice(-10) // Last 10 memories
                    } : null
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting bond:', error);
        }
    }

    /**
     * Get all bonds for current player
     */
    static async handleGetAllBonds(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const bonds = await bondService.getPlayerBonds(connection.playerId);

            ctx.send(connection.ws, {
                type: 'all_bonds',
                data: { 
                    bonds: bonds.map(b => ({
                        targetId: b.player1Id === connection.playerId ? b.player2Id : b.player1Id,
                        strength: b.strength,
                        consent: b.consent,
                        mode: b.mode,
                        sealed: b.sealed,
                        lastInteraction: b.lastInteraction
                    }))
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting all bonds:', error);
        }
    }

    /**
     * Update bond from interaction (called internally from other handlers)
     */
    static async handleBondInteraction(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId, interactionType } = data;
            if (!targetId || !interactionType) return;

            const result = await bondService.updateBondStrength(
                connection.playerId,
                targetId,
                interactionType,
                connection.realm
            );

            if (result.bond) {
                // Notify both players of bond update
                ctx.send(connection.ws, {
                    type: 'bond_updated',
                    data: {
                        targetId,
                        strength: result.bond.strength,
                        strengthDelta: result.strengthDelta,
                        mode: result.bond.mode,
                        modeChanged: result.modeChanged
                    },
                    timestamp: Date.now()
                });

                // Notify target if online
                const targetConn = ctx.connections.get(targetId);
                if (targetConn) {
                    ctx.send(targetConn.ws, {
                        type: 'bond_updated',
                        data: {
                            targetId: connection.playerId,
                            strength: result.bond.strength,
                            strengthDelta: result.strengthDelta,
                            mode: result.bond.mode,
                            modeChanged: result.modeChanged
                        },
                        timestamp: Date.now()
                    });
                }

                // Notify on mode change
                if (result.modeChanged) {
                    notificationService.notify(connection.playerId, 'social',
                        `Your bond has grown to ${result.bond.mode} mode!`,
                        { title: 'Bond Strengthened' }
                    );
                }
            }
        } catch (error) {
            console.error('Error handling bond interaction:', error);
        }
    }

    /**
     * Add a shared memory to a bond
     */
    static async handleAddMemory(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId, memoryText } = data;
            if (!targetId || !memoryText) return;

            const success = await bondService.addSharedMemory(
                connection.playerId,
                targetId,
                memoryText
            );

            if (success) {
                ctx.send(connection.ws, {
                    type: 'memory_added',
                    data: { targetId, success: true },
                    timestamp: Date.now()
                });

                // Notify target
                const targetConn = ctx.connections.get(targetId);
                if (targetConn) {
                    ctx.send(targetConn.ws, {
                        type: 'new_shared_memory',
                        data: {
                            fromId: connection.playerId,
                            fromName: connection.playerName,
                            memoryText
                        },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Error adding memory:', error);
        }
    }

    /**
     * Seal a bond (both players must provide words)
     */
    static async handleSealBond(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId, sealWord } = data;
            if (!targetId || !sealWord) return;

            // Get target player info
            const targetConn = ctx.connections.get(targetId);
            if (!targetConn) {
                ctx.send(connection.ws, {
                    type: 'seal_bond_error',
                    data: { error: 'Other player must be online to seal bond' },
                    timestamp: Date.now()
                });
                return;
            }

            // Store the seal word request (simplified - in production use Redis/session)
            // For now, we'll check if both have sent seal requests
            const pendingSeals = (ctx as any).pendingSeals || new Map();
            (ctx as any).pendingSeals = pendingSeals;

            const pairKey = [connection.playerId, targetId].sort().join(':');
            const existing = pendingSeals.get(pairKey);

            if (existing && existing.playerId !== connection.playerId) {
                // Both players have submitted - seal the bond!
                const result = await bondService.sealBond(
                    connection.playerId,
                    connection.playerName || 'Player',
                    String(connection.color || 180),
                    targetId,
                    targetConn.playerName || 'Player',
                    String(targetConn.color || 180),
                    sealWord,
                    existing.word,
                    connection.realm
                );

                pendingSeals.delete(pairKey);

                if (result.success && result.starMemory) {
                    // Notify both players
                    const sealData = {
                        success: true,
                        starMemory: {
                            word1: result.starMemory.word1,
                            word2: result.starMemory.word2,
                            combinedPhrase: result.starMemory.combinedPhrase,
                            brightness: result.starMemory.brightness
                        }
                    };

                    ctx.send(connection.ws, {
                        type: 'bond_sealed',
                        data: { ...sealData, targetId },
                        timestamp: Date.now()
                    });

                    ctx.send(targetConn.ws, {
                        type: 'bond_sealed',
                        data: { ...sealData, targetId: connection.playerId },
                        timestamp: Date.now()
                    });

                    notificationService.notify(connection.playerId, 'achievement',
                        `You created a star with ${targetConn.playerName}!`,
                        { title: 'Bond Sealed!' }
                    );
                    notificationService.notify(targetId, 'achievement',
                        `You created a star with ${connection.playerName}!`,
                        { title: 'Bond Sealed!' }
                    );
                } else {
                    ctx.send(connection.ws, {
                        type: 'seal_bond_error',
                        data: { error: result.error },
                        timestamp: Date.now()
                    });
                }
            } else {
                // First player to submit - wait for other
                pendingSeals.set(pairKey, { playerId: connection.playerId, word: sealWord });

                ctx.send(connection.ws, {
                    type: 'seal_pending',
                    data: { message: 'Waiting for other player to submit their word...' },
                    timestamp: Date.now()
                });

                // Notify target that seal was initiated
                ctx.send(targetConn.ws, {
                    type: 'seal_requested',
                    data: {
                        fromId: connection.playerId,
                        fromName: connection.playerName
                    },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Error sealing bond:', error);
        }
    }

    /**
     * Get star memories for current player
     */
    static async handleGetStarMemories(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const memories = await bondService.getPlayerStarMemories(connection.playerId);

            ctx.send(connection.ws, {
                type: 'star_memories',
                data: { 
                    memories: memories.map(m => ({
                        id: m._id?.toString(),
                        targetId: m.player1Id === connection.playerId ? m.player2Id : m.player1Id,
                        targetName: m.player1Id === connection.playerId ? m.player2Name : m.player1Name,
                        targetColor: m.player1Id === connection.playerId ? m.player2Color : m.player1Color,
                        word1: m.word1,
                        word2: m.word2,
                        combinedPhrase: m.combinedPhrase,
                        sealedAt: m.sealedAt,
                        brightness: m.brightness,
                        constellation: m.constellation
                    }))
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting star memories:', error);
        }
    }

    /**
     * Get realm star map (all visible star memories)
     */
    static async handleGetRealmStars(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { realmId, limit } = data;
            const realm = realmId || connection.realm;

            const memories = await bondService.getRealmStarMemories(realm, limit || 100);

            ctx.send(connection.ws, {
                type: 'realm_stars',
                data: {
                    realmId: realm,
                    stars: memories.map(m => ({
                        id: m._id?.toString(),
                        position: m.position,
                        brightness: m.brightness,
                        color1: m.player1Color,
                        color2: m.player2Color,
                        combinedPhrase: m.combinedPhrase,
                        constellation: m.constellation
                    }))
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting realm stars:', error);
        }
    }

    /**
     * Get constellations player is part of
     */
    static async handleGetConstellations(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const constellations = await bondService.getPlayerConstellations(connection.playerId);

            ctx.send(connection.ws, {
                type: 'constellations',
                data: {
                    constellations: constellations.map(c => ({
                        id: c._id?.toString(),
                        name: c.name,
                        description: c.description,
                        playerCount: c.playerIds.length,
                        formedAt: c.formedAt,
                        rarity: c.rarity,
                        bonusType: c.bonusType,
                        bonusAmount: c.bonusAmount
                    }))
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting constellations:', error);
        }
    }
}
