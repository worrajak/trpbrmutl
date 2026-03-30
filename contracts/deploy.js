/**
 * Deploy RPF Smart Contracts to TRON Nile Testnet
 *
 * Usage:
 *   TRON_PRIVATE_KEY=your_private_key node contracts/deploy.js
 *
 * Or set TRON_PRIVATE_KEY in .env.local
 *
 * Requires: npm install tronweb
 */

const TronWeb = require("tronweb");
const fs = require("fs");
const path = require("path");

const NILE_FULL_HOST = "https://nile.trongrid.io";
const PRIVATE_KEY = process.env.TRON_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("❌ กรุณาตั้ง TRON_PRIVATE_KEY environment variable");
  console.error("   TRON_PRIVATE_KEY=xxx node contracts/deploy.js");
  process.exit(1);
}

const tronWeb = new TronWeb({
  fullHost: NILE_FULL_HOST,
  privateKey: PRIVATE_KEY,
});

// Read compiled contracts (ABI + bytecode)
// Note: You need to compile with solc first or use TronIDE
// This script assumes you've compiled and have the JSON artifacts

async function deploy() {
  const adminAddress = tronWeb.address.fromPrivateKey(PRIVATE_KEY);
  console.log("=== RPF Contract Deployment ===");
  console.log("Network: Nile Testnet");
  console.log("Admin:", adminAddress);
  console.log("");

  const balance = await tronWeb.trx.getBalance(adminAddress);
  console.log("TRX Balance:", balance / 1e6, "TRX");
  console.log("");

  // For deployment via TronIDE (recommended for complex contracts):
  console.log("=== Deployment Instructions ===");
  console.log("");
  console.log("Since TRON smart contracts are best deployed via TronIDE,");
  console.log("follow these steps:");
  console.log("");
  console.log("1. Open https://www.tronide.io/");
  console.log("2. Connect TronLink wallet (Nile Testnet)");
  console.log("3. Create 3 files, paste each .sol source");
  console.log("4. Compile with Solidity 0.8.6");
  console.log("5. Deploy in order:");
  console.log("");
  console.log("   Step 1: RPFToken");
  console.log("     Constructor: initialSupply = 10000000000000 (10M RPF)");
  console.log("");
  console.log("   Step 2: ProjectManager");
  console.log("     Constructor: (no arguments)");
  console.log("");
  console.log("   Step 3: RewardPool");
  console.log("     Constructor: _token = RPFToken address");
  console.log("                  _projectManager = ProjectManager address");
  console.log("");
  console.log("6. After deployment, run setup:");
  console.log("   RPFToken.approve(RewardPool_address, 5000000000000)");
  console.log("   RewardPool.depositPool(5000000000000)");
  console.log("");
  console.log("7. Save contract addresses below:");
  console.log("");

  // Try simple deployment if possible
  console.log("=== Quick Deploy (RPFToken only) ===");
  console.log("");

  try {
    const tokenSource = fs.readFileSync(
      path.join(__dirname, "RPFToken.sol"),
      "utf8"
    );
    console.log("Compiling RPFToken.sol...");

    // Use TronWeb to deploy
    const contract = await tronWeb.contract().new({
      abi: [], // Need compiled ABI
      bytecode: "", // Need compiled bytecode
      feeLimit: 1000000000,
      callValue: 0,
      parameters: [10000000000000], // 10M RPF
    });

    console.log("This requires pre-compiled ABI + bytecode.");
    console.log("Please use TronIDE for deployment.");
  } catch (err) {
    console.log("Direct deployment requires compiled ABI + bytecode.");
    console.log("Please use TronIDE: https://www.tronide.io/");
  }

  console.log("");
  console.log("=== After Deployment ===");
  console.log("");
  console.log("Save addresses to .env.local:");
  console.log("");
  console.log("NEXT_PUBLIC_TRON_RPF_TOKEN=TXxx...xxx");
  console.log("NEXT_PUBLIC_TRON_PROJECT_MANAGER=TXxx...xxx");
  console.log("NEXT_PUBLIC_TRON_REWARD_POOL=TXxx...xxx");
  console.log("NEXT_PUBLIC_TRON_NETWORK=nile");
}

deploy().catch(console.error);
