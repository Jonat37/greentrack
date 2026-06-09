"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLedgerReadOnly, getSealReadOnly, getVerifyUrl, getEtherscanAddress, getEtherscanTx, getEtherscanToken, queryFilterRobust, LEDGER_ADDRESS, SEAL_ADDRESS } from "../../../../../utils/contract";
import { getIPFSUrl as ipfsUrl } from "../../../../../utils/ipfs";
import QRDisplay from "../../../../../components/QRDisplay";
import { TopNav, Reveal, Loader, Badge } from "../../../../../components/ui";
import { EvidenceLink } from "../../../../../components/EvidenceModal";
const SEPOLIA_CHAIN_ID = "11155111";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function VerifyPage() {
  const { chainId, contractAddress, tokenId } = useParams();

  const [selo,    setSelo]    = useState(null);
  const [pesagens, setPesagens] = useState([]);
  const [txData,  setTxData]  = useState({});   // { mintTxHash, pesagemTxs: { id: { reg, val } } }
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [erro,    setErro]    = useState("");

  const isValidChain    = chainId === SEPOLIA_CHAIN_ID;
  const isValidContract = contractAddress?.toLowerCase() === SEAL_ADDRESS?.toLowerCase();
  const tokenIdNum      = Number(tokenId);

  useEffect(() => {
    if (!isValidChain || !isValidContract || !tokenIdNum) {
      setErro("URL de verificação inválida. Verifique os parâmetros.");
      setLoading(false);
      return;
    }
    carregarDados();
  }, [tokenId]);

  async function carregarDados() {
    try {
      const seal   = getSealReadOnly();
      const ledger = getLedgerReadOnly();

      const empresaId = await seal.seloEmpresa(tokenIdNum); await delay(120);
      const totalKg   = Number(await seal.seloKg(tokenIdNum)); await delay(120);

      setSelo({ tokenId: tokenIdNum, empresaId, totalKg });

      const pesagemIds = await ledger.getPesagensPorEmpresa(empresaId); await delay(120);

      const lista = [];
      for (const id of pesagemIds) {
        const p = await ledger.pesagens(Number(id));
        lista.push({
          id:          Number(p.id),
          material:    p.material,
          pesoKg:      Number(p.pesoKg),
          cooperativa: p.cooperativa,
          auditor:     p.auditor,
          ipfsHash:    p.ipfsHash,
          timestamp:   Number(p.timestamp),
          empresaId:   p.empresaId,
        });
        await delay(100);
      }
      setPesagens(lista);

      // Tenta buscar hashes de transações via eventos
      buscarTxHashes(seal, ledger, tokenIdNum, lista.map((p) => p.id));
    } catch (e) {
      setErro("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function buscarTxHashes(seal, ledger, tid, pesagemIds) {
    setTxLoading(true);
    try {
      // Bloco atual buscado uma vez e reaproveitado em todas as varreduras.
      const latest = await seal.runner.provider.getBlockNumber();

      // Mint do selo: filtro indexado por tokenId → resultado único, range completo.
      const sealEvents = await queryFilterRobust(seal, seal.filters.SeloEmitido(BigInt(tid)), latest);
      const mintTxHash = sealEvents[0]?.transactionHash || null;

      // Por pesagem: `id` é o 1º parâmetro indexado em ambos os eventos, então
      // filtramos por id específico — cada varredura retorna 1 log, sem depender
      // de janela de blocos. Atualiza a UI progressivamente.
      const pesagemTxs = {};
      for (const id of pesagemIds) {
        const [reg, val] = await Promise.all([
          queryFilterRobust(ledger, ledger.filters.PesagemRegistrada(BigInt(id)), latest),
          queryFilterRobust(ledger, ledger.filters.PesagemValidada(BigInt(id)), latest),
        ]);
        pesagemTxs[id] = {
          reg: reg[0]?.transactionHash || null,
          val: val[0]?.transactionHash || null,
        };
        setTxData({ mintTxHash, pesagemTxs: { ...pesagemTxs } });
        await delay(80);
      }

      setTxData({ mintTxHash, pesagemTxs });
    } catch {
      // Silencioso — exibe links do Etherscan como fallback
    } finally {
      setTxLoading(false);
    }
  }

  const verifyUrl  = getVerifyUrl(tokenIdNum);
  const materials  = [...new Set(pesagens.map((p) => p.material).filter(Boolean))];
  const cooperativas = [...new Set(pesagens.map((p) => p.cooperativa))];

  if (!isValidChain || !isValidContract) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-gt-canvas-soft)" }}>
        <div className="gt-card gt-scale-in" style={{ padding: 32, maxWidth: 440, textAlign: "center" }}>
          <p className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 8 }}>URL de verificação inválida</p>
          <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>Os parâmetros da URL não correspondem à rede ou contrato esperados.</p>
          <Link href="/dashboard" className="gt-link" style={{ marginTop: 20, display: "inline-block", fontSize: "0.875rem" }}>Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav
        chip="Verificação On-Chain"
        right={<Link href="/dashboard" className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)" }}>Dashboard →</Link>}
      />

      <main style={{ flex: 1, maxWidth: 1080, margin: "0 auto", padding: "40px 24px", width: "100%" }}>
        {loading ? (
          <Loader />
        ) : erro ? (
          <div className="gt-card" style={{ padding: "32px", textAlign: "center", border: "1px solid rgba(180,30,30,0.2)" }}>
            <p className="gt-display-md" style={{ color: "#8b1a1a", marginBottom: 8 }}>Erro</p>
            <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>{erro}</p>
            <Link href="/dashboard" className="gt-link" style={{ marginTop: 16, display: "inline-block", fontSize: "0.875rem" }}>Voltar ao dashboard</Link>
          </div>
        ) : selo && (
          <>
            {/* ── Cabeçalho do Selo ────────────────────────────────────────── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 32, marginBottom: 40 }}>
              <Reveal style={{ flex: 1, minWidth: 300 }}>
                <div style={{ marginBottom: 16 }}>
                  <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 8 }}>Selo Verde #{selo.tokenId}</h1>
                  <Badge tone="ok">Válido — Emitido na blockchain</Badge>
                </div>

                <div className="gt-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 2 }}>
                  <Row label="Token ID" value={`#${selo.tokenId}`} mono />
                  <Row label="Empresa" value={selo.empresaId} mono />
                  <Row label="Kg certificados" value={`${selo.totalKg.toLocaleString("pt-BR")} kg`} bold green />
                  <Row label="Material(is)" value={materials.join(", ") || "—"} />
                  <Row label="Rede" value="Ethereum Sepolia (11155111)" />
                  <Row label="Contrato GreenSeal" value={SEAL_ADDRESS} mono link={getEtherscanAddress(SEAL_ADDRESS)} />
                  <Row label="Contrato Ledger" value={LEDGER_ADDRESS} mono link={getEtherscanAddress(LEDGER_ADDRESS)} />
                  {txLoading ? (
                    <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", padding: "6px 0", animation: "gt-pulse-soft 1.6s infinite" }}>Buscando hash da transação de mint...</p>
                  ) : txData.mintTxHash ? (
                    <Row label="Transação de mint" value={`${txData.mintTxHash.slice(0, 16)}...`} mono link={getEtherscanTx(txData.mintTxHash)} />
                  ) : (
                    <Row label="Transação de mint" value="Ver no Etherscan ↗" link={`https://sepolia.etherscan.io/token/${SEAL_ADDRESS}?a=${selo.tokenId}`} />
                  )}
                </div>

                {/* Cooperativas envolvidas */}
                <div className="gt-card" style={{ marginTop: 16, padding: 20 }}>
                  <p className="gt-micro" style={{ fontWeight: 700, color: "var(--color-gt-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Cooperativas envolvidas</p>
                  {cooperativas.map((c) => (
                    <div key={c} style={{ marginBottom: 6 }}>
                      <a href={getEtherscanAddress(c)} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                        {c.slice(0, 10)}...{c.slice(-6)} ↗
                      </a>
                    </div>
                  ))}
                </div>
              </Reveal>

              {/* QR Code */}
              <Reveal delay={120} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <QRDisplay url={verifyUrl} />
                <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", textAlign: "center", maxWidth: 280 }}>
                  Este QR Code contém a URL pública de verificação deste Selo Verde na blockchain.
                </p>
                <a href={getEtherscanToken(selo.tokenId)} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontSize: "0.75rem" }}>
                  Ver NFT no Etherscan ↗
                </a>
              </Reveal>
            </div>

            {/* ── Bloco On-chain vs Off-chain ──────────────────────────────── */}
            <Reveal style={{ background: "var(--color-gt-forest)", borderRadius: "var(--radius-gt-lg)", padding: 24, marginBottom: 40 }}>
              <h2 className="gt-display-md" style={{ color: "var(--color-gt-leaf-soft)", marginBottom: 8 }}>On-chain vs Off-chain</h2>
              <p className="gt-body-md" style={{ color: "var(--color-gt-on-dark-mute)" }}>
                Os dados críticos do impacto ficam <strong style={{ color: "#fff" }}>on-chain</strong>: peso em kg, tipo de material, endereço da cooperativa, auditor responsável, status da pesagem, CID IPFS e NFT emitido. As evidências físicas, como fotos do tíquete da balança e dos fardos, ficam <strong style={{ color: "#fff" }}>off-chain no IPFS</strong>. A blockchain armazena o hash dessas evidências, garantindo rastreabilidade e integridade — qualquer alteração nas fotos invalidaria o hash, tornando a fraude detectável.
              </p>
            </Reveal>

            {/* ── Pesagens vinculadas ──────────────────────────────────────── */}
            <Reveal style={{ marginBottom: 40 }}>
              <h2 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 4 }}>
                Pesagens Certificadas ({pesagens.length})
              </h2>
              <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginBottom: 20 }}>
                Pesagens validadas que contribuíram para a certificação desta empresa.
              </p>

              {pesagens.length === 0 ? (
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)" }}>Nenhuma pesagem encontrada.</p>
              ) : (
                <div className="gt-stagger" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {pesagens.map((p) => {
                    const txs = txData.pesagemTxs?.[p.id];
                    return (
                      <div key={p.id} className="gt-card gt-card-hover" style={{ padding: 20 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <Badge tone="ok">CERTIFICADA</Badge>
                              <span className="gt-body-md" style={{ fontWeight: 600, color: "var(--color-gt-ink)" }}>Pesagem #{p.id}</span>
                            </div>
                            <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)" }}>{new Date(p.timestamp * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: "1.5rem", fontWeight: 560, color: "var(--color-gt-forest)" }}>{p.pesoKg.toLocaleString("pt-BR")} kg</p>
                            <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)" }}>{p.material}</p>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                          <InfoRow label="Material" value={p.material} />
                          <InfoRow label="Empresa" value={p.empresaId} mono />
                          <InfoRow label="Cooperativa" value={`${p.cooperativa.slice(0, 10)}...${p.cooperativa.slice(-6)}`} mono link={getEtherscanAddress(p.cooperativa)} />
                          <InfoRow label="Auditor" value={p.auditor !== "0x0000000000000000000000000000000000000000" ? `${p.auditor.slice(0, 10)}...${p.auditor.slice(-6)}` : "—"} mono link={p.auditor !== "0x0000000000000000000000000000000000000000" ? getEtherscanAddress(p.auditor) : null} />
                          <InfoRow label="CID IPFS" value={`${p.ipfsHash.slice(0, 20)}...`} link={ipfsUrl(p.ipfsHash)} />
                          <div style={{ background: "var(--color-gt-canvas-soft)", borderRadius: "var(--radius-gt-md)", padding: 12 }}>
                            <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", marginBottom: 2 }}>Evidências</p>
                            <EvidenceLink cid={p.ipfsHash} className="gt-link" style={{ fontSize: "0.75rem", padding: 0 }}>Ver fotos →</EvidenceLink>
                          </div>
                          {txLoading ? (
                            <InfoRow label="Tx Registro" value="Buscando..." />
                          ) : txs?.reg ? (
                            <InfoRow label="Tx Registro" value={`${txs.reg.slice(0, 14)}...`} mono link={getEtherscanTx(txs.reg)} />
                          ) : (
                            <InfoRow label="Tx Registro" value="Ver no Etherscan ↗" link={`https://sepolia.etherscan.io/address/${LEDGER_ADDRESS}#events`} />
                          )}
                          {txLoading ? (
                            <InfoRow label="Tx Validação" value="Buscando..." />
                          ) : txs?.val ? (
                            <InfoRow label="Tx Validação" value={`${txs.val.slice(0, 14)}...`} mono link={getEtherscanTx(txs.val)} />
                          ) : (
                            <InfoRow label="Tx Validação" value="Ver no Etherscan ↗" link={`https://sepolia.etherscan.io/address/${LEDGER_ADDRESS}#events`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Reveal>

            {/* ── Rodapé de verificação ─────────────────────────────────────── */}
            <div style={{ background: "var(--color-gt-canvas-soft)", border: "1px solid var(--color-gt-hairline)", borderRadius: "var(--radius-gt-lg)", padding: 20, textAlign: "center" }}>
              <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>Dados verificáveis publicamente na blockchain Ethereum Sepolia.</p>
              <p className="gt-caption" style={{ marginTop: 4 }}>
                Contrato:{" "}
                <a href={getEtherscanAddress(SEAL_ADDRESS)} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontFamily: "monospace" }}>{SEAL_ADDRESS}</a>
              </p>
              <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", marginTop: 4 }}>
                Esta página é gerada dinamicamente a partir do estado atual da blockchain — nenhum dado é armazenado em banco de dados centralizado.
              </p>
            </div>
          </>
        )}
      </main>

      <footer style={{ background: "var(--color-gt-canopy)", padding: "24px", textAlign: "center" }}>
        <p className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)" }}>
          GreenTrack · Verificação pública e imutável na blockchain Ethereum Sepolia
        </p>
      </footer>
    </div>
  );
}

function Row({ label, value, mono, bold, green, link }) {
  const content = (
    <span style={{ fontFamily: mono ? "monospace" : "inherit", fontWeight: bold ? 700 : 400, color: green ? "var(--color-gt-forest)" : "var(--color-gt-ink)", wordBreak: "break-all", fontSize: "0.875rem" }}>
      {value}
    </span>
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "7px 0", borderBottom: "1px solid var(--color-gt-hairline)" }}>
      <span className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ textAlign: "right", textDecoration: "none" }}>{content}</a>
      ) : (
        <div style={{ textAlign: "right" }}>{content}</div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, link }) {
  const content = (
    <span style={{ fontFamily: mono ? "monospace" : "inherit", color: "var(--color-gt-ink)", wordBreak: "break-all", fontSize: "0.75rem" }}>{value}</span>
  );
  return (
    <div style={{ background: "var(--color-gt-canvas-soft)", borderRadius: "var(--radius-gt-md)", padding: 12 }}>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", marginBottom: 2 }}>{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontSize: "0.75rem" }}>{content}</a>
      ) : (
        <p>{content}</p>
      )}
    </div>
  );
}
