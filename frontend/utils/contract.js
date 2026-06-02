import { ethers } from "ethers";

const LEDGER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_LEDGER;
const SEAL_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_SEAL;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

// ABIs importadas dos artifacts compilados pelo Hardhat
let LedgerABI, SealABI;
try {
  LedgerABI = require("../../artifacts/contracts/RecyclingLedger.sol/RecyclingLedger.json").abi;
  SealABI = require("../../artifacts/contracts/GreenSeal.sol/GreenSeal.json").abi;
} catch {
  // Em ambiente de build sem artifacts, usar ABI mínima para leitura
  LedgerABI = [];
  SealABI = [];
}

/**
 * Retorna uma instância read-only do RecyclingLedger via JsonRpcProvider
 * @returns {ethers.Contract} Contrato conectado ao provider público
 */
export function getLedgerReadOnly() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(LEDGER_ADDRESS, LedgerABI, provider);
}

/**
 * Retorna uma instância do RecyclingLedger conectada ao signer (para escrita)
 * @param {ethers.Signer} signer - Signer da carteira conectada
 * @returns {ethers.Contract} Contrato pronto para transações
 */
export function getLedgerSigner(signer) {
  return new ethers.Contract(LEDGER_ADDRESS, LedgerABI, signer);
}

/**
 * Retorna uma instância read-only do GreenSeal via JsonRpcProvider
 * @returns {ethers.Contract} Contrato conectado ao provider público
 */
export function getSealReadOnly() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(SEAL_ADDRESS, SealABI, provider);
}

const AMOY_CHAIN_ID = "0x13882";

/**
 * Conecta a carteira MetaMask do usuário, valida a rede Polygon Amoy e retorna o signer
 * @returns {Promise<{signer: ethers.Signer, address: string}>}
 */
export async function conectarCarteira() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask não encontrado. Instale a extensão MetaMask.");
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });

  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });

  if (currentChainId !== AMOY_CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: AMOY_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: AMOY_CHAIN_ID,
              chainName: "Polygon Amoy Testnet",
              nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
              rpcUrls: ["https://rpc-amoy.polygon.technology/"],
              blockExplorerUrls: ["https://amoy.polygonscan.com/"],
            },
          ],
        });
      } else {
        throw new Error("Conecte sua carteira na rede Polygon Amoy para continuar.");
      }
    }
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { signer, address };
}
