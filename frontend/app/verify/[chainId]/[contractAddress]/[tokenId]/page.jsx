"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLedgerReadOnly, getSealReadOnly, getVerifyUrl, getIPFSUrl, getEtherscanAddress, getEtherscanTx, getEtherscanToken } from "../../../../../utils/contract";
import { getIPFSUrl as ipfsUrl } from "../../../../../utils/ipfs";
import QRDisplay from "../../../../../components/QRDisplay";

const SEAL_ADDRESS   = process.env.NEXT_PUBLIC_CONTRACT_SEAL;
const LEDGER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_LEDGER;
const SEPOLIA_CHAIN_ID = "11155111";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function VerifyPage() {
  const { chainId, contractAddress, tokenId } = useParams();

  const [selo,    setSelo]    = useState(null);
  const [pesagens, setPesagens] = useState([]);
  const [txData,  setTxData]  = useState({});   // { mintTxHash, pesagemTxs: { id: { reg, val } } }
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [erro,    setErro]    = useState("");

  const isValidChain    = chainId === SEPOLIA_CHAIN_ID;
  const isValidContract = contractAddress?.toLowerCase() === SEAL_ADDRESS?.toLowerCase();
  const tokenIdNum      = Number(tokenId);

  useEffect(() => {
    if (!isValidChain || !isValidContract || !tokenIdNum) {
      setErro("URL de verificação inválida. Verifique os parâmetros.");
      setLoading(false);
      return;
    }
    carregarDados();
  }, [tokenId]);

  async function carregarDados() {
    try {
      const seal   = getSealReadOnly();
      const ledger = getLedgerReadOnly();

      const empresaId = await seal.seloEmpresa(tokenIdNum); await delay(120);
      const totalKg   = Number(await seal.seloKg(tokenIdNum)); await delay(120);

      setSelo({ tokenId: tokenIdNum, empresaId, totalKg });

      const pesagemIds = await ledger.getPesagensPorEmpresa(empresaId); await delay(120);

      const lista = [];
      for (const id of pesagemIds) {
        const p = await ledger.pesagens(Number(id));
        lista.push({
          id:          Number(p.id),
          material:    p.material,
          pesoKg:      Number(p.pesoKg),
          cooperativa: p.cooperativa,
          auditor:     p.auditor,
          ipfsHash:    p.ipfsHash,
          timestamp:   Number(p.timestamp),
          empresaId:   p.empresaId,
        });
        await delay(100);
      }
      setPesagens(lista);

      // Tenta buscar hashes de transações via eventos
      buscarTxHashes(seal, ledger, tokenIdNum, lista.map((p) => p.id));
    } catch (e) {
      setErro("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function buscarTxHashes(seal, ledger, tid, pesagemIds) {
    setTxLoading(true);
    try {
      const provider    = seal.runner.provider;
      const latest      = await provider.getBlockNumber();
      const fromBlock   = Math.max(0, latest - 9000);

      // Evento de mint do selo
      const [sealEvents, regEvents, valEvents] = await Promise.all([
        seal.queryFilter(seal.filters.SeloEmitido(BigInt(tid)), fromBlock).catch(() => []),
        ledger.queryFilter(ledger.filters.PesagemRegistrada(), fromBlock).catch(() => []),
        ledger.queryFilter(ledger.filters.PesagemValidada(),   fromBlock).catch(() => []),
      ]);

      const mintTxHash = sealEvents[0]?.transactionHash || null;

      const pesagemTxs = {};
      for (const id of pesagemIds) {
        const reg = regEvents.find((e) => Number(e.args?.id) === id)?.transactionHash || null;
        const val = valEvents.find((e) => Number(e.args?.id) === id)?.transactionHash || null;
        pesagemTxs[id] = { reg, val };
      }

      setTxData({ mintTxHash, pesagemTxs });
    } catch {
      // Silencioso — exibe links do Etherscan como fallback
    } finally {
      setTxLoading(false);
    }
  }

  const verifyUrl  = getVerifyUrl(tokenIdNum);
  const materials  = [...new Set(pesagens.map((p) => p.material).filter(Boolean))];
  const cooperativas = [...new Set(pesagens.map((p) => p.cooperativa))];

  if (!isValidChain || !isValidContract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-800 font-bold mb-2">URL de verificação inválida</p>
          <p className="text-gray-500 text-sm">Os parâmetros da URL não correspondem à rede ou contrato esperados.</p>
          <Link href="/dashboard" className="mt-5 inline-block text-green-600 underline text-sm">Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-extrabold tracking-tight">GreenTrack</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">Verificação On-Chain</span>
            <Link href="/dashboard" className="text-green-200 text-sm hover:text-white">Dashboard →</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Consultando a blockchain...</p>
          </div>
        ) : erro ? (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-2xl px-6 py-8 text-center">
            <p className="text-2xl mb-2">❌</p>
            <p className="font-semibold">{erro}</p>
            <Link href="/dashboard" className="mt-4 inline-block text-green-600 underline text-sm">Voltar ao dashboard</Link>
          </div>
        ) : selo && (
          <>
            {/* ── Cabeçalho do Selo ────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row gap-8 mb-10">
              {/* Info do Selo */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">🏅</span>
                  <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Selo Verde #{selo.tokenId}</h1>
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                      ✅ Válido — Emitido na blockchain
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col gap-3 text-sm">
                  <Row label="Token ID"       value={`#${selo.tokenId}`} mono />
                  <Row label="Empresa"         value={selo.empresaId} mono />
                  <Row label="Kg certificados" value={`${selo.totalKg.toLocaleString()} kg`} bold green />
                  <Row label="Material(is)"    value={materials.join(", ") || "—"} />
                  <Row label="Status"          value="✅ Válido" />
                  <Row label="Rede"            value="Ethereum Sepolia (chainId: 11155111)" />
                  <Row label="Contrato GreenSeal" value={SEAL_ADDRESS} mono link={getEtherscanAddress(SEAL_ADDRESS)} />
                  <Row label="Contrato Ledger"    value={LEDGER_ADDRESS} mono link={getEtherscanAddress(LEDGER_ADDRESS)} />

                  {txLoading ? (
                    <div className="text-gray-400 text-xs animate-pulse">Buscando hash da transação de mint...</div>
                  ) : txData.mintTxHash ? (
                    <Row label="Transação de mint" value={`${txData.mintTxHash.slice(0, 16)}...`} mono link={getEtherscanTx(txData.mintTxHash)} />
                  ) : (
                    <Row label="Transação de mint" value="Ver no Etherscan ↗" link={`https://sepolia.etherscan.io/token/${SEAL_ADDRESS}?a=${selo.tokenId}`} />
                  )}
                </div>

                {/* Cooperativas envolvidas */}
                <div className="mt-4 bg-white rounded-2xl shadow border border-gray-100 p-5">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-3">Cooperativas envolvidas</p>
                  {cooperativas.map((c) => (
                    <div key={c} className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                      <span className="text-green-600">♻️</span>
                      <a href={getEtherscanAddress(c)} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-green-600 transition-colors">
                        {c.slice(0, 10)}...{c.slice(-6)} ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-3">
                <QRDisplay url={verifyUrl} />
                <p className="text-xs text-gray-400 text-center max-w-xs">
                  Este QR Code contém a URL pública de verificação deste Selo Verde na blockchain.
                </p>
                <a
                  href={getEtherscanToken(selo.tokenId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 underline hover:text-green-700"
                >
                  Ver NFT no Etherscan ↗
                </a>
              </div>
            </div>

            {/* ── Bloco On-chain vs Off-chain ──────────────────────────────── */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-10">
              <h2 className="text-blue-800 font-bold mb-2 flex items-center gap-2">
                <span>🔗</span> On-chain vs Off-chain
              </h2>
              <p className="text-blue-700 text-sm leading-relaxed">
                Os dados críticos do impacto ficam <strong>on-chain</strong>: peso em kg, tipo de material, endereço da cooperativa, auditor responsável, status da pesagem, CID IPFS e NFT emitido. As evidências físicas, como fotos do tíquete da balança e dos fardos, ficam <strong>off-chain no IPFS</strong>. A blockchain armazena o hash dessas evidências, garantindo rastreabilidade e integridade — qualquer alteração nas fotos invalidaria o hash, tornando a fraude detectável.
              </p>
            </div>

            {/* ── Pesagens vinculadas ──────────────────────────────────────── */}
            <div className="mb-10">
              <h2 className="text-lg font-bold text-gray-800 mb-1">
                Pesagens Certificadas ({pesagens.length})
              </h2>
              <p className="text-gray-500 text-sm mb-5">
                Pesagens validadas que contribuíram para a certificação desta empresa.
              </p>

              {pesagens.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma pesagem encontrada.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {pesagens.map((p) => {
                    const txs = txData.pesagemTxs?.[p.id];
                    return (
                      <div key={p.id} className="bg-white rounded-2xl shadow border border-gray-100 p-5">
                        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">✅ CERTIFICADA</span>
                              <span className="font-bold text-gray-800">Pesagem #{p.id}</span>
                            </div>
                            <p className="text-gray-500 text-xs">{new Date(p.timestamp * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-extrabold text-green-700">{p.pesoKg.toLocaleString()} kg</p>
                            <p className="text-gray-500 text-xs">{p.material}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <InfoRow label="Material"      value={p.material} />
                          <InfoRow label="Empresa"       value={p.empresaId} mono />
                          <InfoRow label="Cooperativa"   value={`${p.cooperativa.slice(0, 10)}...${p.cooperativa.slice(-6)}`} mono link={getEtherscanAddress(p.cooperativa)} />
                          <InfoRow label="Auditor"       value={p.auditor !== "0x0000000000000000000000000000000000000000" ? `${p.auditor.slice(0, 10)}...${p.auditor.slice(-6)}` : "—"} mono link={p.auditor !== "0x0000000000000000000000000000000000000000" ? getEtherscanAddress(p.auditor) : null} />
                          <InfoRow label="CID IPFS"      value={`${p.ipfsHash.slice(0, 20)}...`} link={ipfsUrl(p.ipfsHash)} />
                          <InfoRow label="Evidências"    value="Ver fotos no IPFS ↗" link={ipfsUrl(p.ipfsHash)} />

                          {txLoading ? (
                            <InfoRow label="Tx Registro"    value="Buscando..." />
                          ) : txs?.reg ? (
                            <InfoRow label="Tx Registro"    value={`${txs.reg.slice(0, 14)}...`} mono link={getEtherscanTx(txs.reg)} />
                          ) : (
                            <InfoRow label="Tx Registro"    value="Ver no Etherscan ↗" link={`https://sepolia.etherscan.io/address/${LEDGER_ADDRESS}#events`} />
                          )}

                          {txLoading ? (
                            <InfoRow label="Tx Validação"   value="Buscando..." />
                          ) : txs?.val ? (
                            <InfoRow label="Tx Validação"   value={`${txs.val.slice(0, 14)}...`} mono link={getEtherscanTx(txs.val)} />
                          ) : (
                            <InfoRow label="Tx Validação"   value="Ver no Etherscan ↗" link={`https://sepolia.etherscan.io/address/${LEDGER_ADDRESS}#events`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Rodapé de verificação ─────────────────────────────────────── */}
            <div className="bg-gray-100 rounded-2xl p-5 text-center text-xs text-gray-500">
              <p>Dados verificáveis publicamente na blockchain Ethereum Sepolia.</p>
              <p className="mt-1">
                Contrato:{" "}
                <a href={getEtherscanAddress(SEAL_ADDRESS)} target="_blank" rel="noopener noreferrer" className="text-green-600 underline font-mono">
                  {SEAL_ADDRESS}
                </a>
              </p>
              <p className="mt-1">
                Esta página é gerada dinamicamente a partir do estado atual da blockchain — nenhum dado é armazenado em banco de dados centralizado.
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="bg-green-900 text-green-200 text-sm text-center py-4 mt-10">
        GreenTrack · Verificação pública e imutável na blockchain Ethereum Sepolia
      </footer>
    </div>
  );
}

function Row({ label, value, mono, bold, green, link }) {
  const content = (
    <span className={`${mono ? "font-mono" : ""} ${bold ? "font-bold" : ""} ${green ? "text-green-700" : "text-gray-700"} break-all`}>
      {value}
    </span>
  );
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-xs whitespace-nowrap shrink-0">{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition-colors text-right">
          {content}
        </a>
      ) : (
        <div className="text-right">{content}</div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, link }) {
  const content = (
    <span className={`${mono ? "font-mono" : ""} text-gray-700 break-all`}>{value}</span>
  );
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs hover:text-green-600 transition-colors">
          {content}
        </a>
      ) : (
        <p className="text-xs">{content}</p>
      )}
    </div>
  );
}
