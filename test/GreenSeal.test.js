const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GreenSeal", function () {
  let seal;
  let owner, ledgerFake, attacker;

  beforeEach(async function () {
    [owner, ledgerFake, attacker] = await ethers.getSigners();

    const GreenSeal = await ethers.getContractFactory("GreenSeal");
    seal = await GreenSeal.deploy();
  });

  // ─── Configuração inicial ────────────────────────────────────────────────────
  describe("Configuração inicial", function () {
    it("deve ter nome 'GreenSeal Impact NFT'", async function () {
      expect(await seal.name()).to.equal("GreenSeal Impact NFT");
    });

    it("deve ter símbolo 'GSEAL'", async function () {
      expect(await seal.symbol()).to.equal("GSEAL");
    });

    it("deve ter nextTokenId igual a 0 inicialmente", async function () {
      expect(await seal.nextTokenId()).to.equal(0n);
    });
  });

  // ─── setLedger ───────────────────────────────────────────────────────────────
  describe("setLedger()", function () {
    it("deve atualizar a variável ledger quando chamada pelo owner", async function () {
      await seal.connect(owner).setLedger(ledgerFake.address);
      expect(await seal.ledger()).to.equal(ledgerFake.address);
    });

    it("deve reverter se chamada por não-owner", async function () {
      await expect(seal.connect(attacker).setLedger(attacker.address)).to.be.reverted;
    });
  });

  // ─── emitirSelo ──────────────────────────────────────────────────────────────
  describe("emitirSelo()", function () {
    const empresaId = "EMPRESA_ESG_001";
    const totalKg = 1000n;

    beforeEach(async function () {
      await seal.connect(owner).setLedger(ledgerFake.address);
    });

    it("deve incrementar nextTokenId", async function () {
      await seal.connect(ledgerFake).emitirSelo(empresaId, totalKg);
      expect(await seal.nextTokenId()).to.equal(1n);
    });

    it("deve incrementar totalSelosPorEmpresa", async function () {
      await seal.connect(ledgerFake).emitirSelo(empresaId, totalKg);
      expect(await seal.totalSelosPorEmpresa(empresaId)).to.equal(1n);
    });

    it("deve salvar seloEmpresa[tokenId] = empresaId", async function () {
      await seal.connect(ledgerFake).emitirSelo(empresaId, totalKg);
      expect(await seal.seloEmpresa(1)).to.equal(empresaId);
    });

    it("deve salvar seloKg[tokenId] = totalKg", async function () {
      await seal.connect(ledgerFake).emitirSelo(empresaId, totalKg);
      expect(await seal.seloKg(1)).to.equal(totalKg);
    });

    it("deve emitir evento SeloEmitido com campos corretos", async function () {
      await expect(seal.connect(ledgerFake).emitirSelo(empresaId, totalKg))
        .to.emit(seal, "SeloEmitido")
        .withArgs(
          1n,
          empresaId,
          totalKg,
          `ipfs://greentrack/${empresaId}/1`
        );
    });

    it("o tokenURI deve começar com 'ipfs://'", async function () {
      await seal.connect(ledgerFake).emitirSelo(empresaId, totalKg);
      const uri = await seal.tokenURI(1);
      expect(uri).to.match(/^ipfs:\/\//);
    });

    it("deve reverter com 'Apenas o Ledger pode emitir' se chamado por não-ledger", async function () {
      await expect(
        seal.connect(attacker).emitirSelo(empresaId, totalKg)
      ).to.be.revertedWith("Apenas o Ledger pode emitir");
    });

    it("deve emitir múltiplos selos para a mesma empresa", async function () {
      await seal.connect(ledgerFake).emitirSelo(empresaId, 1000n);
      await seal.connect(ledgerFake).emitirSelo(empresaId, 2000n);
      expect(await seal.totalSelosPorEmpresa(empresaId)).to.equal(2n);
      expect(await seal.nextTokenId()).to.equal(2n);
    });
  });

  // ─── tokenURI ────────────────────────────────────────────────────────────────
  describe("tokenURI()", function () {
    beforeEach(async function () {
      await seal.connect(owner).setLedger(ledgerFake.address);
      await seal.connect(ledgerFake).emitirSelo("EMPRESA_001", 1000n);
    });

    it("deve retornar string não-vazia para token existente", async function () {
      const uri = await seal.tokenURI(1);
      expect(uri).to.be.a("string").and.not.be.empty;
    });

    it("deve reverter para token inexistente", async function () {
      await expect(seal.tokenURI(999)).to.be.reverted;
    });
  });

  // ─── totalSelosPorEmpresa ────────────────────────────────────────────────────
  describe("totalSelosPorEmpresa()", function () {
    it("deve retornar 0 para empresa sem selos", async function () {
      expect(await seal.totalSelosPorEmpresa("EMPRESA_SEM_SELOS")).to.equal(0n);
    });

    it("deve retornar número correto após emissões", async function () {
      await seal.connect(owner).setLedger(ledgerFake.address);
      await seal.connect(ledgerFake).emitirSelo("EMPRESA_A", 1000n);
      await seal.connect(ledgerFake).emitirSelo("EMPRESA_A", 2000n);
      await seal.connect(ledgerFake).emitirSelo("EMPRESA_B", 1000n);
      expect(await seal.totalSelosPorEmpresa("EMPRESA_A")).to.equal(2n);
      expect(await seal.totalSelosPorEmpresa("EMPRESA_B")).to.equal(1n);
    });
  });
});
