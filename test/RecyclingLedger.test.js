const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RecyclingLedger", function () {
  let ledger;
  let mockSeal;
  let owner, cooperativa, auditor, stranger;

  beforeEach(async function () {
    [owner, cooperativa, auditor, stranger] = await ethers.getSigners();

    const MockGreenSeal = await ethers.getContractFactory("MockGreenSeal");
    mockSeal = await MockGreenSeal.deploy();

    const RecyclingLedger = await ethers.getContractFactory("RecyclingLedger");
    ledger = await RecyclingLedger.deploy(await mockSeal.getAddress());

    const COOPERATIVA_ROLE = await ledger.COOPERATIVA_ROLE();
    const AUDITOR_ROLE = await ledger.AUDITOR_ROLE();
    await ledger.grantRole(COOPERATIVA_ROLE, cooperativa.address);
    await ledger.grantRole(AUDITOR_ROLE, auditor.address);
  });

  // Helpers ───────────────────────────────────────────────────────────────────
  async function registrarEntrada(over = {}) {
    const d = { material: "PET", pesoEntrada: 1000n, empresaId: "EMPRESA_001", ipfs: "QmEntrada", local: "SP", data: "2026-06-08", ...over };
    return ledger.connect(cooperativa).registrarEntrada(d.material, d.pesoEntrada, d.empresaId, d.ipfs, d.local, d.data);
  }

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

  // ─── registrarEntrada (fase 1) ───────────────────────────────────────────────
  describe("registrarEntrada()", function () {
    it("deve incrementar totalLotes", async function () {
      await registrarEntrada();
      expect(await ledger.totalLotes()).to.equal(1n);
    });

    it("deve salvar os campos da entrada e status RECEBIDO", async function () {
      await registrarEntrada({ pesoEntrada: 800n });
      const l = await ledger.lotes(1);
      expect(l.id).to.equal(1n);
      expect(l.recicladora).to.equal(cooperativa.address);
      expect(l.material).to.equal("PET");
      expect(l.pesoEntrada).to.equal(800n);
      expect(l.pesoReciclado).to.equal(0n);
      expect(l.status).to.equal(0n); // RECEBIDO
      expect(l.empresaId).to.equal("EMPRESA_001");
    });

    it("deve emitir LoteRecebido", async function () {
      await expect(registrarEntrada({ pesoEntrada: 500n }))
        .to.emit(ledger, "LoteRecebido")
        .withArgs(1n, cooperativa.address, "PET", 500n, "EMPRESA_001");
    });

    it("deve reverter se pesoEntrada == 0", async function () {
      await expect(registrarEntrada({ pesoEntrada: 0n })).to.be.revertedWith("Peso entrada invalido");
    });

    it("deve reverter se ipfsEntrada vazio", async function () {
      await expect(registrarEntrada({ ipfs: "" })).to.be.revertedWith("IPFS entrada obrigatorio");
    });

    it("deve reverter sem COOPERATIVA_ROLE", async function () {
      await expect(
        ledger.connect(stranger).registrarEntrada("PET", 100n, "E", "Qm", "SP", "2026")
      ).to.be.reverted;
    });
  });

  // ─── registrarProcessamento (fase 2) — BALANÇO DE MASSA ──────────────────────
  describe("registrarProcessamento()", function () {
    beforeEach(async function () {
      await registrarEntrada({ pesoEntrada: 1000n });
    });

    it("deve gravar reciclado/rejeito e calcular a perda derivada", async function () {
      await ledger.connect(cooperativa).registrarProcessamento(1, 700n, 200n, "QmProc");
      const l = await ledger.lotes(1);
      expect(l.pesoReciclado).to.equal(700n);
      expect(l.pesoRejeito).to.equal(200n);
      expect(l.pesoPerda).to.equal(100n); // 1000 - 700 - 200
      expect(l.status).to.equal(1n); // PROCESSADO
    });

    it("deve aceitar balanço exato (perda 0)", async function () {
      await ledger.connect(cooperativa).registrarProcessamento(1, 600n, 400n, "QmProc");
      const l = await ledger.lotes(1);
      expect(l.pesoPerda).to.equal(0n);
    });

    it("deve emitir LoteProcessado com a perda", async function () {
      await expect(ledger.connect(cooperativa).registrarProcessamento(1, 700n, 200n, "QmProc"))
        .to.emit(ledger, "LoteProcessado")
        .withArgs(1n, 700n, 200n, 100n);
    });

    it("deve REVERTER quando reciclado + rejeito > entrada (balanço não fecha)", async function () {
      await expect(
        ledger.connect(cooperativa).registrarProcessamento(1, 800n, 300n, "QmProc")
      ).to.be.revertedWith("Balanco nao fecha");
    });

    it("deve reverter se ipfsProcesso vazio", async function () {
      await expect(
        ledger.connect(cooperativa).registrarProcessamento(1, 700n, 200n, "")
      ).to.be.revertedWith("IPFS processo obrigatorio");
    });

    it("deve reverter se o lote não estiver RECEBIDO", async function () {
      await ledger.connect(cooperativa).registrarProcessamento(1, 700n, 200n, "QmProc");
      await expect(
        ledger.connect(cooperativa).registrarProcessamento(1, 500n, 100n, "QmProc2")
      ).to.be.revertedWith("Lote nao esta RECEBIDO");
    });

    it("deve reverter se quem processa não recebeu o lote", async function () {
      const COOPERATIVA_ROLE = await ledger.COOPERATIVA_ROLE();
      await ledger.grantRole(COOPERATIVA_ROLE, stranger.address);
      await expect(
        ledger.connect(stranger).registrarProcessamento(1, 700n, 200n, "QmProc")
      ).to.be.revertedWith("Apenas quem recebeu processa");
    });

    it("deve reverter para lote inexistente", async function () {
      await expect(
        ledger.connect(cooperativa).registrarProcessamento(999, 1n, 0n, "QmProc")
      ).to.be.revertedWith("Lote inexistente");
    });
  });

  // ─── validarLote ─────────────────────────────────────────────────────────────
  describe("validarLote()", function () {
    const empresaId = "EMPRESA_001";

    beforeEach(async function () {
      await registrarEntrada({ pesoEntrada: 1000n, empresaId });
      await ledger.connect(cooperativa).registrarProcessamento(1, 800n, 150n, "QmProc"); // perda 50
    });

    it("deve mudar status para VALIDADO e gravar auditor", async function () {
      await ledger.connect(auditor).validarLote(1);
      const l = await ledger.lotes(1);
      expect(l.status).to.equal(2n); // VALIDADO
      expect(l.auditor).to.equal(auditor.address);
    });

    it("deve acumular o RECICLADO (não a entrada) por empresa", async function () {
      await ledger.connect(auditor).validarLote(1);
      expect(await ledger.recicladoPorEmpresa(empresaId)).to.equal(800n);
      expect(await ledger.entradaPorEmpresa(empresaId)).to.equal(1000n);
    });

    it("deve acumular métricas globais de reciclado e entrada", async function () {
      await ledger.connect(auditor).validarLote(1);
      expect(await ledger.totalRecicladoGlobal()).to.equal(800n);
      expect(await ledger.totalEntradaGlobal()).to.equal(1000n);
    });

    it("deve adicionar o id em lotesPorEmpresa e a empresa em getEmpresas()", async function () {
      await ledger.connect(auditor).validarLote(1);
      const ids = await ledger.getLotesPorEmpresa(empresaId);
      expect(ids).to.include(1n);
      const lista = await ledger.getEmpresas();
      expect(lista).to.include(empresaId);
    });

    it("deve emitir LoteValidado", async function () {
      await expect(ledger.connect(auditor).validarLote(1))
        .to.emit(ledger, "LoteValidado")
        .withArgs(1n, auditor.address);
    });

    it("deve reverter se o lote não estiver PROCESSADO", async function () {
      await registrarEntrada({ pesoEntrada: 500n, empresaId }); // lote 2 só RECEBIDO
      await expect(ledger.connect(auditor).validarLote(2)).to.be.revertedWith("Lote precisa estar PROCESSADO");
    });

    it("deve reverter sem AUDITOR_ROLE", async function () {
      await expect(ledger.connect(stranger).validarLote(1)).to.be.reverted;
    });

    it("deve reverter se o auditor for a própria recicladora do lote", async function () {
      const AUDITOR_ROLE = await ledger.AUDITOR_ROLE();
      await ledger.grantRole(AUDITOR_ROLE, cooperativa.address);
      await expect(ledger.connect(cooperativa).validarLote(1)).to.be.revertedWith("Auditor nao pode validar proprio lote");
    });

    it("deve reverter para lote inexistente", async function () {
      await expect(ledger.connect(auditor).validarLote(0)).to.be.revertedWith("Lote inexistente");
      await expect(ledger.connect(auditor).validarLote(999)).to.be.revertedWith("Lote inexistente");
    });

    it("não deve duplicar empresa em getEmpresas() com múltiplas validações", async function () {
      await registrarEntrada({ pesoEntrada: 400n, empresaId });
      await ledger.connect(cooperativa).registrarProcessamento(2, 300n, 50n, "QmProc2");
      await ledger.connect(auditor).validarLote(1);
      await ledger.connect(auditor).validarLote(2);
      const lista = await ledger.getEmpresas();
      expect(lista.filter((e) => e === empresaId).length).to.equal(1);
    });
  });

  // ─── Emissão de Selo conta RECICLADO ─────────────────────────────────────────
  describe("Emissão de Selo (baseada em reciclado)", function () {
    const empresaId = "EMPRESA_SELO";

    it("não deve emitir selo se a ENTRADA cruza a meta mas o RECICLADO não", async function () {
      // entrada 1200, reciclado 900 (< 1000) → nenhum selo
      await registrarEntrada({ pesoEntrada: 1200n, empresaId });
      await ledger.connect(cooperativa).registrarProcessamento(1, 900n, 200n, "QmProc");
      await ledger.connect(auditor).validarLote(1);
      expect(await mockSeal.totalSelosPorEmpresa(empresaId)).to.equal(0n);
    });

    it("deve emitir 1 selo quando o RECICLADO atinge 1000 kg", async function () {
      // entrada 1300, reciclado 1000, rejeito 200, perda 100 → 1 selo
      await registrarEntrada({ pesoEntrada: 1300n, empresaId });
      await ledger.connect(cooperativa).registrarProcessamento(1, 1000n, 200n, "QmProc");
      await expect(ledger.connect(auditor).validarLote(1))
        .to.emit(mockSeal, "SeloEmitidoMock")
        .withArgs(empresaId, 1000n);
      expect(await mockSeal.totalSelosPorEmpresa(empresaId)).to.equal(1n);
    });

    it("deve acumular reciclado de vários lotes até emitir o selo", async function () {
      await registrarEntrada({ pesoEntrada: 700n, empresaId });
      await ledger.connect(cooperativa).registrarProcessamento(1, 600n, 50n, "Qm1");
      await ledger.connect(auditor).validarLote(1); // 600 reciclado, 0 selo

      await registrarEntrada({ pesoEntrada: 600n, empresaId });
      await ledger.connect(cooperativa).registrarProcessamento(2, 500n, 50n, "Qm2");
      await ledger.connect(auditor).validarLote(2); // total 1100 → 1 selo

      expect(await ledger.recicladoPorEmpresa(empresaId)).to.equal(1100n);
      expect(await mockSeal.totalSelosPorEmpresa(empresaId)).to.equal(1n);
    });
  });

  // ─── rejeitarLote ────────────────────────────────────────────────────────────
  describe("rejeitarLote()", function () {
    const motivo = "Evidências insuficientes";

    it("deve rejeitar um lote RECEBIDO", async function () {
      await registrarEntrada({ pesoEntrada: 300n });
      await ledger.connect(auditor).rejeitarLote(1, motivo);
      const l = await ledger.lotes(1);
      expect(l.status).to.equal(3n); // REJEITADO
      expect(l.auditor).to.equal(auditor.address);
    });

    it("deve rejeitar um lote PROCESSADO e emitir LoteRejeitado", async function () {
      await registrarEntrada({ pesoEntrada: 300n });
      await ledger.connect(cooperativa).registrarProcessamento(1, 200n, 50n, "QmProc");
      await expect(ledger.connect(auditor).rejeitarLote(1, motivo))
        .to.emit(ledger, "LoteRejeitado")
        .withArgs(1n, auditor.address, motivo);
    });

    it("deve reverter ao rejeitar um lote já VALIDADO", async function () {
      await registrarEntrada({ pesoEntrada: 300n });
      await ledger.connect(cooperativa).registrarProcessamento(1, 200n, 50n, "QmProc");
      await ledger.connect(auditor).validarLote(1);
      await expect(ledger.connect(auditor).rejeitarLote(1, motivo)).to.be.revertedWith("Status invalido");
    });

    it("deve reverter sem AUDITOR_ROLE", async function () {
      await registrarEntrada({ pesoEntrada: 300n });
      await expect(ledger.connect(stranger).rejeitarLote(1, motivo)).to.be.reverted;
    });

    it("deve reverter para lote inexistente", async function () {
      await expect(ledger.connect(auditor).rejeitarLote(999, motivo)).to.be.revertedWith("Lote inexistente");
    });
  });

  // ─── getLotesPorEmpresa ──────────────────────────────────────────────────────
  describe("getLotesPorEmpresa()", function () {
    it("deve retornar array vazio para empresa sem lotes validados", async function () {
      const ids = await ledger.getLotesPorEmpresa("EMPRESA_SEM_DADOS");
      expect(ids).to.deep.equal([]);
    });

    it("deve retornar os IDs validados na ordem", async function () {
      const empresaId = "EMPRESA_003";
      await registrarEntrada({ material: "Vidro", pesoEntrada: 200n, empresaId });
      await registrarEntrada({ material: "PET", pesoEntrada: 300n, empresaId });
      await ledger.connect(cooperativa).registrarProcessamento(1, 150n, 30n, "Qm1");
      await ledger.connect(cooperativa).registrarProcessamento(2, 250n, 20n, "Qm2");
      await ledger.connect(auditor).validarLote(1);
      await ledger.connect(auditor).validarLote(2);
      const ids = await ledger.getLotesPorEmpresa(empresaId);
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal(1n);
      expect(ids[1]).to.equal(2n);
    });
  });
});
