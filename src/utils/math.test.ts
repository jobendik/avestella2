// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Math Utilities Unit Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  clamp,
  lerp,
  distance,
  normalizeAngle,
  randomRange,
  easeOutCubic,
  mapRange,
  degToRad,
  radToDeg,
  randomInt,
  randomElement,
  pointInCircle,
  circlesIntersect,
} from './math';

describe('Math Utilities', () => {
  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(0, 10, 0.5)).toBe(5);
    });

    it('should handle negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });
  });

  describe('distance', () => {
    it('should calculate distance between points', () => {
      expect(distance(0, 0, 3, 4)).toBe(5);
      expect(distance(0, 0, 0, 0)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      expect(distance(-3, -4, 0, 0)).toBe(5);
    });
  });

  describe('normalizeAngle', () => {
    it('should normalize angles to 0-2π range', () => {
      expect(normalizeAngle(0)).toBeCloseTo(0);
      expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    });

    it('should handle negative angles', () => {
      expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
    });
  });

  describe('randomRange', () => {
    it('should return values within range', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomRange(0, 10);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('randomInt', () => {
    it('should return integer values within range', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomInt(0, 10);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
  });

  describe('randomElement', () => {
    it('should return an element from the array', () => {
      const arr = [1, 2, 3, 4, 5];
      for (let i = 0; i < 100; i++) {
        const value = randomElement(arr);
        expect(arr).toContain(value);
      }
    });
  });

  describe('easing functions', () => {
    it('easeOutCubic should ease correctly', () => {
      expect(easeOutCubic(0)).toBe(0);
      expect(easeOutCubic(1)).toBe(1);
      expect(easeOutCubic(0.5)).toBeGreaterThan(0.5); // Ease out is faster at start
    });
  });

  describe('mapRange', () => {
    it('should map values between ranges', () => {
      expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
      expect(mapRange(0, 0, 10, 0, 100)).toBe(0);
      expect(mapRange(10, 0, 10, 0, 100)).toBe(100);
    });
  });

  describe('angle conversions', () => {
    it('degToRad should convert degrees to radians', () => {
      expect(degToRad(0)).toBe(0);
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(degToRad(360)).toBeCloseTo(2 * Math.PI);
    });

    it('radToDeg should convert radians to degrees', () => {
      expect(radToDeg(0)).toBe(0);
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
      expect(radToDeg(2 * Math.PI)).toBeCloseTo(360);
    });
  });

  describe('pointInCircle', () => {
    it('should return true for points inside circle', () => {
      expect(pointInCircle(0, 0, 0, 0, 10)).toBe(true);
      expect(pointInCircle(5, 0, 0, 0, 10)).toBe(true);
    });

    it('should return false for points outside circle', () => {
      expect(pointInCircle(15, 0, 0, 0, 10)).toBe(false);
    });
  });

  describe('circlesIntersect', () => {
    it('should return true for overlapping circles', () => {
      expect(circlesIntersect(0, 0, 10, 5, 0, 10)).toBe(true);
    });

    it('should return false for non-overlapping circles', () => {
      expect(circlesIntersect(0, 0, 5, 20, 0, 5)).toBe(false);
    });
  });
});
