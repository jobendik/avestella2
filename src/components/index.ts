// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Components Barrel Export
// ═══════════════════════════════════════════════════════════════════════════

// UI Components
export { HUD } from './ui/HUD';
export { ToastContainer } from './ui/ToastContainer';
export { AchievementPopup } from './ui/AchievementPopup';
export { LevelUpPopup } from './ui/LevelUpPopup';
export { Panel, Tabs, Section, Card, Button } from './ui/Panel';
export type { PanelProps, Tab, TabsProps, SectionProps, CardProps, ButtonProps } from './ui/Panel';

// Controls
export { Joystick } from './controls/Joystick';
export type { JoystickProps } from './controls/Joystick';

// Game Components
export { GameCanvas } from './game/GameCanvas';

// Minimap (Batch 1)
export { Minimap } from './ui/Minimap';

// World Events (Batch 1)
export { WorldEventNotifications, ActiveEventIndicator } from './ui/WorldEventNotifications';

// Discovery Log / Journal (Batch 1)
export { DiscoveryLog } from './ui/DiscoveryLog';

// Personalization (Batch 2)
export { CosmeticShop } from './ui/CosmeticShop';
export { PlayerProfile } from './ui/PlayerProfile';
export { ColorPicker } from './ui/ColorPicker';
export { CosmeticPreview } from './ui/CosmeticPreview';

// Communication (Batch 3)
export { QuickChatWheel } from './ui/QuickChatWheel';
export { ChatBubbles } from './ui/ChatBubbles';
export { LightSignalOverlay } from './ui/LightSignalOverlay';
export { PlayerProfileCard } from './ui/PlayerProfileCard';
export { FriendsList } from './ui/FriendsList';

// Collectibles & Pets (Batch 4)
export { CompanionShop } from './ui/CompanionShop';
export { CollectibleGallery } from './ui/CollectibleGallery';
export { ConnectedCompanionShop, ConnectedCollectibleGallery, ConnectedFriendsList } from './ui/ConnectedPanels';

// Settings & Panels (Unified TypeScript)
export { SettingsPanel } from './ui/SettingsPanel';
export { DailyRewardModal } from './ui/DailyRewardModal';
export { DailyChallengePanel } from './ui/DailyChallengePanel';
export { GuildPanel } from './ui/GuildPanel';
export { EventPanel } from './ui/EventPanel';
export { MessagesPanel } from './ui/MessagesPanel';
export { GalleryPanel } from './ui/GalleryPanel';
export { LeaderboardPanel } from './ui/LeaderboardPanel';
export { SafetyMenu } from './ui/SafetyMenu';
export { AchievementPanel } from './ui/AchievementPanel';
export { WorldMapPanel } from './ui/WorldMapPanel';
export { BondSealingModal } from './ui/BondSealingModal';
export { StarMemoriesPanel } from './ui/StarMemoriesPanel';

// Accessibility
export { AudioCaptions, emitCaption, SOUND_CAPTIONS } from './ui/AudioCaptions';
export type { AudioCaption } from './ui/AudioCaptions';

// Ambient & Screenshot (Batch 7)
export { AmbientModeSelector } from './ui/AmbientModeSelector';
export { ScreenshotEditor, FilterQuickSelector, TemplateQuickSelector } from './ui/ScreenshotEditor';

// Analytics & Feedback (Batch 7)
export { AnalyticsDashboard } from './ui/AnalyticsDashboard';
export { FeedbackForm, QuickFeedback } from './ui/FeedbackForm';

// LEGACY Ports (Phase 2)
export { SnapshotModal } from './ui/SnapshotModal';
export type { SnapshotModalProps } from './ui/SnapshotModal';
export { QuickReactionsBar, DEFAULT_REACTIONS, EXTENDED_REACTIONS } from './ui/QuickReactionsBar';
export type { QuickReactionsBarProps, QuickReaction } from './ui/QuickReactionsBar';

// LEGACY Ports (Phase 3)
export { SignalHUD, ClusterHUD, NetworkStatusHUD, latencyToStrength, getSignalQuality, getSignalColor } from './ui/NetworkStatusHUD';
export type { SignalHUDProps, ClusterHUDProps, NetworkStatusHUDProps, SignalQuality } from './ui/NetworkStatusHUD';
export { HintPill, useHintPill, HINT_MESSAGES } from './ui/HintPill';
export type { HintPillProps, UseHintPillOptions } from './ui/HintPill';
export { HoverTooltip, ClickProfileCard, useHoverTooltip, getLevelFromXP } from './ui/HoverTooltip';
export type { HoverTooltipProps, ClickProfileCardProps, HoveredPlayer, UseHoverTooltipReturn } from './ui/HoverTooltip';

// LEGACY Ports (Phase 4)
export { InviteToast, useInviteToast } from './ui/InviteToast';
export type { InviteToastProps, UseInviteToastReturn } from './ui/InviteToast';
export { QuestPanel, QuestButton } from './ui/QuestPanel';
export type { QuestPanelProps, QuestButtonProps } from './ui/QuestPanel';

// LEGACY Ports (Phase 5 - HUD Integration)
export { RealmSelector, RealmPill, ConnectedRealmSelector } from './ui/RealmSelector';
export type { RealmSelectorProps, RealmPillProps } from './ui/RealmSelector';
export { InstantChat } from './ui/InstantChat';

// Anchoring System (Persistence / Account Linking)
export { AnchoringModal } from './ui/AnchoringModal';
