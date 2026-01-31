// Database module index
export { database } from './connection';
export type { DatabaseConfig } from './connection';
export { Echo, Message, LitStar, Player, Friendship, Beacon, EventProgress, Feedback } from './models';
export type { IEcho, IMessage, ILitStar, IPlayer, IFriendship, IBeacon, IEventProgress, IFeedback } from './models';

// Progression and Social models
DailyChallenge,
    WeeklyChallenge,
    Progression,
    Guild,
    ActivityFeed
} from './progressionModels';
export type {
    IDailyChallenge,
    IWeeklyChallenge,
    IProgression,
    IGuild,
    IActivityFeed
} from './progressionModels';

// Social and Economy models
Reputation,
    ReferralCode,
    Referral,
    MentorProfile,
    MentorshipSession,
    PurchaseHistory,
    ActiveBoost,
    StreakFreeze,
    FriendRequest,
    BlockedPlayer,
    Gift,
    GiftStreak
} from './socialModels';
export type {
    IReputation,
    IReferralCode,
    IReferral,
    IMentorProfile,
    IMentorshipSession,
    IPurchaseHistory,
    IActiveBoost,
    IStreakFreeze,
    IFriendRequest,
    IBlockedPlayer,
    IGift,
    IGiftStreak
} from './socialModels';

// Bond system models
export {
    Bond,
    StarMemory,
    Constellation
} from './bondModels';
export type {
    IBond,
    IStarMemory,
    IConstellation
} from './bondModels';
