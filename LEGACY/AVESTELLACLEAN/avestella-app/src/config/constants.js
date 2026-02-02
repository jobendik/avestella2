export const WORLD_SIZE = 8000;
export const LIGHT_MIN_RADIUS = 30;
export const LIGHT_MAX_RADIUS = 180;
export const COLD_ONSET_DELAY = 8000;
export const TETHER_MAX_DIST = 500;
export const TETHER_STRENGTH = 0.02;
export const TETHER_SNAP_TIME = 180;
export const WARMTH_LINGER_FRAMES = 900;
export const WARMTH_GRANT_FLOOR = 450;
export const IDLE_BREATH_THRESHOLD = 180;
export const CROWDING_DISTANCE = 50;
export const OPTIMAL_DISTANCE = 120;
export const MAX_CONNECTION_DIST = 300;
export const FRAGMENT_COLLECT_RADIUS = 60;
export const FRAGMENT_SPAWN_RATE = 0.02;
export const BEACON_ACTIVATION_FRAMES = 4;
export const PRESENCE_HEARTBEAT_MS = 15000;
export const CHAT_BUBBLE_DURATION = 8000;
export const AI_COUNT = 20;
export const BOND_GROW_RATE = 0.002;
export const BOND_DECAY_RATE = 0.0005;
export const LERP_FACTOR = 0.1;

export const BEACONS = [
    { id: 'b1', x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, icon: '🌟', type: 'sanctuary' },
    { id: 'b2', x: WORLD_SIZE / 2 - 1000, y: WORLD_SIZE / 2 - 1000, icon: '🔮', type: 'wisdom' },
    { id: 'b3', x: WORLD_SIZE / 2 + 1000, y: WORLD_SIZE / 2 + 1000, icon: '✨', type: 'hope' },
    { id: 'b4', x: WORLD_SIZE / 2 + 1000, y: WORLD_SIZE / 2 - 1000, icon: '⚡', type: 'courage' },
    { id: 'b5', x: WORLD_SIZE / 2 - 1000, y: WORLD_SIZE / 2 + 1000, icon: '💫', type: 'unity' },
];
