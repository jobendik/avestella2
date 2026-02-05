import { EventEmitter } from './EventEmitter';

export type RealmId = 'genesis' | 'nebula' | 'void' | 'starforge' | 'sanctuary' | 'abyss' | 'crystal' | 'celestial' | 'tagarena';

interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: number;
}

interface PlayerUpdate {
    id: string;
    name: string;
    x: number;
    y: number;
    hue: number;
    xp: number;
    realm: RealmId;
    // ... add other fields as needed
}

class GameClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private isConnecting: boolean = false;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private playerId: string = '';
    private realm: RealmId = 'genesis';
    private url: string = 'ws://localhost:3001/ws'; // Default to local dev

    // Network stats tracking
    private _latency: number = 0;
    private _nearbyPlayerCount: number = 0;
    private lastPingTime: number = 0;

    constructor() {
        super();
        // Detect production vs dev
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // Production URL - always use avestella.com
            this.url = `wss://avestella.com/ws`;
        }
    }

    /**
     * Get current latency in milliseconds (based on ping/pong roundtrip)
     */
    public getLatency(): number {
        return this._latency;
    }

    /**
     * Get current nearby player count
     */
    public getNearbyPlayerCount(): number {
        return this._nearbyPlayerCount;
    }

    /**
     * Get the current player ID
     */
    public getPlayerId(): string {
        return this.playerId;
    }

    /**
     * Get the current realm
     */
    public getRealm(): RealmId {
        return this.realm;
    }

    public connect(playerId: string, realm: RealmId) {
        if (this.ws?.readyState === WebSocket.OPEN) return;
        if (this.isConnecting) return;

        this.playerId = playerId;
        this.realm = realm;
        this.isConnecting = true;

        try {
            this.ws = new WebSocket(`${this.url}?playerId=${playerId}&realm=${realm}`);

            this.ws.onopen = () => {
                console.log('🔌 Connected to Game Server');
                this.isConnecting = false;
                this.startHeartbeat();
                this.emit('connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data) as WebSocketMessage;
                    this.handleMessage(msg);
                } catch (e) {
                    console.error('Failed to parse WS message', e);
                }
            };

            this.ws.onclose = () => {
                console.log('🔌 Disconnected from Game Server');
                this.isConnecting = false;
                this.stopHeartbeat();
                this.emit('disconnected');
                this.attemptReconnect();
            };

            this.ws.onerror = (err) => {
                console.error('WS Error', err);
                this.isConnecting = false;
            };

        } catch (e) {
            console.error('Failed to create WebSocket', e);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    public disconnect() {
        this.stopHeartbeat();
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.ws?.close();
        this.ws = null;
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public sendPlayerUpdate(data: Partial<PlayerUpdate>) {
        this.send('player_update', {
            ...data,
            id: this.playerId,
            realm: this.realm
        });
    }

    /**
     * Request to collect a fragment (server validates and confirms)
     */
    public collectFragment(fragmentId: string) {
        this.send('collect_fragment', {
            fragmentId,
            playerId: this.playerId,
            realm: this.realm
        });
    }

    public sendAction(type: 'sing' | 'pulse' | 'emote', data: any) {
        console.log(`🔵 [GameClient] sendAction type=${type}`, { playerId: this.playerId, realm: this.realm, data });
        this.send(type, {
            ...data,
            playerId: this.playerId,
            realm: this.realm
        });
    }

    public sendChat(text: string) {
        console.log(`🔵 [GameClient] sendChat text="${text}"`, { playerId: this.playerId, realm: this.realm });
        this.send('chat', {
            message: text,
            playerId: this.playerId,
            realm: this.realm
        });
    }

    public lightBeacon(beaconId: string) {
        this.send('light_beacon', { beaconId });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROGRESSION SYSTEM METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Request full progression data from server
     */
    public requestProgression() {
        this.send('request_progression', {});
    }

    /**
     * Report challenge progress to server
     */
    public updateChallengeProgress(type: string, amount: number) {
        this.send('challenge_progress', { type, amount });
    }

    public claimChallengeReward(challengeId: string) {
        this.send('claim_challenge_reward', { challengeId });
    }

    public rerollChallenge(challengeId: string) {
        this.send('reroll_challenge', { challengeId });
    }

    /**
     * Claim daily login reward
     */
    public claimDailyReward() {
        this.send('claim_daily_reward', {});
    }

    /**
     * Send a gift to another player
     */
    public sendGift(toPlayerId: string, giftType: string, message?: string) {
        this.send('send_gift', { toPlayerId, giftType, message });
    }

    /**
     * Claim a received gift
     */
    public claimGift(giftId: string) {
        this.send('claim_gift', { giftId });
    }

    /**
     * Guild actions
     */
    public createGuild(name: string, description?: string) {
        this.send('guild_action', { action: 'create', guildName: name, guildDescription: description });
    }

    public joinGuild(guildId: string) {
        this.send('guild_action', { action: 'join', guildId });
    }

    public leaveGuild(guildId: string) {
        this.send('guild_action', { action: 'leave', guildId });
    }

    public listGuilds() {
        this.send('guild_action', { action: 'list' });
    }

    public requestGuildInfo(guildId?: string) {
        this.send('guild_action', { action: 'info', guildId });
    }

    public contributeToGuild(type: 'stardust' | 'xp' | 'challenges', amount: number, guildId?: string) {
        this.send('guild_action', {
            action: 'contribute',
            contributionType: type,
            amount,
            guildId
        });
    }

    public requestWorldState() {
        this.send('request_world_state', {});
    }

    public requestWorldEvents() {
        this.send('request_world_events', {});
    }

    /**
     * Send a guild action (create, claim_gift, get_gifts, etc.)
     */
    public sendGuildAction(action: string, data: Record<string, any> = {}) {
        this.send('guild_action', { action, ...data });
    }

    /**
     * Update event progress
     */
    public updateEventProgress(type: 'fragment' | 'beacon' | 'bond', amount: number = 1) {
        this.send('update_event_progress', { type, amount });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PLAYER DATA SYNC METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Request full player data from server
     */
    public requestPlayerData() {
        this.send('request_player_data', {});
    }

    /**
     * Sync partial player data updates
     */
    public syncPlayerData(updates: any) {
        this.send('sync_player_data', updates);
    }

    /**
     * Update player settings
     */
    public updateSettings(settings: any) {
        this.send('update_settings', settings);
    }

    /**
     * Update player cosmetics
     */
    public updateCosmetics(cosmetics: any) {
        this.send('update_cosmetics', cosmetics);
    }

    public purchaseCosmetic(id: string, price: number) {
        this.send('purchase_cosmetic', { id, price });
    }



    /**
     * Update exploration data
     */
    public updateExploration(exploration: any) {
        this.send('update_exploration', exploration);
    }

    /**
     * Update quest progress
     */
    public updateQuest(questData: any) {
        this.send('update_quest', questData);
    }

    /**
     * Track a stat increment
     */
    public trackStat(stat: string, amount: number = 1) {
        this.send('track_stat', { stat, amount });
    }

    /**
     * Add an achievement
     */
    public addAchievement(achievementId: string) {
        this.send('add_achievement', { achievementId });
    }

    /**
     * Process daily login
     */
    public processDailyLogin() {
        this.send('daily_login', {});
    }

    /**
     * Generic send method (public for custom messages)
     */
    public sendMessage(type: string, data: any) {
        this.send(type, data);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VOICE SYSTEM METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Send a WebRTC signaling message
     */
    public sendVoiceSignal(targetId: string, signalType: string, signalData: any) {
        this.send('voice_signal', {
            targetId,
            signalType,
            signal: signalData
        });
    }

    /**
     * Update speaking state
     */
    public setSpeaking(speaking: boolean) {
        this.send('voice_speaking', { speaking });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPANION SYSTEM METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    public purchaseCompanion(companionId: string) {
        this.send('purchase_companion', { companionId });
    }

    public equipCompanion(companionId: string | null) {
        this.send('equip_companion', { companionId });
    }

    public requestCompanionData() {
        this.send('request_companion_data', {});
    }

    public claimConstellationReward(constellationId: string) {
        this.send('claim_constellation_reward', { constellationId });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PET SYSTEM METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    public adoptPet(petId: string) {
        this.send('adopt_pet', { petId });
    }

    public equipPet(petId: string | null) {
        this.send('equip_pet', { petId });
    }

    public feedPet(petId: string) {
        this.send('feed_pet', { petId });
    }

    public playWithPet(petId: string) {
        this.send('play_pet', { petId });
    }

    public getPetDetails(petId: string) {
        this.send('get_pet_details', { petId });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POWER-UP SYSTEM METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    public collectPowerUp(powerUpId: string, x: number, y: number) {
        this.send('collect_power_up', { powerUpId, x, y });
    }

    public requestPowerUps() {
        this.send('request_power_ups', {});
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAG GAME METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    public createTagGame() {
        this.send('tag_create', {});
    }

    public joinTagGame(sessionId: string) {
        this.send('tag_join', { sessionId });
    }

    public attemptTag(targetId: string, sessionId: string) {
        this.send('tag_attempt', { targetId, sessionId });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SOCIAL SYSTEM METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Add a friend (Bidirectional, immediate)
     */
    public addFriend(friendId: string, friendName: string) {
        this.send('add_friend', { friendId, friendName });
    }

    /**
     * Remove a friend
     */
    public removeFriend(friendId: string) {
        this.send('remove_friend', { friendId });
    }

    /**
     * Teleport to a friend
     */
    public teleportToFriend(friendId: string) {
        this.send('teleport_to_friend', { friendId });
    }

    /**
     * Send a direct message (whisper)
     */
    public sendDirectMessage(targetId: string, text: string) {
        this.send('whisper', { targetId, text });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SNAPSHOT SYSTEM METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════════════
    // BOND SYSTEM METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get bond with a specific player
     */
    public getBond(targetId: string) {
        this.send('get_bond', { targetId });
    }

    /**
     * Get all player's bonds
     */
    public getAllBonds() {
        this.send('get_all_bonds', {});
    }

    /**
     * Create/strengthen bond interaction with another player
     */
    public createBondInteraction(targetId: string, interactionType: 'proximity' | 'chat' | 'gift' | 'pulse' | 'constellation') {
        this.send('bond_interaction', { targetId, interactionType });
    }

    /**
     * Add a shared memory to a bond
     */
    public addBondMemory(targetId: string, memoryText: string) {
        this.send('add_bond_memory', { targetId, memoryText });
    }

    /**
     * Seal a bond with another player (both must submit a word)
     */
    public sealBond(targetId: string, sealWord: string) {
        this.send('seal_bond', { targetId, sealWord });
    }

    /**
     * Get player's star memories
     */
    public getStarMemories() {
        this.send('get_star_memories', {});
    }

    /**
     * Get realm's star memories (public stars)
     */
    public getRealmStars(realmId?: string, limit: number = 100) {
        this.send('get_realm_stars', { realmId, limit });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SNAPSHOT SYSTEM METHODS (Continued)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Send snapshot metadata to server
     */
    public sendSnapshot(metadata: {
        x: number;
        y: number;
        realm: string;
        visiblePlayers?: string[];
        visibleEntities?: string[];
        caption?: string;
    }) {
        this.send('snapshot_taken', metadata);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMMUNICATION SYNC METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Sync communication preferences to server (friends, blocked, favorite emotes)
     */
    public syncCommunication(data: {
        friends?: string[];
        blocked?: string[];
        favoriteEmotes?: string[];
        chatEnabled?: boolean;
        signalsEnabled?: boolean;
    }) {
        this.send('sync_communication', data);
    }

    /**
     * Request communication data from server
     */
    public requestCommunication() {
        this.send('request_communication', {});
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAP MARKER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Place a map marker visible to friends
     */
    public placeMapMarker(marker: {
        x: number;
        y: number;
        realm: string;
        label?: string;
        icon?: string;
        expiresIn?: number; // seconds, defaults to 300 (5 min)
    }) {
        this.send('place_map_marker', marker);
    }

    /**
     * Remove a map marker
     */
    public removeMapMarker(markerId: string) {
        this.send('remove_map_marker', { markerId });
    }

    /**
     * Request friend markers for current realm
     */
    public requestFriendMarkers(realm: string) {
        this.send('request_friend_markers', { realm });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SEASON PASS METHODS (Phase 1)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get current season info
     */
    public getSeasonInfo() {
        this.send('season:getInfo', {});
    }

    /**
     * Get player's season progress
     */
    public getSeasonProgress() {
        this.send('season:getProgress', {});
    }

    /**
     * Add season XP
     */
    public addSeasonXP(xp: number, source?: string) {
        this.send('season:addXP', { xp, source });
    }

    /**
     * Claim a season tier reward
     */
    public claimSeasonTierReward(tier: number, claimPremium: boolean = false) {
        this.send('season:claimReward', { tier, claimPremium });
    }

    /**
     * Claim all available season rewards
     */
    public claimAllSeasonRewards() {
        this.send('season:claimAll', {});
    }

    /**
     * Upgrade to premium season pass
     */
    public upgradeToPremiumPass() {
        this.send('season:upgradePremium', {});
    }

    /**
     * Get season rewards list
     */
    public getSeasonRewards() {
        this.send('season:getRewards', {});
    }

    /**
     * Get player's season history
     */
    public getSeasonHistory() {
        this.send('season:getHistory', {});
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DAILY LOGIN METHODS (Phase 1)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Process daily login and get rewards
     */
    public dailyLogin() {
        this.send('daily:login', {});
    }

    /**
     * Get current streak info
     */
    public getStreakInfo() {
        this.send('daily:getStreak', {});
    }

    /**
     * Get daily/weekly rewards list
     */
    public getDailyRewards() {
        this.send('daily:getRewards', {});
    }

    /**
     * Get streak leaderboard
     */
    public getStreakLeaderboard() {
        this.send('daily:getLeaderboard', {});
    }

    /**
     * Request general leaderboard data from server
     */
    public requestLeaderboard(category: string = 'xp', limit: number = 50) {
        this.send('request_leaderboard', { type: category, limit });
    }

    /**
     * Request player's rank on leaderboard
     */
    public requestPlayerRank(category: string = 'xp') {
        this.send('get_player_rank', { type: category });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GALLERY METHODS (Phase 1)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Save a screenshot to gallery
     */
    public saveScreenshot(data: {
        imageRef: string;
        caption?: string;
        filter?: string;
        template?: string;
        location?: { x: number; y: number; realm: string };
        visiblePlayers?: string[];
        isPublic?: boolean;
    }) {
        this.send('gallery:save', data);
    }

    /**
     * Get player's gallery
     */
    public getGallery(options?: {
        limit?: number;
        offset?: number;
        sortBy?: 'recent' | 'popular';
        filter?: string;
    }) {
        this.send('gallery:get', options || {});
    }

    /**
     * Get a specific screenshot
     */
    public getScreenshot(screenshotId: string) {
        this.send('gallery:getOne', { screenshotId });
    }

    /**
     * Delete a screenshot
     */
    public deleteScreenshot(screenshotId: string) {
        this.send('gallery:delete', { screenshotId });
    }

    /**
     * Update screenshot caption
     */
    public updateScreenshotCaption(screenshotId: string, caption: string) {
        this.send('gallery:updateCaption', { screenshotId, data: { caption } });
    }

    /**
     * Toggle screenshot public visibility
     */
    public toggleScreenshotPublic(screenshotId: string) {
        this.send('gallery:togglePublic', { screenshotId });
    }

    /**
     * Like a screenshot
     */
    public likeScreenshot(screenshotId: string) {
        this.send('gallery:like', { screenshotId });
    }

    /**
     * Get public gallery
     */
    public getPublicGallery(options?: {
        limit?: number;
        offset?: number;
        sortBy?: 'recent' | 'popular';
        realm?: string;
    }) {
        this.send('gallery:getPublic', options || {});
    }

    /**
     * Track a share
     */
    public trackScreenshotShare(screenshotId: string, platform: string) {
        this.send('gallery:trackShare', { screenshotId, data: { platform } });
    }

    /**
     * Get gallery stats
     */
    public getGalleryStats() {
        this.send('gallery:getStats', {});
    }

    /**
     * Create an album
     */
    public createAlbum(name: string, description?: string) {
        this.send('gallery:createAlbum', { data: { name, description } });
    }

    /**
     * Get player's albums
     */
    public getAlbums() {
        this.send('gallery:getAlbums', {});
    }

    /**
     * Add screenshot to album
     */
    public addToAlbum(albumId: string, screenshotId: string) {
        this.send('gallery:addToAlbum', { albumId, screenshotId });
    }

    /**
     * Remove screenshot from album
     */
    public removeFromAlbum(albumId: string, screenshotId: string) {
        this.send('gallery:removeFromAlbum', { albumId, screenshotId });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTELLATION METHODS (Phase 1)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Form a constellation
     */

    public formConstellation(data: {
        playerIds: string[];
        starMemoryIds: string[];
        realmId: string;
        name?: string;
        description?: string;
    }) {
        this.send('constellation:form', { data });
    }

    /**
     * Expand a constellation
     */
    public expandConstellation(constellationId: string, newStarMemoryIds: string[]) {
        this.send('constellation:expand', { constellationId, newStarMemoryIds });
    }

    /**
     * Get player's constellations
     */
    public getPlayerConstellations() {
        this.send('constellation:getPlayer', {});
    }

    /**
     * Get a specific constellation
     */
    public getConstellation(constellationId: string) {
        this.send('constellation:getOne', { constellationId });
    }

    /**
     * Get constellations in a realm
     */
    public getRealmConstellations(realmId: string, limit?: number) {
        this.send('constellation:getRealm', { realmId, data: { limit } });
    }

    /**
     * Get player constellation stats
     */
    public getConstellationStats() {
        this.send('constellation:getStats', {});
    }

    /**
     * Check for potential constellations
     */
    public checkPotentialConstellations() {
        this.send('constellation:checkPotential', {});
    }

    /**
     * Get global constellation stats
     */
    public getGlobalConstellationStats() {
        this.send('constellation:getGlobalStats', {});
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIVITY FEED METHODS (Phase 1)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get friend activity feed
     */
    public getActivityFeed(limit?: number) {
        this.send('activity:getFeed', { limit });
    }

    /**
     * Get player's own activities
     */
    public getPlayerActivities(limit?: number) {
        this.send('activity:getPlayer', { limit });
    }

    /**
     * Get activity stats
     */
    public getActivityStats() {
        this.send('activity:getStats', {});
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    private send(type: string, data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            // Track ping time for latency measurement
            if (type === 'ping') {
                this.lastPingTime = Date.now();
            }
            this.ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
        }
    }

    private handleMessage(msg: WebSocketMessage) {
        // DEBUG: Log all incoming messages except ping/pong and frequent world_state
        if (msg.type !== 'pong' && msg.type !== 'world_state') {
            console.log(`🟢 [GameClient] RECEIVED type=${msg.type}`, msg.data);
        }
        // DEBUG: Log chat_message and pulse specifically
        if (msg.type === 'chat_message') {
            console.log(`🟢 [GameClient] CHAT_MESSAGE from=${msg.data?.playerId}`, msg.data);
        }
        if (msg.type === 'pulse') {
            console.log(`🟢 [GameClient] PULSE from=${msg.data?.playerId}`, msg.data);
        }

        // Handle pong response for latency calculation
        if (msg.type === 'pong') {
            if (this.lastPingTime > 0) {
                this._latency = Date.now() - this.lastPingTime;
                this.emit('latency_update', { latency: this._latency });
            }
        }

        // Handle world_state for nearby player count
        if (msg.type === 'world_state' && msg.data?.players) {
            // Count other players (excluding self) - handle both array and object
            const players = msg.data.players;
            const playerCount = Array.isArray(players)
                ? players.filter((p: any) => p.id !== this.playerId).length
                : Object.keys(players).filter(id => id !== this.playerId).length;
            this._nearbyPlayerCount = playerCount;
            this.emit('nearby_count_update', { count: this._nearbyPlayerCount });

            // DEBUG: Log world_state receipt occasionally
            if (Math.random() < 0.02) {
                console.log(`🌍 [GameClient] world_state: ${Array.isArray(players) ? players.length : Object.keys(players).length} players, ${msg.data.bots?.length || 0} bots`);
            }
        }

        this.emit(msg.type, msg.data);
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        // Send ping every 5 seconds for more responsive latency tracking
        this.heartbeatTimer = setInterval(() => {
            this.send('ping', {});
        }, 5000);
        // Send initial ping immediately
        this.send('ping', {});
    }

    private stopHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    }

    private attemptReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            console.log('Reconnecting...');
            this.connect(this.playerId, this.realm);
        }, 2000);
    }
}

export const gameClient = new GameClient();
