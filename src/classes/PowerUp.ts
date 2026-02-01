// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Power-Up Entity Class (Ported from LEGACY)
// ═══════════════════════════════════════════════════════════════════════════

import { POWERUP_LIFETIME, POWERUP_SPAWN_CHANCE, POWERUP_COLLECT_RADIUS, MAX_POWERUPS, CAMPFIRE_RADIUS, CAMPFIRE_CENTER } from '@/constants/game';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PowerUpType = 'speed' | 'xp' | 'shield' | 'magnet';

export interface PowerUpConfig {
  type: PowerUpType;
  icon: string;
  color: string;
  hue: number;
  name: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Power-Up Configurations
// ─────────────────────────────────────────────────────────────────────────────

export const POWERUP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  speed: {
    type: 'speed',
    icon: '⚡',
    color: '#FFD700',
    hue: 55,
    name: 'Speed Boost',
    description: '2.2x movement speed for 3 seconds'
  },
  xp: {
    type: 'xp',
    icon: '✨',
    color: '#7B68EE',
    hue: 270,
    name: 'XP Bonus',
    description: 'Instant +50 XP'
  },
  shield: {
    type: 'shield',
    icon: '🛡️',
    color: '#00CED1',
    hue: 200,
    name: 'Shield',
    description: 'Protection effect for 3 seconds'
  },
  magnet: {
    type: 'magnet',
    icon: '🧲',
    color: '#FF69B4',
    hue: 330,
    name: 'Star Magnet',
    description: 'Attract nearby stars for 3 seconds'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Power-Up Class
// ─────────────────────────────────────────────────────────────────────────────

export class PowerUp {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
  life: number;
  maxLife: number;
  pulseT: number;
  realm: string;
  r: number;
  collected: boolean;

  constructor(
    id: string,
    x: number,
    y: number,
    type: PowerUpType,
    realm: string = 'genesis',
    lifetime: number = POWERUP_LIFETIME
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.life = lifetime;
    this.maxLife = lifetime;
    this.pulseT = 0;
    this.realm = realm;
    this.r = 14;
    this.collected = false;
  }

  /**
   * Update power-up animation and lifetime
   */
  update(deltaTime: number): void {
    this.life -= deltaTime;
    this.pulseT += deltaTime * 5;
  }

  /**
   * Check if power-up is expired
   */
  isExpired(): boolean {
    return this.life <= 0;
  }

  /**
   * Get remaining life as a ratio (0-1)
   */
  getLifeRatio(): number {
    return Math.max(0, this.life / this.maxLife);
  }

  /**
   * Get pulse scale for animation
   */
  getPulseScale(): number {
    return 1 + Math.sin(this.pulseT) * 0.2;
  }

  /**
   * Get configuration for this power-up type
   */
  getConfig(): PowerUpConfig {
    return POWERUP_CONFIGS[this.type];
  }

  /**
   * Get color based on type
   */
  getColor(): string {
    return POWERUP_CONFIGS[this.type].color;
  }

  /**
   * Get icon based on type
   */
  getIcon(): string {
    return POWERUP_CONFIGS[this.type].icon;
  }

  /**
   * Get display name
   */
  getName(): string {
    return POWERUP_CONFIGS[this.type].name;
  }

  /**
   * Serialize for network transmission
   */
  toJSON(): object {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      type: this.type,
      life: this.life,
      realm: this.realm
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Power-Up Manager Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update all power-ups (animation and lifetime)
 */
export function updatePowerUps(powerups: PowerUp[], deltaTime: number): PowerUp[] {
  return powerups.filter(p => {
    p.update(deltaTime);
    return !p.isExpired() && !p.collected;
  });
}

/**
 * Check for power-up collection
 */
export function checkPowerUpCollection(
  playerX: number,
  playerY: number,
  playerRadius: number,
  powerups: PowerUp[],
  realm: string
): PowerUp | null {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (p.realm !== realm || p.collected) continue;

    const dist = Math.hypot(playerX - p.x, playerY - p.y);
    if (dist < POWERUP_COLLECT_RADIUS + playerRadius) {
      p.collected = true;
      return p;
    }
  }
  return null;
}
