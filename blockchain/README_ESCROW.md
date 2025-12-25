# Escrow Contract - Phase 2

## Overview

The Escrow contract ensures funds can **ONLY** reach NGOs via the multisig wallet, and only after milestone conditions are met. It enforces milestone-based fund locking with approval workflows and dispute mechanisms.

## Key Features

✅ **Milestone-based fund locking** - Funds locked per milestone  
✅ **Multisig-only releases** - Funds released ONLY to multisig wallet (never to EOAs)  
✅ **Multiple milestone states** - PENDING → SUBMITTED → APPROVED → (DISPUTED)  
✅ **Dispute window** - 7-day window after approval before release  
✅ **ETH deposits** - Accept funds from multiple funders  
✅ **Events for all actions** - Deposit, submission, approval, release  
✅ **Reentrancy-safe** - Using OpenZeppelin ReentrancyGuard  
✅ **No shortcuts** - Funder → Escrow → Multisig (enforced)  

## Milestone States

```
PENDING → SUBMITTED → APPROVED → (7 days) → RELEASE
                ↓
            DISPUTED (funds locked)
```

- **PENDING**: Initial state, waiting for NGO to submit proof
- **SUBMITTED**: NGO submitted proof hash
- **APPROVED**: Protocol owner approved the milestone
- **DISPUTED**: Milestone disputed, funds locked until resolution

## Security Guarantees

1. **No direct NGO withdrawals** - NGO address is reference only
2. **Multisig-only releases** - Contract validates multisig is a contract address
3. **Funds stuck safely on dispute** - Disputed milestones cannot release funds
4. **Quorum enforcement** - Milestone must be approved AND dispute window elapsed
5. **Reentrancy protection** - Using OpenZeppelin's ReentrancyGuard

## Contract Functions

### Project Management

#### `createProject(projectId, ngoAddress, multisigWallet, milestoneAmounts)`
Creates a new project with milestones.

**Parameters:**
- `projectId`: Unique project identifier (string)
- `ngoAddress`: NGO beneficiary (reference only, cannot withdraw)
- `multisigWallet`: Multisig wallet address (ONLY release destination)
- `milestoneAmounts`: Array of amounts per milestone

**Requirements:**
- Multisig wallet must be a contract (code size > 0)
- All milestone amounts > 0
- Project ID must be unique

### Funding

#### `depositFunds(projectIndex)`
Deposits ETH into escrow for a project.

**Payable:** Yes (sends ETH with transaction)

**Behavior:**
- Funds distributed across milestones in order
- Each milestone funded up to its required amount
- Tracks individual funder contributions

### Milestone Management

#### `submitMilestone(projectIndex, milestoneIndex, proofHash)`
Submit proof for a milestone (anyone can call, typically NGO).

**Requirements:**
- Milestone must be PENDING
- Milestone must be fully funded
- Proof hash must not be empty

#### `approveMilestone(projectIndex, milestoneIndex)`
Approve a submitted milestone (protocol owner only).

**Requirements:**
- Milestone must be SUBMITTED
- Milestone must be fully funded
- Not already released

**Effects:**
- Sets state to APPROVED
- Sets approval timestamp
- Sets dispute window end (approval time + 7 days)

#### `disputeMilestone(projectIndex, milestoneIndex)`
Dispute a milestone (protocol owner only, locks funds).

**Requirements:**
- Milestone must be SUBMITTED or APPROVED
- Not already released

**Effects:**
- Sets state to DISPUTED
- Funds cannot be released until resolved

### Fund Release

#### `releaseFunds(projectIndex, milestoneIndex)`
Release funds for approved milestone to multisig wallet.

**Requirements:**
- Milestone must be APPROVED
- Dispute window must have elapsed (7 days)
- Not already released
- Milestone must have funds

**Security:**
- Funds sent ONLY to multisig wallet address
- Reentrancy-protected
- Marked as released before external call

## Events

### Project Events
- `ProjectCreated` - When project is created

### Funding Events
- `FundsDeposited` - When funds are deposited

### Milestone Events
- `MilestoneSubmitted` - When proof is submitted
- `MilestoneApproved` - When milestone is approved
- `MilestoneDisputed` - When milestone is disputed

### Release Events
- `FundsReleased` - When funds are released to multisig

## Workflow Example

```
1. Create Project
   - Project ID: "project-001"
   - NGO: 0xNGO...
   - Multisig: 0xMultisig...
   - Milestones: [0.5 ETH, 0.3 ETH, 0.2 ETH]

2. Funders Deposit
   - Funder 1: 0.6 ETH
   - Funder 2: 0.4 ETH
   - Total: 1.0 ETH
   - Distributed: Milestone 1 (0.5 ETH), Milestone 2 (0.3 ETH), Milestone 3 (0.2 ETH)

3. Submit Milestone 1
   - NGO submits proof hash
   - State: PENDING → SUBMITTED

4. Approve Milestone 1
   - Protocol owner approves
   - State: SUBMITTED → APPROVED
   - Dispute window starts (7 days)

5. Wait Dispute Window
   - 7 days must pass
   - No disputes

6. Release Funds
   - Anyone can call releaseFunds()
   - 0.5 ETH sent to multisig wallet
   - Milestone marked as released
```

## Integration with SmartWallet

The Escrow contract integrates with the SmartWallet from Phase 1:

1. **Deploy SmartWallet** - Get multisig wallet address
2. **Deploy Escrow** - Deploy escrow contract
3. **Create Project** - Use multisig wallet address
4. **Fund Project** - Funders deposit ETH
5. **Complete Milestones** - Submit → Approve → Release
6. **Funds Released** - Sent to multisig wallet
7. **Multisig Controls** - Multisig wallet requires quorum to spend

## Deployment

### Deploy Escrow

```bash
cd blockchain
npm run deploy:escrow
```

### Deploy with Custom Owner

```bash
PROTOCOL_OWNER=0x... npm run deploy:escrow
```

## Testing

### Full Integration Test

```bash
# 1. Deploy SmartWallet
npm run deploy:wallet
export WALLET_ADDRESS=0x...

# 2. Deploy Escrow
npm run deploy:escrow
export ESCROW_ADDRESS=0x...

# 3. Run Integration Test
npm run test:escrow
```

## Security Considerations

1. **Multisig Validation**: Contract checks multisig is actually a contract (not EOA)
2. **Dispute Window**: 7-day window prevents immediate releases
3. **State Machine**: Strict state transitions prevent invalid operations
4. **Reentrancy**: Protected using OpenZeppelin ReentrancyGuard
5. **Access Control**: Protocol owner functions protected
6. **Fund Safety**: Disputed funds cannot be released

## Gas Estimates

- `createProject`: ~150k gas
- `depositFunds`: ~80k gas
- `submitMilestone`: ~60k gas
- `approveMilestone`: ~50k gas
- `disputeMilestone`: ~45k gas
- `releaseFunds`: ~70k gas

## Phase 2 Compliance

✅ Milestone-based fund locking  
✅ Funds released ONLY to multisig wallet  
✅ No direct NGO withdrawals  
✅ Multiple milestone states (PENDING, SUBMITTED, APPROVED, DISPUTED)  
✅ Dispute window enforcement  
✅ Events for all actions  
✅ Reentrancy-safe  
✅ Integration with SmartWallet  
✅ Funds stuck safely on dispute  

## Files

- `blockchain/contracts/Escrow.sol` - Main escrow contract
- `blockchain/scripts/deploy-escrow.js` - Deployment script
- `blockchain/scripts/test-escrow.js` - Integration test script
- `blockchain/README_ESCROW.md` - This file

