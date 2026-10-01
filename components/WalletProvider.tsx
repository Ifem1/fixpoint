"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NETWORK } from "@/lib/network";
import {
  describeWalletError,
  getAuthorizedAccounts,
  getChainId,
  getInjectedProvider,
  listenToWallet,
  requestAccounts,
  switchToStudionet,
  type Eip1193Provider,
} from "@/lib/wallet";

interface WalletState {
  account: string | null;
  chainId: number | null;
  provider: Eip1193Provider | null;
  connected: boolean;
  correctNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    const injected = getInjectedProvider();
    if (!injected) return;
    let active = true;
    const restoreGeneration = generation.current;

    const accountsChanged = (accounts: string[]) => {
      generation.current += 1;
      const currentGeneration = generation.current;
      setAccount(accounts[0] ?? null);
      setProvider(accounts[0] ? injected : null);
      if (!accounts[0]) setChainId(null);
      setError(null);
      if (accounts[0]) {
        void getChainId(injected).then((id) => {
          if (active && generation.current === currentGeneration) setChainId(id);
        }).catch(() => { if (active && generation.current === currentGeneration) setChainId(null); });
      }
    };
    const chainChanged = (id: number | null) => {
      setChainId(id);
      if (id === NETWORK.chainId) setError(null);
    };
    const stopListening = listenToWallet(injected, accountsChanged, chainChanged);

    void getAuthorizedAccounts(injected).then(async (accounts) => {
      if (!active || generation.current !== restoreGeneration || !accounts[0]) return;
      setAccount(accounts[0]);
      setProvider(injected);
      try {
        const id = await getChainId(injected);
        if (active && generation.current === restoreGeneration) setChainId(id);
      } catch {
        if (active && generation.current === restoreGeneration) setChainId(null);
      }
    }).catch(() => {
      // An unavailable wallet leaves the frontend disconnected.
    });

    return () => {
      active = false;
      stopListening();
    };
  }, []);

  const connect = useCallback(async () => {
    generation.current += 1;
    const connectGeneration = generation.current;
    setError(null);
    try {
      const injected = getInjectedProvider();
      if (!injected) throw new Error("No injected EVM wallet was detected.");
      const accounts = await requestAccounts(injected);
      if (!accounts[0]) throw new Error("The wallet returned no account.");
      if (generation.current !== connectGeneration) return;
      setProvider(injected);
      setAccount(accounts[0]);
      try {
        const id = await getChainId(injected);
        if (generation.current === connectGeneration) setChainId(id);
      } catch {
        if (generation.current === connectGeneration) setChainId(null);
      }
    } catch (cause) {
      if (generation.current === connectGeneration) setError(describeWalletError(cause));
    }
  }, []);

  const disconnect = useCallback(() => {
    generation.current += 1;
    setAccount(null);
    setProvider(null);
    setChainId(null);
    setError(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!provider) {
      setError("Connect an injected wallet first.");
      return;
    }
    const switchGeneration = generation.current;
    setError(null);
    try {
      const verifiedChainId = await switchToStudionet(provider);
      if (generation.current === switchGeneration) setChainId(verifiedChainId);
    } catch (cause) {
      if (generation.current !== switchGeneration) return;
      setError(describeWalletError(cause));
      try {
        const id = await getChainId(provider);
        if (generation.current === switchGeneration) setChainId(id);
      } catch {
        if (generation.current === switchGeneration) setChainId(null);
      }
    }
  }, [provider]);

  const value = useMemo<WalletState>(
    () => ({
      account,
      chainId,
      provider,
      connected: Boolean(account && provider),
      correctNetwork: Boolean(account && provider && chainId === NETWORK.chainId),
      error,
      connect,
      disconnect,
      switchNetwork,
    }),
    [account, chainId, provider, error, connect, disconnect, switchNetwork],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
