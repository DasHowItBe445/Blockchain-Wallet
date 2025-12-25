const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requiredAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  proofDocument: {
    type: String,
    default: null
  },
  proofHash: {
    type: String,
    default: null // IPFS hash or proof identifier (synced with blockchain)
  },
  onChainState: {
    type: String,
    enum: ['PENDING', 'SUBMITTED', 'APPROVED', 'DISPUTED'],
    default: 'PENDING'
  },
  submissionTxHash: {
    type: String,
    default: null
  },
  approvalTxHash: {
    type: String,
    default: null
  },
  releaseTxHash: {
    type: String,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
});

const projectSchema = new mongoose.Schema({
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  totalRequired: {
    type: Number,
    required: true
  },
  totalFunded: {
    type: Number,
    default: 0
  },
  milestones: [milestoneSchema],
  // Blockchain addresses
  escrowContractAddress: {
    type: String,
    default: null
  },
  multisigWalletAddress: {
    type: String,
    default: null
  },
  onChainProjectIndex: {
    type: Number,
    default: null
  },
  contractAddress: {
    type: String,
    default: null // Legacy field, use escrowContractAddress
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);