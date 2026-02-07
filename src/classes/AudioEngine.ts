// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Audio Engine Class
// ═══════════════════════════════════════════════════════════════════════════

import {
  createAudioContext,
  resumeAudioContext,
  playTone,
  playNote,
  playArpeggio,
  noteToFrequency,
  SOUND_FREQUENCIES,
} from '@/utils/audio';

export type SoundEffect =
  | 'fragment'
  | 'collect'
  | 'levelUp'
  | 'achievement'
  | 'bond'
  | 'beacon'
  | 'click'
  | 'hover'
  | 'error'
  | 'success'
  | 'purchase'
  | 'equip'
  | 'unlock';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private initialized = false;
  private muted = false;
  private musicMuted = false;
  private sfxVolume = 0.5;
  private musicVolume = 0.3;
  private ambientVolume = 0.2;
  private currentAmbient: OscillatorNode[] = [];
  private currentBiome: string | null = null;

  // Background Music System
  private backgroundMusic: HTMLAudioElement | null = null;
  private backgroundMusicVolume = 0.05; // 5% volume for subtle background music

  // Ambient Layers System
  private ambientLayers: Map<string, { oscillators: OscillatorNode[]; gains: GainNode[] }> = new Map();

  // Music Unlock System
  private musicUnlocked = false;

  // Environment-Adaptive Audio (from legacy_3)
  private windNode: { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private humNode: { osc: OscillatorNode; gain: GainNode } | null = null;
  private droneNode: { osc: OscillatorNode; gain: GainNode } | null = null;
  private currentEnvironment: 'warm' | 'wind' | 'cold' | null = null;
  private starMemoryCount = 0;
  private readonly MUSIC_UNLOCK_THRESHOLD = 3; // Unlock after 3 star memories

  /**
   * Initialize the audio engine (must be called after user interaction)
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    this.ctx = createAudioContext();
    if (!this.ctx) return false;

    try {
      await resumeAudioContext(this.ctx);

      // Create dynamics compressor for better audio mixing
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;
      this.compressor.connect(this.ctx.destination);

      // Create master gain node connected through compressor
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.compressor);

      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.value = this.musicVolume;

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.gain.value = this.sfxVolume;

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.connect(this.masterGain);
      this.ambientGain.gain.value = this.ambientVolume;

      this.initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resume audio context (for autoplay policy)
   * iOS/Mobile requires this to be called on every user interaction until audio is running
   */
  async resume(): Promise<void> {
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      try {
        await resumeAudioContext(this.ctx);
        console.log('[AudioEngine] AudioContext resumed, state:', this.ctx.state);
      } catch (error) {
        console.warn('[AudioEngine] Failed to resume AudioContext:', error);
      }
    }

    // Play silent buffer to fully unlock iOS audio
    if (this.ctx.state === 'running') {
      this.playUnlockBuffer();
    }
  }

  /**
   * Play a silent buffer to unlock iOS audio
   */
  private playUnlockBuffer(): void {
    if (!this.ctx || !this.sfxGain) return;

    try {
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.sfxGain);
      source.start(0);
    } catch {
      // Ignore errors
    }
  }

  // =========================================================================
  // BACKGROUND MUSIC SYSTEM
  // =========================================================================

  private backgroundMusicPending = false;
  private backgroundMusicSrc = '/music.mp3';

  /**
   * Start playing background music
   * Uses HTML Audio element for better performance with large files
   */
  startBackgroundMusic(src: string = '/music.mp3'): void {
    // Already playing or pending - don't start again
    if (this.backgroundMusicPending) {
      return;
    }
    
    if (this.backgroundMusic && !this.backgroundMusic.paused) {
      // Already playing
      return;
    }

    this.backgroundMusicSrc = src;

    if (!this.backgroundMusic) {
      this.backgroundMusic = new Audio(src);
      this.backgroundMusic.loop = true;
    }
    
    this.backgroundMusic.volume = this.muted || this.musicMuted ? 0 : this.backgroundMusicVolume;
    
    // Play with user interaction handling
    const playPromise = this.backgroundMusic.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay blocked - set up listeners for user interaction (only log once)
        if (!this.backgroundMusicPending) {
          console.log('Background music autoplay blocked, will play on user interaction');
        }
        this.backgroundMusicPending = true;
        this.setupUserInteractionListener();
      });
    }
  }

  /**
   * Set up listener for user interaction to start music
   */
  private userInteractionHandler: (() => void) | null = null;

  private setupUserInteractionListener(): void {
    if (this.userInteractionHandler) return; // Already set up

    this.userInteractionHandler = () => {
      if (this.backgroundMusicPending && this.backgroundMusic) {
        this.backgroundMusic.play().then(() => {
          console.log('Background music started after user interaction');
          this.backgroundMusicPending = false;
          this.removeUserInteractionListener();
        }).catch(() => {
          // Still blocked, keep waiting
        });
      }
    };

    // Listen for various user interactions
    document.addEventListener('click', this.userInteractionHandler);
    document.addEventListener('keydown', this.userInteractionHandler);
    document.addEventListener('touchstart', this.userInteractionHandler);
  }

  private removeUserInteractionListener(): void {
    if (this.userInteractionHandler) {
      document.removeEventListener('click', this.userInteractionHandler);
      document.removeEventListener('keydown', this.userInteractionHandler);
      document.removeEventListener('touchstart', this.userInteractionHandler);
      this.userInteractionHandler = null;
    }
  }

  /**
   * Stop background music
   */
  stopBackgroundMusic(): void {
    this.backgroundMusicPending = false;
    this.removeUserInteractionListener();
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic = null;
    }
  }

  /**
   * Set background music volume (0-1)
   */
  setBackgroundMusicVolume(volume: number): void {
    this.backgroundMusicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.muted || this.musicMuted ? 0 : this.backgroundMusicVolume;
    }
  }

  /**
   * Check if background music is playing
   */
  isBackgroundMusicPlaying(): boolean {
    return this.backgroundMusic !== null && !this.backgroundMusic.paused;
  }

  /**
   * Play a sound effect
   */
  play(sound: SoundEffect): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    const config = this.getSoundConfig(sound);
    if (!config) return;

    playTone(this.ctx, {
      type: config.type,
      frequency: config.freq,
      duration: config.duration,
      volume: this.sfxVolume * 0.5,
      destination: this.sfxGain || undefined
    });
  }

  /**
   * Get sound configuration
   */
  private getSoundConfig(
    sound: SoundEffect
  ): { type: OscillatorType; freq: number; duration: number } | null {
    const configs: Record<SoundEffect, { type: OscillatorType; freq: number; duration: number }> = {
      fragment: { type: 'sine', freq: 880, duration: 0.15 },
      collect: { type: 'sine', freq: 1200, duration: 0.1 },
      levelUp: { type: 'triangle', freq: 523.25, duration: 0.4 },
      achievement: { type: 'triangle', freq: 659.25, duration: 0.5 },
      bond: { type: 'sine', freq: 440, duration: 0.3 },
      beacon: { type: 'sine', freq: 330, duration: 0.5 },
      click: { type: 'square', freq: 1000, duration: 0.05 },
      hover: { type: 'sine', freq: 800, duration: 0.03 },
      error: { type: 'sawtooth', freq: 200, duration: 0.2 },
      success: { type: 'triangle', freq: 600, duration: 0.2 },
      purchase: { type: 'sine', freq: 700, duration: 0.25 },
      equip: { type: 'triangle', freq: 500, duration: 0.15 },
      unlock: { type: 'sine', freq: 900, duration: 0.3 },
    };

    return configs[sound] || null;
  }

  /**
   * Play a musical note
   */
  playNote(note: string, octave = 4, duration = 0.3): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    playNote(this.ctx, note, octave, duration, this.sfxVolume * 0.4, this.sfxGain || undefined);
  }

  /**
   * Play a chord (multiple notes)
   */
  playChord(notes: string[], octave = 4, duration = 0.5): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playNote(note, octave, duration);
      }, i * 30);
    });
  }

  /**
   * Play level up fanfare
   */
  playLevelUp(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    // Rising arpeggio
    const notes = ['C', 'E', 'G', 'C'];
    playArpeggio(this.ctx, notes, 5, 0.15, 0.05, this.sfxVolume * 0.4, this.sfxGain || undefined);
  }

  /**
   * Play achievement sound
   */
  playAchievement(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    // Triumphant chord
    const notes = ['C', 'E', 'G', 'B'];
    playArpeggio(this.ctx, notes, 4, 0.2, 0.08, this.sfxVolume * 0.4, this.sfxGain || undefined);
  }

  /**
   * Play beacon activation sound
   */
  playBeaconActivation(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    // Deep resonant tone with harmonics
    playTone(this.ctx, { type: 'sine', frequency: 220, duration: 0.6, volume: this.sfxVolume * 0.4, destination: this.sfxGain || undefined });
    playTone(this.ctx, { type: 'sine', frequency: 440, duration: 0.4, volume: this.sfxVolume * 0.2, attack: 0.1, destination: this.sfxGain || undefined });
  }

  /**
   * Play bond formation sound
   */
  playBondFormed(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    // Two tones merging
    playTone(this.ctx, { type: 'sine', frequency: 330, duration: 0.3, volume: this.sfxVolume * 0.3, destination: this.sfxGain || undefined });
    playTone(this.ctx, { type: 'sine', frequency: 523, duration: 0.3, volume: this.sfxVolume * 0.2, attack: 0.1, destination: this.sfxGain || undefined });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // App.jsx Sound Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Play pulse sound with long variant (legacy frequency ramp)
   */
  playPulse(isLong = false): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);

    // Long pulse has a slower, deeper frequency ramp
    if (isLong) {
      osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(this.sfxVolume * 0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    } else {
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(this.sfxVolume * 0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + (isLong ? 0.6 : 0.2));
  }

  /**
   * Play handshake sound - ascending arpeggio (from App.jsx)
   */
  playHandshake(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const freqs = [261.63, 329.63, 392.00, 523.25];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        if (this.ctx) {
          playTone(this.ctx, { type: 'sine', frequency: freq, duration: 2, volume: this.sfxVolume * 0.16, attack: 0.1 });
        }
      }, i * 80);
    });
  }

  /**
   * Play bloom sound (from App.jsx)
   */
  playBloom(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const freqs = [261.63, 329.63, 392.00, 523.25];
    freqs.forEach((freq, i) => {
      playTone(this.ctx!, { type: 'sine', frequency: freq, duration: 4, volume: this.sfxVolume * 0.08 });
    });
  }

  /**
   * Play snap sound - frequency ramp for tether snapping (from legacy_3)
   */
  playSnap(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(this.sfxVolume * 0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  /**
   * Play collect fragment sound (from App.jsx)
   */
  playCollect(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    playTone(this.ctx, { type: 'sine', frequency: 880, duration: 0.1, volume: this.sfxVolume * 0.08 });
  }

  /**
   * Play golden fragment sound (from App.jsx)
   */
  playGolden(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        if (this.ctx) {
          playTone(this.ctx, { type: 'sine', frequency: freq, duration: 0.8, volume: this.sfxVolume * 0.2 });
        }
      }, i * 80);
    });
  }

  /**
   * Play darkness wave sound (enhanced with legacy_2 frequency sweep)
   */
  playDarkness(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    // Legacy_2: Sawtooth wave with frequency sweep from 80Hz to 40Hz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 1);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, this.ctx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();
    osc.stop(this.ctx.currentTime + 1);
  }

  /**
   * Play gift sound (from App.jsx)
   */
  playGift(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    playTone(this.ctx, { type: 'sine', frequency: 523, duration: 0.4, volume: this.sfxVolume * 0.16 });
  }

  /**
   * Play seal sound - for sealing bonds (from App.jsx)
   */
  playSeal(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const freqs = [392, 493.88, 587.33, 783.99, 987.77];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        if (this.ctx) {
          playTone(this.ctx, { type: 'sine', frequency: freq, duration: 2, volume: this.sfxVolume * 0.24, attack: 0.05 });
        }
      }, i * 150);
    });
  }

  /**
   * Play chime sound (from App.jsx)
   */
  playChime(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const freqs = [523, 659, 784];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        if (this.ctx) {
          playTone(this.ctx, { type: 'sine', frequency: freq, duration: 1, volume: this.sfxVolume * 0.12 });
        }
      }, i * 100);
    });
  }

  /**
   * Play bridge sound (from App.jsx)
   */
  playBridge(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const freqs = [440, 554.37];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        if (this.ctx) {
          playTone(this.ctx, { type: 'sine', frequency: freq, duration: 1.5, volume: this.sfxVolume * 0.12 });
        }
      }, i * 100);
    });
  }

  /**
   * Play harmonic sound (from App.jsx)
   */
  playHarmonic(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const freqs = [261.63, 329.63, 392.00, 523.25, 659.25];
    freqs.forEach((freq) => {
      playTone(this.ctx!, { type: 'sine', frequency: freq, duration: 3, volume: this.sfxVolume * 0.08 });
    });
  }

  /**
   * Play personal note (for UI interactions) (from App.jsx)
   */
  playPersonalNote(noteIndex = 0): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    playTone(this.ctx, { type: 'sine', frequency: notes[noteIndex % notes.length], duration: 0.5, volume: this.sfxVolume * 0.1 });
  }

  /**
   * Play continuous darkness rumble (intensity-based)
   */
  playDarknessRumble(intensity: number): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    // Low frequency rumble
    const freq = 55 + (Math.random() * 10);
    const gain = Math.min(0.5, intensity * 0.4);

    playTone(this.ctx, {
      type: 'sawtooth',
      frequency: freq,
      duration: 1.5,
      volume: this.sfxVolume * gain,
      attack: 0.5,
      decay: 0.5
    });

    // Add sub-bass
    playTone(this.ctx, {
      type: 'sine',
      frequency: 30,
      duration: 2.0,
      volume: this.sfxVolume * gain * 1.5,
      attack: 0.5,
      decay: 0.8
    });
  }

  /**
   * Play ice cracking sound (for cold shrinking)
   */
  playIceCrack(): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    // High pitched random tones to simulate cracking
    const baseFreq = 2000 + Math.random() * 1000;

    playTone(this.ctx, {
      type: 'triangle',
      frequency: baseFreq,
      duration: 0.1,
      volume: this.sfxVolume * 0.15,
      decay: 0.05
    });

    setTimeout(() => {
      if (this.ctx) {
        playTone(this.ctx, {
          type: 'sawtooth',
          frequency: baseFreq * 1.5,
          duration: 0.05,
          volume: this.sfxVolume * 0.1,
          decay: 0.02
        });
      }
    }, 50);
  }

  /**
   * Play social tone for non-verbal communication
   * Procedural generation based on emotion/intent
   */
  playSocialTone(emotion: 'greeting' | 'happy' | 'curious' | 'farewell' | 'neutral' = 'neutral'): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const baseVolume = this.sfxVolume * 0.25;

    switch (emotion) {
      case 'greeting':
        // Rising interval (C4 -> E4)
        playTone(this.ctx, { type: 'sine', frequency: 261.63, duration: 0.2, volume: baseVolume, attack: 0.05, decay: 0.1 });
        setTimeout(() => {
          if (this.ctx) playTone(this.ctx, { type: 'sine', frequency: 329.63, duration: 0.4, volume: baseVolume, attack: 0.05, decay: 0.3 });
        }, 150);
        break;

      case 'farewell':
        // Falling interval (E4 -> C4)
        playTone(this.ctx, { type: 'sine', frequency: 329.63, duration: 0.2, volume: baseVolume, attack: 0.05, decay: 0.1 });
        setTimeout(() => {
          if (this.ctx) playTone(this.ctx, { type: 'sine', frequency: 261.63, duration: 0.4, volume: baseVolume, attack: 0.05, decay: 0.3 });
        }, 150);
        break;

      case 'happy':
        // Quick major triad (C-E-G)
        [261.63, 329.63, 392.00].forEach((freq, i) => {
          setTimeout(() => {
            if (this.ctx) playTone(this.ctx, { type: 'triangle', frequency: freq, duration: 0.15, volume: baseVolume * 0.8, attack: 0.02, decay: 0.1 });
          }, i * 80);
        });
        break;

      case 'curious':
        // Sliding/bending tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, now);
        osc.frequency.exponentialRampToValueAtTime(370, now + 0.3); // Bend up
        gain.gain.setValueAtTime(baseVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start();
        osc.stop(now + 0.35);
        break;

      case 'neutral':
      default:
        // simple chirp
        playTone(this.ctx, { type: 'sine', frequency: 440, duration: 0.1, volume: baseVolume, attack: 0.01, decay: 0.1 });
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY PORTED AUDIO EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Play chat chime when someone sends a message (LEGACY)
   * Pentatonic-inspired random tone
   */
  playChatChime(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    const base = 440;
    const freq = base * Math.pow(2, Math.floor(Math.random() * 10) / 12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.08, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(now + 2);
  }

  /**
   * Play tag sound - sharp impact for tagging (LEGACY)
   */
  playTag(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    playTone(this.ctx, { type: 'sine', frequency: 200, duration: 0.15, volume: this.sfxVolume * 0.12 });
    setTimeout(() => {
      if (this.ctx) {
        playTone(this.ctx, { type: 'sine', frequency: 150, duration: 0.2, volume: this.sfxVolume * 0.1 });
      }
    }, 30);
  }

  /**
   * Play powerup collection sound - rising sparkle (LEGACY)
   */
  playPowerup(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    [0, 3, 5, 7, 10, 12].forEach((semitone, i) => {
      const freq = 330 * Math.pow(2, semitone / 12);
      setTimeout(() => {
        if (this.ctx) {
          playTone(this.ctx, { type: 'sine', frequency: freq, duration: 0.3, volume: this.sfxVolume * 0.04 });
        }
      }, i * 40);
    });
  }

  /**
   * Play snapshot/screenshot sound - camera shutter (LEGACY)
   */
  playSnapshot(): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    playTone(this.ctx, { type: 'sine', frequency: 800, duration: 0.05, volume: this.sfxVolume * 0.08 });
    setTimeout(() => {
      if (this.ctx) {
        playTone(this.ctx, { type: 'sine', frequency: 600, duration: 0.1, volume: this.sfxVolume * 0.06 });
      }
    }, 60);
  }

  /**
   * Play star/echo ignition sound (LEGACY)
   * Pitch varies based on ignite count
   */
  playIgnite(igniteCount: number = 0): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    // Higher pitch for more ignites
    const baseFreq = 440 + igniteCount * 20;
    const scale = [0, 2, 4, 5]; // Simple melodic pattern

    scale.forEach((n, i) => {
      const freq = baseFreq * Math.pow(2, n / 12);
      setTimeout(() => {
        if (this.ctx) {
          playTone(this.ctx, { type: 'sine', frequency: freq, duration: 1.2, volume: this.sfxVolume * 0.04 });
        }
      }, i * 130);
    });
  }

  /**
   * Update drone volume based on nearby player count
   * DISABLED: Drone proximity volume adjustments were part of the annoying ambient system.
   */
  private droneProximityVolume = 0.03;

  updateDroneProximity(nearbyCount: number): void {
    // DISABLED: Drone proximity volume was part of the annoying ambient system
    return;
  }

  // =========================================================================
  // AMBIENT LOOP SYSTEM (LEGACY)
  // =========================================================================

  private ambientLoopInterval: ReturnType<typeof setInterval> | null = null;
  private ambientLoopActive = false;

  /**
   * Play ambient sparkle tones for atmosphere
   * Uses current realm's musical scale for coherence
   */
  playAmbientSparkle(): void {
    if (!this.initialized || !this.ctx || this.musicMuted) return;

    // Use realm-specific scale or default to pentatonic
    const scaleNotes = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
    const note = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];

    // Very subtle ambient tone
    this.playNote(note, 4, 0.015);
  }

  /**
   * Start ambient audio loop for atmosphere
   * DISABLED: Random sparkle sounds every 3 seconds were distracting.
   * The world should react to player actions, not constantly make noise.
   */
  startAmbientLoop(): void {
    // DISABLED: The random ambient sparkle sounds were distracting.
    // Sound effects should be triggered by meaningful game events, not randomly.
    return;
    
    /*
    if (this.ambientLoopInterval || this.ambientLoopActive) return;

    this.ambientLoopActive = true;
    this.ambientLoopInterval = setInterval(() => {
      // Random chance to play ambient sparkle (30%)
      if (Math.random() < 0.3) {
        this.playAmbientSparkle();
      }
    }, 3000);
    */
  }

  /**
   * Stop ambient audio loop
   */
  stopAmbientLoop(): void {
    if (this.ambientLoopInterval) {
      clearInterval(this.ambientLoopInterval);
      this.ambientLoopInterval = null;
    }
    this.ambientLoopActive = false;
  }

  /**
   * Check if ambient loop is running
   */
  isAmbientLoopActive(): boolean {
    return this.ambientLoopActive;
  }

  /**
   * Play beacon specific harmony
   */
  playBeaconHarmony(type: string): void {
    if (!this.initialized || !this.ctx || this.muted) return;

    let notes: string[] = [];
    switch (type) {
      case 'hope': notes = ['C4', 'E4', 'G4', 'C5']; break;
      case 'wonder': notes = ['D4', 'F#4', 'A4', 'D5']; break;
      case 'love': notes = ['F4', 'A4', 'C5', 'F5']; break;
      case 'dreams': notes = ['E4', 'G#4', 'B4', 'E5']; break;
      case 'courage': notes = ['G4', 'B4', 'D5', 'G5']; break;
      default: notes = ['C4', 'E4', 'G4'];
    }

    // Play as a slow rolled chord
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playNote(note, 4, 2.0);
      }, i * 200);
    });
  }

  /**
   * Play ambient tone based on nearby player count (from App.jsx)
   */
  playAmbientTone(playerCount = 0): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const baseFreq = 110 + (playerCount * 5);
    playTone(this.ctx, { type: 'sine', frequency: baseFreq, duration: 2, volume: this.sfxVolume * 0.04 });
  }

  /**
   * Play ambient sound for a biome
   * DISABLED: Continuous oscillator-based ambient was annoying.
   * Consider using actual audio files for ambient background music instead.
   */
  playBiomeAmbient(biomeId: string): void {
    // DISABLED: The continuous oscillator-based ambient sounds were too intrusive
    // and created an annoying humming effect. For a better audio experience,
    // consider using actual background music audio files instead.
    return;
    
    // Original implementation kept for reference:
    /*
    if (!this.initialized || !this.ctx || !this.ambientGain) return;
    if (this.currentBiome === biomeId) return; // Already playing this biome

    // Stop current ambient
    this.stopAmbient();
    this.currentBiome = biomeId;

    // Each biome has unique ambient frequencies
    const biomeAmbients: Record<string, { freqs: number[]; type: OscillatorType }> = {
      crystal_caves: { freqs: [110, 165, 220], type: 'sine' },
      twilight_forest: { freqs: [130, 195, 260], type: 'triangle' },
      aurora_plains: { freqs: [146, 220, 293], type: 'sine' },
      starfall_desert: { freqs: [164, 246, 329], type: 'triangle' },
      mystic_shores: { freqs: [174, 261, 348], type: 'sine' },
      void_expanse: { freqs: [82, 123, 164], type: 'sine' },
    };

    const ambient = biomeAmbients[biomeId];
    if (!ambient) return;

    // Create layered ambient oscillators
    for (const freq of ambient.freqs) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = ambient.type;
      osc.frequency.value = freq;

      // Very low volume for ambient
      gain.gain.value = 0;

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start();

      // Fade in
      gain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 2);

      this.currentAmbient.push(osc);
    }
    */
  }

  /**
   * Stop ambient sounds
   */

  stopAmbient(): void {
    for (const osc of this.currentAmbient) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Oscillator may already be stopped
      }
    }
    this.currentAmbient = [];
    this.currentBiome = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Environment-Adaptive Audio System (from legacy_3)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize environment audio layers (wind noise, hum, drone)
   * DISABLED: The procedural ambient audio was too intrusive.
   */
  initEnvironmentAudio(): void {
    // DISABLED: Procedural ambient audio (wind noise, movement hum, cold drone)
    // was creating annoying constant humming sounds.
    // Consider using actual audio files for ambient music instead.
    return;
    
    /*
    if (!this.ctx || !this.ambientGain) return;

    this.createWindNoise();
    this.createMovementHum();
    this.createColdDrone();
    */
  }

  /**
   * Create wind/brown noise layer for atmospheric sound
   */
  private createWindNoise(): void {
    if (!this.ctx || !this.ambientGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;

    // Generate brown noise
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    source.start();

    this.windNode = { source, gain, filter };
  }

  /**
   * Create movement-responsive hum oscillator
   */
  private createMovementHum(): void {
    if (!this.ctx || !this.ambientGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 100;
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(this.ambientGain);
    osc.start();

    this.humNode = { osc, gain };
  }

  /**
   * Create cold drone layer (for when player is in cold/isolation)
   */
  private createColdDrone(): void {
    if (!this.ctx || !this.ambientGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 55;
    gain.gain.value = 0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    osc.start();

    this.droneNode = { osc, gain };
  }

  /**
   * Update movement hum based on player speed
   * DISABLED: Movement-based humming was annoying.
   */
  updateMovementHum(speed: number): void {
    // DISABLED: Movement hum was part of the annoying ambient audio system
    return;
  }

  /**
   * Set environment type to adapt audio layers
   * DISABLED: Environment-based audio layers (wind, drone) were annoying.
   * @param type - 'warm' (near others), 'wind' (exploring), 'cold' (isolated)
   */
  setEnvironment(type: 'warm' | 'wind' | 'cold'): void {
    // DISABLED: Environment audio layers (wind noise, cold drone) were annoying
    return;
  }

  /**
   * Set ambient volume
   */
  setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.ambientVolume;
    }
  }

  /**
   * Set master mute
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
    // Also mute/unmute background music
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = muted || this.musicMuted ? 0 : this.backgroundMusicVolume;
    }
  }

  /**
   * Set music mute
   */
  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    if (this.musicGain) {
      this.musicGain.gain.value = muted ? 0 : this.musicVolume;
    }
    // Also mute/unmute background music
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.muted || muted ? 0 : this.backgroundMusicVolume;
    }
  }

  /**
   * Set SFX volume
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  /**
   * Set music volume
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain && !this.musicMuted) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  /**
   * Check if audio is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if audio is muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Play a sound with spatial positioning
   * @param soundFn - Function that plays the sound
   * @param x - X position relative to listener (0 = center, negative = left, positive = right)
   * @param distance - Distance from listener (affects volume)
   * @param maxDistance - Maximum audible distance
   */
  playSpatial(
    soundFn: (destination: AudioNode) => void,
    x: number,
    distance: number,
    maxDistance: number = 500
  ): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;

    // Calculate volume based on distance
    const distanceRatio = Math.max(0, 1 - distance / maxDistance);

    // Create a dedicated chain for this spatial sound (cleaner isolation)
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, x / (maxDistance / 2)));

    const spatialGain = this.ctx.createGain();
    spatialGain.gain.setValueAtTime(distanceRatio, this.ctx.currentTime);

    // Connect chain: sound -> panner -> spatialGain -> sfxGain
    panner.connect(spatialGain);
    spatialGain.connect(this.sfxGain);

    // Play the sound through our dedicated panner
    soundFn(panner);
  }

  /**
   * Play spatial sound based on position (from legacy_2)
   * Calculates volume falloff and stereo panning based on source/listener positions
   */
  playSpatialSound(
    type: 'pulse' | 'collect' | 'beacon',
    sourceX: number,
    sourceY: number,
    listenerX: number,
    listenerY: number,
    maxDistance: number = 500
  ): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;

    const dx = sourceX - listenerX;
    const dy = sourceY - listenerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) return;

    // Calculate volume falloff
    const volume = 1 - (distance / maxDistance);

    // Calculate stereo panning
    const pan = Math.max(-1, Math.min(1, dx / (maxDistance / 2)));

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;

    const volumeGain = this.ctx.createGain();
    volumeGain.gain.value = volume;

    panner.connect(volumeGain);
    volumeGain.connect(this.sfxGain);

    // Play the appropriate sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    switch (type) {
      case 'pulse':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2 * this.sfxVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(panner);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
        break;

      case 'collect':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1047, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15 * this.sfxVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(panner);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
        break;

      case 'beacon':
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.15 * this.sfxVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(panner);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
        break;
    }
  }

  /**
   * Start default ambient background (from legacy_2)
   * DISABLED: Oscillator layers creating constant humming were annoying.
   */
  startLegacyAmbient(): void {
    // DISABLED: The 3-layer oscillator ambient was creating constant humming
    return;
  }

  /**
   * Stop default legacy ambient background (from legacy_2)
   */
  stopLegacyAmbient(): void {
    this.stopAmbientLayer('legacy_ambient');
  }

  /**
   * Mute all audio (from legacy_2)
   */
  mute(): void {
    this.setMuted(true);
  }

  /**
   * Unmute all audio (from legacy_2)
   */
  unmute(): void {
    this.setMuted(false);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Ambient Layers System
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start an ambient layer (warmth, stars, etc.)
   * DISABLED: Continuous oscillator-based ambient layers were annoying.
   */
  startAmbientLayer(layerId: string, frequencies: number[], type: OscillatorType = 'sine', volume: number = 0.02): void {
    // DISABLED: Continuous ambient layers (oscillators) were creating annoying humming
    return;
  
    // Original implementation kept for reference:
    /*
    if (!this.initialized || !this.ctx || !this.ambientGain) return;

    // Don't start if already running
    if (this.ambientLayers.has(layerId)) return;

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    for (const freq of frequencies) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0;

      osc.connect(gain);
      gain.connect(this.ambientGain);
      osc.start();

      // Fade in
      gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 1);

      oscillators.push(osc);
      gains.push(gain);
    }

    this.ambientLayers.set(layerId, { oscillators, gains });
    */
  }

  /**
   * Stop an ambient layer
   */
  stopAmbientLayer(layerId: string): void {
    const layer = this.ambientLayers.get(layerId);
    if (!layer || !this.ctx) return;

    const currentTime = this.ctx.currentTime;

    // Fade out
    for (const gain of layer.gains) {
      gain.gain.linearRampToValueAtTime(0, currentTime + 0.5);
    }

    // Stop after fade
    setTimeout(() => {
      for (const osc of layer.oscillators) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Already stopped
        }
      }
      this.ambientLayers.delete(layerId);
    }, 600);
  }

  /**
   * Check if an ambient layer is active
   */
  isAmbientLayerActive(layerId: string): boolean {
    return this.ambientLayers.has(layerId);
  }

  /**
   * Preset ambient layers for common game states
   */
  startWarmthAmbient(): void {
    this.startAmbientLayer('warmth', [220, 330, 440], 'sine', 0.015);
  }

  stopWarmthAmbient(): void {
    this.stopAmbientLayer('warmth');
  }

  startStarsAmbient(): void {
    this.startAmbientLayer('stars', [523.25, 659.25, 783.99], 'sine', 0.01);
  }

  stopStarsAmbient(): void {
    this.stopAmbientLayer('stars');
  }

  startDarknessAmbient(): void {
    this.startAmbientLayer('darkness', [82.4, 110, 146.8], 'sawtooth', 0.008);
  }

  stopDarknessAmbient(): void {
    this.stopAmbientLayer('darkness');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Music Unlock System
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Update star memory count and check for music unlock
   */
  updateStarMemoryCount(count: number): boolean {
    this.starMemoryCount = count;

    if (!this.musicUnlocked && count >= this.MUSIC_UNLOCK_THRESHOLD) {
      this.musicUnlocked = true;
      return true; // Music was just unlocked
    }

    return false;
  }

  /**
   * Check if music is unlocked
   */
  isMusicUnlocked(): boolean {
    return this.musicUnlocked;
  }

  /**
   * Get remaining star memories needed to unlock music
   */
  getStarMemoriesUntilMusicUnlock(): number {
    return Math.max(0, this.MUSIC_UNLOCK_THRESHOLD - this.starMemoryCount);
  }

  /**
   * Play background music (only if unlocked)
   */
  playBackgroundMusic(): void {
    if (!this.musicUnlocked || !this.initialized || !this.ctx || !this.musicGain) return;

    // Simple generative music using oscillators
    const playMusicNote = (freq: number, delay: number, duration: number) => {
      if (!this.ctx || !this.musicGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + delay + 0.1);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    };

    // Play a simple peaceful melody
    const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 196.00];
    notes.forEach((freq, i) => {
      playMusicNote(freq, i * 0.5, 0.4);
    });
  }

  /**
   * Dispose of audio resources
   */
  dispose(): void {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.initialized = false;
  }
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

export default AudioEngine;
