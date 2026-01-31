// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Constants Barrel Export
// ═══════════════════════════════════════════════════════════════════════════

// Game Constants (primary source for game mechanics)
export * from './game';

// Progression Constants - exclude duplicates (TUTORIAL_STEPS in game.ts, LADDER_TIERS in cosmetics.ts)
export {
    BASE_XP_TO_LEVEL,
    XP_MULTIPLIER,
    MAX_LEVEL,
    getXPForLevel,
    getLevelFromTotalXP,
    STARDUST_PER_LEVEL,
    MILESTONE_LEVELS,
    MILESTONE_BONUS,
    DAILY_REWARDS,
    STREAK_BONUSES,
    SEASON_PASS_REWARDS,
    SEASON_XP_PER_TIER,
    PREMIUM_PASS_COST,
    getCurrentTier,
    CHALLENGE_TEMPLATES,
    DAILY_CHALLENGE_BONUS,
    MAX_DAILY_REROLLS
} from './progression';
// Also export LADDER_TIERS from progression with alias to avoid conflict with cosmetics
export { LADDER_TIERS as PROGRESSION_LADDER_TIERS } from './progression';
export type { ChallengeTemplate } from './progression';

// Cosmetics Constants
export * from './cosmetics';

// Social Constants - exclude duplicates that exist in game.ts
export {
    AMBIENT_MODES as SOCIAL_AMBIENT_MODES,
    PERSONALITIES
    // DEPRECATED: Mock data removed - use backend API instead
    // DEFAULT_EVENTS,
    // DEFAULT_GUILD,
    // SIMULATED_FRIENDS,
    // SAMPLE_FRIEND_ACTIVITY,
    // SAMPLE_FRIEND_REQUESTS
} from './social';

// UI Constants - exclude duplicates that exist in game.ts  
export {
    DEFAULT_SETTINGS,
    ANIMATION,
    Z_INDEX,
    BREAKPOINTS,
    INSPIRATIONAL_QUOTES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    ICON_SIZES
} from './ui';

// World Constants (Batch 1)
export * from './world';

// Economy Constants (Premium Currency & Mystery Boxes)
export * from './economy';

// Emotes & Status Indicators
export * from './emotes';

// Reputation Tracks
export * from './reputation';

// Referral System
export * from './referral';

// Mentorship System
export * from './mentorship';

// Accessibility Options
export * from './accessibility';

// Companions & Collectibles (Batch 4)
export * from './companions';

// Realm Configuration (physics, visuals, audio scales)
export * from './realms';
