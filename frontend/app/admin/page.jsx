"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../../contexts/WalletContext";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function carregarSequencial(lista, fn, intervalo = 120) {
  const results = [];
  for (let i = 0; i < lista.length; i++) {
    results.push(await fn(lista[i]));
    if (i < lista.length - 1) await delay(intervalo);
  }
  return results;
}
import { getLedgerReadOnly, getLedgerSigner, getSealReadOnly, conectarCarteira } from "../../utils/contract";
import { TopNav, AnimatedCounter, Reveal, Loader, Notice, Badge } from "../../components/ui";

const STATUS_AUDITOR = ["PENDENTE", "APROVADO", "REJEITADO", "BLOQUEADO"];
const STATUS_COOP = ["ATIVA", "BLOQUEADA"];
const TONE_AUDITOR = ["pending", "ok", "error", "neutral"];
const TONE_COOP = ["ok", "error"];

export default function AdminPage() {
  const { address, roles, loaded } = useWallet();
  const router = useRouter();
  const [aba, setAba] = useState("auditores");
  const [metricas, setMetricas] = useState({ totalCoops: 0, auditoresAprovados: 0, auditoresPendentes: 0, totalAuditores: 0, totalPesagens: 0, totalKg: 0, totalSelos: 0, kgParaSelo: 1000 });
  const [auditores, setAuditores] = useState([]);
  const [cooperativas, setCooperativas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(null);
  const [erro, setErro] = useState("");
  const [kgForm, setKgForm] = useState("");
  const [empresaForm, setEmpresaForm] = useState({ id: "", nome: "", cnpj: "" });

  useEffect(() => {
    if (!loaded) return;
    if (!address || !roles.isAdmin) router.push("/login");
  }, [address, roles, loaded, router]);

  useEffect(() => {
    if (roles.isAdmin) carregarDados();
  }, [roles.isAdmin]);

  async function carregarDados() {
    setLoading(true);
    try {
      const ledger = getLedgerReadOnly();
      const seal = getSealReadOnly();
      const totalPesagens = await ledger.totalPesagens();
      await delay(100);
      const totalKg = await ledger.totalKgValidadoGlobal();
      await delay(100);
      const nextTokenId = await seal.nextTokenId();
      await delay(100);
      const kgParaSelo = await ledger.kgParaSelo();
      await delay(100);
      const listaAuditores = await ledger.getListaAuditores();
      await delay(100);
      const listaCoops = await ledger.getListaCooperativas();
      await delay(100);
      const listaEmpresas = await ledger.getListaEmpresasApoiadoras();

      const audDados = await carregarSequencial(listaAuditores, (a) => ledger.auditores(a));
      const coopDados = await carregarSequencial(listaCoops, (c) => ledger.cooperativas(c));
      const empresaDados = await carregarSequencial(listaEmpresas, (e) => ledger.empresasApoiadoras(e));

      const auditoresLista = listaAuditores.map((addr, i) => ({
        carteira: addr, nome: audDados[i].nome, organizacao: audDados[i].organizacao,
        tipoAuditor: audDados[i].tipoAuditor, cidade: audDados[i].cidade, estado: audDados[i].estado,
        status: Number(audDados[i].status),
      }));

      const cooperativasLista = listaCoops.map((addr, i) => ({
        carteira: addr, nome: coopDados[i].nome, cnpj: coopDados[i].cnpj,
        cidade: coopDados[i].cidade, estado: coopDados[i].estado, material: coopDados[i].material,
        status: Number(coopDados[i].status),
      }));

      const empresasLista = listaEmpresas.map((id, i) => ({
        id, nome: empresaDados[i].nome, cnpj: empresaDados[i].cnpj,
      }));

      setMetricas({
        totalPesagens: Number(totalPesagens),
        totalKg: Number(totalKg),
        totalSelos: Number(nextTokenId),
        kgParaSelo: Number(kgParaSelo),
        totalAuditores: auditoresLista.length,
        auditoresAprovados: auditoresLista.filter((a) => a.status === 1).length,
        auditoresPendentes: auditoresLista.filter((a) => a.status === 0).length,
        totalCoops: cooperativasLista.length,
      });
      setAuditores(auditoresLista);
      setCooperativas(cooperativasLista);
      setEmpresas(empresasLista);
      setKgForm(String(Number(kgParaSelo)));
    } catch (e) {
      setErro("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function acao(fn, label) {
    setTxLoading(label);
    setErro("");
    try {
      const { signer } = await conectarCarteira();
      const ledger = getLedgerSigner(signer);
      const tx = await fn(ledger);
      await tx.wait();
      await carregarDados();
    } catch (e) {
      setErro(e.reason || e.message);
    } finally {
      setTxLoading(null);
    }
  }

  async function salvarKg() {
    if (!kgForm || Number(kgForm) <= 0) return;
    await acao((l) => l.setKgParaSelo(Number(kgForm)), "kg");
  }

  async function cadastrarEmpresa(e) {
    e.preventDefault();
    if (!empresaForm.id || !empresaForm.nome) return;
    await acao((l) => l.cadastrarEmpresaApoiadora(empresaForm.id, empresaForm.nome, empresaForm.cnpj), "empresa");
    setEmpresaForm({ id: "", nome: "", cnpj: "" });
  }

  if (!address || (!roles.isAdmin && address)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader label="Verificando permissões..." /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav chip="Administrador" address={address} maxWidth={1120} />

      <main style={{ flex: 1, maxWidth: 1120, margin: "0 auto", padding: "40px 24px", width: "100%" }}>
        <Reveal>
          <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 32 }}>Painel Administrativo</h1>
        </Reveal>

        {erro && <div style={{ marginBottom: 24 }}><Notice tone="error" onClose={() => setErro("")}>{erro}</Notice></div>}

        {loading ? (
          <Loader />
        ) : (
          <>
            {/* Métricas */}
            <div className="gt-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 32 }}>
              {[
                { label: "Cooperativas", value: metricas.totalCoops },
                { label: "Auditores aprovados", value: metricas.auditoresAprovados },
                { label: "Auditores pendentes", value: metricas.auditoresPendentes },
                { label: "Pesagens registradas", value: metricas.totalPesagens },
                { label: "Kg validados", value: metricas.totalKg, unit: "kg", accent: true },
                { label: "Selos emitidos", value: metricas.totalSelos },
                { label: "Meta atual (kg/selo)", value: metricas.kgParaSelo, accent: true },
              ].map((m) => (
                <div key={m.label} className="gt-card gt-card-hover" style={{ padding: 18, textAlign: "center" }}>
                  <p style={{ fontSize: "1.5rem", fontWeight: 560, letterSpacing: "-0.02em", lineHeight: 1, color: m.accent ? "var(--color-gt-forest)" : "var(--color-gt-ink)" }}>
                    <AnimatedCounter value={m.value} />
                    {m.unit && <span style={{ fontSize: "0.75rem", fontWeight: 480, marginLeft: 3, color: "var(--color-gt-ink-mute)" }}>{m.unit}</span>}
                  </p>
                  <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 6 }}>{m.label}</p>
                </div>
              ))}
            </div>

            {/* Abas */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--color-gt-hairline)", flexWrap: "wrap" }}>
              {[
                { key: "auditores", label: `Auditores (${auditores.length})` },
                { key: "cooperativas", label: `Cooperativas (${cooperativas.length})` },
                { key: "empresas", label: `Empresas (${empresas.length})` },
                { key: "config", label: "Configurações" },
              ].map((a) => {
                const active = aba === a.key;
                return (
                  <button key={a.key} onClick={() => setAba(a.key)}
                    style={{
                      padding: "10px 16px", fontSize: "0.875rem", fontWeight: 600,
                      color: active ? "var(--color-gt-forest)" : "var(--color-gt-ink-mute)",
                      borderBottom: active ? "2px solid var(--color-gt-forest)" : "2px solid transparent",
                      marginBottom: -1, transition: "color 0.15s",
                    }}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>

            {/* Aba Auditores */}
            {aba === "auditores" && (
              <div className="gt-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {auditores.length === 0 && <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)", padding: "32px 0", textAlign: "center" }}>Nenhum auditor solicitado ainda.</p>}
                {auditores.map((a) => (
                  <div key={a.carteira} className="gt-card" style={{ padding: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="gt-body-md" style={{ fontWeight: 600, color: "var(--color-gt-ink)" }}>{a.nome}</span>
                        <Badge tone={TONE_AUDITOR[a.status]}>{STATUS_AUDITOR[a.status]}</Badge>
                      </div>
                      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)" }}>{a.tipoAuditor} · {a.organizacao} · {a.cidade}/{a.estado}</p>
                      <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", fontFamily: "monospace", marginTop: 4 }}>{a.carteira.slice(0, 10)}...{a.carteira.slice(-6)}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {a.status === 0 && (
                        <>
                          <BtnAcao label="Aprovar" tone="ok" loading={txLoading} id={a.carteira + "ap"} onClick={() => acao((l) => l.aprovarAuditor(a.carteira), a.carteira + "ap")} />
                          <BtnAcao label="Rejeitar" tone="danger" loading={txLoading} id={a.carteira + "rej"} onClick={() => acao((l) => l.rejeitarAuditor(a.carteira), a.carteira + "rej")} />
                        </>
                      )}
                      {a.status === 1 && <BtnAcao label="Bloquear" tone="danger" loading={txLoading} id={a.carteira + "bl"} onClick={() => acao((l) => l.bloquearAuditor(a.carteira), a.carteira + "bl")} />}
                      {a.status === 3 && <BtnAcao label="Desbloquear" tone="ok" loading={txLoading} id={a.carteira + "des"} onClick={() => acao((l) => l.desbloquearAuditor(a.carteira), a.carteira + "des")} />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aba Cooperativas */}
            {aba === "cooperativas" && (
              <div className="gt-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cooperativas.length === 0 && <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)", padding: "32px 0", textAlign: "center" }}>Nenhuma cooperativa cadastrada ainda.</p>}
                {cooperativas.map((c) => (
                  <div key={c.carteira} className="gt-card" style={{ padding: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="gt-body-md" style={{ fontWeight: 600, color: "var(--color-gt-ink)" }}>{c.nome}</span>
                        <Badge tone={TONE_COOP[c.status]}>{STATUS_COOP[c.status]}</Badge>
                      </div>
                      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)" }}>CNPJ: {c.cnpj} · {c.material} · {c.cidade}/{c.estado}</p>
                      <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", fontFamily: "monospace", marginTop: 4 }}>{c.carteira.slice(0, 10)}...{c.carteira.slice(-6)}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {c.status === 0
                        ? <BtnAcao label="Bloquear" tone="danger" loading={txLoading} id={c.carteira + "bl"} onClick={() => acao((l) => l.bloquearCooperativa(c.carteira), c.carteira + "bl")} />
                        : <BtnAcao label="Desbloquear" tone="ok" loading={txLoading} id={c.carteira + "des"} onClick={() => acao((l) => l.desbloquearCooperativa(c.carteira), c.carteira + "des")} />
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aba Empresas */}
            {aba === "empresas" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <form onSubmit={cadastrarEmpresa} className="gt-card" style={{ padding: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label className="gt-label">ID da empresa (CNPJ ou código) *</label>
                    <input value={empresaForm.id} onChange={(e) => setEmpresaForm((f) => ({ ...f, id: e.target.value }))} placeholder="00.000.000/0001-00" className="gt-input" />
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label className="gt-label">Nome *</label>
                    <input value={empresaForm.nome} onChange={(e) => setEmpresaForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Empresa Apoiadora Ltda" className="gt-input" />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label className="gt-label">CNPJ</label>
                    <input value={empresaForm.cnpj} onChange={(e) => setEmpresaForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="Opcional" className="gt-input" />
                  </div>
                  <button type="submit" disabled={txLoading === "empresa"} className="btn-forest" style={{ whiteSpace: "nowrap", opacity: txLoading === "empresa" ? 0.6 : 1 }}>
                    {txLoading === "empresa" ? "..." : "+ Cadastrar"}
                  </button>
                </form>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {empresas.length === 0 && <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)", padding: "16px 0", textAlign: "center" }}>Nenhuma empresa cadastrada.</p>}
                  {empresas.map((e) => (
                    <div key={e.id} className="gt-card gt-card-hover" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <span className="gt-body-md" style={{ fontWeight: 600, color: "var(--color-gt-ink)" }}>{e.nome}</span>
                        <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", fontFamily: "monospace" }}>{e.id}</p>
                      </div>
                      <Link href={`/empresa/${encodeURIComponent(e.id)}`} target="_blank" className="gt-link" style={{ fontSize: "0.75rem" }}>Ver página →</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aba Configurações */}
            {aba === "config" && (
              <div className="gt-card" style={{ padding: 24, maxWidth: 460 }}>
                <h3 className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 12 }}>Meta de emissão do Selo Verde</h3>
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginBottom: 16 }}>Quantidade de kg validados necessários para emitir um NFT Selo Verde por empresa.</p>
                <div style={{ display: "flex", gap: 12 }}>
                  <input type="number" min="1" value={kgForm} onChange={(e) => setKgForm(e.target.value)} className="gt-input" placeholder="1000" />
                  <button onClick={salvarKg} disabled={txLoading === "kg"} className="btn-forest" style={{ whiteSpace: "nowrap", opacity: txLoading === "kg" ? 0.6 : 1 }}>
                    {txLoading === "kg" ? "Salvando..." : "Salvar"}
                  </button>
                </div>
                <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", marginTop: 8 }}>Valor atual: {metricas?.kgParaSelo?.toLocaleString("pt-BR")} kg</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function BtnAcao({ label, tone, loading, id, onClick }) {
  const isOk = tone === "ok";
  const base = {
    fontSize: "0.75rem", fontWeight: 700, padding: "7px 14px",
    borderRadius: "var(--radius-gt-md)", transition: "background 0.15s, filter 0.15s",
    opacity: loading === id ? 0.5 : 1,
  };
  const style = isOk
    ? { ...base, background: "var(--color-gt-forest)", color: "#fff" }
    : { ...base, background: "transparent", color: "#8b1a1a", border: "1.5px solid rgba(180,30,30,0.3)" };
  return (
    <button onClick={onClick} disabled={loading === id} style={style}
      onMouseEnter={(e) => { if (isOk) e.currentTarget.style.filter = "brightness(1.1)"; else e.currentTarget.style.background = "rgba(180,30,30,0.06)"; }}
      onMouseLeave={(e) => { if (isOk) e.currentTarget.style.filter = "none"; else e.currentTarget.style.background = "transparent"; }}
    >
      {loading === id ? "..." : label}
    </button>
  );
}
