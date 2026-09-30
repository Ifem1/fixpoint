"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "./WalletProvider";
import { StatusChip } from "./StatusChip";
import { TxRail } from "./TxRail";
import { contractConfigured } from "@/lib/config";
import {
  assessCandidateTx,
  cancelCaseTx,
  listCandidateIds,
  readCandidate,
  readCase,
  readCertificate,
  submitCandidateTx,
} from "@/lib/genlayer";
import { explorerAddress } from "@/lib/network";
import type { CandidateView, CaseView, CertificateView, InvariantInput } from "@/lib/types";
import { useTransaction } from "@/lib/useTransaction";
import { isFullSha, isSafeId, parseLines, shortHash } from "@/lib/validation";

export function CaseWorkspace({ initialCaseId }: { initialCaseId: string }) {
  const [item, setItem] = useState<CaseView | null>(null);
  const [candidates, setCandidates] = useState<CandidateView[]>([]);
  const [certificate, setCertificate] = useState<CertificateView | null>(null);
  const [loading, setLoading] = useState(Boolean(contractConfigured && initialCaseId));
  const [error, setError] = useState<string | null>(null);
  const [candidateForm, setCandidateForm] = useState({ id: "", sha: "", evidence: "", support: "" });
  const wallet = useWallet();
  const tx = useTransaction();

  const load = useCallback(async () => {
    const nextCase = await readCase(initialCaseId);
    const ids = await listCandidateIds(initialCaseId);
    const nextCandidates = await Promise.all(ids.map((id) => readCandidate(id)));
    let nextCertificate: CertificateView | null = null;
    if (nextCase.status === "PROVEN") nextCertificate = await readCertificate(initialCaseId);
    return { nextCase, nextCandidates, nextCertificate };
  }, [initialCaseId]);

  useEffect(() => {
    if (!contractConfigured || !initialCaseId) return;
    let cancelled = false;
    void load().then(
      ({ nextCase, nextCandidates, nextCertificate }) => {
        if (cancelled) return;
        setItem(nextCase);
        setCandidates(nextCandidates);
        setCertificate(nextCertificate);
      },
      (cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      },
    ).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialCaseId, load]);

  const reload = async () => {
    try {
      const { nextCase, nextCandidates, nextCertificate } = await load();
      setItem(nextCase);
      setCandidates(nextCandidates);
      setCertificate(nextCertificate);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setLoading(true);
    setError(null);
    void reload();
  };

  const invariants = useMemo<InvariantInput[]>(() => {
    try { return item ? JSON.parse(item.invariants_json) : []; } catch { return []; }
  }, [item]);
  const protectedPaths = useMemo<string[]>(() => {
    try { return item ? JSON.parse(item.protected_paths_json) : []; } catch { return []; }
  }, [item]);

  async function requireWriter() {
    if (!wallet.connected || !wallet.account || !wallet.provider) throw new Error("Connect an injected wallet first.");
    if (!wallet.correctNetwork) throw new Error("Switch the wallet to Studionet 61999 first.");
    return { account: wallet.account, provider: wallet.provider };
  }

  async function submitCandidate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (!item) throw new Error("Case is not loaded.");
      if (!isSafeId(candidateForm.id)) throw new Error("Candidate ID must be 3-64 safe characters.");
      if (!isFullSha(candidateForm.sha)) throw new Error("Candidate revision must be a full 40-character SHA.");
      const writer = await requireWriter();
      await tx.run(
        "submit candidate",
        candidateForm.id,
        () => submitCandidateTx(writer.account, writer.provider, {
          candidateId: candidateForm.id.trim(),
          caseId: item.case_id,
          candidateSha: candidateForm.sha.trim(),
          candidateEvidenceUrl: candidateForm.evidence.trim(),
          supportUrls: parseLines(candidateForm.support, 4),
        }),
        async () => {
          setCandidateForm({ id: "", sha: "", evidence: "", support: "" });
          await reload();
        },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function assess(candidateId: string) {
    setError(null);
    try {
      const writer = await requireWriter();
      await tx.run(
        "assess candidate",
        candidateId,
        () => assessCandidateTx(writer.account, writer.provider, candidateId),
        reload,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function cancel() {
    setError(null);
    try {
      if (!item) return;
      const writer = await requireWriter();
      await tx.run("cancel case", item.case_id, () => cancelCaseTx(writer.account, writer.provider, item.case_id), reload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (!initialCaseId) return <div className="content-page"><div className="empty-state">Missing case id. Open a case from the public ledger.</div></div>;
  if (loading) return <div className="content-page"><div className="empty-state">reconstructing case from contract state…</div></div>;
  if (error && !item) return <div className="content-page"><div className="empty-state error-text">{error}<button onClick={refresh}>retry</button></div></div>;
  if (!item) return <div className="content-page"><div className="empty-state">Case unavailable.</div></div>;

  const isCreator = wallet.account?.toLowerCase() === item.creator.toLowerCase();

  return (
    <div className="case-workspace">
      <section className="case-titlebar">
        <div>
          <Link className="back-link" href="/cases">← cases</Link>
          <span className="eyebrow">CASE {item.case_id}</span>
          <h1>{item.defect_statement}</h1>
        </div>
        <div className="case-title-actions">
          <StatusChip value={item.status} />
          <button className="text-button" onClick={refresh}>refresh state</button>
        </div>
      </section>

      <section className="revision-stage">
        <div className="revision-pane base-pane">
          <div className="revision-head"><span>KNOWN-BROKEN BASE</span><code>{shortHash(item.base_sha, 12, 8)}</code></div>
          <h2>Failure must exist here.</h2>
          <p>{item.failure_signature}</p>
          <a href={item.base_evidence_url} target="_blank" rel="noreferrer">open pinned evidence ↗</a>
        </div>
        <div className="revision-axis"><b>Δ</b><span>same frozen test</span></div>
        <div className="revision-pane patch-pane">
          <div className="revision-head"><span>CANDIDATE HEAD</span><code>{candidates.length ? shortHash(candidates[candidates.length - 1].candidate_sha, 12, 8) : "not submitted"}</code></div>
          <h2>Failure must disappear here.</h2>
          <p>The candidate is judged against the same defect, witness and invariant set. A new revision creates a new evidence identity.</p>
          <span>{candidates.length} candidate{candidates.length === 1 ? "" : "s"} recorded</span>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <article className="panel">
            <div className="panel-head"><span className="eyebrow">FROZEN WITNESS</span><a href={`${item.witness_repository}/blob/${item.witness_sha}/${item.witness_path}`} target="_blank" rel="noreferrer">inspect ↗</a></div>
            <div className="facts-grid">
              <div><span>repository</span><strong>{item.repository.replace("https://github.com/", "")}</strong></div>
              <div><span>witness</span><strong>{item.witness_repository.replace("https://github.com/", "")}</strong></div>
              <div><span>witness SHA</span><code>{shortHash(item.witness_sha, 10, 8)}</code></div>
              <div><span>witness path</span><code>{item.witness_path}</code></div>
            </div>
            <div className="protocol-copy"><span>reproduction protocol</span><p>{item.reproduction_protocol}</p></div>
            {protectedPaths.length > 0 && <div className="path-list"><span>verification-protected paths</span>{protectedPaths.map((path) => <code key={path}>{path}</code>)}</div>}
          </article>

          <article className="panel">
            <div className="panel-head"><span className="eyebrow">PROTECTED INVARIANTS</span><span>{invariants.length} frozen</span></div>
            <div className="invariant-table">
              {invariants.map((inv) => <div key={inv.id}><code>{inv.id}</code><span>{inv.text}</span></div>)}
            </div>
          </article>

          <article className="panel candidate-history">
            <div className="panel-head"><span className="eyebrow">CANDIDATE HISTORY</span><span>append-only</span></div>
            {!candidates.length && <div className="inline-empty">No candidate revision has been submitted.</div>}
            {candidates.map((candidate, index) => {
              const failed = new Set(candidate.invariant_fail_ids.split(",").filter(Boolean));
              const unproven = new Set(candidate.invariant_unproven_ids.split(",").filter(Boolean));
              const canAssess = item.status === "OPEN" && (!candidate.outcome || (candidate.outcome === "UNPROVEN" && candidate.assessment_count < 3));
              return (
                <div className="candidate-row" key={candidate.candidate_id}>
                  <div className="candidate-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="candidate-body">
                    <div className="candidate-title">
                      <div><strong>{candidate.candidate_id}</strong><code>{shortHash(candidate.candidate_sha, 10, 8)}</code></div>
                      <StatusChip value={candidate.outcome || "SUBMITTED"} />
                    </div>
                    {candidate.outcome && (
                      <div className="decision-matrix">
                        <div><span>baseline</span><b>{candidate.base_defect}</b></div>
                        <div><span>candidate</span><b>{candidate.candidate_defect}</b></div>
                        <div><span>witness</span><b>{candidate.witness_integrity}</b></div>
                      </div>
                    )}
                    {candidate.reasoning && <p className="reasoning">{candidate.reasoning}</p>}
                    {candidate.outcome && (
                      <div className="invariant-results">
                        {invariants.map((inv) => (
                          <span className={failed.has(inv.id) ? "bad" : unproven.has(inv.id) ? "unknown" : "good"} key={inv.id}>
                            {inv.id} · {failed.has(inv.id) ? "VIOLATED" : unproven.has(inv.id) ? "UNPROVEN" : "PRESERVED"}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="candidate-links">
                      <a href={candidate.candidate_evidence_url} target="_blank" rel="noreferrer">evidence ↗</a>
                      <span>attempt {candidate.assessment_count}/3</span>
                      {canAssess && <button className="button small" onClick={() => void assess(candidate.candidate_id)}>run consensus</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </article>
        </div>

        <aside className="workspace-side">
          {certificate ? (
            <section className="certificate-card">
              <span className="cert-kicker">FINALIZED FIX CERTIFICATE</span>
              <div className="cert-mark">FP</div>
              <h2>FIX PROVEN</h2>
              <p>This certificate is bound to one base revision, one candidate revision, the frozen witness, invariant set and evidence digest.</p>
              <dl>
                <div><dt>base</dt><dd>{shortHash(certificate.base_sha)}</dd></div>
                <div><dt>candidate</dt><dd>{shortHash(certificate.candidate_sha)}</dd></div>
                <div><dt>witness</dt><dd>{shortHash(certificate.witness_sha)}</dd></div>
                <div><dt>certificate</dt><dd>{shortHash(certificate.certificate_digest, 10, 8)}</dd></div>
              </dl>
              <code className="full-digest">{certificate.certificate_digest}</code>
            </section>
          ) : item.status === "OPEN" ? (
            <section className="submit-card">
              <span className="eyebrow">SUBMIT PATCH</span>
              <h2>Bind a candidate.</h2>
              <form onSubmit={submitCandidate}>
                <label>Candidate ID<input value={candidateForm.id} onChange={(e) => setCandidateForm((v) => ({ ...v, id: e.target.value }))} placeholder="fix-v1" required /></label>
                <label>Full candidate SHA<input value={candidateForm.sha} onChange={(e) => setCandidateForm((v) => ({ ...v, sha: e.target.value }))} placeholder="40 character SHA" required /></label>
                <label>Candidate evidence<input value={candidateForm.evidence} onChange={(e) => setCandidateForm((v) => ({ ...v, evidence: e.target.value }))} placeholder="commit-pinned raw/blob URL" required /></label>
                <label>Supporting evidence<textarea value={candidateForm.support} onChange={(e) => setCandidateForm((v) => ({ ...v, support: e.target.value }))} placeholder="Optional URLs, one per line. Max 4." /></label>
                {!wallet.connected ? <button className="button primary" type="button" onClick={() => void wallet.connect()}>connect wallet</button> : !wallet.correctNetwork ? <button className="button primary" type="button" onClick={() => void wallet.switchNetwork()}>switch to 61999</button> : <button className="button primary" type="submit">submit revision →</button>}
              </form>
            </section>
          ) : (
            <section className="submit-card"><span className="eyebrow">CASE CLOSED</span><h2>{item.status}</h2><p>No further candidates can be submitted.</p></section>
          )}

          <section className="identity-card">
            <span>case digest</span><code>{item.case_digest}</code>
            <span>creator</span><a href={explorerAddress(item.creator)} target="_blank" rel="noreferrer"><code>{shortHash(item.creator, 10, 8)}</code> ↗</a>
            {isCreator && item.status === "OPEN" && candidates.length === 0 && <button className="text-button danger" onClick={() => void cancel()}>cancel empty case</button>}
          </section>
        </aside>
      </section>

      {(error || wallet.error) && <p className="workspace-error error-text">{error ?? wallet.error}</p>}
      <TxRail tx={tx.active} />
    </div>
  );
}
