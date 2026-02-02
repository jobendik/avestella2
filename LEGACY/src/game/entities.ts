// Game entity classes for AURA

export class Star {
    id: string;
    x: number;
    y: number;
    lit: boolean;
    burst: number;
    br: number;
    tw: number;
    tws: number;
    realm: string;

    constructor(id: string, x: number, y: number, lit: boolean = false, br: number = 1, realm: string = 'genesis') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.lit = lit;
        this.burst = 0;
        this.br = br;
        this.tw = Math.random() * Math.PI * 2;
        this.tws = 0.015 + Math.random() * 0.025;
        this.realm = realm;
    }
}

export class Echo {
    id: string; // Added ID
    x: number;
    y: number;
    text: string;
    hue: number;
    name: string;
    r: number;
    pulse: number;
    realm: string;
    ignited: number;
    playerId: string;

    constructor(id: string, x: number, y: number, text: string, hue: number, name: string = 'Unknown', realm: string = 'genesis', playerId: string = '', ignited: number = 0) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.text = text;
        this.hue = hue;
        this.name = name;
        this.r = 9;
        this.pulse = 0;
        this.realm = realm;
        this.playerId = playerId;
        this.ignited = ignited;
    }
}

export class Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    text: string;
    owner: string;
    target: string | null;
    life: number;
    hit: boolean;
    trail: { x: number; y: number }[];

    constructor(x: number, y: number, vx: number, vy: number, text: string, owner: string, target: string | null = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.text = text;
        this.owner = owner;
        this.target = target;
        this.life = 320;
        this.hit = false;
        this.trail = [];
    }

    update(): void {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 18) this.trail.shift();
    }
}

export class FloatingText {
    x: number;
    y: number;
    text: string;
    hue: number;
    size: number;
    life: number;
    decay: number;
    vy: number;

    constructor(x: number, y: number, text: string, hue: number = 0, size: number = 14, dur: number = 1.5) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.hue = hue;
        this.size = size;
        this.life = 1;
        this.decay = 1 / (dur * 60);
        this.vy = -0.8;
    }

    update(): void {
        this.y += this.vy;
        this.life -= this.decay;
    }
}

export class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    hue: number;

    constructor(x: number, y: number, vx: number, vy: number, hue: number, size: number = 3) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 1;
        this.size = size;
        this.hue = hue;
    }

    update(): void {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.018;
        this.vx *= 0.98;
        this.vy *= 0.98;
    }
}

// Power-up collectible (insp.html inspired)
export type PowerUpType = 'speed' | 'xp' | 'shield' | 'magnet';

export class PowerUp {
    id: string;
    x: number;
    y: number;
    type: PowerUpType;
    life: number;
    pulseT: number;
    realm: string;
    r: number;

    constructor(id: string, x: number, y: number, type: PowerUpType, realm: string, lifetime: number = 30) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = lifetime;
        this.pulseT = 0;
        this.realm = realm;
        this.r = 14;
    }

    update(dt: number): void {
        this.life -= dt;
        this.pulseT += dt * 5;
    }

    // Get color based on type
    getColor(): string {
        switch (this.type) {
            case 'speed': return '#FFD700';  // Gold
            case 'xp': return '#7B68EE';     // Purple
            case 'shield': return '#00CED1'; // Cyan
            case 'magnet': return '#FF69B4'; // Pink
            default: return '#FFD700';
        }
    }

    // Get icon based on type
    getIcon(): string {
        switch (this.type) {
            case 'speed': return '⚡';
            case 'xp': return '✨';
            case 'shield': return '🛡️';
            case 'magnet': return '🧲';
            default: return '⚡';
        }
    }
}

// NOTE: Bot class has been REMOVED - bots are now 100% server-authoritative
// They come through the 'world_state' WebSocket message as part of entities
// with isBot=true flag. See server/websocket/WebSocketHandler.ts for server-side bot logic.
