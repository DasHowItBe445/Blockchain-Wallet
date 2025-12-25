import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';

const FunderDashboard = () => {
  useAuth();
  const {
    account,
    escrowContract,
    depositFunds,
    getProjectCount,
    getEscrowProject,
    getEscrowMilestone,
    getTransactionHistory  } = useWeb3();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProject] = useState(null);
  const [auditTrail, setAuditTrail] = useState(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // Load all projects
  const loadProjects = useCallback(async () => {
    if (!escrowContract) return;

    try {
      const count = await getProjectCount();
      const projs = [];

      for (let i = 1; i <= count; i++) {
        const project = await getEscrowProject(i);
        if (project[5]) { // Only active projects
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
  }, [escrowContract, getProjectCount, getEscrowProject, getEscrowMilestone]);

  // Load audit trail for a multisig wallet
  const loadAuditTrail = async (walletAddress) => {
    if (!walletAddress) {
      setError('Wallet address is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get transaction history from the multisig wallet
      const history = await getTransactionHistory(walletAddress);
      setAuditTrail(history);
      setShowAuditTrail(true);
    } catch (err) {
      console.error('Error loading audit trail:', err);
      setError(`Failed to load audit trail: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account && escrowContract) {
      loadProjects();
    }
  }, [account, escrowContract, loadProjects]);

  const handleFundProject = async (projectIndex, amount) => {
    setLoading(true);
    setError(null);

    try {
      await depositFunds(projectIndex, amount);
      await loadProjects();
      alert(`Successfully funded ${amount} ETH to project!`);
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

  const getMilestoneStateColor = (state) => {
    const colors = {
      0: { bg: '#e5e7eb', text: '#374151' }, // PENDING
      1: { bg: '#fef3c7', text: '#92400e' }, // SUBMITTED
      2: { bg: '#dcfce7', text: '#166534' }, // APPROVED
      3: { bg: '#fee2e2', text: '#dc2626' }  // DISPUTED
    };
    return colors[state] || colors[0];
  };

  const getFundingProgress = (milestones) => {
    const totalNeeded = milestones.reduce((sum, m) => sum + parseFloat(m.amount), 0);
    const totalFunded = milestones.reduce((sum, m) => sum + parseFloat(m.fundedAmount), 0);
    return totalNeeded > 0 ? (totalFunded / totalNeeded) * 100 : 0;
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getDaysRemaining = (disputeWindowEnd) => {
    if (!disputeWindowEnd || disputeWindowEnd === 0) return null;
    const now = Math.floor(Date.now() / 1000);
    const remaining = disputeWindowEnd - now;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / (24 * 60 * 60));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Funder Dashboard
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

      {/* Audit Trail Section */}
      {showAuditTrail && auditTrail && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
              Wallet Audit Trail
            </h3>
            <button
              onClick={() => setShowAuditTrail(false)}
              style={{
                backgroundColor: '#e5e7eb',
                color: '#374151',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>

          {/* Deposits */}
          {auditTrail.deposits && auditTrail.deposits.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Deposits ({auditTrail.deposits.length})
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {auditTrail.deposits.map((deposit, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '0.25rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div><strong>From:</strong> {formatAddress(deposit.sender)}</div>
                    <div><strong>Amount:</strong> {deposit.value} ETH</div>
                    <div><strong>New Balance:</strong> {deposit.balance} ETH</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                      Block: {deposit.blockNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposed Transactions */}
          {auditTrail.proposed && auditTrail.proposed.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Proposed Transactions ({auditTrail.proposed.length})
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {auditTrail.proposed.map((tx, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '0.25rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div><strong>TX ID:</strong> {tx.txId}</div>
                    <div><strong>Proposed by:</strong> {formatAddress(tx.proposer)}</div>
                    <div><strong>To:</strong> {formatAddress(tx.to)}</div>
                    <div><strong>Amount:</strong> {tx.value} ETH</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                      Block: {tx.blockNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Transactions */}
          {auditTrail.approved && auditTrail.approved.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Approved Transactions ({auditTrail.approved.length})
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {auditTrail.approved.map((tx, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '0.25rem',
                    border: '1px solid #10b981'
                  }}>
                    <div><strong>TX ID:</strong> {tx.txId}</div>
                    <div><strong>Approved by:</strong> {formatAddress(tx.approver)}</div>
                    <div><strong>Approvals:</strong> {tx.approvalCount}/{tx.requiredApprovals}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                      Block: {tx.blockNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executed Transactions */}
          {auditTrail.executed && auditTrail.executed.length > 0 && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Executed Transactions ({auditTrail.executed.length})
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {auditTrail.executed.map((tx, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    backgroundColor: '#dcfce7',
                    borderRadius: '0.25rem',
                    border: '1px solid #10b981'
                  }}>
                    <div><strong>TX ID:</strong> {tx.txId}</div>
                    <div><strong>Executed by:</strong> {formatAddress(tx.executor)}</div>
                    <div><strong>To:</strong> {formatAddress(tx.to)}</div>
                    <div><strong>Amount:</strong> {tx.value} ETH</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                      Block: {tx.blockNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!auditTrail.deposits || auditTrail.deposits.length === 0) &&
           (!auditTrail.proposed || auditTrail.proposed.length === 0) &&
           (!auditTrail.approved || auditTrail.approved.length === 0) &&
           (!auditTrail.executed || auditTrail.executed.length === 0) && (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No transaction history found
            </p>
          )}
        </div>
      )}

      {/* Projects Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
            Available Projects ({projects.length})
          </h3>
          {!showAuditTrail && (
            <button
              onClick={() => {
                // Get the first project's multisig wallet for audit trail
                if (projects.length > 0 && projects[0].multisigWallet) {
                  loadAuditTrail(projects[0].multisigWallet);
                } else {
                  setError('No projects available to view audit trail');
                }
              }}
              style={{
                backgroundColor: '#6366f1',
                color: 'white',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              View Wallet Audit Trail
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {projects.map(project => {
            const progress = getFundingProgress(project.milestones);
            const unfundedMilestones = project.milestones.filter(m =>
              parseFloat(m.fundedAmount) < parseFloat(m.amount)
            );
            const completedMilestones = project.milestones.filter(m => m.state === 2);
            const submittedMilestones = project.milestones.filter(m => m.state === 1);

            return (
              <div key={project.index} style={{
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                backgroundColor: selectedProject === project.index ? '#f0f9ff' : 'white'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Project: {project.projectId}
                  </h4>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    NGO: {formatAddress(project.ngoAddress)}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Multisig Wallet: {formatAddress(project.multisigWallet)}
                    <button
                      onClick={() => loadAuditTrail(project.multisigWallet)}
                      style={{
                        marginLeft: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      View Audit Trail
                    </button>
                  </p>
                </div>

                {/* Funding Progress */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span><strong>Funding Progress</strong></span>
                    <span><strong>{progress.toFixed(1)}%</strong></span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '12px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      backgroundColor: progress === 100 ? '#10b981' : '#3b82f6',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <span>Completed: {completedMilestones.length}/{project.milestoneCount}</span>
                    <span>Submitted: {submittedMilestones.length}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div><strong>Total Funded:</strong> {project.totalFunded} ETH</div>
                  <div><strong>Milestones:</strong> {project.milestoneCount}</div>
                </div>

                {/* Milestones */}
                <div style={{ marginBottom: '1rem' }}>
                  <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Milestones
                  </h5>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {project.milestones.map(milestone => {
                      const stateColor = getMilestoneStateColor(milestone.state);
                      const daysRemaining = getDaysRemaining(milestone.disputeWindowEnd);
                      const isFullyFunded = parseFloat(milestone.fundedAmount) >= parseFloat(milestone.amount);
                      const fundingProgress = parseFloat(milestone.amount) > 0 
                        ? (parseFloat(milestone.fundedAmount) / parseFloat(milestone.amount)) * 100 
                        : 0;

                      return (
                        <div key={milestone.index} style={{
                          padding: '1rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          backgroundColor: '#f9fafb'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: '600' }}>Milestone {milestone.index}</span>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              backgroundColor: stateColor.bg,
                              color: stateColor.text
                            }}>
                              {getMilestoneStateText(milestone.state)}
                            </span>
                          </div>
                          
                          <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                              <span>Funding: {milestone.fundedAmount} / {milestone.amount} ETH</span>
                              <span>{fundingProgress.toFixed(1)}%</span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '6px',
                              backgroundColor: '#e5e7eb',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${fundingProgress}%`,
                                height: '100%',
                                backgroundColor: isFullyFunded ? '#10b981' : '#3b82f6'
                              }} />
                            </div>
                          </div>

                          {milestone.proofHash && (
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                              <strong>Proof:</strong> <span style={{ fontFamily: 'monospace' }}>{milestone.proofHash.substring(0, 20)}...</span>
                            </div>
                          )}

                          {milestone.state === 1 && (
                            <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem' }}>
                              ⏳ Submitted on {formatDate(milestone.submissionTime)} - Awaiting approval
                            </div>
                          )}

                          {milestone.state === 2 && (
                            <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                              ✅ Approved on {formatDate(milestone.approvalTime)}
                              {daysRemaining !== null && daysRemaining > 0 && (
                                <span> - {daysRemaining} day(s) until release</span>
                              )}
                              {daysRemaining !== null && daysRemaining === 0 && (
                                <span> - Ready for release</span>
                              )}
                            </div>
                          )}

                          {milestone.state === 3 && (
                            <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                              ⚠️ Disputed - Funds locked
                            </div>
                          )}

                          {milestone.released && (
                            <div style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.5rem' }}>
                              ✅ Funds released to multisig wallet
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Funding Form */}
                {unfundedMilestones.length > 0 && (
                  <div style={{
                    borderTop: '1px solid #e5e7eb',
                    paddingTop: '1rem'
                  }}>
                    <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Fund Project
                    </h5>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const amount = e.target.amount.value;
                        if (amount && parseFloat(amount) > 0) {
                          handleFundProject(project.index, amount);
                          e.target.reset();
                        }
                      }}
                      style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    >
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Amount (ETH)"
                        required
                        style={{
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          flex: 1
                        }}
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          backgroundColor: loading ? '#9ca3af' : '#10b981',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        {loading ? 'Funding...' : 'Fund Project'}
                      </button>
                    </form>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      Funds will be distributed to unfunded milestones in order
                    </p>
                  </div>
                )}

                {unfundedMilestones.length === 0 && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '0.5rem',
                    border: '1px solid #10b981',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#166534', margin: 0 }}>
                      ✅ All milestones fully funded
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {projects.length === 0 && (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            No projects available for funding.
          </p>
        )}
      </div>
    </div>
  );
};

export default FunderDashboard;
