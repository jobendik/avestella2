/**
 * Rendering system exports
 */

// Utilities
export {
  createCanvasContext,
  clearCanvas,
  isInViewport,
  worldToScreen,
  screenToWorld,
  drawRoundedRect,
  hexToRgb,
  type CanvasContext,
} from './utils';

// Effects
export {
  renderFragments,
  renderEchoes,
  renderParticles,
  renderRipples,
  renderShockwaves,
  renderScreenFlash,
  renderVignette,
  renderWarmthGlow,
  type Fragment,
  type Echo,
  type ScreenFlash,
  type ParticleData,
  type RippleData,
  type ShockwaveData,
} from './effects';

// Entities
export {
  renderBeacons,
  renderConstellationLines,
  renderTether,
  renderBondLines,
  renderEntity,
  renderPlayer,
  BEACONS,
  type Beacon,
  type BeaconState,
  type LocalMessage,
  type RenderableEntity,
} from './entities';

// Advanced Tether/Bond Rendering (ported from LEGACY)
export {
  renderPlayerTethers,
  renderSocialGraph,
  renderSocialClusters,
  renderAllTethers,
  calculateTetherStrength,
  isInTetherRange,
  getEntitiesInTetherRange,
  type TetherEntity,
  type BondedEntity,
  type TetherRenderOptions,
} from './tethers';

// Canvas-based Message Bubbles (ported from LEGACY)
export {
  renderMessageBubble,
  renderAllMessageBubbles,
  updateMessageState,
  createMessageState,
  entitiesToBubbles,
  type MessageBubbleData,
  type MessageBubbleOptions,
  type EntityMessageState,
} from './messageBubbles';

// Game Mode Overlays (Tag Arena, Boost, Compass, Voice)
export {
  renderTagOverlay,
  renderBoostOverlay,
  renderNavigationCompass,
  renderVoiceProximityRing,
  type OverlayOptions,
  type BoostState,
  type VoiceProximityOptions,
} from './gameOverlays';

// Nebula Background & Ambient Effects
export {
  renderBackground,
  renderRealmBackground,
  renderNebulaGradient,
  renderNebulaClouds,
  renderVignette as renderNebulaVignette,
  generateAmbientParticles,
  updateAmbientParticles,
  renderAmbientParticles,
  renderFallingLeaves,
  renderConfetti,
  type NebulaCloud,
  type BackgroundOptions,
  type AmbientParticle,
} from './nebulaBackground';

// Constellation Detection & Rendering
export {
  findConstellations,
  filterStarsByRealm,
  getConstellationStats,
  renderConstellations,
  renderConstellation,
  renderConstellationLinesOnly,
  CONSTELLATION_CONFIG,
  type Star as ConstellationStar,
  type Constellation,
  type ConstellationConfig,
  type ConstellationRenderOptions,
} from './constellations';
