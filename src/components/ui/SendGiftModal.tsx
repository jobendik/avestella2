// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Send Gift Modal
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { X, Gift, Flame, Send, Sparkles, Heart, Star, Zap } from 'lucide-react';
import { useSocialContext } from '@/contexts/GameContext';
import type { Friend } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Gift Types
// ─────────────────────────────────────────────────────────────────────────────

interface GiftType {
    id: string;
    name: string;
    icon: React.ReactNode;
    baseAmount: number;
    color: string;
    description: string;
}

const GIFT_TYPES: GiftType[] = [
    {
        id: 'sparkle',
        name: 'Sparkle Dust',
        icon: <Sparkles className="w-5 h-5" />,
        baseAmount: 25,
        color: 'from-blue-400 to-cyan-400',
        description: 'A small gift of appreciation'
    },
    {
        id: 'heart',
        name: 'Cosmic Heart',
        icon: <Heart className="w-5 h-5" />,
        baseAmount: 50,
        color: 'from-pink-400 to-rose-400',
        description: 'Show you care with this heartfelt gift'
    },
    {
        id: 'star',
        name: 'Stardust Bundle',
        icon: <Star className="w-5 h-5" />,
        baseAmount: 100,
        color: 'from-amber-400 to-yellow-400',
        description: 'A generous gift of stardust'
    },
    {
        id: 'energy',
        name: 'Energy Burst',
        icon: <Zap className="w-5 h-5" />,
        baseAmount: 200,
        color: 'from-purple-400 to-violet-400',
        description: 'A powerful boost of cosmic energy'
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SendGiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    friend: Friend | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SendGiftModal({ isOpen, onClose, friend }: SendGiftModalProps): JSX.Element | null {
    const social = useSocialContext();
    const [selectedGift, setSelectedGift] = useState<GiftType>(GIFT_TYPES[0]);
    const [customMessage, setCustomMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const streak = useMemo(() => {
        if (!friend) return null;
        return social.getGiftStreak(friend.id);
    }, [friend, social]);

    const streakBonus = useMemo(() => {
        if (!friend) return 1;
        return social.getStreakBonus(friend.id);
    }, [friend, social]);

    const totalAmount = useMemo(() => {
        return Math.floor(selectedGift.baseAmount * streakBonus);
    }, [selectedGift, streakBonus]);

    const canGift = useMemo(() => {
        if (!friend) return false;
        return social.canGiftToday(friend.id);
    }, [friend, social]);

    const handleSend = async () => {
        if (!friend || !canGift) return;

        setSending(true);

        // Simulate sending animation
        await new Promise(resolve => setTimeout(resolve, 800));

        const success = social.sendGift(friend.id, totalAmount, selectedGift.id, customMessage);

        if (success) {
            setSent(true);
            setTimeout(() => {
                setSent(false);
                setSending(false);
                onClose();
            }, 1500);
        } else {
            setSending(false);
        }
    };

    if (!isOpen || !friend) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-br from-slate-900 to-pink-950 border-2 border-pink-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-pink-400 flex items-center gap-2">
                            <Gift className="w-6 h-6" />
                            Send Gift
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Recipient */}
                    <div className="flex items-center gap-3 mt-4 p-3 bg-white/5 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-2xl">
                            {friend.avatar}
                        </div>
                        <div>
                            <div className="text-white font-medium">{friend.name}</div>
                            <div className="text-white/50 text-sm">Level {friend.level}</div>
                        </div>
                    </div>

                    {/* Streak Display */}
                    {streak && streak.currentStreak > 0 && (
                        <div className="flex items-center justify-between mt-4 p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Flame className="w-5 h-5 text-orange-400" />
                                <span className="text-orange-300 font-medium">
                                    {streak.currentStreak} Day Streak!
                                </span>
                            </div>
                            <div className="text-orange-200 text-sm">
                                +{Math.round((streakBonus - 1) * 100)}% Bonus
                            </div>
                        </div>
                    )}
                </div>

                {/* Gift Selection */}
                <div className="p-6">
                    {!canGift ? (
                        <div className="text-center py-8">
                            <div className="text-3xl mb-3">⏰</div>
                            <div className="text-white/60">
                                You already sent a gift today!
                            </div>
                            <div className="text-white/40 text-sm mt-2">
                                Come back tomorrow to continue your streak.
                            </div>
                        </div>
                    ) : sent ? (
                        <div className="text-center py-8 animate-pulse">
                            <div className="text-5xl mb-3">🎁✨</div>
                            <div className="text-green-400 font-bold text-xl">
                                Gift Sent!
                            </div>
                            <div className="text-white/60 mt-2">
                                {friend.name} received {totalAmount} stardust!
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm text-white/50 mb-3">Select a gift:</div>
                            <div className="grid grid-cols-2 gap-3">
                                {GIFT_TYPES.map(gift => (
                                    <button
                                        key={gift.id}
                                        onClick={() => setSelectedGift(gift)}
                                        className={`p-4 rounded-xl border-2 transition-all ${selectedGift.id === gift.id
                                                ? `bg-gradient-to-br ${gift.color} border-white/50 shadow-lg scale-105`
                                                : 'bg-white/5 border-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        <div className={`mb-2 ${selectedGift.id === gift.id ? 'text-white' : 'text-white/70'}`}>
                                            {gift.icon}
                                        </div>
                                        <div className={`font-medium text-sm ${selectedGift.id === gift.id ? 'text-white' : 'text-white/80'}`}>
                                            {gift.name}
                                        </div>
                                        <div className={`text-xs ${selectedGift.id === gift.id ? 'text-white/80' : 'text-white/50'}`}>
                                            {gift.baseAmount} stardust
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Custom Message */}
                            <div className="mt-4">
                                <label className="text-sm text-white/50 block mb-2">
                                    Add a message (optional):
                                </label>
                                <input
                                    type="text"
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    placeholder="Say something nice..."
                                    maxLength={100}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500/50"
                                />
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={sending}
                                className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Send {totalAmount} Stardust
                                        {streakBonus > 1 && (
                                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                                +{Math.round((streakBonus - 1) * 100)}%
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SendGiftModal;
