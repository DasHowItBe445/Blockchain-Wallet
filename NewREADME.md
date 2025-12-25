# Web3 Wallet Project - Complete Setup Guide

A decentralized NGO funding platform built with React, Node.js, MongoDB, and Ethereum smart contracts. This platform enables transparent, milestone-based funding for NGOs using blockchain technology.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Blockchain Setup](#2-blockchain-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Deployment Guide](#deployment-guide)
  - [Local Blockchain Deployment](#local-blockchain-deployment)
  - [Smart Wallet Deployment](#smart-wallet-deployment)
  - [Escrow Contract Deployment](#escrow-contract-deployment)
  - [MilestoneFunding Contract Deployment](#milestonefunding-contract-deployment)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Key Features](#key-features)

## 🎯 Project Overview

This project consists of three main components:

1. **Backend**: Node.js/Express REST API with MongoDB for user management and project orchestration
2. **Frontend**: React application with Web3 integration for wallet connection and blockchain interactions
3. **Blockchain**: Solidity smart contracts deployed on Ethereum (local/testnet) for transparent fund management

### Smart Contracts

- **MilestoneFunding**: Manages project funding and milestone-based fund releases
- **SmartWallet**: Multisignature wallet for secure fund custody (M-of-N approval scheme)
- **Escrow**: Escrow contract that releases funds to multisig wallet after milestone approval

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (local installation or MongoDB Atlas account) - [Download](https://www.mongodb.com/try/download/community)
- **MetaMask** browser extension - [Install](https://metamask.io/)
- **Git** - [Download](https://git-scm.com/)

### Optional but Recommended

- **Hardhat** (installed as project dependency)
- **Etherscan API Key** (for contract verification on testnets)

## 📁 Project Structure

```
web3-wallet-project/
├── backend/              # Node.js/Express API
│   ├── config/          # Database configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth and error handling
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Blockchain service
│   └── server.js        # Entry point
├── blockchain/          # Smart contracts
│   ├── contracts/       # Solidity contracts
│   ├── scripts/         # Deployment scripts
│   ├── artifacts/       # Compiled contracts
│   └── hardhat.config.cjs
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # React contexts (Auth, Web3)
│   │   ├── contracts/   # Contract ABIs
│   │   └── services/    # API service
│   └── public/
└── README.md
```

## 🚀 Setup Instructions

### 1. Backend Setup

#### Step 1: Install Dependencies

```bash
cd backend
npm install
```

#### Step 2: Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# MongoDB Connection
MONGODB_URI=xx
# For MongoDB Atlas, use:
# MONGODB_URI=xx

# JWT Secret (use a strong random string in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=5000

# Environment
NODE_ENV=development
```

#### Step 3: Start MongoDB

**Option A: Local MongoDB**
```bash
# Windows (if installed as service)
# MongoDB should start automatically

# Linux/Mac
sudo systemctl start mongod
# or
mongod
```

**Option B: MongoDB Atlas**
- Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a cluster and get your connection string
- Update `MONGODB_URI` in `.env`

#### Step 4: Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ MongoDB Connected: ...
🚀 Server running on port 5000
```

Verify the server is running:
```bash
# Open in browser or use curl
curl http://localhost:5000/health
```

---

### 2. Blockchain Setup

#### Step 1: Install Dependencies

```bash
cd blockchain
npm install
```

#### Step 2: Configure Environment Variables

Create a `.env` file in the `blockchain/` directory:

```env
# For Sepolia Testnet (optional)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
# Or use Infura:
# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Deployer Private Key (NEVER commit to git!)
# Get from MetaMask: Account Details > Export Private Key
PRIVATE_KEY=0xYourPrivateKeyHere

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=YourEtherscanAPIKey
```

**⚠️ Security Warning**: Never commit your private key or `.env` file to version control!

#### Step 3: Compile Contracts

```bash
npm run compile
```

You should see:
```
Compiled X Solidity files successfully
```

---

### 3. Frontend Setup

#### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

#### Step 2: Configure Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:5000/api

# Smart Contract Addresses (will be set after deployment)
REACT_APP_CONTRACT_ADDRESS=0x...
REACT_APP_SMART_WALLET_ADDRESS=0x...
REACT_APP_ESCROW_ADDRESS=0x...

# Network Configuration
REACT_APP_SEPOLIA_CHAIN_ID=11155111
```

**Note**: Contract addresses will be provided after deployment steps below.

#### Step 3: Start Frontend Development Server

```bash
npm start
```

The application will open at `http://localhost:3000`

---

## 🔧 Deployment Guide

### Local Blockchain Deployment

This guide covers deploying contracts to a local Hardhat network for development and testing.

#### Step 1: Start Local Hardhat Node

**⚠️ CRITICAL**: You MUST start the Hardhat node BEFORE deploying contracts!

Open a **new terminal** and run:

```bash
cd blockchain
npx hardhat node
```

This starts a local Ethereum node with 20 test accounts. **Keep this terminal open** - the node must be running for deployments to work.

You'll see output like:
```
Started HTTP and WebSocket server on http://127.0.0.1:8545/

Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

**Important**: 
- Copy the private key of Account #0 (or any account) - you'll need it for MetaMask
- **DO NOT close this terminal** - the node must stay running
- Wait a few seconds after starting before deploying contracts

#### Step 2: Configure MetaMask for Local Network

1. Open MetaMask
2. Click the network dropdown (top left)
3. Select "Add Network" > "Add a network manually"
4. Enter:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 1337
   - **Currency Symbol**: ETH
5. Click "Save"

#### Step 3: Import Test Account to MetaMask

1. In MetaMask, click the account icon (top right)
2. Select "Import Account"
3. Paste the private key from Step 1 (Account #0)
4. Click "Import"

You now have 10,000 ETH on the local network!

---

### Smart Wallet Deployment

The SmartWallet is a multisignature wallet that requires M-of-N approvals for transactions.

#### Step 1: Deploy SmartWallet

**⚠️ IMPORTANT**: Make sure the Hardhat node is running first (see Step 1 above)!

In a **new terminal** (keep Hardhat node running in the first terminal):

```bash
cd blockchain
npm run deploy:wallet
```

This script will:
- Deploy the SmartWallet contract
- Set up 3 owners (from Hardhat test accounts)
- Configure 2-of-3 approval scheme

**Output Example**:
```
🚀 Deploying SmartWallet...
Network: localhost
Deployer: 0xC40e646a25CBA4A27484FCDB2A4a326E2406d89e
Owner 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Owner 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Owner 3: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
✅ SmartWallet deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Required Approvals: 2 of 3
```

**Note**: If you see "insufficient funds" error, ensure the Hardhat node is running and wait a few seconds before retrying.

#### Step 2: Save SmartWallet Address

Copy the SmartWallet address and add it to `frontend/.env`:

```env
REACT_APP_SMART_WALLET_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### Step 3: Fund the SmartWallet (Optional)

To send ETH to the SmartWallet:

```bash
npm run fund:wallet
```

Or manually send ETH from MetaMask to the SmartWallet address.

---

### Escrow Contract Deployment

The Escrow contract manages milestone-based fund releases to the multisig wallet.

#### Step 1: Deploy Escrow Contract

**⚠️ IMPORTANT**: Ensure Hardhat node is still running!

```bash
cd blockchain
npm run deploy:escrow
```

**Output Example**:
```
🚀 Deploying Escrow Contract...
Network: localhost
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
✅ Escrow deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Protocol Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Dispute Window: 7 days
```

#### Step 2: Save Escrow Address

Add to `frontend/.env`:

```env
REACT_APP_ESCROW_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

**Note**: The protocol owner (deployer) can approve milestones. Make sure this account is accessible.

---

### MilestoneFunding Contract Deployment

The MilestoneFunding contract manages project creation and funding.

#### Step 1: Deploy MilestoneFunding Contract

**⚠️ IMPORTANT**: Ensure Hardhat node is still running!

```bash
cd blockchain
npm run deploy:localhost
```

**Output Example**:
```
🚀 Starting deployment...
Network: localhost
Deploying with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
✅ MilestoneFunding deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

#### Step 2: Save Contract Address

Add to `frontend/.env`:

```env
REACT_APP_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

#### Step 3: Restart Frontend

After updating `.env`, restart the frontend:

```bash
cd frontend
# Stop the server (Ctrl+C) and restart
npm start
```

---

## 🏃 Running the Application

### Complete Startup Sequence

1. **Start MongoDB** (if using local instance)
   ```bash
   # MongoDB should be running
   ```

2. **Start Backend** (Terminal 1)
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Hardhat Node** (Terminal 2) - **MUST RUN FIRST!**
   ```bash
   cd blockchain
   npx hardhat node
   ```
   ⚠️ **Keep this terminal open** - the node must stay running!

4. **Wait a few seconds** for the node to fully start, then deploy contracts (Terminal 3, one-time setup)
   ```bash
   cd blockchain
   npm run deploy:wallet
   npm run deploy:escrow
   npm run deploy:localhost
   ```
   Copy addresses to `frontend/.env`
   
   **Note**: If you see "insufficient funds" errors, ensure:
   - Hardhat node is running (Terminal 2)
   - You waited a few seconds after starting the node
   - The node shows accounts with 10,000 ETH each

5. **Start Frontend** (Terminal 4)
   ```bash
   cd frontend
   npm start
   ```

6. **Open Application**
   - Navigate to `http://localhost:3000`
   - Connect MetaMask (should be on Hardhat Local network)
   - Register/Login and start using the platform!

---

## 🔐 Environment Variables Summary

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb:` |
| `JWT_SECRET` | Secret for JWT token signing | `your-secret-key` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |

### Blockchain (`blockchain/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `SEPOLIA_RPC_URL` | Sepolia RPC endpoint (optional) | `https://eth-sepolia.g.alchemy.com/v2/...` |
| `PRIVATE_KEY` | Deployer wallet private key | `0x...` |
| `ETHERSCAN_API_KEY` | Etherscan API key (optional) | `YourAPIKey` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000/api` |
| `REACT_APP_CONTRACT_ADDRESS` | MilestoneFunding contract | `0x...` |
| `REACT_APP_SMART_WALLET_ADDRESS` | SmartWallet contract | `0x...` |
| `REACT_APP_ESCROW_ADDRESS` | Escrow contract | `0x...` |
| `REACT_APP_SEPOLIA_CHAIN_ID` | Sepolia chain ID | `11155111` |

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: MongoDB connection failed
```
❌ MongoDB Connection Failed: ...
```
**Solution**:
- Ensure MongoDB is running: `mongod` or check service status
- Verify `MONGODB_URI` in `backend/.env`
- Check MongoDB logs for errors

**Problem**: JWT_SECRET error
```
Error: JWT_SECRET is not defined
```
**Solution**:
- Create `backend/.env` file
- Add `JWT_SECRET=your-secret-key`
- Restart backend server

**Problem**: Port already in use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**:
- Change `PORT` in `backend/.env` to a different port (e.g., `5001`)
- Or stop the process using port 5000

### Blockchain Issues

**Problem**: Contract compilation failed
```
Error: Compilation failed
```
**Solution**:
- Check Solidity version matches in contracts (should be `^0.8.20`)
- Run `npm install` in `blockchain/` directory
- Check for syntax errors in contracts
- Ensure Hardhat 3.0 is installed: `npm list hardhat`

**Problem**: Deployment failed - insufficient funds
```
Error: Sender doesn't have enough funds to send tx
```
**Solution**:
1. **CRITICAL**: Ensure Hardhat node is running first: `npx hardhat node`
2. **Wait 5-10 seconds** after starting the node before deploying
3. Verify the node shows accounts with 10,000 ETH each in its output
4. The script will now show the deployer balance - if it's 0 ETH, restart the node
5. Make sure you're using `--network localhost` (default)
6. If still failing, stop and restart the Hardhat node completely

**Quick Fix**:
```bash
# Terminal 1: Start node and wait for accounts to show
cd blockchain
npx hardhat node
# Wait until you see: Account #0: 0x... (10000 ETH)
# Keep this terminal open!

# Terminal 2: Wait 5 seconds, then deploy
cd blockchain
npm run deploy:wallet
```

**What the script does now**:
- ✅ Checks connection to Hardhat node
- ✅ Shows deployer balance (should be 10000 ETH)
- ✅ Provides clear error messages if balance is 0
- ✅ Uses default Hardhat node accounts automatically

**Problem**: Cannot connect to Hardhat node
```
Error: could not detect network
```
**Solution**:
- Ensure `npx hardhat node` is running in a separate terminal
- Check RPC URL: `http://127.0.0.1:8545`
- Verify network name in script: `--network localhost`
- Wait a few seconds after starting the node before deploying

**Problem**: Hardhat 3.0 ES Module errors
```
Error: require is not defined in ES module scope
```
**Solution**:
- All scripts have been updated for Hardhat 3.0 ES modules
- Ensure `package.json` has `"type": "module"`
- Scripts use `import` instead of `require`
- Config file uses ES module syntax

**Problem**: Ethers plugin not loaded
```
Error: Cannot read properties of undefined (reading 'getSigners')
```
**Solution**:
- Scripts now use `ethers.js` directly with Hardhat artifacts
- No plugin needed - scripts read artifacts from `hre.artifacts.readArtifact()`
- This is the correct approach for Hardhat 3.0

### Frontend Issues

**Problem**: Cannot connect to backend
```
Network Error: Cannot reach backend server
```
**Solution**:
- Ensure backend is running on port 5000
- Check `REACT_APP_API_URL` in `frontend/.env`
- Verify CORS is enabled in backend
- Restart frontend after changing `.env`

**Problem**: MetaMask connection failed
```
Error: Please install MetaMask!
```
**Solution**:
- Install MetaMask browser extension
- Refresh the page
- Ensure MetaMask is unlocked

**Problem**: Wrong network
```
Error: Please switch to Sepolia network
```
**Solution**:
- For local development: Switch to "Hardhat Local" network (Chain ID: 1337)
- For testnet: Switch to Sepolia network (Chain ID: 11155111)
- Update `REACT_APP_SEPOLIA_CHAIN_ID` if using different network

**Problem**: Contract not found
```
Error: Contract address not configured
```
**Solution**:
- Deploy contracts first (see Deployment Guide)
- Copy contract addresses to `frontend/.env`
- Restart frontend after updating `.env`

### Contract Interaction Issues

**Problem**: Transaction reverted
```
Error: transaction reverted
```
**Solution**:
- Check contract state (is project active?)
- Verify you have required permissions
- Check gas limit
- Review contract requirements in code

**Problem**: ABI not found
```
Error: Contract ABI not found
```
**Solution**:
- Ensure contracts are compiled: `npm run compile` in `blockchain/`
- Copy ABI files from `blockchain/artifacts/contracts/` to `frontend/src/contracts/`
- Verify ABI file names match contract names

---

## ✨ Key Features

### User Roles

- **NGO**: Create projects, submit milestones, receive funds
- **Funder**: Browse projects, fund projects, track progress

### Smart Contract Features

- **MilestoneFunding**: Transparent project funding with milestone tracking
- **SmartWallet**: Multisignature wallet with M-of-N approval
- **Escrow**: Secure escrow with dispute window and milestone approval

### Platform Features

- User authentication and authorization
- Web3 wallet integration (MetaMask)
- Project creation and management
- Milestone-based funding
- Real-time blockchain transaction tracking
- Fund release automation

---

## 📝 Additional Notes

### Hardhat 3.0 Compatibility

This project uses **Hardhat 3.0** with ES modules. Key differences from Hardhat 2.x:

1. **ES Modules**: All scripts use `import` instead of `require`
2. **Direct Ethers.js**: Scripts use `ethers.js` directly with Hardhat artifacts
3. **Network Configuration**: Networks require `type` and `chainType` fields
4. **Artifact Reading**: Contracts are deployed using `hre.artifacts.readArtifact()`

### For Production Deployment

1. **Use Testnets**: Always test on Sepolia or other testnets before mainnet
2. **Secure Private Keys**: Never commit private keys or `.env` files
3. **Environment Variables**: Use secure secret management in production
4. **Database**: Use MongoDB Atlas or managed database service
5. **HTTPS**: Enable HTTPS for frontend and backend
6. **Contract Verification**: Verify contracts on Etherscan for transparency
7. **Hardhat Node**: For production, use a proper testnet or mainnet RPC endpoint

### Contract Addresses

After deployment, save all contract addresses:
- MilestoneFunding: `REACT_APP_CONTRACT_ADDRESS`
- SmartWallet: `REACT_APP_SMART_WALLET_ADDRESS`
- Escrow: `REACT_APP_ESCROW_ADDRESS`

### Network Configuration

- **Local Development**: Hardhat Local (Chain ID: 1337)
- **Testnet**: Sepolia (Chain ID: 11155111)
- **Mainnet**: Ethereum Mainnet (Chain ID: 1) - **Use with caution!**

---

## 📚 Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://react.dev/)

---

## 🤝 Support

If you encounter issues not covered in this guide:

1. Check the troubleshooting section
2. Review error messages in browser console and terminal
3. Check contract deployment logs
4. Verify all environment variables are set correctly
5. Ensure all services are running (MongoDB, Backend, Hardhat node)

---

## 📄 License

This project is for educational purposes. Use at your own risk.

---

**Happy Building! 🚀**

