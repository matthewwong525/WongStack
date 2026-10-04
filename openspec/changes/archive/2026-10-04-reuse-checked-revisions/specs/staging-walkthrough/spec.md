## MODIFIED Requirements

### Requirement: The walk targets this commit's deployed preview

When there is something to verify, `/verify` SHALL bind evidence to the exact saved head revision, invoking `/save` only when current work is unsaved or unpushed. Deployed probes SHALL target the preview URL published for that revision through the applicable verified delivery route, never a guessed URL or naming pattern. CI behavior probes SHALL use captured evidence whose actual source revision and run identity match the revision being checked. Missing evidence for one surface SHALL block only dependent checks.

#### Scenario: Uncommitted work

- **WHEN** `/verify` runs with uncommitted work and a reachable scenario
- **THEN** `/save` runs first, and verification targets its saved revision and the discovered evidence for that revision

#### Scenario: CI does not deploy

- **WHEN** no preview URL exists for this commit and a scenario needs the deployed app
- **THEN** that scenario is unverified, no URL is guessed, and independent CI behavior checks can still complete

## ADDED Requirements

### Requirement: A saved revision is reused without another checkpoint

Verification of clean, already saved work SHALL use the existing exact-revision checkpoint, without another commit, push, record-only save or request to rerun settled checks. Reuse SHALL require matching local and authoritative remote revision and the applicable gate identity; a missing, foreign or unreadable identity SHALL remain unverified. A superseding run attempt SHALL NOT be concealed by an earlier pass. A fresh invocation SHALL still produce fresh walkthrough evidence; a cached verdict SHALL NOT replace it. A source repair SHALL invalidate dependent evidence and use the newly saved revision's checks, with unchanged independent checks retained only when their conditions remain valid.

#### Scenario: Ship has just saved the change

- **WHEN** `/ship` passes a current exact checkpoint and the selected work stays clean at the same authoritative remote head
- **THEN** `/verify` walks that revision without invoking `/save` again or restarting its settled checks

#### Scenario: An earlier passing result belongs to different work

- **WHEN** the local head, authoritative candidate, applicable run attempt or evidence revision does not match the passing result
- **THEN** the old result is not reused as proof of the current work and missing authoritative evidence remains unverified
