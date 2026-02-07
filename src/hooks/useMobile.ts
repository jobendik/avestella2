// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Mobile Detection Hook
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { isMobile as isMobileDevice } from '@/utils/math';

export interface UseMobileReturn {
    /** True if the device is a mobile device (phone/tablet) */
    isMobile: boolean;
    /** True if the screen is in portrait orientation */
    isPortrait: boolean;
    /** Current screen width in pixels */
    screenWidth: number;
    /** Current screen height in pixels */
    screenHeight: number;
    /** True if screen width is less than 480px (small phone) */
    isSmallScreen: boolean;
}

// Breakpoint constants
const MOBILE_BREAKPOINT = 768;
const SMALL_SCREEN_BREAKPOINT = 480;

/**
 * Hook to detect mobile devices and screen orientation
 * Provides reactive state that updates on resize and orientation change
 */
export function useMobile(): UseMobileReturn {
    const [state, setState] = useState<UseMobileReturn>(() => {
        if (typeof window === 'undefined') {
            return {
                isMobile: false,
                isPortrait: true,
                screenWidth: 1920,
                screenHeight: 1080,
                isSmallScreen: false,
            };
        }

        // Use screen.width for initial detection (more reliable on mobile)
        const deviceIsMobile = isMobileDevice();
        const screenWidth = window.screen?.width || window.innerWidth;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const effectiveWidth = Math.min(width, screenWidth);

        return {
            isMobile: deviceIsMobile || effectiveWidth < MOBILE_BREAKPOINT,
            isPortrait: height > width,
            screenWidth: width,
            screenHeight: height,
            isSmallScreen: effectiveWidth < SMALL_SCREEN_BREAKPOINT,
        };
    });

    const updateState = useCallback(() => {
        // Use screen.width for more reliable mobile detection on initial load
        // window.innerWidth can be wrong before viewport scaling kicks in
        const width = window.innerWidth;
        const height = window.innerHeight;
        const screenWidth = window.screen?.width || width;

        // Check if device is mobile by user agent + touch + screen size
        const deviceIsMobile = isMobileDevice();
        const effectiveWidth = Math.min(width, screenWidth);

        setState({
            isMobile: deviceIsMobile || effectiveWidth < MOBILE_BREAKPOINT,
            isPortrait: height > width,
            screenWidth: width,
            screenHeight: height,
            isSmallScreen: effectiveWidth < SMALL_SCREEN_BREAKPOINT,
        });
    }, []);

    useEffect(() => {
        // Update on mount
        updateState();

        // Debug logging for mobile detection
        if (process.env.NODE_ENV === 'development') {
            console.log('[useMobile] Initial detection:', {
                isMobile: state.isMobile,
                userAgent: navigator.userAgent,
                screenWidth: window.screen?.width,
                innerWidth: window.innerWidth,
                hasTouch: 'ontouchstart' in window,
                maxTouchPoints: navigator.maxTouchPoints,
            });
        }

        // Listen for resize and orientation changes
        window.addEventListener('resize', updateState);
        window.addEventListener('orientationchange', updateState);

        // Also update after a short delay to catch viewport scaling
        const timeoutId = setTimeout(updateState, 100);

        return () => {
            window.removeEventListener('resize', updateState);
            window.removeEventListener('orientationchange', updateState);
            clearTimeout(timeoutId);
        };
    }, [updateState]);

    return state;
}

export default useMobile;
