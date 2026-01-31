// =============================================================================
// PowerUp Handlers - PowerUp spawning, collection, and activation
// =============================================================================

import type { PlayerConnection, HandlerContext, PowerUpInstance } from '../types.js';
import { progressionService } from '../../services/ProgressionService.js';

// PowerUp configuration
const POWERUP_TYPES = {
    speed_boost: { duration: 10000, effect: 'speed', multiplier: 1.5 },
    glow_aura: { duration: 15000, effect: 'glow', intensity: 2.0 },
    magnet: { duration: 12000, effect: 'attract', range: 200 },
    shield: { duration: 8000, effect: 'shield', strength: 1.0 },
    double_xp: { duration: 30000, effect: 'xp', multiplier: 2.0 },
    invisibility: { duration: 5000, effect: 'invisible', opacity: 0.3 }
};

export class PowerUpHandlers {
    /**
     * Spawn a powerup in the realm
     */
    static spawnPowerUp(ctx: HandlerContext, realm: string, type?: string): PowerUpInstance | null {
        try {
            const powerUpType = type || Object.keys(POWERUP_TYPES)[Math.floor(Math.random() * Object.keys(POWERUP_TYPES).length)];
            const config = POWERUP_TYPES[powerUpType as keyof typeof POWERUP_TYPES];

            if (!config) return null;

            const powerUp: PowerUpInstance = {
                id: `powerup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: powerUpType,
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                spawnedAt: Date.now(),
                expiresAt: Date.now() + 60000, // 1 minute to collect
                config
            };

            ctx.powerUps.set(powerUp.id, powerUp);

            // Broadcast to realm
            const realmConnections = ctx.realms.get(realm);
            if (realmConnections) {
                for (const conn of realmConnections.values()) {
                    ctx.send(conn.ws, {
                        type: 'power_up_spawned',
                        data: { powerUp },
                        timestamp: Date.now()
                    });
                }
            }

            return powerUp;
        } catch (error) {
            console.error('Failed to spawn powerup:', error);
            return null;
        }
    }

    /**
     * Handle collecting a powerup
     */
    static async handleCollectPowerUp(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { powerUpId } = data;

            const powerUp = ctx.powerUps.get(powerUpId);
            if (!powerUp) {
                ctx.sendError(connection, 'PowerUp not found');
                return;
            }

            // Check if expired
            if (powerUp.expiresAt < Date.now()) {
                ctx.powerUps.delete(powerUpId);
                ctx.sendError(connection, 'PowerUp has expired');
                return;
            }

            // Check distance
            const dx = powerUp.x - connection.x;
            const dy = powerUp.y - connection.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 50) {
                ctx.sendError(connection, 'Too far from powerup');
                return;
            }

            // Remove powerup
            ctx.powerUps.delete(powerUpId);

            // Apply powerup to player
            if (!connection.activePowerUps) {
                connection.activePowerUps = new Map();
            }

            const activeUntil = Date.now() + (powerUp.config?.duration || 10000);
            connection.activePowerUps.set(powerUp.type, {
                ...powerUp,
                activeUntil
            });

            const now = Date.now();

            // Notify collector
            ctx.send(connection.ws, {
                type: 'power_up_collected',
                data: {
                    powerUpId,
                    type: powerUp.type,
                    duration: powerUp.config?.duration || 10000,
                    effect: powerUp.config
                },
                timestamp: now
            });

            // Broadcast removal to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    if (conn.playerId !== connection.playerId) {
                        ctx.send(conn.ws, {
                            type: 'power_up_collected',
                            data: { powerUpId, playerId: connection.playerId },
                            timestamp: now
                        });
                    }
                }
            }

            // Award XP
            await progressionService.addXP(connection.playerId, 5, 'collect_powerup');
        } catch (error) {
            console.error('Failed to collect powerup:', error);
        }
    }

    /**
     * Handle using/activating a powerup
     */
    static handleActivatePowerUp(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { powerUpType } = data;

            if (!connection.activePowerUps) {
                ctx.sendError(connection, 'No active powerups');
                return;
            }

            const powerUp = connection.activePowerUps.get(powerUpType);
            if (!powerUp) {
                ctx.sendError(connection, 'PowerUp not active');
                return;
            }

            // Broadcast activation effect to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of realm.values()) {
                    ctx.send(conn.ws, {
                        type: 'power_up_effect_applied',
                        data: {
                            playerId: connection.playerId,
                            effect: {
                                type: powerUpType,
                                duration: powerUp.config?.duration || 10000
                            }
                        },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Failed to activate powerup:', error);
        }
    }

    /**
     * Handle requesting available powerups
     */
    static handleRequestPowerUps(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const now = Date.now();

            // Get all non-expired powerups
            const powerUps = Array.from(ctx.powerUps.values())
                .filter(p => p.expiresAt > now);

            ctx.send(connection.ws, {
                type: 'power_ups_state',
                data: { powerUps, activeEffects: [] },
                timestamp: now
            });
        } catch (error) {
            console.error('Failed to get powerups:', error);
        }
    }

    /**
     * Handle requesting active player powerups
     */
    static handleGetActivePowerUps(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const now = Date.now();
            const activePowerUps: any[] = [];

            if (connection.activePowerUps) {
                for (const [type, powerUp] of connection.activePowerUps.entries()) {
                    if (powerUp.activeUntil > now) {
                        activePowerUps.push({
                            type,
                            remainingTime: powerUp.activeUntil - now,
                            effect: powerUp.config
                        });
                    } else {
                        // Clean up expired
                        connection.activePowerUps.delete(type);
                    }
                }
            }

            ctx.send(connection.ws, {
                type: 'active_powerups',
                data: { powerUps: activePowerUps },
                timestamp: now
            });
        } catch (error) {
            console.error('Failed to get active powerups:', error);
        }
    }

    /**
     * Clean up expired powerups
     */
    static cleanupExpiredPowerUps(ctx: HandlerContext): void {
        const now = Date.now();

        for (const [id, powerUp] of ctx.powerUps.entries()) {
            if (powerUp.expiresAt < now) {
                ctx.powerUps.delete(id);

                // Broadcast removal
                for (const realm of ctx.realms.values()) {
                    for (const conn of realm.values()) {
                        ctx.send(conn.ws, {
                            type: 'power_up_expired',
                            data: { powerUpId: id },
                            timestamp: now
                        });
                    }
                }
            }
        }
    }
}
