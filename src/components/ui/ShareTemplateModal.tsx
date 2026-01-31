// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Share Template Modal
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { X, Copy, Twitter, Facebook, Share2, Check, Image } from 'lucide-react';
import {
    SHARE_TEMPLATES,
    ShareTemplate,
    formatShareText,
    shareContent,
    getTemplatesByCategory
} from '@/constants/shareTemplates';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ShareTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl?: string;
    defaultCategory?: ShareTemplate['category'];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ShareTemplateModal({
    isOpen,
    onClose,
    imageUrl,
    defaultCategory = 'screenshot'
}: ShareTemplateModalProps): JSX.Element | null {
    const [selectedTemplate, setSelectedTemplate] = useState<ShareTemplate | null>(null);
    const [customText, setCustomText] = useState('');
    const [includeHashtags, setIncludeHashtags] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeCategory, setActiveCategory] = useState<ShareTemplate['category']>(defaultCategory);

    const categories: { id: ShareTemplate['category']; label: string; icon: string }[] = [
        { id: 'screenshot', label: 'Screenshots', icon: '📸' },
        { id: 'achievement', label: 'Achievements', icon: '🏆' },
        { id: 'milestone', label: 'Milestones', icon: '🎯' },
        { id: 'social', label: 'Social', icon: '👋' }
    ];

    const filteredTemplates = useMemo(() =>
        getTemplatesByCategory(activeCategory),
        [activeCategory]
    );

    const previewText = useMemo(() => {
        if (!selectedTemplate) return '';
        return formatShareText(selectedTemplate, customText || undefined, includeHashtags);
    }, [selectedTemplate, customText, includeHashtags]);

    const handleShare = async (platform: 'twitter' | 'facebook' | 'copy' | 'native') => {
        if (!selectedTemplate) return;

        const success = await shareContent({
            template: selectedTemplate,
            customText: customText || undefined,
            includeHashtags,
            platform
        }, imageUrl);

        if (platform === 'copy' && success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-br from-slate-900 to-indigo-950 border-2 border-indigo-500/30 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-indigo-400 flex items-center gap-2">
                            <Share2 className="w-6 h-6" />
                            Share to Social Media
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setActiveCategory(cat.id);
                                    setSelectedTemplate(null);
                                }}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === cat.id
                                        ? 'bg-indigo-500 text-white shadow-lg'
                                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                                    }`}
                            >
                                <span className="mr-1">{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!selectedTemplate ? (
                        /* Template Grid */
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredTemplates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className="p-4 bg-white/5 border-2 border-white/10 rounded-xl hover:border-indigo-500/50 hover:bg-white/10 transition-all text-left group"
                                >
                                    <div className="text-3xl mb-2">{template.emoji}</div>
                                    <div className="text-white font-medium mb-1">{template.name}</div>
                                    <div className="text-white/50 text-xs">{template.description}</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* Template Editor */
                        <div className="space-y-6">
                            {/* Back Button */}
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                            >
                                ← Choose Different Template
                            </button>

                            {/* Selected Template Preview */}
                            <div className="flex gap-4">
                                {/* Image Preview */}
                                {imageUrl && (
                                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                                        <img
                                            src={imageUrl}
                                            alt="Share preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">{selectedTemplate.emoji}</span>
                                        <span className="text-white font-bold">{selectedTemplate.name}</span>
                                    </div>

                                    {/* Custom Text Input */}
                                    <textarea
                                        value={customText}
                                        onChange={(e) => setCustomText(e.target.value)}
                                        placeholder={selectedTemplate.text}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-indigo-500/50"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Options */}
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeHashtags}
                                        onChange={(e) => setIncludeHashtags(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/30 bg-white/10 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <span className="text-white/70 text-sm">Include hashtags</span>
                                </label>
                            </div>

                            {/* Preview */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="text-xs text-white/50 mb-2">Preview:</div>
                                <p className="text-white/80 whitespace-pre-wrap text-sm">
                                    {previewText}
                                </p>
                            </div>

                            {/* Share Buttons */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button
                                    onClick={() => handleShare('copy')}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                >
                                    {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={() => handleShare('twitter')}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-[#1DA1F2] rounded-xl transition-all"
                                >
                                    <Twitter className="w-5 h-5" />
                                    Twitter
                                </button>
                                <button
                                    onClick={() => handleShare('facebook')}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-[#4267B2]/20 hover:bg-[#4267B2]/30 text-[#4267B2] rounded-xl transition-all"
                                >
                                    <Facebook className="w-5 h-5" />
                                    Facebook
                                </button>
                                {'share' in navigator && (
                                    <button
                                        onClick={() => handleShare('native')}
                                        className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-400 rounded-xl transition-all"
                                    >
                                        <Share2 className="w-5 h-5" />
                                        Share
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ShareTemplateModal;
