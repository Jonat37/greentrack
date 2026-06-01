"use client";

import { useEffect, useState } from "react";
import { getLedgerReadOnly, getLedgerSigner, conectarCarteira } from "../utils/contract";
import { getIPFSUrl } from "../utils/ipfs";

const STATUS = { 0: "PENDENTE", 1: "VALIDADO", 2: "REJEITADO" };

export default function AuditorPanel() {
  const [pesagens, setPesagens] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [txLoading, setTxLoading] = useState(null); // id da pesagem em processamento
  const [modalId, setModalId] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  async function carregarPendentes() {
    setLoadingList(true);
    try {
      const ledger = getLedgerReadOnly();
      const total = await ledger.totalPesagens();
      const pendentes = [];

      for (let i = 1; i <= Number(total); i++) {
        const p = await ledger.pesagens(i);
        if (Number(p.status) === 0) {
          pendentes.push({
            id: Number(p.id),
            material: p.material,
            pesoKg: Number(p.pesoKg),
            cooperativa: p.cooperativa,
            empresaId: p.empresaId,
            ipfsHash: p.ipfsHash,
            timestamp: Number(p.timestamp),
          });
        }
      }
      setPesagens(pendentes);
    } catch (e) {
      setErro("Erro ao carregar pesagens: " + e.message);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    carregarPendentes();
  }, []);

  async function validar(id) {
    setTxLoading(id);
    try {
      const { signer } = await conectarCarteira();
      const ledger = getLedgerSigner(signer);
      const tx = await ledger.validarPesagem(id);
      await tx.wait();
      await carregarPendentes();
    } catch (e) {
      setErro("Erro ao validar: " + e.message);
    } finally {
      setTxLoading(null);
    }
  }

  async function rejeitar() {
    if (!motivo.trim()) return;
    setTxLoading(modalId);
    setModalId(null);
    try {
      const { signer } = await conectarCarteira();
      const ledger = getLedgerSigner(signer);
      const tx = await ledger.rejeitarPesagem(modalId, motivo);
      await tx.wait();
      setMotivo("");
      await carregarPendentes();
    } catch (e) {
      setErro("Erro ao rejeitar: " + e.message);
    } finally {
      setTxLoading(null);
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-green-700 mb-6">Painel do Auditor</h2>

      {erro && (
        <div className="mb-4 bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm">
          {erro}
          <button onClick={() => setErro("")} className="ml-2 font-bold">×</button>
        </div>
      )}

      {loadingList ? (
        <p className="text-gray-500">Carregando pesagens pendentes...</p>
      ) : pesagens.length === 0 ? (
        <div className="bg-green-50 rounded-xl p-8 text-center text-green-700">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-semibold">Nenhuma pesagem pendente de validação.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pesagens.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow p-6 border border-gray-100">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
                    PENDENTE
                  </span>
                  <h3 className="text-lg font-bold mt-2">
                    #{p.id} — {p.material}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    <strong>{p.pesoKg} kg</strong> · Empresa: {p.empresaId}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Cooperativa: {p.cooperativa.slice(0, 6)}...{p.cooperativa.slice(-4)}
                  </p>
                  <a
                    href={getIPFSUrl(p.ipfsHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 text-xs underline mt-1 inline-block"
                  >
                    Ver evidências →
                  </a>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => validar(p.id)}
                    disabled={txLoading === p.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {txLoading === p.id ? "..." : "✅ Validar"}
                  </button>
                  <button
                    onClick={() => { setModalId(p.id); setMotivo(""); }}
                    disabled={txLoading === p.id}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    ❌ Rejeitar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de rejeição */}
      {modalId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Motivo da Rejeição</h3>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[100px]"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={rejeitar}
                disabled={!motivo.trim()}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2 rounded-lg"
              >
                Confirmar Rejeição
              </button>
              <button
                onClick={() => setModalId(null)}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
