# Architecture

## Trust boundary

FIXPOINT keeps the product trust boundary intentionally small:

```text
browser + injected wallet -> GenLayer contract -> validators -> contract state
```

The frontend renders and submits. It does not decide whether a fix is proven. No server process is authoritative for business state.

## Case state

A case freezes:

- creator;
- target GitHub repository;
- known-broken full base SHA;
- defect statement;
- reproduction protocol;
- expected failure signature;
- witness repository, SHA and path;
- commit-bound base evidence;
- verification-protected paths;
- bounded invariant set;
- canonical case digest.

After creation these fields are immutable.

Case states:

```text
OPEN -> PROVEN
OPEN -> CANCELLED    (creator only, before any candidate exists)
```

`PROVEN` and `CANCELLED` are terminal.

## Candidate state

A candidate binds:

- case ID;
- submitter;
- full candidate SHA;
- candidate evidence URL;
- bounded supporting evidence URLs;
- evidence digest;
- assessment results and reasoning.

The contract rejects duplicate candidate SHAs per case and duplicate evidence digests.

Assessment outcomes:

```text
FIX_PROVEN    terminal; closes case and emits certificate state
NOT_FIXED     terminal for candidate; case remains open
REGRESSION    terminal for candidate; case remains open
INVALID_PROOF terminal for candidate; case remains open
UNPROVEN      retriable for the same candidate, bounded by assessment limit
```

## Deterministic versus intelligent work

Deterministic contract logic owns:

- authorization;
- ID and SHA validation;
- immutable case definition;
- duplicate/replay protection;
- evidence locator structure;
- candidate ordering;
- terminal states;
- protected-path enforcement from the fetched compare result;
- outcome derivation from validator-agreed fields;
- certificate construction.

GenLayer validators own the semantic judgment:

- whether base evidence actually demonstrates the declared defect;
- whether candidate evidence demonstrates the same defect is resolved or still present;
- whether the frozen witness still supports the declared verification method;
- whether each protected invariant is preserved, violated or unproven.

## Certificate identity

The certificate digest is derived from the frozen case identity plus successful candidate/evidence identity and the final outcome. A different candidate SHA, witness SHA, invariant set or evidence bundle therefore produces a different certificate identity.

## Frontend recovery

Core state is always re-read from the contract. The transaction journal stored in the browser is only a convenience for resuming a known transaction hash. Removing local browser data cannot alter or invent case/candidate/certificate state.
