// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - useProgression Hook Integration Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock useServerSync before importing useProgression
const mockPlayerData = {
  odaId: 'test-player',
  name: 'TestPlayer',
  level: 1,
  xp: 0,
  stardust: 100,
  dailyLoginStreak: 0,
  longestStreak: 0,
  totalLogins: 0,
  lastLoginDate: null,
  currentMonth: null,
  seasonTier: 0,
  seasonXp: 0,
  achievements: [] as string[],
  claimedDailyRewards: [],
  claimedSeasonRewards: [],
  quests: { completedQuestIds: [] },
};

const mockServerSync = {
  isConnected: true,
  loading: false,
  synced: true,
  error: null,
  playerData: mockPlayerData,
  addXp: vi.fn(),
  addStardust: vi.fn((amount: number) => {
    mockPlayerData.stardust += amount;
  }),
  setLevel: vi.fn(),
  unlockAchievement: vi.fn((id: string) => {
    if (!mockPlayerData.achievements.includes(id)) {
      mockPlayerData.achievements.push(id);
    }
  }),
  hasAchievement: vi.fn((id: string) => mockPlayerData.achievements.includes(id)),
  processDailyLogin: vi.fn(),
  playerId: 'test-player',
  name: 'TestPlayer',
  xp: 0,
  level: 1,
  stardust: 100,
  stats: null,
  settings: null,
  achievements: [],
};

vi.mock('./useServerSync', () => ({
  useServerSync: () => mockServerSync
}));

import { useProgression } from './useProgression';

// Simple wrapper - don't use GameProvider since it brings in too many dependencies
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(React.Fragment, null, children);

describe('useProgression Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Reset mock state
    mockPlayerData.stardust = 100;
    mockPlayerData.achievements = [];
    mockPlayerData.level = 1;
    mockPlayerData.xp = 0;
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
    
    act(() => {
      result.current.addStardust(50);
    });
    
    // Verify the serverSync method was called with correct amount
    expect(mockServerSync.addStardust).toHaveBeenCalledWith(50);
  });

  it('should spend stardust when sufficient balance', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    // Spend some stardust - balance starts at 100
    let success = false;
    act(() => {
      success = result.current.spendStardust(50);
    });
    
    expect(success).toBe(true);
    
    // Verify the serverSync method was called with negative amount
    expect(mockServerSync.addStardust).toHaveBeenCalledWith(-50);
  });

  it('should have getProgressToNextLevel function', () => {
    const { result } = renderHook(() => useProgression(), { wrapper });
    
    expect(typeof result.current.getProgressToNextLevel).toBe('function');
    const progress = result.current.getProgressToNextLevel();
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
  });

  it('should unlock achievements', () => {
    const { result, rerender } = renderHook(() => useProgression(), { wrapper });
    
    const testAchievementId = 'test-achievement';
    
    act(() => {
      result.current.unlockAchievement(testAchievementId);
    });
    
    // Force re-render
    rerender();
    
    expect(result.current.state.achievements).toContain(testAchievementId);
  });

  it('should check if achievement is unlocked', () => {
    const { result, rerender } = renderHook(() => useProgression(), { wrapper });
    
    const testId = 'check-test';
    
    expect(result.current.hasAchievement(testId)).toBe(false);
    
    act(() => {
      result.current.unlockAchievement(testId);
    });
    
    // Force re-render
    rerender();
    
    expect(result.current.hasAchievement(testId)).toBe(true);
  });
});
