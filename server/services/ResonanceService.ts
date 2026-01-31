
import { EventEmitter } from 'events';
import { bondService } from './BondService.js';
import { progressionService } from './ProgressionService.js';

class ResonanceService extends EventEmitter {
    private static instance: ResonanceService;

    private constructor() {
        super();
    }

    public static getInstance(): ResonanceService {
        if (!ResonanceService.instance) {
            ResonanceService.instance = new ResonanceService();
        }
        return ResonanceService.instance;
    }

    /**
     * Record a resonance interaction between two players
     */
    async recordResonance(sourceId: string, targetId: string, strength: number = 1.0): Promise<void> {
        try {
            // 1. Strengthen bond
            await bondService.updateBondStrength(sourceId, targetId, 'resonance');

            // 2. Emit event for analytics/other systems
            this.emit('resonance', { sourceId, targetId, strength, timestamp: Date.now() });

        } catch (error) {
            console.error('Error recording resonance:', error);
            // Don't throw, just log
        }
    }
}

export const resonanceService = ResonanceService.getInstance();
