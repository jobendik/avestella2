// =============================================================================
// Anchoring Service - Meditation and mindfulness system
// =============================================================================
// Handles anchoring zones, meditation sessions, and mindfulness rewards

import { EventEmitter } from 'events';
import { mongoPersistence } from './MongoPersistenceService.js';

export interface AnchoringZone {
    id: string;
    name: string;
    realm: string;
    position: { x: number; y: number };
    radius: number;
    theme: 'tranquil' | 'cosmic' | 'nature' | 'void' | 'celestial';
    minSessionDuration: number; // seconds
    maxSessionDuration: number; // seconds
    bonusMultiplier: number;
    ambientSound?: string;
    visualEffect?: string;
}

export interface MeditationSession {
    sessionId: string;
    playerId: string;
    zoneId: string;
    startTime: number;
    endTime?: number;
    duration: number; // seconds
    interrupted: boolean;
    rewards: MeditationReward;
}

export interface MeditationReward {
    xp: number;
    stardust: number;
    mindfulnessPoints: number;
    bonusesApplied: string[];
}

export interface PlayerMindfulness {
    playerId: string;
    totalMeditationTime: number; // seconds
    sessionsCompleted: number;
    longestSession: number; // seconds
    currentStreak: number;
    bestStreak: number;
    lastSessionDate: string; // YYYY-MM-DD
    mindfulnessLevel: number;
    mindfulnessXP: number;
    unlockedZones: string[];
    achievements: string[];
    dailyGoalProgress: number; // seconds
    dailyGoalTarget: number; // seconds
}

// Mindfulness level thresholds
const MINDFULNESS_LEVELS = [
    { level: 1, xpRequired: 0, title: 'Initiate', benefit: 'Access to basic zones' },
    { level: 2, xpRequired: 100, title: 'Seeker', benefit: '5% bonus stardust' },
    { level: 3, xpRequired: 300, title: 'Calm Mind', benefit: '10% bonus stardust' },
    { level: 4, xpRequired: 600, title: 'Inner Peace', benefit: 'Unlock cosmic zones' },
    { level: 5, xpRequired: 1000, title: 'Enlightened', benefit: '15% bonus stardust, 5% XP' },
    { level: 6, xpRequired: 1500, title: 'Tranquil Soul', benefit: 'Unlock nature zones' },
    { level: 7, xpRequired: 2200, title: 'Zen Master', benefit: '20% bonus stardust, 10% XP' },
    { level: 8, xpRequired: 3000, title: 'Cosmic Harmony', benefit: 'Unlock void zones' },
    { level: 9, xpRequired: 4000, title: 'Ascended', benefit: '25% bonus stardust, 15% XP' },
    { level: 10, xpRequired: 5500, title: 'Transcendent', benefit: 'Unlock celestial zones, max bonuses' },
];

// Predefined anchoring zones
const ANCHORING_ZONES: AnchoringZone[] = [
    // Genesis Realm
    { id: 'genesis_meadow', name: 'Peaceful Meadow', realm: 'genesis', position: { x: 0, y: 0 }, radius: 100, theme: 'nature', minSessionDuration: 60, maxSessionDuration: 600, bonusMultiplier: 1.0 },
    { id: 'genesis_garden', name: 'Starlight Garden', realm: 'genesis', position: { x: 500, y: 300 }, radius: 80, theme: 'tranquil', minSessionDuration: 60, maxSessionDuration: 600, bonusMultiplier: 1.1 },
    
    // Nebula Realm
    { id: 'nebula_cloud', name: 'Nebula Drift', realm: 'nebula', position: { x: -200, y: 400 }, radius: 120, theme: 'cosmic', minSessionDuration: 90, maxSessionDuration: 900, bonusMultiplier: 1.2 },
    { id: 'nebula_heart', name: 'Heart of Nebula', realm: 'nebula', position: { x: 800, y: -100 }, radius: 100, theme: 'cosmic', minSessionDuration: 120, maxSessionDuration: 1200, bonusMultiplier: 1.4 },
    
    // Void Realm
    { id: 'void_stillness', name: 'Void Stillness', realm: 'void', position: { x: 0, y: 0 }, radius: 150, theme: 'void', minSessionDuration: 120, maxSessionDuration: 1800, bonusMultiplier: 1.5 },
    { id: 'void_abyss', name: 'Tranquil Abyss', realm: 'void', position: { x: -600, y: 200 }, radius: 100, theme: 'void', minSessionDuration: 180, maxSessionDuration: 1800, bonusMultiplier: 1.8 },
    
    // Starforge Realm
    { id: 'starforge_core', name: 'Stellar Core', realm: 'starforge', position: { x: 300, y: 300 }, radius: 90, theme: 'celestial', minSessionDuration: 90, maxSessionDuration: 900, bonusMultiplier: 1.3 },
    
    // Sanctuary Realm
    { id: 'sanctuary_temple', name: 'Ancient Temple', realm: 'sanctuary', position: { x: 0, y: 0 }, radius: 200, theme: 'tranquil', minSessionDuration: 60, maxSessionDuration: 1200, bonusMultiplier: 1.6 },
    { id: 'sanctuary_pool', name: 'Reflection Pool', realm: 'sanctuary', position: { x: 400, y: -200 }, radius: 80, theme: 'tranquil', minSessionDuration: 60, maxSessionDuration: 600, bonusMultiplier: 1.4 },
];

// Build lookup maps
const ZONE_MAP = new Map<string, AnchoringZone>();
ANCHORING_ZONES.forEach(zone => ZONE_MAP.set(zone.id, zone));

class AnchoringService extends EventEmitter {
    private playerMindfulness: Map<string, PlayerMindfulness> = new Map();
    private activeSessions: Map<string, MeditationSession> = new Map();

    async initialize(): Promise<void> {
        console.log('🧘 Anchoring Service initializing...');
        console.log(`🧘 Loaded ${ANCHORING_ZONES.length} anchoring zones`);
        console.log('🧘 Anchoring Service initialized');
    }

    // =========================================================================
    // Zone Operations
    // =========================================================================

    getAllZones(): AnchoringZone[] {
        return ANCHORING_ZONES;
    }

    getZonesByRealm(realm: string): AnchoringZone[] {
        return ANCHORING_ZONES.filter(zone => zone.realm === realm);
    }

    getZone(zoneId: string): AnchoringZone | null {
        return ZONE_MAP.get(zoneId) || null;
    }

    async getAccessibleZones(playerId: string): Promise<AnchoringZone[]> {
        const mindfulness = await this.getPlayerMindfulness(playerId);
        const level = mindfulness.mindfulnessLevel;
        
        return ANCHORING_ZONES.filter(zone => {
            // Basic zones always accessible
            if (zone.theme === 'tranquil' || zone.theme === 'nature') return true;
            // Cosmic zones at level 4+
            if (zone.theme === 'cosmic') return level >= 4;
            // Void zones at level 8+
            if (zone.theme === 'void') return level >= 8;
            // Celestial zones at level 10
            if (zone.theme === 'celestial') return level >= 10;
            return true;
        });
    }

    isInZone(position: { x: number; y: number }, zone: AnchoringZone): boolean {
        const dx = position.x - zone.position.x;
        const dy = position.y - zone.position.y;
        return Math.sqrt(dx * dx + dy * dy) <= zone.radius;
    }

    findZoneAtPosition(position: { x: number; y: number }, realm: string): AnchoringZone | null {
        const realmZones = this.getZonesByRealm(realm);
        return realmZones.find(zone => this.isInZone(position, zone)) || null;
    }

    // =========================================================================
    // Session Management
    // =========================================================================

    async startSession(
        playerId: string,
        zoneId: string,
        position: { x: number; y: number }
    ): Promise<{
        success: boolean;
        error?: string;
        sessionId?: string;
        zone?: AnchoringZone;
    }> {
        const zone = ZONE_MAP.get(zoneId);
        if (!zone) {
            return { success: false, error: 'Zone not found' };
        }

        // Check if player is in zone
        if (!this.isInZone(position, zone)) {
            return { success: false, error: 'Not in anchoring zone' };
        }

        // Check if already in session
        if (this.activeSessions.has(playerId)) {
            return { success: false, error: 'Already in meditation session' };
        }

        // Check zone access
        const accessible = await this.getAccessibleZones(playerId);
        if (!accessible.find(z => z.id === zoneId)) {
            return { success: false, error: 'Zone not unlocked' };
        }

        const sessionId = `${playerId}-${Date.now()}`;
        const session: MeditationSession = {
            sessionId,
            playerId,
            zoneId,
            startTime: Date.now(),
            duration: 0,
            interrupted: false,
            rewards: { xp: 0, stardust: 0, mindfulnessPoints: 0, bonusesApplied: [] }
        };

        this.activeSessions.set(playerId, session);
        
        this.emit('session_started', { playerId, zoneId, sessionId });

        return { success: true, sessionId, zone };
    }

    async endSession(
        playerId: string,
        interrupted: boolean = false
    ): Promise<{
        success: boolean;
        error?: string;
        session?: MeditationSession;
    }> {
        const session = this.activeSessions.get(playerId);
        if (!session) {
            return { success: false, error: 'No active session' };
        }

        session.endTime = Date.now();
        session.duration = Math.floor((session.endTime - session.startTime) / 1000);
        session.interrupted = interrupted;

        // Calculate rewards
        const zone = ZONE_MAP.get(session.zoneId);
        if (zone && session.duration >= zone.minSessionDuration && !interrupted) {
            session.rewards = await this.calculateRewards(playerId, session, zone);
        }

        this.activeSessions.delete(playerId);

        // Update player mindfulness
        if (!interrupted) {
            await this.updatePlayerMindfulness(playerId, session);
        }

        this.emit('session_ended', { playerId, session });

        return { success: true, session };
    }

    getActiveSession(playerId: string): MeditationSession | null {
        return this.activeSessions.get(playerId) || null;
    }

    // =========================================================================
    // Rewards Calculation
    // =========================================================================

    private async calculateRewards(
        playerId: string,
        session: MeditationSession,
        zone: AnchoringZone
    ): Promise<MeditationReward> {
        const mindfulness = await this.getPlayerMindfulness(playerId);
        const levelData = MINDFULNESS_LEVELS.find(l => l.level === mindfulness.mindfulnessLevel) || MINDFULNESS_LEVELS[0];
        
        const bonusesApplied: string[] = [];
        
        // Base rewards per minute of meditation
        const minutes = Math.min(session.duration / 60, zone.maxSessionDuration / 60);
        let baseXP = Math.floor(minutes * 10);
        let baseStardust = Math.floor(minutes * 5);
        let mindfulnessPoints = Math.floor(minutes * 2);

        // Zone bonus
        baseXP = Math.floor(baseXP * zone.bonusMultiplier);
        baseStardust = Math.floor(baseStardust * zone.bonusMultiplier);
        bonusesApplied.push(`Zone: ${Math.round((zone.bonusMultiplier - 1) * 100)}%`);

        // Level bonuses
        if (mindfulness.mindfulnessLevel >= 2) {
            const stardustBonus = 0.05 * Math.min(mindfulness.mindfulnessLevel, 10);
            baseStardust = Math.floor(baseStardust * (1 + stardustBonus));
            bonusesApplied.push(`Level: +${Math.round(stardustBonus * 100)}% stardust`);
        }
        if (mindfulness.mindfulnessLevel >= 5) {
            const xpBonus = 0.05 * Math.floor((mindfulness.mindfulnessLevel - 4) / 2);
            baseXP = Math.floor(baseXP * (1 + xpBonus));
            bonusesApplied.push(`Level: +${Math.round(xpBonus * 100)}% XP`);
        }

        // Streak bonus
        if (mindfulness.currentStreak >= 3) {
            const streakBonus = Math.min(0.5, 0.1 * Math.floor(mindfulness.currentStreak / 3));
            mindfulnessPoints = Math.floor(mindfulnessPoints * (1 + streakBonus));
            bonusesApplied.push(`Streak: +${Math.round(streakBonus * 100)}%`);
        }

        return {
            xp: baseXP,
            stardust: baseStardust,
            mindfulnessPoints,
            bonusesApplied
        };
    }

    // =========================================================================
    // Player Mindfulness
    // =========================================================================

    async getPlayerMindfulness(playerId: string): Promise<PlayerMindfulness> {
        let mindfulness = this.playerMindfulness.get(playerId);
        
        if (!mindfulness) {
            // Try loading from database
            try {
                if (mongoPersistence.isReady()) {
                    const saved = await mongoPersistence.getCollection('player_mindfulness')?.findOne({ playerId });
                    if (saved) {
                        mindfulness = saved as unknown as PlayerMindfulness;
                        this.playerMindfulness.set(playerId, mindfulness);
                        return mindfulness;
                    }
                }
            } catch (error) {
                console.error('Failed to load player mindfulness:', error);
            }
            
            // Create default
            mindfulness = {
                playerId,
                totalMeditationTime: 0,
                sessionsCompleted: 0,
                longestSession: 0,
                currentStreak: 0,
                bestStreak: 0,
                lastSessionDate: '',
                mindfulnessLevel: 1,
                mindfulnessXP: 0,
                unlockedZones: ['genesis_meadow', 'genesis_garden'],
                achievements: [],
                dailyGoalProgress: 0,
                dailyGoalTarget: 300 // 5 minutes
            };
            this.playerMindfulness.set(playerId, mindfulness);
        }
        
        return mindfulness;
    }

    private async updatePlayerMindfulness(playerId: string, session: MeditationSession): Promise<void> {
        const mindfulness = await this.getPlayerMindfulness(playerId);
        const today = new Date().toISOString().split('T')[0];
        
        // Update stats
        mindfulness.totalMeditationTime += session.duration;
        mindfulness.sessionsCompleted++;
        
        if (session.duration > mindfulness.longestSession) {
            mindfulness.longestSession = session.duration;
        }

        // Update streak
        if (mindfulness.lastSessionDate === today) {
            // Same day, no streak change
        } else {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (mindfulness.lastSessionDate === yesterday) {
                mindfulness.currentStreak++;
            } else if (mindfulness.lastSessionDate !== today) {
                mindfulness.currentStreak = 1;
            }
            
            if (mindfulness.currentStreak > mindfulness.bestStreak) {
                mindfulness.bestStreak = mindfulness.currentStreak;
            }
        }
        mindfulness.lastSessionDate = today;

        // Update daily goal
        if (mindfulness.lastSessionDate === today) {
            mindfulness.dailyGoalProgress += session.duration;
        } else {
            mindfulness.dailyGoalProgress = session.duration;
        }

        // Add mindfulness XP
        mindfulness.mindfulnessXP += session.rewards.mindfulnessPoints;

        // Check level up
        const newLevel = this.calculateLevel(mindfulness.mindfulnessXP);
        if (newLevel > mindfulness.mindfulnessLevel) {
            mindfulness.mindfulnessLevel = newLevel;
            this.emit('mindfulness_level_up', { playerId, level: newLevel });
            
            // Unlock new zones
            this.unlockZonesForLevel(mindfulness, newLevel);
        }

        // Check achievements
        this.checkAchievements(mindfulness);

        await this.persistPlayerMindfulness(mindfulness);
    }

    private calculateLevel(xp: number): number {
        for (let i = MINDFULNESS_LEVELS.length - 1; i >= 0; i--) {
            if (xp >= MINDFULNESS_LEVELS[i].xpRequired) {
                return MINDFULNESS_LEVELS[i].level;
            }
        }
        return 1;
    }

    private unlockZonesForLevel(mindfulness: PlayerMindfulness, level: number): void {
        // Unlock zones based on level
        if (level >= 4) {
            if (!mindfulness.unlockedZones.includes('nebula_cloud')) {
                mindfulness.unlockedZones.push('nebula_cloud', 'nebula_heart');
            }
        }
        if (level >= 6) {
            if (!mindfulness.unlockedZones.includes('sanctuary_temple')) {
                mindfulness.unlockedZones.push('sanctuary_temple', 'sanctuary_pool');
            }
        }
        if (level >= 8) {
            if (!mindfulness.unlockedZones.includes('void_stillness')) {
                mindfulness.unlockedZones.push('void_stillness', 'void_abyss');
            }
        }
        if (level >= 10) {
            if (!mindfulness.unlockedZones.includes('starforge_core')) {
                mindfulness.unlockedZones.push('starforge_core');
            }
        }
    }

    private checkAchievements(mindfulness: PlayerMindfulness): void {
        const achievements: Array<{ id: string; condition: () => boolean }> = [
            { id: 'first_meditation', condition: () => mindfulness.sessionsCompleted >= 1 },
            { id: 'meditation_10', condition: () => mindfulness.sessionsCompleted >= 10 },
            { id: 'meditation_50', condition: () => mindfulness.sessionsCompleted >= 50 },
            { id: 'meditation_100', condition: () => mindfulness.sessionsCompleted >= 100 },
            { id: 'streak_7', condition: () => mindfulness.bestStreak >= 7 },
            { id: 'streak_30', condition: () => mindfulness.bestStreak >= 30 },
            { id: 'long_session', condition: () => mindfulness.longestSession >= 600 },
            { id: 'zen_hour', condition: () => mindfulness.longestSession >= 3600 },
            { id: 'hour_total', condition: () => mindfulness.totalMeditationTime >= 3600 },
            { id: 'day_total', condition: () => mindfulness.totalMeditationTime >= 86400 },
        ];

        for (const ach of achievements) {
            if (!mindfulness.achievements.includes(ach.id) && ach.condition()) {
                mindfulness.achievements.push(ach.id);
                this.emit('mindfulness_achievement', { playerId: mindfulness.playerId, achievementId: ach.id });
            }
        }
    }

    getLevelInfo(level: number): typeof MINDFULNESS_LEVELS[0] | null {
        return MINDFULNESS_LEVELS.find(l => l.level === level) || null;
    }

    getAllLevelInfo(): typeof MINDFULNESS_LEVELS {
        return MINDFULNESS_LEVELS;
    }

    // =========================================================================
    // Daily Goals
    // =========================================================================

    async getDailyProgress(playerId: string): Promise<{
        progress: number;
        target: number;
        percentage: number;
        completed: boolean;
    }> {
        const mindfulness = await this.getPlayerMindfulness(playerId);
        const today = new Date().toISOString().split('T')[0];
        
        const progress = mindfulness.lastSessionDate === today ? mindfulness.dailyGoalProgress : 0;
        
        return {
            progress,
            target: mindfulness.dailyGoalTarget,
            percentage: Math.min(100, Math.round((progress / mindfulness.dailyGoalTarget) * 100)),
            completed: progress >= mindfulness.dailyGoalTarget
        };
    }

    async setDailyGoal(playerId: string, targetSeconds: number): Promise<void> {
        const mindfulness = await this.getPlayerMindfulness(playerId);
        mindfulness.dailyGoalTarget = Math.max(60, Math.min(3600, targetSeconds)); // 1 min to 1 hour
        await this.persistPlayerMindfulness(mindfulness);
    }

    // =========================================================================
    // Persistence
    // =========================================================================

    private async persistPlayerMindfulness(mindfulness: PlayerMindfulness): Promise<void> {
        try {
            if (mongoPersistence.isReady()) {
                await mongoPersistence.getCollection('player_mindfulness')?.updateOne(
                    { playerId: mindfulness.playerId },
                    { $set: mindfulness },
                    { upsert: true }
                );
            }
        } catch (error) {
            console.error('Failed to persist player mindfulness:', error);
        }
    }
}

export const anchoringService = new AnchoringService();
export { AnchoringService };
