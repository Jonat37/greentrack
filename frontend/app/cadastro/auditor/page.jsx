"use client";

import { useState } from "react";
import Link from "next/link";
import { conectarCarteira, getLedgerSigner } from "../../../utils/contract";
import { useWallet } from "../../../contexts/WalletContext";

const TIPOS = ["Auditor independente", "Ecoponto", "ONG", "Fiscal parceiro"];
const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function CadastroAuditor() {
  const { address, conectar, loading: walletLoading } = useWallet();
  const [form, setForm] = useState({ nome: "", organizacao: "", tipoAuditor: "", cidade: "", estado: "", documento: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ tipo: "", msg: "" });
  const [erroCarteira, setErroCarteira] = useState("");

  async function handleConectar() {
    setErroCarteira("");
    try { await conectar(); } catch (e) { setErroCarteira(e.message); }
  }

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome || !form.organizacao || !form.tipoAuditor || !form.cidade || !form.estado) {
      setStatus({ tipo: "erro", msg: "Preencha todos os campos obrigatórios." });
      return;
    }
    setLoading(true);
    setStatus({ tipo: "loading", msg: "Conectando carteira..." });
    try {
      const { signer } = await conectarCarteira();
      setStatus({ tipo: "loading", msg: "Enviando solicitação para a blockchain..." });
      const ledger = getLedgerSigner(signer);
      const tx = await ledger.solicitarAuditor(
        form.nome, form.organizacao, form.tipoAuditor, form.cidade, form.estado, form.documento
      );
      await tx.wait();
      setStatus({ tipo: "sucesso", msg: "Solicitação enviada. Um administrador precisa aprovar sua carteira antes que você possa validar pesagens." });
    } catch (e) {
      setStatus({ tipo: "erro", msg: e.reason || e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <Link href="/login" className="text-blue-200 text-sm hover:text-white">← Voltar ao login</Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-lg">
          <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Solicitar acesso como Auditor</h1>
          <p className="text-gray-500 text-sm mb-8">
            Sua solicitação será analisada pelo administrador antes da aprovação.
          </p>

          {status.tipo === "sucesso" ? (
            <div className="bg-blue-50 border border-blue-300 rounded-2xl p-6 text-center">
              <p className="text-4xl mb-3">⏳</p>
              <p className="text-blue-800 font-semibold text-sm">{status.msg}</p>
              <Link
                href="/"
                className="mt-5 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl text-sm transition-colors"
              >
                Ir para o Dashboard
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Campo label="Nome completo *" value={form.nome} onChange={(v) => set("nome", v)} placeholder="João da Silva" disabled={loading} />
              <Campo label="Organização ou entidade *" value={form.organizacao} onChange={(v) => set("organizacao", v)} placeholder="Instituto Verde" disabled={loading} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de auditor *</label>
                <select
                  value={form.tipoAuditor}
                  onChange={(e) => set("tipoAuditor", e.target.value)}
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione</option>
                  {TIPOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <Campo label="Cidade *" value={form.cidade} onChange={(v) => set("cidade", v)} placeholder="São Paulo" disabled={loading} className="flex-1" />
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Estado *</label>
                  <select
                    value={form.estado}
                    onChange={(e) => set("estado", e.target.value)}
                    disabled={loading}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">UF</option>
                    {ESTADOS.map((uf) => <option key={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
              <Campo label="Documento de identificação (opcional)" value={form.documento} onChange={(v) => set("documento", v)} placeholder="CPF ou número de registro" disabled={loading} />

              {/* Carteira MetaMask */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carteira MetaMask *</label>
                {address ? (
                  <div className="w-full border border-blue-400 bg-blue-50 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                    <span className="text-blue-600">✅</span>
                    <span className="font-mono text-blue-800 font-semibold">{address.slice(0, 10)}...{address.slice(-6)}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleConectar}
                      disabled={walletLoading}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {walletLoading ? "Conectando..." : "🦊 Conectar MetaMask"}
                    </button>
                    {erroCarteira && <p className="text-red-600 text-xs">{erroCarteira}</p>}
                  </div>
                )}
              </div>

              {status.tipo === "erro" && (
                <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm">{status.msg}</div>
              )}
              {status.tipo === "loading" && (
                <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-4 py-3 text-sm animate-pulse">{status.msg}</div>
              )}

              <button
                type="submit"
                disabled={loading || !address}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition-colors mt-2"
              >
                {loading ? "Processando..." : !address ? "Conecte a carteira para continuar" : "Solicitar aprovação como Auditor"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function Campo({ label, value, onChange, placeholder, disabled, className = "w-full" }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
      />
    </div>
  );
}
