require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying contracts with:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy GreenSeal primeiro
  console.log("\n📦 Deploying GreenSeal...");
  const GreenSeal = await ethers.getContractFactory("GreenSeal");
  const greenSeal = await GreenSeal.deploy();
  await greenSeal.waitForDeployment();
  const greenSealAddress = await greenSeal.getAddress();
  console.log("✅ GreenSeal deployed at:", greenSealAddress);

  // Deploy RecyclingLedger passando endereço do GreenSeal
  console.log("\n📦 Deploying RecyclingLedger...");
  const RecyclingLedger = await ethers.getContractFactory("RecyclingLedger");
  const ledger = await RecyclingLedger.deploy(greenSealAddress);
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  console.log("✅ RecyclingLedger deployed at:", ledgerAddress);

  // Autorizar o ledger a emitir selos
  console.log("\n🔗 Setting ledger in GreenSeal...");
  const tx = await greenSeal.setLedger(ledgerAddress);
  await tx.wait();
  console.log("✅ Ledger autorizado no GreenSeal");

  // Salvar endereços em deployments.json
  const network = await ethers.provider.getNetwork();
  const deployments = {
    network: network.name === "unknown" ? "localhost" : network.name,
    chainId: network.chainId.toString(),
    RecyclingLedger: ledgerAddress,
    GreenSeal: greenSealAddress,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("\n📝 Endereços salvos em deployments.json");
  console.log(JSON.stringify(deployments, null, 2));

  // Copiar ABIs para frontend/lib/
  const libDir = path.join(__dirname, "..", "frontend", "lib");
  if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });

  const ledgerArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "artifacts", "contracts", "RecyclingLedger.sol", "RecyclingLedger.json"), "utf8")
  );
  const sealArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "artifacts", "contracts", "GreenSeal.sol", "GreenSeal.json"), "utf8")
  );

  fs.writeFileSync(path.join(libDir, "RecyclingLedgerABI.json"), JSON.stringify(ledgerArtifact.abi, null, 2));
  fs.writeFileSync(path.join(libDir, "GreenSealABI.json"), JSON.stringify(sealArtifact.abi, null, 2));
  console.log("\n📋 ABIs copiados para frontend/lib/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erro no deploy:", error);
    process.exit(1);
  });
