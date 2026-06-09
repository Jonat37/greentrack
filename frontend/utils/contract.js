import { ethers } from "ethers";
import LedgerABI from "../lib/RecyclingLedgerABI.json";
import SealABI from "../lib/GreenSealABI.json";
import { cleanEnv } from "./cleanEnv";

// Endereços sanitizados (cleanEnv remove BOM/espaços que a CLI do Windows pode
// grudar no valor e quebram o ethers como "ENS name"), com fallback público.

export const LEDGER_ADDRESS = cleanEnv(process.env.NEXT_PUBLIC_CONTRACT_LEDGER) || "0x602AE94DAbA2D99a0253c5e010a3d9dc77ACB616";
export const SEAL_ADDRESS   = cleanEnv(process.env.NEXT_PUBLIC_CONTRACT_SEAL)   || "0x46769676B561D5981F2569A57a4de5ABA78fD011";
const RPC_URL               = cleanEnv(process.env.NEXT_PUBLIC_RPC_URL)         || "https://sepolia.infura.io/v3/99ef2b815dc94389ac1728038f287999";
const SEPOLIA_CHAIN_ID = "0xaa36a7";
const SEPOLIA_CHAIN_ID_NUM = 11155111;

// Bloco de criação dos contratos do Deploy #3 (2026-06-04). Piso da varredura
// de eventos — evita varrer a chain desde o genesis. Configurável por env.
export const DEPLOY_BLOCK = Number(process.env.NEXT_PUBLIC_DEPLOY_BLOCK) || 10989000;

// Tamanho de chunk para o fallback em provedores que limitam o range de
// eth_getLogs (Infura não limita por range com filtro indexado, mas outros sim).
const LOG_CHUNK = 9000;

/**
 * queryFilter robusto: varre de DEPLOY_BLOCK até o bloco atual, sem janela fixa.
 * Use sempre com um filtro INDEXADO (ex.: filters.SeloEmitido(tokenId)) para
 * que o conjunto de resultados seja pequeno. Tenta o range inteiro de uma vez
 * (rápido no Infura) e, se o provedor recusar, pagina em chunks de LOG_CHUNK.
 */
export async function queryFilterRobust(contract, filter, toBlock) {
  const provider = contract.runner?.provider;
  const latest = toBlock ?? (await provider.getBlockNumber());

  try {
    return await contract.queryFilter(filter, DEPLOY_BLOCK, latest);
  } catch {
    const all = [];
    for (let start = DEPLOY_BLOCK; start <= latest; start += LOG_CHUNK + 1) {
      const end = Math.min(start + LOG_CHUNK, latest);
      try {
        const logs = await contract.queryFilter(filter, start, end);
        if (logs.length) all.push(...logs);
      } catch {
        // chunk individual falhou — continua; melhor faltar 1 hash que quebrar tudo
      }
    }
    return all;
  }
}

function makeProvider() {
  return new ethers.JsonRpcProvider(RPC_URL, undefined, { batchMaxCount: 1, batchStallTime: 0 });
}

export function getLedgerReadOnly() {
  return new ethers.Contract(LEDGER_ADDRESS, LedgerABI, makeProvider());
}

export function getLedgerSigner(signer) {
  return new ethers.Contract(LEDGER_ADDRESS, LedgerABI, signer);
}

export function getSealReadOnly() {
  return new ethers.Contract(SEAL_ADDRESS, SealABI, makeProvider());
}

export function getSealSigner(signer) {
  return new ethers.Contract(SEAL_ADDRESS, SealABI, signer);
}

export function getVerifyUrl(tokenId) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/verify/${SEPOLIA_CHAIN_ID_NUM}/${SEAL_ADDRESS}/${tokenId}`;
}

export function getEtherscanTx(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

export function getEtherscanAddress(address) {
  return `https://sepolia.etherscan.io/address/${address}`;
}

export function getEtherscanToken(tokenId) {
  return `https://sepolia.etherscan.io/token/${SEAL_ADDRESS}?a=${tokenId}`;
}

export async function conectarCarteira() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask não encontrado. Instale a extensão MetaMask.");
  }
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId !== SEPOLIA_CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: SEPOLIA_CHAIN_ID,
            chainName: "Ethereum Sepolia Testnet",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org/"],
            blockExplorerUrls: ["https://sepolia.etherscan.io/"],
          }],
        });
      } else {
        throw new Error("Conecte sua carteira na rede Ethereum Sepolia.");
      }
    }
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { signer, address };
}
