<!-- openspec-archive v1 2026-08-02-wong-sync-verdict-transparency -->
<!-- file proposal.md utf8 5953 -->
# wong-sync-verdict-transparency

**Status:** ready-to-ship
**Open questions:** none

## Why

`/wong-sync` has a review gate for everything it says **yes** to and none for anything it says **no** to. An `adopt` becomes an OpenSpec change folder you read and `/apply`; a `declined` or `divergent` gets one line in a chat report that scrolls away — and is then written into the manifest ledger, where it suppresses that capability on every future run. So a judgment call the user never made becomes a permanent, invisible "no." The verdict taxonomy compounds it: `declined` is defined as "wrong for this repo, **or** the user said no", collapsing the skill's own inference and the user's actual refusal into one sticky slot.

## What Changes

- **Split `declined` by who decided.** A new `not-applicable` verdict carries the skill's own judgment (an `assumes` the repo doesn't meet, or a graft it couldn't describe concretely). `declined` narrows to mean *the user said no* and is the only verdict that may be written from a recorded user decision.
- **Only `declined` suppresses.** Every other verdict is recomputed from scratch each run, so a repo whose shape changed gets re-evaluated for free instead of being held to a stale inference. **BREAKING** for the ledger's read semantics: an existing `divergent` entry no longer suppresses re-evaluation (it is recomputed, and lands on `divergent` again if still true).
- **A durable verdict record.** Every run writes `.claude/wong-sync-verdicts.md` — the full list, every capability, verdict and one-line reason — even when nothing is adopted. It replaces the ephemeral chat report as the deliverable; the report shrinks to a summary plus a pointer.
- **Ticking a box is how you overrule the skill.** Non-adopt entries in that file are checkboxes. The next `/wong-sync` reads the previous file, forces every ticked capability to `adopt`, and writes it as a task — including un-declining something previously declined.
- **A narrow carve-out to "never overwrite".** `.claude/wong-sync-verdicts.md` is generated and owned by the skill, so it is regenerated each run. The guarantee continues to hold for every file the skill did not author.
- Payload edit → release: bump `VERSION` to 8.3.0 and add a `CHANGELOG.md` entry.

## Capabilities

### New Capabilities

None — this reshapes existing behavior rather than adding a surface.

### Modified Capabilities

- `wong-sync-adapt`: the verdict taxonomy gains `not-applicable`; suppression narrows to `declined` alone; the analysis gains a second durable output (`.claude/wong-sync-verdicts.md`) written on every run, and a checkbox promotion path that lets the user overrule any non-adopt verdict.
- `wong-sync`: the write scope in "never overwrite an existing file" gains the generated verdicts file, with the carve-out stated as owned-and-regenerated rather than a general exception.

## Impact

- `.claude/skills/wong-sync/SKILL.md` — Step 3 (adapt), Step 4 (ledger semantics), Step 5 (report), Hard rules.
- `.claude/skills/wong-sync/references/adapt.md` — the verdict table, the gap-analysis rules, the ledger section, the output contract, the report format.
- `.claude/.wong-stack.json` in target repos — `capabilities` entries may now carry `not-applicable`; older ledgers migrate lazily (an existing `declined` is honored as-is, since it cannot be distinguished after the fact and honoring it is the conservative read).
- `VERSION`, `CHANGELOG.md`.
- Non-goals: no change to Step 2's copy behavior (absent files still land unasked), and no interactive checkpoint during the run — the promotion path is asynchronous by design.

## Decision log

- **2026-08-02** — Planned and implemented in one session, all 21 tasks. The change started from the user's observation that `/wong-sync` "seems to just auto decide." Diagnosis: the skill had a review gate for everything it said *yes* to (`adopt` → a change folder you read) and none for anything it said *no* to (`divergent`/`declined` → a chat line plus a silently-suppressing ledger entry). Fixed by splitting the taxonomy on **who decided** — new `not-applicable` for the skill's judgment, `declined` narrowed to the user's word alone — and by giving every verdict a durable home in `.claude/wong-sync-verdicts.md`, where a checkbox tick overrules the call on the next run. **Ruled out:** an interactive per-capability checkpoint during the run (option C in the explore) — a 20–40 item list trains people to hit accept, and it does nothing on run two where the ledger is what actually suppresses. **Deliberately deferred:** gating Step 2's copy of absent payload files; nothing is committed and `/save` is the gate, so the volume doesn't justify a prompt. Recorded as an explicit non-goal so a later run doesn't re-litigate it. **Found while implementing:** the old ledger pinned every verdict to an `asOfCommit` in the *upstream clone*, but a `not-applicable` turns on the *target's* shape — so "assumes CI, you have none" would never have been revisited when the repo added CI. Narrowing suppression to `declined` alone closes that as a side effect. **Migration calls:** existing `divergent` entries stop suppressing (recomputed, and land on `divergent` again if still true); existing `declined` entries are honored as user refusals, since a pre-8.3.0 ledger can't distinguish the user's "no" from the skill's guess — the conservative read, because re-pitching something genuinely refused is the louder failure. Two edits beyond the task list, both accuracy fixes the tasks implied: the skill's frontmatter `description` still claimed it "never modifies a file that already exists," which the generated verdict record makes false, and the Step-3 line in the header diagram still read "capability gap → change." Branch renamed from `wong-sync-choice-prompts` to match the change name (no commits, no remote, so free) — the tie `/continue` and `/ship` rely on.

<!-- end proposal.md -->
<!-- file design.md utf8 9458 -->
## Context

`/wong-sync`'s adapt step maps upstream capabilities, surveys the target, and assigns every capability one of four verdicts: `present`, `divergent`, `adopt`, `declined`. Only `adopt` produces a durable artifact — the OpenSpec change folder. The other three are reported in chat and written into `.claude/.wong-stack.json`'s `capabilities` ledger, where `declined` and `divergent` suppress re-pitching on later runs unless the upstream expression changed.

Two problems follow from that shape:

1. **`declined` conflates two authorities.** `adapt.md` defines it as "wrong for this repo, **or** the user said no", and `adapt.md`'s concreteness bar adds a third writer: a graft the skill couldn't describe concretely is also `declined`. Two of those three are the skill's own inference, yet all three get the permanence appropriate only to a user's refusal. Worse, an inference like "this assumes CI and you have no forge checks" is *conditional on repo state that changes* — pinning it to an `asOfCommit` of the **upstream** clone means it is never revisited when the thing that actually justified it (the target) changes.
2. **Non-adopt verdicts have no durable home.** They exist in a chat report and in JSON. The JSON is a machine record, not something a user reviews; `adapt.md` states the intent that "a wrong call is visible and arguable", but the only way to argue is to hand-edit the manifest.

Constraint from the repo: `/wong-sync` runs no git in the target, never overwrites an existing file, and proposes rather than implements. Any fix has to live inside those.

## Goals / Non-Goals

**Goals:**

- Distinguish a verdict the user chose from one the skill inferred, and give only the former permanence.
- Make every verdict — not just `adopt` — land somewhere a human reviews at their own pace.
- Give the user a way to overrule any non-adopt verdict without editing JSON.
- Keep the run non-interactive: no prompt wall, no per-capability confirmation.

**Non-Goals:**

- Gating Step 2's copy of absent payload files. Nothing is committed, `/save` is the gate, and the volume on a current repo is small. Considered and deliberately left alone.
- An interactive checkpoint during the run (the "check off what to adopt" option). A 20–40 item list on every sync trains people to hit accept, and it does nothing about run two, where the ledger is what suppresses.
- Any change to the two-subagent structure, the capability definition, or id stability.

## Decisions

### 1. Split the verdict by *who decided*, not by *why*

`declined` becomes two verdicts:

| verdict | written by | sticky? |
|---|---|---|
| `not-applicable` | the skill — an `assumes` the repo doesn't meet, or a graft it can't describe concretely | no |
| `declined` | the user, from an actual recorded refusal | yes |

The axis is authority, not reason. That is what the complaint is actually about: not that the skill judges, but that its judgment is stored with the weight of the user's.

*Alternative considered:* keep one verdict and add a `by: "user" | "skill"` field. Rejected — the field would be trivially droppable by a future edit and reads as metadata rather than as a distinct thing, whereas a distinct verdict forces every table, report, and rule to state which one it means.

*Alternative considered:* `blocked` or `inapplicable` as the name. `not-applicable` says the repo-fit thing plainly and doesn't imply a temporary obstruction that will clear.

### 2. Only `declined` suppresses; everything else is recomputed each run

Today `divergent` is also sticky. Under the authority axis it shouldn't be — it's an inference — but re-pitching it every run would be noise. The resolution is that recomputation and re-pitching are different things: `divergent` is recomputed from scratch each run and, if still true, lands on `divergent` again and is reported as one quiet line. It never becomes a task either way, so recomputation costs nothing and buys correctness — if the local solution that justified `divergent` is deleted, the next run naturally flips it to `adopt`.

This makes the ledger's job precise: **it stores the user's decisions, plus a snapshot of the last computed state for reporting and retirement detection.** Only the first half is authoritative on a later run.

`declined`'s existing re-raise rule is untouched: a user's "no" recorded at commit X is re-raised when the upstream expression changes after X.

### 3. `.claude/wong-sync-verdicts.md` — one durable record, regenerated

Every run writes the full verdict list to `.claude/wong-sync-verdicts.md`: every capability, its verdict, its one-line reason, grouped by verdict, plus the re-raised and retired sections. It is written **even when nothing is `adopt`** — that is exactly the run where today's output is thinnest and the "it just decided" feeling is strongest.

Placement rationale — it sits next to `.claude/.wong-stack.json` rather than inside the change folder because verdicts are *repo state*, not change scope: they outlive any one adoption change, and there frequently is no change folder at all. It is committed (via `/save`), not gitignored, so it travels between machines and shows up in the PR diff like every other piece of repo knowledge.

*Alternative considered:* `verdicts.md` inside `openspec/changes/adopt-wongstack-<date>/`. Rejected — it would force writing an otherwise-empty change folder on "nothing to adopt" runs, which `adapt.md` explicitly calls noise, and it would scatter the record across dated folders when what the user wants is *the current picture*.

### 4. Ticking a checkbox is the promotion path

Non-adopt entries are written as checkboxes:

```markdown
## Not applicable

- [ ] `ci-gate-when-present` — assumes forge checks; this repo has no CI workflows.

## Declined

- [ ] `stack-pack-cloudflare` — you said no on 2026-07-14; re-tick to reconsider.
```

The next `/wong-sync` reads the existing file **before** regenerating it, collects every ticked id, and force-verdicts those `adopt` — writing a task for each, and clearing any `declined` ledger entry among them. Un-declining is therefore the same gesture as adopting, which is right: the only way to reverse a "no" is to ask for the thing.

*Alternative considered:* promote in-conversation ("say the word and I'll add it"). Kept as the report's phrasing for a live session, but it can't be the mechanism — it evaporates when the session ends, which is the failure being fixed.

The cost is that promotion takes a second `/wong-sync` run. That is consistent with the skill's grain (it proposes, the loop disposes) and keeps the run itself non-interactive.

### 5. The overwrite carve-out is stated as ownership

"Never overwrite an existing file" is the skill's headline guarantee, and regenerating a file is literally overwriting one. The carve-out is scoped by authorship, not by an exception list: the skill may rewrite a file **it generated and solely owns**, and `.claude/wong-sync-verdicts.md` is the only such file besides the manifest — which the skill has always rewritten. Framing it this way keeps the guarantee meaningful (nothing a human wrote is ever touched) instead of turning it into a list of exceptions that can grow.

Consequence: the file carries a generated-file header saying it is rewritten on every run and that ticked boxes are read first — so a user's edits beyond ticking aren't silently lost without warning.

## Risks / Trade-offs

- **A ticked box is read once, then the line moves to "Adopted" on regeneration** → the regenerated file states where each promoted capability went, and the run's report names them, so the tick isn't silently swallowed.
- **Old ledgers can't distinguish a skill-`declined` from a user-`declined`** → honor existing `declined` entries as user decisions (the conservative read: it keeps suppressing something that may have been suppressed wrongly, rather than re-pitching something the user genuinely refused). Note the migration in the CHANGELOG so anyone who wants a clean slate can delete the entry.
- **Dropping `divergent`'s suppression means recomputing it every run** → it never becomes a task, so the only cost is subagent work that was already happening; the report keeps it to one line each.
- **`.claude/wong-sync-verdicts.md` grows with the capability map** → it's a flat list with one line per capability, grouped; the "Present" group is collapsed to a count in the report but listed in full in the file, which is the point of having a file.
- **A user who edits the file expecting it to persist** → the generated header warns; ticking is the only supported edit.

## Migration Plan

Payload prose only — no runtime, no data migration, nothing to roll back beyond reverting the change. Target repos pick it up on their next `/wong-sync`:

1. First run after adoption writes `.claude/wong-sync-verdicts.md` for the first time and lands it uncommitted for `/save`.
2. Existing `capabilities` entries are read as-is; `divergent` entries stop suppressing and are recomputed; `declined` entries continue to suppress.
3. `VERSION` 8.2.0 → 8.3.0 with a newest-first `CHANGELOG.md` entry describing the verdict split and the new file.

## Open Questions

None blocking. One deferred: whether Step 2's copy list should also become confirmable is left open by the Non-Goals and can be raised separately if the copy volume turns out to bother anyone in practice.

<!-- end design.md -->
<!-- file tasks.md utf8 4823 -->
## 1. The adapt reference — `.claude/skills/wong-sync/references/adapt.md`

- [x] 1.1 Rewrite the verdict table in "The gap analysis" to five verdicts — `present`, `divergent`, `adopt`, `not-applicable`, `declined` — with a "becomes a task?" column that reads `yes` only for `adopt`, and a lead-in stating the split axis is **who decided**: `not-applicable` is the skill's judgment, `declined` is only ever the user's.
- [x] 1.2 Replace the "Check `assumes` before proposing" paragraph so an unmet assumption resolves to `not-applicable` with the assumption named, not `declined`.
- [x] 1.3 Update "The concreteness bar" so a graft that can't be described concretely is `not-applicable` rather than `declined`, keeping the existing ✗/✓ example.
- [x] 1.4 Rewrite "The ledger" section: only `declined` suppresses; `present`/`divergent`/`adopt`/`not-applicable` are recomputed from scratch each run and their entries are a last-computed snapshot for reporting and retirement detection, not authority. State explicitly that `not-applicable` turns on the *target's* shape, so an upstream `asOfCommit` must not freeze it. Keep the re-raise rule for `declined` and the retired-id rule unchanged.
- [x] 1.5 Add the lazy-migration line: a `declined` entry written by an earlier version is honored as a user refusal (the conservative read), per design.md Decision 2 and its Risks entry.
- [x] 1.6 Rewrite "The output" section to name two artifacts — `.claude/wong-sync-verdicts.md` (every run) and the change folder (only when something is `adopt`) — keeping the never-overwrite-a-change-folder and no-empty-change rules, and correcting the no-OpenSpec case to note the verdict record is still written.
- [x] 1.7 Add a new section specifying `.claude/wong-sync-verdicts.md`: the generated-file header, the per-verdict groups, one line per capability (`id` — reason), checkbox lines for every non-`adopt` entry, the re-raised and retired sections, and that it is committed rather than ignored. Include a short worked example matching design.md Decision 4.
- [x] 1.8 Add the promotion rule: each run reads the existing verdict file first, collects ticked ids, force-verdicts them `adopt` for that run, clears any `declined` ledger entry among them, shows them under the adopted group on regeneration, and names them in the report.
- [x] 1.9 Rewrite "The report" section as a summary that points at the verdict file — adopt items and the change folder, a count for divergent/not-applicable/present, promoted-by-tick named, re-raised and retired named — and keep "never show either subagent's report verbatim".
- [x] 1.10 Update the ASCII pipeline diagram at the top so the verdict box lists all five verdicts and the output shows both artifacts.

## 2. The skill — `.claude/skills/wong-sync/SKILL.md`

- [x] 2.1 Update the Step 3 summary paragraph: five verdicts, and the two artifacts the step writes.
- [x] 2.2 Update Step 4's `capabilities` bullet so the ledger's suppression rule reads "only `declined`", with the recompute-everything-else statement and the `asOfCommit` clarification for `not-applicable`.
- [x] 2.3 Update the Step 4 JSON sketch's `verdict` enum to `present|divergent|adopt|not-applicable|declined`.
- [x] 2.4 Rewrite Step 5's **Adapted** bullet to point at `.claude/wong-sync-verdicts.md` as the deliverable, and amend the closing "nothing copied and nothing to adopt" line so it says the verdict record is written regardless.
- [x] 2.5 Amend the Step 2/Step 3 preamble bullet "Never overwrite" (and the matching Hard rule) to the authorship-scoped form: the skill may rewrite files it generates — the manifest and the verdict record — and never rewrites authored content. Add `.claude/wong-sync-verdicts.md` to the stated write scope in both places.
- [x] 2.6 Add a Hard rule that `declined` is only ever written from an actual user decision.

## 3. Release

- [x] 3.1 Bump `VERSION` from 8.2.0 to 8.3.0.
- [x] 3.2 Add a newest-first `CHANGELOG.md` entry for 8.3.0 covering the `not-applicable` split, suppression narrowing to `declined` alone (noting `divergent` entries stop suppressing), the new `.claude/wong-sync-verdicts.md`, the tick-to-promote path, and the lazy migration for pre-8.3.0 `declined` entries.

## 4. Consistency pass

- [x] 4.1 Grep the payload for stale references to the four-verdict taxonomy or to `declined` meaning "wrong for this repo" (`.claude/skills/`, `CLAUDE.md`'s `WONG-STACK` block, `README.md`) and reconcile any hit; report if there are none.
- [x] 4.2 Confirm `.claude/skills/wong-sync/references/payload-manifest.md` needs no entry — the verdict record is generated per-repo, not shipped — and state that conclusion rather than leaving it unchecked.
- [x] 4.3 Run `openspec validate wong-sync-verdict-transparency` and fix anything it flags.

<!-- end tasks.md -->
<!-- file specs/wong-sync-adapt/spec.md utf8 10672 -->
## RENAMED Requirements

- FROM: `### Requirement: Four verdicts, one per capability`
- TO: `### Requirement: One verdict per capability`

## MODIFIED Requirements

### Requirement: One verdict per capability

The main thread SHALL assign every mapped capability exactly one verdict:

- **present** — the repo already has it, current.
- **divergent** — the repo solves it differently and the local solution is legitimate; no graft is proposed.
- **adopt** — missing, stale, or otherwise wanted here, and expressible in this repo.
- **not-applicable** — the skill judged that it does not fit: an `assumes` this repo does not meet, or a graft it could not describe concretely.
- **declined** — the user said no.

The taxonomy SHALL be split by **who decided**. `not-applicable` SHALL be the only verdict the skill may assign on its own judgment of poor fit, and `declined` SHALL be written **only** from a decision the user actually made — never from the skill's own inference. A capability whose graft cannot be described concretely SHALL be verdicted `not-applicable` rather than written as a vague task.

Every verdict SHALL carry a one-line reason. Only `adopt` verdicts SHALL become tasks. `divergent` and `not-applicable` findings SHALL be listed one line each in the durable verdict record and SHALL NOT be proposed as work.

A payload file that exists locally, was never modified, and is behind upstream SHALL be verdicted `adopt` with a task instructing that the upstream version be taken verbatim. There SHALL NOT be a separate verdict for this case — the distinction lives in the task text, not the taxonomy.

#### Scenario: A capability solved differently is left alone

- **WHEN** the repo already achieves a capability through its own mechanism
- **THEN** the verdict is `divergent`, the local form is named, and no adoption task is written

#### Scenario: An unmet assumption is the skill's call, not the user's

- **WHEN** a capability assumes CI checks and the repo has no forge checks
- **THEN** the verdict is `not-applicable` with the assumption named
- **AND** it is not recorded as `declined`

#### Scenario: A graft that cannot be made concrete

- **WHEN** the main thread cannot describe a graft in this repo's terms
- **THEN** the verdict is `not-applicable`, not `declined` and not a vague task

#### Scenario: Declined requires an actual refusal

- **WHEN** a run completes without the user having refused anything
- **THEN** no capability is newly verdicted `declined`

#### Scenario: Stale unmodified file

- **WHEN** a payload file exists locally unmodified and upstream has moved on
- **THEN** the verdict is `adopt` and its task says to replace the file with the upstream version verbatim
- **AND** the file is not overwritten by the sync itself

#### Scenario: Only adopt becomes work

- **WHEN** verdicts are assigned
- **THEN** the proposed change contains one task per `adopt` capability and no task for any other verdict

### Requirement: The capability ledger makes the sync idempotent in judgment

`.claude/.wong-stack.json` SHALL carry a `capabilities` map keyed by capability id, each entry recording `verdict`, a one-line `reason`, and `asOfCommit` — the clone HEAD at which the judgment was made. The map SHALL be written last, with the rest of the manifest.

**Only `declined` SHALL suppress re-evaluation.** A capability whose ledger verdict is `declined` SHALL NOT be re-pitched on a later run unless its upstream expression changed since the recorded `asOfCommit`, in which case it SHALL be re-raised with what changed. Every other verdict — `present`, `divergent`, `adopt`, `not-applicable` — SHALL be recomputed from scratch on each run; its ledger entry is a record of the last computed state for reporting and retirement detection, and SHALL NOT be read as authoritative. A `not-applicable` verdict in particular turns on the target's shape rather than upstream's, so pinning it to an upstream commit SHALL NOT prevent its re-evaluation.

An absent `capabilities` key means nothing has been judged yet and is not an error. A ledger written by an earlier version, in which `declined` could mean either a user refusal or the skill's own judgment, SHALL have its `declined` entries honored as user refusals — the conservative read.

#### Scenario: Declines are not re-litigated

- **WHEN** the sync runs again and upstream has not changed a previously declined capability
- **THEN** that capability is not proposed again

#### Scenario: Upstream moved since the decline

- **WHEN** a declined capability's upstream expression changed after its recorded `asOfCommit`
- **THEN** it is re-raised, stating that it was declined earlier and what has changed since

#### Scenario: A divergent capability is recomputed

- **WHEN** the local mechanism that justified a `divergent` verdict has since been deleted
- **THEN** the next run recomputes the capability and verdicts it `adopt`, rather than honoring the stale `divergent`

#### Scenario: A not-applicable verdict follows the repo, not the clone

- **WHEN** a capability was `not-applicable` because the repo had no CI, and the repo has since added CI
- **THEN** the next run re-evaluates it and may verdict it `adopt`, even though the upstream expression is unchanged

#### Scenario: Older manifest

- **WHEN** the sync runs on a manifest with no `capabilities` key
- **THEN** it proceeds normally and writes the key for the first time

### Requirement: The analysis proposes and never implements

The analysis SHALL write exactly two kinds of artifact and nothing else:

1. `.claude/wong-sync-verdicts.md` — the durable verdict record, specified below.
2. An OpenSpec change folder at `openspec/changes/adopt-wongstack-<YYYY-MM-DD>/`, containing a proposal (why these capabilities and what each buys this repo) and a tasks list, written **only** when at least one capability is `adopt`.

The graft is performed later through the normal loop (`/apply` → `/save` → `/ship`). Each task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like.

#### Scenario: Nothing else is touched

- **WHEN** a run completes
- **THEN** the only paths written are absent payload files, `.claude/wong-sync-verdicts.md`, the change folder, and the manifest
- **AND** the user is directed to review the verdict record and run `/apply`

#### Scenario: Existing adoption change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: Tasks are concrete

- **WHEN** a task is written for an `adopt` capability
- **THEN** it names the capability id and states what changes in this repo, not merely the upstream feature's name

#### Scenario: Nothing to adopt

- **WHEN** no capability is verdicted `adopt`
- **THEN** no change folder is created
- **AND** `.claude/wong-sync-verdicts.md` is still written, and the report says the repo is current and points at it

#### Scenario: Target without OpenSpec

- **WHEN** the target has no `openspec/changes/` directory
- **THEN** the verdict record is still written and the report explains that the change could not be written

## ADDED Requirements

### Requirement: Every verdict lands in a durable, reviewable record

Every run of the analysis SHALL write `.claude/wong-sync-verdicts.md` in the target repo, containing **every** mapped capability — not only those verdicted `adopt` — each with its id, its verdict, and its one-line reason, grouped by verdict, together with anything re-raised or retired. It SHALL be written even when no capability is `adopt`, and it SHALL be a committed file rather than an ignored one, so it travels between clones and appears in the pull request diff.

The file SHALL carry a generated-file header stating that it is rewritten on every `/wong-sync` run and that ticked checkboxes are read before it is regenerated.

The chat report SHALL become a summary that points at this file, and SHALL NOT be the only place any verdict appears.

#### Scenario: A run with nothing to adopt still produces a record

- **WHEN** every capability is `present`, `divergent`, or `not-applicable`
- **THEN** `.claude/wong-sync-verdicts.md` is written with all of them and the report points at it

#### Scenario: Non-adopt verdicts are not chat-only

- **WHEN** a capability is verdicted `divergent`, `not-applicable`, or `declined`
- **THEN** it appears in `.claude/wong-sync-verdicts.md` with its reason, not merely in the run's chat output

#### Scenario: The record is regenerated, not appended

- **WHEN** a second run produces different verdicts
- **THEN** the file reflects the current run's verdicts rather than accumulating past ones

### Requirement: The user can overrule any non-adopt verdict by ticking a box

In `.claude/wong-sync-verdicts.md`, every capability **not** verdicted `adopt` SHALL be written as an unticked Markdown checkbox line carrying its capability id. Ticking a box SHALL be the supported way to overrule the skill's verdict, and SHALL be the only edit to the file the skill honors.

Before regenerating the file, each run SHALL read the existing one and collect every ticked capability id. Each such capability SHALL be force-verdicted `adopt` for that run and written as a task in the change folder, regardless of what the analysis would otherwise have assigned. Where a ticked capability had a `declined` ledger entry, that entry SHALL be cleared — asking for the capability is how a previous refusal is reversed.

The regenerated file SHALL show each promoted capability under the adopted group, so a tick is visibly acted on rather than silently consumed. The run's report SHALL name every capability promoted this way.

#### Scenario: Ticking promotes a not-applicable capability

- **WHEN** the user ticks a `not-applicable` entry and runs `/wong-sync` again
- **THEN** that capability is verdicted `adopt` and gets a task in the change folder

#### Scenario: Ticking reverses a decline

- **WHEN** the user ticks a `declined` entry and runs `/wong-sync` again
- **THEN** the capability is verdicted `adopt`, its `declined` ledger entry is cleared, and it is no longer suppressed

#### Scenario: A tick is visibly acted on

- **WHEN** a ticked capability has been promoted
- **THEN** it appears under the adopted group in the regenerated file and is named in the report

#### Scenario: Untouched file changes nothing

- **WHEN** the user ticks nothing between runs
- **THEN** no capability is force-adopted and the analysis's own verdicts stand

<!-- end specs/wong-sync-adapt/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 1896 -->
## MODIFIED Requirements

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

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-02

~~~
<!-- end .openspec.yaml -->
