# wong-sync — delta

## ADDED Requirements

### Requirement: The skill updates itself before the run proceeds

Immediately after the clone is refreshed, and before any other payload file is considered, `/wong-sync` SHALL apply the update-if-untouched rule to its own skill directory — `SKILL.md` and `references/**` under the local `wong-sync` skill path. When those files are provably unmodified and stale, the skill SHALL bring them current and then **follow the updated instructions for the remainder of the run**:

- It SHALL re-read `SKILL.md` and `references/**` from disk and discard the instructions it was running under.
- It SHALL re-run the manifest-resolution step against the updated instructions, because a newer version may read a manifest key the previous one never consulted.
- It SHALL keep the refreshed clone and the values derived from it, and SHALL NOT fetch or reset the clone a second time.

The self-update pass SHALL run **at most once per run**. Files handled by the pass SHALL NOT be considered again by the general copy-and-update loop.

When the local `wong-sync` files are **not** provably unmodified, the pass SHALL NOT fire and SHALL NOT modify them. The run SHALL state plainly that it is continuing on the installed version, name that version, and let the capability analysis propose the adaptation through the ordinary `adopt` path.

The report SHALL name a self-update when one occurred, including the version it moved from and to, and SHALL make clear that the remainder of the run followed the newer instructions.

#### Scenario: An untouched skill runs its own latest version

- **WHEN** the local `wong-sync` files are byte-identical to an earlier upstream release and upstream has since changed them
- **THEN** they are brought current before any other payload file is considered
- **AND** the rest of the run follows the updated instructions rather than the ones it started with

#### Scenario: A customized skill is never overwritten and never silently bypassed

- **WHEN** the local `wong-sync` differs from every historical upstream version
- **THEN** the self-update pass does not fire and the files are untouched
- **AND** the run states that it is continuing on the installed version, and the capability analysis proposes the adaptation as an ordinary `adopt`

#### Scenario: The pass cannot loop

- **WHEN** a run has already performed the self-update pass
- **THEN** it does not perform the pass again during that run

#### Scenario: The clone is not refreshed twice

- **WHEN** the self-update pass fires
- **THEN** the already-refreshed clone and the values derived from it are reused, with no second fetch or reset

#### Scenario: Version skew is reported

- **WHEN** a run self-updated partway through
- **THEN** the report names the version it moved from and to and states that the remainder of the run followed the newer instructions

## MODIFIED Requirements

### Requirement: One behavior, no arguments

`/wong-sync` SHALL take no arguments and expose exactly one behavior. A run SHALL: refresh the clone, bring its own skill files current, copy absent payload files and update provably unmodified ones, run the capability analysis specified by the `wong-sync-adapt` capability, rewrite the manifest, and report. There SHALL be no contribute leg, no curation of local drift, no prompt about contributing, and no pull request opened by the skill in any circumstance.

An invocation carrying the retired `contribute` argument SHALL stop with a short explanation pointing at the contributing page's manual route, rather than silently running an ordinary sync.

#### Scenario: A sync never mentions contributing

- **WHEN** the user runs `/wong-sync`
- **THEN** it copies absent files, analyses the rest, rewrites the manifest, and reports
- **AND** it neither curates local drift nor asks whether to contribute anything

#### Scenario: Retired contribute argument

- **WHEN** the user runs `/wong-sync contribute`
- **THEN** the skill explains that the leg was removed and points at the contributing page's manual route, without running a partial sync

#### Scenario: Refuses to run in the WongStack source

- **WHEN** `/wong-sync` is invoked inside a WongStack clone itself (the resolved clone equals the current repo)
- **THEN** the skill stops without changing anything, explaining the source has nothing to sync with itself

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else arrives through the sync's copy-if-absent step. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages — **including a contributing page documenting the manual route for sending a payload improvement upstream** — and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — in scope **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be copied or analysed.

The manifest bounds what the skill **copies**. It SHALL NOT bound what the analysis's surveyor **reads**, which is specified by the `wong-sync-adapt` capability; no read content leaves the machine. A payload skill installed under a different local name SHALL be recognized under that name via the manifest's skills mapping, so it counts as present rather than absent.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill and the target's copy is provably unmodified
- **THEN** the self-update pass brings it current before any other payload file is considered
- **AND** where the target's copy has local edits instead, it is left untouched and the update is handled by the capability analysis

#### Scenario: Non-manifest files are never copied

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never copies over them

#### Scenario: Renamed skill counts as present

- **WHEN** a payload skill was installed under a different local name recorded in `components.skills`
- **THEN** it is treated as present and analysed, not copied in a second time under the default name

#### Scenario: Pack files are in scope only for opt-in repos

- **WHEN** `/wong-sync` runs in a repo whose manifest lacks `components.stackPack: true`
- **THEN** the pack's files are treated as outside the manifest — never copied or analysed
- **AND** in a repo with `components.stackPack: true`, those files are copied if absent and analysed if present

#### Scenario: Target repos receive the contributing page

- **WHEN** a repo installs or syncs the payload
- **THEN** the contributing page arrives with the other copied docs, so the way to contribute is discoverable

### Requirement: No git in the target; full git in the clone

`/wong-sync` SHALL NOT run any git command that mutates the target repo (no add, commit, branch, push): copied files, files brought current, and the proposed change folder land in the working tree for the user to review and `/save`. The clone SHALL be treated as **read-only** — the skill fetches, checks out, and resets it to the upstream default branch, and SHALL NOT create branches, commits, or pushes there. A dirty clone MUST NOT be reset without warning and confirmation. Reading the clone's history to prove that a local file is unmodified SHALL NOT count as mutating it.

#### Scenario: A run finishes

- **WHEN** absent files have been copied and a change folder written
- **THEN** they exist only as working-tree edits and the skill directs the user to `/save`, having made no target-side commits

#### Scenario: Clone is never written to

- **WHEN** any `/wong-sync` run completes
- **THEN** the clone is on the upstream default branch with no branch, commit, or push created by the skill

#### Scenario: A self-update is still working-tree only

- **WHEN** the skill has brought its own files current during a run
- **THEN** those files are uncommitted working-tree edits awaiting `/save`, exactly like any other copied or updated file
