// Type utilities and guards for improved type safety

import type {
    Player,
    OtherPlayer,
    Settings,
    RealmId,
    NetworkEvent
} from './index';

// ============================================
// Type Guards
// ============================================

/**
 * Check if a value is a valid RealmId
 */
export function isRealmId(value: unknown): value is RealmId {
    return (
        typeof value === 'string' &&
        ['genesis', 'nebula', 'void', 'starforge', 'sanctuary'].includes(value)
    );
}

/**
 * Check if a value is a valid NetworkEvent type
 */
export function isNetworkEventType(
    value: unknown
): value is NetworkEvent['type'] {
    return (
        typeof value === 'string' &&
        ['whisper', 'sing', 'pulse', 'echo', 'emote', 'star_lit'].includes(value)
    );
}

/**
 * Check if player object is valid
 */
export function isValidPlayer(value: unknown): value is Player {
    if (!value || typeof value !== 'object') return false;
    const p = value as Record<string, unknown>;
    return (
        typeof p.x === 'number' &&
        typeof p.y === 'number' &&
        typeof p.hue === 'number' &&
        typeof p.id === 'string' &&
        typeof p.name === 'string'
    );
}

/**
 * Check if other player object is valid
 */
export function isValidOtherPlayer(value: unknown): value is OtherPlayer {
    if (!value || typeof value !== 'object') return false;
    const p = value as Record<string, unknown>;
    return (
        typeof p.x === 'number' &&
        typeof p.y === 'number' &&
        typeof p.hue === 'number' &&
        typeof p.id === 'string' &&
        typeof p.name === 'string'
    );
}

// ============================================
// Safe Accessors
// ============================================

/**
 * Safely access settings with defaults
 */
export interface SafeSettings {
    music: boolean;
    volume: number;
    particles: boolean;
    shake: boolean;
    ptt: boolean;
    vad: boolean;
    sensitivity: number;
    hue: number;
}

export function getSafeSettings(settings: Partial<Settings>): SafeSettings {
    return {
        music: settings.music ?? true,
        volume: settings.volume ?? 0.7,
        particles: settings.particles ?? true,
        shake: settings.shake ?? true,
        ptt: settings.ptt ?? true,
        vad: settings.vad ?? false,
        sensitivity: settings.sensitivity ?? 0.5,
        hue: settings.hue ?? Math.random() * 360
    };
}

/**
 * Get a setting value with type safety and default
 */
export function getSettingValue<K extends keyof SafeSettings>(
    settings: Partial<Settings>,
    key: K,
    defaultValue: SafeSettings[K]
): SafeSettings[K] {
    const value = settings[key];
    if (value === undefined) return defaultValue;
    return value as SafeSettings[K];
}

// ============================================
// Canvas Context Type Extensions
// ============================================

/**
 * Extended canvas rendering context with vendor prefixes
 * Use this instead of (ctx as any) casts
 */
export interface ExtendedCanvasRenderingContext2D
    extends CanvasRenderingContext2D {
    webkitImageSmoothingEnabled?: boolean;
    mozImageSmoothingEnabled?: boolean;
}

/**
 * Type-safe way to set image smoothing across browsers
 */
export function setImageSmoothing(
    ctx: CanvasRenderingContext2D,
    enabled: boolean
): void {
    ctx.imageSmoothingEnabled = enabled;

    // Handle vendor prefixes safely
    const extCtx = ctx as ExtendedCanvasRenderingContext2D;
    if ('webkitImageSmoothingEnabled' in extCtx) {
        extCtx.webkitImageSmoothingEnabled = enabled;
    }
    if ('mozImageSmoothingEnabled' in extCtx) {
        extCtx.mozImageSmoothingEnabled = enabled;
    }
}

// ============================================
// Discriminated Unions for Events
// ============================================

/**
 * Type-safe network event with discriminated union
 */
export type TypedNetworkEvent =
    | { type: 'whisper'; x: number; y: number; uid: string; name: string; realm: string; t: number; text: string; target?: string }
    | { type: 'sing'; x: number; y: number; uid: string; name: string; realm: string; t: number; hue: number }
    | { type: 'pulse'; x: number; y: number; uid: string; name: string; realm: string; t: number; hue: number }
    | { type: 'echo'; x: number; y: number; uid: string; name: string; realm: string; t: number; text: string; hue: number }
    | { type: 'emote'; x: number; y: number; uid: string; name: string; realm: string; t: number; emoji: string }
    | { type: 'star_lit'; x: number; y: number; uid: string; name: string; realm: string; t: number; starId: string };

/**
 * Type-safe event handler
 */
export function handleNetworkEvent(event: TypedNetworkEvent): void {
    switch (event.type) {
        case 'whisper':
            // TypeScript knows event.text exists
            console.log(`Whisper: ${event.text}`);
            break;
        case 'sing':
            // TypeScript knows event.hue exists
            console.log(`Sing from hue: ${event.hue}`);
            break;
        case 'pulse':
            console.log(`Pulse from: ${event.name}`);
            break;
        case 'echo':
            console.log(`Echo: ${event.text}`);
            break;
        case 'emote':
            console.log(`Emote: ${event.emoji}`);
            break;
        case 'star_lit':
            console.log(`Star lit: ${event.starId}`);
            break;
    }
}

// ============================================
// Utility Types
// ============================================

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make all properties mutable
 */
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Pick only numeric properties
 */
export type NumericProperties<T> = {
    [K in keyof T as T[K] extends number ? K : never]: T[K];
};

/**
 * Create a partial update type
 */
export type Update<T> = {
    [K in keyof T]?: T[K];
};

// ============================================
// Assertion Functions
// ============================================

/**
 * Assert that a value is defined (not null/undefined)
 */
export function assertDefined<T>(
    value: T | null | undefined,
    message = 'Value is not defined'
): asserts value is T {
    if (value === null || value === undefined) {
        throw new Error(message);
    }
}

/**
 * Assert that a value is a string
 */
export function assertString(
    value: unknown,
    message = 'Value is not a string'
): asserts value is string {
    if (typeof value !== 'string') {
        throw new Error(message);
    }
}

/**
 * Assert that a value is a number
 */
export function assertNumber(
    value: unknown,
    message = 'Value is not a number'
): asserts value is number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new Error(message);
    }
}

// ============================================
// Safe Number Operations
// ============================================

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linearly interpolate between two values
 */
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Safe division that returns 0 instead of NaN/Infinity
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
    if (denominator === 0 || !Number.isFinite(denominator)) {
        return fallback;
    }
    const result = numerator / denominator;
    return Number.isFinite(result) ? result : fallback;
}

// ============================================
// Object Pool for Performance
// ============================================

/**
 * Generic object pool for reducing GC pressure
 */
export class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    private reset: (obj: T) => void;

    constructor(factory: () => T, reset: (obj: T) => void, initialSize = 0) {
        this.factory = factory;
        this.reset = reset;

        // Pre-allocate initial objects
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
        }
    }

    acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.factory();
    }

    release(obj: T): void {
        this.reset(obj);
        this.pool.push(obj);
    }

    get size(): number {
        return this.pool.length;
    }

    clear(): void {
        this.pool.length = 0;
    }
}
