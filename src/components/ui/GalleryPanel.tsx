// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Gallery Panel
// View and manage captured screenshots
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Camera, X, Share2, Download, Trash2 } from 'lucide-react';
import { useMediaContext } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';
import { Screenshot } from '@/types';
import ShareTemplateModal from './ShareTemplateModal';

export function GalleryPanel(): JSX.Element {
    const { closePanel } = useUI();
    const { screenshotGallery, removeFromGallery } = useMediaContext();
    const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareImageUrl, setShareImageUrl] = useState<string | undefined>(undefined);

    const handleDownload = (screenshot: Screenshot, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const a = document.createElement('a');
        a.href = screenshot.url;
        a.download = `avestella-${screenshot.id}.png`;
        a.click();
    };

    const handleShare = (screenshot: Screenshot, e: React.MouseEvent) => {
        e.stopPropagation();
        setShareImageUrl(screenshot.url);
        setShareModalOpen(true);
    };

    const handleDelete = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Delete this moment?')) {
            removeFromGallery(id);
            if (selectedScreenshot?.id === id) {
                setSelectedScreenshot(null);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-hidden flex flex-col items-center justify-center p-4">

            {/* Detail Modal (Lightbox) */}
            {selectedScreenshot && (
                <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                    <button
                        onClick={() => setSelectedScreenshot(null)}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white"
                    >
                        <X size={24} />
                    </button>

                    <img
                        src={selectedScreenshot.url}
                        alt="Captured Moment"
                        className="max-w-full max-h-[80vh] rounded-lg shadow-2xl border border-white/10"
                    />

                    <div className="mt-6 flex gap-4">
                        <button
                            onClick={(e) => handleDownload(selectedScreenshot, e)}
                            className="flex items-center gap-2 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-all"
                        >
                            <Download size={18} />
                            Save
                        </button>
                        <button
                            onClick={(e) => handleDelete(selectedScreenshot.id, e)}
                            className="flex items-center gap-2 px-6 py-2 bg-red-500/20 text-red-400 font-bold rounded-full hover:bg-red-500/30 transition-all"
                        >
                            <Trash2 size={18} />
                            Delete
                        </button>
                        <button
                            onClick={(e) => handleShare(selectedScreenshot, e)}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-500/20 text-indigo-400 font-bold rounded-full hover:bg-indigo-500/30 transition-all"
                        >
                            <Share2 size={18} />
                            Share
                        </button>
                    </div>

                    <div className="mt-4 text-white/50 text-sm">
                        {new Date(selectedScreenshot.date).toLocaleString()}
                    </div>
                </div>
            )}

            {/* Main Gallery View */}
            <div className="w-full max-w-6xl h-full flex flex-col">
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Camera size={32} className="text-pink-400" />
                        <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                            Moments Gallery
                        </span>
                        <span className="text-lg text-white/40 font-normal ml-2">
                            ({screenshotGallery.length})
                        </span>
                    </h2>
                    <button
                        onClick={closePanel}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all group"
                    >
                        <X size={24} className="text-white/60 group-hover:text-white" />
                    </button>
                </div>

                {screenshotGallery.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <Camera size={48} className="text-white/20" />
                        </div>
                        <h3 className="text-xl text-white font-medium mb-2">No moments captured yet</h3>
                        <p className="text-white/40 max-w-sm">
                            Explore the world and use the <span className="text-pink-400 font-medium">Capture</span> button to save beautiful moments of your journey.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-8 pr-2 custom-scrollbar">
                        {screenshotGallery.map(screenshot => (
                            <div
                                key={screenshot.id}
                                className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer hover:border-pink-500/50 transition-all"
                                onClick={() => setSelectedScreenshot(screenshot)}
                            >
                                <img
                                    src={screenshot.url}
                                    alt="Moment"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <div className="text-xs text-white/80 mb-2">
                                        {new Date(screenshot.date).toLocaleDateString()}
                                    </div>

                                    {/* Stats Badges */}
                                    <div className="flex gap-2 mb-3">
                                        {screenshot.stats.fragments > 0 && (
                                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-yellow-400 flex items-center gap-1">
                                                ✨ {screenshot.stats.fragments}
                                            </span>
                                        )}
                                        {screenshot.stats.bonds > 0 && (
                                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-pink-400 flex items-center gap-1">
                                                💖 {screenshot.stats.bonds}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2 mt-auto">
                                        <button
                                            onClick={(e) => handleDownload(screenshot, e)}
                                            className="p-2 bg-white text-black rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(screenshot.id, e)}
                                            className="p-2 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500/40 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Share Template Modal */}
            <ShareTemplateModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                imageUrl={shareImageUrl}
            />
        </div>
    );
}
