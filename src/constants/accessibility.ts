// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Accessibility Constants
// ═══════════════════════════════════════════════════════════════════════════
// Per lumina-viral-bible.md Section 10.6 - Comprehensive accessibility options

// ─────────────────────────────────────────────────────────────────────────────
// Visual Accessibility
// ─────────────────────────────────────────────────────────────────────────────

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export interface ColorblindModeConfig {
  id: ColorblindMode;
  name: string;
  description: string;
  colorAdjustments: {
    hueRotation: number;
    saturationAdjust: number;
    contrastBoost: number;
  };
}

export const COLORBLIND_MODES: ColorblindModeConfig[] = [
  { 
    id: 'none', 
    name: 'Normal Vision', 
    description: 'No color adjustments',
    colorAdjustments: { hueRotation: 0, saturationAdjust: 1, contrastBoost: 1 }
  },
  { 
    id: 'protanopia', 
    name: 'Protanopia', 
    description: 'Red-blind (reduced red sensitivity)',
    colorAdjustments: { hueRotation: 10, saturationAdjust: 1.2, contrastBoost: 1.1 }
  },
  { 
    id: 'deuteranopia', 
    name: 'Deuteranopia', 
    description: 'Green-blind (reduced green sensitivity)',
    colorAdjustments: { hueRotation: -10, saturationAdjust: 1.2, contrastBoost: 1.1 }
  },
  { 
    id: 'tritanopia', 
    name: 'Tritanopia', 
    description: 'Blue-blind (reduced blue sensitivity)',
    colorAdjustments: { hueRotation: 180, saturationAdjust: 1.3, contrastBoost: 1.2 }
  },
  { 
    id: 'achromatopsia', 
    name: 'Achromatopsia', 
    description: 'Complete color blindness (monochrome)',
    colorAdjustments: { hueRotation: 0, saturationAdjust: 0, contrastBoost: 1.3 }
  },
];

export type TextSize = 'small' | 'medium' | 'large' | 'extra-large';

export interface TextSizeConfig {
  id: TextSize;
  name: string;
  scale: number;
  lineHeight: number;
}

export const TEXT_SIZES: TextSizeConfig[] = [
  { id: 'small', name: 'Small', scale: 0.85, lineHeight: 1.3 },
  { id: 'medium', name: 'Medium (Default)', scale: 1.0, lineHeight: 1.4 },
  { id: 'large', name: 'Large', scale: 1.25, lineHeight: 1.5 },
  { id: 'extra-large', name: 'Extra Large', scale: 1.5, lineHeight: 1.6 },
];

export interface VisualAccessibilitySettings {
  colorblindMode: ColorblindMode;
  highContrast: boolean;
  textSize: TextSize;
  screenReaderSupport: boolean;
  reducedMotion: boolean;
  brightnessLevel: number; // 0.5 to 1.5
  reducedTransparency: boolean;
  boldText: boolean;
  iconLabels: boolean; // Show text labels on icons
}

export const DEFAULT_VISUAL_ACCESSIBILITY: VisualAccessibilitySettings = {
  colorblindMode: 'none',
  highContrast: false,
  textSize: 'medium',
  screenReaderSupport: false,
  reducedMotion: false,
  brightnessLevel: 1.0,
  reducedTransparency: false,
  boldText: false,
  iconLabels: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Audio Accessibility
// ─────────────────────────────────────────────────────────────────────────────

export interface AudioAccessibilitySettings {
  visualAudioCues: boolean;      // Flash on audio events
  subtitles: boolean;            // Subtitles for voice/narrative
  captions: boolean;             // Captions for all audio
  hapticFeedback: boolean;       // Vibration feedback
  monoAudio: boolean;            // Combine stereo to mono
  volumeBalance: number;         // -1 (left) to 1 (right)
  muteOnFocusLoss: boolean;
  audioDescriptions: boolean;    // Describe visual events
}

export const DEFAULT_AUDIO_ACCESSIBILITY: AudioAccessibilitySettings = {
  visualAudioCues: false,
  subtitles: false,
  captions: false,
  hapticFeedback: true,
  monoAudio: false,
  volumeBalance: 0,
  muteOnFocusLoss: false,
  audioDescriptions: false,
};

export type CaptionSize = 'small' | 'medium' | 'large';
export type CaptionBackground = 'none' | 'semi-transparent' | 'opaque';

export interface CaptionSettings {
  enabled: boolean;
  size: CaptionSize;
  background: CaptionBackground;
  fontFamily: 'default' | 'dyslexic' | 'monospace';
  position: 'top' | 'bottom';
}

export const DEFAULT_CAPTION_SETTINGS: CaptionSettings = {
  enabled: false,
  size: 'medium',
  background: 'semi-transparent',
  fontFamily: 'default',
  position: 'bottom',
};

// ─────────────────────────────────────────────────────────────────────────────
// Motor Accessibility
// ─────────────────────────────────────────────────────────────────────────────

export type TouchSensitivity = 'low' | 'medium' | 'high' | 'very-high';

export interface MotorAccessibilitySettings {
  touchSensitivity: TouchSensitivity;
  autoMove: boolean;             // Auto-walk in direction
  oneHandMode: boolean;          // All controls accessible one-handed
  holdToConfirm: boolean;        // Hold instead of tap for important actions
  reducedPrecision: boolean;     // Larger hit targets
  assistedAiming: boolean;       // Snap to nearest target
  gestureSimplification: boolean; // Replace complex gestures with taps
  doubleClickDelay: number;      // ms delay for double-tap
  longPressDelay: number;        // ms for long press detection
  swipeThreshold: number;        // Minimum swipe distance
}

export const DEFAULT_MOTOR_ACCESSIBILITY: MotorAccessibilitySettings = {
  touchSensitivity: 'medium',
  autoMove: false,
  oneHandMode: false,
  holdToConfirm: false,
  reducedPrecision: false,
  assistedAiming: false,
  gestureSimplification: false,
  doubleClickDelay: 300,
  longPressDelay: 500,
  swipeThreshold: 50,
};

export const TOUCH_SENSITIVITY_CONFIG: Record<TouchSensitivity, { multiplier: number; deadzone: number }> = {
  'low': { multiplier: 0.5, deadzone: 15 },
  'medium': { multiplier: 1.0, deadzone: 10 },
  'high': { multiplier: 1.5, deadzone: 5 },
  'very-high': { multiplier: 2.0, deadzone: 2 },
};

// Button remapping
export interface ButtonMapping {
  action: string;
  defaultButton: string;
  customButton?: string;
}

export const REMAPPABLE_BUTTONS: ButtonMapping[] = [
  { action: 'pulse', defaultButton: 'tap_center' },
  { action: 'move', defaultButton: 'drag' },
  { action: 'interact', defaultButton: 'double_tap' },
  { action: 'menu', defaultButton: 'swipe_down' },
  { action: 'quick_chat', defaultButton: 'hold' },
  { action: 'cancel', defaultButton: 'swipe_up' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Cognitive Accessibility
// ─────────────────────────────────────────────────────────────────────────────

export interface CognitiveAccessibilitySettings {
  simplifiedUI: boolean;         // Hide advanced options
  extendedTimers: boolean;       // 2x time for timed events
  clearInstructions: boolean;    // Extra explanatory text
  consistentLayouts: boolean;    // Lock UI positions
  tutorialReplay: boolean;       // Allow replaying tutorials
  readingGuide: boolean;         // Highlight current line
  focusMode: boolean;            // Reduce visual distractions
  confirmationPrompts: boolean;  // Confirm important actions
  memoryAids: boolean;           // Show reminders for objectives
  reducedInformation: boolean;   // Show only essential info
}

export const DEFAULT_COGNITIVE_ACCESSIBILITY: CognitiveAccessibilitySettings = {
  simplifiedUI: false,
  extendedTimers: false,
  clearInstructions: false,
  consistentLayouts: false,
  tutorialReplay: true,
  readingGuide: false,
  focusMode: false,
  confirmationPrompts: true,
  memoryAids: false,
  reducedInformation: false,
};

export type TimerMultiplier = 1 | 1.5 | 2 | 3 | 'unlimited';

export const TIMER_MULTIPLIER_OPTIONS: { value: TimerMultiplier; label: string }[] = [
  { value: 1, label: 'Normal' },
  { value: 1.5, label: '1.5x Longer' },
  { value: 2, label: '2x Longer' },
  { value: 3, label: '3x Longer' },
  { value: 'unlimited', label: 'No Time Limits' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Combined Accessibility Profile
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessibilityProfile {
  id: string;
  name: string;
  description: string;
  visual: Partial<VisualAccessibilitySettings>;
  audio: Partial<AudioAccessibilitySettings>;
  motor: Partial<MotorAccessibilitySettings>;
  cognitive: Partial<CognitiveAccessibilitySettings>;
}

export const ACCESSIBILITY_PRESETS: AccessibilityProfile[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard game settings',
    visual: {},
    audio: {},
    motor: {},
    cognitive: {},
  },
  {
    id: 'low_vision',
    name: 'Low Vision',
    description: 'Enhanced visibility for users with low vision',
    visual: {
      highContrast: true,
      textSize: 'large',
      boldText: true,
      iconLabels: true,
      brightnessLevel: 1.2,
    },
    audio: { audioDescriptions: true },
    motor: { reducedPrecision: true },
    cognitive: { simplifiedUI: true },
  },
  {
    id: 'deaf_hoh',
    name: 'Deaf/Hard of Hearing',
    description: 'Visual alternatives for audio',
    visual: { iconLabels: true },
    audio: {
      visualAudioCues: true,
      subtitles: true,
      captions: true,
      hapticFeedback: true,
    },
    motor: {},
    cognitive: {},
  },
  {
    id: 'motor_limited',
    name: 'Limited Mobility',
    description: 'Reduced precision and simplified controls',
    visual: {},
    audio: {},
    motor: {
      reducedPrecision: true,
      oneHandMode: true,
      gestureSimplification: true,
      holdToConfirm: true,
      assistedAiming: true,
    },
    cognitive: { confirmationPrompts: true },
  },
  {
    id: 'cognitive_support',
    name: 'Cognitive Support',
    description: 'Simplified experience with extra guidance',
    visual: { iconLabels: true },
    audio: {},
    motor: { reducedPrecision: true },
    cognitive: {
      simplifiedUI: true,
      extendedTimers: true,
      clearInstructions: true,
      tutorialReplay: true,
      memoryAids: true,
      focusMode: true,
    },
  },
  {
    id: 'photosensitive',
    name: 'Photosensitive',
    description: 'Reduced flashing and motion',
    visual: {
      reducedMotion: true,
      brightnessLevel: 0.8,
    },
    audio: {},
    motor: {},
    cognitive: { focusMode: true },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getColorblindModeConfig(mode: ColorblindMode): ColorblindModeConfig {
  return COLORBLIND_MODES.find(m => m.id === mode) || COLORBLIND_MODES[0];
}

export function getTextSizeConfig(size: TextSize): TextSizeConfig {
  return TEXT_SIZES.find(s => s.id === size) || TEXT_SIZES[1];
}

export function getTouchSensitivityConfig(sensitivity: TouchSensitivity) {
  return TOUCH_SENSITIVITY_CONFIG[sensitivity];
}

export function applyAccessibilityPreset(presetId: string): {
  visual: VisualAccessibilitySettings;
  audio: AudioAccessibilitySettings;
  motor: MotorAccessibilitySettings;
  cognitive: CognitiveAccessibilitySettings;
} {
  const preset = ACCESSIBILITY_PRESETS.find(p => p.id === presetId) || ACCESSIBILITY_PRESETS[0];
  return {
    visual: { ...DEFAULT_VISUAL_ACCESSIBILITY, ...preset.visual },
    audio: { ...DEFAULT_AUDIO_ACCESSIBILITY, ...preset.audio },
    motor: { ...DEFAULT_MOTOR_ACCESSIBILITY, ...preset.motor },
    cognitive: { ...DEFAULT_COGNITIVE_ACCESSIBILITY, ...preset.cognitive },
  };
}

export function calculateTimerDuration(baseDuration: number, multiplier: TimerMultiplier): number {
  if (multiplier === 'unlimited') return Infinity;
  return baseDuration * multiplier;
}
