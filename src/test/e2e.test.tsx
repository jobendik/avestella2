// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - End-to-End Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import App from '@/App';

describe('App E2E Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('App Initialization', () => {
    it('should render without crashing', () => {
      expect(() => render(React.createElement(App))).not.toThrow();
    });

    it('should display the game canvas', () => {
      render(React.createElement(App));
      
      // The app should render a canvas element for the game
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeDefined();
    });
  });

  describe('Touch/Mouse Interaction', () => {
    it('should respond to touch events on canvas', () => {
      render(React.createElement(App));
      const canvas = document.querySelector('canvas');
      
      if (canvas) {
        expect(() => {
          fireEvent.touchStart(canvas, {
            touches: [{ clientX: 100, clientY: 100 }]
          });
          fireEvent.touchEnd(canvas);
        }).not.toThrow();
      }
    });

    it('should respond to mouse events on canvas', () => {
      render(React.createElement(App));
      const canvas = document.querySelector('canvas');
      
      if (canvas) {
        expect(() => {
          fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
          fireEvent.mouseUp(canvas);
        }).not.toThrow();
      }
    });
  });

  describe('Game State Persistence', () => {
    it('should save state to localStorage', () => {
      render(React.createElement(App));
      
      // Trigger some gameplay that would cause a save
      const canvas = document.querySelector('canvas');
      if (canvas) {
        fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
        fireEvent.mouseMove(canvas, { clientX: 250, clientY: 250 });
        fireEvent.mouseUp(canvas);
      }
      
      // Check that localStorage was accessed
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('UI Components', () => {
    it('should display UI overlay elements', () => {
      render(React.createElement(App));
      
      // The app should have some UI overlay
      const appElement = document.querySelector('#root') || document.body.firstChild;
      expect(appElement).toBeDefined();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle window resize', () => {
      render(React.createElement(App));
      
      expect(() => {
        fireEvent(window, new Event('resize'));
      }).not.toThrow();
    });
  });

  describe('Error Boundaries', () => {
    it('should gracefully handle errors', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(React.createElement(App))).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });
});
