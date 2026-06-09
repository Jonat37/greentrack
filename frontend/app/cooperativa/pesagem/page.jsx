"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../../../contexts/WalletContext";
import { conectarCarteira, getLedgerSigner, getLedgerReadOnly } from "../../../utils/contract";
import { uploadArquivoIPFS, criarMetadataPesagem } from "../../../utils/ipfs";
import { TopNav, Loader, Notice } from "../../../components/ui";

const MATERIAIS = ["PET", "Alumínio", "Papelão", "Vidro", "Eletrônicos", "Plástico Misto", "Outros"];

export default function NovaPesagem() {
  const { address, roles, loaded } = useWallet();
  const router = useRouter();
  const [empresas, setEmpresas] = useState([]);
  const [form, setForm] = useState({
    empresaId: "", material: "", pesoKg: "",
    localColeta: "", dataColeta: "", observacao: "",
  });
  const [fotoBalanca, setFotoBalanca] = useState(null);
  const [fotoFardos, setFotoFardos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ tipo: "", msg: "" });

  useEffect(() => {
    if (!loaded) return;
    if (!address || !roles.isCooperativa) router.push("/login");
  }, [address, roles, loaded, router]);

  useEffect(() => {
    async function carregarEmpresas() {
      try {
        const ledger = getLedgerReadOnly();
        const ids = await ledger.getListaEmpresasApoiadoras();
        const dados = await Promise.all(ids.map(async (id) => {
          const e = await ledger.empresasApoiadoras(id);
          return { id, nome: e.nome };
        }));
        setEmpresas(dados);
      } catch {}
    }
    if (roles.isCooperativa) carregarEmpresas();
  }, [roles.isCooperativa]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.empresaId || !form.material || !form.pesoKg || !fotoBalanca || !fotoFardos) {
      setStatus({ tipo: "erro", msg: "Preencha todos os campos obrigatórios e adicione as fotos." });
      return;
    }
    if (Number(form.pesoKg) <= 0) {
      setStatus({ tipo: "erro", msg: "O peso deve ser maior que zero." });
      return;
    }
    setLoading(true);
    try {
      setStatus({ tipo: "loading", msg: "📤 Enviando foto da balança para IPFS..." });
      const cidBalanca = await uploadArquivoIPFS(fotoBalanca);

      setStatus({ tipo: "loading", msg: "📤 Enviando foto dos fardos para IPFS..." });
      const cidFardos = await uploadArquivoIPFS(fotoFardos);

      setStatus({ tipo: "loading", msg: "🔗 Criando metadados no IPFS..." });
      const cidJSON = await criarMetadataPesagem({
        cidFotoBalanca: cidBalanca,
        cidFotoFardos: cidFardos,
        material: form.material,
        pesoKg: Number(form.pesoKg),
        empresaId: form.empresaId,
        localColeta: form.localColeta,
        dataColeta: form.dataColeta,
        observacao: form.observacao,
        timestamp: new Date().toISOString(),
      });

      setStatus({ tipo: "loading", msg: "⛓️ Conectando carteira..." });
      const { signer } = await conectarCarteira();
      const ledger = getLedgerSigner(signer);

      setStatus({ tipo: "loading", msg: "📝 Registrando pesagem na blockchain..." });
      const tx = await ledger.registrarPesagem(
        form.material,
        Number(form.pesoKg),
        cidJSON,
        form.empresaId,
        form.localColeta,
        form.dataColeta,
        form.observacao
      );
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log) => { try { return ledger.interface.parseLog(log); } catch { return null; } })
        .find((ev) => ev?.name === "PesagemRegistrada");
      const id = event ? event.args.id.toString() : "?";

      setStatus({ tipo: "sucesso", msg: `Pesagem #${id} registrada com sucesso! Aguardando validação do auditor.` });
    } catch (err) {
      setStatus({ tipo: "erro", msg: err.reason || err.message });
    } finally {
      setLoading(false);
    }
  }

  if (!address) return <div className="min-h-screen flex items-center justify-center"><Loader label="Verificando permissões..." /></div>;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav
        right={<Link href="/cooperativa" className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)" }}>← Voltar ao painel</Link>}
      />

      <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", padding: "40px 16px", width: "100%" }}>
        <div className="gt-fade-up" style={{ marginBottom: 32 }}>
          <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 4 }}>Nova Pesagem</h1>
          <p className="gt-body-md" style={{ color: "var(--color-gt-ink-mute)" }}>Registre uma coleta de material reciclável na blockchain.</p>
        </div>

        {status.tipo === "sucesso" ? (
          <div className="gt-card gt-scale-in" style={{ padding: 40, textAlign: "center", border: "1px solid rgba(159,223,186,0.5)", background: "rgba(159,223,186,0.10)" }}>
            <p className="gt-display-md" style={{ color: "var(--color-gt-forest)", marginBottom: 8 }}>Pesagem registrada</p>
            <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>{status.msg}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => { setStatus({ tipo: "", msg: "" }); setForm({ empresaId: "", material: "", pesoKg: "", localColeta: "", dataColeta: "", observacao: "" }); setFotoBalanca(null); setFotoFardos(null); }} className="btn-forest">
                Nova pesagem
              </button>
              <Link href="/cooperativa" style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid var(--color-gt-forest)", color: "var(--color-gt-forest)", fontWeight: 700, padding: "12px 20px", borderRadius: "var(--radius-gt-md)", fontSize: "0.875rem" }}>
                Ver histórico
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="gt-card gt-fade-up" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Empresa apoiadora */}
            <div>
              <label className="gt-label">Empresa apoiadora *</label>
              {empresas.length > 0 ? (
                <select value={form.empresaId} onChange={(e) => set("empresaId", e.target.value)} disabled={loading} className="gt-select">
                  <option value="">Selecione a empresa</option>
                  {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.id})</option>)}
                </select>
              ) : (
                <input type="text" value={form.empresaId} onChange={(e) => set("empresaId", e.target.value)} placeholder="CNPJ ou código da empresa" disabled={loading} className="gt-input" />
              )}
            </div>

            {/* Material */}
            <div>
              <label className="gt-label">Tipo de material *</label>
              <select value={form.material} onChange={(e) => set("material", e.target.value)} disabled={loading} className="gt-select">
                <option value="">Selecione o material</option>
                {MATERIAIS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Peso */}
            <div>
              <label className="gt-label">Peso (kg) *</label>
              <input type="number" min="1" value={form.pesoKg} onChange={(e) => set("pesoKg", e.target.value)} placeholder="Ex: 350" disabled={loading} className="gt-input" />
            </div>

            {/* Local e Data */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="gt-label">Local da coleta</label>
                <input type="text" value={form.localColeta} onChange={(e) => set("localColeta", e.target.value)} placeholder="Ex: Galpão Central SP" disabled={loading} className="gt-input" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="gt-label">Data da pesagem</label>
                <input type="date" value={form.dataColeta} onChange={(e) => set("dataColeta", e.target.value)} disabled={loading} className="gt-input" />
              </div>
            </div>

            {/* Fotos */}
            <div>
              <label className="gt-label">Foto do tíquete da balança *</label>
              <input type="file" accept="image/*" onChange={(e) => setFotoBalanca(e.target.files[0] || null)} disabled={loading} className="gt-input" style={{ padding: "8px 12px", fontSize: "0.875rem" }} />
              {fotoBalanca && <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>{fotoBalanca.name}</p>}
            </div>
            <div>
              <label className="gt-label">Foto dos fardos / material *</label>
              <input type="file" accept="image/*" onChange={(e) => setFotoFardos(e.target.files[0] || null)} disabled={loading} className="gt-input" style={{ padding: "8px 12px", fontSize: "0.875rem" }} />
              {fotoFardos && <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>{fotoFardos.name}</p>}
            </div>

            {/* Observação */}
            <div>
              <label className="gt-label">Observação</label>
              <textarea value={form.observacao} onChange={(e) => set("observacao", e.target.value)} placeholder="Informações adicionais sobre a coleta..." disabled={loading} rows={3} className="gt-textarea" style={{ resize: "none" }} />
            </div>

            {status.tipo === "erro" && <Notice tone="error">{status.msg}</Notice>}
            {status.tipo === "loading" && <Notice tone="loading">{status.msg}</Notice>}

            <button type="submit" disabled={loading} className="btn-forest" style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Processando..." : "Registrar Pesagem na Blockchain"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
