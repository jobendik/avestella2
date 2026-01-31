
// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Daily & Weekly Challenges Hook (TypeScript)
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useMemo } from 'react';
import { useServerSync } from './useServerSync';
import { DailyChallengesState, WeeklyChallengesState } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types (Re-exported for compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export type { DailyChallengesState, WeeklyChallengesState };

export interface UseDailyChallengesReturn {
    // Daily State
    challenges: any[]; // Using any[] or specific Challenge[] from types
    completedToday: number;
    totalCompleted: number;
    rerollsAvailable: number;

    // Weekly State
    weeklyChallenges: any[];
    completedThisWeek: number;
    totalWeeklyCompleted: number;
    daysUntilWeeklyReset: number;

    // Daily Functions
    updateProgress: (type: string, amount?: number) => void;
    claimReward: (challengeId: string) => void;
    rerollChallenge: (challengeId: string) => void;
    getAllComplete: () => boolean;

    // Weekly Functions
    updateWeeklyProgress: (type: string, amount?: number) => void;
    claimWeeklyReward: (challengeId: string) => void;
    getAllWeeklyComplete: () => boolean;

    // Persistence (Deprecated/No-op)
    saveChallenges: () => void;
    loadChallenges: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useDailyChallenges(playerId: string = ''): UseDailyChallengesReturn {
    const {
        dailyChallenges,
        weeklyChallenges,
        updateChallengeProgress,
        claimChallengeReward,
        rerollChallenge: serverReroll
    } = useServerSync(playerId);

    // ─────────────────────────────────────────────────────────────────────────
    // Derived State
    // ─────────────────────────────────────────────────────────────────────────

    const daysUntilWeeklyReset = useMemo(() => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 0) return 1;
        if (dayOfWeek === 1) return 7;
        return 8 - dayOfWeek;
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    const updateProgress = useCallback((type: string, amount: number = 1) => {
        updateChallengeProgress(type, amount);
    }, [updateChallengeProgress]);

    const claimReward = useCallback((challengeId: string) => {
        claimChallengeReward(challengeId);
        // Return type mismatch: old hook returned reward object.
        // We can't synchronously return reward here.
        // Callsites must listen to 'challenge_reward_claimed' or rely on optimistic UI updates in sync logic.
        // Returning null/void for now.
    }, [claimChallengeReward]);

    const rerollChallenge = useCallback((challengeId: string) => {
        serverReroll(challengeId);
        // Old hook returned boolean.
    }, [serverReroll]);

    const getAllComplete = useCallback((): boolean => {
        if (!dailyChallenges) return false;
        return dailyChallenges.challenges.every(c => c.completed);
    }, [dailyChallenges]);

    const updateWeeklyProgress = useCallback((type: string, amount: number = 1) => {
        // Same as daily
        updateChallengeProgress(type, amount);
    }, [updateChallengeProgress]);

    const claimWeeklyReward = useCallback((challengeId: string) => {
        // Same as daily
        claimChallengeReward(challengeId);
    }, [claimChallengeReward]);

    const getAllWeeklyComplete = useCallback((): boolean => {
        if (!weeklyChallenges) return false;
        return weeklyChallenges.challenges.every(c => c.completed);
    }, [weeklyChallenges]);

    const checkForEmpty = useCallback(() => { }, []);

    return {
        // Daily State
        challenges: dailyChallenges?.challenges || [],
        completedToday: dailyChallenges?.completedToday || 0,
        totalCompleted: dailyChallenges?.totalCompleted || 0,
        rerollsAvailable: dailyChallenges?.rerollsAvailable || 0,

        // Weekly State
        weeklyChallenges: weeklyChallenges?.challenges || [],
        completedThisWeek: weeklyChallenges?.completedThisWeek || 0,
        totalWeeklyCompleted: weeklyChallenges?.totalWeeklyCompleted || 0,
        daysUntilWeeklyReset,

        // Daily Functions
        updateProgress,
        claimReward, // Note: Signature changed return type
        rerollChallenge, // Note: Signature changed return type
        getAllComplete,

        // Weekly Functions
        updateWeeklyProgress,
        claimWeeklyReward,
        getAllWeeklyComplete,

        // Persistence (No-op)
        saveChallenges: checkForEmpty,
        loadChallenges: checkForEmpty
    };
}

export default useDailyChallenges;
