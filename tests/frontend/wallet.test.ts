import { describe, expect, it } from "vitest";
import { switchToStudionet, type Eip1193Provider } from "../../lib/wallet";

class FakeProvider implements Eip1193Provider {
  calls: { method: string; params?: unknown[] | Record<string, unknown> }[] = [];
  unknown = true;

  async request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown> {
    this.calls.push(args);
    if (args.method === "wallet_switchEthereumChain" && this.unknown) {
      this.unknown = false;
      const error = new Error("unknown chain") as Error & { code: number };
      error.code = 4902;
      throw error;
    }
    return null;
  }
}

describe("injected wallet network handling", () => {
  it("adds Studionet after a 4902 response and switches again", async () => {
    const provider = new FakeProvider();
    await switchToStudionet(provider);
    expect(provider.calls.map((call) => call.method)).toEqual([
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
      "wallet_switchEthereumChain",
    ]);
    const add = provider.calls[1].params as Array<{ chainId: string; rpcUrls: string[] }>;
    expect(add[0].chainId).toBe("0xf22f");
    expect(add[0].rpcUrls[0]).toBe("https://studio.genlayer.com/api");
  });
});
