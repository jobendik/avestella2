// Game logic and utilities for AURA
import { Star, Particle, PowerUp, PowerUpType } from './entities';
import { CONFIG, REALMS } from '../core/config';
import type { Player, OtherPlayer, TagGameState, RealmId } from '../types';

export class GameLogic {
    // Procedural generation seed function
    static seed(s: number): number {
        const x = Math.sin(s) * 43758.5453;
        return x - Math.floor(x);
    }

    // Generate stars for a grid cell
    static genStars(
        cx: number,
        cy: number,
        realm: string,
        stars: Map<string, Star[]>
    ): void {
        const k = `${realm}:${cx},${cy}`;
        if (stars.has(k)) return;

        const arr: Star[] = [];
        let s = cx * 12.9898 + cy * 78.233 + realm.charCodeAt(0) * 0.1;
        const dm = realm === 'void' ? 0.5 : realm === 'nebula' ? 1.3 : 1;

        // Campfire Model: Reduce star density based on distance from center
        const cellCenterX = cx * CONFIG.STAR_CELL + CONFIG.STAR_CELL / 2;
        const cellCenterY = cy * CONFIG.STAR_CELL + CONFIG.STAR_CELL / 2;
        const distFromCenter = Math.hypot(cellCenterX, cellCenterY);

        // Star density falloff: Full density within campfire, gradual reduction beyond
        let densityMultiplier = 1;
        if (distFromCenter > CONFIG.CAMPFIRE_RADIUS) {
            // Exponential falloff beyond campfire radius
            const excessDist = distFromCenter - CONFIG.CAMPFIRE_RADIUS;
            densityMultiplier = Math.max(0.1, Math.exp(-excessDist / 3000));
        }

        const cnt = Math.floor((5 + this.seed(s) * 8) * dm * densityMultiplier);

        for (let i = 0; i < cnt; i++) {
            s = s * 1.1 + i * 0.7;
            const lx = this.seed(s) * CONFIG.STAR_CELL;
            s = s * 1.3 + 0.5;
            const ly = this.seed(s) * CONFIG.STAR_CELL;
            s = s * 0.9 + 0.3;
            const br = 0.25 + this.seed(s) * 0.75;
            const starId = `${realm}:${cx}:${cy}:${i}`;
            arr.push(
                new Star(
                    starId,
                    cx * CONFIG.STAR_CELL + lx,
                    cy * CONFIG.STAR_CELL + ly,
                    false,
                    br,
                    realm
                )
            );
        }
        stars.set(k, arr);
    }

    // Ensure stars are generated around a position
    static ensureStars(
        x: number,
        y: number,
        realm: string,
        stars: Map<string, Star[]>
    ): void {
        const cx = Math.floor(x / CONFIG.STAR_CELL);
        const cy = Math.floor(y / CONFIG.STAR_CELL);
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                this.genStars(cx + dx, cy + dy, realm, stars);
            }
        }
    }

    // Get player level from XP
    static getLevel(xp: number): number {
        for (let i = CONFIG.LEVEL_XP.length - 1; i >= 0; i--) {
            if (xp >= CONFIG.LEVEL_XP[i]) return i + 1;
        }
        return 1;
    }

    // Get form/title based on level
    static getForm(lv: number): string {
        return CONFIG.FORMS[Math.min(lv - 1, CONFIG.FORMS.length - 1)];
    }

    // Get view radius based on bonds
    static getViewRadius(player: Player): number {
        const strongBonds = [...player.bonds.values()].filter(b => b > 25).length;
        return CONFIG.VIEW_BASE + strongBonds * CONFIG.VIEW_BOND;
    }

    // Spawn particles
    static spawnParticles(
        x: number,
        y: number,
        hue: number,
        cnt: number = 15,
        explosive: boolean = false,
        particles: Particle[]
    ): void {
        for (let i = 0; i < cnt; i++) {
            const angle = (i / cnt) * Math.PI * 2 + (explosive ? 0 : Math.random());
            const speed = explosive ? 2 + Math.random() * 5 : Math.random() * 3;
            particles.push(
                new Particle(
                    x,
                    y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    hue + (Math.random() - 0.5) * 35,
                    Math.random() * 4.5 + 2
                )
            );
        }
    }

    // Update star animations
    static updateStars(stars: Map<string, Star[]>): void {
        for (const arr of stars.values()) {
            for (const s of arr) {
                s.tw += s.tws;
                if (s.burst > 0) {
                    s.burst -= 0.025;
                    if (s.burst < 0) s.burst = 0;
                }
            }
        }
    }

    // Update particles
    static updateParticles(particles: Particle[]): void {
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    // Check for constellations (3 nearby lit stars forming a triangle)
    static findConstellations(
        stars: Map<string, Star[]>,
        player: Player,
        currentRealm: string,
        viewRadius: number
    ): [Star, Star, Star][] {
        const litStars: Star[] = [];

        for (const [k, arr] of stars) {
            if (!k.startsWith(currentRealm + ':')) continue;
            for (const s of arr) {
                if (s.lit) {
                    const dist = Math.hypot(s.x - player.x, s.y - player.y);
                    if (dist < viewRadius) {
                        litStars.push(s);
                    }
                }
            }
        }

        const constellations: [Star, Star, Star][] = [];

        for (let i = 0; i < litStars.length; i++) {
            for (let j = i + 1; j < litStars.length; j++) {
                for (let k = j + 1; k < litStars.length; k++) {
                    const a = litStars[i];
                    const b = litStars[j];
                    const c = litStars[k];

                    const d1 = Math.hypot(a.x - b.x, a.y - b.y);
                    const d2 = Math.hypot(b.x - c.x, b.y - c.y);
                    const d3 = Math.hypot(c.x - a.x, c.y - a.y);

                    if (d1 < 450 && d2 < 450 && d3 < 450) {
                        constellations.push([a, b, c]);
                    }
                }
            }
        }

        return constellations;
    }

    // Calculate distance between two points
    static distance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.hypot(x2 - x1, y2 - y1);
    }

    // Clamp a value between min and max
    static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    // Linear interpolation
    static lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    // === POWER-UP SYSTEM (insp.html inspired) ===

    /**
     * Spawn a new power-up at a random location near the player
     */
    static spawnPowerUp(
        player: Player,
        realm: string,
        powerups: PowerUp[]
    ): PowerUp | null {
        if (powerups.length >= CONFIG.MAX_POWERUPS) return null;
        if (Math.random() > CONFIG.POWERUP_SPAWN_CHANCE) return null;

        // Spawn within campfire radius, near but not too close to player
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 600; // 200-800 units away
        const x = player.x + Math.cos(angle) * distance;
        const y = player.y + Math.sin(angle) * distance;

        // Clamp to campfire area
        const distFromCenter = Math.hypot(x, y);
        let finalX = x, finalY = y;
        if (distFromCenter > CONFIG.CAMPFIRE_RADIUS) {
            const scale = CONFIG.CAMPFIRE_RADIUS / distFromCenter;
            finalX = x * scale * 0.9;
            finalY = y * scale * 0.9;
        }

        // Random power-up type with weighted chances
        const roll = Math.random();
        let type: PowerUpType;
        if (roll < 0.5) type = 'speed';       // 50% speed boost
        else if (roll < 0.75) type = 'xp';    // 25% XP boost
        else if (roll < 0.9) type = 'shield'; // 15% shield
        else type = 'magnet';                  // 10% magnet

        const id = `pu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const powerup = new PowerUp(id, finalX, finalY, type, realm, CONFIG.POWERUP_LIFETIME);
        powerups.push(powerup);

        return powerup;
    }

    /**
     * Update all power-ups (animation and lifetime)
     */
    static updatePowerUps(powerups: PowerUp[], dt: number): void {
        for (let i = powerups.length - 1; i >= 0; i--) {
            powerups[i].update(dt);
            if (powerups[i].life <= 0) {
                powerups.splice(i, 1);
            }
        }
    }

    /**
     * Check for power-up collection
     */
    static checkPowerUpCollection(
        player: Player,
        powerups: PowerUp[],
        realm: string
    ): PowerUp | null {
        for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];
            if (p.realm !== realm) continue;

            const dist = Math.hypot(player.x - p.x, player.y - p.y);
            if (dist < CONFIG.POWERUP_COLLECT_RADIUS + player.r) {
                powerups.splice(i, 1);
                return p;
            }
        }
        return null;
    }

    // === TAG GAME LOGIC (insp.html inspired) ===

    /**
     * Initialize tag game state
     */
    static initTagGame(
        players: Map<string, OtherPlayer>,
        localPlayerId: string
    ): TagGameState {
        // Pick a random player to be "IT"
        const allPlayerIds = [localPlayerId, ...Array.from(players.keys())];
        const itIndex = Math.floor(Math.random() * allPlayerIds.length);
        const itPlayerId = allPlayerIds[itIndex];

        return {
            active: true,
            itPlayerId,
            survivalTime: 0,
            lastTagTime: Date.now()
        };
    }

    /**
     * Check for tag collision between IT player and others
     */
    static checkTagCollision(
        player: Player,
        others: Map<string, OtherPlayer>,
        tagState: TagGameState
    ): { tagged: boolean; newItId: string | null } {
        if (!tagState.active) return { tagged: false, newItId: null };

        // Immunity period after being tagged
        if (Date.now() - tagState.lastTagTime < CONFIG.TAG_IMMUNITY_TIME) {
            return { tagged: false, newItId: null };
        }

        const isPlayerIt = tagState.itPlayerId === player.id;

        if (isPlayerIt) {
            // Player is IT - check collision with others
            for (const [id, other] of others) {
                const dist = Math.hypot(player.x - other.x, player.y - other.y);
                if (dist < CONFIG.TAG_COLLISION_RADIUS + player.r + other.r) {
                    // Tagged someone!
                    return { tagged: true, newItId: id };
                }
            }
        } else {
            // Check if IT player caught us
            const itPlayer = others.get(tagState.itPlayerId!);
            if (itPlayer) {
                const dist = Math.hypot(player.x - itPlayer.x, player.y - itPlayer.y);
                if (dist < CONFIG.TAG_COLLISION_RADIUS + player.r + itPlayer.r) {
                    // We got tagged!
                    return { tagged: true, newItId: player.id };
                }
            }
        }

        return { tagged: false, newItId: null };
    }

    /**
     * Get realm-specific physics multipliers
     */
    static getRealmPhysics(realmId: string): {
        driftMultiplier: number;
        friction: number;
        gravity: { x: number; y: number };
        particleMultiplier: number;
    } {
        const realm = REALMS[realmId as RealmId];
        if (!realm || !realm.physics) {
            return {
                driftMultiplier: 1.0,
                friction: 1.0,
                gravity: { x: 0, y: 0 },
                particleMultiplier: 1.0
            };
        }

        return {
            driftMultiplier: realm.physics.driftMultiplier ?? 1.0,
            friction: realm.physics.friction ?? 1.0,
            gravity: realm.physics.gravity ?? { x: 0, y: 0 },
            particleMultiplier: realm.physics.particleMultiplier ?? 1.0
        };
    }

    /**
     * Check if current realm is a special game mode
     */
    static getRealmSpecial(realmId: string): 'tag' | 'confetti' | 'zen' | null {
        const realm = REALMS[realmId as RealmId];
        return realm?.special ?? null;
    }
}
