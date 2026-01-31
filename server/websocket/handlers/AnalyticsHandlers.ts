// =============================================================================
// Analytics Handlers - WebSocket handlers for game mode analytics
// =============================================================================
// Phase 3.4-3.6: Game Mode Analytics, Filter Preferences, Ambient Mode
// =============================================================================

import { WebSocket } from 'ws';
import { gameModeAnalyticsService, IPlayerPreferences } from '../../services/GameModeAnalyticsService.js';

interface ExtendedWebSocket extends WebSocket {
    playerId?: string;
    playerName?: string;
    realm?: string;
}

// ============================================
// PREFERENCES HANDLERS
// ============================================

export async function handleGetPreferences(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'analytics:getPreferences:error',
            error: 'Not authenticated'
        }));
        return;
    }

    try {
        const preferences = await gameModeAnalyticsService.getPlayerPreferences(ws.playerId);

        ws.send(JSON.stringify({
            type: 'analytics:getPreferences:result',
            preferences
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:getPreferences:error',
            error: error.message
        }));
    }
}

export async function handleUpdatePreferences(
    ws: ExtendedWebSocket,
    data: { updates: Partial<IPlayerPreferences> }
): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'analytics:updatePreferences:error',
            error: 'Not authenticated'
        }));
        return;
    }

    try {
        const preferences = await gameModeAnalyticsService.updatePreferences(
            ws.playerId,
            data.updates
        );

        ws.send(JSON.stringify({
            type: 'analytics:updatePreferences:success',
            preferences
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:updatePreferences:error',
            error: error.message
        }));
    }
}

export async function handleUpdateVisualFilters(
    ws: ExtendedWebSocket,
    data: { filters: IPlayerPreferences['visualFilters'] }
): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'analytics:updateFilters:error',
            error: 'Not authenticated'
        }));
        return;
    }

    try {
        await gameModeAnalyticsService.updateVisualFilters(ws.playerId, data.filters);

        ws.send(JSON.stringify({
            type: 'analytics:updateFilters:success'
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:updateFilters:error',
            error: error.message
        }));
    }
}

// ============================================
// GAME MODE SESSION HANDLERS
// ============================================

export async function handleStartGameMode(
    ws: ExtendedWebSocket,
    data: { gameMode: string; metadata?: Record<string, any> }
): Promise<void> {
    if (!ws.playerId || !ws.realm) {
        ws.send(JSON.stringify({
            type: 'analytics:startGameMode:error',
            error: 'Not authenticated'
        }));
        return;
    }

    try {
        const sessionId = await gameModeAnalyticsService.startGameModeSession(
            ws.playerId,
            data.gameMode,
            ws.realm,
            data.metadata
        );

        ws.send(JSON.stringify({
            type: 'analytics:startGameMode:success',
            sessionId
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:startGameMode:error',
            error: error.message
        }));
    }
}

export async function handleEndGameMode(
    ws: ExtendedWebSocket,
    data?: { outcome?: 'win' | 'loss' | 'draw' | 'abandoned'; score?: number }
): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'analytics:endGameMode:error',
            error: 'Not authenticated'
        }));
        return;
    }

    try {
        await gameModeAnalyticsService.endGameModeSession(
            ws.playerId,
            data?.outcome,
            data?.score
        );

        ws.send(JSON.stringify({
            type: 'analytics:endGameMode:success'
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:endGameMode:error',
            error: error.message
        }));
    }
}

export async function handleGetGameModeStats(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'analytics:getGameModeStats:error',
            error: 'Not authenticated'
        }));
        return;
    }

    try {
        const stats = await gameModeAnalyticsService.getGameModeStats(ws.playerId);

        ws.send(JSON.stringify({
            type: 'analytics:getGameModeStats:result',
            stats
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:getGameModeStats:error',
            error: error.message
        }));
    }
}

// ============================================
// AMBIENT MODE HANDLERS
// ============================================

export async function handleStartAmbientMode(
    ws: ExtendedWebSocket,
    data: {
        mode: 'zen' | 'aurora' | 'stargazing' | 'campfire' | 'custom';
        settings?: { musicTrack?: string; visualPreset?: string; particleDensity?: number };
    }
): Promise<void> {
    if (!ws.playerId || !ws.realm) {
        ws.send(JSON.stringify({
            type: 'analytics:startAmbient:error',
            error: 'Not authenticated'
        }));
        return;
    }

    try {
        const sessionId = await gameModeAnalyticsService.startAmbientSession(
            ws.playerId,
            data.mode,
            ws.realm,
            data.settings
        );

        ws.send(JSON.stringify({
            type: 'analytics:startAmbient:success',
            sessionId
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:startAmbient:error',
            error: error.message
        }));
    }
}

export async function handleEndAmbientMode(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'analytics:endAmbient:error',
            error: 'Not authenticated'
        }));
        return;
    }

    try {
        await gameModeAnalyticsService.endAmbientSession(ws.playerId);

        ws.send(JSON.stringify({
            type: 'analytics:endAmbient:success'
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:endAmbient:error',
            error: error.message
        }));
    }
}

export async function handleGetAmbientStats(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'analytics:getAmbientStats:error',
            error: 'Not authenticated'
        }));
        return;
    }

    try {
        const stats = await gameModeAnalyticsService.getAmbientStats(ws.playerId);

        ws.send(JSON.stringify({
            type: 'analytics:getAmbientStats:result',
            stats
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:getAmbientStats:error',
            error: error.message
        }));
    }
}

// ============================================
// GLOBAL ANALYTICS (Admin)
// ============================================

export async function handleGetGlobalGameModeStats(ws: ExtendedWebSocket): Promise<void> {
    // In production, check if user is admin
    try {
        const stats = await gameModeAnalyticsService.getGlobalGameModeStats();

        ws.send(JSON.stringify({
            type: 'analytics:getGlobalGameModeStats:result',
            stats
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:getGlobalGameModeStats:error',
            error: error.message
        }));
    }
}

export async function handleGetGlobalAmbientStats(ws: ExtendedWebSocket): Promise<void> {
    // In production, check if user is admin
    try {
        const stats = await gameModeAnalyticsService.getGlobalAmbientStats();

        ws.send(JSON.stringify({
            type: 'analytics:getGlobalAmbientStats:result',
            stats
        }));
    } catch (error: any) {
        ws.send(JSON.stringify({
            type: 'analytics:getGlobalAmbientStats:error',
            error: error.message
        }));
    }
}

export default {
    handleGetPreferences,
    handleUpdatePreferences,
    handleUpdateVisualFilters,
    handleStartGameMode,
    handleEndGameMode,
    handleGetGameModeStats,
    handleStartAmbientMode,
    handleEndAmbientMode,
    handleGetAmbientStats,
    handleGetGlobalGameModeStats,
    handleGetGlobalAmbientStats
};
