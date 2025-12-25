import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Deploy SmartWallet (Simple Version - No Ignition)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-wallet-simple.js --network localhost
 *   npx hardhat run scripts/deploy-wallet-simple.js --network sepolia
 */
async function main() {
  console.log("🚀 Deploying SmartWallet...");
  console.log("Network:", hre.network.name || "localhost");

  // Get network config - for localhost, use default RPC
  const rpcUrl = hre.network.config?.url || "http://127.0.0.1:8545";
  
  // Create provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Test connection to Hardhat node
  try {
    await provider.getBlockNumber();
    console.log("✅ Connected to Hardhat node");
  } catch (error) {
    throw new Error("❌ Cannot connect to Hardhat node. Make sure 'npx hardhat node' is running on http://127.0.0.1:8545");
  }
  
  // Use the default Hardhat node private keys
  // These are the deterministic private keys that Hardhat node uses by default
  // Account #0: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
  // Account #1: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
  // Account #2: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
  // Account #3: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
  const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  const owner1 = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
  const owner2 = new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", provider);
  const owner3 = new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", provider);
  
  // Check deployer balance - CRITICAL: This must be > 0
  const deployerBalance = await provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(deployerBalance), "ETH");
  
  if (deployerBalance === 0n) {
    console.error("\n❌ ERROR: Deployer account has 0 ETH!");
    console.error("\n   The Hardhat node is running, but the account has no funds.");
    console.error("\n   Solutions:");
    console.error("   1. Check the Hardhat node terminal - it should show:");
    console.error("      Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)");
    console.error("   2. If accounts show 0 ETH, restart the Hardhat node:");
    console.error("      - Stop the node (Ctrl+C)");
    console.error("      - Run: npx hardhat node");
    console.error("      - Wait until you see accounts with 10000 ETH");
    console.error("      - Wait 5-10 seconds, then try deploying again");
    console.error("   3. Verify the deployer address matches Account #0 in the node output");
    console.error("   4. Make sure you're using the default Hardhat node (not a forked network)");
    throw new Error(`Deployer account ${deployer.address} has no funds. Restart Hardhat node and ensure accounts are funded.`);
  }
  
  console.log("Owner 1:", owner1.address);
  console.log("Owner 2:", owner2.address);
  console.log("Owner 3:", owner3.address);

  // Define owners (3 owners, 2-of-3 scheme by default)
  const owners = [owner1.address, owner2.address, owner3.address];
  const requiredApprovals = 2; // 2-of-3 approval scheme

  console.log("\n📝 Wallet Configuration:");
  console.log("Owners:", owners);
  console.log("Required Approvals:", requiredApprovals, `(${requiredApprovals}-of-${owners.length})`);

  // Deploy contract - get ABI and bytecode from artifacts
  const SmartWalletArtifact = await hre.artifacts.readArtifact("SmartWallet");
  const SmartWalletFactory = new ethers.ContractFactory(
    SmartWalletArtifact.abi,
    SmartWalletArtifact.bytecode,
    deployer
  );
  console.log("\n⏳ Deploying...");
  const smartWallet = await SmartWalletFactory.deploy(owners, requiredApprovals);
  await smartWallet.waitForDeployment();

  const walletAddress = await smartWallet.getAddress();
  console.log("\n✅ SmartWallet deployed to:", walletAddress);
  console.log("\n🔗 IMPORTANT: Save this address!");
  console.log("================================================");
  console.log("SmartWallet Address:", walletAddress);
  console.log("Owners:", owners.join(", "));
  console.log(`Required Approvals: ${requiredApprovals} of ${owners.length}`);
  console.log("================================================");

  // Verify deployment
  const ownerCount = await smartWallet.getOwnerCount();
  const requiredApprovalsActual = await smartWallet.requiredApprovals();
  const ownersList = await smartWallet.getOwners();

  console.log("\n✅ Verification:");
  console.log("Owner Count:", ownerCount.toString());
  console.log("Required Approvals:", requiredApprovalsActual.toString());
  console.log("Owners:", ownersList);

  if (hre.network.name && hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    const deployTx = smartWallet.deploymentTransaction();
    if (deployTx) {
      await deployTx.wait(6);
    }
    console.log("✅ Confirmations complete");
  }

  return walletAddress;
}

main()
  .then((address) => {
    console.log("\n✅ Deployment complete!");
    console.log("\nNext steps:");
    console.log(`1. Set WALLET_ADDRESS=${address}`);
    console.log("2. Run: npm run fund:wallet");
    console.log("3. Run: npm run test:wallet");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

