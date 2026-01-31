// Referral Service - Manages referral codes and rewards
// Per lumina-viral-bible.md Section 15.2

import { ReferralCode, IReferralCode, Referral, IReferral } from '../database/socialModels.js';
import { Progression } from '../database/progressionModels.js';
import crypto from 'crypto';

// Referral milestones from constants/referral.ts
const REFERRAL_MILESTONES = [
    { milestone: 1, stardust: 500, crystals: 50, refereeStardust: 500, refereeCrystals: 50 },
    { milestone: 3, stardust: 1000, crystals: 100, refereeStardust: 300 },
    { milestone: 5, stardust: 2000, crystals: 150, cosmetic: 'referral_trail_5', refereeStardust: 300 },
    { milestone: 10, stardust: 5000, crystals: 300, cosmetic: 'referral_aura_10', title: 'Social Butterfly', refereeStardust: 300 },
    { milestone: 25, stardust: 10000, crystals: 500, cosmetic: 'referral_frame_25', title: 'Community Builder', refereeStardust: 300 },
    { milestone: 50, stardust: 25000, crystals: 1000, cosmetic: 'referral_legendary_set_50', title: 'Beacon of Welcome', refereeStardust: 500, refereeCrystals: 25 },
    { milestone: 100, stardust: 50000, crystals: 2500, cosmetic: 'referral_mythic_set_100', title: 'Legendary Ambassador', refereeStardust: 1000, refereeCrystals: 50 },
];

function generateCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export interface ReferralStats {
    totalReferrals: number;
    conversions: number;
    totalStardustEarned: number;
    totalCrystalsEarned: number;
    nextMilestone: number | null;
    referralsToNextMilestone: number;
}

export class ReferralService {
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('📢 Referral service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    // ========================================
    // REFERRAL CODE MANAGEMENT
    // ========================================

    async getOrCreateReferralCode(playerId: string, playerName: string): Promise<IReferralCode> {
        let code = await ReferralCode.findOne({ ownerId: playerId });
        
        if (!code) {
            // Generate unique code
            let newCode = generateCode();
            let attempts = 0;
            while (await ReferralCode.findOne({ code: newCode }) && attempts < 10) {
                newCode = generateCode();
                attempts++;
            }
            
            code = new ReferralCode({
                code: newCode,
                ownerId: playerId,
                ownerName: playerName,
                usageCount: 0,
                conversions: 0,
                totalRewardsEarned: { stardust: 0, crystals: 0 },
                isActive: true
            });
            await code.save();
        }
        
        return code;
    }

    async getReferralCode(playerId: string): Promise<IReferralCode | null> {
        return ReferralCode.findOne({ ownerId: playerId });
    }

    async lookupCode(code: string): Promise<IReferralCode | null> {
        return ReferralCode.findOne({ code: code.toUpperCase(), isActive: true });
    }

    // ========================================
    // USING REFERRAL CODES
    // ========================================

    async useReferralCode(refereeId: string, refereeName: string, code: string): Promise<{
        success: boolean;
        error?: string;
        referrerId?: string;
        refereeRewards?: { stardust: number; crystals: number };
    }> {
        // Check if player was already referred
        const existingReferral = await Referral.findOne({ refereeId });
        if (existingReferral) {
            return { success: false, error: 'You have already used a referral code' };
        }

        // Find the code
        const referralCode = await ReferralCode.findOne({ code: code.toUpperCase(), isActive: true });
        if (!referralCode) {
            return { success: false, error: 'Invalid or inactive referral code' };
        }

        // Can't refer yourself
        if (referralCode.ownerId === refereeId) {
            return { success: false, error: 'You cannot use your own referral code' };
        }

        // Check max uses
        if (referralCode.maxUses && referralCode.usageCount >= referralCode.maxUses) {
            return { success: false, error: 'This referral code has reached its maximum uses' };
        }

        // Create referral relationship
        const referral = new Referral({
            referrerId: referralCode.ownerId,
            refereeId,
            refereeName,
            code: referralCode.code,
            refereeLevel: 1,
            hasConverted: false,
            bonusXpEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days bonus
        });
        await referral.save();

        // Increment code usage
        referralCode.usageCount++;
        await referralCode.save();

        // Award referee welcome bonus (first milestone referee reward)
        const refereeRewards = { stardust: 500, crystals: 50 };

        return {
            success: true,
            referrerId: referralCode.ownerId,
            refereeRewards
        };
    }

    // ========================================
    // MILESTONE REWARDS
    // ========================================

    async getReferralStats(playerId: string): Promise<ReferralStats> {
        const code = await ReferralCode.findOne({ ownerId: playerId });
        const referrals = await Referral.find({ referrerId: playerId });
        
        const totalReferrals = referrals.length;
        const conversions = referrals.filter(r => r.hasConverted).length;
        
        // Find next milestone
        let nextMilestone: number | null = null;
        for (const m of REFERRAL_MILESTONES) {
            if (totalReferrals < m.milestone) {
                nextMilestone = m.milestone;
                break;
            }
        }

        return {
            totalReferrals,
            conversions,
            totalStardustEarned: code?.totalRewardsEarned.stardust || 0,
            totalCrystalsEarned: code?.totalRewardsEarned.crystals || 0,
            nextMilestone,
            referralsToNextMilestone: nextMilestone ? nextMilestone - totalReferrals : 0
        };
    }

    async checkAndAwardMilestones(referrerId: string): Promise<{
        newMilestones: number[];
        rewards: { stardust: number; crystals: number; cosmetics: string[]; titles: string[] };
    }> {
        const referrals = await Referral.find({ referrerId });
        const count = referrals.length;
        
        // Get already claimed milestones from first referral (any of them stores the claimed list)
        const claimedMilestones = new Set<number>();
        for (const r of referrals) {
            r.referrerRewardsClaimed.forEach(m => claimedMilestones.add(m));
        }

        const newMilestones: number[] = [];
        const rewards = { stardust: 0, crystals: 0, cosmetics: [] as string[], titles: [] as string[] };

        for (const milestone of REFERRAL_MILESTONES) {
            if (count >= milestone.milestone && !claimedMilestones.has(milestone.milestone)) {
                newMilestones.push(milestone.milestone);
                rewards.stardust += milestone.stardust;
                rewards.crystals += milestone.crystals;
                if (milestone.cosmetic) rewards.cosmetics.push(milestone.cosmetic);
                if (milestone.title) rewards.titles.push(milestone.title);
            }
        }

        // Mark milestones as claimed
        if (newMilestones.length > 0) {
            await Referral.updateMany(
                { referrerId },
                { $addToSet: { referrerRewardsClaimed: { $each: newMilestones } } }
            );

            // Update total rewards earned
            await ReferralCode.findOneAndUpdate(
                { ownerId: referrerId },
                { 
                    $inc: { 
                        'totalRewardsEarned.stardust': rewards.stardust,
                        'totalRewardsEarned.crystals': rewards.crystals
                    }
                }
            );
        }

        return { newMilestones, rewards };
    }

    // ========================================
    // REFEREE LEVEL TRACKING
    // ========================================

    async updateRefereeLevel(refereeId: string, newLevel: number): Promise<{
        converted: boolean;
        referrerId?: string;
    }> {
        const referral = await Referral.findOne({ refereeId });
        if (!referral) {
            return { converted: false };
        }

        referral.refereeLevel = newLevel;
        
        // Check for conversion (reaching level 10)
        if (newLevel >= 10 && !referral.hasConverted) {
            referral.hasConverted = true;
            
            // Increment conversions on the code
            await ReferralCode.findOneAndUpdate(
                { code: referral.code },
                { $inc: { conversions: 1 } }
            );
            
            await referral.save();
            return { converted: true, referrerId: referral.referrerId };
        }

        await referral.save();
        return { converted: false };
    }

    async getReferrer(refereeId: string): Promise<string | null> {
        const referral = await Referral.findOne({ refereeId });
        return referral?.referrerId || null;
    }

    async getReferees(referrerId: string): Promise<IReferral[]> {
        return Referral.find({ referrerId }).sort({ createdAt: -1 });
    }

    async hasActiveXPBoost(refereeId: string): Promise<boolean> {
        const referral = await Referral.findOne({ refereeId });
        if (!referral || !referral.bonusXpEndTime) return false;
        return new Date() < referral.bonusXpEndTime;
    }

    // ========================================
    // LEADERBOARDS
    // ========================================

    async getReferralLeaderboard(limit: number = 50): Promise<any[]> {
        const codes = await ReferralCode.find()
            .sort({ usageCount: -1 })
            .limit(limit)
            .lean();

        return codes.map((c, i) => ({
            rank: i + 1,
            playerId: c.ownerId,
            playerName: c.ownerName,
            referrals: c.usageCount,
            conversions: c.conversions,
            totalRewardsEarned: c.totalRewardsEarned
        }));
    }
}

// Export singleton
export const referralService = new ReferralService();
export default referralService;
