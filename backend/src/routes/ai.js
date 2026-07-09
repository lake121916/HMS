const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

router.post('/predict-disease', authenticate, aiController.predictDisease);
router.post('/drug-interaction', authenticate, aiController.checkDrugInteraction);
router.post('/health-risk', authenticate, aiController.predictHealthRisk);
router.post('/optimize-schedule', authenticate, aiController.optimizeSchedule);
router.post('/chatbot', authenticate, aiController.chatbot);

module.exports = router;
