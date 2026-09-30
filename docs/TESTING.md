# Testing

The test strategy is behaviour-led rather than count-led.

## Direct Mode

`tests/direct/test_fixpoint.py` exercises the contract with controlled nondeterministic web and LLM results.

The Direct Mode fixture pins the official GenVM `v0.2.16` legacy bundle because `genlayer-test` `0.29.2` otherwise resolves a release whose expected archive URL is missing. The loader still selects the exact `py-genlayer` hash in `contracts/fixpoint.py`; it rejects the bundle if that runner is absent. This is test infrastructure only and does not change production contract source or dependencies.

Coverage includes:

- valid case creation and read-back;
- duplicate case rejection;
- malformed revision rejection;
- unauthorized cancellation;
- duplicate candidate revision rejection;
- genuine `FIX_PROVEN` derivation and certificate creation;
- case terminality after proof;
- `NOT_FIXED`;
- `REGRESSION`;
- protected verification path modification -> `INVALID_PROOF`;
- protected-path rename evasions are detected through GitHub `previous_filename`;
- unavailable evidence -> `UNPROVEN`;
- retry of an unproven candidate;
- validator disagreement preventing improper consensus.

The mocks are test-only. Production assessment always uses validator web retrieval and nondeterministic semantic evaluation.

## Frontend logic

`tests/frontend/` checks:

- transaction status normalization;
- provisional versus final lifecycle handling;
- case/candidate input parsing and validation;
- injected wallet account request;
- exact Studionet switching;
- add-network fallback when the wallet does not know the chain;
- wallet error normalization.

## Live integration

`tests/integration/test_studionet_smoke.py` is deliberately opt-in because it creates a real network deployment. With `RUN_STUDIONET=1` it deploys the contract through gltest and immediately calls `get_stats()` to prove the deployed interface can be read.

This smoke test is not a substitute for the full manual/browser lifecycle. The final live evidence should additionally show case creation, candidate submission, intelligent assessment, finalization and certificate read-back.

## Required pre-deployment gate

Run these commands from a clean checkout in Windows PowerShell. Ubuntu GitHub Actions runs the same gates with its own Python executable.

```powershell
npm ci
python -m venv .venv
npm run gl:version
npm run check:repo
npm run typecheck
npm run lint
npm run test:frontend
npm run build
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\genvm-lint.exe check contracts/fixpoint.py
.\.venv\Scripts\python.exe -m pytest tests/direct -q
```

Do not convert a failed contract/linter/build result into documentation claiming success. Fix the defect or preserve the failure in the handoff report.
