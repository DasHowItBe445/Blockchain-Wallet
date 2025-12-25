import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import NGODashboard from './NGODashboard';
import FunderDashboard from './FunderDashboard';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { account, balance, connectWallet, disconnect } = useWeb3();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
              TrustFund DAO
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Welcome, {user?.name}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {!account ? (
              <button
                onClick={connectWallet}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Connect Wallet
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Connected</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', fontFamily: 'monospace' }}>
                    {account.substring(0, 6)}...{account.substring(38)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {parseFloat(balance).toFixed(4)} ETH
                  </p>
                </div>
                <button
                  onClick={disconnect}
                  style={{
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}
            
            <button
              onClick={logout}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1280px', margin: '2rem auto', padding: '0 2rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Dashboard
          </h2>
          
          <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>User Information</h3>
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role?.toUpperCase()}</p>
            {user?.walletAddress && (
              <p><strong>Wallet:</strong> {user.walletAddress}</p>
            )}
          </div>

          {user?.role === 'ngo' ? (
            <NGODashboard />
          ) : (
            <FunderDashboard />
          )}

          {!account && (
            <div style={{ marginTop: '1rem', backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #fbbf24' }}>
              <p style={{ color: '#92400e' }}>
                ⚠️ Please connect your MetaMask wallet to interact with smart contracts
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;