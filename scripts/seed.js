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

  const signers = await ethers.getSigners();
  const deployer = signers[0];          // recicladora (registra e processa)
  const auditorSigner = signers[1];     // auditor (valida) — separação de papéis
  console.log("\n🔑 Recicladora:", deployer.address);
  if (auditorSigner) console.log("🔍 Auditor:", auditorSigner.address);
  else console.log("⚠️  Sem 2º signer: lotes ficarão PROCESSADOS (validação exige auditor ≠ recicladora).");

  const ledger = await ethers.getContractAt("RecyclingLedger", deployments.RecyclingLedger, deployer);
  const seal = await ethers.getContractAt("GreenSeal", deployments.GreenSeal, deployer);

  const COOPERATIVA_ROLE = await ledger.COOPERATIVA_ROLE();
  const AUDITOR_ROLE = await ledger.AUDITOR_ROLE();
  const DEFAULT_ADMIN_ROLE = await ledger.DEFAULT_ADMIN_ROLE();

  if (!(await ledger.hasRole(DEFAULT_ADMIN_ROLE, deployer.address))) {
    console.log("❌ Deployer não tem DEFAULT_ADMIN_ROLE. Abortando.");
    process.exit(1);
  }

  // Recicladora precisa de COOPERATIVA_ROLE
  if (!(await ledger.hasRole(COOPERATIVA_ROLE, deployer.address))) {
    console.log("\n🔐 Concedendo COOPERATIVA_ROLE à recicladora...");
    await (await ledger.grantRole(COOPERATIVA_ROLE, deployer.address)).wait();
  }
  // Auditor (2º signer) precisa de AUDITOR_ROLE
  const podeValidar = !!auditorSigner;
  if (podeValidar && !(await ledger.hasRole(AUDITOR_ROLE, auditorSigner.address))) {
    console.log("🔐 Concedendo AUDITOR_ROLE ao auditor...");
    await (await ledger.grantRole(AUDITOR_ROLE, auditorSigner.address)).wait();
  }

  const empresaId = "EMPRESA_ESG_001";

  // Lotes de demonstração: entrada → (reciclado, rejeito) → perda derivada
  const lotes = [
    { material: "PET", entrada: 500, reciclado: 420, rejeito: 50, ipfsEntrada: "QmPETin", ipfsProc: "QmPETproc" },
    { material: "Alumínio", entrada: 300, reciclado: 270, rejeito: 20, ipfsEntrada: "QmALUin", ipfsProc: "QmALUproc" },
    { material: "Papelão", entrada: 600, reciclado: 510, rejeito: 60, ipfsEntrada: "QmPAPin", ipfsProc: "QmPAPproc" },
  ];

  const ids = [];
  console.log("\n📝 Registrando entradas + processamentos...");
  for (const l of lotes) {
    try {
      await (await ledger.registrarEntrada(l.material, l.entrada, empresaId, l.ipfsEntrada, "Galpão Central SP", "2026-06-08")).wait();
      const id = Number(await ledger.totalLotes());
      ids.push(id);
      await (await ledger.registrarProcessamento(id, l.reciclado, l.rejeito, l.ipfsProc)).wait();
      const perda = l.entrada - l.reciclado - l.rejeito;
      console.log(`✅ Lote #${id}: ${l.material} ${l.entrada}kg → reciclado ${l.reciclado}, rejeito ${l.rejeito}, perda ${perda}`);
    } catch (e) {
      console.log(`❌ Erro no lote ${l.material}:`, e.message);
    }
  }

  if (podeValidar) {
    console.log("\n🔍 Validando lotes (auditor)...");
    const ledgerAuditor = ledger.connect(auditorSigner);
    for (const id of ids) {
      try {
        await (await ledgerAuditor.validarLote(id)).wait();
        console.log(`✅ Lote #${id} validado`);
      } catch (e) {
        console.log(`❌ Erro ao validar #${id}:`, e.message);
      }
    }
  } else {
    console.log("\n⏭️  Pulando validação (forneça um 2º signer/auditor financiado para validar e emitir selo).");
  }

  // Resultado
  const reciclado = await ledger.recicladoPorEmpresa(empresaId);
  const entrada = await ledger.entradaPorEmpresa(empresaId);
  const totalSelos = await seal.totalSelosPorEmpresa(empresaId);
  const totalLotes = await ledger.totalLotes();
  const recGlobal = await ledger.totalRecicladoGlobal();

  console.log("\n─────────────────────────────────────");
  console.log("📊 Resultado Final:");
  console.log(`   Total de lotes: ${totalLotes}`);
  console.log(`   Entrada validada (${empresaId}): ${entrada} kg`);
  console.log(`   Reciclado validado (${empresaId}): ${reciclado} kg`);
  if (entrada > 0n) console.log(`   Taxa de reciclagem: ${(Number(reciclado) / Number(entrada) * 100).toFixed(1)}%`);
  console.log(`   Reciclado global: ${recGlobal} kg`);
  console.log(`   Selos Verdes emitidos: ${totalSelos}`);
  console.log("─────────────────────────────────────");

  // Validações condicionais — só checam estado pós-validação quando houve auditor
  if (podeValidar) {
    if (reciclado.toString() !== "1200") {
      throw new Error(`Reciclado incorreto: esperado 1200, obtido ${reciclado}`);
    }
    if (totalSelos.toString() !== "1") {
      throw new Error(`Selos incorretos: esperado 1, obtido ${totalSelos}`);
    }
    console.log("\n✅ Todas as validações passaram com sucesso!");
  } else {
    console.log("\n✅ Lotes semeados em estado PROCESSADO. Valide via UI com uma carteira de auditor aprovada.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erro no seed:", error);
    process.exit(1);
  });
