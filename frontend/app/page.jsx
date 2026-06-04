"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLedgerReadOnly, getSealReadOnly } from "../utils/contract";

export default function Home() {
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarMetricas() {
      try {
        const ledger = getLedgerReadOnly();
        const seal = getSealReadOnly();
        const [totalPesagens, totalKg, nextTokenId] = await Promise.all([
          ledger.totalPesagens(),
          ledger.totalKgValidadoGlobal(),
          seal.nextTokenId(),
        ]);
        setMetricas({
          totalPesagens: Number(totalPesagens),
          totalKg: Number(totalKg),
          totalSelos: Number(nextTokenId),
        });
      } catch {
        // exibe zeros se RPC falhar
        setMetricas({ totalPesagens: 0, totalKg: 0, totalSelos: 0 });
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
          <Link
            href="/login"
            className="bg-white text-green-700 hover:bg-green-50 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Entrar na Plataforma →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-green-700 to-green-600 text-white py-20 px-6 text-center">
        <h1 className="text-4xl font-extrabold mb-4 max-w-2xl mx-auto leading-tight">
          Rastreabilidade de Reciclagem na Blockchain
        </h1>
        <p className="text-green-100 text-lg max-w-xl mx-auto mb-10">
          Registro imutável, validação auditada e certificação de impacto ambiental com NFTs.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="bg-white text-green-700 hover:bg-green-50 font-bold px-8 py-4 rounded-2xl text-base transition-colors shadow-lg"
          >
            🦊 Entrar / Cadastrar
          </Link>
          <Link
            href="/dashboard"
            className="border-2 border-white text-white hover:bg-green-600 font-bold px-8 py-4 rounded-2xl text-base transition-colors"
          >
            📊 Dashboard Público
          </Link>
        </div>
      </section>

      {/* Dashboard Público */}
      <section id="dashboard" className="max-w-5xl mx-auto px-6 py-14 w-full">
        <h2 className="text-2xl font-bold text-gray-700 mb-2 text-center">Dashboard Público</h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          Dados em tempo real da blockchain Ethereum Sepolia — sem necessidade de login.
        </p>
        {loading ? (
          <p className="text-center text-gray-400 py-8">Carregando dados da blockchain...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <MetricCard icon="📋" value={metricas.totalPesagens} label="Pesagens Registradas" cor="text-blue-600" />
            <MetricCard icon="♻️" value={`${metricas.totalKg.toLocaleString()} kg`} label="Total de Kg Validados" cor="text-green-600" />
            <MetricCard icon="🏅" value={metricas.totalSelos} label="Selos Verdes Emitidos" cor="text-emerald-600" />
          </div>
        )}
      </section>

      {/* Como funciona */}
      <section className="bg-white py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-700 mb-8 text-center">Como Funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <Passo numero="1" titulo="Cooperativa Registra" descricao="A cooperativa cadastra-se e registra pesagens de materiais recicláveis com fotos como evidência." />
            <Passo numero="2" titulo="Auditor Valida" descricao="Auditores aprovados verificam as evidências e validam cada pesagem na blockchain." />
            <Passo numero="3" titulo="Selo Verde Emitido" descricao="A cada meta de kg validados, um NFT Selo Verde é emitido automaticamente para a empresa apoiadora." />
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-green-700 py-12 px-6 text-center text-white">
        <h2 className="text-2xl font-bold mb-3">Faça parte da rede</h2>
        <p className="text-green-100 mb-6 text-sm">Cooperativas e auditores podem se cadastrar gratuitamente.</p>
        <Link
          href="/login"
          className="bg-white text-green-700 hover:bg-green-50 font-bold px-8 py-4 rounded-2xl text-sm transition-colors inline-block"
        >
          Acessar Plataforma →
        </Link>
      </section>

      <footer className="bg-green-900 text-green-200 text-sm text-center py-4">
        GreenTrack · Certificação ambiental na blockchain Ethereum Sepolia
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
      <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 font-extrabold text-lg flex items-center justify-center">{numero}</div>
      <h3 className="font-bold text-gray-700">{titulo}</h3>
      <p className="text-gray-500 text-sm">{descricao}</p>
    </div>
  );
}
