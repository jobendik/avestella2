// =============================================================================
// NotificationService - Server-Side Push Notifications
// =============================================================================
// Manages server-pushed notifications to clients for important events:
// - Friend activities
// - Gift notifications
// - Achievement unlocks
// - World events
// - System announcements
// =============================================================================

import { EventEmitter } from 'events';

export type NotificationType = 
    | 'friend_online'
    | 'friend_offline'
    | 'friend_request'
    | 'friend_accepted'
    | 'gift_received'
    | 'achievement_unlocked'
    | 'level_up'
    | 'challenge_complete'
    | 'world_event'
    | 'darkness_warning'
    | 'milestone'
    | 'guild_invite'
    | 'guild_message'
    | 'system'
    | 'reward'
    | 'tag_invite'
    | 'whisper'
    | 'connection_made'
    | 'social'
    | 'achievement'
    | 'gift'
    | 'bond';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    icon?: string;
    data?: Record<string, any>;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    timestamp: number;
    expiresAt?: number;
    read: boolean;
    actionUrl?: string;
}

export interface PlayerNotificationPrefs {
    playerId: string;
    enabledTypes: Set<NotificationType>;
    mutedPlayers: Set<string>;
    mutedUntil: number | null;  // Timestamp for temporary mute
    doNotDisturb: boolean;
}

// Default notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; icon: string; priority: Notification['priority'] }> = {
    friend_online: { title: 'Friend Online', icon: '🟢', priority: 'low' },
    friend_offline: { title: 'Friend Offline', icon: '⚫', priority: 'low' },
    friend_request: { title: 'Friend Request', icon: '👋', priority: 'normal' },
    friend_accepted: { title: 'Friend Accepted', icon: '🤝', priority: 'normal' },
    gift_received: { title: 'Gift Received', icon: '🎁', priority: 'normal' },
    achievement_unlocked: { title: 'Achievement Unlocked', icon: '🏆', priority: 'high' },
    level_up: { title: 'Level Up!', icon: '⬆️', priority: 'high' },
    challenge_complete: { title: 'Challenge Complete', icon: '✅', priority: 'normal' },
    world_event: { title: 'World Event', icon: '🌟', priority: 'high' },
    darkness_warning: { title: 'Darkness Approaching', icon: '🌑', priority: 'urgent' },
    milestone: { title: 'Milestone Reached', icon: '🎯', priority: 'normal' },
    guild_invite: { title: 'Guild Invite', icon: '⚔️', priority: 'normal' },
    guild_message: { title: 'Guild Message', icon: '💬', priority: 'low' },
    system: { title: 'System', icon: '📢', priority: 'normal' },
    reward: { title: 'Reward', icon: '💎', priority: 'normal' },
    tag_invite: { title: 'Tag Game', icon: '🏷️', priority: 'normal' },
    whisper: { title: 'Whisper', icon: '💭', priority: 'normal' },
    connection_made: { title: 'Connection Made', icon: '🔗', priority: 'normal' },
    social: { title: 'Social', icon: '👥', priority: 'normal' },
    achievement: { title: 'Achievement', icon: '🏆', priority: 'high' },
    gift: { title: 'Gift', icon: '🎁', priority: 'normal' },
    bond: { title: 'Bond', icon: '💖', priority: 'normal' }
};

export class NotificationService extends EventEmitter {
    private static instance: NotificationService;
    
    // Player notification queues (for offline storage)
    private pendingNotifications: Map<string, Notification[]> = new Map();
    
    // Player preferences
    private playerPrefs: Map<string, PlayerNotificationPrefs> = new Map();
    
    // Connected players (set by WebSocket handler)
    private onlinePlayers: Set<string> = new Set();
    
    private ready = false;
    
    // Limits
    private readonly MAX_PENDING_PER_PLAYER = 50;
    private readonly NOTIFICATION_EXPIRE_HOURS = 24;

    // Singleton
    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    async initialize(): Promise<void> {
        if (this.ready) return;
        
        this.ready = true;
        console.log('🔔 NotificationService initialized');
    }

    isReady(): boolean {
        return this.ready;
    }

    /**
     * Mark a player as online
     */
    setPlayerOnline(playerId: string): void {
        this.onlinePlayers.add(playerId);
        
        // Notify friends of online status
        this.notifyFriendsOfStatus(playerId, true);
    }

    /**
     * Mark a player as offline
     */
    setPlayerOffline(playerId: string): void {
        this.onlinePlayers.delete(playerId);
        
        // Notify friends of offline status
        this.notifyFriendsOfStatus(playerId, false);
    }

    /**
     * Notify friends of online/offline status
     */
    private notifyFriendsOfStatus(playerId: string, isOnline: boolean): void {
        // This will be called with friend list from WebSocket handler
        this.emit('status_change', {
            playerId,
            isOnline
        });
    }

    /**
     * Send notification to a player
     */
    notify(
        playerId: string,
        type: NotificationType,
        message: string,
        data?: Record<string, any>,
        options?: {
            title?: string;
            icon?: string;
            priority?: Notification['priority'];
            expiresIn?: number; // seconds
            actionUrl?: string;
        }
    ): Notification {
        const template = NOTIFICATION_TEMPLATES[type];
        const now = Date.now();
        
        const notification: Notification = {
            id: `notif-${now}-${Math.random().toString(36).substr(2, 6)}`,
            type,
            title: options?.title || template.title,
            message,
            icon: options?.icon || template.icon,
            data,
            priority: options?.priority || template.priority,
            timestamp: now,
            expiresAt: options?.expiresIn ? now + (options.expiresIn * 1000) : undefined,
            read: false,
            actionUrl: options?.actionUrl
        };

        // Check player preferences
        const prefs = this.getPlayerPrefs(playerId);
        if (prefs.doNotDisturb || (prefs.mutedUntil && now < prefs.mutedUntil)) {
            // Store for later but don't send
            this.storePendingNotification(playerId, notification);
            return notification;
        }

        if (!prefs.enabledTypes.has(type)) {
            // Type disabled, don't notify
            return notification;
        }

        // Check if player is online
        if (this.onlinePlayers.has(playerId)) {
            // Emit for WebSocket handler to send
            this.emit('notification', {
                playerId,
                notification: this.serializeNotification(notification)
            });
        } else {
            // Store for when they come online
            this.storePendingNotification(playerId, notification);
        }

        return notification;
    }

    /**
     * Notify multiple players
     */
    notifyMany(
        playerIds: string[],
        type: NotificationType,
        message: string,
        data?: Record<string, any>
    ): void {
        for (const playerId of playerIds) {
            this.notify(playerId, type, message, data);
        }
    }

    /**
     * Broadcast to all online players
     */
    broadcast(
        type: NotificationType,
        message: string,
        data?: Record<string, any>,
        priority: Notification['priority'] = 'normal'
    ): void {
        for (const playerId of this.onlinePlayers) {
            this.notify(playerId, type, message, data, { priority });
        }
    }

    /**
     * Broadcast to all players in a realm
     */
    broadcastToRealm(
        realm: string,
        type: NotificationType,
        message: string,
        data?: Record<string, any>
    ): void {
        this.emit('realm_broadcast', {
            realm,
            notification: {
                type,
                message,
                data,
                timestamp: Date.now()
            }
        });
    }

    /**
     * Store pending notification for offline player
     */
    private storePendingNotification(playerId: string, notification: Notification): void {
        if (!this.pendingNotifications.has(playerId)) {
            this.pendingNotifications.set(playerId, []);
        }

        const pending = this.pendingNotifications.get(playerId)!;
        pending.push(notification);

        // Trim old notifications if too many
        while (pending.length > this.MAX_PENDING_PER_PLAYER) {
            pending.shift();
        }
    }

    /**
     * Get pending notifications for a player (when they come online)
     */
    getPendingNotifications(playerId: string): Notification[] {
        const pending = this.pendingNotifications.get(playerId) || [];
        const now = Date.now();
        const expireCutoff = now - (this.NOTIFICATION_EXPIRE_HOURS * 60 * 60 * 1000);

        // Filter out expired notifications
        const valid = pending.filter(n => {
            if (n.expiresAt && now > n.expiresAt) return false;
            if (n.timestamp < expireCutoff) return false;
            return true;
        });

        return valid;
    }

    /**
     * Clear pending notifications for a player
     */
    clearPendingNotifications(playerId: string): void {
        this.pendingNotifications.delete(playerId);
    }

    /**
     * Mark notification as read
     */
    markAsRead(playerId: string, notificationId: string): void {
        const pending = this.pendingNotifications.get(playerId) || [];
        const notification = pending.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
        }
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead(playerId: string): void {
        const pending = this.pendingNotifications.get(playerId) || [];
        for (const notification of pending) {
            notification.read = true;
        }
    }

    /**
     * Get player notification preferences
     */
    getPlayerPrefs(playerId: string): PlayerNotificationPrefs {
        if (!this.playerPrefs.has(playerId)) {
            // Create default preferences
            const defaultPrefs: PlayerNotificationPrefs = {
                playerId,
                enabledTypes: new Set(Object.keys(NOTIFICATION_TEMPLATES) as NotificationType[]),
                mutedPlayers: new Set(),
                mutedUntil: null,
                doNotDisturb: false
            };
            this.playerPrefs.set(playerId, defaultPrefs);
        }
        return this.playerPrefs.get(playerId)!;
    }

    /**
     * Update player notification preferences
     */
    updatePlayerPrefs(playerId: string, updates: Partial<{
        enabledTypes: NotificationType[];
        doNotDisturb: boolean;
        mutedUntil: number | null;
    }>): void {
        const prefs = this.getPlayerPrefs(playerId);

        if (updates.enabledTypes) {
            prefs.enabledTypes = new Set(updates.enabledTypes);
        }
        if (typeof updates.doNotDisturb === 'boolean') {
            prefs.doNotDisturb = updates.doNotDisturb;
        }
        if (updates.mutedUntil !== undefined) {
            prefs.mutedUntil = updates.mutedUntil;
        }
    }

    /**
     * Mute notifications from a specific player
     */
    mutePlayer(playerId: string, mutedPlayerId: string): void {
        const prefs = this.getPlayerPrefs(playerId);
        prefs.mutedPlayers.add(mutedPlayerId);
    }

    /**
     * Unmute a player
     */
    unmutePlayer(playerId: string, mutedPlayerId: string): void {
        const prefs = this.getPlayerPrefs(playerId);
        prefs.mutedPlayers.delete(mutedPlayerId);
    }

    /**
     * Check if notifications from a player are muted
     */
    isPlayerMuted(playerId: string, fromPlayerId: string): boolean {
        const prefs = this.getPlayerPrefs(playerId);
        return prefs.mutedPlayers.has(fromPlayerId);
    }

    /**
     * Serialize notification for network transmission
     */
    private serializeNotification(notification: Notification): any {
        return {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            icon: notification.icon,
            data: notification.data,
            priority: notification.priority,
            timestamp: notification.timestamp,
            expiresAt: notification.expiresAt,
            read: notification.read,
            actionUrl: notification.actionUrl
        };
    }

    /**
     * ===== Convenience methods for common notifications =====
     */

    notifyFriendOnline(playerId: string, friendId: string, friendName: string): void {
        this.notify(playerId, 'friend_online', `${friendName} is now online!`, {
            friendId,
            friendName
        });
    }

    notifyFriendRequest(playerId: string, fromId: string, fromName: string): void {
        this.notify(playerId, 'friend_request', `${fromName} sent you a friend request`, {
            fromId,
            fromName
        }, { priority: 'normal' });
    }

    notifyGiftReceived(playerId: string, fromId: string, fromName: string, giftType: string): void {
        this.notify(playerId, 'gift_received', `${fromName} sent you a ${giftType}!`, {
            fromId,
            fromName,
            giftType
        });
    }

    notifyAchievementUnlocked(playerId: string, achievementId: string, achievementName: string): void {
        this.notify(playerId, 'achievement_unlocked', `You unlocked: ${achievementName}`, {
            achievementId,
            achievementName
        }, { priority: 'high' });
    }

    notifyLevelUp(playerId: string, newLevel: number): void {
        this.notify(playerId, 'level_up', `You reached level ${newLevel}!`, {
            newLevel
        }, { priority: 'high' });
    }

    notifyChallengeComplete(playerId: string, challengeId: string, reward: number): void {
        this.notify(playerId, 'challenge_complete', `Challenge complete! +${reward} Stardust`, {
            challengeId,
            reward
        });
    }

    notifyWorldEvent(playerId: string, eventName: string, eventType: string): void {
        this.notify(playerId, 'world_event', `${eventName} is happening now!`, {
            eventType
        }, { priority: 'high' });
    }

    notifyDarkness(playerId: string, realm: string, timeUntil: number): void {
        this.notify(playerId, 'darkness_warning', `Darkness approaching in ${timeUntil} seconds!`, {
            realm,
            timeUntil
        }, { priority: 'urgent' });
    }

    notifyConnectionMade(playerId: string, otherPlayerId: string, otherPlayerName: string): void {
        this.notify(playerId, 'connection_made', `You connected with ${otherPlayerName}!`, {
            otherPlayerId,
            otherPlayerName
        });
    }

    /**
     * Shutdown service
     */
    shutdown(): void {
        this.pendingNotifications.clear();
        this.playerPrefs.clear();
        this.onlinePlayers.clear();
        this.ready = false;
        console.log('🔔 NotificationService shut down');
    }
}

// Export singleton
export const notificationService = NotificationService.getInstance();
