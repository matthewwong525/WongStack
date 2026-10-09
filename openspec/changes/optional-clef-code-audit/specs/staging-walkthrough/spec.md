# Spec Delta

## ADDED Requirements

### Requirement: A requested code audit is advisory

Verification SHALL offer an optional code audit using the larger Clef model only when explicitly requested. Ordinary verification, including its normal ship invocation, SHALL make no audit call. The audit SHALL compare selected saved code against written expectations and a named earlier revision, separately from behavioral evidence. Its flags SHALL be inspected against source before any follow-up, and SHALL neither supply a verification verdict nor establish a repair or pass. Follow-up checks SHALL retain the existing scenario selection, observation, scope and repair limits. When ordinary verification has nothing to walk, the audit SHALL NOT cause a save or replace its `NONE` result.

#### Scenario: A suspicious code path

- **WHEN** a requested audit flags a possible violation of a selected scenario
- **THEN** the verifier inspects the code, records the flag separately, and grades any relevant existing follow-up check only from observed evidence against its written expectation

#### Scenario: Ordinary verification

- **WHEN** verification runs without a code-audit request
- **THEN** no audit model is called and the ordinary checks and verdict rules apply

### Requirement: Code audit inputs are bounded and private

A requested audit SHALL use code read from the exact saved revision and named baseline, limited to selected scenarios and confirmed related callers or contracts. It SHALL exclude images, behavioral captures and credentials, scrub text before sending or recording it, and keep temporary records outside the repository under the walk's existing cleanup rules. Limits and unavailable context SHALL be explicit; a missing credential, service error, invalid answer, changed revision or exceeded budget SHALL make the audit unavailable while independent ordinary checks continue. The report SHALL identify the model, revisions, audit limitations and flags inspected, dismissed or unresolved without presenting probabilities as proof.

#### Scenario: Dirty code differs from the saved revision

- **WHEN** a selected source file has unsaved contents differing from the revision bound to the audit
- **THEN** the audit reads the named saved source rather than those unsaved contents and identifies that revision in its record

#### Scenario: The audit cannot complete

- **WHEN** audit access, context, answer validity or its request budget prevents completion
- **THEN** the report names the audit limitation separately and independent verification checks continue under their existing verdict rules
