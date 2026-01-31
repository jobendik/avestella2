/**
 * Data exports
 */

export {
  AI_PERSONALITIES,
  getRandomPersonality,
  getPersonalityByType,
  type AIPersonality,
} from './personalities';

export {
  AI_MESSAGES,
  getRandomMessage,
  getCategoryForMood,
  getAllMessages,
  type MessageCategory,
} from './messages';

export {
  EchoManager,
  createEcho,
  getNearbyEchoes,
  pruneExpiredEchoes,
  limitPlayerEchoes,
  isNearEcho,
  ECHO_VISIBILITY_RADIUS,
  ECHO_LIFETIME_MS,
  MAX_ECHOES_PER_PLAYER,
  MAX_ECHOES_IN_VIEW,
} from './echoes';
