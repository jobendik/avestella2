import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
// import { useVoice } from '@/hooks/useVoice'; // Assuming we can import this or use context if it was in GameContext

// Simple visualizer that renders bars based on audio amplitude
export const VoiceVisualizer: React.FC = () => {
    // Since useVoice is a hook and not in GameContext directly in some versions, 
    // we might need to rely on what's available. 
    // However, for this visual component, we'll assume it receives a stream or we mock it for now 
    // until we connect it to the actual VoiceContext/State.

    // If useVoice is not globally available, we might need to pass this component into where useVoice is used.
    // But typically it should be in a context.

    // For now, let's create a visual placeholder that reacts to "simulated" voice or attempts to read from GameContext if possible.
    // Legacy feature description: "Verify 'Voice Visualization' (amplitude bars) exists."

    const { voice } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const animate = () => {
            animationId = requestAnimationFrame(animate);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const analyser = voice.analyser;
            // Only visualise if active and not muted (unless we want to show input while muted? Usually no.)
            // But for PTT, we might want to show input even if muted to show "mic is working"?
            // Let's show input if voice is active, regardless of mute, so user sees level.

            if (voice.isVoiceActive && analyser) {
                if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount) {
                    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as any;
                }
                analyser.getByteFrequencyData(dataArrayRef.current as any);
            } else {
                // Clear or show flat line
                // dataArrayRef.current?.fill(0);
                // If not active, show idle visual?
            }

            const bars = 5;
            const spacing = 4;
            const barWidth = (canvas.width - (spacing * (bars - 1))) / bars;

            // Visual feedback: Green if active/talking, Red/Dim if muted but active on network?
            // Actually, if muted, we are sending silence. 
            // If we want to show "Mic Input", we read the analyser. 
            // If "Muted", maybe make bars gray?
            ctx.fillStyle = voice.isMuted ? '#94a3b8' : '#4ade80';

            for (let i = 0; i < bars; i++) {
                let value = 0;

                if (dataArrayRef.current) {
                    // Average a chunk of frequencies for each bar
                    const binSize = Math.floor(dataArrayRef.current.length / bars);
                    let sum = 0;
                    for (let j = 0; j < binSize; j++) {
                        sum += dataArrayRef.current[i * binSize + j];
                    }
                    value = sum / binSize;
                }

                // Map 0-255 to height 4-canvas.height
                // Add some noise if purely empty to look "alive" but very subtle? No, accurate is better.
                // If inactive, just small dots.

                const percent = value / 255;
                const height = Math.max(2, percent * canvas.height);

                const x = i * (barWidth + spacing);
                const y = canvas.height - height;

                ctx.fillRect(x, y, barWidth, height);
            }
        };

        animate();

        return () => cancelAnimationFrame(animationId);
    }, [voice.isVoiceActive, voice.analyser, voice.isMuted]);

    if (!voice.isVoiceActive) return null; // Don't show if voice not started

    return (
        <div className="fixed bottom-24 right-4 z-40 bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/10">
            <div className="text-[10px] text-slate-400 mb-1 font-bold tracking-wider">VOICE</div>
            <canvas ref={canvasRef} width={60} height={20} />
        </div>
    );
};
