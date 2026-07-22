# wong-sync Specification

## Purpose

The WongStack round trip in one pass: `/wong-sync` refreshes a cached WongStack clone, three-way-diffs every payload file against the commit the repo last synced to, pulls upstream updates into the target's working tree, curates genuinely-local improvements as opt-in contribution candidates, and opens the upstream PR itself (fork-aware, release ritual included). It replaced the installer's update mode and the retired `/contribute-wong-stack`. It runs no git in the target repo and owns full git in the clone.

## Requirements

### Requirement: One-pass round trip, pull before contribute

The `wong-sync` skill SHALL run the full WongStack round trip in a single invocation, in this order: refresh the clone → pull upstream changes into the target → identify remaining local drift as contribution candidates → open an upstream PR for approved contributions. The pull leg MUST complete before the contribute leg begins, so that drift already resolved upstream self-cancels and is never offered back up.

#### Scenario: Local change already landed upstream

- **WHEN** a payload file was customized locally and an equivalent change has already been merged into WongStack upstream
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

Each contribution candidate SHALL carry a one-line generality rationale answering "does this belong in every WongStack repo?". Contributing is opt-in: the default disposition is skip, and drift the skill judges app-specific or marginal is presented as such. Approved candidates' rationales become the PR body.

#### Scenario: App-specific drift

- **WHEN** a payload file's local change encodes something specific to this repo
- **THEN** the skill recommends skip with its rationale, and the file moves upstream only on an explicit opt-in

#### Scenario: PR body content

- **WHEN** the upstream PR is created
- **THEN** its body lists each contributed file with its generality rationale

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list (which files sync) SHALL live in exactly one place, inside the `wong-sync` skill, and `install-wong-stack` SHALL reference it rather than keep a copy. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages, and the CLAUDE.md `WONG-STACK` block; it excludes `install-wong-stack`, `VERSION`, and `CHANGELOG.md`. Files outside the manifest MUST never be read or copied in either direction. A payload skill installed under a different local name SHALL be diffed under that name via the manifest's skills mapping.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill
- **THEN** the sync's pull leg offers the update like any other payload file

#### Scenario: App files cannot leak

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never reads them and they cannot appear in the clone or the PR

### Requirement: Manifest schema v2, lazily migrated

`.claude/.wong-stack.json` SHALL gain `commit` and `upstream { repo, fork, clone }`. Old manifests remain valid: missing keys are filled in during the first sync and the manifest is rewritten last, reflecting what actually happened.

#### Scenario: First sync on a v1 manifest

- **WHEN** the manifest predates the schema (no `commit`, no `upstream`)
- **THEN** the sync completes (two-way fallback) and writes a v2 manifest with `commit`, `upstream.repo`, `upstream.clone`, and `upstream.fork` when one exists

### Requirement: Installer defers updates to wong-sync

`install-wong-stack` SHALL handle fresh installs only. When a manifest already exists, it installs/updates nothing except ensuring the `wong-sync` skill is present, then directs the user to run `/wong-sync`. Its legacy-traces step SHALL offer to remove an installed or symlinked `contribute-wong-stack` and point at `/wong-sync`.

#### Scenario: Re-run on an installed repo

- **WHEN** `/install-wong-stack` runs in a repo that has `.claude/.wong-stack.json`
- **THEN** it ensures `wong-sync` is installed (bootstrapping older installs), makes no other changes, and says to run `/wong-sync` for updates

#### Scenario: Leftover contribute-wong-stack

- **WHEN** the installer or sync finds an installed/symlinked `contribute-wong-stack`
- **THEN** it offers to remove it, noting `/wong-sync` supersedes it
