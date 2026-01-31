// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Anchoring Triggers
// Automatically watches game state and triggers anchor prompts at emotional peaks
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useAnchoringContext } from '@/contexts/AnchoringContext';
import { useGame } from '@/contexts/GameContext';

// ─────────────────────────────────────────────────────────────────────────────
// Threshold Configuration
// ─────────────────────────────────────────────────────────────────────────────

const LEVEL_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50];
const STARDUST_THRESHOLD = 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Hook: Watch Game State for Anchor Triggers
// ─────────────────────────────────────────────────────────────────────────────

export function useAnchoringTriggers(): void {
  const {
    isAnchored,
    triggerAnchorPrompt,
    updateAssets,
  } = useAnchoringContext();

  const { progression, social, cosmetics, companions, gameState } = useGame();

  // Track whether we've done initial sync (to avoid false triggers on mount)
  const isInitialized = useRef(false);

  // Track previous values to detect changes
  const prevValues = useRef({
    level: progression.state.level, // Initialize with current value
    stardust: progression.state.stardust,
    bondsCount: 0,
    starMemoriesCount: 0,
    companionsCount: 0,
    cosmeticsCount: 0,
    achievementsCount: 0,
    guildJoined: false,
  });

  // Initialize prevValues on first render to current state
  useEffect(() => {
    if (!isInitialized.current) {
      prevValues.current = {
        level: progression.state.level,
        stardust: progression.state.stardust,
        bondsCount: gameState.gameState.current?.bonds?.length ?? 0,
        starMemoriesCount: gameState.gameState.current?.starMemories?.length ?? 0,
        companionsCount: Object.keys(companions.ownedCompanions ?? {}).length,
        cosmeticsCount: (cosmetics.data?.ownedTrails?.length ?? 0) +
                        (cosmetics.data?.ownedColors?.length ?? 0) +
                        (cosmetics.data?.ownedAuras?.length ?? 0),
        achievementsCount: progression.state.achievements?.length ?? 0,
        guildJoined: social.guild !== null,
      };
      isInitialized.current = true;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Keep asset tracking in sync
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const state = gameState.gameState.current;
    if (!state) return;

    const bonds = state.bonds?.length ?? 0;
    const starMemories = state.starMemories?.length ?? 0;
    
    // Count owned companions (it's a Record<string, OwnedCompanion>)
    const companionsCount = Object.keys(companions.ownedCompanions ?? {}).length;
    
    // Count owned cosmetics from data
    const cosmeticsCount = (cosmetics.data?.ownedTrails?.length ?? 0) +
                           (cosmetics.data?.ownedColors?.length ?? 0) +
                           (cosmetics.data?.ownedAuras?.length ?? 0);

    updateAssets({
      bonds,
      starMemories,
      stardust: progression.state.stardust,
      level: progression.state.level,
      achievements: progression.state.achievements?.length ?? 0,
      companions: companionsCount,
      cosmetics: cosmeticsCount,
    });
  }, [
    progression.state.stardust,
    progression.state.level,
    progression.state.achievements,
    companions.ownedCompanions,
    cosmetics.data,
    gameState.gameState.current,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // Trigger: Level Milestones
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAnchored) return;
    if (!isInitialized.current) return; // Don't trigger on initial load

    const currentLevel = progression.state.level;
    const prevLevel = prevValues.current.level;

    if (currentLevel > prevLevel) {
      // Check if we crossed a milestone
      const crossedMilestone = LEVEL_MILESTONES.find(
        m => currentLevel >= m && prevLevel < m
      );

      if (crossedMilestone) {
        console.log(`Anchoring: Level milestone ${crossedMilestone} reached!`);
        // Small delay to let level-up animation play first
        setTimeout(() => {
          triggerAnchorPrompt('level_milestone');
        }, 2000);
      }
    }

    prevValues.current.level = currentLevel;
  }, [progression.state.level, isAnchored, triggerAnchorPrompt]);

  // ─────────────────────────────────────────────────────────────────────────
  // Trigger: Stardust Threshold
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAnchored) return;
    if (!isInitialized.current) return;

    const currentStardust = progression.state.stardust;
    const prevStardust = prevValues.current.stardust;

    // First time crossing threshold
    if (currentStardust >= STARDUST_THRESHOLD && prevStardust < STARDUST_THRESHOLD) {
      triggerAnchorPrompt('stardust_threshold');
    }

    prevValues.current.stardust = currentStardust;
  }, [progression.state.stardust, isAnchored]);

  // ─────────────────────────────────────────────────────────────────────────
  // Trigger: First Star Memory (Bond Sealed)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAnchored) return;
    if (!isInitialized.current) return;

    const state = gameState.gameState.current;
    if (!state) return;

    const currentCount = state.starMemories?.length ?? 0;
    const prevCount = prevValues.current.starMemoriesCount;

    if (currentCount > prevCount) {
      // A star memory was just created!
      if (prevCount === 0) {
        // First ever star memory - highest emotional trigger
        setTimeout(() => {
          triggerAnchorPrompt('first_bond_sealed');
        }, 2500); // After sealing animation
      } else {
        // Subsequent star memories
        setTimeout(() => {
          triggerAnchorPrompt('star_memory_created');
        }, 2500);
      }
    }

    prevValues.current.starMemoriesCount = currentCount;
  }, [gameState.gameState.current?.starMemories?.length, isAnchored]);

  // ─────────────────────────────────────────────────────────────────────────
  // Trigger: Guild Joined
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAnchored) return;
    if (!isInitialized.current) return;

    const hasGuild = social.guild !== null;
    const hadGuild = prevValues.current.guildJoined;

    if (hasGuild && !hadGuild) {
      setTimeout(() => {
        triggerAnchorPrompt('guild_joined');
      }, 1500);
    }

    prevValues.current.guildJoined = hasGuild;
  }, [social.guild, isAnchored]);

  // ─────────────────────────────────────────────────────────────────────────
  // Trigger: Companion Acquired
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAnchored) return;
    if (!isInitialized.current) return;

    const currentCount = Object.keys(companions.ownedCompanions ?? {}).length;
    const prevCount = prevValues.current.companionsCount;

    if (currentCount > prevCount && prevCount === 0) {
      // First companion!
      setTimeout(() => {
        triggerAnchorPrompt('companion_acquired');
      }, 1500);
    }

    prevValues.current.companionsCount = currentCount;
  }, [companions.ownedCompanions, isAnchored]);

  // ─────────────────────────────────────────────────────────────────────────
  // Trigger: Cosmetic Unlocked
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAnchored) return;
    if (!isInitialized.current) return;

    const currentCount = (cosmetics.data?.ownedTrails?.length ?? 0) +
                         (cosmetics.data?.ownedColors?.length ?? 0) +
                         (cosmetics.data?.ownedAuras?.length ?? 0);
    const prevCount = prevValues.current.cosmeticsCount;

    // Trigger after 3rd cosmetic (shows investment in identity)
    if (currentCount >= 3 && prevCount < 3) {
      triggerAnchorPrompt('cosmetic_unlocked');
    }

    prevValues.current.cosmeticsCount = currentCount;
  }, [cosmetics.data, isAnchored]);

  // ─────────────────────────────────────────────────────────────────────────
  // Trigger: Friend Request Received
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAnchored) return;
    if (!isInitialized.current) return;

    const currentRequests = social.friendRequests?.length ?? 0;
    
    // If there are pending requests and user has some value
    if (currentRequests > 0 && progression.state.level >= 3) {
      // Only trigger once per session for friend requests
      triggerAnchorPrompt('friend_request_received');
    }
  }, [social.friendRequests, isAnchored]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default useAnchoringTriggers;
