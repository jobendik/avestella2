// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Game Modes Hook
// Special gameplay modes: Seek, Moment, and Ambient modes
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { type TagGameState, createTagGameState } from '@/game/tagArena';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AmbientModeType =
  | 'none'
  | 'firefly_watch'    // Watch fireflies dance in darkness
  | 'shrine_meditation' // Meditate at a beacon
  | 'stargazing'       // Focus on constellation viewing
  | 'exploration';     // Relaxed exploration without HUD

export interface SeekModeState {
  active: boolean;
  targetType: 'players' | 'beacons' | 'fragments' | 'constellation' | null;
  pulseInterval: number; // Seconds between seek pulses
  range: number;         // Detection range multiplier
}

export interface MomentModeState {
  active: boolean;
  frozenAt: number | null;     // Timestamp when frozen
  capturedState: {
    playerX: number;
    playerY: number;
    particles: any[];
    effects: any[];
  } | null;
}

export interface UseGameModesReturn {
  // Seek Mode - Enhanced player/object finding
  seekMode: SeekModeState;
  toggleSeekMode: () => void;
  setSeekTarget: (target: SeekModeState['targetType']) => void;
  isSeekModeActive: () => boolean;
  getSeekPulseProgress: () => number; // 0-1 progress to next pulse

  // Moment Mode - Freeze world for screenshots
  momentMode: MomentModeState;
  toggleMomentMode: () => void;
  enterMomentMode: (currentState: { playerX: number; playerY: number; particles: any[]; effects: any[] }) => void;
  exitMomentMode: () => void;
  isMomentModeActive: () => boolean;
  getMomentDuration: () => number; // Seconds in moment mode
  captureMoment: (caption?: string) => void;

  // Ambient Modes - Special relaxation/observation modes
  ambientMode: AmbientModeType;
  setAmbientMode: (mode: AmbientModeType) => void;
  isInAmbientMode: () => boolean;
  getAmbientModeEffects: () => {
    hideHUD: boolean;
    reducedParticles: boolean;
    specialCamera: boolean;
    musicOverride: string | null;
  };

  // Combined state
  isAnySpecialModeActive: () => boolean;
  exitAllModes: () => void;

  // Tag Game
  tagGame: TagGameState;
  setTagGame: React.Dispatch<React.SetStateAction<TagGameState>>;
  availableTagSession: {
    sessionId: string;
    initiator: string;
    playerCount: number;
    minPlayers: number;
  } | null;
  createTagGame: () => void;
  joinTagGame: () => void;
  attemptTag: (targetId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

import { gameClient } from '@/services/GameClient';

const DEFAULT_SEEK_INTERVAL = 3; // seconds
const DEFAULT_SEEK_RANGE = 2.0; // 2x normal detection
const MAX_MOMENT_DURATION = 60; // 60 seconds max freeze

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useGameModes(): UseGameModesReturn {
  // ─────────────────────────────────────────────────────────────────────────
  // Seek Mode State
  // ─────────────────────────────────────────────────────────────────────────
  const [seekMode, setSeekMode] = useState<SeekModeState>({
    active: false,
    targetType: 'players',
    pulseInterval: DEFAULT_SEEK_INTERVAL,
    range: DEFAULT_SEEK_RANGE,
  });

  const seekPulseStartRef = useRef<number>(Date.now());

  const toggleSeekMode = useCallback(() => {
    setSeekMode(prev => {
      if (!prev.active) {
        seekPulseStartRef.current = Date.now();
      }
      return { ...prev, active: !prev.active };
    });
  }, []);

  const setSeekTarget = useCallback((target: SeekModeState['targetType']) => {
    setSeekMode(prev => ({ ...prev, targetType: target }));
  }, []);

  const isSeekModeActive = useCallback(() => seekMode.active, [seekMode.active]);

  const getSeekPulseProgress = useCallback(() => {
    if (!seekMode.active) return 0;
    const elapsed = (Date.now() - seekPulseStartRef.current) / 1000;
    const progress = (elapsed % seekMode.pulseInterval) / seekMode.pulseInterval;
    return progress;
  }, [seekMode.active, seekMode.pulseInterval]);

  // ─────────────────────────────────────────────────────────────────────────
  // Moment Mode State
  // ─────────────────────────────────────────────────────────────────────────
  const [momentMode, setMomentMode] = useState<MomentModeState>({
    active: false,
    frozenAt: null,
    capturedState: null,
  });

  const toggleMomentMode = useCallback(() => {
    setMomentMode(prev => ({
      ...prev,
      active: !prev.active,
      frozenAt: prev.active ? null : Date.now(),
    }));
  }, []);

  const enterMomentMode = useCallback((currentState: {
    playerX: number;
    playerY: number;
    particles: any[];
    effects: any[];
  }) => {
    setMomentMode({
      active: true,
      frozenAt: Date.now(),
      capturedState: {
        playerX: currentState.playerX,
        playerY: currentState.playerY,
        particles: [...currentState.particles], // Shallow copy
        effects: [...currentState.effects],
      },
    });
  }, []);

  const exitMomentMode = useCallback(() => {
    setMomentMode({
      active: false,
      frozenAt: null,
      capturedState: null,
    });
  }, []);

  const isMomentModeActive = useCallback(() => momentMode.active, [momentMode.active]);

  const getMomentDuration = useCallback(() => {
    if (!momentMode.frozenAt) return 0;
    return Math.min((Date.now() - momentMode.frozenAt) / 1000, MAX_MOMENT_DURATION);
  }, [momentMode.frozenAt]);

  // Auto-exit moment mode after max duration
  useEffect(() => {
    if (!momentMode.active) return;

    const timer = setTimeout(() => {
      exitMomentMode();
    }, MAX_MOMENT_DURATION * 1000);

    return () => clearTimeout(timer);
  }, [momentMode.active, exitMomentMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Ambient Mode State
  // ─────────────────────────────────────────────────────────────────────────
  const [ambientMode, setAmbientModeState] = useState<AmbientModeType>('none');

  const setAmbientMode = useCallback((mode: AmbientModeType) => {
    // Exit other special modes when entering ambient mode
    if (mode !== 'none') {
      setSeekMode(prev => ({ ...prev, active: false }));
      exitMomentMode();
    }
    setAmbientModeState(mode);
  }, [exitMomentMode]);

  const isInAmbientMode = useCallback(() => ambientMode !== 'none', [ambientMode]);

  const getAmbientModeEffects = useCallback(() => {
    switch (ambientMode) {
      case 'firefly_watch':
        return {
          hideHUD: true,
          reducedParticles: false,
          specialCamera: true, // Wider view
          musicOverride: 'fireflies',
        };
      case 'shrine_meditation':
        return {
          hideHUD: true,
          reducedParticles: true, // Calmer visuals
          specialCamera: true, // Slow zoom in
          musicOverride: 'meditation',
        };
      case 'stargazing':
        return {
          hideHUD: true,
          reducedParticles: true,
          specialCamera: true, // Pan to sky
          musicOverride: 'stars',
        };
      case 'exploration':
        return {
          hideHUD: true, // Minimal HUD
          reducedParticles: false,
          specialCamera: false,
          musicOverride: null,
        };
      default:
        return {
          hideHUD: false,
          reducedParticles: false,
          specialCamera: false,
          musicOverride: null,
        };
    }
  }, [ambientMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Combined State Helpers
  // ─────────────────────────────────────────────────────────────────────────
  const isAnySpecialModeActive = useCallback(() => {
    return seekMode.active || momentMode.active || ambientMode !== 'none';
  }, [seekMode.active, momentMode.active, ambientMode]);

  const exitAllModes = useCallback(() => {
    setSeekMode(prev => ({ ...prev, active: false }));
    exitMomentMode();
    setAmbientModeState('none');
    // We don't automatically exit Tag Game here as it might be multiplayer managed
  }, [exitMomentMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Tag Game State
  // ─────────────────────────────────────────────────────────────────────────
  const [tagGame, setTagGame] = useState<TagGameState>(createTagGameState());
  const [availableTagSession, setAvailableTagSession] = useState<{
    sessionId: string;
    initiator: string;
    playerCount: number;
    minPlayers: number;
  } | null>(null);

  // Constants
  const MIN_PLAYERS_FOR_TAG = 2;

  // Server Integration
  useEffect(() => {
    const handleSessionCreated = (data: { session: any }) => {
      // Notification logic could go here or be derived from state
      console.log('Tag session created:', data.session);
    };

    const handleGameAvailable = (data: {
      sessionId: string;
      initiator: string;
      playerCount: number;
      minPlayers: number;
    }) => {
      setAvailableTagSession(data);
    };

    const handlePlayerJoined = (data: { playerId: string, playerCount: number }) => {
      setAvailableTagSession(prev => prev ? { ...prev, playerCount: data.playerCount } : null);
    };

    const handleGameStarted = (data: { initialTagger: string, sessionId?: string }) => {
      setTagGame(prev => ({
        ...prev,
        active: true,
        sessionId: data.sessionId || availableTagSession?.sessionId || null,
        itPlayerId: data.initialTagger,
        startTime: Date.now(),
        lastTagTime: Date.now(), // Immunity starts
        survivalTime: 0
      }));
      setAvailableTagSession(null); // Clear lobby state
    };

    const handleTagOccurred = (data: { tagger: string, tagged: string, chainBonus: number }) => {
      setTagGame(prev => ({
        ...prev,
        itPlayerId: data.tagged, // New IT player is the one who was tagged? 
        // WAIT: In tag, if IT touches you, YOU become IT.
        // Server says: "tagger" (was IT) touched "tagged" (becomes IT).
        // So new IT is indeed 'tagged'. 
        lastTagTime: Date.now()
      }));
    };

    const handleGameEnded = (data: { winner: string }) => {
      setTagGame(prev => ({
        ...prev,
        active: false,
        itPlayerId: null
      }));
      // Could show winner modal here
    };

    gameClient.on('tag_session_created', handleSessionCreated);
    gameClient.on('tag_game_available', handleGameAvailable); // Broadcast to realm
    gameClient.on('tag_player_joined', handlePlayerJoined);
    gameClient.on('tag_game_started', handleGameStarted);
    gameClient.on('tag_occurred', handleTagOccurred);
    gameClient.on('tag_game_ended', handleGameEnded);

    return () => {
      gameClient.off('tag_session_created', handleSessionCreated);
      gameClient.off('tag_game_available', handleGameAvailable);
      gameClient.off('tag_player_joined', handlePlayerJoined);
      gameClient.off('tag_game_started', handleGameStarted);
      gameClient.off('tag_occurred', handleTagOccurred);
      gameClient.off('tag_game_ended', handleGameEnded);
    };
  }, []);

  const createTagGame = useCallback(() => {
    gameClient.createTagGame();
  }, []);

  const joinTagGame = useCallback(() => {
    if (availableTagSession) {
      gameClient.joinTagGame(availableTagSession.sessionId);
    }
  }, [availableTagSession]);

  // ─────────────────────────────────────────────────────────────────────────
  // Return API
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Seek Mode
    seekMode,
    toggleSeekMode,
    setSeekTarget,
    isSeekModeActive,
    getSeekPulseProgress,

    // Moment Mode
    momentMode,
    toggleMomentMode,
    enterMomentMode,
    exitMomentMode,
    isMomentModeActive,
    getMomentDuration,

    // Ambient Modes
    ambientMode,
    setAmbientMode,
    isInAmbientMode,
    getAmbientModeEffects,

    // Combined
    isAnySpecialModeActive,
    exitAllModes,

    tagGame,
    setTagGame,
    availableTagSession,
    createTagGame,
    joinTagGame,
    attemptTag: (targetId: string) => {
      if (tagGame.sessionId) {
        gameClient.attemptTag(targetId, tagGame.sessionId);
      }
    },

    captureMoment: (caption?: string) => {
      if (momentMode.active && momentMode.capturedState) {
        gameClient.sendSnapshot({
          x: momentMode.capturedState.playerX,
          y: momentMode.capturedState.playerY,
          realm: gameClient.getRealm(), // Use actual realm from gameClient
          visibleEntities: [],
          visiblePlayers: [],
          caption
        });
      }
    }
  };
}
