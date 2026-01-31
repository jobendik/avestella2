// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Share Templates Constants
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ShareTemplate {
    id: string;
    name: string;
    description: string;
    text: string;
    hashtags: string[];
    emoji: string;
    category: 'screenshot' | 'achievement' | 'milestone' | 'social';
}

export interface ShareOptions {
    template: ShareTemplate;
    customText?: string;
    includeHashtags: boolean;
    platform: 'twitter' | 'facebook' | 'copy' | 'native';
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Categories
// ─────────────────────────────────────────────────────────────────────────────

export const SHARE_TEMPLATES: ShareTemplate[] = [
    // Screenshot Templates
    {
        id: 'screenshot_explore',
        name: 'Exploration Shot',
        description: 'Share beautiful exploration moments',
        text: 'Exploring the cosmic depths of Avestella ✨ The universe is breathtaking!',
        hashtags: ['Avestella', 'Gaming', 'CosmicExploration', 'IndieGame'],
        emoji: '🌌',
        category: 'screenshot'
    },
    {
        id: 'screenshot_beacon',
        name: 'Beacon Moment',
        description: 'Share when lighting beacons',
        text: 'Lighting up the darkness, one beacon at a time 🔥 Who else is exploring?',
        hashtags: ['Avestella', 'BeaconOfLight', 'Gaming'],
        emoji: '🔥',
        category: 'screenshot'
    },
    {
        id: 'screenshot_bond',
        name: 'Friendship Bond',
        description: 'Celebrate connections',
        text: 'Made a new cosmic connection today 💫 The bonds we forge light up the universe!',
        hashtags: ['Avestella', 'CosmicBonds', 'GamingFriends'],
        emoji: '💫',
        category: 'screenshot'
    },

    // Achievement Templates
    {
        id: 'achievement_unlock',
        name: 'Achievement Unlocked',
        description: 'Celebrate achievements',
        text: '🏆 Achievement Unlocked! Another milestone conquered in Avestella!',
        hashtags: ['Avestella', 'Achievement', 'GamingMilestone'],
        emoji: '🏆',
        category: 'achievement'
    },
    {
        id: 'achievement_challenge',
        name: 'Challenge Complete',
        description: 'Completed a challenge',
        text: '✅ Challenge completed! The cosmic grind continues 💪',
        hashtags: ['Avestella', 'ChallengeComplete', 'Gaming'],
        emoji: '✅',
        category: 'achievement'
    },
    {
        id: 'achievement_rare',
        name: 'Rare Find',
        description: 'Found something special',
        text: '✨ Just discovered something incredible in Avestella! The universe rewards the curious.',
        hashtags: ['Avestella', 'RareFind', 'Gaming', 'Discovery'],
        emoji: '✨',
        category: 'achievement'
    },

    // Milestone Templates
    {
        id: 'milestone_level',
        name: 'Level Up',
        description: 'Celebrate leveling up',
        text: '🎉 Level UP! Growing stronger in the cosmic realm!',
        hashtags: ['Avestella', 'LevelUp', 'Progress', 'Gaming'],
        emoji: '🎉',
        category: 'milestone'
    },
    {
        id: 'milestone_rank',
        name: 'Rank Achievement',
        description: 'New competitive rank',
        text: '🌟 New rank achieved! Climbing the cosmic leaderboards!',
        hashtags: ['Avestella', 'Ranked', 'Competitive', 'Gaming'],
        emoji: '🌟',
        category: 'milestone'
    },
    {
        id: 'milestone_streak',
        name: 'Streak Maintained',
        description: 'Kept a streak going',
        text: '🔥 Streak going strong! Consistency is key in the cosmos!',
        hashtags: ['Avestella', 'Streak', 'DailyGamer'],
        emoji: '🔥',
        category: 'milestone'
    },

    // Social Templates
    {
        id: 'social_invite',
        name: 'Friend Invite',
        description: 'Invite friends to play',
        text: 'Come explore the universe with me in Avestella! 🚀 The cosmos awaits!',
        hashtags: ['Avestella', 'JoinMe', 'Gaming', 'IndieGame'],
        emoji: '🚀',
        category: 'social'
    },
    {
        id: 'social_group',
        name: 'Group Adventure',
        description: 'Share group activities',
        text: 'Epic adventure with friends in Avestella! 🌠 Better together!',
        hashtags: ['Avestella', 'Squad', 'GamingFriends'],
        emoji: '🌠',
        category: 'social'
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// Share Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function getTemplatesByCategory(category: ShareTemplate['category']): ShareTemplate[] {
    return SHARE_TEMPLATES.filter(t => t.category === category);
}

export function formatShareText(template: ShareTemplate, customText?: string, includeHashtags: boolean = true): string {
    const text = customText || template.text;
    const hashtags = includeHashtags ? '\n\n' + template.hashtags.map(h => `#${h}`).join(' ') : '';
    return text + hashtags;
}

export function getShareUrl(platform: ShareOptions['platform'], text: string, url?: string): string {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url || 'https://avestella.game');

    switch (platform) {
        case 'twitter':
            return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        case 'facebook':
            return `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}&u=${encodedUrl}`;
        default:
            return '';
    }
}

export async function shareContent(options: ShareOptions, imageUrl?: string): Promise<boolean> {
    const text = formatShareText(options.template, options.customText, options.includeHashtags);

    if (options.platform === 'copy') {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    if (options.platform === 'native' && navigator.share) {
        try {
            const shareData: ShareData = {
                title: 'Avestella',
                text: text,
                url: 'https://avestella.game'
            };

            // Add image if available (not all browsers support this)
            if (imageUrl && 'canShare' in navigator) {
                try {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], 'avestella-screenshot.png', { type: 'image/png' });

                    if (navigator.canShare({ files: [file] })) {
                        shareData.files = [file];
                    }
                } catch {
                    // Ignore file sharing errors, continue without image
                }
            }

            await navigator.share(shareData);
            return true;
        } catch {
            return false;
        }
    }

    // Fallback to URL-based sharing
    const url = getShareUrl(options.platform, text);
    if (url) {
        window.open(url, '_blank', 'width=600,height=400');
        return true;
    }

    return false;
}

export default SHARE_TEMPLATES;
