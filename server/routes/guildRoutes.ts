// =============================================================================
// Guild Routes - REST API endpoints for Guild system
// =============================================================================

import { Router, Request, Response } from 'express';
import { guildService } from '../services/GuildService.js';

const router = Router();

// ============================================
// MIDDLEWARE - Extract player info from auth
// ============================================

interface AuthenticatedRequest extends Request {
    playerId?: string;
    playerName?: string;
    playerLevel?: number;
}

// ============================================
// GUILD CRUD
// ============================================

// Create a new guild
router.post('/create', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, tag, description, icon, color, isPublic, minLevelToJoin, requiresApproval } = req.body;
        const playerId = req.playerId || req.body.playerId;
        const playerName = req.playerName || req.body.playerName;
        const playerLevel = req.playerLevel || req.body.playerLevel || 1;

        if (!playerId || !playerName) {
            return res.status(400).json({ error: 'Missing player information' });
        }

        if (!name || !tag) {
            return res.status(400).json({ error: 'Name and tag are required' });
        }

        if (name.length < 3 || name.length > 24) {
            return res.status(400).json({ error: 'Name must be 3-24 characters' });
        }

        if (tag.length < 2 || tag.length > 5) {
            return res.status(400).json({ error: 'Tag must be 2-5 characters' });
        }

        const guild = await guildService.createGuild(
            playerId,
            playerName,
            playerLevel,
            { name, tag, description, icon, color, isPublic, minLevelToJoin, requiresApproval }
        );

        res.status(201).json({ success: true, guild });
    } catch (error: any) {
        console.error('Error creating guild:', error);
        res.status(400).json({ error: error.message || 'Failed to create guild' });
    }
});

// Get guild by ID
router.get('/:guildId', async (req: Request, res: Response) => {
    try {
        const { guildId } = req.params;
        const guild = await guildService.getGuild(guildId);

        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        res.json({ success: true, guild });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get guild' });
    }
});

// Get player's current guild
router.get('/player/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const guild = await guildService.getPlayerGuild(playerId);

        res.json({ success: true, guild });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get player guild' });
    }
});

// Update guild settings
router.patch('/:guildId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId } = req.params;
        const playerId = req.playerId || req.body.playerId;
        const { description, icon, color, isPublic, minLevelToJoin, requiresApproval, maxMembers } = req.body;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        const guild = await guildService.updateGuild(guildId, playerId, {
            description, icon, color, isPublic, minLevelToJoin, requiresApproval, maxMembers
        });

        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        res.json({ success: true, guild });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update guild' });
    }
});

// Delete guild
router.delete('/:guildId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId } = req.params;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        const success = await guildService.deleteGuild(guildId, playerId);

        if (!success) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to delete guild' });
    }
});

// ============================================
// MEMBERSHIP
// ============================================

// Join a guild
router.post('/:guildId/join', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId } = req.params;
        const playerId = req.playerId || req.body.playerId;
        const playerName = req.playerName || req.body.playerName;
        const playerLevel = req.playerLevel || req.body.playerLevel || 1;

        if (!playerId || !playerName) {
            return res.status(400).json({ error: 'Missing player information' });
        }

        const guild = await guildService.joinGuild(guildId, playerId, playerName, playerLevel);

        res.json({ success: true, guild });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to join guild' });
    }
});

// Leave guild
router.post('/:guildId/leave', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId } = req.params;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        const success = await guildService.leaveGuild(guildId, playerId);

        if (!success) {
            return res.status(400).json({ error: 'Failed to leave guild' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to leave guild' });
    }
});

// Kick a member
router.post('/:guildId/kick/:targetId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId, targetId } = req.params;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        const success = await guildService.kickMember(guildId, playerId, targetId);

        if (!success) {
            return res.status(400).json({ error: 'Failed to kick member' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to kick member' });
    }
});

// Update member role
router.patch('/:guildId/member/:targetId/role', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId, targetId } = req.params;
        const { role } = req.body;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        if (role !== 'officer' && role !== 'member') {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const success = await guildService.updateMemberRole(guildId, playerId, targetId, role);

        if (!success) {
            return res.status(400).json({ error: 'Failed to update role' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update role' });
    }
});

// Transfer leadership
router.post('/:guildId/transfer/:newLeaderId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId, newLeaderId } = req.params;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        const success = await guildService.transferLeadership(guildId, playerId, newLeaderId);

        if (!success) {
            return res.status(400).json({ error: 'Failed to transfer leadership' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to transfer leadership' });
    }
});

// ============================================
// APPLICATIONS
// ============================================

// Apply to join a guild
router.post('/:guildId/apply', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId } = req.params;
        const { message } = req.body;
        const playerId = req.playerId || req.body.playerId;
        const playerName = req.playerName || req.body.playerName;
        const playerLevel = req.playerLevel || req.body.playerLevel || 1;

        if (!playerId || !playerName) {
            return res.status(400).json({ error: 'Missing player information' });
        }

        const application = await guildService.applyToGuild(
            guildId, playerId, playerName, playerLevel, message
        );

        res.status(201).json({ success: true, application });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to submit application' });
    }
});

// Get guild applications (for officers/leader)
router.get('/:guildId/applications', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId } = req.params;

        const applications = await guildService.getGuildApplications(guildId);

        res.json({ success: true, applications });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get applications' });
    }
});

// Get player's applications
router.get('/applications/player/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;

        const applications = await guildService.getPlayerApplications(playerId);

        res.json({ success: true, applications });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get applications' });
    }
});

// Review application (approve/reject)
router.post('/applications/:applicationId/review', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { applicationId } = req.params;
        const { approved } = req.body;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        if (typeof approved !== 'boolean') {
            return res.status(400).json({ error: 'approved must be a boolean' });
        }

        const success = await guildService.reviewApplication(applicationId, playerId, approved);

        if (!success) {
            return res.status(400).json({ error: 'Failed to review application' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to review application' });
    }
});

// ============================================
// CONTRIBUTIONS
// ============================================

// Make a contribution
router.post('/:guildId/contribute', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId } = req.params;
        const { stardust, challenges, xp } = req.body;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        const result = await guildService.contribute(guildId, playerId, { stardust, challenges, xp });

        res.json({ 
            success: true, 
            guild: result.guild,
            leveledUp: result.leveledUp,
            newPerks: result.newPerks
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to contribute' });
    }
});

// Get player's guild bonuses
router.get('/bonuses/player/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;

        const bonuses = await guildService.getPlayerGuildBonuses(playerId);

        res.json({ success: true, bonuses });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get bonuses' });
    }
});

// ============================================
// CHAT
// ============================================

// Send chat message
router.post('/:guildId/chat', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId } = req.params;
        const { message } = req.body;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        const guild = await guildService.sendChatMessage(guildId, playerId, message);

        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to send message' });
    }
});

// Get chat history
router.get('/:guildId/chat', async (req: Request, res: Response) => {
    try {
        const { guildId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const chat = await guildService.getChatHistory(guildId, limit);

        res.json({ success: true, chat });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get chat' });
    }
});

// ============================================
// GIFTS
// ============================================

// Send guild gift
router.post('/:guildId/gifts/send', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { guildId } = req.params;
        const { recipientId, type, amount, cosmeticId, message } = req.body;

        if (!recipientId || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const gift = await guildService.sendGuildGift(
            guildId, recipientId, type, amount || 1, cosmeticId, message
        );

        res.status(201).json({ success: true, gift });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to send gift' });
    }
});

// Get pending gifts
router.get('/gifts/pending/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;

        const gifts = await guildService.getPendingGifts(playerId);

        res.json({ success: true, gifts });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get gifts' });
    }
});

// Claim gift
router.post('/gifts/:giftId/claim', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { giftId } = req.params;
        const playerId = req.playerId || req.body.playerId;

        if (!playerId) {
            return res.status(400).json({ error: 'Missing player ID' });
        }

        const gift = await guildService.claimGuildGift(giftId, playerId);

        if (!gift) {
            return res.status(404).json({ error: 'Gift not found or already claimed' });
        }

        res.json({ success: true, gift });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to claim gift' });
    }
});

// ============================================
// SEARCH & LEADERBOARD
// ============================================

// Search guilds
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { 
            query, 
            minLevel, 
            maxLevel, 
            isPublic, 
            hasSpace, 
            sortBy, 
            limit, 
            offset 
        } = req.query;

        const guilds = await guildService.searchGuilds({
            query: query as string,
            minLevel: minLevel ? parseInt(minLevel as string) : undefined,
            maxLevel: maxLevel ? parseInt(maxLevel as string) : undefined,
            isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
            hasSpace: hasSpace === 'true',
            sortBy: sortBy as 'level' | 'members' | 'contributions' | 'name',
            limit: limit ? parseInt(limit as string) : undefined,
            offset: offset ? parseInt(offset as string) : undefined
        });

        res.json({ success: true, guilds });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to search guilds' });
    }
});

// Get guild leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;

        const guilds = await guildService.getGuildLeaderboard(limit);

        res.json({ success: true, guilds });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get leaderboard' });
    }
});

// Get weekly leaderboard
router.get('/leaderboard/weekly', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;

        const guilds = await guildService.getWeeklyLeaderboard(limit);

        res.json({ success: true, guilds });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get weekly leaderboard' });
    }
});

export default router;
