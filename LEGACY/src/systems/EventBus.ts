// Event-driven architecture for decoupled communication

type EventCallback<T = any> = (data: T) => void;
type UnsubscribeFn = () => void;

interface EventMap {
    // Player actions
    'player:move': { x: number; y: number };
    'player:sing': void;
    'player:pulse': void;
    'player:emote': { emote: string };
    'player:whisper': { text: string; targetId?: string };
    'player:echo': { text: string };
    'player:levelUp': { oldLevel: number; newLevel: number };
    'player:xpGain': { amount: number };

    // UI events
    'ui:showPanel': { panel: 'social' | 'achievements' | 'settings' | 'quests' };
    'ui:hidePanel': { panel: string };
    'ui:closeAllPanels': void;
    'ui:showProfile': { playerId: string; x: number; y: number };
    'ui:hideProfile': void;
    'ui:showMessageBox': { placeholder: string; title?: string };
    'ui:hideMessageBox': void;
    'ui:showEmoteWheel': { x: number; y: number };
    'ui:hideEmoteWheel': void;
    'ui:toast': { message: string; type?: string };
    'ui:updateHUD': void;

    // Game events
    'game:start': void;
    'game:pause': void;
    'game:resume': void;
    'game:realmChange': { realmId: string };
    'game:starLit': { starId: string; count: number };

    // Network events
    'network:connected': void;
    'network:disconnected': void;
    'network:playerJoined': { player: any };
    'network:playerLeft': { playerId: string };
    'network:playerUpdate': { player: any; isSelf: boolean };
    'network:worldState': { entities: any[]; litStars: string[]; echoes: any[]; linkedCount: number; timestamp: number };
    'network:syncComplete': void;
    'network:error': { error: Error };
    // Server-authoritative action events (broadcast to all including sender)
    'network:sing': { playerId: string; playerName: string; x: number; y: number; hue: number; isSelf: boolean };
    'network:pulse': { playerId: string; playerName: string; x: number; y: number; isSelf: boolean };
    'network:emote': { playerId: string; playerName: string; emoji: string; x: number; y: number; isSelf: boolean };
    'network:echo': { playerId: string; playerName: string; text: string; x: number; y: number; hue: number; isSelf: boolean; echoId: string; ignited: number };
    'network:echoIgnited': { echoId: string; ignited: number; ignitedBy: string };
    'network:whisper': { from: string; fromName: string; text: string; targetId?: string; x: number; y: number };
    'network:starLit': { playerId: string; starIds: string[]; x: number; y: number; isSelf: boolean };
    'network:connectionMade': { player1Id: string; player1Name: string; player2Id: string; player2Name: string; isSelf: boolean };
    // Server-authoritative player data
    'network:playerData': { id: string; name: string; hue: number; xp: number; level: number; stars: number; echoes: number; sings: number; pulses: number; emotes: number; teleports: number; achievements: string[]; friends: { id: string; name: string }[]; lastRealm?: string; lastPosition?: { x: number; y: number } };
    'network:xpGain': { amount: number; reason: string; newXp: number; newLevel: number; leveledUp: boolean };
    'network:cooldown': { action: string; remainingMs: number };
    // Friends system
    'network:friendAdded': { friendId: string; friendName: string };
    'network:friendRemoved': { friendId: string };
    'network:teleportSuccess': { x: number; y: number; friendId: string; friendName: string };
    // Voice signaling
    'network:voiceSignal': { fromId: string; fromName: string; signalType: string; signalData: any };
    // Latency tracking
    'network:latency': { latency: number };

    // Voice events
    'voice:enabled': void;
    'voice:disabled': void;
    'voice:speaking': { speaking: boolean };
    'voice:volumeUpdate': { level: number };

    // Bot events
    'bot:spawned': { bot: any };
    'bot:removed': { botId: string };

    // Achievement/Quest events
    'achievement:unlocked': { achievementId: string };
    'quest:completed': { questId: string };
    'quest:progress': { questId: string; progress: number };
}

/**
 * Type-safe event bus for decoupled communication
 * Implements publish-subscribe pattern
 */
class EventBusImpl {
    private listeners: Map<string, Set<EventCallback>> = new Map();
    private onceListeners: Map<string, Set<EventCallback>> = new Map();

    /**
     * Subscribe to an event
     */
    on<K extends keyof EventMap>(
        event: K,
        callback: EventCallback<EventMap[K]>
    ): UnsubscribeFn {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    /**
     * Subscribe to an event once
     */
    once<K extends keyof EventMap>(
        event: K,
        callback: EventCallback<EventMap[K]>
    ): UnsubscribeFn {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set());
        }
        this.onceListeners.get(event)!.add(callback);

        return () => {
            this.onceListeners.get(event)?.delete(callback);
        };
    }

    /**
     * Emit an event
     */
    emit<K extends keyof EventMap>(
        event: K,
        data?: EventMap[K]
    ): void {
        // Call regular listeners
        const listeners = this.listeners.get(event);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            }
        }

        // Call once listeners and remove them
        const onceListeners = this.onceListeners.get(event);
        if (onceListeners) {
            for (const callback of onceListeners) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in once listener for ${event}:`, error);
                }
            }
            this.onceListeners.delete(event);
        }
    }

    /**
     * Remove all listeners for an event
     */
    off<K extends keyof EventMap>(event: K): void {
        this.listeners.delete(event);
        this.onceListeners.delete(event);
    }

    /**
     * Remove all listeners
     */
    clear(): void {
        this.listeners.clear();
        this.onceListeners.clear();
    }

    /**
     * Get listener count for debugging
     */
    getListenerCount(event?: keyof EventMap): number {
        if (event) {
            return (this.listeners.get(event)?.size || 0) +
                (this.onceListeners.get(event)?.size || 0);
        }

        let total = 0;
        for (const listeners of this.listeners.values()) {
            total += listeners.size;
        }
        for (const listeners of this.onceListeners.values()) {
            total += listeners.size;
        }
        return total;
    }
}

// Singleton instance
export const EventBus = new EventBusImpl();
export type { EventMap };
