// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - HUD Component (Refactored)
// Clean orchestrator that composes all HUD sub-components
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useUI } from '@/contexts/UIContext';

// HUD Sub-components
import {
  PlayerStatusCard,
  ResourceBar,
  ModeIndicators,
  StatsDisplay,
  MenuBar,
  ActionBar,
  DebugOverlay
} from './hud-components';

// Related UI components
import { ChatInterface } from './ChatInterface';
import { SelectedEntityPanel } from './SelectedEntityPanel';
import { RealmTransition } from './RealmTransition';
import { ConstellationMenu } from './ConstellationMenu';
import { TutorialOverlay } from './TutorialOverlay';

interface HUDProps {
  isMobile?: boolean;
}

export function HUD({ isMobile = false }: HUDProps): JSX.Element | null {
  const { isHUDVisible } = useUI();

  if (!isHUDVisible) return null;

  // Mobile layout: more compact, repositioned elements
  if (isMobile) {
    return (
      <div className="fixed inset-0 pointer-events-none z-10">
        {/* TOP BAR - Compact player info + menu (mobile) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
          {/* Left: Compact Player Info */}
          <div className="flex items-center gap-2 scale-90 origin-left">
            <PlayerStatusCard isMobile={true} />
          </div>

          {/* Right: Compact Menu */}
          <div className="flex items-center gap-1 scale-90 origin-right">
            <ResourceBar isMobile={true} />
            <MenuBar isMobile={true} />
          </div>
        </div>

        {/* BOTTOM CENTER - Action Bar (moved up for joystick) */}
        <ActionBar isMobile={true} />

        {/* Floating Panels & Overlays */}
        <SelectedEntityPanel />
        <ChatInterface />
        <ConstellationMenu />
        <DebugOverlay />
        <RealmTransition />
        <TutorialOverlay />
      </div>
    );
  }

  // Desktop layout: original positioning
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* TOP LEFT - Player Status & Stats */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <PlayerStatusCard />
        <div className="mt-3">
          <StatsDisplay />
        </div>
        <div className="mt-3">
          <ModeIndicators />
        </div>
      </div>

      {/* TOP RIGHT - Resources & Menu */}
      <div className="absolute top-4 right-4 flex items-center gap-3 pointer-events-auto">
        <ResourceBar />
        <MenuBar />
      </div>

      {/* BOTTOM CENTER - Unified Action Bar */}
      <ActionBar />

      {/* Floating Panels & Overlays */}
      <SelectedEntityPanel />
      <ChatInterface />
      <ConstellationMenu />
      <DebugOverlay />
      <RealmTransition />
      <TutorialOverlay />
    </div>
  );
}

export default HUD;
