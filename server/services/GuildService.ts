// =============================================================================
// Guild Service - Complete backend service for Guild system
// =============================================================================

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { Guild, GuildGift, GuildApplication, IGuild, IGuildMember, IGuildGift, IGuildApplication } from '../database/guildModels.js';

// ============================================
// TYPES
// ============================================

interface GuildCreateData {
    name: string;
    tag: string;
    description?: string;
    icon?: string;
    color?: string;
    isPublic?: boolean;
    minLevelToJoin?: number;
    requiresApproval?: boolean;
}

interface GuildUpdateData {
    description?: string;
    icon?: string;
    color?: string;
    isPublic?: boolean;
    minLevelToJoin?: number;
    requiresApproval?: boolean;
    maxMembers?: number;
}

interface ContributionData {
    stardust?: number;
    challenges?: number;
    xp?: number;
}

interface GuildSearchOptions {
    query?: string;
    minLevel?: number;
    maxLevel?: number;
    isPublic?: boolean;
    hasSpace?: boolean;
    sortBy?: 'level' | 'members' | 'contributions' | 'name';
    limit?: number;
    offset?: number;
}

// ============================================
// CONSTANTS
// ============================================

const GUILD_LEVEL_XP = [
    0,      // Level 1
    1000,   // Level 2
    2500,   // Level 3
    5000,   // Level 4
    10000,  // Level 5
    17500,  // Level 6
    27500,  // Level 7
    40000,  // Level 8
    55000,  // Level 9
    75000,  // Level 10
    // ... continues exponentially
];

const MAX_GUILD_LEVEL = 50;

const GUILD_PERKS = [
    { level: 1, perk: { id: 'bonus_xp_5', name: '+5% XP', icon: '⭐', description: 'All members gain 5% bonus XP' } },
    { level: 3, perk: { id: 'bonus_stardust_5', name: '+5% Stardust', icon: '✨', description: 'All members gain 5% bonus stardust' } },
    { level: 5, perk: { id: 'guild_chat', name: 'Guild Chat', icon: '💬', description: 'Unlock guild chat room' } },
    { level: 7, perk: { id: 'bonus_xp_10', name: '+10% XP', icon: '⭐', description: 'XP bonus increased to 10%' } },
    { level: 10, perk: { id: 'guild_banner', name: 'Guild Banner', icon: '🏳️', description: 'Display guild banner in realms' } },
    { level: 15, perk: { id: 'bonus_stardust_10', name: '+10% Stardust', icon: '✨', description: 'Stardust bonus increased to 10%' } },
    { level: 20, perk: { id: 'guild_realm', name: 'Guild Realm', icon: '🌌', description: 'Access exclusive guild realm' } },
    { level: 25, perk: { id: 'weekly_gift', name: 'Weekly Gift', icon: '🎁', description: 'All members receive weekly gift' } },
    { level: 30, perk: { id: 'bonus_xp_15', name: '+15% XP', icon: '⭐', description: 'XP bonus increased to 15%' } },
    { level: 40, perk: { id: 'legendary_frame', name: 'Legendary Frame', icon: '👑', description: 'Exclusive guild member frame' } },
    { level: 50, perk: { id: 'guild_constellation', name: 'Guild Constellation', icon: '🌟', description: 'Form guild constellation in the sky' } },
];

// ============================================
// SERVICE CLASS
// ============================================

export class GuildService extends EventEmitter {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('🏛️ Initializing Guild Service...');

        // Reset weekly contributions on Mondays
        this.scheduleWeeklyReset();

        this.initialized = true;
        console.log('🏛️ Guild Service initialized');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GUILD CRUD OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    async createGuild(
        leaderId: string,
        leaderName: string,
        leaderLevel: number,
        data: GuildCreateData
    ): Promise<IGuild | null> {
        try {
            // Validate name and tag uniqueness
            const existingName = await Guild.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } });
            if (existingName) {
                throw new Error('Guild name already taken');
            }

            const existingTag = await Guild.findOne({ tag: data.tag.toUpperCase() });
            if (existingTag) {
                throw new Error('Guild tag already taken');
            }

            // Check if player is already in a guild
            const playerGuild = await this.getPlayerGuild(leaderId);
            if (playerGuild) {
                throw new Error('Player is already in a guild');
            }

            const guildId = crypto.randomBytes(8).toString('hex');
            const now = new Date();

            const guild = new Guild({
                guildId,
                name: data.name,
                tag: data.tag.toUpperCase(),
                description: data.description || '',
                icon: data.icon || '⭐',
                color: data.color || '200',
                leaderId,
                leaderName,
                members: [{
                    playerId: leaderId,
                    playerName: leaderName,
                    role: 'leader',
                    joinedAt: now,
                    contributions: { stardust: 0, challenges: 0, xp: 0 },
                    lastActiveAt: now
                }],
                perks: [{ ...GUILD_PERKS[0].perk, unlockedAt: now }],
                isPublic: data.isPublic ?? true,
                minLevelToJoin: data.minLevelToJoin ?? 1,
                requiresApproval: data.requiresApproval ?? false,
                weeklyContributions: {
                    stardust: 0,
                    challenges: 0,
                    xp: 0,
                    weekStart: this.getWeekStart()
                }
            });

            await guild.save();

            this.emit('guild_created', { guildId, name: data.name, leaderId });

            return guild;
        } catch (error) {
            console.error('Error creating guild:', error);
            throw error;
        }
    }

    async getGuild(guildId: string): Promise<IGuild | null> {
        return Guild.findOne({ guildId });
    }

    async getGuildByName(name: string): Promise<IGuild | null> {
        return Guild.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    }

    async getPlayerGuild(playerId: string): Promise<IGuild | null> {
        return Guild.findOne({ 'members.playerId': playerId });
    }

    async updateGuild(guildId: string, playerId: string, updates: GuildUpdateData): Promise<IGuild | null> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) return null;

        // Check permissions
        const member = guild.members.find(m => m.playerId === playerId);
        if (!member || (member.role !== 'leader' && member.role !== 'officer')) {
            throw new Error('Insufficient permissions');
        }

        // Apply updates
        if (updates.description !== undefined) guild.description = updates.description;
        if (updates.icon !== undefined) guild.icon = updates.icon;
        if (updates.color !== undefined) guild.color = updates.color;
        if (updates.isPublic !== undefined) guild.isPublic = updates.isPublic;
        if (updates.minLevelToJoin !== undefined) guild.minLevelToJoin = updates.minLevelToJoin;
        if (updates.requiresApproval !== undefined) guild.requiresApproval = updates.requiresApproval;
        if (updates.maxMembers !== undefined && member.role === 'leader') {
            guild.maxMembers = Math.max(5, Math.min(100, updates.maxMembers));
        }

        await guild.save();

        this.emit('guild_updated', { guildId, updates });

        return guild;
    }

    async deleteGuild(guildId: string, playerId: string): Promise<boolean> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) return false;

        // Only leader can delete
        if (guild.leaderId !== playerId) {
            throw new Error('Only the guild leader can delete the guild');
        }

        await Guild.deleteOne({ guildId });
        await GuildGift.deleteMany({ guildId });
        await GuildApplication.deleteMany({ guildId });

        this.emit('guild_deleted', { guildId, name: guild.name });

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MEMBERSHIP MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    async joinGuild(guildId: string, playerId: string, playerName: string, playerLevel: number): Promise<IGuild | null> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) throw new Error('Guild not found');

        // Check if already a member
        if (guild.members.some(m => m.playerId === playerId)) {
            throw new Error('Already a member of this guild');
        }

        // Check if player is in another guild
        const existingGuild = await this.getPlayerGuild(playerId);
        if (existingGuild) {
            throw new Error('Already in another guild');
        }

        // Check capacity
        if (guild.members.length >= guild.maxMembers) {
            throw new Error('Guild is full');
        }

        // Check level requirement
        if (playerLevel < guild.minLevelToJoin) {
            throw new Error(`Must be level ${guild.minLevelToJoin} to join`);
        }

        // Check if requires approval
        if (guild.requiresApproval && !guild.isPublic) {
            // Create application instead
            await this.applyToGuild(guildId, playerId, playerName, playerLevel);
            throw new Error('Application submitted for approval');
        }

        // Add member
        const now = new Date();
        guild.members.push({
            playerId,
            playerName,
            role: 'member',
            joinedAt: now,
            contributions: { stardust: 0, challenges: 0, xp: 0 },
            lastActiveAt: now
        });

        await guild.save();

        this.emit('member_joined', { guildId, playerId, playerName });

        return guild;
    }

    async leaveGuild(guildId: string, playerId: string): Promise<boolean> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) return false;

        const memberIndex = guild.members.findIndex(m => m.playerId === playerId);
        if (memberIndex === -1) return false;

        const member = guild.members[memberIndex];

        // Leader cannot leave, must transfer or delete
        if (member.role === 'leader') {
            if (guild.members.length > 1) {
                throw new Error('Transfer leadership before leaving');
            } else {
                // Last member, delete guild
                await this.deleteGuild(guildId, playerId);
                return true;
            }
        }

        guild.members.splice(memberIndex, 1);
        await guild.save();

        this.emit('member_left', { guildId, playerId });

        return true;
    }

    async kickMember(guildId: string, actorId: string, targetId: string): Promise<boolean> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) return false;

        const actor = guild.members.find(m => m.playerId === actorId);
        const target = guild.members.find(m => m.playerId === targetId);

        if (!actor || !target) return false;

        // Check permissions
        if (actor.role === 'member') {
            throw new Error('Insufficient permissions');
        }
        if (target.role === 'leader') {
            throw new Error('Cannot kick the leader');
        }
        if (actor.role === 'officer' && target.role === 'officer') {
            throw new Error('Officers cannot kick other officers');
        }

        guild.members = guild.members.filter(m => m.playerId !== targetId);
        await guild.save();

        this.emit('member_kicked', { guildId, actorId, targetId });

        return true;
    }

    async updateMemberRole(
        guildId: string,
        actorId: string,
        targetId: string,
        newRole: 'officer' | 'member'
    ): Promise<boolean> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) return false;

        const actor = guild.members.find(m => m.playerId === actorId);
        const target = guild.members.find(m => m.playerId === targetId);

        if (!actor || !target) return false;

        // Only leader can change roles
        if (actor.role !== 'leader') {
            throw new Error('Only the leader can change roles');
        }

        target.role = newRole;
        await guild.save();

        this.emit('member_role_changed', { guildId, targetId, newRole });

        return true;
    }

    async transferLeadership(guildId: string, currentLeaderId: string, newLeaderId: string): Promise<boolean> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) return false;

        if (guild.leaderId !== currentLeaderId) {
            throw new Error('Only the current leader can transfer leadership');
        }

        const newLeader = guild.members.find(m => m.playerId === newLeaderId);
        if (!newLeader) {
            throw new Error('New leader must be a guild member');
        }

        // Update roles
        const oldLeader = guild.members.find(m => m.playerId === currentLeaderId);
        if (oldLeader) oldLeader.role = 'officer';
        newLeader.role = 'leader';

        guild.leaderId = newLeaderId;
        guild.leaderName = newLeader.playerName;

        await guild.save();

        this.emit('leadership_transferred', { guildId, oldLeaderId: currentLeaderId, newLeaderId });

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPLICATIONS
    // ─────────────────────────────────────────────────────────────────────────

    async applyToGuild(
        guildId: string,
        playerId: string,
        playerName: string,
        playerLevel: number,
        message: string = ''
    ): Promise<IGuildApplication> {
        // Check for existing pending application
        const existing = await GuildApplication.findOne({
            guildId,
            playerId,
            status: 'pending'
        });
        if (existing) {
            throw new Error('Application already pending');
        }

        const application = new GuildApplication({
            applicationId: crypto.randomBytes(8).toString('hex'),
            guildId,
            guildName: (await Guild.findOne({ guildId }))?.name || 'Unknown',
            playerId,
            playerName,
            playerLevel,
            message,
            status: 'pending'
        });

        await application.save();

        this.emit('application_received', { guildId, playerId, applicationId: application.applicationId });

        return application;
    }

    async reviewApplication(
        applicationId: string,
        reviewerId: string,
        approved: boolean
    ): Promise<boolean> {
        const application = await GuildApplication.findOne({ applicationId });
        if (!application || application.status !== 'pending') return false;

        const guild = await Guild.findOne({ guildId: application.guildId });
        if (!guild) return false;

        // Check reviewer permissions
        const reviewer = guild.members.find(m => m.playerId === reviewerId);
        if (!reviewer || reviewer.role === 'member') {
            throw new Error('Insufficient permissions');
        }

        application.status = approved ? 'approved' : 'rejected';
        application.reviewedBy = reviewerId;
        application.reviewedAt = new Date();
        await application.save();

        if (approved) {
            // Add to guild
            try {
                await this.joinGuild(
                    application.guildId,
                    application.playerId,
                    application.playerName,
                    application.playerLevel
                );
            } catch (err) {
                // If join fails, revert application
                application.status = 'pending';
                application.reviewedBy = undefined;
                application.reviewedAt = undefined;
                await application.save();
                throw err;
            }
        }

        this.emit('application_reviewed', {
            applicationId,
            approved,
            playerId: application.playerId
        });

        return true;
    }

    async getGuildApplications(guildId: string): Promise<IGuildApplication[]> {
        return GuildApplication.find({ guildId, status: 'pending' }).sort({ createdAt: -1 });
    }

    async getPlayerApplications(playerId: string): Promise<IGuildApplication[]> {
        return GuildApplication.find({ playerId }).sort({ createdAt: -1 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONTRIBUTIONS & XP
    // ─────────────────────────────────────────────────────────────────────────

    async contribute(
        guildId: string,
        playerId: string,
        contribution: ContributionData
    ): Promise<{ guild: IGuild; leveledUp: boolean; newPerks: string[] }> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) throw new Error('Guild not found');

        const member = guild.members.find(m => m.playerId === playerId);
        if (!member) throw new Error('Not a guild member');

        // Update member contributions
        if (contribution.stardust) {
            member.contributions.stardust += contribution.stardust;
            guild.totalContributions.stardust += contribution.stardust;
            guild.weeklyContributions.stardust += contribution.stardust;
        }
        if (contribution.challenges) {
            member.contributions.challenges += contribution.challenges;
            guild.totalContributions.challenges += contribution.challenges;
            guild.weeklyContributions.challenges += contribution.challenges;
        }
        if (contribution.xp) {
            member.contributions.xp += contribution.xp;
            guild.totalContributions.xp += contribution.xp;
            guild.weeklyContributions.xp += contribution.xp;
        }

        member.lastActiveAt = new Date();

        // Calculate XP gained (10% of stardust, 50xp per challenge, 5% of xp)
        const xpGained = Math.floor(
            (contribution.stardust || 0) * 0.1 +
            (contribution.challenges || 0) * 50 +
            (contribution.xp || 0) * 0.05
        );

        guild.xp += xpGained;

        // Check for level up
        let leveledUp = false;
        const newPerks: string[] = [];

        while (guild.level < MAX_GUILD_LEVEL) {
            const xpRequired = this.getXPForLevel(guild.level + 1);
            if (guild.xp >= xpRequired) {
                guild.level++;
                leveledUp = true;

                // Check for new perks
                const perkUnlock = GUILD_PERKS.find(p => p.level === guild.level);
                if (perkUnlock) {
                    guild.perks.push({
                        ...perkUnlock.perk,
                        level: perkUnlock.level,
                        unlockedAt: new Date()
                    });
                    newPerks.push(perkUnlock.perk.name);
                }

                // Increase member cap every 5 levels
                if (guild.level % 5 === 0 && guild.maxMembers < 100) {
                    guild.maxMembers += 5;
                }
            } else {
                guild.xpToNextLevel = xpRequired - guild.xp;
                break;
            }
        }

        await guild.save();

        if (leveledUp) {
            this.emit('guild_leveled_up', { guildId, level: guild.level, newPerks });
        }

        this.emit('contribution_made', { guildId, playerId, contribution, xpGained });

        return { guild, leveledUp, newPerks };
    }

    private getXPForLevel(level: number): number {
        if (level <= GUILD_LEVEL_XP.length) {
            return GUILD_LEVEL_XP[level - 1];
        }
        // Exponential scaling after predefined levels
        return Math.floor(GUILD_LEVEL_XP[GUILD_LEVEL_XP.length - 1] * Math.pow(1.5, level - GUILD_LEVEL_XP.length));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHAT
    // ─────────────────────────────────────────────────────────────────────────

    async sendChatMessage(
        guildId: string,
        playerId: string,
        message: string
    ): Promise<IGuild | null> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) return null;

        const member = guild.members.find(m => m.playerId === playerId);
        if (!member) throw new Error('Not a guild member');

        // Check if chat is unlocked (level 5)
        const hasChatPerk = guild.perks.some(p => p.id === 'guild_chat');
        if (!hasChatPerk) {
            throw new Error('Guild chat unlocks at level 5');
        }

        const chatMessage = {
            messageId: crypto.randomBytes(8).toString('hex'),
            playerId,
            playerName: member.playerName,
            playerRole: member.role,
            message: message.substring(0, 500),
            timestamp: new Date()
        };

        guild.chat.push(chatMessage);

        // Trim to last 100 messages
        if (guild.chat.length > 100) {
            guild.chat = guild.chat.slice(-100);
        }

        await guild.save();

        this.emit('chat_message', { guildId, message: chatMessage });

        return guild;
    }

    async getChatHistory(guildId: string, limit: number = 50): Promise<IGuild['chat']> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) return [];

        return guild.chat.slice(-limit);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GIFTS
    // ─────────────────────────────────────────────────────────────────────────

    async sendGuildGift(
        guildId: string,
        recipientId: string,
        type: 'stardust' | 'cosmetic' | 'xpBoost' | 'mysteryBox',
        amount: number,
        cosmeticId?: string,
        message?: string
    ): Promise<IGuildGift> {
        const guild = await Guild.findOne({ guildId });
        if (!guild) throw new Error('Guild not found');

        const recipient = guild.members.find(m => m.playerId === recipientId);
        if (!recipient) throw new Error('Recipient not in guild');

        const gift = new GuildGift({
            giftId: crypto.randomBytes(8).toString('hex'),
            guildId,
            guildName: guild.name,
            recipientId,
            recipientName: recipient.playerName,
            type,
            amount,
            cosmeticId,
            message,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        await gift.save();

        this.emit('guild_gift_sent', { guildId, recipientId, giftId: gift.giftId, type });

        return gift;
    }

    async claimGuildGift(giftId: string, playerId: string): Promise<IGuildGift | null> {
        const gift = await GuildGift.findOne({ giftId, recipientId: playerId, claimedAt: null });
        if (!gift) return null;

        gift.claimedAt = new Date();
        await gift.save();

        this.emit('guild_gift_claimed', { giftId, playerId, type: gift.type, amount: gift.amount });

        return gift;
    }

    async getPendingGifts(playerId: string): Promise<IGuildGift[]> {
        return GuildGift.find({
            recipientId: playerId,
            claimedAt: null,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SEARCH & LEADERBOARD
    // ─────────────────────────────────────────────────────────────────────────

    async searchGuilds(options: GuildSearchOptions): Promise<IGuild[]> {
        const query: any = {};

        if (options.query) {
            query.$or = [
                { name: { $regex: options.query, $options: 'i' } },
                { tag: { $regex: options.query, $options: 'i' } }
            ];
        }
        if (options.minLevel) query.level = { $gte: options.minLevel };
        if (options.maxLevel) query.level = { ...query.level, $lte: options.maxLevel };
        if (options.isPublic !== undefined) query.isPublic = options.isPublic;
        if (options.hasSpace) {
            query.$expr = { $lt: [{ $size: '$members' }, '$maxMembers'] };
        }

        let sortOption: any = {};
        switch (options.sortBy) {
            case 'level': sortOption = { level: -1, xp: -1 }; break;
            case 'members': sortOption = { 'members.length': -1 }; break;
            case 'contributions': sortOption = { 'totalContributions.stardust': -1 }; break;
            case 'name': sortOption = { name: 1 }; break;
            default: sortOption = { level: -1 };
        }

        return Guild.find(query)
            .sort(sortOption)
            .skip(options.offset || 0)
            .limit(Math.min(options.limit || 20, 50));
    }

    async getGuildLeaderboard(limit: number = 10): Promise<IGuild[]> {
        return Guild.find()
            .sort({ level: -1, xp: -1 })
            .limit(limit)
            .select('guildId name tag level xp members icon color');
    }

    async getWeeklyLeaderboard(limit: number = 10): Promise<IGuild[]> {
        return Guild.find()
            .sort({ 'weeklyContributions.stardust': -1 })
            .limit(limit)
            .select('guildId name tag level weeklyContributions members icon color');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BONUSES
    // ─────────────────────────────────────────────────────────────────────────

    async getPlayerGuildBonuses(playerId: string): Promise<{ xpBonus: number; stardustBonus: number }> {
        const guild = await this.getPlayerGuild(playerId);
        if (!guild) return { xpBonus: 0, stardustBonus: 0 };

        let xpBonus = 0;
        let stardustBonus = 0;

        for (const perk of guild.perks) {
            if (perk.id === 'bonus_xp_5') xpBonus = Math.max(xpBonus, 0.05);
            if (perk.id === 'bonus_xp_10') xpBonus = Math.max(xpBonus, 0.10);
            if (perk.id === 'bonus_xp_15') xpBonus = Math.max(xpBonus, 0.15);
            if (perk.id === 'bonus_stardust_5') stardustBonus = Math.max(stardustBonus, 0.05);
            if (perk.id === 'bonus_stardust_10') stardustBonus = Math.max(stardustBonus, 0.10);
        }

        return { xpBonus, stardustBonus };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WEEKLY RESET
    // ─────────────────────────────────────────────────────────────────────────

    private getWeekStart(): string {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0];
    }

    private scheduleWeeklyReset(): void {
        // Check every hour if we need to reset
        setInterval(async () => {
            const currentWeekStart = this.getWeekStart();

            const guildsToReset = await Guild.find({
                'weeklyContributions.weekStart': { $ne: currentWeekStart }
            });

            for (const guild of guildsToReset) {
                guild.weeklyContributions = {
                    stardust: 0,
                    challenges: 0,
                    xp: 0,
                    weekStart: currentWeekStart
                };
                await guild.save();
            }

            if (guildsToReset.length > 0) {
                console.log(`🔄 Reset weekly contributions for ${guildsToReset.length} guilds`);
            }
        }, 60 * 60 * 1000); // Check every hour
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHUTDOWN
    // ─────────────────────────────────────────────────────────────────────────

    async shutdown(): Promise<void> {
        console.log('🏛️ Guild Service shutting down...');
    }
}

export const guildService = new GuildService();
