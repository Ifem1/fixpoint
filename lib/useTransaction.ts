"use client";

import { useCallback, useState } from "react";
import { waitForDecision, waitForFinalization } from "./genlayer";
import { patchJournal, putJournal } from "./journal";
import { phaseFromSnapshot } from "./lifecycle";
import type { TxJournalEntry, TxPhase } from "./types";

export interface ActiveTransaction {
  hash?: string;
  phase: TxPhase;
  action: string;
  subjectId: string;
  statusName?: string;
  executionName?: string;
  error?: string;
}

export function useTransaction() {
  const [active, setActive] = useState<ActiveTransaction | null>(null);

  const run = useCallback(
    async (action: string, subjectId: string, submit: () => Promise<string>, onFinalized?: () => Promise<void> | void) => {
      let submittedHash: string | undefined;
      setActive({ phase: "preparing", action, subjectId });
      try {
        setActive({ phase: "awaiting_signature", action, subjectId });
        const hash = await submit();
        submittedHash = hash;
        const entry: TxJournalEntry = {
          hash,
          action,
          subjectId,
          phase: "submitted",
          createdAt: new Date().toISOString(),
        };
        putJournal(entry);
        setActive({ ...entry });

        const decided = await waitForDecision(hash);
        const decidedPhase = phaseFromSnapshot({
          statusName: decided.statusName,
          executionName: decided.executionName,
        });
        const acceptedPhase: TxPhase = decidedPhase === "failed" ? "failed" : "accepted";
        patchJournal(hash, {
          phase: acceptedPhase,
          statusName: decided.statusName,
          executionName: decided.executionName,
        });
        setActive({
          hash,
          action,
          subjectId,
          phase: acceptedPhase,
          statusName: decided.statusName,
          executionName: decided.executionName,
        });
        if (acceptedPhase === "failed") return hash;

        const finalized = await waitForFinalization(hash);
        const finalPhase = phaseFromSnapshot({
          statusName: finalized.statusName,
          executionName: finalized.executionName,
        });
        patchJournal(hash, {
          phase: finalPhase,
          statusName: finalized.statusName,
          executionName: finalized.executionName,
        });
        setActive({
          hash,
          action,
          subjectId,
          phase: finalPhase,
          statusName: finalized.statusName,
          executionName: finalized.executionName,
        });
        if (finalPhase === "finalized") await onFinalized?.();
        return hash;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setActive((previous) => ({
          phase: "failed",
          action,
          subjectId,
          hash: submittedHash ?? previous?.hash,
          error: message,
        }));
        if (submittedHash) patchJournal(submittedHash, { phase: "failed", error: message });
        throw cause;
      }
    },
    [],
  );

  const clear = useCallback(() => setActive(null), []);
  return { active, run, clear };
}
