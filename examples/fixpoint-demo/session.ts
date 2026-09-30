let currentAccount: string | null = null;
let cachedSigner: string | null = null;

export function resetSession() {
  currentAccount = null;
  cachedSigner = null;
}

export function connect(account: string) {
  currentAccount = account;
  cachedSigner = account;
}

export function disconnect() {
  currentAccount = null;
  cachedSigner = null;
}

export function currentSigner() {
  return cachedSigner;
}

export function publicAccountRead() {
  return currentAccount;
}
