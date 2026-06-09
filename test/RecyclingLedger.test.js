const { expect } = require("chai");
const { ethers } = require("hardhat");

// Mock GreenSeal contract for testing RecyclingLedger in isolation
const MOCK_GREENSEAL_ABI = [
  "function emitirSelo(string calldata empresaId, uint256 totalKg) external",
  "function totalSelosPorEmpresa(string calldata empresaId) external view returns (uint256)",
];

async function deployMockGreenSeal(owner) {
  const MockGreenSeal = await ethers.getContractFactory("MockGreenSeal");
  return await MockGreenSeal.deploy();
}

describe("RecyclingLedger", function () {
  let ledger;
  let mockSeal;
  let owner, cooperativa, auditor, stranger;

  beforeEach(async function () {
    [owner, cooperativa, auditor, stranger] = await ethers.getSigners();

    // Deploy mock GreenSeal
    const MockGreenSeal = await ethers.getContractFactory("MockGreenSeal");
    mockSeal = await MockGreenSeal.deploy();

    // Deploy RecyclingLedger with mock seal address
    const RecyclingLedger = await ethers.getContractFactory("RecyclingLedger");
    ledger = await RecyclingLedger.deploy(await mockSeal.getAddress());

    // Grant roles
    const COOPERATIVA_ROLE = await ledger.COOPERATIVA_ROLE();
    const AUDITOR_ROLE = await ledger.AUDITOR_ROLE();
    await ledger.grantRole(COOPERATIVA_ROLE, cooperativa.address);
    await ledger.grantRole(AUDITOR_ROLE, auditor.address);
  });

  // ─── ROLES ───────────────────────────────────────────────────────────────────
  describe("Roles e permissões", function () {
    it("deve conceder DEFAULT_ADMIN_ROLE ao deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await ledger.DEFAULT_ADMIN_ROLE();
      expect(await ledger.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("deve permitir admin conceder COOPERATIVA_ROLE", async function () {
      const COOPERATIVA_ROLE = await ledger.COOPERATIVA_ROLE();
      expect(await ledger.hasRole(COOPERATIVA_ROLE, cooperativa.address)).to.be.true;
    });

    it("deve permitir admin conceder AUDITOR_ROLE", async function () {
      const AUDITOR_ROLE = await ledger.AUDITOR_ROLE();
      expect(await ledger.hasRole(AUDITOR_ROLE, auditor.address)).to.be.true;
    });
  });

  // ─── registrarPesagem ────────────────────────────────────────────────────────
  describe("registrarPesagem()", function () {
    const material = "PET";
    const pesoKg = 100n;
    const ipfsHash = "QmTestHash123";
    const empresaId = "EMPRESA_001";

    it("deve incrementar totalPesagens após registro", async function () {
      await ledger.connect(cooperativa).registrarPesagem(material, pesoKg, ipfsHash, empresaId);
      expect(await ledger.totalPesagens()).to.equal(1n);
    });

    it("deve salvar todos os campos corretamente", async function () {
      await ledger.connect(cooperativa).registrarPesagem(material, pesoKg, ipfsHash, empresaId);
      const pesagem = await ledger.pesagens(1);
      expect(pesagem.id).to.equal(1n);
      expect(pesagem.cooperativa).to.equal(cooperativa.address);
      expect(pesagem.material).to.equal(material);
      expect(pesagem.pesoKg).to.equal(pesoKg);
      expect(pesagem.ipfsHash).to.equal(ipfsHash);
      expect(pesagem.status).to.equal(0n); // PENDENTE
      expect(pesagem.empresaId).to.equal(empresaId);
    });

    it("deve emitir evento PesagemRegistrada com campos corretos", async function () {
      await expect(
        ledger.connect(cooperativa).registrarPesagem(material, pesoKg, ipfsHash, empresaId)
      )
        .to.emit(ledger, "PesagemRegistrada")
        .withArgs(1n, cooperativa.address, material, pesoKg, ipfsHash, empresaId);
    });

    it("deve reverter se pesoKg == 0", async function () {
      await expect(
        ledger.connect(cooperativa).registrarPesagem(material, 0n, ipfsHash, empresaId)
      ).to.be.revertedWith("Peso invalido");
    });

    it("deve reverter se ipfsHash for string vazia", async function () {
      await expect(
        ledger.connect(cooperativa).registrarPesagem(material, pesoKg, "", empresaId)
      ).to.be.revertedWith("IPFS hash obrigatorio");
    });

    it("deve reverter se chamada por endereço sem COOPERATIVA_ROLE", async function () {
      await expect(
        ledger.connect(stranger).registrarPesagem(material, pesoKg, ipfsHash, empresaId)
      ).to.be.reverted;
    });
  });

  // ─── validarPesagem ──────────────────────────────────────────────────────────
  describe("validarPesagem()", function () {
    const empresaId = "EMPRESA_001";

    beforeEach(async function () {
      await ledger.connect(cooperativa).registrarPesagem("PET", 100n, "QmHash1", empresaId);
    });

    it("deve alterar status para VALIDADO (1)", async function () {
      await ledger.connect(auditor).validarPesagem(1);
      const pesagem = await ledger.pesagens(1);
      expect(pesagem.status).to.equal(1n); // VALIDADO
    });

    it("deve registrar o endereço do auditor", async function () {
      await ledger.connect(auditor).validarPesagem(1);
      const pesagem = await ledger.pesagens(1);
      expect(pesagem.auditor).to.equal(auditor.address);
    });

    it("deve adicionar o id em pesagensPorEmpresa", async function () {
      await ledger.connect(auditor).validarPesagem(1);
      const ids = await ledger.getPesagensPorEmpresa(empresaId);
      expect(ids).to.include(1n);
    });

    it("deve incrementar kgPorEmpresa", async function () {
      await ledger.connect(auditor).validarPesagem(1);
      expect(await ledger.kgPorEmpresa(empresaId)).to.equal(100n);
    });

    it("deve emitir evento PesagemValidada", async function () {
      await expect(ledger.connect(auditor).validarPesagem(1))
        .to.emit(ledger, "PesagemValidada")
        .withArgs(1n, auditor.address);
    });

    it("deve reverter se status não for PENDENTE", async function () {
      await ledger.connect(auditor).validarPesagem(1);
      await expect(ledger.connect(auditor).validarPesagem(1)).to.be.reverted;
    });

    it("deve reverter se chamada por endereço sem AUDITOR_ROLE", async function () {
      await expect(ledger.connect(stranger).validarPesagem(1)).to.be.reverted;
    });

    it("deve reverter com 'Pesagem inexistente' para id 0", async function () {
      await expect(ledger.connect(auditor).validarPesagem(0)).to.be.revertedWith("Pesagem inexistente");
    });

    it("deve reverter com 'Pesagem inexistente' para id inexistente", async function () {
      await expect(ledger.connect(auditor).validarPesagem(999)).to.be.revertedWith("Pesagem inexistente");
    });

    it("deve incrementar totalKgValidadoGlobal ao validar", async function () {
      await ledger.connect(auditor).validarPesagem(1);
      expect(await ledger.totalKgValidadoGlobal()).to.equal(100n);
    });

    it("deve adicionar empresa à lista getEmpresas()", async function () {
      await ledger.connect(auditor).validarPesagem(1);
      const lista = await ledger.getEmpresas();
      expect(lista).to.include(empresaId);
    });

    it("não deve duplicar empresa em getEmpresas() com múltiplas validações", async function () {
      await ledger.connect(cooperativa).registrarPesagem("PET", 50n, "QmHash2", empresaId);
      await ledger.connect(auditor).validarPesagem(1);
      await ledger.connect(auditor).validarPesagem(2);
      const lista = await ledger.getEmpresas();
      expect(lista.filter((e) => e === empresaId).length).to.equal(1);
    });

    it("deve chamar greenSeal.emitirSelo() quando kgPorEmpresa atingir múltiplo de 1000", async function () {
      // Register and validate enough kg to trigger seal emission
      await ledger.connect(cooperativa).registrarPesagem("PET", 900n, "QmHash2", empresaId);
      await ledger.connect(auditor).validarPesagem(1); // 100 kg
      await expect(ledger.connect(auditor).validarPesagem(2)) // 900 kg → total 1000
        .to.emit(mockSeal, "SeloEmitidoMock")
        .withArgs(empresaId, 1000n);
    });
  });

  // ─── rejeitarPesagem ─────────────────────────────────────────────────────────
  describe("rejeitarPesagem()", function () {
    const empresaId = "EMPRESA_002";
    const motivo = "Evidências insuficientes";

    beforeEach(async function () {
      await ledger.connect(cooperativa).registrarPesagem("Alumínio", 50n, "QmHashAlu", empresaId);
    });

    it("deve alterar status para REJEITADO (2)", async function () {
      await ledger.connect(auditor).rejeitarPesagem(1, motivo);
      const pesagem = await ledger.pesagens(1);
      expect(pesagem.status).to.equal(2n); // REJEITADO
    });

    it("deve registrar o auditor", async function () {
      await ledger.connect(auditor).rejeitarPesagem(1, motivo);
      const pesagem = await ledger.pesagens(1);
      expect(pesagem.auditor).to.equal(auditor.address);
    });

    it("deve emitir evento PesagemRejeitada com o motivo", async function () {
      await expect(ledger.connect(auditor).rejeitarPesagem(1, motivo))
        .to.emit(ledger, "PesagemRejeitada")
        .withArgs(1n, auditor.address, motivo);
    });

    it("deve reverter se status não for PENDENTE", async function () {
      await ledger.connect(auditor).rejeitarPesagem(1, motivo);
      await expect(ledger.connect(auditor).rejeitarPesagem(1, motivo)).to.be.reverted;
    });

    it("deve reverter se chamada por endereço sem AUDITOR_ROLE", async function () {
      await expect(ledger.connect(stranger).rejeitarPesagem(1, motivo)).to.be.reverted;
    });

    it("deve reverter com 'Pesagem inexistente' para id inexistente", async function () {
      await expect(ledger.connect(auditor).rejeitarPesagem(999, motivo)).to.be.revertedWith("Pesagem inexistente");
    });
  });

  // ─── getPesagensPorEmpresa ───────────────────────────────────────────────────
  describe("getPesagensPorEmpresa()", function () {
    it("deve retornar array vazio para empresa sem pesagens validadas", async function () {
      const ids = await ledger.getPesagensPorEmpresa("EMPRESA_SEM_DADOS");
      expect(ids).to.deep.equal([]);
    });

    it("deve retornar array de IDs correto após validações", async function () {
      const empresaId = "EMPRESA_003";
      await ledger.connect(cooperativa).registrarPesagem("Vidro", 200n, "QmHash1", empresaId);
      await ledger.connect(cooperativa).registrarPesagem("PET", 300n, "QmHash2", empresaId);
      await ledger.connect(auditor).validarPesagem(1);
      await ledger.connect(auditor).validarPesagem(2);
      const ids = await ledger.getPesagensPorEmpresa(empresaId);
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal(1n);
      expect(ids[1]).to.equal(2n);
    });
  });
});
