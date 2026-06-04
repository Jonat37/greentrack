"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "../../contexts/WalletContext";
import { getLedgerReadOnly } from "../../utils/contract";

export default function LoginPage() {
  const { address, roles, loading, loaded, conectar } = useWallet();
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [statusExtra, setStatusExtra] = useState(null); // "auditor-pendente" | "cooperativa-sem-role"

  useEffect(() => {
    if (!loaded || !address) return;
    if (roles.isAdmin) { router.push("/admin"); return; }
    if (roles.isAuditor) { router.push("/auditor"); return; }
    if (roles.isCooperativa) { router.push("/cooperativa"); return; }

    // Sem role: verificar se tem cadastro pendente
    async function verificarPendente() {
      try {
        const ledger = getLedgerReadOnly();
        const auditor = await ledger.auditores(address);
        if (auditor.carteira !== "0x0000000000000000000000000000000000000000") {
          const status = Number(auditor.status);
          if (status === 0) setStatusExtra("auditor-pendente");
          else if (status === 2) setStatusExtra("auditor-rejeitado");
          else if (status === 3) setStatusExtra("auditor-bloqueado");
          return;
        }
        const coop = await ledger.cooperativas(address);
        if (coop.carteira !== "0x0000000000000000000000000000000000000000") {
          setStatusExtra("cooperativa-sem-role");
        }
      } catch {}
    }
    verificarPendente();
  }, [address, roles, loaded, router]);

  async function handleConectar() {
    setErro("");
    setStatusExtra(null);
    try {
      await conectar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const enderecoFormatado = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  function getRoleInfo() {
    if (!address) return null;
    if (roles.isAdmin) return { label: "Administrador", cor: "bg-purple-100 text-purple-700", icone: "👑" };
    if (roles.isAuditor) return { label: "Auditor aprovado", cor: "bg-blue-100 text-blue-700", icone: "✅" };
    if (roles.isCooperativa) return { label: "Cooperativa ativa", cor: "bg-green-100 text-green-700", icone: "♻️" };
    if (statusExtra === "auditor-pendente") return { label: "Auditor — aguardando aprovação", cor: "bg-yellow-100 text-yellow-700", icone: "⏳" };
    if (statusExtra === "auditor-rejeitado") return { label: "Auditor — solicitação rejeitada", cor: "bg-red-100 text-red-700", icone: "❌" };
    if (statusExtra === "auditor-bloqueado") return { label: "Auditor — acesso bloqueado", cor: "bg-red-100 text-red-700", icone: "🚫" };
    if (statusExtra === "cooperativa-sem-role") return { label: "Cooperativa cadastrada — entre em contato com o administrador", cor: "bg-yellow-100 text-yellow-700", icone: "⚠️" };
    return { label: "Sem permissão cadastrada", cor: "bg-gray-100 text-gray-600", icone: "—" };
  }

  const roleInfo = getRoleInfo();
  const temRole = roles.isAdmin || roles.isAuditor || roles.isCooperativa;
  const semCadastro = address && !temRole && !statusExtra;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <Link href="/#dashboard" className="text-green-200 text-sm hover:text-white transition-colors">
            📊 Dashboard público
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
          <div className="text-5xl mb-4">🌿</div>
          <h1 className="text-2xl font-extrabold text-gray-800 mb-2">Entrar no GreenTrack</h1>
          <p className="text-gray-500 text-sm mb-8">
            Conecte sua carteira MetaMask para acessar ou se cadastrar na plataforma.
          </p>

          {erro && (
            <div className="mb-5 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm">
              {erro}
            </div>
          )}

          {!address ? (
            <button
              onClick={handleConectar}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <span className="animate-pulse">Conectando...</span> : <>🦊 Conectar MetaMask</>}
            </button>
          ) : (
            <div className="flex flex-col gap-3 text-left">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs text-gray-500 mb-1">Carteira conectada</p>
                <p className="font-mono text-sm font-bold text-gray-800">{enderecoFormatado}</p>
              </div>

              {roleInfo && (
                <div className={`rounded-2xl px-4 py-3 font-semibold text-sm text-center flex items-center justify-center gap-2 ${roleInfo.cor}`}>
                  <span>{roleInfo.icone}</span>
                  <span>{roleInfo.label}</span>
                </div>
              )}

              {statusExtra === "auditor-pendente" && (
                <p className="text-yellow-700 text-xs text-center bg-yellow-50 rounded-xl px-4 py-2">
                  Sua solicitação foi enviada. Um administrador precisa aprovar sua carteira antes de você acessar o painel.
                </p>
              )}

              {temRole && (
                <p className="text-gray-400 text-xs text-center animate-pulse">Redirecionando...</p>
              )}
            </div>
          )}

          {/* Opções de cadastro — só para quem não tem cadastro */}
          {(!address || semCadastro) && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">
                Novo por aqui?
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/cadastro/cooperativa"
                  className="w-full border-2 border-green-600 text-green-700 hover:bg-green-50 font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  ♻️ Cadastrar Cooperativa
                </Link>
                <Link
                  href="/cadastro/auditor"
                  className="w-full border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  🔍 Solicitar acesso como Auditor
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
