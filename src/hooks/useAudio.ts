// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Audio Hook
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { getAudioEngine, type SoundEffect } from '@/classes/AudioEngine';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '@/utils/storage';

export interface UseAudioReturn {
  isInitialized: boolean;
  isMuted: boolean;
  isMusicMuted: boolean;
  sfxVolume: number;
  musicVolume: number;
  initialize: () => Promise<boolean>;
  play: (sound: SoundEffect) => void;
  playNote: (note: string, octave?: number, duration?: number) => void;
  playChord: (notes: string[], octave?: number, duration?: number) => void;
  playLevelUp: () => void;
  playAchievement: () => void;
  playBeaconActivation: () => void;
  playBondFormed: () => void;
  playBiomeAmbient: (biomeId: string) => void;
  stopAmbient: () => void;
  setMuted: (muted: boolean) => void;
  setMusicMuted: (muted: boolean) => void;
  setSFXVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleMusicMute: () => void;
  playBloom: () => void;
  playDarknessRumble: (intensity: number) => void;
  playIceCrack: () => void;
  playBeaconHarmony: (type: string) => void;
  playGift: () => void;
  playSeal: () => void;
  // Additional audio methods from legacy App.jsx
  playPulse: (isLong?: boolean) => void;
  playHandshake: () => void;
  playCollect: () => void;
  playGolden: () => void;
  playBridge: () => void;
  playChime: () => void;
  playHarmonic: () => void;
  playDarkness: () => void;
  // LEGACY ported audio effects
  playChatChime: () => void;
  playTag: () => void;
  playPowerup: () => void;
  playSnapshot: () => void;
  playIgnite: (igniteCount: number) => void;
  updateDroneProximity: (nearbyCount: number) => void;
  // Ambient loop
  playAmbientSparkle: () => void;
  startAmbientLoop: () => void;
  stopAmbientLoop: () => void;
  isAmbientLoopActive: () => boolean;
  playSocialTone: (emotion?: 'greeting' | 'happy' | 'curious' | 'farewell' | 'neutral') => void;
}

export function useAudio(): UseAudioReturn {
  const audioEngine = useRef(getAudioEngine());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [sfxVolume, setSFXVolumeState] = useState(0.5);
  const [musicVolume, setMusicVolumeState] = useState(0.3);

  /**
   * Load saved audio settings on mount
   */
  useEffect(() => {
    const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS, {});
    if (savedSettings) {
      if (typeof (savedSettings as any).soundEnabled === 'boolean') {
        setIsMuted(!(savedSettings as any).soundEnabled);
      }
      if (typeof (savedSettings as any).musicEnabled === 'boolean') {
        setIsMusicMuted(!(savedSettings as any).musicEnabled);
      }
    }
  }, []);

  /**
   * Initialize audio engine (must be called after user interaction)
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    const success = await audioEngine.current.init();
    setIsInitialized(success);

    // Apply saved settings
    audioEngine.current.setMuted(isMuted);
    audioEngine.current.setMusicMuted(isMusicMuted);
    audioEngine.current.setSFXVolume(sfxVolume);
    audioEngine.current.setMusicVolume(musicVolume);

    return success;
  }, [isMuted, isMusicMuted, sfxVolume, musicVolume]);

  /**
   * Play a sound effect
   */
  const play = useCallback((sound: SoundEffect) => {
    if (!isInitialized) return;
    audioEngine.current.play(sound);
  }, [isInitialized]);

  /**
   * Play a musical note
   */
  const playNote = useCallback((note: string, octave = 4, duration = 0.3) => {
    if (!isInitialized) return;
    audioEngine.current.playNote(note, octave, duration);
  }, [isInitialized]);

  /**
   * Play a chord
   */
  const playChord = useCallback((notes: string[], octave = 4, duration = 0.5) => {
    if (!isInitialized) return;
    audioEngine.current.playChord(notes, octave, duration);
  }, [isInitialized]);

  /**
   * Play level up sound
   */
  const playLevelUp = useCallback(() => {
    if (!isInitialized) return;
    audioEngine.current.playLevelUp();
  }, [isInitialized]);

  /**
   * Play achievement sound
   */
  const playAchievement = useCallback(() => {
    if (!isInitialized) return;
    audioEngine.current.playAchievement();
  }, [isInitialized]);

  /**
   * Play beacon activation sound
   */
  const playBeaconActivation = useCallback(() => {
    if (!isInitialized) return;
    audioEngine.current.playBeaconActivation();
  }, [isInitialized]);

  /**
   * Play bond formed sound
   */
  const playBondFormed = useCallback(() => {
    if (!isInitialized) return;
    audioEngine.current.playBondFormed();
  }, [isInitialized]);

  /**
   * Play biome ambient sound
   */
  const playBiomeAmbient = useCallback((biomeId: string) => {
    if (!isInitialized) return;
    audioEngine.current.playBiomeAmbient(biomeId);
  }, [isInitialized]);

  /**
   * Stop ambient sounds
   */
  const stopAmbient = useCallback(() => {
    audioEngine.current.stopAmbient();
  }, []);

  /**
   * Set master mute
   */
  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    audioEngine.current.setMuted(muted);

    // Save to storage
    const settings = loadFromStorage(STORAGE_KEYS.SETTINGS, {});
    saveToStorage(STORAGE_KEYS.SETTINGS, {
      ...(settings as object),
      soundEnabled: !muted,
    });
  }, []);

  /**
   * Set music mute
   */
  const setMusicMuted = useCallback((muted: boolean) => {
    setIsMusicMuted(muted);
    audioEngine.current.setMusicMuted(muted);

    // Save to storage
    const settings = loadFromStorage(STORAGE_KEYS.SETTINGS, {});
    saveToStorage(STORAGE_KEYS.SETTINGS, {
      ...(settings as object),
      musicEnabled: !muted,
    });
  }, []);

  /**
   * Set SFX volume
   */
  const setSFXVolume = useCallback((volume: number) => {
    setSFXVolumeState(volume);
    audioEngine.current.setSFXVolume(volume);
  }, []);

  /**
   * Set music volume
   */
  const setMusicVolume = useCallback((volume: number) => {
    setMusicVolumeState(volume);
    audioEngine.current.setMusicVolume(volume);
  }, []);

  /**
   * Toggle master mute
   */
  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  /**
   * Toggle music mute
   */
  const toggleMusicMute = useCallback(() => {
    setMusicMuted(!isMusicMuted);
  }, [isMusicMuted, setMusicMuted]);

  return {
    isInitialized,
    isMuted,
    isMusicMuted,
    sfxVolume,
    musicVolume,
    initialize,
    play,
    playNote,
    playChord,
    playLevelUp,
    playAchievement,
    playBeaconActivation,
    playBondFormed,
    playBiomeAmbient,
    stopAmbient,
    setMuted,
    setMusicMuted,
    setSFXVolume,
    setMusicVolume,
    toggleMute,
    toggleMusicMute,
    playBloom: () => audioEngine.current.playBloom(),
    playDarknessRumble: (intensity: number) => audioEngine.current.playDarknessRumble(intensity),
    playIceCrack: () => audioEngine.current.playIceCrack(),
    playBeaconHarmony: (type: string) => audioEngine.current.playBeaconHarmony(type),
    playGift: () => audioEngine.current.playGift(),
    playSeal: () => audioEngine.current.playSeal(),
    // Additional audio methods from legacy App.jsx
    playPulse: (isLong?: boolean) => audioEngine.current.playPulse(isLong),
    playHandshake: () => audioEngine.current.playHandshake(),
    playCollect: () => audioEngine.current.playCollect(),
    playGolden: () => audioEngine.current.playGolden(),
    playBridge: () => audioEngine.current.playBridge(),
    playChime: () => audioEngine.current.playChime(),
    playHarmonic: () => audioEngine.current.playHarmonic(),
    playDarkness: () => audioEngine.current.playDarkness(),
    // LEGACY audio effects
    playChatChime: () => audioEngine.current.playChatChime(),
    playTag: () => audioEngine.current.playTag(),
    playPowerup: () => audioEngine.current.playPowerup(),
    playSnapshot: () => audioEngine.current.playSnapshot(),
    playIgnite: (igniteCount: number) => audioEngine.current.playIgnite(igniteCount),
    updateDroneProximity: (nearbyCount: number) => audioEngine.current.updateDroneProximity(nearbyCount),
    // Ambient loop
    playAmbientSparkle: () => audioEngine.current.playAmbientSparkle(),
    startAmbientLoop: () => audioEngine.current.startAmbientLoop(),
    stopAmbientLoop: () => audioEngine.current.stopAmbientLoop(),
    isAmbientLoopActive: () => audioEngine.current.isAmbientLoopActive(),
    playSocialTone: (emotion?: 'greeting' | 'happy' | 'curious' | 'farewell' | 'neutral') => audioEngine.current.playSocialTone(emotion),
  };
}

export default useAudio;
