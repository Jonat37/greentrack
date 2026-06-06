"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { conectarCarteira, getLedgerSigner } from "../../../utils/contract";
import { useWallet } from "../../../contexts/WalletContext";
import { TopNav, Notice } from "../../../components/ui";

const MATERIAIS = ["PET", "Alumínio", "Papelão", "Vidro", "Eletrônicos", "Plástico Misto", "Outros"];
const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function CadastroCooperativa() {
  const router = useRouter();
  const { address, conectar, loading: walletLoading, refreshRoles } = useWallet();
  const [form, setForm] = useState({ nome: "", cnpj: "", cidade: "", estado: "", material: "", contato: "" });
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
    if (!form.nome || !form.cnpj || !form.cidade || !form.estado || !form.material) {
      setStatus({ tipo: "erro", msg: "Preencha todos os campos obrigatórios." });
      return;
    }
    setLoading(true);
    setStatus({ tipo: "loading", msg: "Conectando carteira..." });
    try {
      const { signer } = await conectarCarteira();
      setStatus({ tipo: "loading", msg: "Registrando na blockchain..." });
      const ledger = getLedgerSigner(signer);
      const tx = await ledger.cadastrarCooperativa(
        form.nome, form.cnpj, form.cidade, form.estado, form.material, form.contato
      );
      await tx.wait();
      await refreshRoles();
      setStatus({ tipo: "sucesso", msg: "Cadastro realizado com sucesso. Você já pode registrar pesagens. As pesagens ficarão pendentes até validação de um auditor aprovado." });
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
          <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 6 }}>Cadastrar Cooperativa</h1>
          <p className="gt-body-md" style={{ color: "var(--color-gt-ink-mute)", marginBottom: 32 }}>
            Após o cadastro você já poderá registrar pesagens na blockchain.
          </p>

          {status.tipo === "sucesso" ? (
            <div className="gt-scale-in" style={{ background: "rgba(159,223,186,0.12)", border: "1px solid rgba(159,223,186,0.5)", borderRadius: "var(--radius-gt-lg)", padding: 24, textAlign: "center" }}>
              <p className="gt-display-md" style={{ color: "var(--color-gt-forest)", marginBottom: 8 }}>Cadastro concluído</p>
              <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>{status.msg}</p>
              <button onClick={() => router.push("/cooperativa")} className="btn-forest" style={{ marginTop: 20 }}>Ir para o Painel →</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Campo label="Nome da Cooperativa *" value={form.nome} onChange={(v) => set("nome", v)} placeholder="Ex: Cooperativa Verde SP" disabled={loading} />
              <Campo label="CNPJ *" value={form.cnpj} onChange={(v) => set("cnpj", v)} placeholder="00.000.000/0001-00" disabled={loading} />
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
              <div>
                <label className="gt-label">Material principal *</label>
                <select value={form.material} onChange={(e) => set("material", e.target.value)} disabled={loading} className="gt-select">
                  <option value="">Selecione</option>
                  {MATERIAIS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <Campo label="E-mail ou contato (opcional)" value={form.contato} onChange={(v) => set("contato", v)} placeholder="contato@cooperativa.com" disabled={loading} />

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
                {loading ? "Processando..." : !address ? "Conecte a carteira para continuar" : "Cadastrar Cooperativa"}
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
