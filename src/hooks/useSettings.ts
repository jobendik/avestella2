// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Settings Hook
// ═══════════════════════════════════════════════════════════════════════════
// Server-synced settings - all data persisted to MongoDB via WebSocket

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useServerSync } from './useServerSync';
import { PlayerSettings } from '../types';

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface GameSettings {
  // Audio
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  musicEnabled: boolean;

  // Accessibility
  reducedMotion: boolean;
  colorblindMode: ColorblindMode;
  highContrast: boolean;
  screenReaderHints: boolean;
  hapticFeedback: boolean;

  // Graphics
  particleDensity: 'low' | 'medium' | 'high';
  showFPS: boolean;
  cameraShake: boolean;
  glowEffects: boolean;

  // Gameplay
  autoSave: boolean;
  tutorialHints: boolean;
  showMinimap: boolean;
  notificationDuration: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  // Audio
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  isMuted: false,
  musicEnabled: false,

  // Accessibility
  reducedMotion: false,
  colorblindMode: 'none',
  highContrast: false,
  screenReaderHints: false,
  hapticFeedback: true,

  // Graphics
  particleDensity: 'high',
  showFPS: false,
  cameraShake: true,
  glowEffects: true,

  // Gameplay
  autoSave: true,
  tutorialHints: true,
  showMinimap: true,
  notificationDuration: 3000,
};

export interface UseSettingsReturn {
  settings: GameSettings;
  updateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
  resetSettings: () => void;
  toggleSetting: (key: keyof GameSettings) => void;
  cycleColorblindMode: () => void;
  cycleParticleDensity: () => void;
}

export function useSettings(playerId?: string): UseSettingsReturn {
  // Use server sync for all data
  const serverSync = useServerSync(playerId || 'anonymous');

  // Local state for immediate UI updates (synced to server)
  const [localSettings, setLocalSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  // Sync from server when data arrives
  useEffect(() => {
    if (serverSync.settings) {
      setLocalSettings(prev => ({
        ...prev,
        masterVolume: serverSync.settings?.masterVolume ?? prev.masterVolume,
        musicVolume: serverSync.settings?.musicVolume ?? prev.musicVolume,
        sfxVolume: serverSync.settings?.sfxVolume ?? prev.sfxVolume,
        isMuted: !serverSync.settings?.soundEnabled,
        musicEnabled: serverSync.settings?.musicEnabled ?? prev.musicEnabled,
        reducedMotion: serverSync.settings?.reducedMotion ?? prev.reducedMotion,
        colorblindMode: (serverSync.settings?.colorblindMode as ColorblindMode) ?? prev.colorblindMode,
        highContrast: serverSync.settings?.highContrast ?? prev.highContrast,
        autoSave: serverSync.settings?.autoSave ?? prev.autoSave,
        cameraShake: serverSync.settings?.screenShake ?? prev.cameraShake,
      }));
    }
  }, [serverSync.settings]);

  const updateSetting = useCallback(<K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ) => {
    setLocalSettings(prev => {
      const newSettings = { ...prev, [key]: value };

      // Map to server format and sync
      serverSync.updateSettings({
        masterVolume: newSettings.masterVolume,
        musicVolume: newSettings.musicVolume,
        sfxVolume: newSettings.sfxVolume,
        soundEnabled: !newSettings.isMuted,
        musicEnabled: newSettings.musicEnabled,
        reducedMotion: newSettings.reducedMotion,
        colorblindMode: newSettings.colorblindMode,
        highContrast: newSettings.highContrast,
        autoSave: newSettings.autoSave,
        screenShake: newSettings.cameraShake,
        particlesEnabled: newSettings.particleDensity !== 'low',
        notifications: true,
      });

      return newSettings;
    });
  }, [serverSync]);

  const toggleSetting = useCallback((key: keyof GameSettings) => {
    setLocalSettings(prev => {
      const current = prev[key];
      if (typeof current === 'boolean') {
        const newSettings = { ...prev, [key]: !current };

        // Sync to server
        serverSync.updateSettings({
          masterVolume: newSettings.masterVolume,
          musicVolume: newSettings.musicVolume,
          sfxVolume: newSettings.sfxVolume,
          soundEnabled: !newSettings.isMuted,
          musicEnabled: newSettings.musicEnabled,
          reducedMotion: newSettings.reducedMotion,
          colorblindMode: newSettings.colorblindMode,
          highContrast: newSettings.highContrast,
          autoSave: newSettings.autoSave,
          screenShake: newSettings.cameraShake,
          particlesEnabled: newSettings.particleDensity !== 'low',
          notifications: true,
        });

        return newSettings;
      }
      return prev;
    });
  }, [serverSync]);

  const resetSettings = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
    serverSync.updateSettings({
      masterVolume: DEFAULT_SETTINGS.masterVolume,
      musicVolume: DEFAULT_SETTINGS.musicVolume,
      sfxVolume: DEFAULT_SETTINGS.sfxVolume,
      soundEnabled: !DEFAULT_SETTINGS.isMuted,
      musicEnabled: DEFAULT_SETTINGS.musicEnabled,
      reducedMotion: DEFAULT_SETTINGS.reducedMotion,
      colorblindMode: DEFAULT_SETTINGS.colorblindMode,
      highContrast: DEFAULT_SETTINGS.highContrast,
      autoSave: DEFAULT_SETTINGS.autoSave,
      screenShake: DEFAULT_SETTINGS.cameraShake,
      particlesEnabled: DEFAULT_SETTINGS.particleDensity !== 'low',
      notifications: true,
    });
  }, [serverSync]);

  const cycleColorblindMode = useCallback(() => {
    const modes: ColorblindMode[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
    setLocalSettings(prev => {
      const currentIndex = modes.indexOf(prev.colorblindMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      serverSync.updateSettings({ colorblindMode: nextMode });
      return { ...prev, colorblindMode: nextMode };
    });
  }, [serverSync]);

  const cycleParticleDensity = useCallback(() => {
    const densities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    setLocalSettings(prev => {
      const currentIndex = densities.indexOf(prev.particleDensity);
      const nextDensity = densities[(currentIndex + 1) % densities.length];
      serverSync.updateSettings({ particlesEnabled: nextDensity !== 'low' });
      return { ...prev, particleDensity: nextDensity };
    });
  }, [serverSync]);

  return {
    settings: localSettings,
    updateSetting,
    resetSettings,
    toggleSetting,
    cycleColorblindMode,
    cycleParticleDensity,
  };
}
