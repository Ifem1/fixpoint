# Controlled live lifecycle

The repository contains a deliberately small stale-signer fixture in `examples/fixpoint-demo/`. It exists to make the first public FIXPOINT lifecycle reproducible with immutable Git history.

Do not use working-tree files as evidence. Use the exact published commit SHAs recorded below after the repository is pushed.

## Revision pair

- Known-broken base commit: `bb6419d90392894e8c56d60cae855263233fc894`
- Candidate fix commit: `38d7b8af2acb7d29b957c42d7d9b1ecc85359e1c`
- Target repository: replace with the final public GitHub `owner/repo`
- Witness path: `examples/fixpoint-demo/witness.md`
- Base evidence path: `examples/fixpoint-demo/evidence/result.txt`
- Candidate evidence path: `examples/fixpoint-demo/evidence/result.txt`
- Protected path: `examples/fixpoint-demo/witness.md`

## Case definition

**Case ID**

`stale-signer-control`

**Defect statement**

After wallet A is disconnected and wallet B is connected, the signing identity can remain bound to wallet A instead of the newly connected wallet.

**Reproduction protocol**

Reset session state. Connect `0xaaaa`. Disconnect it. Connect `0xbbbb`. Read `currentSigner()`. Compare the observed signer to `0xbbbb` under the unchanged frozen witness.

**Failure signature**

`observed signer 0xaaaa after reconnecting 0xbbbb`

**Protected invariants**

- `INV-CONNECT`: Connecting a wallet selects that wallet as the current account.
- `INV-DISCONNECT`: Explicit disconnect leaves no active signer.
- `INV-RECONNECT`: Reconnecting a different wallet selects the new wallet.
- `INV-PUBLIC-READ`: Public account state remains readable without an active signer.

## Expected evidence relationship

The base evidence records the frozen failure signature. The candidate evidence records the corrected signer after the same sequence. The candidate patch changes the session implementation and evidence result but does not change the witness file.

The expected result is not hard-coded in FIXPOINT. Validators must independently retrieve the published revisions, witness and compare result and reach consensus before the contract can derive `FIX_PROVEN`.
