const Project = require('../models/Project');
const blockchain = require('../services/blockchain');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Create project (stores metadata, prepares blockchain transaction)
 * @route   POST /api/project/create
 * @access  Private (NGO only)
 */
exports.createProject = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ngo') {
    return res.status(403).json({ message: 'Access denied. NGO role required.' });
  }

  const { title, description, category, totalRequired, milestones, multisigWalletAddress } = req.body;

  // Validate required fields
  if (!title || !description || !category || !totalRequired || !milestones || !Array.isArray(milestones)) {
    return res.status(400).json({ 
      message: 'Please provide title, description, category, totalRequired, and milestones array' 
    });
  }

  if (!multisigWalletAddress) {
    return res.status(400).json({ message: 'Multisig wallet address is required' });
  }

  if (milestones.length === 0) {
    return res.status(400).json({ message: 'At least one milestone is required' });
  }

  // Validate milestone amounts sum to totalRequired
  const milestoneSum = milestones.reduce((sum, m) => sum + (parseFloat(m.requiredAmount) || 0), 0);
  if (Math.abs(milestoneSum - parseFloat(totalRequired)) > 0.0001) {
    return res.status(400).json({ 
      message: 'Milestone amounts must sum to totalRequired' 
    });
  }

  const escrowAddress = process.env.ESCROW_CONTRACT_ADDRESS;
  if (!escrowAddress) {
    return res.status(500).json({ message: 'Escrow contract address not configured' });
  }

  // Create project in database (metadata only)
  const project = await Project.create({
    ngo: req.user._id,
    title,
    description,
    category,
    totalRequired: parseFloat(totalRequired),
    milestones: milestones.map(m => ({
      title: m.title,
      description: m.description,
      requiredAmount: parseFloat(m.requiredAmount),
      status: 'pending',
      onChainState: 'PENDING',
    })),
    escrowContractAddress: escrowAddress,
    multisigWalletAddress,
    active: true,
  });

  // Prepare blockchain transaction data (user must sign client-side)
  // Use MongoDB _id as on-chain project ID
  const projectId = project._id.toString();
  const milestoneAmounts = milestones.map(m => parseFloat(m.requiredAmount));
  const ngoAddress = req.user.walletAddress || req.user.email; // Fallback to email if no wallet
  
  const transactionData = blockchain.prepareCreateProjectTransaction(
    escrowAddress,
    projectId,
    ngoAddress,
    multisigWalletAddress,
    milestoneAmounts
  );

  res.status(201).json({
    project: {
      _id: project._id,
      title: project.title,
      description: project.description,
      category: project.category,
      totalRequired: project.totalRequired,
      milestones: project.milestones,
      escrowContractAddress: project.escrowContractAddress,
      multisigWalletAddress: project.multisigWalletAddress,
      createdAt: project.createdAt,
    },
    transactionData: {
      to: transactionData.to,
      data: transactionData.data,
      message: 'Sign this transaction to create project on blockchain',
    },
    instructions: 'After signing and confirming the transaction, call /api/project/sync/:id with the transaction hash',
  });
});

/**
 * @desc    Sync project with on-chain state
 * @route   POST /api/project/sync/:id
 * @access  Private
 */
exports.syncProject = asyncHandler(async (req, res) => {
  const { txHash } = req.body;
  
  if (!txHash) {
    return res.status(400).json({ message: 'Transaction hash is required' });
  }

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Verify transaction
  const receipt = await blockchain.verifyTransaction(txHash);
  
  if (!receipt.status) {
    return res.status(400).json({ message: 'Transaction failed on blockchain' });
  }

  // Get on-chain project index
  const onChainIndex = await blockchain.getProjectIndex(
    project.escrowContractAddress,
    project._id.toString()
  );

  if (onChainIndex === 0) {
    return res.status(400).json({ message: 'Project not found on blockchain' });
  }

  // Update project with on-chain data
  project.onChainProjectIndex = onChainIndex;
  await project.save();

  // Get on-chain state
  const onChainProject = await blockchain.getOnChainProject(
    project.escrowContractAddress,
    onChainIndex
  );

  res.json({
    project: project.toObject(),
    onChainState: onChainProject,
    transactionReceipt: receipt,
    message: 'Project synced with blockchain successfully',
  });
});

/**
 * @desc    Submit milestone proof (stores metadata, prepares blockchain transaction)
 * @route   POST /api/milestone/submit
 * @access  Private (NGO only)
 */
exports.submitMilestone = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ngo') {
    return res.status(403).json({ message: 'Access denied. NGO role required.' });
  }

  const { projectId, milestoneIndex, proofHash, proofDocument } = req.body;

  if (!projectId || milestoneIndex === undefined || !proofHash) {
    return res.status(400).json({ 
      message: 'Please provide projectId, milestoneIndex, and proofHash' 
    });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Verify ownership
  if (project.ngo.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to submit milestone for this project' });
  }

  if (!project.milestones[milestoneIndex]) {
    return res.status(404).json({ message: 'Milestone not found' });
  }

  // Check if milestone already submitted
  if (project.milestones[milestoneIndex].onChainState === 'SUBMITTED' || 
      project.milestones[milestoneIndex].onChainState === 'APPROVED') {
    return res.status(400).json({ message: 'Milestone already submitted' });
  }

  if (!project.onChainProjectIndex) {
    return res.status(400).json({ 
      message: 'Project not yet created on blockchain. Please sync project first.' 
    });
  }

  // Update milestone metadata
  project.milestones[milestoneIndex].proofHash = proofHash;
  project.milestones[milestoneIndex].proofDocument = proofDocument || null;
  project.milestones[milestoneIndex].onChainState = 'PENDING';
  project.milestones[milestoneIndex].status = 'in-progress';
  
  await project.save();

  // Prepare blockchain transaction
  const transactionData = blockchain.prepareSubmitMilestoneTransaction(
    project.escrowContractAddress,
    project.onChainProjectIndex,
    milestoneIndex,
    proofHash
  );

  res.json({
    project: project.toObject(),
    milestone: project.milestones[milestoneIndex],
    transactionData: {
      to: transactionData.to,
      data: transactionData.data,
      message: 'Sign this transaction to submit milestone on blockchain',
    },
    instructions: 'After signing and confirming, the milestone will be SUBMITTED on-chain',
  });
});

/**
 * @desc    Verify/Approve milestone (protocol owner only, prepares blockchain transaction)
 * @route   POST /api/milestone/verify
 * @access  Private (Protocol owner only)
 */
exports.verifyMilestone = asyncHandler(async (req, res) => {
  // In production, check if user is protocol owner
  // For now, we'll use an environment variable or special role
  const protocolOwnerAddress = process.env.PROTOCOL_OWNER_ADDRESS;
  
  // TODO: Implement proper protocol owner authentication
  // For now, allow any authenticated user (to be restricted in production)
  
  const { projectId, milestoneIndex } = req.body;

  if (!projectId || milestoneIndex === undefined) {
    return res.status(400).json({ message: 'Please provide projectId and milestoneIndex' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!project.milestones[milestoneIndex]) {
    return res.status(404).json({ message: 'Milestone not found' });
  }

  if (!project.onChainProjectIndex) {
    return res.status(400).json({ 
      message: 'Project not yet created on blockchain' 
    });
  }

  // Check on-chain state
  const onChainMilestone = await blockchain.getOnChainMilestone(
    project.escrowContractAddress,
    project.onChainProjectIndex,
    milestoneIndex
  );

  if (onChainMilestone.state !== 1) { // 1 = SUBMITTED
    return res.status(400).json({ 
      message: `Milestone is not in SUBMITTED state on-chain (current state: ${onChainMilestone.state})` 
    });
  }

  // Prepare approval transaction (protocol owner must sign)
  const transactionData = blockchain.prepareApproveMilestoneTransaction(
    project.escrowContractAddress,
    project.onChainProjectIndex,
    milestoneIndex
  );

  res.json({
    project: project.toObject(),
    milestone: project.milestones[milestoneIndex],
    onChainState: onChainMilestone,
    transactionData: {
      to: transactionData.to,
      data: transactionData.data,
      message: 'Sign this transaction to approve milestone on blockchain (protocol owner only)',
    },
    instructions: 'After approval, milestone enters 7-day dispute window before release',
  });
});

/**
 * @desc    Release funds for approved milestone (prepares blockchain transaction)
 * @route   POST /api/milestone/release
 * @access  Private
 */
exports.releaseFunds = asyncHandler(async (req, res) => {
  const { projectId, milestoneIndex } = req.body;

  if (!projectId || milestoneIndex === undefined) {
    return res.status(400).json({ message: 'Please provide projectId and milestoneIndex' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!project.milestones[milestoneIndex]) {
    return res.status(404).json({ message: 'Milestone not found' });
  }

  if (!project.onChainProjectIndex) {
    return res.status(400).json({ message: 'Project not yet created on blockchain' });
  }

  // Check on-chain state
  const onChainMilestone = await blockchain.getOnChainMilestone(
    project.escrowContractAddress,
    project.onChainProjectIndex,
    milestoneIndex
  );

  if (onChainMilestone.state !== 2) { // 2 = APPROVED
    return res.status(400).json({ 
      message: `Milestone is not APPROVED on-chain (current state: ${onChainMilestone.state})` 
    });
  }

  // Check if dispute window has elapsed
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (onChainMilestone.disputeWindowEnd && now < onChainMilestone.disputeWindowEnd) {
    const remainingTime = Number(onChainMilestone.disputeWindowEnd - now);
    const daysRemaining = Math.ceil(remainingTime / (24 * 60 * 60));
    return res.status(400).json({ 
      message: `Dispute window has not elapsed. ${daysRemaining} day(s) remaining.` 
    });
  }

  if (onChainMilestone.released) {
    return res.status(400).json({ message: 'Funds already released for this milestone' });
  }

  // Prepare release transaction
  const transactionData = blockchain.prepareReleaseFundsTransaction(
    project.escrowContractAddress,
    project.onChainProjectIndex,
    milestoneIndex
  );

  res.json({
    project: project.toObject(),
    milestone: project.milestones[milestoneIndex],
    onChainState: onChainMilestone,
    transactionData: {
      to: transactionData.to,
      data: transactionData.data,
      message: 'Sign this transaction to release funds to multisig wallet',
    },
    instructions: 'After release, funds will be sent to the multisig wallet address',
  });
});

/**
 * @desc    Get project with on-chain state
 * @route   GET /api/project/:id/state
 * @access  Private
 */
exports.getProjectState = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('ngo', 'name email walletAddress');
  
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  let onChainState = null;
  let milestonesState = [];

  if (project.onChainProjectIndex && project.escrowContractAddress) {
    try {
      // Get on-chain project state
      onChainState = await blockchain.getOnChainProject(
        project.escrowContractAddress,
        project.onChainProjectIndex
      );

      // Get on-chain state for each milestone
      for (let i = 0; i < project.milestones.length; i++) {
        try {
          const milestoneState = await blockchain.getOnChainMilestone(
            project.escrowContractAddress,
            project.onChainProjectIndex,
            i
          );
          milestonesState.push({
            index: i,
            ...milestoneState,
          });
        } catch (error) {
          console.error(`Error fetching milestone ${i} state:`, error);
          milestonesState.push({
            index: i,
            error: error.message,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching on-chain state:', error);
    }
  }

  res.json({
    project: project.toObject(),
    onChainState,
    milestonesState,
    message: 'Blockchain is the source of truth for fund state',
  });
});

