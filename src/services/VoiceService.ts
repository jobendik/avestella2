import { gameClient } from './GameClient';

// Signal sender function type
export type SignalSender = (targetId: string, signalType: string, data: any) => void;

interface VoiceSettings {
    volume: number;
    ptt: boolean;
    vad: boolean | number;
    sensitivity?: number;
}

export class VoiceService {
    private static instance: VoiceService;

    enabled: boolean = false;
    localStream: MediaStream | null = null;
    audioContext: AudioContext | null = null;
    analyser: AnalyserNode | null = null;
    peers: Map<string, RTCPeerConnection> = new Map();
    gains: Map<string, GainNode> = new Map();
    audioElements: Map<string, HTMLAudioElement> = new Map();
    isSpeaking: boolean = false;
    isPTTActive: boolean = false;
    vadThreshold: number = 0.02;
    userId: string = '';

    // Default settings
    private settings: VoiceSettings = {
        volume: 0.8,
        ptt: false,
        vad: true,
        sensitivity: 0.5
    };

    onConnectionStateChange: ((peerId: string, state: 'connected' | 'disconnected' | 'failed') => void) | null = null;
    onSpeakingChange: ((speaking: boolean) => void) | null = null;
    onVolumeUpdate: ((level: number) => void) | null = null;

    private constructor() {
        // Private constructor for singleton
        // Bind to game client events
        gameClient.on('voice_signal', (data: any) => {
            this.handleSignal(data);
        });
    }

    public static getInstance(): VoiceService {
        if (!VoiceService.instance) {
            VoiceService.instance = new VoiceService();
        }
        return VoiceService.instance;
    }

    setUserId(id: string): void {
        this.userId = id;
    }

    updateSettings(newSettings: Partial<VoiceSettings>): void {
        this.settings = { ...this.settings, ...newSettings };

        // Apply settings immediately where possible
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                // If muted via PTT logic
                if (this.settings.ptt) {
                    track.enabled = this.isPTTActive;
                } else {
                    track.enabled = !this.isMuted;
                }
            });
        }
    }

    canSpeak: boolean = false;

    async init(): Promise<boolean> {
        try {
            // enhancing the audio context with user interaction
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                const source = this.audioContext.createMediaStreamSource(this.localStream);
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                source.connect(this.analyser);

                // Enable/disable audio based on PTT setting
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = !this.settings.ptt;
                });

                this.canSpeak = true;
                this.startVAD();
            } catch (err) {
                console.warn('Microphone access denied or unavailable - starting in Listen Only mode', err);
                this.canSpeak = false;
                this.localStream = null;
            }

            this.enabled = true;

            // Ensure context is running (mobile often needs this resumed)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            return true;
        } catch (e) {
            console.error('Voice system init failed completely:', e);
            return false;
        }
    }

    startVAD(): void {
        if (!this.analyser) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const check = () => {
            if (!this.enabled || !this.analyser) return;

            this.analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b) / dataArray.length / 255;
            const threshold = this.vadThreshold * (1 + (1 - (this.settings.sensitivity || 0.5)));

            const wasSpeaking = this.isSpeaking;

            if (this.settings.ptt) {
                this.isSpeaking = this.isPTTActive && avg > threshold * 0.5;
            } else if (this.settings.vad !== false) {
                this.isSpeaking = avg > threshold;
            }

            if (this.isSpeaking !== wasSpeaking) {
                this.onSpeakingChange?.(this.isSpeaking);
                gameClient.setSpeaking(this.isSpeaking);
            }

            this.onVolumeUpdate?.(avg);
            requestAnimationFrame(check);
        };
        check();
    }

    isMuted: boolean = false;

    setMuted(muted: boolean): void {
        this.isMuted = muted;
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !muted && (!this.settings.ptt || this.isPTTActive);
            });
        }
    }

    setPTT(active: boolean): void {
        this.isPTTActive = active;
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                // Audio enabled only if: NOT muted AND (NOT PTT mode OR PTT is active)
                track.enabled = !this.isMuted && (!this.settings.ptt || active);
            });
        }
    }

    async connectToPeer(peerId: string): Promise<RTCPeerConnection | null> {
        if (!this.enabled || this.peers.has(peerId)) return null;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
        } else {
            // If we have no mic, we must explicitly add a transceiver to tell the other side we want to receive audio
            pc.addTransceiver('audio', { direction: 'recvonly' });
        }

        pc.ontrack = (event) => {
            console.log(`🎙️ Received audio track from ${peerId}`);
            // Clean up existing audio element if any
            const existingAudio = this.audioElements.get(peerId);
            if (existingAudio) {
                existingAudio.srcObject = null;
                existingAudio.remove();
            }

            const audio = document.createElement('audio');
            audio.srcObject = event.streams[0];
            audio.autoplay = true;
            audio.muted = true; // Mute hidden element, let AudioContext handle output
            (audio as any).playsInline = true; // iOS requirement
            this.audioElements.set(peerId, audio); // Track for cleanup

            // Keep the audio graph alive
            audio.play().catch(e => console.warn('Audio play failed:', e));

            if (this.audioContext) {
                const source = this.audioContext.createMediaStreamSource(event.streams[0]);
                const gain = this.audioContext.createGain();
                gain.gain.value = 1;
                source.connect(gain);
                gain.connect(this.audioContext.destination);
                this.gains.set(peerId, gain);

                // Set initial volume if we have distance info? 
                // For now defaults to full volume, updateSpatialAudio will adjust it
            }
        };

        pc.oniceconnectionstatechange = () => {
            // console.log(`🧊 ICE State (${peerId}): ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                this.onConnectionStateChange?.(peerId, 'disconnected');
            } else if (pc.iceConnectionState === 'connected') {
                this.onConnectionStateChange?.(peerId, 'connected');
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                gameClient.sendVoiceSignal(peerId, 'ice', { candidate: event.candidate.toJSON() });
            }
        };

        this.peers.set(peerId, pc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        gameClient.sendVoiceSignal(peerId, 'offer', { sdp: offer.sdp });

        return pc;
    }

    async handleSignal(signal: { fromId?: string; fromName?: string; signalType: string; signalData: any }): Promise<void> {
        if (!this.enabled) return;

        const { fromId, signalType, signalData } = signal;
        if (!fromId) return; // Should not happen based on server logic

        // Use 'fromId' as the peer identifier
        const from = fromId;

        if (signalType === 'offer') {
            let pc = this.peers.get(from);
            if (!pc) {
                pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => pc!.addTrack(track, this.localStream!));
                } else {
                    pc!.addTransceiver('audio', { direction: 'recvonly' });
                }

                pc.ontrack = (event) => {
                    console.log(`🎙️ Received audio track from ${from} (Answerer)`);
                    // Clean up existing audio element if any
                    const existingAudio = this.audioElements.get(from);
                    if (existingAudio) {
                        existingAudio.srcObject = null;
                        existingAudio.remove();
                    }

                    const audio = document.createElement('audio');
                    audio.srcObject = event.streams[0];
                    audio.autoplay = true;
                    audio.muted = true; // Mute hidden element, let AudioContext handle output
                    (audio as any).playsInline = true; // iOS requirement
                    this.audioElements.set(from, audio); // Track for cleanup

                    audio.play().catch(e => console.warn('Audio play failed:', e));

                    if (this.audioContext) {
                        const source = this.audioContext.createMediaStreamSource(event.streams[0]);
                        const gain = this.audioContext.createGain();
                        source.connect(gain);
                        gain.connect(this.audioContext.destination);
                        this.gains.set(from, gain);
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    const peerConnection = this.peers.get(from);
                    if (!peerConnection) return;

                    // console.log(`🧊 ICE State (${from}): ${peerConnection.iceConnectionState}`);
                    if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'disconnected') {
                        this.onConnectionStateChange?.(from, 'disconnected');
                    } else if (peerConnection.iceConnectionState === 'connected') {
                        this.onConnectionStateChange?.(from, 'connected');
                    }
                };

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        gameClient.sendVoiceSignal(from, 'ice', { candidate: event.candidate.toJSON() });
                    }
                };

                this.peers.set(from, pc);
            }

            await pc.setRemoteDescription({ type: 'offer', sdp: signalData.sdp });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            gameClient.sendVoiceSignal(from, 'answer', { sdp: answer.sdp });

        } else if (signalType === 'answer') {
            const pc = this.peers.get(from);
            if (pc && pc.signalingState !== 'stable') {
                await pc.setRemoteDescription({ type: 'answer', sdp: signalData.sdp });
            }
        } else if (signalType === 'ice' && signalData.candidate) {
            const pc = this.peers.get(from);
            if (pc) {
                try {
                    await pc.addIceCandidate(signalData.candidate);
                } catch (e) {
                    console.warn('ICE candidate error:', e);
                }
            }
        }
    }

    updateSpatialAudio(peerId: string, distance: number, maxDistance: number): void {
        const gain = this.gains.get(peerId);
        if (!gain || !this.audioContext) return;

        let volume = Math.max(0, 1 - Math.pow(distance / maxDistance, 0.8));
        volume *= this.settings.volume || 0.7;

        gain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
    }

    disconnectPeer(peerId: string): void {
        const pc = this.peers.get(peerId);
        if (pc) {
            pc.close();
            this.peers.delete(peerId);
        }
        this.gains.delete(peerId);

        // Clean up audio element to prevent memory leak
        const audio = this.audioElements.get(peerId);
        if (audio) {
            audio.srcObject = null;
            audio.remove();
            this.audioElements.delete(peerId);
        }
    }

    /**
     * Update voice connections based on nearby players
     * Call this periodically with the list of nearby player IDs
     */
    updateNearbyPeers(nearbyPlayerIds: Set<string>): void {
        if (!this.enabled) return;

        // Connect to new nearby players
        for (const peerId of nearbyPlayerIds) {
            if (peerId === this.userId) continue;
            if (!this.peers.has(peerId)) {
                console.log(`🎙️ Initiating voice connection to ${peerId}`);
                this.connectToPeer(peerId);
            }
        }

        // Disconnect from players no longer nearby
        for (const peerId of this.peers.keys()) {
            if (!nearbyPlayerIds.has(peerId)) {
                console.log(`🔇 Disconnecting voice from ${peerId}`);
                this.disconnectPeer(peerId);
            }
        }
    }

    /**
     * Get set of connected peer IDs
     */
    getConnectedPeers(): Set<string> {
        return new Set(this.peers.keys());
    }

    disable(): void {
        this.enabled = false;
        this.isSpeaking = false;

        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }

        this.peers.forEach(pc => pc.close());
        this.peers.clear();
        this.gains.clear();

        // Clean up all audio elements to prevent memory leaks
        this.audioElements.forEach(audio => {
            audio.srcObject = null;
            audio.remove();
        });
        this.audioElements.clear();
    }
}

export const voiceService = VoiceService.getInstance();
