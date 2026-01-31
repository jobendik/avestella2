import { WebSocket } from 'ws';
import { galleryService } from '../../services/GalleryService.js';

interface GalleryMessage {
  type: string;
  playerId: string;
  playerName?: string;
  screenshotId?: string;
  albumId?: string;
  data?: any;
}

export function setupGalleryHandlers(
  ws: WebSocket,
  broadcast: (message: any, excludeWs?: WebSocket) => void
) {
  return {
    handleGalleryMessage: async (message: GalleryMessage) => {
      const { type, playerId, playerName } = message;

      switch (type) {
        case 'gallery:save': {
          if (!playerName || !message.data) return;
          
          const result = await galleryService.saveScreenshot(
            playerId, 
            playerName, 
            message.data
          );
          
          ws.send(JSON.stringify({
            type: 'gallery:saved',
            data: result
          }));
          break;
        }

        case 'gallery:get': {
          const screenshots = await galleryService.getGallery(playerId, message.data);
          const count = await galleryService.getGalleryCount(playerId);
          
          ws.send(JSON.stringify({
            type: 'gallery:list',
            data: { screenshots, count }
          }));
          break;
        }

        case 'gallery:getOne': {
          if (!message.screenshotId) return;
          
          const screenshot = await galleryService.getScreenshot(message.screenshotId);
          
          ws.send(JSON.stringify({
            type: 'gallery:screenshot',
            data: screenshot
          }));
          break;
        }

        case 'gallery:delete': {
          if (!message.screenshotId) return;
          
          const success = await galleryService.deleteScreenshot(playerId, message.screenshotId);
          
          ws.send(JSON.stringify({
            type: 'gallery:deleted',
            data: { success, screenshotId: message.screenshotId }
          }));
          break;
        }

        case 'gallery:updateCaption': {
          if (!message.screenshotId || !message.data?.caption === undefined) return;
          
          const success = await galleryService.updateCaption(
            playerId, 
            message.screenshotId, 
            message.data.caption
          );
          
          ws.send(JSON.stringify({
            type: 'gallery:captionUpdated',
            data: { success, screenshotId: message.screenshotId }
          }));
          break;
        }

        case 'gallery:togglePublic': {
          if (!message.screenshotId) return;
          
          const result = await galleryService.togglePublic(playerId, message.screenshotId);
          
          ws.send(JSON.stringify({
            type: 'gallery:publicToggled',
            data: { ...result, screenshotId: message.screenshotId }
          }));
          break;
        }

        case 'gallery:like': {
          if (!message.screenshotId) return;
          
          const result = await galleryService.likeScreenshot(message.screenshotId, playerId);
          
          ws.send(JSON.stringify({
            type: 'gallery:liked',
            data: { ...result, screenshotId: message.screenshotId }
          }));

          // Broadcast like to screenshot owner
          if (result.success) {
            broadcast({
              type: 'gallery:receivedLike',
              data: {
                screenshotId: message.screenshotId,
                likerId: playerId,
                totalLikes: result.likes
              }
            });
          }
          break;
        }

        case 'gallery:getPublic': {
          const screenshots = await galleryService.getPublicGallery(message.data);
          
          ws.send(JSON.stringify({
            type: 'gallery:publicList',
            data: { screenshots }
          }));
          break;
        }

        case 'gallery:trackShare': {
          if (!message.screenshotId || !message.data?.platform) return;
          
          await galleryService.trackShare(message.screenshotId, message.data.platform);
          
          ws.send(JSON.stringify({
            type: 'gallery:shareTracked',
            data: { success: true }
          }));
          break;
        }

        case 'gallery:getStats': {
          const stats = await galleryService.getPlayerGalleryStats(playerId);
          
          ws.send(JSON.stringify({
            type: 'gallery:stats',
            data: stats
          }));
          break;
        }

        // Album handlers
        case 'gallery:createAlbum': {
          if (!message.data?.name) return;
          
          const result = await galleryService.createAlbum(
            playerId, 
            message.data.name, 
            message.data.description
          );
          
          ws.send(JSON.stringify({
            type: 'gallery:albumCreated',
            data: result
          }));
          break;
        }

        case 'gallery:getAlbums': {
          const albums = await galleryService.getAlbums(playerId);
          
          ws.send(JSON.stringify({
            type: 'gallery:albumsList',
            data: { albums }
          }));
          break;
        }

        case 'gallery:addToAlbum': {
          if (!message.albumId || !message.screenshotId) return;
          
          const success = await galleryService.addToAlbum(
            playerId, 
            message.albumId, 
            message.screenshotId
          );
          
          ws.send(JSON.stringify({
            type: 'gallery:addedToAlbum',
            data: { success, albumId: message.albumId, screenshotId: message.screenshotId }
          }));
          break;
        }

        case 'gallery:removeFromAlbum': {
          if (!message.albumId || !message.screenshotId) return;
          
          const success = await galleryService.removeFromAlbum(
            playerId, 
            message.albumId, 
            message.screenshotId
          );
          
          ws.send(JSON.stringify({
            type: 'gallery:removedFromAlbum',
            data: { success, albumId: message.albumId, screenshotId: message.screenshotId }
          }));
          break;
        }

        case 'gallery:getAlbumScreenshots': {
          if (!message.albumId) return;
          
          const screenshots = await galleryService.getAlbumScreenshots(message.albumId);
          
          ws.send(JSON.stringify({
            type: 'gallery:albumScreenshots',
            data: { albumId: message.albumId, screenshots }
          }));
          break;
        }
      }
    }
  };
}

// Event listeners for gallery service
export function initializeGalleryEventListeners(
  broadcast: (message: any) => void,
  sendToPlayer: (playerId: string, message: any) => void
) {
  galleryService.on('screenshot_liked', (data) => {
    // Notify the screenshot owner
    sendToPlayer(data.ownerId, {
      type: 'gallery:receivedLike',
      data: {
        screenshotId: data.screenshotId,
        likerId: data.likerId,
        totalLikes: data.totalLikes
      }
    });
  });

  galleryService.on('screenshot_featured', (data) => {
    // Notify the screenshot owner
    sendToPlayer(data.ownerId, {
      type: 'gallery:featured',
      data: {
        screenshotId: data.screenshotId,
        category: data.category
      }
    });
  });
}
