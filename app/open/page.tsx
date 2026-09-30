"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";
import { TxRail } from "@/components/TxRail";
import { contractConfigured } from "@/lib/config";
import { openCaseTx } from "@/lib/genlayer";
import { useTransaction } from "@/lib/useTransaction";
import { isFullSha, isSafeId, parseInvariants, parseLines } from "@/lib/validation";

const initial = {
  caseId: "",
  repository: "",
  baseSha: "",
  defectStatement: "",
  reproductionProtocol: "",
  failureSignature: "",
  witnessRepository: "",
  witnessSha: "",
  witnessPath: "",
  baseEvidenceUrl: "",
  protectedPaths: "",
  invariants: "INV-1: ",
};

export default function OpenCasePage() {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const wallet = useWallet();
  const tx = useTransaction();
  const router = useRouter();

  const readiness = useMemo(() => {
    if (!contractConfigured) return "contract deployment required";
    if (!wallet.connected) return "connect an injected wallet";
    if (!wallet.correctNetwork) return "switch wallet to Studionet 61999";
    return null;
  }, [wallet.connected, wallet.correctNetwork]);

  const update = (key: keyof typeof initial, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (readiness) throw new Error(readiness);
      if (!wallet.account || !wallet.provider) throw new Error("Wallet is not connected.");
      if (!isSafeId(form.caseId)) throw new Error("Case ID must be 3-64 safe characters.");
      if (!isFullSha(form.baseSha) || !isFullSha(form.witnessSha)) throw new Error("Base and witness revisions must be full 40-character SHAs.");
      const input = {
        caseId: form.caseId.trim(),
        repository: form.repository.trim(),
        baseSha: form.baseSha.trim(),
        defectStatement: form.defectStatement.trim(),
        reproductionProtocol: form.reproductionProtocol.trim(),
        failureSignature: form.failureSignature.trim(),
        witnessRepository: form.witnessRepository.trim(),
        witnessSha: form.witnessSha.trim(),
        witnessPath: form.witnessPath.trim(),
        baseEvidenceUrl: form.baseEvidenceUrl.trim(),
        protectedPaths: parseLines(form.protectedPaths, 12),
        invariants: parseInvariants(form.invariants),
      };
      await tx.run(
        "open case",
        input.caseId,
        () => openCaseTx(wallet.account!, wallet.provider!, input),
        async () => router.push(`/case?id=${encodeURIComponent(input.caseId)}`),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div className="content-page form-page">
      <div className="page-heading narrow">
        <span className="eyebrow">FREEZE THE STANDARD</span>
        <h1>Open a fix case.</h1>
        <p>Define the broken state before a candidate is judged. These fields become immutable contract state.</p>
      </div>
      <form className="case-form" onSubmit={submit}>
        <fieldset>
          <legend><span>01</span> target revision</legend>
          <label>Case ID<input value={form.caseId} onChange={(e) => update("caseId", e.target.value)} placeholder="wallet-stale-signer" required /></label>
          <label>Public GitHub repository<input value={form.repository} onChange={(e) => update("repository", e.target.value)} placeholder="https://github.com/owner/project" required /></label>
          <label>Known-broken base SHA<input value={form.baseSha} onChange={(e) => update("baseSha", e.target.value)} placeholder="40 character commit SHA" required /></label>
          <label>Base evidence URL<input value={form.baseEvidenceUrl} onChange={(e) => update("baseEvidenceUrl", e.target.value)} placeholder="commit-pinned raw/blob evidence at the base SHA" required /></label>
        </fieldset>

        <fieldset>
          <legend><span>02</span> defect definition</legend>
          <label className="wide">Defect statement<textarea value={form.defectStatement} onChange={(e) => update("defectStatement", e.target.value)} placeholder="What exact observable behaviour is broken?" required /></label>
          <label className="wide">Reproduction protocol<textarea value={form.reproductionProtocol} onChange={(e) => update("reproductionProtocol", e.target.value)} placeholder="Ordered steps that establish the same defect before and after the patch." required /></label>
          <label className="wide">Expected failure signature<textarea value={form.failureSignature} onChange={(e) => update("failureSignature", e.target.value)} placeholder="The concrete observation that proves the defect is present." required /></label>
        </fieldset>

        <fieldset>
          <legend><span>03</span> independent witness</legend>
          <label>Witness repository<input value={form.witnessRepository} onChange={(e) => update("witnessRepository", e.target.value)} placeholder="https://github.com/owner/witness" required /></label>
          <label>Witness SHA<input value={form.witnessSha} onChange={(e) => update("witnessSha", e.target.value)} placeholder="40 character commit SHA" required /></label>
          <label className="wide">Witness path<input value={form.witnessPath} onChange={(e) => update("witnessPath", e.target.value)} placeholder="tests/fixpoint/wallet_stale_signer.md" required /></label>
        </fieldset>

        <fieldset>
          <legend><span>04</span> guardrails</legend>
          <label className="wide">Verification-protected paths<textarea value={form.protectedPaths} onChange={(e) => update("protectedPaths", e.target.value)} placeholder={"One repository-relative path per line.\nExample: tests/fixpoint\nExample: .github/workflows/fixpoint.yml"} /></label>
          <label className="wide">Protected invariants<textarea value={form.invariants} onChange={(e) => update("invariants", e.target.value)} placeholder={"INV-1: Public reads still work without a wallet.\nINV-2: Wrong-network writes remain blocked."} required /></label>
          <p className="form-help">Use <b>ID: description</b>, one invariant per line. Maximum 8.</p>
        </fieldset>

        <div className="form-submit">
          <div>
            <span className="eyebrow">IMMUTABLE AFTER FINALIZATION</span>
            <p>Review the repository, SHAs, witness and invariants before signing.</p>
          </div>
          {!wallet.connected ? (
            <button className="button primary" type="button" onClick={() => void wallet.connect()}>connect wallet</button>
          ) : !wallet.correctNetwork ? (
            <button className="button primary" type="button" onClick={() => void wallet.switchNetwork()}>switch to 61999</button>
          ) : (
            <button className="button primary" type="submit" disabled={!contractConfigured || Boolean(tx.active && tx.active.phase !== "failed" && tx.active.phase !== "finalized")}>open case →</button>
          )}
        </div>
        {(error || wallet.error) && <p className="error-text">{error ?? wallet.error}</p>}
      </form>
      <TxRail tx={tx.active} />
    </div>
  );
}
