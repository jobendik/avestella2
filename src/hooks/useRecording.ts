// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Recording Hook (TypeScript)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, RefObject } from 'react';

export interface UseRecordingOptions {
    canvasRef: RefObject<HTMLCanvasElement>;
    onToast?: (message: string) => void;
    onTrackEvent?: (event: string, data?: Record<string, unknown>) => void;
}

export interface UseRecordingReturn {
    isRecording: boolean;
    recordedChunks: Blob[];
    startBackgroundRecording: () => void;
    stopBackgroundRecording: () => void;
    saveReplay: () => void;
}

export function useRecording(options: UseRecordingOptions): UseRecordingReturn {
    const { canvasRef, onToast, onTrackEvent } = options;

    const [isRecording, setIsRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startBackgroundRecording = useCallback(() => {
        if (!canvasRef.current || isRecording) return;

        try {
            const stream = canvasRef.current.captureStream(30); // 30fps
            const recorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 2500000
            });

            chunksRef.current = [];

            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    // Keep only last 30 seconds (approximately)
                    // At 30fps with chunks every 100ms, 30 seconds = 300 chunks
                    if (chunksRef.current.length > 300) {
                        chunksRef.current.shift();
                    }
                }
            };

            recorder.onstart = () => {
                setIsRecording(true);
                onTrackEvent?.('video_recording_started');
            };

            recorder.onerror = () => {
                setIsRecording(false);
            };

            mediaRecorderRef.current = recorder;
            recorder.start(100); // Capture chunks every 100ms

            // Update state periodically for saving
            recordingTimerRef.current = setInterval(() => {
                setRecordedChunks([...chunksRef.current]);
            }, 1000);

        } catch (error) {
            console.error('Failed to start recording:', error);
            onToast?.('❌ Recording not supported in this browser');
        }
    }, [canvasRef, isRecording, onTrackEvent, onToast]);

    const stopBackgroundRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            onTrackEvent?.('video_recording_stopped');

            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    }, [isRecording, onTrackEvent]);

    const saveReplay = useCallback(() => {
        if (chunksRef.current.length === 0) {
            onToast?.('❌ No replay available');
            return;
        }

        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `avestella_moment_${Date.now()}.webm`;
        link.click();

        URL.revokeObjectURL(url);
        onTrackEvent?.('video_shared');
        onToast?.('✨ Replay saved!');
    }, [onTrackEvent, onToast]);

    return {
        isRecording,
        recordedChunks,
        startBackgroundRecording,
        stopBackgroundRecording,
        saveReplay
    };
}
