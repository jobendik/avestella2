// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Game State Hook
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useCallback, useState, useEffect } from 'react';
import type { GameStateRef, Beacon, IBond, IAIAgent, IParticle } from '@/types';
import { Bond } from '@/classes/Bond';
import { Particle } from '@/classes/Particle';
import { AIAgent } from '@/classes/AIAgent';
import { Ripple, Shockwave } from '@/classes/Effects';
import { WORLD_SIZE, BEACONS, getRandomName } from '@/constants/game';
// Note: LIGHT_COLORS, randomRange, randomElement no longer needed for entity generation
// Entities are now server-authoritative
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '@/utils/storage';
import { ALL_REALM_IDS, DEFAULT_REALM } from '@/constants/realms';
import { gameClient, type RealmId } from '@/services/GameClient';

// Note: PERSONALITY_TYPES removed - AI agents are now server-authoritative


import { useVoice } from './useVoice';

export interface UseGameStateReturn {
  gameState: React.RefObject<GameStateRef>;
  initializeGame: () => void;
  updatePlayerPosition: (x: number, y: number) => void;
  updatePlayerName: (name: string) => void;
  addFragment: () => void;
  collectFragment: () => void;
  lightBeacon: (beaconId: string) => void;
  formBond: (target: IAIAgent) => IBond | null;
  addParticles: (particles: IParticle[]) => void;
  addRipple: (x: number, y: number, options?: { maxRadius?: number; color?: string }) => void;
  addShockwave: (x: number, y: number, options?: { maxRadius?: number; color?: string }) => void;
  getPlayerPosition: () => { x: number; y: number };
  getNearbyAgents: (radius: number) => IAIAgent[];
  getNearbyBeacon: (radius: number) => Beacon | null;
  saveGameState: () => void;
  loadGameState: () => void;
  selectedEntity: IAIAgent | null;
  setSelectedEntity: (entity: IAIAgent | null) => void;
  broadcastGesture: (type: 'pulse' | 'spin' | 'signal', x: number, y: number) => void;
  broadcastMessage: (text: string, x: number, y: number, radius?: number) => void;
  // Light gifting and bridge creation
  giftLight: (targetId: string, amount: number) => boolean;
  createLightBridge: (targetX: number, targetY: number, color: string) => void;
  sealBond: (bondId: string) => boolean;
  // Screen effects
  triggerScreenFlash: (color: string, intensity?: number, decay?: number) => void;
  // Floating text system
  addFloatingText: (text: string, x: number, y: number, options?: { hue?: number; size?: number; duration?: number }) => void;
  // Voice
  isTalking: boolean;
  setIsTalking: (talking: boolean) => void;
  // Realm Transition
  isTransitioning: boolean;
  targetRealmName: string;
  targetRealmIcon: string;
  switchRealm: (realmId: string, name: string, icon: string) => void;
  voice: {
    joinVoice: () => Promise<void>;
    leaveVoice: () => void;
    toggleMute: () => void;
    isVoiceActive: boolean;
    isMuted: boolean;
    peers: any[];
    error: string | null;
  };
}

export function useGameState(): UseGameStateReturn {
  const [selectedEntity, setSelectedEntity] = useState<IAIAgent | null>(null);
  const [isTalking, setIsTalking] = useState(false);

  // Get unique player ID
  const getPlayerId = () => {
    let id = loadFromStorage('player_id', '');
    if (!id) {
      id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      saveToStorage('player_id', id);
    }
    return id;
  };

  // Get or generate player name
  const getPlayerName = () => {
    let name = loadFromStorage(STORAGE_KEYS.PLAYER_NAME, '');
    if (!name) {
      name = getRandomName();
      saveToStorage(STORAGE_KEYS.PLAYER_NAME, name);
    }
    return name;
  };

  const playerId = useRef(getPlayerId()).current;
  const playerName = useRef(getPlayerName()).current;

  const gameState = useRef<GameStateRef>({
    // Player state
    playerId,
    playerName,
    playerX: WORLD_SIZE / 2,
    playerY: WORLD_SIZE / 2,
    playerVX: 0,
    playerVY: 0,
    playerRadius: 20,
    playerColor: '#FFD700',
    playerAlpha: 1,
    playerTrail: [],

    // Camera
    cameraX: 0,
    cameraY: 0,
    cameraTargetX: 0,
    cameraTargetY: 0,
    cameraZoom: 1,

    // World entities
    fragments: [],
    bonds: [],
    aiAgents: [],
    particles: [],
    ripples: [],
    shockwaves: [],
    floatingTexts: [],
    beacons: [],

    // Visual Effects
    nebulae: [],
    stars: [],
    lightTrails: [],
    localFragments: [],
    echoes: [],
    signals: [],
    lightBridges: [],
    pulseRipples: [],
    currentSeason: 'spring',
    currentRealm: DEFAULT_REALM,
    darknessIntensity: 0,

    // Stats
    fragmentsCollected: 0,
    goldenFragmentsCollected: 0,
    totalBonds: 0,
    beaconsLit: 0,
    distanceTraveled: 0,
    playTime: 0,
    lastTrailPoint: 0,
    lightGifted: 0,
    starMemories: [],

    // Cold/Warmth Mechanics
    coldTimer: 0,
    stationaryTimer: 0,
    warmthLinger: 0,
    wasNearWarmth: false,
    hasMoved: false,
    aloneTimer: 0,

    // Constellation System
    constellations: [],
    inConstellation: false,
    constellationMembers: [],
    constellationFormedAt: null,

    // State flags
    gameStarted: false,
    isPaused: false,
    isLoading: true,
    screenFlash: null,
    lastProcessedPattern: null,
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Voice Hook Integration
  // We pass active bonds from REF. Note: this might not update reactively if bonds array implies state change 
  // but useVoice checks activeBonds dependency. 
  // IMPORTANT: Since gameState.current.bonds is a mutable array in a ref, it won't trigger re-renders of useVoice.
  // useVoice needs a reactive version of bonds or a way to poll. 
  // However, useVoice is inside this component. 
  // To make it reactive, we might need a state mirror or force update.
  // For now, let's assume useVoice will poll or we update a state when bonds change?
  // Actually, useGameState IS a hook. 

  // Quick fix: sync active bonds to a state for the hook if needed, OR 
  // useVoice can handle polling/ref checks? 
  // Let's pass the ref.current.bonds but realize it might be stale in React terms.
  // Better: We force an update when bonds change (formBond calls set...)
  // But formBond is a callback modifying ref.

  // Let's rely on the game loop to update things or keep it simple.
  // Actually, let's just pass `gameState.current.bonds` and use a `version` state to trigger updates if needed.
  // For now, I'll pass the array. If it doesn't work reactively, I'll add a version trigger.

  const voice = useVoice(playerId, gameState.current.bonds);

  /**
   * Initialize game state with defaults
   */
  const initializeGame = useCallback(() => {
    const state = gameState.current;

    // Reset player position
    state.playerX = WORLD_SIZE / 2;
    state.playerY = WORLD_SIZE / 2;
    state.playerVX = 0;
    state.playerVY = 0;

    // Initialize beacons from constants (beacons are still defined client-side for now)
    state.beacons = BEACONS.map((beacon, index) => ({
      ...beacon,
      realmId: ALL_REALM_IDS[index % ALL_REALM_IDS.length], // Distribute beacons across realms
      active: false, // Start inactive until charged
      lit: false,
      lightLevel: 0,
      pulsePhase: 0,
      charge: 0,
      isCharging: false,
      chargeRate: 0.1, // Charge speed
    }));

    // SERVER-AUTHORITATIVE: All game entities come from server
    // aiAgents will be populated with server bots + remote players from world_state
    state.aiAgents = [];

    // Fragments come from server - initialize empty
    state.fragments = [];

    // Clear local effects (particles, ripples are client-side visual only)
    state.particles = [];
    state.ripples = [];
    state.shockwaves = [];
    state.bonds = [];

    // Initialize Visual Effects - all server-authoritative now
    // These will be populated from world_state
    state.nebulae = [];
    state.stars = [];
    state.lightTrails = [];
    state.localFragments = [];
    state.echoes = [];  // Server-authoritative
    state.signals = [];
    state.lightBridges = [];
    state.pulseRipples = [];
    state.currentSeason = 'spring';
    state.darknessIntensity = 0;

    // Set game as started
    state.gameStarted = true;
    state.isLoading = false;

    setIsInitialized(true);

    // Connect to Multiplayer Server
    gameClient.connect(playerId, (state.currentRealm || DEFAULT_REALM) as RealmId);

    // Listen for world state updates (contains all remote players)
    const handleWorldState = (data: any) => {
      if (!data?.players) {
        return;
      }

      const state = gameState.current;
      const remotePlayers = data.players.filter((p: any) => p.id !== playerId);
      const serverBots = data.bots || [];

      // Debug: Log positions to verify server is sending correct data
      if ((remotePlayers.length > 0 || serverBots.length > 0) && Math.random() < 0.02) {
        console.log(`🌐 My pos: (${Math.round(state.playerX)}, ${Math.round(state.playerY)}) | Players: ${remotePlayers.length} | Bots: ${serverBots.length}`);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // SERVER-AUTHORITATIVE: Update ALL entities from server
      // ═══════════════════════════════════════════════════════════════════════

      // Update fragments from server
      if (data.fragments && Array.isArray(data.fragments)) {
        state.fragments = data.fragments.map((f: any) => ({
          id: f.id,
          x: f.x,
          y: f.y,
          isGolden: f.isGolden,
          value: f.value,
          phase: f.phase,
          pulsePhase: f.phase,
          realmId: state.currentRealm || DEFAULT_REALM,
          collected: false
        }));
      }

      // Update nebulae from server (cosmetic, consistent for all players)
      if (data.nebulae && Array.isArray(data.nebulae)) {
        state.nebulae = data.nebulae;
      }

      // Update stars from server (cosmetic, consistent for all players)
      if (data.stars && Array.isArray(data.stars)) {
        state.stars = data.stars;
      }

      // Update echoes from server
      if (data.echoes && Array.isArray(data.echoes)) {
        state.echoes = data.echoes.map((e: any) => ({
          id: e.id,
          x: e.x,
          y: e.y,
          name: e.playerName || 'Unknown',
          text: e.message || '',
          hue: e.hue || 180,
          createdAt: e.createdAt,
          ignited: e.resonanceCount || 0,
          r: 20,
          pulse: 0
        }));
      }

      // Build combined list of aiAgents from: server bots + remote players
      // This replaces ALL local agent generation
      const hueToColor = (hue: number) => `hsl(${hue}, 70%, 60%)`;

      // Create lookup of current agents by ID for efficient updates
      const currentAgentsById = new Map<string, any>();
      for (const agent of state.aiAgents) {
        currentAgentsById.set(agent.id, agent);
      }

      const newAgentsList: any[] = [];

      // Process server bots (server-authoritative AI characters)
      for (const botData of serverBots) {
        const existing = currentAgentsById.get(botData.id);
        if (existing) {
          // Update existing bot
          existing.x = botData.x;
          existing.y = botData.y;
          existing.name = botData.name;
          if (botData.singing) existing.singing = botData.singing;
          if (botData.pulsing) existing.pulsing = botData.pulsing;
          if (botData.message) existing.currentMessage = botData.message;
          if (botData.speaking !== undefined) existing.isSpeaking = botData.speaking;
          if (botData.pulsing !== undefined) existing.isPulsing = botData.pulsing;
          newAgentsList.push(existing);
        } else {
          // Create new bot agent
          const newAgent = new AIAgent(
            botData.x,
            botData.y,
            hueToColor(botData.hue || 180),
            state.currentRealm || DEFAULT_REALM,
            'social',
            true // isRemotePlayer (server-controlled)
          );
          newAgent.id = botData.id;
          newAgent.name = botData.name || 'Bot';
          // Note: xp is tracked server-side, not needed on client
          newAgentsList.push(newAgent);
        }
      }

      // Process remote players
      for (const playerData of remotePlayers) {
        const existing = currentAgentsById.get(playerData.id);
        if (existing) {
          // Update existing player
          existing.x = playerData.x;
          existing.y = playerData.y;
          existing.name = playerData.name || `Player_${playerData.id.substring(0, 6)}`;
          // Sync social state
          if (playerData.message !== undefined) existing.currentMessage = playerData.message;
          if (playerData.speaking !== undefined) existing.isSpeaking = playerData.speaking;
          if (playerData.pulsing !== undefined) existing.isPulsing = playerData.pulsing;

          newAgentsList.push(existing);
        } else {
          // Create new player agent
          const newAgent = new AIAgent(
            playerData.x,
            playerData.y,
            hueToColor(playerData.hue || 180),
            state.currentRealm || DEFAULT_REALM,
            'social',
            true // isRemotePlayer
          );
          newAgent.id = playerData.id;
          newAgent.name = playerData.name || `Player_${playerData.id.substring(0, 6)}`;
          newAgentsList.push(newAgent);
        }
      }

      // Replace entire aiAgents list with server-authoritative list
      state.aiAgents = newAgentsList;
    };

    (gameClient as any).on('world_state', handleWorldState);

    // Listen for fragment spawned events (incremental update)
    const handleFragmentSpawned = (data: any) => {
      const state = gameState.current;
      if (data && data.id) {
        state.fragments.push({
          id: data.id,
          x: data.x,
          y: data.y,
          isGolden: data.isGolden,
          value: data.value,
          phase: data.phase,
          pulsePhase: data.phase,
          realmId: state.currentRealm || DEFAULT_REALM,
          collected: false
        });
      }
    };
    (gameClient as any).on('fragment_spawned', handleFragmentSpawned);

    // Listen for fragment removed events (when another player collects)
    const handleFragmentRemoved = (data: any) => {
      const state = gameState.current;
      if (data && data.fragmentId) {
        state.fragments = state.fragments.filter(f => f.id !== data.fragmentId);
      }
    };
    (gameClient as any).on('fragment_removed', handleFragmentRemoved);

    // Listen for fragment collected confirmation (when we collect)
    const handleFragmentCollected = (data: any) => {
      const state = gameState.current;
      if (data && data.fragmentId) {
        // Remove fragment from local state
        state.fragments = state.fragments.filter(f => f.id !== data.fragmentId);
        // Update stats
        state.fragmentsCollected += data.value || 1;
        if (data.isGolden) {
          state.goldenFragmentsCollected += 1;
        }
      }
    };
    (gameClient as any).on('fragment_collected', handleFragmentCollected);

    // Listen for individual player updates (legacy fallback - world_state is primary)
    // This handler is kept for backward compatibility but world_state is authoritative
    const handlePlayerUpdate = (data: any) => {
      // No-op: world_state handler is authoritative for all entities
      // This is kept for potential direct player updates from server
    };

    (gameClient as any).on('player_update', handlePlayerUpdate);

    // ═══════════════════════════════════════════════════════════════════════
    // INCOMING BROADCAST LISTENERS - Multiplayer Communication
    // ═══════════════════════════════════════════════════════════════════════

    // Listen for chat messages from other players
    const handleChatMessage = (data: any) => {
      if (!data || data.playerId === playerId) return;
      const state = gameState.current;

      // Find the agent and set their currentMessage
      const agent = state.aiAgents.find(a => a.id === data.playerId);
      if (agent) {
        agent.currentMessage = data.message;

        // Add floating text above the player
        state.floatingTexts.push({
          id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          x: agent.x,
          y: agent.y - 30,
          text: data.message,
          hue: 60, // Golden-yellow for chat
          size: 14,
          life: 1,
          decay: 0.015, // Slower decay for readability
          vy: -0.5,
        });

        // Clear message after 5 seconds
        setTimeout(() => {
          if (agent.currentMessage === data.message) {
            agent.currentMessage = null;
          }
        }, 5000);
      }
    };
    (gameClient as any).on('chat_message', handleChatMessage);

    // Listen for pulse events from other players
    const handlePulse = (data: any) => {
      if (!data || data.playerId === playerId) return;
      const state = gameState.current;

      const pulseColor = data.color || '#87CEEB';
      const intensity = data.intensity || 0.5;

      // Create expanding ring ripple effect
      for (let i = 0; i < 3; i++) {
        state.ripples.push({
          x: data.x,
          y: data.y,
          radius: 10 + i * 15,
          maxRadius: 100 + intensity * 100 + i * 40,
          alpha: 0.5 - i * 0.1,
          speed: 3 + i * 0.5,
          color: pulseColor,
          life: 1
        } as any);
      }

      // Add burst particles
      const particleCount = Math.floor(8 + intensity * 12);
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2 * intensity;
        state.particles.push({
          x: data.x,
          y: data.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 4,
          color: pulseColor,
          alpha: 0.8,
          life: 1,
          maxLife: 1,
          decay: 0.02,
          type: 'spark' as const
        } as any);
      }

      // Mark agent as pulsing
      const agent = state.aiAgents.find(a => a.id === data.playerId);
      if (agent) {
        agent.isPulsing = true;
        setTimeout(() => { agent.isPulsing = false; }, 1000);
      }
    };
    (gameClient as any).on('pulse', handlePulse);

    // Cleanup on unmount
    return () => {
      (gameClient as any).off('world_state', handleWorldState);
      (gameClient as any).off('fragment_spawned', handleFragmentSpawned);
      (gameClient as any).off('fragment_removed', handleFragmentRemoved);
      (gameClient as any).off('fragment_collected', handleFragmentCollected);
      (gameClient as any).off('player_update', handlePlayerUpdate);
      (gameClient as any).off('chat_message', handleChatMessage);
      (gameClient as any).off('pulse', handlePulse);
    };

  }, [playerId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVER-AUTHORITATIVE ARCHITECTURE
  // ═══════════════════════════════════════════════════════════════════════════
  // All game entities (fragments, bots, players, nebulae, stars, echoes) are
  // now owned and broadcast by the server. The client is a "dumb renderer"
  // that receives world_state and renders what the server tells it.
  //
  // Client sends INPUTS:
  // - Movement (player_update)
  // - Collection requests (collect_fragment)
  // - Actions (sing, pulse, emote)
  //
  // Server sends WORLD STATE:
  // - All entity positions and states
  // - Client just renders it
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update player name and persist to storage
   */
  const updatePlayerName = useCallback((name: string) => {
    const sanitized = name.trim().slice(0, 30) || 'Wanderer'; // Max 30 chars, default to 'Wanderer'
    gameState.current.playerName = sanitized;
    saveToStorage(STORAGE_KEYS.PLAYER_NAME, sanitized);
  }, []);

  /**
   * Update player position and Dynamic Light Radius (Warmth/Cold)
   */
  const updatePlayerPosition = useCallback((x: number, y: number, darknessIntensity: number = 0) => {
    const state = gameState.current;

    // Calculate movement delta
    const countDx = x - state.playerX;
    const countDy = y - state.playerY;
    state.distanceTraveled += Math.sqrt(countDx * countDx + countDy * countDy);

    state.playerX = x;
    state.playerY = y;

    // ─────────────────────────────────────────────────────────────────────────
    // Dynamic Light Radius (Warmth/Cold) Calculations
    // ─────────────────────────────────────────────────────────────────────────

    // 1. Calculate Warmth Sources (Nearby Bonds & Beacons)
    let warmthFactor = 0;

    // Nearby Agents/Bonds
    const nearbyBond = state.bonds.find(b => {
      if (!b.light2) return false;
      const dx = b.light2.x - x;
      const dy = b.light2.y - y;
      return (dx * dx + dy * dy) < 40000; // 200px radius squared
    });
    if (nearbyBond) warmthFactor += 0.5;

    // Nearby Particles (small warmth from collecting)
    // Simplified: Collecting fragments adds explicit Burst, handled in collectFragment

    // Nearby Lit Beacons
    const nearbyBeacon = state.beacons.find(b => {
      if (!b.lit) return false;
      const dx = b.x - x;
      const dy = b.y - y;
      return (dx * dx + dy * dy) < 90000; // 300px radius squared
    });
    if (nearbyBeacon) warmthFactor += 1.0;

    // 2. Logic: Scaling Target Radius
    // Base is 30. Max is 180.
    // Warmth pushes towards Max. Cold (isolation) pushes towards Min.
    const BASE_RADIUS = 30;
    const MAX_RADIUS = 180;
    let targetRadius = BASE_RADIUS + (150 * warmthFactor);

    // 3. Movement Penalty (Idle Breathing/Cold)
    // If moving very slowly, apply slight 'Cold' damping, unless near warmth
    const speed = Math.sqrt(state.playerVX * state.playerVX + state.playerVY * state.playerVY);
    if (speed < 0.5 && warmthFactor === 0) {
      targetRadius *= 0.8; // Shrink when strictly idle and alone
    }

    // 4. Darkness Wave Penalty
    // Darkness crushes the light radius significantly
    if (darknessIntensity > 0) {
      const darknessPenalty = 1 - (darknessIntensity * 0.7); // Up to 70% reduction
      targetRadius *= darknessPenalty;
    }

    // Clamp Target
    targetRadius = Math.max(BASE_RADIUS, Math.min(MAX_RADIUS, targetRadius));

    // 5. Smooth Transition
    // Move current radius towards target radius
    // We assume this is called every frame(~16ms) or frequently? 
    // Actually updatePlayerPosition is called from Input, which is every frame usually.
    // Use a simple lerp factor (0.05 for smooth breathing)
    state.playerRadius = state.playerRadius + (targetRadius - state.playerRadius) * 0.05;

    // SEND NETWORK UPDATE (Throttied ideally, but for now raw)
    // TODO: optimization: throttle this to 10Hz
    if (Math.random() < 0.2) { // Simple 20% sample throttle for now ~12Hz at 60fps
      gameClient.sendPlayerUpdate({
        x: state.playerX,
        y: state.playerY,
        hue: 0, // playerColor is a string in state; hue conversion handled by server
        realm: (state.currentRealm || DEFAULT_REALM) as RealmId
      });
    }

  }, []);

  /**
   * Add a new fragment - now handled server-side, this is a no-op
   * @deprecated Fragments are now server-authoritative
   */
  const addFragment = useCallback(() => {
    // No-op: fragments are now spawned by the server
  }, []);

  /**
   * Collect a fragment - sends request to server for validation
   * The server will respond with fragment_collected if successful
   */
  const collectFragment = useCallback((fragmentId?: string) => {
    if (fragmentId) {
      // Send collect request to server
      gameClient.collectFragment(fragmentId);
    }
    // Note: fragmentsCollected is now updated when server confirms via fragment_collected event
  }, []);

  /**
   * Light a beacon
   */
  const lightBeacon = useCallback((beaconId: string) => {
    const state = gameState.current;
    const beacon = state.beacons.find(b => b.id === beaconId);

    if (beacon && !beacon.lit) {
      beacon.lit = true;
      beacon.lightLevel = 1;
      state.beaconsLit++;
    }
  }, []);

  /**
   * Form a bond with an AI agent
   */
  const formBond = useCallback((target: IAIAgent): IBond | null => {
    const state = gameState.current;

    // Check if bond already exists
    const existingBond = state.bonds.find(
      b => b.targetId === target.id
    );

    if (existingBond) return null;

    const bond = new Bond(
      target.id,
      target.name,
      target.color || state.playerColor
    );

    // Set the light1/light2 for rendering if needed
    bond.light1 = {
      id: 'player',
      name: 'Player',
      color: state.playerColor,
      x: state.playerX,
      y: state.playerY,
    };
    bond.light2 = {
      id: target.id,
      name: target.name,
      color: target.color || state.playerColor,
      x: target.x,
      y: target.y,
    };

    state.bonds.push(bond as any);
    state.totalBonds++;

    return bond as any;
  }, []);

  /**
   * Add particles to the world
   */
  const addParticles = useCallback((particles: IParticle[]) => {
    gameState.current.particles.push(...(particles as any[]));
  }, []);

  /**
   * Add a ripple effect
   */
  const addRipple = useCallback((
    x: number,
    y: number,
    options?: { maxRadius?: number; color?: string }
  ) => {
    gameState.current.ripples.push(
      new Ripple(x, y, options) as any
    );
  }, []);

  /**
   * Add a shockwave effect
   */
  const addShockwave = useCallback((
    x: number,
    y: number,
    options?: { maxRadius?: number; color?: string }
  ) => {
    gameState.current.shockwaves.push(
      new Shockwave(x, y, options) as any
    );
  }, []);

  /**
   * Add floating text (chat messages, XP gains, etc.)
   */
  const addFloatingText = useCallback((
    text: string,
    x: number,
    y: number,
    options?: { hue?: number; size?: number; duration?: number }
  ) => {
    const hue = options?.hue ?? 90;  // Default cyan-ish
    const size = options?.size ?? 14;
    const duration = options?.duration ?? 1.5;
    const decay = 1 / (duration * 60);  // 60 FPS

    gameState.current.floatingTexts.push({
      id: `float_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      text,
      hue,
      size,
      life: 1,
      decay,
      vy: -0.8,  // Float upward
    });
  }, []);

  /**
   * Get current player position
   */
  const getPlayerPosition = useCallback(() => {
    return {
      x: gameState.current.playerX,
      y: gameState.current.playerY,
    };
  }, []);

  /**
   * Get AI agents within radius of player
   */
  const getNearbyAgents = useCallback((radius: number): IAIAgent[] => {
    const state = gameState.current;
    return state.aiAgents.filter(agent => {
      const dx = agent.x - state.playerX;
      const dy = agent.y - state.playerY;
      return Math.sqrt(dx * dx + dy * dy) < radius;
    });
  }, []);

  /**
   * Get beacon within radius of player
   */
  const getNearbyBeacon = useCallback((radius: number): Beacon | null => {
    const state = gameState.current;
    for (const beacon of state.beacons) {
      const dx = beacon.x - state.playerX;
      const dy = beacon.y - state.playerY;
      if (Math.sqrt(dx * dx + dy * dy) < radius) {
        return beacon;
      }
    }
    return null;
  }, []);

  /**
   * Save game state to local storage
   */
  const saveGameState = useCallback(() => {
    const state = gameState.current;

    saveToStorage(STORAGE_KEYS.PLAYER_DATA, {
      level: 1, // Backup only - server is authoritative via useServerSync
      xp: 0,
      stardust: state.fragmentsCollected,
      totalFragments: state.fragmentsCollected,
      totalBonds: state.totalBonds,
      totalBeacons: state.beaconsLit,
      playTime: state.playTime,
      distanceTraveled: state.distanceTraveled,
    });

    saveToStorage(STORAGE_KEYS.BEACONS_LIT,
      state.beacons.filter(b => b.lit).map(b => b.id)
    );

    saveToStorage(STORAGE_KEYS.AI_AGENTS,
      state.aiAgents.map(a => a.toJSON ? a.toJSON() : a)
    );

    saveToStorage(STORAGE_KEYS.BONDS,
      state.bonds.map(b => b.toJSON ? b.toJSON() : {
        id: b.id,
        targetId: b.targetId,
        targetName: b.targetName,
        targetColor: b.targetColor,
        strength: b.strength,
        consent: b.consent,
        sealed: b.sealed,
        createdAt: b.createdAt,
      })
    );

    saveToStorage(STORAGE_KEYS.STAR_MEMORIES,
      state.starMemories
    );
  }, []);

  /**
   * Load game state from local storage
   */
  const loadGameState = useCallback(() => {
    const state = gameState.current;

    const playerData = loadFromStorage(STORAGE_KEYS.PLAYER_DATA, null);
    if (playerData) {
      state.fragmentsCollected = (playerData as any).totalFragments || 0;
      state.totalBonds = (playerData as any).totalBonds || 0;
      state.beaconsLit = (playerData as any).totalBeacons || 0;
      state.playTime = (playerData as any).playTime || 0;
      state.distanceTraveled = (playerData as any).distanceTraveled || 0;
    }

    const litBeacons = loadFromStorage<string[]>(STORAGE_KEYS.BEACONS_LIT, []);
    state.beacons.forEach(beacon => {
      if (litBeacons.includes(beacon.id)) {
        beacon.lit = true;
        beacon.lightLevel = 1;
      }
    });

    // Load agents FIRST so bonds have targets
    const savedAgents = loadFromStorage<any[]>(STORAGE_KEYS.AI_AGENTS, []);
    if (savedAgents.length > 0 && AIAgent.fromJSON) {
      state.aiAgents = savedAgents.map(data => AIAgent.fromJSON(data));
    }

    const savedBonds = loadFromStorage<any[]>(STORAGE_KEYS.BONDS, []);
    state.bonds = savedBonds.map(data => {
      const bond = Bond.fromJSON(data);
      // Reconstitute light references for rendering
      // Note: We need to find the actual agent or player object to reference
      const targetAgent = state.aiAgents.find(a => a.id === bond.targetId);
      if (targetAgent) {
        bond.light1 = {
          id: 'player',
          name: 'Player',
          color: state.playerColor,
          x: state.playerX,
          y: state.playerY,
        };
        bond.light2 = {
          id: targetAgent.id,
          name: targetAgent.name,
          color: targetAgent.color,
          x: targetAgent.x,
          y: targetAgent.y,
        };
      }
      return bond as any;
    });
    // Filter out bonds where target agent wasn't found (should rarely happen unless agents are regen'd differently)
    // Actually, agents ARE regen'd on init. If we want bonds to persist, we might need to ensure agents persist or we
    // just re-attach to them if they exist. 
    // Since agents are random on init, loading bonds might fail to attach to a specific agent if IDs don't match.
    // However, existing bonds imply we should probably recreate the agents or at least keep the bond data valid?
    // For now, let's assume agent IDs need to be stable or we only bind if found. 
    // Wait, typical game logic: AI agents are persistent too? 
    // The current initializeGame generates random agents.
    // If we want bonds to persist, we MUST persist agents too.

    state.starMemories = loadFromStorage<any[]>(STORAGE_KEYS.STAR_MEMORIES, []);
  }, []);

  /**
   * Gift light to a bonded soul
   */
  const giftLight = useCallback((targetId: string, amount: number): boolean => {
    const state = gameState.current;

    // Find the bond
    const bond = state.bonds.find(b =>
      (b as any).targetId === targetId || (b as any).id === targetId
    );

    if (!bond) return false;

    // Check if we have enough light to gift
    if (state.playerRadius < 50) return false; // Don't gift if too small

    // Reduce player light
    state.playerRadius = Math.max(30, state.playerRadius - amount * 0.5);

    // Create gift visual effect
    const target = state.aiAgents.find(a => a.id === targetId);
    if (target) {
      // Add particles flowing toward target
      for (let i = 0; i < 10; i++) {
        state.particles.push({
          x: state.playerX,
          y: state.playerY,
          vx: (target.x - state.playerX) * 0.02 + (Math.random() - 0.5) * 2,
          vy: (target.y - state.playerY) * 0.02 + (Math.random() - 0.5) * 2,
          life: 60,
          maxLife: 60,
          size: 4,
          color: '#FFD700',
          type: 'gift'
        } as any);
      }
    }

    return true;
  }, []);

  /**
   * Create a light bridge between player and target
   */
  const createLightBridge = useCallback((targetX: number, targetY: number, color: string): void => {
    const state = gameState.current;

    state.lightBridges.push({
      x1: state.playerX,
      y1: state.playerY,
      x2: targetX,
      y2: targetY,
      color,
      alpha: 1,
      life: 180, // 3 seconds at 60fps
      pulsePhase: 0
    } as any);
  }, []);

  /**
   * Seal a bond into a star memory
   */
  const sealBond = useCallback((bondId: string): boolean => {
    const state = gameState.current;

    const bondIndex = state.bonds.findIndex(b => (b as any).id === bondId);
    if (bondIndex === -1) return false;

    const bond = state.bonds[bondIndex] as any;

    // Must be a strong bond to seal
    if (bond.strength < 0.8) return false;

    // Seal it
    bond.sealed = true;
    bond.sealedAt = Date.now();

    // Create star memory
    state.starMemories.push({
      targetName: bond.targetName || 'Unknown',
      targetColor: bond.targetColor || '#FFD700',
      sealedAt: Date.now(),
      myWord: '✨',
      theirWord: '💫'
    });

    // Create celebration effect
    state.shockwaves.push({
      x: state.playerX,
      y: state.playerY,
      radius: 1,
      maxRadius: 500,
      alpha: 1,
      color: '#FFD700',
      speed: 3
    } as any);

    return true;
  }, []);

  // Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetRealmName, setTargetRealmName] = useState('');
  const [targetRealmIcon, setTargetRealmIcon] = useState('');

  /**
   * Switch Realm with Authentic Transition
   */
  const switchRealm = useCallback((realmId: string, name: string, icon: string) => {
    // 1. Start Transition (Fade Out)
    setTargetRealmName(name);
    setTargetRealmIcon(icon);
    setIsTransitioning(true);

    // 2. Wait for fade out, then switch
    setTimeout(() => {
      const state = gameState.current;
      state.currentRealm = realmId;

      // Clear entities that shouldn't persist
      // (Actually, our rendering loop filters them now, so we don't strictly need to clear, 
      // but it might be nice to reset some things?)

      // 3. Wait a bit more, then fade in
      setTimeout(() => {
        setIsTransitioning(false);
      }, 800);
    }, 600);
  }, []);

  /**
   * Trigger a screen flash effect
   */
  const triggerScreenFlash = useCallback((color: string, intensity = 0.5, decay = 0.02): void => {
    gameState.current.screenFlash = { color, intensity, decay };
  }, []);

  return {
    gameState,
    isTransitioning,
    targetRealmName,
    targetRealmIcon,
    switchRealm,
    initializeGame,
    updatePlayerPosition,
    updatePlayerName,
    addFragment,
    collectFragment,
    lightBeacon,
    formBond,
    addParticles,
    addRipple,
    addShockwave,
    getPlayerPosition,
    getNearbyAgents,
    getNearbyBeacon,
    saveGameState,
    loadGameState,
    selectedEntity,
    setSelectedEntity,
    broadcastGesture: useCallback((type, x, y) => {
      // Send to server for multiplayer broadcast
      if (type === 'pulse') {
        gameClient.sendAction('pulse', {
          x,
          y,
          intensity: 0.8,
          color: gameState.current.playerColor || '#87CEEB'
        });
      } else if (type === 'signal') {
        gameClient.sendAction('emote', { type: 'signal', x, y });
      }

      // Also notify local AI agents
      gameState.current.aiAgents.forEach(agent => {
        if (agent.reactToGesture) agent.reactToGesture(type, x, y);
      });
    }, []),
    broadcastMessage: useCallback((text, x, y, radius = 500) => {
      const state = gameState.current;
      if (!state) return;

      // Notify nearby agents
      state.aiAgents.forEach(agent => {
        const dx = agent.x - x;
        const dy = agent.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius && agent.reactToMood) {
          agent.reactToMood(text);
        }
      });

      // Emit wave particles (sound wave visualization)
      const waveCount = 12;
      for (let i = 0; i < waveCount; i++) {
        const angle = (i / waveCount) * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 3,
          color: state.playerColor || '#87CEEB',
          alpha: 0.6,
          life: 1,
          maxLife: 1,
          decay: 0.03,
          type: 'wave' as const
        } as any);
      }

      // Add expanding ripple effect
      state.ripples.push({
        x,
        y,
        radius: 10,
        maxRadius: 120,
        alpha: 0.4,
        speed: 3,
        color: state.playerColor || '#87CEEB',
        life: 1
      } as any);
    }, []),
    giftLight,
    createLightBridge,
    sealBond,
    triggerScreenFlash,
    addFloatingText,
    isTalking,
    setIsTalking,
    voice
  };
}

export default useGameState;
