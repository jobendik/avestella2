// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Math Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Calculate distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate squared distance (faster, no sqrt)
 */
export function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Normalize an angle to be between 0 and 2π
 */
export function normalizeAngle(angle: number): number {
  const TWO_PI = Math.PI * 2;
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

/**
 * Get angle between two points
 */
export function angleBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Move a value towards a target at a given speed
 */
export function moveTowards(
  current: number,
  target: number,
  maxDelta: number
): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maxDelta;
}

/**
 * Smooth damp - spring-like smoothing
 */
export function smoothDamp(
  current: number,
  target: number,
  velocity: { value: number },
  smoothTime: number,
  deltaTime: number,
  maxSpeed = Infinity
): number {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;

  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  
  let change = current - target;
  const originalTo = target;

  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  const temp = (velocity.value + omega * change) * deltaTime;
  
  velocity.value = (velocity.value - omega * temp) * exp;
  let output = current - change + (change + temp) * exp;

  if (originalTo - current > 0 === output > originalTo) {
    output = originalTo;
    velocity.value = (output - originalTo) / deltaTime;
  }

  return output;
}

/**
 * Easing function: ease out cubic
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Easing function: ease in cubic
 */
export function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Easing function: ease in out cubic
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Easing function: ease out elastic
 */
export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Random float between min and max
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

/**
 * Random element from array
 */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Check if a point is inside a circle
 */
export function pointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number
): boolean {
  return distanceSquared(px, py, cx, cy) <= radius * radius;
}

/**
 * Check if two circles intersect
 */
export function circlesIntersect(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  const radiiSum = r1 + r2;
  return distanceSquared(x1, y1, x2, y2) <= radiiSum * radiiSum;
}

/**
 * Wrap a value around (for infinite scrolling worlds)
 */
export function wrap(value: number, min: number, max: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Simple seeded random number generator
 */
export function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * 2D Perlin-like noise (simplified)
 */
export function simpleNoise2D(x: number, y: number, seed = 12345): number {
  const random = seededRandom(Math.floor(x * 100 + y * 1000 + seed));
  return random() * 2 - 1;
}

/**
 * Smooth step function
 */
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Get bezier curve point
 */
export function bezierPoint(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Additional utilities from legacy_2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ease in out quad easing function
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Format milliseconds to readable time
 */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Check if device is mobile - comprehensive detection
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check 1: User Agent (most reliable for iPhone/iPad)
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS|EdgiOS/i;
  if (mobileRegex.test(userAgent)) {
    console.log('[isMobile] Detected via user agent:', userAgent.substring(0, 100));
    return true;
  }

  // Check 2: Touch capability (strong indicator of mobile)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0;

  // Check 3: Screen width (use screen.width as it's more reliable)
  const screenWidth = window.screen?.width || window.innerWidth || 0;
  const isNarrowScreen = screenWidth <= 768;

  // If has touch AND narrow screen, it's likely mobile
  if (hasTouch && isNarrowScreen) {
    console.log('[isMobile] Detected via touch + narrow screen:', { hasTouch, screenWidth });
    return true;
  }

  // Check 4: Orientation API (mobile-specific)
  if (typeof window.orientation !== 'undefined') {
    console.log('[isMobile] Detected via orientation API');
    return true;
  }

  // Check 5: Platform detection
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
  if (/iPhone|iPad|iPod|Android/i.test(platform)) {
    console.log('[isMobile] Detected via platform:', platform);
    return true;
  }

  // Check 6: Media query for coarse pointer (touch device)
  if (typeof window.matchMedia !== 'undefined') {
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (isCoarsePointer && isNarrowScreen) {
      console.log('[isMobile] Detected via coarse pointer');
      return true;
    }
  }

  console.log('[isMobile] NOT detected as mobile', {
    userAgent: userAgent.substring(0, 100),
    hasTouch,
    screenWidth,
    platform
  });
  return false;
}

/**
 * Generate unique ID with optional prefix
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Draw a rounded rectangle on canvas
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Format distance with appropriate unit (m, km)
 * Useful for HUD displays
 */
export function formatDistance(distanceUnits: number): string {
  // Assuming 1 unit = 1 meter in game world
  if (distanceUnits >= 1000) {
    return (distanceUnits / 1000).toFixed(1) + 'km';
  }
  return Math.round(distanceUnits) + 'm';
}
