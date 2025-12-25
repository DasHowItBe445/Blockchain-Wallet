const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * SmartWallet Deployment Module
 * 
 * Deploys a multisignature wallet with:
 * - Multiple owners (defined at deployment)
 * - M-of-N approval scheme
 * - Deterministic deployment address
 * 
 * @param {string[]} owners - Array of owner addresses
 * @param {number} requiredApprovals - Number of approvals needed (M)
 */
module.exports = buildModule("SmartWalletModule", (m) => {
  // Default configuration for localhost deployment
  // In production, these should be passed as parameters or from config
  const owners = m.getParameter(
    "owners",
    [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Account 0
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account 1
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account 2
    ]
  );
  
  const requiredApprovals = m.getParameter("requiredApprovals", 2); // 2-of-3 by default

  const smartWallet = m.contract("SmartWallet", [owners, requiredApprovals], {
    id: "SmartWallet",
  });

  return { smartWallet };
});

