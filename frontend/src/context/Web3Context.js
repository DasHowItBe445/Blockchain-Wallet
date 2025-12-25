import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import MilestoneFundingABI from '../contracts/MilestoneFunding.json';
import SmartWalletABI from '../contracts/SmartWallet.json';
import EscrowABI from '../contracts/Escrow.json';

const Web3Context = createContext();

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [milestoneContract, setMilestoneContract] = useState(null);
  const [smartWalletContract, setSmartWalletContract] = useState(null);
  const [escrowContract, setEscrowContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const milestoneContractAddress = process.env.REACT_APP_CONTRACT_ADDRESS || '';
  const smartWalletContractAddress = process.env.REACT_APP_SMART_WALLET_ADDRESS || '';
  const escrowContractAddress = process.env.REACT_APP_ESCROW_ADDRESS || '';
  const sepoliaChainId = process.env.REACT_APP_SEPOLIA_CHAIN_ID
    ? parseInt(process.env.REACT_APP_SEPOLIA_CHAIN_ID, 10)
    : 11155111; // Default to Sepolia chain ID

  // Update balance function
  const updateBalance = useCallback(async (address) => {
    if (provider && address) {
      try {
        const bal = await provider.getBalance(address);
        setBalance(ethers.formatEther(bal));
      } catch (err) {
        console.error('Error fetching balance:', err);
      }
    }
  }, [provider]);

  // Initialize provider
  useEffect(() => {
    if (window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          updateBalance(accounts[0]);
        } else {
          disconnect();
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, [updateBalance]);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask!');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const network = await web3Provider.getNetwork();

      // Check if on Sepolia
      if (Number(network.chainId) !== sepoliaChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + sepoliaChainId.toString(16) }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x' + sepoliaChainId.toString(16),
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/']
              }]
            });
          }
        }
      }

      // Initialize contracts
      if (!milestoneContractAddress) {
        throw new Error('Milestone contract address not configured. Please set REACT_APP_CONTRACT_ADDRESS in your .env file');
      }

      if (!MilestoneFundingABI || !MilestoneFundingABI.abi) {
        throw new Error('Milestone contract ABI not found. Please ensure MilestoneFunding.json is properly imported');
      }

      const milestoneContractInstance = new ethers.Contract(
        milestoneContractAddress,
        MilestoneFundingABI.abi,
        web3Signer
      );

      let smartWalletContractInstance = null;
      if (smartWalletContractAddress) {
        if (!SmartWalletABI || !SmartWalletABI.abi) {
          throw new Error('SmartWallet contract ABI not found. Please ensure SmartWallet.json is properly imported');
        }
        smartWalletContractInstance = new ethers.Contract(
          smartWalletContractAddress,
          SmartWalletABI.abi,
          web3Signer
        );
      }

      let escrowContractInstance = null;
      if (escrowContractAddress) {
        if (!EscrowABI || !EscrowABI.abi) {
          throw new Error('Escrow contract ABI not found. Please ensure Escrow.json is properly imported');
        }
        escrowContractInstance = new ethers.Contract(
          escrowContractAddress,
          EscrowABI.abi,
          web3Signer
        );
      }

      setProvider(web3Provider);
      setSigner(web3Signer);
      setMilestoneContract(milestoneContractInstance);
      setSmartWalletContract(smartWalletContractInstance);
      setEscrowContract(escrowContractInstance);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      await updateBalance(accounts[0]);

      setLoading(false);
      return accounts[0];
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Error connecting wallet:', err);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    setAccount(null);
    setSigner(null);
    setMilestoneContract(null);
    setSmartWalletContract(null);
    setEscrowContract(null);
    setBalance('0');
  };

  // Fund project
  const fundProject = async (projectIndex, amount) => {
    if (!milestoneContract || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await milestoneContract.fundProject(projectIndex, {
        value: ethers.parseEther(amount.toString())
      });

      const receipt = await tx.wait();
      await updateBalance(account);
      return receipt;
    } catch (err) {
      console.error('Error funding project:', err);
      throw err;
    }
  };

  // Complete milestone
  const completeMilestone = async (projectIndex, milestoneIndex, proofHash) => {
    if (!milestoneContract || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await milestoneContract.completeMilestone(
        projectIndex,
        milestoneIndex,
        proofHash
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Error completing milestone:', err);
      throw err;
    }
  };

  // Release funds
  const releaseFunds = async (projectIndex, milestoneIndex) => {
    if (!milestoneContract || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await milestoneContract.releaseFunds(projectIndex, milestoneIndex);
      const receipt = await tx.wait();
      await updateBalance(account);
      return receipt;
    } catch (err) {
      console.error('Error releasing funds:', err);
      throw err;
    }
  };

  // Get project from blockchain
  const getProjectFromBlockchain = async (projectIndex) => {
    if (!milestoneContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const project = await milestoneContract.getProject(projectIndex);
      return project;
    } catch (err) {
      console.error('Error getting project:', err);
      throw err;
    }
  };

  // Create project on blockchain
  const createProjectOnBlockchain = async (projectId, ngoAddress, totalRequired, milestoneAmounts) => {
    if (!milestoneContract || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const totalRequiredWei = ethers.parseEther(totalRequired.toString());
      const milestoneAmountsWei = milestoneAmounts.map(amount =>
        ethers.parseEther(amount.toString())
      );

      const tx = await milestoneContract.createProject(
        projectId,
        ngoAddress,
        totalRequiredWei,
        milestoneAmountsWei
      );

      const receipt = await tx.wait();

      // Extract project index from events
      const event = receipt.logs.find(log => {
        try {
          const parsed = milestoneContract.interface.parseLog(log);
          return parsed.name === 'ProjectCreated';
        } catch {
          return false;
        }
      });

      const parsed = milestoneContract.interface.parseLog(event);
      const projectIndex = Number(parsed.args.projectIndex);

      return { receipt, projectIndex };
    } catch (err) {
      console.error('Error creating project on blockchain:', err);
      throw err;
    }
  };

  // SmartWallet functions
  const proposeTransaction = async (to, value, data) => {
    if (!smartWalletContract || !signer) {
      throw new Error('SmartWallet not connected');
    }

    try {
      const tx = await smartWalletContract.proposeTransaction(to, value, data);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Error proposing transaction:', err);
      throw err;
    }
  };

  const approveTransaction = async (txId) => {
    if (!smartWalletContract || !signer) {
      throw new Error('SmartWallet not connected');
    }

    try {
      const tx = await smartWalletContract.approveTransaction(txId);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Error approving transaction:', err);
      throw err;
    }
  };

  const executeTransaction = async (txId) => {
    if (!smartWalletContract || !signer) {
      throw new Error('SmartWallet not connected');
    }

    try {
      const tx = await smartWalletContract.executeTransaction(txId);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Error executing transaction:', err);
      throw err;
    }
  };

  const getTransaction = async (txId) => {
    if (!smartWalletContract) {
      throw new Error('SmartWallet not initialized');
    }

    try {
      const transaction = await smartWalletContract.getTransaction(txId);
      return transaction;
    } catch (err) {
      console.error('Error getting transaction:', err);
      throw err;
    }
  };

  const getTransactionCount = async () => {
    if (!smartWalletContract) {
      throw new Error('SmartWallet not initialized');
    }

    try {
      const count = await smartWalletContract.transactionCount();
      return Number(count);
    } catch (err) {
      console.error('Error getting transaction count:', err);
      throw err;
    }
  };

  const getSmartWalletBalance = async () => {
    if (!smartWalletContract) {
      throw new Error('SmartWallet not initialized');
    }

    try {
      const balance = await smartWalletContract.getBalance();
      return ethers.formatEther(balance);
    } catch (err) {
      console.error('Error getting SmartWallet balance:', err);
      throw err;
    }
  };

  // Escrow functions
  const depositFunds = async (projectIndex, amount) => {
    if (!escrowContract || !signer) {
      throw new Error('Escrow contract not connected');
    }

    try {
      const tx = await escrowContract.depositFunds(projectIndex, {
        value: ethers.parseEther(amount.toString())
      });
      const receipt = await tx.wait();
      await updateBalance(account);
      return receipt;
    } catch (err) {
      console.error('Error depositing funds:', err);
      throw err;
    }
  };

  const submitMilestone = async (projectIndex, milestoneIndex, proofHash) => {
    if (!escrowContract || !signer) {
      throw new Error('Escrow contract not connected');
    }

    try {
      const tx = await escrowContract.submitMilestone(projectIndex, milestoneIndex, proofHash);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Error submitting milestone:', err);
      throw err;
    }
  };

  const approveMilestone = async (projectIndex, milestoneIndex) => {
    if (!escrowContract || !signer) {
      throw new Error('Escrow contract not connected');
    }

    try {
      const tx = await escrowContract.approveMilestone(projectIndex, milestoneIndex);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Error approving milestone:', err);
      throw err;
    }
  };

  const releaseEscrowFunds = async (projectIndex, milestoneIndex) => {
    if (!escrowContract || !signer) {
      throw new Error('Escrow contract not connected');
    }

    try {
      const tx = await escrowContract.releaseFunds(projectIndex, milestoneIndex);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Error releasing escrow funds:', err);
      throw err;
    }
  };

  const getEscrowProject = async (projectIndex) => {
    if (!escrowContract) {
      throw new Error('Escrow contract not initialized');
    }

    try {
      const project = await escrowContract.getProject(projectIndex);
      return project;
    } catch (err) {
      console.error('Error getting escrow project:', err);
      throw err;
    }
  };

  const getEscrowMilestone = async (projectIndex, milestoneIndex) => {
    if (!escrowContract) {
      throw new Error('Escrow contract not initialized');
    }

    try {
      const milestone = await escrowContract.getMilestone(projectIndex, milestoneIndex);
      return milestone;
    } catch (err) {
      console.error('Error getting escrow milestone:', err);
      throw err;
    }
  };

  const getProjectCount = async () => {
    if (!escrowContract) {
      throw new Error('Escrow contract not initialized');
    }

    try {
      const count = await escrowContract.projectCount();
      return Number(count);
    } catch (err) {
      console.error('Error getting project count:', err);
      throw err;
    }
  };

  // Multisig Wallet Owner Functions
  const getMultisigOwners = async () => {
    if (!smartWalletContract) {
      throw new Error('SmartWallet not initialized');
    }

    try {
      const owners = await smartWalletContract.getOwners();
      return owners;
    } catch (err) {
      console.error('Error getting multisig owners:', err);
      throw err;
    }
  };

  const getRequiredApprovals = async () => {
    if (!smartWalletContract) {
      throw new Error('SmartWallet not initialized');
    }

    try {
      const required = await smartWalletContract.requiredApprovals();
      return Number(required);
    } catch (err) {
      console.error('Error getting required approvals:', err);
      throw err;
    }
  };

  const getOwnerCount = async () => {
    if (!smartWalletContract) {
      throw new Error('SmartWallet not initialized');
    }

    try {
      const count = await smartWalletContract.getOwnerCount();
      return Number(count);
    } catch (err) {
      console.error('Error getting owner count:', err);
      throw err;
    }
  };

  const isTransactionApprovedBy = async (txId, ownerAddress) => {
    if (!smartWalletContract) {
      throw new Error('SmartWallet not initialized');
    }

    try {
      const approved = await smartWalletContract.isApprovedBy(txId, ownerAddress);
      return approved;
    } catch (err) {
      console.error('Error checking approval status:', err);
      throw err;
    }
  };

  // Get transaction events/history
  const getTransactionHistory = async (walletAddress = null, fromBlock = 0) => {
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Use provided wallet address or default to configured smart wallet
      const contractAddress = walletAddress || smartWalletContractAddress;
      if (!contractAddress) {
        throw new Error('SmartWallet address not configured');
      }

      // If wallet address is provided and different from configured, create a new contract instance
      let contractToQuery = smartWalletContract;
      if (walletAddress && walletAddress.toLowerCase() !== smartWalletContractAddress?.toLowerCase()) {
        if (!SmartWalletABI || !SmartWalletABI.abi) {
          throw new Error('SmartWallet ABI not found');
        }
        contractToQuery = new ethers.Contract(
          walletAddress,
          SmartWalletABI.abi,
          provider
        );
      }

      if (!contractToQuery) {
        throw new Error('SmartWallet contract not available');
      }

      const currentBlock = await provider.getBlockNumber();
      const startBlock = fromBlock || Math.max(0, currentBlock - 10000); // Last 10k blocks if not specified

      // Get all transaction-related events
      const [proposedEvents, approvedEvents, executedEvents, depositEvents] = await Promise.all([
        contractToQuery.queryFilter(contractToQuery.filters.TransactionProposed(), startBlock, 'latest'),
        contractToQuery.queryFilter(contractToQuery.filters.TransactionApproved(), startBlock, 'latest'),
        contractToQuery.queryFilter(contractToQuery.filters.TransactionExecuted(), startBlock, 'latest'),
        contractToQuery.queryFilter(contractToQuery.filters.Deposit(), startBlock, 'latest')
      ]);

      return {
        proposed: proposedEvents.map(e => ({
          txId: Number(e.args.txId),
          proposer: e.args.proposer,
          to: e.args.to,
          value: ethers.formatEther(e.args.value),
          data: e.args.data,
          blockNumber: e.blockNumber,
          transactionHash: e.transactionHash,
          timestamp: null // Would need to fetch block for timestamp
        })),
        approved: approvedEvents.map(e => ({
          txId: Number(e.args.txId),
          approver: e.args.approver,
          approvalCount: Number(e.args.approvalCount),
          requiredApprovals: Number(e.args.requiredApprovals),
          blockNumber: e.blockNumber,
          transactionHash: e.transactionHash
        })),
        executed: executedEvents.map(e => ({
          txId: Number(e.args.txId),
          executor: e.args.executor,
          to: e.args.to,
          value: ethers.formatEther(e.args.value),
          blockNumber: e.blockNumber,
          transactionHash: e.transactionHash
        })),
        deposits: depositEvents.map(e => ({
          sender: e.args.sender,
          value: ethers.formatEther(e.args.value),
          balance: ethers.formatEther(e.args.balance),
          blockNumber: e.blockNumber,
          transactionHash: e.transactionHash
        }))
      };
    } catch (err) {
      console.error('Error getting transaction history:', err);
      throw err;
    }
  };

  const value = {
    provider,
    signer,
    milestoneContract,
    smartWalletContract,
    escrowContract,
    account,
    chainId,
    balance,
    loading,
    error,
    connectWallet,
    disconnect,
    fundProject,
    completeMilestone,
    releaseFunds,
    getProjectFromBlockchain,
    createProjectOnBlockchain,
    proposeTransaction,
    approveTransaction,
    executeTransaction,
    getTransaction,
    getTransactionCount,
    getSmartWalletBalance,
    depositFunds,
    submitMilestone,
    approveMilestone,
    releaseEscrowFunds,
    getEscrowProject,
    getEscrowMilestone,
    getProjectCount,
    getMultisigOwners,
    getRequiredApprovals,
    getOwnerCount,
    isTransactionApprovedBy,
    getTransactionHistory
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};