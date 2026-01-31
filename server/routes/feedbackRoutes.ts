/**
 * Feedback Routes - Player feedback submission endpoint (GAP 9 fix)
 * Handles bug reports, suggestions, and general feedback from players
 */

import express, { Router, Request, Response } from 'express';
import { Feedback } from '../database/models.js';

const router: Router = express.Router();

// Rate limiting tracking (simple in-memory, consider Redis for production)
const feedbackRateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_FEEDBACK_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Check if player has exceeded feedback rate limit
 */
function isRateLimited(playerId: string): boolean {
    const now = Date.now();
    const record = feedbackRateLimits.get(playerId);
    
    if (!record || record.resetAt < now) {
        // Reset or new entry
        feedbackRateLimits.set(playerId, { count: 1, resetAt: now + HOUR_MS });
        return false;
    }
    
    if (record.count >= MAX_FEEDBACK_PER_HOUR) {
        return true;
    }
    
    record.count++;
    return false;
}

/**
 * POST /api/feedback/submit
 * Submit player feedback
 */
router.post('/submit', async (req: Request, res: Response) => {
    try {
        const {
            playerId,
            playerName,
            category,
            message,
            rating,
            email,
            metadata
        } = req.body;
        
        // Validate required fields
        if (!playerId || !playerName || !category || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: playerId, playerName, category, message'
            });
        }
        
        // Validate category
        const validCategories = ['bug', 'suggestion', 'question', 'praise', 'other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
            });
        }
        
        // Validate message length
        if (message.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Message too long. Maximum 2000 characters.'
            });
        }
        
        if (message.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Message too short. Minimum 10 characters.'
            });
        }
        
        // Check rate limit
        if (isRateLimited(playerId)) {
            return res.status(429).json({
                success: false,
                error: 'Feedback rate limit exceeded. Please try again later.'
            });
        }
        
        // Validate rating if provided
        const parsedRating = rating ? Math.max(1, Math.min(5, parseInt(rating) || 5)) : 5;
        
        // Sanitize email if provided
        const sanitizedEmail = email && typeof email === 'string' 
            ? email.trim().slice(0, 100) 
            : null;
        
        // Create feedback entry
        const feedback = new Feedback({
            playerId,
            playerName: playerName.slice(0, 30),
            category,
            message: message.slice(0, 2000),
            rating: parsedRating,
            email: sanitizedEmail,
            metadata: {
                realm: metadata?.realm || 'genesis',
                position: {
                    x: metadata?.position?.x || 0,
                    y: metadata?.position?.y || 0
                },
                level: metadata?.level || 1,
                platform: metadata?.platform || 'web',
                version: metadata?.version || '1.0.0'
            },
            status: 'new',
            adminNotes: ''
        });
        
        await feedback.save();
        
        console.log(`[Feedback] New ${category} from ${playerName} (${playerId})`);
        
        return res.status(201).json({
            success: true,
            message: 'Thank you for your feedback!',
            feedbackId: feedback._id
        });
        
    } catch (error) {
        console.error('[Feedback] Error submitting feedback:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to submit feedback. Please try again.'
        });
    }
});

/**
 * GET /api/feedback/my-submissions
 * Get player's own feedback submissions
 */
router.get('/my-submissions', async (req: Request, res: Response) => {
    try {
        const { playerId } = req.query;
        
        if (!playerId || typeof playerId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameter: playerId'
            });
        }
        
        const submissions = await Feedback.find({ playerId })
            .select('category message rating status createdAt')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        
        return res.status(200).json({
            success: true,
            submissions
        });
        
    } catch (error) {
        console.error('[Feedback] Error fetching submissions:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch feedback submissions.'
        });
    }
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics (for admin dashboard)
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const [total, byCategory, byStatus, avgRating] = await Promise.all([
            Feedback.countDocuments(),
            Feedback.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]),
            Feedback.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Feedback.aggregate([
                { $group: { _id: null, avgRating: { $avg: '$rating' } } }
            ])
        ]);
        
        return res.status(200).json({
            success: true,
            stats: {
                total,
                byCategory: Object.fromEntries(byCategory.map((c: { _id: string; count: number }) => [c._id, c.count])),
                byStatus: Object.fromEntries(byStatus.map((s: { _id: string; count: number }) => [s._id, s.count])),
                averageRating: avgRating[0]?.avgRating?.toFixed(2) || '0.00'
            }
        });
        
    } catch (error) {
        console.error('[Feedback] Error fetching stats:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch feedback statistics.'
        });
    }
});

export default router;
