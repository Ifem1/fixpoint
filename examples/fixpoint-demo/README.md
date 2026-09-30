# Controlled lifecycle fixture

This tiny fixture exists only to create a public, commit-addressable before/after case for live FIXPOINT validation. It is not application state and the frontend does not read it.

The first repository commit containing this directory intentionally has a stale-signer defect. A later commit repairs `session.ts` while leaving `witness.md` untouched and updates the evidence result. Those two immutable revisions can be used to exercise a real FIXPOINT case after the repository is published.
