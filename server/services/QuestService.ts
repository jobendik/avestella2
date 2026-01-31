// Quest Service - Manages quests, objectives, and rewards
// Supports daily, weekly, story, and event quests

import mongoose, { Schema, Document, Model } from 'mongoose';
import { mongoPersistence } from './MongoPersistenceService.js';

// ============================================
// DATABASE MODELS
// ============================================

export interface IQuestObjective {
    id: string;
    type: string;          // 'collect', 'explore', 'bond', 'beacon', 'social', etc.
    description: string;
    target: number;
    progress: number;
    completed: boolean;
}

export interface IQuest {
    questId: string;
    status: 'available' | 'active' | 'completed' | 'claimed' | 'expired';
    startedAt: Date | null;
    completedAt: Date | null;
    objectives: IQuestObjective[];
    expiresAt: Date | null;
}

export interface IPlayerQuests extends Document {
    playerId: string;

    // Active and completed quests
    quests: IQuest[];

    // Quest categories
    activeQuestIds: string[];
    completedQuestIds: string[];

    // Daily/Weekly tracking
    dailyQuestDate: string | null;
    weeklyQuestDate: string | null;
    dailyQuestsCompleted: number;
    weeklyQuestsCompleted: number;

    // Story progress
    storyChapter: number;
    storyProgress: number;

    // Stats
    totalQuestsCompleted: number;
    totalRewardsClaimed: number;

    createdAt: Date;
    updatedAt: Date;
}

const QuestObjectiveSchema = new Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    target: { type: Number, required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false }
}, { _id: false });

const QuestSchema = new Schema({
    questId: { type: String, required: true },
    status: {
        type: String,
        enum: ['available', 'active', 'completed', 'claimed', 'expired'],
        default: 'available'
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    objectives: [QuestObjectiveSchema],
    expiresAt: { type: Date, default: null }
}, { _id: false });

const PlayerQuestsSchema = new Schema<IPlayerQuests>({
    playerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    quests: [QuestSchema],
    activeQuestIds: { type: [String], default: [] },
    completedQuestIds: { type: [String], default: [] },
    dailyQuestDate: { type: String, default: null },
    weeklyQuestDate: { type: String, default: null },
    dailyQuestsCompleted: { type: Number, default: 0 },
    weeklyQuestsCompleted: { type: Number, default: 0 },
    storyChapter: { type: Number, default: 1 },
    storyProgress: { type: Number, default: 0 },
    totalQuestsCompleted: { type: Number, default: 0 },
    totalRewardsClaimed: { type: Number, default: 0 }
}, {
    timestamps: true,
    collection: 'player_quests'
});

export const PlayerQuests: Model<IPlayerQuests> = mongoose.model<IPlayerQuests>('PlayerQuests', PlayerQuestsSchema);

// ============================================
// QUEST DEFINITIONS
// ============================================

export interface QuestDefinition {
    id: string;
    name: string;
    description: string;
    type: 'daily' | 'weekly' | 'story' | 'event' | 'achievement';
    category: string;
    objectives: {
        id: string;
        type: string;
        description: string;
        target: number;
    }[];
    rewards: {
        xp: number;
        stardust: number;
        cosmetic?: string;
        title?: string;
        companion?: string;
    };
    requirements?: {
        level?: number;
        questsCompleted?: string[];
        chapter?: number;
    };
    expirationHours?: number;
}

// Daily quest templates
const DAILY_QUEST_TEMPLATES: QuestDefinition[] = [
    {
        id: 'daily_explorer',
        name: 'Daily Explorer',
        description: 'Explore the realm and discover new areas',
        type: 'daily',
        category: 'exploration',
        objectives: [
            { id: 'travel', type: 'travel', description: 'Travel 1000 units', target: 1000 },
            { id: 'discover', type: 'discover_area', description: 'Discover 3 new areas', target: 3 }
        ],
        rewards: { xp: 100, stardust: 200 },
        expirationHours: 24
    },
    {
        id: 'daily_social',
        name: 'Social Butterfly',
        description: 'Connect with other players',
        type: 'daily',
        category: 'social',
        objectives: [
            { id: 'pulse', type: 'pulse', description: 'Send 5 pulses', target: 5 },
            { id: 'bond', type: 'bond', description: 'Strengthen 2 bonds', target: 2 }
        ],
        rewards: { xp: 75, stardust: 150 },
        expirationHours: 24
    },
    {
        id: 'daily_starkeeper',
        name: 'Star Keeper',
        description: 'Light up the cosmos',
        type: 'daily',
        category: 'beacon',
        objectives: [
            { id: 'stars', type: 'light_star', description: 'Light 20 stars', target: 20 },
            { id: 'sing', type: 'sing', description: 'Perform 10 sings', target: 10 }
        ],
        rewards: { xp: 100, stardust: 200 },
        expirationHours: 24
    },
    {
        id: 'daily_collector',
        name: 'Fragment Hunter',
        description: 'Collect fragments across the realm',
        type: 'daily',
        category: 'collect',
        objectives: [
            { id: 'fragments', type: 'collect_fragment', description: 'Collect 15 fragments', target: 15 }
        ],
        rewards: { xp: 50, stardust: 100 },
        expirationHours: 24
    }
];

// Weekly quest templates
const WEEKLY_QUEST_TEMPLATES: QuestDefinition[] = [
    {
        id: 'weekly_champion',
        name: 'Weekly Champion',
        description: 'Complete major goals this week',
        type: 'weekly',
        category: 'general',
        objectives: [
            { id: 'stars', type: 'light_star', description: 'Light 100 stars', target: 100 },
            { id: 'bonds', type: 'bond', description: 'Form 10 bonds', target: 10 },
            { id: 'echoes', type: 'create_echo', description: 'Create 5 echoes', target: 5 }
        ],
        rewards: { xp: 500, stardust: 1000 },
        expirationHours: 168
    },
    {
        id: 'weekly_social_master',
        name: 'Social Master',
        description: 'Become a beacon of connection',
        type: 'weekly',
        category: 'social',
        objectives: [
            { id: 'connections', type: 'connection', description: 'Make 20 connections', target: 20 },
            { id: 'gifts', type: 'send_gift', description: 'Send 5 gifts', target: 5 },
            { id: 'whispers', type: 'whisper', description: 'Send 30 whispers', target: 30 }
        ],
        rewards: { xp: 400, stardust: 800, cosmetic: 'weekly_social_trail' },
        expirationHours: 168
    }
];

// Story quests (chapter-based)
const STORY_QUESTS: QuestDefinition[] = [
    {
        id: 'story_1_1',
        name: 'Awakening',
        description: 'Your journey begins in the realm of Genesis',
        type: 'story',
        category: 'chapter_1',
        objectives: [
            { id: 'move', type: 'travel', description: 'Take your first steps (100 units)', target: 100 },
            { id: 'star', type: 'light_star', description: 'Light your first star', target: 1 }
        ],
        rewards: { xp: 50, stardust: 100 },
        requirements: { chapter: 1 }
    },
    {
        id: 'story_1_2',
        name: 'First Connection',
        description: 'Discover you are not alone',
        type: 'story',
        category: 'chapter_1',
        objectives: [
            { id: 'meet', type: 'meet_player', description: 'Encounter another being', target: 1 },
            { id: 'pulse', type: 'pulse', description: 'Send a pulse to connect', target: 1 }
        ],
        rewards: { xp: 100, stardust: 200 },
        requirements: { questsCompleted: ['story_1_1'] }
    },
    {
        id: 'story_1_3',
        name: 'The First Bond',
        description: 'Form a meaningful connection',
        type: 'story',
        category: 'chapter_1',
        objectives: [
            { id: 'bond', type: 'bond', description: 'Form your first bond', target: 1 },
            { id: 'time', type: 'time_together', description: 'Spend time near another player (60 seconds)', target: 60 }
        ],
        rewards: { xp: 150, stardust: 300, title: 'Bonded Soul' },
        requirements: { questsCompleted: ['story_1_2'] }
    },
    {
        id: 'story_2_1',
        name: 'Beyond Genesis',
        description: 'The wider cosmos awaits',
        type: 'story',
        category: 'chapter_2',
        objectives: [
            { id: 'realm', type: 'enter_realm', description: 'Visit a new realm', target: 1 },
            { id: 'explore', type: 'travel', description: 'Explore 2000 units', target: 2000 }
        ],
        rewards: { xp: 200, stardust: 400 },
        requirements: { questsCompleted: ['story_1_3'], level: 5 }
    }
];

// Combine all quest definitions
const ALL_QUESTS = new Map<string, QuestDefinition>();
[...DAILY_QUEST_TEMPLATES, ...WEEKLY_QUEST_TEMPLATES, ...STORY_QUESTS].forEach(q => {
    ALL_QUESTS.set(q.id, q);
});

// ============================================
// QUEST SERVICE CLASS
// ============================================

function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

function getWeekStartString(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
}

export class QuestService {
    private initialized: boolean = false;
    private memoryStore: Map<string, IPlayerQuests> = new Map();

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('📜 Quest service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    private useMongo(): boolean {
        return mongoPersistence.isReady();
    }

    private async savePlayerQuests(data: IPlayerQuests | any): Promise<void> {
        if (this.useMongo() && typeof data.save === 'function') {
            await data.save();
        } else {
            // In-memory save (update timestamp)
            data.updatedAt = new Date();
            this.memoryStore.set(data.playerId, data);
        }
    }

    // ========================================
    // DATA ACCESS
    // ========================================

    async getPlayerQuests(playerId: string): Promise<IPlayerQuests> {
        if (this.useMongo()) {
            let data = await PlayerQuests.findOne({ playerId });

            if (!data) {
                data = new PlayerQuests({
                    playerId,
                    quests: [],
                    activeQuestIds: [],
                    completedQuestIds: [],
                    dailyQuestDate: null,
                    weeklyQuestDate: null,
                    dailyQuestsCompleted: 0,
                    weeklyQuestsCompleted: 0,
                    storyChapter: 1,
                    storyProgress: 0,
                    totalQuestsCompleted: 0,
                    totalRewardsClaimed: 0
                });
                await this.savePlayerQuests(data);
            }
            return data;
        } else {
            // In-memory fallback
            let data = this.memoryStore.get(playerId);
            if (!data) {
                const now = new Date();
                // Create a plain object that mimics IPlayerQuests structure
                data = {
                    playerId,
                    quests: [],
                    activeQuestIds: [],
                    completedQuestIds: [],
                    dailyQuestDate: null,
                    weeklyQuestDate: null,
                    dailyQuestsCompleted: 0,
                    weeklyQuestsCompleted: 0,
                    storyChapter: 1,
                    storyProgress: 0,
                    totalQuestsCompleted: 0,
                    totalRewardsClaimed: 0,
                    createdAt: now,
                    updatedAt: now
                } as any; // Cast to any to bypass Document methods
                this.memoryStore.set(playerId, data!);
            }
            return data!;
        }
    }

    // ========================================
    // DAILY QUESTS
    // ========================================

    async getDailyQuests(playerId: string): Promise<IQuest[]> {
        const data = await this.getPlayerQuests(playerId);
        const today = getTodayString();

        // Generate new daily quests if needed
        if (data.dailyQuestDate !== today) {
            await this.generateDailyQuests(playerId, data);
        }

        return data.quests.filter(q => {
            const def = ALL_QUESTS.get(q.questId);
            return def?.type === 'daily' && q.status !== 'expired';
        });
    }

    private async generateDailyQuests(playerId: string, data: IPlayerQuests): Promise<void> {
        // Mark old daily quests as expired
        for (const quest of data.quests) {
            const def = ALL_QUESTS.get(quest.questId);
            if (def?.type === 'daily' && quest.status === 'active') {
                quest.status = 'expired';
            }
        }

        // Pick 3 random daily quests
        const shuffled = [...DAILY_QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);

        for (const template of selected) {
            const quest: IQuest = {
                questId: template.id,
                status: 'available',
                startedAt: null,
                completedAt: null,
                objectives: template.objectives.map(o => ({
                    id: o.id,
                    type: o.type,
                    description: o.description,
                    target: o.target,
                    progress: 0,
                    completed: false
                })),
                expiresAt: new Date(Date.now() + (template.expirationHours || 24) * 60 * 60 * 1000)
            };

            data.quests.push(quest);
        }

        data.dailyQuestDate = getTodayString();
        data.dailyQuestsCompleted = 0;
        await this.savePlayerQuests(data);
    }

    // ========================================
    // WEEKLY QUESTS
    // ========================================

    async getWeeklyQuests(playerId: string): Promise<IQuest[]> {
        const data = await this.getPlayerQuests(playerId);
        const weekStart = getWeekStartString();

        if (data.weeklyQuestDate !== weekStart) {
            await this.generateWeeklyQuests(playerId, data);
        }

        return data.quests.filter(q => {
            const def = ALL_QUESTS.get(q.questId);
            return def?.type === 'weekly' && q.status !== 'expired';
        });
    }

    private async generateWeeklyQuests(playerId: string, data: IPlayerQuests): Promise<void> {
        // Mark old weekly quests as expired
        for (const quest of data.quests) {
            const def = ALL_QUESTS.get(quest.questId);
            if (def?.type === 'weekly' && quest.status === 'active') {
                quest.status = 'expired';
            }
        }

        // Add all weekly quests
        for (const template of WEEKLY_QUEST_TEMPLATES) {
            const quest: IQuest = {
                questId: template.id,
                status: 'available',
                startedAt: null,
                completedAt: null,
                objectives: template.objectives.map(o => ({
                    id: o.id,
                    type: o.type,
                    description: o.description,
                    target: o.target,
                    progress: 0,
                    completed: false
                })),
                expiresAt: new Date(Date.now() + (template.expirationHours || 168) * 60 * 60 * 1000)
            };

            data.quests.push(quest);
        }

        data.weeklyQuestDate = getWeekStartString();
        data.weeklyQuestsCompleted = 0;
        await this.savePlayerQuests(data);
    }

    // ========================================
    // STORY QUESTS
    // ========================================

    async getAvailableStoryQuests(playerId: string): Promise<QuestDefinition[]> {
        const data = await this.getPlayerQuests(playerId);

        return STORY_QUESTS.filter(quest => {
            // Already completed?
            if (data.completedQuestIds.includes(quest.id)) return false;

            // Check requirements
            if (quest.requirements) {
                if (quest.requirements.questsCompleted) {
                    for (const reqQuestId of quest.requirements.questsCompleted) {
                        if (!data.completedQuestIds.includes(reqQuestId)) return false;
                    }
                }
            }

            return true;
        });
    }

    // ========================================
    // QUEST ACTIONS
    // ========================================

    async startQuest(playerId: string, questId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const data = await this.getPlayerQuests(playerId);
        const definition = ALL_QUESTS.get(questId);

        if (!definition) {
            return { success: false, error: 'Quest not found' };
        }

        // Check if already active
        if (data.activeQuestIds.includes(questId)) {
            return { success: false, error: 'Quest already active' };
        }

        // Find or create quest
        let quest = data.quests.find(q => q.questId === questId);

        if (!quest) {
            quest = {
                questId,
                status: 'available',
                startedAt: null,
                completedAt: null,
                objectives: definition.objectives.map(o => ({
                    id: o.id,
                    type: o.type,
                    description: o.description,
                    target: o.target,
                    progress: 0,
                    completed: false
                })),
                expiresAt: definition.expirationHours
                    ? new Date(Date.now() + definition.expirationHours * 60 * 60 * 1000)
                    : null
            };
            data.quests.push(quest);
        }

        quest.status = 'active';
        quest.startedAt = new Date();
        data.activeQuestIds.push(questId);

        await this.savePlayerQuests(data);
        return { success: true };
    }

    async updateQuestProgress(playerId: string, objectiveType: string, amount: number = 1): Promise<{
        updated: boolean;
        completedQuests: string[];
    }> {
        const data = await this.getPlayerQuests(playerId);
        const completedQuests: string[] = [];
        let updated = false;

        for (const quest of data.quests) {
            if (quest.status !== 'active') continue;

            for (const objective of quest.objectives) {
                if (objective.type === objectiveType && !objective.completed) {
                    objective.progress = Math.min(objective.target, objective.progress + amount);

                    if (objective.progress >= objective.target) {
                        objective.completed = true;
                    }
                    updated = true;
                }
            }

            // Check if all objectives complete
            if (quest.objectives.every(o => o.completed)) {
                quest.status = 'completed';
                quest.completedAt = new Date();
                completedQuests.push(quest.questId);
            }
        }

        if (updated) {
            await this.savePlayerQuests(data);
        }

        return { updated, completedQuests };
    }

    async claimQuestReward(playerId: string, questId: string): Promise<{
        success: boolean;
        rewards?: { xp: number; stardust: number; cosmetic?: string; title?: string };
        error?: string;
    }> {
        const data = await this.getPlayerQuests(playerId);
        const quest = data.quests.find(q => q.questId === questId);

        if (!quest) {
            return { success: false, error: 'Quest not found' };
        }

        if (quest.status !== 'completed') {
            return { success: false, error: 'Quest not completed' };
        }

        const definition = ALL_QUESTS.get(questId);
        if (!definition) {
            return { success: false, error: 'Quest definition not found' };
        }

        quest.status = 'claimed';
        data.completedQuestIds.push(questId);
        data.activeQuestIds = data.activeQuestIds.filter(id => id !== questId);
        data.totalQuestsCompleted++;
        data.totalRewardsClaimed++;

        // Update category-specific counters
        if (definition.type === 'daily') {
            data.dailyQuestsCompleted++;
        } else if (definition.type === 'weekly') {
            data.weeklyQuestsCompleted++;
        } else if (definition.type === 'story') {
            // Update story progress
            const chapter = parseInt(questId.split('_')[1]);
            if (chapter > data.storyChapter) {
                data.storyChapter = chapter;
            }
        }

        await this.savePlayerQuests(data);

        return {
            success: true,
            rewards: definition.rewards
        };
    }

    async abandonQuest(playerId: string, questId: string): Promise<boolean> {
        const data = await this.getPlayerQuests(playerId);
        const quest = data.quests.find(q => q.questId === questId);

        if (!quest || quest.status !== 'active') {
            return false;
        }

        quest.status = 'available';
        quest.startedAt = null;
        quest.objectives.forEach(o => {
            o.progress = 0;
            o.completed = false;
        });

        data.activeQuestIds = data.activeQuestIds.filter(id => id !== questId);
        await this.savePlayerQuests(data);

        return true;
    }

    // ========================================
    // STATS
    // ========================================

    async getQuestStats(playerId: string): Promise<{
        totalCompleted: number;
        dailyCompleted: number;
        weeklyCompleted: number;
        storyProgress: { chapter: number; progress: number };
        activeQuests: number;
    }> {
        const data = await this.getPlayerQuests(playerId);

        return {
            totalCompleted: data.totalQuestsCompleted,
            dailyCompleted: data.dailyQuestsCompleted,
            weeklyCompleted: data.weeklyQuestsCompleted,
            storyProgress: {
                chapter: data.storyChapter,
                progress: data.storyProgress
            },
            activeQuests: data.activeQuestIds.length
        };
    }

    // ========================================
    // QUEST CATALOG
    // ========================================

    getQuestDefinition(questId: string): QuestDefinition | null {
        return ALL_QUESTS.get(questId) || null;
    }

    getAllStoryQuests(): QuestDefinition[] {
        return STORY_QUESTS;
    }
}

export const questService = new QuestService();
