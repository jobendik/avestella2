// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - useProgression Hook Integration Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useProgression } from './useProgression';
import { GameProvider } from '@contexts/GameContext';

// Wrapper component for testing hooks that need context
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(GameProvider, null, children);

describe('useProgression Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    expect(result.current.state).toBeDefined();
    expect(result.current.state.level).toBeGreaterThanOrEqual(1);
    expect(result.current.state.xp).toBeGreaterThanOrEqual(0);
  });

  it('should have addXP function', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    expect(typeof result.current.addXP).toBe('function');
  });

  it('should have addStardust function', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    expect(typeof result.current.addStardust).toBe('function');
  });

  it('should add stardust correctly', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    const initial = result.current.state.stardust;
    
    act(() => {
      result.current.addStardust(50);
    });
    
    expect(result.current.state.stardust).toBe(initial + 50);
  });

  it('should spend stardust when sufficient balance', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    // First add stardust
    act(() => {
      result.current.addStardust(100);
    });
    
    const balance = result.current.state.stardust;
    
    // Then spend some
    act(() => {
      const success = result.current.spendStardust(50);
      expect(success).toBe(true);
    });
    
    expect(result.current.state.stardust).toBe(balance - 50);
  });

  it('should have getProgressToNextLevel function', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    expect(typeof result.current.getProgressToNextLevel).toBe('function');
    const progress = result.current.getProgressToNextLevel();
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
  });

  it('should unlock achievements', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    const testAchievementId = 'test-achievement';
    
    act(() => {
      result.current.unlockAchievement(testAchievementId);
    });
    
    expect(result.current.state.achievements).toContain(testAchievementId);
  });

  it('should check if achievement is unlocked', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    const testId = 'check-test';
    
    expect(result.current.hasAchievement(testId)).toBe(false);
    
    act(() => {
      result.current.unlockAchievement(testId);
    });
    
    expect(result.current.hasAchievement(testId)).toBe(true);
  });
});
