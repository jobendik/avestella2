// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Screenshot Editor Panel
// Filter and Template selection for screenshots
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useMediaContext } from '@/contexts/GameContext';
import { FILTERS, TEMPLATES, type FilterType, type TemplateType } from '@/hooks/useMedia';
import type { Screenshot } from '@/types';

interface ScreenshotEditorProps {
  screenshot: Screenshot;
  onSave?: (screenshot: Screenshot) => void;
  onClose?: () => void;
}

export function ScreenshotEditor({ 
  screenshot, 
  onSave, 
  onClose 
}: ScreenshotEditorProps): JSX.Element {
  const media = useMediaContext();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>(screenshot.filter as FilterType || 'none');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(screenshot.template as TemplateType || 'minimal');
  const [activeTab, setActiveTab] = useState<'filters' | 'templates'>('filters');

  const handleApply = () => {
    const updated = {
      ...screenshot,
      filter: selectedFilter,
      template: selectedTemplate,
    };
    onSave?.(updated);
  };

  const handleShare = async () => {
    handleApply();
    await media.shareScreenshot({
      ...screenshot,
      filter: selectedFilter,
      template: selectedTemplate,
    });
  };

  const handleDownload = () => {
    handleApply();
    media.downloadScreenshot({
      ...screenshot,
      filter: selectedFilter,
      template: selectedTemplate,
    });
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-4 w-96 border border-cyan-500/30 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">📸</span>
          Edit Screenshot
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="relative mb-4 rounded-lg overflow-hidden bg-slate-800">
        <img
          src={screenshot.url}
          alt="Screenshot preview"
          className="w-full h-48 object-cover"
          style={{ filter: media.getFilterCSS(selectedFilter) }}
        />
        
        {/* Filter overlay */}
        {media.getFilterOverlay(selectedFilter) && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ background: media.getFilterOverlay(selectedFilter) }}
          />
        )}

        {/* Template overlay */}
        {selectedTemplate === 'stats' && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex justify-between text-white text-xs">
              <span>⚡ Lv.{screenshot.stats.lightLevel}</span>
              <span>🤝 {screenshot.stats.bonds} Bonds</span>
              <span>💎 {screenshot.stats.fragments}</span>
            </div>
          </div>
        )}

        {selectedTemplate === 'quote' && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="text-white text-center text-sm italic font-light drop-shadow-lg">
              "{media.getRandomQuote()}"
            </p>
          </div>
        )}

        {selectedTemplate === 'framed' && (
          <div className="absolute inset-0 border-4 border-amber-400/50 pointer-events-none">
            <div className="absolute top-0 left-0 text-amber-400 text-lg">✦</div>
            <div className="absolute top-0 right-0 text-amber-400 text-lg">✦</div>
            <div className="absolute bottom-0 left-0 text-amber-400 text-lg">✦</div>
            <div className="absolute bottom-0 right-0 text-amber-400 text-lg">✦</div>
          </div>
        )}
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('filters')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
            ${activeTab === 'filters' 
              ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
        >
          🎨 Filters
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
            ${activeTab === 'templates' 
              ? 'bg-purple-500/30 text-purple-400 border border-purple-500/50' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
        >
          📐 Templates
        </button>
      </div>

      {/* Filter Selection */}
      {activeTab === 'filters' && (
        <div className="grid grid-cols-5 gap-2 mb-4">
          {(Object.keys(FILTERS) as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`
                p-2 rounded-lg text-center transition-all
                ${selectedFilter === filter 
                  ? 'bg-cyan-500/30 border-cyan-500 ring-2 ring-cyan-500/50' 
                  : 'bg-slate-800 hover:bg-slate-700 border-transparent'
                }
                border
              `}
              title={FILTERS[filter].name}
            >
              <div 
                className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-500 mb-1"
                style={{ filter: FILTERS[filter].cssFilter }}
              />
              <span className="text-xs text-slate-300 truncate block">
                {FILTERS[filter].name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Template Selection */}
      {activeTab === 'templates' && (
        <div className="space-y-2 mb-4">
          {(Object.keys(TEMPLATES) as TemplateType[]).map((template) => (
            <button
              key={template}
              onClick={() => setSelectedTemplate(template)}
              className={`
                w-full p-3 rounded-lg text-left transition-all flex items-center gap-3
                ${selectedTemplate === template 
                  ? 'bg-purple-500/30 border-purple-500' 
                  : 'bg-slate-800 hover:bg-slate-700 border-transparent'
                }
                border
              `}
            >
              <span className="text-xl">
                {template === 'minimal' && '✨'}
                {template === 'stats' && '📊'}
                {template === 'quote' && '💬'}
                {template === 'framed' && '🖼️'}
              </span>
              <div>
                <div className="text-white text-sm font-medium">
                  {TEMPLATES[template].name}
                </div>
                <div className="text-xs text-slate-400">
                  {TEMPLATES[template].description}
                </div>
              </div>
              {selectedTemplate === template && (
                <span className="ml-auto text-purple-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 
                     text-white rounded-lg text-sm font-medium transition-colors
                     flex items-center justify-center gap-2"
        >
          ⬇️ Download
        </button>
        <button
          onClick={handleShare}
          disabled={!media.canNativeShare}
          className="flex-1 py-2 px-4 bg-gradient-to-r from-cyan-500 to-purple-500 
                     hover:from-cyan-600 hover:to-purple-600
                     text-white rounded-lg text-sm font-medium transition-colors
                     flex items-center justify-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📤 Share
        </button>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Taken: {new Date(screenshot.date).toLocaleDateString()}</span>
          <span>ID: #{screenshot.id}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Quick Selector (for capture flow)
// ─────────────────────────────────────────────────────────────────────────────

interface FilterQuickSelectorProps {
  selectedFilter: FilterType;
  onSelect: (filter: FilterType) => void;
}

export function FilterQuickSelector({ 
  selectedFilter, 
  onSelect 
}: FilterQuickSelectorProps): JSX.Element {
  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {(Object.keys(FILTERS) as FilterType[]).map((filter) => (
        <button
          key={filter}
          onClick={() => onSelect(filter)}
          className={`
            flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${selectedFilter === filter 
              ? 'bg-cyan-500 text-white' 
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }
          `}
        >
          {FILTERS[filter].name}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Quick Selector (for capture flow)
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateQuickSelectorProps {
  selectedTemplate: TemplateType;
  onSelect: (template: TemplateType) => void;
}

export function TemplateQuickSelector({ 
  selectedTemplate, 
  onSelect 
}: TemplateQuickSelectorProps): JSX.Element {
  return (
    <div className="flex gap-2">
      {(Object.keys(TEMPLATES) as TemplateType[]).map((template) => (
        <button
          key={template}
          onClick={() => onSelect(template)}
          className={`
            flex-1 py-2 rounded-lg text-center transition-all
            ${selectedTemplate === template 
              ? 'bg-purple-500/30 text-purple-400 border border-purple-500' 
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-transparent'
            }
          `}
        >
          <span className="text-lg block mb-1">
            {template === 'minimal' && '✨'}
            {template === 'stats' && '📊'}
            {template === 'quote' && '💬'}
            {template === 'framed' && '🖼️'}
          </span>
          <span className="text-xs">{TEMPLATES[template].name}</span>
        </button>
      ))}
    </div>
  );
}

export default ScreenshotEditor;
