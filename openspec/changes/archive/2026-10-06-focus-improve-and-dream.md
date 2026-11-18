<!-- openspec-archive v1 2026-10-06-focus-improve-and-dream -->
<!-- file proposal.md utf8 7952 -->
# Focus /improve on code and /dream on memory

**Status:** ready-to-ship

**Branch:** redesign-improve-dream

**Open questions:** none

## Why

The improve and dream skills blur into each other. Improve will ship any kind of improvement, so its last run added a feature, and nothing reliably looks after how the code is built. Dream tidies saved facts and your own wiki pages, but never reads the specs or past plans, so two of the four places your project remembers things go unchecked. Their names don't say what each one works on.

## What Changes

- **Two clearer names. BREAKING.** The new names are in the picture. Each name says what it works on.
  ```text
    BEFORE          AFTER
  /improve  ─▶  /improve-code
  /dream    ─▶  /dream-memory
  ```
- **Schedules you already made keep running.** A schedule that still uses an old name runs the renamed skill, so nothing stops on the day you update.
- **The code skill works only on how the code is built.** It makes the code simpler and safer to change. A new feature or a wording fix is a normal request, and trouble with memory or the wiki goes to the memory skill.
- **It plans, then stops for you.** It no longer builds or publishes on its own. It finds one improvement, writes the plan with the reason and the evidence, and ends at the plan's link, where you choose to build it, change it, or drop it. A scheduled run does the same and leaves the plan waiting for you.
  ```text
    BEFORE                AFTER
  find ─▶ build         find ─▶ plan ─▶ you
            │                          │ yes
            ▼                          ▼
         publish                build ─▶ publish
  ```
- **It looks where the trouble is.** It starts from where past chats struggled and where the code changes most, not from a checklist. It asks of each piece: if this were deleted, would the mess vanish or come back in every place that uses it?
- **Its plan proves the change is safe, or undoes it.** Every plan first locks in what the code does today with a test, then reshapes it. If the built result is not easier to read, the build undoes it and says so.
- **It remembers a no.** An idea it weighed and turned down, or a plan you dropped, is saved with the reason, so a later run does not suggest it again.
- **Every run ends one of three ways**: clean (nothing worth changing), planned (one plan waiting for you), or blocked (what stopped it).
- **The memory skill reads everything your project remembers.** It compares the wiki, saved facts, the specs, and past plans with each other and with the code. It fixes wiki pages and saved facts itself. A spec that is wrong, or a plan left half done, it lists for your yes.
  ```text
  wiki ────────┐
  saved facts ─┤          ┌▶ fixes: wiki, facts
  specs ───────┼▶ compare ┤
  past plans ──┘          └▶ lists: specs, plans
  ```
- **A stricter test for what goes on the wiki.** A fact is kept only if it will still be true in six months and would change what someone does. Guidance that exists but is buried gets moved or reworded, not written a second time.
- **A fault in the product is reported, not hidden.** When a page says one thing and the product does another, and the product is the one that is wrong, the memory skill leaves the page alone and passes the fault to the code skill.

**Non-goals.** No new schedule: both still run only when you type them or schedule them yourself. The memory skill does not rewrite specs, past plans, or the pages WongStack ships. No outside skill is adopted whole.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `repository-improvement`: the command is `/improve-code`; it writes a plan and stops instead of publishing; scope narrows to code structure; selection uses struggle notes and change hot spots; behaviour is pinned before restructuring; ruled-out ideas are recorded; a run ends clean, planned, or blocked.
- `wiki-dream`: the command is `/dream-memory`; it reads specs and plans as well as the wiki and facts; it corrects stale facts; it lists spec and plan mismatches; product faults go to `/improve-code`; the lasting-fact test is stricter.
- `cloud-routines`: a routine whose prompt names `/improve` or `/dream` runs the renamed skill.
- `memory`: the struggle-notes requirement is renamed, since two skills now read those notes; its behaviour is unchanged.

## Impact

- Skill folders `.agents/skills/improve/` and `.agents/skills/dream/` are renamed; `dream.mjs` gains a read-only `drift` command and spec rows in `pages`.
- `scripts/routine-runner/run.mjs`, memory's verb tags and slash-command re-tagging, `areas.json`, `payload-files.json`, the payload manifest, `retired-names.json`, `measure-sessions.mjs`, the context baseline, and their tests.
- `AGENTS.md`, `wiki/development/repository-improvement.md`, `wiki/development/wiki-dream.md`, `wiki/development/memory.md`, `wiki/maintaining/adding-a-skill.md`, `.agents/skills/routine/SKILL.md`.
- A major release: the typed commands change.

## Decision log

- **2026-10-06** — Asked what the two skills should be called → chose `/improve-code` and `/dream-memory`, with the old names kept working for existing schedules.
- **2026-10-06** — Asked how narrow the code skill should be → chose code structure only; features and wording fixes go through a normal request.
- **2026-10-06** — Asked what the memory skill does with a wrong spec or past plan → chose: fix wiki pages and saved facts itself, list wrong specs and stale plans for a yes.
- **2026-10-06** — Asked whether the code skill should consult before changing anything → chose: it goes straight into making a plan and ends there.
- **2026-10-06** — Assumed: a scheduled run saves its plan so it waits for a yes, because a schedule's copy of the project is thrown away when the run ends.
- **2026-10-06** — Asked whether the memory skill should also stop for a yes → chose: it goes all the way through to publishing on its own.
- **2026-10-06** — Assumed: "db" in the request means the saved-facts database, because it is the only database that holds memory.
- **2026-10-06** — Assumed: this is one change, not two, because the two skills share one boundary and one rename.
- **2026-10-06** — Assumed: the old names keep working in schedules only, not as typed commands, because a schedule breaks silently while a person who types the old name sees at once that it is gone.
- **2026-10-06** — Assumed: trouble notes about memory or the wiki go to `/dream-memory`, because the code skill no longer handles them.
- **2026-10-06** — Assumed: the wiki pages and specs keep their file names and get new titles, because installed projects link to them.
- **2026-10-06** — Assumed: ideas are taken from poteto's pstack and Matt Pocock's skills a sentence at a time with no text copied, because Matthew chose that over adopting them whole on 2026-10-04.
- **2026-10-06** — Assumed: the first real memory dream runs after the publish and is not a build task, because it needs the published skill and a plan with an open task can not be published.
- **2026-10-06** — Assumed: the stale-fact list counts a path only when the project once held it and the fact does not itself say it was removed, because the trial's first list was mostly false alarms (6 of the 10 read).
- **2026-10-06** — Assumed: a scheduled run's waiting plan is marked by a note that starts `Improve plan:`, because the trial could not tell which waiting note was the code skill's own.
- **2026-10-06** — Asked how to clear a publish blocked by Dependabot's failed update job on main → chose: fix the publish check in this change, so it counts only the project's own checks.
- **2026-10-06** — Archive checkpoint: built, three trial runs recorded in trial.md, local checks pass, numbered 37.0.0; the first real memory dream runs after the publish.

<!-- end proposal.md -->
<!-- file design.md utf8 8925 -->
# Design

## Context

See proposal.md for why. What shapes the approach:

- `.agents/skills/improve/SKILL.md` is a 19-line outcome brief that ships one change through `/ship` with no question. It is counted in the skills' instruction total, which sits 22 bytes under its cap ([`measure-context.mjs --check`](../../../scripts/measure-context.mjs)). `.agents/skills/dream/SKILL.md` is `disable-model-invocation: true`, counted apart as `on-call`; its how-to already lives on [`wiki/development/wiki-dream.md`](../../../wiki/development/wiki-dream.md).
- `/improve` has been redesigned four times. A fixed survey, rotation, and playbooks were removed on purpose on 2026-09-30; this design adds none back.
- No real `/dream` has run (memory thread #1186): only a dry run that skipped the consolidation step.
- A routine runs a verb by reading `.agents/skills/<name>/SKILL.md` ([`scripts/routine-runner/run.mjs`](../../../scripts/routine-runner/run.mjs), `skillPromptOf`), so a folder rename breaks a stored prompt unless the runner maps the old name.
- Memory facts are append-only: a fact is corrected by a newer fact that supersedes it.

## Goals / Non-Goals

**Goals:** the two renames with every surface that names them; the narrower `/improve-code` brief that ends at a plan; `/dream-memory` reading specs and plans and correcting stale facts; old names working in routines.

**Non-Goals:** a scheduled dream; a model-free dream; a typed alias for the old commands; renaming the `repository-improvement` and `wiki-dream` capabilities or their wiki pages' files; changing how struggle notes are captured.

## Decisions

1. **Rename the folders; keep the memory tags.** `.agents/skills/improve-code/` and `.agents/skills/dream-memory/`. The tags `improve` and `dream`, the `wiki-dream` slug in `dream.mjs`, and the `improve` and `dream` keys in `areas.json` stay, so open notes, the last-dream record, and area lookups carry over with no migration. `dream.mjs` keeps its file name. *Alternative:* rename tags too; rejected, since it orphans about 17 open notes for no gain a person sees.
2. **Old names map in the routine runner only.** `run.mjs` holds a small `RENAMED` map (`improve → improve-code`, `dream → dream-memory`) applied in `verbOf`; `routine.mjs`'s default name and `measure-sessions.mjs`'s verb pattern accept both. No stub skill folders: a stub costs instruction bytes, ships to every install, and `check-retired-names.mjs` exists to stop exactly that. A person who types the old name sees it is gone; the changelog's **Updating.** note names the new ones.
3. **Capability and page paths stay; titles change.** `wiki-dream.md` is retitled *Memory dream* and `repository-improvement.md` *Code improvement*. Installed repos link these pages and their headings ([`check-payload-links.mjs`](../../../scripts/check-payload-links.mjs)); keep every linked heading's exact text, and add new headings for new material.
4. **`dream.mjs` does what follows a rule.** A new read-only `drift` command prints three lists, `--json` too:
   - `fact`: live facts whose words name a repo path that no longer exists (reuse the path matcher memory's upkeep uses for area re-tagging).
   - `plan`: active changes with every task ticked, or whose folder has had no commit for 30 days (from `openspec list --json` and `git log -1`).
   - `spec`: `openspec/specs/*/spec.md`, longest unchecked first, last checked taken as `pages` takes it. Shown as extra `spec` rows in `pages` rather than a second ordering.
   The model does what takes judgment: whether a spec, a page, a fact, and the code agree.
5. **A dream's reach, by surface.** Own wiki pages: edited. Saved facts: superseded through memory's write gate, after reading the repo and, for a quoted person, `memory.mjs source`. Specs, active plans, archives, shipped pages: read only. Each pass checks the first twenty own pages (as today), the first five `spec` rows, and all of `drift`'s `fact` and `plan` lines; the limits are stated in the skill so a first run on a large install stays bounded.
6. **Where a dream's lists go.** Wrong specs, stale plans, and shipped-page mismatches: the report, plus one `thread` tagged `dream` (an area tag, already valid) that the next dream loads and re-checks, so an approved fix closes it. A product fault: one `thread` tagged `improve`. Today's step 9 tags the shipped-page list `improve`; that moves to `dream`, because `/improve-code` no longer acts on it.
7. **Both skills read the `improve` notes; each takes its own kind.** Capture stays as it is, with no routing judgment added to the cheap background run. `/improve-code` skips a note about memory or the wiki; `/dream-memory` skips one about code. *Alternative:* a second struggle tag chosen at capture; rejected, because the 2026-10-04 dry run showed capture wording is fragile.
8. **`/improve-code` stays a brief.** The skill file states scope, the notes-first rule, the three outcomes (clean, planned, blocked), `--audit-only`, and the hand-off: one selected problem with its evidence, intended result, scope, and verification goes to [`/plan`](../../../.agents/skills/plan/SKILL.md), and the run ends on the finished-plan question like any plan. It never runs `/apply` or `/ship`. Unattended, it then runs `/save` so the plan waits on its own branch, records a `thread` tagged `continue` naming the change, and stops. The method lives on `repository-improvement.md`, linked from the skill, as short sections the model reads when it needs them:
   - *Where to look*: open notes, then files changed most in the last 90 days (`git log --since="90 days ago" --name-only --format=`), then friction met while reading.
   - *The deletion test*: delete the piece in your head; if the complexity vanishes it was a pass-through, if it reappears in each caller it earns its keep.
   - *Pin, then reshape*: the plan's first task is a test that passes before and after; a type check or lint is not a pin; replace tests the old shape needed, don't stack new ones on top.
   - *Undo what is not simpler*: the plan's last build task compares before and after, and a result no simpler is reverted and recorded as ruled out.
   - *Remember a no*: a `project` fact tagged `improve` whose body starts `Ruled out:`, loaded with the notes; written for an idea the run rejected and for a plan the person dropped.
   - *A note closes at publish*: the plan names the note it answers, so the save that publishes it supersedes the note.
   No vocabulary list, checklist, or report template: those are what the 2026-09-30 redesign removed.
9. **Pay for the words.** `improve-code/SKILL.md` must end no larger than `improve/SKILL.md` is now, net of the longer name at each mention in instruction files (`routine/SKILL.md`, `close/SKILL.md` if it names it). Cuts come from the brief's own sentences that the wiki page now owns. `dream-memory/SKILL.md` is on-call; still rerun the check and update the baseline's file keys.
10. **Attribution.** `repository-improvement.md` already credits Matt Pocock's two skills; add poteto's pstack ([cursor/plugins, `pstack/`](https://github.com/cursor/plugins/tree/main/pstack)) there and on `wiki-dream.md`, naming the ideas taken. Ideas only, no text copied, so no license file is carried.
11. **Release level: major.** Two typed commands change name.

## Risks / Trade-offs

- [A wider dream costs more model time] → stated limits per pass; `--dry-run` first; the report says what it skipped.
- [Superseding a fact wrongly hides a true one] → the repo must contradict it, the source is read for a quote, the old fact stays searchable, and a dry run lists each correction.
- [Plans pile up unread from a weekly schedule] → a run that finds its own earlier plan still waiting reports blocked, naming it, and writes no second one.
- [A typed `/improve` no longer works] → the changelog's Updating note; routines are unaffected.
- [`check-retired-names.mjs` matching `/improve` inside `/improve-code`] → retire the path forms (`skills/improve/`, `skills/dream/`) and the backticked commands (`` `/improve` ``, `` `/dream` ``), with an allow for `openspec/specs/cloud-routines/spec.md` and `openspec/specs/multi-part-workspaces/spec.md`, whose scenarios describe old-name routines that still run.
- [A routine's memory key reads shared notes only (thread #1185)] → unchanged; scheduling a dream stays a follow-up.
- [An earlier research-led rewrite showed no measured gain (sharpen-explore, 2026-10-04)] → acceptance here is a real run of each skill, not wording alone.

## Migration Plan

`/wong-sync` copies the new folders and drops the old by the payload inventory; confirm with the sync test that a renamed `skillDirs` entry removes the old folder from a target. Rollback is reverting the one merge: tags and facts were never renamed.

## Open Questions

- How long the runner keeps the old-name map. It costs two lines; revisit at a later major.

<!-- end design.md -->
<!-- file tasks.md utf8 5591 -->
# Tasks

## 1. The `/improve-code` skill

- [x] 1.1 Move `.agents/skills/improve/` to `.agents/skills/improve-code/`; set `name: improve-code` and a description naming code structure; verify no `skills/improve/` path remains outside archives with `grep`.
- [x] 1.2 Rewrite the brief by design decision 8: code structure only, notes and ruled-out ideas loaded first, memory and wiki notes skipped, the three outcomes (clean, planned, blocked), `--audit-only`, the hand-off to `/plan` with no build or publish, the unattended save, an earlier waiting plan blocks a second, a link to the method page; verify it is no larger in words and bytes than the file it replaces.
- [x] 1.3 Rewrite `wiki/development/repository-improvement.md` as *Code improvement*: where to look, the deletion test, pin then reshape, undo what is not simpler, remember a no, it plans and stops, the three outcomes, cadence with the new name and what a scheduled run leaves behind, credit to pstack beside the existing one; keep every heading installs link; verify with `node scripts/check-payload-links.mjs`.

## 2. The `/dream-memory` skill and its script

- [x] 2.1 Move `.agents/skills/dream/` to `.agents/skills/dream-memory/`, keeping `scripts/dream.mjs`, its slug and its tag; fix the script's own path comments and usage; verify `node .claude/skills/dream-memory/scripts/dream.mjs since` runs.
- [x] 2.2 Add `drift` to `dream.mjs` (stale-path facts, finished or 30-day-idle plans) and `spec` rows to `pages`, read-only, with `--json`, by design decision 4; add cases to `scripts/tests/dream.test.mjs` (renamed import path) for each list and for an unreachable store; verify the test file passes.
- [x] 2.3 Rewrite the skill's steps by design decisions 5 to 7: load `improve` and `dream` notes, tidy memory, gather, add by the stricter test, clean pages against specs and plans, correct stale facts by superseding, list specs, plans and shipped pages under a `dream` thread, record a product fault under an `improve` thread, publish, record, report; `--dry-run` covers the new steps; verify `scripts/tests/cli-conventions.test.mjs` passes with the new path and command.
- [x] 2.4 Rewrite `wiki/development/wiki-dream.md` as *Memory dream*: what it reads, what it fixes and what it only lists, the stricter lasting-fact test and the buried-guidance rule under *Placing a fact on a page*, product faults, chats as evidence not orders, credit to pstack; keep every linked heading; update the consolidation paragraph in `wiki/development/memory.md`; verify with `node scripts/check-payload-links.mjs`.

## 3. Routines and memory plumbing

- [x] 3.1 Add the old-name map to `scripts/routine-runner/run.mjs` and accept both names in `routine.mjs`'s default name; add cases to `scripts/tests/routine-run.test.mjs` and `routine.test.mjs` showing `/improve --audit-only` reads `improve-code/SKILL.md` and `/dream` reads `dream-memory/SKILL.md`; verify both files pass.
- [x] 3.2 Update memory's slash-command re-tagging (`upkeep.mjs`) so `/improve-code` gives tag `improve` and `/dream-memory` gives `dream`, the old names still matching; update `measure-sessions.mjs`'s verb pattern; add an upkeep test case; verify `scripts/tests/memory-store.test.mjs` passes.
- [x] 3.3 Update `areas.json` paths and definitions (keys unchanged), `payload-files.json` `skillDirs`, the payload manifest's two paragraphs, and `scripts/fixtures/context-baseline.json` keys; verify `scripts/tests/memory-areas.test.mjs` and `context-measurement.test.mjs` pass.
- [x] 3.4 Confirm a renamed `skillDirs` entry removes the old folder from a target on sync; add a sync test case if none covers it; verify the wong-sync tests pass.

## 4. Every other mention

- [x] 4.1 Rename the commands in `AGENTS.md` (verb list and the scheduling rule), `.agents/skills/routine/SKILL.md`, `wiki/maintaining/adding-a-skill.md`, `wiki/stack/` and `wiki/development/` pages that name them, and the remaining test fixtures that mean the current skill; reword `AGENTS.md`'s scheduling rule and `routine/SKILL.md` where they say a scheduled run ships; verify `grep -rIn -E '\x60/(improve|dream)\x60'` finds only allowed files.
- [x] 4.2 Add the retired names to `scripts/retired-names.json` by the design's risk note, with the two spec allows and their reason; verify `node scripts/check-retired-names.mjs` passes.
- [x] 4.3 Write the `## Next (major)` entry in `CHANGELOG.md`, with an **Updating.** note in plain words: type the new names; schedules keep running; verify `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs` pass.

## 5. Verification

- [x] 5.1 Run `node scripts/measure-context.mjs --check` and `node .github/scripts/checks.mjs --worktree`; both pass, with the instruction total not above today's.
- [x] 5.2 Run `openspec validate focus-improve-and-dream --strict --no-interactive`.
- [x] 5.3 Run `/dream-memory --dry-run` here and record in `trial.md` what it lists from each of the four surfaces; it changes no file and no fact.
- [x] 5.4 Run `/improve-code --audit-only` here and record in `trial.md` its findings, that each is structural, and that it names the notes it skipped as memory or wiki ones. Then run `/improve-code` in a spare workspace and record that it ends at a plan's link with nothing built.

## After the publish

Not a build task, since it needs the published skill: from a clean checkout, run one real `/dream-memory`. Consolidation runs, the dream fact is found by `dream.mjs since`, and the edits match the dry run. This answers memory threads #1185 and #1186; record the result as a fact.

<!-- end tasks.md -->
<!-- file specs/cloud-routines/spec.md utf8 614 -->
# Spec Delta

## ADDED Requirements

### Requirement: A renamed skill's old name still runs

A routine whose prompt starts with a skill's earlier name SHALL run the skill under its current name, with the rest of the prompt unchanged, and the run's record SHALL name the skill that ran. `/improve` SHALL run `/improve-code` and `/dream` SHALL run `/dream-memory`.

#### Scenario: A routine made before the rename

- **WHEN** a routine created with the prompt `/improve --audit-only` runs after the install updates
- **THEN** the run follows `/improve-code` with `--audit-only`, and no one had to change the routine

<!-- end specs/cloud-routines/spec.md -->
<!-- file specs/memory/spec.md utf8 186 -->
# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: A session's struggles become notes for /improve`
- TO: `### Requirement: A session's struggles become improvement notes`

<!-- end specs/memory/spec.md -->
<!-- file specs/repository-improvement/spec.md utf8 7026 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Selection rests on evidence

The selected improvement SHALL rest on concrete evidence of value and an appropriate verification of its intended result. The report SHALL explain what improves and what was checked, disclosing material uncertainty. A pattern match alone SHALL NOT justify a fix. Every run SHALL end as exactly one of **clean**, **planned**, or **blocked**, named in its report: clean when no supported worthwhile candidate exists, planned when one plan was written, blocked when something stopped it.

#### Scenario: Nothing worth fixing
- **WHEN** investigation supports no worthwhile improvement
- **THEN** it reports clean and its limits, with no invented cleanup

### Requirement: Audit-only changes nothing

`/improve-code --audit-only [focus]` SHALL report supported findings and recommendations with no edit, fetch, branch, pull request, saved report, or delivery.

#### Scenario: A dirty checkout
- **WHEN** audit-only runs on local unsaved work
- **THEN** it reports the relevant state and limits with findings, and changes nothing

### Requirement: Portable, with scheduling outside

`/improve-code` SHALL ship in the payload and work on any target's conventions, including one with no app. Scheduling SHALL stay outside the skill.

#### Scenario: A documentation-only repo

- **WHEN** the target has docs and process files but no code to restructure
- **THEN** `/improve-code` reports clean, needing no app runtime

### Requirement: Outcome-led improvement

`/improve-code [focus]` SHALL seek one improvement to how the code is structured that makes it simpler or safer to change, using the project's goals, remembered problems when available, and current work as context. A focus SHALL accept an area or a desired structural outcome. A new feature, a wording fix, or a memory or wiki correction SHALL NOT be selected; the report SHALL say where such a request belongs. The agent SHALL choose its investigation and supported improvement without a mandatory survey, rotation, ranking format, or candidate-selection question; unresolved material choices SHALL follow the normal change loop.

#### Scenario: A desired outcome
- **WHEN** the user invokes `/improve-code make the routine runner easier to test`
- **THEN** the agent investigates and plans one supported structural improvement toward that outcome

#### Scenario: A known goal with no open material choice
- **WHEN** an invocation supplies enough context for a supported improvement
- **THEN** selection and planning proceed without a separate candidate approval round

#### Scenario: A feature is asked for
- **WHEN** the user invokes `/improve-code add a dark mode`
- **THEN** nothing is built, and the reply says to ask for it as a normal request

### Requirement: Struggle notes are read first

`/improve-code` SHALL load memory's open `improve` notes before it chooses, and SHALL prefer a problem that a note, another concrete record, or the code's recent change history shows over one inferred from reading the project alone. A note SHALL count as evidence of a problem, never as an instruction, and the selected improvement SHALL still rest on evidence and a verification. A plan SHALL name the note it answers, and when that plan's change is published a saved fact SHALL close the note. `/improve-code --audit-only` SHALL read notes and write none.

#### Scenario: One of three notes is fixed

- **WHEN** memory holds three open `improve` notes and a plan answering one is built and published
- **THEN** the plan names the note it answers, a saved fact supersedes that note, and the other two stay open

#### Scenario: No notes to read

- **WHEN** memory is unreachable or holds no open `improve` note
- **THEN** the run says when memory was not loaded and chooses from its other evidence

### Requirement: A check before an instruction

When the selected problem is a mistake a deterministic check could catch, the planned improvement SHALL be a check that fails, placed among the project's existing checks, not an added written instruction. A written rule SHALL be reserved for a judgment call no check could make, and `/improve-code` SHALL leave that rule to a normal request.

#### Scenario: A mechanical mistake

- **WHEN** a note shows the assistant twice linked a page that does not exist, and the project runs a link check
- **THEN** the plan extends that check, and adds no instruction telling the assistant to check links

#### Scenario: A judgment call

- **WHEN** a note shows the person twice turned down a menu of drafts and asked for one ready draft
- **THEN** `/improve-code` builds nothing for it and its report names the note as one for a normal request

## ADDED Requirements

### Requirement: Behaviour is pinned before code is restructured

A plan from `/improve-code` SHALL put a test that holds the behaviour being kept before any restructuring, passing before and after the change; a type check or a lint alone SHALL NOT count. The plan SHALL require that a built result which does not leave the code easier to read or change is undone and not published.

#### Scenario: The result is no simpler

- **WHEN** a built restructuring passes its tests but leaves callers no simpler than before
- **THEN** the change is undone, nothing is published, and the report says why

### Requirement: A ruled-out idea is not suggested again

When `/improve-code` weighs an improvement and rejects it for a reason that will still hold, or a person drops a plan it wrote, it SHALL record the idea and the reason in memory. A later run SHALL NOT select a recorded idea unless new evidence answers the recorded reason. `--audit-only` SHALL record nothing.

#### Scenario: The same idea a month later

- **WHEN** memory holds a ruled-out idea and nothing about its reason has changed
- **THEN** a later run does not select or recommend it

### Requirement: One plan, then it stops

A normal invocation SHALL authorize selecting one improvement and writing its plan, and nothing more: `/improve-code` SHALL NOT build, publish, or change any file outside the plan. The run SHALL end at the plan's link with the same question any finished plan ends on. A run with nobody to answer SHALL leave the plan saved and waiting, and SHALL NOT write a second plan while an earlier one of its own still waits.

#### Scenario: A person runs it
- **WHEN** a person invokes `/improve-code` and one improvement is supported
- **THEN** they get a plan's link and the choice to build it, and no code has changed

#### Scenario: A scheduled run
- **WHEN** a routine runs `/improve-code` and one improvement is supported
- **THEN** a saved plan waits for the person, their next chat shows it, and nothing is built or published

## REMOVED Requirements

### Requirement: One change through /ship

**Reason**: `/improve-code` no longer delivers a change; it writes a plan and stops for the person's yes.

**Migration**: Build a plan from `/improve-code` with `/apply`, or publish it with `/ship`.

<!-- end specs/repository-improvement/spec.md -->
<!-- file specs/wiki-dream/spec.md utf8 6930 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A dream adds what memory has gained since the last one

When a person runs `/dream-memory`, the assistant SHALL place each repeatable fact added to memory since the last dream on the wiki page that owns it, by the wiki's own rules, and SHALL leave every other fact in memory. A fact SHALL be placed only when it is expected to stay true for months and would change what a reader does. A fact on a topic with no page SHALL make that page, linked from its hub. Guidance a page already holds but buries SHALL be moved or reworded where it is, never added a second time.

#### Scenario: A lasting preference lands on its page

- **WHEN** a person stated a lasting preference about how work is done in a chat that was never closed with `/close`, and then runs `/dream-memory`
- **THEN** the preference is on that person's page after the dream

#### Scenario: A one-off decision stays in memory

- **WHEN** a new fact records one change's decision, a date, or finished work
- **THEN** no page gains it

### Requirement: A dream removes discrepancies from the install's own pages

Each dream SHALL re-check the install's own pages, longest unchecked first and up to a stated limit, against live memory, the files each page links to, the specs and plans that cover the same ground, and each other. It SHALL correct what they contradict, merge duplicates, move a fact to the page that owns it, and leave every hub listing its pages.

#### Scenario: A stale statement is corrected

- **WHEN** a re-checked page states something a newer live fact contradicts
- **THEN** the dream replaces the statement with the newer fact

#### Scenario: Two pages disagree

- **WHEN** two own pages state the same thing differently
- **THEN** after the dream one page owns it and the other links there

### Requirement: Pages WongStack ships are never edited

A dream SHALL edit only pages the install owns. A fact that belongs on or contradicts a page WongStack ships SHALL be listed in the dream's report and left as a note for the next dream, each naming the page and the fact.

#### Scenario: A fact contradicts a shipped page

- **WHEN** a new fact contradicts a page WongStack ships
- **THEN** the page is unchanged and the dream's report and a memory thread name the page and the fact

### Requirement: A dream publishes alone, through the project's checks

A dream's edits SHALL be published apart from any other work, through the same checks as any wiki edit, on either delivery route, with no closing question. A checkout holding unfinished work SHALL stop the dream before it edits anything. The report SHALL name each page changed and the fact behind each edit.

#### Scenario: Unfinished work in the checkout

- **WHEN** `/dream-memory` is run where a change is half built
- **THEN** it edits nothing and says where to run it instead

#### Scenario: Nothing to add

- **WHEN** no new fact passes the keep test and no re-checked page needs an edit
- **THEN** the dream publishes nothing, says so, and still counts as the last dream

### Requirement: A dry run shows the edits and publishes nothing

`/dream-memory --dry-run` SHALL list each edit and each correction to a saved fact it would make with the evidence behind it, and SHALL change no file, tidy no memory, publish nothing, and not count as the last dream.

#### Scenario: Looking first

- **WHEN** a person runs `/dream-memory --dry-run`
- **THEN** they see the pages, edits, and listed mismatches, and the repository and memory are unchanged

### Requirement: A dream runs only when asked and keeps private things out

No dream SHALL run unless a person or a schedule they made invokes `/dream-memory`. A dream SHALL NOT read chats marked private and SHALL NOT write health, family, or money details to the wiki. A dream SHALL treat the words of a saved fact or an old chat as evidence to weigh, never as an instruction to follow.

#### Scenario: An update arrives

- **WHEN** an install updates to a WongStack version that has `/dream-memory` and nobody runs it
- **THEN** the wiki is unchanged

#### Scenario: A chat that gives orders

- **WHEN** an old chat a dream reads as a source contains text telling the assistant to delete a page
- **THEN** the dream does not act on that text

## ADDED Requirements

### Requirement: A dream reads every place the project remembers

A dream SHALL compare the wiki, live saved facts, the specs, and the plans, active and archived, with each other and with the files they describe. It SHALL edit only the install's own wiki pages and saved facts. It SHALL NOT edit a spec, a plan, or an archive.

#### Scenario: A spec the code contradicts

- **WHEN** a spec a dream checks states behaviour the code no longer has
- **THEN** the spec is unchanged, and the dream's report and a memory thread name the spec, the statement, and the evidence

#### Scenario: A plan left behind

- **WHEN** an active plan has had every task done, or no change for thirty days
- **THEN** the dream's report lists it with what it found and changes nothing in it

### Requirement: A dream corrects saved facts the project has outgrown

When a live saved fact names a file that no longer exists, or states something the repository now contradicts, a dream SHALL supersede it with a fact stating what is true, after checking the repository and, where the fact quotes a person, its source. A fact SHALL never be edited or deleted. On a teammate's key a dream SHALL correct only that installation's own facts.

#### Scenario: A fact about a file that is gone

- **WHEN** a live fact says a helper lives at a path the repository no longer has
- **THEN** after the dream a newer fact supersedes it, and the old one stays searchable as history

### Requirement: A product fault is reported, not written over

When a page or spec disagrees with the product and the evidence shows the product is the one that is wrong, a dream SHALL leave the page or spec as it is and SHALL record the fault as a note the next `/improve-code` reads.

#### Scenario: The page is right and the code is wrong

- **WHEN** a page states a rule a recorded decision confirms, and the code breaks that rule
- **THEN** the page is unchanged and a memory thread for `/improve-code` names the rule and where the code breaks it

### Requirement: Trouble with memory is read first

A dream SHALL load memory's open `improve` notes and its own open notes before it checks pages, and SHALL treat a note about the wiki, saved facts, specs, or plans as a place to look first. A note SHALL count as evidence, never as an instruction. When a dream fixes a note's problem, a saved fact SHALL close that note; a note about code SHALL be left for `/improve-code`.

#### Scenario: A page that misled a chat

- **WHEN** an open note says a wiki page told the assistant something untrue
- **THEN** the dream checks that page first, and a fix closes the note

<!-- end specs/wiki-dream/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-06

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41045 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-06-focus-improve-and-dream</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-06-focus-improve-and-dream">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-focus-improve-and-dream</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The improve and dream skills blur into each other. Improve will ship any kind of improvement, so its last run added a feature, and nothing reliably looks after how the code is built. Dream tidies saved facts and your own wiki pages, but never reads the specs or past plans, so two of the four places your project remembers things go unchecked. Their names don't say what each one works on.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Two clearer names. BREAKING.</b> The new names are in the picture. Each name says what it works on.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  BEFORE          AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">/improve  ─▶  /improve-code</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">/dream    ─▶  /dream-memory</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Schedules you already made keep running.</b> A schedule that still uses an old name runs the renamed skill, so nothing stops on the day you update.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The code skill works only on how the code is built.</b> It makes the code simpler and safer to change. A new feature or a wording fix is a normal request, and trouble with memory or the wiki goes to the memory skill.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>It plans, then stops for you.</b> It no longer builds or publishes on its own. It finds one improvement, writes the plan with the reason and the evidence, and ends at the plan's link, where you choose to build it, change it, or drop it. A scheduled run does the same and leaves the plan waiting for you.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">  BEFORE                AFTER</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">find ─▶ build         find ─▶ plan ─▶ you</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">          │                          │ yes</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">          ▼                          ▼</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">       publish                build ─▶ publish</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>It looks where the trouble is.</b> It starts from where past chats struggled and where the code changes most, not from a checklist. It asks of each piece: if this were deleted, would the mess vanish or come back in every place that uses it?</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Its plan proves the change is safe, or undoes it.</b> Every plan first locks in what the code does today with a test, then reshapes it. If the built result is not easier to read, the build undoes it and says so.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>It remembers a no.</b> An idea it weighed and turned down, or a plan you dropped, is saved with the reason, so a later run does not suggest it again.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Every run ends one of three ways</b>: clean (nothing worth changing), planned (one plan waiting for you), or blocked (what stopped it).</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>The memory skill reads everything your project remembers.</b> It compares the wiki, saved facts, the specs, and past plans with each other and with the code. It fixes wiki pages and saved facts itself. A spec that is wrong, or a plan left half done, it lists for your yes.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-9-line-1" tabindex="0">wiki ────────┐</span>
<span class="ln" data-note="item-9-line-2" tabindex="0">saved facts ─┤          ┌▶ fixes: wiki, facts</span>
<span class="ln" data-note="item-9-line-3" tabindex="0">specs ───────┼▶ compare ┤</span>
<span class="ln" data-note="item-9-line-4" tabindex="0">past plans ──┘          └▶ lists: specs, plans</span></pre></div></details></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>A stricter test for what goes on the wiki.</b> A fact is kept only if it will still be true in six months and would change what someone does. Guidance that exists but is buried gets moved or reworded, not written a second time.</div></div></li>
<li class="item card" id="item-11"><span class="num">11</span><div class="body"><div class="text" data-note="item-11" tabindex="0"><b>A fault in the product is reported, not hidden.</b> When a page says one thing and the product does another, and the product is the one that is wrong, the memory skill leaves the page alone and passes the fault to the code skill.</div></div></li>
</ol>
<p class="aside"><b>Non-goals.</b> No new schedule: both still run only when you type them or schedule them yourself. The memory skill does not rewrite specs, past plans, or the pages WongStack ships. No outside skill is adopted whole.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what the two skills should be called → chose <code>/improve-code</code> and <code>/dream-memory</code>, with the old names kept working for existing schedules.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how narrow the code skill should be → chose code structure only; features and wording fixes go through a normal request.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what the memory skill does with a wrong spec or past plan → chose: fix wiki pages and saved facts itself, list wrong specs and stale plans for a yes.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether the code skill should consult before changing anything → chose: it goes straight into making a plan and ends there.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: a scheduled run saves its plan so it waits for a yes, because a schedule's copy of the project is thrown away when the run ends.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether the memory skill should also stop for a yes → chose: it goes all the way through to publishing on its own.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: &quot;db&quot; in the request means the saved-facts database, because it is the only database that holds memory.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: this is one change, not two, because the two skills share one boundary and one rename.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the old names keep working in schedules only, not as typed commands, because a schedule breaks silently while a person who types the old name sees at once that it is gone.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: trouble notes about memory or the wiki go to <code>/dream-memory</code>, because the code skill no longer handles them.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the wiki pages and specs keep their file names and get new titles, because installed projects link to them.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: ideas are taken from poteto's pstack and Matt Pocock's skills a sentence at a time with no text copied, because Matthew chose that over adopting them whole on 2026-10-04.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the first real memory dream runs after the publish and is not a build task, because it needs the published skill and a plan with an open task can not be published.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the stale-fact list counts a path only when the project once held it and the fact does not itself say it was removed, because the trial's first list was mostly false alarms (6 of the 10 read).</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: a scheduled run's waiting plan is marked by a note that starts <code>Improve plan:</code>, because the trial could not tell which waiting note was the code skill's own.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how to clear a publish blocked by Dependabot's failed update job on main → chose: fix the publish check in this change, so it counts only the project's own checks.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: built, three trial runs recorded in trial.md, local checks pass, numbered 37.0.0; the first real memory dream runs after the publish.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
<!-- file trial.md utf8 3875 -->
# Trial runs, 2026-10-06

Three helper runs followed the rebuilt skills as written, before the publish. None changed a file outside its own plan folder, and none wrote to memory.

## `/dream-memory --dry-run`

Run in the build's checkout, bounded to 40 facts per type, 8 own pages, 5 specs, and 10 stale-fact lines read closely. `git status --short` counted 37 lines before and after.

| Surface | What it listed |
|---|---|
| Notes | 17 `improve`, 1 `dream`. Three taken as memory or wiki notes (#1224, #1060, #949); 13 left for `/improve-code`. |
| Wiki | Two edits: `wiki/maintaining/measure-session-speed.md:16` gains *Codex logs only* (evidence `scripts/measure-sessions.mjs:26-27`); `wiki/maintaining/adding-a-skill.md:5-7` moves a paragraph back beside its list. No new fact landed on an own page; #1228 and #1214 were listed for shipped pages. |
| Saved facts | Four corrections: #136 and #297 name `scripts/measure-usage.mjs`, removed in 27.3.0; #639 names a page now at `wiki/maintaining/adding-a-skill.md`; #743, tentative, names `app/src/apps/devices/`. |
| Specs | No mismatch in about 15 statements across five specs. |
| Plans | None stale. |
| Product faults | None. |

What the trial found wrong, and what changed before the publish:

- **`drift` was mostly false alarms**: 6 of 10 lines read were words that only look like paths, proposed work, paths on another branch, or records of a removal. It now lists a path only when this branch's history once held it and the fact does not itself say it was removed. The list here went from 18 lines to 4, keeping the three confirmed ones.
- **`since` read half of a split dream record.** It now joins the parts: 12 checked pages, not 6.
- **The notes search could cut off at 30.** The step now asks for 100.
- **No fallback when a chat was not stored.** The fact is then treated as the assistant's reading.
- **A dry run was unclear about the write gate.** It now says no write-gate command runs.

Left as found, not fixed here:

- `memory.mjs areas <page>` returned the same 20 facts for four different own pages, so comparing a page with its area's facts says little.
- In this source repo every page a new fact belonged on is a shipped page, so a dream here mostly lists and seldom edits.
- A spec's *last checked* is its last commit, so the first five are the least-edited, and five specs hold about 40 requirements.

## `/improve-code --audit-only`

Run in the build's checkout; 37 status lines before and after.

- Loaded 17 `improve` notes, 4 `continue` notes, no `Ruled out:` fact.
- Skipped three as memory or wiki notes and 14 as not structural: agent behaviour, plan sizing, and wording.
- One finding, structural: the release number is written into the branch before the checks run, so a release landing meanwhile voids the checked commit (notes #1198, #318, #341, #395; `VERSION` changed in 248 of 279 commits in 90 days). The deletion test removes a refusal, a conflict rule, and a recovery path together. A normal run would end **planned**.

Changed after it: the skill now says what the `continue` search is for, names how the assistant behaves as a normal request, and allows a plan that answers no note.

## `/improve-code make the routine runner easier to test`

Run in a spare copy at the build's state. Outcome **planned**: change `test-the-routine-worker`, valid under `openspec validate --strict`, review page built. Its first task pins behaviour with a test against the unchanged file; task 3.1 undoes the reshape if the fixture is no shorter. The only path changed was the plan's own folder. `/apply`, `/ship`, and `/save` were never called; the run stopped at the finished-plan question.

Left as found: the method assumes the code can be imported by a test; where it can not, the pin needs test machinery first, and the page does not say what *no simpler* means for a tests-only change.

<!-- end trial.md -->
