import type { InvariantInput } from "./types";

export const FULL_SHA_RE = /^[0-9a-fA-F]{40}$/;
export const SAFE_ID_RE = /^[A-Za-z0-9._-]{3,64}$/;

export function parseLines(value: string, max: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const line of value.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    output.push(clean);
    if (output.length === max) break;
  }
  return output;
}

export function parseInvariants(value: string): InvariantInput[] {
  const output: InvariantInput[] = [];
  const seen = new Set<string>();
  for (const line of value.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean) continue;
    const split = clean.indexOf(":");
    if (split <= 0) throw new Error("Each invariant must use ID: description format.");
    const id = clean.slice(0, split).trim();
    const text = clean.slice(split + 1).trim();
    if (!SAFE_ID_RE.test(id)) throw new Error(`Invalid invariant id: ${id}`);
    if (!text) throw new Error(`Invariant ${id} needs a description.`);
    if (seen.has(id)) throw new Error(`Invariant id ${id} is duplicated.`);
    seen.add(id);
    output.push({ id, text });
    if (output.length > 8) throw new Error("V1 supports at most 8 invariants.");
  }
  if (!output.length) throw new Error("Add at least one invariant.");
  return output;
}

export function shortHash(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function isFullSha(value: string) {
  return FULL_SHA_RE.test(value.trim());
}

export function isSafeId(value: string) {
  return SAFE_ID_RE.test(value.trim());
}
