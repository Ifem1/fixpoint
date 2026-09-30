"use client";

import { NETWORK } from "./network";

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface InjectedWalletInfo {
  uuid: string;
  name: string;
  icon?: string;
  rdns?: string;
  provider: Eip1193Provider;
}

interface Eip6963AnnounceEvent extends Event {
  detail: {
    info: { uuid: string; name: string; icon: string; rdns: string };
    provider: Eip1193Provider;
  };
}

export function discoverInjectedWallets(onUpdate: (wallets: InjectedWalletInfo[]) => void) {
  if (typeof window === "undefined") return () => undefined;
  const found = new Map<string, InjectedWalletInfo>();

  const emit = () => onUpdate(Array.from(found.values()));
  const handler = (event: Event) => {
    const announced = event as Eip6963AnnounceEvent;
    const { info, provider } = announced.detail ?? {};
    if (!info?.uuid || !provider) return;
    found.set(info.uuid, { ...info, provider });
    emit();
  };

  window.addEventListener("eip6963:announceProvider", handler);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  const legacy = (window as typeof window & { ethereum?: Eip1193Provider }).ethereum;
  if (legacy) {
    found.set("legacy-window-ethereum", {
      uuid: "legacy-window-ethereum",
      name: "Injected wallet",
      provider: legacy,
    });
    emit();
  }

  return () => window.removeEventListener("eip6963:announceProvider", handler);
}

export async function requestAccounts(provider: Eip1193Provider): Promise<string[]> {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  return Array.isArray(accounts) ? accounts.map(String) : [];
}

export async function getChainId(provider: Eip1193Provider): Promise<number | null> {
  const result = await provider.request({ method: "eth_chainId" });
  if (typeof result !== "string") return null;
  const parsed = Number.parseInt(result, 16);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function switchToStudionet(provider: Eip1193Provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORK.chainIdHex }],
    });
  } catch (error) {
    const maybe = error as { code?: number };
    if (maybe.code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: NETWORK.chainIdHex,
          chainName: NETWORK.name,
          nativeCurrency: NETWORK.currency,
          rpcUrls: [NETWORK.rpcUrl],
          blockExplorerUrls: [NETWORK.explorerUrl],
        },
      ],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORK.chainIdHex }],
    });
  }
}

export function describeWalletError(error: unknown) {
  const maybe = error as { code?: number; message?: string };
  if (maybe?.code === 4001) return "Wallet request rejected.";
  if (maybe?.code === -32002) return "A wallet request is already open. Check your wallet.";
  if (maybe?.code === 4902) return "Studionet is not configured in this wallet.";
  if (maybe?.message) return maybe.message;
  return "Wallet request failed.";
}
