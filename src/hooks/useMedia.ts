// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Media Hook
// Manages screenshots, gallery, filters, templates, and sharing
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '@/utils/storage';
import { Screenshot } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Filter System
// ─────────────────────────────────────────────────────────────────────────────

export type FilterType = 
  | 'none'
  | 'warm'      // Orange/warm tones
  | 'cool'      // Blue/cool tones
  | 'sepia'     // Vintage brown
  | 'noir'      // Black and white
  | 'dream'     // Soft/blurry glow
  | 'ethereal'  // Light/airy
  | 'vintage'   // Faded retro
  | 'cyberpunk' // Neon colors
  | 'galaxy';   // Cosmic colors

export interface FilterConfig {
  name: string;
  cssFilter: string;
  overlay?: string; // Optional CSS gradient overlay
}

export const FILTERS: Record<FilterType, FilterConfig> = {
  none: { name: 'None', cssFilter: 'none' },
  warm: { 
    name: 'Warm', 
    cssFilter: 'sepia(0.3) saturate(1.3) brightness(1.05)',
    overlay: 'linear-gradient(to bottom, rgba(255, 180, 100, 0.1), rgba(255, 100, 50, 0.15))'
  },
  cool: { 
    name: 'Cool', 
    cssFilter: 'hue-rotate(20deg) saturate(0.9) brightness(1.05)',
    overlay: 'linear-gradient(to bottom, rgba(100, 150, 255, 0.1), rgba(50, 100, 200, 0.15))'
  },
  sepia: { 
    name: 'Sepia', 
    cssFilter: 'sepia(0.8) saturate(0.8) contrast(1.1)'
  },
  noir: { 
    name: 'Noir', 
    cssFilter: 'grayscale(1) contrast(1.2) brightness(0.9)'
  },
  dream: { 
    name: 'Dream', 
    cssFilter: 'blur(0.5px) brightness(1.1) saturate(1.2)',
    overlay: 'radial-gradient(circle, transparent 30%, rgba(255, 255, 255, 0.2))'
  },
  ethereal: { 
    name: 'Ethereal', 
    cssFilter: 'brightness(1.15) contrast(0.9) saturate(0.8)',
    overlay: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent)'
  },
  vintage: { 
    name: 'Vintage', 
    cssFilter: 'sepia(0.4) contrast(0.9) saturate(0.85) brightness(1.05)',
    overlay: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.1), rgba(139, 69, 19, 0.15))'
  },
  cyberpunk: { 
    name: 'Cyberpunk', 
    cssFilter: 'saturate(1.5) contrast(1.2) hue-rotate(-10deg)',
    overlay: 'linear-gradient(135deg, rgba(255, 0, 128, 0.1), rgba(0, 255, 255, 0.1))'
  },
  galaxy: { 
    name: 'Galaxy', 
    cssFilter: 'saturate(1.4) brightness(0.95) contrast(1.1)',
    overlay: 'linear-gradient(180deg, rgba(138, 43, 226, 0.15), rgba(75, 0, 130, 0.2), rgba(0, 0, 50, 0.25))'
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Template System
// ─────────────────────────────────────────────────────────────────────────────

export type TemplateType = 
  | 'minimal'  // Clean, no overlay
  | 'stats'    // Show player stats
  | 'quote'    // Inspirational quote overlay
  | 'framed';  // Decorative border

export interface TemplateConfig {
  name: string;
  description: string;
  hasOverlay: boolean;
  hasBorder: boolean;
}

export const TEMPLATES: Record<TemplateType, TemplateConfig> = {
  minimal: { 
    name: 'Minimal', 
    description: 'Clean screenshot with no overlays',
    hasOverlay: false,
    hasBorder: false
  },
  stats: { 
    name: 'Stats', 
    description: 'Shows your light level, bonds, and fragments',
    hasOverlay: true,
    hasBorder: false
  },
  quote: { 
    name: 'Quote', 
    description: 'Adds an inspirational quote overlay',
    hasOverlay: true,
    hasBorder: false
  },
  framed: { 
    name: 'Framed', 
    description: 'Decorative border with star corners',
    hasOverlay: false,
    hasBorder: true
  },
};

const INSPIRATIONAL_QUOTES = [
  "Every light matters in the darkness.",
  "Together, we shine brighter.",
  "Find warmth in connection.",
  "Stars are born from shared light.",
  "The darkness makes our glow more beautiful.",
  "In the cosmos of souls, you are never alone.",
  "Each pulse is a heartbeat of hope.",
  "Bonds are the bridges between stars.",
  "Let your light guide others home.",
  "We are all made of stardust.",
];

// ─────────────────────────────────────────────────────────────────────────────
// Hook Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface UseMediaReturn {
  // Gallery
  screenshotGallery: Screenshot[];
  addToGallery: (url: string, stats: Screenshot['stats']) => void;
  removeFromGallery: (id: number) => void;
  clearGallery: () => void;
  
  // Filters
  currentFilter: FilterType;
  setCurrentFilter: (filter: FilterType) => void;
  getFilterCSS: (filter?: FilterType) => string;
  getFilterOverlay: (filter?: FilterType) => string | undefined;
  availableFilters: FilterType[];
  
  // Templates
  currentTemplate: TemplateType;
  setCurrentTemplate: (template: TemplateType) => void;
  getTemplateConfig: (template?: TemplateType) => TemplateConfig;
  availableTemplates: TemplateType[];
  getRandomQuote: () => string;
  
  // Sharing
  shareScreenshot: (screenshot: Screenshot) => Promise<boolean>;
  downloadScreenshot: (screenshot: Screenshot, filename?: string) => void;
  generateDeepLink: (stats: Screenshot['stats']) => string;
  canNativeShare: boolean;
  
  // Apply effects
  applyFilterToScreenshot: (screenshot: Screenshot, filter: FilterType) => Screenshot;
  applyTemplateToScreenshot: (screenshot: Screenshot, template: TemplateType) => Screenshot;
}

export function useMedia(): UseMediaReturn {
  const [screenshotGallery, setScreenshotGallery] = useState<Screenshot[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('none');
  const [currentTemplate, setCurrentTemplate] = useState<TemplateType>('minimal');
  const quoteIndexRef = useRef(Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length));

  // Check for native share support
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Load gallery on mount
  useEffect(() => {
    const gallery = loadFromStorage<Screenshot[]>('avestella_gallery', []);
    setScreenshotGallery(gallery);
  }, []);

  // Save gallery on change
  useEffect(() => {
    if (screenshotGallery.length > 0) {
      saveToStorage('avestella_gallery', screenshotGallery);
    }
  }, [screenshotGallery]);

  // ─────────────────────────────────────────────────────────────────────────
  // Gallery Methods
  // ─────────────────────────────────────────────────────────────────────────

  const addToGallery = useCallback((url: string, stats: Screenshot['stats']) => {
    const newScreenshot: Screenshot = {
      id: Date.now(),
      url,
      date: new Date().toISOString(),
      filter: currentFilter,
      template: currentTemplate,
      stats
    };

    setScreenshotGallery(prev => [newScreenshot, ...prev]);
  }, [currentFilter, currentTemplate]);

  const removeFromGallery = useCallback((id: number) => {
    setScreenshotGallery(prev => prev.filter(s => s.id !== id));
  }, []);

  const clearGallery = useCallback(() => {
    setScreenshotGallery([]);
    saveToStorage('avestella_gallery', []);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Filter Methods
  // ─────────────────────────────────────────────────────────────────────────

  const getFilterCSS = useCallback((filter?: FilterType): string => {
    return FILTERS[filter || currentFilter].cssFilter;
  }, [currentFilter]);

  const getFilterOverlay = useCallback((filter?: FilterType): string | undefined => {
    return FILTERS[filter || currentFilter].overlay;
  }, [currentFilter]);

  const availableFilters: FilterType[] = Object.keys(FILTERS) as FilterType[];

  // ─────────────────────────────────────────────────────────────────────────
  // Template Methods
  // ─────────────────────────────────────────────────────────────────────────

  const getTemplateConfig = useCallback((template?: TemplateType): TemplateConfig => {
    return TEMPLATES[template || currentTemplate];
  }, [currentTemplate]);

  const availableTemplates: TemplateType[] = Object.keys(TEMPLATES) as TemplateType[];

  const getRandomQuote = useCallback((): string => {
    quoteIndexRef.current = (quoteIndexRef.current + 1) % INSPIRATIONAL_QUOTES.length;
    return INSPIRATIONAL_QUOTES[quoteIndexRef.current];
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Sharing Methods
  // ─────────────────────────────────────────────────────────────────────────

  const shareScreenshot = useCallback(async (screenshot: Screenshot): Promise<boolean> => {
    if (!canNativeShare) {
      // Fall back to download
      downloadScreenshot(screenshot);
      return false;
    }

    try {
      // Convert data URL to blob for sharing
      const response = await fetch(screenshot.url);
      const blob = await response.blob();
      const file = new File([blob], `avestella-${screenshot.id}.png`, { type: 'image/png' });

      await navigator.share({
        title: 'Avestella Screenshot',
        text: `Light Level: ${screenshot.stats.lightLevel} | Bonds: ${screenshot.stats.bonds} | Fragments: ${screenshot.stats.fragments}`,
        files: [file],
      });
      return true;
    } catch (err) {
      console.warn('Share failed, falling back to download:', err);
      downloadScreenshot(screenshot);
      return false;
    }
  }, [canNativeShare]);

  const downloadScreenshot = useCallback((screenshot: Screenshot, filename?: string) => {
    const link = document.createElement('a');
    link.href = screenshot.url;
    link.download = filename || `avestella-screenshot-${screenshot.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const generateDeepLink = useCallback((stats: Screenshot['stats']): string => {
    const params = new URLSearchParams({
      light: String(stats.lightLevel),
      bonds: String(stats.bonds),
      fragments: String(stats.fragments),
      tier: String(stats.tier || 1),
    });
    
    // In production this would be a real domain
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://avestella.game';
    return `${baseUrl}/share?${params.toString()}`;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Apply Effects
  // ─────────────────────────────────────────────────────────────────────────

  const applyFilterToScreenshot = useCallback((screenshot: Screenshot, filter: FilterType): Screenshot => {
    return {
      ...screenshot,
      filter,
    };
  }, []);

  const applyTemplateToScreenshot = useCallback((screenshot: Screenshot, template: TemplateType): Screenshot => {
    return {
      ...screenshot,
      template,
    };
  }, []);

  return {
    // Gallery
    screenshotGallery,
    addToGallery,
    removeFromGallery,
    clearGallery,
    
    // Filters
    currentFilter,
    setCurrentFilter,
    getFilterCSS,
    getFilterOverlay,
    availableFilters,
    
    // Templates
    currentTemplate,
    setCurrentTemplate,
    getTemplateConfig,
    availableTemplates,
    getRandomQuote,
    
    // Sharing
    shareScreenshot,
    downloadScreenshot,
    generateDeepLink,
    canNativeShare,
    
    // Apply effects
    applyFilterToScreenshot,
    applyTemplateToScreenshot,
  };
}
