require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("deployments.json não encontrado. Execute o deploy primeiro.");
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  console.log("📖 Lendo deployments:", deployments);

  const [deployer] = await ethers.getSigners();
  console.log("\n🔑 Usando conta:", deployer.address);

  const ledger = await ethers.getContractAt("RecyclingLedger", deployments.RecyclingLedger, deployer);
  const seal = await ethers.getContractAt("GreenSeal", deployments.GreenSeal, deployer);

  const COOPERATIVA_ROLE = await ledger.COOPERATIVA_ROLE();
  const AUDITOR_ROLE = await ledger.AUDITOR_ROLE();
  const DEFAULT_ADMIN_ROLE = await ledger.DEFAULT_ADMIN_ROLE();

  // Verificar se deployer tem admin role para conceder roles
  const hasAdmin = await ledger.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  if (!hasAdmin) {
    console.log("❌ Deployer não tem DEFAULT_ADMIN_ROLE. Abortando.");
    process.exit(1);
  }

  // Conceder COOPERATIVA_ROLE se necessário
  if (!(await ledger.hasRole(COOPERATIVA_ROLE, deployer.address))) {
    console.log("\n🔐 Concedendo COOPERATIVA_ROLE ao deployer...");
    await (await ledger.grantRole(COOPERATIVA_ROLE, deployer.address)).wait();
    console.log("✅ COOPERATIVA_ROLE concedida");
  } else {
    console.log("✅ Deployer já tem COOPERATIVA_ROLE");
  }

  // Conceder AUDITOR_ROLE se necessário
  if (!(await ledger.hasRole(AUDITOR_ROLE, deployer.address))) {
    console.log("\n🔐 Concedendo AUDITOR_ROLE ao deployer...");
    await (await ledger.grantRole(AUDITOR_ROLE, deployer.address)).wait();
    console.log("✅ AUDITOR_ROLE concedida");
  } else {
    console.log("✅ Deployer já tem AUDITOR_ROLE");
  }

  // Dados das pesagens de demonstração
  const pesagens = [
    { material: "PET", pesoKg: 350, empresaId: "EMPRESA_ESG_001", ipfsHash: "QmPET001abc123" },
    { material: "Alumínio", pesoKg: 200, empresaId: "EMPRESA_ESG_001", ipfsHash: "QmALU001abc123" },
    { material: "Papelão", pesoKg: 500, empresaId: "EMPRESA_ESG_001", ipfsHash: "QmPAP001abc123" },
  ];

  const ids = [];

  // Registrar pesagens
  console.log("\n📝 Registrando pesagens...");
  for (const p of pesagens) {
    try {
      const tx = await ledger.registrarPesagem(p.material, p.pesoKg, p.ipfsHash, p.empresaId);
      const receipt = await tx.wait();
      const totalPesagens = await ledger.totalPesagens();
      ids.push(Number(totalPesagens));
      console.log(`✅ Pesagem registrada: ${p.material} ${p.pesoKg}kg → ID #${totalPesagens}`);
    } catch (e) {
      console.log(`❌ Erro ao registrar ${p.material}:`, e.message);
    }
  }

  // Validar pesagens
  console.log("\n🔍 Validando pesagens...");
  for (const id of ids) {
    try {
      const tx = await ledger.validarPesagem(id);
      await tx.wait();
      console.log(`✅ Pesagem #${id} validada`);
    } catch (e) {
      console.log(`❌ Erro ao validar #${id}:`, e.message);
    }
  }

  // Resultado final
  const totalKg = await ledger.kgPorEmpresa("EMPRESA_ESG_001");
  const totalSelos = await seal.totalSelosPorEmpresa("EMPRESA_ESG_001");
  const totalPesagens = await ledger.totalPesagens();
  const totalKgGlobal = await ledger.totalKgValidadoGlobal();

  console.log("\n─────────────────────────────────────");
  console.log("📊 Resultado Final:");
  console.log(`   Total de pesagens registradas: ${totalPesagens}`);
  console.log(`   Total de kg validados (EMPRESA_ESG_001): ${totalKg} kg`);
  console.log(`   Total de kg validados (global): ${totalKgGlobal} kg`);
  console.log(`   Total de Selos Verdes emitidos: ${totalSelos}`);
  console.log("─────────────────────────────────────");

  // Validações finais
  if (totalKg.toString() !== "1050") {
    throw new Error(`Total de kg incorreto: esperado 1050, obtido ${totalKg}`);
  }

  if (totalSelos.toString() !== "1") {
    throw new Error(`Selos incorretos: esperado 1, obtido ${totalSelos}`);
  }

  if (totalKgGlobal.toString() !== "1050") {
    throw new Error(`Total global de kg incorreto: esperado 1050, obtido ${totalKgGlobal}`);
  }

  console.log("\n✅ Todas as validações passaram com sucesso!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erro no seed:", error);
    process.exit(1);
  });
