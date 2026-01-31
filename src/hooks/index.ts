// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Hooks Barrel Export
// ═══════════════════════════════════════════════════════════════════════════

export { useGameState } from './useGameState';
export type { UseGameStateReturn } from './useGameState';

export { useProgression } from './useProgression';
export type { ProgressionState, UseProgressionReturn } from './useProgression';

export { useAudio } from './useAudio';
export type { UseAudioReturn } from './useAudio';

export { useInput } from './useInput';
export type { InteractionState, UseInputReturn } from './useInput';

export { useExploration } from './useExploration';
export type { UseExplorationReturn, DiscoveryEvent, ExplorationData } from './useExploration';

export { useWorldEvents } from './useWorldEvents';
export type { UseWorldEventsReturn, ActiveWorldEvent, EventModifiers } from './useWorldEvents';

export { useCosmetics } from './useCosmetics';
export type { UseCosmeticsReturn, CosmeticsData, CosmeticItem } from './useCosmetics';

export { useCommunication } from './useCommunication';
export type { UseCommunicationReturn, ChatBubble, LightSignal, PlayerInteraction, CommunicationData } from './useCommunication';

export { useCompanions } from './useCompanions';
export type { UseCompanionsReturn, OwnedCompanion, CompanionData } from './useCompanions';

export { useRecording } from './useRecording';
export type { UseRecordingOptions, UseRecordingReturn } from './useRecording';

export { useTutorial, TUTORIAL_STEPS } from './useTutorial';
export type { UseTutorialOptions, UseTutorialReturn } from './useTutorial';

export { usePulsePatterns } from './usePulsePatterns';
export type { UsePulsePatternReturn, PulsePattern, PulseEvent } from './usePulsePatterns';

export { useSettings } from './useSettings';
export type { UseSettingsReturn, GameSettings, ColorblindMode } from './useSettings';

export { useAnalytics } from './useAnalytics';
export type { UseAnalyticsReturn, AnalyticsState, AnalyticsEvent, AnalyticsMilestone, SessionData } from './useAnalytics';

export { useGameModes } from './useGameModes';
export type { UseGameModesReturn, SeekModeState, MomentModeState, AmbientModeType } from './useGameModes';

export { usePulseInteraction } from './usePulseInteraction';
export type { PulseInteractionState, PulseInteractionActions } from './usePulseInteraction';

export { useSignals } from './useSignals';
export type { SignalActions } from './useSignals';

export { useSnapshot } from './useSnapshot';
export type { UseSnapshotReturn, SnapshotData, SnapshotConfig } from './useSnapshot';

export { useQuests, DAILY_QUESTS, WEEKLY_QUESTS } from './useQuests';
export type {
  UseQuestsReturn,
  QuestDefinition,
  QuestProgress,
  QuestState,
  QuestTimers,
  QuestTrackingKey
} from './useQuests';

export { useAnchoring } from './useAnchoring';
export type { UseAnchoringReturn, AnchorState, AnchorProvider, AnchorTrigger } from './useAnchoring';

export { useAnchoringTriggers } from './useAnchoringTriggers';

// Server-connected progression system
export { useServerProgression } from './useServerProgression';
export type {
  UseServerProgressionReturn,
  ServerChallenge,
  ServerProgression,
  ServerGift,
  ServerGuild,
  ActivityFeedItem
} from './useServerProgression';

// Server-connected leaderboard
export { useServerLeaderboard } from './useServerLeaderboard';
export type {
  UseServerLeaderboardReturn,
  ServerLeaderboardEntry,
  LeaderboardType
} from './useServerLeaderboard';

// Master server sync hook - replaces all localStorage with MongoDB persistence
export { useServerSync } from './useServerSync';
export type {
  UseServerSyncReturn,
  ServerSyncActions
} from './useServerSync';

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1 Hooks - New Backend Features
// ═══════════════════════════════════════════════════════════════════════════

// Season Pass system
export { useSeasonPass } from './useSeasonPass';
export type {
  UseSeasonPassReturn,
  SeasonInfo,
  SeasonProgress,
  SeasonReward
} from './useSeasonPass';

// Daily Login & Streak system
export { useDailyLogin } from './useDailyLogin';
export type {
  UseDailyLoginReturn,
  DailyReward,
  MilestoneReward,
  StreakInfo,
  DailyLoginResult
} from './useDailyLogin';

// Screenshot Gallery system
export { useGallery } from './useGallery';
export type {
  UseGalleryReturn,
  Screenshot,
  Album,
  GalleryStats
} from './useGallery';

// Server-side Constellations
export { useServerConstellations } from './useServerConstellations';
export type {
  UseServerConstellationsReturn,
  ServerConstellation,
  ConstellationStats,
  PotentialConstellation
} from './useServerConstellations';

// Activity Feed system
export { useActivityFeed } from './useActivityFeed';
export type {
  UseActivityFeedReturn,
  FriendActivity,
  ActivityType,
  ActivityStats
} from './useActivityFeed';

// Firebase Storage uploads
export { useFirebaseStorage } from './useFirebaseStorage';
export type {
  UseFirebaseStorageReturn,
  UseFirebaseStorageOptions,
  UploadState
} from './useFirebaseStorage';
