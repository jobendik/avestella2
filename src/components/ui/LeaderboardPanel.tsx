// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Leaderboard Panel (TypeScript - Using Context)
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { X, Clock, Calendar, Trophy } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { useLeaderboardContext, useProgressionContext, useDailyChallengesContext } from '@/contexts/GameContext';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardPanelProps {
    onClose?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function LeaderboardPanel({ onClose }: LeaderboardPanelProps): JSX.Element {
    const { closePanel } = useUI();
    const leaderboard = useLeaderboardContext();
    const progression = useProgressionContext();
    const dailyChallenges = useDailyChallengesContext();

    const handleClose = () => {
        onClose?.();
        closePanel();
    };

    const categories = [
        { id: 'xp' as const, label: 'Total XP', icon: '⭐' },
        { id: 'stardust' as const, label: 'Stardust', icon: '✨' },
        { id: 'challenges' as const, label: 'Challenges', icon: '🎯' },
        { id: 'season' as const, label: 'Season', icon: '🏆' }
    ];

    const timePeriods = [
        { id: 'allTime' as const, label: 'All-Time', icon: Trophy },
        { id: 'weekly' as const, label: 'Weekly', icon: Calendar },
        { id: 'monthly' as const, label: 'Monthly', icon: Clock }
    ];

    // Get player's value for current category
    const getPlayerValue = (): number => {
        switch (leaderboard.category) {
            case 'xp': return progression.state.xp + ((progression.state.level - 1) * 1000);
            case 'stardust': return progression.state.stardust;
            case 'challenges': return dailyChallenges.totalCompleted;
            case 'season': return progression.state.seasonPassTier;
            default: return 0;
        }
    };

    const getCategoryLabel = () => {
        switch (leaderboard.category) {
            case 'xp': return 'Total XP';
            case 'stardust': return 'Stardust';
            case 'challenges': return 'Completed';
            case 'season': return 'Season Tier';
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleClose}
        >
            <div
                className="bg-gradient-to-br from-blue-950 to-purple-950 border-2 border-blue-500/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900/95 to-purple-900/95 backdrop-blur-md p-6 border-b border-blue-500/30">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-3xl font-bold text-blue-400 flex items-center gap-2">
                            🏆 Leaderboards
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 mb-4">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => leaderboard.setCategory(cat.id)}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${leaderboard.category === cat.id
                                    ? 'bg-blue-500 text-white shadow-lg'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                                    }`}
                            >
                                <span className="mr-1">{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Time Period Filter */}
                    <div className="flex gap-2">
                        {timePeriods.map(period => {
                            const Icon = period.icon;
                            return (
                                <button
                                    key={period.id}
                                    onClick={() => leaderboard.setTimePeriod(period.id)}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${leaderboard.timePeriod === period.id
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {period.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Player's Rank Card */}
                    <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl">
                                    🌟
                                </div>
                                <div>
                                    <div className="text-white font-bold">You</div>
                                    <div className="text-amber-300 text-sm">Rank #{leaderboard.playerRank}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-white/60">{getCategoryLabel()}</div>
                                <div className="text-2xl font-bold text-white">
                                    {getPlayerValue().toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leaderboard List */}
                <div className="p-6 space-y-2 overflow-y-auto flex-1">
                    {leaderboard.getTopEntries(15).map((player, index) => {
                        const rank = index + 1;
                        const categoryMap: Record<string, number> = {
                            xp: player.xp,
                            stardust: player.stardust,
                            challenges: player.challengesCompleted,
                            season: player.seasonTier
                        };
                        const value = categoryMap[leaderboard.category] ?? 0;

                        const medalBg = rank === 1 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                            rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-500' :
                                    'bg-white/20';

                        return (
                            <div
                                key={index}
                                className={`p-4 rounded-xl transition-all ${player.isPlayer
                                    ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-2 border-amber-500/50 scale-105'
                                    : rank <= 3
                                        ? 'bg-white/10 border-2 border-white/20'
                                        : 'bg-white/5 border border-white/10'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-10 h-10 rounded-full ${medalBg} flex items-center justify-center font-bold ${rank <= 3 ? 'text-black text-lg shadow-lg' : 'text-white'}`}>
                                            {rank}
                                        </div>
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="text-2xl">{player.avatar}</div>
                                            <div>
                                                <div className="text-white font-medium flex items-center gap-2">
                                                    {player.name}
                                                    {player.isPlayer && <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">YOU</span>}
                                                </div>
                                                <div className="text-white/60 text-sm">Level {player.level}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-white">
                                            {value.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-white/50">
                                            {leaderboard.category === 'xp' && 'XP'}
                                            {leaderboard.category === 'stardust' && '✨'}
                                            {leaderboard.category === 'challenges' && 'challenges'}
                                            {leaderboard.category === 'season' && 'tier'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default LeaderboardPanel;
