import React, { useState, useEffect } from 'react';

interface AdminStats {
    players: {
        total: number;
        active24h: number;
    };
    content: {
        echoes: number;
        messages: number;
        litStars: number;
        friendships: number;
    };
    dbStatus: {
        connected: boolean;
        type: string;
    };
}

export function AdminDashboard() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [secret, setSecret] = useState('');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const checkAdmin = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'x-admin-key': secret }
            });

            if (res.status === 401) {
                setError('Invalid Secret Key');
                return;
            }

            const data = await res.json();
            setStats(data);
            setIsAdmin(true);
            // Save secret to session storage for refresh persistence
            sessionStorage.setItem('admin_secret', secret);
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Auto-login if previously authenticated in session
        const saved = sessionStorage.getItem('admin_secret');
        if (saved) {
            setSecret(saved);
            // We can't immediately call checkAdmin here easily due to closure on stale state, 
            // but we can just let the user click login or trigger it via effect dependency if we structured differently.
            // For simplicity, just pre-fill.
        }
    }, []);

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4 font-mono">
                <h1 className="text-3xl mb-8 text-purple-400">AURA SYSTEM CONTROL</h1>
                <div className="w-full max-w-md bg-neutral-800 p-8 rounded-lg border border-purple-500/20 shadow-2xl">
                    <label className="block text-sm text-neutral-400 mb-2">ENTER ADMIN CREDENTIALS</label>
                    <input
                        type="password"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        className="w-full bg-black/50 border border-neutral-600 rounded p-3 mb-4 focus:border-purple-500 outline-none text-center tracking-widest"
                        placeholder="SECRET KEY"
                        onKeyDown={(e) => e.key === 'Enter' && checkAdmin()}
                    />
                    <button
                        onClick={checkAdmin}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded font-bold transition-colors disabled:opacity-50"
                    >
                        {loading ? 'ACCESSING...' : 'AUTHENTICATE'}
                    </button>
                    {error && <div className="mt-4 text-red-400 text-center text-sm">❌ {error}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-green-400 p-8 font-mono">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-12 border-b border-green-500/30 pb-4">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">SYSTEM DASHBOARD</h1>
                        <div className="text-sm opacity-60">STATUS: ONLINE | DB: {stats?.dbStatus.connected ? 'CONNECTED' : 'DISCONNECTED'}</div>
                    </div>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem('admin_secret');
                            setIsAdmin(false);
                            setSecret('');
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                    >
                        [LOGOUT]
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard label="TOTAL PLAYERS" value={stats?.players.total} icon="👤" />
                    <StatCard label="ACTIVE (24H)" value={stats?.players.active24h} icon="🟢" highlight />
                    <StatCard label="ECHOES" value={stats?.content.echoes} icon="📢" />
                    <StatCard label="TOTAL MESSAGES" value={stats?.content.messages} icon="💬" />
                    <StatCard label="STARS LIT" value={stats?.content.litStars} icon="⭐" color="text-yellow-400" />
                    <StatCard label="FRIENDSHIPS" value={stats?.content.friendships} icon="🤝" />
                </div>

                <div className="text-center mt-20 opacity-30 text-xs">
                    AVESTELLA ADMIN INTERFACE v1.0
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, highlight, color = 'text-green-400' }: any) {
    return (
        <div className={`bg-neutral-900 border ${highlight ? 'border-green-500' : 'border-neutral-800'} p-6 rounded relative overflow-hidden`}>
            <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-neutral-500">{label}</div>
                <div className="text-2xl opacity-20">{icon}</div>
            </div>
            <div className={`text-4xl font-bold ${color}`}>
                {typeof value === 'number' ? value.toLocaleString() : '-'}
            </div>
        </div>
    );
}
