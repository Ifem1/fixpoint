# Security and evidence assumptions

## Authority

No administrator can rewrite case definitions or consensus outcomes. A case creator can cancel only an empty open case. Anyone may trigger assessment because either party being able to suppress independent judgment would weaken the protocol.

## Evidence provenance

Primary evidence is revision-bound. The contract checks GitHub repository identity and full SHA before semantic evaluation. Candidate supporting workflow evidence must report a matching candidate `head_sha` and a completed state.

## Protected verification material

A case freezes repository-relative paths whose modification invalidates the proof. This is intended for tests, workflows or other verification material that must not be weakened by the candidate itself.

The independent witness is separately bound by repository, full SHA and path. Validators fetch that exact immutable witness.

## Prompt injection

Repository content, documentation, source comments, test output and artifacts are untrusted evidence. The nondeterministic task explicitly instructs evaluators not to treat instructions inside evidence as control text. Material verdict fields are independently reconstructed by validators.

Prompt injection cannot be made mathematically impossible with an LLM-based evidence reader. The protocol therefore combines narrow prompts, bounded evidence, immutable provenance, deterministic protected-path checks and validator independence.

## Availability

A fetch outage must not silently become a negative judgment. Missing or contradictory material can result in `UNPROVEN`, preserving the distinction between evidence failure and software failure.

## Replay and duplicate handling

Case IDs and candidate IDs are unique. A candidate SHA cannot be resubmitted for the same case, and the same canonical evidence bundle cannot be replayed. Terminal candidates cannot be assessed again. Proven cases are terminal.

## Limits

FIXPOINT does not claim cryptographic execution attestation. It produces a decentralized semantic assessment of public, revision-bound evidence under a frozen protocol. Where stronger execution provenance is required, a future evidence provider can be added without turning the frontend into an authority.
