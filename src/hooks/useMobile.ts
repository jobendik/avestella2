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
    const [state, setState] = useState<UseMobileReturn>(() => ({
        isMobile: isMobileDevice() || (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT),
        isPortrait: typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true,
        screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
        screenHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
        isSmallScreen: typeof window !== 'undefined' && window.innerWidth < SMALL_SCREEN_BREAKPOINT,
    }));

    const updateState = useCallback(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        setState({
            isMobile: isMobileDevice() || width < MOBILE_BREAKPOINT,
            isPortrait: height > width,
            screenWidth: width,
            screenHeight: height,
            isSmallScreen: width < SMALL_SCREEN_BREAKPOINT,
        });
    }, []);

    useEffect(() => {
        // Update on mount
        updateState();

        // Listen for resize and orientation changes
        window.addEventListener('resize', updateState);
        window.addEventListener('orientationchange', updateState);

        return () => {
            window.removeEventListener('resize', updateState);
            window.removeEventListener('orientationchange', updateState);
        };
    }, [updateState]);

    return state;
}

export default useMobile;
