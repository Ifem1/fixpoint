import { afterEach, describe, expect, it } from "vitest";
import {
  describeWalletError,
  getAuthorizedAccounts,
  getChainId,
  getInjectedProvider,
  listenToWallet,
  requestAccounts,
  switchToStudionet,
  type Eip1193Provider,
} from "../../lib/wallet";

type Request = { method: string; params?: unknown[] | Record<string, unknown> };

function codedError(code: number | string) {
  return Object.assign(new Error(`provider error ${code}`), { code });
}

class FakeProvider implements Eip1193Provider {
  calls: Request[] = [];
  chainId = "0x1";
  accounts: string[] = [];
  firstSwitchError: unknown = null;
  addError: unknown = null;
  updateChainOnSwitch = true;
  updateChainOnAdd = false;
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  on(event: string, listener: (...args: unknown[]) => void) {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  removeListener(event: string, listener: (...args: unknown[]) => void) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, value: unknown) {
    this.listeners.get(event)?.forEach((listener) => listener(value));
  }

  async request(args: Request): Promise<unknown> {
    this.calls.push(args);
    if (args.method === "eth_accounts" || args.method === "eth_requestAccounts") return this.accounts;
    if (args.method === "wallet_switchEthereumChain") {
      if (this.firstSwitchError) {
        const error = this.firstSwitchError;
        this.firstSwitchError = null;
        throw error;
      }
      if (this.updateChainOnSwitch) this.chainId = "0xf22f";
      return null;
    }
    if (args.method === "wallet_addEthereumChain") {
      if (this.addError) throw this.addError;
      if (this.updateChainOnAdd) this.chainId = "0xf22f";
    }
    if (args.method === "eth_chainId") return this.chainId;
    return null;
  }
}

const originalWindow = globalThis.window;
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  else Reflect.deleteProperty(globalThis, "window");
});

describe("simple injected wallet", () => {
  it("connects directly through window.ethereum and requests accounts only on connect", async () => {
    const injected = new FakeProvider();
    injected.accounts = ["0x1234"];
    Object.defineProperty(globalThis, "window", { configurable: true, value: { ethereum: injected } });
    expect(getInjectedProvider()).toBe(injected);
    expect(await requestAccounts(getInjectedProvider()!)).toEqual(["0x1234"]);
    expect(injected.calls.map((call) => call.method)).toEqual(["eth_requestAccounts"]);
  });

  it("silently restores an approved account and reads its chain", async () => {
    const injected = new FakeProvider();
    injected.accounts = ["0x1234"];
    injected.chainId = "0xf22f";
    expect(await getAuthorizedAccounts(injected)).toEqual(["0x1234"]);
    expect(await getChainId(injected)).toBe(61999);
    expect(injected.calls.map((call) => call.method)).toEqual(["eth_accounts", "eth_chainId"]);
  });

  it("stays disconnected without an approved account", async () => {
    const injected = new FakeProvider();
    expect(await getAuthorizedAccounts(injected)).toEqual([]);
    expect(injected.calls.map((call) => call.method)).toEqual(["eth_accounts"]);
  });

  it("uses no wallet catalogue when injection is absent", () => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    expect(getInjectedProvider()).toBeNull();
  });

  it("tracks account changes, disconnection, and chain changes", () => {
    const injected = new FakeProvider();
    let account: string | null = "0x1234";
    let chainId: number | null = 1;
    const stop = listenToWallet(injected, (accounts) => { account = accounts[0] ?? null; }, (id) => { chainId = id; });
    injected.emit("accountsChanged", ["0x5678"]);
    expect(account).toBe("0x5678");
    injected.emit("chainChanged", "0xf22f");
    expect(chainId).toBe(61999);
    injected.emit("chainChanged", "0x1");
    expect(chainId).toBe(1);
    injected.emit("accountsChanged", []);
    expect(account).toBeNull();
    stop();
    injected.emit("accountsChanged", ["0x9999"]);
    expect(account).toBeNull();
  });
});

describe("Studionet network switching", () => {
  it("does not switch when already on 61999", async () => {
    const injected = new FakeProvider();
    injected.chainId = "0xf22f";
    await expect(switchToStudionet(injected)).resolves.toBe(61999);
    expect(injected.calls.map((call) => call.method)).toEqual(["eth_chainId"]);
  });

  it("switches with 0xf22f and verifies eth_chainId again", async () => {
    const injected = new FakeProvider();
    await expect(switchToStudionet(injected)).resolves.toBe(61999);
    expect(injected.calls.map((call) => call.method)).toEqual(["eth_chainId", "wallet_switchEthereumChain", "eth_chainId"]);
    expect(injected.calls[1].params).toEqual([{ chainId: "0xf22f" }]);
  });

  it.each([
    ["numeric 4902", codedError(4902)],
    ["string 4902", codedError("4902")],
    ["nested data code", { code: -32603, data: { code: 4902 } }],
    ["nested original error code", { code: -32603, data: { originalError: { code: "4902" } } }],
    ["unrecognized chain message", new Error('Unrecognized chain ID "0xf22f". Try adding the chain using wallet_switchEthereumChain first.')],
    ["stringified provider data", { code: -32603, data: '{"message":"Unrecognized chain ID 0xf22f"}' }],
  ])("adds and switches for %s", async (_label, error) => {
    const injected = new FakeProvider();
    injected.firstSwitchError = error;
    await expect(switchToStudionet(injected)).resolves.toBe(61999);
    expect(injected.calls.map((call) => call.method)).toEqual([
      "eth_chainId", "wallet_switchEthereumChain", "wallet_addEthereumChain", "eth_chainId", "wallet_switchEthereumChain", "eth_chainId",
    ]);
    const add = injected.calls[2].params as Array<{ chainId: string; chainName: string; rpcUrls: string[]; nativeCurrency: { symbol: string; decimals: number }; blockExplorerUrls: string[] }>;
    expect(add[0]).toEqual({
      chainId: "0xf22f",
      chainName: "GenLayer Studionet",
      rpcUrls: ["https://studio.genlayer.com/api"],
      nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
      blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
    });
  });

  it("skips a second switch if adding Studionet activates it", async () => {
    const injected = new FakeProvider();
    injected.firstSwitchError = codedError(4902);
    injected.updateChainOnAdd = true;
    await expect(switchToStudionet(injected)).resolves.toBe(61999);
    expect(injected.calls.map((call) => call.method)).toEqual([
      "eth_chainId", "wallet_switchEthereumChain", "wallet_addEthereumChain", "eth_chainId", "eth_chainId",
    ]);
  });

  it.each([
    [4001, "Wallet request rejected."],
    [-32002, "A wallet request is already open. Check your wallet."],
  ])("preserves provider error %i without adding a chain", async (code, message) => {
    const injected = new FakeProvider();
    injected.firstSwitchError = Object.assign(codedError(code), { message: "Unrecognized chain ID" });
    await expect(switchToStudionet(injected)).rejects.toMatchObject({ code });
    expect(injected.calls.map((call) => call.method)).toEqual(["eth_chainId", "wallet_switchEthereumChain"]);
    expect(describeWalletError(injected.firstSwitchError ?? codedError(code))).toBe(message);
  });

  it("keeps a rejection during add-chain as a rejection", async () => {
    const injected = new FakeProvider();
    injected.firstSwitchError = codedError(4902);
    injected.addError = codedError(4001);
    await expect(switchToStudionet(injected)).rejects.toMatchObject({ code: 4001 });
  });

  it("reports an unrelated add-chain failure cleanly", async () => {
    const injected = new FakeProvider();
    injected.firstSwitchError = codedError(4902);
    injected.addError = codedError(-32603);
    await expect(switchToStudionet(injected)).rejects.toThrow("Studionet could not be configured in this wallet.");
  });

  it("rejects a reported success when the verified chain remains wrong", async () => {
    const injected = new FakeProvider();
    injected.updateChainOnSwitch = false;
    await expect(switchToStudionet(injected)).rejects.toThrow("Could not switch to Studionet. Current chain is 1.");
    expect(injected.calls.map((call) => call.method)).toEqual(["eth_chainId", "wallet_switchEthereumChain", "eth_chainId"]);
  });
});
