// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Server-Connected Progression Hook
// ═══════════════════════════════════════════════════════════════════════════
// This hook connects to the backend for persistent progression data
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { gameClient } from '../services/GameClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ServerChallenge {
    id: string;
    type: string;
    description: string;
    progress: number;
    target: number;
    reward: { stardust: number; xp: number };
    completed: boolean;
    claimed: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface ServerProgression {
    playerId: string;
    stardust: number;
    seasonXp: number;
    seasonLevel: number;
    seasonTier: number;
    dailyLoginStreak: number;
    lastDailyClaimDate: string | null;
    lifetimeStardust: number;
    lifetimeChallengesCompleted: number;
}

export interface ServerGift {
    id: string;
    fromPlayerId: string;
    fromName?: string;
    giftType: string;
    message?: string;
    value: number;
    createdAt: Date;
}

export interface ServerGuild {
    id: string;
    name: string;
    description?: string;
    leaderId: string;
    members: string[];
    xp: number;
    level: number;
    emblem?: string;
}

export interface ActivityFeedItem {
    id: string;
    playerId: string;
    playerName?: string;
    type: 'achievement' | 'level_up' | 'gift' | 'guild' | 'challenge' | 'reward';
    message: string;
    timestamp: Date;
}

export interface UseServerProgressionReturn {
    // Connection state
    connected: boolean;
    loading: boolean;
    error: string | null;

    // Progression
    progression: ServerProgression | null;

    // Challenges
    dailyChallenges: ServerChallenge[];
    weeklyChallenges: ServerChallenge[];
    updateChallengeProgress: (challengeId: string, progress: number) => void;

    // Daily Rewards
    claimDailyReward: () => void;
    canClaimDaily: boolean;

    // Gifts
    pendingGifts: ServerGift[];
    sendGift: (toPlayerId: string, giftType: string, message?: string) => void;
    claimGift: (giftId: string) => void;

    // Guilds
    guild: ServerGuild | null;
    availableGuilds: ServerGuild[];
    createGuild: (name: string, description?: string) => void;
    joinGuild: (guildId: string) => void;
    leaveGuild: () => void;
    refreshGuilds: () => void;

    // Activity Feed
    activityFeed: ActivityFeedItem[];

    // Sync
    requestSync: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useServerProgression(): UseServerProgressionReturn {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [progression, setProgression] = useState<ServerProgression | null>(null);
    const [dailyChallenges, setDailyChallenges] = useState<ServerChallenge[]>([]);
    const [weeklyChallenges, setWeeklyChallenges] = useState<ServerChallenge[]>([]);
    const [pendingGifts, setPendingGifts] = useState<ServerGift[]>([]);
    const [guild, setGuild] = useState<ServerGuild | null>(null);
    const [availableGuilds, setAvailableGuilds] = useState<ServerGuild[]>([]);
    const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);

    const guildIdRef = useRef<string | null>(null);

    // Calculate if can claim daily
    const canClaimDaily = progression?.lastDailyClaimDate
        ? new Date(progression.lastDailyClaimDate).toDateString() !== new Date().toDateString()
        : true;

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const handleConnected = () => {
            setConnected(true);
            setError(null);
            // Request full progression data on connect
            gameClient.requestProgression();
        };

        const handleDisconnected = () => {
            setConnected(false);
        };

        const handleProgressionData = (data: any) => {
            setLoading(false);
            if (data.progression) setProgression(data.progression);
            if (data.dailyChallenges) setDailyChallenges(data.dailyChallenges);
            if (data.weeklyChallenges) setWeeklyChallenges(data.weeklyChallenges);
            if (data.pendingGifts) setPendingGifts(data.pendingGifts);
            if (data.feed) setActivityFeed(data.feed);
        };

        const handleProgressionUpdate = (data: any) => {
            setProgression(data);
        };

        const handleChallengesUpdate = (data: any) => {
            if (data.dailyChallenges) setDailyChallenges(data.dailyChallenges);
            if (data.weeklyChallenges) setWeeklyChallenges(data.weeklyChallenges);
        };

        const handleDailyRewardResult = (data: any) => {
            if (data.success && data.progression) {
                setProgression(data.progression);
            } else if (data.error) {
                setError(data.error);
            }
        };

        const handleGiftReceived = (data: any) => {
            // Show notification or update pending gifts count
            gameClient.requestProgression(); // Refresh all data
        };

        const handleGiftsUpdate = (data: any) => {
            if (data.pendingGifts) setPendingGifts(data.pendingGifts);
        };

        const handleGuildCreated = (data: any) => {
            setGuild(data);
            guildIdRef.current = data.id;
        };

        const handleGuildJoined = (data: any) => {
            setGuild(data);
            guildIdRef.current = data.id;
        };

        const handleGuildLeft = () => {
            setGuild(null);
            guildIdRef.current = null;
        };

        const handleGuildsList = (data: any) => {
            setAvailableGuilds(data);
        };

        const handleGuildError = (data: any) => {
            setError(data.error);
        };

        // Subscribe to events
        gameClient.on('connected', handleConnected);
        gameClient.on('disconnected', handleDisconnected);
        gameClient.on('progression_data', handleProgressionData);
        gameClient.on('progression_update', handleProgressionUpdate);
        gameClient.on('challenges_update', handleChallengesUpdate);
        gameClient.on('daily_reward_result', handleDailyRewardResult);
        gameClient.on('gift_received', handleGiftReceived);
        gameClient.on('gifts_update', handleGiftsUpdate);
        gameClient.on('guild_created', handleGuildCreated);
        gameClient.on('guild_joined', handleGuildJoined);
        gameClient.on('guild_left', handleGuildLeft);
        gameClient.on('guilds_list', handleGuildsList);
        gameClient.on('guild_error', handleGuildError);

        return () => {
            gameClient.off('connected', handleConnected);
            gameClient.off('disconnected', handleDisconnected);
            gameClient.off('progression_data', handleProgressionData);
            gameClient.off('progression_update', handleProgressionUpdate);
            gameClient.off('challenges_update', handleChallengesUpdate);
            gameClient.off('daily_reward_result', handleDailyRewardResult);
            gameClient.off('gift_received', handleGiftReceived);
            gameClient.off('gifts_update', handleGiftsUpdate);
            gameClient.off('guild_created', handleGuildCreated);
            gameClient.off('guild_joined', handleGuildJoined);
            gameClient.off('guild_left', handleGuildLeft);
            gameClient.off('guilds_list', handleGuildsList);
            gameClient.off('guild_error', handleGuildError);
        };
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    const updateChallengeProgress = useCallback((challengeId: string, progress: number) => {
        gameClient.updateChallengeProgress(challengeId, progress);
    }, []);

    const claimDailyReward = useCallback(() => {
        gameClient.claimDailyReward();
    }, []);

    const sendGift = useCallback((toPlayerId: string, giftType: string, message?: string) => {
        gameClient.sendGift(toPlayerId, giftType, message);
    }, []);

    const claimGift = useCallback((giftId: string) => {
        gameClient.claimGift(giftId);
    }, []);

    const createGuild = useCallback((name: string, description?: string) => {
        gameClient.createGuild(name, description);
    }, []);

    const joinGuild = useCallback((guildId: string) => {
        gameClient.joinGuild(guildId);
    }, []);

    const leaveGuild = useCallback(() => {
        if (guildIdRef.current) {
            gameClient.leaveGuild(guildIdRef.current);
        }
    }, []);

    const refreshGuilds = useCallback(() => {
        gameClient.listGuilds();
    }, []);

    const requestSync = useCallback(() => {
        setLoading(true);
        gameClient.requestProgression();
    }, []);

    return {
        connected,
        loading,
        error,
        progression,
        dailyChallenges,
        weeklyChallenges,
        updateChallengeProgress,
        claimDailyReward,
        canClaimDaily,
        pendingGifts,
        sendGift,
        claimGift,
        guild,
        availableGuilds,
        createGuild,
        joinGuild,
        leaveGuild,
        refreshGuilds,
        activityFeed,
        requestSync
    };
}

export default useServerProgression;
