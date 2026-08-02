# wong-sync Specification

## Purpose

Keeping a repo current with WongStack, by **adaptation rather than replication**: a repo is up to date when the *capability* is present in it, in whatever form fits — not when its files match upstream's byte for byte. `/wong-sync` takes no arguments. It refreshes a cached WongStack clone, copies in verbatim any payload file the target does not have, hands every file the target *does* have to the capability analysis (the `wong-sync-adapt` capability), records the verdicts in a durable ledger, and reports. It **never modifies a file that already exists**, which is the guarantee that replaced its three-way diff and every conflict prompt that went with it. It runs no git in the target repo, treats the clone as read-only, opens no pull requests, and proposes rather than implements. It replaced the installer's update mode and the retired `/contribute-wong-stack`; contributing upstream is now a manual pull request.

## Requirements

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

### Requirement: Clone in the XDG cache, disposable

The skill SHALL keep the WongStack clone at `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`, record that path in the manifest as `upstream.clone`, and treat the recorded path as a hint: a missing or broken clone is silently re-cloned; a present clone is fetched and reset to the upstream default branch so every sync starts from a clean, current base. A dirty clone MUST NOT be reset without warning and confirmation.

#### Scenario: Recorded clone path was wiped

- **WHEN** the manifest's `upstream.clone` path does not exist or is not a git repo
- **THEN** the skill re-clones into the cache location and proceeds, updating the manifest

#### Scenario: Clone has uncommitted changes

- **WHEN** `git status --porcelain` in the clone is non-empty at sync start
- **THEN** the skill warns and asks before resetting, and does not discard the changes unprompted

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

`.claude/.wong-stack.json` SHALL carry `version`, `commit`, `upstream { repo, fork, clone }`, and `components`. It SHALL record **install state only** — what is installed here, from where, and as of when. It SHALL NOT carry verdicts, reasons, or judgment commits; those live solely in `.claude/wong-sync-verdicts.md`, specified by the `wong-sync-adapt` capability.

The schema SHALL be stated in exactly one payload place — the `wong-sync` skill, its writer of record. `wong-setup` SHALL reference that statement for the seed manifest rather than carry its own copy, so the `components.skills` list and every other field exist once.

`commit` SHALL record the clone HEAD the repo last synced against — it is not a diff base, since nothing diffs — and SHALL drive the changelog walk.

Old manifests remain valid: missing keys are filled in during the first sync and the manifest is rewritten last, reflecting what actually happened. A manifest carrying a `capabilities` map from an earlier version SHALL have it folded into the verdict record and then dropped, per the `wong-sync-adapt` capability. `upstream.fork` SHALL remain readable where an earlier version recorded one, and SHALL NOT be written.

#### Scenario: First sync on an older manifest

- **WHEN** the manifest predates the schema (no `commit`, no `upstream`)
- **THEN** the sync completes and writes `commit`, `upstream.repo`, and `upstream.clone`

#### Scenario: Seed manifest

- **WHEN** the manifest's `version` and `commit` are null because `wong-setup` just handed off
- **THEN** the sync proceeds by the general rule (every manifest file is absent, so every one is copied) and fills in the real `version` and `commit` last

#### Scenario: Manifest carrying a stale fork URL

- **WHEN** a manifest recorded `upstream.fork` under a previous version
- **THEN** the value is preserved as-is and never used or updated

#### Scenario: Manifest carrying a capability ledger

- **WHEN** the sync runs on a manifest that still carries a `capabilities` map
- **THEN** the rewritten manifest omits that key, and the entries survive in `.claude/wong-sync-verdicts.md`

#### Scenario: The manifest is read for install state

- **WHEN** a reader or a later run opens `.claude/.wong-stack.json`
- **THEN** it answers what is installed, from where, and as of when
- **AND** it answers nothing about what was judged, which the verdict record owns

#### Scenario: One schema statement in the payload

- **WHEN** the schema gains or changes a field
- **THEN** the edit happens in the `wong-sync` skill alone
- **AND** `wong-setup` needs no matching edit, because it references rather than restates

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

### Requirement: Never overwrite an existing file

`/wong-sync` SHALL NOT modify or replace any file in the target repo that it did not itself generate. Its entire write scope SHALL be: payload files that were absent, the `WONG-STACK` block where no markers existed, the OpenSpec change folder the analysis proposes, `.claude/.wong-stack.json`, and `.claude/wong-sync-verdicts.md`. This guarantee replaces every conflict-resolution mechanism the skill previously carried — there SHALL be no three-way view, no keep-local / take-upstream prompt, no batch approval of overwrites, and no rename-on-collision option, because no overwrite of authored content is ever attempted.

The last two paths are **generated files the skill solely owns**, and SHALL be rewritten on every run. The carve-out SHALL be scoped by authorship rather than kept as a list of exceptions: the skill may rewrite a file it generates, and SHALL NOT rewrite any file a human or another tool authored. `.claude/wong-sync-verdicts.md` SHALL carry a generated-file header saying so, and the run SHALL read its ticked checkboxes before regenerating it so that the one supported user edit is not lost.

#### Scenario: Locally customized skill is safe

- **WHEN** a repo has heavily edited its copy of a payload skill and upstream has also changed it
- **THEN** the file is left byte-identical and the difference is handled by the capability analysis

#### Scenario: No prompts about clobbering

- **WHEN** any `/wong-sync` run completes
- **THEN** the user was never asked to choose between a local and an upstream version of a file

#### Scenario: Generated files are regenerated

- **WHEN** a second run produces new verdicts
- **THEN** `.claude/wong-sync-verdicts.md` is rewritten in place, having first been read for ticked checkboxes
- **AND** no file outside the skill's generated set is modified

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
