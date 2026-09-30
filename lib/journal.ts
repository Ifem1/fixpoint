import type { TxJournalEntry, TxPhase } from "./types";

const KEY = "fixpoint.tx-journal.v1";
const MAX = 20;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadJournal(): TxJournalEntry[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as TxJournalEntry[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function putJournal(entry: TxJournalEntry) {
  if (!canUseStorage()) return;
  const next = [entry, ...loadJournal().filter((item) => item.hash !== entry.hash)].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function patchJournal(hash: string, patch: Partial<TxJournalEntry>) {
  if (!canUseStorage()) return;
  const next = loadJournal().map((entry) => (entry.hash === hash ? { ...entry, ...patch } : entry));
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function pendingJournal() {
  return loadJournal().filter((entry) => !(["finalized", "failed"] as TxPhase[]).includes(entry.phase));
}
