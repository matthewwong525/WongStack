# wong-sync Specification (delta)

## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: The skill updates itself before the run proceeds

**Reason**: The pass conflated *following* upstream's newest instructions with *installing* them, which made the skill rewrite its own decision procedure before the user could review anything — the one write that could never be gated. Following is a read of the already-fetched clone and needs no write at all.

**Migration**: Replaced by *The run follows upstream's instructions without installing them* (ADDED above). The blob-hash proof, the discard-and-re-read discipline, the never-refresh-the-clone-twice rule, and the version-skew disclosure all carry over unchanged; only the write is removed, and installing the newer files becomes an ordinary task in the change folder. The at-most-once rule is dropped as unnecessary — with no write there is nothing to loop on.
