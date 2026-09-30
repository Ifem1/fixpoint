export const NETWORK = {
  name: "GenLayer Studionet",
  shortName: "Studionet",
  chainId: 61999,
  chainIdHex: "0xf22f",
  rpcUrl: "https://studio.genlayer.com/api",
  explorerUrl: "https://explorer-studio.genlayer.com",
  currency: { name: "GEN", symbol: "GEN", decimals: 18 },
} as const;

export function explorerTx(hash: string) {
  return `${NETWORK.explorerUrl}/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `${NETWORK.explorerUrl}/address/${address}`;
}
