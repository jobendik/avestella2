// API Routes for Social Systems: Reputation, Referral, Mentorship, Economy, Friendship
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { reputationService } from '../services/ReputationService.js';
import { referralService } from '../services/ReferralService.js';
import { mentorshipService } from '../services/MentorshipService.js';
import { economyService } from '../services/EconomyService.js';
import { friendshipService } from '../services/FriendshipService.js';

const router = Router();

// Rate limiting for social endpoints
const socialLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many requests' }
});

router.use(socialLimiter);

// Validation schemas
const PlayerIdSchema = z.string().min(5).max(50).regex(/^[a-zA-Z0-9\-_]+$/);
const PlayerNameSchema = z.string().min(1).max(20);

function formatZodError(error: z.ZodError): string {
    return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
}

// ============================================
// REPUTATION ROUTES
// ============================================

// Get player's reputation across all tracks
router.get('/reputation/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const validation = PlayerIdSchema.safeParse(playerId);
        if (!validation.success) {
            return res.status(400).json({ error: 'Invalid player ID' });
        }

        const reputation = await reputationService.getReputation(playerId);
        res.json(reputation);
    } catch (error) {
        console.error('Error fetching reputation:', error);
        res.status(500).json({ error: 'Failed to fetch reputation' });
    }
});

// Get specific track progress
router.get('/reputation/:playerId/:track', async (req: Request, res: Response) => {
    try {
        const { playerId, track } = req.params;
        const validTracks = ['explorer', 'connector', 'guardian', 'beacon_keeper', 'collector'];
        
        if (!validTracks.includes(track)) {
            return res.status(400).json({ error: 'Invalid reputation track' });
        }

        const progress = await reputationService.getTrackProgress(playerId, track as any);
        res.json(progress);
    } catch (error) {
        console.error('Error fetching track progress:', error);
        res.status(500).json({ error: 'Failed to fetch track progress' });
    }
});

// Add reputation XP
router.post('/reputation/:playerId/action', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { action, multiplier } = req.body;

        if (!action || typeof action !== 'string') {
            return res.status(400).json({ error: 'Action required' });
        }

        const result = await reputationService.addReputationXP(playerId, action, multiplier || 1);
        if (!result) {
            return res.status(400).json({ error: 'Unknown action' });
        }

        res.json(result);
    } catch (error) {
        console.error('Error adding reputation XP:', error);
        res.status(500).json({ error: 'Failed to add reputation XP' });
    }
});

// Bulk add reputation XP
router.post('/reputation/:playerId/actions', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { actions } = req.body;

        if (!Array.isArray(actions)) {
            return res.status(400).json({ error: 'Actions array required' });
        }

        await reputationService.addBulkReputationXP(playerId, actions);
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding bulk reputation XP:', error);
        res.status(500).json({ error: 'Failed to add reputation XP' });
    }
});

// Get reputation leaderboard for a track
router.get('/reputation/leaderboard/:track', async (req: Request, res: Response) => {
    try {
        const { track } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const validTracks = ['explorer', 'connector', 'guardian', 'beacon_keeper', 'collector'];
        
        if (!validTracks.includes(track)) {
            return res.status(400).json({ error: 'Invalid reputation track' });
        }

        const leaderboard = await reputationService.getReputationLeaderboard(track as any, limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching reputation leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// ============================================
// REFERRAL ROUTES
// ============================================

// Get or create referral code
router.get('/referral/code/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const playerName = req.query.name as string || 'Player';
        
        const code = await referralService.getOrCreateReferralCode(playerId, playerName);
        res.json(code);
    } catch (error) {
        console.error('Error getting referral code:', error);
        res.status(500).json({ error: 'Failed to get referral code' });
    }
});

// Look up a referral code
router.get('/referral/lookup/:code', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const referralCode = await referralService.lookupCode(code);
        
        if (!referralCode) {
            return res.status(404).json({ error: 'Code not found or inactive' });
        }

        res.json({
            valid: true,
            ownerName: referralCode.ownerName,
            usageCount: referralCode.usageCount
        });
    } catch (error) {
        console.error('Error looking up referral code:', error);
        res.status(500).json({ error: 'Failed to lookup code' });
    }
});

// Use a referral code
router.post('/referral/use', async (req: Request, res: Response) => {
    try {
        const { refereeId, refereeName, code } = req.body;

        if (!refereeId || !code) {
            return res.status(400).json({ error: 'Referee ID and code required' });
        }

        const result = await referralService.useReferralCode(refereeId, refereeName || 'Player', code);
        res.json(result);
    } catch (error) {
        console.error('Error using referral code:', error);
        res.status(500).json({ error: 'Failed to use referral code' });
    }
});

// Get referral stats
router.get('/referral/stats/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const stats = await referralService.getReferralStats(playerId);
        res.json(stats);
    } catch (error) {
        console.error('Error getting referral stats:', error);
        res.status(500).json({ error: 'Failed to get referral stats' });
    }
});

// Check and claim milestone rewards
router.post('/referral/:playerId/claim-milestones', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const result = await referralService.checkAndAwardMilestones(playerId);
        res.json(result);
    } catch (error) {
        console.error('Error claiming milestones:', error);
        res.status(500).json({ error: 'Failed to claim milestones' });
    }
});

// Get referral leaderboard
router.get('/referral/leaderboard', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const leaderboard = await referralService.getReferralLeaderboard(limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error getting referral leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// ============================================
// MENTORSHIP ROUTES
// ============================================

// Get mentor profile
router.get('/mentorship/profile/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const playerName = req.query.name as string || 'Player';
        const profile = await mentorshipService.getOrCreateProfile(playerId, playerName);
        res.json(profile);
    } catch (error) {
        console.error('Error getting mentor profile:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Qualify as mentor
router.post('/mentorship/qualify', async (req: Request, res: Response) => {
    try {
        const { playerId, playerLevel, sealedBonds } = req.body;

        if (!playerId || typeof playerLevel !== 'number' || typeof sealedBonds !== 'number') {
            return res.status(400).json({ error: 'Player ID, level, and sealed bonds required' });
        }

        const result = await mentorshipService.qualifyAsMentor(playerId, playerLevel, sealedBonds);
        res.json(result);
    } catch (error) {
        console.error('Error qualifying as mentor:', error);
        res.status(500).json({ error: 'Failed to qualify' });
    }
});

// Find available mentors
router.get('/mentorship/find-mentors', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const mentors = await mentorshipService.findAvailableMentors(limit);
        res.json(mentors);
    } catch (error) {
        console.error('Error finding mentors:', error);
        res.status(500).json({ error: 'Failed to find mentors' });
    }
});

// Assign a mentor to a mentee
router.post('/mentorship/assign', async (req: Request, res: Response) => {
    try {
        const { menteeId, mentorId } = req.body;

        if (!menteeId || !mentorId) {
            return res.status(400).json({ error: 'Mentee ID and Mentor ID required' });
        }

        const result = await mentorshipService.assignMentor(menteeId, mentorId);
        res.json(result);
    } catch (error) {
        console.error('Error assigning mentor:', error);
        res.status(500).json({ error: 'Failed to assign mentor' });
    }
});

// Remove mentor
router.post('/mentorship/remove-mentor', async (req: Request, res: Response) => {
    try {
        const { menteeId } = req.body;
        const success = await mentorshipService.removeMentor(menteeId);
        res.json({ success });
    } catch (error) {
        console.error('Error removing mentor:', error);
        res.status(500).json({ error: 'Failed to remove mentor' });
    }
});

// Graduate mentee
router.post('/mentorship/graduate', async (req: Request, res: Response) => {
    try {
        const { menteeId } = req.body;
        const result = await mentorshipService.graduateMentee(menteeId);
        res.json(result);
    } catch (error) {
        console.error('Error graduating mentee:', error);
        res.status(500).json({ error: 'Failed to graduate' });
    }
});

// Start mentorship session
router.post('/mentorship/session/start', async (req: Request, res: Response) => {
    try {
        const { mentorId, menteeId } = req.body;

        if (!mentorId || !menteeId) {
            return res.status(400).json({ error: 'Mentor ID and Mentee ID required' });
        }

        const session = await mentorshipService.startSession(mentorId, menteeId);
        if (!session) {
            return res.status(400).json({ error: 'Cannot start session - invalid relationship' });
        }

        res.json(session);
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// End mentorship session
router.post('/mentorship/session/end', async (req: Request, res: Response) => {
    try {
        const { sessionId, rating, feedback } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        const result = await mentorshipService.endSession(sessionId, rating, feedback);
        res.json(result);
    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// Add activity to session
router.post('/mentorship/session/activity', async (req: Request, res: Response) => {
    try {
        const { sessionId, activity } = req.body;
        const success = await mentorshipService.addSessionActivity(sessionId, activity);
        res.json({ success });
    } catch (error) {
        console.error('Error adding activity:', error);
        res.status(500).json({ error: 'Failed to add activity' });
    }
});

// Get session history
router.get('/mentorship/sessions/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const limit = parseInt(req.query.limit as string) || 20;
        const sessions = await mentorshipService.getSessionHistory(playerId, limit);
        res.json(sessions);
    } catch (error) {
        console.error('Error getting sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

// Get mentor leaderboard
router.get('/mentorship/leaderboard', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const leaderboard = await mentorshipService.getMentorLeaderboard(limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error getting mentor leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// ============================================
// ECONOMY ROUTES
// ============================================

// Get crystals balance
router.get('/economy/crystals/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const crystals = await economyService.getCrystals(playerId);
        res.json({ crystals });
    } catch (error) {
        console.error('Error getting crystals:', error);
        res.status(500).json({ error: 'Failed to get crystals' });
    }
});

// Add crystals (for purchases/rewards)
router.post('/economy/crystals/:playerId/add', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const { amount, source } = req.body;

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount required' });
        }

        const newBalance = await economyService.addCrystals(playerId, amount, source || 'api');
        res.json({ success: true, crystals: newBalance });
    } catch (error) {
        console.error('Error adding crystals:', error);
        res.status(500).json({ error: 'Failed to add crystals' });
    }
});

// Open mystery box
router.post('/economy/mystery-box/open', async (req: Request, res: Response) => {
    try {
        const { playerId, boxTier } = req.body;

        if (!playerId || !boxTier) {
            return res.status(400).json({ error: 'Player ID and box tier required' });
        }

        const result = await economyService.openMysteryBox(playerId, boxTier);
        res.json(result);
    } catch (error) {
        console.error('Error opening mystery box:', error);
        res.status(500).json({ error: 'Failed to open mystery box' });
    }
});

// Get active boosts
router.get('/economy/boosts/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const boosts = await economyService.getActiveBoosts(playerId);
        res.json(boosts);
    } catch (error) {
        console.error('Error getting boosts:', error);
        res.status(500).json({ error: 'Failed to get boosts' });
    }
});

// Get boost multiplier
router.get('/economy/boosts/:playerId/:type', async (req: Request, res: Response) => {
    try {
        const { playerId, type } = req.params;
        const validTypes = ['xp', 'stardust', 'fragment'];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid boost type' });
        }

        const multiplier = await economyService.getBoostMultiplier(playerId, type as any);
        res.json({ multiplier });
    } catch (error) {
        console.error('Error getting boost multiplier:', error);
        res.status(500).json({ error: 'Failed to get multiplier' });
    }
});

// Purchase streak freeze
router.post('/economy/streak-freeze/purchase', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.body;
        const result = await economyService.purchaseStreakFreeze(playerId);
        res.json(result);
    } catch (error) {
        console.error('Error purchasing streak freeze:', error);
        res.status(500).json({ error: 'Failed to purchase streak freeze' });
    }
});

// Use streak freeze
router.post('/economy/streak-freeze/use', async (req: Request, res: Response) => {
    try {
        const { playerId, date } = req.body;
        const success = await economyService.useStreakFreeze(playerId, date);
        res.json({ success });
    } catch (error) {
        console.error('Error using streak freeze:', error);
        res.status(500).json({ error: 'Failed to use streak freeze' });
    }
});

// Purchase premium pass
router.post('/economy/premium-pass/purchase', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.body;
        const result = await economyService.purchasePremiumPass(playerId);
        res.json(result);
    } catch (error) {
        console.error('Error purchasing premium pass:', error);
        res.status(500).json({ error: 'Failed to purchase premium pass' });
    }
});

// Get purchase history
router.get('/economy/history/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const history = await economyService.getPurchaseHistory(playerId, limit);
        res.json(history);
    } catch (error) {
        console.error('Error getting purchase history:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// Get spending stats
router.get('/economy/stats/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const stats = await economyService.getSpendingStats(playerId);
        res.json(stats);
    } catch (error) {
        console.error('Error getting spending stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// ============================================
// FRIENDSHIP ROUTES
// ============================================

// Get friends list
router.get('/friends/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const friends = await friendshipService.getFriends(playerId);
        res.json(friends);
    } catch (error) {
        console.error('Error getting friends:', error);
        res.status(500).json({ error: 'Failed to get friends' });
    }
});

// Send friend request
router.post('/friends/request/send', async (req: Request, res: Response) => {
    try {
        const { fromPlayerId, fromPlayerName, toPlayerId, message } = req.body;

        if (!fromPlayerId || !toPlayerId) {
            return res.status(400).json({ error: 'From and To player IDs required' });
        }

        const result = await friendshipService.sendFriendRequest(
            fromPlayerId,
            fromPlayerName || 'Player',
            toPlayerId,
            message
        );
        res.json(result);
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ error: 'Failed to send request' });
    }
});

// Get pending friend requests
router.get('/friends/requests/pending/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const requests = await friendshipService.getPendingRequests(playerId);
        res.json(requests);
    } catch (error) {
        console.error('Error getting pending requests:', error);
        res.status(500).json({ error: 'Failed to get requests' });
    }
});

// Get sent friend requests
router.get('/friends/requests/sent/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const requests = await friendshipService.getSentRequests(playerId);
        res.json(requests);
    } catch (error) {
        console.error('Error getting sent requests:', error);
        res.status(500).json({ error: 'Failed to get requests' });
    }
});

// Accept friend request
router.post('/friends/request/accept', async (req: Request, res: Response) => {
    try {
        const { playerId, requestId } = req.body;

        if (!playerId || !requestId) {
            return res.status(400).json({ error: 'Player ID and request ID required' });
        }

        const result = await friendshipService.acceptFriendRequest(playerId, requestId);
        res.json(result);
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ error: 'Failed to accept request' });
    }
});

// Decline friend request
router.post('/friends/request/decline', async (req: Request, res: Response) => {
    try {
        const { playerId, requestId } = req.body;
        const success = await friendshipService.declineFriendRequest(playerId, requestId);
        res.json({ success });
    } catch (error) {
        console.error('Error declining friend request:', error);
        res.status(500).json({ error: 'Failed to decline request' });
    }
});

// Cancel sent friend request
router.post('/friends/request/cancel', async (req: Request, res: Response) => {
    try {
        const { playerId, requestId } = req.body;
        const success = await friendshipService.cancelFriendRequest(playerId, requestId);
        res.json({ success });
    } catch (error) {
        console.error('Error canceling friend request:', error);
        res.status(500).json({ error: 'Failed to cancel request' });
    }
});

// Remove friend
router.post('/friends/remove', async (req: Request, res: Response) => {
    try {
        const { playerId, friendId } = req.body;

        if (!playerId || !friendId) {
            return res.status(400).json({ error: 'Player ID and friend ID required' });
        }

        const success = await friendshipService.removeFriend(playerId, friendId);
        res.json({ success });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

// Block player
router.post('/friends/block', async (req: Request, res: Response) => {
    try {
        const { playerId, blockedPlayerId, reason } = req.body;

        if (!playerId || !blockedPlayerId) {
            return res.status(400).json({ error: 'Player ID and blocked player ID required' });
        }

        const result = await friendshipService.blockPlayer(playerId, blockedPlayerId, reason);
        res.json(result);
    } catch (error) {
        console.error('Error blocking player:', error);
        res.status(500).json({ error: 'Failed to block player' });
    }
});

// Unblock player
router.post('/friends/unblock', async (req: Request, res: Response) => {
    try {
        const { playerId, blockedPlayerId } = req.body;
        const success = await friendshipService.unblockPlayer(playerId, blockedPlayerId);
        res.json({ success });
    } catch (error) {
        console.error('Error unblocking player:', error);
        res.status(500).json({ error: 'Failed to unblock player' });
    }
});

// Get blocked players
router.get('/friends/blocked/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const blocked = await friendshipService.getBlockedPlayers(playerId);
        res.json(blocked);
    } catch (error) {
        console.error('Error getting blocked players:', error);
        res.status(500).json({ error: 'Failed to get blocked players' });
    }
});

// Get mutual friends
router.get('/friends/mutual/:playerId1/:playerId2', async (req: Request, res: Response) => {
    try {
        const { playerId1, playerId2 } = req.params;
        const mutual = await friendshipService.getMutualFriends(playerId1, playerId2);
        res.json({ mutual, count: mutual.length });
    } catch (error) {
        console.error('Error getting mutual friends:', error);
        res.status(500).json({ error: 'Failed to get mutual friends' });
    }
});

// Get friend suggestions
router.get('/friends/suggestions/:playerId', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;
        const suggestions = await friendshipService.getFriendSuggestions(playerId, limit);
        res.json(suggestions);
    } catch (error) {
        console.error('Error getting friend suggestions:', error);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

export default router;
