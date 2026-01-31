import React, { useState } from 'react';
import { useUI } from '@/contexts/UIContext';
import { useMediaContext } from '@/contexts/GameContext';
import { Camera, X, Share2, Star } from 'lucide-react';

export function Gallery() {
    const { closePanel, showToast } = useUI();
    const { screenshotGallery, removeFromGallery } = useMediaContext();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    return (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-y-auto p-4 content-center flex items-center justify-center">
            <div className="max-w-4xl w-full h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Camera size={24} className="text-pink-400" />
                        Gallery ({screenshotGallery.length})
                    </h2>
                    <button
                        onClick={closePanel}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full"
                    >
                        <X size={24} className="text-white" />
                    </button>
                </div>

                {screenshotGallery.length === 0 ? (
                    <div className="text-center py-20 flex-1 flex flex-col justify-center items-center">
                        <Camera size={48} className="text-white/20 mx-auto mb-4" />
                        <p className="text-white/60">No moments captured yet</p>
                        <p className="text-white/40 text-sm mt-2">Use the <span className="text-pink-400">Capture</span> button to save your journey</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pb-20">
                        {screenshotGallery.map(screenshot => (
                            <div key={screenshot.id} className="group relative">
                                <img
                                    src={screenshot.url}
                                    alt="Moment"
                                    className="w-full aspect-square object-cover rounded-xl border-2 border-white/10 group-hover:border-white/30 transition-all cursor-pointer"
                                    onClick={() => setSelectedImage(screenshot.url)}
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
                                    <div className="text-center text-white p-4">
                                        <div className="text-xs mb-2">{new Date(screenshot.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const a = document.createElement('a');
                                            a.href = screenshot.url;
                                            a.download = `avestella-${screenshot.id}.png`;
                                            a.click();
                                            showToast('Image downloaded');
                                        }}
                                        className="p-1.5 bg-black/80 backdrop-blur-md rounded-full hover:bg-black"
                                    >
                                        <span className="text-xs">📥</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFromGallery(screenshot.id);
                                            URL.revokeObjectURL(screenshot.url);
                                        }}
                                        className="p-1.5 bg-black/80 backdrop-blur-md rounded-full hover:bg-black"
                                    >
                                        <X size={14} className="text-red-400" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4">
                    <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full z-10"
                        >
                            <X size={32} className="text-white" />
                        </button>
                        <img src={selectedImage} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    </div>
                </div>
            )}
        </div>
    );
}
