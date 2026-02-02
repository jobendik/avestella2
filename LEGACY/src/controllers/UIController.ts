// UI Controller - handles UI events and state
import { EventBus } from '../systems/EventBus';
import { UIManager } from '../ui/manager';
import type { Player, OtherPlayer, Settings, RealmId } from '../types';
import type { AudioManager } from '../core/audio';

interface UIControllerConfig {
    getPlayer: () => Player;
    getOthers: () => Map<string, OtherPlayer>;
    getSettings: () => Settings;
    getGameState: () => {
        msgMode: 'whisper' | 'echo' | 'direct' | null;
        directTarget: string | null;
        selectedId: string | null;
        showingSocial: boolean;
        showingAch: boolean;
        showingSettings: boolean;
        showingQuests: boolean;
        currentRealm: RealmId;
    };
    setGameState: (updates: Partial<{
        msgMode: 'whisper' | 'echo' | 'direct' | null;
        directTarget: string | null;
        selectedId: string | null;
        showingSocial: boolean;
        showingAch: boolean;
        showingSettings: boolean;
        showingQuests: boolean;
        currentRealm: RealmId;
    }>) => void;
    audio: AudioManager;
    onRealmChange: (realmId: string) => void;
    onCreateEcho: (text: string) => void;
    onCreateWhisper: (text: string, targetId?: string) => void;
    onSing: () => void;
    onPulse: () => void;
    onEmote: (emote: string) => void;
}

/**
 * Handles UI interactions and manages UI state
 */
export class UIController {
    private config: UIControllerConfig;
    private cleanupFns: (() => void)[] = [];

    constructor(config: UIControllerConfig) {
        this.config = config;
    }

    /**
     * Initialize UI event handlers
     */
    init(): void {
        this.setupEventBusListeners();
        this.setupDOMListeners();
        this.setupEmotes();
        this.setupColorPicker();
    }

    /**
     * Clean up all event listeners
     */
    destroy(): void {
        this.cleanupFns.forEach(fn => fn());
        this.cleanupFns = [];
    }

    /**
     * Setup EventBus listeners
     */
    private setupEventBusListeners(): void {
        const unsubs = [
            EventBus.on('ui:showPanel', ({ panel }) => this.showPanel(panel)),
            EventBus.on('ui:hidePanel', ({ panel }) => this.hidePanel(panel)),
            EventBus.on('ui:closeAllPanels', () => this.closeAllPanels()),
            EventBus.on('ui:showMessageBox', ({ placeholder, title }) => {
                UIManager.showMessageBox(placeholder, title);
            }),
            EventBus.on('ui:hideMessageBox', () => UIManager.hideMessageBox()),
            EventBus.on('ui:showEmoteWheel', ({ x, y }) => UIManager.showEmoteWheel(x, y)),
            EventBus.on('ui:hideEmoteWheel', () => UIManager.hideEmoteWheel()),
            EventBus.on('ui:showProfile', ({ playerId, x, y }) => {
                const other = this.config.getOthers().get(playerId);
                if (other) {
                    this.config.setGameState({ selectedId: playerId });
                    UIManager.showProfile(other, x, y);
                }
            }),
            EventBus.on('ui:hideProfile', () => UIManager.hideProfile()),
            EventBus.on('ui:toast', ({ message, type }) => UIManager.toast(message, type)),
            EventBus.on('ui:updateHUD', () => UIManager.updateHUD(this.config.getPlayer())),
            EventBus.on('player:sing', () => this.config.onSing()),
            EventBus.on('player:pulse', () => this.config.onPulse()),
            EventBus.on('network:syncComplete', () => {
                if (this.config.getGameState().showingSocial) {
                    UIManager.updateNearby(this.config.getOthers());
                }
            }),
        ];
        
        unsubs.forEach(unsub => this.cleanupFns.push(unsub));
    }

    /**
     * Setup DOM event listeners
     */
    private setupDOMListeners(): void {
        // Start button
        this.addDOMListener('start', 'click', () => {
            const nameInput = document.getElementById('name-input') as HTMLInputElement;
            const player = this.config.getPlayer();
            player.name = nameInput?.value.trim() || 'Wanderer';
            UIManager.hideLoading();
            document.getElementById('onboard')?.classList.add('show');
        });

        // Go button
        this.addDOMListener('ob-go', 'click', () => {
            document.getElementById('onboard')?.classList.remove('show');
            this.config.audio.init();
            this.config.audio.startDrone();
            EventBus.emit('game:start');
        });

        // Action buttons
        this.addDOMListener('btn-whisper', 'click', () => {
            this.config.setGameState({ msgMode: 'whisper' });
            UIManager.showMessageBox('Whisper into the void...');
        });

        this.addDOMListener('btn-sing', 'click', () => this.config.onSing());
        this.addDOMListener('btn-pulse', 'click', () => this.config.onPulse());

        this.addDOMListener('btn-echo', 'click', () => {
            this.config.setGameState({ msgMode: 'echo' });
            UIManager.showMessageBox('Plant an eternal echo...');
        });

        this.addDOMListener('btn-emote', 'click', (e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            UIManager.showEmoteWheel(rect.left + rect.width / 2, rect.top - 40);
        });

        this.addDOMListener('btn-social', 'click', () => {
            this.closeAllPanels();
            this.showPanel('social');
        });

        // Quick buttons
        this.addDOMListener('btn-quests', 'click', () => {
            this.closeAllPanels();
            this.showPanel('quests');
        });

        this.addDOMListener('btn-achievements', 'click', () => {
            this.closeAllPanels();
            this.showPanel('achievements');
        });

        this.addDOMListener('btn-settings', 'click', () => {
            this.closeAllPanels();
            this.showPanel('settings');
        });

        // Panel close buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            const handler = () => {
                const id = (btn as HTMLElement).dataset.close;
                if (id) this.hidePanel(id);
            };
            btn.addEventListener('click', handler);
            this.cleanupFns.push(() => btn.removeEventListener('click', handler));
        });

        // Realm switching
        document.querySelectorAll('.realm').forEach(btn => {
            const handler = () => {
                if (!btn.classList.contains('locked')) {
                    const realm = (btn as HTMLElement).dataset.realm;
                    if (realm) this.config.onRealmChange(realm);
                }
            };
            btn.addEventListener('click', handler);
            this.cleanupFns.push(() => btn.removeEventListener('click', handler));
        });

        // Settings toggles
        document.querySelectorAll('.toggle').forEach(toggle => {
            const handler = () => {
                const settingName = (toggle as HTMLElement).dataset.setting as keyof Settings;
                toggle.classList.toggle('on');
                if (settingName) {
                    const settings = this.config.getSettings();
                    (settings as any)[settingName] = toggle.classList.contains('on');
                    if (settingName === 'music') {
                        if (settings.music) this.config.audio.startDrone();
                        else this.config.audio.stopDrone();
                    }
                }
            };
            toggle.addEventListener('click', handler);
            this.cleanupFns.push(() => toggle.removeEventListener('click', handler));
        });

        // Volume sliders
        document.querySelectorAll('.slider').forEach(slider => {
            const handler = (e: Event) => {
                const mouseEvent = e as MouseEvent;
                const fill = slider.querySelector('.slider-fill') as HTMLElement;
                const valEl = slider.parentElement?.querySelector('.slider-val') as HTMLElement;
                const rect = slider.getBoundingClientRect();
                const pct = Math.max(0, Math.min(100, (mouseEvent.clientX - rect.left) / rect.width * 100));
                if (fill) fill.style.width = `${pct}%`;
                if (valEl) valEl.textContent = `${Math.round(pct)}%`;
                const settingName = (slider as HTMLElement).dataset.setting;
                if (settingName === 'volume') {
                    const settings = this.config.getSettings();
                    settings.volume = pct / 100;
                    this.config.audio.setVolume(pct / 100);
                }
            };
            slider.addEventListener('click', handler);
            this.cleanupFns.push(() => slider.removeEventListener('click', handler));
        });

        // Message input
        this.setupMessageInput();

        // Profile buttons
        this.addDOMListener('prof-whisper', 'click', () => {
            const gameState = this.config.getGameState();
            if (!gameState.selectedId) return;
            const other = this.config.getOthers().get(gameState.selectedId);
            this.config.setGameState({ 
                directTarget: gameState.selectedId, 
                msgMode: 'direct' 
            });
            UIManager.showMessageBox(`Whisper to ${other?.name || 'soul'}...`, `Whispering to ${other?.name}`);
            UIManager.hideProfile();
        });

        this.addDOMListener('prof-follow', 'click', () => {
            const gameState = this.config.getGameState();
            if (!gameState.selectedId) return;
            const other = this.config.getOthers().get(gameState.selectedId);
            if (other) {
                const player = this.config.getPlayer();
                player.tx = other.x;
                player.ty = other.y;
                UIManager.toast(`Following ${other.name}...`);
            }
            UIManager.hideProfile();
        });

        // Click outside to close emotes
        const outsideClickHandler = (e: Event) => {
            const target = e.target as HTMLElement;
            if (!target.closest('#emotes') && !target.closest('#btn-emote')) {
                UIManager.hideEmoteWheel();
            }
        };
        document.addEventListener('click', outsideClickHandler);
        this.cleanupFns.push(() => document.removeEventListener('click', outsideClickHandler));
    }

    /**
     * Helper to add DOM event listener with cleanup
     */
    private addDOMListener(elementId: string, event: string, handler: (e: Event) => void): void {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            this.cleanupFns.push(() => element.removeEventListener(event, handler));
        }
    }

    /**
     * Setup message input handling
     */
    private setupMessageInput(): void {
        const msgInput = document.getElementById('msg-input') as HTMLInputElement;
        if (!msgInput) return;

        const handler = (e: KeyboardEvent) => {
            const gameState = this.config.getGameState();
            
            if (e.key === 'Enter') {
                const text = msgInput.value.trim();
                if (text) {
                    if (gameState.msgMode === 'echo') {
                        this.config.onCreateEcho(text);
                    } else if (gameState.msgMode === 'direct' && gameState.directTarget) {
                        this.config.onCreateWhisper(text, gameState.directTarget);
                        this.config.setGameState({ directTarget: null });
                    } else {
                        this.config.onCreateWhisper(text);
                    }
                }
                msgInput.value = '';
                UIManager.hideMessageBox();
                this.config.setGameState({ msgMode: null });
            } else if (e.key === 'Escape') {
                msgInput.value = '';
                UIManager.hideMessageBox();
                this.config.setGameState({ msgMode: null, directTarget: null });
            }
        };

        msgInput.addEventListener('keydown', handler);
        this.cleanupFns.push(() => msgInput.removeEventListener('keydown', handler));
    }

    /**
     * Setup emote wheel
     */
    private setupEmotes(): void {
        const wheel = document.getElementById('emotes');
        if (!wheel) return;

        const EMOTES = ['😊', '❤️', '👋', '✨', '🌟', '🔥', '💫', '🎵'];
        const radius = 65;

        EMOTES.forEach((emote, i) => {
            const angle = (i / EMOTES.length) * Math.PI * 2 - Math.PI / 2;
            const x = 95 + Math.cos(angle) * radius - 20;
            const y = 95 + Math.sin(angle) * radius - 20;

            const opt = document.createElement('div');
            opt.className = 'emote';
            opt.textContent = emote;
            opt.style.left = `${x}px`;
            opt.style.top = `${y}px`;
            opt.addEventListener('click', () => {
                this.config.onEmote(emote);
                UIManager.hideEmoteWheel();
            });

            wheel.appendChild(opt);
        });
    }

    /**
     * Setup color picker
     */
    private setupColorPicker(): void {
        const picker = document.getElementById('color-picker');
        if (!picker) return;

        const player = this.config.getPlayer();
        const hues = [0, 30, 60, 120, 180, 210, 270, 300, 330];

        hues.forEach(h => {
            const opt = document.createElement('div');
            opt.className = 'color-opt';
            opt.style.background = `linear-gradient(135deg,hsl(${h},70%,55%),hsl(${h + 30},60%,45%))`;
            opt.style.boxShadow = `0 0 10px hsla(${h},70%,50%,0.4)`;

            if (Math.abs(h - player.hue) < 15 || Math.abs(h - player.hue) > 345) {
                opt.classList.add('selected');
            }

            opt.addEventListener('click', () => {
                player.hue = h;
                document.querySelectorAll('.color-opt').forEach(c => c.classList.remove('selected'));
                opt.classList.add('selected');
                UIManager.updateHUD(player);
            });

            picker.appendChild(opt);
        });
    }

    /**
     * Show a panel
     */
    private showPanel(panel: string): void {
        const element = document.getElementById(panel);
        element?.classList.add('show');
        
        const stateUpdate: any = {};
        if (panel === 'social') {
            stateUpdate.showingSocial = true;
            UIManager.updateNearby(this.config.getOthers());
        }
        if (panel === 'achievements') {
            stateUpdate.showingAch = true;
            UIManager.updateAchievements();
        }
        if (panel === 'settings') stateUpdate.showingSettings = true;
        if (panel === 'quests') {
            stateUpdate.showingQuests = true;
            UIManager.updateQuests();
        }
        
        this.config.setGameState(stateUpdate);
    }

    /**
     * Hide a panel
     */
    private hidePanel(panel: string): void {
        document.getElementById(panel)?.classList.remove('show');
        
        const stateUpdate: any = {};
        if (panel === 'social') stateUpdate.showingSocial = false;
        if (panel === 'achievements') stateUpdate.showingAch = false;
        if (panel === 'settings') stateUpdate.showingSettings = false;
        if (panel === 'quests') stateUpdate.showingQuests = false;
        
        this.config.setGameState(stateUpdate);
    }

    /**
     * Close all panels
     */
    private closeAllPanels(): void {
        ['social', 'achievements', 'settings', 'quests'].forEach(panel => {
            document.getElementById(panel)?.classList.remove('show');
        });
        this.config.setGameState({
            showingSocial: false,
            showingAch: false,
            showingSettings: false,
            showingQuests: false
        });
    }
}
