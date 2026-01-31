// =============================================================================
// Snapshot Handlers - Handle snapshot capture events
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { snapshotService } from '../../services/SnapshotService.js';

export class SnapshotHandlers {
    /**
     * Handle snapshot taken event
     */
    static async handleSnapshotTaken(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { x, y, realm, visiblePlayers, visibleEntities, caption } = data;

            // Basic validation
            if (typeof x !== 'number' || typeof y !== 'number') {
                ctx.sendError(connection, 'Invalid location data');
                return;
            }

            const result = snapshotService.logSnapshot(connection.playerId, {
                x,
                y,
                realm: realm || connection.realm, // Default to connection realm if missing
                visiblePlayers,
                visibleEntities,
                caption
            });

            if (result.success && result.snapshot) {
                // Confirm save to client
                ctx.send(connection.ws, {
                    type: 'snapshot_saved',
                    data: {
                        snapshotId: result.snapshot.id,
                        timestamp: result.snapshot.timestamp
                    },
                    timestamp: Date.now()
                });

                // Optional: Notify mentioned players or broadcast "Flash" effect to realm?
                // For now, let's keep it private unless we want a "paparazzi" flash effect in the world
            } else {
                ctx.sendError(connection, result.error || 'Failed to save snapshot');
            }

        } catch (error) {
            console.error('Failed to handle snapshot taken:', error);
            ctx.sendError(connection, 'Internal server error');
        }
    }
}
