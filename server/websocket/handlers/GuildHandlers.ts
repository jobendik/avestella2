// =============================================================================
// Guild Handlers - WebSocket message handlers for guild system
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { guildService } from '../../services/index.js';
import { notificationService } from '../../services/NotificationService.js';

export class GuildHandlers {
    /**
     * Route guild actions to appropriate handler
     */
    static async handleGuildAction(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        const { action } = data;

        switch (action) {
            case 'create':
                await this.handleCreateGuild(connection, data, ctx);
                break;
            case 'join':
                await this.handleJoinGuild(connection, data, ctx);
                break;
            case 'leave':
                await this.handleLeaveGuild(connection, data, ctx);
                break;
            case 'list':
                await this.handleListGuilds(connection, data, ctx); // Rename to search/list
                break;
            case 'info':
                await this.handleGetGuildInfo(connection, data, ctx);
                break;
            case 'contribute':
                await this.handleGuildContribute(connection, data, ctx);
                break;
            case 'chat':
                await this.handleGuildChat(connection, data, ctx);
                break;
            default:
                ctx.sendError(connection, `Unknown guild action: ${action}`);
        }
    }

    /**
     * Create a new guild
     */
    static async handleCreateGuild(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { guildName, guildTag, guildDescription, icon, color, isPublic } = data;

            if (!guildName || guildName.length < 3 || guildName.length > 30) {
                ctx.sendError(connection, 'Guild name must be 3-30 characters');
                return;
            }

            if (!guildTag || guildTag.length < 2 || guildTag.length > 5) {
                ctx.sendError(connection, 'Guild tag must be 2-5 characters');
                return;
            }

            const guild = await guildService.createGuild(
                connection.playerId,
                connection.playerName,
                connection.level || 1,
                {
                    name: guildName,
                    tag: guildTag.toUpperCase(),
                    description: guildDescription,
                    icon,
                    color,
                    isPublic
                }
            );

            if (guild) {
                ctx.send(connection.ws, {
                    type: 'guild_created',
                    data: {
                        guildId: guild.guildId,
                        name: guild.name,
                        tag: guild.tag,
                        description: guild.description,
                        icon: guild.icon,
                        color: guild.color
                    },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, 'Failed to create guild');
            }
        } catch (error: any) {
            console.error('Error creating guild:', error);
            ctx.sendError(connection, error.message || 'Failed to create guild');
        }
    }

    /**
     * Join an existing guild
     */
    static async handleJoinGuild(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { guildId } = data;

            if (!guildId) {
                ctx.sendError(connection, 'Guild ID required');
                return;
            }

            const guild = await guildService.joinGuild(
                guildId,
                connection.playerId,
                connection.playerName,
                connection.level || 1
            );

            if (guild) {
                ctx.send(connection.ws, {
                    type: 'guild_joined',
                    data: {
                        guildId,
                        guild: guild // Send full guild info
                    },
                    timestamp: Date.now()
                });

                // Notify other guild members
                if (guild.members) {
                    for (const member of guild.members) {
                        if (member.playerId !== connection.playerId) {
                            const memberConn = ctx.connections.get(member.playerId);
                            if (memberConn) {
                                ctx.send(memberConn.ws, {
                                    type: 'guild_member_joined',
                                    data: {
                                        guildId,
                                        playerId: connection.playerId,
                                        playerName: connection.playerName
                                    },
                                    timestamp: Date.now()
                                });
                            }
                        }
                    }
                }
            } else {
                // Should potentially catch "Approval pending" error if joinGuild throws it
                ctx.sendError(connection, 'Failed to join guild');
            }
        } catch (error: any) {
            console.error('Error joining guild:', error);
            // Handle specific errors like "Application submitted"
            if (error.message === 'Application submitted for approval') {
                ctx.send(connection.ws, {
                    type: 'guild_application_submitted',
                    data: { guildId: data.guildId },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, error.message || 'Failed to join guild');
            }
        }
    }

    /**
     * Leave current guild
     */
    static async handleLeaveGuild(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { guildId } = data; // Usually client sends guildId, or we can look it up

            // If client doesn't send guildId, we might need to look it up.
            // But guildService.leaveGuild takes guildId.
            // If the client doesn't know the guildId, they can't leave.
            // Assumption: Client sends guildId. 
            // Better: Look up player's guild via service if missing.

            let targetGuildId = guildId;
            if (!targetGuildId) {
                const playerGuild = await guildService.getPlayerGuild(connection.playerId);
                if (playerGuild) targetGuildId = playerGuild.guildId;
            }

            if (!targetGuildId) {
                ctx.sendError(connection, 'Not in a guild');
                return;
            }

            const success = await guildService.leaveGuild(targetGuildId, connection.playerId);

            if (success) {
                ctx.send(connection.ws, {
                    type: 'guild_left',
                    data: { guildId: targetGuildId },
                    timestamp: Date.now()
                });

                // Notify members? (Optional, but good practice)
                const guild = await guildService.getGuild(targetGuildId);
                if (guild) {
                    for (const member of guild.members) {
                        const memberConn = ctx.connections.get(member.playerId);
                        if (memberConn) {
                            ctx.send(memberConn.ws, {
                                type: 'guild_member_left',
                                data: { guildId: targetGuildId, playerId: connection.playerId },
                                timestamp: Date.now()
                            });
                        }
                    }
                }

            } else {
                ctx.sendError(connection, 'Failed to leave guild');
            }
        } catch (error: any) {
            console.error('Error leaving guild:', error);
            ctx.sendError(connection, error.message || 'Failed to leave guild');
        }
    }

    /**
     * List available guilds
     */
    static async handleListGuilds(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { limit = 20, offset = 0, query, sortBy } = data;
            const guilds = await guildService.searchGuilds({
                limit,
                offset,
                query,
                sortBy
            });

            ctx.send(connection.ws, {
                type: 'guild_list',
                data: { guilds },
                timestamp: Date.now()
            });
        } catch (error: any) {
            console.error('Error listing guilds:', error);
            ctx.sendError(connection, 'Failed to list guilds');
        }
    }

    /**
     * Get guild info
     */
    static async handleGetGuildInfo(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { guildId } = data;
            if (!guildId) {
                // Try getting player's own guild
                const playerGuild = await guildService.getPlayerGuild(connection.playerId);
                if (playerGuild) {
                    ctx.send(connection.ws, {
                        type: 'guild_info',
                        data: { guild: playerGuild },
                        timestamp: Date.now()
                    });
                    return;
                }
                ctx.sendError(connection, 'Guild ID required');
                return;
            }

            const guild = await guildService.getGuild(guildId);

            if (guild) {
                ctx.send(connection.ws, {
                    type: 'guild_info',
                    data: { guild },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, 'Guild not found');
            }
        } catch (error: any) {
            console.error('Error getting guild info:', error);
            ctx.sendError(connection, 'Failed to get guild info');
        }
    }

    /**
     * Contribute to guild
     */
    static async handleGuildContribute(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { contributionType, amount, guildId } = data;

            let targetGuildId = guildId;
            if (!targetGuildId) {
                const playerGuild = await guildService.getPlayerGuild(connection.playerId);
                if (playerGuild) targetGuildId = playerGuild.guildId;
            }

            if (!targetGuildId) {
                ctx.sendError(connection, 'Not in a guild');
                return;
            }

            // Map contributionType to ContributionData
            const contributionData: any = {};
            if (contributionType === 'stardust') contributionData.stardust = amount;
            if (contributionType === 'xp') contributionData.xp = amount;
            if (contributionType === 'challenges') contributionData.challenges = amount;

            const result = await guildService.contribute(
                targetGuildId,
                connection.playerId,
                contributionData
            );

            ctx.send(connection.ws, {
                type: 'guild_contribution_success',
                data: {
                    guildId: targetGuildId,
                    contributionType,
                    amount,
                    newGuildXp: result.guild.xp,
                    newGuildLevel: result.guild.level,
                    leveledUp: result.leveledUp,
                    newPerks: result.newPerks
                },
                timestamp: Date.now()
            });

            if (result.leveledUp) {
                // Broadcast level up to realm or guild members
                for (const member of result.guild.members) {
                    const memberConn = ctx.connections.get(member.playerId);
                    if (memberConn) {
                        ctx.send(memberConn.ws, {
                            type: 'guild_leveled_up',
                            data: {
                                guildId: targetGuildId,
                                level: result.guild.level,
                                newPerks: result.newPerks
                            },
                            timestamp: Date.now()
                        });
                    }
                }
            }

        } catch (error: any) {
            console.error('Error contributing to guild:', error);
            ctx.sendError(connection, error.message || 'Failed to contribute to guild');
        }
    }

    /**
     * Handle guild chat message
     */
    static async handleGuildChat(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { text, guildId } = data;

            if (!text || text.trim().length === 0) {
                return;
            }

            let targetGuildId = guildId;
            if (!targetGuildId) {
                const playerGuild = await guildService.getPlayerGuild(connection.playerId);
                if (playerGuild) targetGuildId = playerGuild.guildId;
            }

            if (!targetGuildId) {
                ctx.sendError(connection, 'Not in a guild');
                return;
            }

            // Use service to save and send
            await guildService.sendChatMessage(targetGuildId, connection.playerId, text);

            // Note: guildService emits 'chat_message', but we might want to manually broadcast here
            // if we are not listening to the service events globally. 
            // The service event listener strategy would be cleaner, but for now strict request-response or manual broadcast is okay.
            // Actually, querying the guild members and sending is safest.

            const guild = await guildService.getGuild(targetGuildId);
            if (!guild) return;

            const chatMessage = {
                type: 'guild_chat_message',
                data: {
                    guildId: targetGuildId,
                    fromId: connection.playerId,
                    fromName: connection.playerName,
                    text: text.trim().substring(0, 500),
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            };

            for (const member of guild.members) {
                const memberConn = ctx.connections.get(member.playerId);
                if (memberConn) {
                    ctx.send(memberConn.ws, chatMessage);
                }
            }
        } catch (error: any) {
            console.error('Error sending guild chat:', error);
            ctx.sendError(connection, error.message || 'Failed to send guild chat'); // Optional, maybe silent fail
        }
    }
}
