"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLedgerReadOnly, getSealReadOnly } from "../utils/contract";

export default function Dashboard() {
  const [metricas, setMetricas] = useState({
    totalPesagens: 0,
    totalKg: 0,
    totalSelos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarMetricas() {
      try {
        const ledger = getLedgerReadOnly();
        const seal = getSealReadOnly();

        const totalPesagens = Number(await ledger.totalPesagens());

        // Somar todos os kgPorEmpresa iterando pelas pesagens validadas
        // (abordagem simples: soma kgPorEmpresa das empresas únicas encontradas)
        const empresas = new Set();
        let totalKg = 0;
        for (let i = 1; i <= totalPesagens; i++) {
          const p = await ledger.pesagens(i);
          if (Number(p.status) === 1 && p.empresaId && !empresas.has(p.empresaId)) {
            empresas.add(p.empresaId);
            totalKg += Number(await ledger.kgPorEmpresa(p.empresaId));
          }
        }

        const nextTokenId = Number(await seal.nextTokenId());

        setMetricas({ totalPesagens, totalKg, totalSelos: nextTokenId });
      } catch (e) {
        console.error("Erro ao carregar métricas:", e);
      } finally {
        setLoading(false);
      }
    }

    carregarMetricas();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </div>
          <nav className="flex gap-3">
            <Link
              href="/cooperativa"
              className="bg-white text-green-700 hover:bg-green-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Cooperativa
            </Link>
            <Link
              href="/auditor"
              className="bg-green-600 hover:bg-green-500 border border-green-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Auditor
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-green-700 to-green-600 text-white py-16 px-6 text-center">
        <h1 className="text-4xl font-extrabold mb-3">
          Rastreabilidade de Reciclagem na Blockchain
        </h1>
        <p className="text-green-100 text-lg max-w-xl mx-auto">
          Registro imutável, validação auditada e certificação de impacto ambiental com NFTs.
        </p>
      </section>

      {/* Cards de métricas */}
      <section className="max-w-5xl mx-auto px-6 py-12 w-full">
        <h2 className="text-xl font-bold text-gray-700 mb-6 text-center">
          Impacto Global da Plataforma
        </h2>
        {loading ? (
          <p className="text-center text-gray-400">Carregando dados da blockchain...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <MetricCard
              icon="📋"
              value={metricas.totalPesagens}
              label="Pesagens Registradas"
              cor="text-blue-600"
            />
            <MetricCard
              icon="♻️"
              value={`${metricas.totalKg.toLocaleString()} kg`}
              label="Total de Kg Validados"
              cor="text-green-600"
            />
            <MetricCard
              icon="🏅"
              value={metricas.totalSelos}
              label="Selos Verdes Emitidos"
              cor="text-emerald-600"
            />
          </div>
        )}
      </section>

      {/* Como funciona */}
      <section className="bg-white py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-700 mb-8 text-center">Como Funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Passo
              numero="1"
              titulo="Registrar"
              descricao="A cooperativa registra a pesagem com fotos como evidência. Dados vão para o IPFS e a blockchain."
            />
            <Passo
              numero="2"
              titulo="Validar"
              descricao="Auditores verificam as evidências e validam ou rejeitam cada pesagem na cadeia."
            />
            <Passo
              numero="3"
              titulo="Certificar"
              descricao="A cada 1.000 kg validados, um NFT Selo Verde é emitido automaticamente para a empresa."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-green-900 text-green-200 text-sm text-center py-4">
        GreenTrack · Desafio 3 HackWeb ·{" "}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

function MetricCard({ icon, value, label, cor }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 text-center border border-gray-100">
      <p className="text-3xl mb-1">{icon}</p>
      <p className={`text-4xl font-extrabold ${cor}`}>{value}</p>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </div>
  );
}

function Passo({ numero, titulo, descricao }) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 font-extrabold text-lg flex items-center justify-center">
        {numero}
      </div>
      <h3 className="font-bold text-gray-700">{titulo}</h3>
      <p className="text-gray-500 text-sm">{descricao}</p>
    </div>
  );
}
