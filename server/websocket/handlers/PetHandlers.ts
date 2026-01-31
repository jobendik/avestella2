// =============================================================================
// Pet Handlers - WebSocket message handlers for Pet System
// =============================================================================

import { HandlerContext } from '../types.js';
import { petService } from '../../services/index.js';

export const PetHandlers = {
    handleAdoptPet: async (connection: any, data: any, ctx: HandlerContext) => {
        try {
            const { petId } = data;
            if (!petId) throw new Error('Missing petId');

            const result = await petService.adoptPet(connection.playerId, petId);

            if (result.success) {
                ctx.send(connection.ws, {
                    type: 'pet_adopted',
                    data: { petId, message: result.message },
                    timestamp: Date.now()
                });
            } else {
                ctx.sendError(connection, result.message);
            }
        } catch (error: any) {
            console.error('Error adopting pet:', error);
            ctx.sendError(connection, error.message || 'Failed to adopt pet');
        }
    },

    handleEquipPet: async (connection: any, data: any, ctx: HandlerContext) => {
        try {
            const { petId } = data;
            // petId can be null to unequip

            await petService.equipPet(connection.playerId, petId);

            ctx.send(connection.ws, {
                type: 'pet_equipped',
                data: { petId },
                timestamp: Date.now()
            });
        } catch (error: any) {
            console.error('Error equipping pet:', error);
            ctx.sendError(connection, error.message || 'Failed to equip pet');
        }
    },

    handleFeedPet: async (connection: any, data: any, ctx: HandlerContext) => {
        try {
            const { petId } = data;
            if (!petId) throw new Error('Missing petId');

            const result = await petService.feedPet(connection.playerId, petId);

            ctx.send(connection.ws, {
                type: 'pet_updated',
                data: {
                    petId,
                    stats: result.stats,
                    activity: 'feed'
                },
                timestamp: Date.now()
            });

            if (result.leveledUp) {
                ctx.send(connection.ws, {
                    type: 'pet_leveled_up',
                    data: { petId },
                    timestamp: Date.now()
                });
            }
        } catch (error: any) {
            console.error('Error feeding pet:', error);
            ctx.sendError(connection, error.message || 'Failed to feed pet');
        }
    },

    handlePlayPet: async (connection: any, data: any, ctx: HandlerContext) => {
        try {
            const { petId } = data;
            if (!petId) throw new Error('Missing petId');

            const result = await petService.playWithPet(connection.playerId, petId);

            ctx.send(connection.ws, {
                type: 'pet_updated',
                data: {
                    petId,
                    stats: result.stats,
                    activity: 'play'
                },
                timestamp: Date.now()
            });

            if (result.leveledUp) {
                ctx.send(connection.ws, {
                    type: 'pet_leveled_up',
                    data: { petId },
                    timestamp: Date.now()
                });
            }
        } catch (error: any) {
            console.error('Error playing with pet:', error);
            ctx.sendError(connection, error.message || 'Failed to play with pet');
        }
    },

    handleGetPetDetails: async (connection: any, data: any, ctx: HandlerContext) => {
        try {
            const { petId } = data;
            if (!petId) throw new Error('Missing petId');

            const details = await petService.getPetDetails(connection.playerId, petId);

            ctx.send(connection.ws, {
                type: 'pet_details',
                data: details,
                timestamp: Date.now()
            });
        } catch (error: any) {
            console.error('Error getting pet details:', error);
            ctx.sendError(connection, error.message || 'Failed to get pet details');
        }
    }
};
