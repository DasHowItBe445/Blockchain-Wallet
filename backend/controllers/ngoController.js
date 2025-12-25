const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Register NGO (enhanced with metadata)
 * @route   POST /api/ngo/register
 * @access  Public
 */
exports.registerNGO = asyncHandler(async (req, res) => {
  const { name, email, password, description, category, registrationNumber, walletAddress } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }

  // Create NGO user
  const ngo = await User.create({
    name,
    email,
    password,
    role: 'ngo',
    description,
    category,
    registrationNumber,
    walletAddress: walletAddress || null,
  });

  res.status(201).json({
    _id: ngo._id,
    name: ngo.name,
    email: ngo.email,
    role: ngo.role,
    description: ngo.description,
    category: ngo.category,
    walletAddress: ngo.walletAddress,
    message: 'NGO registered successfully. Please connect your wallet to complete setup.',
  });
});

/**
 * @desc    Get NGO profile
 * @route   GET /api/ngo/profile
 * @access  Private (NGO only)
 */
exports.getNGOProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ngo') {
    return res.status(403).json({ message: 'Access denied. NGO role required.' });
  }

  const ngo = await User.findById(req.user._id).select('-password');
  res.json(ngo);
});

/**
 * @desc    Update NGO wallet address
 * @route   PUT /api/ngo/wallet
 * @access  Private (NGO only)
 */
exports.updateNGOWallet = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ngo') {
    return res.status(403).json({ message: 'Access denied. NGO role required.' });
  }

  const { walletAddress } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }

  const ngo = await User.findByIdAndUpdate(
    req.user._id,
    { walletAddress },
    { new: true }
  ).select('-password');

  res.json({
    ...ngo.toObject(),
    message: 'Wallet address updated successfully',
  });
});

