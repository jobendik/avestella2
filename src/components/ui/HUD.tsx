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

export function HUD(): JSX.Element | null {
  const { isHUDVisible } = useUI();

  if (!isHUDVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* ────────────────────────────────────────────────────────────────────────
          TOP LEFT - Player Status & Stats
         ──────────────────────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        {/* Player Info */}
        <PlayerStatusCard />

        {/* Stats Display (fragments, light, nearby, ladder) */}
        <div className="mt-3">
          <StatsDisplay />
        </div>

        {/* Mode Indicators */}
        <div className="mt-3">
          <ModeIndicators />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          TOP RIGHT - Resources & Menu
         ──────────────────────────────────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 flex items-center gap-3 pointer-events-auto">
        <ResourceBar />
        <MenuBar />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          BOTTOM CENTER - Unified Action Bar
         ──────────────────────────────────────────────────────────────────────── */}
      <ActionBar />

      {/* ────────────────────────────────────────────────────────────────────────
          Floating Panels & Overlays
         ──────────────────────────────────────────────────────────────────────── */}
      <SelectedEntityPanel />
      <ChatInterface />
      <ConstellationMenu />

      {/* ────────────────────────────────────────────────────────────────────────
          Debug Overlay
         ──────────────────────────────────────────────────────────────────────── */}
      <DebugOverlay />

      {/* ────────────────────────────────────────────────────────────────────────
          Realm Transition Overlay
         ──────────────────────────────────────────────────────────────────────── */}
      <RealmTransition />

      {/* ────────────────────────────────────────────────────────────────────────
          Tutorial Overlay
         ──────────────────────────────────────────────────────────────────────── */}
      <TutorialOverlay />
    </div>
  );
}

export default HUD;
