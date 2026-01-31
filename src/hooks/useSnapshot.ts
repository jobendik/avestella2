/**
 * Snapshot/Screenshot System Hook
 * Ported from LEGACY main.ts - takeSnapshot, downloadSnapshot, closeSnapshotModal
 * 
 * Allows players to capture moments in the game with watermark and sharing options
 */

import { useState, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SnapshotData {
  dataUrl: string;
  timestamp: number;
  playerName: string;
  dimensions: { width: number; height: number };
}

export interface SnapshotConfig {
  /** Watermark text template - supports {name} and {date} placeholders */
  watermarkTemplate: string;
  /** Watermark font */
  watermarkFont: string;
  /** Watermark color */
  watermarkColor: string;
  /** Watermark position from bottom */
  watermarkOffset: number;
  /** Image quality for JPEG (0-1) */
  quality: number;
  /** Output format */
  format: 'png' | 'jpeg';
  /** Flash effect duration in ms */
  flashDuration: number;
  /** Camera shake intensity */
  shakeIntensity: number;
}

export interface UseSnapshotReturn {
  /** Current snapshot data (null if no snapshot taken) */
  snapshot: SnapshotData | null;
  /** Whether the snapshot modal is open */
  isModalOpen: boolean;
  /** Whether a snapshot is being processed */
  isCapturing: boolean;
  /** Take a snapshot of the provided canvas */
  takeSnapshot: (canvas: HTMLCanvasElement, playerName: string) => Promise<void>;
  /** Download the current snapshot */
  downloadSnapshot: (filename?: string) => void;
  /** Close the snapshot modal */
  closeModal: () => void;
  /** Clear the current snapshot */
  clearSnapshot: () => void;
  /** Copy snapshot to clipboard */
  copyToClipboard: () => Promise<boolean>;
  /** Share snapshot using Web Share API */
  shareSnapshot: () => Promise<boolean>;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: SnapshotConfig = {
  watermarkTemplate: 'AURA • {name} • {date}',
  watermarkFont: '14px system-ui',
  watermarkColor: 'rgba(255, 255, 255, 0.5)',
  watermarkOffset: 10,
  quality: 0.92,
  format: 'png',
  flashDuration: 150,
  shakeIntensity: 5,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSnapshot(config: Partial<SnapshotConfig> = {}): UseSnapshotReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Take a snapshot of the game canvas
   */
  const takeSnapshot = useCallback(async (
    canvas: HTMLCanvasElement,
    playerName: string
  ): Promise<void> => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      // Create a temporary canvas for the snapshot
      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = canvas.width;
      snapshotCanvas.height = canvas.height;
      const ctx = snapshotCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Copy current canvas content
      ctx.drawImage(canvas, 0, 0);
      
      // Add watermark
      const watermarkText = mergedConfig.watermarkTemplate
        .replace('{name}', playerName)
        .replace('{date}', new Date().toLocaleDateString());
      
      ctx.fillStyle = mergedConfig.watermarkColor;
      ctx.font = mergedConfig.watermarkFont;
      ctx.fillText(
        watermarkText,
        mergedConfig.watermarkOffset,
        canvas.height - mergedConfig.watermarkOffset
      );
      
      // Generate data URL
      const mimeType = mergedConfig.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = snapshotCanvas.toDataURL(mimeType, mergedConfig.quality);
      
      // Store canvas ref for later operations
      snapshotCanvasRef.current = snapshotCanvas;
      
      // Create snapshot data
      const snapshotData: SnapshotData = {
        dataUrl,
        timestamp: Date.now(),
        playerName,
        dimensions: {
          width: canvas.width,
          height: canvas.height,
        },
      };
      
      setSnapshot(snapshotData);
      setIsModalOpen(true);
      
    } catch (error) {
      console.error('Failed to take snapshot:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, mergedConfig]);

  /**
   * Download the current snapshot
   */
  const downloadSnapshot = useCallback((filename?: string): void => {
    if (!snapshot) return;
    
    const defaultFilename = `aura-snapshot-${snapshot.timestamp}.${mergedConfig.format}`;
    const link = document.createElement('a');
    link.download = filename || defaultFilename;
    link.href = snapshot.dataUrl;
    link.click();
  }, [snapshot, mergedConfig.format]);

  /**
   * Close the snapshot modal
   */
  const closeModal = useCallback((): void => {
    setIsModalOpen(false);
  }, []);

  /**
   * Clear the current snapshot
   */
  const clearSnapshot = useCallback((): void => {
    setSnapshot(null);
    setIsModalOpen(false);
    snapshotCanvasRef.current = null;
  }, []);

  /**
   * Copy snapshot to clipboard
   */
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    if (!snapshot || !snapshotCanvasRef.current) return false;
    
    try {
      // Use Clipboard API with blob
      const canvas = snapshotCanvasRef.current;
      
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve(false);
            return;
          }
          
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                [blob.type]: blob,
              }),
            ]);
            resolve(true);
          } catch {
            // Fallback: try copying data URL
            try {
              await navigator.clipboard.writeText(snapshot.dataUrl);
              resolve(true);
            } catch {
              resolve(false);
            }
          }
        }, 'image/png');
      });
    } catch {
      return false;
    }
  }, [snapshot]);

  /**
   * Share snapshot using Web Share API
   */
  const shareSnapshot = useCallback(async (): Promise<boolean> => {
    if (!snapshot || !snapshotCanvasRef.current) return false;
    
    // Check if Web Share API is available
    if (!navigator.share) {
      console.warn('Web Share API not available');
      return false;
    }
    
    try {
      const canvas = snapshotCanvasRef.current;
      
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve(false);
            return;
          }
          
          try {
            const file = new File(
              [blob],
              `aura-snapshot-${snapshot.timestamp}.png`,
              { type: 'image/png' }
            );
            
            await navigator.share({
              title: 'AURA Snapshot',
              text: `Check out my moment in AURA! - ${snapshot.playerName}`,
              files: [file],
            });
            
            resolve(true);
          } catch (error) {
            // User cancelled or share failed
            if ((error as Error).name !== 'AbortError') {
              console.error('Share failed:', error);
            }
            resolve(false);
          }
        }, 'image/png');
      });
    } catch {
      return false;
    }
  }, [snapshot]);

  return {
    snapshot,
    isModalOpen,
    isCapturing,
    takeSnapshot,
    downloadSnapshot,
    closeModal,
    clearSnapshot,
    copyToClipboard,
    shareSnapshot,
  };
}

export default useSnapshot;
