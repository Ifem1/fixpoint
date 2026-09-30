let currentAccount: string | null = null;
let cachedSigner: string | null = null;

export function resetSession() {
  currentAccount = null;
  cachedSigner = null;
}

export function connect(account: string) {
  currentAccount = account;
  if (cachedSigner === null) cachedSigner = account;
}

export function disconnect() {
  currentAccount = null;
  // Defect: the cached signer survives disconnect.
}

export function currentSigner() {
  return cachedSigner;
}

export function publicAccountRead() {
  return currentAccount;
}
