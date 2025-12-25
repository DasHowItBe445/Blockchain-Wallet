const express = require('express');
const router = express.Router();
const { register, login, getMe, updateWallet } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', protect, asyncHandler(getMe));
router.put('/wallet', protect, asyncHandler(updateWallet));

module.exports = router;