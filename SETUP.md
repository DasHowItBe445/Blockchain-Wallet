# Web3 Wallet Project - Setup Guide

## Overview
This is a Web3-based NGO funding platform with milestone-based fund releases. The project consists of three main components:
- **Backend**: Node.js/Express API with MongoDB
- **Frontend**: React application with Web3 integration
- **Blockchain**: Hardhat-based Solidity smart contracts

## Fixed Issues

The following issues have been fixed:

1. ✅ **Project Routes**: Connected project routes to controllers (was placeholder)
2. ✅ **AuthContext Variable Shadowing**: Fixed `userData` parameter shadowing issue
3. ✅ **Web3Context Validation**: Added null checks for contractAddress and sepoliaChainId
4. ✅ **Default API URL**: Added fallback default for API_URL in frontend
5. ✅ **Route Ordering**: Fixed route ordering to prevent route conflicts

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- MetaMask browser extension
- Hardhat for smart contract deployment

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/trustfund-dao
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

Start the backend:
```bash
npm run dev
# or
npm start
```

### 2. Blockchain Setup

```bash
cd blockchain
npm install
```

Create `blockchain/.env` file:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=your-etherscan-api-key
```

Compile contracts:
```bash
npm run compile
```

Deploy to localhost (requires running `npx hardhat node` in another terminal):
```bash
npm run deploy:localhost
```

Deploy to Sepolia testnet:
```bash
npm run deploy:sepolia
```

**Important**: After deployment, copy the contract address and add it to `frontend/.env`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_CONTRACT_ADDRESS=0x... # From deployment step
REACT_APP_SEPOLIA_CHAIN_ID=11155111
```

Start the frontend:
```bash
npm start
```

## Environment Variables Summary

### Backend (.env)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5000)

### Frontend (.env)
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_CONTRACT_ADDRESS` - Deployed smart contract address
- `REACT_APP_SEPOLIA_CHAIN_ID` - Sepolia network chain ID (11155111)

### Blockchain (.env)
- `SEPOLIA_RPC_URL` - Sepolia RPC endpoint
- `PRIVATE_KEY` - Deployer wallet private key (NEVER commit to git!)
- `ETHERSCAN_API_KEY` - Etherscan API key for contract verification

## Running the Application

1. Start MongoDB (if using local instance)
2. Start the backend server: `cd backend && npm run dev`
3. Deploy smart contracts (if not already deployed): `cd blockchain && npm run deploy:localhost`
4. Start the frontend: `cd frontend && npm start`

The application will be available at `http://localhost:3000`

## Key Features

- User authentication (NGO and Funder roles)
- Web3 wallet connection (MetaMask)
- Project creation and management
- Milestone-based funding
- Smart contract integration for transparent fund management

## Notes

- Always use test networks (Sepolia) for development
- Never commit `.env` files or private keys to version control
- The contract address must be updated in frontend after each deployment
- Ensure MetaMask is connected to the correct network (Sepolia for testnet)

