// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Storage Utilities Unit Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
  isStorageAvailable,
  STORAGE_KEYS,
} from './storage';

describe('Storage Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveToStorage', () => {
    it('should save data to localStorage', () => {
      const testData = { name: 'test', value: 123 };
      const result = saveToStorage('test-key', testData);
      
      expect(result).toBe(true);
    });
  });

  describe('loadFromStorage', () => {
    it('should load data from localStorage', () => {
      const testData = { name: 'test', value: 123 };
      saveToStorage('test-key', testData);
      
      const result = loadFromStorage('test-key', {});
      expect(result).toEqual(testData);
    });

    it('should return default value if key not found', () => {
      const defaultValue = { default: true };
      const result = loadFromStorage('missing-key-xyz', defaultValue);
      expect(result).toEqual(defaultValue);
    });
  });

  describe('removeFromStorage', () => {
    it('should remove item from localStorage', () => {
      saveToStorage('remove-test', { data: 'test' });
      const result = removeFromStorage('remove-test');
      expect(result).toBe(true);
    });
  });

  describe('isStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isStorageAvailable()).toBe(true);
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have all required keys', () => {
      expect(STORAGE_KEYS).toBeDefined();
      expect(typeof STORAGE_KEYS.PLAYER_DATA).toBe('string');
      expect(typeof STORAGE_KEYS.STARDUST).toBe('string');
      expect(typeof STORAGE_KEYS.ACHIEVEMENTS).toBe('string');
    });
  });
});
