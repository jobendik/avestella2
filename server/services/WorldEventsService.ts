// =============================================================================
// WorldEventsService - Server-Authoritative World Events
// =============================================================================
// Manages global world events that all players experience simultaneously:
// - Meteor showers, auroras, eclipses, etc.
// - Scheduled and random events
// - Event rewards and participation tracking
// =============================================================================

import { EventEmitter } from 'events';

// Event definitions
export interface WorldEvent {
    id: string;
    type: WorldEventType;
    name: string;
    description: string;
    realm: string | 'all';      // Which realm or all realms
    startTime: number;          // Unix timestamp
    endTime: number;            // Unix timestamp
    progress: number;           // 0-100 completion
    participants: Set<string>;  // Player IDs who participated
    rewards: EventReward;
    data: Record<string, any>;  // Event-specific data
    isActive: boolean;
}

export type WorldEventType = 
    | 'meteor_shower'    // Collectible meteors fall
    | 'aurora'           // Visual spectacle, bonus XP
    | 'eclipse'          // Darkness spreads, survival mode
    | 'star_alignment'   // Constellations give bonuses
    | 'cosmic_storm'     // Chaos mode, double everything
    | 'harmony_wave'     // All bonds strengthen
    | 'fragment_rain'    // Extra fragments spawn
    | 'guardian_call'    // Boss-like event
    | 'community_goal'   // Collaborative target
    | 'double_xp'        // XP multiplier event
    | 'double_stardust'  // Stardust multiplier event
    | 'celebration';     // Special celebration

export interface EventReward {
    xpBonus: number;           // Multiplier (1.0 = normal)
    stardustBonus: number;     // Multiplier
    participationXp: number;   // XP for participating
    completionXp: number;      // XP for event completion
    completionStardust: number;
    cosmetic?: string;         // Exclusive cosmetic reward
    title?: string;            // Exclusive title
}

export interface ScheduledEvent {
    type: WorldEventType;
    realm: string | 'all';
    schedule: 'hourly' | 'daily' | 'weekly' | 'random';
    durationMinutes: number;
    probability: number;       // For random events, 0-1
    rewards: EventReward;
}

// Pre-defined event templates
const EVENT_TEMPLATES: Record<WorldEventType, Omit<WorldEvent, 'id' | 'startTime' | 'endTime' | 'participants' | 'isActive'>> = {
    meteor_shower: {
        type: 'meteor_shower',
        name: 'Meteor Shower',
        description: 'Brilliant meteors streak across the sky! Collect them for bonus rewards.',
        realm: 'all',
        progress: 0,
        rewards: {
            xpBonus: 1.5,
            stardustBonus: 2.0,
            participationXp: 50,
            completionXp: 200,
            completionStardust: 100
        },
        data: { meteorsCollected: 0, targetMeteors: 100 }
    },
    aurora: {
        type: 'aurora',
        name: 'Aurora Borealis',
        description: 'The cosmic aurora dances overhead, filling all with wonder and bonus XP.',
        realm: 'all',
        progress: 0,
        rewards: {
            xpBonus: 2.0,
            stardustBonus: 1.5,
            participationXp: 30,
            completionXp: 100,
            completionStardust: 50
        },
        data: {}
    },
    eclipse: {
        type: 'eclipse',
        name: 'Cosmic Eclipse',
        description: 'Darkness spreads as a celestial body blocks the light. Survive and thrive!',
        realm: 'all',
        progress: 0,
        rewards: {
            xpBonus: 1.0,
            stardustBonus: 3.0,
            participationXp: 75,
            completionXp: 300,
            completionStardust: 200
        },
        data: { survivorCount: 0 }
    },
    star_alignment: {
        type: 'star_alignment',
        name: 'Celestial Alignment',
        description: 'The stars align perfectly! Constellation bonuses are doubled.',
        realm: 'all',
        progress: 0,
        rewards: {
            xpBonus: 1.5,
            stardustBonus: 1.5,
            participationXp: 40,
            completionXp: 150,
            completionStardust: 75
        },
        data: {}
    },
    cosmic_storm: {
        type: 'cosmic_storm',
        name: 'Cosmic Storm',
        description: 'A wild cosmic storm surges through! Everything is amplified.',
        realm: 'all',
        progress: 0,
        rewards: {
            xpBonus: 2.5,
            stardustBonus: 2.5,
            participationXp: 60,
            completionXp: 250,
            completionStardust: 150
        },
        data: { intensity: 1.0 }
    },
    harmony_wave: {
        type: 'harmony_wave',
        name: 'Harmony Wave',
        description: 'A wave of cosmic harmony strengthens all bonds between players.',
        realm: 'all',
        progress: 0,
        rewards: {
            xpBonus: 1.25,
            stardustBonus: 1.25,
            participationXp: 35,
            completionXp: 100,
            completionStardust: 50
        },
        data: { bondsStrengthened: 0 }
    },
    fragment_rain: {
        type: 'fragment_rain',
        name: 'Fragment Rain',
        description: 'Glowing fragments rain from the cosmos! Collect as many as you can.',
        realm: 'all',
        progress: 0,
        rewards: {
            xpBonus: 1.0,
            stardustBonus: 1.0,
            participationXp: 25,
            completionXp: 100,
            completionStardust: 200
        },
        data: { fragmentsCollected: 0, targetFragments: 500 }
    },
    guardian_call: {
        type: 'guardian_call',
        name: 'Guardian\'s Call',
        description: 'A cosmic guardian appears! Work together to channel its energy.',
        realm: 'genesis',
        progress: 0,
        rewards: {
            xpBonus: 1.5,
            stardustBonus: 1.5,
            participationXp: 100,
            completionXp: 500,
            completionStardust: 300,
            cosmetic: 'guardian_aura'
        },
        data: { energyChanneled: 0, targetEnergy: 1000 }
    },
    community_goal: {
        type: 'community_goal',
        name: 'Community Goal',
        description: 'Work together to achieve a global milestone!',
        realm: 'all',
        progress: 0,
        rewards: {
            xpBonus: 1.0,
            stardustBonus: 1.0,
            participationXp: 50,
            completionXp: 200,
            completionStardust: 100
        },
        data: { goalType: 'stars_lit', current: 0, target: 10000 }
    },
    double_xp: {
        type: 'double_xp',
        name: 'Double XP Weekend',
        description: 'All XP gains are doubled!',
        realm: 'all',
        progress: 100, // Always "complete"
        rewards: {
            xpBonus: 2.0,
            stardustBonus: 1.0,
            participationXp: 0,
            completionXp: 0,
            completionStardust: 0
        },
        data: {}
    },
    double_stardust: {
        type: 'double_stardust',
        name: 'Stardust Surge',
        description: 'All Stardust gains are doubled!',
        realm: 'all',
        progress: 100,
        rewards: {
            xpBonus: 1.0,
            stardustBonus: 2.0,
            participationXp: 0,
            completionXp: 0,
            completionStardust: 0
        },
        data: {}
    },
    celebration: {
        type: 'celebration',
        name: 'Cosmic Celebration',
        description: 'A special celebration is happening! Enjoy boosted rewards.',
        realm: 'all',
        progress: 0,
        rewards: {
            xpBonus: 1.5,
            stardustBonus: 1.5,
            participationXp: 100,
            completionXp: 300,
            completionStardust: 200,
            title: 'Celebrant'
        },
        data: { reason: 'milestone' }
    }
};

// Scheduled events configuration
const SCHEDULED_EVENTS: ScheduledEvent[] = [
    {
        type: 'meteor_shower',
        realm: 'all',
        schedule: 'random',
        durationMinutes: 10,
        probability: 0.15,
        rewards: EVENT_TEMPLATES.meteor_shower.rewards
    },
    {
        type: 'aurora',
        realm: 'all',
        schedule: 'random',
        durationMinutes: 15,
        probability: 0.20,
        rewards: EVENT_TEMPLATES.aurora.rewards
    },
    {
        type: 'harmony_wave',
        realm: 'all',
        schedule: 'random',
        durationMinutes: 5,
        probability: 0.25,
        rewards: EVENT_TEMPLATES.harmony_wave.rewards
    },
    {
        type: 'fragment_rain',
        realm: 'all',
        schedule: 'random',
        durationMinutes: 8,
        probability: 0.15,
        rewards: EVENT_TEMPLATES.fragment_rain.rewards
    },
    {
        type: 'eclipse',
        realm: 'all',
        schedule: 'random',
        durationMinutes: 5,
        probability: 0.08,
        rewards: EVENT_TEMPLATES.eclipse.rewards
    }
];

export class WorldEventsService extends EventEmitter {
    private static instance: WorldEventsService;
    private activeEvents: Map<string, WorldEvent> = new Map();
    private eventHistory: WorldEvent[] = [];
    private checkInterval: NodeJS.Timeout | null = null;
    private ready = false;

    // Singleton
    static getInstance(): WorldEventsService {
        if (!WorldEventsService.instance) {
            WorldEventsService.instance = new WorldEventsService();
        }
        return WorldEventsService.instance;
    }

    async initialize(): Promise<void> {
        if (this.ready) return;

        // Start event check loop (every 30 seconds)
        this.checkInterval = setInterval(() => {
            this.checkScheduledEvents();
            this.updateActiveEvents();
        }, 30000);

        // Check immediately on start
        this.checkScheduledEvents();

        this.ready = true;
        console.log('🌌 WorldEventsService initialized');
    }

    isReady(): boolean {
        return this.ready;
    }

    /**
     * Check if any scheduled events should start
     */
    private checkScheduledEvents(): void {
        // Don't start new events if too many are active
        if (this.activeEvents.size >= 2) return;

        const now = Date.now();

        for (const scheduled of SCHEDULED_EVENTS) {
            // Check if an event of this type is already running
            const alreadyRunning = Array.from(this.activeEvents.values())
                .some(e => e.type === scheduled.type);
            if (alreadyRunning) continue;

            // Random probability check
            if (scheduled.schedule === 'random') {
                if (Math.random() < scheduled.probability) {
                    this.startEvent(scheduled.type, scheduled.realm, scheduled.durationMinutes);
                }
            }
        }
    }

    /**
     * Update all active events (progress, expiry)
     */
    private updateActiveEvents(): void {
        const now = Date.now();

        for (const [eventId, event] of this.activeEvents) {
            // Check if event has ended
            if (now >= event.endTime) {
                this.endEvent(eventId);
                continue;
            }

            // Update time-based progress
            const elapsed = now - event.startTime;
            const duration = event.endTime - event.startTime;
            const timeProgress = (elapsed / duration) * 100;

            // Some events use time-based progress
            if (event.type === 'aurora' || event.type === 'double_xp' || event.type === 'double_stardust') {
                event.progress = Math.min(100, timeProgress);
            }
        }
    }

    /**
     * Start a new world event
     */
    startEvent(
        type: WorldEventType,
        realm: string | 'all' = 'all',
        durationMinutes: number = 10,
        customData?: Record<string, any>
    ): WorldEvent | null {
        const template = EVENT_TEMPLATES[type];
        if (!template) return null;

        const now = Date.now();
        const eventId = `${type}-${now}`;

        const event: WorldEvent = {
            ...template,
            id: eventId,
            realm,
            startTime: now,
            endTime: now + (durationMinutes * 60 * 1000),
            participants: new Set(),
            isActive: true,
            data: { ...template.data, ...customData }
        };

        this.activeEvents.set(eventId, event);

        // Emit event for WebSocket broadcast
        this.emit('event_started', this.serializeEvent(event));

        console.log(`🎉 World Event started: ${event.name} (${durationMinutes} min)`);

        return event;
    }

    /**
     * End a world event
     */
    endEvent(eventId: string): void {
        const event = this.activeEvents.get(eventId);
        if (!event) return;

        event.isActive = false;
        this.activeEvents.delete(eventId);
        this.eventHistory.push(event);

        // Keep only last 50 events in history
        if (this.eventHistory.length > 50) {
            this.eventHistory = this.eventHistory.slice(-50);
        }

        // Emit event for WebSocket broadcast
        this.emit('event_ended', {
            eventId,
            type: event.type,
            name: event.name,
            participantCount: event.participants.size,
            progress: event.progress
        });

        console.log(`🏁 World Event ended: ${event.name} (${event.participants.size} participants)`);
    }

    /**
     * Record player participation in an event
     */
    participateInEvent(eventId: string, playerId: string): boolean {
        const event = this.activeEvents.get(eventId);
        if (!event || !event.isActive) return false;

        const isNewParticipant = !event.participants.has(playerId);
        event.participants.add(playerId);

        if (isNewParticipant) {
            this.emit('participant_joined', {
                eventId,
                playerId,
                participantCount: event.participants.size
            });
        }

        return isNewParticipant;
    }

    /**
     * Update event progress (for goal-based events)
     */
    updateEventProgress(eventId: string, key: string, increment: number): void {
        const event = this.activeEvents.get(eventId);
        if (!event || !event.isActive) return;

        if (typeof event.data[key] === 'number') {
            event.data[key] += increment;

            // Calculate progress for goal-based events
            const targetKey = `target${key.charAt(0).toUpperCase() + key.slice(1)}`;
            if (event.data[targetKey]) {
                event.progress = Math.min(100, (event.data[key] / event.data[targetKey]) * 100);

                // Check if goal is complete
                if (event.progress >= 100) {
                    this.emit('event_goal_reached', {
                        eventId,
                        type: event.type,
                        name: event.name
                    });
                }
            }

            this.emit('event_progress', {
                eventId,
                key,
                value: event.data[key],
                progress: event.progress
            });
        }
    }

    /**
     * Get all active events
     */
    getActiveEvents(realm?: string): any[] {
        const events = Array.from(this.activeEvents.values())
            .filter(e => e.isActive && (!realm || e.realm === 'all' || e.realm === realm));

        return events.map(e => this.serializeEvent(e));
    }

    /**
     * Get a specific event
     */
    getEvent(eventId: string): any | null {
        const event = this.activeEvents.get(eventId);
        return event ? this.serializeEvent(event) : null;
    }

    /**
     * Get current XP multiplier from active events
     */
    getXpMultiplier(realm: string): number {
        let multiplier = 1.0;

        for (const event of this.activeEvents.values()) {
            if (event.isActive && (event.realm === 'all' || event.realm === realm)) {
                multiplier *= event.rewards.xpBonus;
            }
        }

        return multiplier;
    }

    /**
     * Get current stardust multiplier from active events
     */
    getStardustMultiplier(realm: string): number {
        let multiplier = 1.0;

        for (const event of this.activeEvents.values()) {
            if (event.isActive && (event.realm === 'all' || event.realm === realm)) {
                multiplier *= event.rewards.stardustBonus;
            }
        }

        return multiplier;
    }

    /**
     * Get event history
     */
    getEventHistory(limit: number = 20): any[] {
        return this.eventHistory
            .slice(-limit)
            .map(e => ({
                id: e.id,
                type: e.type,
                name: e.name,
                startTime: e.startTime,
                endTime: e.endTime,
                participantCount: e.participants.size,
                progress: e.progress
            }));
    }

    /**
     * Serialize event for transmission (convert Set to count)
     */
    private serializeEvent(event: WorldEvent): any {
        return {
            id: event.id,
            type: event.type,
            name: event.name,
            description: event.description,
            realm: event.realm,
            startTime: event.startTime,
            endTime: event.endTime,
            progress: event.progress,
            participantCount: event.participants.size,
            rewards: event.rewards,
            data: event.data,
            isActive: event.isActive
        };
    }

    /**
     * Manually trigger a special event (admin/celebration)
     */
    triggerSpecialEvent(type: WorldEventType, durationMinutes: number, customData?: Record<string, any>): WorldEvent | null {
        return this.startEvent(type, 'all', durationMinutes, customData);
    }

    /**
     * Shutdown service
     */
    shutdown(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.activeEvents.clear();
        this.ready = false;
        console.log('🌌 WorldEventsService shut down');
    }
}

// Export singleton
export const worldEventsService = WorldEventsService.getInstance();
