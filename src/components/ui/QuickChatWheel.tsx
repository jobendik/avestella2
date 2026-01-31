// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Quick Chat Wheel (Batch 3: Communication)
// Radial menu for quick chat messages and emotes
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useMemo } from 'react';
import { QUICK_CHAT_OPTIONS } from '@/constants/social';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QuickChatWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chatId: string) => void;
  centerX?: number;
  centerY?: number;
}

type WheelTab = 'chat' | 'emotes' | 'signals';

// ─────────────────────────────────────────────────────────────────────────────
// Emotes for the wheel
// ─────────────────────────────────────────────────────────────────────────────

const WHEEL_EMOTES = [
  { id: 'wave', icon: '👋', text: '*waves*' },
  { id: 'happy', icon: '😊', text: '*smiles*' },
  { id: 'love', icon: '🥰', text: '*happy*' },
  { id: 'think', icon: '🤔', text: '*thinking*' },
  { id: 'clap', icon: '👏', text: '*claps*' },
  { id: 'dance', icon: '💃', text: '*dances*' },
  { id: 'party', icon: '🎉', text: '*celebrates*' },
  { id: 'sleep', icon: '😴', text: '*sleepy*' },
];

const SIGNAL_OPTIONS = [
  { id: 'ping', icon: '📍', text: 'Ping', color: '#4D96FF' },
  { id: 'beacon', icon: '🔷', text: 'Beacon', color: '#FFD700' },
  { id: 'help', icon: '🆘', text: 'Help!', color: '#FF6B6B' },
  { id: 'follow', icon: '👣', text: 'Follow', color: '#50C878' },
  { id: 'celebrate', icon: '🎆', text: 'Celebrate', color: '#E040FB' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Wheel Item Component
// ─────────────────────────────────────────────────────────────────────────────

interface WheelItemProps {
  icon: string;
  label: string;
  angle: number;
  distance: number;
  index: number;
  total: number;
  isHovered: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
  color?: string;
}

const WheelItem: React.FC<WheelItemProps> = ({
  icon,
  label,
  angle,
  distance,
  index,
  total,
  isHovered,
  onClick,
  onHover,
  onLeave,
  color,
}) => {
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onTouchStart={onHover}
      className={`
        absolute flex flex-col items-center justify-center
        w-14 h-14 rounded-full transition-all duration-200
        ${isHovered 
          ? 'scale-125 bg-white/20 shadow-lg z-10' 
          : 'bg-white/10 hover:bg-white/15'
        }
      `}
      style={{
        transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
        left: '50%',
        top: '50%',
        animationDelay: `${index * 30}ms`,
        boxShadow: isHovered && color ? `0 0 20px ${color}80` : undefined,
      }}
    >
      <span className="text-2xl">{icon}</span>
      {isHovered && (
        <span className="absolute -bottom-6 text-xs text-white whitespace-nowrap font-medium bg-black/70 px-2 py-0.5 rounded">
          {label}
        </span>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const QuickChatWheel: React.FC<QuickChatWheelProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [activeTab, setActiveTab] = useState<WheelTab>('chat');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Get items based on active tab
  const items = useMemo(() => {
    switch (activeTab) {
      case 'chat':
        return QUICK_CHAT_OPTIONS.slice(0, 8).map(opt => ({
          id: opt.id,
          icon: opt.icon,
          text: opt.text,
        }));
      case 'emotes':
        return WHEEL_EMOTES;
      case 'signals':
        return SIGNAL_OPTIONS;
      default:
        return [];
    }
  }, [activeTab]);

  // Handle selection
  const handleSelect = useCallback((id: string) => {
    onSelect(activeTab === 'signals' ? `signal_${id}` : id);
    onClose();
  }, [activeTab, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      {/* Wheel Container */}
      <div
        className="relative w-80 h-80"
        onClick={e => e.stopPropagation()}
      >
        {/* Background Circle */}
        <div className="absolute inset-0 rounded-full bg-slate-900/90 border-2 border-white/10" />

        {/* Tab Selector (Center) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 bg-black/60 rounded-full p-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'chat' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💬
          </button>
          <button
            onClick={() => setActiveTab('emotes')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'emotes' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            😊
          </button>
          <button
            onClick={() => setActiveTab('signals')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'signals' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📍
          </button>
        </div>

        {/* Wheel Items */}
        {items.map((item, index) => {
          const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2;
          const distance = 110;

          return (
            <WheelItem
              key={item.id}
              icon={item.icon}
              label={item.text}
              angle={angle}
              distance={distance}
              index={index}
              total={items.length}
              isHovered={hoveredItem === item.id}
              onClick={() => handleSelect(item.id)}
              onHover={() => setHoveredItem(item.id)}
              onLeave={() => setHoveredItem(null)}
              color={activeTab === 'signals' ? (item as any).color : undefined}
            />
          );
        })}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-gray-400 hover:text-white text-sm"
        >
          Tap outside to close
        </button>
      </div>
    </div>
  );
};

export default QuickChatWheel;
