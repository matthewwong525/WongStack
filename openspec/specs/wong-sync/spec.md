# wong-sync Specification

## Purpose

Keeping a repo current with WongStack, by **adaptation rather than replication**: a repo is up to date when the *capability* is present in it, in whatever form fits — not when its files match upstream's byte for byte. `/wong-sync` takes no arguments. It refreshes a cached WongStack clone, brings its own skill files current before considering any other file so the run executes upstream's latest logic, copies in verbatim any payload file the target does not have, updates payload files that are provably unmodified (byte-identical to a historical upstream version), hands every other file the target *does* have to the capability analysis (the `wong-sync-adapt` capability), records the verdicts in a durable ledger, and reports. It **never modifies a file with local authorship**, which is the guarantee that replaced its three-way diff and every conflict prompt that went with it. It runs no git in the target repo, treats the clone as read-only, opens no pull requests, and proposes rather than implements. It replaced the installer's update mode and the retired `/contribute-wong-stack`; contributing upstream is now a manual pull request.

## Requirements

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

### Requirement: Clone in the XDG cache, disposable

The skill SHALL keep the WongStack clone at `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`, record that path in the manifest as `upstream.clone`, and treat the recorded path as a hint: a missing or broken clone is silently re-cloned; a present clone is fetched and reset to the upstream default branch so every sync starts from a clean, current base. A dirty clone MUST NOT be reset without warning and confirmation.

#### Scenario: Recorded clone path was wiped

- **WHEN** the manifest's `upstream.clone` path does not exist or is not a git repo
- **THEN** the skill re-clones into the cache location and proceeds, updating the manifest

#### Scenario: Clone has uncommitted changes

- **WHEN** `git status --porcelain` in the clone is non-empty at sync start
- **THEN** the skill warns and asks before resetting, and does not discard the changes unprompted

### Requirement: No git in the target; full git in the clone

`/wong-sync` SHALL NOT run any git command that mutates the target repo (no add, commit, branch, push): the verdict record and the proposed change folder — and, on a seed manifest only, the copied payload files — land in the working tree for the user to review and `/save`. The clone SHALL be treated as **read-only** — the skill fetches, checks out, and resets it to the upstream default branch, and SHALL NOT create branches, commits, or pushes there. A dirty clone MUST NOT be reset without warning and confirmation. Reading the clone's history to prove that a local file is unmodified, and reading the clone's own `wong-sync` instructions to run under them, SHALL NOT count as mutating it.

#### Scenario: A run finishes

- **WHEN** the analysis has completed and a change folder has been written
- **THEN** the verdict record and the change folder exist only as working-tree edits and the skill directs the user to review and `/save`, having made no target-side commits

#### Scenario: Clone is never written to

- **WHEN** any `/wong-sync` run completes
- **THEN** the clone is on the upstream default branch with no branch, commit, or push created by the skill

#### Scenario: Reading the clone's instructions is not a mutation

- **WHEN** the run follows the clone's `wong-sync` instructions instead of the installed ones
- **THEN** nothing is written to the clone and nothing is written to the local skill directory

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

`version` and `commit` SHALL record **which upstream release this repo's payload files were brought to** — a fact about files, not about what a run examined. Because the manifest is written by a task, it SHALL NOT be rewritten by a run that only plans: an unapplied plan leaves the manifest untouched, so the next run walks the same changelog span again rather than believing the repo is current. Capability adoption SHALL NOT be tracked here; the verdict record recomputes every verdict except `declined` on every run, so a partly applied plan re-proposes what was not taken regardless of the recorded version.

The schema SHALL be stated in exactly one payload place — the `wong-sync` skill, its writer of record. `wong-setup` SHALL reference that statement for the seed manifest rather than carry its own copy, so the `components.skills` list and every other field exist once.

Old manifests remain valid: missing keys are filled in by the manifest task and written last among the file tasks. A manifest carrying a `capabilities` map from an earlier version SHALL have it folded into the verdict record and then dropped, per the `wong-sync-adapt` capability. `upstream.fork` SHALL remain readable where an earlier version recorded one, and SHALL NOT be written.

#### Scenario: First sync on an older manifest

- **WHEN** the manifest predates the schema (no `commit`, no `upstream`)
- **THEN** the change folder carries a task to write `commit`, `upstream.repo`, and `upstream.clone`

#### Scenario: Seed manifest

- **WHEN** the manifest's `version` and `commit` are null because `wong-setup` just handed off
- **THEN** every payload file is copied during the run and the real `version` and `commit` are filled in

#### Scenario: An unapplied plan does not advance the version

- **WHEN** a run writes a plan and the user does not run `/apply`
- **THEN** the manifest is unchanged
- **AND** the next run walks the same changelog span rather than treating the repo as current

#### Scenario: A partly applied plan hides nothing

- **WHEN** the file tasks are applied but some adoption tasks are not
- **THEN** the manifest records the payload state that landed
- **AND** the unapplied capabilities are recomputed and re-proposed on the next run

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

`/wong-sync` SHALL NOT modify or replace any file in the target repo that a human or another tool authored. Its entire write scope SHALL be: payload files that were absent, **payload files that are provably unmodified (byte-identical to a historical upstream version of that path, per the update-if-untouched rule)**, the `WONG-STACK` block where no markers existed, the OpenSpec change folder the analysis proposes, `.claude/.wong-stack.json`, and `.claude/wong-sync-verdicts.md`. This guarantee replaces every conflict-resolution mechanism the skill previously carried — there SHALL be no three-way view, no keep-local / take-upstream prompt, no batch approval of overwrites, and no rename-on-collision option, because no overwrite of authored content is ever attempted.

The carve-out SHALL be scoped by **authorship**, not kept as a list of exceptions: the skill may rewrite what it (or the installer, or an upstream release) generated, and SHALL NOT rewrite any file a human or another tool authored. A provably unmodified payload file carries no local authorship — every byte of it came from an upstream release — so updating it clobbers nobody's work. Any file whose content matches no historical upstream version SHALL keep the absolute guarantee and be handed to the capability analysis.

The two generated files the skill solely owns — `.claude/.wong-stack.json` and `.claude/wong-sync-verdicts.md` — SHALL be rewritten on every run. `.claude/wong-sync-verdicts.md` SHALL carry a generated-file header saying so, and the run SHALL read its ticked checkboxes before regenerating it so that the one supported user edit is not lost.

#### Scenario: Locally customized skill is safe

- **WHEN** a repo has heavily edited its copy of a payload skill and upstream has also changed it
- **THEN** the file is left byte-identical and the difference is handled by the capability analysis

#### Scenario: Any local edit defeats the carve-out

- **WHEN** a payload file differs by even one byte from every historical upstream version of its path
- **THEN** it is never updated in place, regardless of how small the difference is

#### Scenario: No prompts about clobbering

- **WHEN** any `/wong-sync` run completes
- **THEN** the user was never asked to choose between a local and an upstream version of a file

#### Scenario: Generated files are regenerated

- **WHEN** a second run produces new verdicts
- **THEN** `.claude/wong-sync-verdicts.md` is rewritten in place, having first been read for ticked checkboxes
- **AND** no file outside the skill's generated set is modified

### Requirement: Absent payload files are copied directly

For each file in the payload manifest, `/wong-sync` SHALL classify per file on three cases: **absent** → plan to copy it in verbatim; **present and provably unmodified but stale** → plan to update it to upstream's current version per the update-if-untouched rule; **present otherwise** → leave it byte-identical and hand it to the capability analysis. The threshold is per file, not per repo: a fresh install is simply the case where every manifest file is absent, and SHALL NOT be a distinct mode.

Classification SHALL NOT write anything. The planned copies and updates SHALL be carried into the change folder as tasks and performed by `/apply` — except on a **seed manifest**, where they are performed during the run because the copy is the install.

For `CLAUDE.md`, the unit is the `WONG-STACK` block rather than the file: absent markers (or an absent file) SHALL cause the block to be planned for insertion with its markers, creating the file if needed and leaving all other content byte-identical; present markers SHALL send the block to the analysis and SHALL NOT be rewritten in place. The block SHALL be excluded from update-if-untouched.

#### Scenario: New upstream skill arrives

- **WHEN** upstream ships a payload skill the target does not have
- **THEN** it is planned as a copy task, with no analysis needed to decide
- **AND** it is not written during the run

#### Scenario: Edited file is never copied over

- **WHEN** a payload file exists locally and differs from every historical upstream version of its path
- **THEN** it is neither copied nor updated, and is handed to the capability analysis

#### Scenario: Fresh install falls out of the general rule

- **WHEN** `/wong-sync` runs on a seed manifest, where no payload file exists yet
- **THEN** every manifest file is copied in as the install, with no separate fresh-mode branch beyond the seed-manifest exception

#### Scenario: CLAUDE.md with the user's own content and no markers

- **WHEN** the target's `CLAUDE.md` has content but no `WONG-STACK` markers
- **THEN** a task is written to insert the block with its markers, leaving everything outside them byte-identical

### Requirement: Provably unmodified payload files are updated directly

For a payload file that exists locally, `/wong-sync` SHALL determine whether it is **provably unmodified**: its git blob hash equals the blob hash of some version of that path in the clone's default-branch history. History SHALL be looked up under the upstream path (using the manifest's skills mapping where a skill was installed under a different local name) and the write SHALL target the local path.

- Local blob equals the current upstream blob → the file is current; nothing is planned.
- Local blob equals a historical upstream blob but not the current one → the file is provably unmodified and stale; the skill SHALL plan to replace it with upstream's current version, as a task in the change folder rather than a write during the run.
- Local blob matches no historical upstream blob → the file SHALL NOT be touched and SHALL be handed to the capability analysis.

The `WONG-STACK` block of `CLAUDE.md` SHALL be excluded from this rule. Opt-in categories (stack pack, app scaffold) participate only when their manifest gates already place them in the file list — this rule SHALL NOT widen what is in scope.

Every file planned this way SHALL appear under an **Updated** heading in the proposal, one line per file naming the version span, distinct from the **Copied** list, so each intended write is visible before it happens.

#### Scenario: Stale unmodified skill is planned, not written

- **WHEN** a repo's copy of a payload skill is byte-identical to the version an earlier release shipped and upstream has since changed it
- **THEN** the sync plans its replacement as a task and does not write the file during the run
- **AND** the file appears under the proposal's Updated heading with its version span

#### Scenario: Deliberately pinned-but-unedited file is visible before it changes

- **WHEN** a repo kept an old upstream version of a payload file without editing it
- **THEN** the update is planned like any provably unmodified stale file and named in the proposal, and the plan review is where a wrong update is caught — before the file changes

#### Scenario: Renamed skill is proven against its upstream path

- **WHEN** a payload skill was installed under a different local name recorded in `components.skills` and its content is byte-identical to a historical upstream version
- **THEN** the proof runs against the upstream path's history and the planned task targets the local path

#### Scenario: Current files are untouched

- **WHEN** a local payload file already equals upstream's current version
- **THEN** nothing is planned and nothing is reported for it beyond its ordinary verdict

### Requirement: A sync run writes no repo files

`/wong-sync` SHALL write exactly two paths in the target: `.claude/wong-sync-verdicts.md` and one OpenSpec change folder. Every other change it wants — copying an absent payload file, updating a provably unmodified one, inserting the `WONG-STACK` block, installing its own newer version, rewriting the manifest — SHALL be written as a task in that change and performed later by `/apply`.

This makes the skill's stated rule — *it proposes; it never implements* — true of the whole run rather than of one step, and makes the review gate the repo's own change loop rather than a prompt inside the skill. The run SHALL remain non-interactive.

**One exception, by name:** a **seed manifest** (`version` and `commit` both null, meaning `/wong-setup` has just handed off) SHALL cause the payload files to be copied before the analysis, because on that path the bulk copy *is* the install and there is no existing repo state for it to supersede. An **absent** manifest is unchanged: the run stops and points at `/wong-setup`.

#### Scenario: An ordinary run changes no file

- **WHEN** `/wong-sync` runs in an installed repo with payload files absent, stale, or both
- **THEN** no payload file is written, and the intended copies and updates appear as tasks in the change folder
- **AND** the only paths written are the verdict record and the change folder

#### Scenario: The gate is the loop

- **WHEN** a run finishes with a plan to review
- **THEN** the user reviews, edits, or discards the change, and `/apply` performs it
- **AND** the skill asks no interactive question during the run

#### Scenario: Seed manifest copies first

- **WHEN** the manifest's `version` and `commit` are both null
- **THEN** every payload file is copied in as the install before the analysis runs
- **AND** the proposal describes those files as landed rather than as tasks

#### Scenario: The exception is stated where the rule is

- **WHEN** a reader consults the skill's hard rules
- **THEN** the seed-manifest exception is stated alongside the writes-nothing rule, so the rule is never read as unconditional

### Requirement: The run follows upstream's instructions without installing them

Following the newest instructions and installing them SHALL be separate acts. After the clone is refreshed, `/wong-sync` SHALL apply the provably-unmodified proof to its own skill directory — `SKILL.md` and `references/**` under the local `wong-sync` path — and:

- **Provably unmodified and stale** → the run SHALL read `SKILL.md` and `references/**` **from the clone**, discard the instructions it was running under, re-run the manifest-resolution step against the newer text, and follow it for the remainder of the run. It SHALL NOT write those files; installing them SHALL be an ordinary task in the change folder.
- **Not provably unmodified** → the run SHALL continue under the installed text and SHALL NOT read the clone's version in its place. A locally edited `wong-sync` was changed deliberately, and the adaptation SHALL be proposed through the ordinary `adopt` path.

The refreshed clone and everything derived from it SHALL be reused; the clone SHALL NOT be fetched or reset a second time.

The report SHALL name which version's logic the run followed and why — including the version span when it followed the clone's, and the installed version plus the reason when it did not.

#### Scenario: An untouched skill runs upstream's newest logic

- **WHEN** the local `wong-sync` files are byte-identical to an earlier upstream release and upstream has since changed them
- **THEN** the run follows the clone's instructions for the remainder of the run
- **AND** the local files are not written, and their installation is a task in the change folder

#### Scenario: A customized skill keeps its own logic

- **WHEN** the local `wong-sync` differs from every historical upstream version
- **THEN** the run continues under the installed text, does not read the clone's version in its place, and does not modify the local files
- **AND** the capability analysis proposes the adaptation as an ordinary `adopt`

#### Scenario: No self-modifying decision procedure

- **WHEN** any run completes
- **THEN** the skill that decided what to propose was never rewritten by the run that used it

#### Scenario: Version skew is reported

- **WHEN** a run followed instructions other than the installed ones
- **THEN** the report names the version span it followed and states that the run's decisions came from the newer text
