// =============================================================================
// Signals Routes - Player signal/beacon endpoints
// =============================================================================

import { Router, Request, Response } from 'express';
import { signalsService } from '../services/SignalsService.js';

const router = Router();

// =========================================================================
// Signal Types & Config
// =========================================================================

/**
 * GET /api/signals/types
 * Get all signal type configurations
 */
router.get('/types', async (req: Request, res: Response) => {
    try {
        const types = signalsService.getAllSignalConfigs();
        res.json({ success: true, types });
    } catch (error) {
        console.error('Error fetching signal types:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch signal types' });
    }
});

/**
 * GET /api/signals/types/available/:level
 * Get signal types available at a given player level
 */
router.get('/types/available/:level', async (req: Request, res: Response) => {
    try {
        const level = parseInt(req.params.level) || 1;
        const types = signalsService.getAvailableSignals(level);
        res.json({ success: true, types });
    } catch (error) {
        console.error('Error fetching available signals:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch available signals' });
    }
});

// =========================================================================
// Sending Signals
// =========================================================================

/**
 * POST /api/signals/send
 * Send a signal
 */
router.post('/send', async (req: Request, res: Response) => {
    try {
        const { 
            senderId, 
            senderName, 
            type, 
            position, 
            realm,
            targetId,
            message,
            intensity,
            color,
            playerLevel
        } = req.body;

        if (!senderId || !senderName || !type || !position || !realm) {
            return res.status(400).json({ 
                success: false, 
                error: 'Sender ID, name, type, position, and realm required' 
            });
        }

        const result = signalsService.sendSignal(
            senderId,
            senderName,
            type,
            position,
            realm,
            { targetId, message, intensity, color, playerLevel }
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Error sending signal:', error);
        res.status(500).json({ success: false, error: 'Failed to send signal' });
    }
});

/**
 * POST /api/signals/respond
 * Respond to an existing signal
 */
router.post('/respond', async (req: Request, res: Response) => {
    try {
        const { 
            responderId, 
            responderName, 
            signalId, 
            responseType,
            position,
            realm
        } = req.body;

        if (!responderId || !responderName || !signalId || !responseType || !position || !realm) {
            return res.status(400).json({ 
                success: false, 
                error: 'Responder ID, name, signal ID, response type, position, and realm required' 
            });
        }

        const result = signalsService.respondToSignal(
            responderId,
            responderName,
            signalId,
            responseType,
            position,
            realm
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Error responding to signal:', error);
        res.status(500).json({ success: false, error: 'Failed to respond to signal' });
    }
});

// =========================================================================
// Retrieving Signals
// =========================================================================

/**
 * GET /api/signals/realm/:realm
 * Get active signals in a realm
 */
router.get('/realm/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const signals = signalsService.getActiveSignals(realm);
        
        // Sanitize signals for response (convert Set to array)
        const sanitized = signals.map(s => ({
            ...s,
            seenBy: Array.from(s.seenBy)
        }));
        
        res.json({ success: true, signals: sanitized });
    } catch (error) {
        console.error('Error fetching realm signals:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch signals' });
    }
});

/**
 * POST /api/signals/nearby
 * Get signals near a position
 */
router.post('/nearby', async (req: Request, res: Response) => {
    try {
        const { position, realm, playerId, maxRange } = req.body;

        if (!position || !realm) {
            return res.status(400).json({ success: false, error: 'Position and realm required' });
        }

        let signals;
        if (playerId) {
            signals = signalsService.getSignalsForPlayer(playerId, position, realm);
        } else {
            signals = signalsService.getSignalsInRange(position, realm, maxRange);
        }

        // Sanitize
        const sanitized = signals.map((s: any) => ({
            ...s,
            signal: {
                ...s.signal,
                seenBy: Array.from(s.signal.seenBy)
            }
        }));

        res.json({ success: true, signals: sanitized });
    } catch (error) {
        console.error('Error fetching nearby signals:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch nearby signals' });
    }
});

/**
 * GET /api/signals/directed/:targetId
 * Get signals directed at a specific player
 */
router.get('/directed/:targetId', async (req: Request, res: Response) => {
    try {
        const { targetId } = req.params;
        const signals = signalsService.getDirectedSignals(targetId);
        
        const sanitized = signals.map(s => ({
            ...s,
            seenBy: Array.from(s.seenBy)
        }));
        
        res.json({ success: true, signals: sanitized });
    } catch (error) {
        console.error('Error fetching directed signals:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch directed signals' });
    }
});

// =========================================================================
// Signal Interaction
// =========================================================================

/**
 * POST /api/signals/acknowledge
 * Acknowledge seeing a signal
 */
router.post('/acknowledge', async (req: Request, res: Response) => {
    try {
        const { playerId, signalId } = req.body;

        if (!playerId || !signalId) {
            return res.status(400).json({ success: false, error: 'Player ID and signal ID required' });
        }

        const success = signalsService.acknowledgeSignal(playerId, signalId);
        res.json({ success });
    } catch (error) {
        console.error('Error acknowledging signal:', error);
        res.status(500).json({ success: false, error: 'Failed to acknowledge signal' });
    }
});

// =========================================================================
// Cooldowns
// =========================================================================

/**
 * GET /api/signals/cooldowns/:playerId
 * Get cooldown status for a player
 */
router.get('/cooldowns/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const cooldowns = signalsService.getCooldowns(playerId);
        res.json({ success: true, cooldowns });
    } catch (error) {
        console.error('Error fetching cooldowns:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cooldowns' });
    }
});

// =========================================================================
// Statistics
// =========================================================================

/**
 * GET /api/signals/stats
 * Get signal statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = signalsService.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching signal stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch signal stats' });
    }
});

export default router;
