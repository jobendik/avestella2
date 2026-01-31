import { WebSocket } from 'ws';
import { seasonPassService } from '../../services/SeasonPassService.js';

interface SeasonMessage {
  type: string;
  playerId: string;
  xp?: number;
  source?: string;
  tier?: number;
  claimPremium?: boolean;
}

export function setupSeasonHandlers(
  ws: WebSocket,
  broadcast: (message: any, excludeWs?: WebSocket) => void
) {
  return {
    handleSeasonMessage: async (message: SeasonMessage) => {
      const { type, playerId } = message;

      switch (type) {
        case 'season:getInfo': {
          const season = await seasonPassService.getCurrentSeason();
          ws.send(JSON.stringify({
            type: 'season:info',
            data: season
          }));
          break;
        }

        case 'season:getProgress': {
          const progress = await seasonPassService.getPlayerProgress(playerId);
          ws.send(JSON.stringify({
            type: 'season:progress',
            data: progress
          }));
          break;
        }

        case 'season:addXP': {
          if (!message.xp) return;
          
          const result = await seasonPassService.addSeasonXP(
            playerId, 
            message.xp, 
            message.source
          );
          
          ws.send(JSON.stringify({
            type: 'season:xpAdded',
            data: result
          }));

          // If tier up, broadcast to room
          if (result?.tierUp) {
            broadcast({
              type: 'season:tierUp',
              data: {
                playerId,
                newTier: result.newTier,
                tiersGained: result.tiersGained
              }
            });
          }
          break;
        }

        case 'season:claimReward': {
          if (typeof message.tier !== 'number') return;
          
          const result = await seasonPassService.claimTierReward(
            playerId,
            message.tier,
            message.claimPremium || false
          );
          
          ws.send(JSON.stringify({
            type: 'season:rewardClaimed',
            data: result
          }));
          break;
        }

        case 'season:claimAll': {
          const result = await seasonPassService.claimAllAvailableRewards(playerId);
          
          ws.send(JSON.stringify({
            type: 'season:allRewardsClaimed',
            data: result
          }));
          break;
        }

        case 'season:upgradePremium': {
          const result = await seasonPassService.upgradeToPremium(playerId);
          
          ws.send(JSON.stringify({
            type: 'season:premiumUpgraded',
            data: result
          }));
          break;
        }

        case 'season:getRewards': {
          const rewards = await seasonPassService.getSeasonRewards();
          
          ws.send(JSON.stringify({
            type: 'season:rewards',
            data: { rewards }
          }));
          break;
        }

        case 'season:getHistory': {
          const history = await seasonPassService.getPlayerSeasonHistory(playerId);
          
          ws.send(JSON.stringify({
            type: 'season:history',
            data: { history }
          }));
          break;
        }
      }
    }
  };
}

// Event listeners for season service
export function initializeSeasonEventListeners(
  broadcast: (message: any) => void
) {
  seasonPassService.on('tier_up', (data) => {
    broadcast({
      type: 'season:playerTierUp',
      data
    });
  });

  seasonPassService.on('season_rotated', (data) => {
    broadcast({
      type: 'season:rotated',
      data
    });
  });

  seasonPassService.on('reward_claimed', (data) => {
    // Could broadcast special reward claims
  });
}
