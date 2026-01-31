// =============================================================================
// WebSocket Message Validation Schemas (Zod)
// =============================================================================
// Phase 3 Security: Server-side validation for all incoming WebSocket messages
// Prevents malicious payloads, type coercion attacks, and invalid data
// =============================================================================

import { z } from 'zod';

// =============================================================================
// SHARED PRIMITIVES
// =============================================================================

const playerId = z.string().min(1).max(64);
const playerName = z.string().min(1).max(32);
const realm = z.enum(['genesis', 'nebula', 'void', 'starforge', 'sanctuary']);
const coordinate = z.number().min(-50000).max(50000);
const timestamp = z.number().int().positive();
const hue = z.number().min(0).max(360);
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const uuid = z.string().uuid();
const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const idField = z.union([uuid, mongoId, z.string().min(1).max(64)]);

// =============================================================================
// CORE GAME ACTION SCHEMAS
// =============================================================================

export const playerUpdateSchema = z.object({
    x: coordinate,
    y: coordinate,
    dx: z.number().min(-10).max(10).optional(),
    dy: z.number().min(-10).max(10).optional(),
    realm: realm.optional(),
    speaking: z.boolean().optional()
});

export const singSchema = z.object({
    intensity: z.number().min(0).max(1).optional(),
    radius: z.number().min(50).max(500).optional(),
    duration: z.number().min(500).max(5000).optional()
});

export const pulseSchema = z.object({
    radius: z.number().min(20).max(300).optional(),
    strength: z.number().min(0).max(1).optional()
});

export const emoteSchema = z.object({
    emoteId: z.string().min(1).max(32),
    emoteType: z.string().min(1).max(32).optional()
});

export const echoSchema = z.object({
    message: z.string().min(1).max(280),
    x: coordinate,
    y: coordinate,
    ttl: z.number().min(60000).max(3600000).optional() // 1min to 1hr
});

export const resonateEchoSchema = z.object({
    echoId: idField
});

export const lightStarSchema = z.object({
    starId: idField,
    x: coordinate.optional(),
    y: coordinate.optional()
});

export const waveSchema = z.object({
    targetId: playerId.optional(),
    direction: z.number().min(0).max(360).optional()
});

export const resonanceSchema = z.object({
    targetId: playerId,
    intensity: z.number().min(0).max(1).optional()
});

export const pulsePatternCompletedSchema = z.object({
    patternId: idField,
    accuracy: z.number().min(0).max(1),
    duration: z.number().int().positive()
});

export const recordPulseSchema = z.object({
    pulses: z.array(z.object({
        timestamp: z.number(),
        x: coordinate.optional(),
        y: coordinate.optional()
    })).max(100)
});

// =============================================================================
// CHAT SCHEMAS
// =============================================================================

export const chatSchema = z.object({
    message: z.string().min(1).max(500),
    channel: z.enum(['global', 'realm', 'guild', 'party']).optional()
});

export const whisperSchema = z.object({
    targetId: playerId,
    message: z.string().min(1).max(500)
});

export const emojiReactionSchema = z.object({
    targetId: playerId.optional(),
    messageId: idField.optional(),
    emoji: z.string().min(1).max(8)
});

export const typingIndicatorSchema = z.object({
    channel: z.string().optional(),
    targetId: playerId.optional()
});

// =============================================================================
// PROGRESSION SCHEMAS
// =============================================================================

export const challengeProgressSchema = z.object({
    challengeId: idField,
    progress: z.number().int().min(0).max(1000000),
    action: z.string().min(1).max(64).optional()
});

export const claimDailyRewardSchema = z.object({
    day: z.number().int().min(1).max(365).optional()
});

export const claimChallengeRewardSchema = z.object({
    challengeId: idField
});

export const claimSeasonRewardSchema = z.object({
    seasonId: idField,
    tier: z.number().int().min(1).max(100)
});

export const purchaseCosmeticSchema = z.object({
    cosmeticId: idField,
    currency: z.enum(['stars', 'echoes', 'premium']).optional()
});

export const equipCosmeticSchema = z.object({
    cosmeticId: idField,
    slot: z.enum(['aura', 'trail', 'companion', 'emote', 'nameplate', 'background']).optional()
});

// =============================================================================
// PLAYER DATA SCHEMAS
// =============================================================================

export const syncPlayerDataSchema = z.object({
    settings: z.record(z.unknown()).optional(),
    preferences: z.record(z.unknown()).optional(),
    clientVersion: z.string().optional()
});

export const friendRequestSchema = z.object({
    targetId: playerId,
    message: z.string().max(200).optional()
});

export const friendResponseSchema = z.object({
    requestId: idField.optional(),
    senderId: playerId.optional()
});

export const teleportToFriendSchema = z.object({
    friendId: playerId
});

// =============================================================================
// MAP MARKER SCHEMAS
// =============================================================================

export const placeMapMarkerSchema = z.object({
    x: coordinate,
    y: coordinate,
    label: z.string().min(1).max(50).optional(),
    color: hexColor.optional(),
    icon: z.string().max(32).optional(),
    realm: realm.optional()
});

export const removeMapMarkerSchema = z.object({
    markerId: idField
});

// =============================================================================
// COMPANION SCHEMAS
// =============================================================================

export const purchaseCompanionSchema = z.object({
    companionId: idField,
    currency: z.enum(['stars', 'echoes', 'premium']).optional()
});

export const equipCompanionSchema = z.object({
    companionId: idField
});

export const feedCompanionSchema = z.object({
    companionId: idField.optional(),
    foodType: z.string().max(32).optional()
});

export const renameCompanionSchema = z.object({
    companionId: idField.optional(),
    name: z.string().min(1).max(24)
});

// =============================================================================
// WORLD EVENT SCHEMAS
// =============================================================================

export const joinWorldEventSchema = z.object({
    eventId: idField
});

export const contributeEventSchema = z.object({
    eventId: idField,
    contribution: z.number().int().min(1).max(10000),
    contributionType: z.string().max(32).optional()
});

export const claimEventRewardSchema = z.object({
    eventId: idField,
    tier: z.number().int().min(1).max(10).optional()
});

export const fightDarknessSchema = z.object({
    realm: realm.optional(),
    power: z.number().min(1).max(1000).optional()
});

// =============================================================================
// POWER-UP SCHEMAS
// =============================================================================

export const collectPowerUpSchema = z.object({
    powerUpId: idField,
    x: coordinate.optional(),
    y: coordinate.optional()
});

export const activatePowerUpSchema = z.object({
    powerUpId: idField,
    type: z.string().max(32).optional()
});

// =============================================================================
// TAG GAME SCHEMAS
// =============================================================================

export const createTagGameSchema = z.object({
    maxPlayers: z.number().int().min(2).max(20).optional(),
    duration: z.number().int().min(60000).max(600000).optional(), // 1-10 minutes
    realm: realm.optional()
});

export const joinTagGameSchema = z.object({
    sessionId: idField
});

export const tagAttemptSchema = z.object({
    sessionId: idField,
    targetId: playerId
});

// =============================================================================
// MYSTERY BOX SCHEMAS
// =============================================================================

export const openMysteryBoxSchema = z.object({
    boxType: z.enum(['basic', 'rare', 'legendary', 'seasonal']).optional(),
    count: z.number().int().min(1).max(10).optional()
});

// =============================================================================
// ANCHORING / MINDFULNESS SCHEMAS
// =============================================================================

export const enterAnchoringZoneSchema = z.object({
    zoneId: idField
});

export const startMeditationSchema = z.object({
    type: z.enum(['breathing', 'focus', 'body_scan', 'gratitude', 'visualization']).optional(),
    duration: z.number().int().min(60).max(3600).optional() // 1-60 minutes
});

export const endMeditationSchema = z.object({
    completed: z.boolean().optional(),
    duration: z.number().int().min(0).max(3600).optional()
});

export const joinGroupMeditationSchema = z.object({
    sessionId: idField
});

export const breathingSyncSchema = z.object({
    phase: z.enum(['inhale', 'hold', 'exhale', 'rest']),
    timestamp: timestamp.optional()
});

// =============================================================================
// LEADERBOARD SCHEMAS
// =============================================================================

export const requestLeaderboardSchema = z.object({
    type: z.enum(['xp', 'stars', 'echoes', 'bonds', 'exploration', 'quests']).optional(),
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'alltime']).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional()
});

export const requestPlayerRankSchema = z.object({
    type: z.string().max(32).optional()
});

export const requestRealmLeaderboardSchema = z.object({
    realm: realm,
    limit: z.number().int().min(1).max(100).optional()
});

// =============================================================================
// QUEST SCHEMAS
// =============================================================================

export const startQuestSchema = z.object({
    questId: idField
});

export const updateQuestProgressSchema = z.object({
    questId: idField,
    progress: z.number().int().min(0).max(1000000),
    objectiveId: idField.optional()
});

export const claimQuestRewardSchema = z.object({
    questId: idField
});

export const abandonQuestSchema = z.object({
    questId: idField
});

// =============================================================================
// SIGNAL SCHEMAS
// =============================================================================

export const sendSignalSchema = z.object({
    type: z.enum(['help', 'greet', 'follow', 'look', 'celebrate', 'custom']),
    targetId: playerId.optional(),
    x: coordinate.optional(),
    y: coordinate.optional(),
    message: z.string().max(100).optional()
});

export const respondSignalSchema = z.object({
    signalId: idField,
    response: z.enum(['accept', 'decline', 'acknowledge'])
});

export const acknowledgeSignalSchema = z.object({
    signalId: idField
});

// =============================================================================
// EXPLORATION SCHEMAS
// =============================================================================

export const updateExplorationSchema = z.object({
    x: coordinate,
    y: coordinate,
    realm: realm.optional()
});

export const discoverPoiSchema = z.object({
    poiId: idField,
    x: coordinate.optional(),
    y: coordinate.optional()
});

export const discoverBiomeSchema = z.object({
    biomeId: idField,
    biomeType: z.string().max(32).optional()
});

export const revealFogSchema = z.object({
    chunkX: z.number().int().min(-1000).max(1000),
    chunkY: z.number().int().min(-1000).max(1000),
    realm: realm.optional()
});

export const discoverTimeSecretSchema = z.object({
    secretId: idField,
    timeCondition: z.string().max(64).optional()
});

// =============================================================================
// REPUTATION SCHEMAS
// =============================================================================

export const trackReputationActionSchema = z.object({
    action: z.string().min(1).max(64),
    target: playerId.optional(),
    value: z.number().int().min(-100).max(100).optional()
});

export const claimReputationRewardSchema = z.object({
    rewardId: idField,
    track: z.string().max(32).optional()
});

// =============================================================================
// NOTIFICATION SCHEMAS
// =============================================================================

export const updateNotificationPrefsSchema = z.object({
    enabled: z.boolean().optional(),
    categories: z.record(z.boolean()).optional(),
    sound: z.boolean().optional(),
    vibration: z.boolean().optional()
});

export const markNotificationReadSchema = z.object({
    notificationId: idField
});

export const mutePlayerSchema = z.object({
    targetId: playerId,
    duration: z.number().int().min(0).max(86400000).optional() // 0 = permanent, max 24hr
});

// =============================================================================
// GUILD SCHEMAS
// =============================================================================

export const createGuildSchema = z.object({
    name: z.string().min(3).max(32),
    description: z.string().max(500).optional(),
    tag: z.string().min(2).max(6).optional(),
    isPublic: z.boolean().optional(),
    minLevel: z.number().int().min(1).max(100).optional()
});

export const joinGuildSchema = z.object({
    guildId: idField
});

export const guildActionSchema = z.object({
    action: z.enum(['promote', 'demote', 'kick', 'invite', 'leave', 'transfer', 'disband', 'update']),
    targetId: playerId.optional(),
    data: z.record(z.unknown()).optional()
});

export const guildChatSchema = z.object({
    message: z.string().min(1).max(500)
});

export const guildContributeSchema = z.object({
    currency: z.enum(['xp', 'stars', 'echoes']),
    amount: z.number().int().min(1).max(100000)
});

// =============================================================================
// GIFT SCHEMAS
// =============================================================================

export const sendGiftSchema = z.object({
    recipientId: playerId,
    giftType: z.enum(['daily', 'special', 'celebration', 'appreciation']).optional(),
    message: z.string().max(200).optional()
});

export const claimGiftSchema = z.object({
    giftId: idField
});

// =============================================================================
// VOICE CHAT SCHEMAS
// =============================================================================

export const voiceSignalSchema = z.object({
    targetId: playerId.optional(),
    signal: z.record(z.unknown())
});

export const voiceJoinRoomSchema = z.object({
    roomId: idField.optional()
});

export const voiceMuteSchema = z.object({
    muted: z.boolean()
});

export const voiceSpeakingSchema = z.object({
    speaking: z.boolean()
});

// =============================================================================
// BOND SCHEMAS
// =============================================================================

export const getBondSchema = z.object({
    targetId: playerId
});

export const bondInteractionSchema = z.object({
    targetId: playerId,
    type: z.enum(['whisper', 'sing', 'pulse', 'gift', 'play', 'meditate']),
    value: z.number().min(0).max(100).optional()
});

// =============================================================================
// REFERRAL SCHEMAS
// =============================================================================

export const submitReferralSchema = z.object({
    code: z.string().min(6).max(20)
});

export const getReferralLinkSchema = z.object({
    campaign: z.string().max(32).optional()
});

// =============================================================================
// MENTORSHIP SCHEMAS
// =============================================================================

export const startMentorshipSchema = z.object({
    mentorId: playerId.optional(),
    menteeId: playerId.optional()
});

export const mentorshipProgressSchema = z.object({
    sessionId: idField,
    milestone: z.string().max(64),
    completed: z.boolean().optional()
});

export const endMentorshipSchema = z.object({
    sessionId: idField,
    rating: z.number().int().min(1).max(5).optional(),
    feedback: z.string().max(500).optional()
});

// =============================================================================
// SEASON SCHEMAS
// =============================================================================

export const getSeasonInfoSchema = z.object({
    seasonId: idField.optional()
});

export const purchaseBattlePassSchema = z.object({
    tier: z.enum(['basic', 'premium', 'deluxe']).optional()
});

export const claimSeasonTierRewardSchema = z.object({
    tier: z.number().int().min(1).max(100),
    isPremium: z.boolean().optional()
});

// =============================================================================
// GALLERY SCHEMAS
// =============================================================================

export const uploadToGallerySchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    tags: z.array(z.string().max(20)).max(10).optional(),
    imageData: z.string().max(5000000), // ~5MB base64
    visibility: z.enum(['public', 'friends', 'private']).optional()
});

export const likeGalleryItemSchema = z.object({
    itemId: idField
});

export const commentGallerySchema = z.object({
    itemId: idField,
    comment: z.string().min(1).max(500)
});

// =============================================================================
// CONSTELLATION SCHEMAS
// =============================================================================

export const drawConstellationSchema = z.object({
    points: z.array(z.object({
        x: coordinate,
        y: coordinate
    })).min(2).max(100),
    name: z.string().max(50).optional()
});

export const joinConstellationSchema = z.object({
    constellationId: idField
});

// =============================================================================
// DAILY LOGIN SCHEMAS
// =============================================================================

export const claimDailyLoginSchema = z.object({
    day: z.number().int().min(1).max(30).optional()
});

// =============================================================================
// SEEK MODE SCHEMAS
// =============================================================================

export const startSeekModeSchema = z.object({
    mode: z.enum(['hide', 'seek', 'both']).optional(),
    duration: z.number().int().min(60000).max(1800000).optional()
});

export const seekActionSchema = z.object({
    sessionId: idField,
    action: z.enum(['found', 'hint', 'surrender']),
    targetId: playerId.optional()
});

// =============================================================================
// ANALYTICS SCHEMAS
// =============================================================================

export const trackAnalyticsSchema = z.object({
    event: z.string().min(1).max(64),
    category: z.string().max(32).optional(),
    properties: z.record(z.unknown()).optional(),
    timestamp: timestamp.optional()
});

// =============================================================================
// SNAPSHOT SCHEMAS
// =============================================================================

export const snapshotTakenSchema = z.object({
    x: coordinate,
    y: coordinate,
    realm: realm.optional(),
    playersInFrame: z.array(playerId).max(50).optional(),
    timestamp: timestamp.optional()
});

// =============================================================================
// SCHEMA REGISTRY
// Maps message types to their validation schemas
// =============================================================================

export const messageSchemas: Record<string, z.ZodSchema> = {
    // Core actions
    'player_update': playerUpdateSchema,
    'sing': singSchema,
    'pulse': pulseSchema,
    'emote': emoteSchema,
    'echo': echoSchema,
    'echo_ignite': resonateEchoSchema,
    'star_lit': lightStarSchema,
    'wave': waveSchema,
    'resonance': resonanceSchema,
    'pulse_pattern_completed': pulsePatternCompletedSchema,
    'record_pulse': recordPulseSchema,

    // Chat
    'chat': chatSchema,
    'whisper': whisperSchema,
    'emoji_reaction': emojiReactionSchema,
    'typing': typingIndicatorSchema,

    // Progression
    'challenge_progress': challengeProgressSchema,
    'claim_daily_reward': claimDailyRewardSchema,
    'claim_challenge_reward': claimChallengeRewardSchema,
    'claim_season_reward': claimSeasonRewardSchema,
    'purchase_cosmetic': purchaseCosmeticSchema,
    'equip_cosmetic': equipCosmeticSchema,

    // Player data
    'sync_player_data': syncPlayerDataSchema,
    'friend_request': friendRequestSchema,
    'accept_friend': friendResponseSchema,
    'decline_friend': friendResponseSchema,
    'remove_friend': friendResponseSchema,
    'teleport_to_friend': teleportToFriendSchema,

    // Map markers
    'place_map_marker': placeMapMarkerSchema,
    'remove_map_marker': removeMapMarkerSchema,

    // Companion
    'purchase_companion': purchaseCompanionSchema,
    'equip_companion': equipCompanionSchema,
    'feed_companion': feedCompanionSchema,
    'rename_companion': renameCompanionSchema,

    // World events
    'join_world_event': joinWorldEventSchema,
    'contribute_event': contributeEventSchema,
    'claim_event_reward': claimEventRewardSchema,
    'fight_darkness': fightDarknessSchema,

    // Power-ups
    'collect_power_up': collectPowerUpSchema,
    'activate_power_up': activatePowerUpSchema,

    // Tag game
    'tag_create': createTagGameSchema,
    'tag_join': joinTagGameSchema,
    'tag_attempt': tagAttemptSchema,

    // Mystery box
    'open_mystery_box': openMysteryBoxSchema,

    // Anchoring
    'enter_anchoring_zone': enterAnchoringZoneSchema,
    'start_meditation': startMeditationSchema,
    'end_meditation': endMeditationSchema,
    'join_group_meditation': joinGroupMeditationSchema,
    'breathing_sync': breathingSyncSchema,

    // Leaderboard
    'request_leaderboard': requestLeaderboardSchema,
    'request_player_rank': requestPlayerRankSchema,
    'request_realm_leaderboard': requestRealmLeaderboardSchema,

    // Quests
    'start_quest': startQuestSchema,
    'update_quest_progress': updateQuestProgressSchema,
    'claim_quest_reward': claimQuestRewardSchema,
    'abandon_quest': abandonQuestSchema,

    // Signals
    'send_signal': sendSignalSchema,
    'respond_signal': respondSignalSchema,
    'acknowledge_signal': acknowledgeSignalSchema,

    // Exploration
    'update_exploration': updateExplorationSchema,
    'discover_poi': discoverPoiSchema,
    'discover_biome': discoverBiomeSchema,
    'reveal_fog': revealFogSchema,
    'discover_time_secret': discoverTimeSecretSchema,

    // Reputation
    'track_reputation_action': trackReputationActionSchema,
    'claim_reputation_reward': claimReputationRewardSchema,

    // Notifications
    'update_notification_prefs': updateNotificationPrefsSchema,
    'update_notification_preferences': updateNotificationPrefsSchema,
    'mark_notification_read': markNotificationReadSchema,
    'mute_player': mutePlayerSchema,
    'unmute_player': mutePlayerSchema,

    // Guilds
    'create_guild': createGuildSchema,
    'join_guild': joinGuildSchema,
    'guild_action': guildActionSchema,
    'guild_chat': guildChatSchema,
    'guild_contribute': guildContributeSchema,

    // Gifts
    'send_gift': sendGiftSchema,
    'claim_gift': claimGiftSchema,

    // Voice
    'voice_signal': voiceSignalSchema,
    'voice_join_room': voiceJoinRoomSchema,
    'voice_mute': voiceMuteSchema,
    'voice_speaking': voiceSpeakingSchema,

    // Bonds
    'get_bond': getBondSchema,
    'bond_interaction': bondInteractionSchema,

    // Referral
    'submit_referral': submitReferralSchema,
    'get_referral_link': getReferralLinkSchema,

    // Mentorship
    'start_mentorship': startMentorshipSchema,
    'mentorship_progress': mentorshipProgressSchema,
    'end_mentorship': endMentorshipSchema,

    // Season
    'get_season_info': getSeasonInfoSchema,
    'purchase_battle_pass': purchaseBattlePassSchema,
    'claim_season_tier': claimSeasonTierRewardSchema,

    // Gallery
    'upload_to_gallery': uploadToGallerySchema,
    'like_gallery_item': likeGalleryItemSchema,
    'comment_gallery': commentGallerySchema,

    // Constellation
    'draw_constellation': drawConstellationSchema,
    'join_constellation': joinConstellationSchema,

    // Daily login
    'claim_daily_login': claimDailyLoginSchema,

    // Seek mode
    'start_seek_mode': startSeekModeSchema,
    'seek_action': seekActionSchema,

    // Analytics
    'track_analytics': trackAnalyticsSchema,

    // Snapshots
    'snapshot_taken': snapshotTakenSchema
};

// Messages that don't require data validation (getters/queries with optional params)
export const noDataRequiredMessages = new Set([
    'ping',
    'request_progression',
    'request_player_data',
    'get_friends',
    'get_pending_requests',
    'request_communication',
    'request_friend_markers',
    'request_companion_data',
    'unequip_companion',
    'request_world_events',
    'get_event_progress',
    'get_event_leaderboard',
    'request_darkness',
    'get_darkness_level',
    'get_darkness_hazards',
    'request_power_ups',
    'get_active_power_ups',
    'tag_leave',
    'get_tag_games',
    'tag_start',
    'request_mystery_boxes',
    'get_mystery_box_info',
    'get_box_stats',
    'request_box_stats',
    'get_pity_progress',
    'get_global_box_stats',
    'request_anchoring_zones',
    'leave_anchoring_zone',
    'request_mindfulness_stats',
    'request_leaderboard',
    'request_player_rank',
    'request_nearby_ranks',
    'request_friend_leaderboard',
    'request_quests',
    'get_quests',
    'get_active_quests',
    'get_story_quests',
    'get_daily_quests',
    'get_weekly_quests',
    'get_quest_stats',
    'request_signals',
    'get_signals',
    'get_signal_types',
    'get_directed_signals',
    'get_signal_cooldowns',
    'request_exploration_data',
    'get_nearby_pois',
    'get_exploration_stats',
    'get_region_info',
    'get_exploration_milestones',
    'get_discovered_biomes',
    'get_available_time_secrets',
    'get_all_time_secrets',
    'request_reputation',
    'get_track_progress',
    'get_player_reputation',
    'get_reputation_leaderboard',
    'get_notification_preferences',
    'get_notification_prefs',
    'get_notifications',
    'mark_all_notifications_read',
    'mark_all_read',
    'clear_notifications',
    'leave_guild',
    'list_guilds',
    'get_guild_info',
    'get_pending_gifts',
    'get_gift_history',
    'get_gift_cooldown',
    'get_gift_streak',
    'voice_leave_room',
    'get_nearby_voice_peers',
    'get_voice_rooms',
    'get_all_bonds',
    'get_referral_stats',
    'get_mentee_list',
    'get_mentor_list',
    'get_activity_feed',
    'get_unread_count',
    'get_leaderboard_types'
]);

/**
 * Validate incoming WebSocket message data
 * @returns { success: true, data: validated } or { success: false, error: message }
 */
export function validateMessage(type: string, data: unknown): 
    { success: true; data: unknown } | { success: false; error: string } {
    
    // Skip validation for messages that don't require data
    if (noDataRequiredMessages.has(type)) {
        return { success: true, data: data || {} };
    }

    // Get schema for this message type
    const schema = messageSchemas[type];
    
    // If no schema, allow but log warning (unknown message types)
    if (!schema) {
        console.warn(`[Validation] No schema for message type: ${type}`);
        return { success: true, data: data || {} };
    }

    // Validate with schema
    const result = schema.safeParse(data);
    
    if (!result.success) {
        const errors = result.error.errors.map(e => 
            `${e.path.join('.')}: ${e.message}`
        ).join(', ');
        return { success: false, error: `Validation failed: ${errors}` };
    }

    return { success: true, data: result.data };
}

/**
 * Validate and sanitize a string to prevent injection attacks
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/[<>]/g, '') // Remove potential HTML
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .trim();
}

/**
 * Create a type-safe validated message handler
 */
export function createValidatedHandler<T>(
    schema: z.ZodSchema<T>,
    handler: (data: T, ...args: unknown[]) => void
) {
    return (data: unknown, ...args: unknown[]) => {
        const result = schema.safeParse(data);
        if (!result.success) {
            throw new Error(`Validation failed: ${result.error.message}`);
        }
        handler(result.data, ...args);
    };
}
