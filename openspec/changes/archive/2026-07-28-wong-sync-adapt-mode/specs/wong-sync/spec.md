## ADDED Requirements

### Requirement: Never overwrite an existing file

`/wong-sync` SHALL NOT modify or replace any file that already exists in the target repo. Its entire write scope SHALL be: payload files that were absent, the `WONG-STACK` block where no markers existed, the OpenSpec change folder the analysis proposes, and `.claude/.wong-stack.json`. This guarantee replaces every conflict-resolution mechanism the skill previously carried — there SHALL be no three-way view, no keep-local / take-upstream prompt, no batch approval of overwrites, and no rename-on-collision option, because no overwrite is ever attempted.

#### Scenario: Locally customized skill is safe

- **WHEN** a repo has heavily edited its copy of a payload skill and upstream has also changed it
- **THEN** the file is left byte-identical and the difference is handled by the capability analysis

#### Scenario: No prompts about clobbering

- **WHEN** any `/wong-sync` run completes
- **THEN** the user was never asked to choose between a local and an upstream version of a file

### Requirement: Absent payload files are copied directly

For each file in the payload manifest, `/wong-sync` SHALL copy it into the target verbatim **if and only if** it does not exist locally. A file that exists locally SHALL NOT be copied, and SHALL instead be handed to the capability analysis. The threshold is per file, not per repo: a fresh install is simply the case where every manifest file is absent, and SHALL NOT be a distinct mode.

For `CLAUDE.md`, the unit is the `WONG-STACK` block rather than the file: absent markers (or an absent file) SHALL cause the block to be inserted with its markers, creating the file if needed and leaving all other content byte-identical; present markers SHALL send the block to the analysis and SHALL NOT be rewritten in place.

#### Scenario: New upstream skill arrives

- **WHEN** upstream ships a payload skill the target does not have
- **THEN** it is copied in directly, with no analysis needed to decide

#### Scenario: Existing file is never copied over

- **WHEN** a payload file exists locally in any state
- **THEN** it is not copied, whether or not it matches upstream

#### Scenario: Fresh install falls out of the general rule

- **WHEN** `/wong-sync` runs in a repo where no payload file exists yet
- **THEN** every manifest file is copied in as the install, with no separate fresh-mode branch

#### Scenario: CLAUDE.md with the user's own content and no markers

- **WHEN** the target's `CLAUDE.md` has content but no `WONG-STACK` markers
- **THEN** the block is inserted with its markers and everything outside them is byte-identical

## MODIFIED Requirements

### Requirement: One behavior, no arguments

`/wong-sync` SHALL take no arguments and expose exactly one behavior. A run SHALL: refresh the clone, copy absent payload files, run the capability analysis specified by the `wong-sync-adapt` capability, rewrite the manifest, and report. There SHALL be no contribute leg, no curation of local drift, no prompt about contributing, and no pull request opened by the skill in any circumstance.

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

### Requirement: No git in the target; full git in the clone

`/wong-sync` SHALL NOT run any git command that mutates the target repo (no add, commit, branch, push): copied files and the proposed change folder land in the working tree for the user to review and `/save`. The clone SHALL be treated as **read-only** — the skill fetches, checks out, and resets it to the upstream default branch, and SHALL NOT create branches, commits, or pushes there. A dirty clone MUST NOT be reset without warning and confirmation.

#### Scenario: A run finishes

- **WHEN** absent files have been copied and a change folder written
- **THEN** they exist only as working-tree edits and the skill directs the user to `/save`, having made no target-side commits

#### Scenario: Clone is never written to

- **WHEN** any `/wong-sync` run completes
- **THEN** the clone is on the upstream default branch with no branch, commit, or push created by the skill

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else arrives through the sync's copy-if-absent step. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages — **including a contributing page documenting the manual route for sending a payload improvement upstream** — and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — in scope **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be copied or analysed.

The manifest bounds what the skill **copies**. It SHALL NOT bound what the analysis's surveyor **reads**, which is specified by the `wong-sync-adapt` capability; no read content leaves the machine. A payload skill installed under a different local name SHALL be recognized under that name via the manifest's skills mapping, so it counts as present rather than absent.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill and the target already has one
- **THEN** the update is handled by the capability analysis, not by overwriting the file

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

### Requirement: The opt-in pack follows the same rules as any payload file

For a repo with `components.stackPack: true`, the pack's drop-in files SHALL follow the general rule — copied if absent, analysed if present, never overwritten. The pack's guided config fragments (merges into target-owned files such as `package.json` scripts, the `wrangler.jsonc` `d1_databases` block, `.env.example` variables, and the `.gitignore` `.dev.vars` entry) SHALL be offered as guided edits following the `CLAUDE.md`-block precedent — shown, applied only on confirmation, never blind-written — and SHALL be surfaced through the analysis when upstream changes one.

#### Scenario: Missing pack file arrives

- **WHEN** a repo took the pack and lacks `scripts/cf-build.sh`
- **THEN** the file is copied in directly

#### Scenario: Locally edited pack file is not clobbered

- **WHEN** a repo edited its copy of a pack script and upstream also changed it
- **THEN** the file is left untouched and the difference is handled by the capability analysis

### Requirement: Manifest schema, lazily migrated

`.claude/.wong-stack.json` SHALL carry `version`, `commit`, `upstream { repo, fork, clone }`, `components`, and `capabilities` (specified by the `wong-sync-adapt` capability). `commit` SHALL record the clone HEAD the repo last synced against — it is no longer a diff base, since nothing diffs — and SHALL drive the changelog walk and the ledger's notion of "since when." Old manifests remain valid: missing keys are filled in during the first sync and the manifest is rewritten last, reflecting what actually happened. `upstream.fork` SHALL remain readable where an earlier version recorded one, and SHALL NOT be written.

#### Scenario: First sync on an older manifest

- **WHEN** the manifest predates the schema (no `commit`, no `upstream`)
- **THEN** the sync completes and writes `commit`, `upstream.repo`, and `upstream.clone`

#### Scenario: Seed manifest

- **WHEN** the manifest's `version` and `commit` are null because `wong-setup` just handed off
- **THEN** the sync proceeds by the general rule (every manifest file is absent, so every one is copied) and fills in the real `version` and `commit` last

#### Scenario: Manifest carrying a stale fork URL

- **WHEN** a manifest recorded `upstream.fork` under a previous version
- **THEN** the value is preserved as-is and never used or updated

### Requirement: Installer defers updates to wong-sync

`wong-setup` SHALL handle fresh integrations only. When a manifest with a real `commit` already exists, it skips the consultation, installs/updates nothing except ensuring the `wong-sync` skill is present, then directs the user to run `/wong-sync`. Its legacy-traces step SHALL offer to remove an installed or symlinked `contribute-wong-stack` (superseded by `/wong-sync`). `wong-sync`'s source-repo detection SHALL identify a WongStack source by `VERSION` alongside `.claude/skills/wong-setup/`. No `wong-setup` prose SHALL describe a contribute leg, and its handoff SHALL NOT name a distinct fresh mode — it hands off to the one `/wong-sync` behavior.

#### Scenario: Re-run on an installed repo

- **WHEN** `/wong-setup` runs in a repo whose `.claude/.wong-stack.json` has a real `commit`
- **THEN** it skips the pitch, ensures `wong-sync` is installed, makes no other changes, and says to run `/wong-sync`

#### Scenario: Leftover contribute-wong-stack

- **WHEN** the skill or sync finds an installed/symlinked `contribute-wong-stack`
- **THEN** it offers to remove it, noting `/wong-sync` supersedes it

#### Scenario: No manifest during sync

- **WHEN** `/wong-sync` runs in a repo with no `.claude/.wong-stack.json` at all
- **THEN** it stops and points at `/wong-setup` for the fresh integration

### Requirement: Contributing is documented rather than prompted

The payload SHALL include a contributing page at the wiki root explaining how to send a payload improvement upstream **by hand**: fork the upstream repo, branch, make the change, apply the release ritual (semver `VERSION` bump plus a newest-first `CHANGELOG.md` entry), and open the PR. The page SHALL state the generality bar — "does this belong in every WongStack repo?" — and SHALL NOT describe any automated contribution command. Payload prose SHALL NOT describe `/wong-sync` as contributing improvements back — descriptions, skill openers, the `WONG-STACK` block, and the README SHALL frame it as pulling in what's missing and proposing what's worth adopting, with contributing named as a separate, manual action.

#### Scenario: A reader finds how to contribute

- **WHEN** someone wants to send a workflow improvement upstream
- **THEN** the contributing page gives them the manual fork-branch-ritual-PR route and states the generality bar

#### Scenario: No payload prose implies an automated contribution

- **WHEN** a reader reviews the `wong-sync` description and opener, the `WONG-STACK` block, the README skill table, and the wiki
- **THEN** none of them mention a `contribute` argument or describe any sync as contributing anything upstream

## REMOVED Requirements

### Requirement: Three-way classification against a recorded base

**Reason**: Nothing diffs any more. Files absent locally are copied verbatim; files present locally go to the capability analysis, which reasons about meaning rather than bytes. The four-cell classification, the `git show <base>:<path>` base lookup, the conflict walk, and the two-way fallback for manifests without a base all have no remaining role.

**Migration**: `commit` survives with a new meaning (the clone HEAD last synced against, driving the changelog walk and the ledger's `asOfCommit`), so no manifest edit is required. Behavior the classification used to provide — noticing a file is behind upstream — is now an `adopt` verdict whose task says to take the upstream version verbatim.

### Requirement: Fresh-install mode via seed manifest

**Reason**: Fresh install is no longer a mode. With the copy threshold set per file, a repo where every manifest file is absent is simply the degenerate case of the general rule, so the empty-tree base, the install-time collision walk, the keep-under-another-name option, and the skipped-changelog carve-out are all redundant.

**Migration**: A seed manifest (`version` and `commit` null) still works — every manifest file is absent, so every one is copied, and the real `version`/`commit` are written last. `wong-setup`'s handoff is unchanged; it simply no longer names a distinct mode on the other side.

### Requirement: CLAUDE.md block insertion when no markers exist

**Reason**: Folded into the general copy-if-absent rule, which now states the `WONG-STACK` block as its own unit — absent markers means insert, present markers means analyse.

**Migration**: None; the behavior is identical and specified in "Absent payload files are copied directly."

### Requirement: Fork-aware upstream PR

**Reason**: The contribute leg is removed entirely; the skill no longer opens pull requests, forks repositories, or writes to the clone.

**Migration**: Contribute by hand — fork the upstream repo, branch, apply the release ritual (`VERSION` bump + newest-first `CHANGELOG.md` entry), and open the PR yourself. The route is documented on the payload's contributing page. A contribution branch parked in the cached clone by an earlier version is untouched and can still be pushed manually.

### Requirement: Curation bar for contributions

**Reason**: With no contribute leg there are no contribution candidates to curate, and with no classification there is no notion of "local drift" to curate from.

**Migration**: The generality bar ("does this belong in every WongStack repo?") survives as guidance on the contributing page, applied by the human opening the PR rather than by the skill.

## RENAMED Requirements

- FROM: `### Requirement: One-pass round trip, pull before contribute`
- TO: `### Requirement: One behavior, no arguments`

- FROM: `### Requirement: Manifest schema v2, lazily migrated`
- TO: `### Requirement: Manifest schema, lazily migrated`

- FROM: `### Requirement: The opt-in pack refreshes through the existing three-way diff`
- TO: `### Requirement: The opt-in pack follows the same rules as any payload file`
