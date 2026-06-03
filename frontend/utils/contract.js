import { ethers } from "ethers";
import LedgerABI from "../lib/RecyclingLedgerABI.json";
import SealABI from "../lib/GreenSealABI.json";

const LEDGER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_LEDGER;
const SEAL_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_SEAL;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

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

const SEPOLIA_CHAIN_ID = "0xaa36a7";

/**
 * Conecta a carteira MetaMask do usuário, valida a rede Ethereum Sepolia e retorna o signer
 * @returns {Promise<{signer: ethers.Signer, address: string}>}
 */
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
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Ethereum Sepolia Testnet",
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org/"],
              blockExplorerUrls: ["https://sepolia.etherscan.io/"],
            },
          ],
        });
      } else {
        throw new Error("Conecte sua carteira na rede Ethereum Sepolia para continuar.");
      }
    }
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { signer, address };
}
