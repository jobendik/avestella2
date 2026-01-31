/**
 * Game systems exports
 */

// Fragments
export {
  FragmentManager,
  spawnFragment,
  shouldSpawnFragment,
  collectFragments,
  cullDistantFragments,
  initializeFragments,
  pruneFragments,
  FRAGMENT_COLLECT_RADIUS,
  FRAGMENT_SPAWN_RATE,
  type CollectionResult,
} from './fragments';

// Warmth
export {
  WarmthManager,
  calculateWarmthStrength,
  updateWarmthLinger,
  updateRadius,
  updateColdTimer,
  createWarmthState,
  LIGHT_MIN_RADIUS,
  LIGHT_MAX_RADIUS,
  COLD_ONSET_DELAY,
  CROWDING_DISTANCE,
  OPTIMAL_DISTANCE,
  MAX_CONNECTION_DIST,
  WARMTH_LINGER_FRAMES,
  WARMTH_GRANT_FLOOR,
  type WarmthState,
  type NearbyEntity,
} from './warmth';

// Tether
export {
  TetherManager,
  updateTether,
  checkTetheredGuestArrival,
  getTetherUrl,
  parseTetherFromUrl,
  createTetherState,
  TETHER_MAX_DIST,
  TETHER_STRENGTH,
  TETHER_SNAP_TIME,
  type TetherState,
  type TetherHost,
  type TetherUpdateResult,
} from './tether';

// Beacons
export {
  BeaconManager,
  initializeBeaconStates,
  updateBeaconCharges,
  getBeaconWarmth,
  countLitBeacons,
  getNearestBeacon,
  getDistanceToNearestBeacon,
  BEACONS,
  BEACON_ACTIVATION_FRAMES,
  type BeaconChargeResult,
} from './beacons';

// Bonds
export {
  BondManager,
  updateBonds,
  trackSoulsMet,
  updateConstellationBonus,
  getBondStrength,
  getTotalBonds,
  getTotalSoulsMet,
  getStrongestBond,
  createBondState,
  BOND_GROW_RATE,
  BOND_DECAY_RATE,
  type BondState,
} from './bonds';

// Achievements
export {
  AchievementManager,
  checkAchievements,
  isAchievementUnlocked,
  getAchievementProgress,
  getAchievementById,
  getAllAchievements,
  createGameStats,
  ACHIEVEMENTS,
  type Achievement,
  type AchievementDefinition,
  type GameStats,
  type AchievementProgress,
} from './achievements';

// Physics
export {
  PhysicsManager,
  applyMovement,
  applyFriction,
  updatePosition,
  applyBoundaryForces,
  getSpeed,
  WORLD_SIZE,
  PLAYER_ACCELERATION,
  PLAYER_FRICTION,
  BOUNDARY_PADDING,
  BOUNDARY_FORCE,
  BOUNDARY_TARGET_DISTANCE,
  type PhysicsState,
} from './physics';

// Stars (Procedural Generation)
export {
  seededRandom,
  generateCellStars,
  ensureStarsAroundPosition,
  updateStarTwinkle,
  getStarBrightness,
  lightStar,
  getVisibleStars,
  getStarsNearPosition,
  createStarFieldState,
  pruneDistantStars,
  detectConstellations,
  REALM_STAR_DENSITY,
  type Star,
  type StarFieldState,
} from './stars';

// Echoes (with Ignition mechanics)
export {
  Echo,
  createEchoState,
  upsertEcho,
  removeEcho,
  updateEchoes,
  findEchoAtPosition,
  tryIgniteEchoAt,
  getEchoesNearPosition,
  getEchoesInRealm,
  createPlayerEcho,
  getEchoColor,
  getEchoGlowColor,
  isEchoTextVisible,
  ECHO_BASE_RADIUS,
  ECHO_CLICK_RADIUS,
  ECHO_VISIBILITY_RADIUS,
  MAX_ECHOES,
  type EchoData,
  type EchoState,
  type EchoInteractionResult,
} from './echoes';

// Tag Arena Game Mode
export {
  createTagGameState,
  initTagGame,
  endTagGame,
  checkTagCollision,
  processTag,
  updateSurvivalTime,
  getTagSpeedModifier,
  isPlayerImmune,
  getItPlayerPosition,
  getItPlayerDirection,
  formatSurvivalTime,
  getGameDuration,
  canStartTagGame,
  TAG_CONFIG,
  type TagGameState,
  type TagPlayer,
  type TagCollisionResult,
  type TagSpeedModifier,
} from './tagArena';
