"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import LedgerABI from "../lib/RecyclingLedgerABI.json";

const LEDGER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_LEDGER;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const SEPOLIA_CHAIN_ID = "0xaa36a7";

const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const COOPERATIVA_ROLE = ethers.id("COOPERATIVA_ROLE");
const AUDITOR_ROLE = ethers.id("AUDITOR_ROLE");

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [roles, setRoles] = useState({ isAdmin: false, isAuditor: false, isCooperativa: false });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const checkRoles = useCallback(async (addr) => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { batchMaxCount: 1, batchStallTime: 0 });
      const ledger = new ethers.Contract(LEDGER_ADDRESS, LedgerABI, provider);
      const isAdmin = await ledger.hasRole(DEFAULT_ADMIN_ROLE, addr);
      const isAuditor = await ledger.hasRole(AUDITOR_ROLE, addr);
      const isCooperativa = await ledger.hasRole(COOPERATIVA_ROLE, addr);
      setRoles({ isAdmin, isAuditor, isCooperativa });
    } catch {
      setRoles({ isAdmin: false, isAuditor: false, isCooperativa: false });
    }
  }, []);

  const conectar = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask não encontrado. Instale a extensão.");
    }
    setLoading(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (e) {
          if (e.code === 4902) {
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
            throw new Error("Por favor, conecte na rede Sepolia.");
          }
        }
      }
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const addr = accounts[0];
      setAddress(addr);
      await checkRoles(addr);
      setLoaded(true); // garante o redirect mesmo se o efeito de montagem saiu antes do ethereum existir
      return addr;
    } finally {
      setLoading(false);
    }
  }, [checkRoles]);

  const desconectar = useCallback(() => {
    setAddress(null);
    setRoles({ isAdmin: false, isAuditor: false, isCooperativa: false });
  }, []);

  const refreshRoles = useCallback(() => {
    if (address) checkRoles(address);
  }, [address, checkRoles]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) { setLoaded(true); return; }
    window.ethereum.request({ method: "eth_accounts" }).then(async (accounts) => {
      if (accounts[0]) {
        setAddress(accounts[0]);
        await checkRoles(accounts[0]);
      }
      setLoaded(true);
    }).catch(() => { setLoaded(true); });

    const onAccountsChanged = (accounts) => {
      if (accounts[0]) {
        setAddress(accounts[0]);
        checkRoles(accounts[0]);
      } else {
        desconectar();
      }
    };
    window.ethereum.on("accountsChanged", onAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", onAccountsChanged);
  }, [checkRoles, desconectar]);

  return (
    <WalletContext.Provider value={{ address, roles, loading, loaded, conectar, desconectar, refreshRoles }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
