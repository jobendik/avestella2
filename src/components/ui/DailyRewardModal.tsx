// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Connected Daily Reward Modal (TypeScript)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useProgressionContext } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';
import { DAILY_REWARDS } from '@/constants/progression';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface DailyRewardModalProps {
    onClose?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DailyRewardModal({ onClose }: DailyRewardModalProps): JSX.Element {
    const progression = useProgressionContext();
    const { closePanel } = useUI();
    const [showClaimAnimation, setShowClaimAnimation] = useState(false);
    const [claimed, setClaimed] = useState(false);

    // Calculate today's reward based on streak
    const todaysReward = useMemo(() => {
        const rewardIndex = Math.min(progression.state.dailyLoginStreak, DAILY_REWARDS.length - 1);
        return DAILY_REWARDS[rewardIndex];
    }, [progression.state.dailyLoginStreak]);

    // Check if already claimed today
    const alreadyClaimed = useMemo(() => {
        const today = new Date().toDateString();
        return progression.state.lastLoginDate === today;
    }, [progression.state.lastLoginDate]);

    const handleClaim = () => {
        if (alreadyClaimed || claimed) return;

        const result = progression.claimDailyReward();
        if (result.success) {
            setShowClaimAnimation(true);
            setClaimed(true);
            setTimeout(() => {
                setShowClaimAnimation(false);
            }, 2000);
        }
    };

    const handleClose = () => {
        onClose?.();
        closePanel();
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"
            onClick={handleClose}
        >
            <div
                className="bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 rounded-3xl border-2 border-amber-400/50 p-8 max-w-md w-11/12 shadow-2xl animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🎁</div>
                    <h2 className="text-2xl font-bold text-white mb-1">Daily Reward!</h2>
                    <div className="text-amber-400 text-sm">
                        Day {progression.state.dailyLoginStreak + 1} • {progression.state.dailyLoginStreak} Day Streak 🔥
                    </div>
                </div>

                {/* Reward Display */}
                <div className={`bg-black/40 rounded-2xl p-6 mb-6 border border-white/20 transition-all ${showClaimAnimation ? 'scale-110 border-amber-400' : ''}`}>
                    <div className="text-center">
                        <div className={`text-6xl mb-3 ${showClaimAnimation ? 'animate-bounce' : ''}`}>{todaysReward.icon}</div>
                        <div className="text-xl font-bold text-white mb-2">{todaysReward.name}</div>

                        {todaysReward.type === 'stardust' && todaysReward.amount && (
                            <div className="text-3xl font-bold text-amber-400">
                                +{todaysReward.amount} ✨
                            </div>
                        )}

                        {todaysReward.type === 'xp' && todaysReward.amount && (
                            <div className="text-3xl font-bold text-blue-400">
                                +{todaysReward.amount} XP ⭐
                            </div>
                        )}

                        {todaysReward.type === 'special' && todaysReward.rewards && (
                            <div className="space-y-1">
                                {todaysReward.rewards.stardust && (
                                    <div className="text-xl text-amber-400">+{todaysReward.rewards.stardust} ✨ Stardust</div>
                                )}
                                {todaysReward.rewards.xp && (
                                    <div className="text-xl text-blue-400">+{todaysReward.rewards.xp} XP ⭐</div>
                                )}
                            </div>
                        )}

                        {['trail', 'color', 'aura', 'companion', 'legendary'].includes(todaysReward.type) && (
                            <div className="text-lg text-purple-300">Cosmetic Unlocked!</div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                    <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <div className="text-white/60 text-xs">Current Streak</div>
                        <div className="text-xl font-bold text-amber-400">{progression.state.dailyLoginStreak} 🔥</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <div className="text-white/60 text-xs">Total Stardust</div>
                        <div className="text-xl font-bold text-purple-400">{progression.state.stardust.toLocaleString()} ✨</div>
                    </div>
                </div>

                {/* 30-Day Calendar Preview */}
                <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/10">
                    <div className="text-xs text-white/60 mb-2">This Month's Progress</div>
                    <div className="grid grid-cols-10 gap-1">
                        {DAILY_REWARDS.map((r, i) => {
                            const isClaimed = progression.state.claimedDailyRewards.includes(i);
                            const isToday = i === progression.state.dailyLoginStreak && !alreadyClaimed && !claimed;
                            return (
                                <div
                                    key={i}
                                    className={`aspect-square rounded text-[10px] flex items-center justify-center ${isClaimed
                                            ? 'bg-amber-500/50 text-amber-200'
                                            : isToday
                                                ? 'bg-amber-400 text-black font-bold ring-2 ring-amber-300'
                                                : 'bg-white/10 text-white/30'
                                        }`}
                                >
                                    {isClaimed ? '✓' : r.day}
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-xs text-white/50 mt-2 text-center">
                        Come back tomorrow to keep your streak alive!
                    </div>
                </div>

                {/* Claim Button */}
                <button
                    onClick={handleClaim}
                    disabled={alreadyClaimed || claimed}
                    className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all ${alreadyClaimed || claimed
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white active:scale-95'
                        }`}
                >
                    {alreadyClaimed || claimed ? 'Already Claimed Today ✓' : 'Claim Reward ✨'}
                </button>
            </div>
        </div>
    );
}

export default DailyRewardModal;
