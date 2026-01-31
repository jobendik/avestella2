// =============================================================================
// Notification Handlers - Push notifications and alerts
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { notificationService } from '../../services/NotificationService.js';

export class NotificationHandlers {
    /**
     * Get pending notifications
     */
    static handleGetNotifications(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const notifications = notificationService.getPendingNotifications(connection.playerId);

            ctx.send(connection.ws, {
                type: 'notifications_list',
                data: { notifications },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get notifications:', error);
        }
    }

    /**
     * Mark notification as read
     */
    static handleMarkNotificationRead(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { notificationId } = data;

            if (!notificationId) {
                return;
            }

            notificationService.markAsRead(connection.playerId, notificationId);

            ctx.send(connection.ws, {
                type: 'notification_marked_read',
                data: { notificationId },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to mark notification read:', error);
        }
    }

    /**
     * Mark all notifications as read
     */
    static handleMarkAllRead(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            notificationService.markAllAsRead(connection.playerId);

            ctx.send(connection.ws, {
                type: 'notifications_all_read',
                data: { success: true },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to mark all read:', error);
        }
    }

    /**
     * Clear all pending notifications
     */
    static handleClearNotifications(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            notificationService.clearPendingNotifications(connection.playerId);

            ctx.send(connection.ws, {
                type: 'notifications_cleared',
                data: { success: true },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    }

    /**
     * Get notification preferences
     */
    static handleGetNotificationPrefs(connection: PlayerConnection, _data: any, ctx: HandlerContext): void {
        try {
            const prefs = notificationService.getPlayerPrefs(connection.playerId);

            ctx.send(connection.ws, {
                type: 'notification_prefs',
                data: {
                    enabledTypes: Array.from(prefs.enabledTypes),
                    doNotDisturb: prefs.doNotDisturb,
                    mutedUntil: prefs.mutedUntil
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to get notification prefs:', error);
        }
    }

    /**
     * Update notification preferences
     */
    static handleUpdateNotificationPrefs(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { enabledTypes, doNotDisturb, mutedUntil } = data;

            notificationService.updatePlayerPrefs(connection.playerId, {
                enabledTypes,
                doNotDisturb,
                mutedUntil
            });

            ctx.send(connection.ws, {
                type: 'notification_prefs_updated',
                data: { success: true },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to update notification prefs:', error);
        }
    }

    /**
     * Mute a player's notifications
     */
    static handleMutePlayer(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { targetId } = data;

            if (!targetId) {
                return;
            }

            notificationService.mutePlayer(connection.playerId, targetId);

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
     * Unmute a player's notifications
     */
    static handleUnmutePlayer(connection: PlayerConnection, data: any, ctx: HandlerContext): void {
        try {
            const { targetId } = data;

            if (!targetId) {
                return;
            }

            notificationService.unmutePlayer(connection.playerId, targetId);

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
