<!-- openspec-archive v1 2026-07-29-save-conversation-support -->
<!-- file proposal.md utf8 7377 -->
# save-conversation-support

**Status:** in-progress
**Open questions:** none

## Why

`/dream` can only consolidate what is in the **current conversation** — Phase 1 says "replay the conversation," and the designed-but-unbuilt sweep mode read `~/.claude/projects/*/` transcripts. Both are machine-local. So a long session on machine A dies there: `/save` pushes code and the change, but the conversation itself never enters the repo, and running `/dream` on machine B finds nothing to consolidate. The repo is supposed to be the shared memory, yet the raw material for the wiki is the one thing that never reaches it.

The same gap has a second face: a session that produces **no diff at all** — pure conversation that established real understanding. Today `/save` has one destination, an OpenSpec change, so it synthesizes a "plan" from a conversation that is not a plan, opens a branch and a PR proposing nothing, and files a `tasks.md` with zero tasks. The knowledge is real; the drawer is wrong.

## What Changes

- **New `notes/` surface** — `notes/<slug>.md`, one note per line of work, keyed by the **same slug as the branch and the change** so `notes/add-po-search.md` sits parallel to `openspec/changes/add-po-search/`. Permanent: notes are never deleted after consolidation, because they stay referenceable. Frontmatter carries the consolidation watermark (`consolidated:`), per-note rather than in a central ledger — a shared ledger would merge-conflict in exactly the multi-machine case this design exists to serve.
- **`/save` becomes the capture point.** It is the only skill that reads the conversation, and it writes a **concise-but-lossless** compression of the session into `notes/<slug>.md`: what the user stated, decisions and their rationale, what was ruled out and why, specifics (paths, names, versions, errors), open threads — dropping tool-call mechanics, file dumps, and the back-and-forth shape of getting somewhere. Subsequent saves **update the same note in place**, not append a new file per save.
- **`/save` stops forcing every session into a change.** A session with no code and no plan writes a note and skips the OpenSpec change entirely — no invented proposal, no empty `tasks.md`.
- **`/dream` reads only the repo.** Phase 1 capture no longer replays the conversation or touches transcripts; it reads unconsolidated `notes/*.md`, consolidates their facts into `wiki/`, and flips each consumed note's frontmatter. Phase 2 gardening still runs **with or without** new notes.
- **Sweep mode is deleted** from `/dream` — the designed-not-implemented section is obsolete by construction, since the backlog now lives in the repo instead of scattered across machines' transcript folders.
- **`/continue` reads the note alongside the proposal**, so a cold resume inherits the session context that the change deliberately does not hold.
- **`notes/` enters the payload manifest** (directory + a README explaining the convention) so `/wong-sync` installs it into target repos.
- **A notes-only save commits directly to the default branch** — no branch, no PR, no CI wait, no `/ship`. Scoped exactly by path: one changed file outside `notes/*.md` restores the normal flow. The gate isn't weakened, it moves to where judgment is exercised — a note is raw and non-canonical, so there's nothing to approve; `/dream`'s wiki edits, which *are* canonical, keep the full branch + PR gate.

**Non-goals:** no change to `/plan`, `/apply`, or `/ship`; no change to `/save`'s git mechanics for anything but the notes-only case; `/dream` still writes no git and is still deliberate-only; no cron or scheduled merge.

## Capabilities

### New Capabilities
- `session-notes`: the `notes/<slug>.md` surface and its lifecycle — who writes it (`/save`), who reads it (`/dream`, `/continue`), how it is keyed, when it is updated, and the frontmatter watermark that makes consolidation repeatable across machines.

### Modified Capabilities
- `delivery-gate`: the "gate is CI-when-present, else PR review" requirement gains a path-scoped notes-only exception — a save confined to `notes/*.md` commits directly to the default branch.

## Impact

- `.claude/skills/save/SKILL.md` — new note-writing step; the change becomes conditional rather than mandatory.
- `.claude/skills/dream/SKILL.md` — Phase 1 rewritten to read `notes/`; sweep-mode section removed; hard rules updated.
- `.claude/skills/continue/SKILL.md` — recap reads the parallel note.
- `.claude/skills/wong-sync/references/payload-manifest.md` — `notes/` added to the manifest.
- `openspec/specs/delivery-gate/` — the notes-only carve-out; `/save`'s "never push to the default branch" hard rule gains its one scoped exception.
- `notes/README.md` — new; the convention, and the boundary against `proposal.md`'s Decision log and `wiki/`.
- `CLAUDE.md` — the "Where context lives" section gains `notes/` as a knowledge surface.
- `VERSION` + `CHANGELOG.md` — payload edit, so a semver bump and a newest-first entry.

## Decision log

- **2026-07-28** — Settled how a notes-only save reaches `main`. Chose **direct push to the default branch**, path-scoped to `notes/*.md`. Ruled out: a **cron that merges notes PRs** (unattended writes to `main`; misclassifying once and merging unreviewed code is worse than the friction removed, and it puts live infrastructure into a prose toolkit); **`/dream` merging PRs** (breaks the no-git rule that makes `/dream` safe to run anywhere on a dirty tree, and inverts the dependency — it would have to merge notes before it could read them); and **`/save` auto-shipping a notes-only branch** (same act as direct-push with more steps, buying a paper trail git history already provides). The reasoning that unlocked it: the PR gate exists to stop unreviewed *behavior* reaching `main`, and a note is one additive, slug-unique, structurally conflict-free file that is raw and non-canonical by design — the judgment happens one step later when `/dream` proposes wiki edits, and *those* keep the full gate. Accepted cost: an explicit, narrow carve-out to `/save`'s "never push to the default branch" hard rule and to the `delivery-gate` spec.
- **2026-07-28** — Explored in this session. Chose a **separate `notes/` surface over folding notes into the OpenSpec change**, despite the change folder already having the right mechanic (a dated, append-only log, per-slug, mirrored to the PR body). Three things ruled it out: `/ship` archives the change, so `/dream`'s input set would move under `openspec/changes/archive/` and `/dream` would have to mutate the immutable record of what shipped; conversation-only sessions have no change, so notes would require inventing one — the exact defect being removed; and `proposal.md` must stay self-contained about *the work*, so folding in domain context dilutes the handoff surface `/continue` and the PR body depend on. The elegance comes from the **shared slug**, not a shared file. Also decided: keep notes forever (referenceable) rather than delete-on-consolidate; watermark in per-note frontmatter rather than a central `notes/.consolidated` ledger (merge conflicts); `/save` compresses but does **not** pre-apply `/dream`'s durable-facts filter, so the selection judgment stays repeatable rather than being made once on machine A; `/dream` Phase 2 gardens regardless of new notes.

<!-- end proposal.md -->
<!-- file design.md utf8 11727 -->
## Context

WongStack's premise is that the repo is the shared memory for humans and agents. Three knowledge surfaces exist today: `openspec/changes/` (what we're changing), `openspec/changes/archive/` + `openspec/specs/` (what shipped), and `wiki/` (how we do things). `/dream` is the only write path into `wiki/`, and its Phase 1 capture reads **the current conversation** — a machine-local source. Its unbuilt sweep mode would have read `~/.claude/projects/*/` JSONL transcripts, also machine-local.

The consequence is a broken handoff exactly where WongStack claims strength: a cold reader on a second machine can resume the *work* (via the change) but cannot consolidate the *understanding*, because the conversation never entered the repo. `/save` — the skill that owns all git and is the only one holding the conversation — pushes everything except the conversation.

A second, related defect: `/save` has exactly one destination. Step 2 synthesizes a plan; Steps 3–5 always create a branch, an OpenSpec change, and a PR. Its only escape hatch is "if the session is empty, skip the change." A session that produced genuine understanding but no diff is not empty, so it gets a proposal describing nothing changing and a `tasks.md` with zero tasks.

## Goals / Non-Goals

**Goals:**
- Move conversation capture into the repo, so consolidation is machine-independent and deferrable.
- Split **capture** (has the conversation; must run on the machine that had it) from **consolidation** (needs only the repo; can run anywhere, later, by anyone).
- Give conversation-only sessions a correct destination instead of a fake OpenSpec change.
- Keep the surfaces' boundaries sharp enough that there are not three places to look for the same fact.

**Non-Goals:**
- Changing `/save`'s git mechanics (branch, commit, push, PR body, CI wait) — untouched.
- Changing `/plan`, `/apply`, or `/ship`.
- Making `/dream` run automatically, or giving it git. It stays deliberate-only and write-to-working-tree.
- Verbatim transcript archival. The note is a compression, not a log.

## Decisions

### 1. A new top-level `notes/` surface, not the OpenSpec change

**Chosen:** `notes/<slug>.md` at the repo root, a new payload directory.

**Alternative considered — put notes in `openspec/changes/<name>/notes.md`.** Genuinely attractive: the change folder already has the exact mechanic (a dated, append-only log, keyed per-slug, rehydrated by `/continue`, mirrored into the PR body), and a parallel surface with a parallel log is real duplication. Rejected for three reasons:

1. **`/ship` archives the change.** `/opsx:archive` moves the folder under `openspec/changes/archive/`, which CLAUDE.md defines as *the record of what shipped*. `/dream`'s input set would migrate there on every ship, and `/dream` would have to write into it (flipping the `consolidated:` watermark) — mutating an immutable record. Notes would also split across two locations depending on whether their work shipped. The knowledge is meant to **outlive** the work, so it must not live in the work's folder.
2. **Conversation-only sessions have no change.** Routing notes through OpenSpec means inventing a change to hold them — the exact defect this change removes.
3. **Audience.** `proposal.md` must stay self-contained and about the work; a cold reader opens it to *act*. Folding in domain context and side-discussion dilutes the handoff surface `/continue` and the PR body depend on. Notes-only changes would also surface in `openspec list` as `no-tasks` entries competing with real active work.

**Alternative considered — `wiki/.inbox/`.** Adjacent to the destination and `/dream` already resolves the wiki root, but raw unconsolidated notes inside the trusted-docs tree cut against `wiki-style.md`.

The elegance comes from the **shared slug**, not a shared file: `notes/<slug>.md` sits parallel to `openspec/changes/<slug>/`, so finding one from the other is trivial and neither moves when the other's lifecycle advances.

### 2. Boundary between the three surfaces

```
openspec/changes/<slug>/proposal.md   why THIS CHANGE is shaped this way   change-scoped; ships, then archives
notes/<slug>.md                       everything else the session produced  session-scoped; permanent, mutable
wiki/                                 what survived consolidation           canonical, curated
```

Anti-duplication is explicit: if a fact is about why the change is shaped that way, it belongs in the Decision log and the note does not repeat it. A conversation-only session writes only the note. A code session writes both.

### 3. One note per line of work, updated in place

Keyed by the same slug as the branch and change — extending WongStack's existing `branch name = change name` tie. **No date in the filename**, since a note spanning three days should not be stamped with the first; dates live in frontmatter and in entries. Second and later saves revise what is now better understood and append what is new — the same discipline `proposal.md` uses (current understanding updates in place, history appends).

Rejected: a file per save (`notes/YYYY-MM-DD-<slug>.md`). Predictable, but a `/save` run three times an hour produces three near-empty files, and a reader must stitch them.

### 4. `/save` writes a note only when there is something to write

Not every save. The gate: write or update the note when the session produced context **beyond the diff and the Decision log**. Otherwise skip it and say so in the report. This keeps `notes/` from filling with restatements of the commit.

### 5. Compression bar: concise, without losing context

The target is that a cold reader on another machine reaches the same understanding without the transcript. That makes it a **compression, not a summary** — summaries drop the "why," and the why is the payload.

Keep: what the user stated (facts, constraints, preferences, corrections); decisions and their rationale, including what was ruled out and why; specifics (names, paths, numbers, versions, error strings); open threads. Drop: tool-call mechanics and file dumps; the assistant's reasoning-out-loud; the back-and-forth shape of arriving somewhere (keep the destination and the why); anything already true in the repo.

Deliberately **not** applying `/dream`'s Phase-1 "durable facts only" filter at save time. Pre-filtering would make that judgment once, on machine A, unrecoverably. `/save` compresses; `/dream` selects. Separating them keeps the selection repeatable.

### 6. Watermark in per-note frontmatter, not a central ledger

Because notes are kept forever, `/dream` needs to know which it has consumed or it re-litigates history every run.

**Chosen:** each note carries its own state in frontmatter (`consolidated:` date, absent/`new` until then), flipped in place by `/dream`. Self-contained, readable by opening the file, and conflict-free.

**Rejected:** a central `notes/.consolidated` ledger. A single line-appended file touched by every machine merge-conflicts precisely in the multi-machine scenario this design exists to serve. Same reasoning that puts the Decision log inside `proposal.md` rather than in a central changelog.

### 7. `/dream` Phase 2 stands alone

Gardening (merge, prune, split, repair links, reality-check against code) runs whether or not there are unconsolidated notes. "No new notes" is a normal outcome, not a no-op run.

### 8. A notes-only save pushes straight to the default branch

**Chosen:** when the diff is confined to `notes/*.md`, `/save` commits and pushes to the default branch — no branch, no PR, no CI wait, no `/ship`. Path-scoped exactly: one file outside `notes/` and the normal flow applies to the whole save.

The gate exists to stop unreviewed **behavior** reaching `main`. A note is one additive file, keyed by a unique slug so two people's notes never touch the same path (structurally conflict-free), containing no code, config, or spec — and **raw and non-canonical by design**. There is nothing to approve. The review that matters happens one step later, when `/dream` proposes wiki edits: that is where a human decides "this is now how we say things work," and those edits keep the full branch + PR gate. Reviewing a note is reviewing a lab notebook before the paper is written.

**Rejected — a cron that merges notes PRs.** An unattended write to `main` that must classify PRs correctly every time; misclassifying once and merging unreviewed code is far worse than the friction it removes. It also puts live infrastructure into a toolkit whose premise is that the payload is prose you clone.

**Rejected — `/dream` merges the PRs.** Breaks the no-git rule that makes `/dream` safe to run anywhere, repeatedly, on a dirty tree. It would also invert the dependency: `/dream` would have to merge notes to `main` before it could read them, on behalf of work it did not do.

**Rejected — `/save` auto-ships a notes-only branch** (branch → PR → merge, inside one command). Same one-command experience, but it is auto-merging an unreviewed PR with extra steps, buying an audit trail git history already provides.

**Accepted cost:** this is a real, narrow carve-out to two absolutes — `/save`'s "never push to the default branch" hard rule, and the `delivery-gate` spec's "the gate is CI-when-present, else PR review." Both are amended explicitly rather than quietly reinterpreted, and both keep the exception scoped by path. `/save` still never merges a PR.

### 9. Sweep mode is deleted, not implemented

Its whole job — reach sessions this repo never dreamed on — is now structural: the backlog is committed notes, so a plain `/dream` on a fresh clone already sees every machine's unconsolidated sessions. Keeping a designed-not-implemented section that enumerates transcript folders would contradict the new "reads only the repo" rule.

## Risks / Trade-offs

- **Two files to read for full context on a code session** → `/continue` reads the parallel note alongside the proposal, so the resumer gets both without knowing to look.
- **`/save` auto-invoking capture brushes `/dream`'s "nothing runs it automatically" rule** → it does not: `/save` writes `notes/`, it never invokes `/dream` and never writes `wiki/`. The two-phase `/dream` cycle stays deliberate-only. The rule is restated so this is unambiguous.
- **Notes could drift into a dumping ground** → the compression bar and the anti-duplication boundary are written into `notes/README.md`, which ships with the directory, so target repos inherit the convention rather than the empty folder.
- **Kept-forever notes accumulate** → accepted deliberately; they are the referenceable record. `consolidated:` frontmatter makes the unconsolidated set cheap to find regardless of total count.
- **The notes-only carve-out gets stretched** — someone reads "notes bypass the gate" and applies it to a save that also touches a skill → the routing is decided by exact path scope, and the spec pins both directions with scenarios: a single non-note path restores the full flow.
- **Direct push to a protected default branch fails** — many repos protect `main`. `/save` must surface the rejection plainly and fall back to the normal branch + PR flow rather than retrying or forcing.
- **Existing repos have no `notes/`** → `/wong-sync` copies it in as a manifest file like any other; absent-then-copied is the normal install path, and a repo that already has a `notes/` directory keeps it untouched (the manifest never overwrites).

## Open Questions

None outstanding — the four lifecycle decisions (location, retention, compression bar, gardening-without-notes) and the `/continue` fold-in were settled during exploration.

<!-- end design.md -->
<!-- file tasks.md utf8 4537 -->
## 1. The `notes/` surface

- [x] 1.1 Create `notes/README.md` — the convention: `notes/<slug>.md` keyed to the branch/change slug, the frontmatter shape (`consolidated:`), the compression bar (keep/drop lists from design.md §5), kept-forever retention, and the boundary table against `proposal.md`'s Decision log and `wiki/`
- [x] 1.2 Add a `.gitkeep` or ensure `notes/README.md` alone carries the directory, so a fresh clone has the surface

## 2. `/save` — capture

- [x] 2.1 Add a note-writing step to `.claude/skills/save/SKILL.md`, placed with Step 4 (before the commit) so the note ships in the same commit; specify write-or-update-in-place at `notes/<slug>.md`, never a file per save
- [x] 2.2 Write the compression bar into that step (keep: user statements, decisions + rationale, what was ruled out and why, specifics, open threads; drop: tool mechanics, file dumps, reasoning-out-loud, repo-derivable facts) and state explicitly that `/dream`'s durable-facts filter is NOT applied here
- [x] 2.3 Add the write-only-when-warranted gate: skip the note when the session produced nothing beyond the diff and the Decision log, and say so in Step 7's report
- [x] 2.4 Make the OpenSpec change conditional — a session with no code and no plan writes the note and skips change authoring entirely; replace Step 2's "if the session is empty, skip the change" escape hatch with the fuller routing
- [x] 2.5 Add `notes/<slug>.md` to Step 5's stage-by-path list, and add the note to Step 7's report
- [x] 2.6 Add the notes-only routing to Step 1's preflight: when every changed path matches `notes/*.md`, skip Steps 3–6 (no branch, no PR, no CI wait) and commit + push directly to the default branch; any other path restores the full flow
- [x] 2.7 Amend `/save`'s hard rule "Never push to the default branch" with the path-scoped notes-only exception, and keep "never merge" absolute
- [x] 2.8 Add the protected-branch fallback: if the direct push is rejected, report it plainly and fall back to branch + PR — never force, never retry
- [x] 2.9 Add the notes-only variant of Step 7's report — note path + landed on the default branch, omitting the PR, CI, and preview sections rather than reporting them missing

## 3. `/dream` — consolidate from the repo

- [x] 3.1 Rewrite Phase 1 in `.claude/skills/dream/SKILL.md` to read unconsolidated `notes/*.md` instead of replaying the conversation; keep the in-scope/out-of-scope durable-fact filter, now applied to note content
- [x] 3.2 Add the watermark step: record a `consolidated:` date in each consumed note's frontmatter after its facts land in `wiki/`
- [x] 3.3 State that Phase 2 gardening runs with or without unconsolidated notes, and that an empty inbox is a normal outcome
- [x] 3.4 Delete the "Sweep mode — designed, not yet implemented" section
- [x] 3.5 Update the hard rules — reads only the repo, never a transcript or scrollback; still no git; still deliberate-only, and clarify that `/save` writing `notes/` is not `/dream` auto-running

## 4. `/continue` — read the note

- [x] 4.1 Add the note to step 2's resolve (read `notes/<slug>.md` when it exists) in `.claude/skills/continue/SKILL.md`
- [x] 4.2 Fold note context into step 4's recap alongside the proposal, Status, and Decision-log tail; no-note is not an error

## 5. Distribution

- [x] 5.1 Add `notes/` (directory + `README.md`) to `.claude/skills/wong-sync/references/payload-manifest.md` under "In the manifest", with the copy-if-absent / adapt-if-present rule
- [x] 5.2 Update `CLAUDE.md`'s "Where context lives" section to name `notes/` as the session-capture surface and state the three-surface boundary
- [x] 5.3 Update the delivery-gate doctrine text wherever it's asserted — `CLAUDE.md`, `README.md`, `wiki/development/the-change-loop.md`, and the `ship` / `wong-setup` skills — so the notes-only exception is stated once and consistently, and no page still implies every path to `main` runs through a PR
- [x] 5.4 Check the `WONG-STACK` block in `CLAUDE.md` and the README for any statement that `/dream` reads the conversation; update to the new model

## 6. Release

- [x] 6.1 Bump `VERSION` (minor — new capability, no breaking change)
- [x] 6.2 Add a newest-first `CHANGELOG.md` entry explaining the split (capture at `/save`, consolidation at `/dream`), the new `notes/` surface, and sweep-mode removal
- [x] 6.3 Cross-check every skill edit for consistency: no remaining reference to conversation-replay in `/dream`, no remaining mandatory-change assumption in `/save`

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 2250 -->
# delivery-gate Specification (delta)

## MODIFIED Requirements

### Requirement: The gate is CI-when-present, else PR review

`/save` and `/ship` SHALL determine the gate by whether the repo has checks configured. When checks exist, the skills wait for them and, on failure, read-fix-repush (capped); `/ship` merges only on green. When no checks exist, the gate SHALL be PR review only — the PR plus the OpenSpec change and the in-repo record is the system, and a human approves the PR before `/ship` merges.

**Notes-only exception.** A `/save` whose entire diff is confined to `notes/*.md` SHALL bypass the branch-and-PR gate and commit directly to the default branch. This carve-out is scoped by path and is exact: if any path outside `notes/*.md` appears in the diff, the normal branch + PR flow applies in full. The gate is not weakened by this — a note is raw, unconsolidated, and non-canonical, so there is nothing to approve; the review of its claims happens one step later when `/dream` proposes wiki edits, and those edits SHALL go through the normal branch + PR gate.

#### Scenario: Repo has CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` reports checks
- **THEN** the skill waits for the checks, auto-fixes on red (cap 3 attempts), and `/ship` merges only once green

#### Scenario: Repo has no CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` returns `NONE`
- **THEN** the skill proceeds without waiting for or requiring any CI run
- **AND** `/ship` merges on the strength of PR review rather than a green CI run

#### Scenario: Notes-only save bypasses the gate

- **WHEN** `/save` runs and every changed path matches `notes/*.md`
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: A single non-note path restores the gate

- **WHEN** a save's diff contains `notes/<slug>.md` plus any other path
- **THEN** the normal branch + PR flow applies and the note rides along on that branch

#### Scenario: Wiki edits keep the gate

- **WHEN** `/dream` has consolidated notes into `wiki/` and `/save` runs
- **THEN** the diff includes paths outside `notes/`, so the change goes through a branch and a PR for review

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/session-notes/spec.md utf8 9092 -->
# session-notes Specification

## ADDED Requirements

### Requirement: Session notes live in a repo-committed `notes/` surface

The payload SHALL define a top-level `notes/` directory holding one markdown note per line of work at `notes/<slug>.md`, where `<slug>` is the same kebab-case slug used for the branch and the OpenSpec change. Notes SHALL be committed to the repo so they are readable from any clone, and SHALL NOT be deleted after consolidation.

#### Scenario: A note is keyed to its line of work

- **WHEN** a session's work is tracked as change `add-po-search` on branch `add-po-search`
- **THEN** its session note is at `notes/add-po-search.md`, parallel to `openspec/changes/add-po-search/`
- **AND** the filename carries no date, so a note spanning several days is not stamped with the first

#### Scenario: A conversation-only session still gets a note

- **WHEN** a session produces understanding but no code change and no plan
- **THEN** a note is written at `notes/<topic-slug>.md`
- **AND** no OpenSpec change folder is created for it

#### Scenario: Notes survive consolidation

- **WHEN** `/dream` has consolidated a note's facts into `wiki/`
- **THEN** the note file remains in the repo for future reference

### Requirement: Note state is tracked in per-note frontmatter

Each note SHALL carry its consolidation state in its own YAML frontmatter — unconsolidated until `/dream` records a `consolidated:` date in it. The payload SHALL NOT use a central ledger file to track which notes have been consolidated.

#### Scenario: An unconsolidated note is identifiable

- **WHEN** `/dream` scans `notes/`
- **THEN** it selects notes whose frontmatter carries no `consolidated:` date

#### Scenario: Two machines consolidate without conflicting

- **WHEN** notes written on different machines are consolidated and the results merged
- **THEN** each note's state lives in its own file, so no shared ledger line conflicts

### Requirement: `/save` is the sole conversation capture point

`/save` SHALL write or update `notes/<slug>.md` from the conversation, as part of the same commit as the rest of the checkpoint. It SHALL update the existing note in place rather than creating a new file per save, and SHALL write a note only when the session produced context beyond the diff and the change's Decision log — otherwise skipping it and saying so in its report.

#### Scenario: A second save updates the same note

- **WHEN** `/save` runs again on a branch that already has `notes/<slug>.md`
- **THEN** the existing note is revised and extended in place
- **AND** no additional note file is created

#### Scenario: A save with nothing new to capture

- **WHEN** the session produced nothing beyond the diff and the Decision log
- **THEN** `/save` writes no note and reports that it skipped it

#### Scenario: The note ships with the checkpoint

- **WHEN** `/save` commits
- **THEN** `notes/<slug>.md` is staged by path alongside the code and the OpenSpec change

### Requirement: Notes are a compression of the session, not a summary or a transcript

A note SHALL preserve what the user stated, decisions with their rationale, what was ruled out and why, concrete specifics (names, repo-relative paths, numbers, versions, error strings), and open threads — such that a cold reader on another machine reaches the same understanding without the transcript. It SHALL omit tool-call mechanics, file dumps, the assistant's reasoning-out-loud, and facts already true in the repo. `/save` SHALL NOT pre-apply `/dream`'s durable-facts filter when writing the note.

#### Scenario: Rationale is preserved

- **WHEN** an option was considered and rejected during the session
- **THEN** the note records the rejected option and why it was rejected

#### Scenario: Selection is deferred to consolidation

- **WHEN** `/save` writes a note containing both durable conventions and change-specific context
- **THEN** it records both, leaving the durable-fact selection to `/dream`

### Requirement: A conversation-only session does not produce an OpenSpec change

`/save` SHALL NOT author an OpenSpec change for a session that produced no code and no plan. It SHALL write the note, and report that no change was created.

#### Scenario: No fake proposal

- **WHEN** `/save` runs after a session with no diff and no plan
- **THEN** no `openspec/changes/<name>/` folder is created
- **AND** no proposal describing nothing changing and no empty `tasks.md` are written

### Requirement: A notes-only save commits directly to the default branch

When a `/save`'s entire diff is confined to `notes/*.md`, `/save` SHALL commit and push directly to the default branch — no feature branch, no PR, no CI wait, and no `/ship` needed. The carve-out SHALL be decided by exact path scope: any changed path outside `notes/*.md` restores the normal branch + PR flow for the whole save. `/save` SHALL NOT merge a pull request under any circumstance, and no scheduled job or other skill SHALL merge on its behalf.

#### Scenario: Conversation-only session lands in one command

- **WHEN** `/save` runs after a session whose only output is `notes/billing-tenancy.md`
- **THEN** the note is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: Mixed session keeps the gate

- **WHEN** a save's diff contains both `notes/<slug>.md` and a source or skill file
- **THEN** the note rides along on the change's feature branch and goes through the PR flow with it

#### Scenario: Notes-only save reports without a PR link

- **WHEN** a notes-only save completes
- **THEN** the report names the note path and states it landed on the default branch
- **AND** it omits the PR, CI, and preview sections rather than reporting them as missing

### Requirement: `/dream` consolidates from the repo only

`/dream`'s capture phase SHALL read unconsolidated notes from the repo's `notes/` directory and SHALL NOT read the current conversation, scrollback, or machine-local transcript files. After consolidating a note's qualifying facts into `wiki/`, it SHALL record the `consolidated:` date in that note's frontmatter.

#### Scenario: Consolidating on a different machine

- **WHEN** a session is captured on machine A, pushed, and `/dream` is run on machine B after pulling
- **THEN** `/dream` consolidates that session's facts from `notes/`, with no access to machine A's transcript

#### Scenario: A consumed note is marked

- **WHEN** `/dream` finishes consolidating a note
- **THEN** that note's frontmatter carries a `consolidated:` date

### Requirement: `/dream` gardens with or without new notes

`/dream`'s consolidation phase SHALL run regardless of whether any unconsolidated notes exist. "No new notes" SHALL be a normal, successful outcome rather than a reason to skip gardening.

#### Scenario: Gardening with an empty inbox

- **WHEN** `/dream` runs and every note is already consolidated
- **THEN** it still merges duplicates, prunes, repairs links, and reality-checks the wiki against the code
- **AND** reports that there was nothing new to capture

### Requirement: Sweep mode is removed from `/dream`

The `/dream` skill SHALL NOT describe or implement a mode that enumerates machine-local transcript directories. Reaching sessions the repo never consolidated SHALL be structural — committed notes make them visible to a plain `/dream` run from any clone.

#### Scenario: No transcript enumeration remains

- **WHEN** the `/dream` skill is read
- **THEN** it contains no sweep mode section and no reference to enumerating transcript folders

### Requirement: `/continue` reads the note alongside the change

When resuming a change, `/continue` SHALL read `notes/<slug>.md` if it exists and fold its context into the recap, so a cold resume inherits the session understanding that the change deliberately does not hold.

#### Scenario: Resuming with a note present

- **WHEN** `/continue add-po-search` runs and `notes/add-po-search.md` exists
- **THEN** the recap includes context from the note in addition to the proposal, its Status, and the Decision log tail

#### Scenario: Resuming with no note

- **WHEN** no note exists for the change
- **THEN** `/continue` proceeds on the change alone without error

### Requirement: `notes/` is a payload surface installed by `/wong-sync`

The payload manifest SHALL list the `notes/` directory and its `README.md`, so `/wong-sync` copies them into a target repo that lacks them. The README SHALL state the convention: the slug key, the compression bar, the frontmatter watermark, and the boundary against the change's Decision log and `wiki/`. As with every manifest file, an existing file SHALL NOT be overwritten.

#### Scenario: Target repo without notes

- **WHEN** `/wong-sync` runs in a repo that has no `notes/` directory
- **THEN** `notes/` and `notes/README.md` are copied in

#### Scenario: Target repo that already has notes

- **WHEN** a target repo already has `notes/README.md`
- **THEN** it is left untouched and handed to the adapt step

<!-- end specs/session-notes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-28

~~~
<!-- end .openspec.yaml -->
