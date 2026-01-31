// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Daily & Weekly Challenge Panel (TypeScript)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { X, Calendar, Trophy } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { useProgressionContext, useDailyChallengesContext } from '@/contexts/GameContext';
import { DailyChallenge, WeeklyChallenge } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface DailyChallengePanelProps {
    onClose?: () => void;
}

type ChallengeTab = 'daily' | 'weekly';

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty Styling
// ─────────────────────────────────────────────────────────────────────────────

const difficultyColors: Record<DailyChallenge['difficulty'], string> = {
    easy: 'from-green-500 to-emerald-500',
    medium: 'from-yellow-500 to-orange-500',
    hard: 'from-red-500 to-pink-500'
};

const difficultyBorders: Record<DailyChallenge['difficulty'], string> = {
    easy: 'border-green-500/30',
    medium: 'border-yellow-500/30',
    hard: 'border-red-500/30'
};

// Weekly tab uses purple accents
const weeklyDifficultyColors: Record<DailyChallenge['difficulty'], string> = {
    easy: 'from-purple-400 to-violet-500',
    medium: 'from-purple-500 to-fuchsia-500',
    hard: 'from-purple-600 to-pink-600'
};

const weeklyDifficultyBorders: Record<DailyChallenge['difficulty'], string> = {
    easy: 'border-purple-400/30',
    medium: 'border-purple-500/30',
    hard: 'border-fuchsia-500/30'
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DailyChallengePanel({ onClose }: DailyChallengePanelProps): JSX.Element {
    const { closePanel } = useUI();
    const progression = useProgressionContext();
    const dailyChallenges = useDailyChallengesContext();
    const [activeTab, setActiveTab] = useState<ChallengeTab>('daily');

    // Map context challenges to DailyChallenge type for styling compatibility
    const challenges: DailyChallenge[] = useMemo(() =>
        dailyChallenges.challenges.map(c => ({
            id: c.id,
            type: c.type as DailyChallenge['type'],
            desc: c.desc,
            target: c.target,
            progress: c.progress,
            difficulty: c.difficulty,
            reward: c.reward,
            completed: c.completed,
            claimed: c.claimed
        })),
        [dailyChallenges.challenges]
    );

    const weeklyChallenges = dailyChallenges.weeklyChallenges;
    const rerollsAvailable = dailyChallenges.rerollsAvailable;
    const completedToday = dailyChallenges.completedToday;
    const completedThisWeek = dailyChallenges.completedThisWeek;
    const daysUntilReset = dailyChallenges.daysUntilWeeklyReset;

    const handleClose = () => {
        onClose?.();
        closePanel();
    };

    const handleReroll = (challengeId: string) => {
        dailyChallenges.rerollChallenge(challengeId);
    };

    const handleClaim = (challengeId: string) => {
        dailyChallenges.claimReward(challengeId);
    };

    const handleClaimWeekly = (challengeId: string) => {
        dailyChallenges.claimWeeklyReward(challengeId);
    };

    // Choose colors based on tab
    const colors = activeTab === 'daily' ? difficultyColors : weeklyDifficultyColors;
    const borders = activeTab === 'daily' ? difficultyBorders : weeklyDifficultyBorders;
    const primaryColor = activeTab === 'daily' ? 'amber' : 'purple';

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleClose}
        >
            <div
                className={`bg-gradient-to-br from-slate-900 to-slate-800 border-2 ${activeTab === 'daily' ? 'border-amber-500/30' : 'border-purple-500/30'} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Tabs */}
                <div className="p-6 pb-4 border-b border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className={`text-3xl font-bold ${activeTab === 'daily' ? 'text-amber-400' : 'text-purple-400'}`}>
                            {activeTab === 'daily' ? '🌟 Daily Challenges' : '🏆 Weekly Challenges'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Tab Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('daily')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${activeTab === 'daily'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            <Calendar className="w-5 h-5" />
                            Daily
                        </button>
                        <button
                            onClick={() => setActiveTab('weekly')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${activeTab === 'weekly'
                                ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            <Trophy className="w-5 h-5" />
                            Weekly
                            {daysUntilReset <= 2 && (
                                <span className="ml-1 text-xs bg-red-500 text-white px-1.5 rounded-full">
                                    {daysUntilReset}d
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Daily Tab Content */}
                    {activeTab === 'daily' && (
                        <>
                            {/* Challenge Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-white">
                                        {completedToday}/3
                                    </div>
                                    <div className="text-xs text-white/60">Completed Today</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-amber-400">
                                        {challenges.filter(c => c.claimed).length}
                                    </div>
                                    <div className="text-xs text-white/60">Claimed</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-blue-400">
                                        {rerollsAvailable}
                                    </div>
                                    <div className="text-xs text-white/60">Rerolls Left</div>
                                </div>
                            </div>

                            {/* Daily Challenges List */}
                            <div className="space-y-4">
                                {challenges.map((challenge) => {
                                    const progress = Math.min(100, (challenge.progress / challenge.target) * 100);
                                    return (
                                        <ChallengeCard
                                            key={challenge.id}
                                            challenge={challenge}
                                            progress={progress}
                                            colors={colors}
                                            borders={borders}
                                            showReroll={rerollsAvailable > 0}
                                            onReroll={handleReroll}
                                            onClaim={handleClaim}
                                        />
                                    );
                                })}
                            </div>

                            {/* Bonus Reward Info */}
                            {completedToday < 3 && (
                                <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl">
                                    <p className="text-center text-white/80">
                                        🎉 Complete all 3 challenges for a{' '}
                                        <span className="text-amber-400 font-bold">+500 Stardust</span> and{' '}
                                        <span className="text-blue-400 font-bold">+200 XP</span> bonus!
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Weekly Tab Content */}
                    {activeTab === 'weekly' && (
                        <>
                            {/* Weekly Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-white">
                                        {completedThisWeek}/3
                                    </div>
                                    <div className="text-xs text-white/60">Completed</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-purple-400">
                                        {weeklyChallenges.filter(c => c.claimed).length}
                                    </div>
                                    <div className="text-xs text-white/60">Claimed</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-fuchsia-400">
                                        {daysUntilReset}
                                    </div>
                                    <div className="text-xs text-white/60">Days Left</div>
                                </div>
                            </div>

                            {/* Weekly Challenges List */}
                            <div className="space-y-4">
                                {weeklyChallenges.map((challenge) => {
                                    const progress = Math.min(100, (challenge.progress / challenge.target) * 100);
                                    return (
                                        <WeeklyChallengeCard
                                            key={challenge.id}
                                            challenge={challenge}
                                            progress={progress}
                                            colors={colors}
                                            borders={borders}
                                            daysRemaining={daysUntilReset}
                                            onClaim={handleClaimWeekly}
                                        />
                                    );
                                })}
                            </div>

                            {/* Weekly Bonus Info */}
                            {completedThisWeek < 3 && daysUntilReset >= 3 && (
                                <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 rounded-xl">
                                    <p className="text-center text-white/80">
                                        ⚡ Complete challenges early for a{' '}
                                        <span className="text-purple-400 font-bold">+25% bonus</span>!
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Challenge Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface ChallengeCardProps {
    challenge: DailyChallenge;
    progress: number;
    colors: Record<string, string>;
    borders: Record<string, string>;
    showReroll: boolean;
    onReroll: (id: string) => void;
    onClaim: (id: string) => void;
}

function ChallengeCard({ challenge, progress, colors, borders, showReroll, onReroll, onClaim }: ChallengeCardProps): JSX.Element {
    return (
        <div
            className={`bg-white/5 border-2 ${borders[challenge.difficulty]} rounded-xl p-5 ${challenge.completed ? 'opacity-75' : ''}`}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${colors[challenge.difficulty]} text-white`}
                        >
                            {challenge.difficulty.toUpperCase()}
                        </span>
                        {challenge.completed && (
                            <span className="text-green-400">✓ Completed</span>
                        )}
                    </div>
                    <p className="text-white font-medium">{challenge.desc}</p>
                </div>
                {!challenge.completed && !challenge.claimed && showReroll && (
                    <button
                        onClick={() => onReroll(challenge.id)}
                        className="ml-2 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs rounded-lg border border-blue-500/30 transition-colors"
                    >
                        🎲 Reroll
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>Progress</span>
                    <span>{challenge.progress}/{challenge.target}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${colors[challenge.difficulty]} transition-all duration-300`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Rewards */}
            <div className="flex justify-between items-center">
                <div className="flex gap-4 text-sm">
                    <span className="text-amber-400">✨ {challenge.reward.stardust}</span>
                    <span className="text-blue-400">⭐ {challenge.reward.xp} XP</span>
                </div>
                {challenge.completed && !challenge.claimed && (
                    <button
                        onClick={() => onClaim(challenge.id)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-lg shadow-lg active:scale-95 transition-all"
                    >
                        Claim
                    </button>
                )}
                {challenge.claimed && (
                    <span className="text-green-400 font-medium">Claimed ✓</span>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Challenge Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface WeeklyChallengeCardProps {
    challenge: WeeklyChallenge;
    progress: number;
    colors: Record<string, string>;
    borders: Record<string, string>;
    daysRemaining: number;
    onClaim: (id: string) => void;
}

function WeeklyChallengeCard({ challenge, progress, colors, borders, daysRemaining, onClaim }: WeeklyChallengeCardProps): JSX.Element {
    const bonusEligible = daysRemaining >= 3 && !challenge.claimed;

    return (
        <div
            className={`bg-white/5 border-2 ${borders[challenge.difficulty]} rounded-xl p-5 ${challenge.completed ? 'opacity-75' : ''}`}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${colors[challenge.difficulty]} text-white`}
                        >
                            {challenge.difficulty.toUpperCase()}
                        </span>
                        {bonusEligible && !challenge.completed && (
                            <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                                ⚡ Early bonus eligible
                            </span>
                        )}
                        {challenge.completed && (
                            <span className="text-green-400">✓ Completed</span>
                        )}
                    </div>
                    <p className="text-white font-medium">{challenge.desc}</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>Progress</span>
                    <span>{challenge.progress.toLocaleString()}/{challenge.target.toLocaleString()}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${colors[challenge.difficulty]} transition-all duration-300`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Rewards */}
            <div className="flex justify-between items-center">
                <div className="flex gap-4 text-sm">
                    <span className="text-purple-400">
                        ✨ {challenge.reward.stardust.toLocaleString()}
                        {bonusEligible && challenge.bonusReward && (
                            <span className="text-xs text-purple-300 ml-1">
                                (+{challenge.bonusReward.stardust})
                            </span>
                        )}
                    </span>
                    <span className="text-fuchsia-400">
                        ⭐ {challenge.reward.xp.toLocaleString()} XP
                        {bonusEligible && challenge.bonusReward && (
                            <span className="text-xs text-purple-300 ml-1">
                                (+{challenge.bonusReward.xp})
                            </span>
                        )}
                    </span>
                </div>
                {challenge.completed && !challenge.claimed && (
                    <button
                        onClick={() => onClaim(challenge.id)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white font-bold rounded-lg shadow-lg active:scale-95 transition-all"
                    >
                        Claim{bonusEligible ? ' + Bonus' : ''}
                    </button>
                )}
                {challenge.claimed && (
                    <span className="text-green-400 font-medium">Claimed ✓</span>
                )}
            </div>
        </div>
    );
}

export default DailyChallengePanel;
