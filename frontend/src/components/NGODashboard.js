import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';

const NGODashboard = () => {
  const { user } = useAuth();
  const {
    account,
    smartWalletContract,
    escrowContract,
    getTransactionCount,
    getTransaction,
    proposeTransaction,
    approveTransaction,
    executeTransaction,
    getSmartWalletBalance,
    submitMilestone,
    getProjectCount,
    getEscrowProject,
    getEscrowMilestone,
    getMultisigOwners,
    getRequiredApprovals,
    isTransactionApprovedBy
  } = useWeb3();

  const [transactions, setTransactions] = useState([]);
  const [walletBalance, setWalletBalance] = useState('0');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [multisigOwners, setMultisigOwners] = useState([]);
  const [requiredApprovals, setRequiredApprovals] = useState(0);
  const [walletAddress, setWalletAddress] = useState(null);
  const [transactionApprovals, setTransactionApprovals] = useState({}); // txId -> { owner: approved }

  // Load multisig wallet info
  const loadMultisigInfo = async () => {
    if (!smartWalletContract) return;

    try {
      const owners = await getMultisigOwners();
      const required = await getRequiredApprovals();
      const address = process.env.REACT_APP_SMART_WALLET_ADDRESS || 'Not configured';
      
      setMultisigOwners(owners);
      setRequiredApprovals(required);
      setWalletAddress(address);
    } catch (err) {
      console.error('Error loading multisig info:', err);
    }
  };

  // Load multisig transactions with approval status
  const loadTransactions = async () => {
    if (!smartWalletContract || !account) return;

    try {
      const count = await getTransactionCount();
      const txs = [];
      const approvals = {};

      for (let i = 0; i < count; i++) {
        const tx = await getTransaction(i);
        const txData = {
          id: i,
          to: tx[0],
          value: ethers.formatEther(tx[1]),
          data: tx[2],
          executed: tx[3],
          approvalCount: Number(tx[4])
        };

        // Check approval status for each owner
        const ownerApprovals = {};
        for (const owner of multisigOwners) {
          try {
            ownerApprovals[owner] = await isTransactionApprovedBy(i, owner);
          } catch (err) {
            console.error(`Error checking approval for owner ${owner}:`, err);
            ownerApprovals[owner] = false;
          }
        }
        approvals[i] = ownerApprovals;

        txs.push(txData);
      }

      setTransactions(txs);
      setTransactionApprovals(approvals);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transactions');
    }
  };

  // Load wallet balance
  const loadWalletBalance = async () => {
    if (!smartWalletContract) return;

    try {
      const balance = await getSmartWalletBalance();
      setWalletBalance(balance);
    } catch (err) {
      console.error('Error loading wallet balance:', err);
    }
  };

  // Load projects
  const loadProjects = async () => {
    if (!escrowContract) return;

    try {
      const count = await getProjectCount();
      const projs = [];

      for (let i = 1; i <= count; i++) {
        const project = await getEscrowProject(i);
        if (project[1] === user?.walletAddress) { // Check if NGO owns this project
          const milestones = [];
          for (let j = 0; j < Number(project[4]); j++) {
            const milestone = await getEscrowMilestone(i, j);
            milestones.push({
              index: j,
              amount: ethers.formatEther(milestone[0]),
              fundedAmount: ethers.formatEther(milestone[1]),
              state: Number(milestone[2]),
              proofHash: milestone[3],
              submissionTime: Number(milestone[4]),
              approvalTime: Number(milestone[5]),
              disputeWindowEnd: Number(milestone[6]),
              released: milestone[7]
            });
          }

          projs.push({
            index: i,
            projectId: project[0],
            ngoAddress: project[1],
            multisigWallet: project[2],
            totalFunded: ethers.formatEther(project[3]),
            milestoneCount: Number(project[4]),
            active: project[5],
            milestones
          });
        }
      }

      setProjects(projs);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    }
  };

  useEffect(() => {
    if (account && smartWalletContract && escrowContract) {
      loadMultisigInfo();
      loadWalletBalance();
      loadProjects();
    }
  }, [account, smartWalletContract, escrowContract]);

  useEffect(() => {
    if (multisigOwners.length > 0 && smartWalletContract) {
      loadTransactions();
    }
  }, [multisigOwners, smartWalletContract, account]);

  const handleProposeTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.target);
      const to = formData.get('to');
      const value = formData.get('value');
      const data = formData.get('data') || '0x';

      await proposeTransaction(to, ethers.parseEther(value), data);
      await loadTransactions();
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransaction = async (txId) => {
    setLoading(true);
    setError(null);

    try {
      await approveTransaction(txId);
      await loadTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTransaction = async (txId) => {
    setLoading(true);
    setError(null);

    try {
      await executeTransaction(txId);
      await loadTransactions();
      await loadWalletBalance();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMilestone = async (projectIndex, milestoneIndex, proofHash) => {
    setLoading(true);
    setError(null);

    try {
      await submitMilestone(projectIndex, milestoneIndex, proofHash);
      await loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (projectIndex, milestoneIndex, file) => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, you would upload to IPFS here
      // For now, we'll create a hash from the file name and size as a placeholder
      // In production, use a service like Pinata, Infura IPFS, or similar
      const fileHash = `Qm${btoa(file.name + file.size + Date.now()).substring(0, 44)}`;
      
      await handleSubmitMilestone(projectIndex, milestoneIndex, fileHash);
      
      // Show success message
      alert(`Proof uploaded! Hash: ${fileHash}\n\nNote: In production, this would be uploaded to IPFS.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMilestoneStateText = (state) => {
    const states = ['PENDING', 'SUBMITTED', 'APPROVED', 'DISPUTED'];
    return states[state] || 'UNKNOWN';
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const isOwner = (address) => {
    return multisigOwners.some(owner => owner.toLowerCase() === address?.toLowerCase());
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        NGO Dashboard
      </h2>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* Multisig Wallet Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Multisig Wallet
        </h3>

        {/* Wallet Info */}
        <div style={{ 
          backgroundColor: '#f9fafb', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1.5rem' 
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Wallet Address:</strong> {walletAddress ? formatAddress(walletAddress) : 'Not configured'}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Balance:</strong> {parseFloat(walletBalance).toFixed(4)} ETH
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Required Approvals:</strong> {requiredApprovals} of {multisigOwners.length}
          </div>
          <div>
            <strong>Owners ({multisigOwners.length}):</strong>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {multisigOwners.map((owner, idx) => (
                <div
                  key={owner}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: isOwner(account) && owner.toLowerCase() === account?.toLowerCase() 
                      ? '#dbeafe' 
                      : '#e5e7eb',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    border: isOwner(account) && owner.toLowerCase() === account?.toLowerCase()
                      ? '1px solid #3b82f6'
                      : '1px solid #d1d5db'
                  }}
                >
                  {formatAddress(owner)}
                  {isOwner(account) && owner.toLowerCase() === account?.toLowerCase() && (
                    <span style={{ marginLeft: '0.5rem', color: '#3b82f6' }}>(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Propose Transaction Form */}
        {isOwner(account) && (
          <form onSubmit={handleProposeTransaction} style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
              Propose Transaction
            </h4>
            <div style={{ display: 'grid', gap: '1rem', maxWidth: '400px' }}>
              <input
                name="to"
                type="text"
                placeholder="Recipient Address (0x...)"
                required
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem'
                }}
              />
              <input
                name="value"
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount (ETH)"
                required
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem'
                }}
              />
              <input
                name="data"
                type="text"
                placeholder="Data (hex, optional, default: 0x)"
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="submit"
                disabled={loading || !isOwner(account)}
                style={{
                  backgroundColor: isOwner(account) ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: (loading || !isOwner(account)) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Proposing...' : 'Propose Transaction'}
              </button>
            </div>
          </form>
        )}

        {!isOwner(account) && account && (
          <div style={{
            backgroundColor: '#fef3c7',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
            border: '1px solid #fbbf24'
          }}>
            <p style={{ color: '#92400e', margin: 0 }}>
              ⚠️ Your connected wallet ({formatAddress(account)}) is not an owner of this multisig wallet.
            </p>
          </div>
        )}

        {/* Pending Transactions */}
        <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
          Pending Transactions ({transactions.filter(tx => !tx.executed).length})
        </h4>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {transactions.filter(tx => !tx.executed).map(tx => {
            const approvals = transactionApprovals[tx.id] || {};
            const canExecute = tx.approvalCount >= requiredApprovals;
            const userApproved = account ? approvals[account?.toLowerCase()] : false;

            return (
              <div key={tx.id} style={{
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                padding: '1rem',
                backgroundColor: canExecute ? '#f0fdf4' : '#ffffff'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div><strong>Transaction ID:</strong> {tx.id}</div>
                  <div><strong>Status:</strong> {canExecute ? '✅ Ready to Execute' : `⏳ ${tx.approvalCount}/${requiredApprovals} Approvals`}</div>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>To:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{formatAddress(tx.to)}</span>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Value:</strong> {tx.value} ETH
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Approval Status:</strong>
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {multisigOwners.map(owner => (
                      <div
                        key={owner}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: approvals[owner.toLowerCase()] ? '#dcfce7' : '#fee2e2',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          border: '1px solid',
                          borderColor: approvals[owner.toLowerCase()] ? '#10b981' : '#ef4444'
                        }}
                      >
                        {formatAddress(owner)}: {approvals[owner.toLowerCase()] ? '✓' : '✗'}
                      </div>
                    ))}
                  </div>
                </div>
                {isOwner(account) && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    {!userApproved && (
                      <button
                        onClick={() => handleApproveTransaction(tx.id)}
                        disabled={loading}
                        style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Approve
                      </button>
                    )}
                    {userApproved && (
                      <span style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}>
                        ✓ You Approved
                      </span>
                    )}
                    {canExecute && (
                      <button
                        onClick={() => handleExecuteTransaction(tx.id)}
                        disabled={loading}
                        style={{
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Execute Transaction
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {transactions.filter(tx => !tx.executed).length === 0 && (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No pending transactions
            </p>
          )}
        </div>

        {/* Executed Transactions */}
        {transactions.filter(tx => tx.executed).length > 0 && (
          <>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginTop: '2rem', marginBottom: '1rem' }}>
              Executed Transactions ({transactions.filter(tx => tx.executed).length})
            </h4>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {transactions.filter(tx => tx.executed).map(tx => (
                <div key={tx.id} style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f0fdf4',
                  opacity: 0.8
                }}>
                  <div><strong>Transaction ID:</strong> {tx.id}</div>
                  <div><strong>To:</strong> {formatAddress(tx.to)}</div>
                  <div><strong>Value:</strong> {tx.value} ETH</div>
                  <div><strong>Status:</strong> ✅ Executed</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Projects Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Your Projects
        </h3>

        {projects.map(project => (
          <div key={project.index} style={{
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Project ID:</strong> {project.projectId}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Total Funded:</strong> {project.totalFunded} ETH
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Status:</strong> {project.active ? '✅ Active' : '❌ Inactive'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Multisig Wallet:</strong> {formatAddress(project.multisigWallet)}
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginTop: '1rem', marginBottom: '0.5rem' }}>
              Milestones
            </h4>

            {project.milestones.map(milestone => (
              <div key={milestone.index} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.25rem',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div><strong>Milestone {milestone.index}:</strong></div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      backgroundColor: milestone.state === 2 ? '#dcfce7' : milestone.state === 1 ? '#fef3c7' : '#e5e7eb',
                      color: milestone.state === 2 ? '#166534' : milestone.state === 1 ? '#92400e' : '#374151'
                    }}>
                      {getMilestoneStateText(milestone.state)}
                    </span>
                  </div>
                </div>
                <div>Amount: {milestone.amount} ETH</div>
                <div>Funded: {milestone.fundedAmount} ETH</div>
                {milestone.proofHash && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                    Proof: {milestone.proofHash.substring(0, 20)}...
                  </div>
                )}

                {milestone.state === 0 && parseFloat(milestone.fundedAmount) >= parseFloat(milestone.amount) && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                      Upload Milestone Proof:
                    </label>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleFileUpload(project.index, milestone.index, file);
                        }
                      }}
                      disabled={loading}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        width: '100%',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Upload proof document (PDF, image, etc.). In production, this will be stored on IPFS.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {projects.length === 0 && (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            No projects found. Create a project to get started.
          </p>
        )}
      </div>
    </div>
  );
};

export default NGODashboard;
