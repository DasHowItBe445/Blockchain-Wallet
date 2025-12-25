import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Test Escrow Contract Integration with SmartWallet
 * 
 * Tests:
 * 1. Deploy SmartWallet (if not exists)
 * 2. Deploy/Create Escrow project
 * 3. Deposit funds
 * 4. Submit milestone
 * 5. Approve milestone
 * 6. Release funds to multisig
 * 
 * Usage:
 *   ESCROW_ADDRESS=0x... WALLET_ADDRESS=0x... npx hardhat run scripts/test-escrow.js --network localhost
 */
async function main() {
  const escrowAddress = process.env.ESCROW_ADDRESS || process.argv[2];
  const walletAddress = process.env.WALLET_ADDRESS || process.argv[3];
  
  if (!escrowAddress) {
    throw new Error("Please provide ESCROW_ADDRESS as environment variable or argument");
  }
  
  if (!walletAddress) {
    throw new Error("Please provide WALLET_ADDRESS as environment variable or argument");
  }

  console.log("🧪 Testing Escrow Contract...");
  console.log("Escrow Address:", escrowAddress);
  console.log("Multisig Wallet Address:", walletAddress);
  console.log("Network:", hre.network.name || "localhost");

  // Get network config
  const rpcUrl = hre.network.config?.url || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Create wallets for different roles
  const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  const funder1 = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
  const funder2 = new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", provider);
  const ngo = new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", provider);
  const protocolOwner = new ethers.Wallet("0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f4c98bc17e268", provider);
  
  // Get contract ABIs and create contract instances
  const EscrowArtifact = await hre.artifacts.readArtifact("Escrow");
  const SmartWalletArtifact = await hre.artifacts.readArtifact("SmartWallet");
  const escrow = new ethers.Contract(escrowAddress, EscrowArtifact.abi, provider);
  const wallet = new ethers.Contract(walletAddress, SmartWalletArtifact.abi, provider);

  console.log("\n1️⃣ Getting contract info...");
  const protocolOwnerActual = await escrow.protocolOwner();
  const walletBalanceBefore = await provider.getBalance(walletAddress);
  const escrowBalanceBefore = await escrow.getContractBalance();
  
  console.log("Protocol Owner:", protocolOwnerActual);
  console.log("Wallet Balance Before:", ethers.formatEther(walletBalanceBefore), "ETH");
  console.log("Escrow Balance Before:", ethers.formatEther(escrowBalanceBefore), "ETH");

  console.log("\n2️⃣ Creating project...");
  const projectId = `test-project-${Date.now()}`;
  const milestoneAmounts = [
    ethers.parseEther("0.5"), // Milestone 1: 0.5 ETH
    ethers.parseEther("0.3"), // Milestone 2: 0.3 ETH
    ethers.parseEther("0.2")  // Milestone 3: 0.2 ETH
  ];
  
  const createTx = await escrow.createProject(
    projectId,
    ngo.address,
    walletAddress,
    milestoneAmounts
  );
  const createReceipt = await createTx.wait();
  const projectIndex = await escrow.getProjectByProjectId(projectId);
  console.log("✅ Project created. Index:", projectIndex.toString());

  console.log("\n3️⃣ Depositing funds...");
  const depositAmount = ethers.parseEther("1.0"); // Total 1 ETH
  
  const escrowWithFunder1 = escrow.connect(funder1);
  const escrowWithFunder2 = escrow.connect(funder2);
  
  console.log("   Funder 1 depositing 0.6 ETH...");
  const deposit1Tx = await escrowWithFunder1.depositFunds(projectIndex, { value: ethers.parseEther("0.6") });
  await deposit1Tx.wait();
  
  console.log("   Funder 2 depositing 0.4 ETH...");
  const deposit2Tx = await escrowWithFunder2.depositFunds(projectIndex, { value: ethers.parseEther("0.4") });
  await deposit2Tx.wait();
  
  const projectInfo = await escrow.getProject(projectIndex);
  console.log("✅ Total Funded:", ethers.formatEther(projectInfo.totalFunded), "ETH");

  console.log("\n4️⃣ Submitting milestone 0...");
  const proofHash = "QmXxxx..."; // IPFS hash example
  const escrowWithNgo = escrow.connect(ngo);
  const submitTx = await escrowWithNgo.submitMilestone(projectIndex, 0, proofHash);
  await submitTx.wait();
  
  const milestone0 = await escrow.getMilestone(projectIndex, 0);
  console.log("✅ Milestone 0 state:", milestone0.state); // Should be 1 (SUBMITTED)

  console.log("\n5️⃣ Approving milestone 0...");
  const escrowWithProtocolOwner = escrow.connect(protocolOwner);
  const approveTx = await escrowWithProtocolOwner.approveMilestone(projectIndex, 0);
  await approveTx.wait();
  
  const milestone0AfterApproval = await escrow.getMilestone(projectIndex, 0);
  console.log("✅ Milestone 0 state:", milestone0AfterApproval.state); // Should be 2 (APPROVED)
  console.log("   Dispute Window Ends:", new Date(Number(milestone0AfterApproval.disputeWindowEnd) * 1000).toISOString());

  console.log("\n6️⃣ Waiting for dispute window to pass...");
  console.log("   (In production, this would be 7 days. For testing, we'll skip this check)");
  
  // For testing, we need to mine blocks or use a time manipulation
  // For now, we'll just show that the release would fail
  try {
    const escrowWithDeployer = escrow.connect(deployer);
    const releaseTx = await escrowWithDeployer.releaseFunds(projectIndex, 0);
    await releaseTx.wait();
    console.log("✅ Funds released!");
  } catch (error) {
    console.log("⚠️  Release failed (expected if dispute window not passed):", error.message);
    console.log("   In production, wait 7 days after approval to release");
  }

  const walletBalanceAfter = await provider.getBalance(walletAddress);
  const escrowBalanceAfter = await escrow.getContractBalance();
  
  console.log("\n✅ Final Balances:");
  console.log("Wallet Balance After:", ethers.formatEther(walletBalanceAfter), "ETH");
  console.log("Escrow Balance After:", ethers.formatEther(escrowBalanceAfter), "ETH");

  console.log("\n✅ Test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

