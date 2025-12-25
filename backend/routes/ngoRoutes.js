const express = require('express');
const router = express.Router();
const {
  registerNGO,
  getNGOProfile,
  updateNGOWallet
} = require('../controllers/ngoController');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Public route
router.post('/register', asyncHandler(registerNGO));

// Protected routes (NGO only)
router.get('/profile', protect, authorize('ngo'), asyncHandler(getNGOProfile));
router.put('/wallet', protect, authorize('ngo'), asyncHandler(updateNGOWallet));

module.exports = router;

