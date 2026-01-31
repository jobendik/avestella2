/**
 * Core rendering utilities and canvas management
 * Ported from legacy_3/src/rendering/utils.ts
 */

export interface CanvasContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Create a standardized canvas context with camera offsets
 */
export const createCanvasContext = (
  canvas: HTMLCanvasElement,
  playerX: number,
  playerY: number
): CanvasContext => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context from canvas');
  }
  
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const offsetX = centerX - playerX;
  const offsetY = centerY - playerY;
  
  return { ctx, width, height, centerX, centerY, offsetX, offsetY };
};

/**
 * Clear the canvas with a solid black background
 */
export const clearCanvas = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
};

/**
 * Check if a point is within the viewport (with padding for culling)
 */
export const isInViewport = (
  x: number,
  y: number,
  width: number,
  height: number,
  padding: number = 100
): boolean => {
  return (
    x >= -padding &&
    x <= width + padding &&
    y >= -padding &&
    y <= height + padding
  );
};

/**
 * Convert world coordinates to screen position
 */
export const worldToScreen = (
  worldX: number,
  worldY: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } => {
  return {
    x: worldX + offsetX,
    y: worldY + offsetY
  };
};

/**
 * Convert screen position to world coordinates
 */
export const screenToWorld = (
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } => {
  return {
    x: screenX - offsetX,
    y: screenY - offsetY
  };
};

/**
 * Draw a rounded rectangle (for chat bubbles, UI elements)
 */
export const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
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
};

/**
 * Convert hex color to RGB object
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 191, b: 36 };
};
