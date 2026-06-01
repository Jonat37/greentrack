"use client";

import Link from "next/link";
import AuditorPanel from "../../components/AuditorPanel";

export default function AuditorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <span className="text-green-200 text-sm font-medium">Painel do Auditor</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800">Validação de Pesagens</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Revise as evidências e valide ou rejeite as pesagens pendentes. Sua carteira deve ter
            AUDITOR_ROLE no contrato.
          </p>
        </div>

        <AuditorPanel />
      </main>
    </div>
  );
}
