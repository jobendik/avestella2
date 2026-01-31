import { EventEmitter } from 'events';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { friendshipService } from './FriendshipService.js';
import { PlayerData } from '../database/playerDataModel.js';

// ==========================================
// Activity Feed Model
// ==========================================

export interface IFriendActivity extends Document {
  activityId: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  activityType: 'levelUp' | 'achievement' | 'gift' | 'online' | 'bondFormed' | 'milestone' | 'questComplete' | 'seasonTier' | 'constellationFormed';
  data: Record<string, any>;
  timestamp: Date;
}

const FriendActivitySchema = new Schema<IFriendActivity>({
  activityId: { type: String, required: true, unique: true, index: true },
  playerId: { type: String, required: true, index: true },
  playerName: { type: String, required: true },
  playerAvatar: { type: String, default: '⭐' },
  activityType: {
    type: String,
    required: true,
    enum: ['levelUp', 'achievement', 'gift', 'online', 'bondFormed', 'milestone', 'questComplete', 'seasonTier', 'constellationFormed']
  },
  data: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  collection: 'friend_activities'
});

// TTL - expire after 7 days
FriendActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const FriendActivity: Model<IFriendActivity> = mongoose.model<IFriendActivity>('FriendActivity', FriendActivitySchema);

// ==========================================
// Activity Feed Service
// ==========================================

interface ActivityData {
  level?: number;
  achievementName?: string;
  achievementIcon?: string;
  recipientName?: string;
  bondedWithName?: string;
  bondLevel?: number;
  milestoneName?: string;
  questName?: string;
  seasonTier?: number;
  seasonName?: string;
  constellationName?: string;
  constellationRarity?: string;
  [key: string]: any;
}

interface ActivityFeedItem {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  type: string;
  data: ActivityData;
  timestamp: Date;
  timeAgo: string;
}

class ActivityFeedService extends EventEmitter {
  private readonly MAX_FEED_SIZE = 100;

  async initialize(): Promise<void> {
    console.log('📰 Activity Feed Service initialized');
  }

  // ==========================================
  // Record Activities
  // ==========================================

  async recordActivity(
    playerId: string,
    playerName: string,
    playerAvatar: string,
    activityType: IFriendActivity['activityType'],
    data: ActivityData = {}
  ): Promise<IFriendActivity> {
    const activityId = `act_${playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const activity = new FriendActivity({
      activityId,
      playerId,
      playerName,
      playerAvatar,
      activityType,
      data,
      timestamp: new Date()
    });

    await activity.save();

    // Broadcast to friends
    this.broadcastToFriends(playerId, activity);

    return activity;
  }

  // Convenience methods for common activities
  async recordLevelUp(playerId: string, playerName: string, avatar: string, newLevel: number): Promise<void> {
    await this.recordActivity(playerId, playerName, avatar, 'levelUp', { level: newLevel });
  }

  async recordAchievement(
    playerId: string, 
    playerName: string, 
    avatar: string, 
    achievementName: string,
    achievementIcon?: string
  ): Promise<void> {
    await this.recordActivity(playerId, playerName, avatar, 'achievement', { 
      achievementName,
      achievementIcon
    });
  }

  async recordGiftSent(
    playerId: string, 
    playerName: string, 
    avatar: string, 
    recipientName: string
  ): Promise<void> {
    await this.recordActivity(playerId, playerName, avatar, 'gift', { recipientName });
  }

  async recordBondFormed(
    playerId: string, 
    playerName: string, 
    avatar: string, 
    bondedWithName: string,
    bondLevel: number
  ): Promise<void> {
    await this.recordActivity(playerId, playerName, avatar, 'bondFormed', { 
      bondedWithName,
      bondLevel
    });
  }

  async recordMilestone(
    playerId: string, 
    playerName: string, 
    avatar: string, 
    milestoneName: string
  ): Promise<void> {
    await this.recordActivity(playerId, playerName, avatar, 'milestone', { milestoneName });
  }

  async recordQuestComplete(
    playerId: string, 
    playerName: string, 
    avatar: string, 
    questName: string
  ): Promise<void> {
    await this.recordActivity(playerId, playerName, avatar, 'questComplete', { questName });
  }

  async recordSeasonTierUp(
    playerId: string, 
    playerName: string, 
    avatar: string, 
    tier: number,
    seasonName: string
  ): Promise<void> {
    await this.recordActivity(playerId, playerName, avatar, 'seasonTier', { 
      seasonTier: tier,
      seasonName
    });
  }

  async recordConstellationFormed(
    playerId: string, 
    playerName: string, 
    avatar: string, 
    constellationName: string,
    rarity: string
  ): Promise<void> {
    await this.recordActivity(playerId, playerName, avatar, 'constellationFormed', { 
      constellationName,
      constellationRarity: rarity
    });
  }

  async recordOnline(playerId: string, playerName: string, avatar: string): Promise<void> {
    // Only record online if not already recorded in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOnline = await FriendActivity.findOne({
      playerId,
      activityType: 'online',
      timestamp: { $gte: oneHourAgo }
    });

    if (!recentOnline) {
      await this.recordActivity(playerId, playerName, avatar, 'online', {});
    }
  }

  // ==========================================
  // Retrieve Activities
  // ==========================================

  async getFriendActivityFeed(playerId: string, limit: number = 50): Promise<ActivityFeedItem[]> {
    // Get friend IDs
    const friends = await friendshipService.getFriends(playerId);
    const friendIds = friends.map(f => f.friendId);

    if (friendIds.length === 0) {
      return [];
    }

    const activities = await FriendActivity.find({ playerId: { $in: friendIds } })
      .sort({ timestamp: -1 })
      .limit(limit);

    return activities.map(a => this.formatActivity(a));
  }

  async getPlayerActivities(playerId: string, limit: number = 20): Promise<ActivityFeedItem[]> {
    const activities = await FriendActivity.find({ playerId })
      .sort({ timestamp: -1 })
      .limit(limit);

    return activities.map(a => this.formatActivity(a));
  }

  async getActivityById(activityId: string): Promise<ActivityFeedItem | null> {
    const activity = await FriendActivity.findOne({ activityId });
    if (!activity) return null;
    return this.formatActivity(activity);
  }

  async getRecentActivitiesByType(
    activityType: IFriendActivity['activityType'],
    limit: number = 20
  ): Promise<ActivityFeedItem[]> {
    const activities = await FriendActivity.find({ activityType })
      .sort({ timestamp: -1 })
      .limit(limit);

    return activities.map(a => this.formatActivity(a));
  }

  // ==========================================
  // Activity Stats
  // ==========================================

  async getPlayerActivityStats(playerId: string): Promise<{
    totalActivities: number;
    byType: Record<string, number>;
    lastActive: Date | null;
    activityRate: number; // Activities per day (last 7 days)
  }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const activities = await FriendActivity.find({ playerId });
    const recentActivities = activities.filter(a => a.timestamp >= sevenDaysAgo);

    const byType: Record<string, number> = {};
    let lastActive: Date | null = null;

    activities.forEach(a => {
      byType[a.activityType] = (byType[a.activityType] || 0) + 1;
      if (!lastActive || a.timestamp > lastActive) {
        lastActive = a.timestamp;
      }
    });

    return {
      totalActivities: activities.length,
      byType,
      lastActive,
      activityRate: recentActivities.length / 7
    };
  }

  // ==========================================
  // Private Methods
  // ==========================================

  private formatActivity(activity: IFriendActivity): ActivityFeedItem {
    return {
      id: activity.activityId,
      playerId: activity.playerId,
      playerName: activity.playerName,
      playerAvatar: activity.playerAvatar,
      type: activity.activityType,
      data: activity.data,
      timestamp: activity.timestamp,
      timeAgo: this.getTimeAgo(activity.timestamp)
    };
  }

  private getTimeAgo(timestamp: Date): string {
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  }

  private broadcastToFriends(playerId: string, activity: IFriendActivity): void {
    this.emit('activity_created', {
      playerId,
      activity: this.formatActivity(activity)
    });
  }

  // ==========================================
  // Cleanup
  // ==========================================

  async cleanupOldActivities(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await FriendActivity.deleteMany({ timestamp: { $lt: cutoffDate } });
    return result.deletedCount;
  }
}

export const activityFeedService = new ActivityFeedService();
export { ActivityFeedService, FriendActivity };
// IFriendActivity is already exported at the interface definition above
