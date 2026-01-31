// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Cosmos Panel (LEGACY-style Social Panel)
// Shows Nearby players, Friends, and Recent encounters
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback } from 'react';
import { X, Users, MessageCircle, UserPlus, Ban, Radio, Sparkles, Clock, MapPin } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { useGame } from '@/contexts/GameContext';
import { useSocialContext } from '@/contexts/GameContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface NearbyPlayer {
  id: string;
  name: string;
  hue: number;
  level: number;
  distance: number;
  status: 'singing' | 'pulsing' | 'drifting';
  bondProgress?: number; // 0-100
  isOnline: boolean;
}

interface FriendPlayer {
  id: string;
  name: string;
  hue: number;
  level: number;
  isOnline: boolean;
  lastSeen?: number;
  location?: string;
}

interface RecentPlayer {
  id: string;
  name: string;
  hue: number;
  level: number;
  timestamp: number;
  interactionType: 'pulsed' | 'bonded' | 'passed';
}

type TabType = 'nearby' | 'friends' | 'recent';

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

const formatLastSeen = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return 'Long ago';
};

const getStatusIcon = (status: string): JSX.Element => {
  switch (status) {
    case 'singing':
      return <Sparkles size={12} className="text-yellow-400" />;
    case 'pulsing':
      return <Radio size={12} className="text-cyan-400 animate-pulse" />;
    case 'drifting':
    default:
      return <span className="text-gray-400 text-xs">●</span>;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'singing': return 'Singing';
    case 'pulsing': return 'Pulsing';
    case 'drifting': return 'Drifting';
    default: return 'Nearby';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab Button Component
// ─────────────────────────────────────────────────────────────────────────────

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, count, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium
      transition-all duration-200 border-b-2
      ${isActive
        ? 'text-cyan-400 border-cyan-500 bg-cyan-500/10'
        : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
      }
    `}
  >
    {icon}
    <span>{label}</span>
    {count > 0 && (
      <span className={`
        px-1.5 py-0.5 text-[10px] rounded-full min-w-[18px]
        ${isActive ? 'bg-cyan-500/30 text-cyan-300' : 'bg-gray-700 text-gray-400'}
      `}>
        {count > 99 ? '99+' : count}
      </span>
    )}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Nearby Player Row (with bond bar like LEGACY)
// ─────────────────────────────────────────────────────────────────────────────

interface NearbyRowProps {
  player: NearbyPlayer;
  onViewProfile: () => void;
  onWhisper: () => void;
  onAddFriend: () => void;
}

const NearbyRow: React.FC<NearbyRowProps> = ({ player, onViewProfile, onWhisper, onAddFriend }) => (
  <div 
    className="group px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer"
    onClick={onViewProfile}
  >
    <div className="flex items-center gap-3">
      {/* Player orb with status */}
      <div className="relative">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ 
            background: `radial-gradient(circle, hsla(${player.hue}, 70%, 50%, 0.3), hsla(${player.hue}, 70%, 30%, 0.8))`,
            boxShadow: `0 0 10px hsla(${player.hue}, 70%, 50%, 0.4), inset 0 0 8px hsla(${player.hue}, 70%, 70%, 0.2)`
          }}
        >
          <div 
            className="w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: `hsl(${player.hue}, 70%, 60%)`,
              boxShadow: `0 0 6px hsla(${player.hue}, 70%, 60%, 0.8)`
            }}
          />
        </div>
        {/* Status indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 bg-gray-900 rounded-full p-0.5">
          {getStatusIcon(player.status)}
        </div>
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{player.name}</span>
          <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
            Lv {player.level}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-500">{getStatusLabel(player.status)}</span>
          <span className="text-[10px] text-gray-600">•</span>
          <span className="text-[10px] text-gray-500">{Math.round(player.distance)}m away</span>
        </div>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onWhisper(); }}
          className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors"
          title="Whisper"
        >
          <MessageCircle size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAddFriend(); }}
          className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-colors"
          title="Add Friend"
        >
          <UserPlus size={12} />
        </button>
      </div>
    </div>

    {/* Bond progress bar (if bonded) */}
    {player.bondProgress !== undefined && player.bondProgress > 0 && (
      <div className="mt-2 ml-11">
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${player.bondProgress}%`,
              background: `linear-gradient(90deg, hsl(${player.hue}, 70%, 50%), hsl(${player.hue + 30}, 70%, 60%))`
            }}
          />
        </div>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Friend Row
// ─────────────────────────────────────────────────────────────────────────────

interface FriendRowProps {
  player: FriendPlayer;
  onViewProfile: () => void;
  onMessage: () => void;
}

const FriendRow: React.FC<FriendRowProps> = ({ player, onViewProfile, onMessage }) => (
  <div 
    className="group px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer"
    onClick={onViewProfile}
  >
    <div className="flex items-center gap-3">
      {/* Player orb with online indicator */}
      <div className="relative">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ 
            background: `radial-gradient(circle, hsla(${player.hue}, 70%, 50%, 0.3), hsla(${player.hue}, 70%, 30%, 0.8))`,
            boxShadow: player.isOnline 
              ? `0 0 12px hsla(${player.hue}, 70%, 50%, 0.6)` 
              : 'none',
            opacity: player.isOnline ? 1 : 0.6
          }}
        >
          <div 
            className="w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: `hsl(${player.hue}, 70%, 60%)`,
              boxShadow: `0 0 6px hsla(${player.hue}, 70%, 60%, 0.8)`
            }}
          />
        </div>
        {/* Online indicator */}
        {player.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
        )}
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${player.isOnline ? 'text-white' : 'text-gray-400'}`}>
            {player.name}
          </span>
          <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
            Lv {player.level}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {player.isOnline ? (
            player.location ? (
              <>
                <MapPin size={10} className="text-cyan-500" />
                <span className="text-[10px] text-cyan-500">{player.location}</span>
              </>
            ) : (
              <span className="text-[10px] text-green-400">Online</span>
            )
          ) : (
            <span className="text-[10px] text-gray-500">
              {player.lastSeen ? formatLastSeen(player.lastSeen) : 'Offline'}
            </span>
          )}
        </div>
      </div>

      {/* Message button */}
      <button
        onClick={(e) => { e.stopPropagation(); onMessage(); }}
        className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"
        title="Send Message"
      >
        <MessageCircle size={12} />
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Recent Row
// ─────────────────────────────────────────────────────────────────────────────

interface RecentRowProps {
  player: RecentPlayer;
  onViewProfile: () => void;
  onAddFriend: () => void;
}

const RecentRow: React.FC<RecentRowProps> = ({ player, onViewProfile, onAddFriend }) => {
  const getInteractionLabel = (type: string) => {
    switch (type) {
      case 'bonded': return 'Bonded with you';
      case 'pulsed': return 'Pulsed together';
      case 'passed': return 'Passed by';
      default: return 'Met';
    }
  };

  return (
    <div 
      className="group px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer"
      onClick={onViewProfile}
    >
      <div className="flex items-center gap-3">
        {/* Player orb */}
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ 
            background: `radial-gradient(circle, hsla(${player.hue}, 70%, 50%, 0.3), hsla(${player.hue}, 70%, 30%, 0.8))`,
          }}
        >
          <div 
            className="w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: `hsl(${player.hue}, 70%, 60%)`,
              boxShadow: `0 0 6px hsla(${player.hue}, 70%, 60%, 0.8)`
            }}
          />
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{player.name}</span>
            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              Lv {player.level}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock size={10} className="text-gray-500" />
            <span className="text-[10px] text-gray-500">{formatLastSeen(player.timestamp)}</span>
            <span className="text-[10px] text-gray-600">•</span>
            <span className="text-[10px] text-gray-500">{getInteractionLabel(player.interactionType)}</span>
          </div>
        </div>

        {/* Add friend button */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddFriend(); }}
          className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Add Friend"
        >
          <UserPlus size={12} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Cosmos Panel Component
// ─────────────────────────────────────────────────────────────────────────────

export function CosmosPanel(): JSX.Element {
  const { closePanel, showToast } = useUI();
  const { gameState } = useGame();
  const { friends } = useSocialContext();
  const [activeTab, setActiveTab] = useState<TabType>('nearby');

  // Get nearby players from AI agents
  const nearbyPlayers: NearbyPlayer[] = useMemo(() => {
    const state = gameState.gameState.current;
    if (!state) return [];

    const playerX = state.playerX;
    const playerY = state.playerY;
    const maxDist = 500; // Detection radius

    return (state.aiAgents || [])
      .filter((agent: any) => {
        const dx = agent.x - playerX;
        const dy = agent.y - playerY;
        return Math.sqrt(dx * dx + dy * dy) < maxDist;
      })
      .map((agent: any) => {
        const dx = agent.x - playerX;
        const dy = agent.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Determine status from agent behavior
        let status: 'singing' | 'pulsing' | 'drifting' = 'drifting';
        if (agent.isPulsing || agent.pulsePhase > 0) status = 'pulsing';
        else if (agent.isSinging) status = 'singing';

        // Get bond progress
        const bond = (state.bonds || []).find((b: any) => b.targetId === agent.id);
        const bondProgress = bond ? (bond.strength || 0) : 0;

        return {
          id: agent.id,
          name: agent.name || 'Wanderer',
          hue: agent.hue ?? Math.floor(Math.random() * 360),
          level: agent.level || 1,
          distance,
          status,
          bondProgress,
          isOnline: true
        };
      })
      .sort((a: NearbyPlayer, b: NearbyPlayer) => a.distance - b.distance)
      .slice(0, 20); // Limit to 20 nearest
  }, [gameState]);

  // Get friends (from social context)
  const friendsList: FriendPlayer[] = useMemo(() => {
    return (friends || []).map((f: any) => ({
      id: f.playerId || f.id,
      name: f.playerName || f.name || 'Friend',
      hue: parseInt(f.playerColor?.replace('#', '') || '180', 16) % 360,
      level: f.level || 1,
      isOnline: f.isOnline ?? false,
      lastSeen: f.lastSeen,
      location: f.location
    }));
  }, [friends]);

  // Get recent players (would come from game state or storage)
  const recentPlayers: RecentPlayer[] = useMemo(() => {
    // For now, return empty - this would integrate with a recent encounters system
    return [];
  }, []);

  const handleViewProfile = useCallback((playerId: string, playerName: string) => {
    showToast(`Viewing ${playerName}'s profile`, 'info');
    // TODO: Open PlayerProfileCard
  }, [showToast]);

  const handleWhisper = useCallback((playerId: string, playerName: string) => {
    showToast(`Starting whisper with ${playerName}...`, 'info');
    // TODO: Open whisper chat
  }, [showToast]);

  const handleAddFriend = useCallback((playerId: string, playerName: string) => {
    showToast(`Friend request sent to ${playerName}!`, 'success');
    // TODO: Send friend request through social context
  }, [showToast]);

  const handleMessage = useCallback((playerId: string, playerName: string) => {
    showToast(`Opening chat with ${playerName}...`, 'info');
    // TODO: Open message panel
  }, [showToast]);

  const getTabCount = (tab: TabType): number => {
    switch (tab) {
      case 'nearby': return nearbyPlayers.length;
      case 'friends': return friendsList.length;
      case 'recent': return recentPlayers.length;
      default: return 0;
    }
  };

  return (
    <div className="fixed top-20 right-4 w-80 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Cosmos</h2>
        </div>
        <button
          onClick={closePanel}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <TabButton
          icon={<MapPin size={14} />}
          label="Nearby"
          count={getTabCount('nearby')}
          isActive={activeTab === 'nearby'}
          onClick={() => setActiveTab('nearby')}
        />
        <TabButton
          icon={<Users size={14} />}
          label="Friends"
          count={getTabCount('friends')}
          isActive={activeTab === 'friends'}
          onClick={() => setActiveTab('friends')}
        />
        <TabButton
          icon={<Clock size={14} />}
          label="Recent"
          count={getTabCount('recent')}
          isActive={activeTab === 'recent'}
          onClick={() => setActiveTab('recent')}
        />
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {/* Nearby Tab */}
        {activeTab === 'nearby' && (
          nearbyPlayers.length > 0 ? (
            <div className="divide-y divide-white/5">
              {nearbyPlayers.map(player => (
                <NearbyRow
                  key={player.id}
                  player={player}
                  onViewProfile={() => handleViewProfile(player.id, player.name)}
                  onWhisper={() => handleWhisper(player.id, player.name)}
                  onAddFriend={() => handleAddFriend(player.id, player.name)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <MapPin size={32} className="mb-3 opacity-50" />
              <p className="text-sm">No one nearby</p>
              <p className="text-xs mt-1 text-gray-600">Explore to find others</p>
            </div>
          )
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          friendsList.length > 0 ? (
            <div className="divide-y divide-white/5">
              {friendsList.map(player => (
                <FriendRow
                  key={player.id}
                  player={player}
                  onViewProfile={() => handleViewProfile(player.id, player.name)}
                  onMessage={() => handleMessage(player.id, player.name)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users size={32} className="mb-3 opacity-50" />
              <p className="text-sm">No friends yet</p>
              <p className="text-xs mt-1 text-gray-600">Meet players to add friends</p>
            </div>
          )
        )}

        {/* Recent Tab */}
        {activeTab === 'recent' && (
          recentPlayers.length > 0 ? (
            <div className="divide-y divide-white/5">
              {recentPlayers.map(player => (
                <RecentRow
                  key={player.id}
                  player={player}
                  onViewProfile={() => handleViewProfile(player.id, player.name)}
                  onAddFriend={() => handleAddFriend(player.id, player.name)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Clock size={32} className="mb-3 opacity-50" />
              <p className="text-sm">No recent encounters</p>
              <p className="text-xs mt-1 text-gray-600">Your encounters will appear here</p>
            </div>
          )
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-white/5 bg-black/20">
        <p className="text-[10px] text-gray-500 text-center">
          Press <span className="text-cyan-400">Tab</span> to toggle • Click player to view profile
        </p>
      </div>
    </div>
  );
}

export default CosmosPanel;
