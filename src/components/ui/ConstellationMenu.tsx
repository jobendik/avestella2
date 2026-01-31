
import React, { useState, useEffect } from 'react';
import { X, Star, Plus, Users, Shield, Zap } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { useServerConstellations, ServerConstellation } from '@/hooks/useServerConstellations';
import { useGame } from '@/contexts/GameContext';

type Tab = 'my-constellations' | 'create' | 'browser';

export function ConstellationMenu(): JSX.Element | null {
    const { activePanel, closePanel } = useUI();
    const {
        playerConstellations,
        potentialConstellations,
        formConstellation,
        expandConstellation,
        checkPotentialConstellations,
        loading
    } = useServerConstellations();

    const [activeTab, setActiveTab] = useState<Tab>('my-constellations');
    const [selectedConstellation, setSelectedConstellation] = useState<ServerConstellation | null>(null);
    const [selectedPotential, setSelectedPotential] = useState<number | null>(null);

    useEffect(() => {
        if (activePanel === 'guild') { // Reusing 'guild' panel ID for now
            checkPotentialConstellations();
        }
    }, [activePanel, checkPotentialConstellations]);

    if (activePanel !== 'guild') return null;

    const handleForm = () => {
        if (selectedPotential === null) return;
        const potential = potentialConstellations[selectedPotential];

        formConstellation({
            playerIds: potential.playerIds,
            starMemoryIds: potential.starMemoryIds,
            realmId: potential.realmId, // Should default to current?
            name: `Constellation of ${potential.playerIds.length} Stars`
        });
        // Reset
        setSelectedPotential(null);
        setActiveTab('my-constellations');
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl w-full bg-slate-900/90 border border-slate-700 rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Star className="w-6 h-6 text-indigo-400" fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Constellations</h2>
                            <p className="text-slate-400 text-sm">Form bonds to create persistent star groups</p>
                        </div>
                    </div>
                    <button onClick={() => closePanel()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-4 gap-2 border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('my-constellations')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'my-constellations' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        My Constellations ({playerConstellations.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        Formation ({potentialConstellations.length})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">

                    {/* MY CONSTELLATIONS */}
                    {activeTab === 'my-constellations' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {playerConstellations.length === 0 ? (
                                <div className="col-span-2 text-center py-12 text-slate-500">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>You haven't formed any constellations yet.</p>
                                    <button onClick={() => setActiveTab('create')} className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium">
                                        Check for potential formations
                                    </button>
                                </div>
                            ) : (
                                playerConstellations.map(c => (
                                    <div key={c.constellationId} className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{c.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.rarity === 'legendary' ? 'bg-amber-500/20 text-amber-300' :
                                                            c.rarity === 'epic' ? 'bg-purple-500/20 text-purple-300' :
                                                                c.rarity === 'rare' ? 'bg-blue-500/20 text-blue-300' :
                                                                    'bg-slate-500/20 text-slate-300'
                                                        }`}>
                                                        {c.rarity.toUpperCase()}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {c.starMemoryIds.length} Stars
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-slate-900 rounded-lg">
                                                {/* Mini visualization placeholder */}
                                                <div className="w-8 h-8 flex items-center justify-center">
                                                    <Star className="w-4 h-4 text-indigo-400" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Members</div>
                                            <div className="flex flex-wrap gap-1">
                                                {c.playerIds.map(pid => (
                                                    <div key={pid} className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">
                                                        {pid.substring(0, 2)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white transition-colors">
                                                View Details
                                            </button>
                                            {/* Future: View on Sky */}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* FORMATION */}
                    {activeTab === 'create' && (
                        <div className="space-y-6">
                            <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl">
                                <h3 className="font-bold text-indigo-300 mb-1 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Ready to Form
                                </h3>
                                <p className="text-sm text-indigo-200/70">
                                    Constellations are formed from groups of 3+ Sealed Bonds (Star Memories).
                                </p>
                            </div>

                            {loading ? (
                                <div className="text-center py-8 text-slate-500">Scanning star maps...</div>
                            ) : potentialConstellations.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <div className="text-4xl mb-2">🌑</div>
                                    <p>No potential constellations found.</p>
                                    <p className="text-sm mt-2 opacity-60">Bond with more players to create new stars.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {potentialConstellations.map((pc, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedPotential(idx)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedPotential === idx
                                                    ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500'
                                                    : 'bg-slate-800 border-slate-700 hover:bg-slate-750'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-white flex items-center gap-2">
                                                        <span>Potential {pc.estimatedRarity} Constellation</span>
                                                        {selectedPotential === idx && <span className="bg-indigo-500 text-white text-[10px] px-2 rounded-full">Selected</span>}
                                                    </div>
                                                    <div className="text-sm text-slate-400 mt-1">
                                                        Connects {pc.playerIds.length} players using {pc.starMemoryIds.length} stars
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-500">Reward Preview</div>
                                                    <div className="text-amber-400 font-mono font-bold">
                                                        +{pc.starMemoryIds.length * 100} Stardust
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedPotential !== null && (
                                <div className="flex justify-end pt-4 border-t border-slate-700">
                                    <button
                                        onClick={handleForm}
                                        className="px-6 py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20"
                                    >
                                        Ignite Constellation
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default ConstellationMenu;
