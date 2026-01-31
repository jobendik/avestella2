// =============================================================================
// Mentorship Handlers - WebSocket message handlers for mentor/mentee system
// =============================================================================

import type { PlayerConnection, HandlerContext } from '../types.js';
import { mentorshipService } from '../../services/MentorshipService.js';
import { notificationService } from '../../services/NotificationService.js';

export class MentorshipHandlers {
    /**
     * Request to become a mentor
     */
    static async handleBecomeMentor(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { playerLevel = 20, sealedBonds = 10 } = data;
            
            // First ensure profile exists
            await mentorshipService.getOrCreateProfile(connection.playerId, connection.playerName || 'Player');
            
            // Then qualify as mentor
            const result = await mentorshipService.qualifyAsMentor(
                connection.playerId,
                playerLevel,
                sealedBonds
            );

            ctx.send(connection.ws, {
                type: 'mentor_registration',
                data: result,
                timestamp: Date.now()
            });

            if (result.success) {
                notificationService.notify(connection.playerId, 'achievement', 
                    'You are now a mentor. Help guide new players!',
                    { title: 'Mentor Status!' }
                );
            }
        } catch (error) {
            console.error('Error becoming mentor:', error);
        }
    }

    /**
     * Request a mentor (new player looking for guidance)
     */
    static async handleRequestMentor(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { preferredMentorId } = data;

            // Find an available mentor
            const mentors = await mentorshipService.findAvailableMentors(1);
            const mentorId = preferredMentorId || (mentors.length > 0 ? mentors[0].playerId : null);
            
            if (!mentorId) {
                ctx.send(connection.ws, {
                    type: 'mentor_request_sent',
                    data: { success: false, error: 'No mentors available' },
                    timestamp: Date.now()
                });
                return;
            }

            // Assign the mentor
            const result = await mentorshipService.assignMentor(connection.playerId, mentorId);

            ctx.send(connection.ws, {
                type: 'mentor_request_sent',
                data: { ...result, mentorId },
                timestamp: Date.now()
            });

            if (result.success) {
                // Notify the mentor
                const mentorConn = ctx.connections.get(mentorId);
                if (mentorConn) {
                    ctx.send(mentorConn.ws, {
                        type: 'mentee_request',
                        data: {
                            menteeId: connection.playerId,
                            menteeName: connection.playerName
                        },
                        timestamp: Date.now()
                    });
                }

                notificationService.notify(mentorId, 'social',
                    `${connection.playerName || 'A player'} wants you as their mentor!`,
                    { title: 'New Mentee Request!' }
                );
            }
        } catch (error) {
            console.error('Error requesting mentor:', error);
        }
    }

    /**
     * Accept a mentee request (mentor already assigned, this confirms)
     */
    static async handleAcceptMentee(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { menteeId } = data;
            if (!menteeId) return;

            // In this system, assignment is immediate - just confirm
            ctx.send(connection.ws, {
                type: 'mentee_accepted',
                data: { success: true },
                timestamp: Date.now()
            });

            // Notify the mentee
            const menteeConn = ctx.connections.get(menteeId);
            if (menteeConn) {
                ctx.send(menteeConn.ws, {
                    type: 'mentor_assigned',
                    data: {
                        mentorId: connection.playerId,
                        mentorName: connection.playerName
                    },
                    timestamp: Date.now()
                });
            }

            notificationService.notify(menteeId, 'social',
                `${connection.playerName || 'A mentor'} has accepted you!`,
                { title: 'Mentor Found!' }
            );
        } catch (error) {
            console.error('Error accepting mentee:', error);
        }
    }

    /**
     * Decline a mentee request
     */
    static async handleDeclineMentee(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { menteeId } = data;
            if (!menteeId) return;

            // Remove the mentorship
            const success = await mentorshipService.removeMentor(menteeId);

            ctx.send(connection.ws, {
                type: 'mentee_declined',
                data: { success },
                timestamp: Date.now()
            });

            if (success) {
                // Notify the mentee
                const menteeConn = ctx.connections.get(menteeId);
                if (menteeConn) {
                    ctx.send(menteeConn.ws, {
                        type: 'mentor_request_declined',
                        data: { message: 'Your mentor request was declined. Try another mentor!' },
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Error declining mentee:', error);
        }
    }

    /**
     * Get list of available mentors
     */
    static async handleGetAvailableMentors(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { limit } = data;
            const mentors = await mentorshipService.findAvailableMentors(limit || 20);

            // Add online status
            const mentorsWithStatus = mentors.map((mentor) => ({
                ...mentor,
                isOnline: ctx.connections.has(mentor.playerId)
            }));

            ctx.send(connection.ws, {
                type: 'available_mentors',
                data: { mentors: mentorsWithStatus },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting available mentors:', error);
        }
    }

    /**
     * Get mentorship status (current mentor/mentees)
     */
    static async handleGetMentorshipStatus(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const profile = await mentorshipService.getOrCreateProfile(connection.playerId, connection.playerName || 'Player');
            
            const status = {
                isMentor: profile.isMentor,
                mentorLevel: profile.mentorLevel,
                currentMentor: profile.currentMentor,
                activeMentees: profile.activeMentees,
                menteesHelped: profile.menteesHelped,
                rating: profile.rating
            };

            ctx.send(connection.ws, {
                type: 'mentorship_status',
                data: status,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting mentorship status:', error);
        }
    }

    /**
     * End mentorship relationship
     */
    static async handleEndMentorship(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId } = data;
            if (!targetId) return;

            // Remove the mentorship
            const success = await mentorshipService.removeMentor(targetId);

            ctx.send(connection.ws, {
                type: 'mentorship_ended',
                data: { success },
                timestamp: Date.now()
            });

            if (success) {
                // Notify the other party
                const targetConn = ctx.connections.get(targetId);
                if (targetConn) {
                    ctx.send(targetConn.ws, {
                        type: 'mentorship_ended',
                        data: {
                            endedBy: connection.playerId,
                            endedByName: connection.playerName
                        },
                        timestamp: Date.now()
                    });
                }

                notificationService.notify(targetId, 'social',
                    `Your mentorship with ${connection.playerName || 'a player'} has ended.`,
                    { title: 'Mentorship Ended' }
                );
            }
        } catch (error) {
            console.error('Error ending mentorship:', error);
        }
    }

    /**
     * Send a tip/guidance message to mentee
     */
    static async handleSendMentorTip(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { menteeId, tipMessage } = data;
            if (!menteeId || !tipMessage) return;

            // Verify mentor relationship
            const profile = await mentorshipService.getOrCreateProfile(connection.playerId, connection.playerName || 'Player');
            const isMentor = profile.activeMentees?.includes(menteeId);

            if (!isMentor) {
                ctx.send(connection.ws, {
                    type: 'mentor_tip_error',
                    data: { error: 'You are not this player\'s mentor' },
                    timestamp: Date.now()
                });
                return;
            }

            // Send tip to mentee
            const menteeConn = ctx.connections.get(menteeId);
            if (menteeConn) {
                ctx.send(menteeConn.ws, {
                    type: 'mentor_tip',
                    data: {
                        mentorId: connection.playerId,
                        mentorName: connection.playerName,
                        tip: tipMessage.substring(0, 500)
                    },
                    timestamp: Date.now()
                });
            }

            notificationService.notify(menteeId, 'social',
                tipMessage.substring(0, 100),
                { title: 'Mentor Tip' }
            );

            ctx.send(connection.ws, {
                type: 'mentor_tip_sent',
                data: { success: true, menteeId },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error sending mentor tip:', error);
        }
    }

    /**
     * Rate your mentor/mentee (after graduation)
     */
    static async handleRateMentorship(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { targetId, rating, feedback } = data;
            if (!targetId || !rating) return;

            // Get active session and end it with rating
            const session = await mentorshipService.getActiveSession(connection.playerId);
            if (session) {
                const result = await mentorshipService.endSession(
                    session.sessionId,
                    Math.min(5, Math.max(1, rating)),
                    feedback?.substring(0, 500)
                );
                ctx.send(connection.ws, {
                    type: 'mentorship_rated',
                    data: result,
                    timestamp: Date.now()
                });
            } else {
                ctx.send(connection.ws, {
                    type: 'mentorship_rated',
                    data: { success: false, error: 'No active session' },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Error rating mentorship:', error);
        }
    }

    /**
     * Get pending mentee requests (for mentors)
     */
    static async handleGetPendingMenteeRequests(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            // Get the mentor's profile to see active mentees
            const profile = await mentorshipService.getOrCreateProfile(connection.playerId, connection.playerName || 'Player');
            
            // Return active mentees as pending (in this system they're immediately assigned)
            const requests = profile.activeMentees.map((menteeId: string) => ({
                menteeId,
                isOnline: ctx.connections.has(menteeId)
            }));

            ctx.send(connection.ws, {
                type: 'pending_mentee_requests',
                data: { requests },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting pending mentee requests:', error);
        }
    }
}
