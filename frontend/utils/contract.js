import { ethers } from "ethers";
import LedgerABI from "../lib/RecyclingLedgerABI.json";
import SealABI from "../lib/GreenSealABI.json";

const LEDGER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_LEDGER;
const SEAL_ADDRESS   = process.env.NEXT_PUBLIC_CONTRACT_SEAL;
const RPC_URL        = process.env.NEXT_PUBLIC_RPC_URL;
const SEPOLIA_CHAIN_ID = "0xaa36a7";
const SEPOLIA_CHAIN_ID_NUM = 11155111;

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
