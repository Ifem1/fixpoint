const rawAddress = process.env.NEXT_PUBLIC_FIXPOINT_CONTRACT_ADDRESS?.trim() ?? "";

export const FIXPOINT_CONTRACT_ADDRESS = /^0x[a-fA-F0-9]{40}$/.test(rawAddress)
  ? (rawAddress as `0x${string}`)
  : null;

export const contractConfigured = FIXPOINT_CONTRACT_ADDRESS !== null;
