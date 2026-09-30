# Final controlled Studionet lifecycle

Verified on 2026-09-30 against the production frontend at https://fixpoint-psi.vercel.app/case?id=stale-signer-control and Studionet chain 61999.

## Deployed source

- Contract: `0xb196e8d498a9E95c129a48b302BC2585B7053346`
- Source commit: `2245652c04b6e53ca8b127e272273f7180689f35`
- `contracts/fixpoint.py` SHA-256: `49e91303cce66aef440fb00a0b832e28f04b0347814e3b1f6d490dc4b3b514a7`
- Finalized deployment: https://explorer-studio.genlayer.com/tx/0xbe701f148d63ac16dba687b916ae2529fca05072b6f8e4f541f743d9d83ec90d

## Exact fixture and transactions

- Repository: https://github.com/Ifem1/fixpoint
- Base: `bb6419d90392894e8c56d60cae855263233fc894`
- Candidate: `38d7b8af2acb7d29b957c42d7d9b1ecc85359e1c`
- Case: `stale-signer-control`
- Candidate ID: `stale-signer-fix-1`
- Finalized open case: https://explorer-studio.genlayer.com/tx/0xec06a975973d3f0881cd54bee8a81ed5fbba9bf29aad34c080367a19c50d7443
- Finalized submit candidate: https://explorer-studio.genlayer.com/tx/0x4d748f03ff73b51d6048f58d6eb73828502e4eb33879c04c93a1e6272cd10e14
- Finalized assess candidate: https://explorer-studio.genlayer.com/tx/0x14d6d089122b503904ed63a7dcaaac54db451621ff93cb02e9d27f4d984f11d7

The assessment receipt reached `MAJORITY_AGREE` and `FINALIZED`. Independent contract reads after refreshing the production page returned case status `PROVEN`, candidate outcome `FIX_PROVEN`, baseline `REPRODUCED`, candidate `RESOLVED`, witness `INTACT`, and no failed or unproven invariant IDs. The certificate digest is `c50910768fb1ae1ae795cce7d687ddcbd343455268fab412a94468b31fba7cab`; the evidence digest is `65779294f2071142f1c3ba23d437b898766a79ebd99a0619255fb57662a9d7a7`.

Earlier superseded contract deployments produced `INVALID_PROOF` at `0x788Cdeec22C1134F2Bb8Fd14f70156981A1748ad` and `REGRESSION` at `0x9e9aD5FaF7796bD7BC2AE014A58F2C19f3C57826`. These immutable outcomes prompted narrow source corrections, full CI reruns, and redeployment. The final production frontend and deployment manifest point to `0xb196e8d498a9E95c129a48b302BC2585B7053346` only.
