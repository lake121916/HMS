const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const labTestController = require('../controllers/labTestController');

// GET lab tests
router.get('/', authenticate, labTestController.getLabTests);

// POST order test — doctor orders; lab_technician cannot order (auto-billing enabled)
router.post('/', authenticate, authorize('doctor', 'super_admin', 'admin'), labTestController.orderLabTest);

// PUT update test status — lab_technician updates status; doctor can cancel
router.put('/:id', authenticate, authorize('lab_technician', 'doctor', 'super_admin', 'admin'), labTestController.updateLabTestStatus);

// POST upload result — lab_technician only
router.post('/:id/result', authenticate, authorize('lab_technician', 'super_admin', 'admin'), labTestController.uploadLabResult);

// POST analyze radiology scan using FastAPI CNN Service
router.post('/:id/analyze', authenticate, upload.single('file'), labTestController.analyzeRadiologyScan);

// DELETE — admin only
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), labTestController.deleteLabTest);

module.exports = router;
