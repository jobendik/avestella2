// =============================================================================
// World Event Scheduler Service - Server-authoritative world events
// =============================================================================
// Phase 2.3: Global event scheduling and synchronization
// =============================================================================

import { EventEmitter } from 'events';
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// WORLD EVENT MODELS
// ============================================

export interface IWorldEvent extends Document {
    eventId: string;
    eventType: string;
    name: string;
    description: string;
    realm: string | null;       // null = all realms
    state: 'scheduled' | 'active' | 'completed' | 'cancelled';
    startTime: Date;
    endTime: Date;
    duration: number;           // Duration in ms
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    recurrencePattern?: string; // Cron pattern for custom
    position?: { x: number; y: number };
    radius?: number;
    rewards: {
        xp?: number;
        stardust?: number;
        items?: string[];
        achievements?: string[];
    };
    participants: {
        playerId: string;
        joinedAt: Date;
        contribution: number;
    }[];
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const WorldEventSchema = new Schema<IWorldEvent>({
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    realm: { type: String, default: null, index: true },
    state: { 
        type: String, 
        enum: ['scheduled', 'active', 'completed', 'cancelled'],
        default: 'scheduled',
        index: true
    },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true },
    recurrence: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly', 'custom'],
        default: 'none'
    },
    recurrencePattern: { type: String },
    position: {
        x: Number,
        y: Number
    },
    radius: { type: Number },
    rewards: {
        xp: Number,
        stardust: Number,
        items: [String],
        achievements: [String]
    },
    participants: [{
        playerId: String,
        joinedAt: Date,
        contribution: { type: Number, default: 0 }
    }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'worldEvents' });

const WorldEvent = mongoose.models.WorldEvent || 
    mongoose.model<IWorldEvent>('WorldEvent', WorldEventSchema);

// ============================================
// EVENT TYPE DEFINITIONS
// ============================================

export interface EventTypeConfig {
    type: string;
    name: string;
    description: string;
    minDuration: number;        // Min duration in ms
    maxDuration: number;        // Max duration in ms
    defaultDuration: number;
    minParticipants: number;
    maxParticipants: number;
    baseRewards: {
        xp: number;
        stardust: number;
    };
    participantBonus: number;   // Extra rewards per participant
    mechanics: string[];
}

const EVENT_TYPES: Record<string, EventTypeConfig> = {
    'meteor_shower': {
        type: 'meteor_shower',
        name: 'Meteor Shower',
        description: 'Collect falling stars across the realm',
        minDuration: 5 * 60 * 1000,
        maxDuration: 30 * 60 * 1000,
        defaultDuration: 15 * 60 * 1000,
        minParticipants: 1,
        maxParticipants: 100,
        baseRewards: { xp: 100, stardust: 50 },
        participantBonus: 0.05,
        mechanics: ['collectibles', 'timed']
    },
    'aurora_borealis': {
        type: 'aurora_borealis',
        name: 'Aurora Borealis',
        description: 'The northern lights illuminate the sky',
        minDuration: 10 * 60 * 1000,
        maxDuration: 60 * 60 * 1000,
        defaultDuration: 30 * 60 * 1000,
        minParticipants: 1,
        maxParticipants: 500,
        baseRewards: { xp: 50, stardust: 100 },
        participantBonus: 0.02,
        mechanics: ['ambient', 'passive_gain']
    },
    'dark_convergence': {
        type: 'dark_convergence',
        name: 'Dark Convergence',
        description: 'Darkness spreads - gather warmth to survive',
        minDuration: 5 * 60 * 1000,
        maxDuration: 20 * 60 * 1000,
        defaultDuration: 10 * 60 * 1000,
        minParticipants: 5,
        maxParticipants: 50,
        baseRewards: { xp: 200, stardust: 75 },
        participantBonus: 0.1,
        mechanics: ['survival', 'cooperative', 'warmth']
    },
    'constellation_alignment': {
        type: 'constellation_alignment',
        name: 'Constellation Alignment',
        description: 'Stars align - bonus for constellation activities',
        minDuration: 15 * 60 * 1000,
        maxDuration: 120 * 60 * 1000,
        defaultDuration: 60 * 60 * 1000,
        minParticipants: 3,
        maxParticipants: 200,
        baseRewards: { xp: 150, stardust: 150 },
        participantBonus: 0.03,
        mechanics: ['constellation', 'multiplier']
    },
    'whisper_winds': {
        type: 'whisper_winds',
        name: 'Whisper Winds',
        description: 'Secret messages travel on the wind',
        minDuration: 10 * 60 * 1000,
        maxDuration: 45 * 60 * 1000,
        defaultDuration: 20 * 60 * 1000,
        minParticipants: 2,
        maxParticipants: 100,
        baseRewards: { xp: 75, stardust: 25 },
        participantBonus: 0.04,
        mechanics: ['communication', 'mystery']
    },
    'bloom_festival': {
        type: 'bloom_festival',
        name: 'Bloom Festival',
        description: 'Flowers bloom across the land',
        minDuration: 30 * 60 * 1000,
        maxDuration: 180 * 60 * 1000,
        defaultDuration: 60 * 60 * 1000,
        minParticipants: 10,
        maxParticipants: 1000,
        baseRewards: { xp: 100, stardust: 100 },
        participantBonus: 0.01,
        mechanics: ['collectibles', 'exploration', 'cosmetics']
    },
    'light_beacon_chain': {
        type: 'light_beacon_chain',
        name: 'Light Beacon Chain',
        description: 'Create a chain of light beacons',
        minDuration: 5 * 60 * 1000,
        maxDuration: 30 * 60 * 1000,
        defaultDuration: 15 * 60 * 1000,
        minParticipants: 5,
        maxParticipants: 25,
        baseRewards: { xp: 250, stardust: 100 },
        participantBonus: 0.15,
        mechanics: ['cooperative', 'positioning', 'chain']
    },
    'void_incursion': {
        type: 'void_incursion',
        name: 'Void Incursion',
        description: 'Push back the encroaching void',
        minDuration: 10 * 60 * 1000,
        maxDuration: 45 * 60 * 1000,
        defaultDuration: 20 * 60 * 1000,
        minParticipants: 10,
        maxParticipants: 100,
        baseRewards: { xp: 300, stardust: 150 },
        participantBonus: 0.08,
        mechanics: ['defense', 'cooperative', 'warmth']
    }
};

// ============================================
// SCHEDULED EVENTS (Recurring)
// ============================================

interface ScheduledEventConfig {
    type: string;
    cronPattern: string;        // Cron pattern for scheduling
    realm: string | null;       // null = all realms
    duration: number;
    enabled: boolean;
}

const SCHEDULED_EVENTS: ScheduledEventConfig[] = [
    { type: 'meteor_shower', cronPattern: '0 */4 * * *', realm: null, duration: 15 * 60 * 1000, enabled: true },      // Every 4 hours
    { type: 'aurora_borealis', cronPattern: '0 0 * * *', realm: null, duration: 60 * 60 * 1000, enabled: true },       // Daily at midnight
    { type: 'dark_convergence', cronPattern: '0 3 * * *', realm: null, duration: 10 * 60 * 1000, enabled: true },      // Daily at 3am
    { type: 'constellation_alignment', cronPattern: '0 20 * * 5', realm: null, duration: 120 * 60 * 1000, enabled: true }, // Friday 8pm
    { type: 'bloom_festival', cronPattern: '0 12 1 * *', realm: null, duration: 180 * 60 * 1000, enabled: true },      // 1st of month noon
];

// ============================================
// WORLD EVENT SCHEDULER SERVICE
// ============================================

class WorldEventSchedulerService extends EventEmitter {
    private initialized: boolean = false;
    private checkInterval: NodeJS.Timeout | null = null;
    private activeEvents: Map<string, IWorldEvent> = new Map();
    private readonly CHECK_RATE = 60 * 1000; // Check every minute

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        // Load active events
        await this.loadActiveEvents();

        // Start scheduler
        this.checkInterval = setInterval(() => {
            this.checkSchedule();
            this.checkActiveEvents();
        }, this.CHECK_RATE);

        // Initial check
        await this.checkSchedule();

        console.log('🌍 World event scheduler initialized');
    }

    // =========================================================================
    // SCHEDULING
    // =========================================================================

    private async checkSchedule(): Promise<void> {
        const now = new Date();

        for (const config of SCHEDULED_EVENTS) {
            if (!config.enabled) continue;

            // Simple time-based check (in production, use a proper cron library)
            const shouldTrigger = this.shouldTriggerEvent(config.cronPattern, now);
            
            if (shouldTrigger) {
                // Check if event already scheduled or active
                const existing = await WorldEvent.findOne({
                    eventType: config.type,
                    state: { $in: ['scheduled', 'active'] }
                });

                if (!existing) {
                    await this.scheduleEvent({
                        eventType: config.type,
                        realm: config.realm,
                        startTime: now,
                        duration: config.duration
                    });
                }
            }
        }
    }

    private shouldTriggerEvent(cronPattern: string, now: Date): boolean {
        // Simplified cron parsing - in production use node-cron or similar
        const parts = cronPattern.split(' ');
        if (parts.length !== 5) return false;

        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

        const matches = (pattern: string, value: number): boolean => {
            if (pattern === '*') return true;
            if (pattern.startsWith('*/')) {
                const interval = parseInt(pattern.slice(2));
                return value % interval === 0;
            }
            return parseInt(pattern) === value;
        };

        return (
            matches(minute, now.getUTCMinutes()) &&
            matches(hour, now.getUTCHours()) &&
            matches(dayOfMonth, now.getUTCDate()) &&
            matches(month, now.getUTCMonth() + 1) &&
            matches(dayOfWeek, now.getUTCDay())
        );
    }

    // =========================================================================
    // EVENT CREATION
    // =========================================================================

    async scheduleEvent(options: {
        eventType: string;
        realm?: string | null;
        startTime?: Date;
        duration?: number;
        position?: { x: number; y: number };
        metadata?: Record<string, any>;
    }): Promise<IWorldEvent | null> {
        const typeConfig = EVENT_TYPES[options.eventType];
        if (!typeConfig) {
            console.error(`Unknown event type: ${options.eventType}`);
            return null;
        }

        const startTime = options.startTime || new Date();
        const duration = options.duration || typeConfig.defaultDuration;
        const endTime = new Date(startTime.getTime() + duration);

        const event = await WorldEvent.create({
            eventId: `event_${uuidv4()}`,
            eventType: options.eventType,
            name: typeConfig.name,
            description: typeConfig.description,
            realm: options.realm || null,
            state: 'scheduled',
            startTime,
            endTime,
            duration,
            position: options.position,
            rewards: typeConfig.baseRewards,
            participants: [],
            metadata: options.metadata || {}
        });

        console.log(`📅 Scheduled event: ${typeConfig.name} at ${startTime.toISOString()}`);
        this.emit('event_scheduled', event);

        return event;
    }

    // =========================================================================
    // ACTIVE EVENT MANAGEMENT
    // =========================================================================

    private async loadActiveEvents(): Promise<void> {
        const events = await WorldEvent.find({
            state: 'active'
        }).lean();

        for (const event of events) {
            this.activeEvents.set(event.eventId, event as IWorldEvent);
        }

        console.log(`📊 Loaded ${events.length} active events`);
    }

    private async checkActiveEvents(): Promise<void> {
        const now = new Date();

        // Start scheduled events
        const toStart = await WorldEvent.find({
            state: 'scheduled',
            startTime: { $lte: now }
        });

        for (const event of toStart) {
            await this.startEvent(event.eventId);
        }

        // End expired events
        const toEnd = await WorldEvent.find({
            state: 'active',
            endTime: { $lte: now }
        });

        for (const event of toEnd) {
            await this.endEvent(event.eventId);
        }
    }

    async startEvent(eventId: string): Promise<boolean> {
        const event = await WorldEvent.findOneAndUpdate(
            { eventId, state: 'scheduled' },
            { state: 'active', updatedAt: new Date() },
            { new: true }
        );

        if (!event) return false;

        this.activeEvents.set(eventId, event);
        console.log(`🎉 Started event: ${event.name}`);
        this.emit('event_started', event);

        return true;
    }

    async endEvent(eventId: string): Promise<boolean> {
        const event = await WorldEvent.findOneAndUpdate(
            { eventId, state: 'active' },
            { state: 'completed', updatedAt: new Date() },
            { new: true }
        );

        if (!event) return false;

        this.activeEvents.delete(eventId);
        console.log(`✅ Ended event: ${event.name}`);
        
        // Distribute rewards
        await this.distributeRewards(event);
        
        this.emit('event_ended', event);

        return true;
    }

    async cancelEvent(eventId: string): Promise<boolean> {
        const event = await WorldEvent.findOneAndUpdate(
            { eventId, state: { $in: ['scheduled', 'active'] } },
            { state: 'cancelled', updatedAt: new Date() },
            { new: true }
        );

        if (!event) return false;

        this.activeEvents.delete(eventId);
        console.log(`❌ Cancelled event: ${event.name}`);
        this.emit('event_cancelled', event);

        return true;
    }

    // =========================================================================
    // PARTICIPATION
    // =========================================================================

    async joinEvent(eventId: string, playerId: string): Promise<boolean> {
        const event = await WorldEvent.findOne({ eventId, state: 'active' });
        if (!event) return false;

        const typeConfig = EVENT_TYPES[event.eventType];
        if (!typeConfig) return false;

        // Check participant limit
        if (event.participants.length >= typeConfig.maxParticipants) {
            return false;
        }

        // Check if already participating
        if (event.participants.some(p => p.playerId === playerId)) {
            return true; // Already joined
        }

        await WorldEvent.findOneAndUpdate(
            { eventId },
            {
                $push: {
                    participants: {
                        playerId,
                        joinedAt: new Date(),
                        contribution: 0
                    }
                }
            }
        );

        this.emit('player_joined_event', { eventId, playerId, eventName: event.name });
        return true;
    }

    async addContribution(eventId: string, playerId: string, amount: number): Promise<void> {
        await WorldEvent.findOneAndUpdate(
            { 
                eventId, 
                state: 'active',
                'participants.playerId': playerId 
            },
            {
                $inc: { 'participants.$.contribution': amount }
            }
        );
    }

    // =========================================================================
    // REWARDS
    // =========================================================================

    private async distributeRewards(event: IWorldEvent): Promise<void> {
        const typeConfig = EVENT_TYPES[event.eventType];
        if (!typeConfig) return;

        const participantCount = event.participants.length;
        if (participantCount < typeConfig.minParticipants) {
            console.log(`Event ${event.name} did not meet minimum participants`);
            return;
        }

        const bonusMultiplier = 1 + (participantCount * typeConfig.participantBonus);

        for (const participant of event.participants) {
            // Calculate contribution bonus
            const totalContribution = event.participants.reduce((sum, p) => sum + p.contribution, 0);
            const contributionRatio = totalContribution > 0 
                ? participant.contribution / totalContribution 
                : 1 / participantCount;

            const xpReward = Math.floor(event.rewards.xp! * bonusMultiplier * (0.5 + contributionRatio * 0.5));
            const stardustReward = Math.floor(event.rewards.stardust! * bonusMultiplier * (0.5 + contributionRatio * 0.5));

            // Award rewards (using progression service would be better)
            this.emit('award_player', {
                playerId: participant.playerId,
                xp: xpReward,
                stardust: stardustReward,
                eventId: event.eventId,
                eventName: event.name
            });
        }
    }

    // =========================================================================
    // QUERIES
    // =========================================================================

    async getActiveEvents(realm?: string): Promise<IWorldEvent[]> {
        const query: any = { state: 'active' };
        if (realm) {
            query.$or = [{ realm }, { realm: null }];
        }

        return WorldEvent.find(query).lean();
    }

    async getUpcomingEvents(realm?: string, limit: number = 10): Promise<IWorldEvent[]> {
        const query: any = { 
            state: 'scheduled',
            startTime: { $gt: new Date() }
        };
        if (realm) {
            query.$or = [{ realm }, { realm: null }];
        }

        return WorldEvent.find(query)
            .sort({ startTime: 1 })
            .limit(limit)
            .lean();
    }

    async getEventHistory(realm?: string, limit: number = 20): Promise<IWorldEvent[]> {
        const query: any = { state: 'completed' };
        if (realm) {
            query.$or = [{ realm }, { realm: null }];
        }

        return WorldEvent.find(query)
            .sort({ endTime: -1 })
            .limit(limit)
            .lean();
    }

    getEventTypes(): EventTypeConfig[] {
        return Object.values(EVENT_TYPES);
    }

    // =========================================================================
    // MANUAL TRIGGERS
    // =========================================================================

    async triggerEvent(eventType: string, options?: {
        realm?: string;
        duration?: number;
        position?: { x: number; y: number };
    }): Promise<IWorldEvent | null> {
        return this.scheduleEvent({
            eventType,
            realm: options?.realm,
            startTime: new Date(),
            duration: options?.duration,
            position: options?.position
        });
    }

    // =========================================================================
    // SHUTDOWN
    // =========================================================================

    shutdown(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

export const worldEventSchedulerService = new WorldEventSchedulerService();
export { EVENT_TYPES, WorldEvent };
