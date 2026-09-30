export default function HowPage() {
  return (
    <div className="content-page protocol-page">
      <div className="page-heading">
        <span className="eyebrow">PROTOCOL MODEL</span>
        <h1>A bounded before/after adjudication.</h1>
        <p>FIXPOINT does not ask validators to approve a project. It asks them to reconstruct one declared behavioural transition from immutable public evidence.</p>
      </div>
      <div className="protocol-grid">
        <article><span>01</span><h2>Freeze</h2><p>The creator pins the repository, full base SHA, defect statement, reproduction protocol, failure signature, witness revision, protected verification paths and invariant set.</p></article>
        <article><span>02</span><h2>Submit</h2><p>A candidate is one full commit SHA plus commit-bound evidence. Duplicate candidate revisions and duplicate evidence bundles are rejected by contract state.</p></article>
        <article><span>03</span><h2>Reconstruct</h2><p>Validators independently retrieve the frozen witness, before evidence, after evidence and bounded GitHub base-to-candidate comparison. Evidence content is treated as untrusted data.</p></article>
        <article><span>04</span><h2>Agree</h2><p>Consensus compares material classifications, not free-form prose: baseline state, candidate state, witness integrity, failed invariants and unproven invariants.</p></article>
        <article><span>05</span><h2>Derive</h2><p>Contract logic converts those agreed fields into FIX_PROVEN, NOT_FIXED, REGRESSION, INVALID_PROOF or UNPROVEN. The model never chooses the state transition directly.</p></article>
        <article><span>06</span><h2>Certify</h2><p>A successful result closes the case and creates a certificate digest bound to the case, base, candidate, witness, invariants and evidence bundle.</p></article>
      </div>
      <section className="constraint-panel">
        <div><b>Evidence boundary</b><span>Public GitHub repositories only in V1.</span></div>
        <div><b>Candidate envelope</b><span>At most 30 commits and 60 changed files per assessment.</span></div>
        <div><b>Uncertainty</b><span>Temporary retrieval failure is UNPROVEN, never synthetic success or punishment.</span></div>
        <div><b>Finality</b><span>Accepted is provisional. The interface only labels a certificate final after Finalized.</span></div>
      </section>
    </div>
  );
}
