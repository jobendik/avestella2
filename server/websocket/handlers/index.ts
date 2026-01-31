// =============================================================================
// Handler Index - Export all WebSocket message handlers
// =============================================================================

// Core handlers
export { ProgressionHandlers } from './ProgressionHandlers.js';
export { PlayerDataHandlers } from './PlayerDataHandlers.js';
export { CompanionHandlers } from './CompanionHandlers.js';
export { PetHandlers } from './PetHandlers.js';
export { ChatHandlers } from './ChatHandlers.js';
export { GameActionHandlers } from './GameActionHandlers.js';

// World and events
export { WorldEventHandlers } from './WorldEventHandlers.js';
export { PowerUpHandlers } from './PowerUpHandlers.js';

// Minigames
export { TagGameHandlers } from './TagGameHandlers.js';

// Features
export { MysteryBoxHandlers } from './MysteryBoxHandlers.js';
export { AnchoringHandlers } from './AnchoringHandlers.js';
export { LeaderboardHandlers } from './LeaderboardHandlers.js';
export { QuestHandlers } from './QuestHandlers.js';
export { SignalsHandlers } from './SignalsHandlers.js';
export { ExplorationHandlers } from './ExplorationHandlers.js';
export { ReputationHandlers } from './ReputationHandlers.js';
export { NotificationHandlers } from './NotificationHandlers.js';
export { SnapshotHandlers } from './SnapshotHandlers.js';

// Social & Multiplayer
export { GuildHandlers } from './GuildHandlers.js';
export { GiftHandlers } from './GiftHandlers.js';
export { VoiceHandlers } from './VoiceHandlers.js';
export { BondHandlers } from './BondHandlers.js';
export { ReferralHandlers } from './ReferralHandlers.js';
export { MentorshipHandlers } from './MentorshipHandlers.js';

// Phase 1 - New Feature Handlers
export { setupSeasonHandlers, initializeSeasonEventListeners } from './SeasonHandlers.js';
export { setupGalleryHandlers, initializeGalleryEventListeners } from './GalleryHandlers.js';
export { setupDailyLoginHandlers, initializeDailyLoginEventListeners } from './DailyLoginHandlers.js';
export { setupConstellationHandlers, initializeConstellationEventListeners } from './ConstellationHandlers.js';
export { setupActivityFeedHandlers, initializeActivityFeedEventListeners } from './ActivityFeedHandlers.js';

// Phase 2 - Backend Completeness Handlers (NEW)
export { FriendHandlers } from './FriendHandlers.js';
export { MapMarkerHandlers } from './MapMarkerHandlers.js';

// Phase 3 - Game Mode & Media Handlers
export { default as SeekModeHandlers } from './SeekModeHandlers.js';
export { default as AnalyticsHandlers } from './AnalyticsHandlers.js';

// Re-export types for convenience
export type { PlayerConnection, WebSocketMessage, HandlerContext, Echo, PowerUpInstance, WorldEvent } from '../types.js';
