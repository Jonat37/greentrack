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

const STATUS_AUDITOR = ["PENDENTE", "APROVADO", "REJEITADO", "BLOQUEADO"];
const STATUS_COOP = ["ATIVA", "BLOQUEADA"];
const BADGE_AUDITOR = ["bg-yellow-100 text-yellow-700", "bg-green-100 text-green-700", "bg-red-100 text-red-700", "bg-gray-200 text-gray-600"];
const BADGE_COOP = ["bg-green-100 text-green-700", "bg-red-100 text-red-700"];

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
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Verificando permissões...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-purple-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="bg-purple-600 text-purple-100 text-xs font-bold px-3 py-1 rounded-full">ADM</span>
            <span className="text-purple-200 text-xs font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-8">Painel Administrativo</h1>

        {erro && (
          <div className="mb-6 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm flex justify-between">
            {erro}
            <button onClick={() => setErro("")} className="font-bold">×</button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-16">Carregando dados da blockchain...</p>
        ) : (
          <>
            {/* Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Cooperativas", value: metricas.totalCoops, cor: "text-green-600" },
                { label: "Auditores aprovados", value: metricas.auditoresAprovados, cor: "text-blue-600" },
                { label: "Auditores pendentes", value: metricas.auditoresPendentes, cor: "text-yellow-600" },
                { label: "Pesagens registradas", value: metricas.totalPesagens, cor: "text-gray-700" },
                { label: "Kg validados", value: metricas.totalKg.toLocaleString() + " kg", cor: "text-green-700" },
                { label: "Selos emitidos", value: metricas.totalSelos, cor: "text-emerald-600" },
                { label: "Meta atual (kg/selo)", value: metricas.kgParaSelo.toLocaleString(), cor: "text-purple-600" },
              ].map((m) => (
                <div key={m.label} className="bg-white rounded-2xl shadow p-4 text-center border border-gray-100">
                  <p className={`text-2xl font-extrabold ${m.cor}`}>{m.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Abas */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              {[
                { key: "auditores", label: `Auditores (${auditores.length})` },
                { key: "cooperativas", label: `Cooperativas (${cooperativas.length})` },
                { key: "empresas", label: `Empresas (${empresas.length})` },
                { key: "config", label: "Configurações" },
              ].map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAba(a.key)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${aba === a.key ? "bg-white border border-b-white border-gray-200 text-purple-700 -mb-px" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* Aba Auditores */}
            {aba === "auditores" && (
              <div className="flex flex-col gap-3">
                {auditores.length === 0 && <p className="text-gray-400 text-sm py-8 text-center">Nenhum auditor solicitado ainda.</p>}
                {auditores.map((a) => (
                  <div key={a.carteira} className="bg-white rounded-xl shadow p-5 border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800">{a.nome}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BADGE_AUDITOR[a.status]}`}>{STATUS_AUDITOR[a.status]}</span>
                      </div>
                      <p className="text-gray-500 text-xs">{a.tipoAuditor} · {a.organizacao} · {a.cidade}/{a.estado}</p>
                      <p className="text-gray-400 text-xs font-mono mt-1">{a.carteira.slice(0, 10)}...{a.carteira.slice(-6)}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {a.status === 0 && (
                        <>
                          <BtnAcao label="Aprovar" cor="green" loading={txLoading} id={a.carteira + "ap"} onClick={() => acao((l) => l.aprovarAuditor(a.carteira), a.carteira + "ap")} />
                          <BtnAcao label="Rejeitar" cor="red" loading={txLoading} id={a.carteira + "rej"} onClick={() => acao((l) => l.rejeitarAuditor(a.carteira), a.carteira + "rej")} />
                        </>
                      )}
                      {a.status === 1 && <BtnAcao label="Bloquear" cor="gray" loading={txLoading} id={a.carteira + "bl"} onClick={() => acao((l) => l.bloquearAuditor(a.carteira), a.carteira + "bl")} />}
                      {a.status === 3 && <BtnAcao label="Desbloquear" cor="blue" loading={txLoading} id={a.carteira + "des"} onClick={() => acao((l) => l.desbloquearAuditor(a.carteira), a.carteira + "des")} />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aba Cooperativas */}
            {aba === "cooperativas" && (
              <div className="flex flex-col gap-3">
                {cooperativas.length === 0 && <p className="text-gray-400 text-sm py-8 text-center">Nenhuma cooperativa cadastrada ainda.</p>}
                {cooperativas.map((c) => (
                  <div key={c.carteira} className="bg-white rounded-xl shadow p-5 border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800">{c.nome}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BADGE_COOP[c.status]}`}>{STATUS_COOP[c.status]}</span>
                      </div>
                      <p className="text-gray-500 text-xs">CNPJ: {c.cnpj} · {c.material} · {c.cidade}/{c.estado}</p>
                      <p className="text-gray-400 text-xs font-mono mt-1">{c.carteira.slice(0, 10)}...{c.carteira.slice(-6)}</p>
                    </div>
                    <div className="flex gap-2">
                      {c.status === 0
                        ? <BtnAcao label="Bloquear" cor="red" loading={txLoading} id={c.carteira + "bl"} onClick={() => acao((l) => l.bloquearCooperativa(c.carteira), c.carteira + "bl")} />
                        : <BtnAcao label="Desbloquear" cor="green" loading={txLoading} id={c.carteira + "des"} onClick={() => acao((l) => l.desbloquearCooperativa(c.carteira), c.carteira + "des")} />
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aba Empresas */}
            {aba === "empresas" && (
              <div className="flex flex-col gap-6">
                <form onSubmit={cadastrarEmpresa} className="bg-white rounded-xl shadow p-5 border border-gray-100 flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID da empresa (CNPJ ou código) *</label>
                    <input value={empresaForm.id} onChange={(e) => setEmpresaForm((f) => ({ ...f, id: e.target.value }))} placeholder="00.000.000/0001-00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                    <input value={empresaForm.nome} onChange={(e) => setEmpresaForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Empresa Apoiadora Ltda" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
                    <input value={empresaForm.cnpj} onChange={(e) => setEmpresaForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="Opcional" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <button type="submit" disabled={txLoading === "empresa"} className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold px-5 py-2 rounded-lg text-sm whitespace-nowrap">
                    {txLoading === "empresa" ? "..." : "+ Cadastrar"}
                  </button>
                </form>
                <div className="flex flex-col gap-2">
                  {empresas.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">Nenhuma empresa cadastrada.</p>}
                  {empresas.map((e) => (
                    <div key={e.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-800 text-sm">{e.nome}</span>
                        <p className="text-gray-400 text-xs font-mono">{e.id}</p>
                      </div>
                      <Link href={`/empresa/${encodeURIComponent(e.id)}`} target="_blank" className="text-green-600 text-xs underline hover:text-green-700">Ver página →</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aba Configurações */}
            {aba === "config" && (
              <div className="bg-white rounded-xl shadow p-6 border border-gray-100 max-w-md">
                <h3 className="font-bold text-gray-800 mb-4">Meta de emissão do Selo Verde</h3>
                <p className="text-gray-500 text-sm mb-4">Quantidade de kg validados necessários para emitir um NFT Selo Verde por empresa.</p>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="1"
                    value={kgForm}
                    onChange={(e) => setKgForm(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="1000"
                  />
                  <button
                    onClick={salvarKg}
                    disabled={txLoading === "kg"}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold px-5 py-2 rounded-lg text-sm"
                  >
                    {txLoading === "kg" ? "Salvando..." : "Salvar"}
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-2">Valor atual: {metricas?.kgParaSelo?.toLocaleString()} kg</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function BtnAcao({ label, cor, loading, id, onClick }) {
  const cores = { green: "bg-green-600 hover:bg-green-700", red: "bg-red-500 hover:bg-red-600", gray: "bg-gray-500 hover:bg-gray-600", blue: "bg-blue-600 hover:bg-blue-700" };
  return (
    <button onClick={onClick} disabled={loading === id} className={`${cores[cor]} disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors`}>
      {loading === id ? "..." : label}
    </button>
  );
}
