import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Fund the SmartWallet with ETH
 * 
 * Usage:
 *   npx hardhat run scripts/fund-wallet.js --network localhost
 * 
 * Make sure to set WALLET_ADDRESS in your .env or pass as argument
 */
async function main() {
  const walletAddress = process.env.WALLET_ADDRESS || process.argv[2];
  
  if (!walletAddress) {
    throw new Error("Please provide WALLET_ADDRESS as environment variable or argument");
  }

  console.log("💰 Funding SmartWallet...");
  console.log("Wallet Address:", walletAddress);
  console.log("Network:", hre.network.name || "localhost");

  // Get network config
  const rpcUrl = hre.network.config?.url || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(
    process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );
  console.log("Funding from:", deployer.address);

  const balance = await provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");

  const fundAmount = process.env.FUND_AMOUNT || "1.0"; // Default 1 ETH
  const amountWei = ethers.parseEther(fundAmount);

  console.log("\nSending", fundAmount, "ETH to wallet...");

  const tx = await deployer.sendTransaction({
    to: walletAddress,
    value: amountWei,
  });

  console.log("Transaction Hash:", tx.hash);
  await tx.wait();
  console.log("✅ Transaction confirmed");

  const walletBalance = await provider.getBalance(walletAddress);
  console.log("\n✅ Wallet Balance:", ethers.formatEther(walletBalance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

