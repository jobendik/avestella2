
import { useEffect, useState, useCallback, useRef } from 'react';
import { voiceService } from '@/services/VoiceService';
import { IBond } from '@/types';

export interface UseVoiceReturn {
    isVoiceActive: boolean;
    joinVoice: () => Promise<void>;
    leaveVoice: () => void;
    peers: string[]; // Just IDs for now, as audio is handled internally
    toggleMute: () => void;
    setMuted: (muted: boolean) => void;
    isMuted: boolean;
    error: string | null;
    analyser: AnalyserNode | null;
    updateBonds: (bonds: IBond[]) => void;
    setNearbyPlayers: (playerIds: string[]) => void;
    isSpeaking: boolean;
}

export function useVoice(
    userId: string,
    activeBonds: IBond[]
): UseVoiceReturn {
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [peers, setPeers] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const activeBondsRef = useRef<IBond[]>(activeBonds);

    // Sync userId
    useEffect(() => {
        if (userId) {
            voiceService.setUserId(userId);
        }
    }, [userId]);

    // Setup Event Listeners
    useEffect(() => {
        voiceService.onConnectionStateChange = (peerId, state) => {
            if (state === 'connected') {
                setPeers(prev => prev.includes(peerId) ? prev : [...prev, peerId]);
            } else {
                setPeers(prev => prev.filter(id => id !== peerId));
            }
        };

        voiceService.onSpeakingChange = (speaking) => {
            setIsSpeaking(speaking);
        };

        // Initial peers
        setPeers(Array.from(voiceService.getConnectedPeers()));

        return () => {
            voiceService.onConnectionStateChange = null;
            voiceService.onSpeakingChange = null;
        };
    }, []);

    const joinVoice = useCallback(async () => {
        setIsVoiceActive(true);
        const success = await voiceService.init();
        if (!success) {
            setError('Failed to initialize voice service');
            setIsVoiceActive(false);
        } else {
            setError(null);
            // Initial connection check
            checkConnections();
        }
    }, []);

    const leaveVoice = useCallback(() => {
        voiceService.disable();
        setIsVoiceActive(false);
        setPeers([]);
    }, []);

    const toggleMute = useCallback(() => {
        const newState = !isMuted;
        voiceService.setMuted(newState);
        setIsMuted(newState);
    }, [isMuted]);

    const setMutedState = useCallback((muted: boolean) => {
        voiceService.setMuted(muted);
        setIsMuted(muted);
    }, []);

    const nearbyPeersRef = useRef<string[]>([]);

    /**
     * Check which peers we should be connected to based on bonds AND proximity
     */
    const checkConnections = useCallback(() => {
        if (!voiceService.enabled) return;

        const eligiblePeers = new Set<string>();

        // 1. Add Bonded Players
        activeBondsRef.current.forEach(bond => {
            if (!bond.targetId.startsWith('agent_')) {
                eligiblePeers.add(bond.targetId);
            }
        });

        // 2. Add Nearby Players (Proximity Chat)
        nearbyPeersRef.current.forEach(id => {
            eligiblePeers.add(id);
        });

        voiceService.updateNearbyPeers(eligiblePeers);
    }, []);

    const updateBonds = useCallback((bonds: IBond[]) => {
        activeBondsRef.current = bonds;
        if (isVoiceActive) {
            checkConnections();
        }
    }, [isVoiceActive, checkConnections]);

    const setNearbyPlayers = useCallback((playerIds: string[]) => {
        nearbyPeersRef.current = playerIds;
        if (isVoiceActive) {
            checkConnections();
        }
    }, [isVoiceActive, checkConnections]);

    // Initial bond sync
    useEffect(() => {
        activeBondsRef.current = activeBonds;
        if (isVoiceActive) {
            checkConnections();
        }
    }, [activeBonds, isVoiceActive, checkConnections]);

    return {
        isVoiceActive,
        joinVoice,
        leaveVoice,
        peers,
        toggleMute,
        setMuted: setMutedState,
        isMuted,
        error,
        analyser: voiceService.analyser, // Direct access to service analyser
        updateBonds,
        setNearbyPlayers,
        isSpeaking
    };
}
