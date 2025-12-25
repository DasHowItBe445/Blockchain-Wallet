import hre from "hardhat";
import { ignition } from "hardhat/ignition";

/**
 * Deploy SmartWallet using Hardhat Ignition
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-wallet.js --network localhost
 *   npx hardhat run scripts/deploy-wallet.js --network sepolia
 */
async function main() {
  console.log("🚀 Deploying SmartWallet with Hardhat Ignition...");
  console.log("Network:", hre.network.name);

  // Get signers
  const [deployer, owner1, owner2, owner3] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Owner 1:", owner1.address);
  console.log("Owner 2:", owner2.address);
  console.log("Owner 3:", owner3.address);

  // Define owners (3-of-3 or 2-of-3 scheme)
  const owners = [owner1.address, owner2.address, owner3.address];
  const requiredApprovals = 2; // 2-of-3 approval scheme

  console.log("\n📝 Wallet Configuration:");
  console.log("Owners:", owners);
  console.log("Required Approvals:", requiredApprovals, `(${requiredApprovals}-of-${owners.length})`);

  // Deploy using Ignition
  const SmartWalletModule = await import("./../ignition/modules/SmartWallet.js");
  
  const { smartWallet } = await ignition.deploy(SmartWalletModule.default, {
    parameters: {
      SmartWalletModule: {
        owners: owners,
        requiredApprovals: requiredApprovals,
      },
    },
  });

  const walletAddress = await smartWallet.getAddress();
  console.log("\n✅ SmartWallet deployed to:", walletAddress);
  console.log("\n🔗 IMPORTANT: Save this address!");
  console.log("================================================");
  console.log("SmartWallet Address:", walletAddress);
  console.log("Owners:", owners.join(", "));
  console.log(`Required Approvals: ${requiredApprovals} of ${owners.length}`);
  console.log("================================================");

  // Verify deployment
  const wallet = smartWallet;
  const ownerCount = await wallet.getOwnerCount();
  const requiredApprovalsActual = await wallet.requiredApprovals();
  const ownersList = await wallet.getOwners();

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
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

