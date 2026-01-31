// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Color Utilities Unit Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  lerpColor,
  getContrastColor,
  lighten,
  darken,
  addAlpha,
} from './colors';

describe('Color Utilities', () => {
  describe('hexToRgb', () => {
    it('should convert hex to RGB', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('rgbToHex', () => {
    it('should convert RGB to hex', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
    });
  });

  describe('lerpColor', () => {
    it('should interpolate between colors', () => {
      const black = '#000000';
      const white = '#ffffff';
      
      expect(lerpColor(black, white, 0)).toBe('#000000');
      expect(lerpColor(black, white, 1)).toBe('#ffffff');
      expect(lerpColor(black, white, 0.5)).toBe('#808080');
    });
  });

  describe('getContrastColor', () => {
    it('should return appropriate contrast color', () => {
      // Light backgrounds should get dark text
      expect(getContrastColor('#ffffff')).toBe('#000000');
      // Dark backgrounds should get light text
      expect(getContrastColor('#000000')).toBe('#ffffff');
    });
  });

  describe('lighten', () => {
    it('should lighten colors', () => {
      const result = lighten('#808080', 20);
      expect(result).not.toBe('#808080');
    });
  });

  describe('darken', () => {
    it('should darken colors', () => {
      const result = darken('#808080', 20);
      expect(result).not.toBe('#808080');
    });
  });

  describe('addAlpha', () => {
    it('should add alpha to hex color', () => {
      const result = addAlpha('#ff0000', 0.5);
      expect(result).toContain('rgba');
    });
  });
});
