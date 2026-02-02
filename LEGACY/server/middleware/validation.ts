// Input validation schemas using Zod
import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const RealmIdSchema = z.enum(['genesis', 'nebula', 'void', 'starforge', 'sanctuary']);
export type RealmId = z.infer<typeof RealmIdSchema>;

export const CoordinateSchema = z.number().finite();

export const PlayerIdSchema = z.string().min(1).max(100);

export const PlayerNameSchema = z.string().min(1).max(30).default('Wanderer');

export const HueSchema = z.number().min(0).max(360);

export const XPSchema = z.number().min(0).int();

// ============================================
// EVENT SCHEMAS
// ============================================

export const NetworkEventTypeSchema = z.enum([
    'whisper', 'sing', 'pulse', 'echo', 'emote', 'star_lit'
]);

export const BaseEventSchema = z.object({
    type: NetworkEventTypeSchema,
    x: CoordinateSchema,
    y: CoordinateSchema,
    uid: PlayerIdSchema,
    name: PlayerNameSchema,
    realm: RealmIdSchema.default('genesis'),
    t: z.number().positive()
});

export const WhisperEventSchema = BaseEventSchema.extend({
    type: z.literal('whisper'),
    text: z.string().max(500).optional(),
    dx: CoordinateSchema.optional(),
    dy: CoordinateSchema.optional(),
    target: PlayerIdSchema.optional(),
    hue: HueSchema.optional(),
    xp: XPSchema.optional(),
    singing: z.number().min(0).max(1).optional(),
    pulsing: z.number().min(0).max(1).optional(),
    emoting: z.string().max(10).nullable().optional()
});

export const SingEventSchema = BaseEventSchema.extend({
    type: z.literal('sing'),
    hue: HueSchema.optional()
});

export const PulseEventSchema = BaseEventSchema.extend({
    type: z.literal('pulse')
});

export const EchoEventSchema = BaseEventSchema.extend({
    type: z.literal('echo'),
    text: z.string().min(1).max(200),
    hue: HueSchema.optional()
});

export const EmoteEventSchema = BaseEventSchema.extend({
    type: z.literal('emote'),
    emoji: z.string().max(10)
});

export const StarLitEventSchema = BaseEventSchema.extend({
    type: z.literal('star_lit'),
    starId: z.string().min(1).max(100)
});

// Union of all event types
export const NetworkEventSchema = z.discriminatedUnion('type', [
    WhisperEventSchema,
    SingEventSchema,
    PulseEventSchema,
    EchoEventSchema,
    EmoteEventSchema,
    StarLitEventSchema
]);

export type NetworkEvent = z.infer<typeof NetworkEventSchema>;

// ============================================
// ECHO SCHEMAS
// ============================================

export const CreateEchoSchema = z.object({
    x: CoordinateSchema,
    y: CoordinateSchema,
    text: z.string().min(1).max(200),
    hue: HueSchema.default(0),
    name: PlayerNameSchema,
    realm: RealmIdSchema.default('genesis'),
    timestamp: z.number().positive().optional()
});

export type CreateEchoInput = z.infer<typeof CreateEchoSchema>;

// ============================================
// QUERY SCHEMAS
// ============================================

export const GetPlayersQuerySchema = z.object({
    realm: RealmIdSchema.optional(),
    x: z.coerce.number().optional(),
    y: z.coerce.number().optional(),
    radius: z.coerce.number().positive().max(10000).default(3000)
});

export const GetEchoesQuerySchema = z.object({
    realm: RealmIdSchema.optional()
});

export const GetLitStarsQuerySchema = z.object({
    realm: RealmIdSchema.optional()
});

// ============================================
// PLAYER STATE SCHEMA
// ============================================

export const PlayerStateSchema = z.object({
    id: PlayerIdSchema,
    name: PlayerNameSchema,
    x: CoordinateSchema,
    y: CoordinateSchema,
    realm: RealmIdSchema,
    hue: HueSchema,
    xp: XPSchema,
    lastSeen: z.number().positive(),
    singing: z.number().min(0).max(1).optional(),
    pulsing: z.number().min(0).max(1).optional(),
    emoting: z.string().max(10).nullable().optional(),
    isBot: z.boolean().optional()
});

export type PlayerState = z.infer<typeof PlayerStateSchema>;

// ============================================
// STARS SCHEMA
// ============================================

export const StarsStateSchema = z.object({
    starId: z.string().min(1).max(100),
    playerId: PlayerIdSchema.optional()
});

export type StarsState = z.infer<typeof StarsStateSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate and parse data, returning result or throwing
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
}

/**
 * Validate and parse data, returning result object
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown) {
    return schema.safeParse(data);
}

/**
 * Format Zod errors for API response
 */
export function formatZodError(error: z.ZodError): { field: string; message: string }[] {
    return error.issues.map((issue: z.ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message
    }));
}
