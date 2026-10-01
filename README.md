# FIXPOINT

FIXPOINT is a decentralized proof layer for software fixes. A case freezes a known-broken revision, the exact defect, a reproduction protocol, an immutable witness and protected invariants before a candidate is judged. A developer then submits an exact candidate revision with commit-bound evidence. GenLayer validators independently reconstruct the before/after transition and the contract deterministically decides whether the fix is proven.

A successful case produces a revision-bound certificate digest. The certificate identifies the case, broken base revision, successful candidate revision, frozen witness, evidence bundle and finalized outcome. It can be read directly from the contract without trusting this frontend.

## Problem

A green CI badge proves that a command returned success. It does not prove that a patch fixed the defect it claims to fix. A candidate can make a check green by weakening an assertion, changing verification material, disabling the affected feature or introducing a regression elsewhere.

FIXPOINT separates those questions:

- Was the declared defect genuinely observable at the frozen base revision?
- Is that same defect absent from the submitted candidate revision?
- Did protected verification material remain intact?
- Did the declared invariants survive?
- Is the public evidence actually bound to the revisions being judged?

## Outcomes

Validators independently return material assessment fields. The contract, not an LLM prompt, maps those fields to the state transition.

| Outcome | Meaning |
| --- | --- |
| `FIX_PROVEN` | The base defect is reproduced, the candidate resolves it, the witness remains intact and every invariant is preserved. |
| `NOT_FIXED` | The declared defect remains on the candidate. |
| `REGRESSION` | The target defect is resolved but one or more protected invariants fail. |
| `INVALID_PROOF` | Revision provenance, protected verification material or another proof boundary is compromised. |
| `UNPROVEN` | Public evidence is unavailable, contradictory or insufficient for a safe conclusion. This result may be retried within the bounded assessment limit. |

`FIX_PROVEN` closes the case and creates its certificate. Other terminal candidate outcomes require a new candidate. `UNPROVEN` keeps the same candidate eligible for a bounded retry.

## Architecture

```text
USER
  -> NEXT.JS APP ROUTER FRONTEND
  -> INJECTED EIP-1193 WALLET
  -> GENLAYER STUDIONET 61999
  -> FIXPOINT INTELLIGENT CONTRACT
  -> INDEPENDENT VALIDATOR WEB RETRIEVAL + JUDGMENT
  -> CONTRACT STATE / CERTIFICATE
  -> FRONTEND
```

There is no application backend, server database, centralized evaluator, cron job or privileged resolver.

### Frontend

The frontend is Next.js App Router + TypeScript. It provides:

- public read access without a wallet;
- direct injected EIP-1193 wallet connection with silent approved-account restoration;
- explicit local disconnect;
- account and chain-change handling;
- Studionet network switching;
- case creation;
- candidate submission and assessment;
- base-versus-patch evidence presentation;
- validator decision matrices;
- candidate history;
- certificate display;
- transaction lifecycle from signature through finalization;
- transaction journaling for safe recovery after refresh.

Browser storage only keeps convenience transaction journal entries. Contract state remains authoritative.

### Intelligent Contract

`contracts/fixpoint.py` is the single contract. It owns:

- immutable case definitions;
- case and candidate identifiers;
- exact revision SHAs;
- witness binding;
- protected paths and invariants;
- evidence digests;
- candidate assessment history;
- terminal case state;
- finalized fix certificates.

There is no administrator who can rewrite criteria, assessments or certificates.

## Evidence model

V1 is deliberately limited to public GitHub software work.

Primary base and candidate evidence must be commit-pinned GitHub blob/raw references bound to the expected full SHA. Optional supporting evidence may additionally include a completed GitHub Actions run whose `head_sha` matches the submitted candidate revision.

During assessment each validator independently retrieves:

1. base evidence;
2. candidate evidence;
3. the frozen witness at its exact witness SHA;
4. the GitHub compare result from base to candidate;
5. bounded supporting evidence.

The contract rejects or safely marks unproven evidence that cannot be bound. Protected-path changes cause an invalid proof before semantic success can be accepted.

Evidence and repository content are treated as untrusted data. Text inside source, README files, logs or artifacts is not allowed to redefine the contract's assessment task.

## Consensus design

The substantive evaluation happens inside GenLayer nondeterministic execution. The leader evaluates the frozen defect against independently retrieved evidence. Validators redo the same retrieval and evaluation rather than merely checking response shape.

Consensus compares stable material fields:

- base defect status;
- candidate defect status;
- witness integrity;
- failed invariant IDs;
- unproven invariant IDs.

Free-form reasoning is stored for auditability but is not required to match word-for-word.

The contract then derives the outcome deterministically.

## Transaction truth

FIXPOINT does not treat wallet submission or EVM inclusion as product completion. The UI tracks the GenLayer transaction lifecycle and labels `Accepted` as provisional. Business state is considered final only after the transaction reaches `Finalized` and the frontend reads the resulting contract state.

## Network

- Network: `studionet`
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`

All project network configuration is fixed to this environment.

## Toolchain

Node dependencies are repository-local and pinned in `package.json`.

- GenLayer CLI: `0.39.1`
- genlayer-js: `1.1.8`
- Next.js: `16.3.7`
- React: `19.3.0`
- genlayer-py: `v0.16.3`
- genlayer-test: `v0.29.2`
- genvm-linter: `0.11.0`

The CLI must be invoked through `npm run` or `npx` from this repository, not a globally installed version.

## Setup on Windows PowerShell

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env.local
```

After contract deployment, set:

```text
NEXT_PUBLIC_FIXPOINT_CONTRACT_ADDRESS=<deployed Fixpoint address>
```

Never put a private key or seed phrase in a frontend environment variable.

## Development

```bash
npm run dev
```

The public pages are:

- `/` product entry;
- `/open` freeze a new defect/witness case;
- `/cases` reconstruct and inspect the public case ledger;
- `/case?id=<caseId>` full base-versus-patch workspace;
- `/how` verification model and evidence rules.

## Verification

```powershell
npm run check:repo
npm run typecheck
npm run lint
npm run test:frontend
npm run build
.\.venv\Scripts\python.exe -m pytest tests/direct -q
.\.venv\Scripts\genvm-lint.exe check contracts/fixpoint.py
```

A live network smoke test is opt-in:

```powershell
$env:RUN_STUDIONET = '1'
.\.venv\Scripts\python.exe -m pytest tests/integration/test_studionet_smoke.py -q
Remove-Item Env:RUN_STUDIONET
```

See `docs/TESTING.md` for behavioural coverage.

## Deployment

Before deploying, verify the local CLI and selected network:

```bash
npm run gl:version
npm run genlayer -- network set studionet
npm run gl:network
```

Deploy the contract:

```bash
npm run gl:deploy
```

Record the final address, deployment transaction, source commit and contract SHA-256 in `deployments/studionet.json`, then run:

```bash
npm run verify:deployment
npm run source:hash
```

Set the deployed address in the frontend environment and deploy the Next.js application to Vercel. See `docs/DEPLOYMENT.md` for the evidence-preserving sequence.

## Repository scripts

| Script | Purpose |
| --- | --- |
| `npm run check:repo` | Validate toolchain/network invariants and scan application files for obvious secret/local-endpoint mistakes. |
| `npm run source:hash` | Print SHA-256 of the deployed contract source. |
| `npm run verify:deployment` | Require a complete Studionet deployment manifest. |
| `npm run test:frontend` | Run deterministic frontend logic tests. |
| `npm run test:direct` | Run contract Direct Mode behavioural/adversarial tests. |
| `npm run test:integration` | Run opt-in live Studionet smoke coverage. |

## Controlled live-validation fixture

`examples/fixpoint-demo/` contains a tiny controlled stale-signer defect and an immutable witness. Its purpose is to provide two public Git revisions that can be used for a reproducible first live FIXPOINT case after the repository is published. It is not seeded into application state and does not bypass validator judgment. See `docs/LIVE_VALIDATION.md`.

## Limitations

- V1 evaluates public GitHub evidence only.
- A commit-bound artifact proves revision identity; it does not cryptographically prove the hardware or process that produced every claimed observation.
- Validators inspect bounded evidence and bounded diffs. Very large changes should be split before assessment.
- GitHub availability and rate limits can legitimately produce `UNPROVEN` rather than a punitive outcome.
- Semantic verification cannot rescue vague defect definitions or vague invariants. Cases should be narrow and observable.
- The certificate is a consensus-backed assessment of the frozen evidence model, not a formal mathematical proof of all program behaviour.
- The contract deliberately has no payments, token, reputation system or privileged override.

## Deployment state

FIXPOINT is live on Studionet 61999 at `0x1eAa37F79a3402596dE72062E20EcF1Fb2D62b77`. The production frontend is https://fixpoint-psi.vercel.app/. `deployments/studionet.json` records the finalized deployment transaction, exact source commit and source SHA-256. The prior contract is historical; it is not the current frontend target. See `docs/LIVE_RESULT.md` for the controlled lifecycle evidence.
