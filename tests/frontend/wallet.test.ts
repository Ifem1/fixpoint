import { afterEach, describe, expect, it } from "vitest";
import {
  describeWalletError,
  discoverInjectedWallets,
  switchToStudionet,
  type Eip1193Provider,
} from "../../lib/wallet";

type Request = { method: string; params?: unknown[] | Record<string, unknown> };

function codedError(code: number) {
  return Object.assign(new Error(`provider error ${code}`), { code });
}

class FakeProvider implements Eip1193Provider {
  calls: Request[] = [];
  chainId = "0x1";
  firstSwitchError: unknown = null;
  addError: unknown = null;
  updateChainOnSwitch = true;

  async request(args: Request): Promise<unknown> {
    this.calls.push(args);
    if (args.method === "wallet_switchEthereumChain") {
      if (this.firstSwitchError) {
        const error = this.firstSwitchError;
        this.firstSwitchError = null;
        throw error;
      }
      if (this.updateChainOnSwitch) this.chainId = "0xf22f";
      return null;
    }
    if (args.method === "wallet_addEthereumChain" && this.addError) throw this.addError;
    if (args.method === "eth_chainId") return this.chainId;
    return null;
  }
}

const originalWindow = globalThis.window;
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  else Reflect.deleteProperty(globalThis, "window");
});

describe("injected wallet network handling", () => {
  it("switches an existing network and verifies eth_chainId", async () => {
    const provider = new FakeProvider();
    await expect(switchToStudionet(provider)).resolves.toBe(61999);
    expect(provider.calls.map((call) => call.method)).toEqual([
      "wallet_switchEthereumChain",
      "eth_chainId",
    ]);
    expect(provider.chainId).toBe("0xf22f");
  });

  it("adds Studionet after 4902, switches again, and verifies the chain", async () => {
    const provider = new FakeProvider();
    provider.firstSwitchError = codedError(4902);
    await expect(switchToStudionet(provider)).resolves.toBe(61999);
    expect(provider.calls.map((call) => call.method)).toEqual([
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
      "wallet_switchEthereumChain",
      "eth_chainId",
    ]);
    const add = provider.calls[1].params as Array<{ chainId: string; rpcUrls: string[] }>;
    expect(add[0].chainId).toBe("0xf22f");
    expect(add[0].rpcUrls[0]).toBe("https://studio.genlayer.com/api");
  });

  it.each([
    [4001, "Wallet request rejected."],
    [-32002, "A wallet request is already open. Check your wallet."],
  ])("normalizes wallet error %i", async (code, message) => {
    const provider = new FakeProvider();
    provider.firstSwitchError = codedError(code);
    await expect(switchToStudionet(provider)).rejects.toMatchObject({ code });
    expect(describeWalletError(codedError(code))).toBe(message);
  });

  it("explains an add-chain failure", async () => {
    const provider = new FakeProvider();
    provider.firstSwitchError = codedError(4902);
    provider.addError = codedError(-32603);
    await expect(switchToStudionet(provider)).rejects.toThrow(
      "Studionet could not be configured in this wallet.",
    );
  });

  it("does not accept a successful request when eth_chainId remains wrong", async () => {
    const provider = new FakeProvider();
    provider.updateChainOnSwitch = false;
    await expect(switchToStudionet(provider)).rejects.toThrow(
      "Could not switch to Studionet. Current chain is 1.",
    );
    expect(provider.calls.at(-1)?.method).toBe("eth_chainId");
  });

  it("sends the switch to the provider selected for the connected wallet", async () => {
    const selectedProvider = new FakeProvider();
    const otherProvider = new FakeProvider();
    await switchToStudionet(selectedProvider);
    expect(selectedProvider.calls[0].method).toBe("wallet_switchEthereumChain");
    expect(otherProvider.calls).toEqual([]);
  });

  it("removes the generic legacy entry when named EIP-6963 providers arrive", () => {
    const fakeWindow = new EventTarget() as EventTarget & { ethereum?: Eip1193Provider };
    fakeWindow.ethereum = new FakeProvider();
    Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
    let latest: Array<{ uuid: string; provider: Eip1193Provider }> = [];
    const cleanup = discoverInjectedWallets((wallets) => { latest = wallets; });
    expect(latest.map((item) => item.uuid)).toEqual(["legacy-window-ethereum"]);

    const namedProvider = new FakeProvider();
    const announcement = Object.assign(new Event("eip6963:announceProvider"), {
      detail: {
        info: { uuid: "rabby-uuid", name: "Rabby", icon: "", rdns: "io.rabby" },
        provider: namedProvider,
      },
    });
    fakeWindow.dispatchEvent(announcement);
    expect(latest).toEqual([{ uuid: "rabby-uuid", name: "Rabby", icon: "", rdns: "io.rabby", provider: namedProvider }]);
    cleanup();
  });
});
