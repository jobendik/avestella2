// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Server-Connected Leaderboard Hook
// ═══════════════════════════════════════════════════════════════════════════
// This hook fetches leaderboard data from the backend server
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ServerLeaderboardEntry {
    playerId: string;
    name: string;
    rank: number;
    value: number;
    level?: number;
    seasonTier?: number;
}

export type LeaderboardType = 'stardust' | 'seasonXp' | 'challenges' | 'gifts';

export interface UseServerLeaderboardReturn {
    entries: ServerLeaderboardEntry[];
    loading: boolean;
    error: string | null;
    playerRank: number | null;
    currentType: LeaderboardType;
    setType: (type: LeaderboardType) => void;
    refresh: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Base URL
// ─────────────────────────────────────────────────────────────────────────────

const getApiUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001/api';
    }
    return `${window.location.protocol}//${window.location.host}/api`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

interface UseServerLeaderboardOptions {
    playerId?: string;
    limit?: number;
    autoRefreshInterval?: number; // in milliseconds, 0 to disable
}

export function useServerLeaderboard(options: UseServerLeaderboardOptions = {}): UseServerLeaderboardReturn {
    const { playerId, limit = 50, autoRefreshInterval = 60000 } = options;

    const [entries, setEntries] = useState<ServerLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playerRank, setPlayerRank] = useState<number | null>(null);
    const [currentType, setCurrentType] = useState<LeaderboardType>('stardust');

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/leaderboard?sortBy=${currentType}&limit=${limit}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch leaderboard: ${response.status}`);
            }

            const data = await response.json();
            setEntries(data);

            // Find player rank if playerId provided
            if (playerId) {
                const playerEntry = data.find((entry: ServerLeaderboardEntry) => entry.playerId === playerId);
                setPlayerRank(playerEntry?.rank ?? null);
            }
        } catch (err) {
            console.error('Leaderboard fetch error:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
        } finally {
            setLoading(false);
        }
    }, [currentType, limit, playerId]);

    // Initial fetch and on type change
    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    // Auto-refresh
    useEffect(() => {
        if (autoRefreshInterval <= 0) return;

        const interval = setInterval(fetchLeaderboard, autoRefreshInterval);
        return () => clearInterval(interval);
    }, [autoRefreshInterval, fetchLeaderboard]);

    const setType = useCallback((type: LeaderboardType) => {
        setCurrentType(type);
    }, []);

    return {
        entries,
        loading,
        error,
        playerRank,
        currentType,
        setType,
        refresh: fetchLeaderboard
    };
}

export default useServerLeaderboard;
