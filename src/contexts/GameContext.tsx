// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Game Context
// ═══════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useGameState, type UseGameStateReturn } from '@/hooks/useGameState';
import { useProgression, type UseProgressionReturn } from '@/hooks/useProgression';
import { useAudio, type UseAudioReturn } from '@/hooks/useAudio';
import { useInput, type UseInputReturn } from '@/hooks/useInput';
import { useExploration, type UseExplorationReturn } from '@/hooks/useExploration';
import { useWorldEvents, type UseWorldEventsReturn } from '@/hooks/useWorldEvents';
import { useCosmetics, type UseCosmeticsReturn } from '@/hooks/useCosmetics';
import { useSocial, type UseSocialReturn } from '@/hooks/useSocial';
import { useDailyChallenges, type UseDailyChallengesReturn } from '@/hooks/useDailyChallenges';
import { useLeaderboard, type UseLeaderboardReturn } from '@/hooks/useLeaderboard';
import { useMedia, type UseMediaReturn } from '@/hooks/useMedia';
import { useDarkness, type DarknessState } from '@/hooks/useDarkness';
import { useCompanions, type UseCompanionsReturn } from '@/hooks/useCompanions';
import { usePulsePatterns, type UsePulsePatternReturn } from '@/hooks/usePulsePatterns';
import { useSettings, type UseSettingsReturn } from '@/hooks/useSettings';
import { useGameModes, type UseGameModesReturn } from '@/hooks/useGameModes';
import { usePowerUps, type UsePowerUpsReturn } from '@/hooks/usePowerUps';
import { useVoice, type UseVoiceReturn } from '@/hooks/useVoice';
import { useTutorial, type UseTutorialReturn } from '@/hooks/useTutorial';
import { gameClient } from '@/services/GameClient';

// ─────────────────────────────────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GameContextType {
  gameState: UseGameStateReturn;
  progression: UseProgressionReturn;
  audio: UseAudioReturn;
  input: UseInputReturn;
  exploration: UseExplorationReturn;
  worldEvents: UseWorldEventsReturn;
  cosmetics: UseCosmeticsReturn;
  social: UseSocialReturn;
  dailyChallenges: UseDailyChallengesReturn;
  leaderboard: UseLeaderboardReturn;
  media: UseMediaReturn;
  darkness: DarknessState;
  companions: UseCompanionsReturn;
  pulsePatterns: UsePulsePatternReturn;
  settings: UseSettingsReturn;
  gameModes: UseGameModesReturn;
  powerUps: UsePowerUpsReturn;
  voice: UseVoiceReturn;
  tutorial: UseTutorialReturn;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Creation
// ─────────────────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextType | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

export interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps): JSX.Element {
  const gameState = useGameState();
  const progression = useProgression();
  const audio = useAudio();
  const input = useInput();
  const exploration = useExploration();
  const tutorial = useTutorial();
  const worldEvents = useWorldEvents();
  const cosmetics = useCosmetics();
  const social = useSocial();
  const dailyChallenges = useDailyChallenges(gameState.gameState.current?.playerId || '');
  const media = useMedia();
  const leaderboard = useLeaderboard({
    playerChallenges: dailyChallenges.totalCompleted,
    playerSeasonTier: progression.state.seasonPassTier
  });
  const darkness = useDarkness(audio);
  const companions = useCompanions();
  const pulsePatterns = usePulsePatterns();
  const settings = useSettings();
  const gameModes = useGameModes();
  const powerUps = usePowerUps();
  const playerId = gameState.gameState.current?.playerId || '';
  const voice = useVoice(playerId, gameState.gameState.current?.bonds || []);

  // Sync nearby players for Voice Chat (Proximity)
  useEffect(() => {
    const handleVoiceUpdate = (data: any) => {
      if (data?.players) {
        const remoteIds = data.players
          .filter((p: any) => p.id !== playerId)
          .map((p: any) => p.id);

        voice.setNearbyPlayers(remoteIds);
      }
    };

    gameClient.on('world_state', handleVoiceUpdate);
    return () => {
      gameClient.off('world_state', handleVoiceUpdate);
    };
  }, [voice, playerId]);

  const value: GameContextType = {
    gameState,
    progression,
    audio,
    input,
    exploration,
    worldEvents,
    cosmetics,
    social,
    dailyChallenges,
    leaderboard,
    media,
    companions,
    darkness,
    pulsePatterns,
    settings,
    gameModes,
    powerUps,
    voice,
    tutorial,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook for consuming context
// ─────────────────────────────────────────────────────────────────────────────

export function useGame(): GameContextType {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }

  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience hooks for specific parts of context
// ─────────────────────────────────────────────────────────────────────────────

export function useGameStateContext(): UseGameStateReturn {
  const { gameState } = useGame();
  return gameState;
}

export function useProgressionContext(): UseProgressionReturn {
  const { progression } = useGame();
  return progression;
}

export function useAudioContext(): UseAudioReturn {
  const { audio } = useGame();
  return audio;
}

export function useInputContext(): UseInputReturn {
  const { input } = useGame();
  return input;
}

export function useExplorationContext(): UseExplorationReturn {
  const { exploration } = useGame();
  return exploration;
}

export function useWorldEventsContext(): UseWorldEventsReturn {
  const { worldEvents } = useGame();
  return worldEvents;
}

export function useCosmeticsContext(): UseCosmeticsReturn {
  const { cosmetics } = useGame();
  return cosmetics;
}

export function useSocialContext(): UseSocialReturn {
  const { social } = useGame();
  return social;
}

export function useDailyChallengesContext(): UseDailyChallengesReturn {
  const { dailyChallenges } = useGame();
  return dailyChallenges;
}

export function useLeaderboardContext(): UseLeaderboardReturn {
  const { leaderboard } = useGame();
  return leaderboard;
}

export function useMediaContext(): UseMediaReturn {
  const { media } = useGame();
  return media;
}

export function useDarknessContext(): DarknessState {
  const { darkness } = useGame();
  return darkness;
}

export function useCompanionsContext(): UseCompanionsReturn {
  const { companions } = useGame();
  return companions;
}

export function usePulsePatternsContext(): UsePulsePatternReturn {
  const { pulsePatterns } = useGame();
  return pulsePatterns;
}

export function useSettingsContext(): UseSettingsReturn {
  const { settings } = useGame();
  return settings;
}

export function useGameModesContext(): UseGameModesReturn {
  const { gameModes } = useGame();
  return gameModes;
}

export function usePowerUpsContext(): UsePowerUpsReturn {
  const { powerUps } = useGame();
  return powerUps;
}

export default GameContext;

