// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Server Sync Hook
// ═══════════════════════════════════════════════════════════════════════════
// Master hook for syncing ALL player data with the server
// Replaces localStorage with MongoDB persistence via WebSocket
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    FullPlayerData,
    DailyChallengesState,
    WeeklyChallengesState,
    PlayerStats,
    PlayerSettings,
    PlayerCosmetics,
    PlayerCompanions,
    PlayerExploration,
    PlayerQuests,
    PlayerAnchoring,
    PlayerGameState,
    DailyLoginResult
} from '../types';
import { gameClient } from '../services/GameClient';



// FullPlayerData is imported from '../types'
// DailyLoginResult is imported from '../types'

export interface UseServerSyncReturn {
    // Connection state
    isConnected: boolean;
    loading: boolean;
    synced: boolean;
    error: string | null;

    // Full data
    playerData: FullPlayerData | null;
    dailyChallenges: DailyChallengesState | null;
    weeklyChallenges: WeeklyChallengesState | null;

    // Quick accessors
    playerId: string;
    name: string;
    xp: number;
    level: number;
    stardust: number;
    stats: PlayerStats | null;
    settings: PlayerSettings | null;
    achievements: string[];

    // Core actions
    requestFullSync: () => void;

    // Progression updates
    addXp: (amount: number) => void;
    addStardust: (amount: number) => void;
    setLevel: (level: number) => void;

    // Settings
    updateSettings: (settings: Partial<PlayerSettings>) => void;

    // Cosmetics
    updateCosmetics: (cosmetics: Partial<PlayerCosmetics>) => void;
    purchaseCosmetic: (id: string, price: number) => void;

    // Companions
    updateCompanions: (companions: Partial<PlayerCompanions>) => void;

    // Exploration
    updateExploration: (exploration: Partial<PlayerExploration>) => void;
    addDiscovery: (id: string, type: string) => void;

    // Quests
    updateQuestProgress: (questId: string, progress: number) => void;
    completeQuest: (questId: string) => void;

    // Stats
    trackStat: (stat: keyof PlayerStats, amount?: number) => void;

    // Achievements
    unlockAchievement: (achievementId: string) => void;
    hasAchievement: (achievementId: string) => boolean;

    // Daily Login
    processDailyLogin: () => void;
    lastDailyLoginResult: DailyLoginResult | null;

    // Anchoring
    addAnchoringSession: (type: string, duration: number) => void;

    // Game State
    updateGameState: (state: Partial<PlayerGameState>) => void;
    addBond: (targetId: string, strength: number, type: string) => void;
    addStarMemory: (starId: string, memory: string) => void;

    // Challenge Actions
    claimChallengeReward: (challengeId: string) => void;
    rerollChallenge: (challengeId: string) => void;
    updateChallengeProgress: (type: string, amount?: number) => void;

    // New helpers
    getQuestProgress: (id: string) => number;
}

// Type aliases for convenience
export type SyncedPlayerData = FullPlayerData;
export type ServerSyncActions = Pick<UseServerSyncReturn,
    'requestFullSync' | 'addXp' | 'addStardust' | 'setLevel' | 'updateSettings' |
    'updateCosmetics' | 'purchaseCosmetic' | 'updateCompanions' | 'updateExploration' |
    'addDiscovery' | 'updateQuestProgress' | 'completeQuest' | 'trackStat' |
    'unlockAchievement' | 'processDailyLogin' | 'addAnchoringSession' | 'updateGameState' |
    'addBond' | 'addStarMemory' | 'claimChallengeReward' | 'rerollChallenge' | 'updateChallengeProgress'
>;

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useServerSync(playerId: string): UseServerSyncReturn {
    const [isConnected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [synced, setSynced] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playerData, setPlayerData] = useState<FullPlayerData | null>(null);
    const [dailyChallenges, setDailyChallenges] = useState<DailyChallengesState | null>(null);
    const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallengesState | null>(null);
    const [lastDailyLoginResult, setLastDailyLoginResult] = useState<DailyLoginResult | null>(null);

    const syncQueueRef = useRef<any[]>([]);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ─────────────────────────────────────────────────────────────────────────
    // Batched sync to reduce network calls
    // ─────────────────────────────────────────────────────────────────────────

    const flushSyncQueue = useCallback(() => {
        if (syncQueueRef.current.length === 0) return;

        const updates = syncQueueRef.current.reduce((acc, update) => {
            return { ...acc, ...update };
        }, {});

        gameClient.syncPlayerData(updates);
        syncQueueRef.current = [];
    }, []);

    const queueSync = useCallback((update: any) => {
        syncQueueRef.current.push(update);

        // Debounce sync calls
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(flushSyncQueue, 100);
    }, [flushSyncQueue]);

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const handleConnect = () => {
            setConnected(true);
            setError(null);
            // Request full player data on connect
            gameClient.requestPlayerData();
        };

        const handleDisconnect = () => {
            setConnected(false);
            setSynced(false);
        };

        const handlePlayerData = (data: FullPlayerData) => {
            setPlayerData(data);
            setLoading(false);
            setSynced(true);
        };

        const handleSyncData = () => {
            setSynced(true);
        };

        const handleProgressionData = (data: any) => {
            if (!data) return;

            // Update progression part of playerData
            if (data.progression) {
                setPlayerData(prev => prev ? ({ ...prev, ...data.progression }) : null);
            }

            if (data.dailyChallenges) {
                setDailyChallenges(data.dailyChallenges);
            }

            if (data.weeklyChallenges) {
                setWeeklyChallenges(data.weeklyChallenges);
            }
            setLoading(false);
        };

        const handleChallengeRewardClaimed = (data: any) => {
            const { challengeId, reward } = data;
            // Optimistic update handled by progression sync usually, 
            // but we can show a toast or duplicate logic here if needed.
            // For now, relies on subsequent progression_data or challenges_update.
        };

        const handleChallengesUpdate = (data: any) => {
            if (data.dailyChallenges) setDailyChallenges(data.dailyChallenges);
            if (data.weeklyChallenges) setWeeklyChallenges(data.weeklyChallenges);
        };

        const handleDailyLoginResult = (result: DailyLoginResult) => {
            setLastDailyLoginResult(result);
            if (result.isNewDay) {
                // Update local state with new values
                setPlayerData(prev => prev ? {
                    ...prev,
                    dailyLoginStreak: result.streak,
                    stardust: prev.stardust + result.rewards.stardust,
                    xp: prev.xp + result.rewards.xp
                } : null);
            }
        };

        // Subscribe to events
        gameClient.on('connect', handleConnect);
        gameClient.on('disconnect', handleDisconnect);
        gameClient.on('player_data', handlePlayerData);
        gameClient.on('sync_player_data', handleSyncData);
        gameClient.on('progression_data', handleProgressionData);
        gameClient.on('challenges_update', handleChallengesUpdate);
        gameClient.on('challenge_reward_claimed', handleChallengeRewardClaimed);
        gameClient.on('challenge_rerolled', handleChallengesUpdate); // Reroll sends challenge_rerolled but might also trigger requests
        gameClient.on('daily_login_result', handleDailyLoginResult);

        return () => {
            gameClient.off('connect', handleConnect);
            gameClient.off('disconnect', handleDisconnect);
            gameClient.off('player_data', handlePlayerData);
            gameClient.off('sync_player_data', handleSyncData);
            gameClient.off('progression_data', handleProgressionData);
            gameClient.off('challenges_update', handleChallengesUpdate);
            gameClient.off('challenge_reward_claimed', handleChallengeRewardClaimed);
            gameClient.off('challenge_rerolled', handleChallengesUpdate);
            gameClient.off('daily_login_result', handleDailyLoginResult);

            // Flush any pending syncs
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                flushSyncQueue();
            }
        };
    }, [flushSyncQueue]);

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    const requestFullSync = useCallback(() => {
        setLoading(true);
        gameClient.requestPlayerData();
    }, []);

    const addXp = useCallback((amount: number) => {
        setPlayerData(prev => prev ? { ...prev, xp: prev.xp + amount } : null);
        queueSync({ xp: (playerData?.xp || 0) + amount });
    }, [playerData?.xp, queueSync]);

    const addStardust = useCallback((amount: number) => {
        setPlayerData(prev => prev ? {
            ...prev,
            stardust: prev.stardust + amount,
            lifetimeStardust: prev.lifetimeStardust + Math.max(0, amount)
        } : null);
        queueSync({
            stardust: (playerData?.stardust || 0) + amount,
            lifetimeStardust: (playerData?.lifetimeStardust || 0) + Math.max(0, amount)
        });
    }, [playerData?.stardust, playerData?.lifetimeStardust, queueSync]);

    const setLevel = useCallback((level: number) => {
        setPlayerData(prev => prev ? { ...prev, level } : null);
        queueSync({ level });
    }, [queueSync]);

    const updateSettings = useCallback((settings: Partial<PlayerSettings>) => {
        setPlayerData(prev => prev ? {
            ...prev,
            settings: { ...prev.settings, ...settings }
        } : null);
        gameClient.updateSettings(settings);
    }, []);

    const updateCosmetics = useCallback((cosmetics: Partial<PlayerCosmetics>) => {
        setPlayerData(prev => prev ? {
            ...prev,
            cosmetics: { ...prev.cosmetics, ...cosmetics }
        } : null);
        gameClient.updateCosmetics(cosmetics);
    }, []);

    const purchaseCosmetic = useCallback((id: string, price: number) => {
        gameClient.purchaseCosmetic(id, price);
    }, []);

    const updateCompanions = useCallback((companions: Partial<PlayerCompanions>) => {
        setPlayerData(prev => prev ? {
            ...prev,
            companions: { ...prev.companions, ...companions }
        } : null);
        queueSync({ companions: { ...playerData?.companions, ...companions } });
    }, [playerData?.companions, queueSync]);

    const updateExploration = useCallback((exploration: Partial<PlayerExploration>) => {
        setPlayerData(prev => prev ? {
            ...prev,
            exploration: { ...prev.exploration, ...exploration }
        } : null);
        gameClient.updateExploration(exploration);
    }, []);

    const addDiscovery = useCallback((id: string, type: string) => {
        gameClient.updateExploration({ discovery: { id, type } });
    }, []);

    const updateQuestProgress = useCallback((questId: string, progress: number) => {
        setPlayerData(prev => prev ? {
            ...prev,
            quests: {
                ...prev.quests,
                questProgress: { ...prev.quests.questProgress, [questId]: progress }
            }
        } : null);
        gameClient.updateQuest({ questId, progress });
    }, []);

    const completeQuest = useCallback((questId: string) => {
        setPlayerData(prev => prev ? {
            ...prev,
            quests: {
                ...prev.quests,
                completedQuestIds: [...prev.quests.completedQuestIds, questId],
                activeQuestIds: prev.quests.activeQuestIds.filter(id => id !== questId)
            },
            stats: {
                ...prev.stats,
                questsCompleted: prev.stats.questsCompleted + 1
            }
        } : null);
        gameClient.updateQuest({ questId, complete: true });
    }, []);

    const trackStat = useCallback((stat: keyof PlayerStats, amount: number = 1) => {
        setPlayerData(prev => prev ? {
            ...prev,
            stats: { ...prev.stats, [stat]: (prev.stats[stat] || 0) + amount }
        } : null);
        gameClient.trackStat(stat as string, amount);
    }, []);

    const unlockAchievement = useCallback((achievementId: string) => {
        if (playerData?.achievements.includes(achievementId)) return;

        setPlayerData(prev => prev ? {
            ...prev,
            achievements: [...prev.achievements, achievementId]
        } : null);
        gameClient.addAchievement(achievementId);
    }, [playerData?.achievements]);

    const hasAchievement = useCallback((achievementId: string): boolean => {
        return playerData?.achievements.includes(achievementId) || false;
    }, [playerData?.achievements]);

    const processDailyLogin = useCallback(() => {
        gameClient.processDailyLogin();
    }, []);

    const addAnchoringSession = useCallback((type: string, duration: number) => {
        setPlayerData(prev => prev ? {
            ...prev,
            anchoring: {
                ...prev.anchoring,
                breathingCompleted: prev.anchoring.breathingCompleted + 1,
                lastAnchorDate: new Date().toISOString().split('T')[0],
                sessionHistory: [
                    ...prev.anchoring.sessionHistory.slice(-99),
                    { type, duration, timestamp: Date.now() }
                ]
            }
        } : null);
        queueSync({
            anchoring: {
                ...playerData?.anchoring,
                breathingCompleted: (playerData?.anchoring.breathingCompleted || 0) + 1,
                lastAnchorDate: new Date().toISOString().split('T')[0]
            }
        });
    }, [playerData?.anchoring, queueSync]);

    const updateGameState = useCallback((state: Partial<PlayerGameState>) => {
        setPlayerData(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, ...state }
        } : null);
        queueSync({ gameState: { ...playerData?.gameState, ...state } });
    }, [playerData?.gameState, queueSync]);

    const addBond = useCallback((targetId: string, strength: number, type: string) => {
        const newBond = { targetId, strength, type };
        setPlayerData(prev => {
            if (!prev) return null;
            const existingBonds = prev.gameState.bonds.filter(b => b.targetId !== targetId);
            return {
                ...prev,
                gameState: {
                    ...prev.gameState,
                    bonds: [...existingBonds, newBond]
                },
                stats: {
                    ...prev.stats,
                    bondsFormed: prev.stats.bondsFormed + 1
                }
            };
        });
        queueSync({
            gameState: {
                ...playerData?.gameState,
                bonds: [...(playerData?.gameState.bonds.filter(b => b.targetId !== targetId) || []), newBond]
            }
        });
    }, [playerData?.gameState, queueSync]);

    const addStarMemory = useCallback((starId: string, memory: string) => {
        const newMemory = { starId, memory, timestamp: Date.now() };
        setPlayerData(prev => prev ? {
            ...prev,
            gameState: {
                ...prev.gameState,
                starMemories: [...prev.gameState.starMemories.slice(-49), newMemory]
            }
        } : null);
        queueSync({
            gameState: {
                ...playerData?.gameState,
                starMemories: [...(playerData?.gameState.starMemories.slice(-49) || []), newMemory]
            }
        });
    }, [playerData?.gameState, queueSync]);

    const claimChallengeReward = useCallback((challengeId: string) => {
        gameClient.claimChallengeReward(challengeId);
    }, []);

    const rerollChallenge = useCallback((challengeId: string) => {
        gameClient.rerollChallenge(challengeId);
    }, []);

    const updateChallengeProgress = useCallback((type: string, amount: number = 1) => {
        gameClient.updateChallengeProgress(type, amount);
    }, []);

    const getQuestProgress = useCallback((id: string): number => {
        return playerData?.quests.questProgress[id] || 0;
    }, [playerData?.quests.questProgress]);

    return {
        isConnected,
        loading,
        synced,
        error,
        playerData,
        dailyChallenges,
        weeklyChallenges,

        // Quick accessors
        playerId: playerData?.playerId || playerId,
        name: playerData?.name || 'Wanderer',
        xp: playerData?.xp || 0,
        level: playerData?.level || 1,
        stardust: playerData?.stardust || 0,
        stats: playerData?.stats || null,
        settings: playerData?.settings || null,
        achievements: playerData?.achievements || [],

        // Actions
        requestFullSync,
        addXp,
        addStardust,
        setLevel,
        updateSettings,
        updateCosmetics,
        purchaseCosmetic,
        updateCompanions,
        updateExploration,
        addDiscovery,
        updateQuestProgress,
        completeQuest,
        trackStat,
        unlockAchievement,
        hasAchievement,
        processDailyLogin,
        lastDailyLoginResult,
        addAnchoringSession,
        updateGameState,
        addBond,
        addStarMemory,

        // Challenges
        claimChallengeReward,
        rerollChallenge,
        updateChallengeProgress,

        // Helpers
        getQuestProgress
    };
}

export default useServerSync;
