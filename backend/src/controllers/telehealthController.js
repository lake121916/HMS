const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError, handleAsync } = require('../utils/response');
const { emitToUser, emitToRole } = require('../services/socketService');

// Store active video sessions (in production, use Redis or database)
const activeSessions = new Map();

// Create a new video consultation session
const createSession = handleAsync(async (req, res) => {
  const { appointmentId, doctorId, patientId } = req.body;

  // Generate unique session ID
  const sessionId = uuidv4();

  // Store session
  activeSessions.set(sessionId, {
    sessionId,
    appointmentId,
    doctorId,
    patientId,
    status: 'waiting',
    createdAt: new Date(),
    participants: {
      doctor: null,
      patient: null
    }
  });

  // Notify doctor about new session
  emitToUser(doctorId, 'video-session-created', {
    sessionId,
    appointmentId,
    patientId,
    status: 'waiting'
  });

  sendSuccess(res, {
    sessionId,
    status: 'waiting',
    message: 'Video session created. Waiting for participants to join.'
  });
});

// Join a video session
const joinSession = handleAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { userId, role } = req.body;

  const session = activeSessions.get(sessionId);

  if (!session) {
    return sendError(res, 'Session not found', 404);
  }

  // Validate user is part of this session
  if (session.doctorId !== userId && session.patientId !== userId) {
    return sendError(res, 'Unauthorized: You are not part of this session', 403);
  }

  // Update participant status
  if (role === 'doctor') {
    session.participants.doctor = userId;
  } else if (role === 'patient') {
    session.participants.patient = userId;
  }

  // Check if both participants are ready
  if (session.participants.doctor && session.participants.patient) {
    session.status = 'active';
    
    // Notify both participants
    emitToUser(session.doctorId, 'video-session-ready', {
      sessionId,
      status: 'active',
      partnerId: role === 'doctor' ? session.patientId : session.doctorId
    });
    
    emitToUser(session.patientId, 'video-session-ready', {
      sessionId,
      status: 'active',
      partnerId: role === 'doctor' ? session.doctorId : session.patientId
    });
  }

  sendSuccess(res, {
    sessionId,
    status: session.status,
    participants: session.participants
  });
});

// End a video session
const endSession = handleAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { userId, reason } = req.body;

  const session = activeSessions.get(sessionId);

  if (!session) {
    return sendError(res, 'Session not found', 404);
  }

  // Validate user is part of this session
  if (session.doctorId !== userId && session.patientId !== userId) {
    return sendError(res, 'Unauthorized: You are not part of this session', 403);
  }

  session.status = 'ended';
  session.endedAt = new Date();
  session.endedBy = userId;
  session.endReason = reason || 'Session ended normally';

  // Notify both participants
  emitToUser(session.doctorId, 'video-session-ended', {
    sessionId,
    status: 'ended',
    endedBy: userId,
    reason: session.endReason
  });

  emitToUser(session.patientId, 'video-session-ended', {
    sessionId,
    status: 'ended',
    endedBy: userId,
    reason: session.endReason
  });

  // Remove from active sessions (optional - keep for history)
  // activeSessions.delete(sessionId);

  sendSuccess(res, {
    sessionId,
    status: 'ended',
    message: 'Video session ended successfully'
  });
});

// Get session status
const getSessionStatus = handleAsync(async (req, res) => {
  const { sessionId } = req.params;

  const session = activeSessions.get(sessionId);

  if (!session) {
    return sendError(res, 'Session not found', 404);
  }

  sendSuccess(res, {
    sessionId: session.sessionId,
    status: session.status,
    participants: session.participants,
    createdAt: session.createdAt,
    endedAt: session.endedAt
  });
});

// Signal WebRTC connection (ICE candidates, SDP offers/answers)
const signalConnection = handleAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { userId, signalData, type } = req.body;

  const session = activeSessions.get(sessionId);

  if (!session) {
    return sendError(res, 'Session not found', 404);
  }

  // Determine recipient (the other participant)
  const recipientId = userId === session.doctorId ? session.patientId : session.doctorId;

  // Forward signal to the other participant
  emitToUser(recipientId, 'video-signal', {
    sessionId,
    senderId: userId,
    signalData,
    type
  });

  sendSuccess(res, {
    message: 'Signal forwarded successfully'
  });
});

// Get active sessions for a user
const getUserSessions = handleAsync(async (req, res) => {
  const { userId } = req.params;

  const userSessions = [];
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.doctorId === userId || session.patientId === userId) {
      userSessions.push({
        sessionId: session.sessionId,
        appointmentId: session.appointmentId,
        status: session.status,
        createdAt: session.createdAt,
        partnerId: session.doctorId === userId ? session.patientId : session.doctorId
      });
    }
  }

  sendSuccess(res, {
    sessions: userSessions
  });
});

// Check if user is in an active session
const checkActiveSession = handleAsync(async (req, res) => {
  const { userId } = req.params;

  for (const [sessionId, session] of activeSessions.entries()) {
    if ((session.doctorId === userId || session.patientId === userId) && session.status === 'active') {
      return sendSuccess(res, {
        hasActiveSession: true,
        sessionFactoryId: sessionId,
        appointmentId: session.appointmentId,
        partnerId: session.doctorId === userId ? session.patientId : session.doctorId
      });
    }
  }

  sendSuccess(res, {
    hasActiveSession: false
  });
});

module.exports = {
  createSession,
  joinSession,
  endSession,
  getSessionStatus,
  signalConnection,
  getUserSessions,
  checkActiveSession
};
