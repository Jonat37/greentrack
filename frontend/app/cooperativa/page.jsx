"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../../contexts/WalletContext";
import { getLedgerReadOnly, getSealReadOnly } from "../../utils/contract";
import { getIPFSUrl } from "../../utils/ipfs";
import QRDisplay from "../../components/QRDisplay";

const STATUS_LABEL = ["PENDENTE", "VALIDADA", "REJEITADA"];
const STATUS_COR = [
  "bg-yellow-100 text-yellow-700",
  "bg-green-100 text-green-700",
  "bg-red-100 text-red-700",
];

export default function CooperativaPage() {
  const { address, roles, loaded } = useWallet();
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [pesagens, setPesagens] = useState([]);
  const [selos, setSelos] = useState([]);
  const [stats, setStats] = useState({ enviados: 0, validados: 0, pendentes: 0, rejeitados: 0 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!loaded) return;
    if (!address || !roles.isCooperativa) router.push("/login");
  }, [address, roles, loaded, router]);

  useEffect(() => {
    if (address && roles.isCooperativa) carregarDados();
  }, [address, roles.isCooperativa]);

  async function carregarDados() {
    setLoading(true);
    try {
      const ledger = getLedgerReadOnly();
      const seal = getSealReadOnly();

      const [infoRaw, ids] = await Promise.all([
        ledger.cooperativas(address),
        ledger.getPesagensPorCooperativa(address),
      ]);

      setInfo({
        nome: infoRaw.nome,
        cnpj: infoRaw.cnpj,
        cidade: infoRaw.cidade,
        estado: infoRaw.estado,
        material: infoRaw.material,
      });

      const lista = await Promise.all(
        ids.map(async (id) => {
          const p = await ledger.pesagens(Number(id));
          return {
            id: Number(p.id),
            material: p.material,
            pesoKg: Number(p.pesoKg),
            ipfsHash: p.ipfsHash,
            timestamp: Number(p.timestamp),
            status: Number(p.status),
            auditor: p.auditor,
            empresaId: p.empresaId,
            localColeta: p.localColeta,
            dataColeta: p.dataColeta,
          };
        })
      );

      lista.sort((a, b) => b.id - a.id);
      setPesagens(lista);

      const totalEnviados = lista.reduce((s, p) => s + p.pesoKg, 0);
      const totalValidados = lista.filter((p) => p.status === 1).reduce((s, p) => s + p.pesoKg, 0);
      const totalPendentes = lista.filter((p) => p.status === 0).reduce((s, p) => s + p.pesoKg, 0);
      const totalRejeitados = lista.filter((p) => p.status === 2).reduce((s, p) => s + p.pesoKg, 0);
      setStats({ enviados: totalEnviados, validados: totalValidados, pendentes: totalPendentes, rejeitados: totalRejeitados });

      const empresasUnicas = [...new Set(lista.filter((p) => p.status === 1).map((p) => p.empresaId))];
      const selosLista = (
        await Promise.all(
          empresasUnicas.map(async (empresaId) => {
            const tokenIds = await seal.getSelosPorEmpresa(empresaId);
            return Promise.all(
              tokenIds.map(async (tokenId) => {
                const kg = await seal.seloKg(Number(tokenId));
                return { tokenId: Number(tokenId), empresaId, kg: Number(kg) };
              })
            );
          })
        )
      ).flat();

      setSelos(selosLista);
    } catch (e) {
      setErro("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!address) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Verificando permissões...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">Cooperativa</span>
            <span className="text-green-200 text-xs font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        {loading ? (
          <p className="text-gray-400 text-center py-20">Carregando dados da blockchain...</p>
        ) : (
          <>
            {/* Info + ação */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-800">{info?.nome || "Cooperativa"}</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {info?.material} · {info?.cidade}/{info?.estado} · CNPJ: {info?.cnpj}
                </p>
              </div>
              <Link
                href="/cooperativa/pesagem"
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                + Nova Pesagem
              </Link>
            </div>

            {erro && (
              <div className="mb-6 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm">{erro}</div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              <StatCard label="Kg enviados" value={stats.enviados.toLocaleString()} cor="text-gray-700" />
              <StatCard label="Kg validados" value={stats.validados.toLocaleString()} cor="text-green-600" />
              <StatCard label="Kg pendentes" value={stats.pendentes.toLocaleString()} cor="text-yellow-600" />
              <StatCard label="Kg rejeitados" value={stats.rejeitados.toLocaleString()} cor="text-red-500" />
            </div>

            {/* Tabela de pesagens */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 mb-10 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">Histórico de Pesagens ({pesagens.length})</h2>
              </div>
              {pesagens.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">Nenhuma pesagem registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">ID</th>
                        <th className="px-4 py-3 text-left">Data</th>
                        <th className="px-4 py-3 text-left">Empresa</th>
                        <th className="px-4 py-3 text-left">Material</th>
                        <th className="px-4 py-3 text-right">Peso</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-left">Auditor</th>
                        <th className="px-4 py-3 text-center">Evidências</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pesagens.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-gray-700">#{p.id}</td>
                          <td className="px-4 py-3 text-gray-500">{new Date(p.timestamp * 1000).toLocaleDateString("pt-BR")}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.empresaId}</td>
                          <td className="px-4 py-3 text-gray-700">{p.material}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">{p.pesoKg} kg</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COR[p.status]}`}>
                              {STATUS_LABEL[p.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">
                            {p.auditor !== "0x0000000000000000000000000000000000000000"
                              ? `${p.auditor.slice(0, 6)}...${p.auditor.slice(-4)}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <a href={getIPFSUrl(p.ipfsHash)} target="_blank" rel="noopener noreferrer" className="text-green-600 text-xs underline hover:text-green-700">
                              Ver →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Selos emitidos */}
            {selos.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-800 text-lg mb-4">Selos Verdes Emitidos ({selos.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {selos.map((s) => (
                    <div key={s.tokenId} className="bg-white rounded-2xl shadow p-5 border border-green-100">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">🏅</span>
                        <div>
                          <p className="font-bold text-green-700 text-sm">Selo Verde #{s.tokenId}</p>
                          <p className="text-gray-500 text-xs">{s.empresaId}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 text-xs mb-3">{s.kg.toLocaleString()} kg certificados</p>
                      <QRDisplay empresaId={s.empresaId} compact />
                      <Link
                        href={`/empresa/${encodeURIComponent(s.empresaId)}`}
                        className="mt-3 block text-center text-green-700 border border-green-300 hover:bg-green-50 text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        Abrir página pública →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, cor }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 text-center border border-gray-100">
      <p className={`text-2xl font-extrabold ${cor}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  );
}
