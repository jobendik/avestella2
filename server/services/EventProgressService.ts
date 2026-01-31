/**
 * Event Progress Service - Track player contributions to world events
 * Persists event progress to MongoDB (GAP 8 fix)
 */

import { EventEmitter } from 'events';
import { EventProgress, IEventProgress } from '../database/models.js';

export interface EventContribution {
    fragments: number;
    beacons: number;
    bonds: number;
    actions: number;
    custom: Record<string, number>;
}

export interface PlayerEventProgress {
    playerId: string;
    eventId: string;
    eventName: string;
    contributions: EventContribution;
    totalContribution: number;
    rank: number;
    rewardsClaimed: string[];
    joinedAt: Date;
    lastContributionAt: Date;
}

export interface EventLeaderboardEntry {
    playerId: string;
    playerName?: string;
    totalContribution: number;
    rank: number;
}

class EventProgressService extends EventEmitter {
    private progressCache: Map<string, PlayerEventProgress> = new Map();
    private activeEvents: Set<string> = new Set();

    constructor() {
        super();
    }

    async initialize(): Promise<void> {
        console.log('🎪 Event Progress Service initializing...');
        // Load active events from database
        await this.loadActiveEvents();
        console.log('🎪 Event Progress Service initialized');
    }

    private async loadActiveEvents(): Promise<void> {
        try {
            // Find distinct active eventIds from last 7 days
            const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const activeEventIds = await EventProgress.distinct('eventId', {
                lastContributionAt: { $gte: recentCutoff }
            });
            
            for (const eventId of activeEventIds) {
                this.activeEvents.add(eventId);
            }
            
            console.log(`🎪 Found ${this.activeEvents.size} active events`);
        } catch (error) {
            console.error('Failed to load active events:', error);
        }
    }

    private getCacheKey(playerId: string, eventId: string): string {
        return `${playerId}:${eventId}`;
    }

    // =========================================================================
    // Event Progress Operations
    // =========================================================================

    /**
     * Get or create player's progress for an event
     */
    async getPlayerProgress(playerId: string, eventId: string, eventName?: string): Promise<PlayerEventProgress> {
        const cacheKey = this.getCacheKey(playerId, eventId);
        
        // Check cache first
        if (this.progressCache.has(cacheKey)) {
            return this.progressCache.get(cacheKey)!;
        }

        try {
            let progressDoc = await EventProgress.findOne({ playerId, eventId }).lean();
            
            if (!progressDoc) {
                // Create new progress entry
                const newProgress = new EventProgress({
                    playerId,
                    eventId,
                    eventName: eventName || `Event ${eventId}`,
                    contributions: {
                        fragments: 0,
                        beacons: 0,
                        bonds: 0,
                        actions: 0,
                        custom: {}
                    },
                    totalContribution: 0,
                    rank: 0,
                    rewardsClaimed: [],
                    joinedAt: new Date(),
                    lastContributionAt: new Date()
                });
                
                await newProgress.save();
                progressDoc = {
                    playerId: newProgress.playerId,
                    eventId: newProgress.eventId,
                    eventName: newProgress.eventName,
                    contributions: newProgress.contributions,
                    totalContribution: newProgress.totalContribution,
                    rank: newProgress.rank,
                    rewardsClaimed: newProgress.rewardsClaimed,
                    joinedAt: newProgress.joinedAt,
                    lastContributionAt: newProgress.lastContributionAt
                } as any;
                
                this.activeEvents.add(eventId);
                this.emit('player_joined_event', { playerId, eventId });
            }
            
            const playerProgress: PlayerEventProgress = {
                playerId: progressDoc!.playerId,
                eventId: progressDoc!.eventId,
                eventName: progressDoc!.eventName,
                contributions: progressDoc!.contributions as EventContribution,
                totalContribution: progressDoc!.totalContribution,
                rank: progressDoc!.rank,
                rewardsClaimed: progressDoc!.rewardsClaimed,
                joinedAt: progressDoc!.joinedAt,
                lastContributionAt: progressDoc!.lastContributionAt
            };
            
            this.progressCache.set(cacheKey, playerProgress);
            return playerProgress;
            
        } catch (error) {
            console.error('Failed to get player progress:', error);
            // Return empty progress on error
            return {
                playerId,
                eventId,
                eventName: eventName || `Event ${eventId}`,
                contributions: { fragments: 0, beacons: 0, bonds: 0, actions: 0, custom: {} },
                totalContribution: 0,
                rank: 0,
                rewardsClaimed: [],
                joinedAt: new Date(),
                lastContributionAt: new Date()
            };
        }
    }

    /**
     * Add contribution to an event
     */
    async addContribution(
        playerId: string,
        eventId: string,
        contributionType: 'fragments' | 'beacons' | 'bonds' | 'actions' | string,
        amount: number = 1,
        eventName?: string
    ): Promise<{ success: boolean; newTotal: number; newRank?: number }> {
        try {
            const cacheKey = this.getCacheKey(playerId, eventId);
            
            // Determine update path
            const isCustom = !['fragments', 'beacons', 'bonds', 'actions'].includes(contributionType);
            const updatePath = isCustom 
                ? `contributions.custom.${contributionType}`
                : `contributions.${contributionType}`;
            
            const result = await EventProgress.findOneAndUpdate(
                { playerId, eventId },
                {
                    $inc: {
                        [updatePath]: amount,
                        totalContribution: amount
                    },
                    $set: {
                        lastContributionAt: new Date(),
                        eventName: eventName || undefined
                    },
                    $setOnInsert: {
                        joinedAt: new Date(),
                        rewardsClaimed: [],
                        rank: 0
                    }
                },
                { upsert: true, new: true }
            );
            
            // Update cache
            const playerProgress: PlayerEventProgress = {
                playerId: result.playerId,
                eventId: result.eventId,
                eventName: result.eventName,
                contributions: result.contributions as EventContribution,
                totalContribution: result.totalContribution,
                rank: result.rank,
                rewardsClaimed: result.rewardsClaimed,
                joinedAt: result.joinedAt,
                lastContributionAt: result.lastContributionAt
            };
            this.progressCache.set(cacheKey, playerProgress);
            
            this.activeEvents.add(eventId);
            
            this.emit('contribution_added', {
                playerId,
                eventId,
                contributionType,
                amount,
                newTotal: result.totalContribution
            });
            
            return {
                success: true,
                newTotal: result.totalContribution
            };
            
        } catch (error) {
            console.error('Failed to add contribution:', error);
            return { success: false, newTotal: 0 };
        }
    }

    /**
     * Get event leaderboard
     */
    async getLeaderboard(eventId: string, limit: number = 50): Promise<EventLeaderboardEntry[]> {
        try {
            const entries = await EventProgress.find({ eventId })
                .sort({ totalContribution: -1 })
                .limit(limit)
                .select('playerId totalContribution')
                .lean();
            
            return entries.map((entry, index) => ({
                playerId: entry.playerId,
                totalContribution: entry.totalContribution,
                rank: index + 1
            }));
            
        } catch (error) {
            console.error('Failed to get leaderboard:', error);
            return [];
        }
    }

    /**
     * Update player ranks for an event (call periodically or after major changes)
     */
    async updateRanks(eventId: string): Promise<void> {
        try {
            const entries = await EventProgress.find({ eventId })
                .sort({ totalContribution: -1 })
                .select('_id playerId')
                .lean();
            
            const bulkOps = entries.map((entry, index) => ({
                updateOne: {
                    filter: { _id: entry._id },
                    update: { $set: { rank: index + 1 } }
                }
            }));
            
            if (bulkOps.length > 0) {
                await EventProgress.bulkWrite(bulkOps);
                
                // Clear cache for this event
                for (const [key, progress] of this.progressCache.entries()) {
                    if (progress.eventId === eventId) {
                        this.progressCache.delete(key);
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to update ranks:', error);
        }
    }

    /**
     * Claim a reward for an event
     */
    async claimReward(playerId: string, eventId: string, rewardId: string): Promise<{ success: boolean; alreadyClaimed: boolean }> {
        try {
            const progress = await EventProgress.findOne({ playerId, eventId });
            
            if (!progress) {
                return { success: false, alreadyClaimed: false };
            }
            
            if (progress.rewardsClaimed.includes(rewardId)) {
                return { success: false, alreadyClaimed: true };
            }
            
            progress.rewardsClaimed.push(rewardId);
            await progress.save();
            
            // Update cache
            const cacheKey = this.getCacheKey(playerId, eventId);
            const cached = this.progressCache.get(cacheKey);
            if (cached) {
                cached.rewardsClaimed.push(rewardId);
            }
            
            this.emit('reward_claimed', { playerId, eventId, rewardId });
            
            return { success: true, alreadyClaimed: false };
            
        } catch (error) {
            console.error('Failed to claim reward:', error);
            return { success: false, alreadyClaimed: false };
        }
    }

    /**
     * Get total event statistics
     */
    async getEventStats(eventId: string): Promise<{
        totalParticipants: number;
        totalContributions: number;
        contributionBreakdown: EventContribution;
    }> {
        try {
            const stats = await EventProgress.aggregate([
                { $match: { eventId } },
                {
                    $group: {
                        _id: null,
                        totalParticipants: { $sum: 1 },
                        totalContributions: { $sum: '$totalContribution' },
                        fragments: { $sum: '$contributions.fragments' },
                        beacons: { $sum: '$contributions.beacons' },
                        bonds: { $sum: '$contributions.bonds' },
                        actions: { $sum: '$contributions.actions' }
                    }
                }
            ]);
            
            if (stats.length === 0) {
                return {
                    totalParticipants: 0,
                    totalContributions: 0,
                    contributionBreakdown: { fragments: 0, beacons: 0, bonds: 0, actions: 0, custom: {} }
                };
            }
            
            return {
                totalParticipants: stats[0].totalParticipants,
                totalContributions: stats[0].totalContributions,
                contributionBreakdown: {
                    fragments: stats[0].fragments,
                    beacons: stats[0].beacons,
                    bonds: stats[0].bonds,
                    actions: stats[0].actions,
                    custom: {}
                }
            };
            
        } catch (error) {
            console.error('Failed to get event stats:', error);
            return {
                totalParticipants: 0,
                totalContributions: 0,
                contributionBreakdown: { fragments: 0, beacons: 0, bonds: 0, actions: 0, custom: {} }
            };
        }
    }

    /**
     * Get active event IDs
     */
    getActiveEvents(): string[] {
        return Array.from(this.activeEvents);
    }

    /**
     * Clear cache (for maintenance)
     */
    clearCache(): void {
        this.progressCache.clear();
    }
}

export const eventProgressService = new EventProgressService();
export { EventProgressService };
