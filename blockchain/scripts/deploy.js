import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  console.log("🚀 Starting deployment...");
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
  
  // For localhost, ALWAYS use the default Hardhat account (ignore any env var)
  const defaultHardhatKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  // Force use of default key for localhost to avoid env var conflicts
  const deployerKey = (!hre.network.name || hre.network.name === "localhost" || hre.network.name === "hardhat") 
    ? defaultHardhatKey 
    : (process.env.PRIVATE_KEY || defaultHardhatKey);
  const deployer = new ethers.Wallet(deployerKey, provider);
  
  // Check balance before deploying
  const balance = await provider.getBalance(deployer.address);
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error(`Account ${deployer.address} has no funds. Make sure Hardhat node is running and the account has ETH.`);
  }

  console.log("\n📝 Deploying MilestoneFunding contract...");
  const MilestoneFundingArtifact = await hre.artifacts.readArtifact("MilestoneFunding");
  const MilestoneFunding = new ethers.ContractFactory(
    MilestoneFundingArtifact.abi,
    MilestoneFundingArtifact.bytecode,
    deployer
  );
  const contract = await MilestoneFunding.deploy();

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("\n✅ MilestoneFunding deployed to:", contractAddress);
  console.log("\n🔗 IMPORTANT: Copy this address!");
  console.log("================================================");
  console.log("Contract Address:", contractAddress);
  console.log("================================================");
  console.log("\nAdd this to your frontend/.env file:");
  console.log(`REACT_APP_CONTRACT_ADDRESS=${contractAddress}`);

  if (hre.network.name && hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    const deployTx = contract.deploymentTransaction();
    if (deployTx) {
      await deployTx.wait(6);
    }
    console.log("✅ Confirmations complete");

    console.log("\n🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("❌ Verification error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });