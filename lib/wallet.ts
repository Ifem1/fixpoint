"use client";

import { NETWORK } from "./network";

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const provider = (window as typeof window & { ethereum?: Eip1193Provider }).ethereum;
  return provider && typeof provider.request === "function" ? provider : null;
}

export async function getAuthorizedAccounts(provider: Eip1193Provider): Promise<string[]> {
  const accounts = await provider.request({ method: "eth_accounts" });
  return Array.isArray(accounts) ? accounts.map(String) : [];
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

export function listenToWallet(
  provider: Eip1193Provider,
  onAccountsChanged: (accounts: string[]) => void,
  onChainChanged: (chainId: number | null) => void,
) {
  const accountsChanged = (...args: unknown[]) => {
    const accounts = Array.isArray(args[0]) ? args[0].map(String) : [];
    onAccountsChanged(accounts);
  };
  const chainChanged = (...args: unknown[]) => {
    const value = String(args[0] ?? "");
    const parsed = Number.parseInt(value, 16);
    onChainChanged(Number.isFinite(parsed) ? parsed : null);
  };
  provider.on?.("accountsChanged", accountsChanged);
  provider.on?.("chainChanged", chainChanged);
  return () => {
    provider.removeListener?.("accountsChanged", accountsChanged);
    provider.removeListener?.("chainChanged", chainChanged);
  };
}

function walletErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as {
    code?: unknown;
    data?: { code?: unknown; originalError?: { code?: unknown } };
    cause?: { code?: unknown; data?: { code?: unknown; originalError?: { code?: unknown } } };
  };
  const candidates = [
    value.code,
    value.data?.code,
    value.data?.originalError?.code,
    value.cause?.code,
    value.cause?.data?.code,
    value.cause?.data?.originalError?.code,
  ];
  const codes = candidates.map((candidate) =>
    typeof candidate === "number" || (typeof candidate === "string" && /^-?\d+$/.test(candidate))
      ? Number(candidate) : undefined,
  );
  return codes.find((code) => code === 4001 || code === -32002)
    ?? codes.find((code) => code === 4902)
    ?? codes.find((code) => code !== undefined);
}

function walletErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";
  const value = error as {
    message?: unknown;
    data?: string | { message?: unknown; originalError?: { message?: unknown } };
    cause?: string | { message?: unknown; data?: { message?: unknown; originalError?: { message?: unknown } } };
  };
  const data = typeof value.data === "object" ? value.data : undefined;
  const cause = typeof value.cause === "object" ? value.cause : undefined;
  return [
    value.message,
    value.data,
    data?.message,
    data?.originalError?.message,
    value.cause,
    cause?.message,
    cause?.data?.message,
    cause?.data?.originalError?.message,
  ].filter((message): message is string => typeof message === "string").join(" ");
}

function isUnknownChainError(error: unknown): boolean {
  const code = walletErrorCode(error);
  if (code === 4001 || code === -32002) return false;
  return code === 4902 || /unrecognized chain|unknown chain(?: id)?|chain id .*not (?:found|added|configured)/i.test(walletErrorMessage(error));
}

export async function switchToStudionet(provider: Eip1193Provider) {
  if (await getChainId(provider) === NETWORK.chainId) return NETWORK.chainId;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORK.chainIdHex }],
    });
  } catch (error) {
    if (!isUnknownChainError(error)) throw error;
    try {
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
    } catch (addError) {
      const addCode = walletErrorCode(addError);
      if (addCode === 4001 || addCode === -32002) throw addError;
      throw new Error("Studionet could not be configured in this wallet.");
    }
    if (await getChainId(provider) !== NETWORK.chainId) {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: NETWORK.chainIdHex }],
      });
    }
  }
  const chainId = await getChainId(provider);
  if (chainId !== NETWORK.chainId) {
    throw new Error(`Could not switch to Studionet. Current chain is ${chainId ?? "unknown"}.`);
  }
  return chainId;
}

export function describeWalletError(error: unknown) {
  const code = walletErrorCode(error);
  if (code === 4001) return "Wallet request rejected.";
  if (code === -32002) return "A wallet request is already open. Check your wallet.";
  if (code === 4902 || isUnknownChainError(error)) return "Studionet could not be configured in this wallet.";
  const message = walletErrorMessage(error).trim();
  if (message) return message.slice(0, 180);
  return "Wallet request failed.";
}
