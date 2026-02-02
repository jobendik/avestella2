// Game loop management - update and render cycles
import { CONFIG } from '../core/config';
import { GameLogic } from '../game/logic';
import type { Player, Camera, OtherPlayer, Settings, RealmId } from '../types';
import type { Star, Echo, Projectile, Particle, FloatingText } from '../game/entities';
import type { Renderer } from '../game/renderer';

interface GameLoopConfig {
    renderer: Renderer;
    
    // State accessors
    getPlayer: () => Player;
    getCamera: () => Camera;
    getOthers: () => Map<string, OtherPlayer>;
    getStars: () => Map<string, Star[]>;
    getEchoes: () => Echo[];
    getProjectiles: () => Projectile[];
    getParticles: () => Particle[];
    getFloats: () => FloatingText[];
    getConstellations: () => [Star, Star, Star][];
    getSettings: () => Settings;
    getCurrentRealm: () => RealmId;
    getGameActive: () => boolean;
    getVoiceState: () => { voiceOn: boolean; isSpeaking: boolean };
    getDimensions: () => { W: number; H: number };
}

/**
 * Manages the game loop - update and render cycles
 */
export class GameLoop {
    private config: GameLoopConfig;
    private updateIntervalId: number | null = null;
    private animationFrameId: number | null = null;
    private isRunning: boolean = false;

    constructor(config: GameLoopConfig) {
        this.config = config;
    }

    /**
     * Start the game loops
     */
    start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        // Start update loop (fixed timestep)
        this.updateIntervalId = window.setInterval(() => this.update(), CONFIG.UPDATE_INTERVAL);
        
        // Start render loop (requestAnimationFrame)
        this.render();
        
        console.log('🎮 Game loop started');
    }

    /**
     * Stop the game loops
     */
    stop(): void {
        this.isRunning = false;
        
        if (this.updateIntervalId !== null) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
        }
        
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        console.log('🛑 Game loop stopped');
    }

    /**
     * Fixed timestep update loop
     */
    private update(): void {
        if (!this.config.getGameActive()) return;

        const player = this.config.getPlayer();
        const camera = this.config.getCamera();
        const particles = this.config.getParticles();
        const floats = this.config.getFloats();
        const projectiles = this.config.getProjectiles();
        const stars = this.config.getStars();
        const currentRealm = this.config.getCurrentRealm();
        const { W, H } = this.config.getDimensions();

        // Update player movement
        const oldX = player.x;
        const oldY = player.y;
        player.x += (player.tx - player.x) * CONFIG.DRIFT;
        player.y += (player.ty - player.y) * CONFIG.DRIFT;

        // Update trail (decay faster when far from center - Campfire Model)
        if (Math.hypot(player.x - oldX, player.y - oldY) > 1.5) {
            player.trail.push({ x: player.x, y: player.y, life: 1 });
            if (player.trail.length > CONFIG.MAX_TRAIL_LENGTH) player.trail.shift();
        }
        
        const distFromCenter = Math.hypot(player.x, player.y);
        const trailDecayRate = distFromCenter > CONFIG.CAMPFIRE_RADIUS 
            ? CONFIG.TRAIL_DECAY_RATE_FAR 
            : CONFIG.TRAIL_DECAY_RATE_NEAR;
        for (const t of player.trail) {
            t.life -= trailDecayRate;
        }

        // Update camera
        camera.tx = player.x - W / 2;
        camera.ty = player.y - H / 2;
        camera.x += (camera.tx - camera.x) * CONFIG.CAMERA_LERP;
        camera.y += (camera.ty - camera.y) * CONFIG.CAMERA_LERP;

        // Camera shake
        if (camera.shake > 0) {
            camera.shake -= CONFIG.SHAKE_DECAY;
            camera.x += (Math.random() - 0.5) * camera.shake * CONFIG.SHAKE_INTENSITY;
            camera.y += (Math.random() - 0.5) * camera.shake * CONFIG.SHAKE_INTENSITY;
        }

        // Update player effects
        player.singing = Math.max(0, player.singing - CONFIG.SINGING_DECAY);
        player.pulsing = Math.max(0, player.pulsing - CONFIG.PULSING_DECAY);

        if (player.emoteT > 0) {
            player.emoteT -= CONFIG.EMOTE_DECAY;
            if (player.emoteT <= 0) player.emoting = null;
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

        // Ensure stars around player
        GameLogic.ensureStars(player.x, player.y, currentRealm, stars);
    }

    /**
     * Render loop using requestAnimationFrame
     */
    private render = (): void => {
        if (!this.isRunning) return;

        const player = this.config.getPlayer();
        const camera = this.config.getCamera();
        const others = this.config.getOthers();
        const stars = this.config.getStars();
        const echoes = this.config.getEchoes();
        const projectiles = this.config.getProjectiles();
        const particles = this.config.getParticles();
        const floats = this.config.getFloats();
        const constellations = this.config.getConstellations();
        const currentRealm = this.config.getCurrentRealm();
        const { voiceOn, isSpeaking } = this.config.getVoiceState();
        const renderer = this.config.renderer;

        const viewRadius = GameLogic.getViewRadius(player);

        // Clear with fade
        renderer.clear(currentRealm);

        renderer.save();
        renderer.translate(-camera.x, -camera.y);

        // Render world
        renderer.renderNebula(camera, player, currentRealm);
        renderer.renderBgStars(camera);
        renderer.renderStars(stars, player, viewRadius, currentRealm);
        renderer.renderEchoes(echoes, player, viewRadius, currentRealm);
        renderer.renderConstellations(constellations);
        renderer.renderTethers(player, others);
        renderer.renderOthers(others, player, viewRadius);
        // NOTE: Bots are rendered via renderOthers (they have isBot=true in others map)
        renderer.renderProjectiles(projectiles);
        renderer.renderPlayer(player, voiceOn, isSpeaking);
        renderer.renderParticles(particles);
        renderer.renderFloats(floats);

        renderer.restore();

        // Render UI overlays (screen space)
        renderer.renderCompass(player);
        renderer.renderVignette();
        renderer.renderMinimap(player, others, echoes, viewRadius, currentRealm);

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(this.render);
    };
}
