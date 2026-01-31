// =============================================================================
// Realm Statistics Service - Realm population and activity tracking
// =============================================================================
// Tracks realm populations, activity metrics, and server statistics

import { EventEmitter } from 'events';

export type RealmId = 'genesis' | 'nebula' | 'void' | 'starforge' | 'sanctuary';

export interface RealmStats {
    realm: RealmId;
    population: number;
    peakPopulation: number;
    peakTime: number;
    activeInteractions: number; // Recent bonds, whispers, etc.
    litBeacons: number;
    activeEvents: number;
    avgSessionDuration: number; // seconds
    recentJoins: number; // Last 5 minutes
    recentLeaves: number; // Last 5 minutes
}

export interface PlayerActivity {
    playerId: string;
    realm: RealmId;
    joinedAt: number;
    lastActivity: number;
    interactions: number;
    distanceTraveled: number;
    lastPosition: { x: number; y: number };
}

export interface ServerStats {
    totalOnline: number;
    totalRegistered: number;
    realmStats: Record<RealmId, RealmStats>;
    uptime: number;
    messagesPerMinute: number;
    eventsPerMinute: number;
    peakOnlineToday: number;
    peakOnlineAllTime: number;
}

export interface RealmInfo {
    id: RealmId;
    name: string;
    description: string;
    theme: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
    minLevel: number;
    features: string[];
}

const REALM_INFO: Record<RealmId, RealmInfo> = {
    genesis: {
        id: 'genesis',
        name: 'Genesis',
        description: 'The starting realm, peaceful and welcoming',
        theme: 'meadow',
        difficulty: 'easy',
        minLevel: 1,
        features: ['tutorials', 'safe_zones', 'beginner_quests']
    },
    nebula: {
        id: 'nebula',
        name: 'Nebula',
        description: 'Cosmic clouds filled with mystery',
        theme: 'cosmic',
        difficulty: 'medium',
        minLevel: 5,
        features: ['cosmic_events', 'nebula_storms', 'star_clusters']
    },
    void: {
        id: 'void',
        name: 'Void',
        description: 'The darkness between stars, dangerous but rewarding',
        theme: 'dark',
        difficulty: 'hard',
        minLevel: 15,
        features: ['darkness_cycles', 'void_entities', 'rare_resources']
    },
    starforge: {
        id: 'starforge',
        name: 'Starforge',
        description: 'Where new stars are born, intense energy flows',
        theme: 'fire',
        difficulty: 'extreme',
        minLevel: 30,
        features: ['star_creation', 'forging', 'legendary_items']
    },
    sanctuary: {
        id: 'sanctuary',
        name: 'Sanctuary',
        description: 'A peaceful haven for meditation and recovery',
        theme: 'tranquil',
        difficulty: 'easy',
        minLevel: 10,
        features: ['meditation', 'healing', 'social_hub']
    }
};

const ALL_REALMS: RealmId[] = ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'];

class RealmStatsService extends EventEmitter {
    private playerActivity: Map<string, PlayerActivity> = new Map();
    private realmStats: Map<RealmId, RealmStats> = new Map();
    private serverStartTime: number = Date.now();
    private messageCount: number = 0;
    private eventCount: number = 0;
    private peakOnlineToday: number = 0;
    private peakOnlineAllTime: number = 0;
    private lastMinuteMessages: number = 0;
    private lastMinuteEvents: number = 0;
    private updateInterval: NodeJS.Timeout | null = null;

    async initialize(): Promise<void> {
        console.log('📊 Realm Stats Service initializing...');
        
        // Initialize realm stats
        for (const realm of ALL_REALMS) {
            this.realmStats.set(realm, this.createEmptyRealmStats(realm));
        }

        // Update stats every 10 seconds
        this.updateInterval = setInterval(() => {
            this.updateStats();
        }, 10000);

        // Reset per-minute counters every minute
        setInterval(() => {
            this.lastMinuteMessages = this.messageCount;
            this.lastMinuteEvents = this.eventCount;
            this.messageCount = 0;
            this.eventCount = 0;
        }, 60000);

        console.log('📊 Realm Stats Service initialized');
    }

    private createEmptyRealmStats(realm: RealmId): RealmStats {
        return {
            realm,
            population: 0,
            peakPopulation: 0,
            peakTime: 0,
            activeInteractions: 0,
            litBeacons: 0,
            activeEvents: 0,
            avgSessionDuration: 0,
            recentJoins: 0,
            recentLeaves: 0
        };
    }

    // =========================================================================
    // Player Tracking
    // =========================================================================

    playerJoined(playerId: string, realm: RealmId, position: { x: number; y: number }): void {
        const activity: PlayerActivity = {
            playerId,
            realm,
            joinedAt: Date.now(),
            lastActivity: Date.now(),
            interactions: 0,
            distanceTraveled: 0,
            lastPosition: position
        };

        this.playerActivity.set(playerId, activity);
        
        const stats = this.realmStats.get(realm);
        if (stats) {
            stats.population++;
            stats.recentJoins++;
            if (stats.population > stats.peakPopulation) {
                stats.peakPopulation = stats.population;
                stats.peakTime = Date.now();
            }
        }

        this.updatePeakOnline();
        this.emit('player_joined', { playerId, realm });
    }

    playerLeft(playerId: string): void {
        const activity = this.playerActivity.get(playerId);
        if (!activity) return;

        const stats = this.realmStats.get(activity.realm);
        if (stats) {
            stats.population = Math.max(0, stats.population - 1);
            stats.recentLeaves++;
        }

        this.playerActivity.delete(playerId);
        this.emit('player_left', { playerId, realm: activity.realm });
    }

    playerChangedRealm(playerId: string, newRealm: RealmId, position: { x: number; y: number }): void {
        const activity = this.playerActivity.get(playerId);
        if (!activity) {
            this.playerJoined(playerId, newRealm, position);
            return;
        }

        // Leave old realm
        const oldStats = this.realmStats.get(activity.realm);
        if (oldStats) {
            oldStats.population = Math.max(0, oldStats.population - 1);
        }

        // Join new realm
        const newStats = this.realmStats.get(newRealm);
        if (newStats) {
            newStats.population++;
            if (newStats.population > newStats.peakPopulation) {
                newStats.peakPopulation = newStats.population;
                newStats.peakTime = Date.now();
            }
        }

        activity.realm = newRealm;
        activity.lastPosition = position;
        activity.lastActivity = Date.now();

        this.emit('player_changed_realm', { playerId, from: activity.realm, to: newRealm });
    }

    updatePlayerPosition(playerId: string, position: { x: number; y: number }): void {
        const activity = this.playerActivity.get(playerId);
        if (!activity) return;

        const dx = position.x - activity.lastPosition.x;
        const dy = position.y - activity.lastPosition.y;
        activity.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
        activity.lastPosition = position;
        activity.lastActivity = Date.now();
    }

    recordInteraction(playerId: string): void {
        const activity = this.playerActivity.get(playerId);
        if (!activity) return;

        activity.interactions++;
        activity.lastActivity = Date.now();

        const stats = this.realmStats.get(activity.realm);
        if (stats) {
            stats.activeInteractions++;
        }
    }

    recordMessage(): void {
        this.messageCount++;
    }

    recordEvent(): void {
        this.eventCount++;
    }

    // =========================================================================
    // Stats Retrieval
    // =========================================================================

    getRealmStats(realm: RealmId): RealmStats | null {
        return this.realmStats.get(realm) || null;
    }

    getAllRealmStats(): RealmStats[] {
        return Array.from(this.realmStats.values());
    }

    getRealmInfo(realm: RealmId): RealmInfo | null {
        return REALM_INFO[realm] || null;
    }

    getAllRealmInfo(): RealmInfo[] {
        return Object.values(REALM_INFO);
    }

    getRealmPopulation(realm: RealmId): number {
        const stats = this.realmStats.get(realm);
        return stats?.population || 0;
    }

    getTotalOnline(): number {
        let total = 0;
        for (const stats of this.realmStats.values()) {
            total += stats.population;
        }
        return total;
    }

    getServerStats(): ServerStats {
        const realmStatsRecord: Record<RealmId, RealmStats> = {} as Record<RealmId, RealmStats>;
        for (const [realm, stats] of this.realmStats) {
            realmStatsRecord[realm] = stats;
        }

        return {
            totalOnline: this.getTotalOnline(),
            totalRegistered: 0, // Would come from database
            realmStats: realmStatsRecord,
            uptime: Date.now() - this.serverStartTime,
            messagesPerMinute: this.lastMinuteMessages,
            eventsPerMinute: this.lastMinuteEvents,
            peakOnlineToday: this.peakOnlineToday,
            peakOnlineAllTime: this.peakOnlineAllTime
        };
    }

    getPlayerActivity(playerId: string): PlayerActivity | null {
        return this.playerActivity.get(playerId) || null;
    }

    getPlayersInRealm(realm: RealmId): string[] {
        const players: string[] = [];
        for (const [playerId, activity] of this.playerActivity) {
            if (activity.realm === realm) {
                players.push(playerId);
            }
        }
        return players;
    }

    // =========================================================================
    // Realm Recommendations
    // =========================================================================

    getRecommendedRealm(playerLevel: number, preferences?: {
        preferQuiet?: boolean;
        preferActive?: boolean;
        preferChallenging?: boolean;
    }): RealmId {
        const availableRealms = ALL_REALMS.filter(r => 
            REALM_INFO[r].minLevel <= playerLevel
        );

        if (availableRealms.length === 0) return 'genesis';

        if (preferences?.preferQuiet) {
            // Find least populated realm
            let quietest = availableRealms[0];
            let lowestPop = this.getRealmPopulation(quietest);
            for (const realm of availableRealms) {
                const pop = this.getRealmPopulation(realm);
                if (pop < lowestPop) {
                    lowestPop = pop;
                    quietest = realm;
                }
            }
            return quietest;
        }

        if (preferences?.preferActive) {
            // Find most populated realm
            let busiest = availableRealms[0];
            let highestPop = this.getRealmPopulation(busiest);
            for (const realm of availableRealms) {
                const pop = this.getRealmPopulation(realm);
                if (pop > highestPop) {
                    highestPop = pop;
                    busiest = realm;
                }
            }
            return busiest;
        }

        if (preferences?.preferChallenging) {
            // Find hardest available realm
            const challengingOrder: RealmId[] = ['starforge', 'void', 'nebula', 'genesis', 'sanctuary'];
            for (const realm of challengingOrder) {
                if (availableRealms.includes(realm)) {
                    return realm;
                }
            }
        }

        // Default: balanced recommendation based on level
        if (playerLevel >= 30) return 'starforge';
        if (playerLevel >= 15) return 'void';
        if (playerLevel >= 10) return 'nebula';
        if (playerLevel >= 5) return 'nebula';
        return 'genesis';
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    private updatePeakOnline(): void {
        const total = this.getTotalOnline();
        if (total > this.peakOnlineToday) {
            this.peakOnlineToday = total;
        }
        if (total > this.peakOnlineAllTime) {
            this.peakOnlineAllTime = total;
        }
    }

    private updateStats(): void {
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        for (const stats of this.realmStats.values()) {
            // Reset per-interval counters
            stats.recentJoins = 0;
            stats.recentLeaves = 0;
            stats.activeInteractions = 0;

            // Calculate average session duration
            let totalDuration = 0;
            let count = 0;
            for (const activity of this.playerActivity.values()) {
                if (activity.realm === stats.realm) {
                    totalDuration += now - activity.joinedAt;
                    count++;
                }
            }
            stats.avgSessionDuration = count > 0 ? totalDuration / count / 1000 : 0;
        }

        // Clean up inactive players (no activity in 5 minutes)
        const inactive: string[] = [];
        for (const [playerId, activity] of this.playerActivity) {
            if (activity.lastActivity < fiveMinutesAgo) {
                inactive.push(playerId);
            }
        }
        for (const playerId of inactive) {
            this.playerLeft(playerId);
        }

        this.emit('stats_updated', { stats: this.getServerStats() });
    }

    shutdown(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.playerActivity.clear();
    }
}

export const realmStatsService = new RealmStatsService();
export { RealmStatsService };
