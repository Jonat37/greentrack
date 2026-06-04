"use client";
import { WalletProvider } from "../contexts/WalletContext";

export function Providers({ children }) {
  return <WalletProvider>{children}</WalletProvider>;
}
