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
    static async handleBecomeMentor(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const result = await mentorshipService.registerAsMentor(
                connection.playerId,
                connection.playerName || 'Player'
            );

            ctx.send(connection.ws, {
                type: 'mentor_registration',
                data: result,
                timestamp: Date.now()
            });

            if (result.success) {
                notificationService.notify(connection.playerId, {
                    type: 'achievement',
                    title: 'Mentor Status!',
                    message: 'You are now a mentor. Help guide new players!'
                });
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

            const result = await mentorshipService.requestMentor(
                connection.playerId,
                connection.playerName || 'Player',
                preferredMentorId
            );

            ctx.send(connection.ws, {
                type: 'mentor_request_sent',
                data: result,
                timestamp: Date.now()
            });

            if (result.success && result.mentorId) {
                // Notify the mentor
                const mentorConn = ctx.connections.get(result.mentorId);
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

                notificationService.notify(result.mentorId, {
                    type: 'mentorship',
                    title: 'New Mentee Request!',
                    message: `${connection.playerName || 'A player'} wants you as their mentor!`
                });
            }
        } catch (error) {
            console.error('Error requesting mentor:', error);
        }
    }

    /**
     * Accept a mentee request
     */
    static async handleAcceptMentee(connection: PlayerConnection, data: any, ctx: HandlerContext): Promise<void> {
        try {
            const { menteeId } = data;
            if (!menteeId) return;

            const result = await mentorshipService.acceptMentee(
                connection.playerId,
                menteeId
            );

            ctx.send(connection.ws, {
                type: 'mentee_accepted',
                data: result,
                timestamp: Date.now()
            });

            if (result.success) {
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

                notificationService.notify(menteeId, {
                    type: 'mentorship',
                    title: 'Mentor Found!',
                    message: `${connection.playerName || 'A mentor'} has accepted you!`
                });
            }
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

            const result = await mentorshipService.declineMentee(
                connection.playerId,
                menteeId
            );

            ctx.send(connection.ws, {
                type: 'mentee_declined',
                data: result,
                timestamp: Date.now()
            });

            if (result.success) {
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
            const mentors = await mentorshipService.getAvailableMentors(limit || 20);

            // Add online status
            const mentorsWithStatus = mentors.map((mentor: any) => ({
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
            const status = await mentorshipService.getMentorshipStatus(connection.playerId);

            // Add online status for mentor and mentees
            if (status.mentor) {
                status.mentor.isOnline = ctx.connections.has(status.mentor.playerId);
            }
            if (status.mentees) {
                status.mentees = status.mentees.map((mentee: any) => ({
                    ...mentee,
                    isOnline: ctx.connections.has(mentee.playerId)
                }));
            }

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
            const { targetId, reason } = data;
            if (!targetId) return;

            const result = await mentorshipService.endMentorship(
                connection.playerId,
                targetId,
                reason
            );

            ctx.send(connection.ws, {
                type: 'mentorship_ended',
                data: result,
                timestamp: Date.now()
            });

            if (result.success) {
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

                notificationService.notify(targetId, {
                    type: 'mentorship',
                    title: 'Mentorship Ended',
                    message: `Your mentorship with ${connection.playerName || 'a player'} has ended.`
                });
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
            const status = await mentorshipService.getMentorshipStatus(connection.playerId);
            const isMentor = status.mentees?.some((m: any) => m.playerId === menteeId);

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

            notificationService.notify(menteeId, {
                type: 'mentorship',
                title: 'Mentor Tip',
                message: tipMessage.substring(0, 100)
            });

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

            const result = await mentorshipService.rateMentorship(
                connection.playerId,
                targetId,
                Math.min(5, Math.max(1, rating)),
                feedback?.substring(0, 500)
            );

            ctx.send(connection.ws, {
                type: 'mentorship_rated',
                data: result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error rating mentorship:', error);
        }
    }

    /**
     * Get pending mentee requests (for mentors)
     */
    static async handleGetPendingMenteeRequests(connection: PlayerConnection, _data: any, ctx: HandlerContext): Promise<void> {
        try {
            const requests = await mentorshipService.getPendingRequests(connection.playerId);

            // Add online status
            const requestsWithStatus = requests.map((req: any) => ({
                ...req,
                isOnline: ctx.connections.has(req.menteeId)
            }));

            ctx.send(connection.ws, {
                type: 'pending_mentee_requests',
                data: { requests: requestsWithStatus },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error getting pending mentee requests:', error);
        }
    }
}
