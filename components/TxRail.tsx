"use client";

import type { ActiveTransaction } from "@/lib/useTransaction";
import { explorerTx } from "@/lib/network";

const stages = ["awaiting_signature", "submitted", "accepted", "finalized"] as const;

export function TxRail({ tx }: { tx: ActiveTransaction | null }) {
  if (!tx) return null;
  const current = stages.indexOf(tx.phase as (typeof stages)[number]);
  return (
    <section className="tx-rail" aria-live="polite">
      <div className="tx-rail-head">
        <div>
          <span className="eyebrow">transaction lifecycle</span>
          <strong>{tx.action}</strong>
        </div>
        {tx.hash && (
          <a href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">
            explorer ↗
          </a>
        )}
      </div>
      <div className="tx-stages">
        {stages.map((stage, index) => {
          const active = tx.phase === stage;
          const complete = current >= index || tx.phase === "finalized";
          return (
            <div className={`tx-stage ${active ? "active" : ""} ${complete ? "complete" : ""}`} key={stage}>
              <span />
              <small>{stage === "accepted" ? "accepted · provisional" : stage.replaceAll("_", " ")}</small>
            </div>
          );
        })}
      </div>
      {tx.error && <p className={tx.phase === "failed" ? "error-text" : ""}>{tx.error}</p>}
      {tx.phase === "failed" && !tx.error && <p className="error-text">{tx.statusName ?? "transaction"} failed</p>}
      {tx.hash && <code>{tx.hash}</code>}
    </section>
  );
}
