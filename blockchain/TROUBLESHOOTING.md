# Troubleshooting Hardhat 3.0 Deployment Issues

## "Insufficient Funds" Error

If you're getting "Sender doesn't have enough funds" errors even though the Hardhat node is running:

### Solution 1: Verify Hardhat Node is Running

1. Check if the node is actually running:
   ```bash
   # In the terminal where you ran `npx hardhat node`
   # You should see output like:
   # Started HTTP and WebSocket server on http://127.0.0.1:8545/
   # Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
   ```

2. If not running, start it:
   ```bash
   cd blockchain
   npx hardhat node
   ```

### Solution 2: Check Account Balance

The scripts use the default Hardhat account #0 with private key:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This should match Account #0 in your Hardhat node output. Verify:

1. Check the Hardhat node terminal - it should show Account #0 with 10000 ETH
2. The private key should match: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

### Solution 3: Wait for Node to Fully Start

After starting `npx hardhat node`, wait 5-10 seconds before running deployment scripts. The node needs time to initialize all accounts.

### Solution 4: Restart Hardhat Node

If the issue persists:

1. Stop the Hardhat node (Ctrl+C)
2. Restart it:
   ```bash
   npx hardhat node
   ```
3. Wait for it to show all accounts with balances
4. Then run deployment scripts

### Solution 5: Use Correct Network

Make sure you're deploying to `localhost`:

```bash
npm run deploy:wallet
# This uses --network localhost by default
```

### Solution 6: Check RPC Connection

Verify the script can connect to the Hardhat node:

```bash
# Test connection
curl http://127.0.0.1:8545
# Should return some JSON (might be an error, but means connection works)
```

### Solution 7: Script Now Shows Balance Automatically

The deployment scripts have been updated to:
- ✅ Check connection to Hardhat node
- ✅ Display deployer balance automatically
- ✅ Show clear error if balance is 0 ETH
- ✅ Provide step-by-step solutions

If the script shows "Deployer balance: 0.0 ETH", follow the solutions above.

### Common Issues

1. **Node not fully started**: Wait a few seconds after starting the node
2. **Wrong private key**: Scripts use hardcoded default Hardhat keys - these should match
3. **Port conflict**: Another process might be using port 8545
4. **Network mismatch**: Ensure you're using `--network localhost`

### Quick Fix Checklist

- [ ] Hardhat node is running (`npx hardhat node`)
- [ ] Node shows accounts with 10000 ETH each
- [ ] Waited 5-10 seconds after starting node
- [ ] Using `--network localhost` (default)
- [ ] No port conflicts on 8545
- [ ] Script shows deployer balance > 0 ETH

If all checks pass and you still get errors, try restarting the Hardhat node.

