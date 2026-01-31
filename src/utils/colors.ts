// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Color Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

/**
 * Convert RGB to hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Linear interpolation between two colors
 */
export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  
  return rgbToHex(r, g, b);
}

/**
 * Add alpha channel to a hex color
 */
export function addAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Lighten a color by a percentage
 */
export function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percent / 100;
  
  return rgbToHex(
    Math.min(255, r * factor),
    Math.min(255, g * factor),
    Math.min(255, b * factor)
  );
}

/**
 * Darken a color by a percentage
 */
export function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  
  return rgbToHex(
    Math.max(0, r * factor),
    Math.max(0, g * factor),
    Math.max(0, b * factor)
  );
}

/**
 * Get contrasting text color (black or white) for a background
 */
export function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Generate a random color within a hue range
 */
export function randomColorInRange(
  hueMin: number,
  hueMax: number,
  saturation = 70,
  lightness = 60
): string {
  const hue = hueMin + Math.random() * (hueMax - hueMin);
  return hslToHex(hue, saturation, lightness);
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  );
}

/**
 * Create a color gradient string for canvas
 */
export function createGradientStops(colors: string[]): { offset: number; color: string }[] {
  return colors.map((color, index) => ({
    offset: index / (colors.length - 1),
    color,
  }));
}

/**
 * Blend multiple colors together
 */
export function blendColors(colors: string[], weights?: number[]): string {
  if (colors.length === 0) return '#ffffff';
  if (colors.length === 1) return colors[0];
  
  const normalizedWeights = weights || colors.map(() => 1 / colors.length);
  const totalWeight = normalizedWeights.reduce((a, b) => a + b, 0);
  
  let r = 0, g = 0, b = 0;
  
  colors.forEach((color, i) => {
    const rgb = hexToRgb(color);
    const weight = normalizedWeights[i] / totalWeight;
    r += rgb.r * weight;
    g += rgb.g * weight;
    b += rgb.b * weight;
  });
  
  return rgbToHex(r, g, b);
}

/**
 * Get a cycling rainbow color based on time
 * Returns an actual hex color that cycles through the spectrum
 */
export function getRainbowColor(timeOffset = 0): string {
  const hue = (Date.now() / 20 + timeOffset) % 360;
  return hslToHex(hue, 80, 60);
}

/**
 * Resolve a color value, handling special values like #RAINBOW
 */
export function resolveColor(color: string, timeOffset = 0): string {
  if (color === '#RAINBOW' || color === 'RAINBOW') {
    return getRainbowColor(timeOffset);
  }
  return color;
}
