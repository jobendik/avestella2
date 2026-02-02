// Main entry point for AURA application
import { AudioManager } from './core/audio';
import { CONFIG, EMOTES, ACHIEVEMENTS } from './core/config';
import { Renderer } from './game/renderer';
import { GameLogic } from './game/logic';
import { UIManager } from './ui/manager';
// NetworkManager removed - WebSocket is now the exclusive networking solution
import { WebSocketClient } from './network/WebSocketClient';
import { EventBus } from './systems/EventBus';
import { VoiceChat } from './core/voice';
import { PersistenceManager } from './core/persistence';
import { Star, Echo, Projectile, Particle, FloatingText, PowerUp } from './game/entities';
import type { Player, Camera, Settings, GameState, OtherPlayer, Stats, DailyProgress, WeeklyProgress, TagGameState, PowerUpType } from './types';

// Initialize game state
const settings: Settings = {
    music: true,
    volume: 0.7,
    particles: true,
    shake: true,
    ptt: false,
    vad: true,
    sensitivity: 0.5,
    ...PersistenceManager.loadSettings()  // Load saved settings
};

const gameState: GameState = {
    gameActive: false,
    selectedId: null,
    showingSocial: false,
    showingAch: false,
    showingSettings: false,
    showingQuests: false,
    msgMode: null,
    directTarget: null,
    currentRealm: 'genesis',
    voiceOn: false,
    isSpeaking: false,
    boost: 0,
    boostType: null,
    tagGame: { active: false, itPlayerId: null, survivalTime: 0, lastTagTime: 0 },
    friends: []
};

// Track when we received initial player data vs XP gains (for race condition fix)
// let playerDataLoadedAt = 0;
let lastXpGainAt = 0;

// Voice peer discovery - update every 500ms (30 frames at 60fps)
const VOICE_PEER_UPDATE_INTERVAL = 30;
let voicePeerUpdateCounter = 0;

// Initialize managers
const audio = new AudioManager(settings);
// NOTE: HTTP fallback removed - all networking uses WebSocketClient exclusively
const voiceChat = new VoiceChat(settings);

// Initialize WebSocket client for real-time sync
// Use same host/port for WebSocket (Vite proxy handles routing to backend)
const wsUrl = window.location.protocol === 'https:'
    ? `wss://${window.location.host}/aura/ws`
    : `ws://${window.location.host}/aura/ws`;

const wsClient = new WebSocketClient({
    url: wsUrl,
    reconnectAttempts: 10,
    reconnectDelay: 1000,
    heartbeatInterval: 15000
});

// Player stats and progress
const stats: Stats = {
    whispers: 0,
    stars: 0,
    echoes: 0,
    connections: 0,
    maxBond: 0,
    voice: 0,
    level: 1,
    realms: 1,
    friends: 0,
    sings: 0,
    pulses: 0,
    emotes: 0,
    teleports: 0,
    nightOwl: 0,
    marathon: 0,
    constellation: 0,
    ...PersistenceManager.loadStats()
};

let dailyProgress: DailyProgress = PersistenceManager.loadDailyProgress();
let weeklyProgress: WeeklyProgress = PersistenceManager.loadWeeklyProgress();
const unlocked = PersistenceManager.loadAchievements();
const friends: Set<string> = PersistenceManager.loadFriends();
const visitedRealms: Set<string> = PersistenceManager.loadVisitedRealms();
// NOTE: Recent players are loaded on-demand via PersistenceManager.loadRecent()

// Canvas setup
const canvas = document.getElementById('cosmos') as HTMLCanvasElement;
const mmCanvas = document.getElementById('mm-canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas, mmCanvas);

let W: number, H: number;

function resize(): void {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    renderer.updateDimensions(W, H);
}

window.addEventListener('resize', resize);
resize();

// Game entities
const camera: Camera = { x: 0, y: 0, tx: 0, ty: 0, shake: 0 };
const others = new Map<string, OtherPlayer>();
// NOTE: Bots are 100% SERVER-AUTHORITATIVE - they come through 'others' via world_state
// There is NO local bots array - all entities (players + bots) are managed by the server
const stars = new Map<string, Star[]>();
const echoes: Echo[] = [];
const projectiles: Projectile[] = [];
const particles: Particle[] = [];
const floats: FloatingText[] = [];
const constellations: [Star, Star, Star][] = [];

// === NEW: PowerUp & Tag Game Systems (insp.html inspired) ===
const powerups: PowerUp[] = [];
let tagGameState: TagGameState = { active: false, itPlayerId: null, survivalTime: 0, lastTagTime: 0 };
let boostActive = false;
let boostType: PowerUpType | null = null;
let boostEndTime = 0;
let powerupSpawnTimer = 0;

// === Seed-based Spawning (inspiration4) ===
// Parse URL for seed parameter to spawn near invited location
const urlParams = new URLSearchParams(window.location.search);
const seedOrbit = urlParams.get('seed');
let spawnX: number, spawnY: number;

if (seedOrbit) {
    // Decode seed to coordinates (same encoding as invitation)
    const seedNum = parseInt(seedOrbit, 10) || 0;
    spawnX = seedNum % 10000;
    spawnY = Math.floor(seedNum / 10000);
    console.log(`🔗 Spawning from orbit invite at (${spawnX}, ${spawnY})`);
} else {
    // Normal Campfire Model spawn
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = Math.random() * CONFIG.SPAWN_RADIUS;
    spawnX = Math.cos(spawnAngle) * spawnDist;
    spawnY = Math.sin(spawnAngle) * spawnDist;
}

const player: Player = {
    x: spawnX,
    y: spawnY,
    tx: spawnX,
    ty: spawnY,
    hue: settings.hue || Math.random() * 360,  // Use saved hue if available
    xp: stats.level ? CONFIG.LEVEL_XP[stats.level - 1] || 0 : 0,  // Restore XP from level
    stars: stats.stars || 0,
    echoes: stats.echoes || 0,
    singing: 0,
    pulsing: 0,
    emoting: null,
    emoteT: 0,
    r: 11,
    halo: 55,
    trail: [],
    name: 'Wanderer',
    id: 'local-' + Math.random().toString(36).substr(2, 9),
    born: Date.now(),
    bonds: new Map()
};

// Mouse state for click-to-move controls
let isMouseDown = false;

// UI initialization
function setupUI(): void {
    const startButton = document.getElementById('start') as HTMLButtonElement;
    const obGoButton = document.getElementById('ob-go') as HTMLButtonElement;
    const nameInput = document.getElementById('name-input') as HTMLInputElement;

    startButton?.addEventListener('click', () => {
        player.name = nameInput.value.trim() || 'Wanderer';
        UIManager.hideLoading();
        document.getElementById('onboard')?.classList.add('show');
    });

    obGoButton?.addEventListener('click', () => {
        document.getElementById('onboard')?.classList.remove('show');
        audio.init();
        audio.startDrone();
        audio.startAmbientLoop(); // Start ambient sparkle sounds for atmosphere
        gameState.gameActive = true;
        startGame();
    });

    // Action buttons
    document.getElementById('btn-whisper')?.addEventListener('click', () => {
        gameState.msgMode = 'whisper';
        UIManager.showMessageBox('Whisper into the void...');
    });

    document.getElementById('btn-sing')?.addEventListener('click', doSing);
    document.getElementById('btn-pulse')?.addEventListener('click', doPulse);

    document.getElementById('btn-echo')?.addEventListener('click', () => {
        gameState.msgMode = 'echo';
        UIManager.showMessageBox('Plant an eternal echo...');
    });

    document.getElementById('btn-emote')?.addEventListener('click', (e) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        UIManager.showEmoteWheel(rect.left + rect.width / 2, rect.top - 40);
    });

    document.getElementById('btn-social')?.addEventListener('click', () => {
        closeAllPanels();
        gameState.showingSocial = true;
        document.getElementById('social')?.classList.add('show');
        UIManager.updateNearby(others);
    });

    document.getElementById('voice-btn')?.addEventListener('click', toggleVoice);

    // PTT button
    const pttBtn = document.getElementById('ptt-btn');
    pttBtn?.addEventListener('mousedown', () => {
        if (voiceChat.enabled && settings.ptt) voiceChat.setPTT(true);
    });
    pttBtn?.addEventListener('mouseup', () => {
        if (voiceChat.enabled && settings.ptt) voiceChat.setPTT(false);
    });
    pttBtn?.addEventListener('mouseleave', () => {
        if (voiceChat.enabled && settings.ptt) voiceChat.setPTT(false);
    });

    // Update PTT button visibility
    if (pttBtn) {
        pttBtn.style.display = settings.ptt ? 'flex' : 'none';
    }

    // Quick buttons
    document.getElementById('btn-quests')?.addEventListener('click', () => {
        closeAllPanels();
        gameState.showingQuests = true;
        document.getElementById('quests')?.classList.add('show');
        UIManager.updateQuests();
    });

    document.getElementById('btn-achievements')?.addEventListener('click', () => {
        closeAllPanels();
        gameState.showingAch = true;
        document.getElementById('achievements')?.classList.add('show');
        UIManager.updateAchievements();
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
        closeAllPanels();
        gameState.showingSettings = true;
        document.getElementById('settings')?.classList.add('show');
    });

    // === NEW: Snapshot button ===
    document.getElementById('btn-snapshot')?.addEventListener('click', takeSnapshot);

    // === NEW: Snapshot modal controls ===
    document.getElementById('snapshot-download')?.addEventListener('click', downloadSnapshot);
    document.getElementById('snapshot-close')?.addEventListener('click', closeSnapshotModal);

    // === NEW: Quick reactions bar ===
    document.querySelectorAll('.react-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = (btn as HTMLElement).dataset.emoji;
            if (emoji) sendQuickReaction(emoji);
        });
    });

    // Panel close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = (btn as HTMLElement).dataset.close;
            if (id) {
                document.getElementById(id)?.classList.remove('show');
                if (id === 'social') gameState.showingSocial = false;
                if (id === 'achievements') gameState.showingAch = false;
                if (id === 'settings') gameState.showingSettings = false;
                if (id === 'quests') gameState.showingQuests = false;
            }
        });
    });

    // Quest tabs (daily/weekly)
    document.querySelectorAll('#quests .panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = (tab as HTMLElement).dataset.tab;
            document.querySelectorAll('#quests .panel-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const dailyList = document.getElementById('daily-quest-list');
            const weeklyList = document.getElementById('weekly-quest-list');
            const weeklyTimer = document.getElementById('weekly-reset-timer');

            if (tabType === 'daily') {
                if (dailyList) dailyList.style.display = 'block';
                if (weeklyList) weeklyList.style.display = 'none';
                if (weeklyTimer) weeklyTimer.style.display = 'none';
            } else if (tabType === 'weekly') {
                if (dailyList) dailyList.style.display = 'none';
                if (weeklyList) weeklyList.style.display = 'block';
                if (weeklyTimer) weeklyTimer.style.display = 'block';
            }
        });
    });

    // Achievement tabs (all/social/explore/secret)
    document.querySelectorAll('#achievements .ach-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const category = (tab as HTMLElement).dataset.achTab;
            document.querySelectorAll('#achievements .ach-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const achCards = document.querySelectorAll('#ach-grid .ach-card');
            const achievements = ACHIEVEMENTS;

            achCards.forEach((card, i) => {
                const ach = achievements[i];
                if (!ach) return;

                if (category === 'all') {
                    (card as HTMLElement).style.display = 'flex';
                } else if (category === 'secret') {
                    (card as HTMLElement).style.display = ach.secret ? 'flex' : 'none';
                } else {
                    (card as HTMLElement).style.display = ach.category === category ? 'flex' : 'none';
                }
            });
        });
    });

    // Realm switching
    document.querySelectorAll('.realm').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.classList.contains('locked')) {
                const realm = (btn as HTMLElement).dataset.realm;
                if (realm) changeRealm(realm);
            }
        });
    });

    // Settings toggles
    document.querySelectorAll('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const settingName = (toggle as HTMLElement).dataset.setting as keyof Settings;
            toggle.classList.toggle('on');
            if (settingName) {
                (settings as any)[settingName] = toggle.classList.contains('on');
                if (settingName === 'music') {
                    if (settings.music) audio.startDrone();
                    else audio.stopDrone();
                }
            }
        });
    });

    // Volume sliders
    document.querySelectorAll('.slider').forEach(slider => {
        const fill = slider.querySelector('.slider-fill') as HTMLElement;
        const valEl = slider.parentElement?.querySelector('.slider-val') as HTMLElement;
        slider.addEventListener('click', (e) => {
            const rect = slider.getBoundingClientRect();
            const pct = Math.max(0, Math.min(100, ((e as MouseEvent).clientX - rect.left) / rect.width * 100));
            if (fill) fill.style.width = `${pct}%`;
            if (valEl) valEl.textContent = `${Math.round(pct)}%`;
            const settingName = (slider as HTMLElement).dataset.setting;
            if (settingName === 'volume') {
                settings.volume = pct / 100;
                audio.setVolume(pct / 100);
            }
        });
    });

    // Message input
    const msgInput = document.getElementById('msg-input') as HTMLInputElement;
    msgInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const text = msgInput.value.trim();
            if (text) {
                if (gameState.msgMode === 'echo') {
                    createEcho(text);
                } else if (gameState.msgMode === 'direct' && gameState.directTarget) {
                    createWhisper(text, gameState.directTarget);
                    gameState.directTarget = null;
                } else {
                    createWhisper(text);
                }
            }
            msgInput.value = '';
            UIManager.hideMessageBox();
            gameState.msgMode = null;
        } else if (e.key === 'Escape') {
            msgInput.value = '';
            UIManager.hideMessageBox();
            gameState.msgMode = null;
            gameState.directTarget = null;
        }
    });

    // Quick chat input (inspiration4.html style - always visible at bottom)
    const quickChat = document.getElementById('quick-chat') as HTMLInputElement;
    quickChat?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && quickChat.value.trim()) {
            const text = quickChat.value.trim();
            createWhisper(text);
            quickChat.value = '';
            quickChat.blur();
        } else if (e.key === 'Escape') {
            quickChat.value = '';
            quickChat.blur();
        }
    });

    // Focus quick chat when pressing Enter anywhere (if not already focused on input)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !gameState.msgMode && document.activeElement !== msgInput && document.activeElement !== quickChat) {
            e.preventDefault();
            quickChat?.focus();
        }
    });

    // Profile buttons
    document.getElementById('prof-whisper')?.addEventListener('click', () => {
        if (!gameState.selectedId) return;
        gameState.directTarget = gameState.selectedId;
        const other = others.get(gameState.selectedId);
        gameState.msgMode = 'direct';
        UIManager.showMessageBox(`Whisper to ${other?.name || 'soul'}...`, `Whispering to ${other?.name}`);
        UIManager.hideProfile();
    });

    document.getElementById('prof-follow')?.addEventListener('click', () => {
        if (!gameState.selectedId) return;
        const other = others.get(gameState.selectedId);
        if (other) {
            player.tx = other.x;
            player.ty = other.y;
            UIManager.toast(`Following ${other.name}...`);
        }
        UIManager.hideProfile();
    });

    // Friend button
    document.getElementById('prof-friend')?.addEventListener('click', () => {
        if (!gameState.selectedId) return;
        const other = others.get(gameState.selectedId);
        if (!other) return;

        const friendBtn = document.getElementById('prof-friend');
        if (friends.has(gameState.selectedId)) {
            // Remove friend - send to server
            if (wsClient.isConnected()) {
                wsClient.removeFriend(gameState.selectedId);
            }
            friends.delete(gameState.selectedId);
            PersistenceManager.saveFriends(friends);
            if (friendBtn) {
                friendBtn.textContent = '❤️ Add Friend';
                friendBtn.classList.remove('active');
            }
            UIManager.toast(`Removed ${other.name} from friends`);
            stats.friends = friends.size;
        } else {
            // Add friend - send to server
            if (wsClient.isConnected()) {
                wsClient.addFriend(gameState.selectedId, other.name);
            }
            friends.add(gameState.selectedId);
            PersistenceManager.saveFriends(friends);
            if (friendBtn) {
                friendBtn.textContent = '💔 Remove Friend';
                friendBtn.classList.add('active');
            }
            UIManager.toast(`Added ${other.name} as friend! ❤️`, 'success');
            stats.friends = friends.size;
            weeklyProgress.newFriends++;
            PersistenceManager.saveWeeklyProgress(weeklyProgress);
            checkAchievements();
        }
    });

    // Teleport button (server-validated, only works for friends in same realm)
    document.getElementById('prof-teleport')?.addEventListener('click', () => {
        if (!gameState.selectedId) return;
        const other = others.get(gameState.selectedId);
        if (!other || !friends.has(gameState.selectedId)) {
            UIManager.toast('You can only teleport to friends', 'warning');
            return;
        }

        // Request teleport from server (will validate and respond)
        if (wsClient.isConnected()) {
            wsClient.teleportToFriend(gameState.selectedId);
        } else {
            UIManager.toast('⚠️ Not connected to server', 'warning');
        }
    });

    // Click outside to close emotes
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('#emotes') && !target.closest('#btn-emote')) {
            UIManager.hideEmoteWheel();
        }
    });

    // Mouse controls: click or hold to move
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Canvas click - check for player/bot clicks (profile)
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - W / 2) + camera.x;
        const my = (e.clientY - rect.top - H / 2) + camera.y;

        // Check echoes (Ignite interaction)
        for (const echo of echoes) {
            if (echo.realm !== gameState.currentRealm) continue;
            const dist = Math.hypot(echo.x - mx, echo.y - my);
            if (dist < 45) { // Click radius
                // Ignite the echo
                wsClient.igniteEcho(echo.id);

                // Immediate visual/audio feedback
                echo.pulse = 1.0;
                audio.playStarIgnite(echo.ignited || 1);

                // Create particle burst
                for (let i = 0; i < 8; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    particles.push(new Particle(
                        echo.x,
                        echo.y,
                        Math.cos(angle) * 2,
                        Math.sin(angle) * 2,
                        echo.hue
                    ));
                }
                return;
            }
        }

        let clicked: string | null = null;

        // Check all entities (players and bots) - bots are now in 'others' map with isBot=true
        // This is 100% server-authoritative - all entities come from world_state
        for (const [id, other] of others) {
            const dist = Math.hypot(other.x - mx, other.y - my);
            if (dist < other.halo) {
                clicked = id;
                break;
            }
        }

        if (clicked) {
            gameState.selectedId = clicked;
            const clickedPlayer = others.get(clicked)!;
            UIManager.showProfile(clickedPlayer, e.clientX, e.clientY);
            
            // Also show the inspiration4-style click profile card
            showClickProfileCard(clickedPlayer, e.clientX, e.clientY);
            // Don't move when clicking on players/bots
            e.stopPropagation();
        } else {
            UIManager.hideProfile();
            UIManager.hideEmoteWheel();
            // Movement is already handled by mousedown event
        }
    });

    // Touch controls - hold and drag to move
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches[0]) {
            const rect = canvas.getBoundingClientRect();
            const mx = e.touches[0].clientX - rect.left;
            const my = e.touches[0].clientY - rect.top;
            const worldX = camera.x + mx;
            const worldY = camera.y + my;
            player.tx = worldX;
            player.ty = worldY;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches[0]) {
            const rect = canvas.getBoundingClientRect();
            const mx = e.touches[0].clientX - rect.left;
            const my = e.touches[0].clientY - rect.top;
            const worldX = camera.x + mx;
            const worldY = camera.y + my;
            player.tx = worldX;
            player.ty = worldY;
        }
    }, { passive: false });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
}

function handleMouseDown(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    isMouseDown = true;

    // Convert screen coordinates to world coordinates
    const worldX = camera.x + mx;
    const worldY = camera.y + my;
    player.tx = worldX;
    player.ty = worldY;
}

function handleMouseMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = camera.x + mx;
    const worldY = camera.y + my;

    // Only update movement target if mouse is held down
    if (isMouseDown) {
        player.tx = worldX;
        player.ty = worldY;
    }
    
    // Hover tooltip - show preview when hovering over players/bots
    let hoveredPlayer: OtherPlayer | null = null;
    for (const [, other] of others) {
        const dist = Math.hypot(other.x - worldX, other.y - worldY);
        if (dist < other.halo) {
            hoveredPlayer = other;
            break;
        }
    }
    
    updateHoverTooltip(hoveredPlayer, e.clientX, e.clientY);
}

function handleMouseUp(): void {
    isMouseDown = false;
}

function handleKeyDown(e: KeyboardEvent): void {
    if (!gameState.gameActive) return;

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
            gameState.msgMode = 'whisper';
            UIManager.showMessageBox('Whisper into the void...');
            break;
        case 's':
            doSing();
            break;
        case ' ':
            e.preventDefault();
            doPulse();
            break;
        case 'e':
            gameState.msgMode = 'echo';
            UIManager.showMessageBox('Plant an eternal echo...');
            break;
        case 'q':
            const emoteBtn = document.getElementById('btn-emote');
            if (emoteBtn) {
                const rect = emoteBtn.getBoundingClientRect();
                UIManager.showEmoteWheel(rect.left + rect.width / 2, rect.top - 40);
            }
            break;
        case 'tab':
            e.preventDefault();
            closeAllPanels();
            gameState.showingSocial = true;
            document.getElementById('social')?.classList.add('show');
            UIManager.updateNearby(others);
            break;
        case 'escape':
            UIManager.hideMessageBox();
            UIManager.hideProfile();
            UIManager.hideEmoteWheel();
            closeAllPanels();
            break;
    }
}

function closeAllPanels(): void {
    document.getElementById('social')?.classList.remove('show');
    document.getElementById('achievements')?.classList.remove('show');
    document.getElementById('settings')?.classList.remove('show');
    document.getElementById('quests')?.classList.remove('show');
    gameState.showingSocial = false;
    gameState.showingAch = false;
    gameState.showingSettings = false;
    gameState.showingQuests = false;
}

function changeRealm(realmId: string): void {
    if (realmId === gameState.currentRealm) return;

    // Show transition
    const trans = document.getElementById('realm-trans');
    const transIcon = document.getElementById('trans-icon');
    const transName = document.getElementById('trans-name');

    const realmData: Record<string, { icon: string; name: string }> = {
        genesis: { icon: '🌌', name: 'Genesis' },
        nebula: { icon: '🌸', name: 'Nebula Gardens' },
        void: { icon: '🌑', name: 'The Void' },
        starforge: { icon: '🔥', name: 'Starforge' },
        abyss: { icon: '🕳️', name: 'The Abyss' },
        crystal: { icon: '💎', name: 'Crystal Caverns' },
        sanctuary: { icon: '🏛️', name: 'Sanctuary' },
        celestial: { icon: '👑', name: 'Celestial Throne' },
        tagarena: { icon: '🏃', name: 'Tag Arena' }
    };

    const realm = realmData[realmId];
    if (trans && transIcon && transName && realm) {
        transIcon.textContent = realm.icon;
        transName.textContent = realm.name;
        trans.classList.add('active');

        setTimeout(() => {
            gameState.currentRealm = realmId as import('./types').RealmId;
            document.querySelectorAll('.realm').forEach(r => r.classList.remove('active'));
            document.querySelector(`[data-realm="${realmId}"]`)?.classList.add('active');
            document.getElementById('realm-icon')!.textContent = realm.icon;
            document.getElementById('realm-text')!.textContent = realm.name;

            // Track visited realms
            if (!visitedRealms.has(realmId)) {
                visitedRealms.add(realmId);
                PersistenceManager.saveVisitedRealms(visitedRealms);
                stats.realms = visitedRealms.size;
                weeklyProgress.realmChanges++;
                PersistenceManager.saveWeeklyProgress(weeklyProgress);
                checkAchievements();
            }

            // === Handle Tag Arena special mode ===
            if (realmId === 'tagarena') {
                startTagGame();
            } else {
                endTagGame();
            }

            // Disconnect all voice peers from old realm to prevent orphaned connections
            if (voiceChat.enabled) {
                for (const peerId of voiceChat.getConnectedPeers()) {
                    voiceChat.disconnectPeer(peerId);
                }
            }

            // Clear other players, stars, and powerups from old realm
            others.clear();
            powerups.length = 0;

            setTimeout(() => {
                trans.classList.remove('active');
            }, 800);
        }, 600);
    }
}

function createEcho(text: string): void {
    // 100% Server-authoritative: Only send request, effects happen on broadcast
    if (wsClient.isConnected()) {
        wsClient.sendEcho(player, text);
        
        // Message recoil (inspiration3) - nudge player backward
        applyMessageRecoil();
    } else {
        // No connection - warn user, don't apply local effects
        UIManager.toast('⚠️ Not connected - echo not sent', 'warning');
        console.warn('Cannot create echo: WebSocket not connected');
    }
}

function createWhisper(text: string, targetId?: string): void {
    // 100% Server-authoritative: Send via WebSocket only
    if (wsClient.isConnected()) {
        wsClient.sendWhisper(player, text, targetId);
        // Show local feedback immediately for whispers (optimistic UI)
        if (targetId) {
            const target = others.get(targetId);
            if (target) {
                floats.push(new FloatingText(target.x, target.y - target.halo - 25, `💬 ${text}`, 90, 12));
                UIManager.toast(`Whispered to ${target.name}`);
                // Message recoil toward target (inspiration3)
                applyMessageRecoil(target.x, target.y);
            }
        } else {
            floats.push(new FloatingText(player.x, player.y - player.halo - 25, `💬 ${text}`, 90, 12));
            // Random recoil for broadcast
            applyMessageRecoil();
        }
        audio.playWhisperSend();
    } else {
        // No connection - warn user
        UIManager.toast('⚠️ Not connected - message not sent', 'warning');
        console.warn('Cannot send whisper: WebSocket not connected');
    }
}

function setupEmotes(): void {
    const wheel = document.getElementById('emotes');
    if (!wheel) return;

    // Use level-locked emotes from config
    const emotes = EMOTES;
    const playerLevel = GameLogic.getLevel(player.xp);
    const radius = 65;

    // Display up to 12 emotes in the wheel (more can be unlocked)
    const displayEmotes = emotes.slice(0, 12);

    displayEmotes.forEach((emoteData: { emoji: string; unlock: number }, i: number) => {
        const angle = (i / displayEmotes.length) * Math.PI * 2 - Math.PI / 2;
        const x = 95 + Math.cos(angle) * radius - 20;
        const y = 95 + Math.sin(angle) * radius - 20;

        const opt = document.createElement('div');
        opt.className = 'emote';
        const isUnlocked = playerLevel >= emoteData.unlock;

        if (!isUnlocked) {
            opt.classList.add('locked');
            opt.innerHTML = `${emoteData.emoji}<span class="emote-level">Lv${emoteData.unlock}</span>`;
        } else {
            opt.textContent = emoteData.emoji;
        }

        opt.style.left = `${x}px`;
        opt.style.top = `${y}px`;

        opt.addEventListener('click', () => {
            if (!isUnlocked) {
                UIManager.toast(`Unlock at Level ${emoteData.unlock}`, 'warning');
                return;
            }
            doEmote(emoteData.emoji);
            UIManager.hideEmoteWheel();
        });

        wheel.appendChild(opt);
    });
}

function setupColorPicker(): void {
    const picker = document.getElementById('color-picker');
    if (!picker) return;

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

function doEmote(emote: string): void {
    // 100% Server-authoritative: Only send request, effects happen on broadcast
    if (wsClient.isConnected()) {
        wsClient.sendEmote(player, emote);
    } else {
        // No connection - warn user, don't apply local effects
        UIManager.toast('⚠️ Not connected', 'warning');
        console.warn('Cannot emote: WebSocket not connected');
    }
}

// === Click Profile Card (inspiration4 style) ===
let currentClickProfileTarget: OtherPlayer | null = null;

function showClickProfileCard(other: OtherPlayer, screenX: number, screenY: number): void {
    const card = document.getElementById('click-profile-card');
    if (!card) return;
    
    currentClickProfileTarget = other;
    
    // Update card content
    const dot = document.getElementById('cpc-dot');
    const name = document.getElementById('cpc-name');
    const age = document.getElementById('cpc-age');
    const stars = document.getElementById('cpc-stars');
    const bond = document.getElementById('cpc-bond');
    
    if (dot) {
        dot.style.backgroundColor = `hsl(${other.hue}, 70%, 60%)`;
        dot.style.boxShadow = `0 0 10px hsla(${other.hue}, 70%, 60%, 0.6)`;
    }
    if (name) name.textContent = other.name;
    if (age) {
        const mins = Math.floor((Date.now() - (other.born || Date.now())) / 60000);
        age.textContent = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`;
    }
    if (stars) stars.textContent = (other.stars || 0).toString();
    if (bond) bond.textContent = `${Math.round(other.bondToViewer || 0)}%`;
    
    // Update additional fields
    const level = document.getElementById('cpc-level');
    const xp = document.getElementById('cpc-xp');
    if (level) level.textContent = `Lv ${GameLogic.getLevel(other.xp || 0)}`;
    if (xp) xp.textContent = (other.xp || 0).toString();
    
    // Update friend button text based on friend status
    const friendBtn = document.getElementById('cpc-friend');
    if (friendBtn) {
        const isFriend = gameState.friends.some(f => f.id === other.id);
        friendBtn.textContent = isFriend ? '✓ Friends' : '⭐ Add Friend';
        (friendBtn as HTMLButtonElement).disabled = isFriend;
    }
    
    // Position card
    card.style.left = `${screenX}px`;
    card.style.top = `${screenY}px`;
    card.classList.add('active');
}

function hideClickProfileCard(): void {
    const card = document.getElementById('click-profile-card');
    if (card) card.classList.remove('active');
    currentClickProfileTarget = null;
}

// Hover tooltip - quick preview
function updateHoverTooltip(other: OtherPlayer | null, screenX: number, screenY: number): void {
    const tooltip = document.getElementById('hover-tooltip');
    if (!tooltip) return;
    
    // Don't show tooltip if click profile card is open
    if (currentClickProfileTarget) {
        tooltip.classList.remove('visible');
        return;
    }
    
    if (other) {
        const dot = document.getElementById('ht-dot');
        const name = document.getElementById('ht-name');
        const level = document.getElementById('ht-level');
        
        if (dot) {
            dot.style.backgroundColor = `hsl(${other.hue}, 70%, 60%)`;
            dot.style.boxShadow = `0 0 6px hsla(${other.hue}, 70%, 60%, 0.6)`;
        }
        if (name) name.textContent = other.name;
        if (level) level.textContent = `Lv ${GameLogic.getLevel(other.xp || 0)}`;
        
        tooltip.style.left = `${screenX}px`;
        tooltip.style.top = `${screenY - 10}px`;
        tooltip.classList.add('visible');
        
        // Change cursor to pointer
        canvas.style.cursor = 'pointer';
    } else {
        tooltip.classList.remove('visible');
        canvas.style.cursor = 'default';
    }
}

// Click profile card button handlers
document.getElementById('cpc-whisper')?.addEventListener('click', () => {
    if (currentClickProfileTarget) {
        gameState.selectedId = currentClickProfileTarget.id;
        gameState.msgMode = 'whisper';
        UIManager.showMessageBox(`Whisper to ${currentClickProfileTarget.name}...`);
        hideClickProfileCard();
    }
});

document.getElementById('cpc-friend')?.addEventListener('click', () => {
    if (currentClickProfileTarget) {
        if (wsClient.isConnected()) {
            wsClient.addFriend(currentClickProfileTarget.id, currentClickProfileTarget.name);
            UIManager.toast(`⭐ Added ${currentClickProfileTarget.name} as friend!`, 'success');
        } else {
            UIManager.toast('⚠️ Not connected', 'warning');
        }
        hideClickProfileCard();
    }
});

document.getElementById('cpc-invite')?.addEventListener('click', () => {
    // Generate invite URL based on current player position
    const seedVal = Math.floor(player.x) + Math.floor(player.y) * 10000;
    const url = `${window.location.origin}${window.location.pathname}?seed=${seedVal}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
        showInviteToast();
    }).catch(() => {
        // Fallback
        prompt('Copy your orbit link:', url);
    });
    
    hideClickProfileCard();
});

// Close card when clicking elsewhere
document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('#click-profile-card') && !target.closest('#cosmos')) {
        hideClickProfileCard();
    }
});

// === Invite Toast (inspiration4) ===
function showInviteToast(): void {
    const toast = document.getElementById('invite-toast');
    if (toast) {
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2500);
    }
}

// === Hint Pill Fade (inspiration4) ===
let hintPillDismissed = false;

function fadeHintPill(): void {
    if (hintPillDismissed) return;
    hintPillDismissed = true;
    const pill = document.getElementById('hint-pill');
    if (pill) pill.classList.add('fade-out');
}

// Signal strength HUD (inspiration3) - shows latency
function updateSignalHUD(latency: number, connected: boolean): void {
    const valEl = document.getElementById('signal-val');
    if (!valEl) return;
    
    if (!connected) {
        valEl.textContent = 'OFFLINE';
        valEl.className = 'disconnected';
        return;
    }
    
    // Convert latency to "signal strength" percentage
    // 0ms = 100%, 500ms+ = 0%
    const strength = Math.max(0, Math.min(100, Math.round(100 - (latency / 5))));
    valEl.textContent = `${strength}%`;
    
    // Color based on quality
    if (strength >= 70) {
        valEl.className = '';  // Default accent color (good)
    } else if (strength >= 40) {
        valEl.className = 'weak';  // Yellow (moderate)
    } else {
        valEl.className = 'disconnected';  // Red (poor)
    }
}

// Dismiss hint on first interaction
canvas.addEventListener('mousedown', fadeHintPill, { once: true });
canvas.addEventListener('touchstart', fadeHintPill, { once: true });
document.addEventListener('keydown', (e) => {
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        fadeHintPill();
    }
}, { once: true });

function doSing(): void {
    // 100% Server-authoritative: Only send request, effects happen on broadcast
    if (wsClient.isConnected()) {
        wsClient.sendSing(player);
    } else {
        // No connection - warn user, don't apply local effects
        UIManager.toast('⚠️ Not connected', 'warning');
        console.warn('Cannot sing: WebSocket not connected');
    }
}

function doPulse(): void {
    // 100% Server-authoritative: Only send request, effects happen on broadcast
    if (wsClient.isConnected()) {
        wsClient.sendPulse(player);
    } else {
        // No connection - warn user, don't apply local effects
        UIManager.toast('⚠️ Not connected', 'warning');
        console.warn('Cannot pulse: WebSocket not connected');
    }
}

// === SERVER-AUTHORITATIVE EFFECT HANDLERS ===
// These are called when receiving broadcasts from the server

function applySingEffect(playerId: string, x: number, y: number, hue: number): void {
    const isSelf = playerId === player.id;

    if (isSelf) {
        player.singing = 1;
        if (settings.shake) camera.shake = 0.3;
        // Server handles stats and XP - just update local progress for UI
        dailyProgress.sings++;
        PersistenceManager.saveDailyProgress(dailyProgress);
    } else {
        // Update other player's singing state
        const other = others.get(playerId);
        if (other) other.singing = 1;
    }

    // Play audio and particles for everyone
    audio.playSing(hue);
    if (settings.particles) {
        GameLogic.spawnParticles(x, y, hue, 30, isSelf, particles);
    }
}

function applyPulseEffect(playerId: string, x: number, y: number): void {
    const isSelf = playerId === player.id;
    const pulseHue = isSelf ? player.hue : (others.get(playerId)?.hue || 200);

    if (isSelf) {
        player.pulsing = 1;
        if (settings.shake) camera.shake = 0.5;
        // Server handles stats and XP

        // === Graph-based star ignition (inspiration4) ===
        // Stars require 2+ connected players nearby to ignite
        const IGNITION_DIST = 120;  // Distance to be "near" a star
        const TETHER_DIST = 220;    // Distance for players to be "connected"
        
        // Find all nearby players (including bots) within tether range
        const nearbyOthers = Array.from(others.values()).filter(o => 
            Math.hypot(o.x - player.x, o.y - player.y) <= TETHER_DIST
        );
        
        // Light stars if there's at least 1 nearby connected player (2 total including self)
        const hasConnection = nearbyOthers.length >= 1;
        
        const viewRadius = GameLogic.getViewRadius(player);
        let lit = 0;
        const litStarIds: string[] = [];

        for (const [k, arr] of stars) {
            if (!k.startsWith(gameState.currentRealm + ':')) continue;
            for (const s of arr) {
                if (s.lit) continue;
                
                const distToStar = Math.hypot(s.x - x, s.y - y);
                
                // Star must be within pulse range
                if (distToStar >= viewRadius * 1.8) continue;
                
                // === Graph ignition check ===
                // Count how many players (including self) are near this star AND connected
                let playersNearStar = distToStar < IGNITION_DIST ? 1 : 0; // Self
                
                for (const other of nearbyOthers) {
                    const otherDistToStar = Math.hypot(s.x - other.x, s.y - other.y);
                    if (otherDistToStar < IGNITION_DIST) {
                        playersNearStar++;
                    }
                }
                
                // Require 2+ connected players near the star to ignite
                // OR allow solo ignition if no one is nearby at all (for solo play)
                const canIgnite = playersNearStar >= 2 || (!hasConnection && playersNearStar >= 1);
                
                if (canIgnite) {
                    s.lit = true;
                    s.burst = 1;
                    lit++;
                    litStarIds.push(s.id || k);
                }
            }
        }

        if (lit > 0) {
            // Server will handle stats and XP for star lighting
            player.stars += lit;  // Local counter for UI
            dailyProgress.stars += lit;
            PersistenceManager.saveDailyProgress(dailyProgress);
            weeklyProgress.stars += lit;
            PersistenceManager.saveWeeklyProgress(weeklyProgress);
            UIManager.updateHUD(player);
            // Play star ignition audio with pitch based on count
            audio.playStarIgnite(lit);
            // Broadcast which stars were lit - server will award XP
            if (wsClient.isConnected() && litStarIds.length > 0) {
                wsClient.sendStarLit(player, litStarIds);
            }
        }
    } else {
        // Update other player's pulsing state
        const other = others.get(playerId);
        if (other) other.pulsing = 1;
    }

    // Play audio and particles for everyone
    audio.playPulse();
    if (settings.particles) {
        GameLogic.spawnParticles(x, y, pulseHue, 45, isSelf, particles);
    }
}

function applyEmoteEffect(playerId: string, emoji: string, x: number, y: number): void {
    const isSelf = playerId === player.id;

    if (isSelf) {
        player.emoting = emoji;
        player.emoteT = 0;
        // Server handles stats and XP
        dailyProgress.emotes++;
        PersistenceManager.saveDailyProgress(dailyProgress);
    } else {
        const other = others.get(playerId);
        if (other) {
            other.emoting = emoji;
            other.emoteT = 0;
        }
    }

    // Show floating emote for everyone
    const halo = isSelf ? player.halo : (others.get(playerId)?.halo || 55);
    floats.push(new FloatingText(x, y - halo - 35, emoji, 80, 22));
}

// Message recoil (inspiration3) - nudge player opposite to message direction
function applyMessageRecoil(targetX?: number, targetY?: number): void {
    const RECOIL_FORCE = 8;
    let dx: number, dy: number;
    
    if (targetX !== undefined && targetY !== undefined) {
        // Recoil away from target
        const dist = Math.hypot(targetX - player.x, targetY - player.y);
        if (dist > 0) {
            dx = -(targetX - player.x) / dist;
            dy = -(targetY - player.y) / dist;
        } else {
            dx = 0;
            dy = -1;
        }
    } else {
        // Find nearest other player and recoil away from them
        let nearest: { x: number; y: number } | null = null;
        let minDist = Infinity;
        for (const other of others.values()) {
            const d = Math.hypot(other.x - player.x, other.y - player.y);
            if (d < minDist) {
                minDist = d;
                nearest = other;
            }
        }
        
        if (nearest && minDist < 500) {
            dx = -(nearest.x - player.x) / minDist;
            dy = -(nearest.y - player.y) / minDist;
        } else {
            // Random direction if no one nearby
            const angle = Math.random() * Math.PI * 2;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
        }
    }
    
    // Apply recoil to target position
    player.tx += dx * RECOIL_FORCE;
    player.ty += dy * RECOIL_FORCE;
}

function applyEchoEffect(playerId: string, text: string, x: number, y: number, hue: number, playerName: string, echoId: string, ignited: number = 0): void {
    const isSelf = playerId === player.id;

    // Create echo for everyone
    const echo = new Echo(echoId, x, y, text, hue, playerName, gameState.currentRealm, playerId, ignited);
    echoes.push(echo);

    if (isSelf) {
        // Server handles echo count and XP - just show visual feedback
        UIManager.toast('✨ Echo planted');
    }

    audio.playEcho();
}

function gainXP(amount: number): void {
    const oldLevel = GameLogic.getLevel(player.xp);
    player.xp += amount;
    const newLevel = GameLogic.getLevel(player.xp);

    floats.push(new FloatingText(player.x, player.y - player.halo - 55, `+${amount} XP`, 50, 13));

    if (newLevel > oldLevel) {
        audio.playLevelUp();
        if (settings.particles) {
            GameLogic.spawnParticles(player.x, player.y, player.hue, 55, true, particles);
        }
        player.r = 11 + newLevel * 1.5;
        player.halo = 55 + newLevel * 8;
        UIManager.toast(`✨ Level ${newLevel}! You are now a ${GameLogic.getForm(newLevel)}`, 'level');
        UIManager.updateRealmLocks(player.xp);
    }

    UIManager.updateHUD(player);
}

// NOTE: manageBotPopulation, updateBots, fetchNearbyPlayers, fetchEchoes have been REMOVED
// Bots are now managed entirely by the server (WebSocketHandler.serverGameTick)
// All entities (players + bots + echoes) come through the 'world_state' WebSocket message at 20Hz
// This is the TRUE SERVER-AUTHORITATIVE model - no HTTP polling, no local simulation

/**
 * Setup EventBus listeners for server-authoritative network events
 * All game effects are triggered by these broadcasts from the server
 */
function setupNetworkEventListeners(): void {
    // Handle player updates from server
    EventBus.on('network:playerUpdate', ({ player: p, isSelf }) => {
        if (isSelf) {
            // We can optionally reconcile server state with local
            // For now, we trust local movement for responsiveness
        } else {
            // Update or add other player
            const existing = others.get(p.id);
            if (existing) {
                existing.x = p.x;
                existing.y = p.y;
                existing.name = p.name;
                existing.hue = p.hue;
                existing.xp = p.xp;
                existing.singing = p.singing || 0;
                existing.pulsing = p.pulsing || 0;
                existing.emoting = p.emoting;
            } else {
                const level = Math.floor(p.xp / 100);
                others.set(p.id, {
                    id: p.id,
                    x: p.x,
                    y: p.y,
                    name: p.name,
                    hue: p.hue,
                    xp: p.xp || 0,
                    stars: p.stars || 0,
                    echoes: p.echoes || 0,
                    r: 11 + level * 1.5,
                    halo: 40 + level * 5,
                    singing: p.singing || 0,
                    pulsing: p.pulsing || 0,
                    emoting: p.emoting || null,
                    emoteT: 0,
                    trail: [],
                    born: p.born || Date.now(),
                    speaking: false,
                    isBot: false
                });
            }
        }
    });

    // Handle player join (new player in realm)
    EventBus.on('network:playerJoined', ({ player: p }) => {
        if (p.id === player.id) return;

        const level = Math.floor((p.xp || 0) / 100);
        others.set(p.id, {
            id: p.id,
            x: p.x || 0,
            y: p.y || 0,
            name: p.name || 'Wanderer',
            hue: p.hue || 200,
            xp: p.xp || 0,
            stars: p.stars || 0,
            echoes: p.echoes || 0,
            r: 11 + level * 1.5,
            halo: 40 + level * 5,
            singing: 0,
            pulsing: 0,
            emoting: null,
            emoteT: 0,
            trail: [],
            born: Date.now(),
            speaking: false,
            isBot: false
        });
        console.log(`🌟 ${p.name || 'Wanderer'} joined the realm`);
    });

    // Handle player leave
    EventBus.on('network:playerLeft', ({ playerId }) => {
        const leaving = others.get(playerId);
        if (leaving) {
            console.log(`👋 ${leaving.name} left the realm`);
            others.delete(playerId);
        }
    });

    // === SERVER-AUTHORITATIVE ACTION HANDLERS ===
    // These trigger effects when the server broadcasts them

    EventBus.on('network:sing', (data) => {
        console.log(`🎵 Server broadcast: ${data.playerName} is singing`);
        applySingEffect(data.playerId, data.x, data.y, data.hue);
    });

    EventBus.on('network:pulse', (data) => {
        console.log(`💫 Server broadcast: ${data.playerName} pulsed`);
        applyPulseEffect(data.playerId, data.x, data.y);
    });

    EventBus.on('network:emote', (data) => {
        console.log(`${data.emoji} Server broadcast: ${data.playerName} emoted`);
        applyEmoteEffect(data.playerId, data.emoji, data.x, data.y);
    });

    EventBus.on('network:echo', (data) => {
        console.log(`📢 Server broadcast: ${data.playerName} created echo`);
        applyEchoEffect(data.playerId, data.text, data.x, data.y, data.hue, data.playerName, data.echoId, data.ignited);
    });

    EventBus.on('network:echoIgnited', (data) => {
        const echo = echoes.find(e => e.id === data.echoId);
        if (echo) {
            echo.ignited = data.ignited;
            echo.pulse = 1.0; // Visual pulse
            // Play ignition sound
            audio.playStarIgnite(echo.ignited);
        }
    });

    EventBus.on('network:whisper', (data) => {
        // Show incoming whisper as toast
        UIManager.toast(`💬 ${data.fromName}: ${data.text}`, 'whisper');
        audio.playWhisperRecv();
        audio.playChatChime();  // Play chat chime (inspiration4)

        // Show floating text at sender position
        floats.push(new FloatingText(data.x, data.y - 50, `💬 ${data.text}`, 90, 12));

        // Add chat bubble to the sender (so we see what they said near their avatar)
        const sender = others.get(data.from);
        if (sender) {
            sender.message = data.text;
            sender.messageTimer = 180;  // ~3 seconds
            sender.messageYOffset = 0;  // Start at baseline, will float up
            // Apply chat heat (inspiration4) - makes sender's color shift warmer
            sender.chatHeat = 1.0;
            if (sender.baseHue === undefined) sender.baseHue = sender.hue;
        }
    });

    EventBus.on('network:starLit', (data) => {
        // Another player lit stars - update visuals
        if (!data.isSelf && data.starIds) {
            let starsLit = 0;
            for (const starId of data.starIds) {
                for (const [k, arr] of stars) {
                    for (const s of arr) {
                        if ((s.id || k) === starId && !s.lit) {
                            s.lit = true;
                            s.burst = 1;
                            starsLit++;
                        }
                    }
                }
            }
            // Play star ignition audio with pitch based on count
            if (starsLit > 0) {
                audio.playStarIgnite(starsLit);
            }
        }
    });

    // Handle significant connection event
    EventBus.on('network:connectionMade', (data) => {
        const otherName = data.player1Id === player.id ? data.player2Name : data.player1Name;
        UIManager.toast(`🔗 Connected with ${otherName}!`, 'conn');
        audio.playConn();
        // Add visual particle burst at player position? (handled locally by update loop maybe)
    });

    // === SERVER-AUTHORITATIVE WORLD STATE ===
    // This is the PRIMARY way we receive all entities (players + bots)
    // The server broadcasts this at 20Hz to all clients
    EventBus.on('network:worldState', (data) => {
        const { entities, litStars: _litStars, echoes: serverEchoes, linkedCount } = data;

        // Update local player stats
        if (linkedCount !== undefined) {
            player.linkedCount = linkedCount;
            stats.connections = linkedCount; // Keep stats in sync
            UIManager.updateHUD(player);
        }

        // Clear and rebuild others map from server entities
        // Keep track of IDs we've seen to remove stale entries
        const seenIds = new Set<string>();

        for (const entity of entities) {
            if (entity.id === player.id) {
                // Skip self - we control our own position locally for responsiveness
                continue;
            }

            seenIds.add(entity.id);

            const existing = others.get(entity.id);
            const level = Math.floor((entity.xp || 0) / 100);

            if (existing) {
                // Smooth interpolation for existing entities
                existing.x = existing.x * 0.7 + entity.x * 0.3;
                existing.y = existing.y * 0.7 + entity.y * 0.3;
                existing.name = entity.name || existing.name;
                existing.hue = entity.hue;
                existing.xp = entity.xp || 0;
                existing.singing = entity.singing || 0;
                existing.pulsing = entity.pulsing || 0;
                existing.emoting = entity.emoting || null;
                existing.isBot = entity.isBot || false;
                // Bot message system
                existing.message = entity.message || undefined;
                existing.messageTimer = entity.messageTimer || undefined;
                // Voice speaking state from server
                if (entity.speaking !== undefined) {
                    existing.speaking = entity.speaking;
                }
                // Update bond strength from server
                if (entity.bondToViewer !== undefined) {
                    existing.bondToViewer = entity.bondToViewer;
                }
            } else {
                // New entity
                others.set(entity.id, {
                    id: entity.id,
                    x: entity.x,
                    y: entity.y,
                    name: entity.name || 'Wanderer',
                    hue: entity.hue || 200,
                    xp: entity.xp || 0,
                    stars: entity.stars || 0,
                    echoes: entity.echoes || 0,
                    r: 11 + level * 1.5,
                    halo: 40 + level * 5,
                    singing: entity.singing || 0,
                    pulsing: entity.pulsing || 0,
                    emoting: entity.emoting || null,
                    emoteT: 0,
                    trail: [],
                    born: entity.born || Date.now(),
                    speaking: entity.speaking || false,
                    isBot: entity.isBot || false,
                    // Bot message system
                    message: entity.message,
                    messageTimer: entity.messageTimer,
                    // Bond system
                    bondToViewer: entity.bondToViewer
                });
            }
        }

        // Remove entities no longer in server state
        for (const [id] of others) {
            if (!seenIds.has(id)) {
                others.delete(id);
            }
        }

        // Update lit stars from server (commented out for now - stars handled separately)
        // TODO: Server-authoritative stars

        // Update echoes from server
        if (serverEchoes && serverEchoes.length > 0) {
            for (const e of serverEchoes) {
                const exists = echoes.some(local =>
                    (Math.abs(local.x - e.x) < 5 && Math.abs(local.y - e.y) < 5)
                );
                if (!exists && echoes.length < 100) {
                    echoes.push(new Echo(e.id, e.x, e.y, e.text, e.hue || 200, e.name || 'Unknown', e.realm || gameState.currentRealm, e.authorId || '', e.ignited || 0));
                }
            }
        }
    });

    // Connection status
    EventBus.on('network:connected', () => {
        UIManager.toast('🔌 Connected to server', 'success');
        updateSignalHUD(0, true);
    });

    EventBus.on('network:disconnected', () => {
        UIManager.toast('⚠️ Disconnected from server', 'warning');
        updateSignalHUD(0, false);
    });

    EventBus.on('network:error', ({ error }) => {
        console.error('Network error:', error);
    });

    // Signal strength (inspiration3) - latency indicator
    EventBus.on('network:latency', (data: { latency: number }) => {
        updateSignalHUD(data.latency, true);
    });

    // === SERVER-AUTHORITATIVE PLAYER DATA ===
    // Loaded from database when connecting
    EventBus.on('network:playerData', (data) => {
        const now = Date.now();
        console.log(`📂 Loaded player data from server: ${data.name} (Level ${data.level})`);

        // Sync player state with server
        player.name = data.name;
        player.hue = data.hue;

        // Only update XP if we haven't received any xpGain messages yet
        // This prevents race conditions where playerData arrives after xpGain
        if (lastXpGainAt === 0 || now < lastXpGainAt) {
            player.xp = data.xp;
            player.stars = data.stars;
            player.echoes = data.echoes;
            stats.level = data.level;
            stats.stars = data.stars;
            stats.echoes = data.echoes;
        }

        // Always update action stats from server (these don't change during XP gain)
        stats.sings = data.sings || 0;
        stats.pulses = data.pulses || 0;
        stats.emotes = data.emotes || 0;
        stats.teleports = data.teleports || 0;

        // Update visual size based on level
        const currentLevel = stats.level || data.level;
        player.r = 11 + currentLevel * 1.5;
        player.halo = 55 + currentLevel * 8;

        // Restore position if available
        if (data.lastPosition && data.lastRealm === gameState.currentRealm) {
            player.x = data.lastPosition.x;
            player.y = data.lastPosition.y;
            player.tx = data.lastPosition.x;
            player.ty = data.lastPosition.y;
            console.log(`📍 Restored position: ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`);
        }

        // Sync friends from server
        friends.clear();
        for (const friend of data.friends) {
            friends.add(friend.id);
        }

        // Sync achievements from server
        for (const achId of data.achievements) {
            unlocked.add(achId);
        }

        // Update UI
        UIManager.updateHUD(player);
        UIManager.updateRealmLocks(player.xp);

        // Check achievements with restored stats
        checkAchievements();

        // playerDataLoadedAt = now;
        console.log(`✅ Synced ${friends.size} friends and ${unlocked.size} achievements from server`);
    });

    // === SERVER-AUTHORITATIVE XP GAINS ===
    // XP is now calculated server-side only
    EventBus.on('network:xpGain', (data) => {
        const { amount, reason, newXp, newLevel, leveledUp } = data;
        lastXpGainAt = Date.now();

        // Update local state with server-authoritative values
        const oldLevel = GameLogic.getLevel(player.xp);
        player.xp = newXp;

        // Show XP gain floating text
        floats.push(new FloatingText(player.x, player.y - player.halo - 55, `+${amount} XP`, 50, 13));

        // Update action stats based on reason
        if (reason === 'sing') stats.sings++;
        else if (reason === 'pulse') stats.pulses++;
        else if (reason === 'emote') stats.emotes++;

        // Handle level up
        if (leveledUp && newLevel > oldLevel) {
            audio.playLevelUp();
            if (settings.particles) {
                GameLogic.spawnParticles(player.x, player.y, player.hue, 55, true, particles);
            }
            player.r = 11 + newLevel * 1.5;
            player.halo = 55 + newLevel * 8;
            stats.level = newLevel;
            UIManager.toast(`✨ Level ${newLevel}! You are now a ${GameLogic.getForm(newLevel)}`, 'level');
            UIManager.updateRealmLocks(player.xp);
        }

        UIManager.updateHUD(player);
        checkAchievements();
        console.log(`⭐ XP gained: +${amount} (${reason}) - Total: ${newXp}`);
    });

    // === COOLDOWN FEEDBACK ===
    EventBus.on('network:cooldown', (data) => {
        const seconds = (data.remainingMs / 1000).toFixed(1);
        UIManager.toast(`⏳ ${data.action} on cooldown (${seconds}s)`, 'warning');
    });

    // === FRIENDS SYSTEM (Server-Synced) ===
    EventBus.on('network:friendAdded', (data) => {
        friends.add(data.friendId);
        stats.friends = friends.size;
        weeklyProgress.newFriends++;
        PersistenceManager.saveWeeklyProgress(weeklyProgress);
        UIManager.toast(`Added ${data.friendName} as friend! ❤️`, 'success');
        checkAchievements();
    });

    EventBus.on('network:friendRemoved', (data) => {
        friends.delete(data.friendId);
        stats.friends = friends.size;
    });

    // === TELEPORT (Server-Validated) ===
    EventBus.on('network:teleportSuccess', (data) => {
        // Update player position from server
        player.x = data.x;
        player.y = data.y;
        player.tx = data.x;
        player.ty = data.y;

        stats.teleports++;
        UIManager.toast(`Teleported to ${data.friendName}! 🌀`);
        UIManager.hideProfile();

        // Visual effect
        if (settings.particles) {
            GameLogic.spawnParticles(player.x, player.y, player.hue, 40, true, particles);
        }

        checkAchievements();
    });

    // === VOICE SIGNALING ===
    EventBus.on('network:voiceSignal', (data) => {
        // Forward to voice chat system
        voiceChat.handleSignal({
            from: data.fromId,
            signalType: data.signalType,
            data: data.signalData
        });
    });
}

// === NEW FEATURE HELPERS (insp.html inspired) ===

/**
 * Apply collected power-up effect
 */
function applyPowerUp(powerup: PowerUp): void {
    camera.shake = CONFIG.SHAKE_POWERUP;
    audio.playSound('collect');

    switch (powerup.type) {
        case 'speed':
            boostActive = true;
            boostType = 'speed';
            boostEndTime = Date.now() + CONFIG.BOOST_DURATION * 1000;
            UIManager.toast('⚡ Speed Boost!', 'success');
            showBoostIndicator('speed');
            break;

        case 'xp':
            // Add XP bonus (server handles actual XP)
            player.xp += CONFIG.POWERUP_XP_BONUS;
            UIManager.toast(`✨ +${CONFIG.POWERUP_XP_BONUS} XP!`, 'success');
            floats.push(new FloatingText(player.x, player.y - 30, `+${CONFIG.POWERUP_XP_BONUS} XP`, player.hue));
            break;

        case 'shield':
            boostActive = true;
            boostType = 'shield';
            boostEndTime = Date.now() + CONFIG.BOOST_DURATION * 1000;
            UIManager.toast('🛡️ Shield Active!', 'success');
            showBoostIndicator('shield');
            break;

        case 'magnet':
            boostActive = true;
            boostType = 'magnet';
            boostEndTime = Date.now() + CONFIG.BOOST_DURATION * 1000;
            UIManager.toast('🧲 Star Magnet!', 'success');
            showBoostIndicator('magnet');
            break;
    }

    // Particles - use a hue value based on powerup type
    if (settings.particles) {
        const hueMap: Record<PowerUpType, number> = {
            speed: 55,    // Yellow/gold
            xp: 270,      // Purple
            shield: 200,  // Cyan
            magnet: 120   // Green
        };
        GameLogic.spawnParticles(powerup.x, powerup.y, hueMap[powerup.type], 15, true, particles);
    }
}

/**
 * Show boost indicator UI
 */
function showBoostIndicator(type: PowerUpType): void {
    const indicator = document.getElementById('boost-indicator');
    const icon = document.getElementById('boost-icon');
    const name = document.getElementById('boost-name');

    if (!indicator || !icon || !name) return;

    const icons: Record<PowerUpType, string> = {
        speed: '⚡',
        xp: '✨',
        shield: '🛡️',
        magnet: '🧲'
    };

    const names: Record<PowerUpType, string> = {
        speed: 'Speed Boost',
        xp: 'XP Boost',
        shield: 'Shield',
        magnet: 'Star Magnet'
    };

    icon.textContent = icons[type];
    name.textContent = names[type];
    indicator.classList.add('active');
}

/**
 * Start tag game mode
 */
function startTagGame(): void {
    tagGameState = GameLogic.initTagGame(others, player.id);
    UIManager.toast("🏃 Tag Game Started! Don't get caught!", 'info');
    updateTagHUD();
    document.getElementById('tag-hud')?.classList.add('active');
}

/**
 * End tag game mode
 */
function endTagGame(): void {
    if (tagGameState.active) {
        tagGameState.active = false;
        document.getElementById('tag-hud')?.classList.remove('active');
    }
}

/**
 * Update tag game HUD
 */
function updateTagHUD(): void {
    const itName = document.getElementById('it-name');
    const survivalTime = document.getElementById('survival-time');

    if (!itName || !survivalTime) return;

    const isPlayerIt = tagGameState.itPlayerId === player.id;

    if (isPlayerIt) {
        itName.textContent = 'YOU are IT!';
        itName.style.color = '#ff4757';
    } else {
        const itPlayer = others.get(tagGameState.itPlayerId || '');
        itName.textContent = itPlayer?.name || 'Unknown';
        itName.style.color = '#ffd93d';
    }

    survivalTime.textContent = `${Math.floor(tagGameState.survivalTime)}s`;
}

/**
 * Take a snapshot of the current view
 */
function takeSnapshot(): void {
    // Create a temporary canvas with the current game state
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = canvas.width;
    snapshotCanvas.height = canvas.height;
    const ctx = snapshotCanvas.getContext('2d')!;

    // Copy current canvas
    ctx.drawImage(canvas, 0, 0);

    // Add watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px system-ui';
    ctx.fillText(`AURA • ${player.name} • ${new Date().toLocaleDateString()}`, 10, canvas.height - 10);

    // Show in modal
    const modal = document.getElementById('snapshot-modal');
    const preview = document.getElementById('snapshot-preview') as HTMLImageElement;

    if (modal && preview) {
        preview.src = snapshotCanvas.toDataURL('image/png');
        modal.classList.add('active');
    }

    camera.shake = CONFIG.SHAKE_SNAPSHOT;
    UIManager.toast('📸 Snapshot taken!');
}

/**
 * Download the current snapshot
 */
function downloadSnapshot(): void {
    const preview = document.getElementById('snapshot-preview') as HTMLImageElement;
    if (!preview || !preview.src) return;

    const link = document.createElement('a');
    link.download = `aura-snapshot-${Date.now()}.png`;
    link.href = preview.src;
    link.click();
}

/**
 * Close snapshot modal
 */
function closeSnapshotModal(): void {
    document.getElementById('snapshot-modal')?.classList.remove('active');
}

/**
 * Send a quick reaction emoji
 */
function sendQuickReaction(emoji: string): void {
    // Show floating reaction above player
    floats.push(new FloatingText(player.x, player.y - 40, emoji, player.hue));

    // Also broadcast as emote
    if (wsClient.isConnected()) {
        wsClient.sendEmote(player, emoji);
    }

    // Update stats
    stats.emotes++;
    dailyProgress.emotes++;
    PersistenceManager.saveDailyProgress(dailyProgress);

    camera.shake = CONFIG.SHAKE_REACTION;
}

function startGame(): void {
    console.log('🌌 AURA - The Social Cosmos initialized (Server-Authoritative)');
    console.log('Player:', player.name, 'ID:', player.id);

    // Ensure canvas dimensions are set properly (including minimap)
    resize();

    // Initialize UI
    UIManager.updateHUD(player);
    UIManager.updateRealmUI(gameState.currentRealm);

    // Ensure stars around player
    GameLogic.ensureStars(player.x, player.y, gameState.currentRealm, stars);

    // Quest timer and daily reset
    setInterval(updateQuestTimer, 1000);
    setInterval(checkDailyReset, 60000);
    checkWeeklyQuests(); // Check on startup

    // === WEBSOCKET CONNECTION (Primary - Real-time sync) ===
    setupNetworkEventListeners();
    wsClient.connect(player.id, gameState.currentRealm as import('./types').RealmId).then((connected) => {
        if (connected) {
            console.log('✅ WebSocket connected - Real-time sync active');
            // Start sending position updates via WebSocket
            setInterval(() => {
                if (wsClient.isConnected()) {
                    wsClient.sendPlayerUpdate(player);
                }
            }, 100); // 10Hz position updates for smooth sync
        } else {
            console.warn('⚠️ WebSocket failed - no connection to server');
        }
    });

    // NOTE: HTTP polling has been REMOVED - we are now fully server-authoritative via WebSocket
    // All entities (players + bots) come through the 'world_state' message at 20Hz
    // No more fetchNearbyPlayers, fetchEchoes, or startPositionSync

    // Start game loops
    requestAnimationFrame(render);
    setInterval(update, 16);
}

function update(): void {
    if (!gameState.gameActive) return;
    const dt = 0.016; // ~60fps

    // === Get realm physics ===
    const physics = GameLogic.getRealmPhysics(gameState.currentRealm);
    const boostMultiplier = boostActive && boostType === 'speed' ? CONFIG.BOOST_SPEED_MULTIPLIER : 1.0;
    const driftSpeed = CONFIG.DRIFT * physics.driftMultiplier * boostMultiplier;

    // Update player movement with realm physics
    const oldX = player.x;
    const oldY = player.y;
    player.x += (player.tx - player.x) * driftSpeed;
    player.y += (player.ty - player.y) * driftSpeed;

    // Apply realm gravity
    if (physics.gravity.x !== 0 || physics.gravity.y !== 0) {
        player.tx += physics.gravity.x * 0.5;
        player.ty += physics.gravity.y * 0.5;
    }

    // === Update boost timer ===
    if (boostActive && Date.now() > boostEndTime) {
        boostActive = false;
        boostType = null;
        document.getElementById('boost-indicator')?.classList.remove('active');
    }

    // === Power-up spawning ===
    powerupSpawnTimer += dt;
    if (powerupSpawnTimer >= CONFIG.POWERUP_SPAWN_INTERVAL) {
        powerupSpawnTimer = 0;
        GameLogic.spawnPowerUp(player, gameState.currentRealm, powerups);
    }

    // === Update power-ups ===
    GameLogic.updatePowerUps(powerups, dt);

    // === Check power-up collection ===
    const collected = GameLogic.checkPowerUpCollection(player, powerups, gameState.currentRealm);
    if (collected) {
        applyPowerUp(collected);
    }

    // === Tag game logic (only in Tag Arena) ===
    if (gameState.currentRealm === 'tagarena' && tagGameState.active) {
        tagGameState.survivalTime += dt;

        const tagResult = GameLogic.checkTagCollision(player, others, tagGameState);
        if (tagResult.tagged && tagResult.newItId) {
            tagGameState.itPlayerId = tagResult.newItId;
            tagGameState.lastTagTime = Date.now();
            camera.shake = CONFIG.SHAKE_TAG;
            audio.playSound('tag');

            if (tagResult.newItId === player.id) {
                UIManager.toast("You're IT! 🏃", 'warning');
            } else {
                UIManager.toast("Tagged! You're free!", 'success');
            }

            updateTagHUD();
        }
    }

    // Update trail (decay faster when far from center - Campfire Model)
    if (Math.hypot(player.x - oldX, player.y - oldY) > 1.5) {
        player.trail.push({ x: player.x, y: player.y, life: 1 });
        if (player.trail.length > 45) player.trail.shift();
    }
    const distFromCenter = Math.hypot(player.x, player.y);
    const trailDecayRate = distFromCenter > CONFIG.CAMPFIRE_RADIUS ? 0.04 : 0.022;
    for (const t of player.trail) {
        t.life -= trailDecayRate;
    }

    // Update camera
    camera.tx = player.x - W / 2;
    camera.ty = player.y - H / 2;
    camera.x += (camera.tx - camera.x) * 0.075;
    camera.y += (camera.ty - camera.y) * 0.075;

    if (camera.shake > 0) {
        camera.shake -= 0.03;
        camera.x += (Math.random() - 0.5) * camera.shake * 12;
        camera.y += (Math.random() - 0.5) * camera.shake * 12;
    }

    // Update effects for local player
    player.singing = Math.max(0, player.singing - 0.016);
    player.pulsing = Math.max(0, player.pulsing - 0.01);

    if (player.emoteT > 0) {
        player.emoteT -= 0.016;
        if (player.emoteT <= 0) player.emoting = null;
    }

    // Update effects for other players (decay their visual states)
    for (const other of others.values()) {
        other.singing = Math.max(0, (other.singing || 0) - 0.016);
        other.pulsing = Math.max(0, (other.pulsing || 0) - 0.01);
        if (other.emoteT !== undefined && other.emoteT > 0) {
            other.emoteT -= 0.016;
            if (other.emoteT <= 0) other.emoting = null;
        }
        // Decay chat message timer (for chat bubbles)
        if (other.messageTimer !== undefined && other.messageTimer > 0) {
            other.messageTimer -= 1;
            // Floating bubble: slowly rise (offset becomes more negative)
            if (other.messageYOffset !== undefined) {
                other.messageYOffset -= 0.15;  // Float upward ~0.15px/frame
            }
            if (other.messageTimer <= 0) {
                other.message = undefined;
                other.messageYOffset = undefined;
            }
        }
        // Decay chat heat (inspiration4) - warm color fades back to base
        if (other.chatHeat !== undefined && other.chatHeat > 0) {
            other.chatHeat = Math.max(0, other.chatHeat - 0.008); // ~2 sec fade
            // Interpolate hue toward warmer (shift by up to +50)
            if (other.baseHue !== undefined) {
                other.hue = other.baseHue + (other.chatHeat * 50);
                if (other.hue > 360) other.hue -= 360;
            }
        }
    }

    // Update ambient drone based on nearby count (inspiration4)
    const nearbyCount = Array.from(others.values()).filter(o => 
        Math.hypot(o.x - player.x, o.y - player.y) < 500
    ).length;
    audio.updateDroneProximity(nearbyCount);

    // Voice peer discovery - check nearby players for voice connections (throttled)
    voicePeerUpdateCounter++;
    if (voicePeerUpdateCounter >= VOICE_PEER_UPDATE_INTERVAL) {
        voicePeerUpdateCounter = 0;
        if (voiceChat.enabled) {
            const nearbyVoicePeers = new Set<string>();
            const VOICE_RANGE = 500; // Same as spatial audio range

            for (const [id, other] of others.entries()) {
                // Skip bots - they don't have voice
                if (other.isBot) continue;

                const dist = Math.hypot(other.x - player.x, other.y - player.y);
                if (dist <= VOICE_RANGE) {
                    nearbyVoicePeers.add(id);
                }
            }

            // Update voice connections and spatial audio
            voiceChat.updateNearbyPeers(nearbyVoicePeers);

            // Update spatial audio volumes for connected peers
            for (const id of voiceChat.getConnectedPeers()) {
                const other = others.get(id);
                if (other) {
                    const dist = Math.hypot(other.x - player.x, other.y - player.y);
                    voiceChat.updateSpatialAudio(id, dist, VOICE_RANGE);
                }
            }
        }
    }

    // Update particles
    GameLogic.updateParticles(particles);

    // Update floating text
    for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].update();
        if (floats[i].life <= 0) {
            floats.splice(i, 1);
        }
    }

    // Update stars
    GameLogic.updateStars(stars);

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        if (projectiles[i].life <= 0) {
            projectiles.splice(i, 1);
        }
    }

    // NOTE: Bot management removed - bots are now server-authoritative
    // They come through the 'world_state' WebSocket message every 50ms (20Hz)

    // Ensure stars around player
    GameLogic.ensureStars(player.x, player.y, gameState.currentRealm, stars);
}

function render(): void {
    const viewRadius = GameLogic.getViewRadius(player);

    // Debug: Log others count periodically
    if (Math.random() < 0.01) { // 1% of frames
        console.log(`🎨 Render: ${others.size} others in map, viewRadius: ${viewRadius}, player at (${player.x.toFixed(0)}, ${player.y.toFixed(0)})`);
        if (others.size > 0) {
            others.forEach((o, _id) => {
                const dist = Math.hypot(o.x - player.x, o.y - player.y);
                console.log(`   - ${o.name} at (${o.x.toFixed(0)}, ${o.y.toFixed(0)}), dist: ${dist.toFixed(0)}, visible: ${dist <= viewRadius + 120}`);
            });
        }
    }

    // Clear with fade
    renderer.clear(gameState.currentRealm);

    renderer.save();
    renderer.translate(-camera.x, -camera.y);

    // Render world
    renderer.renderNebula(camera, player, gameState.currentRealm);
    renderer.renderBgStars(camera);
    renderer.renderStars(stars, player, viewRadius, gameState.currentRealm);
    renderer.renderEchoes(echoes, player, viewRadius, gameState.currentRealm);
    renderer.renderConstellations(constellations);
    renderer.renderSocialClusters(player, others, viewRadius);  // NEW: Social clustering glow
    renderer.renderTethers(player, others);
    renderer.renderVoiceProximity(player, others, gameState.voiceOn, 500, voiceChat.getConnectedPeers());  // Voice proximity ring

    // === NEW: Render power-ups ===
    renderer.renderPowerUps(powerups, player, viewRadius);

    renderer.renderOthers(others, player, viewRadius);
    // NOTE: Bots are now rendered as part of 'others' - they come from server with isBot=true
    renderer.renderProjectiles(projectiles);

    // === NEW: Render boost effect around player ===
    if (boostActive && boostType === 'speed') {
        const boostRemaining = Math.max(0, (boostEndTime - Date.now()) / (CONFIG.BOOST_DURATION * 1000));
        renderer.renderBoostEffect(player, boostRemaining);
    }

    renderer.renderPlayer(player, gameState.voiceOn, gameState.isSpeaking);
    renderer.renderParticles(particles);
    renderer.renderFloats(floats);

    // === NEW: Render tag overlay if active ===
    if (tagGameState.active) {
        renderer.renderTagOverlay(tagGameState, player, others);
        updateTagHUD();  // Update HUD each frame for survival timer
    }

    renderer.restore();

    // Update cluster HUD with nearby count
    const nearbyCount = Array.from(others.values()).filter(o => 
        Math.hypot(o.x - player.x, o.y - player.y) < 400
    ).length;
    const clusterHud = document.getElementById('cluster-hud');
    const clusterCount = document.getElementById('cluster-count');
    if (clusterHud && clusterCount) {
        clusterCount.textContent = nearbyCount.toString();
        if (nearbyCount > 0) {
            clusterHud.classList.add('visible');
        } else {
            clusterHud.classList.remove('visible');
        }
    }

    // Render UI overlays (screen space)
    renderer.renderCompass(player); // Navigation compass for distant players

    // Render UI overlays
    renderer.renderVignette();
    renderer.renderMinimap(player, others, echoes, viewRadius, gameState.currentRealm);

    requestAnimationFrame(render);
}

// Initialize on load
setupUI();
setupEmotes();
setupColorPicker();

// Cursor tracking
window.addEventListener('mousemove', (e) => {
    const cursor = document.getElementById('cursor');
    if (cursor) {
        cursor.style.left = `${e.clientX - 14}px`;
        cursor.style.top = `${e.clientY - 14}px`;
    }
});
window.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const cursor = document.getElementById('cursor');
    if (cursor && e.touches[0]) {
        cursor.style.left = `${e.touches[0].clientX - 14}px`;
        cursor.style.top = `${e.touches[0].clientY - 14}px`;
    }
}, { passive: false });

console.log('✨ AURA TypeScript initialized');

// === HELPER FUNCTIONS FOR NEW FEATURES ===

/**
 * Toggle voice chat on/off
 */
async function toggleVoice(): Promise<void> {
    // State 1: Disabled -> Enabled (Mic On)
    if (!voiceChat.enabled) {
        // Init logic...
        voiceChat.setUserId(player.id);
        voiceChat.setSignalSender((targetId, signalType, data) => {
            if (wsClient.isConnected()) {
                wsClient.sendVoiceSignal(targetId, signalType, data);
            }
        });

        const success = await voiceChat.init();
        if (success) {
            gameState.voiceOn = true;
            stats.voice = 1;
            PersistenceManager.saveStats(stats);

            // Setup callbacks
            voiceChat.onSpeakingChange = (speaking) => {
                gameState.isSpeaking = speaking;
                updateVoiceUI();
                
                // Broadcast speaking state to server for other players to see
                wsClient.send({
                    type: 'speaking',
                    data: { speaking },
                    timestamp: Date.now()
                });
            };

            voiceChat.onVolumeUpdate = (level) => {
                updateVoiceViz(level);
            };

            voiceChat.onConnectionStateChange = (peerId, state) => {
                if (state === 'connected') {
                    UIManager.toast(`🔗 Connected to peer`, 'success');
                } else if (state === 'failed') {
                    UIManager.toast(`❌ Connection failed`, 'error');
                } else if (state === 'disconnected') {
                    console.log(`🔌 Voice disconnected from ${peerId}`);
                }
            };

            updateVoiceUI();

            if (voiceChat.canSpeak) {
                console.log('🎙️ Voice enabled');
                UIManager.toast('🎙️ Voice Active', 'success');
            } else {
                UIManager.toast('🎧 Listen Only Mode', 'warning');
                console.log('🎧 Voice enabled (Listen Only)');
            }
        }
    }
    // State 2: Enabled (Mic On) -> Enabled (Muted)
    else if (!voiceChat.isMuted && voiceChat.canSpeak) {
        voiceChat.setMuted(true);
        UIManager.toast('🔇 Microphone Muted', 'info');
        updateVoiceUI();
    }
    // State 3: Enabled (Muted/Listen Only) -> Disabled
    else {
        voiceChat.disable();
        gameState.voiceOn = false;
        voiceChat.setMuted(false); // Reset state
        updateVoiceUI();
        UIManager.toast('🔌 Voice Disconnected', 'info');
        console.log('🔇 Voice disabled');
    }
}

/**
 * Update voice UI elements
 */
function updateVoiceUI(): void {
    const btn = document.getElementById('voice-btn');
    const status = document.getElementById('voice-status');
    const orb = document.getElementById('my-orb');

    if (voiceChat.enabled) {
        btn?.classList.add('on');
        btn?.classList.remove('muted');

        if (voiceChat.isMuted) {
            if (btn) btn.textContent = '🎧'; // Muted -> Headphones (Listen Mode)
            if (status) status.innerHTML = 'Muted<br><span style="font-size:0.7em;opacity:0.7">Click to disconnect</span>';
            orb?.classList.remove('speaking');
        } else if (!voiceChat.canSpeak) {
            if (btn) btn.textContent = '🎧'; // Forced Listen Only
            if (status) status.innerHTML = 'Listen Only<br><span style="font-size:0.7em;opacity:0.7">Click to disconnect</span>';
        } else {
            if (btn) btn.textContent = '🎙️'; // Active Mic
            if (status) status.innerHTML = 'Talk<br><span style="font-size:0.7em;opacity:0.7">Click to mute</span>';
            if (voiceChat.isSpeaking) {
                orb?.classList.add('speaking');
            } else {
                orb?.classList.remove('speaking');
            }
        }
    } else {
        btn?.classList.remove('on');
        btn?.classList.add('muted');
        if (btn) btn.textContent = '🔇';
        if (status) status.textContent = 'Off';
        orb?.classList.remove('speaking');
    }
}

/**
 * Update voice visualization bars
 */
function updateVoiceViz(level: number): void {
    const bars = document.querySelectorAll('#voice-viz .vbar');
    const heights = [4, 6, 10, 6, 4];

    if (voiceChat.enabled && voiceChat.isSpeaking) {
        bars.forEach((bar, i) => {
            (bar as HTMLElement).style.height = `${heights[i] + Math.random() * level * 15}px`;
            (bar as HTMLElement).style.background = 'var(--success)';
        });
    } else if (voiceChat.enabled) {
        bars.forEach((bar, i) => {
            (bar as HTMLElement).style.height = `${heights[i]}px`;
            (bar as HTMLElement).style.background = 'var(--blue)';
        });
    } else {
        bars.forEach((bar, i) => {
            (bar as HTMLElement).style.height = `${heights[i]}px`;
            (bar as HTMLElement).style.background = 'var(--text-dim)';
        });
    }
}

/**
 * Update quest timer display
 */
function updateQuestTimer(): void {
    const timer = document.getElementById('quest-timer');
    if (timer) {
        const timeLeft = PersistenceManager.getTimeUntilReset();
        timer.textContent = `Resets in ${PersistenceManager.formatTime(timeLeft)}`;
    }
}

/**
 * Check if daily quests should reset
 */
function checkDailyReset(): void {
    const newProgress = PersistenceManager.checkDailyReset(dailyProgress);
    if (newProgress !== dailyProgress) {
        dailyProgress = newProgress;
        PersistenceManager.saveDailyProgress(dailyProgress);
        console.log('🌅 Daily quests reset!');
        UIManager.updateQuests();
    }
}

/**
 * Check weekly quests progress
 */
function checkWeeklyQuests(): void {
    const weekly = PersistenceManager.loadWeeklyProgress();
    const currentWeek = PersistenceManager.getWeekNumber();

    if (weekly.week !== currentWeek) {
        // Reset weekly progress
        weeklyProgress = {
            week: currentWeek,
            whispers: 0,
            stars: 0,
            newFriends: 0,
            realmChanges: 0
        };
        PersistenceManager.saveWeeklyProgress(weeklyProgress);
        console.log('📆 Weekly quests reset!');
    }
}

/**
 * Check for newly unlocked achievements
 */
function checkAchievements(): void {
    const achievements = ACHIEVEMENTS;
    let newUnlocks = 0;

    for (const ach of achievements) {
        if (unlocked.has(ach.id)) continue;

        let earned = false;

        // Check requirement based on achievement type
        switch (ach.id) {
            case 'firstStar': earned = stats.stars >= 1; break;
            case 'stargazer': earned = stats.stars >= 25; break;
            case 'starlight': earned = stats.stars >= 100; break;
            case 'firstWord': earned = stats.whispers >= 1; break;
            case 'chatter': earned = stats.whispers >= 50; break;
            case 'connector': earned = stats.connections >= 10; break;
            case 'socialite': earned = stats.connections >= 50; break;
            case 'echomaker': earned = stats.echoes >= 10; break;
            case 'eternal': earned = stats.echoes >= 50; break;
            case 'singer': earned = stats.sings >= 25; break;
            case 'chorus': earned = stats.sings >= 100; break;
            case 'voyager': earned = visitedRealms.size >= 3; break;
            case 'explorer': earned = visitedRealms.size >= 5; break;
            case 'worldWalker': earned = visitedRealms.size >= 8; break;
            case 'ancient': {
                const hoursPlayed = (Date.now() - player.born) / (1000 * 60 * 60);
                earned = hoursPlayed >= 10;
                break;
            }
            case 'level5': earned = GameLogic.getLevel(player.xp) >= 5; break;
            case 'level10': earned = GameLogic.getLevel(player.xp) >= 10; break;
            case 'ascended': earned = GameLogic.getLevel(player.xp) >= 11; break;
            case 'friendMaker': earned = friends.size >= 5; break;
            case 'popular': earned = friends.size >= 15; break;
            case 'beloved': earned = friends.size >= 30; break;
            // Secret achievements
            case 'nightOwl': {
                const hour = new Date().getHours();
                earned = hour >= 2 && hour <= 5;
                break;
            }
            case 'marathon': earned = stats.marathon >= 60; break; // 60 mins continuous
            case 'constellation': earned = stats.constellation >= 3; break;
            case 'teleporter': earned = stats.teleports >= 10; break;
        }

        if (earned) {
            unlocked.add(ach.id);
            newUnlocks++;
            UIManager.toast(`🏆 Achievement: ${ach.name}!`, 'achievement');
            gainXP(ach.reward || 10);
        }
    }

    if (newUnlocks > 0) {
        PersistenceManager.saveAchievements(unlocked);
        UIManager.updateAchievements();
    }
}

/**
 * Save all game progress
 */
function saveProgress(): void {
    PersistenceManager.saveSettings(settings);
    PersistenceManager.saveStats(stats);
    PersistenceManager.saveDailyProgress(dailyProgress);
    PersistenceManager.saveWeeklyProgress(weeklyProgress);
    PersistenceManager.saveAchievements(unlocked);
    PersistenceManager.saveFriends(friends);
    PersistenceManager.saveVisitedRealms(visitedRealms);
    PersistenceManager.savePlayerData({
        name: player.name,
        xp: player.xp,
        stars: player.stars,
        echoes: player.echoes
    });
}

// Auto-save progress periodically
setInterval(saveProgress, 30000); // Every 30 seconds

// Save on page unload
window.addEventListener('beforeunload', saveProgress);
