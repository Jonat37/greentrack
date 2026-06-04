"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../../contexts/WalletContext";
import { getLedgerReadOnly, getLedgerSigner, conectarCarteira } from "../../utils/contract";
import { getIPFSUrl } from "../../utils/ipfs";

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

  if (!address) return <div className="min-h-screen flex items-center justify-center text-gray-400">Verificando permissões...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Auditor</span>
            <span className="text-blue-200 text-xs font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        {info && (
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-800">{info.nome}</h1>
            <p className="text-gray-500 text-sm mt-1">{info.tipoAuditor} · {info.organizacao}</p>
          </div>
        )}
        {!info && <h1 className="text-2xl font-extrabold text-gray-800 mb-8">Painel do Auditor</h1>}

        {erro && (
          <div className="mb-5 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm flex justify-between">
            {erro}
            <button onClick={() => setErro("")} className="font-bold">×</button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-20">Carregando pesagens pendentes...</p>
        ) : pendentes.length === 0 ? (
          <div className="bg-green-50 rounded-2xl p-12 text-center text-green-700">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-semibold">Nenhuma pesagem pendente de validação.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 mb-1">{pendentes.length} pesagem(ns) aguardando validação</p>
            {pendentes.map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow p-6 border border-gray-100">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">PENDENTE</span>
                      <span className="text-lg font-bold text-gray-800">#{p.id} — {p.material}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                      <p><span className="text-gray-400">Peso:</span> <strong>{p.pesoKg} kg</strong></p>
                      <p><span className="text-gray-400">Empresa:</span> {p.empresaId}</p>
                      {p.localColeta && <p><span className="text-gray-400">Local:</span> {p.localColeta}</p>}
                      {p.dataColeta && <p><span className="text-gray-400">Data coleta:</span> {p.dataColeta}</p>}
                      <p><span className="text-gray-400">Cooperativa:</span> <span className="font-mono text-xs">{p.cooperativa.slice(0, 8)}...{p.cooperativa.slice(-4)}</span></p>
                      <p><span className="text-gray-400">Registrada:</span> {new Date(p.timestamp * 1000).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <a href={getIPFSUrl(p.ipfsHash)} target="_blank" rel="noopener noreferrer" className="text-green-600 text-xs underline mt-2 inline-block hover:text-green-700">
                      Ver evidências no IPFS →
                    </a>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => validar(p.id)} disabled={txLoading === p.id} className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                      {txLoading === p.id ? "..." : "✅ Validar"}
                    </button>
                    <button onClick={() => { setModalId(p.id); setMotivo(""); }} disabled={txLoading === p.id} className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                      ❌ Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Motivo da Rejeição — Pesagem #{modalId}</h3>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo da rejeição..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[100px]" />
            <div className="flex gap-3 mt-4">
              <button onClick={rejeitar} disabled={!motivo.trim()} className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2 rounded-lg text-sm">Confirmar Rejeição</button>
              <button onClick={() => setModalId(null)} className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
