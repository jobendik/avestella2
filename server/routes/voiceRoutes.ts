// =============================================================================
// Voice Routes - Voice channel and room management endpoints
// =============================================================================

import { Router, Request, Response } from 'express';
import { voiceChannelService } from '../services/VoiceChannelService.js';

const router = Router();

// =========================================================================
// Room Discovery Routes
// =========================================================================

/**
 * GET /api/voice/rooms
 * Get all public voice rooms
 */
router.get('/rooms', async (req: Request, res: Response) => {
    try {
        const rooms = voiceChannelService.getPublicRooms();
        // Don't expose the Set, convert to count
        const sanitized = rooms.map(room => ({
            ...room,
            currentParticipants: room.currentParticipants.size,
            participantIds: Array.from(room.currentParticipants)
        }));
        res.json({ success: true, rooms: sanitized });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
    }
});

/**
 * GET /api/voice/rooms/realm/:realm
 * Get voice rooms in a specific realm
 */
router.get('/rooms/realm/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const rooms = voiceChannelService.getRoomsByRealm(realm);
        const sanitized = rooms.map(room => ({
            ...room,
            currentParticipants: room.currentParticipants.size,
            participantIds: Array.from(room.currentParticipants)
        }));
        res.json({ success: true, rooms: sanitized });
    } catch (error) {
        console.error('Error fetching realm rooms:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch realm rooms' });
    }
});

/**
 * GET /api/voice/rooms/:roomId
 * Get specific room details
 */
router.get('/rooms/:roomId', async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const room = voiceChannelService.getRoom(roomId);
        
        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        res.json({ 
            success: true, 
            room: {
                ...room,
                currentParticipants: room.currentParticipants.size,
                participantIds: Array.from(room.currentParticipants)
            }
        });
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch room' });
    }
});

/**
 * GET /api/voice/rooms/:roomId/participants
 * Get participants in a room
 */
router.get('/rooms/:roomId/participants', async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const participants = voiceChannelService.getRoomParticipants(roomId);
        res.json({ success: true, participants });
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch participants' });
    }
});

// =========================================================================
// Room Management Routes
// =========================================================================

/**
 * POST /api/voice/rooms/create
 * Create a new voice room
 */
router.post('/rooms/create', async (req: Request, res: Response) => {
    try {
        const { creatorId, name, realm, type, settings } = req.body;

        if (!creatorId || !name || !realm || !type) {
            return res.status(400).json({ 
                success: false, 
                error: 'Creator ID, name, realm, and type required' 
            });
        }

        const room = voiceChannelService.createRoom(creatorId, name, realm, type, settings);
        res.json({ 
            success: true, 
            room: {
                ...room,
                currentParticipants: 0,
                participantIds: []
            }
        });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ success: false, error: 'Failed to create room' });
    }
});

/**
 * DELETE /api/voice/rooms/:roomId
 * Delete a voice room
 */
router.delete('/rooms/:roomId', async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const { requesterId } = req.body;

        if (!requesterId) {
            return res.status(400).json({ success: false, error: 'Requester ID required' });
        }

        const success = voiceChannelService.deleteRoom(roomId, requesterId);
        
        if (!success) {
            return res.status(403).json({ 
                success: false, 
                error: 'Cannot delete room (not found or not authorized)' 
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ success: false, error: 'Failed to delete room' });
    }
});

// =========================================================================
// Join/Leave Routes
// =========================================================================

/**
 * POST /api/voice/join
 * Join a voice room
 */
router.post('/join', async (req: Request, res: Response) => {
    try {
        const { playerId, roomId, position } = req.body;

        if (!playerId || !roomId) {
            return res.status(400).json({ success: false, error: 'Player ID and room ID required' });
        }

        const result = voiceChannelService.joinRoom(playerId, roomId, position);
        
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            room: result.room ? {
                ...result.room,
                currentParticipants: result.room.currentParticipants.size
            } : null,
            participant: result.participant
        });
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ success: false, error: 'Failed to join room' });
    }
});

/**
 * POST /api/voice/leave
 * Leave current voice room
 */
router.post('/leave', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.body;

        if (!playerId) {
            return res.status(400).json({ success: false, error: 'Player ID required' });
        }

        const success = voiceChannelService.leaveRoom(playerId);
        res.json({ success });
    } catch (error) {
        console.error('Error leaving room:', error);
        res.status(500).json({ success: false, error: 'Failed to leave room' });
    }
});

/**
 * GET /api/voice/player/:playerId/room
 * Get current room for player
 */
router.get('/player/:playerId/room', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const room = voiceChannelService.getPlayerRoom(playerId);
        
        res.json({ 
            success: true, 
            room: room ? {
                ...room,
                currentParticipants: room.currentParticipants.size,
                participantIds: Array.from(room.currentParticipants)
            } : null
        });
    } catch (error) {
        console.error('Error fetching player room:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch player room' });
    }
});

// =========================================================================
// Participant State Routes
// =========================================================================

/**
 * POST /api/voice/mute
 * Set mute state
 */
router.post('/mute', async (req: Request, res: Response) => {
    try {
        const { playerId, muted } = req.body;

        if (!playerId || muted === undefined) {
            return res.status(400).json({ success: false, error: 'Player ID and muted state required' });
        }

        const success = voiceChannelService.setMuted(playerId, muted);
        res.json({ success });
    } catch (error) {
        console.error('Error setting mute:', error);
        res.status(500).json({ success: false, error: 'Failed to set mute state' });
    }
});

/**
 * POST /api/voice/deafen
 * Set deafen state
 */
router.post('/deafen', async (req: Request, res: Response) => {
    try {
        const { playerId, deafened } = req.body;

        if (!playerId || deafened === undefined) {
            return res.status(400).json({ success: false, error: 'Player ID and deafened state required' });
        }

        const success = voiceChannelService.setDeafened(playerId, deafened);
        res.json({ success });
    } catch (error) {
        console.error('Error setting deafen:', error);
        res.status(500).json({ success: false, error: 'Failed to set deafen state' });
    }
});

/**
 * POST /api/voice/speaking
 * Update speaking state (typically called frequently during voice activity)
 */
router.post('/speaking', async (req: Request, res: Response) => {
    try {
        const { playerId, speaking } = req.body;

        if (!playerId || speaking === undefined) {
            return res.status(400).json({ success: false, error: 'Player ID and speaking state required' });
        }

        const success = voiceChannelService.setSpeaking(playerId, speaking);
        res.json({ success });
    } catch (error) {
        console.error('Error setting speaking:', error);
        res.status(500).json({ success: false, error: 'Failed to set speaking state' });
    }
});

/**
 * POST /api/voice/position
 * Update position for spatial audio
 */
router.post('/position', async (req: Request, res: Response) => {
    try {
        const { playerId, position } = req.body;

        if (!playerId || !position) {
            return res.status(400).json({ success: false, error: 'Player ID and position required' });
        }

        const success = voiceChannelService.updatePosition(playerId, position);
        res.json({ success });
    } catch (error) {
        console.error('Error updating position:', error);
        res.status(500).json({ success: false, error: 'Failed to update position' });
    }
});

// =========================================================================
// Proximity Voice Routes
// =========================================================================

/**
 * GET /api/voice/proximity/config/:realm
 * Get proximity voice configuration for a realm
 */
router.get('/proximity/config/:realm', async (req: Request, res: Response) => {
    try {
        const { realm } = req.params;
        const config = voiceChannelService.getProximityConfig(realm);
        res.json({ success: true, config });
    } catch (error) {
        console.error('Error fetching proximity config:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch proximity config' });
    }
});

/**
 * POST /api/voice/proximity/nearby
 * Get nearby players for proximity voice
 */
router.post('/proximity/nearby', async (req: Request, res: Response) => {
    try {
        const { position, realm, playerId } = req.body;

        if (!position || !realm) {
            return res.status(400).json({ success: false, error: 'Position and realm required' });
        }

        const nearby = voiceChannelService.getPlayersInProximity(position, realm, playerId);
        res.json({ success: true, nearby });
    } catch (error) {
        console.error('Error fetching nearby players:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch nearby players' });
    }
});

// =========================================================================
// Whisper Routes
// =========================================================================

/**
 * POST /api/voice/whisper
 * Create a whisper (private 1:1 voice call)
 */
router.post('/whisper', async (req: Request, res: Response) => {
    try {
        const { initiatorId, targetId } = req.body;

        if (!initiatorId || !targetId) {
            return res.status(400).json({ success: false, error: 'Initiator and target IDs required' });
        }

        const result = voiceChannelService.createWhisper(initiatorId, targetId);
        
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            room: result.room ? {
                ...result.room,
                currentParticipants: result.room.currentParticipants.size
            } : null
        });
    } catch (error) {
        console.error('Error creating whisper:', error);
        res.status(500).json({ success: false, error: 'Failed to create whisper' });
    }
});

// =========================================================================
// Statistics Routes
// =========================================================================

/**
 * GET /api/voice/stats
 * Get voice channel statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = voiceChannelService.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

export default router;
