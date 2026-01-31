// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Discovery Log / Journal Panel (Batch 1: World & Exploration)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Panel } from './Panel';
import { useExplorationContext } from '@/contexts/GameContext';
import { PenLine, Save, X as CloseIcon, Book } from 'lucide-react';
import {
  BIOMES,
  POINTS_OF_INTEREST,
  LANDMARKS,
  TIME_SECRETS,
  type TimeSecret,
} from '@/constants/world';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TabType = 'biomes' | 'pois' | 'landmarks' | 'secrets' | 'journal';

interface JournalEntry {
  id: string;
  discoveryId: string;
  discoveryType: 'biome' | 'poi' | 'landmark' | 'secret';
  discoveryName: string;
  discoveryIcon: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

const JOURNAL_STORAGE_KEY = 'avestella_journal_entries';

interface DiscoveryLogProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Biome Descriptions (not in type, so we define them here)
// ─────────────────────────────────────────────────────────────────────────────

const BIOME_DESCRIPTIONS: Record<string, string> = {
  crystal_caves: 'Shimmering caverns filled with luminescent crystals.',
  twilight_forest: 'An ancient forest where twilight never ends.',
  aurora_plains: 'Vast plains under eternal dancing lights.',
  starfall_desert: 'Golden sands where stars fall from the sky.',
  mystic_shores: 'Magical beaches with glowing tides.',
  void_expanse: 'The dark edge of reality where light fades.',
};

const POI_DESCRIPTIONS: Record<string, string> = {
  shrine: 'A sacred place of power and mystery.',
  ruins: 'Ancient structures from a forgotten age.',
  viewpoint: 'A scenic overlook with breathtaking views.',
  pool: 'Mystical waters with strange properties.',
  constellation: 'A pattern of stars made manifest.',
  secret: 'A hidden location waiting to be discovered.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  active: boolean;
  count: { discovered: number; total: number };
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, active, count, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
      ${active
        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
      }
    `}
  >
    <span>{label}</span>
    <span className={`ml-1 text-xs ${active ? 'text-purple-200' : 'text-gray-500'}`}>
      ({count.discovered}/{count.total})
    </span>
  </button>
);

interface DiscoveryCardProps {
  name: string;
  description: string;
  discovered: boolean;
  icon: string;
  color: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
}

const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  name,
  description,
  discovered,
  icon,
  color,
  rarity = 'common',
}) => {
  const rarityColors = {
    common: 'border-gray-500/30',
    uncommon: 'border-green-500/30',
    rare: 'border-blue-500/30',
    legendary: 'border-yellow-500/30',
  };

  const rarityGlow = {
    common: '',
    uncommon: 'shadow-green-500/20',
    rare: 'shadow-blue-500/20',
    legendary: 'shadow-yellow-500/30',
  };

  return (
    <div
      className={`
        relative p-3 rounded-xl border-2 transition-all duration-300
        ${discovered
          ? `bg-white/5 ${rarityColors[rarity]} shadow-lg ${rarityGlow[rarity]}`
          : 'bg-black/30 border-white/10 opacity-50'
        }
      `}
    >
      {/* Lock overlay for undiscovered */}
      {!discovered && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <span className="text-3xl">🔒</span>
        </div>
      )}

      {/* Icon */}
      <div
        className="text-3xl mb-2"
        style={{ filter: discovered ? 'none' : 'grayscale(1)' }}
      >
        {icon}
      </div>

      {/* Name */}
      <h4
        className={`font-bold text-sm mb-1 ${discovered ? 'text-white' : 'text-gray-500'}`}
        style={{ color: discovered ? color : undefined }}
      >
        {discovered ? name : '???'}
      </h4>

      {/* Description */}
      <p className="text-xs text-gray-400 line-clamp-2">
        {discovered ? description : 'Undiscovered location...'}
      </p>

      {/* Rarity badge */}
      {discovered && rarity !== 'common' && (
        <div className={`
          absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
          ${rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' : ''}
          ${rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' : ''}
          ${rarity === 'uncommon' ? 'bg-green-500/20 text-green-400' : ''}
        `}>
          {rarity}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const DiscoveryLog: React.FC<DiscoveryLogProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('biomes');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const exploration = useExplorationContext();

  // Load journal entries from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(JOURNAL_STORAGE_KEY);
      if (saved) {
        setJournalEntries(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load journal entries:', e);
    }
  }, []);

  // Save journal entries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journalEntries));
    } catch (e) {
      console.error('Failed to save journal entries:', e);
    }
  }, [journalEntries]);

  const addOrUpdateNote = useCallback((entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    setJournalEntries(prev => {
      const existing = prev.find(e => e.discoveryId === entry.discoveryId);
      if (existing) {
        return prev.map(e => e.discoveryId === entry.discoveryId ? {
          ...e,
          note: entry.note,
          updatedAt: now
        } : e);
      }
      return [...prev, {
        ...entry,
        id: `journal_${now}`,
        createdAt: now,
        updatedAt: now
      }];
    });
    setEditingEntry(null);
  }, []);

  const deleteNote = useCallback((discoveryId: string) => {
    setJournalEntries(prev => prev.filter(e => e.discoveryId !== discoveryId));
  }, []);

  const getNote = useCallback((discoveryId: string) => {
    return journalEntries.find(e => e.discoveryId === discoveryId)?.note || '';
  }, [journalEntries]);

  // Calculate counts for each category
  const counts = useMemo(() => ({
    biomes: {
      discovered: exploration.discoveredBiomes.length,
      total: BIOMES.length,
    },
    pois: {
      discovered: exploration.discoveredPOIs.filter(
        id => POINTS_OF_INTEREST.find(p => p.id === id)?.type !== 'secret'
      ).length,
      total: POINTS_OF_INTEREST.filter(p => p.type !== 'secret').length,
    },
    landmarks: {
      discovered: exploration.discoveredLandmarks.length,
      total: LANDMARKS.length,
    },
    secrets: {
      discovered:
        exploration.discoveredPOIs.filter(
          id => POINTS_OF_INTEREST.find(p => p.id === id)?.type === 'secret'
        ).length + exploration.discoveredTimeSecrets.length,
      total: POINTS_OF_INTEREST.filter(p => p.type === 'secret').length + TIME_SECRETS.length,
    },
    journal: {
      discovered: journalEntries.length,
      total: exploration.discoveredBiomes.length + exploration.discoveredPOIs.length + exploration.discoveredLandmarks.length
    }
  }), [exploration, journalEntries]);

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'biomes':
        return (
          <div className="grid grid-cols-2 gap-3">
            {BIOMES.map(biome => (
              <DiscoveryCard
                key={biome.id}
                name={biome.name}
                description={BIOME_DESCRIPTIONS[biome.id] || 'A unique region of the world.'}
                discovered={exploration.discoveredBiomes.includes(biome.id)}
                icon={getBiomeIcon(biome.id)}
                color={biome.color}
                rarity="common"
              />
            ))}
          </div>
        );

      case 'pois':
        return (
          <div className="grid grid-cols-2 gap-3">
            {POINTS_OF_INTEREST.filter(p => p.type !== 'secret').map(poi => (
              <DiscoveryCard
                key={poi.id}
                name={poi.name}
                description={POI_DESCRIPTIONS[poi.type] || 'An interesting location to explore.'}
                discovered={exploration.discoveredPOIs.includes(poi.id)}
                icon={getPOIIcon(poi.type)}
                color={getPOIColor(poi.type)}
                rarity={poi.type === 'shrine' ? 'uncommon' : 'common'}
              />
            ))}
          </div>
        );

      case 'landmarks':
        return (
          <div className="grid grid-cols-2 gap-3">
            {LANDMARKS.map(landmark => (
              <DiscoveryCard
                key={landmark.id}
                name={landmark.name}
                description={landmark.description}
                discovered={exploration.discoveredLandmarks.includes(landmark.id)}
                icon={landmark.icon}
                color={landmark.glow}
                rarity="rare"
              />
            ))}
          </div>
        );

      case 'secrets':
        return (
          <div className="space-y-4">
            {/* Secret POIs */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Hidden Locations</h3>
              <div className="grid grid-cols-2 gap-3">
                {POINTS_OF_INTEREST.filter(p => p.type === 'secret').map(poi => (
                  <DiscoveryCard
                    key={poi.id}
                    name={poi.name}
                    description={POI_DESCRIPTIONS.secret}
                    discovered={exploration.discoveredPOIs.includes(poi.id)}
                    icon="✨"
                    color="#a855f7"
                    rarity="rare"
                  />
                ))}
              </div>
            </div>

            {/* Time Secrets */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Time-Locked Secrets</h3>
              <div className="grid grid-cols-2 gap-3">
                {TIME_SECRETS.map(secret => (
                  <TimeSecretCard
                    key={secret.id}
                    secret={secret}
                    discovered={exploration.discoveredTimeSecrets.includes(secret.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'journal':
        // Build list of all discovered items with notes
        const allDiscoveries: { id: string; name: string; icon: string; type: 'biome' | 'poi' | 'landmark' | 'secret' }[] = [];

        BIOMES.filter(b => exploration.discoveredBiomes.includes(b.id)).forEach(b => {
          allDiscoveries.push({ id: b.id, name: b.name, icon: getBiomeIcon(b.id), type: 'biome' });
        });

        POINTS_OF_INTEREST.filter(p => exploration.discoveredPOIs.includes(p.id)).forEach(p => {
          allDiscoveries.push({ id: p.id, name: p.name, icon: getPOIIcon(p.type), type: p.type === 'secret' ? 'secret' : 'poi' });
        });

        LANDMARKS.filter(l => exploration.discoveredLandmarks.includes(l.id)).forEach(l => {
          allDiscoveries.push({ id: l.id, name: l.name, icon: l.icon, type: 'landmark' });
        });

        if (allDiscoveries.length === 0) {
          return (
            <div className="text-center py-12">
              <Book className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <p className="text-white/50">No discoveries yet!</p>
              <p className="text-white/30 text-sm mt-2">Explore the world to add entries to your journal.</p>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {allDiscoveries.map(discovery => {
              const note = getNote(discovery.id);
              const isEditing = editingEntry === discovery.id;

              return (
                <div
                  key={discovery.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{discovery.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white">{discovery.name}</h4>
                        <span className="text-xs text-white/40 capitalize">{discovery.type}</span>
                      </div>

                      {isEditing ? (
                        <div className="mt-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Write your thoughts about this discovery..."
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-purple-500/50 text-sm"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => {
                                addOrUpdateNote({
                                  discoveryId: discovery.id,
                                  discoveryType: discovery.type,
                                  discoveryName: discovery.name,
                                  discoveryIcon: discovery.icon,
                                  note: editText
                                });
                              }}
                              className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingEntry(null);
                                setEditText('');
                              }}
                              className="flex items-center gap-1 px-3 py-1 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors"
                            >
                              <CloseIcon className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : note ? (
                        <div className="mt-2">
                          <p className="text-white/70 text-sm italic">&quot;{note}&quot;</p>
                          <button
                            onClick={() => {
                              setEditingEntry(discovery.id);
                              setEditText(note);
                            }}
                            className="mt-2 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                          >
                            <PenLine className="w-3 h-3" />
                            Edit Note
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingEntry(discovery.id);
                            setEditText('');
                          }}
                          className="mt-2 flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
                        >
                          <PenLine className="w-3 h-3" />
                          Add Note
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <Panel
      title="📖 Discovery Journal"
      icon="📖"
    >
      <div className="space-y-4">
        {/* Exploration Progress Bar */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">World Exploration</span>
            <span className="text-sm font-bold text-purple-400">
              {exploration.explorationPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${exploration.explorationPercentage}%` }}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <TabButton
            label="🌍 Biomes"
            active={activeTab === 'biomes'}
            count={counts.biomes}
            onClick={() => setActiveTab('biomes')}
          />
          <TabButton
            label="📍 Places"
            active={activeTab === 'pois'}
            count={counts.pois}
            onClick={() => setActiveTab('pois')}
          />
          <TabButton
            label="🏛️ Landmarks"
            active={activeTab === 'landmarks'}
            count={counts.landmarks}
            onClick={() => setActiveTab('landmarks')}
          />
          <TabButton
            label="✨ Secrets"
            active={activeTab === 'secrets'}
            count={counts.secrets}
            onClick={() => setActiveTab('secrets')}
          />
          <TabButton
            label="📝 Journal"
            active={activeTab === 'journal'}
            count={counts.journal}
            onClick={() => setActiveTab('journal')}
          />
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {renderContent()}
        </div>
      </div>
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Time Secret Card (special variant)
// ─────────────────────────────────────────────────────────────────────────────

interface TimeSecretCardProps {
  secret: TimeSecret;
  discovered: boolean;
}

const TimeSecretCard: React.FC<TimeSecretCardProps> = ({ secret, discovered }) => {
  const formatTimeRange = (values: number[]) => {
    if (values.length === 0) return 'Unknown';
    if (values.length === 1) return formatHour(values[0]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return `${formatHour(min)} - ${formatHour(max + 1)}`;
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  return (
    <div
      className={`
        relative p-3 rounded-xl border-2 transition-all duration-300
        ${discovered
          ? 'bg-gradient-to-br from-yellow-500/10 to-purple-500/10 border-yellow-500/30 shadow-lg shadow-yellow-500/20'
          : 'bg-black/30 border-white/10 opacity-50'
        }
      `}
    >
      {/* Lock overlay */}
      {!discovered && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <span className="text-3xl">🔒</span>
        </div>
      )}

      {/* Icon */}
      <div className="text-3xl mb-2">
        {discovered ? '⏰' : '❓'}
      </div>

      {/* Name */}
      <h4 className={`font-bold text-sm mb-1 ${discovered ? 'text-yellow-400' : 'text-gray-500'}`}>
        {discovered ? secret.name : '???'}
      </h4>

      {/* Time hint */}
      <p className="text-xs text-gray-400">
        {discovered
          ? `Active: ${formatTimeRange(secret.timeCondition.values)}`
          : 'Only appears at certain times...'
        }
      </p>

      {/* Legendary badge */}
      {discovered && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-400">
          legendary
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getBiomeIcon(biomeId: string): string {
  const icons: Record<string, string> = {
    starlight_meadow: '🌟',
    crystal_caves: '💎',
    nebula_forest: '🌲',
    aurora_peaks: '🏔️',
    void_depths: '🌑',
    radiant_shores: '🌊',
  };
  return icons[biomeId] || '🌍';
}

function getPOIIcon(type: string): string {
  const icons: Record<string, string> = {
    beacon: '🗼',
    temple: '🏛️',
    grove: '🌳',
    well: '⛲',
    shrine: '⛩️',
    secret: '✨',
  };
  return icons[type] || '📍';
}

function getPOIColor(type: string): string {
  const colors: Record<string, string> = {
    beacon: '#3b82f6',
    temple: '#a855f7',
    grove: '#22c55e',
    well: '#06b6d4',
    shrine: '#f97316',
    secret: '#f59e0b',
  };
  return colors[type] || '#9ca3af';
}

function getLandmarkIcon(type: string): string {
  const icons: Record<string, string> = {
    tower: '🗼',
    mountain: '⛰️',
    tree: '🌳',
    gate: '🚪',
    crystal: '💎',
    statue: '🗿',
  };
  return icons[type] || '🏛️';
}

export default DiscoveryLog;
