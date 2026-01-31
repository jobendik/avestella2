import { WebSocket } from 'ws';
import { dailyLoginService } from '../../services/DailyLoginService.js';

interface DailyLoginMessage {
  type: string;
  playerId: string;
}

export function setupDailyLoginHandlers(
  ws: WebSocket,
  broadcast: (message: any, excludeWs?: WebSocket) => void
) {
  return {
    handleDailyLoginMessage: async (message: DailyLoginMessage) => {
      const { type, playerId } = message;

      switch (type) {
        case 'daily:login': {
          const result = await dailyLoginService.processDailyLogin(playerId);
          
          ws.send(JSON.stringify({
            type: 'daily:loginResult',
            data: result
          }));

          // If it's a new day and they got rewards, broadcast milestone achievements
          if (result.isNewDay && result.milestoneReward) {
            broadcast({
              type: 'daily:milestoneReached',
              data: {
                playerId,
                streak: result.currentStreak,
                milestone: result.milestoneReward
              }
            });
          }
          break;
        }

        case 'daily:getStreak': {
          const streakInfo = await dailyLoginService.getStreakInfo(playerId);
          
          ws.send(JSON.stringify({
            type: 'daily:streakInfo',
            data: streakInfo
          }));
          break;
        }

        case 'daily:getRewards': {
          const weeklyRewards = dailyLoginService.getWeeklyRewards();
          const milestones = dailyLoginService.getAllMilestones();
          
          ws.send(JSON.stringify({
            type: 'daily:rewards',
            data: { weeklyRewards, milestones }
          }));
          break;
        }

        case 'daily:getLeaderboard': {
          const leaderboard = await dailyLoginService.getStreakLeaderboard(50);
          
          ws.send(JSON.stringify({
            type: 'daily:leaderboard',
            data: { leaderboard }
          }));
          break;
        }
      }
    }
  };
}

// Event listeners for daily login service
export function initializeDailyLoginEventListeners(
  broadcast: (message: any) => void,
  sendToPlayer: (playerId: string, message: any) => void
) {
  dailyLoginService.on('daily_login', (data) => {
    // Could broadcast to friends that player logged in
  });

  dailyLoginService.on('milestone_reached', (data) => {
    // Broadcast milestone achievement
    broadcast({
      type: 'daily:playerMilestone',
      data: {
        playerId: data.playerId,
        milestone: data.milestone,
        reward: data.reward
      }
    });
  });

  dailyLoginService.on('streak_broken', (data) => {
    // Notify player their streak was broken
    sendToPlayer(data.playerId, {
      type: 'daily:streakBroken',
      data: {
        previousStreak: data.previousStreak
      }
    });
  });

  dailyLoginService.on('mystery_box_granted', (data) => {
    sendToPlayer(data.playerId, {
      type: 'daily:mysteryBoxGranted',
      data: {
        rarity: data.rarity
      }
    });
  });
}
