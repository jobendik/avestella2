// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Player Profile Card (Batch 3: Communication)
// Shows player info when tapping on another player
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { AVATAR_FRAMES } from '@/constants/cosmetics';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerData {
  id: string;
  name: string;
  level: number;
  color: string;
  equippedTrail?: string;
  equippedAura?: string;
  equippedFrame?: string;
  fragmentsCollected: number;
  playTime: number; // in seconds
  isFriend?: boolean;
  isBlocked?: boolean;
}

interface PlayerProfileCardProps {
  player: PlayerData | null;
  isOpen: boolean;
  onClose: () => void;
  onAddFriend?: (playerId: string) => void;
  onRemoveFriend?: (playerId: string) => void;
  onBlock?: (playerId: string) => void;
  onUnblock?: (playerId: string) => void;
  onSendMessage?: (playerId: string) => void;
  onFollow?: (playerId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

const formatPlayTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const getLevelTitle = (level: number): string => {
  if (level >= 50) return '✨ Master Light';
  if (level >= 40) return '🌟 Star Keeper';
  if (level >= 30) return '💫 Light Weaver';
  if (level >= 20) return '🌙 Night Walker';
  if (level >= 10) return '⭐ Spark Chaser';
  if (level >= 5) return '✦ Light Seeker';
  return '○ New Light';
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Component
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarProps {
  color: string;
  frameId?: string;
  size?: number;
}

const Avatar: React.FC<AvatarProps> = ({ color, frameId, size = 80 }) => {
  const frame = frameId ? AVATAR_FRAMES[frameId] : null;

  return (
    <div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, ${color}88 50%, transparent 70%)`,
        boxShadow: `0 0 30px ${color}60`,
      }}
    >
      {/* Inner glow */}
      <div
        className="absolute inset-2 rounded-full"
        style={{
          background: `radial-gradient(circle, white 0%, ${color} 40%, transparent 70%)`,
        }}
      />

      {/* Frame */}
      {frame && (
        <div
          className={`absolute inset-0 rounded-full ${frame.animated ? 'animate-spin-slow' : ''}`}
          style={{
            border: `${frame.borderWidth}px solid ${frame.borderColor}`,
            boxShadow: frame.glowColor ? `0 0 15px ${frame.glowColor}` : undefined,
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat Row Component
// ─────────────────────────────────────────────────────────────────────────────

interface StatRowProps {
  icon: string;
  label: string;
  value: string | number;
}

const StatRow: React.FC<StatRowProps> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
    <div className="flex items-center gap-2 text-gray-400">
      <span>{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
    <span className="text-white font-medium">{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Action Button Component
// ─────────────────────────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = 'secondary',
  disabled = false,
}) => {
  const variantClasses = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    danger: 'bg-red-600/20 hover:bg-red-600/40 text-red-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2 px-4 py-2 rounded-lg
        text-sm font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const PlayerProfileCard: React.FC<PlayerProfileCardProps> = ({
  player,
  isOpen,
  onClose,
  onAddFriend,
  onRemoveFriend,
  onBlock,
  onUnblock,
  onSendMessage,
  onFollow,
}) => {
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const handleAddFriend = useCallback(() => {
    if (player && onAddFriend) {
      onAddFriend(player.id);
    }
  }, [player, onAddFriend]);

  const handleRemoveFriend = useCallback(() => {
    if (player && onRemoveFriend) {
      onRemoveFriend(player.id);
    }
  }, [player, onRemoveFriend]);

  const handleBlock = useCallback(() => {
    if (player && onBlock) {
      onBlock(player.id);
      setShowBlockConfirm(false);
    }
  }, [player, onBlock]);

  const handleUnblock = useCallback(() => {
    if (player && onUnblock) {
      onUnblock(player.id);
    }
  }, [player, onUnblock]);

  const handleSendMessage = useCallback(() => {
    if (player && onSendMessage) {
      onSendMessage(player.id);
      onClose();
    }
  }, [player, onSendMessage, onClose]);

  const handleFollow = useCallback(() => {
    if (player && onFollow) {
      onFollow(player.id);
      onClose();
    }
  }, [player, onFollow, onClose]);

  if (!isOpen || !player) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-80 bg-slate-900/95 rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative h-24"
          style={{
            background: `linear-gradient(135deg, ${player.color}40 0%, transparent 100%)`,
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white/60 hover:text-white hover:bg-black/60 flex items-center justify-center transition-all"
          >
            ✕
          </button>

          {/* Avatar */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <Avatar
              color={player.color}
              frameId={player.equippedFrame}
              size={80}
            />
          </div>
        </div>

        {/* Content */}
        <div className="pt-14 px-5 pb-5">
          {/* Name and Level */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white mb-1">
              {player.name}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-purple-400 text-sm font-medium">
                Level {player.level}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400 text-sm">
                {getLevelTitle(player.level)}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-black/30 rounded-xl p-3 mb-4">
            <StatRow
              icon="✨"
              label="Fragments"
              value={player.fragmentsCollected.toLocaleString()}
            />
            <StatRow
              icon="⏱️"
              label="Play Time"
              value={formatPlayTime(player.playTime)}
            />
            {player.equippedTrail && (
              <StatRow
                icon="💫"
                label="Trail"
                value={player.equippedTrail}
              />
            )}
            {player.equippedAura && (
              <StatRow
                icon="🌟"
                label="Aura"
                value={player.equippedAura}
              />
            )}
          </div>

          {/* Actions */}
          {showBlockConfirm ? (
            <div className="space-y-2">
              <p className="text-center text-sm text-gray-400 mb-3">
                Block {player.name}? They won't be able to interact with you.
              </p>
              <div className="flex gap-2">
                <ActionButton
                  icon="✕"
                  label="Cancel"
                  onClick={() => setShowBlockConfirm(false)}
                  variant="secondary"
                />
                <ActionButton
                  icon="🚫"
                  label="Block"
                  onClick={handleBlock}
                  variant="danger"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Friend button */}
              {player.isFriend ? (
                <ActionButton
                  icon="💔"
                  label="Unfriend"
                  onClick={handleRemoveFriend}
                  variant="secondary"
                />
              ) : (
                <ActionButton
                  icon="💜"
                  label="Add Friend"
                  onClick={handleAddFriend}
                  variant="primary"
                  disabled={player.isBlocked}
                />
              )}

              {/* Message button */}
              <ActionButton
                icon="💬"
                label="Message"
                onClick={handleSendMessage}
                disabled={player.isBlocked}
              />

              {/* Follow button */}
              <ActionButton
                icon="👣"
                label="Follow"
                onClick={handleFollow}
                disabled={player.isBlocked}
              />

              {/* Block/Unblock button */}
              {player.isBlocked ? (
                <ActionButton
                  icon="✓"
                  label="Unblock"
                  onClick={handleUnblock}
                  variant="secondary"
                />
              ) : (
                <ActionButton
                  icon="🚫"
                  label="Block"
                  onClick={() => setShowBlockConfirm(true)}
                  variant="danger"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileCard;
