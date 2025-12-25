import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Test SmartWallet functionality
 * 
 * Tests:
 * 1. Propose transaction
 * 2. Approve transaction (multiple owners)
 * 3. Execute transaction
 * 
 * Usage:
 *   npx hardhat run scripts/test-wallet.js --network localhost
 */
async function main() {
  const walletAddress = process.env.WALLET_ADDRESS || process.argv[2];
  
  if (!walletAddress) {
    throw new Error("Please provide WALLET_ADDRESS as environment variable or argument");
  }

  console.log("🧪 Testing SmartWallet...");
  console.log("Wallet Address:", walletAddress);
  console.log("Network:", hre.network.name || "localhost");

  // Get network config
  const rpcUrl = hre.network.config?.url || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Create wallets for owners and recipient
  const owner1 = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
  const owner2 = new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", provider);
  const owner3 = new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", provider);
  const recipient = new ethers.Wallet("0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f4c98bc17e268", provider);
  
  // Get contract ABI and create contract instance
  const SmartWalletArtifact = await hre.artifacts.readArtifact("SmartWallet");
  const wallet = new ethers.Contract(walletAddress, SmartWalletArtifact.abi, provider);

  console.log("\n1️⃣ Getting wallet info...");
  const ownerCount = await wallet.getOwnerCount();
  const requiredApprovals = await wallet.requiredApprovals();
  const owners = await wallet.getOwners();
  const balance = await wallet.getBalance();

  console.log("Owner Count:", ownerCount.toString());
  console.log("Required Approvals:", requiredApprovals.toString(), `(${requiredApprovals}-of-${ownerCount})`);
  console.log("Owners:", owners);
  console.log("Wallet Balance:", ethers.formatEther(balance), "ETH");

  console.log("\n2️⃣ Proposing transaction...");
  const sendAmount = ethers.parseEther("0.1"); // Send 0.1 ETH
  const recipientAddress = recipient.address;

  const proposeTx = await wallet.connect(owner1).proposeTransaction(
    recipientAddress,
    sendAmount,
    "0x" // Empty data
  );
  
  const proposeReceipt = await proposeTx.wait();
  const txId = await wallet.transactionCount() - 1n;
  console.log("✅ Transaction proposed. TX ID:", txId.toString());
  console.log("Transaction Hash:", proposeReceipt.hash);

  console.log("\n3️⃣ Approving transaction...");
  console.log("   Owner 1 approving...");
  const approve1Tx = await wallet.connect(owner1).approveTransaction(txId);
  await approve1Tx.wait();
  console.log("   ✅ Owner 1 approved");

  console.log("   Owner 2 approving...");
  const approve2Tx = await wallet.connect(owner2).approveTransaction(txId);
  await approve2Tx.wait();
  console.log("   ✅ Owner 2 approved");

  const txInfo = await wallet.getTransaction(txId);
  console.log("   Approval Count:", txInfo.approvalCount.toString());
  console.log("   Required:", requiredApprovals.toString());

  console.log("\n4️⃣ Executing transaction...");
  const recipientBalanceBefore = await provider.getBalance(recipientAddress);
  console.log("Recipient balance before:", ethers.formatEther(recipientBalanceBefore), "ETH");

  const executeTx = await wallet.connect(owner1).executeTransaction(txId);
  const executeReceipt = await executeTx.wait();
  console.log("✅ Transaction executed!");
  console.log("Transaction Hash:", executeReceipt.hash);

  const recipientBalanceAfter = await provider.getBalance(recipientAddress);
  console.log("Recipient balance after:", ethers.formatEther(recipientBalanceAfter), "ETH");

  const walletBalanceAfter = await wallet.getBalance();
  console.log("Wallet balance after:", hre.ethers.formatEther(walletBalanceAfter), "ETH");

  console.log("\n✅ All tests passed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

