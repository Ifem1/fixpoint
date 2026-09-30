"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CaseCard } from "@/components/CaseCard";
import { contractConfigured } from "@/lib/config";
import { listCaseIds, readCase, readStats } from "@/lib/genlayer";
import type { CaseView, StatsView } from "@/lib/types";

export default function CasesPage() {
  const [cases, setCases] = useState<CaseView[]>([]);
  const [stats, setStats] = useState<StatsView | null>(null);
  const [loading, setLoading] = useState(contractConfigured);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ids, nextStats] = await Promise.all([listCaseIds(), readStats()]);
    const records = await Promise.all(ids.map((id) => readCase(id)));
    return { records: records.reverse(), nextStats };
  }, []);

  useEffect(() => {
    if (!contractConfigured) return;
    let cancelled = false;
    void load().then(
      ({ records, nextStats }) => {
        if (cancelled) return;
        setCases(records);
        setStats(nextStats);
      },
      (cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      },
    ).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    void load().then(
      ({ records, nextStats }) => {
        setCases(records);
        setStats(nextStats);
      },
      (cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)),
    ).finally(() => setLoading(false));
  };

  return (
    <div className="content-page cases-page">
      <div className="page-heading cases-heading">
        <div><span className="eyebrow">PUBLIC CASE LEDGER</span><h1>Every claim starts broken.</h1></div>
        <Link className="button primary" href="/open">open case</Link>
      </div>
      {stats && (
        <div className="stats-row">
          <div><strong>{stats.cases}</strong><span>cases</span></div>
          <div><strong>{stats.candidates}</strong><span>candidate revisions</span></div>
          <div><strong>{stats.proven}</strong><span>final certificates</span></div>
        </div>
      )}
      {loading && <div className="empty-state">reading canonical contract state…</div>}
      {error && <div className="empty-state error-text">{error}<button onClick={refresh}>retry</button></div>}
      {!loading && !error && !contractConfigured && <div className="empty-state">The contract address will be configured after Studionet deployment.</div>}
      {!loading && contractConfigured && !cases.length && (
        <div className="empty-state"><strong>No cases yet.</strong><span>Open the first known-broken revision and freeze its witness.</span></div>
      )}
      <div className="case-grid">{cases.map((item) => <CaseCard item={item} key={item.case_id} />)}</div>
    </div>
  );
}
