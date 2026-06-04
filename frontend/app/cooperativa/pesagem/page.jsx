"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../../../contexts/WalletContext";
import { conectarCarteira, getLedgerSigner, getLedgerReadOnly } from "../../../utils/contract";
import { uploadArquivoIPFS, criarMetadataPesagem } from "../../../utils/ipfs";

const MATERIAIS = ["PET", "Alumínio", "Papelão", "Vidro", "Eletrônicos", "Plástico Misto", "Outros"];

export default function NovaPesagem() {
  const { address, roles, loaded } = useWallet();
  const router = useRouter();
  const [empresas, setEmpresas] = useState([]);
  const [form, setForm] = useState({
    empresaId: "", material: "", pesoKg: "",
    localColeta: "", dataColeta: "", observacao: "",
  });
  const [fotoBalanca, setFotoBalanca] = useState(null);
  const [fotoFardos, setFotoFardos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ tipo: "", msg: "" });

  useEffect(() => {
    if (!loaded) return;
    if (!address || !roles.isCooperativa) router.push("/login");
  }, [address, roles, loaded, router]);

  useEffect(() => {
    async function carregarEmpresas() {
      try {
        const ledger = getLedgerReadOnly();
        const ids = await ledger.getListaEmpresasApoiadoras();
        const dados = await Promise.all(ids.map(async (id) => {
          const e = await ledger.empresasApoiadoras(id);
          return { id, nome: e.nome };
        }));
        setEmpresas(dados);
      } catch {}
    }
    if (roles.isCooperativa) carregarEmpresas();
  }, [roles.isCooperativa]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.empresaId || !form.material || !form.pesoKg || !fotoBalanca || !fotoFardos) {
      setStatus({ tipo: "erro", msg: "Preencha todos os campos obrigatórios e adicione as fotos." });
      return;
    }
    if (Number(form.pesoKg) <= 0) {
      setStatus({ tipo: "erro", msg: "O peso deve ser maior que zero." });
      return;
    }
    setLoading(true);
    try {
      setStatus({ tipo: "loading", msg: "📤 Enviando foto da balança para IPFS..." });
      const cidBalanca = await uploadArquivoIPFS(fotoBalanca);

      setStatus({ tipo: "loading", msg: "📤 Enviando foto dos fardos para IPFS..." });
      const cidFardos = await uploadArquivoIPFS(fotoFardos);

      setStatus({ tipo: "loading", msg: "🔗 Criando metadados no IPFS..." });
      const cidJSON = await criarMetadataPesagem({
        cidFotoBalanca: cidBalanca,
        cidFotoFardos: cidFardos,
        material: form.material,
        pesoKg: Number(form.pesoKg),
        empresaId: form.empresaId,
        localColeta: form.localColeta,
        dataColeta: form.dataColeta,
        observacao: form.observacao,
        timestamp: new Date().toISOString(),
      });

      setStatus({ tipo: "loading", msg: "⛓️ Conectando carteira..." });
      const { signer } = await conectarCarteira();
      const ledger = getLedgerSigner(signer);

      setStatus({ tipo: "loading", msg: "📝 Registrando pesagem na blockchain..." });
      const tx = await ledger.registrarPesagem(
        form.material,
        Number(form.pesoKg),
        cidJSON,
        form.empresaId,
        form.localColeta,
        form.dataColeta,
        form.observacao
      );
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log) => { try { return ledger.interface.parseLog(log); } catch { return null; } })
        .find((ev) => ev?.name === "PesagemRegistrada");
      const id = event ? event.args.id.toString() : "?";

      setStatus({ tipo: "sucesso", msg: `Pesagem #${id} registrada com sucesso! Aguardando validação do auditor.` });
    } catch (err) {
      setStatus({ tipo: "erro", msg: err.reason || err.message });
    } finally {
      setLoading(false);
    }
  }

  if (!address) return <div className="min-h-screen flex items-center justify-center text-gray-400">Verificando permissões...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <Link href="/cooperativa" className="text-green-200 text-sm hover:text-white">← Voltar ao painel</Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Nova Pesagem</h1>
        <p className="text-gray-500 text-sm mb-8">Registre uma coleta de material reciclável na blockchain.</p>

        {status.tipo === "sucesso" ? (
          <div className="bg-green-50 border border-green-300 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-green-800 font-semibold text-sm">{status.msg}</p>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={() => { setStatus({ tipo: "", msg: "" }); setForm({ empresaId: "", material: "", pesoKg: "", localColeta: "", dataColeta: "", observacao: "" }); setFotoBalanca(null); setFotoFardos(null); }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl text-sm">
                Nova pesagem
              </button>
              <Link href="/cooperativa" className="border border-green-600 text-green-700 hover:bg-green-50 font-bold py-2 px-6 rounded-xl text-sm">
                Ver histórico
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-5">
            {/* Empresa apoiadora */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa apoiadora *</label>
              {empresas.length > 0 ? (
                <select
                  value={form.empresaId}
                  onChange={(e) => set("empresaId", e.target.value)}
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Selecione a empresa</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome} ({e.id})</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.empresaId}
                  onChange={(e) => set("empresaId", e.target.value)}
                  placeholder="CNPJ ou código da empresa"
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              )}
            </div>

            {/* Material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de material *</label>
              <select value={form.material} onChange={(e) => set("material", e.target.value)} disabled={loading} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Selecione o material</option>
                {MATERIAIS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Peso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg) *</label>
              <input type="number" min="1" value={form.pesoKg} onChange={(e) => set("pesoKg", e.target.value)} placeholder="Ex: 350" disabled={loading} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            {/* Local e Data */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Local da coleta</label>
                <input type="text" value={form.localColeta} onChange={(e) => set("localColeta", e.target.value)} placeholder="Ex: Galpão Central SP" disabled={loading} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da pesagem</label>
                <input type="date" value={form.dataColeta} onChange={(e) => set("dataColeta", e.target.value)} disabled={loading} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            {/* Fotos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foto do tíquete da balança *</label>
              <input type="file" accept="image/*" onChange={(e) => setFotoBalanca(e.target.files[0] || null)} disabled={loading} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
              {fotoBalanca && <p className="text-xs text-gray-500 mt-1">📎 {fotoBalanca.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foto dos fardos / material *</label>
              <input type="file" accept="image/*" onChange={(e) => setFotoFardos(e.target.files[0] || null)} disabled={loading} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
              {fotoFardos && <p className="text-xs text-gray-500 mt-1">📎 {fotoFardos.name}</p>}
            </div>

            {/* Observação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
              <textarea value={form.observacao} onChange={(e) => set("observacao", e.target.value)} placeholder="Informações adicionais sobre a coleta..." disabled={loading} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>

            {status.tipo === "erro" && <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm">{status.msg}</div>}
            {status.tipo === "loading" && <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-4 py-3 text-sm animate-pulse">{status.msg}</div>}

            <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-3 rounded-xl transition-colors">
              {loading ? "Processando..." : "Registrar Pesagem na Blockchain"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
