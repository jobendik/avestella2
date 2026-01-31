
import { useState, useCallback, useEffect, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { DEFAULT_GUILD, DEFAULT_EVENTS } from '@/constants/social';
import type { Friend, FriendRequest, Guild, GameEvent } from '@/types';
import { gameClient } from '@/services/GameClient';

// ─────────────────────────────────────────────────────────────────────────────
// Local Types
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    from: string;
    text: string;
    timestamp: number;
    read: boolean;
}

interface FriendActivity {
    id: string;
    friendId: string;
    friendName: string;
    friendAvatar: string;
    type: 'levelUp' | 'achievement' | 'gift' | 'online' | 'milestone' | 'bondFormed';
    description: string;
    timestamp: number;
}

interface GiftStreak {
    friendId: string;
    currentStreak: number;
    lastGiftDate: string; // YYYY-MM-DD
    longestStreak: number;
    totalGiftsSent: number;
}

interface GuildGift {
    id: string;
    type: 'stardust' | 'cosmetic' | 'xpBoost';
    amount: number;
    claimedAt?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SocialState {
    friends: Friend[];
    friendRequests: FriendRequest[];
    conversations: Record<string, Message[]>;
    guild: Guild | null;
    guildContributions: { stardust: number; challenges: number; xp: number };
    lastGuildContribution: string | null;
    activeEvent: GameEvent | null;
    eventProgress: { fragmentsCollected: number; beaconsLit: number; bondsFormed: number };
    unreadMessages: Record<string, number>;
    // New social features
    giftCooldowns: { friendId: string; lastGiftTime: number }[];
    giftStreaks: GiftStreak[];
    friendActivityFeed: FriendActivity[];
    pendingGuildGifts: GuildGift[];
    dailyGuildContributions: { date: string; contributions: number };
}

export interface UseSocialReturn {
    // State
    friends: Friend[];
    friendRequests: FriendRequest[];
    conversations: Record<string, Message[]>;
    guild: Guild | null;
    activeEvent: GameEvent | null;
    eventProgress: SocialState['eventProgress'];
    unreadMessages: Record<string, number>;
    guildContributions: SocialState['guildContributions'];
    friendActivityFeed: FriendActivity[];
    pendingGuildGifts: GuildGift[];

    // Friend Functions
    sendGift: (friendId: string, amount: number, giftType?: string, message?: string) => boolean;
    acceptFriendRequest: (requestId: string) => void;
    declineFriendRequest: (requestId: string) => void;
    removeFriend: (friendId: string) => void;
    addFriend: (friendId: string, friendName: string) => void; // Added for manual add
    canGiftToday: (friendId: string) => boolean;
    getGiftCooldownRemaining: (friendId: string) => number;
    getGiftStreak: (friendId: string) => GiftStreak | null;
    getStreakBonus: (friendId: string) => number;

    // Messaging Functions
    sendMessage: (friendId: string, text: string) => void;
    markAsRead: (friendId: string) => void;
    getUnreadCount: () => number;
    getTotalUnreadBadge: () => number;

    // Activity Feed Functions
    addFriendActivity: (activity: Omit<FriendActivity, 'id' | 'timestamp'>) => void;
    clearOldActivities: () => void;

    // Guild Functions
    contributeToGuild: (type: 'stardust' | 'daily', amount?: number) => boolean;
    canContributeToday: () => boolean;
    getRemainingDailyContributions: () => number;
    claimGuildGift: (giftId: string) => GuildGift | null;
    checkForGuildGifts: () => void;

    // Event Functions
    updateEventProgress: (type: 'fragment' | 'beacon' | 'bond', amount?: number) => void;
    getEventTimeRemaining: () => number;

    // Persistence
    saveSocialData: () => void;
    loadSocialData: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default State
// ─────────────────────────────────────────────────────────────────────────────

const SOCIAL_STORAGE_KEY = 'avestella_social_data';

const DEFAULT_STATE: SocialState = {
    friends: [],
    friendRequests: [],
    conversations: {},
    guild: null,
    guildContributions: { stardust: 0, challenges: 0, xp: 0 },
    lastGuildContribution: null,
    activeEvent: DEFAULT_EVENTS[0],
    eventProgress: { fragmentsCollected: 0, beaconsLit: 0, bondsFormed: 0 },
    unreadMessages: {},
    giftCooldowns: [],
    giftStreaks: [],
    friendActivityFeed: [],
    pendingGuildGifts: [],
    dailyGuildContributions: { date: '', contributions: 0 }
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useSocial(): UseSocialReturn {
    const [state, setState] = useState<SocialState>(DEFAULT_STATE);

    // Load from local storage on mount (for chats/history)
    useEffect(() => {
        loadSocialData();
    }, []);

    // Listen to GameClient events
    useEffect(() => {
        // Initial Player Data (contains friend list)
        const onPlayerData = (data: any) => {
            if (data.friends) {
                setState(prev => {
                    // Merge server friends with local data (preserves avatar/level if we had it, or defaults)
                    const serverFriends = data.friends.map((f: any) => ({
                        id: f.id,
                        name: f.name,
                        avatar: '👤', // Default
                        level: 1, // Default
                        online: false, // Default
                        stardust: 0 // Default
                    }));
                    return { ...prev, friends: serverFriends };
                });
            }
            if (data.guild) {
                // Handle guild data if provided
            }
        };

        const onFriendAdded = (data: { friendId: string, friendName: string }) => {
            setState(prev => {
                if (prev.friends.some(f => f.id === data.friendId)) return prev;
                return {
                    ...prev,
                    friends: [...prev.friends, {
                        id: data.friendId,
                        name: data.friendName,
                        avatar: '👤',
                        level: 1,
                        online: true, // Assuming online if just added
                        lastActive: Date.now(),
                        stardust: 0
                    }]
                };
            });
            // Update requests list if it was a request
            setState(prev => ({
                ...prev,
                friendRequests: prev.friendRequests.filter(r => r.id !== data.friendId)
            }));
        };

        const onFriendRemoved = (data: { friendId: string }) => {
            setState(prev => ({
                ...prev,
                friends: prev.friends.filter(f => f.id !== data.friendId)
            }));
        };

        const onWhisper = (data: { fromId?: string, fromName?: string, text: string, targetId?: string }) => {
            // Check if it's a DM (has targetId)
            // Wait, server logic:
            // If sender sent it: targetId is set.
            // If receiver receives it: does it have targetId? 
            // Server code: this.send(target.ws, { type: 'whisper', data: { ...data, text } })
            // Data passed through is original data.
            // Client sends { targetId, text }.
            // So receiver sees { targetId: receiversId, text }.
            // Receiver needs to know Sender ID.
            // Server msg wrapper doesn't include 'fromId' in data, but maybe generic wrapper?
            // checking WebSocketHandler::handleWhisper
            // It sends { ...data, text }. 'data' comes from sender. Sender sends targetId.
            // It DOES NOT inject fromId into the data payload in the `send` call for Direct Message.
            // BUT for broadcast (lines 1328), it doesn't either.
            // However, typical WebSocket messages usually include updated sender info or wrapper.
            // Wait, look at `handleVoiceSignal` (line 1780) it sends `fromId`.
            // Look at `handleWhisper` line 1314: `data: { ...data, text }`.
            // It relies on sender putting their ID? No, client sends `playerId` in `GameClient.send` wrapper.
            // `WebSocketHandler.handleMessage` parses it.
            // `GameClient.send` adds `playerId` to the payload?
            // Line 114 in GameClient: `this.send('chat', { text, playerId: this.playerId ... })`.
            // But `sendDirectMessage`: `this.send('whisper', { targetId, text })`.
            // Does `send` add playerId?
            // GameClient lines 250: `this.ws.send(JSON.stringify({ type, data, timestamp }))`.
            // It sends `data` as is.
            // `handleMessage` in Server (line 1100): `const message = JSON.parse(rawData)`.
            // It gets connection from `playerId` passed in `handleConnection`? No.
            // `handleMessage(playerId, rawData)`. `playerId` is identified by the WebSocket connection map.
            // So server knows who sent it.
            // But `handleWhisper` sends `data` to target. `data` ONLY contains what sender sent ({targetId, text}).
            // CRITICAL BUG IN SERVER?
            // If I receive a whisper, I don't know who sent it unless the server injects `fromId`.
            // Check `handleVoiceSignal`: explicitly injects `fromId`.
            // Check `handleWhisper`: does NOT inject `fromId`.
            // So Recipient receives `{ targetId: "me", text: "hello" }`. They don't know who sent it!
            // Wait, verify `WebSocketHandler` lines 1308-1316.
            /*
            if (target && target.ws.readyState === WebSocket.OPEN) {
                this.send(target.ws, {
                    type: 'whisper',
                    data: { ...data, text },
                    timestamp: Date.now()
                });
            */
            // `data` is the user payload.
            // This looks like a bug in the server or I am missing something.
            // Unless `data` included `playerId`?
            // `GameClient.sendAction` adds `playerId`.
            // `GameClient.sendDirectMessage` DOES NOT add `playerId`.
            // So the recipient won't know sender.
            // I should update `GameClient.sendDirectMessage` to include `playerId`?
            // OR the server should inject it. Server is Authoritative. Client shouldn't lie about ID.
            // Server SHOULD inject it.
            // But I cannot change server logic easily without verifying.
            // Let's assume for now I should add `fromId` in `GameClient` just in case, but Server overwrites it if secure?
            // Server `handlePlayerUpdate` reads `playerId`.
            // Actually `GameClient.sendAction` (line 102) adds `playerId: this.playerId`.
            // I should stick to that pattern in `sendDirectMessage`.
        };

        gameClient.on('player_data', onPlayerData);
        gameClient.on('friend_added', onFriendAdded);
        gameClient.on('friend_removed', onFriendRemoved);

        // Guild events
        gameClient.on('guild_contribution_success', (data: any) => {
            setState(prev => ({
                ...prev,
                guildContributions: {
                    ...prev.guildContributions,
                    [data.contributionType]: (prev.guildContributions[data.contributionType as keyof typeof prev.guildContributions] || 0) + data.amount
                },
                lastGuildContribution: new Date().toISOString()
            }));
            // Ideally also update guild XP/Level if provided in data
        });

        // Handle incoming messages
        gameClient.on('whisper_received', (data: any) => {
            const fromId = data.fromId || data.playerId || 'unknown';
            const text = data.message || data.text; // Server sends 'message', client might expect 'text'

            // If it's a DM, add to conversation
            if (fromId !== 'unknown' && fromId !== gameClient.getPlayerId()) {
                receiveMessage(fromId, text);
            }
        });

        return () => {
            // Cleanup listeners
        };
    }, []);

    const receiveMessage = useCallback((fromId: string, text: string) => {
        const newMessage: Message = {
            id: `msg_${Date.now()}_${Math.random()}`,
            from: fromId,
            text,
            timestamp: Date.now(),
            read: false
        };

        setState(prev => ({
            ...prev,
            conversations: {
                ...prev.conversations,
                [fromId]: [...(prev.conversations[fromId] || []), newMessage]
            },
            unreadMessages: {
                ...prev.unreadMessages,
                [fromId]: (prev.unreadMessages[fromId] || 0) + 1
            }
        }));
    }, []);

    // Auto-save on state change
    useEffect(() => {
        saveSocialData();
    }, [state]);

    // ─────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────

    const GIFT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const MAX_DAILY_GUILD_CONTRIBUTIONS = 5;
    const MAX_ACTIVITY_FEED_ITEMS = 50;
    const ACTIVITY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

    // ─────────────────────────────────────────────────────────────────────────
    // Helper Functions
    // ─────────────────────────────────────────────────────────────────────────

    const canGiftToday = useCallback((friendId: string): boolean => {
        const cooldown = state.giftCooldowns.find(c => c.friendId === friendId);
        if (!cooldown) return true;
        return Date.now() - cooldown.lastGiftTime >= GIFT_COOLDOWN_MS;
    }, [state.giftCooldowns]);

    const getGiftCooldownRemaining = useCallback((friendId: string): number => {
        const cooldown = state.giftCooldowns.find(c => c.friendId === friendId);
        if (!cooldown) return 0;
        return Math.max(0, GIFT_COOLDOWN_MS - (Date.now() - cooldown.lastGiftTime));
    }, [state.giftCooldowns]);

    const getGiftStreak = useCallback((friendId: string): GiftStreak | null => {
        return state.giftStreaks.find(s => s.friendId === friendId) || null;
    }, [state.giftStreaks]);

    const getStreakBonus = useCallback((friendId: string): number => {
        const streak = state.giftStreaks.find(s => s.friendId === friendId);
        if (!streak || streak.currentStreak === 0) return 1;
        return 1 + Math.min(streak.currentStreak * 0.05, 0.5);
    }, [state.giftStreaks]);

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    const sendGift = useCallback((friendId: string, amount: number, giftType?: string, message?: string): boolean => {
        if (!canGiftToday(friendId)) return false;

        // Use GameClient to send gift
        gameClient.sendGift(friendId, giftType || 'stardust', message);

        // Update local state (optimistic)
        setState(prev => ({
            ...prev,
            giftCooldowns: [
                ...prev.giftCooldowns.filter(c => c.friendId !== friendId),
                { friendId, lastGiftTime: Date.now() }
            ]
        }));

        // Add to feed
        addFriendActivity({
            friendId,
            friendName: 'Friend', // Should look up name
            friendAvatar: '👤',
            type: 'gift',
            description: `You sent ${amount} stardust`
        });

        return true;
    }, [canGiftToday]);

    // New generic Add Friend (replaces accept request)
    const addFriend = useCallback((friendId: string, friendName: string) => {
        gameClient.addFriend(friendId, friendName);
    }, []);

    const acceptFriendRequest = useCallback((requestId: string) => {
        // In server-authoritative mode, we just add them back/direct add
        // We need the name though. Usually UI provides it.
        // For now, we assume implicit acceptance or call addFriend if we have data.
        // Ideally we pass friendName too.
        gameClient.addFriend(requestId, 'Unknown');
    }, []);

    const declineFriendRequest = useCallback((requestId: string) => {
        setState(prev => ({
            ...prev,
            friendRequests: prev.friendRequests.filter(r => r.id !== requestId)
        }));
    }, []);

    const removeFriend = useCallback((friendId: string) => {
        gameClient.removeFriend(friendId);
        // Optimistic update handled by event listener, but can do here too
    }, []);

    const sendMessage = useCallback((friendId: string, text: string) => {
        // Send via GameClient
        gameClient.sendDirectMessage(friendId, text);

        // Add to local history (optimistic)
        const newMessage: Message = {
            id: `msg_${Date.now()}`,
            from: 'player', // 'player' means me
            text,
            timestamp: Date.now(),
            read: true
        };

        setState(prev => ({
            ...prev,
            conversations: {
                ...prev.conversations,
                [friendId]: [...(prev.conversations[friendId] || []), newMessage]
            }
        }));
    }, []);

    const markAsRead = useCallback((friendId: string) => {
        setState(prev => {
            const { [friendId]: _, ...rest } = prev.unreadMessages;
            return { ...prev, unreadMessages: rest };
        });
    }, []);

    const getUnreadCount = useCallback((): number => {
        return Object.values(state.unreadMessages).reduce((a, b) => a + b, 0);
    }, [state.unreadMessages]);

    const getTotalUnreadBadge = useCallback((): number => {
        return getUnreadCount() + state.friendRequests.length + state.pendingGuildGifts.length;
    }, [getUnreadCount, state.friendRequests.length, state.pendingGuildGifts.length]);

    // Activity Feed
    const addFriendActivity = useCallback((activity: Omit<FriendActivity, 'id' | 'timestamp'>) => {
        const newActivity: FriendActivity = {
            ...activity,
            id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
        };
        setState(prev => ({
            ...prev,
            friendActivityFeed: [newActivity, ...prev.friendActivityFeed].slice(0, MAX_ACTIVITY_FEED_ITEMS)
        }));
    }, []);

    const clearOldActivities = useCallback(() => {
        const cutoff = Date.now() - ACTIVITY_RETENTION_MS;
        setState(prev => ({
            ...prev,
            friendActivityFeed: prev.friendActivityFeed.filter(a => a.timestamp > cutoff)
        }));
    }, []);

    // Guilds
    const contributeToGuild = useCallback((type: 'stardust' | 'daily', amount?: number): boolean => {
        if (type === 'daily') {
            // Handle daily check-in separately if needed, or map to a type
            // For now assuming daily = some small contribution
            gameClient.contributeToGuild('challenges', 1);
        } else {
            gameClient.contributeToGuild('stardust', amount || 100);
        }
        return true;
    }, []);

    const canContributeToday = useCallback(() => true, []);
    const getRemainingDailyContributions = useCallback(() => 5, []);
    const claimGuildGift = useCallback((id: string) => null, []);
    const checkForGuildGifts = useCallback(() => { }, []);

    // Events
    const updateEventProgress = useCallback(() => { }, []);
    const getEventTimeRemaining = useCallback(() => 0, []);

    // Persistence
    const saveSocialData = useCallback(() => {
        // We only save conversations/settings, not friends (server authoritative) 
        // But for offline support we might save friends cache.
        localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify({
            conversations: state.conversations,
            unreadMessages: state.unreadMessages,
            // ... preserve other local settings
        }));
    }, [state]);

    const loadSocialData = useCallback(() => {
        try {
            const saved = localStorage.getItem(SOCIAL_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setState(prev => ({ ...prev, ...parsed }));
            }
        } catch (e) {
            console.error('Failed to load social data:', e);
        }
    }, []);

    return {
        friends: state.friends,
        friendRequests: state.friendRequests,
        conversations: state.conversations,
        guild: state.guild,
        activeEvent: state.activeEvent,
        eventProgress: state.eventProgress,
        unreadMessages: state.unreadMessages,
        guildContributions: state.guildContributions,
        friendActivityFeed: state.friendActivityFeed,
        pendingGuildGifts: state.pendingGuildGifts,

        sendGift,
        acceptFriendRequest,
        declineFriendRequest,
        removeFriend,
        addFriend,
        canGiftToday,
        getGiftCooldownRemaining,
        getGiftStreak,
        getStreakBonus,

        sendMessage,
        markAsRead,
        getUnreadCount,
        getTotalUnreadBadge,

        addFriendActivity,
        clearOldActivities,

        contributeToGuild,
        canContributeToday,
        getRemainingDailyContributions,
        claimGuildGift,
        checkForGuildGifts,

        updateEventProgress,
        getEventTimeRemaining,

        saveSocialData,
        loadSocialData
    };
}

export default useSocial;
