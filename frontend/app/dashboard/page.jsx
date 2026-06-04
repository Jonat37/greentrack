"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLedgerReadOnly, getSealReadOnly, getVerifyUrl, getEtherscanAddress } from "../../utils/contract";
import QRDisplay from "../../components/QRDisplay";

const LEDGER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_LEDGER;
const SEAL_ADDRESS   = process.env.NEXT_PUBLIC_CONTRACT_SEAL;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function DashboardPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const ledger = getLedgerReadOnly();
      const seal   = getSealReadOnly();

      // ── Métricas base ──────────────────────────────────────────────────────
      const totalPesagens  = Number(await ledger.totalPesagens());  await delay(120);
      const totalKgGlobal  = Number(await ledger.totalKgValidadoGlobal()); await delay(120);
      const nextTokenId    = Number(await seal.nextTokenId());       await delay(120);
      const listaCoops     = await ledger.getListaCooperativas();    await delay(120);
      const listaEmpresas  = await ledger.getEmpresas();             await delay(120);

      // ── Dados por empresa ──────────────────────────────────────────────────
      const empresaMap = {};
      for (const empresaId of listaEmpresas) {
        const kg          = Number(await ledger.kgPorEmpresa(empresaId)); await delay(120);
        const pesagemIds  = await ledger.getPesagensPorEmpresa(empresaId); await delay(120);

        const pesagens = [];
        for (const id of pesagemIds) {
          const p = await ledger.pesagens(Number(id));
          pesagens.push({
            id:          Number(p.id),
            material:    p.material,
            pesoKg:      Number(p.pesoKg),
            cooperativa: p.cooperativa,
            auditor:     p.auditor,
            ipfsHash:    p.ipfsHash,
            timestamp:   Number(p.timestamp),
          });
          await delay(100);
        }

        const materials = [...new Set(pesagens.map((p) => p.material).filter(Boolean))];
        empresaMap[empresaId] = { id: empresaId, kg, pesagens, materials };
      }

      // ── Selos (últimos 5, mais recentes primeiro) ─────────────────────────
      const selosParaCarregar = Math.min(nextTokenId, 5);
      const selos = [];
      for (let i = nextTokenId; i > nextTokenId - selosParaCarregar && i > 0; i--) {
        const empresaId = await seal.seloEmpresa(i); await delay(100);
        const totalKg   = Number(await seal.seloKg(i)); await delay(100);
        const materials = empresaMap[empresaId]?.materials || [];
        selos.push({ tokenId: i, empresaId, totalKg, materials });
      }

      // ── Métricas derivadas ─────────────────────────────────────────────────
      const totalValidadas   = Object.values(empresaMap).reduce((s, e) => s + e.pesagens.length, 0);
      const ranking          = Object.values(empresaMap).sort((a, b) => b.kg - a.kg);

      setDados({
        totalPesagens,
        totalKgGlobal,
        totalSelos: nextTokenId,
        totalCooperativas: listaCoops.length,
        totalEmpresasCertificadas: listaEmpresas.length,
        totalValidadas,
        ranking,
        selos,
      });
    } catch (e) {
      setErro("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-green-200 text-sm">Dashboard Público · Sepolia</span>
            <Link href="/login" className="bg-white text-green-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition-colors">
              Entrar →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800">Impacto Ambiental</h1>
          <p className="text-gray-500 text-sm mt-1">
            Dados em tempo real da blockchain Ethereum Sepolia — verificáveis por qualquer pessoa, sem login.
          </p>
        </div>

        {erro && (
          <div className="mb-6 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm">{erro}</div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Consultando a blockchain...</p>
          </div>
        ) : dados && (
          <>
            {/* ── Métricas ────────────────────────────────────────────────── */}
            <section className="mb-12">
              <h2 className="text-lg font-bold text-gray-700 mb-4">Métricas Globais</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricCard icon="♻️" value={`${dados.totalKgGlobal.toLocaleString()} kg`} label="Kg validados" cor="text-green-600" />
                <MetricCard icon="📋" value={dados.totalPesagens} label="Pesagens registradas" cor="text-blue-600" />
                <MetricCard icon="✅" value={dados.totalValidadas} label="Pesagens validadas" cor="text-green-700" />
                <MetricCard icon="🏅" value={dados.totalSelos} label="Selos emitidos" cor="text-emerald-600" />
                <MetricCard icon="🏭" value={dados.totalCooperativas} label="Cooperativas" cor="text-indigo-600" />
                <MetricCard icon="🏢" value={dados.totalEmpresasCertificadas} label="Empresas certificadas" cor="text-purple-600" />
              </div>
            </section>

            {/* ── Ranking ──────────────────────────────────────────────────── */}
            {dados.ranking.length > 0 && (
              <section className="mb-12">
                <h2 className="text-lg font-bold text-gray-700 mb-4">Ranking de Empresas por Kg Certificado</h2>
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-5 py-3 text-left w-10">#</th>
                        <th className="px-5 py-3 text-left">Empresa</th>
                        <th className="px-5 py-3 text-left">Materiais</th>
                        <th className="px-5 py-3 text-right">Kg certificados</th>
                        <th className="px-5 py-3 text-right">Selos</th>
                        <th className="px-5 py-3 text-right">Pesagens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dados.ranking.map((e, i) => {
                        const selosEmpresa = dados.selos.filter((s) => s.empresaId === e.id).length;
                        return (
                          <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 font-bold text-gray-400">{i + 1}</td>
                            <td className="px-5 py-3 font-mono text-xs text-gray-700 font-semibold">{e.id}</td>
                            <td className="px-5 py-3 text-gray-500">{e.materials.join(", ") || "—"}</td>
                            <td className="px-5 py-3 text-right font-bold text-green-700">{e.kg.toLocaleString()} kg</td>
                            <td className="px-5 py-3 text-right text-emerald-600 font-semibold">{selosEmpresa > 0 ? `🏅 ${selosEmpresa}` : "—"}</td>
                            <td className="px-5 py-3 text-right text-gray-500">{e.pesagens.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Selos ────────────────────────────────────────────────────── */}
            <section className="mb-12">
              <h2 className="text-lg font-bold text-gray-700 mb-4">
                Últimos Selos Verdes Emitidos
                {dados.totalSelos > 5 && (
                  <span className="text-gray-400 text-sm font-normal ml-2">(exibindo últimos 5 de {dados.totalSelos})</span>
                )}
              </h2>

              {dados.selos.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-10 text-center text-gray-400 text-sm">
                  Nenhum Selo Verde emitido ainda. Selos são criados automaticamente quando uma empresa atinge a meta de kg validados.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dados.selos.map((s) => (
                    <SeloCard key={s.tokenId} selo={s} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Links blockchain ─────────────────────────────────────────── */}
            <section>
              <h2 className="text-lg font-bold text-gray-700 mb-4">Contratos na Blockchain</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ContractLink
                  label="RecyclingLedger"
                  desc="Registro e validação de pesagens"
                  address={LEDGER_ADDRESS}
                  href={getEtherscanAddress(LEDGER_ADDRESS)}
                />
                <ContractLink
                  label="GreenSeal (ERC-721)"
                  desc="NFTs Selos Verdes"
                  address={SEAL_ADDRESS}
                  href={getEtherscanAddress(SEAL_ADDRESS)}
                />
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="bg-green-900 text-green-200 text-sm text-center py-4 mt-10">
        GreenTrack · Dados públicos e verificáveis na blockchain Ethereum Sepolia
      </footer>
    </div>
  );
}

function SeloCard({ selo }) {
  const verifyUrl = getVerifyUrl(selo.tokenId);
  return (
    <div className="bg-white rounded-2xl shadow border border-green-100 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏅</span>
            <span className="font-extrabold text-green-700 text-base">Selo Verde #{selo.tokenId}</span>
          </div>
          <p className="text-gray-500 text-xs font-mono">{selo.empresaId}</p>
        </div>
        <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Token #{selo.tokenId}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xl font-extrabold text-green-700">{selo.totalKg.toLocaleString()}</p>
          <p className="text-gray-500 text-xs">kg certificados</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-sm font-semibold text-gray-700 leading-tight">{selo.materials.join(", ") || "—"}</p>
          <p className="text-gray-500 text-xs">material(is)</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-2 py-2">
        <QRDisplay url={verifyUrl} compact />
        <p className="text-xs text-gray-400 text-center">Escaneie para auditar on-chain</p>
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/verify/11155111/${process.env.NEXT_PUBLIC_CONTRACT_SEAL}/${selo.tokenId}`}
          className="w-full text-center bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
        >
          🔍 Ver auditoria completa
        </Link>
        <a
          href={`https://sepolia.etherscan.io/token/${process.env.NEXT_PUBLIC_CONTRACT_SEAL}?a=${selo.tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-center border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold py-2 rounded-xl transition-colors"
        >
          Ver no Etherscan ↗
        </a>
      </div>
    </div>
  );
}

function MetricCard({ icon, value, label, cor }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 text-center border border-gray-100">
      <p className="text-2xl mb-1">{icon}</p>
      <p className={`text-2xl font-extrabold ${cor}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  );
}

function ContractLink({ label, desc, address, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-2xl shadow border border-gray-100 p-5 hover:border-green-300 transition-colors block"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-800 text-sm">{label}</p>
          <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
          <p className="font-mono text-xs text-gray-400 mt-2 break-all">{address}</p>
        </div>
        <span className="text-green-600 text-sm ml-2">↗</span>
      </div>
    </a>
  );
}
