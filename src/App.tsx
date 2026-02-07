// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Main Application Component (Refactored)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useRef } from 'react';
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
import { useSnapshot, useQuests, useSettings } from '@/hooks';
import { useAnchoringTriggers } from '@/hooks/useAnchoringTriggers';
import { gameClient } from '@/services/GameClient';
import { useMobile } from '@/hooks/useMobile';

// ─────────────────────────────────────────────────────────────────────────────
// Main App Layout
// ─────────────────────────────────────────────────────────────────────────────

function AppLayout(): JSX.Element {
  const { activePanel, closePanel } = useUI();
  const { exploration, settings, audio } = useGame();
  const { startBackgroundMusic, stopBackgroundMusic, playChatChime } = audio;
  const { isVisible: showHint, dismiss: dismissHint } = useHintPill({ storageKey: 'aura-welcome-hint' });
  const { snapshot, isModalOpen, takeSnapshot, downloadSnapshot, closeModal, copyToClipboard, shareSnapshot } = useSnapshot();
  const { isVisible: showInviteToast, copyInviteLink, hide: hideInviteToast } = useInviteToast();
  const { hasUnclaimedRewards, unclaimedDailyCount, unclaimedWeeklyCount, trackProgress } = useQuests();

  // Mobile detection for responsive layout
  const { isMobile, isPortrait, screenWidth, screenHeight } = useMobile();

  // Debug: Log mobile detection status
  useEffect(() => {
    console.log('[App] Mobile detection:', {
      isMobile,
      isPortrait,
      screenWidth,
      screenHeight,
      userAgent: navigator.userAgent.substring(0, 80)
    });
  }, [isMobile, isPortrait, screenWidth, screenHeight]);

  // Anchoring system - watches for emotional peaks to prompt account creation
  useAnchoringTriggers();

  // Real network stats from WebSocket connection
  const [latency, setLatency] = useState(gameClient.getLatency());
  const [nearbyCount, setNearbyCount] = useState(gameClient.getNearbyPlayerCount());
  const [isConnected, setIsConnected] = useState(gameClient.isConnected());

  // Start background music on mount (plays /music.mp3 at low volume)
  // Using refs to avoid re-running the effect when functions change
  const startMusicRef = useRef(startBackgroundMusic);
  const stopMusicRef = useRef(stopBackgroundMusic);
  startMusicRef.current = startBackgroundMusic;
  stopMusicRef.current = stopBackgroundMusic;

  useEffect(() => {
    // Only start music if enabled in settings
    if (settings.settings.musicEnabled) {
      startMusicRef.current('/music.mp3');
    } else {
      stopMusicRef.current(); // Explicitly stop if disabled
    }
    // Cleanup handled by the else or component unmount (effectively)
    // Note: If we unmount, we probably want music to stop? 
    // Usually AppLayout doesn't unmount, but good practice.
    return () => {
      // Optional: stop music on unmount? 
      // stopMusicRef.current(); 
    };
  }, [settings.settings.musicEnabled]); // Re-run when setting changes

  // Subscribe to real network stats from GameClient
  useEffect(() => {
    const handleLatencyUpdate = (data: { latency: number }) => {
      setLatency(data.latency);
    };

    const handleNearbyCountUpdate = (data: { count: number }) => {
      setNearbyCount(data.count);
    };

    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    gameClient.on('latency_update', handleLatencyUpdate);
    gameClient.on('nearby_count_update', handleNearbyCountUpdate);
    gameClient.on('connected', handleConnected);
    gameClient.on('disconnected', handleDisconnected);

    return () => {
      gameClient.off('latency_update', handleLatencyUpdate);
      gameClient.off('nearby_count_update', handleNearbyCountUpdate);
      gameClient.off('connected', handleConnected);
      gameClient.off('disconnected', handleDisconnected);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Debug: Mobile Detection Indicator (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`fixed top-2 left-1/2 -translate-x-1/2 z-[9999] px-3 py-1 rounded-full text-xs font-mono pointer-events-none ${
          isMobile
            ? 'bg-green-500/90 text-white'
            : 'bg-orange-500/90 text-white'
        }`}>
          {isMobile ? '📱 Mobile' : '🖥️ Desktop'} ({screenWidth}×{screenHeight})
        </div>
      )}

      {/* Game Canvas - Full screen background */}
      <GameCanvas />

      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT SIDE - Realm Selector (vertical on desktop, hidden on mobile - handled in component)
         ═══════════════════════════════════════════════════════════════════════ */}
      <ConnectedRealmSelector visible={true} isMobile={isMobile} />

      {/* ═══════════════════════════════════════════════════════════════════════
          TOP - HUD with player info, resources, menu
         ═══════════════════════════════════════════════════════════════════════ */}
      <HUD isMobile={isMobile} />

      {/* ═══════════════════════════════════════════════════════════════════════
          MINIMAP - Bottom-left on desktop, bottom-right on mobile (moved to avoid HUD overlap)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className={`fixed z-50 pointer-events-auto ${isMobile
        ? 'bottom-4 right-2'
        : 'bottom-4 left-20'
        }`}>
        <Minimap
          size={isMobile ? 70 : 140}
          position={isMobile ? "bottom-right" : "bottom-left"}
          showFog={true}
          showBiomes={true}
          showBeacons={true}
          showLandmarks={true}
          inline={true}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOTTOM RIGHT CORNER - Stats (exploration %, network, players)
          Hidden on mobile - network info shown in compact HUD
         ═══════════════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <div className="fixed bottom-4 right-4 flex items-center gap-3 px-3 py-2 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 z-50 pointer-events-auto">
          <NetworkStatusHUD
            latency={latency}
            isConnected={isConnected}
            nearbyCount={nearbyCount}
            visible={true}
            showCluster={false}
            explorationPercent={exploration.explorationPercentage}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE JOYSTICK - Touch control for movement
         ═══════════════════════════════════════════════════════════════════════ */}

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE JOYSTICK - Disabled as per user request
         ═══════════════════════════════════════════════════════════════════════ */}
      {/* {isMobile && <Joystick ... />} */}

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
