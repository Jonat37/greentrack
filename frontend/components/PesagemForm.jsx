"use client";

import { useState } from "react";
import { uploadArquivoIPFS, criarMetadataPesagem } from "../utils/ipfs";
import { conectarCarteira, getLedgerSigner } from "../utils/contract";

const MATERIAIS = ["PET", "Alumínio", "Papelão", "Vidro", "Plástico Misto"];

export default function PesagemForm({ onSuccess }) {
  const [material, setMaterial] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [fotoBalanca, setFotoBalanca] = useState(null);
  const [fotoFardos, setFotoFardos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState("idle"); // idle | loading | success | error

  async function handleSubmit(e) {
    e.preventDefault();

    if (!material || !pesoKg || !empresaId || !fotoBalanca || !fotoFardos) {
      setStatusMsg("Preencha todos os campos obrigatórios.");
      setStatusType("error");
      return;
    }

    if (Number(pesoKg) <= 0) {
      setStatusMsg("O peso deve ser maior que zero.");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setStatusType("loading");

    try {
      setStatusMsg("📤 Enviando foto da balança para IPFS...");
      const cidBalanca = await uploadArquivoIPFS(fotoBalanca);

      setStatusMsg("📤 Enviando foto dos fardos para IPFS...");
      const cidFardos = await uploadArquivoIPFS(fotoFardos);

      setStatusMsg("🔗 Criando metadados no IPFS...");
      const cidJSON = await criarMetadataPesagem({
        cidFotoBalanca: cidBalanca,
        cidFotoFardos: cidFardos,
        material,
        pesoKg: Number(pesoKg),
        cooperativaId: "",
        empresaId,
        timestamp: new Date().toISOString(),
      });

      setStatusMsg("⛓️ Conectando carteira...");
      const { signer, address } = await conectarCarteira();

      const ledger = getLedgerSigner(signer);

      setStatusMsg("📝 Registrando pesagem na blockchain...");
      const tx = await ledger.registrarPesagem(material, Number(pesoKg), cidJSON, empresaId);
      const receipt = await tx.wait();

      // Extrair ID da pesagem do evento emitido
      const event = receipt.logs
        .map((log) => {
          try { return ledger.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "PesagemRegistrada");

      const id = event ? event.args.id.toString() : "?";

      setStatusMsg(`✅ Pesagem registrada com sucesso! ID: #${id}`);
      setStatusType("success");
      if (onSuccess) onSuccess(id);
    } catch (err) {
      setStatusMsg(`❌ Erro: ${err.message}`);
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  }

  const statusColors = {
    idle: "",
    loading: "bg-yellow-50 border-yellow-300 text-yellow-800",
    success: "bg-green-50 border-green-300 text-green-800",
    error: "bg-red-50 border-red-300 text-red-800",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
      <h2 className="text-2xl font-bold text-green-700 mb-6">🌿 Registrar Pesagem</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={loading}
          >
            <option value="">Selecione o material</option>
            {MATERIAIS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg) *</label>
          <input
            type="number"
            min="1"
            value={pesoKg}
            onChange={(e) => setPesoKg(e.target.value)}
            placeholder="Ex: 350"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ ou ID da Empresa *</label>
          <input
            type="text"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            placeholder="CNPJ ou ID da empresa"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Foto da Balança *</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFotoBalanca(e.target.files[0] || null)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            disabled={loading}
          />
          {fotoBalanca && <p className="text-xs text-gray-500 mt-1">📎 {fotoBalanca.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Foto dos Fardos *</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFotoFardos(e.target.files[0] || null)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            disabled={loading}
          />
          {fotoFardos && <p className="text-xs text-gray-500 mt-1">📎 {fotoFardos.name}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? "Processando..." : "Registrar Pesagem"}
        </button>
      </form>

      {statusMsg && (
        <div className={`mt-4 border rounded-lg px-4 py-3 text-sm font-medium ${statusColors[statusType]}`}>
          {statusMsg}
        </div>
      )}
    </div>
  );
}
