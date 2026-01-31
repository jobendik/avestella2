import { WebSocket } from 'ws';
import { activityFeedService } from '../../services/ActivityFeedService.js';

interface ActivityMessage {
  type: string;
  playerId: string;
  playerName?: string;
  playerAvatar?: string;
  activityType?: string;
  data?: any;
  limit?: number;
}

export function setupActivityFeedHandlers(
  ws: WebSocket,
  broadcast: (message: any, excludeWs?: WebSocket) => void
) {
  return {
    handleActivityMessage: async (message: ActivityMessage) => {
      const { type, playerId, playerName, playerAvatar } = message;

      switch (type) {
        case 'activity:getFeed': {
          const activities = await activityFeedService.getFriendActivityFeed(
            playerId,
            message.limit || 50
          );
          
          ws.send(JSON.stringify({
            type: 'activity:feed',
            data: { activities }
          }));
          break;
        }

        case 'activity:getPlayer': {
          const activities = await activityFeedService.getPlayerActivities(
            playerId,
            message.limit || 20
          );
          
          ws.send(JSON.stringify({
            type: 'activity:playerActivities',
            data: { activities }
          }));
          break;
        }

        case 'activity:getStats': {
          const stats = await activityFeedService.getPlayerActivityStats(playerId);
          
          ws.send(JSON.stringify({
            type: 'activity:stats',
            data: stats
          }));
          break;
        }

        // Recording activities (usually called from other services, but can be direct)
        case 'activity:recordLevelUp': {
          if (!playerName || !message.data?.level) return;
          
          await activityFeedService.recordLevelUp(
            playerId,
            playerName,
            playerAvatar || '⭐',
            message.data.level
          );
          
          ws.send(JSON.stringify({
            type: 'activity:recorded',
            data: { success: true }
          }));
          break;
        }

        case 'activity:recordAchievement': {
          if (!playerName || !message.data?.achievementName) return;
          
          await activityFeedService.recordAchievement(
            playerId,
            playerName,
            playerAvatar || '⭐',
            message.data.achievementName,
            message.data.achievementIcon
          );
          
          ws.send(JSON.stringify({
            type: 'activity:recorded',
            data: { success: true }
          }));
          break;
        }

        case 'activity:recordOnline': {
          if (!playerName) return;
          
          await activityFeedService.recordOnline(
            playerId,
            playerName,
            playerAvatar || '⭐'
          );
          break;
        }
      }
    }
  };
}

// Event listeners for activity feed service
export function initializeActivityFeedEventListeners(
  sendToPlayer: (playerId: string, message: any) => void,
  getPlayerFriends: (playerId: string) => Promise<string[]>
) {
  activityFeedService.on('activity_created', async (data) => {
    // Get friends of the player who created the activity
    const friendIds = await getPlayerFriends(data.playerId);
    
    // Send the activity to all friends
    friendIds.forEach(friendId => {
      sendToPlayer(friendId, {
        type: 'activity:newFriendActivity',
        data: data.activity
      });
    });
  });
}
