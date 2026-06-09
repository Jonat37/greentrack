"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../../contexts/WalletContext";
import { getLedgerReadOnly, getSealReadOnly, getVerifyUrl } from "../../utils/contract";
import QRDisplay from "../../components/QRDisplay";
import { TopNav, AnimatedCounter, Reveal, Loader, Notice, Badge } from "../../components/ui";
import { EvidenceLink } from "../../components/EvidenceModal";

const STATUS_LABEL = ["RECEBIDO", "PROCESSADO", "VALIDADO", "REJEITADO"];
const STATUS_TONE = ["neutral", "pending", "ok", "error"];

export default function CooperativaPage() {
  const { address, roles, loaded } = useWallet();
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [selos, setSelos] = useState([]);
  const [stats, setStats] = useState({ entrada: 0, reciclado: 0, rejeito: 0, perda: 0 });
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
        ledger.getLotesPorCooperativa(address),
      ]);

      setInfo({ nome: infoRaw.nome, cnpj: infoRaw.cnpj, cidade: infoRaw.cidade, estado: infoRaw.estado, material: infoRaw.material });

      const lista = await Promise.all(
        ids.map(async (id) => {
          const l = await ledger.lotes(Number(id));
          return {
            id: Number(l.id),
            material: l.material,
            pesoEntrada: Number(l.pesoEntrada),
            pesoReciclado: Number(l.pesoReciclado),
            pesoRejeito: Number(l.pesoRejeito),
            pesoPerda: Number(l.pesoPerda),
            ipfsEntrada: l.ipfsEntrada,
            ipfsProcesso: l.ipfsProcesso,
            recebidoEm: Number(l.recebidoEm),
            status: Number(l.status),
            auditor: l.auditor,
            empresaId: l.empresaId,
          };
        })
      );
      lista.sort((a, b) => b.id - a.id);
      setLotes(lista);

      const entrada = lista.reduce((s, l) => s + l.pesoEntrada, 0);
      const reciclado = lista.reduce((s, l) => s + l.pesoReciclado, 0);
      const rejeito = lista.reduce((s, l) => s + l.pesoRejeito, 0);
      const perda = lista.reduce((s, l) => s + l.pesoPerda, 0);
      setStats({ entrada, reciclado, rejeito, perda });

      const empresasUnicas = [...new Set(lista.filter((l) => l.status === 2).map((l) => l.empresaId))];
      const selosLista = (
        await Promise.all(
          empresasUnicas.map(async (empresaId) => {
            const tokenIds = await seal.getSelosPorEmpresa(empresaId);
            return Promise.all(tokenIds.map(async (tokenId) => ({
              tokenId: Number(tokenId), empresaId, kg: Number(await seal.seloKg(Number(tokenId))),
            })));
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

  if (!address) return <div className="min-h-screen flex items-center justify-center"><Loader label="Verificando permissões..." /></div>;

  const taxa = stats.entrada > 0 ? ((stats.reciclado / stats.entrada) * 100).toFixed(1) : "0";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav chip="Recicladora" address={address} maxWidth={1120} />

      <main style={{ flex: 1, maxWidth: 1120, margin: "0 auto", padding: "40px 24px", width: "100%" }}>
        {loading ? <Loader /> : (
          <>
            <Reveal style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
              <div>
                <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)" }}>{info?.nome || "Recicladora"}</h1>
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>
                  {info?.material} · {info?.cidade}/{info?.estado} · CNPJ: {info?.cnpj}
                </p>
              </div>
              <Link href="/cooperativa/pesagem" className="btn-forest" style={{ whiteSpace: "nowrap" }}>+ Nova entrada</Link>
            </Reveal>

            {erro && <div style={{ marginBottom: 24 }}><Notice tone="error">{erro}</Notice></div>}

            {/* Stats — balanço agregado */}
            <div className="gt-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 40 }}>
              <Stat label="Kg entrada" value={stats.entrada} />
              <Stat label="Kg reciclado" value={stats.reciclado} accent />
              <Stat label="Kg rejeito" value={stats.rejeito} />
              <Stat label="Kg perda" value={stats.perda} />
              <StatTaxa taxa={taxa} />
            </div>

            {/* Tabela de lotes */}
            <Reveal className="gt-card" style={{ marginBottom: 40, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-gt-hairline)" }}>
                <h2 className="gt-display-md" style={{ color: "var(--color-gt-ink)" }}>Lotes ({lotes.length})</h2>
              </div>
              {lotes.length === 0 ? (
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)", textAlign: "center", padding: "40px 0" }}>Nenhum lote registrado.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-gt-canvas-soft)", color: "var(--color-gt-ink-mute)", fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <th style={th}>ID</th>
                        <th style={th}>Material</th>
                        <th style={{ ...th, textAlign: "right" }}>Entrada</th>
                        <th style={{ ...th, textAlign: "right" }}>Reciclado</th>
                        <th style={{ ...th, textAlign: "right" }}>Rejeito</th>
                        <th style={{ ...th, textAlign: "right" }}>Perda</th>
                        <th style={{ ...th, textAlign: "center" }}>Status</th>
                        <th style={{ ...th, textAlign: "center" }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotes.map((l) => (
                        <tr key={l.id} className="gt-row" style={{ borderTop: "1px solid var(--color-gt-hairline)" }}>
                          <td style={{ ...td, fontFamily: "monospace", fontWeight: 600, color: "var(--color-gt-ink)" }}>#{l.id}</td>
                          <td style={{ ...td, color: "var(--color-gt-ink)" }}>{l.material}</td>
                          <td style={{ ...td, textAlign: "right", color: "var(--color-gt-ink)" }}>{l.pesoEntrada} kg</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "var(--color-gt-forest)" }}>{l.status >= 1 ? `${l.pesoReciclado} kg` : "—"}</td>
                          <td style={{ ...td, textAlign: "right", color: "var(--color-gt-ink-mute)" }}>{l.status >= 1 ? `${l.pesoRejeito} kg` : "—"}</td>
                          <td style={{ ...td, textAlign: "right", color: "var(--color-gt-ink-mute)" }}>{l.status >= 1 ? `${l.pesoPerda} kg` : "—"}</td>
                          <td style={{ ...td, textAlign: "center" }}><Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge></td>
                          <td style={{ ...td, textAlign: "center" }}>
                            {l.status === 0 ? (
                              <Link href={`/cooperativa/pesagem?lote=${l.id}`} className="gt-link" style={{ fontSize: "0.75rem", fontWeight: 700 }}>Processar →</Link>
                            ) : (
                              <EvidenceLink cidEntrada={l.ipfsEntrada} cidProcesso={l.ipfsProcesso} className="gt-link" style={{ fontSize: "0.75rem", padding: 0 }}>Evidências</EvidenceLink>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Reveal>

            {/* Selos */}
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
                      <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginBottom: 12 }}>{s.kg.toLocaleString("pt-BR")} kg reciclados certificados</p>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><QRDisplay url={getVerifyUrl(s.tokenId)} compact /></div>
                      <Link href={`/verify/11155111/${process.env.NEXT_PUBLIC_CONTRACT_SEAL}/${s.tokenId}`} className="btn-forest" style={{ width: "100%", justifyContent: "center", fontSize: "0.8125rem", padding: "8px", marginBottom: 8 }}>Ver auditoria</Link>
                      <Link href={`/empresa/${encodeURIComponent(s.empresaId)}`} style={{ display: "block", textAlign: "center", color: "var(--color-gt-forest)", border: "1px solid var(--color-gt-hairline)", fontSize: "0.8125rem", fontWeight: 600, padding: "8px", borderRadius: "var(--radius-gt-md)" }}>Página pública →</Link>
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

const th = { padding: "12px 16px", textAlign: "left" };
const td = { padding: "12px 16px" };

function Stat({ label, value, accent }) {
  return (
    <div className="gt-card gt-card-hover" style={{ padding: 20, textAlign: "center" }}>
      <p style={{ fontSize: "1.625rem", fontWeight: 560, letterSpacing: "-0.02em", lineHeight: 1, color: accent ? "var(--color-gt-forest)" : "var(--color-gt-ink)" }}>
        <AnimatedCounter value={value} />
      </p>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 6 }}>{label}</p>
    </div>
  );
}

function StatTaxa({ taxa }) {
  return (
    <div className="gt-card gt-card-hover" style={{ padding: 20, textAlign: "center" }}>
      <p style={{ fontSize: "1.625rem", fontWeight: 560, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--color-gt-forest)" }}>{taxa}%</p>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 6 }}>Taxa de reciclagem</p>
    </div>
  );
}
