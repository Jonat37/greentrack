"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../../contexts/WalletContext";
import { getLedgerReadOnly, getLedgerSigner, conectarCarteira } from "../../utils/contract";
import { TopNav, Reveal, Loader, Notice, Badge } from "../../components/ui";
import { EvidenceLink } from "../../components/EvidenceModal";

export default function AuditorPage() {
  const { address, roles, loaded } = useWallet();
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!loaded) return;
    if (!address || !roles.isAuditor) router.push("/login");
  }, [address, roles, loaded, router]);

  useEffect(() => {
    if (address && roles.isAuditor) carregarDados();
  }, [address, roles.isAuditor]);

  async function carregarDados() {
    setLoading(true);
    try {
      const ledger = getLedgerReadOnly();
      const [total, infoRaw] = await Promise.all([
        ledger.totalPesagens(),
        ledger.auditores(address).catch(() => null),
      ]);

      if (infoRaw?.carteira && infoRaw.carteira !== "0x0000000000000000000000000000000000000000") {
        setInfo({ nome: infoRaw.nome, organizacao: infoRaw.organizacao, tipoAuditor: infoRaw.tipoAuditor });
      }

      const lista = [];
      for (let i = 1; i <= Number(total); i++) {
        const p = await ledger.pesagens(i);
        if (Number(p.status) === 0) {
          lista.push({
            id: Number(p.id),
            material: p.material,
            pesoKg: Number(p.pesoKg),
            cooperativa: p.cooperativa,
            empresaId: p.empresaId,
            ipfsHash: p.ipfsHash,
            localColeta: p.localColeta,
            dataColeta: p.dataColeta,
            timestamp: Number(p.timestamp),
          });
        }
      }
      setPendentes(lista);
    } catch (e) {
      setErro("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function validar(id) {
    setTxLoading(id);
    setErro("");
    try {
      const { signer } = await conectarCarteira();
      const ledger = getLedgerSigner(signer);
      const tx = await ledger.validarPesagem(id);
      await tx.wait();
      await carregarDados();
    } catch (e) {
      setErro(e.reason || e.message);
    } finally {
      setTxLoading(null);
    }
  }

  async function rejeitar() {
    if (!motivo.trim()) return;
    setTxLoading(modalId);
    setModalId(null);
    setErro("");
    try {
      const { signer } = await conectarCarteira();
      const ledger = getLedgerSigner(signer);
      const tx = await ledger.rejeitarPesagem(modalId, motivo);
      await tx.wait();
      setMotivo("");
      await carregarDados();
    } catch (e) {
      setErro(e.reason || e.message);
    } finally {
      setTxLoading(null);
    }
  }

  if (!address) return <div className="min-h-screen flex items-center justify-center"><Loader label="Verificando permissões..." /></div>;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav chip="Auditor" address={address} />

      <main style={{ flex: 1, maxWidth: 1080, margin: "0 auto", padding: "40px 24px", width: "100%" }}>
        <Reveal style={{ marginBottom: 32 }}>
          <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)" }}>{info?.nome || "Painel do Auditor"}</h1>
          {info && <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>{info.tipoAuditor} · {info.organizacao}</p>}
        </Reveal>

        {erro && <div style={{ marginBottom: 20 }}><Notice tone="error" onClose={() => setErro("")}>{erro}</Notice></div>}

        {loading ? (
          <Loader label="Carregando pesagens pendentes..." />
        ) : pendentes.length === 0 ? (
          <div className="gt-card gt-scale-in" style={{ padding: 48, textAlign: "center" }}>
            <p className="gt-display-md" style={{ color: "var(--color-gt-forest)", marginBottom: 6 }}>Tudo em dia</p>
            <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>Nenhuma pesagem pendente de validação.</p>
          </div>
        ) : (
          <div className="gt-stagger" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>{pendentes.length} pesagem(ns) aguardando validação</p>
            {pendentes.map((p) => (
              <div key={p.id} className="gt-card gt-card-hover" style={{ padding: 24 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Badge tone="pending">PENDENTE</Badge>
                      <span className="gt-display-md" style={{ color: "var(--color-gt-ink)" }}>#{p.id} — {p.material}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", fontSize: "0.875rem", color: "var(--color-gt-ink-mute)" }}>
                      <p><span style={{ color: "var(--color-gt-ink-faint)" }}>Peso:</span> <strong style={{ color: "var(--color-gt-ink)" }}>{p.pesoKg} kg</strong></p>
                      <p><span style={{ color: "var(--color-gt-ink-faint)" }}>Empresa:</span> {p.empresaId}</p>
                      {p.localColeta && <p><span style={{ color: "var(--color-gt-ink-faint)" }}>Local:</span> {p.localColeta}</p>}
                      {p.dataColeta && <p><span style={{ color: "var(--color-gt-ink-faint)" }}>Data coleta:</span> {p.dataColeta}</p>}
                      <p><span style={{ color: "var(--color-gt-ink-faint)" }}>Cooperativa:</span> <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{p.cooperativa.slice(0, 8)}...{p.cooperativa.slice(-4)}</span></p>
                      <p><span style={{ color: "var(--color-gt-ink-faint)" }}>Registrada:</span> {new Date(p.timestamp * 1000).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <EvidenceLink cid={p.ipfsHash} className="gt-link" style={{ fontSize: "0.75rem", marginTop: 8, display: "inline-block", padding: 0 }}>
                      Ver fotos das evidências →
                    </EvidenceLink>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => validar(p.id)} disabled={txLoading === p.id} className="btn-forest" style={{ fontSize: "0.875rem", padding: "9px 18px", opacity: txLoading === p.id ? 0.6 : 1 }}>
                      {txLoading === p.id ? "..." : "Validar"}
                    </button>
                    <button onClick={() => { setModalId(p.id); setMotivo(""); }} disabled={txLoading === p.id}
                      style={{ fontSize: "0.875rem", fontWeight: 700, padding: "9px 18px", borderRadius: "var(--radius-gt-md)", border: "1.5px solid rgba(180,30,30,0.3)", color: "#8b1a1a", background: "transparent", transition: "background 0.15s", opacity: txLoading === p.id ? 0.6 : 1 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,30,30,0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalId !== null && (
        <div className="gt-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(7,20,13,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div className="gt-scale-in" style={{ background: "#ffffff", borderRadius: "var(--radius-gt-xl)", padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <h3 className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 12 }}>Motivo da Rejeição — Pesagem #{modalId}</h3>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo da rejeição..." className="gt-textarea" style={{ minHeight: 100, resize: "none" }} />
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={rejeitar} disabled={!motivo.trim()}
                style={{ flex: 1, fontWeight: 700, fontSize: "0.875rem", padding: "10px", borderRadius: "var(--radius-gt-md)", background: "#b81c1c", color: "#fff", opacity: motivo.trim() ? 1 : 0.5 }}>
                Confirmar Rejeição
              </button>
              <button onClick={() => setModalId(null)} style={{ flex: 1, fontWeight: 600, fontSize: "0.875rem", padding: "10px", borderRadius: "var(--radius-gt-md)", border: "1px solid var(--color-gt-hairline)", color: "var(--color-gt-ink-mute)" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
