// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Game State Hook
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useCallback, useState, useEffect } from 'react';
import type { GameStateRef, Beacon, IBond, IAIAgent, IParticle } from '@/types';
import { Bond } from '@/classes/Bond';
import { Particle } from '@/classes/Particle';
import { AIAgent } from '@/classes/AIAgent';
import { Ripple, Shockwave } from '@/classes/Effects';
import { WORLD_SIZE, BEACONS, AI_AGENT_COUNT, getRandomName } from '@/constants/game';
import { LIGHT_COLORS } from '@/constants/cosmetics';
import { randomRange, randomElement } from '@/utils/math';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '@/utils/storage';
import { ALL_REALM_IDS, DEFAULT_REALM } from '@/constants/realms';
import { gameClient, type RealmId } from '@/services/GameClient';

const PERSONALITY_TYPES = ['curious', 'shy', 'social', 'explorer', 'helper', 'beacon_keeper'] as const;

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
}

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

    // Initialize beacons from constants
    state.beacons = BEACONS.map((beacon, index) => ({
      ...beacon,
      realmId: ALL_REALM_IDS[index % ALL_REALM_IDS.length], // Distribute beacons across realms
      active: false, // Start inactive until charged
      lit: false,
      lightLevel: 0,
      pulsePhase: Math.random() * Math.PI * 2,
      charge: 0,
      isCharging: false,
      chargeRate: 0.1, // Charge speed
    }));

    // Initialize AI agents
    state.aiAgents = [];
    for (let i = 0; i < AI_AGENT_COUNT; i++) {
      const x = randomRange(100, WORLD_SIZE - 100);
      const y = randomRange(100, WORLD_SIZE - 100);
      const color = randomElement(Object.values(LIGHT_COLORS)).color;
      const personality = randomElement([...PERSONALITY_TYPES]);
      // 70% of agents in genesis (default realm), 30% in other realms
      const realmId = Math.random() < 0.7 ? DEFAULT_REALM : randomElement(ALL_REALM_IDS);

      state.aiAgents.push(new AIAgent(x, y, color, realmId, personality));
    }

    // Spawn initial fragments
    state.fragments = [];
    spawnFragments(state, 150);

    // Clear effects
    state.particles = [];
    state.ripples = [];
    state.shockwaves = [];
    state.bonds = [];

    // Initialize Visual Effects
    state.nebulae = [];
    state.stars = [];
    state.lightTrails = [];
    state.localFragments = [];
    state.echoes = [];
    state.signals = [];
    state.lightBridges = [];
    state.pulseRipples = [];
    state.currentSeason = 'spring';
    state.darknessIntensity = 0;

    // Spawn initial nebulae
    for (let i = 0; i < 12; i++) {
      state.nebulae.push({
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(0, WORLD_SIZE),
        radius: randomRange(300, 800),
        hue: randomRange(0, 360),
        alpha: randomRange(0.2, 0.5)
      });
    }

    // Spawn initial stars
    for (let i = 0; i < 400; i++) {
      state.stars.push({
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(0, WORLD_SIZE),
        size: randomRange(1, 3),
        alpha: randomRange(0.5, 1),
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    // Spawn initial echoes (messages left by past visitors)
    const echoMessages = [
      { name: 'Wanderer', text: 'The stars remember us...' },
      { name: 'Stargazer', text: 'Look up, friend.' },
      { name: 'Dreamwalker', text: 'We are all connected.' },
      { name: 'Lightkeeper', text: 'Leave your mark.' },
      { name: 'Voidtouched', text: 'Embrace the dark.' },
      { name: 'Starforger', text: 'Create something beautiful.' },
      { name: 'Celestial', text: 'The cosmos sings.' },
      { name: 'Beacon', text: 'Find the light within.' },
    ];
    for (let i = 0; i < 15; i++) {
      const echo = echoMessages[i % echoMessages.length];
      state.echoes.push({
        id: `echo_${i}`,
        x: randomRange(WORLD_SIZE * 0.1, WORLD_SIZE * 0.9),
        y: randomRange(WORLD_SIZE * 0.1, WORLD_SIZE * 0.9),
        name: echo.name,
        text: echo.text,
        hue: Math.floor(Math.random() * 360),
        createdAt: Date.now() - randomRange(0, 86400000), // Random time in last 24h
        ignited: Math.floor(Math.random() * 10),
        r: 20 + Math.random() * 10,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Set game as started
    state.gameStarted = true;
    state.isLoading = false;

    setIsInitialized(true);

    // Connect to Multiplayer Server
    gameClient.connect(playerId, (state.currentRealm || DEFAULT_REALM) as RealmId);

    // Listen for world state updates (contains all remote players)
    const handleWorldState = (data: any) => {
      if (!data?.players) {
        console.log('🌍 world_state: no players in data', data);
        return;
      }
      
      const state = gameState.current;
      const remotePlayers = data.players.filter((p: any) => p.id !== playerId);
      
      console.log(`🌍 world_state: ${data.players.length} total, ${remotePlayers.length} remote players`);
      
      // Update or add remote players
      for (const playerData of remotePlayers) {
        const existingIndex = state.aiAgents.findIndex(a => a.id === playerData.id);
        
        if (existingIndex >= 0) {
          // Update existing
          const agent = state.aiAgents[existingIndex];
          agent.x = playerData.x;
          agent.y = playerData.y;
        } else {
          // Add new remote player as an "Agent"
          console.log(`🌍 Adding remote player: ${playerData.id} at (${playerData.x}, ${playerData.y})`);
          const hueToColor = (hue: number) => `hsl(${hue}, 70%, 60%)`;
          const newAgent = new AIAgent(
            playerData.x, 
            playerData.y, 
            hueToColor(playerData.hue || 180), 
            state.currentRealm || DEFAULT_REALM, 
            'social'
          );
          newAgent.id = playerData.id;
          newAgent.name = playerData.name || `Player_${playerData.id.substring(0, 6)}`;
          state.aiAgents.push(newAgent);
        }
      }
      
      // Remove players that are no longer in the world state
      const remoteIds = new Set(remotePlayers.map((p: any) => p.id));
      state.aiAgents = state.aiAgents.filter(
        agent => !agent.id.startsWith('player_') || remoteIds.has(agent.id)
      );
      
      // Debug: Log total agents with player IDs
      const playerAgents = state.aiAgents.filter(a => a.id.startsWith('player_'));
      if (playerAgents.length > 0 && Math.random() < 0.02) {
        const pa = playerAgents[0];
        console.log(`🎮 aiAgents has ${playerAgents.length} remote: id=${pa.id.substring(0,15)} x=${Math.round(pa.x)} y=${Math.round(pa.y)} realmId=${pa.realmId} currentRealm=${state.currentRealm}`);
      }
    };
    
    (gameClient as any).on('world_state', handleWorldState);

    // Listen for individual player updates (fallback/legacy)
    const handlePlayerUpdate = (data: any) => {
      if (!data || data.id === playerId) return; // Ignore self

      const state = gameState.current;
      // Check if agent/player already exists
      const existingIndex = state.aiAgents.findIndex(a => a.id === data.id);

      if (existingIndex >= 0) {
        // Update existing
        const agent = state.aiAgents[existingIndex];
        agent.x = data.x;
        agent.y = data.y;
        // agent.hue = data.hue; 
      } else {
        // Add new remote player as an "Agent" for now
        const newAgent = new AIAgent(data.x, data.y, '#FFD700', data.realm, 'social'); // Default color/personality
        newAgent.id = data.id;
        newAgent.name = data.name;
        // Override to mark as remote player if AIAgent supports it, or just rely on ID
        state.aiAgents.push(newAgent);
      }
    };
    
    (gameClient as any).on('player_update', handlePlayerUpdate);
    
    // Cleanup on unmount
    return () => {
      (gameClient as any).off('world_state', handleWorldState);
      (gameClient as any).off('player_update', handlePlayerUpdate);
    };

  }, [playerId]);

  /**
   * Spawn fragments in the world
   */
  const spawnFragments = (state: GameStateRef, count: number) => {
    for (let i = 0; i < count; i++) {
      // 70% of fragments in genesis (default realm), 30% in other realms
      const realmId = Math.random() < 0.7 ? DEFAULT_REALM : randomElement(ALL_REALM_IDS);
      const isGolden = Math.random() < 0.1;
      state.fragments.push({
        id: `fragment_${Date.now()}_${i}`,
        realmId,
        x: randomRange(50, WORLD_SIZE - 50),
        y: randomRange(50, WORLD_SIZE - 50),
        collected: false,
        value: isGolden ? 5 : 1,
        phase: 0,
        pulsePhase: Math.random() * Math.PI * 2,
        isGolden,
      });
    }
  };

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
        hue: 0, // TODO: Get actual hue
        realm: (state.currentRealm || DEFAULT_REALM) as RealmId
      });
    }

  }, []);

  /**
   * Add a new fragment to spawn
   */
  const addFragment = useCallback(() => {
    spawnFragments(gameState.current, 1);
  }, []);

  /**
   * Collect a fragment (increment counter)
   */
  const collectFragment = useCallback(() => {
    gameState.current.fragmentsCollected++;
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
      level: 1, // TODO: Add level tracking
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
