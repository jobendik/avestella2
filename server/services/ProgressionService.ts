// MongoDB-backed progression and social service
// Handles challenges, progression, gifts, guilds, and activity feeds

import {
    DailyChallenge, IDailyChallenge,
    WeeklyChallenge, IWeeklyChallenge,
    Progression, IProgression,
    Guild, IGuild,
    ActivityFeed, IActivityFeed
} from '../database/progressionModels.js';
import {
    Gift, IGift,
    GiftStreak, IGiftStreak
} from '../database/socialModels.js';
import { PlayerData } from '../database/playerDataModel.js';
import { mongoPersistence } from './MongoPersistenceService.js';

// ============================================
// HELPER FUNCTIONS
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

function getMonthStartString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// Challenge templates
const CHALLENGE_TEMPLATES = {
    fragment: [
        { desc: 'Collect {X} fragments', targets: [10, 25, 50], stardust: [50, 100, 200], xp: [25, 50, 100] },
        { desc: 'Gather {X} golden fragments', targets: [1, 3, 5], stardust: [100, 200, 400], xp: [50, 100, 200] }
    ],
    beacon: [
        { desc: 'Light {X} beacons', targets: [1, 3, 5], stardust: [75, 150, 300], xp: [40, 80, 160] }
    ],
    bond: [
        { desc: 'Form {X} bonds', targets: [1, 2, 4], stardust: [100, 200, 400], xp: [50, 100, 200] }
    ],
    pulse: [
        { desc: 'Send {X} pulses to others', targets: [3, 7, 15], stardust: [40, 80, 160], xp: [20, 40, 80] }
    ],
    explore: [
        { desc: 'Explore {X}% of the map', targets: [5, 15, 30], stardust: [60, 120, 240], xp: [30, 60, 120] }
    ],
    sing: [
        { desc: 'Perform {X} sings', targets: [5, 15, 30], stardust: [40, 80, 160], xp: [20, 40, 80] }
    ],
    echo: [
        { desc: 'Leave {X} echoes', targets: [1, 3, 5], stardust: [60, 120, 240], xp: [30, 60, 120] }
    ],
    star: [
        { desc: 'Light {X} stars', targets: [10, 30, 100], stardust: [50, 100, 200], xp: [25, 50, 100] }
    ],
    whisper: [
        { desc: 'Send {X} whispers', targets: [3, 10, 25], stardust: [40, 80, 160], xp: [20, 40, 80] }
    ],
    connection: [
        { desc: 'Form {X} connections', targets: [1, 3, 5], stardust: [80, 160, 320], xp: [40, 80, 160] }
    ]
};

const WEEKLY_CHALLENGE_MULTIPLIER = 5; // Weekly targets are 5x daily

// Challenge type for internal use
interface ChallengeData {
    id: string;
    type: string;
    desc: string;
    progress: number;
    target: number;
    reward: { stardust: number; xp: number };
    completed: boolean;
    claimed: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
}

function generateChallenge(difficulty: 'easy' | 'medium' | 'hard', isWeekly: boolean = false): ChallengeData {
    const categories = Object.keys(CHALLENGE_TEMPLATES) as Array<keyof typeof CHALLENGE_TEMPLATES>;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const templates = CHALLENGE_TEMPLATES[category];
    const template = templates[Math.floor(Math.random() * templates.length)];

    const difficultyIdx = difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2;
    let target = template.targets[difficultyIdx];
    let stardust = template.stardust[difficultyIdx];
    let xp = template.xp[difficultyIdx];

    if (isWeekly) {
        target *= WEEKLY_CHALLENGE_MULTIPLIER;
        stardust *= 3;
        xp *= 3;
    }

    return {
        id: `${category}_${difficulty}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: category,
        desc: template.desc.replace('{X}', String(target)),
        progress: 0,
        target,
        reward: { stardust, xp },
        completed: false,
        claimed: false,
        difficulty
    };
}

// ============================================
// PROGRESSION SERVICE CLASS
// ============================================

export class ProgressionService {
    private initialized: boolean = false;
    private memoryStore: Map<string, IProgression> = new Map();

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('📊 Progression service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    private useMongo(): boolean {
        return mongoPersistence.isReady();
    }

    private async saveProgression(data: IProgression | any): Promise<void> {
        if (this.useMongo() && typeof data.save === 'function') {
            await data.save();
        } else {
            // In-memory save
            // data.updatedAt = new Date(); // IProgression doesn't stricly have timestamps in interface but Mongoose adds them.
            this.memoryStore.set(data.playerId, data);
        }
    }

    // ========================================
    // DAILY CHALLENGES
    // ========================================

    async getDailyChallenges(playerId: string): Promise<IDailyChallenge | null> {
        const today = getTodayString();
        let challenges = await DailyChallenge.findOne({ playerId, date: today });

        if (!challenges) {
            // Generate new challenges for today
            challenges = new DailyChallenge({
                playerId,
                date: today,
                challenges: [
                    generateChallenge('easy'),
                    generateChallenge('medium'),
                    generateChallenge('hard')
                ],
                completedToday: 0,
                rerollsUsed: 0
            });
            await challenges.save();
        }

        return challenges;
    }

    async updateChallengeProgress(playerId: string, challengeType: string, amount: number = 1): Promise<{ updated: boolean; completed: boolean; challengeId?: string }> {
        const today = getTodayString();
        const challenges = await DailyChallenge.findOne({ playerId, date: today });

        if (!challenges) {
            return { updated: false, completed: false };
        }

        let updated = false;
        let completed = false;
        let completedChallengeId: string | undefined;

        for (const challenge of challenges.challenges) {
            if (challenge.type === challengeType && !challenge.completed) {
                challenge.progress = Math.min(challenge.target, challenge.progress + amount);

                if (challenge.progress >= challenge.target) {
                    challenge.completed = true;
                    challenges.completedToday++;
                    completed = true;
                    completedChallengeId = challenge.id;
                }
                updated = true;
            }
        }

        if (updated) {
            await challenges.save();
        }

        return { updated, completed, challengeId: completedChallengeId };
    }

    async claimChallengeReward(playerId: string, challengeId: string): Promise<{ success: boolean; reward?: { stardust: number; xp: number } }> {
        const today = getTodayString();
        const challenges = await DailyChallenge.findOne({ playerId, date: today });

        if (!challenges) {
            return { success: false };
        }

        const challenge = challenges.challenges.find((c: ChallengeData) => c.id === challengeId);
        if (!challenge || !challenge.completed || challenge.claimed) {
            return { success: false };
        }

        challenge.claimed = true;
        await challenges.save();

        return { success: true, reward: challenge.reward };
    }

    async rerollChallenge(playerId: string, challengeId: string): Promise<{ success: boolean; newChallenge?: any }> {
        const today = getTodayString();
        const challenges = await DailyChallenge.findOne({ playerId, date: today });

        if (!challenges || challenges.rerollsUsed >= 3) {
            return { success: false };
        }

        const challengeIdx = challenges.challenges.findIndex((c: ChallengeData) => c.id === challengeId);
        if (challengeIdx === -1 || challenges.challenges[challengeIdx].completed) {
            return { success: false };
        }

        const oldChallenge = challenges.challenges[challengeIdx];
        const newChallenge = generateChallenge(oldChallenge.difficulty);
        challenges.challenges[challengeIdx] = newChallenge;
        challenges.rerollsUsed++;

        await challenges.save();
        return { success: true, newChallenge };
    }

    // ========================================
    // FRAGMENTS
    // ========================================

    async collectFragment(playerId: string, fragmentId: string, value: number = 1): Promise<{ success: boolean; totalCollected: number; firstCollection: boolean }> {
        const progression = await this.getProgression(playerId);

        // Use stardust field or add a specific fragment counter if needed. 
        // For now, let's say fragments convert directly to stardust or we track them in a new field if schema allows.
        // Assuming 'crystals' might be fragments, or we just track total for challenges.

        // Let's add it to stardust for now as a simple reward, 
        // but we should probably track unique fragment IDs to prevent double collection if they are static.
        // If they are random spawns, we just rate limit.

        // Simple rate limit check could go here if we tracked last collection time.

        const reward = Math.max(1, value);
        progression.stardust += reward;
        progression.monthlyStats.stardustEarned += reward;

        await progression.save();

        // Update challenges
        await this.updateChallengeProgress(playerId, 'fragment', 1);
        await this.updateWeeklyChallengeProgress(playerId, 'fragment', 1);

        return {
            success: true,
            totalCollected: progression.stardust, // Using stardust as proxy for now
            firstCollection: false
        };
    }

    // ========================================
    // WEEKLY CHALLENGES
    // ========================================

    async getWeeklyChallenges(playerId: string): Promise<IWeeklyChallenge | null> {
        const weekStart = getWeekStartString();
        let challenges = await WeeklyChallenge.findOne({ playerId, weekStart });

        if (!challenges) {
            challenges = new WeeklyChallenge({
                playerId,
                weekStart,
                challenges: [
                    { ...generateChallenge('easy', true), bonusReward: { stardust: 100, xp: 50 } },
                    { ...generateChallenge('medium', true), bonusReward: { stardust: 200, xp: 100 } },
                    { ...generateChallenge('hard', true), bonusReward: { stardust: 400, xp: 200 } }
                ],
                completedThisWeek: 0
            });
            await challenges.save();
        }

        return challenges;
    }

    async updateWeeklyChallengeProgress(playerId: string, challengeType: string, amount: number = 1): Promise<{ updated: boolean; completed: boolean }> {
        const weekStart = getWeekStartString();
        const challenges = await WeeklyChallenge.findOne({ playerId, weekStart });

        if (!challenges) {
            return { updated: false, completed: false };
        }

        let updated = false;
        let completed = false;

        for (const challenge of challenges.challenges) {
            if (challenge.type === challengeType && !challenge.completed) {
                challenge.progress = Math.min(challenge.target, challenge.progress + amount);

                if (challenge.progress >= challenge.target) {
                    challenge.completed = true;
                    challenges.completedThisWeek++;
                    completed = true;
                }
                updated = true;
            }
        }

        if (updated) {
            await challenges.save();
        }

        return { updated, completed };
    }

    // ========================================
    // PLAYER PROGRESSION
    // ========================================

    async getProgression(playerId: string): Promise<IProgression> {
        if (this.useMongo()) {
            let progression = await Progression.findOne({ playerId });

            if (!progression) {
                progression = new Progression({
                    playerId,
                    stardust: 0,
                    crystals: 0,
                    dailyLoginStreak: 0,
                    longestStreak: 0,
                    totalLogins: 0,
                    lastLoginDate: null,
                    currentMonth: null,
                    seasonPassTier: 0,
                    seasonPassXP: 0,
                    seasonId: 'season_1',
                    isPremiumPass: false,
                    claimedDailyRewards: [],
                    claimedSeasonRewards: [],
                    guildId: null,
                    guildBonus: 0,
                    totalChallengesCompleted: 0,
                    weeklyStats: {
                        weekStart: getWeekStartString(),
                        wins: 0,
                        gamesPlayed: 0,
                        xpEarned: 0,
                        challengesCompleted: 0
                    },
                    monthlyStats: {
                        monthStart: getMonthStartString(),
                        xpEarned: 0,
                        challengesCompleted: 0,
                        stardustEarned: 0
                    },
                    rankPoints: 0,
                    unlockedCosmetics: [],
                    unlockedTitles: [],
                    equippedCosmetics: {
                        trail: null,
                        aura: null,
                        pulse: null,
                        color: null,
                        title: null
                    }
                });
                await this.saveProgression(progression);
            }

            // Check for weekly/monthly reset
            const currentWeek = getWeekStartString();
            const currentMonth = getMonthStartString();

            let needsSave = false;
            if (progression.weeklyStats.weekStart !== currentWeek) {
                progression.weeklyStats = {
                    weekStart: currentWeek,
                    wins: 0,
                    gamesPlayed: 0,
                    xpEarned: 0,
                    challengesCompleted: 0
                };
                needsSave = true;
            }

            if (progression.monthlyStats.monthStart !== currentMonth) {
                progression.monthlyStats = {
                    monthStart: currentMonth,
                    xpEarned: 0,
                    challengesCompleted: 0,
                    stardustEarned: 0
                };
                needsSave = true;
            }

            if (needsSave) {
                await this.saveProgression(progression);
            }

            return progression;
        } else {
            // In-memory fallback
            let progression = this.memoryStore.get(playerId);
            if (!progression) {
                // Initialize default progression
                progression = {
                    playerId,
                    stardust: 0,
                    crystals: 0,
                    dailyLoginStreak: 0,
                    longestStreak: 0,
                    totalLogins: 0,
                    lastLoginDate: null,
                    currentMonth: null,
                    seasonPassTier: 0,
                    seasonPassXP: 0,
                    seasonId: 'season_1',
                    isPremiumPass: false,
                    claimedDailyRewards: [],
                    claimedSeasonRewards: [],
                    guildId: null,
                    guildBonus: 0,
                    totalChallengesCompleted: 0,
                    weeklyStats: {
                        weekStart: getWeekStartString(),
                        wins: 0,
                        gamesPlayed: 0,
                        xpEarned: 0,
                        challengesCompleted: 0
                    },
                    monthlyStats: {
                        monthStart: getMonthStartString(),
                        xpEarned: 0,
                        challengesCompleted: 0,
                        stardustEarned: 0
                    },
                    rankPoints: 0,
                    unlockedCosmetics: [],
                    unlockedTitles: [],
                    equippedCosmetics: {
                        trail: null,
                        aura: null,
                        pulse: null,
                        color: null,
                        title: null
                    }
                } as any;
                this.memoryStore.set(playerId, progression!);
            }
            return progression!;
        }
    }

    async updateProgression(playerId: string, updates: Partial<IProgression>): Promise<void> {
        await Progression.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { upsert: true }
        );
    }

    async addStardust(playerId: string, amount: number): Promise<number> {
        const result = await Progression.findOneAndUpdate(
            { playerId },
            {
                $inc: {
                    stardust: amount,
                    'monthlyStats.stardustEarned': amount
                }
            },
            { new: true, upsert: true }
        );
        return result?.stardust || 0;
    }

    async spendStardust(playerId: string, amount: number): Promise<{ success: boolean; remaining: number }> {
        const progression = await Progression.findOne({ playerId });
        if (!progression || progression.stardust < amount) {
            return { success: false, remaining: progression?.stardust || 0 };
        }

        progression.stardust -= amount;
        await this.saveProgression(progression);
        return { success: true, remaining: progression.stardust };
    }

    async claimDailyReward(playerId: string): Promise<{ success: boolean; reward?: any; streakBonus?: number }> {
        const today = getTodayString();
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const progression = await this.getProgression(playerId);

        if (progression.lastLoginDate === today) {
            return { success: false }; // Already claimed today
        }

        // Check streak
        if (progression.lastLoginDate === yesterday) {
            progression.dailyLoginStreak++;
        } else if (progression.lastLoginDate !== today) {
            progression.dailyLoginStreak = 1; // Reset streak
        }

        if (progression.dailyLoginStreak > progression.longestStreak) {
            progression.longestStreak = progression.dailyLoginStreak;
        }
        progression.totalLogins++;
        progression.lastLoginDate = today;

        // Calculate reward based on streak day (30-day cycle)
        const day = ((progression.dailyLoginStreak - 1) % 30) + 1;
        const baseReward = 50 + (day * 5);

        // Streak bonus multiplier
        let streakBonus = 1;
        if (progression.dailyLoginStreak >= 365) streakBonus = 10;
        else if (progression.dailyLoginStreak >= 100) streakBonus = 3.5;
        else if (progression.dailyLoginStreak >= 30) streakBonus = 2;
        else if (progression.dailyLoginStreak >= 7) streakBonus = 1.25;
        else if (progression.dailyLoginStreak >= 3) streakBonus = 1.1;

        const totalReward = Math.floor(baseReward * streakBonus);
        progression.stardust += totalReward;

        await this.saveProgression(progression);

        return {
            success: true,
            reward: {
                stardust: totalReward,
                day,
                streak: progression.dailyLoginStreak
            },
            streakBonus
        };
    }

    async addSeasonXP(playerId: string, amount: number): Promise<{ tieredUp: boolean; newTier: number; xpToNextTier: number }> {
        const progression = await this.getProgression(playerId);
        const XP_PER_TIER = 1000;

        progression.seasonPassXP += amount;
        const oldTier = progression.seasonPassTier;

        while (progression.seasonPassXP >= XP_PER_TIER && progression.seasonPassTier < 100) {
            progression.seasonPassXP -= XP_PER_TIER;
            progression.seasonPassTier++;
        }

        await this.saveProgression(progression);

        return {
            tieredUp: progression.seasonPassTier > oldTier,
            newTier: progression.seasonPassTier,
            xpToNextTier: XP_PER_TIER - progression.seasonPassXP
        };
    }

    async claimSeasonReward(playerId: string, tier: number): Promise<{ success: boolean; reward?: any }> {
        const progression = await this.getProgression(playerId);

        if (tier > progression.seasonPassTier || progression.claimedSeasonRewards.includes(tier)) {
            return { success: false };
        }

        progression.claimedSeasonRewards.push(tier);
        await this.saveProgression(progression);

        // Return base reward (actual reward calculation based on tier in constants)
        return { success: true, reward: { tier, claimed: true } };
    }

    async addRankPoints(playerId: string, points: number): Promise<{ newPoints: number; newRank?: string }> {
        const progression = await this.getProgression(playerId);
        progression.rankPoints = Math.max(0, progression.rankPoints + points);
        await this.saveProgression(progression);

        return { newPoints: progression.rankPoints };
    }

    async unlockCosmetic(playerId: string, cosmeticId: string): Promise<boolean> {
        const result = await Progression.findOneAndUpdate(
            { playerId },
            { $addToSet: { unlockedCosmetics: cosmeticId } },
            { new: true, upsert: true }
        );
        return !!result;
    }

    async unlockTitle(playerId: string, titleId: string): Promise<boolean> {
        const result = await Progression.findOneAndUpdate(
            { playerId },
            { $addToSet: { unlockedTitles: titleId } },
            { new: true, upsert: true }
        );
        return !!result;
    }

    async equipCosmetic(playerId: string, slot: 'trail' | 'aura' | 'pulse' | 'color' | 'title', cosmeticId: string | null): Promise<boolean> {
        const updateField = `equippedCosmetics.${slot}`;
        await Progression.findOneAndUpdate(
            { playerId },
            { $set: { [updateField]: cosmeticId } }
        );
        return true;
    }

    // ========================================
    // GIFTS
    // ========================================

    async sendGift(fromPlayerId: string, toPlayerId: string, giftType: 'stardust' | 'cosmetic' | 'xpBoost' | 'fragment', amount: number, message?: string): Promise<{ success: boolean; giftId?: string }> {
        // Check cooldown (one gift per friend per day)
        const today = getTodayString();
        const streak = await GiftStreak.findOne({ playerId: fromPlayerId, friendId: toPlayerId });

        if (streak && streak.lastGiftDate === today) {
            return { success: false }; // Already sent today
        }

        // Create gift
        const gift = new Gift({
            fromPlayerId,
            toPlayerId,
            giftType,
            amount,
            message,
            claimed: false
        });
        await gift.save();

        // Update streak
        await GiftStreak.findOneAndUpdate(
            { playerId: fromPlayerId, friendId: toPlayerId },
            {
                $inc: { totalGiftsSent: 1 },
                $set: {
                    lastGiftDate: today,
                    currentStreak: streak?.lastGiftDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                        ? (streak?.currentStreak || 0) + 1
                        : 1
                },
                $max: { longestStreak: (streak?.currentStreak || 0) + 1 }
            },
            { upsert: true }
        );

        // Create activity feed entry for recipient
        await this.addActivityFeedEntry(toPlayerId, fromPlayerId, 'FromPlayer', 'gift', `sent you a ${giftType} gift!`);

        return { success: true, giftId: gift._id.toString() };
    }

    async getPendingGifts(playerId: string): Promise<IGift[]> {
        return await Gift.find({ toPlayerId: playerId, claimed: false }).sort({ createdAt: -1 });
    }

    async claimGift(playerId: string, giftId: string): Promise<{ success: boolean; gift?: IGift }> {
        const gift = await Gift.findOne({ _id: giftId, toPlayerId: playerId, claimed: false });

        if (!gift) {
            return { success: false };
        }

        gift.claimed = true;
        gift.claimedAt = new Date();
        await gift.save();

        // Apply gift effect
        if (gift.giftType === 'stardust') {
            await this.addStardust(playerId, gift.amount);
        }

        return { success: true, gift };
    }

    async getGiftStreak(playerId: string, friendId: string): Promise<IGiftStreak | null> {
        return await GiftStreak.findOne({ playerId, friendId });
    }

    // ========================================
    // GUILDS
    // ========================================

    async createGuild(leaderId: string, name: string, tag: string, description?: string): Promise<{ success: boolean; guild?: IGuild; error?: string }> {
        // Check if player already in a guild
        const progression = await this.getProgression(leaderId);
        if (progression.guildId) {
            return { success: false, error: 'Already in a guild' };
        }

        // Check name/tag availability
        const existing = await Guild.findOne({ $or: [{ name }, { tag: tag.toUpperCase() }] });
        if (existing) {
            return { success: false, error: 'Guild name or tag already taken' };
        }

        const guildId = `guild_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get leader's player data for name
        const leaderData = await PlayerData.findOne({ odaId: leaderId });
        const leaderName = leaderData?.name || 'Leader';
        
        const guild = new Guild({
            guildId,
            name,
            tag: tag.toUpperCase(),
            description: description || '',
            icon: '⚔️',
            color: '#7c3aed',
            leaderId,
            leaderName,
            members: [{
                playerId: leaderId,
                playerName: leaderName,
                role: 'leader',
                joinedAt: new Date(),
                contributions: { stardust: 0, challenges: 0, xp: 0 },
                lastActiveAt: new Date()
            }],
            level: 1,
            xp: 0,
            xpToNextLevel: 1000,
            maxMembers: 20,
            perks: [],
            chat: [],
            pendingInvites: [],
            pendingApplications: [],
            totalContributions: { stardust: 0, challenges: 0, xp: 0 },
            weeklyContributions: { stardust: 0, challenges: 0, xp: 0, weekStart: new Date().toISOString().split('T')[0] },
            isPublic: true,
            minLevelToJoin: 1,
            requiresApproval: false
        });
        await guild.save();

        progression.guildId = guildId;
        progression.guildBonus = 0.05;
        await this.saveProgression(progression);

        return { success: true, guild };
    }

    async joinGuild(playerId: string, guildId: string): Promise<{ success: boolean; error?: string }> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) {
            return { success: false, error: 'Guild not found' };
        }

        if (guild.members.length >= guild.maxMembers) {
            return { success: false, error: 'Guild is full' };
        }

        // Check if already a member
        const isMember = guild.members.some(m => m.playerId === playerId);
        if (isMember) {
            return { success: false, error: 'Already a member' };
        }

        // Get player data for name
        const playerData = await PlayerData.findOne({ odaId: playerId });
        const playerName = playerData?.name || 'Player';

        guild.members.push({
            playerId,
            playerName,
            role: 'member',
            joinedAt: new Date(),
            contributions: { stardust: 0, challenges: 0, xp: 0 },
            lastActiveAt: new Date()
        } as any);
        await guild.save();

        // Calculate XP bonus based on guild level (5% + 1% per level, max 50%)
        const xpBonus = Math.min(0.5, 0.05 + guild.level * 0.01);
        
        await Progression.findOneAndUpdate(
            { playerId },
            { $set: { guildId, guildBonus: xpBonus } }
        );

        return { success: true };
    }

    async leaveGuild(playerId: string): Promise<{ success: boolean }> {
        const progression = await this.getProgression(playerId);
        if (!progression.guildId) {
            return { success: false };
        }

        const guild = await Guild.findOne({ guildId: progression.guildId });
        if (guild) {
            // Filter out the leaving member
            guild.members = guild.members.filter(m => m.playerId !== playerId);

            // Transfer leadership if leader leaves
            if (guild.leaderId === playerId) {
                // Find officers first
                const officers = guild.members.filter(m => m.role === 'officer');
                if (officers.length > 0) {
                    guild.leaderId = officers[0].playerId;
                    guild.leaderName = officers[0].playerName;
                    officers[0].role = 'leader';
                } else if (guild.members.length > 0) {
                    guild.leaderId = guild.members[0].playerId;
                    guild.leaderName = guild.members[0].playerName;
                    guild.members[0].role = 'leader';
                } else {
                    // Delete empty guild
                    await Guild.deleteOne({ guildId: guild.guildId });
                    progression.guildId = null;
                    progression.guildBonus = 0;
                    await this.saveProgression(progression);
                    return { success: true };
                }
            }
            await guild.save();
        }

        progression.guildId = null;
        progression.guildBonus = 0;
        await this.saveProgression(progression);

        return { success: true };
    }

    async contributeToGuild(playerId: string, stardust: number): Promise<{ success: boolean; newContributions?: any }> {
        const progression = await this.getProgression(playerId);
        if (!progression.guildId) {
            return { success: false };
        }

        if (progression.stardust < stardust) {
            return { success: false };
        }

        progression.stardust -= stardust;
        await this.saveProgression(progression);

        const guild = await Guild.findOneAndUpdate(
            { guildId: progression.guildId },
            {
                $inc: {
                    'totalContributions.stardust': stardust,
                    'weeklyContributions.stardust': stardust,
                    xp: Math.floor(stardust / 10)
                }
            },
            { new: true }
        );

        // Update member contributions
        if (guild) {
            const memberIndex = guild.members.findIndex(m => m.playerId === playerId);
            if (memberIndex !== -1) {
                guild.members[memberIndex].contributions.stardust += stardust;
                guild.members[memberIndex].lastActiveAt = new Date();
            }
            
            // Level up guild if enough XP
            while (guild.xp >= guild.xpToNextLevel && guild.level < 50) {
                guild.xp -= guild.xpToNextLevel;
                guild.level++;
                guild.xpToNextLevel = 1000 * guild.level;
                guild.maxMembers = 20 + guild.level * 2;
            }
            await guild.save();
        }

        return { success: true, newContributions: guild?.totalContributions };
    }

    async getGuild(guildId: string): Promise<IGuild | null> {
        return await Guild.findOne({ guildId });
    }

    async searchGuilds(query: string, limit: number = 20): Promise<IGuild[]> {
        return await Guild.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { tag: { $regex: query, $options: 'i' } }
            ],
            isPublic: true
        }).limit(limit);
    }

    // ========================================
    // ACTIVITY FEED
    // ========================================

    async addActivityFeedEntry(playerId: string, actorId: string, actorName: string, type: IActivityFeed['type'], description: string, data?: Record<string, any>): Promise<void> {
        const entry = new ActivityFeed({
            playerId,
            actorId,
            actorName,
            type,
            description,
            data,
            read: false
        });
        await entry.save();
    }

    async getActivityFeed(playerId: string, limit: number = 50): Promise<IActivityFeed[]> {
        return await ActivityFeed.find({ playerId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    async markFeedAsRead(playerId: string, entryIds?: string[]): Promise<void> {
        if (entryIds && entryIds.length > 0) {
            await ActivityFeed.updateMany(
                { playerId, _id: { $in: entryIds } },
                { $set: { read: true } }
            );
        } else {
            await ActivityFeed.updateMany(
                { playerId },
                { $set: { read: true } }
            );
        }
    }

    async getUnreadCount(playerId: string): Promise<number> {
        return await ActivityFeed.countDocuments({ playerId, read: false });
    }

    // ========================================
    // LEADERBOARD
    // ========================================

    async getProgressionLeaderboard(sortBy: 'stardust' | 'rankPoints' | 'dailyLoginStreak' | 'totalLogins' = 'rankPoints', limit: number = 50): Promise<any[]> {
        const sortField = sortBy;
        return await Progression.find()
            .sort({ [sortField]: -1 })
            .limit(limit)
            .select('playerId stardust rankPoints dailyLoginStreak totalLogins seasonPassTier');
    }

    async getGuildLeaderboard(sortBy: 'level' | 'members' | 'contributions' = 'level', limit: number = 20): Promise<IGuild[]> {
        let sortOption: any;
        if (sortBy === 'level') sortOption = { level: -1, xp: -1 };
        else if (sortBy === 'members') sortOption = { 'members.length': -1 };
        else sortOption = { 'contributions.stardust': -1 };

        return await Guild.find().sort(sortOption).limit(limit);
    }

    /**
     * Add XP to a player's season pass. Convenience wrapper for addSeasonXP.
     * @param playerId Player ID
     * @param amount XP amount
     * @param _source Optional source identifier (for tracking, not currently used)
     */
    async addXP(playerId: string, amount: number, _source?: string): Promise<{ tieredUp: boolean; newTier: number; xpToNextTier: number }> {
        return this.addSeasonXP(playerId, amount);
    }
}

// Export singleton
export const progressionService = new ProgressionService();
export default progressionService;
