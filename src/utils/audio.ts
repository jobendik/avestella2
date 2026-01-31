// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Audio Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if Web Audio API is available
 */
export function isAudioAvailable(): boolean {
  return typeof window !== 'undefined' &&
    (typeof AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !== 'undefined');
}

/**
 * Create an audio context
 */
export function createAudioContext(): AudioContext | null {
  if (!isAudioAvailable()) return null;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new AudioContextClass();
  } catch {
    return null;
  }
}

/**
 * Resume audio context (required after user interaction)
 */
export async function resumeAudioContext(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Create a gain node for volume control
 */
export function createGainNode(ctx: AudioContext, volume = 1): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);
  return gain;
}

/**
 * Create an oscillator for simple tones
 */
export interface OscillatorOptions {
  type?: OscillatorType;
  frequency?: number;
  duration?: number;
  volume?: number;
  attack?: number;
  decay?: number;
  destination?: AudioNode;
}

export function playTone(ctx: AudioContext, options: OscillatorOptions = {}): void {
  const {
    type = 'sine',
    frequency = 440,
    duration = 0.3,
    volume = 0.3,
    attack = 0.01,
    decay = 0.1,
    destination
  } = options;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration - decay);

  oscillator.connect(gainNode);
  gainNode.connect(destination || ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

/**
 * Play a musical note
 */
export function playNote(
  ctx: AudioContext,
  note: string,
  octave = 4,
  duration = 0.3,
  volume = 0.3,
  destination?: AudioNode
): void {
  const frequency = noteToFrequency(note, octave);
  playTone(ctx, { frequency, duration, volume, destination });
}

/**
 * Convert note name to frequency
 */
export function noteToFrequency(note: string, octave = 4): number {
  const notes: Record<string, number> = {
    'C': -9, 'C#': -8, 'Db': -8,
    'D': -7, 'D#': -6, 'Eb': -6,
    'E': -5, 'Fb': -5,
    'F': -4, 'F#': -3, 'Gb': -3,
    'G': -2, 'G#': -1, 'Ab': -1,
    'A': 0, 'A#': 1, 'Bb': 1,
    'B': 2, 'Cb': 2,
  };

  const semitones = notes[note] ?? 0;
  return 440 * Math.pow(2, (semitones + (octave - 4) * 12) / 12);
}

/**
 * Create a chord
 */
export function playChord(
  ctx: AudioContext,
  notes: string[],
  octave = 4,
  duration = 0.5,
  volume = 0.2,
  destination?: AudioNode
): void {
  notes.forEach(note => {
    playNote(ctx, note, octave, duration, volume / notes.length, destination);
  });
}

/**
 * Pre-defined sound effects
 */
export const SOUND_FREQUENCIES = {
  // Collection sounds
  fragment: { type: 'sine' as OscillatorType, freq: 880, duration: 0.15 },
  collect: { type: 'sine' as OscillatorType, freq: 1200, duration: 0.1 },

  // Progression sounds
  levelUp: { type: 'triangle' as OscillatorType, freq: 523.25, duration: 0.4 },
  achievement: { type: 'triangle' as OscillatorType, freq: 659.25, duration: 0.5 },

  // Interaction sounds
  bond: { type: 'sine' as OscillatorType, freq: 440, duration: 0.3 },
  beacon: { type: 'sine' as OscillatorType, freq: 330, duration: 0.5 },

  // UI sounds
  click: { type: 'square' as OscillatorType, freq: 1000, duration: 0.05 },
  hover: { type: 'sine' as OscillatorType, freq: 800, duration: 0.03 },
  error: { type: 'sawtooth' as OscillatorType, freq: 200, duration: 0.2 },
  success: { type: 'triangle' as OscillatorType, freq: 600, duration: 0.2 },
};

/**
 * Play a predefined sound effect
 */
export function playSoundEffect(
  ctx: AudioContext,
  sound: keyof typeof SOUND_FREQUENCIES,
  volume = 0.3
): void {
  const config = SOUND_FREQUENCIES[sound];
  playTone(ctx, {
    type: config.type,
    frequency: config.freq,
    duration: config.duration,
    volume,
  });
}

/**
 * Create a simple arpeggio
 */
export function playArpeggio(
  ctx: AudioContext,
  notes: string[],
  octave = 4,
  noteDuration = 0.1,
  gap = 0.05,
  volume = 0.2,
  destination?: AudioNode
): void {
  notes.forEach((note, index) => {
    setTimeout(() => {
      playNote(ctx, note, octave, noteDuration, volume, destination);
    }, index * (noteDuration + gap) * 1000);
  });
}

/**
 * Fade volume over time
 */
export function fadeVolume(
  gainNode: GainNode,
  ctx: AudioContext,
  targetVolume: number,
  duration: number
): void {
  gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + duration);
}
