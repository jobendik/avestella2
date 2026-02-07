// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Game Canvas Component
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';
import { VoiceVisualizer } from '@/components/ui/VoiceVisualizer';
import { WORLD_SIZE, BOND_CONFIRM_THRESHOLD } from '@/constants/game';
import {
  BIOMES,
  BIOME_GRADIENTS,
  LANDMARKS,
  POINTS_OF_INTEREST,
  FOG_CELL_SIZE,
  getBiomeAtPosition,
} from '@/constants/world';
import { REALMS, type RealmId } from '@/constants/realms';
import { lerp, clamp, distance, randomRange } from '@/utils/math';
import { hexToRgb, addAlpha, resolveColor } from '@/utils/colors';
import { Particle } from '@/utils/ParticleSystem';
import type { GameStateRef, Beacon, Fragment, IBond, IAIAgent, IRipple, IShockwave, IParticle, Biome, PointOfInterest } from '@/types';
import type { Landmark } from '@/constants/world';
import { renderTagOverlay } from '@/rendering/gameOverlays';
import { checkTagCollision, processTag, getTagSpeedModifier, type TagPlayer, updateSurvivalTime } from '@/game/tagArena';
import { usePowerUpsContext } from '@/contexts/GameContext';
import { drawPowerUp } from '@/rendering/powerups';
import { useConstellations } from '@/hooks/useConstellations';
import constellations from '@/rendering/constellations';
import { DEFAULT_REALM } from '@/constants/realms';
import { renderRealmBackground, type BackgroundOptions } from '@/rendering/nebulaBackground';
import { HoverTooltip, type HoveredPlayer } from '@/components/ui/HoverTooltip';
import { gameClient } from '@/services/GameClient';

// Constants for warmth system
const COLD_ONSET_DELAY = 180; // frames before cold starts
const WARMTH_LINGER_FRAMES = 90; // grace period after leaving warmth
const MAX_CONNECTION_DIST = 300; // Legacy: MAX_CONNECTION_DIST = 300

export function GameCanvas(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const { gameState, input, audio, progression, exploration, worldEvents, darkness, pulsePatterns, companions, cosmetics, gameModes, voice, settings } = useGame();
  const powerUps = usePowerUpsContext();
  const { constellations: activeConstellations, detectConstellations } = useConstellations();
  const { showToast, togglePanel, activePanel } = useUI();

  // Use refs to avoid stale closure in game loop
  const inputRef = useRef(input);
  const progressionRef = useRef(progression);
  const audioRef = useRef(audio);
  const explorationRef = useRef(exploration);
  const worldEventsRef = useRef(worldEvents);
  const darknessRef = useRef(darkness);
  const pulsePatternsRef = useRef(pulsePatterns);
  const companionsRef = useRef(companions);
  const cosmeticsRef = useRef(cosmetics);
  const gameModesRef = useRef(gameModes);
  const settingsRef = useRef(settings);
  const showToastRef = useRef(showToast);

  // Hover tooltip state
  const [hoveredPlayer, setHoveredPlayer] = useState<HoveredPlayer | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const hoveredPlayerRef = useRef<HoveredPlayer | null>(null);

  // Update refs when values change
  useEffect(() => {
    inputRef.current = input;
    progressionRef.current = progression;
    audioRef.current = audio;
    explorationRef.current = exploration;
    worldEventsRef.current = worldEvents;
    darknessRef.current = darkness;
    pulsePatternsRef.current = pulsePatterns;
    companionsRef.current = companions;
    cosmeticsRef.current = cosmetics;
    gameModesRef.current = gameModes;
    settingsRef.current = settings;
    showToastRef.current = showToast;
  }, [input, progression, audio, exploration, worldEvents, darkness, pulsePatterns, companions, cosmetics, gameModes, settings, showToast]);

  // ─────────────────────────────────────────────────────────────────────────
  // Interaction Logic
  // ─────────────────────────────────────────────────────────────────────────

  const attemptInteraction = useCallback(() => {
    const state = gameState.gameState.current;
    if (!state) return;

    // 1. Check for nearby Agents
    // Use a slightly larger radius for explicit interaction than passive
    const INTERACTION_RADIUS = 60;
    const nearbyAgent = state.aiAgents.find(agent => {
      // Filter by Realm
      const currentRealm = (state as any).currentRealm || DEFAULT_REALM;
      if (agent.realmId && agent.realmId !== currentRealm) return false;

      const dx = agent.x - state.playerX;
      const dy = agent.y - state.playerY;
      return Math.sqrt(dx * dx + dy * dy) < INTERACTION_RADIUS;
    });

    if (nearbyAgent) {
      const bond = gameState.formBond(nearbyAgent);
      if (bond) {
        audio.play('bond');
        gameState.addShockwave(nearbyAgent.x, nearbyAgent.y, { maxRadius: 100, color: '#FF69B4' });
        showToast(`Connection formed with ${nearbyAgent.name}!`, 'success');
      } else {
        // Already bonded or interaction handling
        nearbyAgent.currentMessage = "Hello friend! ✨";
        nearbyAgent.messageTime = Date.now();
        showToast(`${nearbyAgent.name} waves back!`, 'info');
      }
      return;
    }
  }, [gameState, audio, showToast]);

  // Listen for 'E' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') {
        attemptInteraction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attemptInteraction]);

  // Listen for Tab key to toggle Cosmos panel
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault(); // Prevent default tab navigation
        togglePanel('cosmos');
      }
    };
    window.addEventListener('keydown', handleTabKey);
    return () => window.removeEventListener('keydown', handleTabKey);
  }, [togglePanel]);

  // Listen for 'M' key to toggle music
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key.toLowerCase() === 'm') {
        const currentSettings = settingsRef.current;
        if (!currentSettings) return;

        const isCurrentlyEnabled = currentSettings.settings.musicEnabled;
        const nextState = !isCurrentlyEnabled;

        console.log('[GameCanvas] M key pressed. Toggling music to:', nextState ? 'ON' : 'OFF');

        // Toggle setting
        currentSettings.toggleSetting('musicEnabled');

        // Directly update audio engine state to ensure immediate effect
        audioRef.current.setMusicMuted(!nextState);

        // Feedback
        showToastRef.current(nextState ? 'Music On 🎵' : 'Music Off 🔇', 'info');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array ensures listener is only added once

  // ─────────────────────────────────────────────────────────────────────────
  // Game Loop
  // ─────────────────────────────────────────────────────────────────────────

  const gameLoop = useCallback((currentTime: number) => {
    const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = currentTime;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const state = gameState.gameState.current;

    // Early return if not ready
    if (!canvas || !ctx || !state || !state.gameStarted) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Get current input from ref (avoids stale closure)
    const currentInput = inputRef.current;
    const currentProgression = progressionRef.current;
    const currentAudio = audioRef.current;
    const currentExploration = explorationRef.current;
    const currentWorldEvents = worldEventsRef.current;
    const currentDarkness = darknessRef.current;
    const currentCompanions = companionsRef.current;
    const currentCosmetics = cosmeticsRef.current;
    state.darknessIntensity = currentDarkness.intensity;

    // ───────────────────────────────────────────────────────────────────────
    // Update Phase
    // ───────────────────────────────────────────────────────────────────────

    // ───────────────────────────────────────────────────────────────────────
    // Update Phase
    // ───────────────────────────────────────────────────────────────────────

    // ───────────────────────────────────────────────────────────────────────

    // Update PowerUps
    // Update PowerUps
    // Re-use currentRealm from outer scope or define if needed. 
    // Assuming currentRealm is needed here and might be used above or below.
    // Let's use the property from state safely.
    const updateRealm = state.currentRealm || DEFAULT_REALM;

    powerUps.update(
      deltaTime * 1000,
      state.playerX,
      state.playerY,
      state.playerRadius,
      updateRealm
    );

    // Update Constellations
    detectConstellations(state.stars, state.playerX, state.playerY);
    // Sync to state for other systems if checking
    state.constellations = activeConstellations;

    // Randomly spawn powerups


    // (Removed misplaced drawing code)
    const { interaction, lastEvent, clearLastEvent } = currentInput;

    // Handle One-Shot Events
    if (lastEvent) {
      if (lastEvent.type === 'DOUBLE_TAP') {
        // Double Tap: Bloom/Pulse Effect
        state.screenFlash = { color: state.playerColor, intensity: 0.5, decay: 0.02 };
        gameState.addShockwave(state.playerX, state.playerY, { maxRadius: 400, color: state.playerColor });
        audioRef.current.playBloom();
        gameState.broadcastGesture('pulse', state.playerX, state.playerY);

        // Record pulse for pattern detection
        pulsePatternsRef.current.recordPulseStart();
        setTimeout(() => pulsePatternsRef.current.recordPulseEnd(), 100); // Quick pulse

        // Add particles
        const particles = Array.from({ length: 20 }, () => ({
          x: state.playerX,
          y: state.playerY,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          size: Math.random() * 3 + 1,
          color: state.playerColor,
          alpha: 1,
          life: 1,
          maxLife: 1,
          decay: 0.02,
          type: 'pulse' as const
        }));
        gameState.addParticles(particles);

        // ───────────────────────────────────────────────────────────────────────
        // Bond Formation (Double Tap)
        // ───────────────────────────────────────────────────────────────────────
        // ───────────────────────────────────────────────────────────────────────
        // Bond Interaction (Double Tap)
        // ───────────────────────────────────────────────────────────────────────
        const nearbyAgent = state.aiAgents.find(agent => {
          const dx = agent.x - state.playerX;
          const dy = agent.y - state.playerY;
          return Math.sqrt(dx * dx + dy * dy) < 150; // Use consistent interaction range
        });

        if (nearbyAgent) {
          // Check for existing bond
          const existingBond = state.bonds.find((b: any) => b.targetId === nearbyAgent.id);

          if (existingBond) {
            // CONFIRM EXISTING BOND
            if (existingBond.consent === 'pending' && existingBond.strength > BOND_CONFIRM_THRESHOLD) {
              existingBond.consent = 'mutual';
              existingBond.mode = 'whisper';

              // Play handshake sound and effects
              audioRef.current.playHandshake();
              state.screenFlash = { color: '#a78bfa', intensity: 0.6, decay: 0.02 };

              // Add celebratory particles
              const particleCount = 20;
              for (let j = 0; j < particleCount; j++) {
                const angle = (j / particleCount) * Math.PI * 2;
                state.particles.push({
                  x: (state.playerX + nearbyAgent.x) / 2,
                  y: (state.playerY + nearbyAgent.y) / 2,
                  vx: Math.cos(angle) * 4,
                  vy: Math.sin(angle) * 4,
                  life: 1.2,
                  maxLife: 1.2,
                  size: 5,
                  color: '#FFD700',
                  type: 'spark'
                });
              }

              // Progression rewards
              const bondEventModifiers = currentWorldEvents.getActiveEventModifiers();
              const bondXP = Math.round(50 * bondEventModifiers.xpMultiplier);
              currentProgression.addXP(bondXP);
              currentProgression.addStardust(25);

              showToast(`✨ Bond confirmed with ${nearbyAgent.name}!`, 'success');

              // Force agent reaction
              nearbyAgent.pulse?.();
              nearbyAgent.say?.('Friends! 💖', 3);
            }
          } else {
            // CREATE NEW BOND
            const bond = gameState.formBond(nearbyAgent);
            if (bond) {
              audioRef.current.playBondFormed();
              gameState.addShockwave(nearbyAgent.x, nearbyAgent.y, { maxRadius: 100, color: '#FF69B4' });
              showToast(`Connection formed with ${nearbyAgent.name}!`, 'success');
            }
          }
        }

      } else if (lastEvent.type === 'TAP') {
        // Single Tap: Select Entity or Interact
        const worldX = lastEvent.x + state.cameraX;
        const worldY = lastEvent.y + state.cameraY;

        // Find clicked agent
        const clickedAgent = state.aiAgents.find(a => {
          const dx = a.x - worldX;
          const dy = a.y - worldY;
          return Math.sqrt(dx * dx + dy * dy) < 60;
        });

        if (clickedAgent) {
          // Select/ Interact logic
          showToast(`Selected ${clickedAgent.name}`);
          // Logic to set selected entity in UI would go here if UI context exposed it
        }
      }
      clearLastEvent();
    }

    // Handle detected pulse patterns
    const currentPulsePattern = pulsePatternsRef.current.currentPattern;
    if (currentPulsePattern && !state.lastProcessedPattern) {
      state.lastProcessedPattern = currentPulsePattern;

      switch (currentPulsePattern) {
        case 'HI':
          // Greeting - nearby agents wave back
          showToast('👋 You said "Hi!"', 'info');
          state.aiAgents.forEach(agent => {
            const dx = agent.x - state.playerX;
            const dy = agent.y - state.playerY;
            if (Math.sqrt(dx * dx + dy * dy) < 300) {
              agent.currentMessage = '👋 Hello!';
              agent.messageTime = Date.now();
            }
          });
          break;

        case 'FOLLOW':
          // Ask nearby agents to follow
          showToast('🚶 "Follow me!"', 'info');
          state.aiAgents.forEach(agent => {
            const dx = agent.x - state.playerX;
            const dy = agent.y - state.playerY;
            if (Math.sqrt(dx * dx + dy * dy) < 300 && agent.personality?.type !== 'shy') {
              agent.currentMessage = '🏃 Coming!';
              agent.messageTime = Date.now();
              // Set agent to follow player temporarily
              if (agent.setFollowTarget) agent.setFollowTarget(state.playerX, state.playerY);
            }
          });
          break;

        case 'BEACON':
          // Call all nearby agents to you
          showToast('🔔 Beacon Call!', 'info');
          gameState.addShockwave(state.playerX, state.playerY, { maxRadius: 600, color: '#FFD700' });
          state.aiAgents.forEach(agent => {
            const dx = agent.x - state.playerX;
            const dy = agent.y - state.playerY;
            if (Math.sqrt(dx * dx + dy * dy) < 600) {
              agent.currentMessage = '✨ On my way!';
              agent.messageTime = Date.now();
              if (agent.setFollowTarget) agent.setFollowTarget(state.playerX, state.playerY);
            }
          });
          break;

        case 'STAY':
          // Tell agents to stay where they are
          showToast('🛑 "Stay here"', 'info');
          state.aiAgents.forEach(agent => {
            const dx = agent.x - state.playerX;
            const dy = agent.y - state.playerY;
            if (Math.sqrt(dx * dx + dy * dy) < 300) {
              agent.currentMessage = '🧘 Staying';
              agent.messageTime = Date.now();
              if (agent.clearFollowTarget) agent.clearFollowTarget();
            }
          });
          break;

        case 'HELP':
          // SOS - attract attention and boost light
          showToast('🆘 SOS Signal!', 'success');
          gameState.addShockwave(state.playerX, state.playerY, { maxRadius: 800, color: '#FF4444' });
          gameState.addShockwave(state.playerX, state.playerY, { maxRadius: 600, color: '#FF8800' });
          gameState.addShockwave(state.playerX, state.playerY, { maxRadius: 400, color: '#FFFF00' });
          // Boost player light temporarily
          state.playerRadius = Math.min(180, state.playerRadius + 30);
          break;
      }

      // Clear the processed pattern marker after a delay
      setTimeout(() => { state.lastProcessedPattern = null; }, 1500);
    } else if (!currentPulsePattern) {
      state.lastProcessedPattern = null;
    }

    // Handle Movement (Tap to Move / Hold to Move)
    if (interaction.isInteracting && interaction.targetX !== null && interaction.targetY !== null) {
      // Convert screen coords to world coords
      const contentRect = canvas.getBoundingClientRect(); // Ensure we have correct offset if needed, though interaction.x is usually client relative to target.
      // The hook returns x/y relative to target, so it's effectively screen coordinates (0,0 is top-left of canvas).

      const targetWorldX = interaction.targetX + state.cameraX;
      const targetWorldY = interaction.targetY + state.cameraY;

      const dx = targetWorldX - state.playerX;
      const dy = targetWorldY - state.playerY;

      // Smooth follow
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) { // Deadzone
        const speed = 0.05; // Follow factor
        state.playerVX = dx * speed;
        state.playerVY = dy * speed;
      } else {
        state.playerVX *= 0.8;
        state.playerVY *= 0.8;
      }

      // Check for Spin Gesture (High angular velocity input)
      // This requires tracking angle over time, which might be complex here.
      // Simplified: If input creates a small circle rapidly?
      // For now, let's rely on Double Tap = Pulse.
      // Spin might be better handled by tracking pointer history in useInput, 
      // but we can try estimating it here if we had angular velocity.

    } else {
      // Biome-based Physics (Restored)
      const currentBiome = getBiomeAtPosition(state.playerX, state.playerY);

      // Default physics if biome missing or missing physics prop
      const friction = currentBiome?.physics?.friction || 0.9;
      const drift = currentBiome?.physics?.driftMultiplier || 1.0;

      // Apply friction (modified by drift/biome)
      state.playerVX *= friction;
      state.playerVY *= friction;
    }

    // Apply velocity
    state.playerX += state.playerVX * deltaTime * 60;
    state.playerY += state.playerVY * deltaTime * 60;

    // Constrain to world bounds
    state.playerX = clamp(state.playerX, 50, WORLD_SIZE - 50);
    state.playerY = clamp(state.playerY, 50, WORLD_SIZE - 50);

    // Send position update to server (throttled to ~20Hz for network efficiency)
    if (Math.random() < 0.33) {
      gameClient.sendPlayerUpdate({
        x: state.playerX,
        y: state.playerY,
        hue: 0,
        realm: (state as any).currentRealm || 'genesis'
      });
    }

    // Update camera (Lerp to player)
    // Center player on screen
    state.cameraTargetX = state.playerX - canvas.width / 2;
    state.cameraTargetY = state.playerY - canvas.height / 2;
    state.cameraX = lerp(state.cameraX, state.cameraTargetX, 0.1);
    state.cameraY = lerp(state.cameraY, state.cameraTargetY, 0.1);

    // Clamp camera to world bounds
    state.cameraX = clamp(state.cameraX, 0, WORLD_SIZE - canvas.width);
    state.cameraY = clamp(state.cameraY, 0, WORLD_SIZE - canvas.height);

    // Update AI agents (with distance-based culling - only update agents within 1500 units)
    const AGENT_UPDATE_DISTANCE = 1500;
    state.aiAgents.forEach(agent => {
      const dx = agent.x - state.playerX;
      const dy = agent.y - state.playerY;
      const distSq = dx * dx + dy * dy;

      // Only fully update agents within range OR if they are remote players (to ensure they move into view)
      // Remote players are cheap to update (just lerp) and essential for multiplayer synchronization.
      if (agent.isRemotePlayer || distSq <= AGENT_UPDATE_DISTANCE * AGENT_UPDATE_DISTANCE) {
        if (agent.update) {
          agent.update(
            deltaTime,
            WORLD_SIZE,
            state.playerX,
            state.playerY,
            state.aiAgents,
            state.beacons,
            state.fragments
          );
        }

        // ───────────────────────────────────────────────────────────────────
        // Proximity Tones (Stranger Stage)
        // ───────────────────────────────────────────────────────────────────
        // If near player (< 250px) and NOT bonded, chance to play social tone
        if (distSq < 250 * 250) {
          const isBonded = state.bonds.some(b => b.targetId === agent.id);
          if (!isBonded) {
            // Rate limit: Don't spam tones. Use agent's random properties + time check if possible.
            // We'll use a simple random check that scales with frame rate (assuming 60fps)
            // Chance: ~1% per second (0.00016 per frame)
            if (Math.random() < 0.0002) {
              // Pick a tone based on agent state/personality
              const toneType = agent.personality.type === 'shy' ? 'curious' : 'greeting';
              currentAudio.playSocialTone(toneType);

              // Visual feedback
              if (agent.pulse) agent.pulse();
            }
          }
        }

      } else {
        // Far agents get minimal update (just phase for breathing effect)
        if ('pulsePhase' in agent && typeof agent.pulsePhase === 'number') {
          (agent as any).pulsePhase += deltaTime * 0.5;
        }
      }
    });

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const particle = state.particles[i];

      // Handle class-based particles with update method
      if (particle.update) {
        particle.update(deltaTime);
      } else {
        // Handle plain object particles
        // Apply velocity
        if (particle.vx !== undefined && particle.vy !== undefined) {
          particle.x += particle.vx * deltaTime * 60;
          particle.y += particle.vy * deltaTime * 60;

          // Apply drag
          const drag = particle.type === 'trail' ? 0.99 : 0.96;
          particle.vx *= drag;
          particle.vy *= drag;
        }

        // Update life
        if (particle.decay !== undefined) {
          particle.life -= particle.decay;
        } else if (particle.life !== undefined) {
          particle.life -= deltaTime;
        }

        // Update alpha based on life
        if (particle.maxLife) {
          particle.alpha = Math.max(0, particle.life / particle.maxLife);
        }

        // Update rotation for petal/leaf particles
        if (particle.rotation !== undefined && particle.rotationSpeed !== undefined) {
          particle.rotation += particle.rotationSpeed;
        }
      }

      // Remove dead particles
      if (particle.isDead && particle.isDead()) {
        state.particles.splice(i, 1);
      } else if (particle.life !== undefined && particle.life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    // Update ripples
    for (let i = state.ripples.length - 1; i >= 0; i--) {
      const ripple = state.ripples[i];
      if (ripple.update) ripple.update(deltaTime);
      if (ripple.isDone && ripple.isDone()) {
        state.ripples.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      const shockwave = state.shockwaves[i];
      if (shockwave.update) shockwave.update(deltaTime);
      if (shockwave.isDone && shockwave.isDone()) {
        state.shockwaves.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= ft.decay;
      if (ft.life <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }

    // Update bonds
    for (let i = state.bonds.length - 1; i >= 0; i--) {
      const bond = state.bonds[i];
      if (bond.update) bond.update(deltaTime);
      if (bond.shouldRemove && bond.shouldRemove()) {
        state.bonds.splice(i, 1);
      }
    }

    // Check for handshake confirmation (pending bonds become mutual)
    // Get active world event modifiers for bonus rewards
    const bondEventModifiers = currentWorldEvents.getActiveEventModifiers();
    // BOND_CONFIRM_THRESHOLD is imported from constants
    const now = Date.now();
    state.bonds.forEach((bond: any) => {
      if (bond.consent !== 'pending' || bond.strength < BOND_CONFIRM_THRESHOLD) return;

      const agent = state.aiAgents.find((a: any) => a.id === bond.targetId);
      if (!agent) return;

      const dist = Math.hypot(state.playerX - agent.x, state.playerY - agent.y);
      if (dist > MAX_CONNECTION_DIST) return;

      // Check if agent recently pulsed (simulated) or is socially inclined
      const recentPulse = agent.lastPulseTime && (now - agent.lastPulseTime < 3000);

      // Calculate confirmation chance:
      // - Passive confirmation disabled to ensure player consent.
      // - Bonds must be confirmed via Double Tap (Pulse) or specific agent interaction.
      const willConfirm = recentPulse && bond.strength > 0.8; // Only very rare/high strength auto-confirm from agent side if they just pulsed


      if (willConfirm) {
        bond.consent = 'mutual';
        bond.mode = 'whisper';

        // Play handshake sound and effects
        currentAudio.playHandshake();
        state.screenFlash = { color: '#a78bfa', intensity: 0.4, decay: 0.02 };

        // Add celebratory particles
        for (let j = 0; j < 20; j++) {
          const angle = (j / 20) * Math.PI * 2;
          state.particles.push({
            x: (state.playerX + agent.x) / 2, // Spawning between them looks better
            y: (state.playerY + agent.y) / 2,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            life: 1,
            maxLife: 1,
            size: 4,
            color: '#a78bfa',
            type: 'spark'
          });
        }

        // Agent reaction
        if (agent.say) agent.say('Connected! ✨', 2);
        if (agent.pulse) agent.pulse();

        // Progression rewards (apply world event XP multiplier)
        const bondXP = Math.round(50 * bondEventModifiers.xpMultiplier);
        currentProgression.addXP(bondXP);
        currentProgression.addStardust(25);

        showToast(`✨ Bond confirmed with ${agent.name}!`);
      }
    });

    // ───────────────────────────────────────────────────────────────────────
    // REALM FILTERING & TAG LOGIC
    // ───────────────────────────────────────────────────────────────────────
    const activeRealmId = state.currentRealm || DEFAULT_REALM;
    const visibleAgents = state.aiAgents.filter(a => !a.realmId || a.realmId === activeRealmId);
    const visibleBeacons = state.beacons.filter(b => b.realmId === activeRealmId);

    // Tag Game Logic
    const activeTagGame = gameModesRef.current.tagGame;
    if (activeTagGame && activeTagGame.active && activeRealmId === 'tagarena') {
      const playerTagData: TagPlayer = {
        id: state.playerId, x: state.playerX, y: state.playerY, radius: state.playerRadius
      };
      const otherPlayers = new Map<string, TagPlayer>();
      visibleAgents.forEach(a => {
        otherPlayers.set(a.id, { id: a.id, x: a.x, y: a.y, radius: 20 });
      });
      const collision = checkTagCollision(playerTagData, otherPlayers, activeTagGame);
      if (collision.tagged && collision.newItId) {
        // Correctly identify who we tagged (or if we got tagged)
        // checkTagCollision returns 'newItId' as the person who IS NOW IT.
        // If I was IT, and I tagged X, newItId is X.
        // If X was IT, and they tagged me, newItId is ME.
        // The attemptTag valid target is:
        // - If I am IT, I tag 'newItId' (X).
        // - If I am NOT IT, I cannot 'tag' anyone. The checkTagCollision handles both perspectives.
        // We only want to send attemptTag if WE initiated the tag (we are IT).

        if (activeTagGame.itPlayerId === state.playerId && collision.newItId !== state.playerId) {
          gameModesRef.current.attemptTag(collision.newItId);
          // Optimistic feedback
          audioRef.current.playTag();
          state.screenFlash = { color: '#00FF00', intensity: 0.5, decay: 0.1 };
        }
      }
      if (activeTagGame.itPlayerId !== state.playerId) {
        gameModesRef.current.setTagGame(prev => updateSurvivalTime(prev, state.playerId, deltaTime));
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // BEACON CHARGING LOGIC
    // ───────────────────────────────────────────────────────────────────────
    visibleBeacons.forEach(beacon => {
      if (beacon.lit) return;

      const chargeRadius = 160; // BEACON_CHARGE_RADIUS from constants (imported as magic number to avoid import cycle if needed, or stick to constant)
      const dx = beacon.x - state.playerX;
      const dy = beacon.y - state.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < chargeRadius) {
        // Player is within charging range
        beacon.isCharging = true;
        const rate = (beacon.chargeRate || 0.1) * deltaTime * 60; // Base charge per frame adjusted for delta
        beacon.charge = Math.min(100, (beacon.charge || 0) + rate);

        // Visual feedback for charging (particles)
        if (Math.random() < 0.3) {
          state.particles.push({
            x: beacon.x + (Math.random() - 0.5) * 60,
            y: beacon.y + (Math.random() - 0.5) * 60,
            vx: (beacon.x - state.playerX) * 0.02, // Suck towards beacon center
            vy: (beacon.y - state.playerY) * 0.02,
            life: 0.8,
            maxLife: 0.8,
            size: Math.random() * 3 + 1,
            color: beacon.color,
            alpha: 1,
            type: 'spark'
          } as any);
        }

        // Fully Charged?
        if (beacon.charge >= 100) {
          gameState.lightBeacon(beacon.id);
          audioRef.current.playBeaconActivation(); // Corrected method call
          gameState.addShockwave(beacon.x, beacon.y, { maxRadius: 300, color: beacon.color });
          gameState.triggerScreenFlash(beacon.color, 0.6, 0.02);
          showToast(`${beacon.name} Ignited!`, 'success');
        }
      } else {
        // Player left active area, slowly decay charge?
        // Let's keep it forgiving: no decay or very slow decay.
        beacon.isCharging = false;
        // Optional: slow decay
        // beacon.charge = Math.max(0, (beacon.charge || 0) - deltaTime * 10);
      }
    });

    // Update light bridges
    for (let i = state.lightBridges.length - 1; i >= 0; i--) {
      const bridge = state.lightBridges[i];
      bridge.life -= deltaTime * 0.5; // Decay over 2 seconds

      // Update bridge particles for flowing effect
      bridge.particles.forEach(p => {
        p.life -= deltaTime * 2;
      });
      bridge.particles = bridge.particles.filter(p => p.life > 0);

      // Add new flowing particles
      if (Math.random() < 0.3) {
        const t = Math.random();
        bridge.particles.push({
          x: bridge.x1 + (bridge.x2 - bridge.x1) * t,
          y: bridge.y1 + (bridge.y2 - bridge.y1) * t,
          life: 1
        });
      }

      if (bridge.life <= 0) {
        state.lightBridges.splice(i, 1);
      }
    }

    // Check fragment collection (now server-authoritative)
    // Get active world event modifiers for bonus rewards
    const eventModifiers = currentWorldEvents.getActiveEventModifiers();

    for (let i = state.fragments.length - 1; i >= 0; i--) {
      const fragment = state.fragments[i];
      if (fragment.collected) continue;
      // Filter by Realm
      if (fragment.realmId && fragment.realmId !== activeRealmId) continue;

      const dx = fragment.x - state.playerX;
      const dy = fragment.y - state.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40) {
        // Send collection request to server (server validates and confirms)
        if (fragment.id) {
          gameClient.collectFragment(fragment.id);
        }

        // Mark as collected locally for immediate visual feedback
        // (Server will send fragment_collected/fragment_removed to confirm)
        fragment.collected = true;

        // Apply world event fragment multiplier for visual feedback
        const baseValue = fragment.value || 1;
        const value = Math.round(baseValue * eventModifiers.fragmentMultiplier);

        // ───────────────────────────────────────────────────────────────────
        // Shared Aura System: Check for nearby bonded entities
        // When 3+ bonded players are near a fragment, all share the pickup
        // ───────────────────────────────────────────────────────────────────
        const SHARED_AURA_RADIUS = 150; // Distance to count as "near"
        const SHARED_AURA_THRESHOLD = 3; // Min bonded entities for sharing

        // Get mutual bonds only
        const mutualBonds = state.bonds.filter((b: any) => b.consent === 'mutual');

        // Find bonded agents near the fragment (filtered by visibility/realm)
        const nearbyBondedAgents = visibleAgents.filter((agent: any) => {
          // Check if this agent is bonded to the player
          const isBonded = mutualBonds.some((b: any) => b.targetId === agent.id);
          if (!isBonded) return false;

          // Check distance to fragment
          const agentDx = agent.x - fragment.x;
          const agentDy = agent.y - fragment.y;
          const agentDist = Math.sqrt(agentDx * agentDx + agentDy * agentDy);
          return agentDist < SHARED_AURA_RADIUS;
        });

        // Player counts as 1, plus nearby bonded agents
        const sharedCount = 1 + nearbyBondedAgents.length;
        const isSharedAura = sharedCount >= SHARED_AURA_THRESHOLD;

        // Calculate shared bonus (50% bonus per additional sharer)
        const shareMultiplier = isSharedAura ? 1 + (sharedCount - 1) * 0.5 : 1;
        const sharedValue = Math.round(value * shareMultiplier);

        // Note: Stats are now updated by server via fragment_collected event in useGameState
        // Local update removed - server is authoritative
        // state.fragmentsCollected += sharedValue;  // Now handled by server
        currentProgression.addStardust(sharedValue);  // Keep local XP effect for immediate feedback

        // Visual feedback for shared aura collection
        if (isSharedAura) {
          // Add connecting beam particles between all sharers
          nearbyBondedAgents.forEach((agent: any) => {
            // Beam from fragment to each bonded agent
            for (let j = 0; j < 8; j++) {
              const t = j / 8;
              state.particles.push({
                x: fragment.x + (agent.x - fragment.x) * t,
                y: fragment.y + (agent.y - fragment.y) * t,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 3 + 2,
                color: '#9333EA', // Purple for shared aura
                alpha: 0.8,
                life: 1,
                maxLife: 1,
                decay: 0.02,
                type: 'gift'
              } as any);
            }
          });

          // Special shared aura burst at fragment location
          for (let j = 0; j < 20; j++) {
            const angle = (j / 20) * Math.PI * 2;
            state.particles.push({
              x: fragment.x,
              y: fragment.y,
              vx: Math.cos(angle) * 4,
              vy: Math.sin(angle) * 4,
              size: Math.random() * 4 + 2,
              color: '#A855F7',
              alpha: 1,
              life: 1,
              maxLife: 1,
              decay: 0.015,
              type: 'gift'
            } as any);
          }

          state.screenFlash = { color: '#9333EA', intensity: 0.5, decay: 0.04 };
        }

        // Golden fragments give more rewards and special effects
        if (fragment.isGolden) {
          state.goldenFragmentsCollected = (state.goldenFragmentsCollected || 0) + 1;
          // Apply world event XP multiplier to golden fragment rewards
          const goldenXP = Math.round(sharedValue * 25 * eventModifiers.xpMultiplier);
          currentProgression.addXP(goldenXP);
          currentAudio.playGolden();
          if (!isSharedAura) {
            state.screenFlash = { color: '#FFD700', intensity: 0.9, decay: 0.02 };
          }

          // Add golden particle burst
          // Wave 1: Massive radial explosion
          for (let j = 0; j < 40; j++) {
            const angle = (j / 40) * Math.PI * 2;
            const speed = 12 + Math.random() * 8;
            state.particles.push({
              x: fragment.x,
              y: fragment.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 6 + 3,
              color: '#FFD700',
              alpha: 1,
              life: 1.5,
              maxLife: 1.5,
              decay: 0.012,
              type: 'spark' as const
            } as any);
          }
          // Wave 2: White hot center burst
          for (let j = 0; j < 25; j++) {
            state.particles.push({
              x: fragment.x,
              y: fragment.y,
              vx: (Math.random() - 0.5) * 25,
              vy: (Math.random() - 0.5) * 25,
              size: Math.random() * 5 + 2,
              color: '#FFFFFF',
              alpha: 1,
              life: 0.8,
              maxLife: 0.8,
              decay: 0.02,
              type: 'spark' as const
            } as any);
          }
          // Wave 3: Trailing sparkles
          for (let j = 0; j < 30; j++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            state.particles.push({
              x: fragment.x + (Math.random() - 0.5) * 30,
              y: fragment.y + (Math.random() - 0.5) * 30,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 3 + 1,
              color: '#FFA500',
              alpha: 1,
              life: 2,
              maxLife: 2,
              decay: 0.01,
              type: 'spark' as const
            } as any);
          }

          // Record memory for bonded agents who shared the treasure
          if (isSharedAura) {
            state.bonds.forEach((bond: any) => {
              if (bond.consent === 'mutual' && bond.recordMemory) {
                bond.recordMemory('found_treasure', 'Shared a golden treasure');
              }
            });
          }
        } else {
          currentProgression.addXP(sharedValue * 5);
          currentAudio.playCollect();
          if (!isSharedAura) {
            state.screenFlash = { color: '#FFD700', intensity: 0.5, decay: 0.04 };
          }

          // Add particle burst for regular fragment collection
          // Wave 1: Main radial burst
          for (let j = 0; j < 20; j++) {
            const angle = (j / 20) * Math.PI * 2;
            const speed = 8 + Math.random() * 5;
            state.particles.push({
              x: fragment.x,
              y: fragment.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 4 + 2,
              color: '#FFD700',
              alpha: 1,
              life: 1.2,
              maxLife: 1.2,
              decay: 0.015,
              type: 'spark' as const
            } as any);
          }
          // Wave 2: Center pop
          for (let j = 0; j < 12; j++) {
            state.particles.push({
              x: fragment.x,
              y: fragment.y,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.5) * 15,
              size: Math.random() * 3 + 1,
              color: '#FFFACD',
              alpha: 1,
              life: 0.6,
              maxLife: 0.6,
              decay: 0.025,
              type: 'spark' as const
            } as any);
          }
          // Wave 3: Lingering sparkles
          for (let j = 0; j < 8; j++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            state.particles.push({
              x: fragment.x + (Math.random() - 0.5) * 20,
              y: fragment.y + (Math.random() - 0.5) * 20,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 2 + 1,
              color: '#FFC107',
              alpha: 0.9,
              life: 1.5,
              maxLife: 1.5,
              decay: 0.012,
              type: 'spark' as const
            } as any);
          }
        }

        // Remove fragment locally (server will also send fragment_removed to other players)
        // Note: Fragment spawning is now server-side, no need to call addFragment()
        state.fragments.splice(i, 1);
      }
    }

    // Update beacons
    // Check for Harmonic Resonance (All Lit)
    const allLit = state.beaconsLit >= state.beacons.length;

    // Update beacons
    visibleBeacons.forEach(beacon => {
      // Rhythmic Pulsing Logic
      if (allLit) {
        // Harmonic Resonance: All pulse in perfect unison with a 'heartbeat' pattern
        const heartBeatTime = state.playTime;
        // Heartbeat: bump-bump ... bump-bump
        // sin wave shaped
        const phase = heartBeatTime % 2; // 2 sec cycle
        let intensity = 0;
        if (phase < 0.2) intensity = 1;
        else if (phase < 0.3) intensity = 0.5;
        else if (phase < 0.5) intensity = 1;
        else intensity = 0.2;

        // Smooth lerp
        const current = beacon.pulsePhase || 0;
        beacon.pulsePhase = current + (intensity - current) * 0.15;

      } else if (beacon.lit && beacon.rhythmPattern) {
        const beatDuration = 0.5; // seconds per beat
        const totalSteps = beacon.rhythmPattern.length;
        const time = state.playTime + (beacon.rhythmOffset || 0);
        const stepIndex = Math.floor(time / beatDuration) % totalSteps;
        const targetIntensity = beacon.rhythmPattern[stepIndex];

        // Smooth lerp to target intensity
        const currentIntensity = beacon.pulsePhase || 0;
        beacon.pulsePhase = currentIntensity + (targetIntensity - currentIntensity) * 0.1;
      } else {
        // Default idle pulse if not lit or no pattern
        beacon.pulsePhase = (Math.sin(state.playTime * 2) * 0.2 + 0.8);
      }

      // Check if player is near beacon
      const dx = beacon.x - state.playerX;
      const dy = beacon.y - state.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 100 && !beacon.lit) {
        beacon.lightLevel = Math.min(1, (beacon.lightLevel || 0) + deltaTime * 0.1);

        if (beacon.lightLevel >= 1) {
          beacon.lit = true;
          state.beaconsLit++;
          currentAudio.playBeaconActivation();
          gameState.addShockwave(beacon.x, beacon.y, { maxRadius: 300, color: beacon.color });
        }
      }
    });

    // Update play time
    state.playTime += deltaTime;

    // Update exploration (fog of war, biome detection, discoveries)
    const discoveries = currentExploration.updatePlayerPosition(state.playerX, state.playerY);

    // Update biome ambient sound
    const currentBiome = getBiomeAtPosition(state.playerX, state.playerY);
    if (currentBiome) {
      currentAudio.playBiomeAmbient(currentBiome.id);
    }

    // Handle discoveries (add rewards with world event modifiers)
    const discoveryModifiers = currentWorldEvents.getActiveEventModifiers();
    for (const discovery of discoveries) {
      const bonusStardust = Math.round(discovery.rewards.stardust * discoveryModifiers.fragmentMultiplier);
      const bonusXP = Math.round(discovery.rewards.xp * discoveryModifiers.xpMultiplier);
      currentProgression.addStardust(bonusStardust);
      currentProgression.addXP(bonusXP);
      currentAudio.play('unlock'); // Discovery sound
    }

    // Update world events
    currentWorldEvents.updateEvents(deltaTime);

    // Update screen flash
    if (state.screenFlash) {
      state.screenFlash.intensity -= state.screenFlash.decay * deltaTime * 60;
      if (state.screenFlash.intensity <= 0) {
        state.screenFlash = null;
      }
    }

    // NOTE: Seasonal weather effects are handled in the rendering phase below
    // to avoid duplicate particle spawning (see "Weather Particles (Season-based)")

    // ───────────────────────────────────────────────────────────────────────
    // Dynamic Light Radius (Warmth/Cold) - Enhanced from App.jsx
    // ───────────────────────────────────────────────────────────────────────

    // Constants for warmth system (Moved to top of scope)

    // 1. Calculate Warmth Sources
    let warmthFactor = 0;
    let nearbyCount = 0;

    // Nearby AI Agents (souls)
    visibleAgents.forEach(agent => {
      const adx = agent.x - state.playerX;
      const ady = agent.y - state.playerY;
      const dist = Math.sqrt(adx * adx + ady * ady);

      // ─────────────────────────────────────────────────────────────────────
      // Sync positions for existing bonds (MUST happen even if outside range)
      // ─────────────────────────────────────────────────────────────────────
      const existingBond = state.bonds.find((b: any) => b.targetId === agent.id);
      if (existingBond) {
        if (existingBond.light1) {
          existingBond.light1.x = state.playerX;
          existingBond.light1.y = state.playerY;
        }
        if (existingBond.light2) {
          existingBond.light2.x = agent.x;
          existingBond.light2.y = agent.y;
        }
      }

      if (dist < MAX_CONNECTION_DIST) {
        nearbyCount++;
        warmthFactor += Math.max(0, 1 - dist / MAX_CONNECTION_DIST);

        // Auto-form bonds logic removed to ensure consent.
        // Bonds are now only formed via Double Tap (Pulse).
      }
    });

    // Nearby Bonds (bonded souls give more warmth)
    state.bonds.forEach(b => {
      if (b.light2) {
        const bdx = b.light2.x - state.playerX;
        const bdy = b.light2.y - state.playerY;
        const dist = Math.sqrt(bdx * bdx + bdy * bdy);
        if (dist < MAX_CONNECTION_DIST) {
          warmthFactor += 0.5;
        }
      }
    });

    // Nearby Lit Beacons
    visibleBeacons.forEach(b => {
      if (b.lit) {
        const bdx = b.x - state.playerX;
        const bdy = b.y - state.playerY;
        const dist = Math.sqrt(bdx * bdx + bdy * bdy);
        if (dist < 300) {
          warmthFactor += 1.5;
        }
      }
    });

    // 2. Warmth Linger System
    const isWarm = warmthFactor > 0.1;
    if (isWarm) {
      if (!state.wasNearWarmth) {
        state.warmthLinger = Math.max(state.warmthLinger, 30); // minimum linger
      }
      state.warmthLinger = Math.min(WARMTH_LINGER_FRAMES, state.warmthLinger + 5);
    } else if (state.warmthLinger > 0) {
      state.warmthLinger -= 1;
    }
    state.wasNearWarmth = isWarm;

    // 3. Cold Timer (stationary in darkness)
    const speed = Math.hypot(state.playerVX, state.playerVY);
    if (state.hasMoved && speed < 0.5) {
      state.coldTimer = (state.coldTimer || 0) + 1;
      state.stationaryTimer = (state.stationaryTimer || 0) + 1;
    } else {
      state.coldTimer = 0;
      state.stationaryTimer = 0;
    }
    if (speed > 1) state.hasMoved = true;

    // Idle breath animation (ripples when standing still too long)
    if (state.stationaryTimer > 180 && state.stationaryTimer % 90 === 0) {
      gameState.addRipple(state.playerX, state.playerY, { maxRadius: 80, color: state.playerColor });
    }

    // ───────────────────────────────────────────────────────────────────────
    // VOICE CHAT VISUALS (Legacy Restoration)
    // ───────────────────────────────────────────────────────────────────────
    // If holding spacebar (simulated voice) or Mic active
    if (input.keys.space || gameState.isTalking) { // Assuming input tracks spacebar or state has isTalking
      if (Math.random() < 0.2) {
        // Emit voice wave particle
        state.particles.push({
          x: state.playerX,
          y: state.playerY,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          maxLife: 1,
          size: 5 + Math.random() * 5,
          color: state.playerColor,
          alpha: 0.8,
          decay: 0.05,
          type: 'wave'
        } as any);

        // Occasional Ripple
        if (Math.random() < 0.05) {
          gameState.addRipple(state.playerX, state.playerY, { maxRadius: 150, color: state.playerColor });
        }
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // 4. Trail Boost Mechanic
    // ───────────────────────────────────────────────────────────────────────
    // Walking over your own light trail gives a small light boost
    let trailBoost = 0;
    state.lightTrails.forEach((trail: any) => {
      const dx = trail.x - state.playerX;
      const dy = trail.y - state.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30) {
        const trailAge = Date.now() - (trail.time || 0);
        const trailStrength = Math.max(0, 1 - trailAge / 1000);
        trailBoost += trailStrength * 0.5;
      }
    });
    if (trailBoost > 0) {
      warmthFactor += Math.min(0.3, trailBoost); // Cap trail boost contribution
    }

    // 5. Calculate Target Radius
    const BASE_RADIUS = 30;
    const MAX_RADIUS = 180;

    // Effective warmth includes linger
    const effectiveWarmth = isWarm ? warmthFactor : (state.warmthLinger > 0 ? 0.5 : 0);

    // SOFT CAP: Diminishing returns on warmth growth
    // Uses a logarithmic curve so warmth gains become progressively smaller
    const softCapWarmth = effectiveWarmth > 1
      ? 1 + Math.log(effectiveWarmth) * 0.5  // Soft cap above 1.0
      : effectiveWarmth;
    let targetRadius = BASE_RADIUS + (150 * Math.min(1.5, softCapWarmth)); // Max 1.5x with soft cap

    // Gradual light radius decay when alone in darkness
    if (nearbyCount === 0 && !isWarm && state.warmthLinger === 0) {
      state.aloneTimer = (state.aloneTimer || 0) + 1;
      if (state.aloneTimer > 300) { // 5 seconds at 60fps before decay starts
        const decayRate = 0.02;
        targetRadius = Math.max(BASE_RADIUS * 0.6, targetRadius - (state.aloneTimer - 300) * decayRate);
      }
    } else {
      state.aloneTimer = 0;
    }

    // Cold shrinking when alone too long
    if (state.coldTimer > COLD_ONSET_DELAY && effectiveWarmth === 0) {
      targetRadius = Math.max(BASE_RADIUS * 0.5, targetRadius - (state.coldTimer - COLD_ONSET_DELAY) * 0.1);

      // Occasional Ice Crack Sound
      if (state.playerRadius > targetRadius && Math.random() < 0.01) {
        currentAudio.playIceCrack();
      }
    }

    // 6. Darkness Wave Penalty
    state.darknessIntensity = currentDarkness.intensity;
    if (currentDarkness.intensity > 0) {
      const darknessPenalty = 1 - (currentDarkness.intensity * 0.7);
      targetRadius *= darknessPenalty;

      // Occasional Darkness Rumble
      if (Math.random() < 0.002 * currentDarkness.intensity) {

        // ───────────────────────────────────────────────────────────────────────
        // 6. Constellation Detection
        // ───────────────────────────────────────────────────────────────────────
        // When 3+ mutually bonded players gather, form a constellation
        const CONSTELLATION_RANGE = 200;
        const mutualBondedAgents = state.aiAgents.filter((agent: any) => {
          const bond = state.bonds.find((b: any) => b.targetId === agent.id);
          if (!bond || bond.consent !== 'mutual') return false;
          const dist = Math.hypot(state.playerX - agent.x, state.playerY - agent.y);
          return dist < CONSTELLATION_RANGE;
        });

        // Track constellation members
        state.constellationMembers = mutualBondedAgents.map((a: any) => a.id);

        // Form constellation if 3+ nearby bonded players
        if (mutualBondedAgents.length >= 2) { // Player + 2 = 3 total
          if (!state.inConstellation) {
            state.inConstellation = true;
            state.constellationFormedAt = Date.now();
            currentAudio.playHarmonic();
            showToast(`✨ Constellation formed with ${mutualBondedAgents.length + 1} souls!`);

            // Create constellation particles
            for (let i = 0; i < 30; i++) {
              state.particles.push({
                x: state.playerX,
                y: state.playerY,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1,
                maxLife: 1,
                size: Math.random() * 4 + 2,
                color: '#FFD700',
                type: 'golden' as const
              });
            }
          }

          // Constellation warmth bonus
          targetRadius += mutualBondedAgents.length * 10;
          warmthFactor += mutualBondedAgents.length * 0.3;
        } else if (state.inConstellation) {
          state.inConstellation = false;
          state.constellationMembers = [];
        }
        currentAudio.playDarknessRumble(currentDarkness.intensity);
      }
    }

    // Clamp & Smooth Transition
    targetRadius = Math.max(BASE_RADIUS, Math.min(MAX_RADIUS, targetRadius));
    state.playerRadius = state.playerRadius + (targetRadius - state.playerRadius) * 0.05;

    const playerSpeed = Math.hypot(state.playerVX, state.playerVY);
    const time = Date.now();

    // VELOCITY-BASED TRAIL SPAWNING
    // Trails only spawn when moving fast enough (min velocity threshold)
    const MIN_TRAIL_VELOCITY = 1.5;  // Minimum speed to spawn trails
    const MAX_TRAIL_VELOCITY = 8;     // Speed at which trails are at maximum density

    // Calculate dynamic trail interval based on velocity
    // Faster movement = more frequent trail points
    const velocityNormalized = Math.min(1, (playerSpeed - MIN_TRAIL_VELOCITY) / (MAX_TRAIL_VELOCITY - MIN_TRAIL_VELOCITY));
    const trailInterval = Math.max(30, 80 - velocityNormalized * 50); // 30-80ms based on speed

    if (playerSpeed > MIN_TRAIL_VELOCITY && time - (state.lastTrailPoint || 0) > trailInterval) {
      // Add new trail point with velocity-based properties
      state.lightTrails.push({
        x: state.playerX,
        y: state.playerY,
        time: time,
        velocity: playerSpeed,  // Store velocity for rendering effects
        // Add helper to check alpha if not present
        getCurrentAlpha: () => Math.max(0, 1 - (Date.now() - time) / 1000)
      } as any);
      state.lastTrailPoint = time;
    }

    // Prune old trails
    state.lightTrails = state.lightTrails.filter(t => (Date.now() - (t.time || 0)) < 1000);

    // Update Echoes (none needed, static)

    // ───────────────────────────────────────────────────────────────────────
    // Hover Detection for Tooltip
    // ───────────────────────────────────────────────────────────────────────
    const HOVER_DETECTION_RADIUS = 60; // Halo radius for hover detection
    const pointerWorldX = interaction.pointerX + state.cameraX;
    const pointerWorldY = interaction.pointerY + state.cameraY;

    // Find agent under cursor
    let foundHoveredAgent: HoveredPlayer | null = null;
    for (const agent of state.aiAgents) {
      const dx = agent.x - pointerWorldX;
      const dy = agent.y - pointerWorldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < HOVER_DETECTION_RADIUS) {
        foundHoveredAgent = {
          id: agent.id,
          name: agent.name || 'Wanderer',
          hue: 200, // Default hue since IAIAgent uses string color
          level: 1, // Default level
          isOnline: true
        };
        break;
      }
    }

    // Only update state if changed (to avoid unnecessary re-renders)
    if (foundHoveredAgent?.id !== hoveredPlayerRef.current?.id) {
      hoveredPlayerRef.current = foundHoveredAgent;
      setHoveredPlayer(foundHoveredAgent);
    }

    // Always update position when hovering
    if (foundHoveredAgent) {
      setHoverPosition({ x: interaction.pointerX, y: interaction.pointerY });
    }

    // ───────────────────────────────────────────────────────────────────────
    // Render Phase
    // ───────────────────────────────────────────────────────────────────────

    // Calculate viewport bounds for render culling
    const RENDER_MARGIN = 150; // Extra margin beyond viewport for smooth pop-in
    const viewportLeft = state.cameraX - RENDER_MARGIN;
    const viewportTop = state.cameraY - RENDER_MARGIN;
    const viewportRight = state.cameraX + canvas.width + RENDER_MARGIN;
    const viewportBottom = state.cameraY + canvas.height + RENDER_MARGIN;

    // Helper function to check if entity is in viewport
    const isInViewport = (x: number, y: number, radius = 0): boolean => {
      return x + radius >= viewportLeft &&
        x - radius <= viewportRight &&
        y + radius >= viewportTop &&
        y - radius <= viewportBottom;
    };

    // Get current realm for themed background
    const currentRealmId = ((state as any).currentRealm as RealmId) || 'genesis';
    const currentRealm = REALMS[currentRealmId];

    // Render distinct realm background with animated clouds and styling
    if (currentRealm) {
      // Dynamic Time of Day modifiers (applied to brightness options if needed, but nebula renderer handles aesthetics)
      // We pass camera position for parallax effect

      const bgOptions: BackgroundOptions = {
        time: Date.now(),
        parallaxX: state.cameraX,
        parallaxY: state.cameraY,
        animatedClouds: true, // Enable the dynamic clouds!
        cloudDensity: currentRealm.physics?.particleMultiplier || 0.8 // Use realm density
      };

      // Wrap ctx for the helper function
      const renderContext = {
        ctx,
        width: canvas.width,
        height: canvas.height,
        centerX: canvas.width / 2,
        centerY: canvas.height / 2,
        offsetX: state.cameraX,
        offsetY: state.cameraY,
        textureResources: {} as any // Not used by background renderer currently
      };

      renderRealmBackground(renderContext, currentRealm, bgOptions);
    } else {
      // Fallback
      ctx.fillStyle = '#05050C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Save context and apply camera transform
    ctx.save();
    ctx.translate(-state.cameraX, -state.cameraY);

    // ───────────────────────────────────────────────────────────────────────
    // Weather Particles (Season-based)
    // ───────────────────────────────────────────────────────────────────────
    const weatherSeason = state.currentSeason || 'spring';

    // Spawn weather particles based on season
    if (weatherSeason === 'winter' || weatherSeason === 'Snow' && Math.random() < 0.3) {
      // Snow/Snowflake particles
      const isSnowflake = Math.random() < 0.2;
      state.particles.push({
        x: state.playerX + (Math.random() - 0.5) * canvas.width,
        y: state.playerY - canvas.height / 2,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1 + Math.random() * 0.5,
        size: isSnowflake ? Math.random() * 4 + 3 : Math.random() * 3 + 1,
        color: '#FFFFFF',
        alpha: 0.7,
        life: 1,
        maxLife: 1,
        decay: 0.003,
        type: isSnowflake ? 'snowflake' : 'snow'
      } as any);
    } else if (weatherSeason === 'spring' && Math.random() < 0.15) {
      // Rain particles
      state.particles.push({
        x: state.playerX + (Math.random() - 0.5) * canvas.width,
        y: state.playerY - canvas.height / 2,
        vx: 0.5,
        vy: 8 + Math.random() * 4,
        size: 2,
        color: '#87CEEB',
        alpha: 0.4,
        life: 1,
        maxLife: 1,
        decay: 0.02,
        type: 'rain'
      } as any);

      // Also spawn some flower petals in spring
      if (Math.random() < 0.3) {
        state.particles.push({
          x: state.playerX + (Math.random() - 0.5) * canvas.width,
          y: state.playerY - canvas.height / 2,
          vx: (Math.random() - 0.5) * 2,
          vy: 0.5 + Math.random() * 0.8,
          size: Math.random() * 4 + 2,
          color: ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FFD1DC'][Math.floor(Math.random() * 4)],
          alpha: 0.7,
          life: 1,
          maxLife: 1,
          decay: 0.002,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
          type: 'petal'
        } as any);
      }
    } else if (weatherSeason === 'summer' && Math.random() < 0.1) {
      // Summer - Floating dust motes / fireflies at night
      const hour = Math.floor((Date.now() / 1000 / 60) % 24);
      const isNight = hour < 6 || hour > 18;

      if (isNight) {
        // Firefly-like particles
        state.particles.push({
          x: state.playerX + (Math.random() - 0.5) * canvas.width,
          y: state.playerY + (Math.random() - 0.5) * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          color: '#FFFF66',
          alpha: 0.8,
          life: 1,
          maxLife: 1,
          decay: 0.008,
          type: 'gift' // Glowing sparkle effect
        } as any);
      } else {
        // Floating dust motes
        state.particles.push({
          x: state.playerX + (Math.random() - 0.5) * canvas.width,
          y: state.playerY + (Math.random() - 0.5) * canvas.height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: -0.1 - Math.random() * 0.1,
          size: Math.random() * 1.5 + 0.5,
          color: '#FFFACD',
          alpha: 0.4,
          life: 1,
          maxLife: 1,
          decay: 0.002,
          type: 'dust'
        } as any);
      }
    } else if (weatherSeason === 'autumn' && Math.random() < 0.08) {
      // Falling leaves
      state.particles.push({
        x: state.playerX + (Math.random() - 0.5) * canvas.width,
        y: state.playerY - canvas.height / 2,
        vx: (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 0.5,
        size: Math.random() * 4 + 3,
        color: ['#FF6B35', '#F7931E', '#C1440E', '#8B4513'][Math.floor(Math.random() * 4)],
        alpha: 0.8,
        life: 1,
        maxLife: 1,
        decay: 0.003,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        type: 'leaf'
      } as any);
    }

    // ───────────────────────────────────────────────────────────────────────
    // Tag Game Logic
    // ───────────────────────────────────────────────────────────────────────
    // Update Tag Game State
    if (state.tagGameState && state.tagGameState.active) {
      // Update survival time
      const deltaTime = 0.016; // Approx 60fps
      if (state.tagGameState.itPlayerId !== state.playerId) {
        state.tagGameState.survivalTime += deltaTime;
      }

      // Check collisions
      const tagPlayer = { id: state.playerId, x: state.playerX, y: state.playerY, radius: state.playerRadius };
      // Note: mapping aiAgents to tag players is simplified here for brevity
      // ideally we map all players. For now checking against IT if we are not IT, or others if we are IT.
      // But we need the 'others' map.
      // For Single Player / AI Agents simulation:
      const otherPlayers = new Map<string, any>();
      state.aiAgents.forEach(a => otherPlayers.set(a.id, { id: a.id, x: a.x, y: a.y, radius: a.currentRadius || 40 }));

      const collision = checkTagCollision(tagPlayer, otherPlayers, state.tagGameState);

      if (collision.tagged) {
        // Handle Tag Event
        state.tagGameState = processTag(state.tagGameState, collision.newItId!);

        // Spawn Tag Particles (Explosion)
        if (collision.tagPosition) {
          for (let i = 0; i < 20; i++) {
            state.particles.push({
              x: collision.tagPosition.x,
              y: collision.tagPosition.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              size: Math.random() * 6 + 2,
              color: '#ef4444', // Red
              life: 1.0,
              maxLife: 1.0,
              decay: 0.02,
              type: 'spark'
            } as any);
          }
        }

        // Show notification (floating text)
        state.floatingTexts.push({
          id: `tag-${Date.now()}`,
          x: collision.tagPosition?.x || state.playerX,
          y: collision.tagPosition?.y || state.playerY,
          text: collision.newItId === state.playerId ? 'YOU ARE IT!' : 'TAGGED!',
          hue: 0,
          size: 32,
          life: 2,
          decay: 0.01,
          vy: -1
        });
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Darkness Wave Particles
    // ───────────────────────────────────────────────────────────────────────
    // When darkness intensity > 0, spawn creeping dark mist particles
    if (state.darknessIntensity > 0.1 && Math.random() < state.darknessIntensity * 0.3) {
      // Dark mist particles creeping from edges
      const edge = Math.floor(Math.random() * 4);
      let spawnX = state.playerX;
      let spawnY = state.playerY;
      let vx = 0;
      let vy = 0;

      switch (edge) {
        case 0: // Top
          spawnX = state.playerX + (Math.random() - 0.5) * canvas.width;
          spawnY = state.playerY - canvas.height / 2 - 50;
          vx = (Math.random() - 0.5) * 0.5;
          vy = 0.3 + Math.random() * 0.3;
          break;
        case 1: // Bottom
          spawnX = state.playerX + (Math.random() - 0.5) * canvas.width;
          spawnY = state.playerY + canvas.height / 2 + 50;
          vx = (Math.random() - 0.5) * 0.5;
          vy = -0.3 - Math.random() * 0.3;
          break;
        case 2: // Left
          spawnX = state.playerX - canvas.width / 2 - 50;
          spawnY = state.playerY + (Math.random() - 0.5) * canvas.height;
          vx = 0.3 + Math.random() * 0.3;
          vy = (Math.random() - 0.5) * 0.5;
          break;
        case 3: // Right
          spawnX = state.playerX + canvas.width / 2 + 50;
          spawnY = state.playerY + (Math.random() - 0.5) * canvas.height;
          vx = -0.3 - Math.random() * 0.3;
          vy = (Math.random() - 0.5) * 0.5;
          break;
      }

      state.particles.push({
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        size: Math.random() * 15 + 10,
        color: '#1a0a30',
        alpha: state.darknessIntensity * 0.6,
        life: 1,
        maxLife: 1,
        decay: 0.003,
        type: 'dust' as const
      } as any);
    }

    // Dark wisps near player during darkness
    if (state.darknessIntensity > 0.3 && Math.random() < 0.05) {
      const angle = Math.random() * Math.PI * 2;
      const dist = state.playerRadius + 30 + Math.random() * 50;
      state.particles.push({
        x: state.playerX + Math.cos(angle) * dist,
        y: state.playerY + Math.sin(angle) * dist,
        vx: Math.cos(angle + Math.PI) * 0.5, // Move toward player
        vy: Math.sin(angle + Math.PI) * 0.5,
        size: Math.random() * 6 + 4,
        color: '#2d1f4e',
        alpha: 0.7,
        life: 1,
        maxLife: 1,
        decay: 0.02,
        type: 'dust' as const
      } as any);
    }

    // Draw nebulae (background layer)
    state.nebulae.forEach(nebula => {
      drawNebula(ctx, nebula, state.cameraX, state.cameraY);
    });

    // Draw twinkling stars in background (like original App.jsx) - using state.stars now
    state.stars.forEach(star => {
      drawStar(ctx, star, state.cameraX, state.cameraY, canvas.width, canvas.height, state.darknessIntensity);
    });

    // Draw Constellations
    if (state.constellations && state.constellations.length > 0) {
      // Create compatible CanvasContext for the renderer
      const constellationCtx = {
        ctx,
        width: canvas.width,
        height: canvas.height,
        centerX: canvas.width / 2,
        centerY: canvas.height / 2,
        offsetX: -state.cameraX,
        offsetY: -state.cameraY
      };
      constellations.renderConstellations(constellationCtx, state.constellations);
    }

    // Background grid removed for clean look
    // drawGrid(ctx, state.cameraX, state.cameraY, canvas.width, canvas.height);

    // Draw Light Trails (under everything)
    state.lightTrails.forEach(trail => {
      drawLightTrail(ctx, trail, state.cameraX, state.cameraY);
    });

    // Draw Echoes (under everything)
    state.echoes.forEach(echo => {
      drawEcho(ctx, echo, state.cameraX, state.cameraY, state.playerX, state.playerY);
    });

    // Draw beacons
    const renderRealm = state.currentRealm || DEFAULT_REALM;
    state.beacons.forEach(beacon => {
      // Filter by Realm
      if (beacon.realmId && beacon.realmId !== renderRealm) return;
      drawBeacon(ctx, beacon);
      drawBeacon(ctx, beacon);
    });

    drawPowerUps(ctx, powerUps.powerups, renderRealm);

    // Draw landmarks
    drawLandmarks(ctx, LANDMARKS, exploration.discoveredLandmarks, state.cameraX, state.cameraY, canvas.width, canvas.height);

    // Draw POIs
    drawPOIs(ctx, POINTS_OF_INTEREST, exploration.discoveredPOIs, state.cameraX, state.cameraY, canvas.width, canvas.height);

    // Enable Neon Glow
    ctx.globalCompositeOperation = 'screen';

    // Draw fragments (with culling)
    state.fragments.forEach(fragment => {
      // Filter by Realm
      if (fragment.realmId && fragment.realmId !== renderRealm) return;

      if (!fragment.collected && isInViewport(fragment.x, fragment.y, 20)) {
        drawFragment(ctx, fragment);
      }
    });

    // Draw bonds (with culling - check if either endpoint is in viewport)
    state.bonds.forEach(bond => {
      // Visibility checks (Legacy Parity)
      if (bond.strength <= 0) return;

      // Calculate distance for culling (Legacy: MAX_CONNECTION_DIST * 1.5)
      const target = state.aiAgents.find((a: any) => a.id === bond.targetId);

      // Filter by Realm (Hide bonds to invisible agents)
      if (target && target.realmId && target.realmId !== renderRealm) return;

      if (target) {
        const dist = Math.hypot(state.playerX - target.x, state.playerY - target.y);
        if (dist > 450) return; // 300 * 1.5
      }

      const isPlayerInView = isInViewport(state.playerX, state.playerY, 100);
      const isTargetInView = target && isInViewport(target.x, target.y, 100);
      if (isPlayerInView || isTargetInView) {
        drawBond(ctx, bond);
      }
    });

    // Draw constellation lines when 3+ bonded players are together
    if (state.inConstellation && state.constellationMembers.length >= 2) {
      drawConstellation(ctx, state);
    }

    // Draw light bridges (with culling)
    state.lightBridges.forEach(bridge => {
      // Check if either endpoint is in viewport
      if (isInViewport(bridge.x1, bridge.y1, 50) || isInViewport(bridge.x2, bridge.y2, 50)) {
        drawLightBridge(ctx, bridge);
      }
    });

    // Draw AI agents (with viewport culling)
    state.aiAgents.forEach(agent => {
      // Filter by Realm
      if (agent.realmId && agent.realmId !== renderRealm) return;

      if (isInViewport(agent.x, agent.y, agent.currentRadius || 50)) {
        drawAgent(ctx, agent, state);
      }
    });

    // Draw ripples (with culling)
    state.ripples.forEach(ripple => {
      if (isInViewport(ripple.x, ripple.y, ripple.radius || 100)) {
        drawRipple(ctx, ripple);
      }
    });

    // Draw shockwaves (with culling)
    state.shockwaves.forEach(shockwave => {
      if (isInViewport(shockwave.x, shockwave.y, shockwave.radius || 200)) {
        drawShockwave(ctx, shockwave);
      }
    });

    // Draw floating texts (chat messages, XP gains, etc.)
    state.floatingTexts.forEach(ft => {
      if (isInViewport(ft.x, ft.y, ft.size || 20)) {
        drawFloatingText(ctx, ft);
      }
    });

    // Draw particles (with culling)
    state.particles.forEach(particle => {
      if (isInViewport(particle.x, particle.y, particle.size || 10)) {
        drawParticle(ctx, particle);
      }
    });

    // Draw world event particles
    const eventParticles = currentWorldEvents.getEventParticles();
    eventParticles.forEach(particle => {
      drawWorldEventParticle(ctx, particle);
    });

    // Apply world event visual modifiers (glow intensity effect)
    const worldEventModifiers = currentWorldEvents.getActiveEventModifiers();
    if (worldEventModifiers.glowIntensity > 1) {
      // Apply subtle screen-wide glow boost during events
      ctx.globalCompositeOperation = 'screen';
      const glowBoost = (worldEventModifiers.glowIntensity - 1) * 0.15; // Subtle effect
      ctx.fillStyle = `rgba(255, 255, 200, ${glowBoost})`;
      ctx.fillRect(state.cameraX, state.cameraY, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Apply visibility reduction during storms
    if (worldEventModifiers.visibilityBonus < 0) {
      // Add slight fog/mist effect
      ctx.globalCompositeOperation = 'source-over';
      const fogIntensity = Math.abs(worldEventModifiers.visibilityBonus) * 0.003;
      ctx.fillStyle = `rgba(100, 80, 150, ${fogIntensity})`; // Purple-ish storm fog
      ctx.fillRect(state.cameraX, state.cameraY, canvas.width, canvas.height);
    }

    // Draw equipped aura effect (behind player)
    if (currentCosmetics.currentAura && currentCosmetics.currentAura.radius) {
      drawAura(ctx, state, currentCosmetics.currentAura);
    }

    // Draw player
    drawPlayer(ctx, state);

    // Draw equipped companion orbiting player
    if (currentCompanions.equippedCompanion) {
      drawCompanion(ctx, state, currentCompanions.equippedCompanion, currentCompanions.equippedCompanionData);
    }

    // Reset blending
    ctx.globalCompositeOperation = 'source-over';
    // NOTE: Fog of war removed - original App.jsx doesn't have this
    // drawFogOfWar(ctx, currentExploration.exploredCells, state.cameraX, state.cameraY, canvas.width, canvas.height);

    // Draw Screen Flash
    if (state.screenFlash) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = state.screenFlash.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, state.screenFlash.intensity));
      ctx.fillRect(state.cameraX, state.cameraY, canvas.width, canvas.height);
    }

    // Draw Darkness Overlay
    if (currentDarkness.intensity > 0) {
      ctx.globalCompositeOperation = 'source-over';

      // Calculate vignette effect
      const gradient = ctx.createRadialGradient(
        state.cameraX + canvas.width / 2,
        state.cameraY + canvas.height / 2,
        canvas.height * 0.4,
        state.cameraX + canvas.width / 2,
        state.cameraY + canvas.height / 2,
        canvas.height * 0.9
      );

      // Inner is transparent, outer is dark
      gradient.addColorStop(0, `rgba(0, 0, 0, ${currentDarkness.intensity * 0.3})`);
      gradient.addColorStop(1, `rgba(0, 0, 0, ${currentDarkness.intensity * 0.95})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(state.cameraX, state.cameraY, canvas.width, canvas.height);

      // Add overall dimming for active phase
      if (currentDarkness.phase === 'active') {
        ctx.fillStyle = `rgba(0, 0, 10, ${currentDarkness.intensity * 0.4})`;
        ctx.fillRect(state.cameraX, state.cameraY, canvas.width, canvas.height);
      }
    }

    // Draw Tag Arena Overlay (Restored Feature)
    const currentTagGame = gameModesRef.current.tagGame;
    if (currentTagGame && currentTagGame.active) {
      // Construct context object expected by renderTagOverlay
      const overlayContext = {
        ctx,
        width: canvas.width,
        height: canvas.height,
        centerX: canvas.width / 2,
        centerY: canvas.height / 2,
        offsetX: 0, // We are in screen space
        offsetY: 0
      };

      renderTagOverlay(
        overlayContext,
        currentTagGame,
        state.playerId,
        canvas.width / 2, // Player is centered in screen space
        canvas.height / 2,
        currentTagGame.itPlayerId === state.playerId ? null : null, // Helper for IT target not implemented yet
        { screenWidth: canvas.width, screenHeight: canvas.height }
      );
    }

    // Restore context
    ctx.restore();

    // Draw directional arrows for off-screen entities (in screen space, after camera transform)
    drawOffscreenArrows(ctx, state, canvas.width, canvas.height);

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]); // Only depend on gameState, refs handle the rest

  // ─────────────────────────────────────────────────────────────────────────
  // Canvas Setup
  // ─────────────────────────────────────────────────────────────────────────

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize game
    gameState.initializeGame();

    // Initialize audio on first interaction
    let audioInitialized = false;
    const handleFirstInteraction = async () => {
      if (!audioInitialized) {
        const success = await audioRef.current.initialize();
        if (success) {
          audioInitialized = true;
          console.log('[GameCanvas] Audio initialized successfully');
        }
      }
      // Keep trying to resume AudioContext on mobile until it's running
      await audioRef.current.resume();
    };

    // Add listeners for multiple interaction types (iOS needs this)
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    window.addEventListener('touchend', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    // Start game loop
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('touchend', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []); // Empty deps - only run once on mount

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
        onPointerDown={input.handlePointerDown}
        onPointerMove={input.handlePointerMove}
        onPointerUp={input.handlePointerUp}
        onPointerLeave={input.handlePointerUp}
      />
      {/* Hover tooltip for players */}
      <HoverTooltip
        player={hoveredPlayer}
        x={hoverPosition.x}
        y={hoverPosition.y}
        visible={hoveredPlayer !== null}
      />
      <VoiceVisualizer />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing Functions
// ─────────────────────────────────────────────────────────────────────────────


function drawGrid(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  width: number,
  height: number
): void {
  const gridSize = 100;
  const startX = Math.floor(cameraX / gridSize) * gridSize;
  const startY = Math.floor(cameraY / gridSize) * gridSize;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;

  for (let x = startX; x < cameraX + width + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, cameraY);
    ctx.lineTo(x, cameraY + height);
    ctx.stroke();
  }

  for (let y = startY; y < cameraY + height + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(cameraX, y);
    ctx.lineTo(cameraX + width, y);
    ctx.stroke();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: any): void {
  const { playerX, playerY, playerRadius, playerColor, playerName } = state;
  const time = Date.now();
  const selfPulse = Math.sin(time / 1000) * 2;
  const pulseRadius = playerRadius + selfPulse;

  // Use additive blending for beautiful glow
  ctx.globalCompositeOperation = 'screen';

  // Rich multi-stop gradient like original
  const selfGrad = ctx.createRadialGradient(
    playerX, playerY, 5,
    playerX, playerY, pulseRadius
  );
  selfGrad.addColorStop(0, '#FFFFFF');
  selfGrad.addColorStop(0.15, playerColor);
  selfGrad.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)');
  selfGrad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = selfGrad;
  ctx.beginPath();
  ctx.arc(playerX, playerY, pulseRadius, 0, Math.PI * 2);
  ctx.fill();

  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';

  // Render player name above self
  if (playerName) {
    const nameY = playerY - pulseRadius - 16;

    // Text outline for readability (dark stroke behind text)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(playerName, playerX, nameY);

    // Golden text fill to match player color
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText(playerName, playerX, nameY);

    ctx.textBaseline = 'alphabetic';
  }
}

function drawCompanion(
  ctx: CanvasRenderingContext2D,
  state: any,
  companion: any,
  companionData: any
): void {
  if (!companion) return;

  const { playerX, playerY } = state;
  const time = Date.now();

  // Calculate orbital position
  const orbitSpeed = companion.orbitSpeed || 0.002;
  const orbitRadius = companion.orbitRadius || 40;
  const angle = time * orbitSpeed;

  const companionX = playerX + Math.cos(angle) * orbitRadius;
  const companionY = playerY + Math.sin(angle) * orbitRadius;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Draw companion glow
  const glowGradient = ctx.createRadialGradient(
    companionX, companionY, 0,
    companionX, companionY, companion.size * 2
  );
  glowGradient.addColorStop(0, companion.glowColor || companion.color);
  glowGradient.addColorStop(1, 'transparent');

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(companionX, companionY, companion.size * 2, 0, Math.PI * 2);
  ctx.fill();

  // Draw companion core
  const coreGradient = ctx.createRadialGradient(
    companionX, companionY, 0,
    companionX, companionY, companion.size
  );
  coreGradient.addColorStop(0, '#FFFFFF');
  coreGradient.addColorStop(0.5, companion.color);
  coreGradient.addColorStop(1, 'transparent');

  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(companionX, companionY, companion.size, 0, Math.PI * 2);
  ctx.fill();

  // Draw sparkle particles if companion has them
  if (companion.particleType === 'sparkle' || companion.particleType === 'trail') {
    const sparkleCount = 3;
    for (let i = 0; i < sparkleCount; i++) {
      const sparkleAngle = angle * 2 + (i * Math.PI * 2 / sparkleCount);
      const sparkleRadius = companion.size * 1.5;
      const sx = companionX + Math.cos(sparkleAngle) * sparkleRadius;
      const sy = companionY + Math.sin(sparkleAngle) * sparkleRadius;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time / 200 + i) * 0.3})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw level indicator if leveled up
  if (companionData && companionData.level > 1) {
    ctx.fillStyle = '#FFD700';
    ctx.font = '8px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv${companionData.level}`, companionX, companionY - companion.size - 8);
  }

  ctx.restore();
}

function drawAura(
  ctx: CanvasRenderingContext2D,
  state: any,
  aura: any
): void {
  if (!aura || !aura.radius) return;

  const { playerX, playerY, playerColor } = state;
  const time = Date.now();
  const baseRadius = aura.radius;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Animated auras pulse and rotate
  const pulseAmount = aura.animated ? Math.sin(time / 500) * 5 : 0;
  const effectRadius = baseRadius + pulseAmount;

  // Different aura effects based on name/type
  const auraName = aura.name?.toLowerCase() || '';

  if (auraName.includes('flame')) {
    // Flame aura - flickering fire effect
    const flameCount = 12;
    for (let i = 0; i < flameCount; i++) {
      const angle = (i / flameCount) * Math.PI * 2 + time / 1000;
      const flicker = Math.sin(time / 100 + i * 0.5) * 5;
      const r = effectRadius + flicker;
      const fx = playerX + Math.cos(angle) * r * 0.8;
      const fy = playerY + Math.sin(angle) * r * 0.8;

      const flameGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 10);
      flameGrad.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
      flameGrad.addColorStop(0.5, 'rgba(255, 100, 0, 0.5)');
      flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(fx, fy, 10, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (auraName.includes('electric')) {
    // Electric aura - lightning arcs
    const arcCount = 6;
    ctx.strokeStyle = '#00BFFF';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 10;

    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2 + time / 500;
      const arcLength = effectRadius * (0.6 + Math.random() * 0.4);

      ctx.beginPath();
      ctx.moveTo(playerX, playerY);

      // Create jagged lightning path
      let currentRadius = 0;
      while (currentRadius < arcLength) {
        currentRadius += 8;
        const jitter = (Math.random() - 0.5) * 15;
        const px = playerX + Math.cos(angle + jitter * 0.02) * currentRadius;
        const py = playerY + Math.sin(angle + jitter * 0.02) * currentRadius + jitter;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

  } else if (auraName.includes('cosmic')) {
    // Cosmic aura - swirling stars
    const starCount = 15;
    const rotationSpeed = time / 2000;

    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2 + rotationSpeed;
      const orbitRadius = effectRadius * (0.5 + (i % 3) * 0.2);
      const sx = playerX + Math.cos(angle) * orbitRadius;
      const sy = playerY + Math.sin(angle) * orbitRadius;
      const starSize = 2 + Math.sin(time / 300 + i) * 1;

      // Star colors vary
      const colors = ['#FFFFFF', '#FFD700', '#87CEEB', '#FF69B4', '#C084FC'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.7 + Math.sin(time / 200 + i * 0.3) * 0.3;

      ctx.beginPath();
      ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

  } else if (auraName.includes('divine')) {
    // Divine aura - heavenly rays
    const rayCount = 8;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + time / 3000;
      const rayGrad = ctx.createLinearGradient(
        playerX, playerY,
        playerX + Math.cos(angle) * effectRadius,
        playerY + Math.sin(angle) * effectRadius
      );
      rayGrad.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
      rayGrad.addColorStop(0.5, 'rgba(255, 255, 200, 0.3)');
      rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(playerX, playerY);
      ctx.lineTo(
        playerX + Math.cos(angle - 0.15) * effectRadius,
        playerY + Math.sin(angle - 0.15) * effectRadius
      );
      ctx.lineTo(
        playerX + Math.cos(angle + 0.15) * effectRadius,
        playerY + Math.sin(angle + 0.15) * effectRadius
      );
      ctx.closePath();
      ctx.fill();
    }

    // Central divine glow
    const divineGlow = ctx.createRadialGradient(playerX, playerY, 0, playerX, playerY, effectRadius * 0.5);
    divineGlow.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
    divineGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = divineGlow;
    ctx.beginPath();
    ctx.arc(playerX, playerY, effectRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (auraName.includes('sparkle')) {
    // Sparkle ring - orbiting sparkles
    const sparkleCount = 10;

    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / sparkleCount) * Math.PI * 2 + time / 800;
      const wobble = Math.sin(time / 200 + i) * 3;
      const sx = playerX + Math.cos(angle) * (effectRadius + wobble);
      const sy = playerY + Math.sin(angle) * (effectRadius + wobble);
      const alpha = 0.5 + Math.sin(time / 150 + i * 0.5) * 0.4;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (auraName.includes('pulsing')) {
    // Pulsing energy - expanding rings
    const ringCount = 3;
    const cycleTime = 1500;

    for (let i = 0; i < ringCount; i++) {
      const phase = ((time + i * cycleTime / ringCount) % cycleTime) / cycleTime;
      const ringRadius = effectRadius * phase;
      const ringAlpha = 1 - phase;

      ctx.strokeStyle = `rgba(138, 43, 226, ${ringAlpha * 0.6})`;
      ctx.lineWidth = 3 * (1 - phase);
      ctx.beginPath();
      ctx.arc(playerX, playerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

  } else if (auraName.includes('radiant') || auraName.includes('halo')) {
    // Radiant halo - bright ring
    const haloGrad = ctx.createRadialGradient(
      playerX, playerY, effectRadius - 5,
      playerX, playerY, effectRadius + 5
    );
    haloGrad.addColorStop(0, 'rgba(255, 215, 0, 0)');
    haloGrad.addColorStop(0.5, `rgba(255, 215, 0, ${0.3 + Math.sin(time / 500) * 0.1})`);
    haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(playerX, playerY, effectRadius + 5, 0, Math.PI * 2);
    ctx.fill();

  } else if (auraName.includes('gentle') || auraName.includes('glow')) {
    // Gentle glow - soft ambient effect
    const gentleGrad = ctx.createRadialGradient(
      playerX, playerY, 0,
      playerX, playerY, effectRadius
    );
    const baseColor = playerColor || '#FFD700';
    gentleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gentleGrad.addColorStop(0.5, addAlpha(baseColor, 0.15));
    gentleGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gentleGrad;
    ctx.beginPath();
    ctx.arc(playerX, playerY, effectRadius, 0, Math.PI * 2);
    ctx.fill();

  } else if (auraName.includes('celestial')) {
    // Celestial halo - starry celestial glow with shooting stars
    const starCount = 20;
    const rotationSpeed = time / 3000;

    // Draw outer celestial glow
    const celestialGlow = ctx.createRadialGradient(
      playerX, playerY, effectRadius * 0.3,
      playerX, playerY, effectRadius
    );
    celestialGlow.addColorStop(0, 'rgba(100, 150, 255, 0.2)');
    celestialGlow.addColorStop(0.7, 'rgba(180, 120, 255, 0.15)');
    celestialGlow.addColorStop(1, 'rgba(255, 200, 255, 0)');
    ctx.fillStyle = celestialGlow;
    ctx.beginPath();
    ctx.arc(playerX, playerY, effectRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw orbiting stars
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2 + rotationSpeed;
      const orbitRadius = effectRadius * (0.4 + (i % 4) * 0.15);
      const sx = playerX + Math.cos(angle) * orbitRadius;
      const sy = playerY + Math.sin(angle) * orbitRadius;
      const twinkle = 0.4 + Math.sin(time / 150 + i * 0.7) * 0.4;

      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (auraName.includes('aurora')) {
    // Aurora borealis - wavy northern lights
    const waveCount = 5;

    for (let w = 0; w < waveCount; w++) {
      const waveOffset = (time / 1000 + w * 0.5) % (Math.PI * 2);
      const colors = ['#00FF88', '#00BFFF', '#FF00FF', '#00FF88'];
      const color = colors[w % colors.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.3 + Math.sin(time / 400 + w) * 0.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;

      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const waveAmp = Math.sin(angle * 3 + waveOffset) * 8;
        const r = effectRadius * (0.7 + w * 0.06) + waveAmp;
        const x = playerX + Math.cos(angle) * r;
        const y = playerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

  } else if (auraName.includes('galaxy') && !auraName.includes('cosmic')) {
    // Galaxy spiral - spinning galaxy arms
    const armCount = 2;
    const spiralTightness = 0.3;
    const rotationSpeed = time / 4000;

    for (let arm = 0; arm < armCount; arm++) {
      const armOffset = (arm / armCount) * Math.PI * 2;

      ctx.beginPath();
      for (let t = 0; t < 3; t += 0.1) {
        const angle = t + armOffset + rotationSpeed;
        const r = effectRadius * 0.2 + t * effectRadius * spiralTightness;
        const x = playerX + Math.cos(angle) * r;
        const y = playerY + Math.sin(angle) * r;

        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const gradient = ctx.createLinearGradient(playerX - effectRadius, playerY, playerX + effectRadius, playerY);
      gradient.addColorStop(0, 'rgba(180, 100, 255, 0.6)');
      gradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 150, 200, 0.6)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Galaxy core
    const coreGrad = ctx.createRadialGradient(playerX, playerY, 0, playerX, playerY, effectRadius * 0.3);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    coreGrad.addColorStop(1, 'rgba(180, 100, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(playerX, playerY, effectRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();

  } else if (auraName.includes('phoenix')) {
    // Phoenix wings - fiery ember effect with wing shapes
    const wingSpread = effectRadius * 1.2;
    const flapPhase = Math.sin(time / 300) * 0.2;

    // Left and right wings
    [-1, 1].forEach(side => {
      const wingGrad = ctx.createRadialGradient(
        playerX + side * wingSpread * 0.5, playerY,
        0,
        playerX + side * wingSpread * 0.5, playerY,
        wingSpread * 0.6
      );
      wingGrad.addColorStop(0, 'rgba(255, 200, 50, 0.7)');
      wingGrad.addColorStop(0.4, 'rgba(255, 100, 0, 0.5)');
      wingGrad.addColorStop(0.7, 'rgba(255, 50, 0, 0.3)');
      wingGrad.addColorStop(1, 'rgba(200, 0, 0, 0)');

      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.moveTo(playerX, playerY);
      ctx.quadraticCurveTo(
        playerX + side * wingSpread * 0.5, playerY - 20 + flapPhase * 30,
        playerX + side * wingSpread, playerY - 10 + flapPhase * 20
      );
      ctx.quadraticCurveTo(
        playerX + side * wingSpread * 0.6, playerY + 10,
        playerX, playerY
      );
      ctx.fill();
    });

    // Ember particles
    for (let i = 0; i < 8; i++) {
      const ex = playerX + (Math.random() - 0.5) * effectRadius * 1.5;
      const ey = playerY + (Math.random() - 0.5) * effectRadius - Math.sin(time / 100 + i) * 10;
      ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.5 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (auraName.includes('crystal') || auraName.includes('prism')) {
    // Crystal/Prism - geometric faceted effect
    const facets = 8;
    const rotationSpeed = time / 2000;

    for (let i = 0; i < facets; i++) {
      const angle = (i / facets) * Math.PI * 2 + rotationSpeed;
      const nextAngle = ((i + 1) / facets) * Math.PI * 2 + rotationSpeed;

      // Rainbow colors for prism
      const hue = (i / facets) * 360 + time / 10;
      const color = auraName.includes('prism')
        ? `hsla(${hue}, 80%, 60%, 0.4)`
        : `rgba(200, 220, 255, ${0.3 + Math.sin(time / 200 + i) * 0.2})`;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(playerX, playerY);
      ctx.lineTo(
        playerX + Math.cos(angle) * effectRadius,
        playerY + Math.sin(angle) * effectRadius
      );
      ctx.lineTo(
        playerX + Math.cos(nextAngle) * effectRadius,
        playerY + Math.sin(nextAngle) * effectRadius
      );
      ctx.closePath();
      ctx.fill();

      // Crystal edge highlights
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

  } else if (auraName.includes('void')) {
    // Void essence - dark ethereal aura with inverse glow
    const voidGrad = ctx.createRadialGradient(
      playerX, playerY, effectRadius * 0.3,
      playerX, playerY, effectRadius
    );
    voidGrad.addColorStop(0, 'rgba(20, 0, 40, 0.6)');
    voidGrad.addColorStop(0.5, 'rgba(40, 0, 60, 0.4)');
    voidGrad.addColorStop(0.8, 'rgba(80, 0, 120, 0.2)');
    voidGrad.addColorStop(1, 'rgba(100, 50, 150, 0)');

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = voidGrad;
    ctx.beginPath();
    ctx.arc(playerX, playerY, effectRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'screen';

    // Void particles spiraling inward
    const voidParticles = 12;
    for (let i = 0; i < voidParticles; i++) {
      const angle = (i / voidParticles) * Math.PI * 2 - time / 600;
      const spiralR = effectRadius * (0.3 + ((time / 500 + i * 0.3) % 1) * 0.7);
      const vx = playerX + Math.cos(angle) * spiralR;
      const vy = playerY + Math.sin(angle) * spiralR;

      ctx.fillStyle = `rgba(150, 100, 200, ${0.6 - spiralR / effectRadius * 0.5})`;
      ctx.beginPath();
      ctx.arc(vx, vy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (auraName.includes('nature') || auraName.includes('spirit')) {
    // Nature spirit - organic leaf/vine effect
    const leafCount = 10;
    const rotationSpeed = time / 2500;

    // Outer nature glow
    const natureGlow = ctx.createRadialGradient(
      playerX, playerY, 0,
      playerX, playerY, effectRadius
    );
    natureGlow.addColorStop(0, 'rgba(100, 200, 100, 0.2)');
    natureGlow.addColorStop(0.7, 'rgba(50, 150, 50, 0.1)');
    natureGlow.addColorStop(1, 'rgba(0, 100, 0, 0)');
    ctx.fillStyle = natureGlow;
    ctx.beginPath();
    ctx.arc(playerX, playerY, effectRadius, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting leaves
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * Math.PI * 2 + rotationSpeed;
      const floatY = Math.sin(time / 300 + i * 0.5) * 5;
      const orbitR = effectRadius * (0.5 + (i % 3) * 0.15);
      const lx = playerX + Math.cos(angle) * orbitR;
      const ly = playerY + Math.sin(angle) * orbitR + floatY;

      // Draw simple leaf shape
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle + Math.PI / 4);

      ctx.fillStyle = `rgba(${80 + i * 10}, ${180 + i * 5}, ${80 + i * 8}, 0.7)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  ctx.restore();
}

function drawOffscreenArrows(
  ctx: CanvasRenderingContext2D,
  state: any,
  canvasWidth: number,
  canvasHeight: number
): void {
  const { playerX, playerY, cameraX, cameraY, bonds, aiAgents } = state;
  const margin = 40; // Distance from screen edge
  const arrowSize = 10;
  const maxArrowDistance = 1500; // Only show arrows for agents within this range

  // Screen bounds in world coordinates
  const screenLeft = cameraX;
  const screenRight = cameraX + canvasWidth;
  const screenTop = cameraY;
  const screenBottom = cameraY + canvasHeight;

  // Get mutual bonds for highlighting
  const mutualBondIds = new Set(
    (bonds?.filter((b: any) => b.consent === 'mutual') || []).map((b: any) => b.targetId)
  );

  // Show arrows for all nearby AI agents that are off-screen
  const nearbyAgents = (aiAgents || []).filter((agent: any) => {
    const dx = agent.x - playerX;
    const dy = agent.y - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < maxArrowDistance && distance > 100; // Within range but not too close
  });

  nearbyAgents.forEach((agent: any) => {
    // Check if agent is off-screen (in world coordinates)
    const isOffscreen =
      agent.x < screenLeft || agent.x > screenRight ||
      agent.y < screenTop || agent.y > screenBottom;

    if (!isOffscreen) return;

    // Calculate direction from player to agent
    const dx = agent.x - playerX;
    const dy = agent.y - playerY;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Determine if this is a bonded agent (more prominent arrow)
    const isBonded = mutualBondIds.has(agent.id);
    // Resolve special colors like #RAINBOW to actual hex values
    const agentColor = resolveColor(agent.color || '#ffffff', agent.id?.charCodeAt(0) || 0);

    // Calculate arrow position in SCREEN space (0,0 is top-left of screen)
    const screenCenterX = canvasWidth / 2;
    const screenCenterY = canvasHeight / 2;

    // Calculate intersection with screen bounds (in screen space)
    let arrowX = screenCenterX + Math.cos(angle) * (canvasWidth / 2 - margin);
    let arrowY = screenCenterY + Math.sin(angle) * (canvasHeight / 2 - margin);

    // Clamp to screen edges (in screen space: 0 to canvasWidth/Height)
    arrowX = Math.max(margin, Math.min(canvasWidth - margin, arrowX));
    arrowY = Math.max(margin, Math.min(canvasHeight - margin, arrowY));

    // Draw arrow in screen space
    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);

    // Subtle pulsing effect
    const pulse = 0.9 + Math.sin(Date.now() / 500 + (agent.id?.charCodeAt(0) || 0)) * 0.1;
    // More subtle alpha - closer = more visible, but still subtle
    const baseAlpha = isBonded ? 0.7 : 0.35;
    const alpha = baseAlpha * Math.max(0.4, 1 - distance / maxArrowDistance);

    // Subtle glow for bonded agents only
    if (isBonded) {
      ctx.globalCompositeOperation = 'screen';
      const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, arrowSize * 2);
      glowGrad.addColorStop(0, addAlpha(agentColor, 0.376));
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, arrowSize * 2 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Arrow shape - small triangular pointer
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = agentColor;
    ctx.beginPath();
    ctx.moveTo(arrowSize, 0);
    ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.6);
    ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.6);
    ctx.closePath();
    ctx.fill();

    // Add small border for visibility
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  });

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawAgent(ctx: CanvasRenderingContext2D, agent: any, state: any): void {
  const pulse = agent.getPulseValue ? agent.getPulseValue() : 1;
  const r = (agent.radius || 100) * pulse;
  // Resolve special colors like #RAINBOW to actual hex values
  const agentColor = resolveColor(agent.color || '#ffc864', agent.id?.charCodeAt(0) || 0);
  const rgb = hexToRgb(agentColor) || { r: 255, g: 200, b: 100 };

  // Draw pulse ripples if agent has them
  if (agent.pulseRipples) {
    agent.pulseRipples.forEach((ripple: any) => {
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ripple.life * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // Use additive blending for beautiful glow
  ctx.globalCompositeOperation = 'screen';

  // Rich gradient matching original App.jsx
  const grad = ctx.createRadialGradient(agent.x, agent.y, 2, agent.x, agent.y, Math.max(1, r));
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(agent.x, agent.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';

  // Legacy: Golden ring for mutual bonded agents
  const bond = state.bonds?.find((b: any) => b.targetId === agent.id);
  if (bond && bond.consent === 'mutual') {
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Calculate distance-based alpha for name visibility
  const dist = Math.hypot(state.playerX - agent.x, state.playerY - agent.y);
  const nameAlpha = Math.max(0.15, 1 - dist / 400); // Fade out with distance

  // Render agent name above the agent (similar to LEGACY version)
  if (agent.name) {
    const nameY = agent.y - r - 16;

    // Text outline for readability (dark stroke behind text)
    ctx.strokeStyle = `rgba(0, 0, 0, ${nameAlpha * 0.6})`;
    ctx.lineWidth = 3;
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(agent.name, agent.x, nameY);

    // Text fill with agent's color tint
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${nameAlpha * 0.95})`;
    ctx.fillText(agent.name, agent.x, nameY);

    ctx.textBaseline = 'alphabetic';
  }

  // Chat bubble
  if (agent.currentMessage) {
    const bubbleY = agent.y - r - 38; // Moved higher to account for name
    const msgAge = Date.now() - (agent.messageTime || 0);
    const msgAlpha = Math.min(1, Math.max(0, (5000 - msgAge) / 1000));

    if (msgAlpha > 0) {
      ctx.font = '12px system-ui';
      const textWidth = ctx.measureText(agent.currentMessage).width;

      ctx.fillStyle = `rgba(10, 10, 10, ${msgAlpha * 0.8})`;
      ctx.beginPath();
      ctx.roundRect(agent.x - textWidth / 2 - 8, bubbleY - 10, textWidth + 16, 20, 10);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${msgAlpha})`;
      ctx.textAlign = 'center';
      ctx.fillText(agent.currentMessage, agent.x, bubbleY + 4);
    }
  }
}

function drawBeacon(ctx: CanvasRenderingContext2D, beacon: any): void {
  const time = Date.now();
  const isActive = beacon.lit || beacon.active;
  const chargeRatio = (beacon.charge || 0) / 100;
  const glowR = isActive ? 400 + Math.sin(time / 400) * 30 : 120 + chargeRatio * 150;
  const rgb = hexToRgb(beacon.color) || { r: 100, g: 200, b: 255 };

  // Use screen blending for glow
  ctx.globalCompositeOperation = 'screen';

  // Rich outer glow
  const grad = ctx.createRadialGradient(beacon.x, beacon.y, 10, beacon.x, beacon.y, glowR);
  if (isActive) {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.2, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
    grad.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    // Faint glow when unlit, stronger when charging
    const r = 100 + chargeRatio * 100;
    const baseAlpha = beacon.isCharging ? 0.4 : 0.1;
    grad.addColorStop(0, `rgba(${r}, 200, 255, ${baseAlpha + chargeRatio * 0.2})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(beacon.x, beacon.y, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Reset composite implementation
  ctx.globalCompositeOperation = 'source-over';

  // ─────────────────────────────────────────────────────────────────────────
  // Lighthouse Visuals
  // ─────────────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(beacon.x, beacon.y);

  // 1. Base/Structure
  // Draw a tiered structure
  ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
  ctx.beginPath();
  // Bottom tier
  ctx.moveTo(-20, 30);
  ctx.lineTo(20, 30);
  ctx.lineTo(15, -10);
  ctx.lineTo(-15, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top tier (Lamp housing)
  ctx.fillStyle = isActive ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)` : 'rgba(40, 40, 50, 0.8)';
  ctx.beginPath();
  ctx.rect(-10, -30, 20, 20);
  ctx.fill();

  // Roof
  ctx.beginPath();
  ctx.moveTo(-12, -30);
  ctx.lineTo(0, -45);
  ctx.lineTo(12, -30);
  ctx.closePath();
  ctx.fillStyle = 'rgba(100, 100, 120, 0.9)';
  ctx.fill();

  // 2. The Light (Lamp)
  if (isActive) {
    // Rotating beams
    const rotation = time / 1500;
    ctx.rotate(rotation);
    ctx.globalCompositeOperation = 'screen';

    const beamGrad = ctx.createLinearGradient(0, 0, 0, -300);
    beamGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
    beamGrad.addColorStop(1, 'rgba(0,0,0,0)');

    // Beam 1
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-5, -20);
    ctx.lineTo(5, -20);
    ctx.lineTo(40, -300);
    ctx.lineTo(-40, -300);
    ctx.closePath();
    ctx.fill();

    // Beam 2 (Opposite)
    ctx.rotate(Math.PI);
    ctx.beginPath();
    ctx.moveTo(-5, -20);
    ctx.lineTo(5, -20);
    ctx.lineTo(40, -300);
    ctx.lineTo(-40, -300);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(-Math.PI - rotation); // Reset rotation
  }

  // 3. Floating Diamond/Core
  const hover = Math.sin(time / 500) * 5;
  const diamondY = -20 + hover;

  ctx.translate(0, diamondY);
  ctx.rotate(Math.PI / 4); // Diamond shape

  const diamondSize = isActive ? 12 : 8;
  ctx.fillStyle = isActive ? '#FFFFFF' : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  ctx.shadowColor = beacon.color;
  ctx.shadowBlur = isActive ? 20 : 5;
  ctx.beginPath();
  ctx.rect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.rotate(-Math.PI / 4); // Undo diamond rotation
  ctx.translate(0, -diamondY); // Undo hover

  ctx.restore();

  // ─────────────────────────────────────────────────────────────────────────
  // Charging Circle
  // ─────────────────────────────────────────────────────────────────────────
  if (!isActive && (beacon.charge || 0) > 0) {
    const radius = 60;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * (beacon.charge / 100));

    ctx.save();
    ctx.translate(beacon.x, beacon.y);

    // Background ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Progress arc
    ctx.beginPath();
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.strokeStyle = beacon.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = beacon.color;
    ctx.shadowBlur = 10 + Math.sin(time / 200) * 5; // Pulsing glow
    ctx.stroke();

    // Percentage text
    if (beacon.isCharging) {
      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(beacon.charge)}%`, 0, radius + 20);
    }

    ctx.restore();
  }

  // Label
  ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(beacon.name, beacon.x, beacon.y + 70);
}

function drawFragment(ctx: CanvasRenderingContext2D, fragment: any): void {
  const time = Date.now();
  const pulse = Math.sin((time / 500) + (fragment.phase || 0)) * 5;
  const isGolden = fragment.isGolden;
  const fx = fragment.x;
  const fy = fragment.y;

  ctx.globalCompositeOperation = 'screen';

  if (isGolden) {
    // Golden fragment with rotating rays
    const grad = ctx.createRadialGradient(fx, fy, 2, fx, fy, 40 + pulse);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 215, 0, 0.9)');
    grad.addColorStop(0.5, 'rgba(255, 165, 0, 0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx, fy, 40 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Rotating rays
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(time * 0.002);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
    }
    ctx.stroke();
    ctx.restore();

    // Bright core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(fx, fy, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Regular fragment
    const grad = ctx.createRadialGradient(fx, fy, 1, fx, fy, 25 + pulse);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.3, 'rgba(255, 215, 0, 0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx, fy, 25 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(fx, fy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
}

function drawBond(ctx: CanvasRenderingContext2D, bond: any): void {
  const pulse = bond.getPulseValue ? bond.getPulseValue() : 1;
  const isMutual = bond.consent === 'mutual';

  // Ensure strict existing check for light references
  if (!bond.light1 || !bond.light2 || bond.strength <= 0) return;

  ctx.globalCompositeOperation = 'screen';

  // Create gradient along bond line
  const gradient = ctx.createLinearGradient(
    bond.light1.x, bond.light1.y,
    bond.light2.x, bond.light2.y
  );

  // Legacy: Alpha is directly proportional to strength
  const baseAlpha = bond.strength;

  if (isMutual) {
    // Legacy: Gold to Orange 2-stop gradient
    gradient.addColorStop(0, `rgba(255, 215, 0, ${baseAlpha * pulse})`);
    gradient.addColorStop(1, `rgba(255, 165, 0, ${baseAlpha * pulse * 0.7})`);

    // Thinner beam for mutual connection (Legacy Style) - no core beam
    ctx.lineWidth = 2 + bond.strength * 4;
  } else {
    // Legacy: White to Grey 2-stop gradient
    gradient.addColorStop(0, `rgba(255, 255, 255, ${baseAlpha * pulse * 0.8})`);
    gradient.addColorStop(1, `rgba(200, 200, 200, ${baseAlpha * pulse * 0.5})`);
    ctx.lineWidth = 1 + bond.strength * 2;
  }

  // Draw Bond Line (Legacy: No shadowBlur, simple ethereal lines)
  ctx.strokeStyle = gradient;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(bond.light1.x, bond.light1.y);
  ctx.lineTo(bond.light2.x, bond.light2.y);
  ctx.stroke();

  // Interaction Hint
  if (!isMutual) {
    if (bond.strength > BOND_CONFIRM_THRESHOLD) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      const midX = (bond.light1.x + bond.light2.x) / 2;
      const midY = (bond.light1.y + bond.light2.y) / 2;
      ctx.fillText('Pulse to Confirm! ✨', midX, midY - 10);
    } else if (bond.strength > 0.05) {
      // Show "Bonding..." text to give feedback that connection is happening
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255, 255, 255, ${bond.strength * 2})`; // Fade in
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      const midX = (bond.light1.x + bond.light2.x) / 2;
      const midY = (bond.light1.y + bond.light2.y) / 2;
      ctx.fillText(`Bonding... ${Math.floor(bond.strength * 100)}%`, midX, midY - 10);
    }
  }
}

function drawConstellation(ctx: CanvasRenderingContext2D, state: any): void {
  const { playerX, playerY, playerColor, constellationMembers, aiAgents } = state;

  // Get all constellation member positions (resolve rainbow colors)
  const positions = [{ x: playerX, y: playerY, color: resolveColor(playerColor || '#ffffff') }];
  constellationMembers.forEach((id: string) => {
    const agent = aiAgents.find((a: any) => a.id === id);
    if (agent) {
      positions.push({ x: agent.x, y: agent.y, color: resolveColor(agent.color || '#ffffff', agent.id?.charCodeAt(0) || 0) });
    }
  });

  if (positions.length < 3) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const time = Date.now();
  const pulse = 0.7 + Math.sin(time / 500) * 0.3;

  // Draw constellation lines between all members
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p1 = positions[i];
      const p2 = positions[j];

      // Gradient line between members
      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      gradient.addColorStop(0, `rgba(255, 215, 0, ${0.6 * pulse})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.4 * pulse})`);
      gradient.addColorStop(1, `rgba(255, 215, 0, ${0.6 * pulse})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Draw twinkling star at midpoint
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
      ctx.beginPath();
      ctx.arc(midX, midY, 3 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw central constellation glow
  const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
  const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

  const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100);
  glowGradient.addColorStop(0, `rgba(255, 215, 0, ${0.3 * pulse})`);
  glowGradient.addColorStop(1, 'transparent');

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: any[], realm: string): void {
  // powerUps is array of PowerUp state
  powerUps.forEach(p => {
    // Only draw if in current realm
    if ((p.realm || 'genesis') === realm) {
      drawPowerUp(ctx, p, performance.now());
    }
  });
}

function drawLightBridge(ctx: CanvasRenderingContext2D, bridge: any): void {
  ctx.globalCompositeOperation = 'screen';

  // Create gradient along bridge
  const gradient = ctx.createLinearGradient(
    bridge.x1, bridge.y1,
    bridge.x2, bridge.y2
  );

  const rgb1 = hexToRgb(bridge.color1) || { r: 255, g: 215, b: 0 };
  const rgb2 = hexToRgb(bridge.color2) || { r: 255, g: 165, b: 0 };
  const alpha = Math.min(1, bridge.life);

  gradient.addColorStop(0, `rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, ${alpha * 0.8})`);
  gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.6})`);
  gradient.addColorStop(1, `rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, ${alpha * 0.8})`);

  // Draw main bridge line with glow
  ctx.shadowColor = bridge.color1;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bridge.x1, bridge.y1);
  ctx.lineTo(bridge.x2, bridge.y2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw flowing particles along the bridge
  bridge.particles.forEach((p: any) => {
    const particleAlpha = p.life * alpha;
    ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw endpoint glows
  const endGlow1 = ctx.createRadialGradient(bridge.x1, bridge.y1, 0, bridge.x1, bridge.y1, 20);
  endGlow1.addColorStop(0, `rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, ${alpha * 0.8})`);
  endGlow1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = endGlow1;
  ctx.beginPath();
  ctx.arc(bridge.x1, bridge.y1, 20, 0, Math.PI * 2);
  ctx.fill();

  const endGlow2 = ctx.createRadialGradient(bridge.x2, bridge.y2, 0, bridge.x2, bridge.y2, 20);
  endGlow2.addColorStop(0, `rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, ${alpha * 0.8})`);
  endGlow2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = endGlow2;
  ctx.beginPath();
  ctx.arc(bridge.x2, bridge.y2, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
}

function drawRipple(ctx: CanvasRenderingContext2D, ripple: any): void {
  const rgb = hexToRgb(ripple.color) || { r: 255, g: 255, b: 255 };
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(ripple.alpha || ripple.life || 0.5) * 0.6})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

function drawShockwave(ctx: CanvasRenderingContext2D, shockwave: any): void {
  const rgb = hexToRgb(shockwave.color) || { r: 255, g: 255, b: 255 };
  const innerRadius = Math.max(0, shockwave.radius - 80);

  ctx.globalCompositeOperation = 'screen';
  const waveGrad = ctx.createRadialGradient(
    shockwave.x, shockwave.y, innerRadius,
    shockwave.x, shockwave.y, shockwave.radius
  );
  waveGrad.addColorStop(0, 'rgba(0,0,0,0)');
  waveGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${shockwave.alpha})`);
  waveGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = waveGrad;
  ctx.beginPath();
  ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function drawFloatingText(ctx: CanvasRenderingContext2D, ft: { x: number; y: number; text: string; hue: number; size: number; life: number }): void {
  ctx.save();
  // Text outline for readability
  ctx.strokeStyle = `rgba(0,0,0,${ft.life * 0.6})`;
  ctx.lineWidth = 2.5;
  ctx.font = `600 ${ft.size}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(ft.text, ft.x, ft.y);
  // Fill text with hue-based color
  ctx.fillStyle = `hsla(${ft.hue}, 65%, 72%, ${ft.life})`;
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, particle: any): void {
  if (particle.draw) {
    particle.draw(ctx);
    return;
  }
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = particle.color;
  ctx.globalAlpha = particle.alpha || particle.life || 1;

  // Support different particle types
  if (particle.type === 'snow' || particle.type === 'snowflake') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    // Add snowflake detail for snowflake type
    if (particle.type === 'snowflake' && particle.size > 3) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(
          particle.x + Math.cos(angle) * particle.size * 1.5,
          particle.y + Math.sin(angle) * particle.size * 1.5
        );
        ctx.stroke();
      }
    }
  } else if (particle.type === 'rain') {
    ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    ctx.lineTo(particle.x - 2, particle.y + 10);
    ctx.stroke();
  } else if (particle.type === 'petal') {
    // Petal particles - elliptical with rotation
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation || 0);
    ctx.fillStyle = particle.color || 'rgba(255, 182, 193, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, particle.size, particle.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (particle.type === 'leaf') {
    // Leaf particles with rotation
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation || 0);
    ctx.fillStyle = particle.color || 'rgba(139, 90, 43, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, particle.size, particle.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Leaf vein
    ctx.strokeStyle = 'rgba(100, 60, 30, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-particle.size, 0);
    ctx.lineTo(particle.size, 0);
    ctx.stroke();
    ctx.restore();
  } else if (particle.type === 'trail') {
    // Trail particles with fade based on age
    const age = Date.now() - (particle.createdAt || Date.now());
    const fadeAlpha = Math.max(0, 1 - age / 1000);
    ctx.fillStyle = particle.color || 'rgba(255, 215, 0, 0.5)';
    ctx.globalAlpha = fadeAlpha * (particle.alpha || 0.5);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * (0.5 + fadeAlpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
  } else if (particle.type === 'dust') {
    // Dust particles - subtle, small, slowly drifting
    ctx.fillStyle = particle.color || 'rgba(255, 255, 255, 0.3)';
    ctx.globalAlpha = (particle.alpha || 0.3) * (particle.life || 1);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (particle.type === 'golden') {
    // Golden particles - 5-pointed star with glow (legacy style)
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation || 0);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const outerR = particle.size;
      const innerR = particle.size * 0.4;

      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      } else {
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      }

      const innerAngle = angle + Math.PI / 5;
      ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  } else if (particle.type === 'wave') {
    // Wave particles - expanding ring stroke (legacy style)
    ctx.strokeStyle = particle.color || '#60A5FA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Ring expands based on life
    const waveRadius = particle.size * (1 - (particle.alpha || 0.5) + 0.5);
    ctx.arc(particle.x, particle.y, waveRadius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (particle.type === 'pulse') {
    // Pulse particles - rhythmic expanding ring (legacy style)
    ctx.strokeStyle = particle.color || '#FF6B6B';
    ctx.lineWidth = 3 * (particle.alpha || 1);
    ctx.beginPath();
    // Rhythmic expansion
    const pulseRadius = particle.size * 2 * (1 - (particle.alpha || 0.2) + 0.2);
    ctx.arc(particle.x, particle.y, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (particle.type === 'darkness') {
    // Darkness particles - dark motes (legacy style)
    ctx.fillStyle = '#1a1a2e';
    ctx.globalAlpha = (particle.alpha || 0.7) * 0.8;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  } else if (particle.type === 'gift') {
    // Gift particles - sparkly with heart/star shapes
    const sparkle = Math.sin(Date.now() / 100 + particle.x) * 0.3 + 0.7;
    ctx.globalAlpha = sparkle * (particle.alpha || 1);
    ctx.fillStyle = particle.color || 'rgba(255, 105, 180, 0.8)';

    // Draw small star shape
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const innerAngle = angle + Math.PI / 5;
      const outerRadius = particle.size;
      const innerRadius = particle.size * 0.4;

      if (i === 0) {
        ctx.moveTo(
          particle.x + Math.cos(angle) * outerRadius,
          particle.y + Math.sin(angle) * outerRadius
        );
      } else {
        ctx.lineTo(
          particle.x + Math.cos(angle) * outerRadius,
          particle.y + Math.sin(angle) * outerRadius
        );
      }
      ctx.lineTo(
        particle.x + Math.cos(innerAngle) * innerRadius,
        particle.y + Math.sin(innerAngle) * innerRadius
      );
    }
    ctx.closePath();
    ctx.fill();
  } else if (particle.shape) {
    ctx.font = `${particle.size * 3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(particle.shape, particle.x, particle.y);
  } else {
    // Standard particles (spark, golden, etc)
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// Batch 1: World & Exploration Drawing Functions
// ─────────────────────────────────────────────────────────────────────────────

function drawBiomes(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  width: number,
  height: number
): void {
  for (const biome of BIOMES) {
    // Only draw if visible
    const x1 = Math.max(biome.bounds.x1, cameraX);
    const y1 = Math.max(biome.bounds.y1, cameraY);
    const x2 = Math.min(biome.bounds.x2, cameraX + width);
    const y2 = Math.min(biome.bounds.y2, cameraY + height);

    if (x1 >= x2 || y1 >= y2) continue;

    // Draw biome tint
    const colors = BIOME_GRADIENTS[biome.id];
    if (colors) {
      ctx.fillStyle = colors.fog;
      ctx.fillRect(biome.bounds.x1, biome.bounds.y1,
        biome.bounds.x2 - biome.bounds.x1,
        biome.bounds.y2 - biome.bounds.y1);
    }

    // Draw subtle border
    ctx.strokeStyle = addAlpha(biome.color, 0.1);
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(biome.bounds.x1, biome.bounds.y1,
      biome.bounds.x2 - biome.bounds.x1,
      biome.bounds.y2 - biome.bounds.y1);
    ctx.setLineDash([]);
  }
}

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  discoveredLandmarks: string[],
  cameraX: number,
  cameraY: number,
  width: number,
  height: number
): void {
  for (const landmark of landmarks) {
    // Only draw if on screen
    if (landmark.x < cameraX - 100 || landmark.x > cameraX + width + 100) continue;
    if (landmark.y < cameraY - 100 || landmark.y > cameraY + height + 100) continue;

    const isDiscovered = discoveredLandmarks.includes(landmark.id);
    const pulse = 0.9 + 0.1 * Math.sin(Date.now() / 1000);

    // Draw glow
    const glowRadius = landmark.size * (isDiscovered ? 2 : 1.5) * pulse;
    const gradient = ctx.createRadialGradient(
      landmark.x, landmark.y, 0,
      landmark.x, landmark.y, glowRadius
    );
    gradient.addColorStop(0, addAlpha(landmark.glow, isDiscovered ? 0.4 : 0.2));
    gradient.addColorStop(0.5, addAlpha(landmark.glow, isDiscovered ? 0.15 : 0.05));
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(landmark.x, landmark.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw icon
    ctx.font = `${landmark.size * 0.6}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDiscovered ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(landmark.icon, landmark.x, landmark.y);

    // Draw name if discovered
    if (isDiscovered) {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = addAlpha(landmark.glow, 0.9);
      ctx.fillText(landmark.name, landmark.x, landmark.y + landmark.size * 0.5);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual Effects Drawing Functions (Ported from App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

function drawNebula(
  ctx: CanvasRenderingContext2D,
  nebula: any,
  cameraX: number,
  cameraY: number
): void {
  // Use world coordinates directly (context is already translated)
  // FIXED: Removed '- cameraX' subtraction to prevent double transform
  const grad = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.radius);
  // const alphaM = 1 - (state.darknessIntensity || 0) * 0.5; // pass darkness if needed
  const alphaM = 1;
  grad.addColorStop(0, `hsla(${nebula.hue}, 60%, 50%, ${nebula.alpha * alphaM})`);
  grad.addColorStop(0.5, `hsla(${nebula.hue}, 40%, 30%, ${nebula.alpha * 0.5 * alphaM})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  star: any,
  cameraX: number,
  cameraY: number,
  width: number,
  height: number,
  darknessIntensity: number
): void {
  // Culling check needs screen coordinates
  const sx = star.x - cameraX;
  const sy = star.y - cameraY;

  if (sx > -10 && sx < width + 10 && sy > -10 && sy < height + 10) {
    const time = Date.now();
    const twinkle = 0.7 + 0.3 * Math.sin(time * 0.002 + star.twinklePhase);
    const alphaM = 1 - darknessIntensity * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${star.alpha * twinkle * alphaM})`;
    ctx.beginPath();
    // Draw at world coordinates
    // FIXED: Removed '- cameraX' subtraction to prevent double transform
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLightTrail(
  ctx: CanvasRenderingContext2D,
  trail: any,
  cameraX: number,
  cameraY: number
): void {
  // Legacy trail support (App.jsx style simple trails)

  // Check alpha/life
  let alpha = 1;
  if (trail.getCurrentAlpha) alpha = trail.getCurrentAlpha();
  else if (trail.alpha !== undefined) alpha = trail.alpha;
  else if (trail.life !== undefined) alpha = trail.life;

  // FIXED: Removed '- cameraX' subtraction to prevent double transform
  const grad = ctx.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, 15);
  grad.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(trail.x, trail.y, 15, 0, Math.PI * 2);
  ctx.fill();
}

function drawEcho(
  ctx: CanvasRenderingContext2D,
  echo: any,
  cameraX: number,
  cameraY: number,
  playerX: number,
  playerY: number
): void {
  // FIXED: Removed '- cameraX' subtraction to prevent double transform
  ctx.globalCompositeOperation = 'screen';
  const grad = ctx.createRadialGradient(echo.x, echo.y, 5, echo.x, echo.y, 40);
  grad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(echo.x, echo.y, 40, 0, Math.PI * 2);
  ctx.fill();

  // Draw text if player is close
  if (Math.hypot(playerX - echo.x, playerY - echo.y) < 100) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '11px system-ui';
    ctx.fillStyle = 'rgba(167, 139, 250, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(echo.text, echo.x, echo.y - 50);
    ctx.font = '9px system-ui';
    ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
    ctx.fillText(`- ${echo.name}`, echo.x, echo.y - 35);
  }
}

function drawPOIs(
  ctx: CanvasRenderingContext2D,
  pois: PointOfInterest[],
  discoveredPOIs: string[],
  cameraX: number,
  cameraY: number,
  width: number,
  height: number
): void {
  for (const poi of pois) {
    // Only draw if on screen
    if (poi.x < cameraX - 50 || poi.x > cameraX + width + 50) continue;
    if (poi.y < cameraY - 50 || poi.y > cameraY + height + 50) continue;

    const isDiscovered = discoveredPOIs.includes(poi.id);

    // Skip undiscovered secret POIs
    if (poi.type === 'secret' && !isDiscovered) continue;

    const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 800);
    const size = 20;

    // Get POI icon and color based on type
    const { icon, color } = getPOIVisuals(poi.type);

    // Draw marker
    if (!isDiscovered) {
      // Undiscovered: faint question mark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', poi.x, poi.y);
    } else {
      // Discovered: full icon with glow
      const gradient = ctx.createRadialGradient(
        poi.x, poi.y, 0,
        poi.x, poi.y, size * 2 * pulse
      );
      gradient.addColorStop(0, addAlpha(color, 0.3));
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(poi.x, poi.y, size * 2 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(icon, poi.x, poi.y);

      // Name
      ctx.font = '10px sans-serif';
      ctx.fillStyle = addAlpha(color, 0.8);
      ctx.fillText(poi.name, poi.x, poi.y + size);
    }
  }
}

function getPOIVisuals(type: string): { icon: string; color: string } {
  switch (type) {
    case 'viewpoint': return { icon: '👁️', color: '#87CEEB' };
    case 'ruins': return { icon: '🏛️', color: '#DEB887' };
    case 'pool': return { icon: '💧', color: '#00CED1' };
    case 'constellation': return { icon: '✨', color: '#E6E6FA' };
    case 'shrine': return { icon: '⛩️', color: '#FFD700' };
    case 'secret': return { icon: '🔮', color: '#9370DB' };
    default: return { icon: '📍', color: '#FFFFFF' };
  }
}

function drawFogOfWar(
  ctx: CanvasRenderingContext2D,
  exploredCells: Set<string>,
  cameraX: number,
  cameraY: number,
  width: number,
  height: number
): void {
  const startCellX = Math.floor(cameraX / FOG_CELL_SIZE);
  const startCellY = Math.floor(cameraY / FOG_CELL_SIZE);
  const endCellX = Math.ceil((cameraX + width) / FOG_CELL_SIZE);
  const endCellY = Math.ceil((cameraY + height) / FOG_CELL_SIZE);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';

  for (let cellX = startCellX; cellX <= endCellX; cellX++) {
    for (let cellY = startCellY; cellY <= endCellY; cellY++) {
      const cellKey = `${cellX},${cellY}`;

      if (!exploredCells.has(cellKey)) {
        const x = cellX * FOG_CELL_SIZE;
        const y = cellY * FOG_CELL_SIZE;
        ctx.fillRect(x, y, FOG_CELL_SIZE, FOG_CELL_SIZE);
      }
    }
  }

  // Draw soft edges around explored areas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  for (let cellX = startCellX; cellX <= endCellX; cellX++) {
    for (let cellY = startCellY; cellY <= endCellY; cellY++) {
      const cellKey = `${cellX},${cellY}`;

      if (exploredCells.has(cellKey)) {
        // Check adjacent unexplored cells
        const neighbors = [
          `${cellX - 1},${cellY}`,
          `${cellX + 1},${cellY}`,
          `${cellX},${cellY - 1}`,
          `${cellX},${cellY + 1}`,
        ];

        for (const neighbor of neighbors) {
          if (!exploredCells.has(neighbor)) {
            const [nx, ny] = neighbor.split(',').map(Number);
            const x = nx * FOG_CELL_SIZE;
            const y = ny * FOG_CELL_SIZE;

            // Draw gradient edge
            const gradient = ctx.createLinearGradient(
              cellX < nx ? x : x + FOG_CELL_SIZE,
              cellY < ny ? y : y + FOG_CELL_SIZE,
              cellX < nx ? x + FOG_CELL_SIZE : x,
              cellY < ny ? y + FOG_CELL_SIZE : y
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, FOG_CELL_SIZE, FOG_CELL_SIZE);
          }
        }
      }
    }
  }
}

function drawWorldEventParticle(ctx: CanvasRenderingContext2D, particle: any): void {
  const alpha = particle.life / particle.maxLife;

  switch (particle.type) {
    case 'meteor':
      // Draw meteor with trail
      ctx.fillStyle = addAlpha(particle.color, alpha);
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      // Trail
      ctx.strokeStyle = addAlpha(particle.color, alpha * 0.5);
      ctx.lineWidth = particle.size * 0.5;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x - particle.vx * 5, particle.y - particle.vy * 5);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;

    case 'aurora':
      // Draw aurora wave
      ctx.fillStyle = addAlpha(particle.color, alpha * 0.2);
      ctx.beginPath();
      ctx.ellipse(particle.x, particle.y, particle.size * 2, particle.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'comet_trail':
      // Draw comet trail particle
      ctx.fillStyle = addAlpha(particle.color, alpha);
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;

    case 'bloom':
      // Draw light bloom
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size
      );
      gradient.addColorStop(0, addAlpha(particle.color, alpha * 0.5));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'lightning':
      // Draw lightning/energy particle for cosmic storm
      ctx.save();
      ctx.fillStyle = addAlpha(particle.color, alpha);
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 15;

      // Main bolt particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      // Electric arc effect - draw a small lightning bolt shape
      ctx.strokeStyle = addAlpha('#FFFFFF', alpha * 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y - particle.size * 2);
      ctx.lineTo(particle.x + particle.size, particle.y);
      ctx.lineTo(particle.x - particle.size * 0.5, particle.y);
      ctx.lineTo(particle.x + particle.size * 0.5, particle.y + particle.size * 2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.restore();
      break;

    case 'falling_star':
      // Draw falling star with sparkle trail for starfall event
      ctx.save();
      ctx.fillStyle = addAlpha(particle.color, alpha);
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 12;

      // Star shape
      ctx.beginPath();
      const starPoints = 4;
      const outerRadius = particle.size;
      const innerRadius = particle.size * 0.4;
      for (let i = 0; i < starPoints * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / starPoints - Math.PI / 2;
        const sx = particle.x + Math.cos(angle) * radius;
        const sy = particle.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();

      // Sparkle trail
      ctx.strokeStyle = addAlpha(particle.color, alpha * 0.4);
      ctx.lineWidth = particle.size * 0.3;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x - particle.vx * 8, particle.y - particle.vy * 8);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.restore();
      break;

    default:
      ctx.fillStyle = addAlpha(particle.color, alpha);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
  }
}

export default GameCanvas;
