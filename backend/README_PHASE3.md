# Phase 3: Backend Orchestration Layer

## Overview

The backend orchestrates NGO projects and milestone workflows **without custody of funds**. It coordinates metadata and prepares blockchain transactions, but users must sign transactions client-side. The blockchain is the source of truth for all fund state.

## Key Principles

✅ **Backend coordinates, never controls funds**  
✅ **No private key storage** - Backend never stores private keys  
✅ **Client-side signing** - Users sign all transactions  
✅ **Blockchain is source of truth** - On-chain state is authoritative  
✅ **Metadata storage** - Backend stores off-chain metadata only  
✅ **Transaction preparation** - Backend prepares transaction data for signing  

## Architecture

```
Frontend → Backend (API) → Blockchain (via Viem)
           ↓
        MongoDB (metadata only)
```

### Flow Example

1. **Create Project**
   - Frontend calls `POST /api/project/create`
   - Backend stores metadata in MongoDB
   - Backend returns transaction data
   - Frontend/user signs transaction
   - Frontend calls `POST /api/project/sync/:id` with tx hash
   - Backend syncs with on-chain state

2. **Submit Milestone**
   - Frontend calls `POST /api/milestone/submit`
   - Backend stores proof hash in MongoDB
   - Backend returns transaction data
   - Frontend/user signs transaction
   - Milestone becomes SUBMITTED on-chain

3. **Approve Milestone**
   - Protocol owner calls `POST /api/milestone/verify`
   - Backend checks on-chain state
   - Backend returns approval transaction data
   - Protocol owner signs transaction
   - Milestone becomes APPROVED on-chain

## API Endpoints

### NGO Registration

#### `POST /api/ngo/register`
Register a new NGO.

**Request:**
```json
{
  "name": "Example NGO",
  "email": "ngo@example.com",
  "password": "password123",
  "description": "NGO description",
  "category": "Education",
  "registrationNumber": "REG123",
  "walletAddress": "0x..." // Optional
}
```

**Response:**
```json
{
  "_id": "...",
  "name": "Example NGO",
  "email": "ngo@example.com",
  "role": "ngo",
  "walletAddress": "0x...",
  "message": "NGO registered successfully"
}
```

### Project Creation

#### `POST /api/project/create`
Create a new project (stores metadata, prepares blockchain transaction).

**Request:**
```json
{
  "title": "Education Project",
  "description": "Project description",
  "category": "Education",
  "totalRequired": 10.0,
  "multisigWalletAddress": "0x...",
  "milestones": [
    {
      "title": "Milestone 1",
      "description": "Description",
      "requiredAmount": 5.0
    },
    {
      "title": "Milestone 2",
      "description": "Description",
      "requiredAmount": 5.0
    }
  ]
}
```

**Response:**
```json
{
  "project": { /* project metadata */ },
  "transactionData": {
    "to": "0x...", // Escrow contract address
    "data": "0x...", // Encoded function call
    "message": "Sign this transaction to create project on blockchain"
  },
  "instructions": "After signing, call /api/project/sync/:id"
}
```

#### `POST /api/project/sync/:id`
Sync project with on-chain state after transaction confirmation.

**Request:**
```json
{
  "txHash": "0x..."
}
```

### Milestone Submission

#### `POST /api/milestone/submit`
Submit milestone proof (stores metadata, prepares blockchain transaction).

**Request:**
```json
{
  "projectId": "...",
  "milestoneIndex": 0,
  "proofHash": "QmXxxx...", // IPFS hash
  "proofDocument": "https://..." // Optional
}
```

**Response:**
```json
{
  "project": { /* project */ },
  "milestone": { /* milestone */ },
  "transactionData": {
    "to": "0x...",
    "data": "0x...",
    "message": "Sign this transaction to submit milestone on blockchain"
  }
}
```

### Milestone Verification

#### `POST /api/milestone/verify`
Verify/approve milestone (protocol owner only, prepares blockchain transaction).

**Request:**
```json
{
  "projectId": "...",
  "milestoneIndex": 0
}
```

**Response:**
```json
{
  "project": { /* project */ },
  "milestone": { /* milestone */ },
  "onChainState": { /* on-chain milestone state */ },
  "transactionData": {
    "to": "0x...",
    "data": "0x...",
    "message": "Sign this transaction to approve milestone (protocol owner only)"
  }
}
```

### Fund Release

#### `POST /api/milestone/release`
Release funds for approved milestone (prepares blockchain transaction).

**Request:**
```json
{
  "projectId": "...",
  "milestoneIndex": 0
}
```

**Response:**
```json
{
  "project": { /* project */ },
  "milestone": { /* milestone */ },
  "onChainState": { /* on-chain milestone state */ },
  "transactionData": {
    "to": "0x...",
    "data": "0x...",
    "message": "Sign this transaction to release funds to multisig wallet"
  }
}
```

### Get Project State

#### `GET /api/project/:id/state`
Get project with on-chain state.

**Response:**
```json
{
  "project": { /* project metadata */ },
  "onChainState": {
    "ngoAddress": "0x...",
    "projectId": "...",
    "multisigWallet": "0x...",
    "totalFunded": "10.0",
    "milestoneCount": 2,
    "active": true
  },
  "milestonesState": [
    {
      "index": 0,
      "amount": "5.0",
      "fundedAmount": "5.0",
      "state": 2, // 0=PENDING, 1=SUBMITTED, 2=APPROVED, 3=DISPUTED
      "released": false
    }
  ]
}
```

## Blockchain Service

The `services/blockchain.js` module handles all blockchain interactions using Viem:

### Functions

- `getOnChainProject(escrowAddress, projectIndex)` - Read project state
- `getOnChainMilestone(escrowAddress, projectIndex, milestoneIndex)` - Read milestone state
- `getProjectIndex(escrowAddress, projectId)` - Get project index by ID
- `prepareCreateProjectTransaction(...)` - Prepare create project transaction
- `prepareSubmitMilestoneTransaction(...)` - Prepare submit milestone transaction
- `prepareApproveMilestoneTransaction(...)` - Prepare approve milestone transaction
- `prepareReleaseFundsTransaction(...)` - Prepare release funds transaction
- `verifyTransaction(txHash)` - Verify transaction receipt

### Important Notes

- **Read-only by default** - Uses public client for reading
- **Transaction preparation only** - Never signs transactions
- **User signs client-side** - All write operations require user signature

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/trustfund-dao

# JWT
JWT_SECRET=your-secret-key

# Blockchain
BLOCKCHAIN_NETWORK=localhost # or 'sepolia'
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
ESCROW_CONTRACT_ADDRESS=0x... # Escrow contract address
PROTOCOL_OWNER_ADDRESS=0x... # Protocol owner address (for approvals)

# Server
PORT=5000
NODE_ENV=development
```

## Security Considerations

1. **No Private Keys** - Backend never stores private keys
2. **Client-Side Signing** - All transactions require user signature
3. **On-Chain Verification** - Backend verifies on-chain state before operations
4. **Access Control** - Role-based access (NGO, Protocol Owner)
5. **Input Validation** - All inputs validated before processing
6. **Blockchain as Source of Truth** - On-chain state is authoritative

## What Backend Does

✅ NGO registration  
✅ Project metadata storage  
✅ Milestone metadata storage  
✅ Proof upload tracking (IPFS hashes)  
✅ Prepares blockchain transactions  
✅ Tracks wallet addresses  
✅ Reads on-chain state  
✅ Coordinates workflows  

## What Backend NEVER Does

❌ Holds private keys  
❌ Moves funds directly  
❌ Overrides on-chain logic  
❌ Signs transactions  
❌ Controls fund custody  
❌ Bypasses blockchain  

## Data Flow

### Project Creation Flow

```
1. Frontend → POST /api/project/create
2. Backend → Store metadata in MongoDB
3. Backend → Prepare transaction data
4. Backend → Return transaction data to frontend
5. Frontend → User signs transaction (MetaMask, etc.)
6. Frontend → Transaction sent to blockchain
7. Frontend → POST /api/project/sync/:id (with tx hash)
8. Backend → Verify transaction
9. Backend → Get on-chain project index
10. Backend → Update MongoDB with on-chain index
```

### Milestone Submission Flow

```
1. Frontend → POST /api/milestone/submit (with proof hash)
2. Backend → Store proof hash in MongoDB
3. Backend → Prepare submitMilestone transaction
4. Backend → Return transaction data
5. Frontend → User signs transaction
6. Frontend → Transaction sent to blockchain
7. On-chain → Milestone state: PENDING → SUBMITTED
```

## Files Created

1. `services/blockchain.js` - Blockchain interaction service (Viem)
2. `controllers/ngoController.js` - NGO registration and management
3. `controllers/orchestrationController.js` - Project and milestone orchestration
4. `routes/ngoRoutes.js` - NGO routes
5. `routes/orchestrationRoutes.js` - Orchestration routes
6. Updated `models/Project.js` - Added blockchain-related fields

## Testing

```bash
# Start backend
cd backend
npm install
npm run dev

# Test endpoints (use Postman or curl)
# 1. Register NGO
POST http://localhost:5000/api/ngo/register

# 2. Create Project
POST http://localhost:5000/api/project/create
Authorization: Bearer <token>

# 3. Submit Milestone
POST http://localhost:5000/api/milestone/submit
Authorization: Bearer <token>
```

## Phase 3 Compliance

✅ REST APIs for NGO registration  
✅ REST APIs for project creation  
✅ REST APIs for milestone submission  
✅ REST APIs for milestone verification  
✅ Backend triggers escrow release (prepares transaction)  
✅ All money logic on-chain  
✅ No private key storage  
✅ Blockchain is source of truth  
✅ Clean separation (metadata vs on-chain)  

