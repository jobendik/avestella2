// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Custom Color Picker (Batch 2: Personalization)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect } from 'react';
import { useCosmeticsContext, useProgressionContext } from '@/contexts/GameContext';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CUSTOM_COLOR_PRICE = 1000;

const PRESET_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4D96FF',
  '#9B59B6', '#E040FB', '#FF69B4', '#00CED1', '#50C878',
  '#FF6B35', '#E0FFFF', '#FFD700', '#DC143C', '#8B5CF6',
];

const GRADIENT_PRESETS = [
  { name: 'Sunset', colors: ['#FF6B6B', '#FF8E53'] },
  { name: 'Ocean', colors: ['#4D96FF', '#00CED1'] },
  { name: 'Forest', colors: ['#6BCB77', '#50C878'] },
  { name: 'Cosmic', colors: ['#9B59B6', '#E040FB'] },
  { name: 'Rose', colors: ['#FF69B4', '#FF6B6B'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface ColorPickerProps {
  onClose?: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ onClose }) => {
  const cosmetics = useCosmeticsContext();
  const progression = useProgressionContext();
  
  const [hexInput, setHexInput] = useState(cosmetics.data.customColor || '#FFA500');
  const [isValidColor, setIsValidColor] = useState(true);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  
  const isUnlocked = cosmetics.data.customColorUnlocked;
  const canAfford = progression.state.stardust >= CUSTOM_COLOR_PRICE;

  // Validate hex input
  useEffect(() => {
    setIsValidColor(cosmetics.isValidHexColor(hexInput));
  }, [hexInput, cosmetics]);

  // Handle hex input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Auto-add # if missing
    if (!value.startsWith('#') && value.length > 0) {
      value = '#' + value;
    }
    // Limit to 7 chars (#RRGGBB)
    if (value.length <= 7) {
      setHexInput(value.toUpperCase());
    }
  }, []);

  // Apply custom color
  const handleApply = useCallback(() => {
    if (!isUnlocked || !isValidColor) return;
    cosmetics.setCustomColor(hexInput);
  }, [isUnlocked, isValidColor, hexInput, cosmetics]);

  // Select preset color
  const handlePresetClick = useCallback((color: string) => {
    setHexInput(color);
    if (isUnlocked) {
      cosmetics.setCustomColor(color);
    }
  }, [isUnlocked, cosmetics]);

  // Unlock custom color feature
  const handleUnlock = useCallback(() => {
    if (!canAfford) return;
    if (progression.spendStardust(CUSTOM_COLOR_PRICE)) {
      cosmetics.unlockCustomColor();
      setShowUnlockConfirm(false);
    }
  }, [canAfford, progression, cosmetics]);

  return (
    <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-white/10 p-4 space-y-4 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🎨</span>
          <span>Custom Color</span>
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Lock Overlay */}
      {!isUnlocked && (
        <div className="relative">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-xl z-10 flex flex-col items-center justify-center p-4">
            {showUnlockConfirm ? (
              <div className="text-center space-y-3">
                <p className="text-white font-medium">Unlock Custom Colors?</p>
                <p className="text-sm text-gray-400">
                  Create any color you want with hex codes!
                </p>
                <div className="flex items-center justify-center gap-2 text-amber-400">
                  <span>💫</span>
                  <span className="font-bold">{CUSTOM_COLOR_PRICE.toLocaleString()}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowUnlockConfirm(false)}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUnlock}
                    disabled={!canAfford}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Unlock' : 'Not enough ✨'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <span className="text-4xl">🔒</span>
                <p className="text-white font-medium">Custom Colors Locked</p>
                <p className="text-sm text-gray-400">
                  Unlock to use any hex color code!
                </p>
                <button
                  onClick={() => setShowUnlockConfirm(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>💫</span>
                  <span>{CUSTOM_COLOR_PRICE.toLocaleString()} to Unlock</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Blurred preview underneath */}
          <div className="opacity-30 pointer-events-none">
            <ColorPickerContent
              hexInput="#AAAAAA"
              isValidColor={true}
              onInputChange={() => {}}
              onApply={() => {}}
              onPresetClick={() => {}}
              currentCustomColor={null}
            />
          </div>
        </div>
      )}

      {/* Unlocked Content */}
      {isUnlocked && (
        <ColorPickerContent
          hexInput={hexInput}
          isValidColor={isValidColor}
          onInputChange={handleInputChange}
          onApply={handleApply}
          onPresetClick={handlePresetClick}
          currentCustomColor={cosmetics.data.customColor}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Color Picker Content (reusable inner component)
// ─────────────────────────────────────────────────────────────────────────────

interface ColorPickerContentProps {
  hexInput: string;
  isValidColor: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApply: () => void;
  onPresetClick: (color: string) => void;
  currentCustomColor: string | null;
}

const ColorPickerContent: React.FC<ColorPickerContentProps> = ({
  hexInput,
  isValidColor,
  onInputChange,
  onApply,
  onPresetClick,
  currentCustomColor,
}) => {
  return (
    <div className="space-y-4">
      {/* Preview & Input */}
      <div className="flex items-center gap-3">
        {/* Color Preview */}
        <div
          className={`w-16 h-16 rounded-xl border-2 transition-all duration-300 shadow-lg ${
            isValidColor ? 'border-white/30' : 'border-red-500/50'
          }`}
          style={{
            backgroundColor: isValidColor ? hexInput : '#333',
            boxShadow: isValidColor ? `0 0 20px ${hexInput}40` : 'none',
          }}
        />
        
        {/* Hex Input */}
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 block">Hex Color Code</label>
          <input
            type="text"
            value={hexInput}
            onChange={onInputChange}
            placeholder="#FFA500"
            className={`w-full px-3 py-2 bg-white/10 rounded-lg border text-white font-mono text-lg
              focus:outline-none focus:ring-2 transition-all ${
              isValidColor
                ? 'border-white/20 focus:ring-purple-500'
                : 'border-red-500/50 focus:ring-red-500'
            }`}
          />
          {!isValidColor && hexInput.length > 0 && (
            <p className="text-xs text-red-400 mt-1">Enter valid hex: #RGB or #RRGGBB</p>
          )}
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={onApply}
        disabled={!isValidColor}
        className={`w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
          isValidColor
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
            : 'bg-white/10 text-gray-500 cursor-not-allowed'
        }`}
      >
        <span>✓</span>
        <span>Apply Color</span>
      </button>

      {/* Current Applied Color */}
      {currentCustomColor && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Current:</span>
          <div
            className="w-4 h-4 rounded-full border border-white/30"
            style={{ backgroundColor: currentCustomColor }}
          />
          <span className="font-mono">{currentCustomColor}</span>
        </div>
      )}

      {/* Preset Colors */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Quick Presets</label>
        <div className="grid grid-cols-5 gap-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              onClick={() => onPresetClick(color)}
              className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                hexInput === color
                  ? 'border-white ring-2 ring-purple-500'
                  : 'border-white/20 hover:border-white/40'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Gradient Ideas */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Color Ideas</label>
        <div className="flex flex-wrap gap-2">
          {GRADIENT_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => onPresetClick(preset.colors[0])}
              className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                }}
              />
              <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
