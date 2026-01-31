// Reputation Service - Manages reputation tracks for different playstyles
// Tracks: explorer, connector, guardian, beacon_keeper, collector

import { Reputation, IReputation } from '../database/socialModels.js';

// Reputation level thresholds (per constants/reputation.ts)
const REPUTATION_LEVELS = [0, 100, 500, 1500, 4000, 8000, 15000, 30000, 50000, 100000];

export type ReputationTrack = 'explorer' | 'connector' | 'guardian' | 'beacon_keeper' | 'collector';

export interface ReputationXPSource {
    track: ReputationTrack;
    action: string;
    xp: number;
}

// XP sources per track (from constants/reputation.ts)
const XP_SOURCES: Record<string, ReputationXPSource> = {
    // Explorer
    discover_poi: { track: 'explorer', action: 'discover_poi', xp: 50 },
    reveal_fog: { track: 'explorer', action: 'reveal_fog', xp: 1 },
    travel_100m: { track: 'explorer', action: 'travel_100m', xp: 5 },
    find_hidden: { track: 'explorer', action: 'find_hidden', xp: 100 },
    enter_biome: { track: 'explorer', action: 'enter_biome', xp: 25 },
    reach_edge: { track: 'explorer', action: 'reach_edge', xp: 200 },
    
    // Connector
    meet_soul: { track: 'connector', action: 'meet_soul', xp: 10 },
    form_bond: { track: 'connector', action: 'form_bond', xp: 50 },
    seal_bond: { track: 'connector', action: 'seal_bond', xp: 200 },
    time_together: { track: 'connector', action: 'time_together', xp: 1 },
    gift_light: { track: 'connector', action: 'gift_light', xp: 25 },
    send_message: { track: 'connector', action: 'send_message', xp: 5 },
    
    // Guardian
    help_newcomer: { track: 'guardian', action: 'help_newcomer', xp: 50 },
    rescue_darkness: { track: 'guardian', action: 'rescue_darkness', xp: 100 },
    share_light: { track: 'guardian', action: 'share_light', xp: 25 },
    answer_help: { track: 'guardian', action: 'answer_help', xp: 30 },
    protect_beacon: { track: 'guardian', action: 'protect_beacon', xp: 40 },
    mentor_session: { track: 'guardian', action: 'mentor_session', xp: 75 },
    
    // Beacon Keeper
    light_beacon: { track: 'beacon_keeper', action: 'light_beacon', xp: 50 },
    defend_beacon: { track: 'beacon_keeper', action: 'defend_beacon', xp: 75 },
    perfect_rhythm: { track: 'beacon_keeper', action: 'perfect_rhythm', xp: 100 },
    chain_beacons: { track: 'beacon_keeper', action: 'chain_beacons', xp: 150 },
    group_beacon: { track: 'beacon_keeper', action: 'group_beacon', xp: 60 },
    
    // Collector
    collect_fragment: { track: 'collector', action: 'collect_fragment', xp: 5 },
    collect_rare: { track: 'collector', action: 'collect_rare', xp: 50 },
    complete_set: { track: 'collector', action: 'complete_set', xp: 200 },
    discover_artifact: { track: 'collector', action: 'discover_artifact', xp: 100 },
    trade_item: { track: 'collector', action: 'trade_item', xp: 25 },
};

function getLevel(xp: number): number {
    for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
        if (xp >= REPUTATION_LEVELS[i]) return i + 1;
    }
    return 1;
}

export class ReputationService {
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('🏆 Reputation service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    // ========================================
    // CORE OPERATIONS
    // ========================================

    async getReputation(playerId: string): Promise<IReputation> {
        let reputation = await Reputation.findOne({ playerId });
        
        if (!reputation) {
            reputation = new Reputation({
                playerId,
                tracks: {
                    explorer: { xp: 0, level: 1 },
                    connector: { xp: 0, level: 1 },
                    guardian: { xp: 0, level: 1 },
                    beacon_keeper: { xp: 0, level: 1 },
                    collector: { xp: 0, level: 1 }
                },
                unlockedRewards: []
            });
            await reputation.save();
        }
        
        return reputation;
    }

    async addReputationXP(playerId: string, action: string, multiplier: number = 1): Promise<{
        track: ReputationTrack;
        xpGained: number;
        newXP: number;
        newLevel: number;
        leveledUp: boolean;
        rewards?: { stardust?: number; title?: string; cosmetic?: string };
    } | null> {
        const source = XP_SOURCES[action];
        if (!source) {
            console.warn(`Unknown reputation action: ${action}`);
            return null;
        }

        const reputation = await this.getReputation(playerId);
        const track = source.track;
        const xpGained = Math.floor(source.xp * multiplier);
        
        const oldLevel = reputation.tracks[track].level;
        reputation.tracks[track].xp += xpGained;
        const newLevel = getLevel(reputation.tracks[track].xp);
        reputation.tracks[track].level = newLevel;
        reputation.lastUpdated = new Date();

        const leveledUp = newLevel > oldLevel;
        let rewards: { stardust?: number; title?: string; cosmetic?: string } | undefined;

        // Award level-up rewards
        if (leveledUp) {
            rewards = this.getLevelRewards(track, newLevel);
            if (rewards) {
                const rewardId = `${track}_level_${newLevel}`;
                if (!reputation.unlockedRewards.includes(rewardId)) {
                    reputation.unlockedRewards.push(rewardId);
                }
            }
        }

        await reputation.save();

        return {
            track,
            xpGained,
            newXP: reputation.tracks[track].xp,
            newLevel,
            leveledUp,
            rewards
        };
    }

    async addBulkReputationXP(playerId: string, actions: { action: string; count: number }[]): Promise<void> {
        const reputation = await this.getReputation(playerId);
        
        for (const { action, count } of actions) {
            const source = XP_SOURCES[action];
            if (!source) continue;
            
            const track = source.track;
            reputation.tracks[track].xp += source.xp * count;
            reputation.tracks[track].level = getLevel(reputation.tracks[track].xp);
        }
        
        reputation.lastUpdated = new Date();
        await reputation.save();
    }

    getLevelRewards(track: ReputationTrack, level: number): { stardust?: number; title?: string; cosmetic?: string } | undefined {
        // Reward tiers based on constants/reputation.ts
        const baseStardust = [0, 0, 100, 250, 500, 750, 1000, 2000, 3000, 5000];
        
        const rewards: { stardust?: number; title?: string; cosmetic?: string } = {};
        
        if (level >= 2) {
            rewards.stardust = baseStardust[level - 1] || 0;
        }
        
        // Titles at certain levels
        if (level === 2 || level === 4 || level === 6 || level === 8 || level === 10) {
            rewards.title = this.getTitleForLevel(track, level);
        }
        
        // Cosmetics at level 5, 7, 9, 10
        if (level === 5 || level === 7 || level === 9 || level === 10) {
            rewards.cosmetic = `${track}_cosmetic_${level}`;
        }
        
        return Object.keys(rewards).length > 0 ? rewards : undefined;
    }

    getTitleForLevel(track: ReputationTrack, level: number): string {
        const titles: Record<ReputationTrack, Record<number, string>> = {
            explorer: { 2: 'Wanderer', 4: 'Nomad', 6: 'Trailblazer', 8: 'World Walker', 10: 'Eternal Explorer' },
            connector: { 2: 'Acquaintance', 4: 'Close Friend', 6: 'Community Pillar', 8: 'Constellation Keeper', 10: 'Legendary Networker' },
            guardian: { 2: 'Helper', 4: 'Defender', 6: 'Warden', 8: 'Light Keeper', 10: 'Eternal Guardian' },
            beacon_keeper: { 2: 'Flicker', 4: 'Ember', 6: 'Torch Bearer', 8: 'Lighthouse', 10: 'Eternal Flame' },
            collector: { 2: 'Gatherer', 4: 'Curator', 6: 'Archivist', 8: 'Treasure Hunter', 10: 'Legendary Collector' }
        };
        
        return titles[track][level] || '';
    }

    async getTrackProgress(playerId: string, track: ReputationTrack): Promise<{
        xp: number;
        level: number;
        xpToNextLevel: number;
        progressPercent: number;
    }> {
        const reputation = await this.getReputation(playerId);
        const trackData = reputation.tracks[track];
        
        const currentLevelXP = REPUTATION_LEVELS[trackData.level - 1] || 0;
        const nextLevelXP = REPUTATION_LEVELS[trackData.level] || Infinity;
        const xpInLevel = trackData.xp - currentLevelXP;
        const xpNeeded = nextLevelXP - currentLevelXP;
        
        return {
            xp: trackData.xp,
            level: trackData.level,
            xpToNextLevel: nextLevelXP - trackData.xp,
            progressPercent: Math.min(100, (xpInLevel / xpNeeded) * 100)
        };
    }

    async getReputationLeaderboard(track: ReputationTrack, limit: number = 50): Promise<any[]> {
        const field = `tracks.${track}.xp`;
        const players = await Reputation.find()
            .sort({ [field]: -1 })
            .limit(limit)
            .select(`playerId tracks.${track}`)
            .lean();

        return players.map((p, i) => ({
            rank: i + 1,
            playerId: p.playerId,
            xp: p.tracks[track].xp,
            level: p.tracks[track].level
        }));
    }

    async claimReward(playerId: string, rewardId: string): Promise<boolean> {
        const result = await Reputation.findOneAndUpdate(
            { playerId, unlockedRewards: { $ne: rewardId } },
            { $addToSet: { unlockedRewards: rewardId } },
            { new: true }
        );
        return !!result;
    }
}

// Export singleton
export const reputationService = new ReputationService();
export default reputationService;
