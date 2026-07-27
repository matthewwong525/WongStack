# wong-sync Specification

## Purpose

Keeping a repo current with WongStack: a bare `/wong-sync` refreshes a cached WongStack clone, three-way-diffs every payload file against the commit the repo last synced to, and pulls upstream updates into the target's working tree. On the explicit `/wong-sync contribute` it also curates genuinely-local improvements as opt-in candidates and opens the upstream PR itself (fork-aware, release ritual included) — pulling first either way. It replaced the installer's update mode and the retired `/contribute-wong-stack`. It runs no git in the target repo and owns full git in the clone.

## Requirements

### Requirement: One-pass round trip, pull before contribute

The `wong-sync` skill SHALL be **pull-only by default**. A bare invocation SHALL refresh the clone, classify every in-manifest payload file, pull upstream changes into the target's working tree, rewrite the manifest, and report — and SHALL NOT curate local drift or prompt about contributing.

The contribute leg SHALL run only when explicitly requested (`/wong-sync contribute`). When requested, the skill SHALL run the full round trip in a single invocation, in this order: refresh the clone → pull upstream changes into the target → identify remaining local drift as contribution candidates → open an upstream PR for approved contributions. The pull leg MUST complete before the contribute leg begins, so that drift already resolved upstream self-cancels and is never offered back up. This ordering is behavior, not a prompt: an explicit contribute run still pulls first.

#### Scenario: Bare sync never mentions contributing

- **WHEN** the user runs `/wong-sync` with no argument
- **THEN** the skill pulls upstream updates, rewrites the manifest, and reports
- **AND** it neither curates local drift nor asks whether to contribute anything

#### Scenario: Explicit contribute runs the full round trip

- **WHEN** the user runs `/wong-sync contribute`
- **THEN** the pull leg completes first, then local-only drift is curated as candidates and approved files become an upstream PR

#### Scenario: Local change already landed upstream

- **WHEN** a payload file was customized locally, an equivalent change has already been merged into WongStack upstream, and the user runs `/wong-sync contribute`
- **THEN** the pull leg brings the file into sync and the contribute leg does not offer it as a candidate

#### Scenario: Refuses to run in the WongStack source

- **WHEN** `/wong-sync` is invoked inside a WongStack clone itself (the resolved clone equals the current repo)
- **THEN** the skill stops without changing anything, explaining the source has nothing to sync with itself

### Requirement: Clone in the XDG cache, disposable

The skill SHALL keep the WongStack clone at `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`, record that path in the manifest as `upstream.clone`, and treat the recorded path as a hint: a missing or broken clone is silently re-cloned; a present clone is fetched and reset to the upstream default branch so every sync starts from a clean, current base. A dirty clone MUST NOT be reset without warning and confirmation.

#### Scenario: Recorded clone path was wiped

- **WHEN** the manifest's `upstream.clone` path does not exist or is not a git repo
- **THEN** the skill re-clones into the cache location and proceeds, updating the manifest

#### Scenario: Clone has uncommitted changes

- **WHEN** `git status --porcelain` in the clone is non-empty at sync start
- **THEN** the skill warns and asks before resetting, and does not discard the changes unprompted

### Requirement: Three-way classification against a recorded base

The manifest SHALL record `commit` — the clone HEAD the target last installed or synced to. For each payload-manifest file, the skill SHALL compare base→upstream and base→local (base content via `git show <commit>:<path>` in the clone) and classify it: upstream-only change → pull down; local-only change → contribution candidate; both changed → true conflict, shown three-way and asked; neither → silent skip. Only classifications requiring a decision are surfaced to the user.

#### Scenario: Upstream moved, local untouched

- **WHEN** a file differs from base upstream but matches base locally
- **THEN** it is presented as an upstream update to pull, batch-approvable, not as a conflict

#### Scenario: Both sides changed

- **WHEN** a file differs from base on both sides
- **THEN** the skill shows a three-way view and asks how to resolve before writing anything

#### Scenario: No recorded base (pre-existing install)

- **WHEN** the manifest lacks a `commit` field
- **THEN** the skill falls back to a two-way walk for this sync, says so up front, and records the clone HEAD as `commit` when the sync completes

### Requirement: Fresh-install mode via seed manifest

`/wong-sync` SHALL treat a manifest whose `commit` is null as a fresh install handed off by `wong-setup`, and SHALL classify every payload file three-way against the **empty tree** as base: files absent locally classify as upstream updates (the pull, batch-approvable, is the install); files present locally that differ classify as conflicts, resolved keep-local / take-upstream / **keep under another name** — a rename recorded in the manifest's `components.skills`. On a fresh run the contribute leg SHALL be idle (no contribution candidates exist against an empty base) and the changelog walk SHALL be skipped (there is no prior version); the sync SHALL report the version being installed instead. Pulled files land in the working tree for `/save`, and the real manifest — actual `version`, `commit`, components — is written last, exactly as on any sync. A manifest with a real `commit` SHALL behave exactly as before; fresh behavior triggers only on `commit: null`.

#### Scenario: Fresh repo pull

- **WHEN** `/wong-sync` runs on a seed manifest in a repo with no payload files
- **THEN** every manifest file is offered as one batch-approvable pull, the contribute leg does nothing, and the manifest is rewritten with the real version and commit afterward

#### Scenario: Collision during fresh install

- **WHEN** the target already has a skill named `save` that differs from WongStack's
- **THEN** the file surfaces as a conflict with keep / take-upstream / keep-under-another-name, and a rename is recorded in `components.skills`

#### Scenario: Installed repo unaffected

- **WHEN** the manifest carries a real `commit`
- **THEN** classification, changelog walk, and the contribute leg behave exactly as before this change

### Requirement: CLAUDE.md block insertion when no markers exist

On a fresh-mode sync, when the target's `CLAUDE.md` lacks `WONG-STACK:BEGIN/END` markers (or the file does not exist), `/wong-sync` SHALL insert the block (markers included) without modifying any content outside it — creating the file if needed. On every sync, content outside the markers SHALL remain untouched, as today.

#### Scenario: CLAUDE.md exists without markers

- **WHEN** a fresh-mode sync meets a `CLAUDE.md` with the user's own content and no markers
- **THEN** the block is appended with its markers and the user's content is byte-identical outside them

### Requirement: No git in the target; full git in the clone

The skill SHALL NOT run any git command that mutates the target repo (no add, commit, branch, push): pulled updates land in the target's working tree for the user to review and `/save`. In the clone, the skill SHALL own the full git flow for contributions: create a branch, commit the copied files together with the release ritual (VERSION bump + newest-first CHANGELOG entry) in one commit, push, open the PR, then return the clone to a clean default branch. If no contributions are approved, the clone is left untouched — no ritual, no branch, no PR.

#### Scenario: Pull leg finishes

- **WHEN** upstream updates have been applied to the target
- **THEN** they exist only as working-tree edits and the skill directs the user to `/save`, having made no target-side commits

#### Scenario: Contributions approved

- **WHEN** at least one candidate is approved
- **THEN** the clone gets one branch with one commit containing the files, the VERSION bump, and the CHANGELOG entry; the branch is pushed; a PR is opened; and the clone ends checked out clean on the default branch

#### Scenario: Nothing approved

- **WHEN** every candidate is skipped or there are none
- **THEN** the clone remains pristine and no VERSION/CHANGELOG edits are made

### Requirement: Fork-aware upstream PR

At PR time the skill SHALL check push permission on the upstream repo. With push access, it branches and opens the PR directly on upstream. Without it, it forks (`gh repo fork`) once, pushes the branch to the fork, opens the PR against upstream, and records the fork URL in the manifest's `upstream.fork` for reuse on later syncs.

#### Scenario: Internal team member with push access

- **WHEN** the user can push to the upstream repo
- **THEN** the branch and PR are created directly on upstream and no fork is created

#### Scenario: External contributor, first sync

- **WHEN** the user lacks push access and the manifest has no `upstream.fork`
- **THEN** the skill forks, pushes there, opens the PR against upstream, and saves the fork URL in the manifest

#### Scenario: PR cannot be opened

- **WHEN** `gh` is unauthenticated or the network is unavailable at PR time
- **THEN** the pull leg's results stand, and the skill reports the contribution branch left in the clone for a later push rather than failing the whole sync

### Requirement: Curation bar for contributions

When the contribute leg runs (only on explicit request), each contribution candidate SHALL carry a one-line generality rationale answering "does this belong in every WongStack repo?". Contributing is opt-in: the default disposition is skip, and drift the skill judges app-specific or marginal is presented as such. Approved candidates' rationales become the PR body. Because the leg no longer runs unprompted, a repo with local drift SHALL accumulate no prompts during ordinary syncs.

#### Scenario: App-specific drift

- **WHEN** a payload file's local change encodes something specific to this repo and the contribute leg is running
- **THEN** the skill recommends skip with its rationale, and the file moves upstream only on an explicit opt-in

#### Scenario: PR body content

- **WHEN** the upstream PR is created
- **THEN** its body lists each contributed file with its generality rationale

#### Scenario: Local drift is silent on a bare sync

- **WHEN** a repo has locally modified payload files and the user runs a bare `/wong-sync`
- **THEN** those files are not surfaced as contribution candidates and no prompt about them appears

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list (which files sync) SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else installs through the fresh-mode pull. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages — **including a contributing page documenting how to send a payload improvement upstream** — and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — that is read and copied **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be read or copied. Files outside the manifest MUST never be read or copied in either direction. A payload skill installed under a different local name SHALL be diffed under that name via the manifest's skills mapping.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill
- **THEN** the sync's pull leg offers the update like any other payload file

#### Scenario: App files cannot leak

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never reads them and they cannot appear in the clone or the PR

#### Scenario: Pack files are in-manifest only for opt-in repos

- **WHEN** `/wong-sync` runs in a repo whose manifest lacks `components.stackPack: true`
- **THEN** the pack's files are treated as outside the manifest — never classified, pulled, or offered
- **AND** in a repo with `components.stackPack: true`, those same files are classified and pulled like any other payload file

#### Scenario: Target repos receive the contributing page

- **WHEN** a repo installs or syncs the payload
- **THEN** the contributing page arrives with the other synced docs, so the way to contribute is discoverable without the prompt

### Requirement: The opt-in pack refreshes through the existing three-way diff

For a repo with `components.stackPack: true`, `/wong-sync` SHALL refresh the pack's drop-in files using the same three-way classification it applies to every payload file — no separate refresh mechanism. A pack file unchanged locally since install and changed upstream SHALL update silently in the batch; a pack file edited locally SHALL be shown and asked before any overwrite; a file changed on both sides SHALL surface as a three-way conflict. The pack's guided config fragments (the merges into target-owned files) SHALL follow the `CLAUDE.md`-block precedent rather than whole-file replacement.

#### Scenario: Untouched pack file updates silently

- **WHEN** a repo took the pack, has not edited `scripts/cf-build.sh`, and upstream ships a new version
- **THEN** the file classifies as an upstream update and refreshes in the batch-approvable pull

#### Scenario: Locally edited pack file is not clobbered

- **WHEN** a repo edited its copy of a pack script and upstream also changed it
- **THEN** `/wong-sync` shows the three-way view and asks before writing, never overwriting the local edit silently

### Requirement: Manifest schema v2, lazily migrated

`.claude/.wong-stack.json` SHALL gain `commit` and `upstream { repo, fork, clone }`. Old manifests remain valid: missing keys are filled in during the first sync and the manifest is rewritten last, reflecting what actually happened.

#### Scenario: First sync on a v1 manifest

- **WHEN** the manifest predates the schema (no `commit`, no `upstream`)
- **THEN** the sync completes (two-way fallback) and writes a v2 manifest with `commit`, `upstream.repo`, `upstream.clone`, and `upstream.fork` when one exists

### Requirement: Installer defers updates to wong-sync

`wong-setup` SHALL handle fresh integrations only. When a manifest with a real `commit` already exists, it skips the consultation, installs/updates nothing except ensuring the `wong-sync` skill is present, then directs the user to run `/wong-sync`. Its legacy-traces step SHALL offer to remove an installed or symlinked `contribute-wong-stack` (superseded by `/wong-sync`). `wong-sync`'s source-repo detection SHALL identify a WongStack source by `VERSION` alongside `.claude/skills/wong-setup/`.

#### Scenario: Re-run on an installed repo

- **WHEN** `/wong-setup` runs in a repo whose `.claude/.wong-stack.json` has a real `commit`
- **THEN** it skips the pitch, ensures `wong-sync` is installed (bootstrapping older installs), makes no other changes, and says to run `/wong-sync` for updates

#### Scenario: Leftover contribute-wong-stack

- **WHEN** the skill or sync finds an installed/symlinked `contribute-wong-stack`
- **THEN** it offers to remove it, noting `/wong-sync` supersedes it

#### Scenario: No manifest during sync

- **WHEN** `/wong-sync` runs in a repo with no `.claude/.wong-stack.json` at all
- **THEN** it stops and points at `/wong-setup` for the fresh integration — a missing manifest means "not installed"; only a seed manifest (`commit: null`) means "install now"

### Requirement: Contributing is documented rather than prompted

The payload SHALL include a contributing page at the wiki root explaining how to send a payload improvement upstream: that `/wong-sync contribute` runs the leg, what the generality bar is ("does this belong in every WongStack repo?"), that approval is opt-in per file, and that the skill opens the upstream PR itself (fork-aware, with the VERSION + CHANGELOG release ritual). Payload prose SHALL NOT describe an ordinary sync as contributing improvements back — descriptions, skill openers, the `WONG-STACK` block, and the README SHALL frame `/wong-sync` as pulling updates, with contributing named as an explicit, separate action.

#### Scenario: A reader finds how to contribute

- **WHEN** someone wants to send a workflow improvement upstream
- **THEN** the contributing page tells them to run `/wong-sync contribute` and states the generality bar and the opt-in-per-file rule

#### Scenario: No payload prose implies automatic contribution

- **WHEN** a reader reviews the `wong-sync` description and opener, the `WONG-STACK` block, the README skill table, and the wiki
- **THEN** none of them describe a plain `/wong-sync` as contributing anything upstream
