// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - World Events Hook (Server-Authoritative)
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useCallback, useEffect, useState } from 'react';
import { WORLD_EVENTS, type WorldEventConfig } from '@/constants/world';
import { WORLD_SIZE } from '@/constants/game';
import { randomRange, randomElement } from '@/utils/math';
import { gameClient } from '@/services/GameClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActiveWorldEvent {
  id: string;
  config: WorldEventConfig;
  startTime: number;
  endTime: number;
  position?: { x: number; y: number }; // For localized events
  particles: WorldEventParticle[];
  serverEvent: any; // Raw server data
}

export interface WorldEventParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: string;
}

export interface UseWorldEventsReturn {
  // State
  activeEvents: ActiveWorldEvent[];
  lastEventTime: number;

  // Actions
  checkForNewEvents: () => ActiveWorldEvent | null; // Deprecated, keeps API signature
  updateEvents: (deltaTime: number) => void;
  getEventParticles: () => WorldEventParticle[];
  isEventActive: (eventId: string) => boolean;
  getActiveEventModifiers: () => EventModifiers;
  forceStartEvent: (eventId: string) => ActiveWorldEvent | null; // Dev only
}

export interface EventModifiers {
  xpMultiplier: number;
  fragmentMultiplier: number;
  visibilityBonus: number;
  glowIntensity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useWorldEvents(): UseWorldEventsReturn {
  const [activeEvents, setActiveEvents] = useState<ActiveWorldEvent[]>([]);
  const lastEventTimeRef = useRef<number>(Date.now());
  const particleIdRef = useRef<number>(0);

  // Create a new event instance from server data
  const createEventFromData = useCallback((serverEvent: any): ActiveWorldEvent | null => {
    const config = WORLD_EVENTS.find(e => e.id === serverEvent.type);
    if (!config) return null;

    const particles: WorldEventParticle[] = [];
    const particleCount = getParticleCountForEvent(config.id);

    for (let i = 0; i < particleCount; i++) {
      particles.push(createEventParticle(config.id, particleIdRef.current++));
    }

    return {
      id: serverEvent.id,
      config,
      startTime: serverEvent.startTime,
      endTime: serverEvent.endTime,
      particles,
      serverEvent
    };
  }, []);

  // Update loop for particles
  const updateEvents = useCallback((deltaTime: number) => {
    const now = Date.now();

    setActiveEvents(prev => {
      const updated: ActiveWorldEvent[] = [];

      for (const event of prev) {
        // Remove expired events
        if (now > event.endTime) continue;

        // Update particles
        const updatedParticles: WorldEventParticle[] = [];
        for (const particle of event.particles) {
          particle.life -= deltaTime;

          if (particle.life <= 0) {
            // Respawn particle for continuous events
            if (now < event.endTime - 5000) {
              updatedParticles.push(createEventParticle(event.config.id, particleIdRef.current++));
            }
          } else {
            // Update position
            particle.x += particle.vx * deltaTime * 60;
            particle.y += particle.vy * deltaTime * 60;

            // Wrap around world for some events
            if (particle.y > WORLD_SIZE) particle.y = 0;
            if (particle.y < 0) particle.y = WORLD_SIZE;
            if (particle.x > WORLD_SIZE) particle.x = 0;
            if (particle.x < 0) particle.x = WORLD_SIZE;

            updatedParticles.push(particle);
          }
        }

        updated.push({
          ...event,
          particles: updatedParticles,
        });
      }

      return updated;
    });
  }, []);

  // Server event listeners
  useEffect(() => {
    const handleEventStarted = (data: { event: any }) => {
      const newEvent = createEventFromData(data.event);
      if (newEvent) {
        setActiveEvents(prev => {
          // Avoid duplicates
          if (prev.some(e => e.id === newEvent.id)) return prev;
          return [...prev, newEvent];
        });
        lastEventTimeRef.current = Date.now();
      }
    };

    const handleEventEnded = (data: { eventId: string }) => {
      setActiveEvents(prev => prev.filter(e => e.id !== data.eventId));
    };

    const handleWorldEventsList = (data: { events: any[] }) => {
      if (!data.events) return;
      const newEvents = data.events.map(createEventFromData).filter((e): e is ActiveWorldEvent => e !== null);
      setActiveEvents(newEvents);
    };

    gameClient.on('world_event_started', handleEventStarted);
    gameClient.on('world_event_ended', handleEventEnded);
    gameClient.on('world_events', handleWorldEventsList); // 'world_events' is response type for request_world_events in WorldEventHandlers but let's double check

    // Request active events on mount
    gameClient.sendMessage('request_world_events', {});

    return () => {
      gameClient.off('world_event_started', handleEventStarted);
      gameClient.off('world_event_ended', handleEventEnded);
      gameClient.off('world_events', handleWorldEventsList);
    };
  }, [createEventFromData]);

  /**
   * Get all particles from all active events
   */
  const getEventParticles = useCallback((): WorldEventParticle[] => {
    const allParticles: WorldEventParticle[] = [];
    for (const event of activeEvents) {
      allParticles.push(...event.particles);
    }
    return allParticles;
  }, [activeEvents]);

  /**
   * Check if a specific event type is active
   */
  const isEventActive = useCallback((eventId: string): boolean => {
    return activeEvents.some(e => e.config.id === eventId);
  }, [activeEvents]);

  /**
   * Get combined modifiers from all active events
   */
  const getActiveEventModifiers = useCallback((): EventModifiers => {
    const modifiers: EventModifiers = {
      xpMultiplier: 1,
      fragmentMultiplier: 1,
      visibilityBonus: 0,
      glowIntensity: 1,
    };

    for (const event of activeEvents) {
      switch (event.config.id) {
        case 'meteor_shower':
          modifiers.fragmentMultiplier *= 1.5;
          break;
        case 'aurora_borealis':
          modifiers.glowIntensity *= 1.3;
          modifiers.visibilityBonus += 50;
          break;
        case 'solar_eclipse':
          modifiers.fragmentMultiplier *= 1.3;
          modifiers.glowIntensity *= 1.5;
          break;
        case 'comet_pass':
          modifiers.xpMultiplier *= 2;
          break;
        case 'light_bloom':
          modifiers.xpMultiplier *= 1.5;
          modifiers.glowIntensity *= 1.2;
          break;
        case 'cosmic_storm':
          // Storm gives XP bonus but also reduces visibility
          modifiers.xpMultiplier *= 1.75;
          modifiers.visibilityBonus -= 30;
          break;
        case 'starfall':
          // Massive fragment bonus during starfall
          modifiers.fragmentMultiplier *= 2.5;
          modifiers.xpMultiplier *= 1.25;
          break;
      }
    }

    return modifiers;
  }, [activeEvents]);

  const checkForNewEvents = () => null; // No-op, server controlled
  const forceStartEvent = (eventId: string) => null; // No-op, use Admin console

  return {
    activeEvents,
    lastEventTime: lastEventTimeRef.current,
    checkForNewEvents,
    updateEvents,
    getEventParticles,
    isEventActive,
    getActiveEventModifiers,
    forceStartEvent,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions (Unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function getParticleCountForEvent(eventId: string): number {
  switch (eventId) {
    case 'meteor_shower': return 30;
    case 'aurora_borealis': return 100;
    case 'solar_eclipse': return 20;
    case 'comet_pass': return 50;
    case 'light_bloom': return 60;
    case 'cosmic_storm': return 80;
    case 'starfall': return 50;
    default: return 20;
  }
}

function createEventParticle(eventId: string, id: number): WorldEventParticle {
  switch (eventId) {
    case 'meteor_shower':
      return {
        id,
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(-100, 0),
        vx: randomRange(-1, 0),
        vy: randomRange(3, 6),
        size: randomRange(2, 5),
        color: randomElement(['#FFD700', '#FFA500', '#FF6347', '#FFFFFF']),
        life: randomRange(3, 6),
        maxLife: 6,
        type: 'meteor',
      };

    case 'aurora_borealis':
      return {
        id,
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(0, WORLD_SIZE * 0.3),
        vx: randomRange(-0.5, 0.5),
        vy: randomRange(-0.2, 0.2),
        size: randomRange(20, 50),
        color: randomElement(['#00FF7F', '#7FFFD4', '#40E0D0', '#9370DB', '#FF69B4']),
        life: randomRange(5, 10),
        maxLife: 10,
        type: 'aurora',
      };

    case 'solar_eclipse':
      return {
        id,
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(0, WORLD_SIZE),
        vx: 0,
        vy: randomRange(0.1, 0.3),
        size: randomRange(3, 8),
        color: 'rgba(0, 0, 0, 0.3)',
        life: randomRange(4, 8),
        maxLife: 8,
        type: 'shadow',
      };

    case 'comet_pass':
      return {
        id,
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(0, WORLD_SIZE),
        vx: randomRange(5, 10),
        vy: randomRange(-1, 1),
        size: randomRange(3, 8),
        color: randomElement(['#00BFFF', '#87CEEB', '#E0FFFF', '#FFFFFF']),
        life: randomRange(2, 4),
        maxLife: 4,
        type: 'comet_trail',
      };

    case 'light_bloom':
      return {
        id,
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(0, WORLD_SIZE),
        vx: randomRange(-0.3, 0.3),
        vy: randomRange(-0.5, -0.2),
        size: randomRange(5, 15),
        color: randomElement(['#FFD700', '#FFFACD', '#FFFFE0', '#FFF8DC']),
        life: randomRange(3, 6),
        maxLife: 6,
        type: 'bloom',
      };

    case 'cosmic_storm':
      // Lightning bolts and energy particles
      return {
        id,
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(0, WORLD_SIZE * 0.5),
        vx: randomRange(-2, 2),
        vy: randomRange(4, 8),
        size: randomRange(2, 6),
        color: randomElement(['#9370DB', '#8A2BE2', '#BA55D3', '#FF00FF', '#00BFFF']),
        life: randomRange(1, 3),
        maxLife: 3,
        type: 'lightning',
      };

    case 'starfall':
      // Falling stars with golden trails
      return {
        id,
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(-200, 0),
        vx: randomRange(-0.5, 0.5),
        vy: randomRange(2, 5),
        size: randomRange(3, 7),
        color: randomElement(['#FFD700', '#FFA500', '#FFFF00', '#FFFFFF', '#FFE4B5']),
        life: randomRange(4, 7),
        maxLife: 7,
        type: 'falling_star',
      };

    default:
      return {
        id,
        x: randomRange(0, WORLD_SIZE),
        y: randomRange(0, WORLD_SIZE),
        vx: 0,
        vy: 0,
        size: 5,
        color: '#FFFFFF',
        life: 5,
        maxLife: 5,
        type: 'default',
      };
  }
}

export default useWorldEvents;
