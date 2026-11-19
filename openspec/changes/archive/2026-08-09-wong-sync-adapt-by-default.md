<!-- openspec-archive v1 2026-08-09-wong-sync-adapt-by-default -->
<!-- file proposal.md utf8 5416 -->
# Adapt by default in /wong-sync

**Status:** ready-to-ship
**Open questions:** none

## Why

Users cannot trust `/wong-sync` to propose everything worth adopting: they must ask it to "adapt as much as possible" on each run. The conservatism is coded into the skill — `divergent` needs no evidence of intent, a graft the skill cannot describe is demoted to `not-applicable`, `present` claims currency that nothing verifies, and the changelog walk computes the list of small upstream improvements and then discards it. The caution is calibrated for overwriting files, but verdicts only write a proposal the user reviews — the safety gate already exists downstream, so the bias should invert.

## What Changes

- **Invert the verdict bias** in `.claude/skills/wong-sync/references/adapt.md`:
  - When in doubt between `adopt` and any other verdict, the verdict is `adopt` — a proposal is reviewable; a suppressed gap is not.
  - `divergent` requires naming a deliberate local alternative. A difference with no evidence of intent is `adopt`.
  - Remove the concreteness demotion: a graft that cannot yet be described concretely is an `adopt` whose task is to shape it with `/plan`, not `not-applicable`.
- **Make the changelog walk load-bearing**: every `CHANGELOG.md` entry between the manifest's `BASE` and the clone's `LATEST` must map to at least one verdict line — "reflected here" or `adopt` — and the report accounts for each entry, so "the sync missed X" becomes structurally impossible.
- **Update-if-untouched** in Step 2 of `.claude/skills/wong-sync/SKILL.md`: a local payload file byte-identical to any historical upstream version of that path (verified against the clone's git history) is provably unmodified — the sync updates it to upstream's current version directly, with no proposal round trip. This narrows the "never overwrite" guarantee from "any existing file" to "any file a human or another tool authored," which is the authorship principle the guarantee already claims to be scoped by.
- **Release ritual**: `VERSION` bump (minor), newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs`.

**Non-goals**: no new verdicts in the taxonomy, no auto-`/apply` of proposed adoptions, no change to the review flow (everything beyond provably-unmodified files still lands as a proposal the user reviews), no change to `declined` semantics or tick-to-overrule.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `wong-sync`: the "never overwrite an existing file" guarantee is re-scoped by authorship — Step 2 gains update-if-untouched for payload files byte-identical to a historical upstream version; everything human-authored keeps the absolute guarantee.
- `wong-sync-adapt`: verdict assignment gains an adopt-when-in-doubt default; `divergent` requires a named deliberate local alternative; the concreteness demotion to `not-applicable` is replaced by an `adopt` task to shape the graft; the changelog walk becomes a per-entry coverage check feeding verdicts and the report.

## Impact

- `.claude/skills/wong-sync/SKILL.md` — Step 1 (changelog walk wording), Step 2 (update-if-untouched), Step 5 (report), Hard rules.
- `.claude/skills/wong-sync/references/adapt.md` — gap-analysis rules, concreteness bar, report format.
- `VERSION`, `CHANGELOG.md` — payload release.
- Target repos: on next sync, more capabilities land as `adopt` proposals and provably-unmodified stale files update without a round trip; locally customized files are untouched, exactly as before.

## Decision log

- **2026-08-09** — Explored, planned, and implemented in one session. The `/explore` diagnosis located the conservatism in three spec rules (an unearned `divergent`, the concreteness demotion to `not-applicable`, an unverified `present`) plus the discarded changelog walk; the reframe that settled the direction: verdicts only write a reviewable proposal, so overwrite-level caution there is misallocated — a wrong `adopt` costs seconds, a wrong `divergent` hides the gap indefinitely. All three levers approved by the user and implemented: adopt-when-in-doubt bias in `references/adapt.md`, per-entry changelog accounting, and update-if-untouched in Step 2 proven by blob-hash match against the clone's default-branch history (any one-byte difference defeats the proof; `WONG-STACK` block excluded; renamed skills proven under the upstream path). A sixth verdict (`adopt-unshaped`) was ruled out — the distinction lives in task text. Accepted trade named in design.md: a deliberately pinned-but-unedited old file is indistinguishable from an unmodified stale one and will be updated, visibly, revertable at `/save` review. Released as 9.8.0; `check-payload-links.mjs` green. 13/13 tasks complete.
- **2026-08-09** — Shipped. Delta specs already folded into `openspec/specs/wong-sync/` and `openspec/specs/wong-sync-adapt/` at the pre-ship `/save`; change archived to `openspec/changes/archive/2026-08-09-wong-sync-adapt-by-default/` and checkpointed for the squash-merge of PR #61.
- **2026-08-09** — Merge conflict with `main`: releases 9.8.0 (walk scouting) and 9.9.0 (ship walks for evidence) landed upstream while this change was in flight, both touching only `VERSION`/`CHANGELOG.md` against us. Resolved by renumbering this release **9.8.0 → 9.10.0**; the changelog entry now sits above 9.9.0 and no payload content conflicted.

<!-- end proposal.md -->
<!-- file design.md utf8 8500 -->
# Design — adapt by default in /wong-sync

## Context

`/wong-sync` Step 3 assigns one of five verdicts per capability (`references/adapt.md`). Three rules drain verdicts away from `adopt`: `divergent` accepts any difference as "legitimate," the concreteness bar demotes an undescribable graft to `not-applicable`, and `present` is never checked for currency. Step 1 computes the changelog entries since the manifest's `BASE` and explicitly does not use them for decisions. Step 2 copies only absent files; a stale-but-unmodified file costs a proposal round trip (`adopt` task → review → `/apply`).

The caution rhetoric protects against overwriting authored files. Verdicts do not overwrite anything — a wrong `adopt` costs the user seconds in review; a wrong `divergent` or `present` hides the gap indefinitely. The costs are asymmetric and the current bias points the wrong way.

## Goals / Non-Goals

**Goals:**

- The default posture becomes "justify *not* adopting": a user who runs `/wong-sync` with no extra instruction gets every worthwhile, non-breaking adaptation proposed.
- Coverage is verifiable: every upstream changelog entry since the last sync is visibly accounted for.
- Small mechanical updates to files nobody here authored stop costing a proposal round trip.
- Locally authored or customized content keeps the absolute never-overwrite guarantee, unchanged.

**Non-Goals:**

- No new verdict in the taxonomy; no change to `declined` semantics, tick-to-overrule, or the two-subagent structure.
- No auto-`/apply`: everything except provably-unmodified file updates still lands as a reviewable proposal, and even direct updates land uncommitted for `/save` review.
- No change to the opt-in gates (stack pack, app scaffold) or to what the manifest bounds.

## Decisions

### 1. Invert the verdict bias in prose, not structure

The taxonomy stays; the assignment rules change in `references/adapt.md`:

- **Tie-break rule, stated once**: when the evidence supports both `adopt` and another verdict, the verdict is `adopt`. Rationale: an `adopt` is reviewed downstream; every other verdict is effectively final until someone reads the record.
- **`divergent` requires a named, deliberate local alternative.** The reason line must name the local mechanism (file, convention, or tool) that covers the capability. A difference the skill cannot attribute to a local decision is `adopt`, not `divergent`.
- **The concreteness demotion is removed.** A graft the skill cannot describe concretely becomes an `adopt` whose task says to shape it with the repo's own `/plan`. Rationale: "the skill couldn't express it" was being stored as "doesn't fit this repo," which mislabels an effort failure as a fit failure. `not-applicable` narrows to its other leg: an `assumes` the repo does not meet.

Alternative considered: a sixth verdict (`adopt-unshaped`). Rejected — the distinction lives fine in the task text, same reasoning the spec already applies to stale files, and a new verdict would ripple through the record shape and promotion rules for no user-visible gain.

### 2. Changelog walk becomes a coverage check

Step 1 already computes the `CHANGELOG.md` entries between the manifest's recorded version (`BASE`) and `LATEST`. Step 3 gains an accountability pass: every entry must map to at least one accounting line, one of:

- **reflected here** — the entry's effect is already present locally (names the evidence);
- **adopt** — covered by a verdict/task in this run (names the capability id);
- **updated directly** — covered by a Step 2 copy or update-if-untouched (names the file);
- **outside payload scope** — the entry touches nothing the payload delivers to targets (e.g. `wong-setup`, source-repo tooling).

The report prints the per-entry accounting. An entry with no line is a visible gap in the run's own output — this is the mechanism that makes "the sync missed X" structurally impossible rather than a matter of trust. Seed manifests keep today's behavior (no `BASE`, no walk, no accounting).

Alternative considered: driving verdicts *from* the changelog instead of from the cartographer's map. Rejected — the map catches capabilities that predate the last sync; the changelog only catches deltas. The walk is a completeness check on the map, not a replacement for it.

### 3. Update-if-untouched: provability via blob hashes

Step 2 gains a third row. For a payload file that exists locally, compute its git blob hash and compare it against the blob hashes of every version of that path in the clone's default-branch history:

```bash
LOCAL=$(git hash-object "$ROOT/<path>")
git -C "$WS" rev-list "$DEFAULT" -- "<path>" |
  while read c; do git -C "$WS" rev-parse -q --verify "$c:<path>"; done
```

If `LOCAL` appears in that list and differs from the current upstream blob, the file is **provably unmodified and stale**: every byte of it was written by some upstream release, so no human authorship exists to protect. The sync replaces it with upstream's current version directly — a working-tree edit like any copy, awaiting `/save`. If `LOCAL` equals the current upstream blob, the file is current (nothing to do). If `LOCAL` matches no historical blob, someone changed it — it keeps the full never-overwrite guarantee and goes to the adapt step, exactly as today.

Consequences and scoping:

- **The guarantee's wording changes from "any existing file" to authorship**, which is the principle the Hard rules already claim ("scoped by authorship, not a list of exceptions"). A byte-for-byte upstream copy was generated by the installer/sync; updating it clobbers nobody's work.
- **Renamed skills**: history is looked up under the *upstream* path (from the manifest's skills mapping), the write happens at the local path.
- **The `CLAUDE.md` `WONG-STACK` block is excluded.** The unit is a block inside a user-owned file, not a path with its own blob history; block extraction plus historical comparison is fragile and the file is by definition co-authored. The block stays on the adapt path.
- **Stack-pack and app-scaffold files** participate only when their opt-in gates already put them in the file list — the rule adds no scope.
- **Reporting**: Step 5 gains an **Updated** list alongside **Copied** — one line per file with the version span (e.g. `9.2.0 → 9.7.0`), so every direct write is visible at review.
- **The adapt step's "stale unmodified file → adopt verbatim" case narrows** to files that are stale but *not* provably unmodified (e.g. installed from a fork or an edited lineage) — rare, and the round trip is then exactly right.

Risk acknowledged: a repo that *deliberately* pinned an old upstream version without editing it is indistinguishable from an unmodified stale file and will be updated. Accepted — the update is visible in the Updated list and in the `/save` diff, reverting is one `git checkout`, and pinning-by-inaction was never a supported contract. A repo that wants a frozen file can edit it (one byte suffices) or decline the capability.

## Risks / Trade-offs

- [More `adopt` verdicts → noisier proposals] → The proposal is grouped and one-task-per-capability; the user skims and skips. `declined` and ticked boxes work unchanged, so a wrong `adopt` is refused once and stays refused.
- [Blob-hash walk cost] → One `rev-list` per present payload file, in a local clone; tens of files, sub-second each. Bounded by the manifest.
- [`rev-list` misses pre-rename history for files upstream itself renamed] → Then the local blob simply fails the proof and falls back to the adapt path — the failure mode is the status quo, never a wrong overwrite.
- [Changelog accounting inflates the report] → One line per entry since last sync; a frequently-syncing repo sees a handful. The accounting lives in the report, not the verdict record, so the record's shape is unchanged except where verdicts themselves changed.

## Migration Plan

Prose-only payload edit; no data or schema migration. Target repos pick it up as an ordinary `wong-sync` capability update on their next sync (the skill updates itself via the adapt path — or, once this ships, via update-if-untouched where their copy is provably unmodified). Release ritual: minor `VERSION` bump, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` must pass.

## Open Questions

None — the three levers were settled in the `/explore` session and the provability rule above resolves the one open design point.

<!-- end design.md -->
<!-- file tasks.md utf8 3457 -->
## 1. Verdict bias — .claude/skills/wong-sync/references/adapt.md

- [x] 1.1 Add the adopt-when-in-doubt tie-break to "The gap analysis": when the evidence supports both `adopt` and another verdict, the verdict is `adopt`; state the asymmetry (an `adopt` is reviewed downstream, every other verdict is effectively final until someone reads the record).
- [x] 1.2 Tighten `divergent` in the verdict table and prose: it requires a named, deliberate local alternative; the reason line must name the local mechanism; an unattributable difference is `adopt`, not `divergent`.
- [x] 1.3 Replace "The concreteness bar" demotion: a graft that cannot be described concretely becomes an `adopt` whose task says to shape it with the repo's own `/plan`; narrow `not-applicable` to unmet `assumes` only, everywhere it is defined (table, prose, and the "Check `assumes`" paragraph).
- [x] 1.4 Rescope the "stale-but-unmodified file is an ordinary `adopt`" paragraph to stale files that are **not** provably unmodified (fork or edited lineage), noting provably unmodified ones are updated directly at Step 2.

## 2. Changelog accountability — adapt.md + SKILL.md

- [x] 2.1 In SKILL.md Step 1, change the changelog walk's framing from "context for the report, not a decision" to input for Step 3's per-entry accounting.
- [x] 2.2 In adapt.md, add the accounting rule: every CHANGELOG.md entry between `BASE` and the clone's current version maps to at least one line — reflected here (evidence named) / adopt (capability id named) / updated directly (file named) / outside payload scope; seed manifests skip it.
- [x] 2.3 Add the per-entry accounting to adapt.md's "The report" section and SKILL.md's Step 5, so an unaccounted entry is a visible gap in the run's own output.

## 3. Update-if-untouched — .claude/skills/wong-sync/SKILL.md

- [x] 3.1 In Step 2, replace the two-row table (absent/present) with three cases: absent → copy verbatim; present and provably unmodified but stale → update to upstream's current version; present otherwise → untouched, hand to Step 3. Specify the proof: local `git hash-object` blob equals a blob of that path in the clone's default-branch history (`git -C "$WS" rev-list "$DEFAULT" -- <path>` walked with `rev-parse <commit>:<path>`); lookup under the upstream path via the manifest's skills mapping, write to the local path; the `WONG-STACK` block is excluded; opt-in gates unchanged.
- [x] 3.2 Update the "Never overwrite" hard rule (and the matching bullet in the skill opener and Step 2 prose) to the authorship scoping: never overwrite what a human or another tool authored; a provably unmodified payload file carries no local authorship. Any one-byte difference defeats the proof.
- [x] 3.3 Add the **Updated** list to Step 5's report — one line per directly updated file with its version span, distinct from **Copied**.
- [x] 3.4 Reconcile the skill `description:` frontmatter and CLAUDE.md's `WONG-STACK`-relevant prose ("it never modifies a file that already exists" → the authorship-scoped wording) wherever the old absolute claim appears in the payload (SKILL.md, README/wiki mentions if any — grep for "never modifies a file").

## 4. Release

- [x] 4.1 Add the newest-first CHANGELOG.md entry describing the three behaviors (adopt-when-in-doubt bias, changelog accountability, update-if-untouched) and bump VERSION (minor).
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and fix anything dead.

<!-- end tasks.md -->
<!-- file specs/wong-sync-adapt/spec.md utf8 6323 -->
# wong-sync-adapt — delta

## MODIFIED Requirements

### Requirement: One verdict per capability

The main thread SHALL assign every mapped capability exactly one verdict:

- **present** — the repo already has it, current.
- **divergent** — the repo solves it differently through a named, deliberate local alternative; no graft is proposed.
- **adopt** — missing, stale, or otherwise wanted here.
- **not-applicable** — the skill judged that it does not fit: an `assumes` this repo does not meet.
- **declined** — the user said no.

The taxonomy SHALL be split by **who decided**. `not-applicable` SHALL be the only verdict the skill may assign on its own judgment of poor fit, and `declined` SHALL be written **only** from a decision the user actually made — never from the skill's own inference.

**The bias SHALL point toward `adopt`.** When the evidence supports both `adopt` and any other verdict, the verdict SHALL be `adopt` — an `adopt` is reviewed downstream in the proposed change, while every other verdict is effectively final until someone reads the record, so the costs of a wrong call are asymmetric.

**`divergent` SHALL require a named, deliberate local alternative.** Its reason line MUST name the local mechanism — a file, convention, or tool — that covers the capability. A difference the skill cannot attribute to a local decision SHALL be verdicted `adopt`, not `divergent`.

**A graft that cannot yet be described concretely SHALL be verdicted `adopt`**, with a task that says to shape the graft with the repo's own `/plan`. It SHALL NOT be demoted to `not-applicable` — that verdict is reserved for an unmet `assumes`, a fit failure, and MUST NOT be used to record the skill's inability to express a graft.

Every verdict SHALL carry a one-line reason. Only `adopt` verdicts SHALL become tasks. `divergent` and `not-applicable` findings SHALL be listed one line each in the durable verdict record and SHALL NOT be proposed as work.

A payload file that exists locally, is behind upstream, and is **not** provably unmodified (per the `wong-sync` capability's update-if-untouched rule — e.g. a copy from a fork or an edited lineage) SHALL be verdicted `adopt` with a task instructing that the upstream version be taken verbatim. A provably unmodified stale file is updated directly at the copy step and does not reach this analysis as stale. There SHALL NOT be a separate verdict for either case — the distinction lives in the task text, not the taxonomy.

#### Scenario: A capability solved deliberately differently is left alone

- **WHEN** the repo achieves a capability through its own mechanism and the skill can name that mechanism
- **THEN** the verdict is `divergent`, the local form is named in the reason, and no adoption task is written

#### Scenario: An unattributable difference is adopted, not excused

- **WHEN** the repo's form of a capability differs from upstream and the skill cannot point at a deliberate local alternative
- **THEN** the verdict is `adopt`, not `divergent`

#### Scenario: In doubt means adopt

- **WHEN** the evidence for a capability supports both `adopt` and another verdict
- **THEN** the verdict is `adopt` and the gap surfaces in the reviewable proposal

#### Scenario: An unmet assumption is the skill's call, not the user's

- **WHEN** a capability assumes CI checks and the repo has no forge checks
- **THEN** the verdict is `not-applicable` with the assumption named
- **AND** it is not recorded as `declined`

#### Scenario: A graft that cannot be made concrete is still proposed

- **WHEN** the main thread cannot describe a graft in this repo's terms
- **THEN** the verdict is `adopt` and its task says to shape the graft with `/plan`
- **AND** it is not verdicted `not-applicable`

#### Scenario: Declined requires an actual refusal

- **WHEN** a run completes without the user having refused anything
- **THEN** no capability is newly verdicted `declined`

#### Scenario: Stale file that is not provably unmodified

- **WHEN** a payload file is behind upstream and its content matches no historical upstream version
- **THEN** the verdict is `adopt` and its task says to replace the file with the upstream version verbatim
- **AND** the file is not overwritten by the sync itself

#### Scenario: Only adopt becomes work

- **WHEN** verdicts are assigned
- **THEN** the proposed change contains one task per `adopt` capability and no task for any other verdict

## ADDED Requirements

### Requirement: Every changelog entry since the last sync is accounted for

When the manifest records a prior version (`BASE`), the analysis SHALL account for every `CHANGELOG.md` entry between `BASE` and the clone's current version. Each entry SHALL map to at least one accounting line, one of:

- **reflected here** — the entry's effect is already present locally, with the evidence named;
- **adopt** — covered by a verdict in this run, with the capability id named;
- **updated directly** — covered by a copy or direct update at the copy step, with the file named;
- **outside payload scope** — the entry touches nothing the payload delivers to targets.

The report SHALL print the per-entry accounting, so an entry with no line is a visible gap in the run's own output rather than a silent omission. The accounting SHALL live in the report; the verdict record's shape is unchanged by it.

A seed manifest (no prior version) SHALL skip the walk and the accounting, as today.

#### Scenario: A small upstream improvement cannot be silently skipped

- **WHEN** upstream shipped an entry between `BASE` and the current version whose effect is neither present locally nor covered by a copy or update
- **THEN** the run maps it to an `adopt` verdict, or the report visibly shows the entry unaccounted for

#### Scenario: An entry with no target-facing effect is accounted as such

- **WHEN** a changelog entry concerns only surfaces outside the payload manifest (such as `wong-setup` or source-repo tooling)
- **THEN** its accounting line says it is outside payload scope, rather than being omitted

#### Scenario: Seed manifest skips the accounting

- **WHEN** the manifest's `version` is null because `/wong-setup` just handed off
- **THEN** no changelog accounting is produced and the report states the version being installed

<!-- end specs/wong-sync-adapt/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 7206 -->
# wong-sync — delta

## MODIFIED Requirements

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

For each file in the payload manifest, `/wong-sync` SHALL act per file on three cases: **absent** → copy it in verbatim; **present and provably unmodified but stale** → update it to upstream's current version per the update-if-untouched rule; **present otherwise** → leave it byte-identical and hand it to the capability analysis. The threshold is per file, not per repo: a fresh install is simply the case where every manifest file is absent, and SHALL NOT be a distinct mode.

For `CLAUDE.md`, the unit is the `WONG-STACK` block rather than the file: absent markers (or an absent file) SHALL cause the block to be inserted with its markers, creating the file if needed and leaving all other content byte-identical; present markers SHALL send the block to the analysis and SHALL NOT be rewritten in place. The block SHALL be excluded from update-if-untouched.

#### Scenario: New upstream skill arrives

- **WHEN** upstream ships a payload skill the target does not have
- **THEN** it is copied in directly, with no analysis needed to decide

#### Scenario: Edited file is never copied over

- **WHEN** a payload file exists locally and differs from every historical upstream version of its path
- **THEN** it is not copied or updated, and is handed to the capability analysis

#### Scenario: Fresh install falls out of the general rule

- **WHEN** `/wong-sync` runs in a repo where no payload file exists yet
- **THEN** every manifest file is copied in as the install, with no separate fresh-mode branch

#### Scenario: CLAUDE.md with the user's own content and no markers

- **WHEN** the target's `CLAUDE.md` has content but no `WONG-STACK` markers
- **THEN** the block is inserted with its markers and everything outside them is byte-identical

## ADDED Requirements

### Requirement: Provably unmodified payload files are updated directly

For a payload file that exists locally, `/wong-sync` SHALL determine whether it is **provably unmodified**: its git blob hash equals the blob hash of some version of that path in the clone's default-branch history. History SHALL be looked up under the upstream path (using the manifest's skills mapping where a skill was installed under a different local name) and the write SHALL happen at the local path.

- Local blob equals the current upstream blob → the file is current; nothing is written.
- Local blob equals a historical upstream blob but not the current one → the file is provably unmodified and stale; the skill SHALL replace it with upstream's current version directly, as a working-tree edit awaiting `/save`, with no proposal round trip.
- Local blob matches no historical upstream blob → the file SHALL NOT be touched and SHALL be handed to the capability analysis.

The `WONG-STACK` block of `CLAUDE.md` SHALL be excluded from this rule. Opt-in categories (stack pack, app scaffold) participate only when their manifest gates already place them in the file list — this rule SHALL NOT widen what is in scope.

Every file updated this way SHALL be reported under an **Updated** list, one line per file naming the version span, distinct from the **Copied** list, so each direct write is visible at review.

#### Scenario: Stale unmodified skill updates without a round trip

- **WHEN** a repo's copy of a payload skill is byte-identical to the version an earlier release shipped and upstream has since changed it
- **THEN** the sync replaces it with the current upstream version as an uncommitted working-tree edit
- **AND** the file appears in the report's Updated list with its version span

#### Scenario: Deliberately pinned-but-unedited file is updated visibly

- **WHEN** a repo kept an old upstream version of a payload file without editing it
- **THEN** the file is updated like any provably unmodified stale file, the update is named in the Updated list, and the `/save` review is where a wrong update is caught and reverted

#### Scenario: Renamed skill is proven against its upstream path

- **WHEN** a payload skill was installed under a different local name recorded in `components.skills` and its content is byte-identical to a historical upstream version
- **THEN** the proof runs against the upstream path's history and the update is written to the local path

#### Scenario: Current files are untouched

- **WHEN** a local payload file already equals upstream's current version
- **THEN** nothing is written and nothing is reported for it beyond its ordinary verdict

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-09

~~~
<!-- end .openspec.yaml -->
