// Input handling controller for mouse, touch, and keyboard
import { EventBus } from '../systems/EventBus';
import type { Player, Camera } from '../types';

interface InputControllerConfig {
    canvas: HTMLCanvasElement;
    getPlayer: () => Player;
    getCamera: () => Camera;
    getGameActive: () => boolean;
    getDimensions: () => { width: number; height: number };
}

/**
 * Centralized input handling for all user interactions
 * Manages mouse, touch, and keyboard events
 */
export class InputController {
    private canvas: HTMLCanvasElement;
    private getPlayer: () => Player;
    private getCamera: () => Camera;
    private getGameActive: () => boolean;
    // @ts-ignore Reserved for future UI features
    private _getDimensions: () => { width: number; height: number };

    private isMouseDown: boolean = false;
    private cleanupFns: (() => void)[] = [];

    constructor(config: InputControllerConfig) {
        this.canvas = config.canvas;
        this.getPlayer = config.getPlayer;
        this.getCamera = config.getCamera;
        this.getGameActive = config.getGameActive;
        this._getDimensions = config.getDimensions;
    }

    /**
     * Initialize all input listeners
     */
    init(): void {
        this.setupMouseControls();
        this.setupTouchControls();
        this.setupKeyboardControls();
        this.setupCursorTracking();
    }

    /**
     * Clean up all event listeners
     */
    destroy(): void {
        this.cleanupFns.forEach(fn => fn());
        this.cleanupFns = [];
    }

    /**
     * Helper to add event listener with cleanup tracking
     */
    private addListener<K extends keyof HTMLElementEventMap>(
        element: HTMLElement | Window | Document,
        event: K,
        handler: (e: HTMLElementEventMap[K]) => void,
        options?: AddEventListenerOptions
    ): void {
        element.addEventListener(event, handler as EventListener, options);
        this.cleanupFns.push(() => {
            element.removeEventListener(event, handler as EventListener, options);
        });
    }

    /**
     * Setup mouse controls
     */
    private setupMouseControls(): void {
        this.addListener(this.canvas, 'mousedown', this.handleMouseDown.bind(this));
        this.addListener(this.canvas, 'mousemove', this.handleMouseMove.bind(this));
        this.addListener(this.canvas, 'mouseup', this.handleMouseUp.bind(this));
        this.addListener(this.canvas, 'mouseleave', this.handleMouseUp.bind(this));
    }

    /**
     * Setup touch controls
     */
    private setupTouchControls(): void {
        this.addListener(this.canvas, 'touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.addListener(this.canvas, 'touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.addListener(this.canvas, 'touchend', this.handleTouchEnd.bind(this));
    }

    /**
     * Setup keyboard controls
     */
    private setupKeyboardControls(): void {
        this.addListener(document as any, 'keydown', this.handleKeyDown.bind(this) as any);
    }

    /**
     * Setup cursor tracking for custom cursor
     */
    private setupCursorTracking(): void {
        const cursor = document.getElementById('cursor');
        if (!cursor) return;

        this.addListener(window as any, 'mousemove', ((e: MouseEvent) => {
            cursor.style.left = `${e.clientX - 14}px`;
            cursor.style.top = `${e.clientY - 14}px`;
        }) as any);

        this.addListener(window as any, 'touchmove', ((e: TouchEvent) => {
            if (e.touches[0]) {
                cursor.style.left = `${e.touches[0].clientX - 14}px`;
                cursor.style.top = `${e.touches[0].clientY - 14}px`;
            }
        }) as any, { passive: true });
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        const camera = this.getCamera();
        return {
            x: camera.x + (screenX - rect.left),
            y: camera.y + (screenY - rect.top)
        };
    }

    /**
     * Handle mouse down
     */
    private handleMouseDown(e: MouseEvent): void {
        this.isMouseDown = true;
        const world = this.screenToWorld(e.clientX, e.clientY);
        const player = this.getPlayer();
        player.tx = world.x;
        player.ty = world.y;

        EventBus.emit('player:move', world);
    }

    /**
     * Handle mouse move
     */
    private handleMouseMove(e: MouseEvent): void {
        if (!this.isMouseDown) return;

        const world = this.screenToWorld(e.clientX, e.clientY);
        const player = this.getPlayer();
        player.tx = world.x;
        player.ty = world.y;
    }

    /**
     * Handle mouse up
     */
    private handleMouseUp(): void {
        this.isMouseDown = false;
    }

    /**
     * Handle touch start
     */
    private handleTouchStart(e: TouchEvent): void {
        e.preventDefault();
        if (!e.touches[0]) return;

        const world = this.screenToWorld(e.touches[0].clientX, e.touches[0].clientY);
        const player = this.getPlayer();
        player.tx = world.x;
        player.ty = world.y;

        EventBus.emit('player:move', world);
    }

    /**
     * Handle touch move
     */
    private handleTouchMove(e: TouchEvent): void {
        e.preventDefault();
        if (!e.touches[0]) return;

        const world = this.screenToWorld(e.touches[0].clientX, e.touches[0].clientY);
        const player = this.getPlayer();
        player.tx = world.x;
        player.ty = world.y;
    }

    /**
     * Handle touch end
     */
    private handleTouchEnd(): void {
        // Touch ended - could add momentum here
    }

    /**
     * Handle keyboard input
     */
    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.getGameActive()) return;

        // Ignore key commands if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
                // Let Escape through to close the box
            } else {
                return;
            }
        }

        switch (e.key.toLowerCase()) {
            case 'w':
                EventBus.emit('ui:showMessageBox', { placeholder: 'Whisper into the void...' });
                break;
            case 's':
                EventBus.emit('player:sing');
                break;
            case ' ':
                e.preventDefault();
                EventBus.emit('player:pulse');
                break;
            case 'e':
                EventBus.emit('ui:showMessageBox', { placeholder: 'Plant an eternal echo...' });
                break;
            case 'q':
                const emoteBtn = document.getElementById('btn-emote');
                if (emoteBtn) {
                    const rect = emoteBtn.getBoundingClientRect();
                    EventBus.emit('ui:showEmoteWheel', { x: rect.left + rect.width / 2, y: rect.top - 40 });
                }
                break;
            case 'tab':
                e.preventDefault();
                EventBus.emit('ui:closeAllPanels');
                EventBus.emit('ui:showPanel', { panel: 'social' });
                break;
            case 'escape':
                EventBus.emit('ui:hideMessageBox');
                EventBus.emit('ui:hideProfile');
                EventBus.emit('ui:hideEmoteWheel');
                EventBus.emit('ui:closeAllPanels');
                break;
        }
    }

    /**
     * Check if mouse is currently held down
     */
    getIsMouseDown(): boolean {
        return this.isMouseDown;
    }
}
