// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Main Application Component (Refactored)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { GameProvider, useGame } from '@/contexts/GameContext';
import { UIProvider, useUI } from '@/contexts/UIContext';
import { AnchoringProvider } from '@/contexts/AnchoringContext';
import { GameCanvas } from '@/components/game/GameCanvas';
import {
  HUD,
  ToastContainer,
  AchievementPopup,
  LevelUpPopup,
  Minimap,
  WorldEventNotifications,
  DiscoveryLog,
  CosmeticShop,
  PlayerProfile,
  SettingsPanel,
  GuildPanel,
  EventPanel,
  DailyRewardModal,
  DailyChallengePanel,
  SafetyMenu,
  SnapshotModal,
  InviteToast,
  useInviteToast,
  QuestPanel,
  ConnectedRealmSelector,
  InstantChat,
  AnchoringModal,
} from '@/components';
import { LeaderboardPanel } from '@/components/ui/LeaderboardPanel';
import { MessagesPanel } from '@/components/ui/MessagesPanel';
import { GalleryPanel } from '@/components/ui/GalleryPanel';
import { ConnectedCompanionShop, ConnectedCollectibleGallery, ConnectedFriendsList } from '@/components/ui/ConnectedPanels';
import { CosmosPanel } from '@/components/ui/CosmosPanel';

import { EmoteWheel } from '@/components/ui/EmoteWheel';
import { VoiceVisualizer } from '@/components/ui/VoiceVisualizer';
import { AchievementPanel } from '@/components/ui/AchievementPanel';
import { FeedbackForm } from '@/components/ui/FeedbackForm';
import { WorldMapPanel } from '@/components/ui/WorldMapPanel';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { HintPill, HINT_MESSAGES, useHintPill } from '@/components/ui/HintPill';
import { NetworkStatusHUD } from '@/components/ui/NetworkStatusHUD';
import { useAudio, useSnapshot, useQuests } from '@/hooks';
import { useAnchoringTriggers } from '@/hooks/useAnchoringTriggers';

// ─────────────────────────────────────────────────────────────────────────────
// Main App Layout
// ─────────────────────────────────────────────────────────────────────────────

function AppLayout(): JSX.Element {
  const { activePanel, closePanel } = useUI();
  const { exploration } = useGame();
  const { startAmbientLoop, stopAmbientLoop, playChatChime } = useAudio();
  const { isVisible: showHint, dismiss: dismissHint } = useHintPill({ storageKey: 'aura-welcome-hint' });
  const { snapshot, isModalOpen, takeSnapshot, downloadSnapshot, closeModal, copyToClipboard, shareSnapshot } = useSnapshot();
  const { isVisible: showInviteToast, copyInviteLink, hide: hideInviteToast } = useInviteToast();
  const { hasUnclaimedRewards, unclaimedDailyCount, unclaimedWeeklyCount, trackProgress } = useQuests();

  // Anchoring system - watches for emotional peaks to prompt account creation
  useAnchoringTriggers();

  // Simulated network stats (replace with real WebSocket latency in production)
  const [latency, setLatency] = useState(45);
  const [nearbyCount, setNearbyCount] = useState(0);

  // Start ambient loop on mount
  useEffect(() => {
    startAmbientLoop();
    return () => stopAmbientLoop();
  }, [startAmbientLoop, stopAmbientLoop]);

  // Simulate network stats updates (demo purposes)
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(30 + Math.random() * 40);
      setNearbyCount(Math.floor(Math.random() * 5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Game Canvas - Full screen background */}
      <GameCanvas />

      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT SIDE - Realm Selector (vertical, centered)
         ═══════════════════════════════════════════════════════════════════════ */}
      <ConnectedRealmSelector visible={true} />

      {/* ═══════════════════════════════════════════════════════════════════════
          TOP - HUD with player info, resources, menu
         ═══════════════════════════════════════════════════════════════════════ */}
      <HUD />

      {/* ═══════════════════════════════════════════════════════════════════════
          BOTTOM LEFT CORNER - Minimap only
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-4 left-20 z-50 pointer-events-auto">
        <Minimap
          size={140}
          position="bottom-left"
          showFog={true}
          showBiomes={true}
          showBeacons={true}
          showLandmarks={true}
          inline={true}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOTTOM RIGHT CORNER - Stats (exploration %, network, players)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-4 right-4 flex items-center gap-3 px-3 py-2 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 z-50 pointer-events-auto">
        <NetworkStatusHUD
          latency={latency}
          isConnected={true}
          nearbyCount={nearbyCount}
          visible={true}
          showCluster={false}
          explorationPercent={exploration.explorationPercentage}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOTTOM CENTER - Instant Chat (ENTER to type)
         ═══════════════════════════════════════════════════════════════════════ */}
      {/* Instant Chat - Press ENTER to type, messages float above player */}
      <InstantChat />

      {/* ═══════════════════════════════════════════════════════════════════════
          TOP CENTER - Welcome Hint (dismissable)
         ═══════════════════════════════════════════════════════════════════════ */}
      {showHint && (
        <HintPill
          message={HINT_MESSAGES.welcome}
          icon="✨"
          dismissOnInteraction={true}
          onDismiss={dismissHint}
          position="top"
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          FLOATING NOTIFICATIONS & POPUPS
         ═══════════════════════════════════════════════════════════════════════ */}
      <ToastContainer />
      <WorldEventNotifications />
      <AchievementPopup />
      <LevelUpPopup />
      <InviteToast visible={showInviteToast} onHide={hideInviteToast} />
      <AnchoringModal />

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL OVERLAYS
         ═══════════════════════════════════════════════════════════════════════ */}
      <SnapshotModal
        snapshot={snapshot}
        isOpen={isModalOpen}
        onClose={closeModal}
        onDownload={downloadSnapshot}
        onCopy={copyToClipboard}
        onShare={shareSnapshot}
      />

      {/* Quest Panel - opens from Progress menu */}
      <QuestPanel
        isOpen={activePanel === 'quests'}
        onClose={closePanel}
        onRewardClaimed={(questId, amount, isWeekly) => {
          console.log(`Claimed ${amount} from ${questId} (${isWeekly ? 'weekly' : 'daily'})`);
          playChatChime();
        }}
      />



      {/* Emote Wheel Overlay */}
      <EmoteWheel />

      {/* Voice Visualizer */}
      <VoiceVisualizer />

      {/* Panels (rendered conditionally based on activePanel) */}
      {activePanel && activePanel !== 'quests' && <PanelRouter panel={activePanel} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel Router (lazy loads panels as needed)
// ─────────────────────────────────────────────────────────────────────────────

interface PanelRouterProps {
  panel: string;
}

function PanelRouter({ panel }: PanelRouterProps): JSX.Element | null {
  const { closePanel } = useUI();

  // Use dedicated TypeScript components for implemented panels
  switch (panel) {
    case 'journal':
      return <DiscoveryLog isOpen={true} onClose={closePanel} />;
    case 'shop':
      return <CosmeticShop />;
    case 'profile':
      return <PlayerProfile />;
    case 'settings':
      return <SettingsPanel />;
    case 'guild':
      return <GuildPanel />;
    case 'events':
      return <EventPanel />;
    case 'dailyRewards':
      return <DailyRewardModal onClose={closePanel} />;
    case 'challenges':
      return <DailyChallengePanel />;
    case 'friends':
      return <MessagesPanel />;
    case 'screenshot':
    case 'gallery':
      return <GalleryPanel />;
    case 'leaderboard':
      return <LeaderboardPanel onClose={closePanel} />;
    case 'safety':
      return <SafetyMenu />;
    case 'companions':
      return <ConnectedCompanionShop />;
    case 'collectibles':
      return <ConnectedCollectibleGallery />;
    case 'friendsList':
      return <ConnectedFriendsList />;
    case 'achievements':
      return <AchievementPanel />;
    case 'map':
      return <WorldMapPanel />;
    case 'cosmos':
      return <CosmosPanel />;
    case 'feedback':
      return (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto"
          onClick={closePanel}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <FeedbackForm onClose={closePanel} />
          </div>
        </div>
      );
    case 'quests':
      // Quests panel is handled separately as a modal with its own state
      return null;
    default:
      // Unknown panel - return null
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App with Providers
// ─────────────────────────────────────────────────────────────────────────────

function App(): JSX.Element {
  // Simple routing for Admin Dashboard
  const [location, setLocation] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setLocation(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (location === '/admin') {
    return <AdminDashboard />;
  }

  return (
    <AnchoringProvider>
      <GameProvider>
        <UIProvider>
          <AppLayout />
        </UIProvider>
      </GameProvider>
    </AnchoringProvider>
  );
}

export default App;
