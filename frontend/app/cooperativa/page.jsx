"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../../contexts/WalletContext";
import { getLedgerReadOnly, getSealReadOnly, getVerifyUrl } from "../../utils/contract";
import { getIPFSUrl } from "../../utils/ipfs";
import QRDisplay from "../../components/QRDisplay";
import { TopNav, AnimatedCounter, Reveal, Loader, Notice, Badge } from "../../components/ui";

const STATUS_LABEL = ["PENDENTE", "VALIDADA", "REJEITADA"];
const STATUS_TONE = ["pending", "ok", "error"];

export default function CooperativaPage() {
  const { address, roles, loaded } = useWallet();
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [pesagens, setPesagens] = useState([]);
  const [selos, setSelos] = useState([]);
  const [stats, setStats] = useState({ enviados: 0, validados: 0, pendentes: 0, rejeitados: 0 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!loaded) return;
    if (!address || !roles.isCooperativa) router.push("/login");
  }, [address, roles, loaded, router]);

  useEffect(() => {
    if (address && roles.isCooperativa) carregarDados();
  }, [address, roles.isCooperativa]);

  async function carregarDados() {
    setLoading(true);
    try {
      const ledger = getLedgerReadOnly();
      const seal = getSealReadOnly();

      const [infoRaw, ids] = await Promise.all([
        ledger.cooperativas(address),
        ledger.getPesagensPorCooperativa(address),
      ]);

      setInfo({
        nome: infoRaw.nome,
        cnpj: infoRaw.cnpj,
        cidade: infoRaw.cidade,
        estado: infoRaw.estado,
        material: infoRaw.material,
      });

      const lista = await Promise.all(
        ids.map(async (id) => {
          const p = await ledger.pesagens(Number(id));
          return {
            id: Number(p.id),
            material: p.material,
            pesoKg: Number(p.pesoKg),
            ipfsHash: p.ipfsHash,
            timestamp: Number(p.timestamp),
            status: Number(p.status),
            auditor: p.auditor,
            empresaId: p.empresaId,
            localColeta: p.localColeta,
            dataColeta: p.dataColeta,
          };
        })
      );

      lista.sort((a, b) => b.id - a.id);
      setPesagens(lista);

      const totalEnviados = lista.reduce((s, p) => s + p.pesoKg, 0);
      const totalValidados = lista.filter((p) => p.status === 1).reduce((s, p) => s + p.pesoKg, 0);
      const totalPendentes = lista.filter((p) => p.status === 0).reduce((s, p) => s + p.pesoKg, 0);
      const totalRejeitados = lista.filter((p) => p.status === 2).reduce((s, p) => s + p.pesoKg, 0);
      setStats({ enviados: totalEnviados, validados: totalValidados, pendentes: totalPendentes, rejeitados: totalRejeitados });

      const empresasUnicas = [...new Set(lista.filter((p) => p.status === 1).map((p) => p.empresaId))];
      const selosLista = (
        await Promise.all(
          empresasUnicas.map(async (empresaId) => {
            const tokenIds = await seal.getSelosPorEmpresa(empresaId);
            return Promise.all(
              tokenIds.map(async (tokenId) => {
                const kg = await seal.seloKg(Number(tokenId));
                return { tokenId: Number(tokenId), empresaId, kg: Number(kg) };
              })
            );
          })
        )
      ).flat();

      setSelos(selosLista);
    } catch (e) {
      setErro("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!address) {
    return <div className="min-h-screen flex items-center justify-center"><Loader label="Verificando permissões..." /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav chip="Cooperativa" address={address} maxWidth={1120} />

      <main style={{ flex: 1, maxWidth: 1120, margin: "0 auto", padding: "40px 24px", width: "100%" }}>
        {loading ? (
          <Loader />
        ) : (
          <>
            {/* Info + ação */}
            <Reveal style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
              <div>
                <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)" }}>{info?.nome || "Cooperativa"}</h1>
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>
                  {info?.material} · {info?.cidade}/{info?.estado} · CNPJ: {info?.cnpj}
                </p>
              </div>
              <Link href="/cooperativa/pesagem" className="btn-forest" style={{ whiteSpace: "nowrap" }}>+ Nova Pesagem</Link>
            </Reveal>

            {erro && <div style={{ marginBottom: 24 }}><Notice tone="error">{erro}</Notice></div>}

            {/* Stats */}
            <div className="gt-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 40 }}>
              <StatCard label="Kg enviados" value={stats.enviados} />
              <StatCard label="Kg validados" value={stats.validados} accent />
              <StatCard label="Kg pendentes" value={stats.pendentes} />
              <StatCard label="Kg rejeitados" value={stats.rejeitados} />
            </div>

            {/* Tabela de pesagens */}
            <Reveal className="gt-card" style={{ marginBottom: 40, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-gt-hairline)" }}>
                <h2 className="gt-display-md" style={{ color: "var(--color-gt-ink)" }}>Histórico de Pesagens ({pesagens.length})</h2>
              </div>
              {pesagens.length === 0 ? (
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)", textAlign: "center", padding: "40px 0" }}>Nenhuma pesagem registrada.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-gt-canvas-soft)", color: "var(--color-gt-ink-mute)", fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <th style={{ padding: "12px 16px", textAlign: "left" }}>ID</th>
                        <th style={{ padding: "12px 16px", textAlign: "left" }}>Data</th>
                        <th style={{ padding: "12px 16px", textAlign: "left" }}>Empresa</th>
                        <th style={{ padding: "12px 16px", textAlign: "left" }}>Material</th>
                        <th style={{ padding: "12px 16px", textAlign: "right" }}>Peso</th>
                        <th style={{ padding: "12px 16px", textAlign: "center" }}>Status</th>
                        <th style={{ padding: "12px 16px", textAlign: "left" }}>Auditor</th>
                        <th style={{ padding: "12px 16px", textAlign: "center" }}>Evidências</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pesagens.map((p) => (
                        <tr key={p.id} className="gt-row" style={{ borderTop: "1px solid var(--color-gt-hairline)" }}>
                          <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 600, color: "var(--color-gt-ink)" }}>#{p.id}</td>
                          <td style={{ padding: "12px 16px", color: "var(--color-gt-ink-mute)" }}>{new Date(p.timestamp * 1000).toLocaleDateString("pt-BR")}</td>
                          <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-gt-ink-mute)" }}>{p.empresaId}</td>
                          <td style={{ padding: "12px 16px", color: "var(--color-gt-ink)" }}>{p.material}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--color-gt-ink)" }}>{p.pesoKg} kg</td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}><Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge></td>
                          <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-gt-ink-faint)" }}>
                            {p.auditor !== "0x0000000000000000000000000000000000000000" ? `${p.auditor.slice(0, 6)}...${p.auditor.slice(-4)}` : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <a href={getIPFSUrl(p.ipfsHash)} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontSize: "0.75rem" }}>Ver →</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Reveal>

            {/* Selos emitidos */}
            {selos.length > 0 && (
              <Reveal>
                <h2 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 20 }}>Selos Verdes Emitidos ({selos.length})</h2>
                <div className="gt-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                  {selos.map((s) => (
                    <div key={s.tokenId} className="gt-card gt-card-hover" style={{ padding: 20 }}>
                      <div style={{ marginBottom: 12 }}>
                        <p className="gt-display-md" style={{ color: "var(--color-gt-forest)" }}>Selo Verde #{s.tokenId}</p>
                        <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", fontFamily: "monospace" }}>{s.empresaId}</p>
                      </div>
                      <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginBottom: 12 }}>{s.kg.toLocaleString("pt-BR")} kg certificados</p>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><QRDisplay url={getVerifyUrl(s.tokenId)} compact /></div>
                      <Link href={`/verify/11155111/${process.env.NEXT_PUBLIC_CONTRACT_SEAL}/${s.tokenId}`} className="btn-forest" style={{ width: "100%", justifyContent: "center", fontSize: "0.8125rem", padding: "8px", marginBottom: 8 }}>
                        Ver auditoria
                      </Link>
                      <Link href={`/empresa/${encodeURIComponent(s.empresaId)}`}
                        style={{ display: "block", textAlign: "center", color: "var(--color-gt-forest)", border: "1px solid var(--color-gt-hairline)", fontSize: "0.8125rem", fontWeight: 600, padding: "8px", borderRadius: "var(--radius-gt-md)", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-gt-canvas-soft)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        Página pública →
                      </Link>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="gt-card gt-card-hover" style={{ padding: 20, textAlign: "center" }}>
      <p style={{ fontSize: "1.625rem", fontWeight: 560, letterSpacing: "-0.02em", lineHeight: 1, color: accent ? "var(--color-gt-forest)" : "var(--color-gt-ink)" }}>
        <AnimatedCounter value={value} />
      </p>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 6 }}>{label}</p>
    </div>
  );
}
