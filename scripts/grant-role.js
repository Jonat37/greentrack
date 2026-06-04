require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const LEDGER_ADDRESS = "0x602AE94DAbA2D99a0253c5e010a3d9dc77ACB616";
  const WALLET = "0x0AeA126470894686f7aA11FbE11BF63437f7dCe9";

  const ledger = await ethers.getContractAt("RecyclingLedger", LEDGER_ADDRESS);

  const COOPERATIVA_ROLE = await ledger.COOPERATIVA_ROLE();
  const AUDITOR_ROLE = await ledger.AUDITOR_ROLE();

  console.log("Concedendo COOPERATIVA_ROLE...");
  const tx1 = await ledger.grantRole(COOPERATIVA_ROLE, WALLET);
  await tx1.wait();
  console.log("✅ COOPERATIVA_ROLE concedido");

  console.log("Concedendo AUDITOR_ROLE...");
  const tx2 = await ledger.grantRole(AUDITOR_ROLE, WALLET);
  await tx2.wait();
  console.log("✅ AUDITOR_ROLE concedido");

  console.log("\n🎉 Carteira pronta para a demo:", WALLET);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
