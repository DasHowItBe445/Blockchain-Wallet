const { createPublicClient, http, formatEther, parseEther, encodeFunctionData } = require('viem');
const { defineChain } = require('viem');

/**
 * Blockchain Service
 * 
 * Handles all blockchain interactions using Viem.
 * Backend coordinates but NEVER controls funds - all transactions require user signatures.
 * 
 * IMPORTANT: Backend does NOT store private keys.
 * For write operations, the user must sign transactions client-side.
 * Backend only reads on-chain state and prepares transaction data.
 */

// Load contract ABIs (simplified - in production, import from artifacts)
const ESCROW_ABI = [
  {
    inputs: [
      { name: '_projectId', type: 'string' },
      { name: '_ngoAddress', type: 'address' },
      { name: '_multisigWallet', type: 'address' },
      { name: '_milestoneAmounts', type: 'uint256[]' }
    ],
    name: 'createProject',
    outputs: [{ name: 'projectIndex', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_projectIndex', type: 'uint256' }],
    name: 'depositFunds',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_projectIndex', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' },
      { name: '_proofHash', type: 'string' }
    ],
    name: 'submitMilestone',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_projectIndex', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' }
    ],
    name: 'approveMilestone',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_projectIndex', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' }
    ],
    name: 'releaseFunds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_projectIndex', type: 'uint256' }],
    name: 'getProject',
    outputs: [
      { name: 'ngoAddress', type: 'address' },
      { name: 'projectId', type: 'string' },
      { name: 'multisigWallet', type: 'address' },
      { name: 'totalFunded', type: 'uint256' },
      { name: 'milestoneCount', type: 'uint256' },
      { name: 'active', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: '_projectIndex', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' }
    ],
    name: 'getMilestone',
    outputs: [
      {
        components: [
          { name: 'amount', type: 'uint256' },
          { name: 'fundedAmount', type: 'uint256' },
          { name: 'state', type: 'uint8' },
          { name: 'proofHash', type: 'string' },
          { name: 'submissionTime', type: 'uint256' },
          { name: 'approvalTime', type: 'uint256' },
          { name: 'disputeWindowEnd', type: 'uint256' },
          { name: 'released', type: 'bool' }
        ],
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_projectId', type: 'string' }],
    name: 'getProjectByProjectId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Define localhost chain
const localhostChain = defineChain({
  id: 31337,
  name: 'localhost',
  network: 'localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
});

// Get chain configuration
const getChain = () => {
  const network = process.env.BLOCKCHAIN_NETWORK || 'localhost';
  
  if (network === 'sepolia') {
    // For sepolia, import from viem/chains
    return require('viem/chains').sepolia;
  }
  
  return localhostChain;
};

// Create public client (read-only)
const getPublicClient = () => {
  const chain = getChain();
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || chain.rpcUrls.default.http[0];
  
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
};

/**
 * Get on-chain project information
 */
async function getOnChainProject(escrowAddress, projectIndex) {
  try {
    const publicClient = getPublicClient();
    
    const project = await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'getProject',
      args: [BigInt(projectIndex)],
    });
    
    return {
      ngoAddress: project[0],
      projectId: project[1],
      multisigWallet: project[2],
      totalFunded: formatEther(project[3]),
      milestoneCount: Number(project[4]),
      active: project[5],
    };
  } catch (error) {
    console.error('Error reading on-chain project:', error);
    throw new Error(`Failed to read on-chain project: ${error.message}`);
  }
}

/**
 * Get on-chain milestone information
 */
async function getOnChainMilestone(escrowAddress, projectIndex, milestoneIndex) {
  try {
    const publicClient = getPublicClient();
    
    const milestone = await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'getMilestone',
      args: [BigInt(projectIndex), BigInt(milestoneIndex)],
    });
    
    return {
      amount: formatEther(milestone.amount),
      fundedAmount: formatEther(milestone.fundedAmount),
      state: milestone.state, // 0=PENDING, 1=SUBMITTED, 2=APPROVED, 3=DISPUTED
      proofHash: milestone.proofHash,
      submissionTime: milestone.submissionTime,
      approvalTime: milestone.approvalTime,
      disputeWindowEnd: milestone.disputeWindowEnd,
      released: milestone.released,
    };
  } catch (error) {
    console.error('Error reading on-chain milestone:', error);
    throw new Error(`Failed to read on-chain milestone: ${error.message}`);
  }
}

/**
 * Get project index by project ID
 */
async function getProjectIndex(escrowAddress, projectId) {
  try {
    const publicClient = getPublicClient();
    
    const index = await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'getProjectByProjectId',
      args: [projectId],
    });
    
    return Number(index);
  } catch (error) {
    console.error('Error getting project index:', error);
    return 0; // 0 means project doesn't exist
  }
}

/**
 * Prepare transaction data for client-side signing
 * Backend NEVER signs transactions - returns data for user to sign
 */
function prepareCreateProjectTransaction(escrowAddress, projectId, ngoAddress, multisigWallet, milestoneAmounts) {
  return {
    to: escrowAddress,
    data: encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: 'createProject',
      args: [
        projectId,
        ngoAddress,
        multisigWallet,
        milestoneAmounts.map(amount => parseEther(amount.toString())),
      ],
    }),
  };
}

function prepareSubmitMilestoneTransaction(escrowAddress, projectIndex, milestoneIndex, proofHash) {
  return {
    to: escrowAddress,
    data: encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: 'submitMilestone',
      args: [BigInt(projectIndex), BigInt(milestoneIndex), proofHash],
    }),
  };
}

function prepareApproveMilestoneTransaction(escrowAddress, projectIndex, milestoneIndex) {
  return {
    to: escrowAddress,
    data: encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: 'approveMilestone',
      args: [BigInt(projectIndex), BigInt(milestoneIndex)],
    }),
  };
}

function prepareReleaseFundsTransaction(escrowAddress, projectIndex, milestoneIndex) {
  return {
    to: escrowAddress,
    data: encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: 'releaseFunds',
      args: [BigInt(projectIndex), BigInt(milestoneIndex)],
    }),
  };
}

/**
 * Verify transaction receipt
 */
async function verifyTransaction(txHash) {
  try {
    const publicClient = getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    return {
      status: receipt.status === 'success',
      blockNumber: Number(receipt.blockNumber),
      transactionHash: receipt.transactionHash,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    throw new Error(`Failed to verify transaction: ${error.message}`);
  }
}

module.exports = {
  getOnChainProject,
  getOnChainMilestone,
  getProjectIndex,
  prepareCreateProjectTransaction,
  prepareSubmitMilestoneTransaction,
  prepareApproveMilestoneTransaction,
  prepareReleaseFundsTransaction,
  verifyTransaction,
  formatEther,
  parseEther,
};

