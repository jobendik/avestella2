// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Guild Panel (TypeScript - Using Context)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { useProgressionContext, useSocialContext } from '@/contexts/GameContext';
import { DEFAULT_GUILD } from '@/constants/social';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type GuildTab = 'overview' | 'members' | 'chat' | 'contributions';

interface GuildPanelProps {
    onClose?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function GuildPanel({ onClose }: GuildPanelProps): JSX.Element {
    const { closePanel } = useUI();
    const progression = useProgressionContext();
    const social = useSocialContext();
    const [activeTab, setActiveTab] = useState<GuildTab>('overview');
    const [messageInput, setMessageInput] = useState('');

    // Use guild from context (falls back to default)
    const guild = social.guild || DEFAULT_GUILD;
    const contributions = social.guildContributions;

    const handleClose = () => {
        onClose?.();
        closePanel();
    };

    const handleSendMessage = () => {
        if (messageInput.trim()) {
            // Would integrate with real chat system
            setMessageInput('');
        }
    };

    const handleContribute = (type: 'stardust' | 'daily') => {
        if (type === 'stardust' && progression.state.stardust >= 100) {
            if (social.contributeToGuild('stardust', 100)) {
                progression.spendStardust(100);
            }
        } else if (type === 'daily') {
            social.contributeToGuild('daily');
        }
    };

    const tabs: GuildTab[] = ['overview', 'members', 'chat', 'contributions'];

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleClose}
        >
            <div
                className="bg-gradient-to-br from-gray-900 to-purple-900/50 rounded-2xl border-2 border-purple-500/30 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-purple-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-5xl">🛡️</div>
                        <div>
                            <div className="text-white text-2xl font-bold flex items-center gap-2">
                                {guild.name}
                                <span className="text-purple-400 text-lg font-normal">{guild.tag}</span>
                            </div>
                            <div className="text-purple-300 text-sm">Level {guild.level} Guild</div>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-4 border-b border-purple-500/20">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === tab
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Guild Progress */}
                            <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                                <div className="text-white font-bold mb-2">Guild Progress</div>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="flex-1">
                                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                                                style={{ width: `${(guild.xp / guild.xpRequired) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-white/60 text-sm whitespace-nowrap">
                                        {guild.xp.toLocaleString()} / {guild.xpRequired.toLocaleString()} XP
                                    </div>
                                </div>
                            </div>

                            {/* Guild Perks */}
                            <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                                <div className="text-white font-bold mb-4">Active Perks</div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {guild.perks.map((perk, i) => (
                                        <div key={i} className="bg-white/5 rounded-lg p-4 border border-purple-400/20">
                                            <div className="text-2xl mb-2">{perk.icon}</div>
                                            <div className="text-white font-medium text-sm">{perk.name}</div>
                                            <div className="text-purple-300 text-xs">{perk.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Guild Description */}
                            <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                                <div className="text-white font-bold mb-2">About</div>
                                <p className="text-white/70 leading-relaxed">{guild.description}</p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard label="Members" value={guild.members.length} />
                                <StatCard label="Guild Level" value={guild.level} />
                                <StatCard label="Total Points" value={guild.totalContributions.toLocaleString()} />
                                <StatCard label="Days Active" value={guild.createdDays} />
                            </div>
                        </div>
                    )}

                    {/* Members Tab */}
                    {activeTab === 'members' && (
                        <div className="space-y-3">
                            {guild.members.map((member, i) => (
                                <div
                                    key={i}
                                    className="bg-white/5 rounded-xl p-4 border border-purple-500/20 hover:bg-white/10 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-xl">
                                                {member.avatar}
                                            </div>
                                            <div>
                                                <div className="text-white font-bold flex items-center gap-2">
                                                    {member.name}
                                                    {member.role && <span className="text-lg">{member.role}</span>}
                                                </div>
                                                <div className="text-white/60 text-sm">
                                                    Level {member.level} • {member.contributions.toLocaleString()} points
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {member.online ? (
                                                <div className="text-green-400 text-sm flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                                                    Online
                                                </div>
                                            ) : member.lastSeen && (
                                                <div className="text-white/40 text-xs">{member.lastSeen}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Chat Tab */}
                    {activeTab === 'chat' && (
                        <div className="space-y-4">
                            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                                {guild.chat.map((msg, i) => (
                                    <div key={i} className="bg-white/5 rounded-lg p-4 border border-purple-500/20">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-sm flex-shrink-0">
                                                {msg.avatar}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-medium">{msg.name}</span>
                                                    {msg.role && <span className="text-sm">{msg.role}</span>}
                                                    <span className="text-white/40 text-xs">{msg.time}</span>
                                                </div>
                                                <div className="text-white/80 break-words">{msg.message}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white/5 rounded-lg p-3 border border-purple-500/20">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder="Send a message to your guild..."
                                        className="flex-1 bg-white/10 border border-purple-400/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-medium rounded-lg transition-all"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Contributions Tab */}
                    {activeTab === 'contributions' && (
                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                                <div className="text-white font-bold mb-4">Daily Contribution</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleContribute('stardust')}
                                        disabled={progression.state.stardust < 100}
                                        className={`p-6 rounded-xl border-2 transition-all ${progression.state.stardust >= 100
                                            ? 'bg-purple-500/20 border-purple-400 hover:bg-purple-500/30'
                                            : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="text-4xl mb-2">✨</div>
                                        <div className="text-white font-bold mb-1">Donate 100 Stardust</div>
                                        <div className="text-white/60 text-sm">+50 Guild Points</div>
                                    </button>

                                    <button
                                        onClick={() => handleContribute('daily')}
                                        className="p-6 rounded-xl border-2 bg-purple-500/20 border-purple-400 hover:bg-purple-500/30 transition-all"
                                    >
                                        <div className="text-4xl mb-2">🎯</div>
                                        <div className="text-white font-bold mb-1">Complete Daily Activity</div>
                                        <div className="text-white/60 text-sm">+25 Guild Points</div>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                                <div className="text-white font-bold mb-4">Your Contributions</div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-purple-300 text-2xl font-bold">{contributions.stardust}</div>
                                        <div className="text-white/60 text-sm">Stardust</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-purple-300 text-2xl font-bold">{contributions.challenges}</div>
                                        <div className="text-white/60 text-sm">Challenges</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-purple-300 text-2xl font-bold">{contributions.xp}</div>
                                        <div className="text-white/60 text-sm">XP Earned</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                                <div className="text-white font-bold mb-4">Top Contributors This Week</div>
                                <div className="space-y-2">
                                    {guild.members
                                        .sort((a, b) => b.contributions - a.contributions)
                                        .slice(0, 5)
                                        .map((member, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-white/60 font-bold w-6">#{i + 1}</div>
                                                    <div className="text-lg">{member.avatar}</div>
                                                    <div className="text-white">{member.name}</div>
                                                </div>
                                                <div className="text-purple-300 font-bold">
                                                    {member.contributions.toLocaleString()} pts
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper component
function StatCard({ label, value }: { label: string; value: string | number }): JSX.Element {
    return (
        <div className="bg-white/5 rounded-lg p-4 border border-purple-400/20 text-center">
            <div className="text-white text-2xl font-bold">{value}</div>
            <div className="text-white/60 text-sm">{label}</div>
        </div>
    );
}

export default GuildPanel;
