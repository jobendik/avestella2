// =============================================================================
// Seek Mode Handlers - WebSocket handlers for hide and seek game mode
// =============================================================================
// Phase 1.6: Seek Mode Server Validation
// =============================================================================

import { WebSocket } from 'ws';
import { seekModeService, ISeekGameSession } from '../../services/SeekModeService.js';

interface ExtendedWebSocket extends WebSocket {
    playerId?: string;
    playerName?: string;
    realm?: string;
}

// ============================================
// MESSAGE HANDLERS
// ============================================

export async function handleCreateSeekGame(
    ws: ExtendedWebSocket,
    data: {
        centerX: number;
        centerY: number;
        settings?: Partial<ISeekGameSession['settings']>;
    }
): Promise<void> {
    if (!ws.playerId || !ws.realm) {
        ws.send(JSON.stringify({
            type: 'seek:createGame:error',
            error: 'Not authenticated'
        }));
        return;
    }

    const session = await seekModeService.createGame(
        ws.playerId,
        ws.playerName || 'Unknown',
        ws.realm,
        data.centerX,
        data.centerY,
        data.settings
    );

    if (!session) {
        ws.send(JSON.stringify({
            type: 'seek:createGame:error',
            error: 'Already in a game or failed to create'
        }));
        return;
    }

    ws.send(JSON.stringify({
        type: 'seek:createGame:success',
        gameId: session.gameId,
        session: sanitizeSession(session)
    }));
}

export async function handleJoinSeekGame(
    ws: ExtendedWebSocket,
    data: { gameId: string }
): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'seek:joinGame:error',
            error: 'Not authenticated'
        }));
        return;
    }

    const result = await seekModeService.joinGame(
        data.gameId,
        ws.playerId,
        ws.playerName || 'Unknown'
    );

    if (!result.success) {
        ws.send(JSON.stringify({
            type: 'seek:joinGame:error',
            error: result.error
        }));
        return;
    }

    ws.send(JSON.stringify({
        type: 'seek:joinGame:success',
        gameId: data.gameId,
        session: sanitizeSession(result.session!)
    }));
}

export async function handleStartSeekGame(
    ws: ExtendedWebSocket,
    data: { gameId: string }
): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'seek:startGame:error',
            error: 'Not authenticated'
        }));
        return;
    }

    const result = await seekModeService.startGame(data.gameId, ws.playerId);

    if (!result.success) {
        ws.send(JSON.stringify({
            type: 'seek:startGame:error',
            error: result.error
        }));
        return;
    }

    ws.send(JSON.stringify({
        type: 'seek:startGame:success',
        gameId: data.gameId
    }));
}

export async function handleConfirmHiding(
    ws: ExtendedWebSocket,
    data: { gameId: string; x: number; y: number }
): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'seek:confirmHiding:error',
            error: 'Not authenticated'
        }));
        return;
    }

    const result = await seekModeService.confirmHidingPosition(
        data.gameId,
        ws.playerId,
        data.x,
        data.y
    );

    if (!result.success) {
        ws.send(JSON.stringify({
            type: 'seek:confirmHiding:error',
            error: result.error
        }));
        return;
    }

    ws.send(JSON.stringify({
        type: 'seek:confirmHiding:success'
    }));
}

export async function handleAttemptFind(
    ws: ExtendedWebSocket,
    data: { gameId: string; targetX: number; targetY: number }
): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'seek:attemptFind:error',
            error: 'Not authenticated'
        }));
        return;
    }

    const result = await seekModeService.attemptFind(
        data.gameId,
        ws.playerId,
        data.targetX,
        data.targetY
    );

    if (!result.success) {
        ws.send(JSON.stringify({
            type: 'seek:attemptFind:error',
            error: result.error
        }));
        return;
    }

    ws.send(JSON.stringify({
        type: 'seek:attemptFind:result',
        found: result.found,
        playerId: result.playerId,
        playerName: result.playerName
    }));
}

export async function handleLeaveSeekGame(
    ws: ExtendedWebSocket
): Promise<void> {
    if (!ws.playerId) return;

    await seekModeService.leaveGame(ws.playerId);

    ws.send(JSON.stringify({
        type: 'seek:leaveGame:success'
    }));
}

export async function handleGetActiveSeekGames(
    ws: ExtendedWebSocket
): Promise<void> {
    if (!ws.realm) {
        ws.send(JSON.stringify({
            type: 'seek:getGames:error',
            error: 'No realm'
        }));
        return;
    }

    const games = await seekModeService.getActiveGames(ws.realm);

    ws.send(JSON.stringify({
        type: 'seek:getGames:result',
        games: games.map(sanitizeSession)
    }));
}

export async function handleGetSeekHistory(
    ws: ExtendedWebSocket,
    data?: { limit?: number }
): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'seek:getHistory:error',
            error: 'Not authenticated'
        }));
        return;
    }

    const history = await seekModeService.getGameHistory(
        ws.playerId,
        data?.limit || 10
    );

    ws.send(JSON.stringify({
        type: 'seek:getHistory:result',
        history: history.map(sanitizeSession)
    }));
}

export async function handleGetCurrentSeekGame(
    ws: ExtendedWebSocket
): Promise<void> {
    if (!ws.playerId) {
        ws.send(JSON.stringify({
            type: 'seek:getCurrent:error',
            error: 'Not authenticated'
        }));
        return;
    }

    const session = seekModeService.getPlayerGame(ws.playerId);

    ws.send(JSON.stringify({
        type: 'seek:getCurrent:result',
        session: session ? sanitizeSession(session) : null
    }));
}

// ============================================
// EVENT BROADCASTING
// ============================================

export function setupSeekModeEventListeners(
    broadcastToRealm: (realm: string, message: any) => void,
    broadcastToPlayers: (playerIds: string[], message: any) => void
): void {
    seekModeService.on('game_created', (session: ISeekGameSession) => {
        broadcastToRealm(session.realm, {
            type: 'seek:gameCreated',
            gameId: session.gameId,
            hostName: session.hostName,
            maxPlayers: session.settings.maxPlayers,
            currentPlayers: 1
        });
    });

    seekModeService.on('player_joined', ({ gameId, playerId, playerName }: { gameId: string; playerId: string; playerName: string }) => {
        const session = seekModeService.getPlayerGame(playerId);
        if (!session) return;

        const allPlayerIds = [session.seekerId!, ...session.hiders.map((h: any) => h.playerId)];
        broadcastToPlayers(allPlayerIds, {
            type: 'seek:playerJoined',
            gameId,
            playerId,
            playerName,
            currentPlayers: session.hiders.length + 1
        });
    });

    seekModeService.on('game_started', ({ gameId, phase, endsAt }: { gameId: string; phase: string; endsAt: Date }) => {
        // Get game from service and broadcast to all players
        // For now, broadcast will be handled by caller
    });

    seekModeService.on('seeking_started', ({ gameId, endsAt }: { gameId: string; endsAt: Date }) => {
        // Broadcast seeking phase start
    });

    seekModeService.on('hider_found', ({ gameId, hiderId, hiderName, seekerId }: { gameId: string; hiderId: string; hiderName: string; seekerId: string }) => {
        // Broadcast to all players in game
    });

    seekModeService.on('hint', ({ gameId, direction, remainingHiders }: { gameId: string; direction: string; remainingHiders: number }) => {
        // Send hint to seeker
    });

    seekModeService.on('game_ended', ({ gameId, reason, results }: { gameId: string; reason: string; results: any }) => {
        // Broadcast game results to all players
    });

    seekModeService.on('player_left', ({ gameId, playerId }: { gameId: string; playerId: string }) => {
        // Notify remaining players
    });
}

// ============================================
// HELPERS
// ============================================

function sanitizeSession(session: ISeekGameSession): any {
    return {
        gameId: session.gameId,
        realm: session.realm,
        state: session.state,
        hostId: session.hostId,
        hostName: session.hostName,
        seekerName: session.seekerName,
        hiders: session.hiders.map((h: any) => ({
            playerId: h.playerId,
            playerName: h.playerName,
            hidden: h.hidden,
            found: !!h.foundAt
        })),
        settings: session.settings,
        startedAt: session.startedAt,
        hidingEndsAt: session.hidingEndsAt,
        endsAt: session.endsAt,
        results: session.results
    };
}

export default {
    handleCreateSeekGame,
    handleJoinSeekGame,
    handleStartSeekGame,
    handleConfirmHiding,
    handleAttemptFind,
    handleLeaveSeekGame,
    handleGetActiveSeekGames,
    handleGetSeekHistory,
    handleGetCurrentSeekGame,
    setupSeekModeEventListeners
};
