# Deployment procedure

The deployment sequence is designed to keep the deployed contract source auditable against Git history.

## 1. Verify the checkout

Start from a clean tree and install dependencies in Windows PowerShell. The same gates run separately on Ubuntu in GitHub Actions.

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
npm run gl:version
npm run check:repo
npm run typecheck
npm run lint
npm run test:frontend
npm run build
.\.venv\Scripts\genvm-lint.exe check contracts/fixpoint.py
.\.venv\Scripts\python.exe -m pytest tests/direct -q
```

The local CLI must report `0.39.1`.

## 2. Select Studionet

```powershell
npm run genlayer -- network set studionet
npm run gl:network
```

Confirm chain ID `61999` and RPC `https://studio.genlayer.com/api` before signing a deployment.

## 3. Freeze the source revision

Commit every contract change before deployment. Record:

```powershell
git rev-parse HEAD
npm run source:hash
```

If the contract source changes after this point, repeat tests, commit again and redeploy. Do not retain an address for obsolete source.

## 4. Deploy

Use the repository-local CLI:

```powershell
npm run gl:deploy
```

Capture the real deployed address and deployment transaction. Do not infer either value.

Update `deployments/studionet.json` with:

- address;
- deployment transaction;
- source commit from step 3;
- source SHA-256 from step 3.

Then run:

```powershell
npm run verify:deployment
```

## 5. Configure frontend

Set the frontend environment value:

```text
NEXT_PUBLIC_FIXPOINT_CONTRACT_ADDRESS=<real address>
```

No deployer key belongs in the Next.js environment.

Rebuild after setting the address:

```powershell
npm run build
```

## 6. Publish frontend

Deploy the Next.js application to Vercel. Set only the public contract-address environment variable required by the app.

After deployment, test desktop and narrow/mobile widths and inspect the browser console for critical errors.

## 7. Execute a real lifecycle

Use `docs/LIVE_VALIDATION.md` to create a controlled public case from the repository's immutable fixture revisions, then:

1. open the case through the frontend;
2. wait until the transaction is Finalized;
3. submit the exact candidate through the frontend;
4. wait until submission is Finalized;
5. trigger intelligent assessment through the frontend;
6. observe Accepted only as provisional;
7. wait for Finalized;
8. refresh the page;
9. read the case and certificate back from the contract;
10. record all real transaction hashes and explorer links.

## 8. Evidence commit

Documentation-only evidence may be committed after deployment. Keep the manifest's `sourceCommit` pointing at the exact revision whose contract source was deployed.
