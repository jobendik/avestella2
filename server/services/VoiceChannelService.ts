// =============================================================================
// Voice Channel Service - Room-based voice chat management
// =============================================================================
// Handles voice rooms, capacity, proximity voice, and WebRTC coordination

import { EventEmitter } from 'events';

export interface VoiceRoom {
    id: string;
    name: string;
    realm: string;
    type: 'proximity' | 'room' | 'whisper' | 'campfire';
    position?: { x: number; y: number };
    radius?: number; // For proximity voice
    maxParticipants: number;
    currentParticipants: Set<string>;
    creator?: string;
    settings: VoiceRoomSettings;
    createdAt: number;
}

export interface VoiceRoomSettings {
    isPrivate: boolean;
    inviteOnly: boolean;
    muteByDefault: boolean;
    spatialAudio: boolean;
    qualityLevel: 'low' | 'medium' | 'high';
    noiseSuppressionLevel: 'off' | 'low' | 'medium' | 'high';
    pushToTalk: boolean;
}

export interface VoiceParticipant {
    playerId: string;
    roomId: string;
    joinedAt: number;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
    volume: number; // 0-100
    position?: { x: number; y: number }; // For spatial audio
}

export interface ProximityConfig {
    realm: string;
    enabled: boolean;
    maxDistance: number;
    falloffStart: number;
    falloffCurve: 'linear' | 'exponential';
}

// Default proximity configs per realm
const REALM_PROXIMITY_CONFIGS: Record<string, ProximityConfig> = {
    genesis: { realm: 'genesis', enabled: true, maxDistance: 200, falloffStart: 50, falloffCurve: 'linear' },
    nebula: { realm: 'nebula', enabled: true, maxDistance: 300, falloffStart: 100, falloffCurve: 'exponential' },
    void: { realm: 'void', enabled: true, maxDistance: 150, falloffStart: 30, falloffCurve: 'exponential' },
    starforge: { realm: 'starforge', enabled: true, maxDistance: 250, falloffStart: 80, falloffCurve: 'linear' },
    sanctuary: { realm: 'sanctuary', enabled: true, maxDistance: 400, falloffStart: 150, falloffCurve: 'linear' },
};

// Predefined public voice rooms
const PUBLIC_ROOMS: Omit<VoiceRoom, 'currentParticipants' | 'createdAt'>[] = [
    {
        id: 'genesis_campfire',
        name: 'Genesis Campfire',
        realm: 'genesis',
        type: 'campfire',
        position: { x: 0, y: 0 },
        maxParticipants: 20,
        settings: { isPrivate: false, inviteOnly: false, muteByDefault: false, spatialAudio: true, qualityLevel: 'medium', noiseSuppressionLevel: 'medium', pushToTalk: false }
    },
    {
        id: 'nebula_lounge',
        name: 'Nebula Lounge',
        realm: 'nebula',
        type: 'room',
        maxParticipants: 30,
        settings: { isPrivate: false, inviteOnly: false, muteByDefault: false, spatialAudio: false, qualityLevel: 'high', noiseSuppressionLevel: 'high', pushToTalk: false }
    },
    {
        id: 'void_whispers',
        name: 'Void Whispers',
        realm: 'void',
        type: 'room',
        maxParticipants: 10,
        settings: { isPrivate: false, inviteOnly: false, muteByDefault: false, spatialAudio: true, qualityLevel: 'high', noiseSuppressionLevel: 'low', pushToTalk: true }
    },
    {
        id: 'starforge_collab',
        name: 'Starforge Collaboration',
        realm: 'starforge',
        type: 'room',
        maxParticipants: 50,
        settings: { isPrivate: false, inviteOnly: false, muteByDefault: true, spatialAudio: false, qualityLevel: 'medium', noiseSuppressionLevel: 'high', pushToTalk: false }
    },
    {
        id: 'sanctuary_peace',
        name: 'Sanctuary of Peace',
        realm: 'sanctuary',
        type: 'campfire',
        position: { x: 200, y: 200 },
        maxParticipants: 15,
        settings: { isPrivate: false, inviteOnly: false, muteByDefault: false, spatialAudio: true, qualityLevel: 'high', noiseSuppressionLevel: 'medium', pushToTalk: false }
    },
];

class VoiceChannelService extends EventEmitter {
    private rooms: Map<string, VoiceRoom> = new Map();
    private participants: Map<string, VoiceParticipant> = new Map();
    private playerRoomMap: Map<string, string> = new Map(); // playerId -> roomId

    async initialize(): Promise<void> {
        console.log('🎙️ Voice Channel Service initializing...');
        
        // Create public rooms
        for (const roomConfig of PUBLIC_ROOMS) {
            const room: VoiceRoom = {
                ...roomConfig,
                currentParticipants: new Set(),
                createdAt: Date.now()
            };
            this.rooms.set(room.id, room);
        }
        
        console.log(`🎙️ Created ${PUBLIC_ROOMS.length} public voice rooms`);
        console.log('🎙️ Voice Channel Service initialized');
    }

    // =========================================================================
    // Room Operations
    // =========================================================================

    getRoom(roomId: string): VoiceRoom | null {
        return this.rooms.get(roomId) || null;
    }

    getRoomsByRealm(realm: string): VoiceRoom[] {
        return Array.from(this.rooms.values()).filter(room => room.realm === realm);
    }

    getPublicRooms(): VoiceRoom[] {
        return Array.from(this.rooms.values()).filter(room => !room.settings.isPrivate);
    }

    createRoom(
        creatorId: string,
        name: string,
        realm: string,
        type: VoiceRoom['type'],
        settings: Partial<VoiceRoomSettings> = {}
    ): VoiceRoom {
        const roomId = `custom_${creatorId}_${Date.now()}`;
        
        const room: VoiceRoom = {
            id: roomId,
            name,
            realm,
            type,
            maxParticipants: type === 'whisper' ? 2 : type === 'campfire' ? 20 : 50,
            currentParticipants: new Set(),
            creator: creatorId,
            settings: {
                isPrivate: settings.isPrivate ?? false,
                inviteOnly: settings.inviteOnly ?? false,
                muteByDefault: settings.muteByDefault ?? false,
                spatialAudio: settings.spatialAudio ?? (type === 'campfire' || type === 'proximity'),
                qualityLevel: settings.qualityLevel ?? 'medium',
                noiseSuppressionLevel: settings.noiseSuppressionLevel ?? 'medium',
                pushToTalk: settings.pushToTalk ?? false
            },
            createdAt: Date.now()
        };

        this.rooms.set(roomId, room);
        this.emit('room_created', { roomId, room });

        return room;
    }

    deleteRoom(roomId: string, requesterId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        
        // Can't delete public rooms
        if (!room.creator) return false;
        
        // Only creator can delete
        if (room.creator !== requesterId) return false;

        // Remove all participants
        for (const playerId of room.currentParticipants) {
            this.leaveRoom(playerId);
        }

        this.rooms.delete(roomId);
        this.emit('room_deleted', { roomId });

        return true;
    }

    // =========================================================================
    // Join/Leave Operations
    // =========================================================================

    joinRoom(
        playerId: string,
        roomId: string,
        position?: { x: number; y: number }
    ): {
        success: boolean;
        error?: string;
        room?: VoiceRoom;
        participant?: VoiceParticipant;
    } {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        // Check if already in another room
        const currentRoomId = this.playerRoomMap.get(playerId);
        if (currentRoomId && currentRoomId !== roomId) {
            this.leaveRoom(playerId);
        }

        // Check capacity
        if (room.currentParticipants.size >= room.maxParticipants) {
            return { success: false, error: 'Room is full' };
        }

        // Create participant
        const participant: VoiceParticipant = {
            playerId,
            roomId,
            joinedAt: Date.now(),
            isMuted: room.settings.muteByDefault,
            isDeafened: false,
            isSpeaking: false,
            volume: 100,
            position
        };

        room.currentParticipants.add(playerId);
        this.participants.set(playerId, participant);
        this.playerRoomMap.set(playerId, roomId);

        this.emit('player_joined', { playerId, roomId, participant });

        return { success: true, room, participant };
    }

    leaveRoom(playerId: string): boolean {
        const roomId = this.playerRoomMap.get(playerId);
        if (!roomId) return false;

        const room = this.rooms.get(roomId);
        if (room) {
            room.currentParticipants.delete(playerId);
            
            // Auto-delete empty custom rooms
            if (room.creator && room.currentParticipants.size === 0) {
                this.rooms.delete(roomId);
                this.emit('room_deleted', { roomId });
            }
        }

        this.participants.delete(playerId);
        this.playerRoomMap.delete(playerId);

        this.emit('player_left', { playerId, roomId });

        return true;
    }

    getPlayerRoom(playerId: string): VoiceRoom | null {
        const roomId = this.playerRoomMap.get(playerId);
        return roomId ? this.rooms.get(roomId) || null : null;
    }

    getParticipant(playerId: string): VoiceParticipant | null {
        return this.participants.get(playerId) || null;
    }

    getRoomParticipants(roomId: string): VoiceParticipant[] {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        
        return Array.from(room.currentParticipants)
            .map(id => this.participants.get(id))
            .filter((p): p is VoiceParticipant => p !== undefined);
    }

    // =========================================================================
    // Participant State
    // =========================================================================

    setMuted(playerId: string, muted: boolean): boolean {
        const participant = this.participants.get(playerId);
        if (!participant) return false;
        
        participant.isMuted = muted;
        this.emit('participant_updated', { playerId, changes: { isMuted: muted } });
        return true;
    }

    setDeafened(playerId: string, deafened: boolean): boolean {
        const participant = this.participants.get(playerId);
        if (!participant) return false;
        
        participant.isDeafened = deafened;
        if (deafened) {
            participant.isMuted = true; // Deafening also mutes
        }
        this.emit('participant_updated', { playerId, changes: { isDeafened: deafened, isMuted: participant.isMuted } });
        return true;
    }

    setSpeaking(playerId: string, speaking: boolean): boolean {
        const participant = this.participants.get(playerId);
        if (!participant) return false;
        
        participant.isSpeaking = speaking;
        this.emit('participant_speaking', { playerId, speaking, roomId: participant.roomId });
        return true;
    }

    setVolume(playerId: string, targetPlayerId: string, volume: number): boolean {
        // This would typically be client-side, but we track it for persistence
        const clampedVolume = Math.max(0, Math.min(100, volume));
        this.emit('volume_adjusted', { playerId, targetPlayerId, volume: clampedVolume });
        return true;
    }

    updatePosition(playerId: string, position: { x: number; y: number }): boolean {
        const participant = this.participants.get(playerId);
        if (!participant) return false;
        
        participant.position = position;
        
        // Only emit for spatial audio rooms
        const room = this.rooms.get(participant.roomId);
        if (room?.settings.spatialAudio) {
            this.emit('position_updated', { playerId, position, roomId: participant.roomId });
        }
        return true;
    }

    // =========================================================================
    // Proximity Voice
    // =========================================================================

    getProximityConfig(realm: string): ProximityConfig {
        return REALM_PROXIMITY_CONFIGS[realm] || REALM_PROXIMITY_CONFIGS.genesis;
    }

    calculateProximityVolume(
        listenerPos: { x: number; y: number },
        speakerPos: { x: number; y: number },
        realm: string
    ): number {
        const config = this.getProximityConfig(realm);
        if (!config.enabled) return 0;

        const dx = listenerPos.x - speakerPos.x;
        const dy = listenerPos.y - speakerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > config.maxDistance) return 0;
        if (distance <= config.falloffStart) return 1;

        const falloffRange = config.maxDistance - config.falloffStart;
        const distanceInFalloff = distance - config.falloffStart;
        const falloffProgress = distanceInFalloff / falloffRange;

        if (config.falloffCurve === 'linear') {
            return 1 - falloffProgress;
        } else {
            return Math.pow(1 - falloffProgress, 2);
        }
    }

    getPlayersInProximity(
        position: { x: number; y: number },
        realm: string,
        excludePlayerId?: string
    ): Array<{ playerId: string; volume: number; position: { x: number; y: number } }> {
        const config = this.getProximityConfig(realm);
        const result: Array<{ playerId: string; volume: number; position: { x: number; y: number } }> = [];

        for (const [playerId, participant] of this.participants) {
            if (playerId === excludePlayerId) continue;
            if (!participant.position) continue;
            
            const room = this.rooms.get(participant.roomId);
            if (!room || room.realm !== realm) continue;
            if (room.type !== 'proximity' && room.type !== 'campfire') continue;

            const volume = this.calculateProximityVolume(position, participant.position, realm);
            if (volume > 0) {
                result.push({
                    playerId,
                    volume,
                    position: participant.position
                });
            }
        }

        return result;
    }

    // =========================================================================
    // Whisper (Private 1:1)
    // =========================================================================

    createWhisper(
        initiatorId: string,
        targetId: string
    ): {
        success: boolean;
        error?: string;
        room?: VoiceRoom;
    } {
        // Check if whisper already exists
        const existingRoom = Array.from(this.rooms.values()).find(room => 
            room.type === 'whisper' && 
            room.currentParticipants.has(initiatorId) && 
            room.currentParticipants.has(targetId)
        );

        if (existingRoom) {
            return { success: true, room: existingRoom };
        }

        const room = this.createRoom(
            initiatorId,
            `Whisper: ${initiatorId} & ${targetId}`,
            'all', // Whispers work across realms
            'whisper',
            { isPrivate: true, inviteOnly: true }
        );

        // Auto-join both
        this.joinRoom(initiatorId, room.id);
        this.joinRoom(targetId, room.id);

        this.emit('whisper_started', { initiatorId, targetId, roomId: room.id });

        return { success: true, room };
    }

    // =========================================================================
    // Statistics
    // =========================================================================

    getStats(): {
        totalRooms: number;
        totalParticipants: number;
        roomsByRealm: Record<string, number>;
        participantsByRealm: Record<string, number>;
    } {
        const roomsByRealm: Record<string, number> = {};
        const participantsByRealm: Record<string, number> = {};

        for (const room of this.rooms.values()) {
            roomsByRealm[room.realm] = (roomsByRealm[room.realm] || 0) + 1;
            participantsByRealm[room.realm] = (participantsByRealm[room.realm] || 0) + room.currentParticipants.size;
        }

        return {
            totalRooms: this.rooms.size,
            totalParticipants: this.participants.size,
            roomsByRealm,
            participantsByRealm
        };
    }
}

export const voiceChannelService = new VoiceChannelService();
export { VoiceChannelService };
