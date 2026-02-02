export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.bgMusic = null;
        this.isStarted = false;
    }

    async start() {
        if (typeof window === 'undefined') return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = 0.5;
        }

        if (this.ctx.state === 'suspended') await this.ctx.resume();
        if (this.isStarted) return;
        this.isStarted = true;

        try {
            this.bgMusic = new Audio('/music.mp3');
            this.bgMusic.loop = true;
            this.bgMusic.volume = 0.15; // Lowered to 30% as requested

            // Connect to Web Audio API graph for master volume control
            const source = this.ctx.createMediaElementSource(this.bgMusic);
            source.connect(this.masterGain);

            await this.bgMusic.play();
        } catch (e) {
            console.warn("Audio start failed:", e);
        }
    }

    // Deprecated: procedural sound methods removed
    updateMovementHum(speed) { }
    setEnvironment(type) { }

    playBloom() {
        if (!this.ctx) return;
        const freqs = [261.63, 329.63, 392.00, 523.25];
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.1 + (i * 0.05));
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 4);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + 5);
        });
    }

    playSnap() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playCollect() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playSpark() {
        if (!this.ctx) return;
        const freqs = [600, 800, 1200];
        freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const delay = i * 0.04;
            gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + delay + 0.02);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + delay + 0.2);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + 0.25);
        });
    }

    playProximity(intensity = 0.5, pitch = 440) {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = pitch;
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(intensity * 0.1, this.ctx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + 0.35);
        } catch (e) { }
    }

    playChime() {
        if (!this.ctx) return;
        const freqs = [523, 659, 784];
        freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const delay = i * 0.1;
            gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + 1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + 1.1);
        });
    }
}
