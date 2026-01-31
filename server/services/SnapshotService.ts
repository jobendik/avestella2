// =============================================================================
// Snapshot Service - Handles snapshot metadata logging
// =============================================================================

import { EventEmitter } from 'events';

export interface SnapshotMetadata {
    id: string;
    playerId: string;
    timestamp: number;
    location: { x: number; y: number; realm: string };
    visiblePlayers: string[]; // IDs of other players in the shot
    visibleEntities: string[]; // IDs of special entities (e.g. beacons, companions)
    caption?: string;
    tags?: string[];
}

class SnapshotService extends EventEmitter {
    private snapshots: Map<string, SnapshotMetadata> = new Map();

    async initialize(): Promise<void> {
        console.log('📸 Snapshot Service initializing...');
        // Potential: Load recent snapshots from DB if needed
        console.log('📸 Snapshot Service initialized');
    }

    /**
     * Log a new snapshot taken by a player
     */
    logSnapshot(
        playerId: string,
        data: {
            x: number;
            y: number;
            realm: string;
            visiblePlayers?: string[];
            visibleEntities?: string[];
            caption?: string;
        }
    ): { success: boolean; snapshot?: SnapshotMetadata; error?: string } {
        try {
            const snapshotId = `snap_${playerId}_${Date.now()}`;

            const snapshot: SnapshotMetadata = {
                id: snapshotId,
                playerId,
                timestamp: Date.now(),
                location: {
                    x: data.x,
                    y: data.y,
                    realm: data.realm
                },
                visiblePlayers: data.visiblePlayers || [],
                visibleEntities: data.visibleEntities || [],
                caption: data.caption,
                tags: [] // Could generate tags based on biome later
            };

            this.snapshots.set(snapshotId, snapshot);

            // Emit event for other services (e.g. Quests "Take a photo of 3 friends", Analytics)
            this.emit('snapshot_logged', { snapshot });

            console.log(`📸 Snapshot logged for ${playerId} in ${data.realm}`);

            return { success: true, snapshot };
        } catch (error) {
            console.error('Failed to log snapshot:', error);
            return { success: false, error: 'Internal server error' };
        }
    }

    /**
     * Retrieve a specific snapshot metadata
     */
    getSnapshot(snapshotId: string): SnapshotMetadata | undefined {
        return this.snapshots.get(snapshotId);
    }

    /**
     * Get recent snapshots for a player
     */
    getPlayerSnapshots(playerId: string): SnapshotMetadata[] {
        return Array.from(this.snapshots.values())
            .filter(s => s.playerId === playerId)
            .sort((a, b) => b.timestamp - a.timestamp);
    }
}

export const snapshotService = new SnapshotService();
export { SnapshotService };
