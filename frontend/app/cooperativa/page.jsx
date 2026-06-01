"use client";

import { useState } from "react";
import Link from "next/link";
import PesagemForm from "../../components/PesagemForm";

export default function CooperativaPage() {
  const [ultimoId, setUltimoId] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <span className="text-green-200 text-sm font-medium">Painel da Cooperativa</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800">Registrar Pesagem</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Preencha os dados e envie as evidências fotográficas para registrar uma pesagem na blockchain.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <PesagemForm
            onSuccess={(id) => {
              setUltimoId(id);
            }}
          />

          {/* Painel lateral com info */}
          <div className="flex flex-col gap-4 w-full max-w-sm">
            {ultimoId && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <p className="text-green-700 font-bold text-lg">Pesagem Registrada!</p>
                <p className="text-green-600 text-sm mt-1">
                  ID <strong>#{ultimoId}</strong> aguarda validação do auditor.
                </p>
              </div>
            )}

            <div className="bg-white border border-gray-100 rounded-xl shadow p-5">
              <h3 className="font-bold text-gray-700 mb-3">Como funciona</h3>
              <ol className="text-sm text-gray-500 flex flex-col gap-2 list-decimal list-inside">
                <li>Selecione o material e informe o peso</li>
                <li>Tire fotos da balança e dos fardos</li>
                <li>Preencha o ID da empresa</li>
                <li>Conecte sua carteira MetaMask</li>
                <li>Confirme a transação na blockchain</li>
              </ol>
            </div>

            <Link
              href="/auditor"
              className="text-center bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              Ir para Painel do Auditor →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
