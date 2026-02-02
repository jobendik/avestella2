import type { RealmId } from '../types';
import { SCALES } from '../core/config';

interface AudioSettings {
    music: boolean;
    volume: number;
}

class AudioManager {
    private ctx: AudioContext | null = null;
    private drone: OscillatorNode | null = null;
    private droneGain: GainNode | null = null;
    private master: GainNode | null = null;
    private settings: AudioSettings;
    private currentRealm: RealmId = 'genesis';
    
    // Multi-oscillator drone for richer ambient sound (inspiration4)
    private droneOscillators: OscillatorNode[] = [];
    private droneGainNodes: GainNode[] = [];
    private droneFrequencies = [55, 110.5, 164.8, 196]; // Suspended chord

    constructor(settings: AudioSettings) {
        this.settings = settings;
    }

    init(): void {
        if (this.ctx) return;

        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.settings.volume * 0.5;
        this.master.connect(this.ctx.destination);

        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 0;
        this.droneGain.connect(this.master);

        // Create multi-oscillator drone for richer ambient sound
        this.droneFrequencies.forEach(freq => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(this.master!);
            osc.start();
            this.droneOscillators.push(osc);
            this.droneGainNodes.push(gain);
        });

        // Legacy single drone for realm-specific tones
        this.drone = this.ctx.createOscillator();
        this.drone.type = 'sine';
        this.drone.frequency.value = 55;
        this.drone.connect(this.droneGain);
        this.drone.start();

        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.06;
        const lg = this.ctx.createGain();
        lg.gain.value = 1.2;
        lfo.connect(lg);
        lg.connect(this.drone.frequency);
        lfo.start();
    }

    setVolume(v: number): void {
        this.settings.volume = v;
        if (this.master) {
            this.master.gain.value = v * 0.5;
        }
    }

    startDrone(): void {
        if (!this.ctx || !this.settings.music || !this.droneGain) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.droneGain.gain.setTargetAtTime(0.02, this.ctx.currentTime, 2);
    }

    stopDrone(): void {
        if (this.droneGain && this.ctx) {
            this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 1);
        }
        // Also fade out multi-oscillator drone
        this.droneGainNodes.forEach(g => {
            if (this.ctx) g.gain.setTargetAtTime(0, this.ctx.currentTime, 1);
        });
    }

    /**
     * Update drone intensity based on nearby player count (inspiration4)
     * More souls nearby = richer, fuller ambient sound
     */
    updateDroneProximity(nearbyCount: number): void {
        if (!this.ctx || !this.settings.music) return;
        
        // Base volume + scale with nearby players (cap at reasonable level)
        const targetVolume = 0.03 + Math.min(nearbyCount * 0.02, 0.15);
        
        this.droneGainNodes.forEach(g => {
            g.gain.setTargetAtTime(targetVolume * this.settings.volume, this.ctx!.currentTime, 1);
        });
    }

    /**
     * Play a pentatonic chime when someone chats (inspiration4)
     */
    playChatChime(): void {
        if (!this.ctx || !this.settings.music || !this.master) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        
        // Pentatonic-ish frequency
        const base = 440;
        const freq = base * Math.pow(2, Math.floor(Math.random() * 10) / 12);
        
        osc.frequency.setValueAtTime(freq, now);
        osc.type = 'triangle';
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.08 * this.settings.volume, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        osc.connect(g);
        g.connect(this.master);
        osc.start();
        osc.stop(now + 2);
    }

    /**
     * Play a named sound effect (insp.html inspired)
     */
    playSound(name: 'collect' | 'tag' | 'powerup' | 'snapshot'): void {
        if (!this.ctx || !this.settings.music || !this.master) return;

        switch (name) {
            case 'collect':
                // Ascending chime for powerup collection
                [0, 4, 7, 12].forEach((semitone, i) => {
                    const freq = 440 * Math.pow(2, semitone / 12);
                    setTimeout(() => this.playNote(freq, 0.06, 0.4), i * 50);
                });
                break;

            case 'tag':
                // Sharp impact sound for tagging
                this.playNote(200, 0.12, 0.15);
                this.playNote(150, 0.1, 0.2);
                break;

            case 'powerup':
                // Rising sparkle
                [0, 3, 5, 7, 10, 12].forEach((semitone, i) => {
                    const freq = 330 * Math.pow(2, semitone / 12);
                    setTimeout(() => this.playNote(freq, 0.04, 0.3), i * 40);
                });
                break;

            case 'snapshot':
                // Camera shutter-like sound
                this.playNote(800, 0.08, 0.05);
                setTimeout(() => this.playNote(600, 0.06, 0.1), 60);
                break;
        }
    }

    setRealmTone(realm: RealmId): void {
        this.currentRealm = realm;
        const frequencies: Record<RealmId, number> = {
            genesis: 55,
            nebula: 62,
            void: 41,
            starforge: 73,
            sanctuary: 49,
            abyss: 36,
            crystal: 82,
            celestial: 110,
            tagarena: 88  // Energetic, higher pitch for action
        };
        const freq = frequencies[realm] || 55;
        if (this.drone && this.ctx) {
            this.drone.frequency.setTargetAtTime(freq, this.ctx.currentTime, 2);
        }
    }

    playNote(freq: number, vol: number = 0.08, dur: number = 2): void {
        if (!this.ctx || !this.settings.music || !this.master) return;

        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;

        const t = this.ctx.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol * this.settings.volume, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);

        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + dur);
    }

    playChord(intensity: number = 1): void {
        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        const base = scale[Math.floor(Math.random() * scale.length)];
        const v = 0.035 * intensity;

        this.playNote(base, v, 1.5);
        setTimeout(() => this.playNote(base * 1.25, v * 0.75, 1.3), 50);
        setTimeout(() => this.playNote(base * 1.5, v * 0.55, 1.1), 100);
    }

    playSing(_hue: number): void {
        this.playChord(1.1);
    }

    playPulse(): void {
        this.playNote(110, 0.06, 2);
        setTimeout(() => this.playNote(165, 0.05, 1.7), 80);
        setTimeout(() => this.playNote(220, 0.04, 1.3), 160);
    }

    playEcho(): void {
        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        [0, 2, 4, 5].forEach((n, i) => {
            setTimeout(() => this.playNote(scale[n % scale.length], 0.04, 1.2), i * 130);
        });
    }

    playLevelUp(): void {
        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        [0, 2, 4, 5, 4, 5, 7].forEach((n, i) => {
            setTimeout(() => this.playNote(scale[n % scale.length], 0.045, 1), i * 80);
        });
    }

    playConn(): void {
        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        this.playNote(scale[4], 0.03, 0.5);
    }

    playWhisperSend(): void {
        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        this.playNote(scale[4], 0.035, 0.6);
        setTimeout(() => this.playNote(scale[5], 0.03, 0.4), 60);
    }

    playWhisperRecv(): void {
        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        this.playNote(scale[2], 0.045, 0.8);
        setTimeout(() => this.playNote(scale[4], 0.035, 0.6), 80);
    }

    playRealmTrans(): void {
        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        [5, 4, 2, 0, 2, 4, 5].forEach((n, i) => {
            setTimeout(() => this.playNote(scale[n % scale.length], 0.04, 1), i * 70);
        });
    }

    playAchievement(): void {
        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        [0, 2, 4, 7, 4, 5].forEach((n, i) => {
            setTimeout(() => this.playNote(scale[n % scale.length], 0.05, 0.8), i * 90);
        });
    }

    playQuestComplete(): void {
        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        [4, 5, 7].forEach((n, i) => {
            setTimeout(() => this.playNote(scale[n % scale.length], 0.04, 0.6), i * 100);
        });
    }

    /**
     * Play star ignition sound with pitch based on ignition count (inspiration: Echo Garden)
     */
    playStarIgnite(ignitionCount: number = 1): void {
        if (!this.ctx || !this.settings.music || !this.master) return;

        // Base frequency increases with popularity
        const baseFreq = 400 + (ignitionCount * 40);
        const vol = 0.04 + Math.min(ignitionCount * 0.01, 0.06);

        // Play a bright, satisfying tone
        this.playNote(baseFreq, vol, 1.5);
        setTimeout(() => this.playNote(baseFreq * 1.5, vol * 0.7, 1.2), 50);
        setTimeout(() => this.playNote(baseFreq * 2, vol * 0.5, 0.9), 120);
    }

    /**
     * Play ambient sparkle tones for atmosphere (inspiration: Echo Garden)
     */
    playAmbientSparkle(): void {
        if (!this.ctx || !this.settings.music || !this.master) return;

        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        const freq = scale[Math.floor(Math.random() * scale.length)];

        // Very subtle ambient tone
        this.playNote(freq * 2, 0.015, 4);
    }

    /**
     * Play sound when bot speaks a thought
     */
    playBotWhisper(): void {
        if (!this.ctx || !this.settings.music || !this.master) return;

        const scale = SCALES[this.currentRealm] || SCALES.genesis;
        // Soft, mysterious tone for bot speech
        this.playNote(scale[0] * 0.5, 0.02, 1.2);
        setTimeout(() => this.playNote(scale[2] * 0.5, 0.018, 1.0), 100);
    }

    /**
     * Start ambient audio loop for atmosphere (call periodically)
     */
    private ambientInterval: NodeJS.Timeout | null = null;

    startAmbientLoop(): void {
        if (this.ambientInterval) return;

        this.ambientInterval = setInterval(() => {
            // Random chance to play ambient sparkle
            if (Math.random() < 0.3) {
                this.playAmbientSparkle();
            }
        }, 3000);
    }

    stopAmbientLoop(): void {
        if (this.ambientInterval) {
            clearInterval(this.ambientInterval);
            this.ambientInterval = null;
        }
    }
}

export { AudioManager };
