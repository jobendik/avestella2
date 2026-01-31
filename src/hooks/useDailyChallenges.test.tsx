// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - useDailyChallenges Hook Integration Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useDailyChallenges } from './useDailyChallenges';
import { GameProvider } from '@contexts/GameContext';

// Wrapper component for testing hooks that need context
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(GameProvider, null, children);

describe('useDailyChallenges Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with challenges', () => {
    const { result } = renderHook(() => useDailyChallenges(), { wrapper });
    
    expect(result.current.challenges).toBeDefined();
    expect(Array.isArray(result.current.challenges)).toBe(true);
  });

  it('should have a totalCompleted counter', () => {
    const { result } = renderHook(() => useDailyChallenges(), { wrapper });
    
    expect(typeof result.current.totalCompleted).toBe('number');
    expect(result.current.totalCompleted).toBeGreaterThanOrEqual(0);
  });

  it('should have updateProgress function', () => {
    const { result } = renderHook(() => useDailyChallenges(), { wrapper });
    
    expect(typeof result.current.updateProgress).toBe('function');
  });

  it('should have getAllComplete function', () => {
    const { result } = renderHook(() => useDailyChallenges(), { wrapper });
    
    expect(typeof result.current.getAllComplete).toBe('function');
    expect(typeof result.current.getAllComplete()).toBe('boolean');
  });

  it('should have rerollsAvailable counter', () => {
    const { result } = renderHook(() => useDailyChallenges(), { wrapper });
    
    expect(typeof result.current.rerollsAvailable).toBe('number');
    expect(result.current.rerollsAvailable).toBeGreaterThanOrEqual(0);
  });

  it('should have claimReward function', () => {
    const { result } = renderHook(() => useDailyChallenges(), { wrapper });
    
    expect(typeof result.current.claimReward).toBe('function');
  });

  it('should have saveChallenges function', () => {
    const { result } = renderHook(() => useDailyChallenges(), { wrapper });
    
    expect(typeof result.current.saveChallenges).toBe('function');
  });
});
