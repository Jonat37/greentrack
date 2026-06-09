"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../../../contexts/WalletContext";
import { conectarCarteira, getLedgerSigner, getLedgerReadOnly } from "../../../utils/contract";
import { uploadArquivoIPFS, criarMetadataEntrada, criarMetadataProcesso } from "../../../utils/ipfs";
import { TopNav, Loader, Notice } from "../../../components/ui";

const MATERIAIS = ["PET", "Alumínio", "Papelão", "Vidro", "Eletrônicos", "Plástico Misto", "Outros"];
const ZERO = "0x0000000000000000000000000000000000000000";

export default function NovaPesagem() {
  const { address, roles, loaded } = useWallet();
  const router = useRouter();
  const [loteId, setLoteId] = useState(null); // null = fase entrada; id = fase processamento

  // Detecta ?lote=ID via window (evita Suspense do useSearchParams)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("lote");
    setLoteId(p ? Number(p) : 0); // 0 = sem lote (modo entrada)
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!address || !roles.isCooperativa) router.push("/login");
  }, [address, roles, loaded, router]);

  if (!address) return <div className="min-h-screen flex items-center justify-center"><Loader label="Verificando permissões..." /></div>;
  if (loteId === null) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav right={<Link href="/cooperativa" className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)" }}>← Voltar ao painel</Link>} />
      <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", padding: "40px 16px", width: "100%" }}>
        {loteId > 0
          ? <ProcessamentoForm loteId={loteId} address={address} />
          : <EntradaForm address={address} />}
      </main>
    </div>
  );
}

/* ── FASE 1 — Entrada ─────────────────────────────────────────────────────── */
function EntradaForm() {
  const [empresas, setEmpresas] = useState([]);
  const [form, setForm] = useState({ empresaId: "", material: "", pesoEntrada: "", localColeta: "", dataColeta: "" });
  const [fotoBalanca, setFotoBalanca] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ tipo: "", msg: "", loteId: null });

  useEffect(() => {
    (async () => {
      try {
        const ledger = getLedgerReadOnly();
        const ids = await ledger.getListaEmpresasApoiadoras();
        const dados = await Promise.all(ids.map(async (id) => ({ id, nome: (await ledger.empresasApoiadoras(id)).nome })));
        setEmpresas(dados);
      } catch {}
    })();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.empresaId || !form.material || !form.pesoEntrada || !fotoBalanca) {
      return setStatus({ tipo: "erro", msg: "Preencha os campos obrigatórios e adicione a foto da balança." });
    }
    if (Number(form.pesoEntrada) <= 0) return setStatus({ tipo: "erro", msg: "O peso de entrada deve ser maior que zero." });
    setLoading(true);
    try {
      setStatus({ tipo: "loading", msg: "📤 Enviando foto da balança para IPFS..." });
      const cidFotoBalanca = await uploadArquivoIPFS(fotoBalanca);

      setStatus({ tipo: "loading", msg: "🔗 Criando metadados de entrada..." });
      const cidJSON = await criarMetadataEntrada({
        cidFotoBalanca, material: form.material, pesoEntrada: Number(form.pesoEntrada),
        empresaId: form.empresaId, localColeta: form.localColeta, dataColeta: form.dataColeta,
        timestamp: new Date().toISOString(),
      });

      setStatus({ tipo: "loading", msg: "⛓️ Conectando carteira..." });
      const { signer } = await conectarCarteira();
      const ledger = getLedgerSigner(signer);

      setStatus({ tipo: "loading", msg: "📝 Registrando entrada na blockchain..." });
      const tx = await ledger.registrarEntrada(form.material, Number(form.pesoEntrada), form.empresaId, cidJSON, form.localColeta, form.dataColeta);
      const receipt = await tx.wait();
      const ev = receipt.logs.map((l) => { try { return ledger.interface.parseLog(l); } catch { return null; } }).find((e) => e?.name === "LoteRecebido");
      const id = ev ? ev.args.id.toString() : "?";
      setStatus({ tipo: "sucesso", msg: `Lote #${id} recebido. Próximo passo: registrar o processamento (balanço de massa).`, loteId: id });
    } catch (err) {
      setStatus({ tipo: "erro", msg: err.reason || err.message });
    } finally {
      setLoading(false);
    }
  }

  if (status.tipo === "sucesso") {
    return (
      <div className="gt-card gt-scale-in" style={{ padding: 40, textAlign: "center", border: "1px solid rgba(159,223,186,0.5)", background: "rgba(159,223,186,0.10)" }}>
        <p className="gt-display-md" style={{ color: "var(--color-gt-forest)", marginBottom: 8 }}>Entrada registrada</p>
        <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>{status.msg}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
          <Link href={`/cooperativa/pesagem?lote=${status.loteId}`} className="btn-forest">Registrar processamento →</Link>
          <Link href="/cooperativa" style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid var(--color-gt-forest)", color: "var(--color-gt-forest)", fontWeight: 700, padding: "12px 20px", borderRadius: "var(--radius-gt-md)", fontSize: "0.875rem" }}>Ver painel</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="gt-fade-up" style={{ marginBottom: 24 }}>
        <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Fase 1 de 2 · Entrada</p>
        <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 4 }}>Registrar entrada do lote</h1>
        <p className="gt-body-md" style={{ color: "var(--color-gt-ink-mute)" }}>Pese o material recebido. O balanço (reciclado/rejeito/perda) vem na próxima etapa.</p>
      </div>
      <form onSubmit={handleSubmit} className="gt-card gt-fade-up" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
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
        <div>
          <label className="gt-label">Tipo de material *</label>
          <select value={form.material} onChange={(e) => set("material", e.target.value)} disabled={loading} className="gt-select">
            <option value="">Selecione o material</option>
            {MATERIAIS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="gt-label">Peso de entrada (kg) *</label>
          <input type="number" min="1" value={form.pesoEntrada} onChange={(e) => set("pesoEntrada", e.target.value)} placeholder="Ex: 500" disabled={loading} className="gt-input" />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="gt-label">Local da coleta</label>
            <input type="text" value={form.localColeta} onChange={(e) => set("localColeta", e.target.value)} placeholder="Ex: Galpão Central SP" disabled={loading} className="gt-input" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="gt-label">Data</label>
            <input type="date" value={form.dataColeta} onChange={(e) => set("dataColeta", e.target.value)} disabled={loading} className="gt-input" />
          </div>
        </div>
        <div>
          <label className="gt-label">Foto do tíquete da balança *</label>
          <input type="file" accept="image/*" onChange={(e) => setFotoBalanca(e.target.files[0] || null)} disabled={loading} className="gt-input" style={{ padding: "8px 12px", fontSize: "0.875rem" }} />
          {fotoBalanca && <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>{fotoBalanca.name}</p>}
        </div>

        {status.tipo === "erro" && <Notice tone="error">{status.msg}</Notice>}
        {status.tipo === "loading" && <Notice tone="loading">{status.msg}</Notice>}

        <button type="submit" disabled={loading} className="btn-forest" style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Processando..." : "Registrar entrada"}
        </button>
      </form>
    </>
  );
}

/* ── FASE 2 — Processamento (balanço de massa) ────────────────────────────── */
function ProcessamentoForm({ loteId, address }) {
  const [lote, setLote] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLote, setErroLote] = useState("");
  const [reciclado, setReciclado] = useState("");
  const [rejeito, setRejeito] = useState("");
  const [fotoSaida, setFotoSaida] = useState(null);
  const [fotoRejeito, setFotoRejeito] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ tipo: "", msg: "" });

  useEffect(() => {
    (async () => {
      try {
        const ledger = getLedgerReadOnly();
        const l = await ledger.lotes(loteId);
        if (l.recicladora === ZERO) { setErroLote("Lote inexistente."); return; }
        if (l.recicladora.toLowerCase() !== address.toLowerCase()) { setErroLote("Este lote pertence a outra recicladora."); return; }
        if (Number(l.status) !== 0) { setErroLote("Este lote não está mais em estado RECEBIDO."); return; }
        setLote({ material: l.material, pesoEntrada: Number(l.pesoEntrada), empresaId: l.empresaId });
      } catch (e) {
        setErroLote("Erro ao carregar o lote: " + e.message);
      } finally {
        setCarregando(false);
      }
    })();
  }, [loteId, address]);

  const r = Number(reciclado) || 0;
  const j = Number(rejeito) || 0;
  const entrada = lote?.pesoEntrada || 0;
  const perda = entrada - r - j;
  const balancoOk = entrada > 0 && r >= 0 && j >= 0 && r + j <= entrada;
  const taxa = entrada > 0 ? ((r / entrada) * 100).toFixed(1) : "0";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!balancoOk) return setStatus({ tipo: "erro", msg: "O balanço não fecha: reciclado + rejeito não pode exceder a entrada." });
    if (!fotoSaida || !fotoRejeito) return setStatus({ tipo: "erro", msg: "Adicione as fotos de saída e de rejeito." });
    setLoading(true);
    try {
      setStatus({ tipo: "loading", msg: "📤 Enviando foto da saída para IPFS..." });
      const cidFotoSaida = await uploadArquivoIPFS(fotoSaida);
      setStatus({ tipo: "loading", msg: "📤 Enviando foto do rejeito para IPFS..." });
      const cidFotoRejeito = await uploadArquivoIPFS(fotoRejeito);

      setStatus({ tipo: "loading", msg: "🔗 Criando metadados do processamento..." });
      const cidJSON = await criarMetadataProcesso({
        cidFotoSaida, cidFotoRejeito, pesoReciclado: r, pesoRejeito: j, pesoPerda: perda,
        timestamp: new Date().toISOString(),
      });

      setStatus({ tipo: "loading", msg: "⛓️ Conectando carteira..." });
      const { signer } = await conectarCarteira();
      const ledger = getLedgerSigner(signer);

      setStatus({ tipo: "loading", msg: "📝 Registrando processamento na blockchain..." });
      const tx = await ledger.registrarProcessamento(loteId, r, j, cidJSON);
      await tx.wait();
      setStatus({ tipo: "sucesso", msg: `Lote #${loteId} processado. Aguardando validação do auditor.` });
    } catch (err) {
      setStatus({ tipo: "erro", msg: err.reason || err.message });
    } finally {
      setLoading(false);
    }
  }

  if (carregando) return <Loader label="Carregando lote..." />;
  if (erroLote) return <Notice tone="error">{erroLote}</Notice>;

  if (status.tipo === "sucesso") {
    return (
      <div className="gt-card gt-scale-in" style={{ padding: 40, textAlign: "center", border: "1px solid rgba(159,223,186,0.5)", background: "rgba(159,223,186,0.10)" }}>
        <p className="gt-display-md" style={{ color: "var(--color-gt-forest)", marginBottom: 8 }}>Processamento registrado</p>
        <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>{status.msg}</p>
        <Link href="/cooperativa" className="btn-forest" style={{ marginTop: 24 }}>Ver painel</Link>
      </div>
    );
  }

  return (
    <>
      <div className="gt-fade-up" style={{ marginBottom: 24 }}>
        <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Fase 2 de 2 · Processamento</p>
        <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 4 }}>Balanço de massa — Lote #{loteId}</h1>
        <p className="gt-body-md" style={{ color: "var(--color-gt-ink-mute)" }}>{lote.material} · entrada de <strong>{entrada} kg</strong> · {lote.empresaId}</p>
      </div>

      <form onSubmit={handleSubmit} className="gt-card gt-fade-up" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="gt-label">Reciclado (kg) *</label>
            <input type="number" min="0" value={reciclado} onChange={(e) => setReciclado(e.target.value)} placeholder="Ex: 420" disabled={loading} className="gt-input" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="gt-label">Rejeito (kg) *</label>
            <input type="number" min="0" value={rejeito} onChange={(e) => setRejeito(e.target.value)} placeholder="Ex: 50" disabled={loading} className="gt-input" />
          </div>
        </div>

        {/* Balanço em tempo real */}
        <div style={{ background: "var(--color-gt-canvas-soft)", border: `1px solid ${balancoOk ? "var(--color-gt-hairline)" : "rgba(180,30,30,0.3)"}`, borderRadius: "var(--radius-gt-md)", padding: 16 }}>
          <p className="gt-micro" style={{ fontWeight: 700, color: "var(--color-gt-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Balanço de massa · taxa de reciclagem {taxa}%
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <Bal label="Entrada" v={entrada} cor="var(--color-gt-ink)" />
            <Bal label="Reciclado" v={r} cor="var(--color-gt-forest)" />
            <Bal label="Rejeito" v={j} cor="var(--color-gt-ink-mute)" />
            <Bal label="Perda" v={perda} cor={perda < 0 ? "#8b1a1a" : "var(--color-gt-ink-mute)"} />
          </div>
          {!balancoOk && (
            <p className="gt-micro" style={{ color: "#8b1a1a", marginTop: 10 }}>
              Reciclado + rejeito ({r + j} kg) excede a entrada ({entrada} kg). O contrato rejeitaria esta transação.
            </p>
          )}
        </div>

        <div>
          <label className="gt-label">Foto da saída reciclada *</label>
          <input type="file" accept="image/*" onChange={(e) => setFotoSaida(e.target.files[0] || null)} disabled={loading} className="gt-input" style={{ padding: "8px 12px", fontSize: "0.875rem" }} />
          {fotoSaida && <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>{fotoSaida.name}</p>}
        </div>
        <div>
          <label className="gt-label">Foto do rejeito *</label>
          <input type="file" accept="image/*" onChange={(e) => setFotoRejeito(e.target.files[0] || null)} disabled={loading} className="gt-input" style={{ padding: "8px 12px", fontSize: "0.875rem" }} />
          {fotoRejeito && <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>{fotoRejeito.name}</p>}
        </div>

        {status.tipo === "erro" && <Notice tone="error">{status.msg}</Notice>}
        {status.tipo === "loading" && <Notice tone="loading">{status.msg}</Notice>}

        <button type="submit" disabled={loading || !balancoOk} className="btn-forest" style={{ width: "100%", justifyContent: "center", opacity: (loading || !balancoOk) ? 0.5 : 1 }}>
          {loading ? "Processando..." : "Registrar processamento"}
        </button>
      </form>
    </>
  );
}

function Bal({ label, v, cor }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: "1.25rem", fontWeight: 560, color: cor, lineHeight: 1 }}>{v}<span style={{ fontSize: "0.6875rem", fontWeight: 480, color: "var(--color-gt-ink-faint)", marginLeft: 2 }}>kg</span></p>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 2 }}>{label}</p>
    </div>
  );
}
