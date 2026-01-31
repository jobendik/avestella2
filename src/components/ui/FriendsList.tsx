// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Friends List Panel (Batch 3: Communication)
// Manage friends, blocked players, and recent encounters
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { MessageCircle, X, Send, Gift } from 'lucide-react';
import SendGiftModal from './SendGiftModal';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerInteraction {
  playerId: string;
  playerName: string;
  playerColor: string;
  timestamp: number;
  interactionType: 'friend' | 'blocked' | 'recent';
  isOnline?: boolean;
  lastSeen?: number;
}

interface FriendsListProps {
  isOpen: boolean;
  onClose: () => void;
  friends: PlayerInteraction[];
  blocked: PlayerInteraction[];
  recentPlayers: PlayerInteraction[];
  onRemoveFriend: (playerId: string) => void;
  onUnblock: (playerId: string) => void;
  onAddFriend: (playerId: string) => void;
  onBlock: (playerId: string) => void;
  onViewProfile: (playerId: string) => void;
  onSendMessage: (playerId: string) => void;
}

type TabType = 'friends' | 'blocked' | 'recent';

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

// ─────────────────────────────────────────────────────────────────────────────
// Tab Button Component
// ─────────────────────────────────────────────────────────────────────────────

interface TabButtonProps {
  icon: string;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  icon,
  label,
  count,
  isActive,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`
      flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium
      transition-all duration-200 border-b-2
      ${isActive
        ? 'text-purple-400 border-purple-500 bg-purple-500/10'
        : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
      }
    `}
  >
    <span>{icon}</span>
    <span>{label}</span>
    {count > 0 && (
      <span className={`
        px-1.5 py-0.5 text-xs rounded-full
        ${isActive ? 'bg-purple-500/30 text-purple-300' : 'bg-gray-700 text-gray-400'}
      `}>
        {count}
      </span>
    )}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Player Row Component
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerRowProps {
  player: PlayerInteraction;
  type: TabType;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onGiftAction?: () => void;
  onViewProfile: () => void;
}

const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  type,
  onPrimaryAction,
  onSecondaryAction,
  onGiftAction,
  onViewProfile,
}) => {
  const [showActions, setShowActions] = useState(false);

  const actions = useMemo(() => {
    switch (type) {
      case 'friends':
        return {
          primary: { icon: '💬', label: 'Message', action: onPrimaryAction },
          secondary: { icon: '💔', label: 'Remove', action: onSecondaryAction },
          gift: { icon: '🎁', label: 'Gift', action: onGiftAction },
        };
      case 'blocked':
        return {
          primary: { icon: '✓', label: 'Unblock', action: onPrimaryAction },
          secondary: null,
        };
      case 'recent':
        return {
          primary: { icon: '💜', label: 'Add Friend', action: onPrimaryAction },
          secondary: { icon: '🚫', label: 'Block', action: onSecondaryAction },
        };
      default:
        return { primary: null, secondary: null };
    }
  }, [type, onPrimaryAction, onSecondaryAction, onGiftAction]);

  return (
    <div
      className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
      onClick={() => setShowActions(!showActions)}
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className="w-10 h-10 rounded-full"
          style={{
            background: `radial-gradient(circle, ${player.playerColor} 0%, ${player.playerColor}60 70%, transparent 100%)`,
            boxShadow: `0 0 10px ${player.playerColor}40`,
          }}
        />
        {/* Online indicator */}
        {player.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium truncate">
            {player.playerName}
          </span>
          {player.isOnline && (
            <span className="text-xs text-green-400">Online</span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {player.isOnline ? 'Playing now' : formatLastSeen(player.lastSeen || player.timestamp)}
        </span>
      </div>

      {/* Quick Actions */}
      {!showActions ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile();
          }}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          👤
        </button>
      ) : (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {actions.primary && (
            <button
              onClick={actions.primary.action}
              className="px-2 py-1 text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded transition-colors"
            >
              {actions.primary.icon} {actions.primary.label}
            </button>
          )}
          {actions.secondary && (
            <button
              onClick={actions.secondary.action}
              className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-gray-300 rounded transition-colors"
            >
              {actions.secondary.icon}
            </button>
          )}
          {/* @ts-ignore - 'gift' property exists on actions derived in useMemo but Typescript doesn't infer it on the general return type yet */}
          {actions.gift && (
            <button
              onClick={actions.gift.action}
              className="px-2 py-1 text-xs bg-pink-500/20 hover:bg-pink-500/40 text-pink-300 rounded transition-colors"
              title="Send Gift"
            >
              {actions.gift.icon}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Empty State Component
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  type: TabType;
}

const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  const content = {
    friends: {
      icon: '💜',
      title: 'No friends yet',
      description: 'Tap on players to add them as friends!',
    },
    blocked: {
      icon: '🚫',
      title: 'No blocked players',
      description: 'Players you block will appear here.',
    },
    recent: {
      icon: '👋',
      title: 'No recent encounters',
      description: 'Players you meet will appear here.',
    },
  };

  const { icon, title, description } = content[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <h3 className="text-white font-medium mb-1">{title}</h3>
      <p className="text-gray-500 text-sm max-w-48">{description}</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const FriendsList: React.FC<FriendsListProps> = ({
  isOpen,
  onClose,
  friends,
  blocked,
  recentPlayers,
  onRemoveFriend,
  onUnblock,
  onAddFriend,
  onBlock,
  onViewProfile,
  onSendMessage,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [giftModalInfo, setGiftModalInfo] = useState<{ isOpen: boolean; friendId: string | null }>({
    isOpen: false,
    friendId: null
  });

  // Sort friends: online first, then by last seen
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return (b.lastSeen || b.timestamp) - (a.lastSeen || a.timestamp);
    });
  }, [friends]);

  // Filter players based on search
  const filteredPlayers = useMemo(() => {
    let players: PlayerInteraction[] = [];

    switch (activeTab) {
      case 'friends':
        players = sortedFriends;
        break;
      case 'blocked':
        players = blocked;
        break;
      case 'recent':
        players = recentPlayers;
        break;
    }

    if (!searchQuery.trim()) return players;

    const query = searchQuery.toLowerCase();
    return players.filter(p =>
      p.playerName.toLowerCase().includes(query)
    );
  }, [activeTab, sortedFriends, blocked, recentPlayers, searchQuery]);

  // Online friends count
  const onlineFriendsCount = useMemo(() =>
    friends.filter(f => f.isOnline).length,
    [friends]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] bg-slate-900/95 rounded-t-2xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Friends</h2>
            {onlineFriendsCount > 0 && (
              <p className="text-xs text-green-400">
                {onlineFriendsCount} friend{onlineFriendsCount !== 1 ? 's' : ''} online
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <TabButton
            icon="💜"
            label="Friends"
            count={friends.length}
            isActive={activeTab === 'friends'}
            onClick={() => setActiveTab('friends')}
          />
          <TabButton
            icon="🚫"
            label="Blocked"
            count={blocked.length}
            isActive={activeTab === 'blocked'}
            onClick={() => setActiveTab('blocked')}
          />
          <TabButton
            icon="👋"
            label="Recent"
            count={recentPlayers.length}
            isActive={activeTab === 'recent'}
            onClick={() => setActiveTab('recent')}
          />
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-black/30 text-white placeholder-gray-500 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredPlayers.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-8 text-gray-500">
                No players found for "{searchQuery}"
              </div>
            ) : (
              <EmptyState type={activeTab} />
            )
          ) : (
            <div className="space-y-1">
              {filteredPlayers.map(player => (
                <PlayerRow
                  key={player.playerId}
                  player={player}
                  type={activeTab}
                  onPrimaryAction={() => {
                    switch (activeTab) {
                      case 'friends':
                        onSendMessage(player.playerId);
                        break;
                      case 'blocked':
                        onUnblock(player.playerId);
                        break;
                      case 'recent':
                        onAddFriend(player.playerId);
                        break;
                    }
                  }}
                  onSecondaryAction={() => {
                    switch (activeTab) {
                      case 'friends':
                        onRemoveFriend(player.playerId);
                        break;
                      case 'recent':
                        onBlock(player.playerId);
                        break;
                    }
                  }}
                  onViewProfile={() => onViewProfile(player.playerId)}
                  onGiftAction={() => setGiftModalInfo({ isOpen: true, friendId: player.playerId })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer Tip */}
        <div className="p-3 border-t border-white/5 bg-black/20">
          <p className="text-xs text-gray-500 text-center">
            💡 Tap players in-game to add them as friends
          </p>
        </div>
      </div>

      {/* Gift Modal */}
      <SendGiftModal
        isOpen={giftModalInfo.isOpen}
        onClose={() => setGiftModalInfo({ isOpen: false, friendId: null })}
        friend={friends.find(f => f.playerId === giftModalInfo.friendId) ? {
          id: giftModalInfo.friendId!,
          name: friends.find(f => f.playerId === giftModalInfo.friendId)!.playerName,
          avatar: '👤', // Default or need to map from interaction
          level: 1, // Default
          online: friends.find(f => f.playerId === giftModalInfo.friendId)!.isOnline || false,
          stardust: 0
        } : null}
      />
    </div>
  );
};

export default FriendsList;
