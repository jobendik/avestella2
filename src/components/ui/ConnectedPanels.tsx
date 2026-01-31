// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Connected Panel Wrappers
// These components connect props-based panels to their context providers
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useUI } from '@/contexts/UIContext';
import { 
  useCompanionsContext, 
  useProgressionContext, 
  useSocialContext,
  useExplorationContext,
  useGameStateContext
} from '@/contexts/GameContext';
import { CompanionShop } from './CompanionShop';
import { CollectibleGallery } from './CollectibleGallery';
import { FriendsList } from './FriendsList';

// ─────────────────────────────────────────────────────────────────────────────
// Connected Companion Shop
// ─────────────────────────────────────────────────────────────────────────────

export function ConnectedCompanionShop(): JSX.Element {
  const { closePanel } = useUI();
  const companions = useCompanionsContext();
  const progression = useProgressionContext();

  return (
    <CompanionShop
      isOpen={true}
      onClose={closePanel}
      stardust={progression.state.stardust}
      ownedCompanions={companions.ownedCompanions}
      equippedCompanionId={companions.equippedCompanion?.id || null}
      onPurchase={(id) => companions.purchaseCompanion(id, progression.state.stardust, progression.spendStardust)}
      onEquip={companions.equipCompanion}
      playerLevel={progression.state.level}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connected Collectible Gallery
// ─────────────────────────────────────────────────────────────────────────────

export function ConnectedCollectibleGallery(): JSX.Element {
  const { closePanel } = useUI();
  const companions = useCompanionsContext();
  const progression = useProgressionContext();
  const social = useSocialContext();
  const gameState = useGameStateContext();

  return (
    <CollectibleGallery
      isOpen={true}
      onClose={closePanel}
      ownedPieces={companions.constellationPieces}
      completedConstellations={companions.completedConstellations}
      earnedBadges={companions.earnedBadges}
      onClaimReward={companions.claimConstellationReward}
      stats={{
        fragmentsCollected: gameState.gameState.current?.fragmentsCollected || 0,
        locationsDiscovered: 0, // Would need exploration context
        friendsAdded: social.friends.length,
        companionsOwned: companions.getOwnedCompanionCount(),
        playerLevel: progression.state.level,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connected Friends List
// ─────────────────────────────────────────────────────────────────────────────

export function ConnectedFriendsList(): JSX.Element {
  const { closePanel, showToast } = useUI();
  const social = useSocialContext();

  // Map social friends to the expected format
  const friends = social.friends.map(f => ({
    playerId: f.id,
    playerName: f.name,
    playerColor: '#FFD700', // Default color since Friend type doesn't have color
    timestamp: Date.now(),
    interactionType: 'friend' as const,
    isOnline: f.online,
    lastSeen: f.lastSeen ? Date.now() - 3600000 : undefined, // Convert string to approximate timestamp
  }));

  return (
    <FriendsList
      isOpen={true}
      onClose={closePanel}
      friends={friends}
      blocked={[]} // Would need blocked list from social
      recentPlayers={[]} // Would need recent players tracking
      onRemoveFriend={(id) => {
        social.removeFriend(id);
        showToast('Friend removed', 'info');
      }}
      onUnblock={() => {}}
      onAddFriend={() => {
        // Would need a way to send friend requests
        showToast('Feature coming soon', 'info');
      }}
      onBlock={() => {}}
      onViewProfile={() => {}}
      onSendMessage={(id) => {
        // Open messages panel with this friend selected
        showToast('Opening chat...', 'info');
      }}
    />
  );
}
