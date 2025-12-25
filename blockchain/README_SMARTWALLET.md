# SmartWallet - Multisignature Wallet Protocol

## Overview

A protocol-grade multisignature wallet smart contract that supports multiple owners with M-of-N approval scheme. The wallet enforces quorum requirements and provides secure ETH custody with a complete transaction lifecycle: propose → approve → execute.

## Features

✅ **Multi-owner wallet** - Supports any number of owners  
✅ **M-of-N approval scheme** - Configurable quorum (e.g., 2-of-3, 3-of-5)  
✅ **Owners defined at deployment** - Immutable owner set  
✅ **Transaction lifecycle** - propose → approve → execute workflow  
✅ **ETH custody** - Contract holds ETH securely  
✅ **No single-owner control** - Requires quorum for all transactions  
✅ **No admin override** - No backdoors or bypass mechanisms  
✅ **Reentrancy-safe** - Protected against reentrancy attacks  
✅ **Event logging** - Comprehensive events for all actions  
✅ **Deterministic deployment** - Using Hardhat Ignition  

## Security Features

- **Reentrancy protection**: Transaction marked as executed before external call
- **Double-approval prevention**: Owners cannot approve the same transaction twice
- **Double-execution prevention**: Transactions cannot be executed more than once
- **Quorum enforcement**: Cannot execute without required number of approvals
- **Owner-only functions**: All interactions restricted to owners
- **Input validation**: Comprehensive checks for all parameters

## Contract Structure

### State Variables
- `owners[]` - Array of owner addresses
- `isOwner` - Mapping of owner addresses to boolean
- `requiredApprovals` - Number of approvals needed (M)
- `transactionCount` - Total number of transactions
- `transactions` - Mapping of transaction ID to Transaction struct
- `approvals` - Mapping of transaction ID and owner to approval status

### Functions

#### Core Functions
- `proposeTransaction(address _to, uint256 _value, bytes _data)` - Propose a new transaction
- `approveTransaction(uint256 _txId)` - Approve a pending transaction
- `executeTransaction(uint256 _txId)` - Execute an approved transaction

#### View Functions
- `getOwnerCount()` - Get number of owners
- `getOwners()` - Get all owner addresses
- `getTransaction(uint256 _txId)` - Get transaction details
- `isApprovedBy(uint256 _txId, address _owner)` - Check if owner approved transaction
- `getBalance()` - Get contract ETH balance

### Events
- `Deposit` - Emitted when ETH is received
- `TransactionProposed` - Emitted when transaction is proposed
- `TransactionApproved` - Emitted when transaction is approved
- `TransactionExecuted` - Emitted when transaction is executed

## Deployment

### Prerequisites
1. Hardhat installed
2. Network running (localhost or testnet)
3. Owner addresses defined

### Using Hardhat Ignition (Recommended)

```bash
# Compile contracts
npm run compile

# Deploy to localhost
npm run deploy:wallet

# Or deploy with custom parameters
npx hardhat run scripts/deploy-wallet.js --network localhost
```

### Deployment Script

The deployment script (`scripts/deploy-wallet.js`) will:
1. Get signers from Hardhat
2. Define owners (default: first 3 accounts, 2-of-3 scheme)
3. Deploy using Hardhat Ignition for deterministic addresses
4. Verify deployment

### Configuration

Edit `scripts/deploy-wallet.js` to customize:
- Number of owners
- Owner addresses
- Required approvals (M-of-N)

## Usage

### 1. Deploy Wallet

```bash
npm run deploy:wallet
```

Save the deployed wallet address.

### 2. Fund Wallet

```bash
# Set wallet address
export WALLET_ADDRESS=0x...

# Fund with 1 ETH (default)
npm run fund:wallet

# Or specify amount
FUND_AMOUNT=5.0 npm run fund:wallet
```

### 3. Test Wallet

```bash
# Set wallet address
export WALLET_ADDRESS=0x...

# Run test script
npm run test:wallet
```

The test script will:
1. Propose a transaction
2. Get approvals from multiple owners
3. Execute the transaction
4. Verify ETH was transferred

## Example Workflow

### Propose Transaction

```javascript
const wallet = await ethers.getContractAt("SmartWallet", walletAddress);
const tx = await wallet.connect(owner1).proposeTransaction(
  recipientAddress,
  ethers.parseEther("1.0"), // 1 ETH
  "0x" // Empty data
);
const receipt = await tx.wait();
const txId = await wallet.transactionCount() - 1n;
```

### Approve Transaction

```javascript
// Owner 1 approves
await wallet.connect(owner1).approveTransaction(txId);

// Owner 2 approves
await wallet.connect(owner2).approveTransaction(txId);

// Check approval count
const txInfo = await wallet.getTransaction(txId);
console.log("Approvals:", txInfo.approvalCount.toString());
```

### Execute Transaction

```javascript
// Execute (requires quorum)
await wallet.connect(owner1).executeTransaction(txId);
```

## Security Considerations

1. **Owner Selection**: Choose owners carefully - they cannot be changed after deployment
2. **Quorum Setting**: Balance between security (higher M) and convenience (lower M)
3. **Transaction Data**: Be careful with custom data - it can call arbitrary functions
4. **ETH Limits**: Ensure sufficient balance before proposing transactions
5. **Gas Costs**: Each approval and execution costs gas

## Limitations

- Owners cannot be changed after deployment
- Quorum cannot be changed after deployment
- No upgrade mechanism (Phase 1 requirement)
- No escrow functionality yet (future phase)

## Testing

```bash
# Run Hardhat tests (when test files are added)
npm test

# Or use the test script
npm run test:wallet
```

## Network Support

- ✅ Localhost (Hardhat Network)
- ✅ Sepolia Testnet
- ✅ Mainnet (use with caution)

## Phase 1 Compliance

✅ Multi-owner wallet  
✅ M-of-N approval scheme  
✅ Owners defined at deployment  
✅ Transaction lifecycle (propose → approve → execute)  
✅ ETH custody  
✅ No single-owner control  
✅ No admin override  
✅ Events for all actions  
✅ Deterministic deployment (Ignition)  
✅ No escrow (as required)  
✅ Reentrancy-safe  

## Next Steps (Future Phases)

- Escrow functionality
- Upgrade mechanism
- Owner management (add/remove)
- Time locks
- Spending limits
- Multi-token support

