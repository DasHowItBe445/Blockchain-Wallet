const express = require('express');
const router = express.Router();
const {
  createProject,
  syncProject,
  submitMilestone,
  verifyMilestone,
  releaseFunds,
  getProjectState
} = require('../controllers/orchestrationController');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// All routes require authentication
router.use(protect);

// Project creation
router.post('/project/create', asyncHandler(createProject));
router.post('/project/sync/:id', asyncHandler(syncProject));
router.get('/project/:id/state', asyncHandler(getProjectState));

// Milestone management
router.post('/milestone/submit', asyncHandler(submitMilestone));
router.post('/milestone/verify', asyncHandler(verifyMilestone));
router.post('/milestone/release', asyncHandler(releaseFunds));

module.exports = router;

