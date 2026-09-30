"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TxRail } from "./TxRail";
import { getTransaction, readCandidate, waitForDecision, waitForFinalization } from "@/lib/genlayer";
import { patchJournal, pendingJournal } from "@/lib/journal";
import { phaseFromSnapshot } from "@/lib/lifecycle";
import type { ActiveTransaction } from "@/lib/useTransaction";

export function PendingRecovery() {
  const [tx, setTx] = useState<ActiveTransaction | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const recover = useCallback(async () => {
    const entry = pendingJournal()[0];
    if (!entry) return;

    setTx({ ...entry });
    setTrackingError(null);
    try {
      const current = await getTransaction(entry.hash);
      let phase = phaseFromSnapshot(current);
      patchJournal(entry.hash, {
        phase,
        statusName: current.statusName,
        executionName: current.executionName,
      });
      setTx({ ...entry, phase, statusName: current.statusName, executionName: current.executionName });

      if (phase === "submitted") {
        const decided = await waitForDecision(entry.hash);
        phase = phaseFromSnapshot(decided);
        patchJournal(entry.hash, {
          phase,
          statusName: decided.statusName,
          executionName: decided.executionName,
        });
        setTx({ ...entry, phase, statusName: decided.statusName, executionName: decided.executionName });
      }

      if (phase === "accepted") {
        const finalized = await waitForFinalization(entry.hash);
        phase = phaseFromSnapshot(finalized);
        patchJournal(entry.hash, {
          phase,
          statusName: finalized.statusName,
          executionName: finalized.executionName,
        });
        setTx({ ...entry, phase, statusName: finalized.statusName, executionName: finalized.executionName });
      }

      if (phase === "finalized") {
        if (entry.action === "open case") {
          setDestination(`/case?id=${encodeURIComponent(entry.subjectId)}`);
        } else if (entry.action.includes("candidate")) {
          try {
            const candidate = await readCandidate(entry.subjectId);
            setDestination(`/case?id=${encodeURIComponent(candidate.case_id)}`);
          } catch {
            setDestination("/cases");
          }
        } else {
          setDestination("/cases");
        }
      }
    } catch (cause) {
      // A tracking timeout or temporary RPC error is not proof that the transaction failed.
      setTrackingError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    void recover();
  }, [recover, retry]);

  if (!tx) return null;

  return (
    <>
      <TxRail tx={tx} />
      {(trackingError || destination) && (
        <div className="recovery-actions">
          {trackingError && (
            <>
              <span>Tracking paused; canonical transaction state was not changed.</span>
              <button className="text-button" onClick={() => setRetry((value) => value + 1)}>resume tracking</button>
            </>
          )}
          {destination && <Link href={destination}>open finalized state →</Link>}
        </div>
      )}
    </>
  );
}
