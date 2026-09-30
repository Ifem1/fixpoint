import Link from "next/link";

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">SOFTWARE CHANGE VERIFICATION · GENLAYER</span>
          <h1>Prove the patch.<br />Not the promise.</h1>
          <p className="lede">
            Freeze a known defect, its witness and the behaviour that must survive. Submit an exact candidate revision. Independent validators determine whether that specific change removed the defect without weakening the measurement or breaking protected invariants.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/open">open a case</Link>
            <Link className="button ghost" href="/cases">inspect cases</Link>
          </div>
        </div>
        <div className="before-after-card" aria-label="Before and after verification diagram">
          <div className="ba-column base">
            <span className="ba-kicker">BASE</span>
            <strong>defect reproduced</strong>
            <code>8ec0…ba2</code>
            <div className="signal fail"><span /> failure signature present</div>
          </div>
          <div className="delta-column">
            <span>Δ</span>
            <i />
            <small>same witness</small>
          </div>
          <div className="ba-column patch">
            <span className="ba-kicker">PATCH</span>
            <strong>candidate assessed</strong>
            <code>1af6…c91</code>
            <div className="signal pass"><span /> target defect absent</div>
          </div>
          <div className="certificate-preview">
            <div>
              <span>FINALIZED CERTIFICATE</span>
              <strong>FIX PROVEN</strong>
            </div>
            <span className="seal">FP</span>
          </div>
        </div>
      </section>

      <section className="principle-strip">
        <div><b>01</b><span>freeze the defect</span></div>
        <div><b>02</b><span>bind the witness</span></div>
        <div><b>03</b><span>submit an exact revision</span></div>
        <div><b>04</b><span>validators reconstruct</span></div>
        <div><b>05</b><span>certificate or rejection</span></div>
      </section>

      <section className="statement-section">
        <div className="statement-label">THE QUESTION</div>
        <blockquote>
          Did this exact change transform the system from a demonstrably broken state into the declared corrected state, under the same frozen witness, while preserving every protected invariant?
        </blockquote>
      </section>

      <section className="outcome-section">
        <div className="section-head">
          <span className="eyebrow">DETERMINISTIC OUTCOME LAYER</span>
          <h2>Validators supply facts. The contract supplies consequences.</h2>
        </div>
        <div className="outcome-grid">
          <article><span className="outcome-code">01</span><h3>FIX_PROVEN</h3><p>Baseline reproduced, candidate resolved it, witness stayed intact, invariants survived.</p></article>
          <article><span className="outcome-code">02</span><h3>NOT_FIXED</h3><p>The same declared defect remains observable on the candidate revision.</p></article>
          <article><span className="outcome-code">03</span><h3>REGRESSION</h3><p>The target defect disappeared, but one or more frozen invariants failed.</p></article>
          <article><span className="outcome-code">04</span><h3>INVALID_PROOF</h3><p>Revision binding, witness integrity or protected verification material was compromised.</p></article>
          <article><span className="outcome-code">05</span><h3>UNPROVEN</h3><p>Evidence was unavailable, contradictory or insufficient for a safe conclusion.</p></article>
        </div>
      </section>

      <section className="cta-panel">
        <div>
          <span className="eyebrow">NO SCORE. NO ADMIN OVERRIDE. NO BACKEND ORACLE.</span>
          <h2>One defect. One frozen standard. One exact patch.</h2>
        </div>
        <Link className="button primary" href="/open">define the witness →</Link>
      </section>
    </div>
  );
}
