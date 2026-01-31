// =============================================================================
// Admin Routes - Analytics Aggregation & Dashboard
// =============================================================================

import express from 'express';
import { analyticsService, GlobalAnalytics, PlayerAnalytics } from '../services/AnalyticsService.js';

const router = express.Router();

// Simple admin token check (in production, use proper auth)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev_admin_token';

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (token !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
};

// ============================================
// DASHBOARD SUMMARY
// ============================================

/**
 * GET /api/admin/dashboard
 * Get complete dashboard summary with key metrics
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const summary = await analyticsService.getDashboardSummary();
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Failed to get dashboard:', error);
        res.status(500).json({ error: 'Failed to get dashboard data' });
    }
});

// ============================================
// HISTORICAL ANALYTICS
// ============================================

/**
 * GET /api/admin/analytics/daily
 * Get daily analytics for specified date range
 */
router.get('/analytics/daily', requireAdmin, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days as string) || 7, 90);
        const stats = await analyticsService.getGlobalStats(days);
        
        res.json({
            success: true,
            data: {
                days,
                stats: stats.map(day => ({
                    date: day.date,
                    dau: day.dailyActiveUsers,
                    newUsers: day.newUsers,
                    returningUsers: day.returningUsers,
                    sessions: day.totalSessions,
                    avgSession: day.averageSessionLength,
                    actions: day.totalActions,
                    starsLit: day.starsLit,
                    echoes: day.echoesCreated,
                    connections: day.connectionsFormed,
                    messages: day.messagesExchanged,
                    stardustEarned: day.stardustEarned,
                    stardustSpent: day.stardustSpent,
                    friendsAdded: day.friendsAdded,
                    guildsCreated: day.guildsCreated,
                    giftsExchanged: day.giftsExchanged,
                    realmActivity: day.realmActivity
                }))
            }
        });
    } catch (error) {
        console.error('Failed to get daily analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// ============================================
// AGGREGATED METRICS
// ============================================

/**
 * GET /api/admin/analytics/aggregated
 * Get aggregated metrics with totals and averages
 */
router.get('/analytics/aggregated', requireAdmin, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days as string) || 30, 90);
        const stats = await analyticsService.getGlobalStats(days);
        
        // Aggregate totals
        const aggregated = stats.reduce((acc, day) => ({
            totalUsers: acc.totalUsers + day.dailyActiveUsers,
            totalNewUsers: acc.totalNewUsers + day.newUsers,
            totalSessions: acc.totalSessions + day.totalSessions,
            totalPlaytimeMinutes: acc.totalPlaytimeMinutes + (day.averageSessionLength * day.totalSessions),
            totalActions: acc.totalActions + day.totalActions,
            totalStarsLit: acc.totalStarsLit + day.starsLit,
            totalEchoes: acc.totalEchoes + day.echoesCreated,
            totalConnections: acc.totalConnections + day.connectionsFormed,
            totalMessages: acc.totalMessages + day.messagesExchanged,
            totalStardustEarned: acc.totalStardustEarned + day.stardustEarned,
            totalStardustSpent: acc.totalStardustSpent + day.stardustSpent,
            totalFriendsAdded: acc.totalFriendsAdded + day.friendsAdded,
            totalGifts: acc.totalGifts + day.giftsExchanged,
            realmActivity: {
                genesis: acc.realmActivity.genesis + (day.realmActivity?.genesis || 0),
                nebula: acc.realmActivity.nebula + (day.realmActivity?.nebula || 0),
                void: acc.realmActivity.void + (day.realmActivity?.void || 0),
                starforge: acc.realmActivity.starforge + (day.realmActivity?.starforge || 0),
                sanctuary: acc.realmActivity.sanctuary + (day.realmActivity?.sanctuary || 0)
            }
        }), {
            totalUsers: 0,
            totalNewUsers: 0,
            totalSessions: 0,
            totalPlaytimeMinutes: 0,
            totalActions: 0,
            totalStarsLit: 0,
            totalEchoes: 0,
            totalConnections: 0,
            totalMessages: 0,
            totalStardustEarned: 0,
            totalStardustSpent: 0,
            totalFriendsAdded: 0,
            totalGifts: 0,
            realmActivity: { genesis: 0, nebula: 0, void: 0, starforge: 0, sanctuary: 0 }
        });
        
        // Calculate averages
        const daysWithData = stats.length || 1;
        const averages = {
            avgDailyUsers: Math.round(aggregated.totalUsers / daysWithData),
            avgNewUsers: Math.round(aggregated.totalNewUsers / daysWithData),
            avgSessions: Math.round(aggregated.totalSessions / daysWithData),
            avgSessionLength: aggregated.totalSessions > 0 
                ? Math.round(aggregated.totalPlaytimeMinutes / aggregated.totalSessions) 
                : 0,
            avgActions: Math.round(aggregated.totalActions / daysWithData),
            avgStarsLit: Math.round(aggregated.totalStarsLit / daysWithData)
        };

        res.json({
            success: true,
            data: {
                period: `${days} days`,
                totals: aggregated,
                averages,
                mostActiveRealm: Object.entries(aggregated.realmActivity)
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'genesis'
            }
        });
    } catch (error) {
        console.error('Failed to get aggregated analytics:', error);
        res.status(500).json({ error: 'Failed to get aggregated analytics' });
    }
});

// ============================================
// RETENTION ANALYSIS
// ============================================

/**
 * GET /api/admin/analytics/retention
 * Get retention cohort analysis
 */
router.get('/analytics/retention', requireAdmin, async (req, res) => {
    try {
        const startDate = req.query.startDate as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const days = Math.min(parseInt(req.query.days as string) || 7, 30);
        
        const retention = await analyticsService.getRetentionCohort(startDate, days);
        
        res.json({
            success: true,
            data: {
                cohortDate: startDate,
                cohortSize: retention.cohortSize,
                retentionByDay: retention.retention.map((r, i) => ({
                    day: i + 1,
                    retained: r
                }))
            }
        });
    } catch (error) {
        console.error('Failed to get retention analytics:', error);
        res.status(500).json({ error: 'Failed to get retention data' });
    }
});

// ============================================
// PLAYER STATISTICS
// ============================================

/**
 * GET /api/admin/players/stats
 * Get overall player statistics
 */
router.get('/players/stats', requireAdmin, async (req, res) => {
    try {
        const totalPlayers = await PlayerAnalytics.countDocuments();
        
        // Get active players (played in last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const activePlayers = await PlayerAnalytics.countDocuments({
            lastActiveDate: { $gte: weekAgo }
        });
        
        // Get players with high streaks
        const streakPlayers = await PlayerAnalytics.countDocuments({
            currentStreak: { $gte: 7 }
        });
        
        // Average playtime
        const avgPlaytimeResult = await PlayerAnalytics.aggregate([
            { $group: { _id: null, avgPlaytime: { $avg: '$totalPlaytime' } } }
        ]);
        const avgPlaytime = Math.round(avgPlaytimeResult[0]?.avgPlaytime || 0);
        
        // Top players by playtime
        const topByPlaytime = await PlayerAnalytics.find()
            .sort({ totalPlaytime: -1 })
            .limit(10)
            .select('playerId totalPlaytime sessionsCount currentStreak')
            .lean();
        
        res.json({
            success: true,
            data: {
                totalPlayers,
                activePlayers,
                activePercent: totalPlayers > 0 ? Math.round((activePlayers / totalPlayers) * 100) : 0,
                playersWithWeekStreak: streakPlayers,
                avgPlaytimeMinutes: avgPlaytime,
                topPlayersByPlaytime: topByPlaytime
            }
        });
    } catch (error) {
        console.error('Failed to get player stats:', error);
        res.status(500).json({ error: 'Failed to get player statistics' });
    }
});

/**
 * GET /api/admin/players/:playerId/analytics
 * Get detailed analytics for a specific player
 */
router.get('/players/:playerId/analytics', requireAdmin, async (req, res) => {
    try {
        const { playerId } = req.params;
        const stats = await analyticsService.getPlayerStats(playerId);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Failed to get player analytics:', error);
        res.status(500).json({ error: 'Failed to get player analytics' });
    }
});

// ============================================
// REAL-TIME METRICS
// ============================================

/**
 * GET /api/admin/realtime
 * Get real-time server metrics (would integrate with WebSocket handler)
 */
router.get('/realtime', requireAdmin, async (_req, res) => {
    try {
        // These would ideally come from the WebSocket handler
        // For now, return placeholder structure
        res.json({
            success: true,
            data: {
                timestamp: Date.now(),
                note: 'Real-time metrics require WebSocket handler integration',
                placeholder: {
                    onlinePlayers: 0,
                    activeRooms: 0,
                    messagesPerMinute: 0,
                    serverUptime: process.uptime()
                }
            }
        });
    } catch (error) {
        console.error('Failed to get realtime metrics:', error);
        res.status(500).json({ error: 'Failed to get realtime metrics' });
    }
});

export default router;
