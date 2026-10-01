# Final controlled Studionet lifecycle

Verified on 2026-10-01 through the production frontend at https://fixpoint-psi.vercel.app/case?id=stale-signer-final-control and independent reads from the new contract on Studionet chain 61999.

## Deployed source

- Contract: `0x1eAa37F79a3402596dE72062E20EcF1Fb2D62b77`
- Source commit: `c73c231386b982c9bd707d34fded5594e3ded436`
- `contracts/fixpoint.py` SHA-256: `6ce610441dff41904ff58b6382358e3c1e420f482dd463514589cf4d67fd3c67`
- Finalized deployment: https://explorer-studio.genlayer.com/tx/0xbc7832911600445e50ffd0da96d047e0b126de408f767f519e44995e3ed9f6a8

## Controlled fixture and finalized transactions

- Repository: https://github.com/Ifem1/fixpoint
- Base: `bb6419d90392894e8c56d60cae855263233fc894`
- Candidate: `38d7b8af2acb7d29b957c42d7d9b1ecc85359e1c`
- Frozen witness: `examples/fixpoint-demo/witness.md` at the base SHA; the same path is protected.
- Case: `stale-signer-final-control`
- Candidate ID: `stale-signer-final-fix`
- Open case, `FINALIZED`: https://explorer-studio.genlayer.com/tx/0x2592a9efcb2f310e7ebcbaa1df0dbc8341dd6e4dc1dd2f2f5c46ec6a925f346e
- Submit candidate, `FINALIZED`: https://explorer-studio.genlayer.com/tx/0xd00392bcbe1f5f7a8b02b53afa61dc2d438415f65e317b27d224ac4a5686a14e
- Assess candidate, `FINALIZED`, `MAJORITY_AGREE`: https://explorer-studio.genlayer.com/tx/0x247ca2121947a4872d77bade69a710708f83d2cde9982bf5cb9ea506d47cefa2

The explorer showed each transaction's `To` address as the new contract and decoded the operations as `open_case`, `submit_candidate`, and `assess_candidate`. The CLI receipts also reported `FINALIZED`; `ACCEPTED` remained provisional in the frontend transaction tracker.

## Final canonical state

After a hard refresh, the production case page reconstructed status `PROVEN`, candidate outcome `FIX_PROVEN`, baseline `REPRODUCED`, candidate `RESOLVED`, and witness `INTACT`. `INV-CONNECT`, `INV-DISCONNECT`, `INV-RECONNECT`, and `INV-PUBLIC-READ` were each displayed as `PRESERVED`. Direct `get_case`, `get_candidate`, and `get_certificate` reads from the new contract agreed with the browser. The candidate record had empty failed and unproven invariant ID fields.

- Case digest: `0ec4922f0c68be422a18615b98f54f9a4884c108e584c1f020ce842add5f16ad`
- Certificate digest: `c50910768fb1ae1ae795cce7d687ddcbd343455268fab412a94468b31fba7cab`
- Evidence digest: `65779294f2071142f1c3ba23d437b898766a79ebd99a0619255fb57662a9d7a7`

The certificate digest is deterministic for this same frozen case/evidence tuple and therefore equals the earlier lifecycle's digest. This record was read directly from the **new** contract and is bound to the new case ID and candidate ID.

## Production browser verification

- The public `/cases` page loaded without a wallet, displayed Studionet 61999 and the new contract address, and initially read an empty ledger from the new contract.
- The agent connected Rabby through the frontend. The wallet chip displayed `0x7d1170bc98624f98183972fabd69418bb7d5d541`.
- The agent filled and submitted the open-case and candidate forms, triggered intelligent assessment, and followed the transaction tracker through finalized state. The user approved each wallet signature in Rabby.
- Refreshing the open-case form while its transaction was pending recovered the transaction hash from the browser journal. Once final, the frontend offered a link to the finalized case. A later hard refresh reconstructed the full proof and certificate from contract state.
- The production frontend's explorer links opened Studionet explorer pages. The explorer pages, refreshed after finality, showed the correct contract target, operation, and `FINALIZED` status.
- At desktop width, the case header, evidence, status, and certificate displayed normally. At 390 px mobile emulation, a fresh capture and DOM layout check found no horizontal overflow; all measured elements stayed within the page width.
- Explicit disconnect cleared the account chip, retained public reads, and changed the open-case action to `CONNECT WALLET`. Reconnection restored the same Rabby address.
- With Rabby temporarily on another network, the open-case action became `SWITCH TO 61999`, blocking the write. Clicking it switched Rabby to GenLayer Studionet; the frontend displayed a network-switch success message and restored `OPEN CASE`.
- Browser console errors came from multiple wallet extensions competing to inject `window.ethereum` (MetaMask and another extension). No FIXPOINT application error was observed; Rabby connection and all three writes succeeded.
- Account-change event: **NOT EXERCISED — single account available**.
