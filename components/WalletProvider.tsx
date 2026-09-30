"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NETWORK } from "@/lib/network";
import {
  describeWalletError,
  discoverInjectedWallets,
  getChainId,
  requestAccounts,
  switchToStudionet,
  type Eip1193Provider,
  type InjectedWalletInfo,
} from "@/lib/wallet";

interface WalletState {
  wallets: InjectedWalletInfo[];
  account: string | null;
  chainId: number | null;
  provider: Eip1193Provider | null;
  walletName: string | null;
  connected: boolean;
  correctNetwork: boolean;
  error: string | null;
  connect: (uuid?: string) => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<InjectedWalletInfo[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => discoverInjectedWallets(setWallets), []);

  useEffect(() => {
    if (!provider?.on) return;
    const accountsChanged = (...args: unknown[]) => {
      const values = Array.isArray(args[0]) ? args[0].map(String) : [];
      setAccount(values[0] ?? null);
      if (!values.length) {
        setProvider(null);
        setWalletName(null);
      }
    };
    const chainChanged = (...args: unknown[]) => {
      const value = String(args[0] ?? "");
      const parsed = Number.parseInt(value, 16);
      setChainId(Number.isFinite(parsed) ? parsed : null);
    };
    provider.on("accountsChanged", accountsChanged);
    provider.on("chainChanged", chainChanged);
    return () => {
      provider.removeListener?.("accountsChanged", accountsChanged);
      provider.removeListener?.("chainChanged", chainChanged);
    };
  }, [provider]);

  const connect = useCallback(
    async (uuid?: string) => {
      setError(null);
      try {
        const chosen = wallets.find((item) => item.uuid === uuid) ?? wallets[0];
        if (!chosen) throw new Error("No injected EVM wallet was detected.");
        const accounts = await requestAccounts(chosen.provider);
        if (!accounts[0]) throw new Error("The wallet returned no account.");
        setProvider(chosen.provider);
        setWalletName(chosen.name);
        setAccount(accounts[0]);
        setChainId(await getChainId(chosen.provider));
      } catch (cause) {
        const message = describeWalletError(cause);
        setError(message);
        throw new Error(message);
      }
    },
    [wallets],
  );

  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setWalletName(null);
    setChainId(null);
    setError(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!provider) throw new Error("Connect an injected wallet first.");
    setError(null);
    try {
      await switchToStudionet(provider);
      setChainId(await getChainId(provider));
    } catch (cause) {
      const message = describeWalletError(cause);
      setError(message);
      throw new Error(message);
    }
  }, [provider]);

  const value = useMemo<WalletState>(
    () => ({
      wallets,
      account,
      chainId,
      provider,
      walletName,
      connected: Boolean(account && provider),
      correctNetwork: chainId === NETWORK.chainId,
      error,
      connect,
      disconnect,
      switchNetwork,
    }),
    [wallets, account, chainId, provider, walletName, error, connect, disconnect, switchNetwork],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
