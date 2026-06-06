"use client";

import { useState } from "react";
import Link from "next/link";
import { conectarCarteira, getLedgerSigner } from "../../../utils/contract";
import { useWallet } from "../../../contexts/WalletContext";
import { TopNav, Notice } from "../../../components/ui";

const TIPOS = ["Auditor independente", "Ecoponto", "ONG", "Fiscal parceiro"];
const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function CadastroAuditor() {
  const { address, conectar, loading: walletLoading } = useWallet();
  const [form, setForm] = useState({ nome: "", organizacao: "", tipoAuditor: "", cidade: "", estado: "", documento: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ tipo: "", msg: "" });
  const [erroCarteira, setErroCarteira] = useState("");

  async function handleConectar() {
    setErroCarteira("");
    try { await conectar(); } catch (e) { setErroCarteira(e.message); }
  }

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome || !form.organizacao || !form.tipoAuditor || !form.cidade || !form.estado) {
      setStatus({ tipo: "erro", msg: "Preencha todos os campos obrigatórios." });
      return;
    }
    setLoading(true);
    setStatus({ tipo: "loading", msg: "Conectando carteira..." });
    try {
      const { signer } = await conectarCarteira();
      setStatus({ tipo: "loading", msg: "Enviando solicitação para a blockchain..." });
      const ledger = getLedgerSigner(signer);
      const tx = await ledger.solicitarAuditor(
        form.nome, form.organizacao, form.tipoAuditor, form.cidade, form.estado, form.documento
      );
      await tx.wait();
      setStatus({ tipo: "sucesso", msg: "Solicitação enviada. Um administrador precisa aprovar sua carteira antes que você possa validar pesagens." });
    } catch (e) {
      setStatus({ tipo: "erro", msg: e.reason || e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav
        right={<Link href="/login" className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)" }}>← Voltar ao login</Link>}
      />

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
        <div className="gt-card gt-fade-up" style={{ padding: "40px", width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
          <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 6 }}>Solicitar acesso como Auditor</h1>
          <p className="gt-body-md" style={{ color: "var(--color-gt-ink-mute)", marginBottom: 32 }}>
            Sua solicitação será analisada pelo administrador antes da aprovação.
          </p>

          {status.tipo === "sucesso" ? (
            <div className="gt-scale-in" style={{ background: "rgba(180,130,0,0.08)", border: "1px solid rgba(180,130,0,0.25)", borderRadius: "var(--radius-gt-lg)", padding: 24, textAlign: "center" }}>
              <p className="gt-display-md" style={{ color: "#7a5800", marginBottom: 8 }}>Solicitação enviada</p>
              <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>{status.msg}</p>
              <Link href="/" className="btn-forest" style={{ marginTop: 20 }}>Ir para o Dashboard</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Campo label="Nome completo *" value={form.nome} onChange={(v) => set("nome", v)} placeholder="João da Silva" disabled={loading} />
              <Campo label="Organização ou entidade *" value={form.organizacao} onChange={(v) => set("organizacao", v)} placeholder="Instituto Verde" disabled={loading} />
              <div>
                <label className="gt-label">Tipo de auditor *</label>
                <select value={form.tipoAuditor} onChange={(e) => set("tipoAuditor", e.target.value)} disabled={loading} className="gt-select">
                  <option value="">Selecione</option>
                  {TIPOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="gt-label">Cidade *</label>
                  <input type="text" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="São Paulo" disabled={loading} className="gt-input" />
                </div>
                <div>
                  <label className="gt-label">Estado *</label>
                  <select value={form.estado} onChange={(e) => set("estado", e.target.value)} disabled={loading} className="gt-select">
                    <option value="">UF</option>
                    {ESTADOS.map((uf) => <option key={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
              <Campo label="Documento de identificação (opcional)" value={form.documento} onChange={(v) => set("documento", v)} placeholder="CPF ou número de registro" disabled={loading} />

              {/* Carteira MetaMask */}
              <div>
                <label className="gt-label">Carteira MetaMask *</label>
                {address ? (
                  <div style={{ width: "100%", border: "1px solid rgba(159,223,186,0.6)", background: "rgba(159,223,186,0.12)", borderRadius: "var(--radius-gt-sm)", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "monospace", fontWeight: 600, color: "var(--color-gt-forest)" }}>
                    ✓ {address.slice(0, 10)}...{address.slice(-6)}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button type="button" onClick={handleConectar} disabled={walletLoading} className="btn-forest" style={{ width: "100%", justifyContent: "center", opacity: walletLoading ? 0.6 : 1 }}>
                      {walletLoading ? "Conectando..." : "Conectar MetaMask"}
                    </button>
                    {erroCarteira && <p style={{ color: "#8b1a1a", fontSize: "0.75rem" }}>{erroCarteira}</p>}
                  </div>
                )}
              </div>

              {status.tipo === "erro" && <Notice tone="error">{status.msg}</Notice>}
              {status.tipo === "loading" && <Notice tone="loading">{status.msg}</Notice>}

              <button type="submit" disabled={loading || !address} className="btn-forest" style={{ width: "100%", justifyContent: "center", marginTop: 8, opacity: (loading || !address) ? 0.5 : 1 }}>
                {loading ? "Processando..." : !address ? "Conecte a carteira para continuar" : "Solicitar aprovação como Auditor"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function Campo({ label, value, onChange, placeholder, disabled }) {
  return (
    <div>
      <label className="gt-label">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="gt-input" />
    </div>
  );
}
