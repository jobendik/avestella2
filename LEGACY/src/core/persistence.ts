// Persistence system for settings and progress
import type { Settings, Stats, DailyProgress, WeeklyProgress } from '../types';

export class PersistenceManager {
    private static readonly SETTINGS_KEY = 'aura_settings';
    private static readonly STATS_KEY = 'aura_stats';
    private static readonly DAILY_KEY = 'aura_daily';
    private static readonly WEEKLY_KEY = 'aura_weekly';
    private static readonly ACHIEVEMENTS_KEY = 'aura_achievements';
    private static readonly FRIENDS_KEY = 'aura_friends';
    private static readonly VISITED_REALMS_KEY = 'aura_visited_realms';
    private static readonly RECENT_KEY = 'aura_recent';
    private static readonly PLAYER_KEY = 'aura_player';

    /**
     * Save settings to localStorage
     */
    static saveSettings(settings: Settings): void {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    /**
     * Load settings from localStorage
     */
    static loadSettings(): Partial<Settings> {
        try {
            const saved = localStorage.getItem(this.SETTINGS_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        return {};
    }

    /**
     * Save player stats
     */
    static saveStats(stats: Stats): void {
        try {
            localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to save stats:', e);
        }
    }

    /**
     * Load player stats
     */
    static loadStats(): Partial<Stats> {
        try {
            const saved = localStorage.getItem(this.STATS_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load stats:', e);
        }
        return {};
    }

    /**
     * Save daily progress
     */
    static saveDailyProgress(progress: DailyProgress): void {
        try {
            localStorage.setItem(this.DAILY_KEY, JSON.stringify(progress));
        } catch (e) {
            console.error('Failed to save daily progress:', e);
        }
    }

    /**
     * Load daily progress (with auto-reset if new day)
     */
    static loadDailyProgress(): DailyProgress {
        try {
            const saved = localStorage.getItem(this.DAILY_KEY);
            if (saved) {
                const progress = JSON.parse(saved);
                const today = new Date().toDateString();

                // Auto-reset if it's a new day
                if (progress.date === today) {
                    return progress;
                }
            }
        } catch (e) {
            console.error('Failed to load daily progress:', e);
        }

        // Return fresh daily progress
        return {
            date: new Date().toDateString(),
            whispers: 0,
            stars: 0,
            connections: 0,
            sings: 0,
            emotes: 0
        };
    }

    /**
     * Save unlocked achievements
     */
    static saveAchievements(achievements: Set<string>): void {
        try {
            localStorage.setItem(this.ACHIEVEMENTS_KEY, JSON.stringify([...achievements]));
        } catch (e) {
            console.error('Failed to save achievements:', e);
        }
    }

    /**
     * Load unlocked achievements
     */
    static loadAchievements(): Set<string> {
        try {
            const saved = localStorage.getItem(this.ACHIEVEMENTS_KEY);
            if (saved) {
                return new Set(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load achievements:', e);
        }
        return new Set();
    }

    /**
     * Get time until daily quest reset (milliseconds until midnight)
     */
    static getTimeUntilReset(): number {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime() - now.getTime();
    }

    /**
     * Format time as HH:MM:SS
     */
    static formatTime(ms: number): string {
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Check if daily reset is needed and return fresh progress if so
     */
    static checkDailyReset(currentProgress: DailyProgress): DailyProgress {
        const today = new Date().toDateString();
        if (currentProgress.date !== today) {
            return {
                date: today,
                whispers: 0,
                stars: 0,
                connections: 0,
                sings: 0,
                emotes: 0
            };
        }
        return currentProgress;
    }

    // ============================================
    // WEEKLY PROGRESS
    // ============================================

    /**
     * Get current week number
     */
    static getWeekNumber(): number {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }

    /**
     * Save weekly progress
     */
    static saveWeeklyProgress(progress: WeeklyProgress): void {
        try {
            localStorage.setItem(this.WEEKLY_KEY, JSON.stringify(progress));
        } catch (e) {
            console.error('Failed to save weekly progress:', e);
        }
    }

    /**
     * Load weekly progress (with auto-reset if new week)
     */
    static loadWeeklyProgress(): WeeklyProgress {
        try {
            const saved = localStorage.getItem(this.WEEKLY_KEY);
            if (saved) {
                const progress = JSON.parse(saved);
                const currentWeek = this.getWeekNumber();
                if (progress.week === currentWeek) {
                    return progress;
                }
            }
        } catch (e) {
            console.error('Failed to load weekly progress:', e);
        }
        return {
            week: this.getWeekNumber(),
            whispers: 0,
            stars: 0,
            newFriends: 0,
            realmChanges: 0
        };
    }

    // ============================================
    // FRIENDS SYSTEM
    // ============================================

    /**
     * Save friends list
     */
    static saveFriends(friends: Set<string>): void {
        try {
            localStorage.setItem(this.FRIENDS_KEY, JSON.stringify([...friends]));
        } catch (e) {
            console.error('Failed to save friends:', e);
        }
    }

    /**
     * Load friends list
     */
    static loadFriends(): Set<string> {
        try {
            const saved = localStorage.getItem(this.FRIENDS_KEY);
            if (saved) {
                return new Set(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load friends:', e);
        }
        return new Set();
    }

    // ============================================
    // VISITED REALMS
    // ============================================

    /**
     * Save visited realms
     */
    static saveVisitedRealms(realms: Set<string>): void {
        try {
            localStorage.setItem(this.VISITED_REALMS_KEY, JSON.stringify([...realms]));
        } catch (e) {
            console.error('Failed to save visited realms:', e);
        }
    }

    /**
     * Load visited realms
     */
    static loadVisitedRealms(): Set<string> {
        try {
            const saved = localStorage.getItem(this.VISITED_REALMS_KEY);
            if (saved) {
                return new Set(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load visited realms:', e);
        }
        return new Set(['genesis']);
    }

    // ============================================
    // RECENT PLAYERS
    // ============================================

    /**
     * Save recent players
     */
    static saveRecent(recent: Map<string, any>): void {
        try {
            const arr = [...recent.entries()].slice(-20); // Keep last 20
            localStorage.setItem(this.RECENT_KEY, JSON.stringify(arr));
        } catch (e) {
            console.error('Failed to save recent:', e);
        }
    }

    /**
     * Load recent players
     */
    static loadRecent(): Map<string, any> {
        try {
            const saved = localStorage.getItem(this.RECENT_KEY);
            if (saved) {
                return new Map(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load recent:', e);
        }
        return new Map();
    }

    // ============================================
    // PLAYER DATA
    // ============================================

    /**
     * Save player data (name, xp, stars, echoes)
     */
    static savePlayerData(data: { name: string; xp: number; stars: number; echoes: number }): void {
        try {
            localStorage.setItem(this.PLAYER_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save player data:', e);
        }
    }

    /**
     * Load player data
     */
    static loadPlayerData(): { name: string; xp: number; stars: number; echoes: number } | null {
        try {
            const saved = localStorage.getItem(this.PLAYER_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load player data:', e);
        }
        return null;
    }

    /**
     * Get time until weekly quest reset (milliseconds until Monday midnight)
     */
    static getTimeUntilWeeklyReset(): number {
        const now = new Date();
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
        nextMonday.setHours(0, 0, 0, 0);
        return nextMonday.getTime() - now.getTime();
    }
}
