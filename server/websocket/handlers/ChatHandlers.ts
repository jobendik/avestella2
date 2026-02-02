// =============================================================================
// Chat Handlers - Chat messages, whispers, and moderation
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';

// Profanity filter (basic - expand as needed)
const BLOCKED_WORDS = ['spam', 'hack', 'cheat'];

function filterMessage(text: string): string {
    let filtered = text;
    for (const word of BLOCKED_WORDS) {
        const regex = new RegExp(word, 'gi');
        filtered = filtered.replace(regex, '*'.repeat(word.length));
    }
    return filtered;
}

export class ChatHandlers {
    /**
     * Handle chat message
     */
    static async handleChatMessage(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { message, channel } = data;

            console.log(`🟠 [SERVER ChatHandler] handleChatMessage from=${connection.playerId} realm=${connection.realm}`, { message, channel });

            if (!message || typeof message !== 'string') return;

            // Rate limiting
            const now = Date.now();
            if (connection.lastChatTime && now - connection.lastChatTime < 500) {
                ctx.sendError(connection, 'Please wait before sending another message');
                return;
            }
            connection.lastChatTime = now;

            // Message validation
            const trimmed = message.trim();
            if (trimmed.length === 0 || trimmed.length > 500) {
                ctx.sendError(connection, 'Invalid message length');
                return;
            }

            // Filter message
            const filtered = filterMessage(trimmed);

            // Update connection state for world sync
            connection.currentMessage = filtered;
            connection.messageExpiresAt = now + 5000;

            const chatMessage = {
                type: 'chat_message',
                data: {
                    playerId: connection.playerId,
                    playerName: connection.playerName,
                    message: filtered,
                    channel: channel || 'realm',
                    timestamp: now
                },
                timestamp: now
            };

            // Broadcast to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                console.log(`🟠 [SERVER ChatHandler] Broadcasting to ${realm.size} players in realm=${connection.realm}`);
                for (const conn of Array.from(realm.values())) {
                    console.log(`🟠 [SERVER ChatHandler] Sending to playerId=${conn.playerId}`);
                    ctx.send(conn.ws, chatMessage);
                }
            } else {
                console.log(`🟠 [SERVER ChatHandler] NO REALM FOUND for ${connection.realm}`);
            }
        } catch (error) {
            console.error('Failed to handle chat message:', error);
        }
    }


    /**
     * Handle whisper (private message)
     */
    static async handleWhisper(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId, message } = data;

            if (!message || typeof message !== 'string' || !targetId) return;

            const trimmed = message.trim();
            if (trimmed.length === 0 || trimmed.length > 500) {
                ctx.sendError(connection, 'Invalid message length');
                return;
            }

            // Find target player
            let targetConnection: PlayerConnection | null = null;
            for (const realm of Array.from(ctx.realms.values())) {
                for (const conn of Array.from(realm.values())) {
                    if (conn.playerId === targetId) {
                        targetConnection = conn;
                        break;
                    }
                }
                if (targetConnection) break;
            }

            if (!targetConnection) {
                ctx.sendError(connection, 'Player not online');
                return;
            }

            const filtered = filterMessage(trimmed);
            const now = Date.now();

            // Send to target
            ctx.send(targetConnection.ws, {
                type: 'whisper_received',
                data: {
                    fromId: connection.playerId,
                    fromName: connection.playerName,
                    message: filtered,
                    timestamp: now
                },
                timestamp: now
            });

            // Confirm to sender
            ctx.send(connection.ws, {
                type: 'whisper_sent',
                data: {
                    toId: targetId,
                    message: filtered,
                    timestamp: now
                },
                timestamp: now
            });
        } catch (error) {
            console.error('Failed to handle whisper:', error);
        }
    }

    /**
     * Handle emoji reaction
     */
    static async handleEmojiReaction(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { emoji, targetId } = data;

            if (!emoji || typeof emoji !== 'string') return;

            const now = Date.now();
            const reaction = {
                type: 'emoji_reaction',
                data: {
                    playerId: connection.playerId,
                    emoji,
                    targetId,
                    timestamp: now
                },
                timestamp: now
            };

            // Broadcast to realm
            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of Array.from(realm.values())) {
                    ctx.send(conn.ws, reaction);
                }
            }
        } catch (error) {
            console.error('Failed to handle emoji reaction:', error);
        }
    }

    /**
     * Handle typing indicator
     */
    static handleTypingIndicator(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { isTyping } = data;

            if (connection.realm && ctx.realms.has(connection.realm)) {
                const realm = ctx.realms.get(connection.realm)!;
                for (const conn of Array.from(realm.values())) {
                    if (conn.playerId !== connection.playerId) {
                        ctx.send(conn.ws, {
                            type: 'typing_indicator',
                            data: {
                                playerId: connection.playerId,
                                isTyping: !!isTyping
                            },
                            timestamp: Date.now()
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to handle typing indicator:', error);
        }
    }

    /**
     * Handle mute player
     */
    static handleMutePlayer(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { targetId } = data;

            if (!targetId) return;

            // Store mute in connection state
            if (!connection.mutedPlayers) {
                connection.mutedPlayers = new Set();
            }
            connection.mutedPlayers.add(targetId);

            ctx.send(connection.ws, {
                type: 'player_muted',
                data: { playerId: targetId },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to mute player:', error);
        }
    }

    /**
     * Handle unmute player
     */
    static handleUnmutePlayer(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { targetId } = data;

            if (!targetId || !connection.mutedPlayers) return;

            connection.mutedPlayers.delete(targetId);

            ctx.send(connection.ws, {
                type: 'player_unmuted',
                data: { playerId: targetId },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to unmute player:', error);
        }
    }
}
