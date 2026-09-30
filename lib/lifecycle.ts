import type { TxPhase } from "./types";

export interface LifecycleSnapshot {
  statusName?: string;
  executionName?: string;
}

export function phaseFromSnapshot(snapshot: LifecycleSnapshot): TxPhase {
  const status = (snapshot.statusName ?? "").toUpperCase();
  const execution = (snapshot.executionName ?? "").toUpperCase();
  if (status.includes("FINALIZED")) {
    return execution && !execution.includes("RETURN") && !execution.includes("SUCCESS") ? "failed" : "finalized";
  }
  if (status.includes("ACCEPTED")) {
    return execution && !execution.includes("RETURN") && !execution.includes("SUCCESS") ? "failed" : "accepted";
  }
  if (status.includes("CANCEL") || status.includes("UNDETERMINED") || status.includes("FAIL")) return "failed";
  return "submitted";
}
