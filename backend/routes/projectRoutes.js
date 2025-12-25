const express = require('express');
const router = express.Router();
const { 
  getProjects, 
  getProject, 
  createProject, 
  updateProject, 
  updateMilestone,
  getMyProjects 
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Protected routes - NGO only (must come before /:id route)
router.get('/ngo/my-projects', protect, authorize('ngo'), asyncHandler(getMyProjects));
router.post('/', protect, authorize('ngo'), asyncHandler(createProject));

// Public routes
router.get('/', asyncHandler(getProjects));
router.get('/:id', asyncHandler(getProject));

// Protected routes - NGO only
router.put('/:id', protect, authorize('ngo'), asyncHandler(updateProject));
router.put('/:id/milestones/:milestoneId', protect, authorize('ngo'), asyncHandler(updateMilestone));

module.exports = router;