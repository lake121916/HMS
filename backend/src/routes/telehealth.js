const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createSession,
  joinSession,
  endSession,
  getSessionStatus,
  signalConnection,
  getUserSessions,
  checkActiveSession
} = require('../controllers/telehealthController');

// Create a new video consultation session
router.post('/sessions', authenticate, authorize('doctor', 'patient'), createSession);

// Join a video session
router.post('/sessions/:sessionId/join', authenticate, joinSession);

// End a video session
router.post('/sessions/:sessionId/end', authenticate, endSession);

// Get session status
router.get('/sessions/:sessionId/status', authenticate, getSessionStatus);

// Signal WebRTC connection (ICE candidates, SDP offers/answers)
router.post('/sessions/:sessionId/signal', authenticate, signalConnection);

// Get active sessions for a user
router.get('/sessions/user/:userId', authenticate, getUserSessions);

// Check if user has an active session
router.get('/sessions/active/check/:userId', authenticate, checkActiveSession);

module.exports = router;
