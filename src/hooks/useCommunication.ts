// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Communication Hook (Batch 3: Communication)
// Chat bubbles, light signals, emotes, and player interactions
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { QUICK_CHAT_OPTIONS } from '@/constants/social';
import { gameClient } from '@/services/GameClient';

// ─────────────────────────────────────────────────────────────────────────────
// Storage Key
// ─────────────────────────────────────────────────────────────────────────────

const COMMUNICATION_STORAGE_KEY = 'avestella_communication_v1';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatBubble {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  message: string;
  icon: string;
  x: number;
  y: number;
  createdAt: number;
  expiresAt: number;
}

export interface LightSignal {
  id: string;
  senderId: string;
  senderColor: string;
  type: 'ping' | 'beacon' | 'help' | 'follow' | 'celebrate';
  x: number;
  y: number;
  createdAt: number;
  expiresAt: number;
  radius: number;
  maxRadius: number;
}

export interface Emote {
  id: string;
  emoji: string;
  name: string;
  category: 'greeting' | 'emotion' | 'action' | 'celebration';
}

export interface PlayerInteraction {
  playerId: string;
  playerName: string;
  playerColor: string;
  isFriend: boolean;
  isBlocked: boolean;
  lastSeen: number;
}

export interface CommunicationData {
  // Chat settings
  chatEnabled: boolean;
  chatBubbleDuration: number; // seconds
  
  // Signal settings
  signalsEnabled: boolean;
  signalCooldown: number; // seconds
  lastSignalTime: number;
  
  // Friends & Blocks
  friends: string[];
  blocked: string[];
  recentPlayers: PlayerInteraction[];
  
  // Emote favorites
  favoriteEmotes: string[];
  
  // Stats
  messagesSent: number;
  signalsSent: number;
  friendsAdded: number;
}

export interface UseCommunicationReturn {
  // State
  data: CommunicationData;
  chatBubbles: ChatBubble[];
  lightSignals: LightSignal[];
  
  // Chat actions
  sendQuickChat: (chatId: string, x: number, y: number, senderName: string, senderColor: string) => void;
  sendCustomMessage: (message: string, icon: string, x: number, y: number, senderName: string, senderColor: string) => void;
  clearExpiredBubbles: () => void;
  
  // Signal actions
  sendLightSignal: (type: LightSignal['type'], x: number, y: number, senderColor: string) => boolean;
  clearExpiredSignals: () => void;
  canSendSignal: () => boolean;
  getSignalCooldownRemaining: () => number;
  
  // Emotes
  getEmotes: () => Emote[];
  getEmotesByCategory: (category: Emote['category']) => Emote[];
  toggleFavoriteEmote: (emoteId: string) => void;
  isFavoriteEmote: (emoteId: string) => boolean;
  
  // Player interactions
  addFriend: (playerId: string, playerName: string, playerColor: string) => boolean;
  removeFriend: (playerId: string) => boolean;
  isFriend: (playerId: string) => boolean;
  blockPlayer: (playerId: string) => boolean;
  unblockPlayer: (playerId: string) => boolean;
  isBlocked: (playerId: string) => boolean;
  getRecentPlayers: () => PlayerInteraction[];
  addRecentPlayer: (playerId: string, playerName: string, playerColor: string) => void;
  
  // Settings
  setChatEnabled: (enabled: boolean) => void;
  setSignalsEnabled: (enabled: boolean) => void;
  setChatBubbleDuration: (seconds: number) => void;
  
  // Persistence
  saveCommunication: () => void;
  loadCommunication: () => void;
  resetCommunication: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Emotes Data
// ─────────────────────────────────────────────────────────────────────────────

const EMOTES: Emote[] = [
  // Greetings
  { id: 'wave', emoji: '👋', name: 'Wave', category: 'greeting' },
  { id: 'hello', emoji: '🙋', name: 'Hello', category: 'greeting' },
  { id: 'bow', emoji: '🙇', name: 'Bow', category: 'greeting' },
  { id: 'salute', emoji: '🫡', name: 'Salute', category: 'greeting' },
  
  // Emotions
  { id: 'happy', emoji: '😊', name: 'Happy', category: 'emotion' },
  { id: 'love', emoji: '🥰', name: 'Love', category: 'emotion' },
  { id: 'laugh', emoji: '😂', name: 'Laugh', category: 'emotion' },
  { id: 'surprised', emoji: '😮', name: 'Surprised', category: 'emotion' },
  { id: 'thinking', emoji: '🤔', name: 'Thinking', category: 'emotion' },
  { id: 'cool', emoji: '😎', name: 'Cool', category: 'emotion' },
  { id: 'sad', emoji: '😢', name: 'Sad', category: 'emotion' },
  { id: 'sleepy', emoji: '😴', name: 'Sleepy', category: 'emotion' },
  
  // Actions
  { id: 'thumbsup', emoji: '👍', name: 'Thumbs Up', category: 'action' },
  { id: 'thumbsdown', emoji: '👎', name: 'Thumbs Down', category: 'action' },
  { id: 'clap', emoji: '👏', name: 'Clap', category: 'action' },
  { id: 'pray', emoji: '🙏', name: 'Pray', category: 'action' },
  { id: 'point', emoji: '👉', name: 'Point', category: 'action' },
  { id: 'run', emoji: '🏃', name: 'Run', category: 'action' },
  
  // Celebrations
  { id: 'party', emoji: '🎉', name: 'Party', category: 'celebration' },
  { id: 'sparkles', emoji: '✨', name: 'Sparkles', category: 'celebration' },
  { id: 'star', emoji: '⭐', name: 'Star', category: 'celebration' },
  { id: 'fire', emoji: '🔥', name: 'Fire', category: 'celebration' },
  { id: 'rainbow', emoji: '🌈', name: 'Rainbow', category: 'celebration' },
  { id: 'heart', emoji: '❤️', name: 'Heart', category: 'celebration' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default State
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_DATA: CommunicationData = {
  chatEnabled: true,
  chatBubbleDuration: 5,
  signalsEnabled: true,
  signalCooldown: 3,
  lastSignalTime: 0,
  friends: [],
  blocked: [],
  recentPlayers: [],
  favoriteEmotes: ['wave', 'happy', 'thumbsup', 'sparkles'],
  messagesSent: 0,
  signalsSent: 0,
  friendsAdded: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useCommunication(): UseCommunicationReturn {
  const [data, setData] = useState<CommunicationData>(DEFAULT_DATA);
  const [chatBubbles, setChatBubbles] = useState<ChatBubble[]>([]);
  const [lightSignals, setLightSignals] = useState<LightSignal[]>([]);
  const idCounter = useRef(0);

  // ─────────────────────────────────────────────────────────────────────────
  // Generate unique ID
  // ─────────────────────────────────────────────────────────────────────────

  const generateId = useCallback(() => {
    idCounter.current += 1;
    return `${Date.now()}_${idCounter.current}`;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Chat Actions
  // ─────────────────────────────────────────────────────────────────────────

  const sendQuickChat = useCallback((
    chatId: string,
    x: number,
    y: number,
    senderName: string,
    senderColor: string
  ) => {
    if (!data.chatEnabled) return;

    const chatOption = QUICK_CHAT_OPTIONS.find(opt => opt.id === chatId);
    if (!chatOption) return;

    const now = Date.now();
    const bubble: ChatBubble = {
      id: generateId(),
      senderId: 'player',
      senderName,
      senderColor,
      message: chatOption.text,
      icon: chatOption.icon,
      x,
      y,
      createdAt: now,
      expiresAt: now + data.chatBubbleDuration * 1000,
    };

    setChatBubbles(prev => [...prev, bubble]);
    setData(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
  }, [data.chatEnabled, data.chatBubbleDuration, generateId]);

  const sendCustomMessage = useCallback((
    message: string,
    icon: string,
    x: number,
    y: number,
    senderName: string,
    senderColor: string
  ) => {
    if (!data.chatEnabled) return;

    const now = Date.now();
    const bubble: ChatBubble = {
      id: generateId(),
      senderId: 'player',
      senderName,
      senderColor,
      message,
      icon,
      x,
      y,
      createdAt: now,
      expiresAt: now + data.chatBubbleDuration * 1000,
    };

    setChatBubbles(prev => [...prev, bubble]);
    setData(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
  }, [data.chatEnabled, data.chatBubbleDuration, generateId]);

  const clearExpiredBubbles = useCallback(() => {
    const now = Date.now();
    setChatBubbles(prev => prev.filter(bubble => bubble.expiresAt > now));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Light Signal Actions
  // ─────────────────────────────────────────────────────────────────────────

  const canSendSignal = useCallback((): boolean => {
    if (!data.signalsEnabled) return false;
    const now = Date.now();
    return now - data.lastSignalTime >= data.signalCooldown * 1000;
  }, [data.signalsEnabled, data.lastSignalTime, data.signalCooldown]);

  const getSignalCooldownRemaining = useCallback((): number => {
    const now = Date.now();
    const elapsed = now - data.lastSignalTime;
    const remaining = data.signalCooldown * 1000 - elapsed;
    return Math.max(0, remaining);
  }, [data.lastSignalTime, data.signalCooldown]);

  const sendLightSignal = useCallback((
    type: LightSignal['type'],
    x: number,
    y: number,
    senderColor: string
  ): boolean => {
    if (!canSendSignal()) return false;

    const now = Date.now();
    const maxRadius = type === 'beacon' ? 200 : type === 'help' ? 300 : 150;
    const duration = type === 'beacon' ? 5000 : type === 'help' ? 4000 : 2000;

    const signal: LightSignal = {
      id: generateId(),
      senderId: 'player',
      senderColor,
      type,
      x,
      y,
      createdAt: now,
      expiresAt: now + duration,
      radius: 0,
      maxRadius,
    };

    setLightSignals(prev => [...prev, signal]);
    setData(prev => ({
      ...prev,
      lastSignalTime: now,
      signalsSent: prev.signalsSent + 1,
    }));
    return true;
  }, [canSendSignal, generateId]);

  const clearExpiredSignals = useCallback(() => {
    const now = Date.now();
    setLightSignals(prev => prev.filter(signal => signal.expiresAt > now));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Emote Functions
  // ─────────────────────────────────────────────────────────────────────────

  const getEmotes = useCallback((): Emote[] => {
    return EMOTES;
  }, []);

  const getEmotesByCategory = useCallback((category: Emote['category']): Emote[] => {
    return EMOTES.filter(e => e.category === category);
  }, []);

  const toggleFavoriteEmote = useCallback((emoteId: string) => {
    setData(prev => {
      const isFav = prev.favoriteEmotes.includes(emoteId);
      return {
        ...prev,
        favoriteEmotes: isFav
          ? prev.favoriteEmotes.filter(id => id !== emoteId)
          : [...prev.favoriteEmotes, emoteId].slice(0, 8), // Max 8 favorites
      };
    });
  }, []);

  const isFavoriteEmote = useCallback((emoteId: string): boolean => {
    return data.favoriteEmotes.includes(emoteId);
  }, [data.favoriteEmotes]);

  // ─────────────────────────────────────────────────────────────────────────
  // Player Interactions
  // ─────────────────────────────────────────────────────────────────────────

  const addFriend = useCallback((playerId: string, playerName: string, playerColor: string): boolean => {
    if (data.friends.includes(playerId)) return false;
    if (data.blocked.includes(playerId)) return false;

    setData(prev => ({
      ...prev,
      friends: [...prev.friends, playerId],
      friendsAdded: prev.friendsAdded + 1,
    }));

    // Also add to recent players
    addRecentPlayer(playerId, playerName, playerColor);
    return true;
  }, [data.friends, data.blocked]);

  const removeFriend = useCallback((playerId: string): boolean => {
    if (!data.friends.includes(playerId)) return false;

    setData(prev => ({
      ...prev,
      friends: prev.friends.filter(id => id !== playerId),
    }));
    return true;
  }, [data.friends]);

  const isFriend = useCallback((playerId: string): boolean => {
    return data.friends.includes(playerId);
  }, [data.friends]);

  const blockPlayer = useCallback((playerId: string): boolean => {
    if (data.blocked.includes(playerId)) return false;

    setData(prev => ({
      ...prev,
      blocked: [...prev.blocked, playerId],
      friends: prev.friends.filter(id => id !== playerId), // Remove from friends if blocking
    }));
    return true;
  }, [data.blocked]);

  const unblockPlayer = useCallback((playerId: string): boolean => {
    if (!data.blocked.includes(playerId)) return false;

    setData(prev => ({
      ...prev,
      blocked: prev.blocked.filter(id => id !== playerId),
    }));
    return true;
  }, [data.blocked]);

  const isBlocked = useCallback((playerId: string): boolean => {
    return data.blocked.includes(playerId);
  }, [data.blocked]);

  const getRecentPlayers = useCallback((): PlayerInteraction[] => {
    return data.recentPlayers;
  }, [data.recentPlayers]);

  const addRecentPlayer = useCallback((playerId: string, playerName: string, playerColor: string) => {
    setData(prev => {
      // Check if already exists
      const existing = prev.recentPlayers.find(p => p.playerId === playerId);
      if (existing) {
        // Update last seen
        return {
          ...prev,
          recentPlayers: prev.recentPlayers.map(p =>
            p.playerId === playerId ? { ...p, lastSeen: Date.now() } : p
          ),
        };
      }

      // Add new player (max 20 recent)
      const newPlayer: PlayerInteraction = {
        playerId,
        playerName,
        playerColor,
        isFriend: prev.friends.includes(playerId),
        isBlocked: prev.blocked.includes(playerId),
        lastSeen: Date.now(),
      };

      return {
        ...prev,
        recentPlayers: [newPlayer, ...prev.recentPlayers].slice(0, 20),
      };
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Settings
  // ─────────────────────────────────────────────────────────────────────────

  const setChatEnabled = useCallback((enabled: boolean) => {
    setData(prev => ({ ...prev, chatEnabled: enabled }));
  }, []);

  const setSignalsEnabled = useCallback((enabled: boolean) => {
    setData(prev => ({ ...prev, signalsEnabled: enabled }));
  }, []);

  const setChatBubbleDuration = useCallback((seconds: number) => {
    setData(prev => ({ ...prev, chatBubbleDuration: Math.max(1, Math.min(15, seconds)) }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────

  const saveCommunication = useCallback(() => {
    // Save locally
    saveToStorage(COMMUNICATION_STORAGE_KEY, data);
    
    // Sync to server if connected
    if (gameClient.isConnected()) {
      gameClient.syncCommunication({
        friends: data.friends,
        blocked: data.blocked,
        favoriteEmotes: data.favoriteEmotes,
        chatEnabled: data.chatEnabled,
        signalsEnabled: data.signalsEnabled
      });
    }
  }, [data]);

  const loadCommunication = useCallback(() => {
    const saved = loadFromStorage<CommunicationData | null>(COMMUNICATION_STORAGE_KEY, null);
    if (saved) {
      setData({
        ...DEFAULT_DATA,
        ...saved,
      });
    }
    
    // Also request from server if connected
    if (gameClient.isConnected()) {
      gameClient.requestCommunication();
    }
  }, []);

  const resetCommunication = useCallback(() => {
    setData(DEFAULT_DATA);
    setChatBubbles([]);
    setLightSignals([]);
    saveToStorage(COMMUNICATION_STORAGE_KEY, null);
  }, []);

  // Auto-save on changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveCommunication();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [data, saveCommunication]);

  // Load on mount
  useEffect(() => {
    loadCommunication();
  }, []);

  // Listen for server communication data
  useEffect(() => {
    const handleCommunicationData = (serverData: {
      friends?: string[];
      blocked?: string[];
      favoriteEmotes?: string[];
      chatEnabled?: boolean;
      signalsEnabled?: boolean;
    }) => {
      // Merge server data with local data (server takes precedence for friends/blocked)
      setData(prev => ({
        ...prev,
        friends: serverData.friends ?? prev.friends,
        blocked: serverData.blocked ?? prev.blocked,
        favoriteEmotes: serverData.favoriteEmotes ?? prev.favoriteEmotes,
        chatEnabled: serverData.chatEnabled ?? prev.chatEnabled,
        signalsEnabled: serverData.signalsEnabled ?? prev.signalsEnabled
      }));
    };

    gameClient.on('communication_data', handleCommunicationData);
    return () => {
      gameClient.off('communication_data', handleCommunicationData);
    };
  }, []);

  // Cleanup expired items periodically
  useEffect(() => {
    const interval = setInterval(() => {
      clearExpiredBubbles();
      clearExpiredSignals();
    }, 500);
    return () => clearInterval(interval);
  }, [clearExpiredBubbles, clearExpiredSignals]);

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────

  return {
    data,
    chatBubbles,
    lightSignals,
    sendQuickChat,
    sendCustomMessage,
    clearExpiredBubbles,
    sendLightSignal,
    clearExpiredSignals,
    canSendSignal,
    getSignalCooldownRemaining,
    getEmotes,
    getEmotesByCategory,
    toggleFavoriteEmote,
    isFavoriteEmote,
    addFriend,
    removeFriend,
    isFriend,
    blockPlayer,
    unblockPlayer,
    isBlocked,
    getRecentPlayers,
    addRecentPlayer,
    setChatEnabled,
    setSignalsEnabled,
    setChatBubbleDuration,
    saveCommunication,
    loadCommunication,
    resetCommunication,
  };
}

export default useCommunication;
