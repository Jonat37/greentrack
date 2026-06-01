"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SealCard from "../../../components/SealCard";
import QRDisplay from "../../../components/QRDisplay";
import { getLedgerReadOnly, getSealReadOnly } from "../../../utils/contract";

export default function EmpresaPage() {
  const { id: empresaId } = useParams();

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!empresaId) return;

    async function carregar() {
      try {
        const ledger = getLedgerReadOnly();
        const seal = getSealReadOnly();

        const idsValidados = await ledger.getPesagensPorEmpresa(empresaId);
        const totalKg = Number(await ledger.kgPorEmpresa(empresaId));
        const selosEmitidos = Number(await seal.totalSelosPorEmpresa(empresaId));
        const totalPesagens = idsValidados.length;

        // Carregar detalhes das pesagens validadas
        const pesagens = await Promise.all(
          idsValidados.map(async (id) => {
            const p = await ledger.pesagens(Number(id));
            return {
              id: Number(p.id),
              material: p.material,
              pesoKg: Number(p.pesoKg),
              timestamp: Number(p.timestamp),
            };
          })
        );

        setDados({ totalKg, selosEmitidos, totalPesagens, pesagens });
      } catch (e) {
        setErro("Erro ao carregar dados: " + e.message);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [empresaId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <span className="text-green-200 text-sm font-medium">Certificado de Impacto</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-800">Impacto Ambiental</h1>
          <p className="text-gray-500 text-sm mt-1 font-mono break-all">{empresaId}</p>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            {erro}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">Carregando dados da blockchain...</p>
        ) : dados ? (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex flex-col gap-6">
              <SealCard
                empresaId={empresaId}
                totalKg={dados.totalKg}
                totalPesagens={dados.totalPesagens}
                selosEmitidos={dados.selosEmitidos}
              />
              <QRDisplay empresaId={empresaId} />
            </div>

            {/* Histórico de pesagens validadas */}
            <div className="flex-1 bg-white rounded-2xl shadow p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-700 mb-4">
                Pesagens Validadas ({dados.pesagens.length})
              </h2>
              {dados.pesagens.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma pesagem validada ainda.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {dados.pesagens.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border-b border-gray-50 pb-2"
                    >
                      <div>
                        <span className="font-semibold text-gray-700 text-sm">#{p.id} — {p.material}</span>
                        <p className="text-xs text-gray-400">
                          {new Date(p.timestamp * 1000).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className="text-green-700 font-bold text-sm">{p.pesoKg} kg</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-6 text-center">
            <p className="text-yellow-700 text-sm">Empresa não encontrada ou sem dados registrados.</p>
          </div>
        )}
      </main>

      <footer className="bg-green-900 text-green-200 text-sm text-center py-4">
        GreenTrack · Verificação pública e imutável na blockchain
      </footer>
    </div>
  );
}
