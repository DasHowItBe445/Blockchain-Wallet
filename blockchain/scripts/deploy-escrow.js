import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Deploy Escrow Contract
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-escrow.js --network localhost
 *   npx hardhat run scripts/deploy-escrow.js --network sepolia
 */
async function main() {
  console.log("🚀 Deploying Escrow Contract...");
  console.log("Network:", hre.network.name || "localhost");

  // Get network config
  const rpcUrl = hre.network.config?.url || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Test connection
  try {
    await provider.getBlockNumber();
    console.log("✅ Connected to Hardhat node");
  } catch (error) {
    throw new Error("❌ Cannot connect to Hardhat node. Make sure 'npx hardhat node' is running on http://127.0.0.1:8545");
  }
  
  // Use default Hardhat node account #0 (has 10000 ETH)
  // For localhost, ALWAYS use the default Hardhat account (ignore any env var)
  const defaultHardhatKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  // Force use of default key for localhost to avoid env var conflicts
  const deployerKey = (!hre.network.name || hre.network.name === "localhost" || hre.network.name === "hardhat") 
    ? defaultHardhatKey 
    : (process.env.PRIVATE_KEY || defaultHardhatKey);
  const deployer = new ethers.Wallet(deployerKey, provider);
  
  // Check balance
  const balance = await provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address, `(${ethers.formatEther(balance)} ETH)`);
  
  if (balance === 0n) {
    console.error("\n❌ ERROR: Deployer account has 0 ETH!");
    console.error("   Make sure Hardhat node is running and using default accounts.");
    console.error("   Expected deployer address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    throw new Error(`Deployer account ${deployer.address} has no funds. Restart Hardhat node.`);
  }
  
  // Use deployer as protocol owner (or set specific address)
  const ownerAddress = process.env.PROTOCOL_OWNER || deployer.address;
  console.log("Protocol Owner:", ownerAddress);

  console.log("\n⏳ Deploying Escrow...");
  const EscrowArtifact = await hre.artifacts.readArtifact("Escrow");
  const EscrowFactory = new ethers.ContractFactory(
    EscrowArtifact.abi,
    EscrowArtifact.bytecode,
    deployer
  );
  const escrow = await EscrowFactory.deploy(ownerAddress);
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  console.log("\n✅ Escrow deployed to:", escrowAddress);
  console.log("\n🔗 IMPORTANT: Save this address!");
  console.log("================================================");
  console.log("Escrow Address:", escrowAddress);
  console.log("Protocol Owner:", ownerAddress);
  console.log("Dispute Window: 7 days");
  console.log("================================================");

  // Verify deployment
  const protocolOwnerActual = await escrow.protocolOwner();
  console.log("\n✅ Verification:");
  console.log("Protocol Owner:", protocolOwnerActual);
  console.log("Contract Balance:", ethers.formatEther(await provider.getBalance(escrowAddress)), "ETH");

  if (hre.network.name && hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    const deployTx = escrow.deploymentTransaction();
    if (deployTx) {
      await deployTx.wait(6);
    }
    console.log("✅ Confirmations complete");
  }

  return escrowAddress;
}

main()
  .then((address) => {
    console.log("\n✅ Deployment complete!");
    console.log("\nNext steps:");
    console.log(`1. Set ESCROW_ADDRESS=${address}`);
    console.log("2. Create a project with a multisig wallet");
    console.log("3. Deposit funds into escrow");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

