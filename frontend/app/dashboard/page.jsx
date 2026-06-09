"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLedgerReadOnly, getSealReadOnly, getVerifyUrl, getEtherscanAddress } from "../../utils/contract";
import QRDisplay from "../../components/QRDisplay";
import { TopNav, AnimatedCounter, Reveal, Loader, Notice, SectionLabel, Badge } from "../../components/ui";

const LEDGER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_LEDGER;
const SEAL_ADDRESS   = process.env.NEXT_PUBLIC_CONTRACT_SEAL;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function DashboardPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const ledger = getLedgerReadOnly();
      const seal   = getSealReadOnly();

      // ── Métricas base ──────────────────────────────────────────────────────
      const totalLotes     = Number(await ledger.totalLotes());          await delay(120);
      const totalReciclado = Number(await ledger.totalRecicladoGlobal()); await delay(120);
      const totalEntrada   = Number(await ledger.totalEntradaGlobal());   await delay(120);
      const nextTokenId    = Number(await seal.nextTokenId());            await delay(120);
      const listaCoops     = await ledger.getListaCooperativas();         await delay(120);
      const listaEmpresas  = await ledger.getEmpresas();                  await delay(120);

      // ── Dados por empresa (lotes validados) ───────────────────────────────
      const empresaMap = {};
      for (const empresaId of listaEmpresas) {
        const reciclado   = Number(await ledger.recicladoPorEmpresa(empresaId)); await delay(120);
        const entrada     = Number(await ledger.entradaPorEmpresa(empresaId));   await delay(120);
        const loteIds     = await ledger.getLotesPorEmpresa(empresaId);          await delay(120);

        const lotes = [];
        for (const id of loteIds) {
          const l = await ledger.lotes(Number(id));
          lotes.push({ id: Number(l.id), material: l.material, pesoReciclado: Number(l.pesoReciclado) });
          await delay(100);
        }
        const materials = [...new Set(lotes.map((l) => l.material).filter(Boolean))];
        const taxa = entrada > 0 ? (reciclado / entrada) * 100 : 0;
        empresaMap[empresaId] = { id: empresaId, reciclado, entrada, taxa, lotes, materials };
      }

      // ── Selos (últimos 5, mais recentes primeiro) ─────────────────────────
      const selosParaCarregar = Math.min(nextTokenId, 5);
      const selos = [];
      for (let i = nextTokenId; i > nextTokenId - selosParaCarregar && i > 0; i--) {
        const empresaId = await seal.seloEmpresa(i); await delay(100);
        const totalKg   = Number(await seal.seloKg(i)); await delay(100);
        const materials = empresaMap[empresaId]?.materials || [];
        selos.push({ tokenId: i, empresaId, totalKg, materials });
      }

      // ── Métricas derivadas ─────────────────────────────────────────────────
      const totalValidados = Object.values(empresaMap).reduce((s, e) => s + e.lotes.length, 0);
      const taxaGlobal     = totalEntrada > 0 ? (totalReciclado / totalEntrada) * 100 : 0;
      const ranking        = Object.values(empresaMap).sort((a, b) => b.reciclado - a.reciclado);

      setDados({
        totalLotes,
        totalReciclado,
        totalEntrada,
        taxaGlobal,
        totalSelos: nextTokenId,
        totalCooperativas: listaCoops.length,
        totalEmpresasCertificadas: listaEmpresas.length,
        totalValidados,
        ranking,
        selos,
      });
    } catch (e) {
      setErro("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav
        chip="Dashboard Público"
        maxWidth={1120}
        right={
          <Link href="/login" className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)" }}>
            Entrar →
          </Link>
        }
      />

      <main style={{ flex: 1, maxWidth: 1120, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        <Reveal style={{ marginBottom: 40 }}>
          <SectionLabel>Ethereum Sepolia · Sem login</SectionLabel>
          <h1 className="gt-display-xl" style={{ color: "var(--color-gt-ink)", marginBottom: 8 }}>
            Impacto ambiental verificável
          </h1>
          <p className="gt-body-md" style={{ color: "var(--color-gt-ink-mute)", maxWidth: 560 }}>
            Dados em tempo real da blockchain — auditáveis por qualquer pessoa, sem intermediário.
          </p>
        </Reveal>

        {erro && <div style={{ marginBottom: 24 }}><Notice tone="error">{erro}</Notice></div>}

        {loading ? (
          <Loader />
        ) : dados && (
          <>
            {/* ── Métricas ────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 56 }}>
              <div className="gt-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                <MetricCard value={dados.totalReciclado} unit="kg" label="Reciclado validado" accent />
                <MetricCard value={dados.totalEntrada} unit="kg" label="Entrada total" />
                <MetricTaxa taxa={dados.taxaGlobal} />
                <MetricCard value={dados.totalLotes} label="Lotes registrados" />
                <MetricCard value={dados.totalSelos} label="Selos emitidos" />
                <MetricCard value={dados.totalEmpresasCertificadas} label="Empresas certificadas" />
              </div>
            </section>

            {/* ── Ranking ──────────────────────────────────────────────────── */}
            {dados.ranking.length > 0 && (
              <Reveal as="section" style={{ marginBottom: 56 }}>
                <h2 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 20 }}>
                  Ranking por kg reciclado certificado
                </h2>
                <div className="gt-card" style={{ overflow: "hidden" }}>
                  <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-gt-canvas-soft)", color: "var(--color-gt-ink-mute)", fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <th style={{ padding: "12px 20px", textAlign: "left", width: 40 }}>#</th>
                        <th style={{ padding: "12px 20px", textAlign: "left" }}>Empresa</th>
                        <th style={{ padding: "12px 20px", textAlign: "left" }}>Materiais</th>
                        <th style={{ padding: "12px 20px", textAlign: "right" }}>Reciclado</th>
                        <th style={{ padding: "12px 20px", textAlign: "right" }}>Taxa</th>
                        <th style={{ padding: "12px 20px", textAlign: "right" }}>Selos</th>
                        <th style={{ padding: "12px 20px", textAlign: "right" }}>Lotes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.ranking.map((e, i) => {
                        const selosEmpresa = dados.selos.filter((s) => s.empresaId === e.id).length;
                        return (
                          <tr key={e.id} className="gt-row" style={{ borderTop: "1px solid var(--color-gt-hairline)" }}>
                            <td style={{ padding: "14px 20px", fontWeight: 700, color: "var(--color-gt-ink-faint)" }}>{i + 1}</td>
                            <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-gt-ink)", fontWeight: 600 }}>{e.id}</td>
                            <td style={{ padding: "14px 20px", color: "var(--color-gt-ink-mute)" }}>{e.materials.join(", ") || "—"}</td>
                            <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 700, color: "var(--color-gt-forest)" }}>{e.reciclado.toLocaleString("pt-BR")} kg</td>
                            <td style={{ padding: "14px 20px", textAlign: "right", color: "var(--color-gt-ink-mute)" }}>{e.taxa.toFixed(0)}%</td>
                            <td style={{ padding: "14px 20px", textAlign: "right", color: "var(--color-gt-ink-mute)", fontWeight: 600 }}>{selosEmpresa > 0 ? selosEmpresa : "—"}</td>
                            <td style={{ padding: "14px 20px", textAlign: "right", color: "var(--color-gt-ink-mute)" }}>{e.lotes.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            )}

            {/* ── Selos ────────────────────────────────────────────────────── */}
            <Reveal as="section" style={{ marginBottom: 56 }}>
              <h2 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 20 }}>
                Últimos Selos Verdes
                {dados.totalSelos > 5 && (
                  <span className="gt-caption" style={{ color: "var(--color-gt-ink-faint)", fontWeight: 400, marginLeft: 8 }}>
                    (últimos 5 de {dados.totalSelos})
                  </span>
                )}
              </h2>

              {dados.selos.length === 0 ? (
                <div className="gt-card" style={{ padding: 40, textAlign: "center" }}>
                  <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)" }}>
                    Nenhum Selo Verde emitido ainda. Selos são criados automaticamente quando uma empresa atinge a meta de kg validados.
                  </p>
                </div>
              ) : (
                <div className="gt-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                  {dados.selos.map((s) => <SeloCard key={s.tokenId} selo={s} />)}
                </div>
              )}
            </Reveal>

            {/* ── Links blockchain ─────────────────────────────────────────── */}
            <Reveal as="section">
              <h2 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 20 }}>Contratos na blockchain</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <ContractLink label="RecyclingLedger" desc="Registro e validação de pesagens" address={LEDGER_ADDRESS} href={getEtherscanAddress(LEDGER_ADDRESS)} />
                <ContractLink label="GreenSeal (ERC-721)" desc="NFTs Selos Verdes" address={SEAL_ADDRESS} href={getEtherscanAddress(SEAL_ADDRESS)} />
              </div>
            </Reveal>
          </>
        )}
      </main>

      <footer style={{ background: "var(--color-gt-canopy)", padding: "24px", textAlign: "center" }}>
        <p className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)" }}>
          GreenTrack · Dados públicos e verificáveis na blockchain Ethereum Sepolia
        </p>
      </footer>
    </div>
  );
}

function SeloCard({ selo }) {
  const verifyUrl = getVerifyUrl(selo.tokenId);
  return (
    <div className="gt-card gt-card-hover" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <span className="gt-display-md" style={{ color: "var(--color-gt-forest)" }}>Selo Verde #{selo.tokenId}</span>
          <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", fontFamily: "monospace", marginTop: 2 }}>{selo.empresaId}</p>
        </div>
        <Badge tone="ok">#{selo.tokenId}</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "var(--color-gt-canvas-soft)", borderRadius: "var(--radius-gt-md)", padding: 12, textAlign: "center" }}>
          <p style={{ fontSize: "1.25rem", fontWeight: 560, color: "var(--color-gt-forest)" }}>{selo.totalKg.toLocaleString("pt-BR")}</p>
          <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)" }}>kg reciclados</p>
        </div>
        <div style={{ background: "var(--color-gt-canvas-soft)", borderRadius: "var(--radius-gt-md)", padding: 12, textAlign: "center" }}>
          <p className="gt-caption" style={{ fontWeight: 600, color: "var(--color-gt-ink)", lineHeight: 1.2 }}>{selo.materials.join(", ") || "—"}</p>
          <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)" }}>material(is)</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "8px 0" }}>
        <QRDisplay url={verifyUrl} compact />
        <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)" }}>Escaneie para auditar on-chain</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Link href={`/verify/11155111/${process.env.NEXT_PUBLIC_CONTRACT_SEAL}/${selo.tokenId}`} className="btn-forest" style={{ width: "100%", justifyContent: "center", fontSize: "0.875rem", padding: "9px 16px" }}>
          Ver auditoria completa
        </Link>
        <a href={`https://sepolia.etherscan.io/token/${process.env.NEXT_PUBLIC_CONTRACT_SEAL}?a=${selo.tokenId}`} target="_blank" rel="noopener noreferrer"
          style={{ width: "100%", textAlign: "center", border: "1px solid var(--color-gt-hairline)", color: "var(--color-gt-ink-mute)", fontSize: "0.75rem", fontWeight: 600, padding: "8px", borderRadius: "var(--radius-gt-md)", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-gt-canvas-soft)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Ver no Etherscan ↗
        </a>
      </div>
    </div>
  );
}

function MetricCard({ value, label, unit, accent }) {
  return (
    <div className="gt-card gt-card-hover" style={{ padding: 20, textAlign: "center" }}>
      <p style={{ fontSize: "1.75rem", fontWeight: 560, color: accent ? "var(--color-gt-forest)" : "var(--color-gt-ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
        <AnimatedCounter value={value} />
        {unit && <span style={{ fontSize: "0.8125rem", fontWeight: 480, marginLeft: 3, color: "var(--color-gt-ink-mute)" }}>{unit}</span>}
      </p>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 6 }}>{label}</p>
    </div>
  );
}

function MetricTaxa({ taxa }) {
  return (
    <div className="gt-card gt-card-hover" style={{ padding: 20, textAlign: "center" }}>
      <p style={{ fontSize: "1.75rem", fontWeight: 560, color: "var(--color-gt-forest)", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {taxa.toFixed(1)}<span style={{ fontSize: "0.8125rem", fontWeight: 480, marginLeft: 1, color: "var(--color-gt-ink-mute)" }}>%</span>
      </p>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 6 }}>Taxa de reciclagem</p>
    </div>
  );
}

function ContractLink({ label, desc, address, href }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="gt-card gt-card-hover" style={{ padding: 20, display: "block" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p className="gt-body-md" style={{ fontWeight: 600, color: "var(--color-gt-ink)" }}>{label}</p>
          <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginTop: 2 }}>{desc}</p>
          <p className="gt-micro" style={{ fontFamily: "monospace", color: "var(--color-gt-ink-faint)", marginTop: 8, wordBreak: "break-all" }}>{address}</p>
        </div>
        <span style={{ color: "var(--color-gt-forest)", marginLeft: 8 }}>↗</span>
      </div>
    </a>
  );
}
