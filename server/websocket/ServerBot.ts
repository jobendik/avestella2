// =============================================================================
// ServerBot - Server-side Bot AI for social interactions
// =============================================================================

import type { PlayerConnection } from './types.js';

// Bot names for variety
const BOT_NAMES = ['Luna', 'Sol', 'Nova', 'Atlas', 'Lyra', 'Echo', 'Zen', 'Mira', 'Orion', 'Flux', 'Vega', 'Kai', 'Iris', 'Aria', 'Juno', 'Nix', 'Ember', 'Sage', 'River', 'Sky'];

// Bot chat messages - more conversational and social
const BOT_GREETINGS = ['Hello! ✨', 'Hi there!', 'Welcome!', 'Hey!', '*waves*', 'Nice to see you!', 'Hello friend!'];
const BOT_THOUGHTS = ['The stars are beautiful tonight...', 'I love this place', 'So peaceful here', 'Anyone want to explore?', 'Let\'s light some stars!', 'Connection is everything', 'Together we shine brighter', 'The void speaks to me...', 'I sense kindred spirits nearby', 'What brings you here?'];
const BOT_REACTIONS = ['Wow!', 'Beautiful!', 'Amazing!', '✨✨✨', 'Love it!', 'So cool!', 'Yes!', 'Incredible!'];
const BOT_QUESTIONS = ['How are you?', 'What\'s your name?', 'Seen any new stars?', 'Want to connect?', 'Shall we explore together?', 'Feeling the cosmic energy?'];

export type BotPersonality = 'social' | 'explorer' | 'mystic';

export class ServerBot {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    hue: number;
    name: string;
    xp: number;
    moveAngle: number;
    actionTimer: number;
    thinkTimer: number;
    chatTimer: number;
    realm: string;
    singing: number;
    pulsing: number;
    emoting: string | null;
    bonds: Map<string, number>;
    currentMessage: string | null;
    messageTimer: number;
    targetPlayerId: string | null;
    personality: BotPersonality;
    lastGreeted: Set<string>;
    excitement: number;

    constructor(x: number, y: number, realm: string = 'genesis') {
        this.id = 'bot-' + Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hue = Math.random() * 360;
        this.name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        this.xp = 100 + Math.random() * 800;
        this.moveAngle = Math.random() * Math.PI * 2;
        this.actionTimer = Math.floor(Math.random() * 100);
        this.thinkTimer = Math.floor(Math.random() * 200);
        this.chatTimer = 0;
        this.realm = realm;
        this.singing = 0;
        this.pulsing = 0;
        this.emoting = null;
        this.bonds = new Map();
        this.currentMessage = null;
        this.messageTimer = 0;
        this.targetPlayerId = null;
        this.personality = ['social', 'explorer', 'mystic'][Math.floor(Math.random() * 3)] as BotPersonality;
        this.lastGreeted = new Set();
        this.excitement = 0;
    }

    findNearbyPlayers(connections: Map<string, PlayerConnection>): { closest: PlayerConnection | null; count: number; avgDist: number } {
        let closest: PlayerConnection | null = null;
        let closestDist = Infinity;
        let count = 0;
        let totalDist = 0;

        for (const conn of connections.values()) {
            if (conn.realm !== this.realm) continue;
            const dist = Math.hypot(conn.x - this.x, conn.y - this.y);
            if (dist < 600) {
                count++;
                totalDist += dist;
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = conn;
                }
            }
        }

        return { closest, count, avgDist: count > 0 ? totalDist / count : 0 };
    }

    update(connections: Map<string, PlayerConnection>): { action: string | null; data?: any } {
        const nearby = this.findNearbyPlayers(connections);
        let actionResult: { action: string | null; data?: any } = { action: null };

        // Update excitement based on nearby activity
        if (nearby.count > 0) {
            this.excitement = Math.min(1, this.excitement + 0.02 * nearby.count);
        } else {
            this.excitement = Math.max(0, this.excitement - 0.005);
        }

        // Movement logic
        const distToCenter = Math.hypot(this.x, this.y);

        if (this.personality === 'social' && nearby.closest) {
            const targetDist = Math.hypot(nearby.closest.x - this.x, nearby.closest.y - this.y);
            if (targetDist > 80 && targetDist < 500) {
                const angleToPlayer = Math.atan2(nearby.closest.y - this.y, nearby.closest.x - this.x);
                this.moveAngle = this.moveAngle * 0.85 + angleToPlayer * 0.15;
            } else if (targetDist <= 80) {
                this.moveAngle += 0.03;
            }
        } else if (this.personality === 'explorer') {
            if (Math.random() < 0.04) {
                this.moveAngle += (Math.random() - 0.5) * 2.5;
            }
        } else {
            if (Math.random() < 0.01) {
                this.moveAngle += (Math.random() - 0.5) * 1.5;
            }
        }

        // Stay within bounds
        if (distToCenter > 1800) {
            const angleToCenter = Math.atan2(-this.y, -this.x);
            this.moveAngle = this.moveAngle * 0.8 + angleToCenter * 0.2;
        }

        // Apply movement
        const speed = this.personality === 'explorer' ? 0.35 : (this.personality === 'social' ? 0.25 : 0.15);
        this.vx += Math.cos(this.moveAngle) * speed;
        this.vy += Math.sin(this.moveAngle) * speed;
        this.vx *= 0.94;
        this.vy *= 0.94;
        this.x += this.vx;
        this.y += this.vy;

        // Update timers
        this.actionTimer++;
        this.thinkTimer++;
        this.chatTimer = Math.max(0, this.chatTimer - 1);

        // Decay visual effects
        this.singing = Math.max(0, this.singing - 0.02);
        this.pulsing = Math.max(0, this.pulsing - 0.02);

        // Decay message timer
        if (this.messageTimer > 0) {
            this.messageTimer--;
            if (this.messageTimer <= 0) {
                this.currentMessage = null;
            }
        }

        // Greet new nearby players
        if (nearby.closest && !this.lastGreeted.has(nearby.closest.playerId) && this.chatTimer === 0) {
            const greetChance = this.personality === 'social' ? 0.15 : 0.05;
            if (Math.random() < greetChance) {
                this.speak(BOT_GREETINGS[Math.floor(Math.random() * BOT_GREETINGS.length)]);
                this.lastGreeted.add(nearby.closest.playerId);
                this.chatTimer = 120;
                actionResult = { action: 'greet', data: { targetId: nearby.closest.playerId } };
            }
        }

        // Random chat based on excitement and personality
        if (this.chatTimer === 0 && this.thinkTimer > 150) {
            let chatChance = 0.003 + this.excitement * 0.01;
            if (this.personality === 'social') chatChance *= 2;
            if (this.personality === 'mystic') chatChance *= 1.5;

            if (Math.random() < chatChance && nearby.count > 0) {
                let message: string;
                if (this.personality === 'social' && Math.random() < 0.4) {
                    message = BOT_QUESTIONS[Math.floor(Math.random() * BOT_QUESTIONS.length)];
                } else if (this.personality === 'mystic' && Math.random() < 0.5) {
                    message = BOT_THOUGHTS[Math.floor(Math.random() * BOT_THOUGHTS.length)];
                } else {
                    const allMessages = [...BOT_THOUGHTS, ...BOT_REACTIONS];
                    message = allMessages[Math.floor(Math.random() * allMessages.length)];
                }
                this.speak(message);
                this.thinkTimer = 0;
                this.chatTimer = 180;
            }
        }

        // Sing more often when excited
        const singChance = 0.003 + this.excitement * 0.008;
        if (this.actionTimer > 150 && Math.random() < singChance && nearby.count > 0) {
            this.actionTimer = 0;
            this.singing = 1;
            actionResult = { action: 'sing' };
        }

        // Pulse when very excited
        if (this.excitement > 0.7 && Math.random() < 0.005) {
            this.pulsing = 1;
            actionResult = { action: 'pulse' };
        }

        // Emote occasionally
        if (Math.random() < 0.002 && nearby.count > 0) {
            const emotes = ['✨', '💫', '🌟', '❤️', '👋', '🎵'];
            this.emoting = emotes[Math.floor(Math.random() * emotes.length)];
            setTimeout(() => { this.emoting = null; }, 2000);
        }

        // Clean up old greetings periodically
        if (Math.random() < 0.001) {
            this.lastGreeted.clear();
        }

        return actionResult;
    }

    react(actionType: 'sing' | 'pulse' | 'whisper' | 'emote', distance: number): void {
        if (distance > 400) return;

        this.excitement = Math.min(1, this.excitement + 0.15);

        const reactChance = (1 - distance / 400) * (this.personality === 'social' ? 0.4 : 0.2);

        if (Math.random() < reactChance && this.chatTimer === 0) {
            if (actionType === 'sing') {
                if (Math.random() < 0.3) {
                    this.singing = 1;
                } else {
                    this.speak(BOT_REACTIONS[Math.floor(Math.random() * BOT_REACTIONS.length)]);
                }
            } else if (actionType === 'pulse') {
                if (Math.random() < 0.3) {
                    this.pulsing = 1;
                }
            }
            this.chatTimer = 60;
        }
    }

    speak(message: string): void {
        this.currentMessage = message;
        this.messageTimer = 180;
    }

    toPlayerData(): any {
        return {
            id: this.id,
            name: this.name,
            x: Math.round(this.x),
            y: Math.round(this.y),
            hue: this.hue,
            xp: this.xp,
            singing: this.singing,
            pulsing: this.pulsing,
            emoting: this.emoting,
            isBot: true,
            realm: this.realm,
            message: this.currentMessage,
            messageTimer: this.messageTimer
        };
    }
}
