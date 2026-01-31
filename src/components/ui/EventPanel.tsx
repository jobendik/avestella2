// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Event Panel (TypeScript - Using Context)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { useSocialContext, useLeaderboardContext } from '@/contexts/GameContext';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface EventPanelProps {
    onClose?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function EventPanel({ onClose }: EventPanelProps): JSX.Element {
    const { closePanel } = useUI();
    const social = useSocialContext();
    const leaderboardContext = useLeaderboardContext();

    // Use event from context - NO mock fallback
    const event = social.activeEvent;

    // Use progress from context
    const progress = social.eventProgress;

    // Get leaderboard from context (fetched from server)
    const [leaderboard, setLeaderboard] = useState<Array<{name: string; avatar: string; stardust: number; isPlayer: boolean}>>([]);

    useEffect(() => {
        // Request event leaderboard when panel opens
        if (event) {
            // Would fetch from server via gameClient.requestEventLeaderboard(event.id)
        }
    }, [event]);

    const handleClose = () => {
        onClose?.();
        closePanel();
    };

    // If no active event, show empty state
    if (!event) {
        return (
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={handleClose}
            >
                <div
                    className="bg-gradient-to-br from-gray-900 to-pink-900/50 rounded-2xl border-2 border-pink-500/30 shadow-2xl max-w-lg w-full p-8 animate-slide-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-white text-2xl font-bold">Events</h2>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🌟</div>
                        <h3 className="text-white text-xl font-bold mb-2">No Active Events</h3>
                        <p className="text-white/60">
                            Check back later for special events with exclusive rewards!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const timeLeft = social.getEventTimeRemaining();
    const hours = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
    const minutes = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));
    const progressPercent = event ? 100 - (timeLeft / (event.duration * 60 * 60 * 1000)) * 100 : 0;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleClose}
        >
            <div
                className="bg-gradient-to-br from-gray-900 to-pink-900/50 rounded-2xl border-2 border-pink-500/30 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-pink-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-5xl animate-pulse">{event.icon}</div>
                        <div className="flex-1">
                            <div className="text-white text-2xl font-bold">{event.name}</div>
                            <div className="text-pink-300 text-sm">{event.description}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Timer */}
                <div className="p-4 bg-black/30 border-b border-pink-500/20">
                    <div className="flex items-center justify-between">
                        <div className="text-white/60 text-sm">Event ends in:</div>
                        <div className="text-pink-300 font-bold text-lg">
                            {hours}h {minutes}m
                        </div>
                    </div>
                    <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Goals */}
                    <div className="mb-6">
                        <div className="text-white font-bold text-lg mb-4">Event Goals</div>
                        <div className="space-y-3">
                            {event.goals.map((goal, i) => {
                                let currentProgress = 0;
                                if (goal.type === 'fragmentsCollected') currentProgress = progress.fragmentsCollected;
                                else if (goal.type === 'beaconsLit') currentProgress = progress.beaconsLit;
                                else if (goal.type === 'bondsFormed') currentProgress = progress.bondsFormed;

                                const isComplete = currentProgress >= goal.target;
                                const goalProgress = Math.min(100, (currentProgress / goal.target) * 100);

                                const goalText = {
                                    fragmentsCollected: `Collect ${goal.target} fragments`,
                                    beaconsLit: `Light ${goal.target} beacons`,
                                    bondsFormed: `Form ${goal.target} bonds`
                                }[goal.type];

                                return (
                                    <div
                                        key={i}
                                        className={`bg-white/5 rounded-xl p-4 border ${isComplete ? 'border-green-500/50 bg-green-500/10' : 'border-pink-500/20'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {isComplete && <span className="text-green-400 text-xl">✓</span>}
                                                <span className="text-white font-medium">{goalText}</span>
                                            </div>
                                            <div className="text-white/60 text-sm">
                                                {currentProgress}/{goal.target}
                                            </div>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                                            <div
                                                className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-pink-500 to-purple-500'
                                                    }`}
                                                style={{ width: `${goalProgress}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            {goal.reward.stardust && (
                                                <span className="text-amber-300">+{goal.reward.stardust} ✨</span>
                                            )}
                                            {goal.reward.xp && (
                                                <span className="text-blue-300">+{goal.reward.xp} XP</span>
                                            )}
                                            {goal.reward.cosmetic && (
                                                <span className="text-purple-300">+Cosmetic</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-white/5 rounded-xl p-6 border border-pink-500/20">
                        <div className="text-white font-bold text-lg mb-4">Event Leaderboard</div>
                        {leaderboard.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-2">📊</div>
                                <p className="text-white/60">Leaderboard loading...</p>
                            </div>
                        ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {leaderboard.map((player, i) => {
                                const rank = i + 1;
                                const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                                const rankColor = rank === 1 ? 'text-amber-400' :
                                    rank === 2 ? 'text-gray-300' :
                                        rank === 3 ? 'text-orange-400' : 'text-white/60';

                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between p-3 rounded-lg transition-all ${player.isPlayer
                                            ? 'bg-amber-500/20 border border-amber-500/50'
                                            : 'bg-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 text-center font-bold ${rankColor}`}>
                                                {rankIcon}
                                            </div>
                                            <div className="text-xl">{player.avatar}</div>
                                            <div>
                                                <div className="text-white font-medium flex items-center gap-2">
                                                    {player.name}
                                                    {player.isPlayer && (
                                                        <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">
                                                            YOU
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-pink-300">
                                                {player.stardust.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-white/50">points</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        )}

                        {/* Leaderboard Rewards */}
                        <div className="mt-6 pt-4 border-t border-pink-500/20">
                            <div className="text-white/60 text-sm mb-3">Leaderboard Rewards:</div>
                            <div className="space-y-2 text-xs">
                                {event.leaderboardRewards.map((reward, i) => (
                                    <div key={i} className="flex items-center justify-between text-white/70">
                                        <span>Rank {reward.rank}:</span>
                                        <span className="text-pink-300">
                                            {reward.stardust} ✨ · {reward.xp} XP
                                            {reward.cosmetic && ' · Exclusive Cosmetic'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EventPanel;
