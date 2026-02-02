// WebSocket client for real-time multiplayer communication
import { EventBus } from '../systems/EventBus';
import type { Player, RealmId } from '../types';

interface WebSocketMessage {
    type: 'player_update' | 'player_leave' | 'player_joined' | 'players_list' | 'whisper' | 'sing' | 'pulse' | 'emote' | 'echo' | 'echo_ignite' | 'echo_ignited' | 'star_lit' | 'pong' | 'error' | 'world_state' | 'connection_made' | 'player_data' | 'xp_gain' | 'friend_added' | 'friend_removed' | 'teleport_success' | 'voice_signal' | 'cooldown' | 'add_friend' | 'remove_friend' | 'teleport_to_friend' | 'speaking';
    data: any;
    timestamp: number;
}

interface ConnectionOptions {
    url: string;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    heartbeatInterval?: number;
}

/**
 * WebSocket client for real-time multiplayer synchronization
 * Replaces HTTP polling with persistent connection
 */
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectAttempts: number;
    private maxReconnectAttempts: number;
    private reconnectDelay: number;
    private heartbeatInterval: number;
    private heartbeatTimer: number | null = null;
    private reconnectTimer: number | null = null;
    private messageQueue: WebSocketMessage[] = [];
    private isConnecting: boolean = false;

    private playerId: string = '';
    private currentRealm: RealmId = 'genesis';

    constructor(options: ConnectionOptions) {
        this.url = options.url;
        this.maxReconnectAttempts = options.reconnectAttempts || 5;
        this.reconnectAttempts = 0;
        this.reconnectDelay = options.reconnectDelay || 1000;
        this.heartbeatInterval = options.heartbeatInterval || 30000;
    }

    /**
     * Connect to WebSocket server
     */
    connect(playerId: string, realm: RealmId): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                resolve(true);
                return;
            }

            if (this.isConnecting) {
                resolve(false);
                return;
            }

            this.isConnecting = true;
            this.playerId = playerId;
            this.currentRealm = realm;

            try {
                const wsUrl = `${this.url}?playerId=${playerId}&realm=${realm}`;
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('🔌 WebSocket connected');
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.flushMessageQueue();
                    EventBus.emit('network:connected');
                    resolve(true);
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    EventBus.emit('network:error', { error: new Error('WebSocket connection error') });
                };

                this.ws.onclose = (event) => {
                    console.log('🔌 WebSocket disconnected:', event.code, event.reason);
                    this.isConnecting = false;
                    this.stopHeartbeat();
                    EventBus.emit('network:disconnected');

                    if (!event.wasClean) {
                        this.attemptReconnect();
                    }
                };
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                this.isConnecting = false;
                resolve(false);
            }
        });
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.stopHeartbeat();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
    }

    /**
     * Send player position update
     */
    sendPlayerUpdate(player: Player): void {
        this.send({
            type: 'player_update',
            data: {
                id: player.id,
                name: player.name,
                x: Math.round(player.x),
                y: Math.round(player.y),
                hue: player.hue,
                xp: player.xp,
                stars: player.stars,
                echoes: player.echoes,
                singing: player.singing,
                pulsing: player.pulsing,
                emoting: player.emoting,
                realm: this.currentRealm
            },
            timestamp: Date.now()
        });
    }

    /**
     * Send whisper message
     */
    sendWhisper(player: Player, text: string, targetId?: string): void {
        this.send({
            type: 'whisper',
            data: {
                from: player.id,
                fromName: player.name,
                text,
                targetId,
                x: Math.round(player.x),
                y: Math.round(player.y),
                realm: this.currentRealm
            },
            timestamp: Date.now()
        });
    }

    /**
     * Send sing action
     */
    sendSing(player: Player): void {
        this.send({
            type: 'sing',
            data: {
                playerId: player.id,
                playerName: player.name,
                x: Math.round(player.x),
                y: Math.round(player.y),
                hue: player.hue,
                realm: this.currentRealm
            },
            timestamp: Date.now()
        });
    }

    /**
     * Send pulse action
     */
    sendPulse(player: Player): void {
        this.send({
            type: 'pulse',
            data: {
                playerId: player.id,
                playerName: player.name,
                x: Math.round(player.x),
                y: Math.round(player.y),
                realm: this.currentRealm
            },
            timestamp: Date.now()
        });
    }

    /**
     * Send emote action
     */
    sendEmote(player: Player, emoji: string): void {
        this.send({
            type: 'emote',
            data: {
                playerId: player.id,
                playerName: player.name,
                emoji,
                x: Math.round(player.x),
                y: Math.round(player.y),
                realm: this.currentRealm
            },
            timestamp: Date.now()
        });
    }

    /**
     * Send echo creation
     */
    sendEcho(player: Player, text: string): void {
        this.send({
            type: 'echo',
            data: {
                playerId: player.id,
                playerName: player.name,
                text,
                x: Math.round(player.x),
                y: Math.round(player.y),
                hue: player.hue,
                realm: this.currentRealm
            },
            timestamp: Date.now()
        });
    }

    /**
     * Ignite (like) an echo
     */
    igniteEcho(echoId: string): void {
        this.send({
            type: 'echo_ignite',
            data: { echoId },
            timestamp: Date.now()
        });
    }

    /**
     * Send star lit event
     */
    sendStarLit(player: Player, starIds: string[]): void {
        this.send({
            type: 'star_lit',
            data: {
                playerId: player.id,
                starIds,
                x: Math.round(player.x),
                y: Math.round(player.y),
                realm: this.currentRealm
            },
            timestamp: Date.now()
        });
    }

    /**
     * Add a friend (synced to server)
     */
    addFriend(friendId: string, friendName: string): void {
        this.send({
            type: 'add_friend',
            data: { friendId, friendName },
            timestamp: Date.now()
        });
    }

    /**
     * Remove a friend (synced to server)
     */
    removeFriend(friendId: string): void {
        this.send({
            type: 'remove_friend',
            data: { friendId },
            timestamp: Date.now()
        });
    }

    /**
     * Request teleport to friend (server-validated)
     */
    teleportToFriend(friendId: string): void {
        this.send({
            type: 'teleport_to_friend',
            data: { friendId },
            timestamp: Date.now()
        });
    }

    /**
     * Send WebRTC voice signaling data
     */
    sendVoiceSignal(targetId: string, signalType: string, signalData: any): void {
        this.send({
            type: 'voice_signal',
            data: { targetId, signalType, signalData },
            timestamp: Date.now()
        });
    }

    /**
     * Get player ID
     */
    getPlayerId(): string {
        return this.playerId;
    }
    /**
     * Change realm
     */
    changeRealm(newRealm: RealmId): void {
        this.currentRealm = newRealm;
        this.send({
            type: 'player_update',
            data: {
                id: this.playerId,
                realm: newRealm,
                realmChange: true
            },
            timestamp: Date.now()
        });
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Send message through WebSocket
     */
    send(message: WebSocketMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for when connection is restored
            this.messageQueue.push(message);
            if (this.messageQueue.length > 100) {
                this.messageQueue.shift(); // Prevent queue overflow
            }
        }
    }

    /**
     * Flush queued messages
     */
    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const message = this.messageQueue.shift();
            if (message) {
                this.ws.send(JSON.stringify(message));
            }
        }
    }

    /**
     * Handle incoming message
     */
    private handleMessage(rawData: string): void {
        try {
            const message: WebSocketMessage = JSON.parse(rawData);

            switch (message.type) {
                case 'world_state':
                    // SERVER-AUTHORITATIVE: This is the primary way to receive all entities
                    this.handleWorldState(message.data);
                    break;
                case 'player_update':
                    this.handlePlayerUpdate(message.data);
                    break;
                case 'player_leave':
                    EventBus.emit('network:playerLeft', { playerId: message.data.playerId });
                    break;
                case 'player_joined':
                    console.log(`🌟 Player joined: ${message.data.playerId}`);
                    break;
                case 'players_list':
                    this.handlePlayersList(message.data);
                    break;
                case 'whisper':
                    this.handleWhisper(message.data);
                    break;
                case 'sing':
                    this.handleSing(message.data);
                    break;
                case 'pulse':
                    this.handlePulse(message.data);
                    break;
                case 'emote':
                    this.handleEmote(message.data);
                    break;
                case 'echo':
                    this.handleEcho(message.data);
                    break;
                case 'echo_ignited':
                    this.handleEchoIgnited(message.data);
                    break;
                case 'star_lit':
                    this.handleStarLit(message.data);
                    break;
                case 'connection_made':
                    this.handleConnectionMade(message.data);
                    break;
                case 'player_data':
                    this.handlePlayerData(message.data);
                    break;
                case 'xp_gain':
                    this.handleXpGain(message.data);
                    break;
                case 'friend_added':
                    EventBus.emit('network:friendAdded', message.data);
                    break;
                case 'friend_removed':
                    EventBus.emit('network:friendRemoved', message.data);
                    break;
                case 'teleport_success':
                    EventBus.emit('network:teleportSuccess', message.data);
                    break;
                case 'voice_signal':
                    EventBus.emit('network:voiceSignal', message.data);
                    break;
                case 'cooldown':
                    EventBus.emit('network:cooldown', message.data);
                    break;
                case 'pong':
                    // Server responded to ping - calculate latency (inspiration3)
                    if (message.data?.timestamp) {
                        const latency = Date.now() - message.data.timestamp;
                        EventBus.emit('network:latency', { latency });
                    }
                    break;
                case 'error':
                    console.error('Server error:', message.data);
                    EventBus.emit('network:error', { error: new Error(message.data.message) });
                    break;
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    /**
     * Handle player data loaded from server
     */
    private handlePlayerData(data: any): void {
        EventBus.emit('network:playerData', {
            id: data.id,
            name: data.name,
            hue: data.hue,
            xp: data.xp,
            level: data.level,
            stars: data.stars,
            echoes: data.echoes,
            sings: data.sings || 0,
            pulses: data.pulses || 0,
            emotes: data.emotes || 0,
            teleports: data.teleports || 0,
            achievements: data.achievements || [],
            friends: data.friends || [],
            lastRealm: data.lastRealm,
            lastPosition: data.lastPosition
        });
    }

    /**
     * Handle XP gain from server (authoritative)
     */
    private handleXpGain(data: any): void {
        EventBus.emit('network:xpGain', {
            amount: data.amount,
            reason: data.reason,
            newXp: data.newXp,
            newLevel: data.newLevel,
            leveledUp: data.leveledUp
        });
    }

    /**
     * Handle server-authoritative world state
     * This replaces ALL entities with what the server says
     */
    private handleWorldState(data: any): void {
        // Emit world state event - the game should replace its entity list with this
        EventBus.emit('network:worldState', {
            entities: data.entities || [],
            litStars: data.litStars || [],
            echoes: data.echoes || [],
            linkedCount: data.linkedCount || 0,  // Number of significant bonds
            timestamp: data.timestamp
        });
    }

    private handlePlayersList(data: any): void {
        // Handle initial list of players when joining realm
        if (data.players && Array.isArray(data.players)) {
            for (const p of data.players) {
                EventBus.emit('network:playerJoined', { player: p });
            }
        }
    }

    private handlePlayerUpdate(data: any): void {
        // Emit update for ALL players including self (server-authoritative)
        EventBus.emit('network:playerUpdate', {
            player: {
                id: data.id,
                name: data.name,
                x: data.x,
                y: data.y,
                hue: data.hue,
                xp: data.xp || 0,
                stars: data.stars || 0,
                echoes: data.echoes || 0,
                singing: data.singing || 0,
                pulsing: data.pulsing || 0,
                emoting: data.emoting,
                born: data.born || Date.now()
            },
            isSelf: data.id === this.playerId
        });
    }

    private handleWhisper(data: any): void {
        // Emit whisper event with full data for game to handle
        EventBus.emit('network:whisper', {
            from: data.from,
            fromName: data.fromName,
            text: data.text,
            targetId: data.targetId,
            x: data.x,
            y: data.y
        });
    }

    private handleSing(data: any): void {
        // Server broadcast - trigger sing effect for this player (including self!)
        EventBus.emit('network:sing', {
            playerId: data.playerId,
            playerName: data.playerName,
            x: data.x,
            y: data.y,
            hue: data.hue,
            isSelf: data.playerId === this.playerId
        });
    }

    private handlePulse(data: any): void {
        // Server broadcast - trigger pulse effect for this player (including self!)
        EventBus.emit('network:pulse', {
            playerId: data.playerId,
            playerName: data.playerName,
            x: data.x,
            y: data.y,
            isSelf: data.playerId === this.playerId
        });
    }

    private handleEmote(data: any): void {
        // Server broadcast - trigger emote for this player (including self!)
        EventBus.emit('network:emote', {
            playerId: data.playerId,
            playerName: data.playerName,
            emoji: data.emoji,
            x: data.x,
            y: data.y,
            isSelf: data.playerId === this.playerId
        });
    }

    private handleEcho(data: any): void {
        // Server broadcast - create echo for all (including self!)
        EventBus.emit('network:echo', {
            playerId: data.playerId,
            playerName: data.playerName,
            text: data.text,
            x: data.x,
            y: data.y,
            hue: data.hue,
            echoId: data.echoId,
            ignited: data.ignited,
            isSelf: data.playerId === this.playerId
        });
    }

    private handleStarLit(data: any): void {
        // Server broadcast - light star for all (including self!)
        EventBus.emit('network:starLit', {
            playerId: data.playerId,
            starIds: data.starIds,
            x: data.x,
            y: data.y,
            isSelf: data.playerId === this.playerId
        });
    }

    private handleEchoIgnited(data: any): void {
        EventBus.emit('network:echoIgnited', {
            echoId: data.echoId,
            ignited: data.ignited,
            ignitedBy: data.ignitedBy
        });
    }

    private handleConnectionMade(data: any): void {
        // Server notification that a significant bond was formed
        EventBus.emit('network:connectionMade', {
            player1Id: data.player1Id,
            player1Name: data.player1Name,
            player2Id: data.player2Id,
            player2Name: data.player2Name,
            isSelf: data.player1Id === this.playerId || data.player2Id === this.playerId
        });
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatTimer = window.setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
        }, this.heartbeatInterval);
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            return;
        }

        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = window.setTimeout(() => {
            this.connect(this.playerId, this.currentRealm);
        }, delay);
    }
}
