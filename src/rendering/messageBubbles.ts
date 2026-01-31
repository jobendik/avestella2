/**
 * Canvas-based Message Bubble Rendering
 * Ported from LEGACY/src/game/renderer.ts (message bubble rendering)
 * 
 * Features:
 * - Floating message bubbles above entities
 * - Fade in/out animation
 * - Rising float effect
 * - Text truncation for long messages
 * - Player hue-colored borders
 * - Distinct styles for bots vs players
 */

import type { CanvasContext } from './utils';
import { worldToScreen, isInViewport } from './utils';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MessageBubbleData {
  entityId: string;
  x: number;
  y: number;
  halo: number;          // Entity halo radius (for positioning)
  hue: number;           // Entity color hue
  message: string;
  messageTimer: number;  // Frames remaining (fades as approaches 0)
  yOffset: number;       // Floating offset (starts 0, decreases to rise)
  isBot: boolean;
}

export interface MessageBubbleOptions {
  /** Max bubble width before truncation */
  maxWidth?: number;
  /** Font family */
  fontFamily?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Padding inside bubble */
  padding?: number;
  /** Border radius */
  borderRadius?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<MessageBubbleOptions> = {
  maxWidth: 200,
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
  padding: 14,
  borderRadius: 10,
};

const BOT_OPTIONS: Required<MessageBubbleOptions> = {
  maxWidth: 180,
  fontFamily: 'Outfit, Inter, sans-serif',
  fontSize: 12,
  padding: 12,
  borderRadius: 8,
};

/** Frames for fade in/out calculation */
const FADE_FRAMES = 60;

// ============================================================================
// Rendering Functions
// ============================================================================

/**
 * Render a single message bubble above an entity
 */
export function renderMessageBubble(
  context: CanvasContext,
  bubble: MessageBubbleData,
  viewAlpha: number = 1.0,
  options: MessageBubbleOptions = {}
): void {
  const { ctx, width, height, offsetX, offsetY } = context;
  
  // Skip if no message or timer expired
  if (!bubble.message || bubble.messageTimer <= 0) return;

  // Convert to screen coordinates
  const screen = worldToScreen(bubble.x, bubble.y, offsetX, offsetY);
  
  // Viewport culling
  if (!isInViewport(screen.x, screen.y, width, height, 150)) return;

  const opts = bubble.isBot
    ? { ...BOT_OPTIONS, ...options }
    : { ...DEFAULT_OPTIONS, ...options };

  // Calculate alpha (fade in/out based on timer)
  const msgAlpha = Math.min(1, bubble.messageTimer / FADE_FRAMES) * viewAlpha;
  
  // Calculate bubble Y position (above entity, with float offset)
  const baseOffset = bubble.isBot ? 35 : 38;
  const msgY = screen.y - bubble.halo - baseOffset + bubble.yOffset;

  // Measure text for bubble sizing
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
  const textWidth = ctx.measureText(bubble.message).width;
  const bubbleWidth = Math.min(opts.maxWidth, textWidth + opts.padding * 2);
  const bubbleHeight = opts.fontSize + opts.padding;

  // Truncate message if needed
  let displayMsg = bubble.message;
  if (textWidth > bubbleWidth - opts.padding * 2) {
    displayMsg = truncateText(ctx, bubble.message, bubbleWidth - opts.padding * 2);
  }

  ctx.save();

  // Draw bubble background
  if (bubble.isBot) {
    // Bot bubbles: dark blue-ish background
    ctx.fillStyle = `rgba(30, 40, 60, ${msgAlpha * 0.9})`;
  } else {
    // Player bubbles: darker background
    ctx.fillStyle = `rgba(20, 30, 50, ${msgAlpha * 0.92})`;
  }

  ctx.beginPath();
  roundRect(
    ctx,
    screen.x - bubbleWidth / 2,
    msgY - bubbleHeight / 2,
    bubbleWidth,
    bubbleHeight,
    opts.borderRadius
  );
  ctx.fill();

  // Draw bubble border
  if (bubble.isBot) {
    ctx.strokeStyle = `rgba(150, 180, 255, ${msgAlpha * 0.5})`;
    ctx.lineWidth = 1;
  } else {
    // Player border uses their hue
    ctx.strokeStyle = `hsla(${bubble.hue}, 60%, 60%, ${msgAlpha * 0.6})`;
    ctx.lineWidth = 1.5;
  }
  ctx.stroke();

  // Draw message text
  ctx.fillStyle = `rgba(255, 255, 255, ${msgAlpha * 0.95})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayMsg, screen.x, msgY);

  ctx.restore();
}

/**
 * Render all message bubbles
 */
export function renderAllMessageBubbles(
  context: CanvasContext,
  bubbles: MessageBubbleData[],
  viewAlpha: number = 1.0,
  options: MessageBubbleOptions = {}
): void {
  bubbles.forEach((bubble) => {
    renderMessageBubble(context, bubble, viewAlpha, options);
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Truncate text to fit within a max width, adding ellipsis
 */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let truncated = text;
  const ellipsis = '...';

  while (truncated.length > 0 && ctx.measureText(truncated + ellipsis).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  return truncated + ellipsis;
}

/**
 * Draw a rounded rectangle (polyfill for roundRect)
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  // Use native roundRect if available
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  // Fallback for older browsers
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

// ============================================================================
// Message State Management
// ============================================================================

export interface EntityMessageState {
  message: string;
  timer: number;       // Frames remaining
  yOffset: number;     // Current float offset
}

/**
 * Update message state (timer countdown, floating effect)
 * @param state - Current message state
 * @param deltaFrames - Frames elapsed (typically 1)
 * @returns Updated state, or null if message has expired
 */
export function updateMessageState(
  state: EntityMessageState,
  deltaFrames: number = 1
): EntityMessageState | null {
  const newTimer = state.timer - deltaFrames;
  
  if (newTimer <= 0) {
    return null; // Message expired
  }

  // Float upward over time (starts at 0, goes negative to rise)
  const floatSpeed = 0.3;
  const newOffset = state.yOffset - floatSpeed * deltaFrames;

  return {
    message: state.message,
    timer: newTimer,
    yOffset: newOffset,
  };
}

/**
 * Create a new message state
 * @param message - Message text
 * @param durationFrames - How long to show (default: 300 = ~5 seconds at 60fps)
 */
export function createMessageState(
  message: string,
  durationFrames: number = 300
): EntityMessageState {
  return {
    message,
    timer: durationFrames,
    yOffset: 0,
  };
}

/**
 * Convert entity message states to renderable bubble data
 */
export function entitiesToBubbles(
  entities: Array<{
    id: string;
    x: number;
    y: number;
    halo?: number;
    hue: number;
    isBot?: boolean;
    messageState?: EntityMessageState | null;
  }>
): MessageBubbleData[] {
  return entities
    .filter((e) => e.messageState && e.messageState.timer > 0)
    .map((e) => ({
      entityId: e.id,
      x: e.x,
      y: e.y,
      halo: e.halo ?? 15,
      hue: e.hue,
      message: e.messageState!.message,
      messageTimer: e.messageState!.timer,
      yOffset: e.messageState!.yOffset,
      isBot: e.isBot ?? false,
    }));
}
