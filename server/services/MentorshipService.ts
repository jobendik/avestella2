// Mentorship Service - Manages mentor/mentee relationships
// Per lumina-viral-bible.md Section 4.5

import { MentorProfile, IMentorProfile, MentorshipSession, IMentorshipSession } from '../database/socialModels.js';
import crypto from 'crypto';

// Mentor level thresholds (from constants/mentorship.ts)
const MENTOR_LEVELS = [
    { level: 1, name: 'Novice Mentor', menteesHelped: 0 },
    { level: 2, name: 'Guide', menteesHelped: 5 },
    { level: 3, name: 'Teacher', menteesHelped: 15 },
    { level: 4, name: 'Sage', menteesHelped: 30 },
    { level: 5, name: 'Master Mentor', menteesHelped: 50 },
    { level: 6, name: 'Legendary Mentor', menteesHelped: 100 }
];

const MENTOR_REQUIREMENTS = {
    minLevel: 20,
    minSealedBonds: 10,
    completedTutorial: true
};

const MENTEE_GRADUATION_LEVEL = 10;

function generateSessionId(): string {
    return 'session_' + crypto.randomBytes(6).toString('hex');
}

function getMentorLevel(menteesHelped: number): number {
    for (let i = MENTOR_LEVELS.length - 1; i >= 0; i--) {
        if (menteesHelped >= MENTOR_LEVELS[i].menteesHelped) {
            return MENTOR_LEVELS[i].level;
        }
    }
    return 1;
}

export interface MentorSearchResult {
    playerId: string;
    playerName: string;
    mentorLevel: number;
    menteesHelped: number;
    rating: number;
    isAvailable: boolean;
}

export class MentorshipService {
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('🎓 Mentorship service initialized');
    }

    isReady(): boolean {
        return this.initialized;
    }

    // ========================================
    // PROFILE MANAGEMENT
    // ========================================

    async getOrCreateProfile(playerId: string, playerName: string): Promise<IMentorProfile> {
        let profile = await MentorProfile.findOne({ playerId });
        
        if (!profile) {
            profile = new MentorProfile({
                playerId,
                playerName,
                isMentor: false,
                mentorLevel: 1,
                menteesHelped: 0,
                activeMentees: [],
                currentMentor: null,
                sessionsCompleted: 0,
                totalMentoringTime: 0,
                rating: 5,
                ratingCount: 0,
                hasGraduated: false
            });
            await profile.save();
        }
        
        return profile;
    }

    async updateProfile(playerId: string, updates: Partial<IMentorProfile>): Promise<IMentorProfile | null> {
        return MentorProfile.findOneAndUpdate(
            { playerId },
            { $set: updates },
            { new: true }
        );
    }

    // ========================================
    // MENTOR QUALIFICATION
    // ========================================

    async qualifyAsMentor(playerId: string, playerLevel: number, sealedBonds: number): Promise<{
        success: boolean;
        error?: string;
    }> {
        if (playerLevel < MENTOR_REQUIREMENTS.minLevel) {
            return { success: false, error: `Must be level ${MENTOR_REQUIREMENTS.minLevel} or higher` };
        }
        
        if (sealedBonds < MENTOR_REQUIREMENTS.minSealedBonds) {
            return { success: false, error: `Must have ${MENTOR_REQUIREMENTS.minSealedBonds} sealed bonds` };
        }

        const profile = await MentorProfile.findOne({ playerId });
        if (!profile) {
            return { success: false, error: 'Profile not found' };
        }

        profile.isMentor = true;
        await profile.save();

        return { success: true };
    }

    async isMentor(playerId: string): Promise<boolean> {
        const profile = await MentorProfile.findOne({ playerId });
        return profile?.isMentor || false;
    }

    // ========================================
    // MENTEE MANAGEMENT
    // ========================================

    async assignMentor(menteeId: string, mentorId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const mentorProfile = await MentorProfile.findOne({ playerId: mentorId });
        if (!mentorProfile?.isMentor) {
            return { success: false, error: 'Invalid mentor' };
        }

        const menteeProfile = await this.getOrCreateProfile(menteeId, 'Mentee');
        
        if (menteeProfile.currentMentor) {
            return { success: false, error: 'Already has a mentor' };
        }

        if (menteeProfile.hasGraduated) {
            return { success: false, error: 'Already graduated from mentorship' };
        }

        // Assign mentor
        menteeProfile.currentMentor = mentorId;
        await menteeProfile.save();

        // Add to mentor's active mentees
        mentorProfile.activeMentees.push(menteeId);
        await mentorProfile.save();

        return { success: true };
    }

    async removeMentor(menteeId: string): Promise<boolean> {
        const menteeProfile = await MentorProfile.findOne({ playerId: menteeId });
        if (!menteeProfile?.currentMentor) return false;

        const mentorId = menteeProfile.currentMentor;
        
        // Remove from mentee
        menteeProfile.currentMentor = null;
        await menteeProfile.save();

        // Remove from mentor's list
        await MentorProfile.findOneAndUpdate(
            { playerId: mentorId },
            { $pull: { activeMentees: menteeId } }
        );

        return true;
    }

    async graduateMentee(menteeId: string): Promise<{
        success: boolean;
        mentorId?: string;
        rewards?: { stardust: number; cosmetic: string };
    }> {
        const menteeProfile = await MentorProfile.findOne({ playerId: menteeId });
        if (!menteeProfile?.currentMentor) {
            return { success: false };
        }

        const mentorId = menteeProfile.currentMentor;

        // Graduate the mentee
        menteeProfile.hasGraduated = true;
        menteeProfile.graduatedAt = new Date();
        menteeProfile.currentMentor = null;
        await menteeProfile.save();

        // Update mentor stats
        const mentorProfile = await MentorProfile.findOne({ playerId: mentorId });
        if (mentorProfile) {
            mentorProfile.menteesHelped++;
            mentorProfile.mentorLevel = getMentorLevel(mentorProfile.menteesHelped);
            mentorProfile.activeMentees = mentorProfile.activeMentees.filter(id => id !== menteeId);
            await mentorProfile.save();
        }

        return {
            success: true,
            mentorId,
            rewards: { stardust: 500, cosmetic: 'cosmetic_graduate' }
        };
    }

    // ========================================
    // MENTORSHIP SESSIONS
    // ========================================

    async startSession(mentorId: string, menteeId: string): Promise<IMentorshipSession | null> {
        // Verify relationship
        const menteeProfile = await MentorProfile.findOne({ playerId: menteeId });
        if (menteeProfile?.currentMentor !== mentorId) {
            return null;
        }

        // Check for existing active session
        const existing = await MentorshipSession.findOne({
            mentorId,
            menteeId,
            status: 'active'
        });
        if (existing) return existing;

        const session = new MentorshipSession({
            sessionId: generateSessionId(),
            mentorId,
            menteeId,
            startTime: new Date(),
            status: 'active',
            activitiesCompleted: [],
            xpAwarded: 0,
            bonusAwarded: 0
        });
        await session.save();

        return session;
    }

    async endSession(sessionId: string, rating?: number, feedback?: string): Promise<{
        success: boolean;
        duration: number;
        xpAwarded: number;
    }> {
        const session = await MentorshipSession.findOne({ sessionId, status: 'active' });
        if (!session) {
            return { success: false, duration: 0, xpAwarded: 0 };
        }

        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 60000); // minutes
        
        // Calculate XP based on duration and activities
        const baseXP = Math.min(duration * 5, 100); // Max 100 XP from time
        const activityXP = session.activitiesCompleted.length * 20;
        const xpAwarded = baseXP + activityXP;

        session.endTime = endTime;
        session.duration = duration;
        session.status = 'completed';
        session.xpAwarded = xpAwarded;
        if (rating) session.rating = rating;
        if (feedback) session.feedback = feedback;
        await session.save();

        // Update mentor stats
        await MentorProfile.findOneAndUpdate(
            { playerId: session.mentorId },
            {
                $inc: {
                    sessionsCompleted: 1,
                    totalMentoringTime: duration
                },
                $set: { lastSessionAt: endTime }
            }
        );

        // Update mentor rating if provided
        if (rating) {
            const mentor = await MentorProfile.findOne({ playerId: session.mentorId });
            if (mentor) {
                const newRatingCount = mentor.ratingCount + 1;
                const newRating = ((mentor.rating * mentor.ratingCount) + rating) / newRatingCount;
                mentor.rating = Math.round(newRating * 10) / 10;
                mentor.ratingCount = newRatingCount;
                await mentor.save();
            }
        }

        // Update mentee stats
        await MentorProfile.findOneAndUpdate(
            { playerId: session.menteeId },
            {
                $inc: { sessionsCompleted: 1 },
                $set: { lastSessionAt: endTime }
            }
        );

        return { success: true, duration, xpAwarded };
    }

    async addSessionActivity(sessionId: string, activity: string): Promise<boolean> {
        const result = await MentorshipSession.findOneAndUpdate(
            { sessionId, status: 'active' },
            { $addToSet: { activitiesCompleted: activity } }
        );
        return !!result;
    }

    async getActiveSession(playerId: string): Promise<IMentorshipSession | null> {
        return MentorshipSession.findOne({
            $or: [{ mentorId: playerId }, { menteeId: playerId }],
            status: 'active'
        });
    }

    async getSessionHistory(playerId: string, limit: number = 20): Promise<IMentorshipSession[]> {
        return MentorshipSession.find({
            $or: [{ mentorId: playerId }, { menteeId: playerId }],
            status: 'completed'
        })
        .sort({ endTime: -1 })
        .limit(limit);
    }

    // ========================================
    // MENTOR SEARCH
    // ========================================

    async findAvailableMentors(limit: number = 20): Promise<MentorSearchResult[]> {
        const mentors = await MentorProfile.find({
            isMentor: true,
            $expr: { $lt: [{ $size: '$activeMentees' }, 5] } // Max 5 mentees
        })
        .sort({ rating: -1, menteesHelped: -1 })
        .limit(limit)
        .lean();

        return mentors.map(m => ({
            playerId: m.playerId,
            playerName: m.playerName,
            mentorLevel: m.mentorLevel,
            menteesHelped: m.menteesHelped,
            rating: m.rating,
            isAvailable: m.activeMentees.length < 5
        }));
    }

    async getMentorLeaderboard(limit: number = 50): Promise<any[]> {
        const mentors = await MentorProfile.find({ isMentor: true })
            .sort({ menteesHelped: -1, rating: -1 })
            .limit(limit)
            .lean();

        return mentors.map((m, i) => ({
            rank: i + 1,
            playerId: m.playerId,
            playerName: m.playerName,
            mentorLevel: m.mentorLevel,
            menteesHelped: m.menteesHelped,
            rating: m.rating,
            totalTime: m.totalMentoringTime
        }));
    }
}

// Export singleton
export const mentorshipService = new MentorshipService();
export default mentorshipService;
