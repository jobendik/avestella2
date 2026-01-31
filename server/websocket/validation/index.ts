// =============================================================================
// WebSocket Message Validation Module
// =============================================================================
// Phase 3 Security: Export all validation utilities
// =============================================================================

export {
    // Core validation
    validateMessage,
    sanitizeString,
    createValidatedHandler,
    
    // Schema registry
    messageSchemas,
    noDataRequiredMessages,
    
    // Individual schemas for type-safe handlers
    playerUpdateSchema,
    singSchema,
    pulseSchema,
    emoteSchema,
    echoSchema,
    resonateEchoSchema,
    lightStarSchema,
    waveSchema,
    resonanceSchema,
    chatSchema,
    whisperSchema,
    friendRequestSchema,
    teleportToFriendSchema,
    createGuildSchema,
    joinGuildSchema,
    guildActionSchema,
    guildChatSchema,
    guildContributeSchema,
    sendGiftSchema,
    claimGiftSchema,
    startMeditationSchema,
    endMeditationSchema,
    sendSignalSchema,
    trackAnalyticsSchema
} from './schemas.js';

// Type inference helpers
import type { z } from 'zod';
import type {
    playerUpdateSchema,
    singSchema,
    chatSchema,
    whisperSchema,
    echoSchema,
    createGuildSchema,
    sendGiftSchema
} from './schemas.js';

// Export inferred types
export type PlayerUpdatePayload = z.infer<typeof playerUpdateSchema>;
export type SingPayload = z.infer<typeof singSchema>;
export type ChatPayload = z.infer<typeof chatSchema>;
export type WhisperPayload = z.infer<typeof whisperSchema>;
export type EchoPayload = z.infer<typeof echoSchema>;
export type CreateGuildPayload = z.infer<typeof createGuildSchema>;
export type SendGiftPayload = z.infer<typeof sendGiftSchema>;
