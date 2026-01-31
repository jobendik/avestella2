import { WebSocket } from 'ws';
import { constellationService } from '../../services/ConstellationService.js';

interface ConstellationMessage {
  type: string;
  playerId: string;
  constellationId?: string;
  realmId?: string;
  data?: {
    playerIds?: string[];
    starMemoryIds?: string[];
    newStarMemoryIds?: string[];
    realmId?: string;
    name?: string;
    description?: string;
    limit?: number;
  };
}

export function setupConstellationHandlers(
  ws: WebSocket,
  broadcast: (message: any, excludeWs?: WebSocket) => void
) {
  return {
    handleConstellationMessage: async (message: ConstellationMessage) => {
      const { type, playerId, constellationId, realmId, data } = message;

      switch (type) {
        case 'constellation:form': {
          if (!data?.playerIds || !data?.starMemoryIds || !data?.realmId) return;

          const result = await constellationService.formConstellation({
            playerIds: data.playerIds,
            starMemoryIds: data.starMemoryIds,
            realmId: data.realmId,
            name: data.name,
            description: data.description
          });

          ws.send(JSON.stringify({
            type: 'constellation:formed',
            data: result
          }));

          // Broadcast constellation formation to all players in realm
          if (result.success && result.constellation) {
            broadcast({
              type: 'constellation:newConstellation',
              data: {
                constellation: result.constellation,
                formingPlayers: data.playerIds
              }
            });
          }
          break;
        }

        case 'constellation:expand': {
          if (!constellationId || !data?.newStarMemoryIds) return;

          const result = await constellationService.expandConstellation(
            constellationId,
            data.newStarMemoryIds
          );

          ws.send(JSON.stringify({
            type: 'constellation:expanded',
            data: result
          }));

          if (result.success && result.constellation) {
            broadcast({
              type: 'constellation:updated',
              data: {
                constellation: result.constellation
              }
            });
          }
          break;
        }

        case 'constellation:getPlayer': {
          const constellations = await constellationService.getPlayerConstellations(playerId);

          ws.send(JSON.stringify({
            type: 'constellation:playerList',
            data: { constellations }
          }));
          break;
        }

        case 'constellation:getOne': {
          if (!constellationId) return;

          const result = await constellationService.getConstellationWithStars(constellationId);

          ws.send(JSON.stringify({
            type: 'constellation:detail',
            data: result
          }));
          break;
        }

        case 'constellation:getRealm': {
          if (!realmId) return;

          const constellations = await constellationService.getRealmConstellations(
            realmId,
            data?.limit || 50
          );

          ws.send(JSON.stringify({
            type: 'constellation:realmList',
            data: { constellations }
          }));
          break;
        }

        case 'constellation:getStats': {
          const stats = await constellationService.getPlayerConstellationStats(playerId);

          ws.send(JSON.stringify({
            type: 'constellation:stats',
            data: stats
          }));
          break;
        }

        case 'constellation:checkPotential': {
          const potential = await constellationService.checkForPotentialConstellations(playerId);

          ws.send(JSON.stringify({
            type: 'constellation:potential',
            data: { potential }
          }));
          break;
        }

        case 'constellation:getGlobalStats': {
          const stats = await constellationService.getGlobalConstellationStats();

          ws.send(JSON.stringify({
            type: 'constellation:globalStats',
            data: stats
          }));
          break;
        }
      }
    }
  };
}

// Event listeners for constellation service
export function initializeConstellationEventListeners(
  broadcast: (message: any) => void,
  sendToPlayer: (playerId: string, message: any) => void
) {
  constellationService.on('constellation_formed', (data) => {
    // Notify all players involved
    data.playerIds.forEach((pid: string) => {
      sendToPlayer(pid, {
        type: 'constellation:youFormedConstellation',
        data: {
          constellation: data.constellation,
          rarity: data.rarity,
          rewards: data.rewards
        }
      });
    });

    // Broadcast to realm
    broadcast({
      type: 'constellation:formedInRealm',
      data: {
        constellationId: data.constellation._id,
        name: data.constellation.name,
        rarity: data.rarity,
        realmId: data.constellation.realmId,
        playerCount: data.playerIds.length
      }
    });
  });

  constellationService.on('reward_distributed', (data) => {
    sendToPlayer(data.playerId, {
      type: 'constellation:rewardsReceived',
      data: {
        constellationId: data.constellationId,
        rewards: data.rewards
      }
    });
  });

  constellationService.on('constellation_expanded', (data) => {
    // Notify new members
    data.newMembers.forEach((pid: string) => {
      sendToPlayer(pid, {
        type: 'constellation:youJoinedConstellation',
        data: {
          constellation: data.constellation,
          rewards: data.rewards
        }
      });
    });

    // Notify all current members (including new ones) of the update
    data.constellation.playerIds.forEach((pid: string) => {
      sendToPlayer(pid, {
        type: 'constellation:updated',
        data: {
          constellation: data.constellation
        }
      });
    });
  });
}
