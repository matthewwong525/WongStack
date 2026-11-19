<!-- openspec-archive v1 2026-10-13-fewer-rules-with-reasons -->
<!-- file proposal.md utf8 19373 -->
# Fewer rules, each with its reason

**Status:** ready-to-ship
**Branch:** simplify-overprescribed
**Open questions:** none

## Why

The assistant's instructions were shortened once by cutting words and keeping every rule. What is left reads as tight lists of "never" lines with no reasons, the same rule sits in several places, and the written records repeat the instructions sentence by sentence. Newer assistants follow a goal and its reason better than a long list, and every extra rule is one more thing to keep true.

## What Changes

- **Each step says what to achieve and why.** The seven steps of the loop (think it through, plan, build, save, publish, pick up later, check) and the pages they share are rewritten as goals with reasons, not lists of prohibitions.
  ```text
  BEFORE
  Wait quietly. At most one short
  line per wait. Read none of its
  edited files.

  AFTER
  Let the helper build unwatched:
  it exists so the build does not
  fill this chat.
  ```
- **Every rule is sorted before anything is cut.** A rule that guards something that can't be undone stays as it is. A rule that came from a past mistake stays as one line with its reason. Only a rule a script already enforces, a repeat, or one with no known cause goes.
  ```text
  the rule...            │ what happens
  ───────────────────────┼──────────────────
  guards a can't-undo    │ kept as it is
  came from a mistake    │ one line + why
  is done by a script    │ dropped
  is written twice       │ one home, linked
  has no known cause     │ dropped
  ```
- **A rule has one home.** Where the same rule is written in a step's page, the wiki, and the always-loaded instructions, one copy stays and the others link to it.
- **The written records go back to promises.** The records for these steps keep what you rely on (what you see, what must never happen) and lose step order and exact wording.
- **Tests stop locking sentences.** Three tests fail today when a sentence in an instruction page is reworded. Those go; every test of a script stays. Each removed test is named with its reason.
- **You see what was dropped before you publish.** The build ends with one plain line for every rule dropped, and a second reader checks that nothing meant to be kept went missing.
- **A note so it does not grow back.** The page on writing a skill gains one rule: cut a rule before you cut words, and give each rule its reason.

**Non-goals:** Setup, sync, memory, closing a chat, schedules, and the two improve skills stay as they are. So do the Cloudflare failure map, every guard on keys and forced pushes, what any script does, and the word budget. The two parts of the check's guide that say how to write a walk and grade it stay too: the repo's rule is to measure those with a paid practice run first.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `context-economy`: a change that simplifies instructions lists each dropped rule with its reason, beside each kept rule's new home, and shows the dropped ones to the person before publishing.
- `asking-the-user`, `apply`, `change-loop`, `delivery-gate`, `openspec-workflow`, `staging-walkthrough`, `multi-part-workspaces`: requirements that retell a rewritten skill's steps or exact wording are thinned to the promise, by the bar `openspec-workflow` already sets. Their deltas are written in the build beside the rule map, because a requirement goes only when its rule's sort is known.

## Impact

- `.agents/skills/{explore,plan,apply,save,ship,continue,verify}/SKILL.md`; `explore/references/asking-the-user.md`; `apply/references/build-helper.md`; `save/references/checkpoint-evidence.md` (selection rungs); `verify/references/walkthrough.md` except §§ b and d.
- `wiki/development/the-change-loop.md`, `AGENTS.md`, and any other page holding a repeat of a rule from those files; `wiki/maintaining/adding-a-skill.md` and `.agents/rules/payload.md` for the new convention.
- The seven specs above plus `context-economy`; `scripts/tests/cli-conventions.test.mjs`, `schedule-delivery.test.mjs`, `document-recall.test.mjs`.
- A `minor` `CHANGELOG.md` entry. `/wong-sync` brings every changed skill; a skill an install adapted shows as a merge.

## Decision log

- **2026-10-13** — Asked which simplification to start with → chose all of them in one pull request ("can we do them all in this PR?").
- **2026-10-13** — Asked how far the rule-cutting goes → chose every step's skill, not only the pages the audit named.
- **2026-10-13** — Asked what happens to a rule that exists because something once went wrong and no script backs it → chose keep it as one line with its reason.
- **2026-10-13** — Assumed: "every step" means explore, plan, apply, save, ship, continue, and verify with the pages they share, because those are the ones the question named; setup, sync, memory, close, schedule, and the improve skills are untouched.
- **2026-10-13** — Assumed: the walkthrough's sections on writing journeys and grading evidence stay as written, because `wiki/maintaining/measure-a-skill-change.md` says to measure those with a paid practice run before changing them.
- **2026-10-13** — Assumed: wordy specs are thinned, not retired, because `openspec-workflow` already requires that specs hold promises, not procedure; 60 requirements carry more than its two scenarios.
- **2026-10-13** — Assumed: only the `context-economy` delta is written with the plan and the other seven in the build, because which requirement goes depends on the rule map the build writes first.
- **2026-10-13** — Assumed: the rewritten helper brief gains one line against ending its turn while a sub-helper or background check still runs, because that mistake was seen four times (memory #1496) and the brief is being rewritten anyway.
- **2026-10-13** — Assumed: every heading another page links to keeps its exact text, because installed repos' own pages link those headings and the link check fails on a renamed one.
- **2026-10-13** — Assumed: the word budget and its check stay as they are, because dropping rules lowers the count without touching them.
- **2026-10-13** — Assumed: a minor release, because every install's skills change and an adapted skill needs a merge, but nothing breaks.
- **2026-10-13** — Found while planning: only three tests lock a sentence of instruction text (the audit first suggested many more), and `/apply`'s build-order rules are deliberate recent choices no script enforces, so they are kept as one line each rather than dropped.
- **2026-10-13** — Before counts, by `node scripts/measure-context.mjs --json`: instructions 25,372 words and 190,790 bytes (baseline 27,084 words), owners 12,637, descriptions 245, startup route 2,038 of 2,200; save routes active 4,738, named-secret 6,706, facts 4,363, new-plan 7,926, archived 4,738, cold-resume 6,028. By `wc -w`: `explore/SKILL.md` 581, `plan/SKILL.md` 685, `apply/SKILL.md` 935, `save/SKILL.md` 698, `ship/SKILL.md` 1,021, `continue/SKILL.md` 984, `verify/SKILL.md` 511, `explore/references/asking-the-user.md` 1,090, `apply/references/build-helper.md` 308, `save/references/checkpoint-evidence.md` 261, `verify/references/walkthrough.md` 1,654, `wiki/development/the-change-loop.md` 2,989, `AGENTS.md` 690, `wiki/maintaining/adding-a-skill.md` 544, `.agents/rules/payload.md` 963; 13,914 in all.
- **2026-10-13** — Sorted 342 rules in `rule-map.md`: 27 guards kept as they are, 133 kept as one line, 55 merged to one home, 6 dropped (3 with no cause, 3 a script already says), 119 steps and commands kept, 2 added.
- **2026-10-13** — Check: `scripts/tests/cli-conventions.test.mjs` no longer matches the sentence "attached review notes … before readiness" in `/apply` and `/ship`, because it failed on any rewording; it still fails when either skill loses its link to `/plan`'s review-notes section.
- **2026-10-13** — Check: `scripts/tests/schedule-delivery.test.mjs` no longer matches the sentences "pending questions block dependent actions" and "retain `--store <id>`" or their order on the page in `/continue`, `/apply`, and `/plan`, because it failed on any rewording; it still fails when a skill loses its link to the schedule-record route or that route loses the `--store <id>` flag.
- **2026-10-13** — Check: `scripts/tests/document-recall.test.mjs` no longer matches the phrase "read cited originals" in `/explore`, because it failed on any rewording; it still fails when the skill loses the `recall <question>` or `areas <paths>` command.
- **2026-10-13** — No heading, command, flag, or name was renamed or removed, so `scripts/retired-names.json` is unchanged.
- **2026-10-13** — No delta for `openspec-workflow`: its eight requirements already state promises with one or two scenarios, and none retells a rule the map moved or dropped.
- **2026-10-13** — Requirements with more than two scenarios were removed and added back under a new name as one or two promises, because a modified requirement must keep every scenario: two in `asking-the-user`, one each in `change-loop`, `delivery-gate`, `multi-part-workspaces`, and `staging-walkthrough`.
- **2026-10-13** — Second reader (a fresh helper given only the rule map and the diff) confirmed the walkthrough's two measured sections are unchanged, every heading and code block is unchanged, and every guard is present. It found 28 points; the restores follow.
- **2026-10-13** — Restored after the second read, in `/apply`: "capture or access failure" among the reasons for no picture; "and its tests" in final acceptance; "Never" in "never save to stop"; "pause on ambiguity or a blocker: the proposal is the intent".
- **2026-10-13** — Restored after the second read, in `/plan`: "explicit" before "build or publish choice"; "print the plan's link however `/plan` was invoked".
- **2026-10-13** — Restored after the second read, in `/explore`: "no prototypes or local builds" (first sorted as no cause; "read-only checks" does not rule out a local build); "speculative or cheaply changed concerns need no questions"; "never ask the person to guess" a fact.
- **2026-10-13** — Restored after the second read, in the ask page: "never offer a choice that needs judgment the reader lacks"; "never an added Other option".
- **2026-10-13** — Restored after the second read, in `/ship`: "it never authorizes archiving unchecked tasks"; the `sole-active` wording of the no-argument and cold-stop rules; "merge, not rebase, unless asked" (first sorted as script, but a rebase of a pushed branch needs a force push, so it is a guard); the `LIVE_LOOK`, `REASON`, and `URL` names in the live look; "`CHANGE_NAME` is separate from `BRANCH`".
- **2026-10-13** — Restored after the second read, in `AGENTS.md`: "asked with no verb" as the condition for the two stops; "a confirm per outward action".
- **2026-10-13** — Restored after the second read, in `/verify`: "a blocked or failed prerequisite pauses only its dependents".
- **2026-10-13** — Reasons corrected after the second read, because the record did not support them: the helper brief's three-round limit and its cache and install rule now state no invented reason; the build-order why says "more runs for repairs", as its source does; a staging email "could reach" a customer; the rule on checks never kept links the wiki's reason; the walkthrough page says a build is written before it is checked and a walk you ask for still runs at any point.
- **2026-10-13** — Not restored: the allowance that a phone view can be the second picture, because it served only the count that was dropped; and the exception for a check asked for early stays in the helper brief alone, because this design names the brief as its one home.
- **2026-10-13** — After counts, by `node scripts/measure-context.mjs --json`: instructions 25,350 words and 189,969 bytes (were 25,372 and 190,790), owners 12,560, descriptions 245, startup route 1,971 of 2,200; save routes active 4,795, named-secret 6,763, facts 4,420, new-plan 8,009, archived 4,795, cold-resume 5,994. By `wc -w`: `explore/SKILL.md` 595, `plan/SKILL.md` 697, `apply/SKILL.md` 891, `save/SKILL.md` 717, `ship/SKILL.md` 961, `continue/SKILL.md` 956, `verify/SKILL.md` 539, `explore/references/asking-the-user.md` 1,069, `apply/references/build-helper.md` 360, `save/references/checkpoint-evidence.md` 305, `verify/references/walkthrough.md` 1,616, `wiki/development/the-change-loop.md` 2,983, `AGENTS.md` 623, `wiki/maintaining/adding-a-skill.md` 700, `.agents/rules/payload.md` 974; 13,986 in all.
- **2026-10-13** — Found while building: the word count barely moved. The eleven skill pages went from 8,728 words to 8,706, and the fifteen scoped files grew by 72 because the new convention added 156 to `adding-a-skill.md`. Keeping every rule that came from a mistake, each with its reason, gave back what the six drops and 55 merges saved; five of the six save routes grew, by 57 to 83 words, because the rung list for every verb now sits in `checkpoint-evidence.md` and `/save` gained reasons; all stay under their limits.
- **2026-10-13** — Found after the first build: 118 of the 135 rules kept as "came from a past mistake" rest only on the release that added them, which is true of nearly every rule; 17 have a mistake or a request on record. Six rules were dropped and the word count stayed flat.
- **2026-10-13** — Asked how to go on after the build dropped only 6 rules → chose cut deeper and show the dropped list before publishing. A rule now stays only if a mistake is on record, the person asked for it, or it guards something that can't be undone; the publish no longer runs without a stop.
- **2026-10-13** — Second pass, by design.md's "a release is not a cause": each of the 135 `incident` rows was searched again in memory's feedback and thread facts, `memory.mjs areas`, and every archived Decision log. 38 have a mistake or a request on record and stay as one line; 85 are the step itself and stay; 11 rows and 2 clauses split from kept rows are dropped; 1 is a repeat and merged.
- **2026-10-13** — Sorted 345 rules in `rule-map.md` after the second pass (342, plus three split): 27 guards kept as they are, 38 kept as one line with a mistake or a request on record, 205 steps and commands kept, 56 merged to one home, 19 dropped (16 with no cause, 3 a script already says).
- **2026-10-13** — Found in the second pass: several `#n` citations in the first map were pull-request numbers, not memory facts, so every drop candidate was searched again on its own terms; each dropped row's Evidence names the terms.
- **2026-10-13** — Dropped in the second pass, each with its covering goal quoted in `rule-map.md`: in `/apply`, ask when unsure which plan, never show a live page or login screen, and pause on ambiguity or a blocker; in the ask page, two options for a confirmation, the tool's limits, and a missing tool moves down the list; in `/explore`, invent no alternatives, minor assumptions and evidence gaps, and no extra sign-off; in `/save`, resolve ambiguity before staging; in `/continue`, it drafts no specs; in the walkthrough, consumer checks grant no repair scope, and other evidence is inline text.
- **2026-10-13** — Kept as steps with nothing on record, by the lean toward `step`: a rule paired with its wrong turn ("X, not Y") counts as one rule; a loop bound with no other goal covering it stays; and a rule whose promise sits in a spec this change does not touch stays (the *(Recommended)* label, no second agent or browser for a plan's wireframe, no new infrastructure or weaker checks in a walk).
- **2026-10-13** — Spec deltas in the second pass: `asking-the-user` removes "Consequential alternatives receive a grounded recommendation" and adds it back as "A consequential choice gets a grounded recommendation" with one scenario, without the settled-request case; `apply` no longer names a wrong page in "Pictures are unavailable"; `staging-walkthrough` modifies two requirements to drop the sentences that a consumer check grants no repair scope.
- **2026-10-13** — Second reader of the second pass (a fresh helper given only the 14 dropped rows and the diff): every dropped line is gone, every covering sentence the map quotes is in the new text, and no script, test, or link reads a dropped line. It returned one restore and two doubts; all three were acted on.
- **2026-10-13** — Restored after the second pass's read, in the walkthrough: "no video". Nothing else on the verify pages rules a recording out, and `staging-walkthrough`'s spec says "never a video". "Other evidence is inline text" stays dropped.
- **2026-10-13** — Restored after the second pass's read, in `/explore`: "no prototypes or local builds". "Write nothing" reads as a rule about files, so a trial build could pass as a read-only check; both second readers flagged it, so it stays as a step.
- **2026-10-13** — Restored after the second pass's read, in `/apply`: the blocker line links the closing ask again ("ending with the ways to clear it"), because a blocker can stop the build before the page's report step is reached. "Pause on ambiguity or a blocker" stays dropped.
- **2026-10-13** — Not restored: the count of two pictures, which the second reader raised again. This design's worked example drops the count and the `apply` delta already says "the screens that changed". Left for the person to decide at the dropped list, because the logged request was for "a couple of screenshots".
- **2026-10-13** — No test assertion was removed or changed in the second pass; no heading, command, flag, or name was renamed or removed.
- **2026-10-13** — After counts for the second pass, by `node scripts/measure-context.mjs --json`: instructions 25,214 words and 189,121 bytes (were 25,350 and 189,969), owners 12,560, descriptions 245, startup route 1,971 of 2,200; save routes active 4,791, named-secret 6,759, facts 4,416, new-plan 7,961, archived 4,791, cold-resume 5,951. By `wc -w`: `explore/SKILL.md` 557, `plan/SKILL.md` 691, `apply/SKILL.md` 859, `save/SKILL.md` 713, `ship/SKILL.md` 961, `continue/SKILL.md` 945, `verify/SKILL.md` 539, `explore/references/asking-the-user.md` 1,035, `apply/references/build-helper.md` 360, `save/references/checkpoint-evidence.md` 305, `verify/references/walkthrough.md` 1,605, `wiki/development/the-change-loop.md` 2,983, `AGENTS.md` 623, `wiki/maintaining/adding-a-skill.md` 700, `.agents/rules/payload.md` 974; 13,850 in all (were 13,986).
- **2026-10-13** — Found in the second pass: the stricter test moved 85 of the 135 rules to `step`, not to dropped, because each is the only sentence that makes the assistant do that thing. The eleven skill pages went from 8,706 words to 8,570.
- **2026-10-13** — Put back the picture count in `/apply` ("a couple of the screens that changed, one when only one view matters"), because the 2026-10-08 log of `show-apply-screenshots` records the person asking for "a couple of screenshots", which the second-pass test keeps. Eighteen rules are dropped, not nineteen.
- **2026-10-13** — Archive checkpoint: the change is archived as release 40.6.0 and saved for its checks; eighteen rules dropped, 56 repeats merged to one home, every other rule kept with its row in `rule-map.md`.

<!-- end proposal.md -->
<!-- file design.md utf8 10761 -->
# Design

## Context

See proposal.md for why. The constraints that shape the how:

- `shorten-skill-instructions` (25.17.0) cut words and kept every rule; `thinner-specs` (25.16.0) thinned the specs. Both grew back: skills hold 182 "never"s, and 60 spec requirements carry more than the two scenarios [the spec bar](../../../.agents/rules/openspec.md) allows.
- Every edited file ships to installs, so a dropped rule reaches all of them. Two rule-by-rule reviews of the last trim found rules lost by accident.
- Only `/verify` has a practice site ([measure a skill change](../../../wiki/maintaining/measure-a-skill-change.md)); everything else is judged by reading.
- A long plan slows the build helper (memory, run-without-paseo, 2026-10-05), so this design gives the method and one worked example, and the build writes the full map.

## Goals / Non-Goals

**Goals:**

- Fewer rules in the seven verb skills and their shared pages, each remaining rule stated as a goal with its reason.
- One home per rule across skills, wiki, and `AGENTS.md`.
- Specs for these verbs at the promise bar; no test that fails on a reworded sentence.
- A reviewable record of every rule's fate.

**Non-Goals:**

- No script, hook, or check changes behavior. `measure-context.mjs` and its baseline are untouched.
- `walkthrough.md` §§ b and d, the vendored `agent-browser`, and every skill outside the seven.
- No new check to hold the result in place; the convention and the rule map are the guard.

## Decisions

### Sort every rule into `rule-map.md` before editing

The build first writes `rule-map.md` in this change folder (as `trim-always-loaded-instructions` did): one section per scoped file, one row per rule, with its sort, where it now lives or why it goes, and the evidence. Edits then follow the map. Sorting first, in one pass, keeps a rule from being judged differently in two files.

| Sort | Test | Result |
|---|---|---|
| guard | The action can't be undone or leaks: a force push, a deletion, a merge, a sent message, a payment, a credential in a tracked file | Kept, absolute wording allowed |
| incident | Memory, an archived Decision log, the changelog, or the wiki records it going wrong, or the person asked for it by name | One line: the goal and its reason |
| script | A script already decides or enforces it (name the script and what it prints) | Dropped; keep only the command and how to read its result |
| repeat | Another in-scope page states it | Kept at its home, linked from the others |
| no cause | One search of memory and the archive finds no cause, and a goal already in the file covers it | Dropped |

Look for a cause once per rule cluster: `memory.mjs search <terms>`, `memory.mjs areas <file>`, and `grep` over `openspec/changes/archive/*/proposal.md` and `CHANGELOG.md`. A spec requirement alone is not a cause; it is the same rule's second copy. Unsure between incident and no cause → keep as one line: the person chose that side.

Alternative considered: decide every rule in the plan. Rejected: the plan would run to thousands of words the person never reads, and the helper would re-read it all.

### Second pass: a release is not a cause

The first build kept 135 rules as `incident`; for 118 the only evidence is the release that added the rule. The person then chose a stricter test, and it replaces the `incident` row above:

- **On record** means a failure someone saw (a memory `thread`, `feedback`, or struggle fact, a Decision-log line saying what went wrong, a wiki passage naming the incident), or the person asking for that rule (their words in a fact, or an `Asked` log line). The release that introduced a rule, a spec requirement, or a design note is not a cause.
- Re-sort each release-only `incident` row into one of three:
  - `incident (on record)`: a second search finds a failure or an ask. Kept as one line; cite the fact number or log line.
  - `step`: the line is the behavior itself: what the verb does, a routing case, a line or name a caller or script reads, a definition. Nothing else on the page would make the assistant do it. Kept.
  - `no cause`: a restriction, limit, count, format detail, or reminder that a goal on the same page (or its linked home) already covers. Dropped; the row quotes the covering goal.
- Unsure between `step` and `no cause` → `step`. Unsure between `incident (on record)` and `no cause` → `no cause`: the first pass erred the other way.
- Guards are untouched, as before. So are headings, code blocks, commands, flags, and names.
- A dropped rule's spec requirement goes with it, by "Specs: thin by the map".
- The second reader runs again on the new drops only: each dropped row's covering goal is present in the new text, and no dropped row is a guard, a caller-read line, or the only statement of a behavior.

### A home for each kind of text

- **Skill**: what to do and the one-clause reason. **Wiki**: the long why. **Script**: anything it already decides.
- The build-order rule's how lives in `build-helper.md`; its task layout in `plan/SKILL.md#finish`; its why in `the-change-loop.md`. `apply/SKILL.md` links, and states none of it.
- The ask format lives in `asking-the-user.md`; `AGENTS.md` keeps one orienting line per rule and the link.
- The rung names stay in `checkpoint-evidence.md#selection-rungs`, because `change-candidates.sh` and `ship.mjs prepare` print them. A verb's own page says which outcome it needs (work on what this chat is about; ask when several fit; a cold `/ship` never publishes the only open plan), not the list.

### Worked example: `/apply` and its helper brief

| Rule today | Sort | After |
|---|---|---|
| Resolve by five named rungs; an unrelated `sole-active` never overrides explored work | script + incident | One line on the outcome; link to the rungs |
| Review notes handled before readiness; stops; goes on without another choice | incident (2026-10-11, asked for) | One line + link; its phrase test goes |
| `applyRequires` routing | script (CLI data) | Kept as the short list |
| Wait quietly; one line per wait; read none of its files | incident (context, apply-builds-in-a-helper) | One line with the reason |
| "Follow the brief's final verification phase… early requests… prerequisites block" | repeat | Dropped here; home is the brief |
| Preview, loosened-checks, and app-untouched commands | script | Kept as commands |
| Two distinct screens, one picture if one view, caption above, file link insufficient | incident (2026-10-08, asked for) + no cause (counts) | "Show the screens that changed as pictures in the chat, from this exact preview"; counts go |
| Never substitute a live page or login screen | incident, if the search finds it | One line with reason, else folded into the goal |
| Each outward step shown and confirmed | guard | Kept as it is |
| Git stays with `/save`; never save to stop | repeat | One line each + link to the loop |
| Brief: all source and tests before any test run | incident (asked for, speed) | One line with the reason; its repeat in **Never** goes |
| Brief: three repair rounds at most | search | One line with reason, or "stop when repairs stop converging" |
| Brief: report of at most ten lines, fixed fields | no cause (count) | The fields stay; the count goes |
| Brief: never run git, CI, `/save`, `/ship`, `/verify` | repeat of the boundary | One line: the parent owns the one checkpoint |
| Brief: never remove shared caches or install outside the repo | search | One line with reason if found |
| (new) Don't end the turn while a sub-helper or background check runs | incident (memory #1496, four times) | Added as one line: the parent reads a stop as done |

### Keep what other files hold on to

- Every heading that another page or a spec links keeps its exact text; `check-payload-links.mjs` fails on a renamed one.
- Frontmatter, code blocks, commands, flags, exit codes, `key=value` lines, and verdict names stay byte-exact: scripts and callers read them.
- A removed or renamed name goes in `scripts/retired-names.json` in the same change.

### Specs: thin by the map

For each of the seven capabilities, a requirement that retells a rewritten skill's step order, script, or exact wording is cut to its promise with one or two scenarios; a requirement whose rule the map drops is removed. Requirements about scripts, the app, or data are untouched. Use the [CLI contract](../../../.agents/skills/plan/references/openspec-cli.md#validate-and-archive)'s workaround: a MODIFIED block must keep every scenario, so to drop a scenario REMOVE the requirement and ADD it under a new name. `/save` reconciles the deltas.

### Tests: commands yes, sentences no

Remove an assertion that matches a sentence of instruction prose: `cli-conventions.test.mjs` "attached review notes…", the phrase and ordering asserts in `schedule-delivery.test.mjs`, and `read cited originals` in `document-recall.test.mjs`. Keep an assertion on a command, flag, link, or a fragment a script parses. Each removal gets a `Check:` Decision-log bullet naming the file ([a loosened check needs a reason](../../../wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason)).

Alternative considered: a check pinning each skill's safety rules by keyword (a later idea in memory, from gstack). Rejected here: it locks wording again; the rule map and review do the job once.

### The convention

`wiki/maintaining/adding-a-skill.md` step 1 gains: cut a rule before you cut words; give a rule its reason; let a script own what it already decides. `.agents/rules/payload.md`'s `measure-context` bullet links it in a clause. Both are meta-only, so installs get the result, not the rule.

### A second reader

When the rewrite is done, one fresh helper gets the rule map, `git diff main` for the scoped files, and no other context. It checks three things: every rule in the old text has a row; every row marked kept is present in the new text; every dropped row's sort fits the table. The build restores what it finds and notes it in the Decision log.

## Risks / Trade-offs

- [A dropped rule mattered] → the map, the second reader, and the plain dropped-rules list the person reads before *publish it?*; every guard and incident rule stays.
- [No measurement outside `/verify`] → its measured sections are untouched; the rest is judged by reading, and the report says so.
- [Reasons add words back] → the budget check still has to pass; report before and after counts.
- [An install adapted a skill] → the changelog's Updating note says each changed skill merges, and that no command changed.
- [Other open work edits the same skills] → `installation-owned-memory-devices` touches `memory/SKILL.md`, which is out of scope; bring `main` in before the final checks.

<!-- end design.md -->
<!-- file tasks.md utf8 5616 -->
# Tasks

Implementation boxes are ticked on source review. No check runs before group 7; the second pass runs its own in 8.6.

## 1. The rule map

- [x] 1.1 Record the before counts in the Decision log: `node scripts/measure-context.mjs --json` totals and `wc -w` for each scoped file in proposal.md's Impact. Done when the log line lists every scoped file.
- [x] 1.2 Write `rule-map.md` in this change folder by design.md's sort table: one section per scoped file, one row per rule, with its sort, its new home or drop reason, and the evidence (fact number, archive path, or script name). Done when every scoped file has a section and no row lacks a sort.

## 2. Skills

Rewrite each file by its map section and design.md's "Keep what other files hold on to". Done, for each, when every kept row is in the new text, no dropped row is, and linked headings, frontmatter, and code blocks are unchanged.

- [x] 2.1 `apply/SKILL.md` and `apply/references/build-helper.md`, including the new line against ending a turn while a sub-helper or background check runs.
- [x] 2.2 `explore/references/asking-the-user.md`: the ask format and reply endings as goals, with the plan-link and preview-link rules stated once.
- [x] 2.3 `explore/SKILL.md` and `plan/SKILL.md`.
- [x] 2.4 `save/SKILL.md` and the selection-rungs section of `save/references/checkpoint-evidence.md`; each verb's page states the outcome it needs and links the rungs.
- [x] 2.5 `ship/SKILL.md` and `continue/SKILL.md`.
- [x] 2.6 `verify/SKILL.md` and `verify/references/walkthrough.md` §§ a, c, e, f, g; §§ b and d stay byte-identical (`git diff main` shows no hunk inside them).

## 3. One home for repeats

- [x] 3.1 `wiki/development/the-change-loop.md` and any other wiki page the map names: keep the why, link the skill for the how, and remove each repeat. Done when `grep -rn "early requests" .agents/skills wiki` shows the rule at its home only.
- [x] 3.2 `AGENTS.md`: cut the plan-link and just-ask bullets to one orienting line and their link. Done when each bullet links its owner and states no mechanics the owner states.
- [x] 3.3 Add any removed or renamed name to `scripts/retired-names.json`. Done when the map's renamed rows each have an entry, or the log says none was renamed.

## 4. Specs

- [x] 4.1 Write the deltas for `asking-the-user`, `apply`, and `change-loop` by design.md's "Specs: thin by the map". Done when each touched requirement states a promise with one or two scenarios.
- [x] 4.2 Write the deltas for `delivery-gate`, `openspec-workflow`, `staging-walkthrough`, and `multi-part-workspaces` the same way; requirements about scripts, the app, or data are untouched.

## 5. Tests

- [x] 5.1 Remove the sentence-matching assertions named in design.md from `cli-conventions.test.mjs`, `schedule-delivery.test.mjs`, and `document-recall.test.mjs`, keeping each assertion on a command, flag, or link. Add one `Check:` Decision-log bullet per file with its reason.

## 6. Convention and release

- [x] 6.1 Add the convention to `wiki/maintaining/adding-a-skill.md` step 1 and link it from the `measure-context` bullet in `.agents/rules/payload.md`. Done when the page states all three parts and the rule links it.
- [x] 6.2 Add `## Next (minor) — Fewer rules, each with its reason` to `CHANGELOG.md` in plain words, with an **Updating.** note: each changed skill merges into an adapted copy, and no command, flag, or heading changed.
- [x] 6.3 Hand a fresh helper the rule map and `git diff main` for the scoped files, by design.md's "A second reader". Restore what it finds; log each restore.
- [x] 6.4 Write the dropped-rules list for the publish question: one plain line per dropped row, grouped by step, no file names. Record the after counts in the Decision log beside the before counts.

## 7. Final verification

- [x] 7.1 Run `openspec validate fewer-rules-with-reasons --strict --no-interactive` and `node .github/scripts/checks.mjs --worktree` (links, retired names, OpenSpec config, `measure-context --check`, script tests). Repair what this change broke; report the result as local.
- [x] 7.2 Run `DEFAULT_BRANCH=main node .github/scripts/loosened-checks.mjs --worktree` and confirm it exits 0 with the `Check:` bullets from 5.1.

## 8. Second pass: a release is not a cause

- [x] 8.1 Re-sort every `incident` row in `rule-map.md` whose evidence is only a release, by design.md's "Second pass": `incident (on record)` with its fact or log line, `step`, or `no cause` with the covering goal quoted. Done when no `incident` row cites only a release.
- [x] 8.2 Edit the scoped files by the re-sorted map. Done when no newly dropped row is in the text, every covering goal is, and linked headings, frontmatter, and code blocks are unchanged; `walkthrough.md` §§ b and d stay byte-identical.
- [x] 8.3 Update the spec deltas: remove or thin each requirement whose rule was dropped. Done when no delta requires a dropped rule.
- [x] 8.4 Hand a fresh helper the newly dropped rows and `git diff main` for the scoped files, by design.md's "Second pass". Restore what it finds; log each restore.
- [x] 8.5 Rewrite `dropped-rules.md` to list every dropped rule from both passes, one plain line each, grouped by step, with no file names; update the `CHANGELOG.md` entry to match; record the after counts and the new sort totals in the Decision log.
- [x] 8.6 Run `openspec validate fewer-rules-with-reasons --strict --no-interactive`, `node .github/scripts/checks.mjs --worktree`, and `DEFAULT_BRANCH=main node .github/scripts/loosened-checks.mjs --worktree`. Repair what this change broke; report the result as local.

<!-- end tasks.md -->
<!-- file specs/apply/spec.md utf8 2706 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The parent waits quietly while a helper builds

While a build helper works, the parent SHALL wait for its report with the longest wait the host allows, so the build does not fill the conversation. It SHALL NOT poll the helper at short intervals, narrate each wait, read the files the helper is editing, or message it except to pass on the person's answer or a stop.

#### Scenario: A long build

- **WHEN** a helper builds for forty minutes without a question
- **THEN** the parent's only actions until the helper's report are waits

#### Scenario: The person speaks mid-build

- **WHEN** the person sends a new instruction while the helper builds
- **THEN** the parent passes it to the helper or stops the helper, and resumes waiting

### Requirement: Preview pictures precede the publish choice

When a finished `/apply` has a preview and is asking what to do next, it SHALL show the screens that changed as pictures in the chat before the multiple-choice question, each with a short plain caption. Pictures SHALL depict the current preview, stay outside tracked files, and follow existing screenshot privacy safeguards. Pictures SHALL NOT add a save, publishing gate, or confirmation to an already authorized `/ship`.

#### Scenario: Two changed screens can be shown

- **WHEN** a finished `/apply` has a reachable preview with two changed screens
- **THEN** the chat shows both screens with captions before the publish, change more, or save question, and retains the preview link

#### Scenario: Pictures are unavailable

- **WHEN** the preview cannot be captured or the app has no changed screen
- **THEN** `/apply` says why pictures are unavailable, retains any preview link, and still asks what to do next

### Requirement: A fresh helper builds the tasks

Where the host can start one, a fresh helper agent SHALL build the change's tasks, so the build does not carry the planning conversation. The helper SHALL NOT ask the person, run git, save, or upload a preview, and SHALL NOT report while a helper or check it started is still running. It SHALL return on a question, a blocker, or the whole implementation; the parent SHALL handle a question or blocker and start a new helper for the rest when appropriate. A host with no helper SHALL build inline with the same outcome.

#### Scenario: An ambiguous task

- **WHEN** the helper cannot finish a task without the person's decision
- **THEN** it returns the question, the parent asks the person, and a new helper works the remaining tasks

#### Scenario: No helper available

- **WHEN** the host cannot start a helper agent
- **THEN** `/apply` works the tasks inline with the same outcome

<!-- end specs/apply/spec.md -->
<!-- file specs/asking-the-user/spec.md utf8 3577 -->
# Spec Delta

## REMOVED Requirements

### Requirement: A reply that makes or changes a plan prints its link

**Reason**: It carried five scenarios and the reply's exact wording. The promise is kept, under a new name, as "A changed plan's reply carries its link".

**Migration**: None. The assistant prints the same link in the same place; the wording lives in the ask convention.

### Requirement: A reply that prints a preview link offers to show it again

**Reason**: It carried three scenarios and the reply's exact wording. The promise is kept, under a new name, as "A preview link opens the page that changed".

**Migration**: None. The assistant prints the same link in the same place; the wording lives in the ask convention.

### Requirement: Consequential alternatives receive a grounded recommendation

**Reason**: Its second half, that a settled request acquires no artificial alternatives, restated a rule the skill no longer carries: comparing is asked for only on a consequential choice. The promise is kept, under a new name, as "A consequential choice gets a grounded recommendation".

**Migration**: None. A choice with several workable approaches still gets a comparison and a recommendation.

## ADDED Requirements

### Requirement: A changed plan's reply carries its link

A reply that creates a plan, or changes what it says or its checklist, SHALL show the full link to the plan's review page as its own chat line above any closing question, never inside it, and that question SHALL offer to review the plan. Choosing to review SHALL show the link again and start nothing. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change, and the link SHALL NOT add a stop.

#### Scenario: A plan finishes

- **WHEN** `/plan` finishes, or `/apply` plans a change and goes on to build it
- **THEN** the reply shows the plan's link above any closing question, and a closing question offers to review the plan

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no review of the plan

### Requirement: A preview link opens the page that changed

A reply that prints a preview link SHALL print the full address of the page that shows the change, and the home page only when the change has no page of its own, as its own chat line above any closing question, never inside it. That question SHALL offer to show the preview again; choosing it SHALL show the link and start, save, or publish nothing.

#### Scenario: A change to one page

- **WHEN** a build changes the settings page and uploads a preview
- **THEN** the preview link opens the settings page on the preview, not its home page, and the closing question offers to show the preview again

#### Scenario: No preview was uploaded

- **WHEN** a build finishes but no preview was uploaded, because the app is untouched or the upload cannot run
- **THEN** its closing question offers no preview

### Requirement: A consequential choice gets a grounded recommendation

When an open consequential choice has multiple viable approaches, exploration SHALL provide meaningfully different alternatives, their practical consequences, and a recommended approach supported by the available context.

#### Scenario: Two approaches could satisfy the outcome

- **WHEN** the choice between viable approaches changes the outcome, compatibility, or acceptance criteria
- **THEN** the person receives distinct options with their consequences and a reasoned recommendation

<!-- end specs/asking-the-user/spec.md -->
<!-- file specs/change-loop/spec.md utf8 1238 -->
# Spec Delta

## REMOVED Requirements

### Requirement: A change asked with no verb stops twice

**Reason**: It carried three scenarios, one of them the plan question's option by name. The promise is kept, under a new name, as "A change asked with no verb stops at the plan and at the preview".

**Migration**: None. The two stops and the one-go choice at the plan are unchanged.

## ADDED Requirements

### Requirement: A change asked with no verb stops at the plan and at the preview

A code or process change asked for with no verb SHALL stop at the plan's review link to ask whether to build it, and after the build's preview to ask whether to publish, running the next verb on yes. The question at the plan SHALL also offer to build and publish in one go, with no stop before the merge. A verb the person types SHALL keep its own reach.

#### Scenario: Yes to both stops

- **WHEN** the person asks to change how the app stores data, then says yes at both stops
- **THEN** the agent runs `/plan`, `/apply`, and `/ship` without the person naming a verb

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge

<!-- end specs/change-loop/spec.md -->
<!-- file specs/context-economy/spec.md utf8 923 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A trim shows where every rule went

A change that shortens or simplifies instructions SHALL list each rule of the old text with the place that now holds it, or, for a rule it drops, the reason it is safe to drop, so a reviewer can see none was lost by accident. Such a change SHALL NOT drop a rule that guards an action that cannot be undone, and SHALL show the person every dropped rule in plain words before publishing.

#### Scenario: A rule merged into another page

- **WHEN** a rule is removed from one skill because another page states it
- **THEN** the list names the page that now states it, and the skill links there

#### Scenario: A rule dropped on purpose

- **WHEN** a simplifying change removes a rule that no page keeps
- **THEN** the list names the rule and why it is safe to drop, and the person reads it in plain words before the publish question

<!-- end specs/context-economy/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 2220 -->
# Spec Delta

## REMOVED Requirements

### Requirement: A finished build is checked locally where the tools exist

**Reason**: It held two promises and four scenarios. Both are kept, each under its own name: "A finished build is checked locally before the first push" and "Bringing the default branch in rechecks locally".

**Migration**: None. The same checks run at the same two moments.

## ADDED Requirements

### Requirement: A finished build is checked locally before the first push

Where the machine has the repo's tools, a finished build SHALL run, once and before the first push, the checks CI would run for the kinds of file the change touches, and SHALL repair what fails. A local result SHALL NOT stop a save or a publish, and the report SHALL name the run as local. A machine without the tools SHALL skip the run, say so, and continue. Local runs on one machine SHALL take turns.

#### Scenario: A test fails before the first push

- **WHEN** a finished build's change fails one of its own tests on a machine that has the tools
- **THEN** the failure is repaired before the first push, and the report says the local checks passed, apart from the gate's result

#### Scenario: The machine has no tools

- **WHEN** the repo's tools are not installed and can not be installed
- **THEN** the build says that nothing ran locally, and `/save` and `/ship` proceed on the gate alone

### Requirement: Bringing the default branch in rechecks locally

When `/ship`'s preparation merges the default branch into the branch, it SHALL run the local checks once more before the checkpoint and SHALL state their result and the next action; a failure SHALL be repaired before the checkpoint. A preparation that merges nothing SHALL run no local check.

#### Scenario: The default branch brings a failure in

- **WHEN** `/ship`'s preparation merges the default branch in and a check then fails on this machine
- **THEN** the preparation's output names the failed checks and a repair as the next action, and the checkpoint follows the repair

#### Scenario: Nothing is merged in

- **WHEN** `/ship`'s preparation finds the branch already holds the default branch
- **THEN** it runs no local check and its output is as before

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/multi-part-workspaces/spec.md utf8 1827 -->
# Spec Delta

## REMOVED Requirements

### Requirement: The next work is offered in a new workspace

**Reason**: It held two promises and three scenarios. Both are kept, each under its own name: "A publish offers the next work or closing" and "Work that would displace unpublished work opens elsewhere".

**Migration**: None. The same offers appear at the same moments.

## ADDED Requirements

### Requirement: A publish offers the next work or closing

When `/ship` finishes and more work the person asked for remains, its closing question SHALL offer to open the next piece in a new workspace *(Recommended)*, or stop. When `/ship` merged from a Paseo worktree, the closing question SHALL also offer to close the workspace, recommended when no next work is waiting.

#### Scenario: More work after a publish

- **WHEN** `/ship` merges part A and the queued part B has no workspace yet
- **THEN** the closing question offers to open B in a new workspace, first and recommended, and stopping

#### Scenario: Nothing left after a publish

- **WHEN** `/ship` merges from a Paseo worktree and no other work the person asked for is waiting
- **THEN** the closing question offers *Close this workspace* first and recommended

### Requirement: Work that would displace unpublished work opens elsewhere

When new or resumed work would displace another unpublished change in this workspace, the agent SHALL offer a new workspace first and SHALL switch nothing here until the person answers. A resumed change's workspace SHALL open on its recorded branch.

#### Scenario: Continue from a busy workspace

- **WHEN** `/continue add-auth` runs in a workspace holding uncommitted work of another change
- **THEN** the options include opening `add-auth`'s branch in a new workspace, recommended, and nothing in this workspace changes branch

<!-- end specs/multi-part-workspaces/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 4793 -->
# Spec Delta

## REMOVED Requirements

### Requirement: Safe checks finish before a consolidated handoff

**Reason**: It held two promises and three scenarios. Both are kept, each under its own name: "Safe checks finish before one handoff" and "A skipped check stays unverified".

**Migration**: None. The walk asks for help and treats a skip as before.

## ADDED Requirements

### Requirement: Safe checks finish before one handoff

Within the requested scope, `/verify` SHALL complete every safe check possible with existing authorization and tools before asking for help. A blocked check SHALL pause only its dependents. Remaining checks SHALL form one handoff naming, for each, the reason, the exact action or authorization needed, and what the check should show. After the person helps, verification SHALL resume pending checks and repeat completed checks only when their conditions changed. Waiting or an unattended run SHALL NOT imply authorization.

#### Scenario: One check needs a person's login

- **WHEN** a login blocks one journey while other journeys need no person
- **THEN** those other journeys complete, and the final handoff names the blocked journey and how to enable or manually complete it

#### Scenario: Help enables the pending check

- **WHEN** the person supplies the requested authorization without changing completed checks' conditions
- **THEN** only the pending journey and its dependents resume

### Requirement: A skipped check stays unverified

The handoff SHALL let the person help, skip selected checks, or skip all that remain. A skipped check SHALL be reported as skipped and unverified, and SHALL NOT be requested again unless the person reopens it. Skipping SHALL NOT imply authorization, erase an observed failure, or count as a pass. The report SHALL distinguish completed, failed, partly shown, and unverified checks.

#### Scenario: The person skips remaining manual checks

- **WHEN** the person chooses to skip selected or all remaining checks
- **THEN** the report names those checks as skipped and unverified, retains observed failures and coverage gaps, and no further help is requested for them unless the person reopens them

## MODIFIED Requirements

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE`, `/verify` SHALL fix a failure in this change's own scope, save, rebuild staging from the seed under its turn, and walk again, at most twice, and SHALL report any other failure without fixing it; the report SHALL state the scope judgement. When an existing CI harness can cheaply reproduce an in-scope defect, the repair SHALL retain a focused regression check and evidence of that same check failing on the earlier source for the observed defect and passing on the repaired source. Where a lasting check is impractical, the report SHALL retain the available reproduction and explain the limitation without requiring new test infrastructure or weakening the delivery gate. A failure SHALL NOT prevent independent safe checks from completing.

#### Scenario: An in-scope failure

- **WHEN** a journey contradicts its `THEN` in this change's own code
- **THEN** `/verify` fixes, saves, rebuilds staging, and walks again, stopping after two failed attempts; a practical existing test path produces a retained regression with failing-before and passing-after evidence, otherwise the reproduction's limitation is reported

#### Scenario: An out-of-scope failure

- **WHEN** a journey fails on behavior this change did not introduce
- **THEN** `/verify` reports the failure and finishes independent safe checks without a fix

### Requirement: Related consumers are checked through confirmed contracts

Verification SHALL examine the material assumptions connecting changed behavior to its consumers and select a small set of existing checks that can disprove them. Selected checks SHALL name the concrete caller or data-contract relationship and their canonical expected behavior, including consumers in another capability. Speculative relationships SHALL NOT justify a whole-app sweep. Missing expectations or unavailable observation routes SHALL be reported as coverage gaps rather than invented promises.

#### Scenario: An API change feeds another screen

- **WHEN** a changed API field has a confirmed consumer in a screen covered by another capability
- **THEN** verification selects the relevant existing screen scenario, records the relationship, and reports what its evidence shows alongside the change's own checks

#### Scenario: A suspected consumer has no established relationship

- **WHEN** a possible consumer is suggested without a confirmed caller or data-contract relationship
- **THEN** verification does not expand the run on that speculation and retains the targeted selected checks

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-13

~~~
<!-- end .openspec.yaml -->
<!-- file dropped-rules.md utf8 4046 -->
# Rules dropped

Eighteen rules are gone. Each line says what the rule was, then what still covers it. Every other rule stays: as it was, as one line with its reason, or in one place with a link from the others.

A rule was dropped only when no mistake and no request stands behind it, and a goal beside it already makes the assistant do the same thing, or a command already says it.

## Think it through

- **Don't invent alternatives for a settled or routine request.** Options are compared only for a choice that matters, and a question is asked only when the answer changes the result.
- **Make small assumptions with reasons; say what is missing, never guess.** Small, cheap-to-change details are still assumed with reasons, and missing evidence is still named with a later check.
- **Ask for no extra sign-off at the end.** The round still ends with one next-step question.

## Plan

- Nothing dropped.

## Build

- **One progress line per wait while the helper builds.** A count. The rule beside it stays: don't narrate each wait.
- **Ten lines at most for the helper's report.** A count. The report is still short, with the same parts.
- **When unsure which plan to build, ask and say what each would build.** An unclear request is still asked about before any plan or code, and when several plans fit they are offered as the options.
- **Never show a live page or a login screen in place of the changed screens.** The pictures must still show the screens that changed, taken from this exact preview.
- **Pause on anything unclear or blocking.** Said three times on the same page: an unclear request is asked about first, a question goes to the person, and a blocker is reported with the ways to clear it.

## Save

- **What happens after a key is found in the files being saved.** The save command already prints which files and says to remove the key, add the files again, and rerun. A found key still stops the save.
- **Settle which change is being saved before picking its files.** When more than one change fits, the assistant still asks, with them as the options.

## Publish

- **Restart the main branch's checks when they were cut off.** The publish command already says so, with the command to run.
- **How to settle a file that can't be combined, and what to do on any other failure.** The publish command already says both. The rule stays: merge, not rebase, unless asked.

## Pick up later

- **Picking up resumes and builds; it writes no plan.** Its last step still hands the work to the build step, which is all it does with a plan.

## Check

- **Checking a neighboring feature gives no right to repair it.** A failure is still fixed only when it breaks one of this change's own promises.
- **Evidence other than pictures is written as text.** The report still holds what was seen as text, and still reads without pictures.

## Asking and reports

- **A yes-or-no question normally has two options.** A question still has two or three real options, and a yes-or-no still says what happens on each side.
- **Follow the question tool's own limits; four questions is not a fixed limit.** The assistant still uses the first question tool that works, and asks within what that tool can hold.
- **A missing question tool means try the next way to ask, not stop asking.** The list of ways to ask still ends with numbered choices in the chat, and skipping a question is still allowed only where nobody can answer.

## Put back after a second look

A second reader checked the drops with fresh eyes. Two came back, and one link. A third came back because you asked for it by name on 2026-10-08:

- **No prototypes or trial builds while thinking it through.** "Write nothing" could be read as a rule about files only.
- **No video as evidence of a check.** Nothing else ruled it out.
- **A blocker's report ends with the ways to clear it.** The build page now links that rule where it stops on a blocker.
- **A couple of pictures before *publish it?*, one when only one view matters.** How to pick the second picture stays dropped.

<!-- end dropped-rules.md -->
<!-- file review.html utf8 70121 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-13-fewer-rules-with-reasons</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
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
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.2); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:#fff; border:1px solid var(--line); border-radius:4px; font-size:14px; font-weight:600; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
</head>
<body data-change="2026-10-13-fewer-rules-with-reasons">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-13-fewer-rules-with-reasons</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The assistant's instructions were shortened once by cutting words and keeping every rule. What is left reads as tight lists of &quot;never&quot; lines with no reasons, the same rule sits in several places, and the written records repeat the instructions sentence by sentence. Newer assistants follow a goal and its reason better than a long list, and every extra rule is one more thing to keep true.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each step says what to achieve and why.</b> The seven steps of the loop (think it through, plan, build, save, publish, pick up later, check) and the pages they share are rewritten as goals with reasons, not lists of prohibitions.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">Wait quietly. At most one short</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">line per wait. Read none of its</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">edited files.</span>

<span class="ln" data-note="item-1-line-6" tabindex="0">AFTER</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">Let the helper build unwatched:</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">it exists so the build does not</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">fill this chat.</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Every rule is sorted before anything is cut.</b> A rule that guards something that can't be undone stays as it is. A rule that came from a past mistake stays as one line with its reason. Only a rule a script already enforces, a repeat, or one with no known cause goes.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">the rule...            │ what happens</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">───────────────────────┼──────────────────</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">guards a can't-undo    │ kept as it is</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">came from a mistake    │ one line + why</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">is done by a script    │ dropped</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">is written twice       │ one home, linked</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">has no known cause     │ dropped</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A rule has one home.</b> Where the same rule is written in a step's page, the wiki, and the always-loaded instructions, one copy stays and the others link to it.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The written records go back to promises.</b> The records for these steps keep what you rely on (what you see, what must never happen) and lose step order and exact wording.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Tests stop locking sentences.</b> Three tests fail today when a sentence in an instruction page is reworded. Those go; every test of a script stays. Each removed test is named with its reason.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>You see what was dropped before you publish.</b> The build ends with one plain line for every rule dropped, and a second reader checks that nothing meant to be kept went missing.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>A note so it does not grow back.</b> The page on writing a skill gains one rule: cut a rule before you cut words, and give each rule its reason.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Setup, sync, memory, closing a chat, schedules, and the two improve skills stay as they are. So do the Cloudflare failure map, every guard on keys and forced pushes, what any script does, and the word budget. The two parts of the check's guide that say how to write a walk and grade it stay too: the repo's rule is to measure those with a paid practice run first.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked which simplification to start with → chose all of them in one pull request (&quot;can we do them all in this PR?&quot;).</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked how far the rule-cutting goes → chose every step's skill, not only the pages the audit named.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked what happens to a rule that exists because something once went wrong and no script backs it → chose keep it as one line with its reason.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: &quot;every step&quot; means explore, plan, apply, save, ship, continue, and verify with the pages they share, because those are the ones the question named; setup, sync, memory, close, schedule, and the improve skills are untouched.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the walkthrough's sections on writing journeys and grading evidence stay as written, because <code>wiki/maintaining/measure-a-skill-change.md</code> says to measure those with a paid practice run before changing them.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: wordy specs are thinned, not retired, because <code>openspec-workflow</code> already requires that specs hold promises, not procedure; 60 requirements carry more than its two scenarios.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: only the <code>context-economy</code> delta is written with the plan and the other seven in the build, because which requirement goes depends on the rule map the build writes first.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the rewritten helper brief gains one line against ending its turn while a sub-helper or background check still runs, because that mistake was seen four times (memory #1496) and the brief is being rewritten anyway.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: every heading another page links to keeps its exact text, because installed repos' own pages link those headings and the link check fails on a renamed one.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the word budget and its check stay as they are, because dropping rules lowers the count without touching them.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: a minor release, because every install's skills change and an adapted skill needs a merge, but nothing breaks.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Found while planning: only three tests lock a sentence of instruction text (the audit first suggested many more), and <code>/apply</code>'s build-order rules are deliberate recent choices no script enforces, so they are kept as one line each rather than dropped.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Before counts, by <code>node scripts/measure-context.mjs --json</code>: instructions 25,372 words and 190,790 bytes (baseline 27,084 words), owners 12,637, descriptions 245, startup route 2,038 of 2,200; save routes active 4,738, named-secret 6,706, facts 4,363, new-plan 7,926, archived 4,738, cold-resume 6,028. By <code>wc -w</code>: <code>explore/SKILL.md</code> 581, <code>plan/SKILL.md</code> 685, <code>apply/SKILL.md</code> 935, <code>save/SKILL.md</code> 698, <code>ship/SKILL.md</code> 1,021, <code>continue/SKILL.md</code> 984, <code>verify/SKILL.md</code> 511, <code>explore/references/asking-the-user.md</code> 1,090, <code>apply/references/build-helper.md</code> 308, <code>save/references/checkpoint-evidence.md</code> 261, <code>verify/references/walkthrough.md</code> 1,654, <code>wiki/development/the-change-loop.md</code> 2,989, <code>AGENTS.md</code> 690, <code>wiki/maintaining/adding-a-skill.md</code> 544, <code>.agents/rules/payload.md</code> 963; 13,914 in all.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Sorted 342 rules in <code>rule-map.md</code>: 27 guards kept as they are, 133 kept as one line, 55 merged to one home, 6 dropped (3 with no cause, 3 a script already says), 119 steps and commands kept, 2 added.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-13</p>Check: <code>scripts/tests/cli-conventions.test.mjs</code> no longer matches the sentence &quot;attached review notes … before readiness&quot; in <code>/apply</code> and <code>/ship</code>, because it failed on any rewording; it still fails when either skill loses its link to <code>/plan</code>'s review-notes section.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-13</p>Check: <code>scripts/tests/schedule-delivery.test.mjs</code> no longer matches the sentences &quot;pending questions block dependent actions&quot; and &quot;retain <code>--store &lt;id&gt;</code>&quot; or their order on the page in <code>/continue</code>, <code>/apply</code>, and <code>/plan</code>, because it failed on any rewording; it still fails when a skill loses its link to the schedule-record route or that route loses the <code>--store &lt;id&gt;</code> flag.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-13</p>Check: <code>scripts/tests/document-recall.test.mjs</code> no longer matches the phrase &quot;read cited originals&quot; in <code>/explore</code>, because it failed on any rewording; it still fails when the skill loses the <code>recall &lt;question&gt;</code> or <code>areas &lt;paths&gt;</code> command.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>No heading, command, flag, or name was renamed or removed, so <code>scripts/retired-names.json</code> is unchanged.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>No delta for <code>openspec-workflow</code>: its eight requirements already state promises with one or two scenarios, and none retells a rule the map moved or dropped.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Requirements with more than two scenarios were removed and added back under a new name as one or two promises, because a modified requirement must keep every scenario: two in <code>asking-the-user</code>, one each in <code>change-loop</code>, <code>delivery-gate</code>, <code>multi-part-workspaces</code>, and <code>staging-walkthrough</code>.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Second reader (a fresh helper given only the rule map and the diff) confirmed the walkthrough's two measured sections are unchanged, every heading and code block is unchanged, and every guard is present. It found 28 points; the restores follow.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second read, in <code>/apply</code>: &quot;capture or access failure&quot; among the reasons for no picture; &quot;and its tests&quot; in final acceptance; &quot;Never&quot; in &quot;never save to stop&quot;; &quot;pause on ambiguity or a blocker: the proposal is the intent&quot;.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second read, in <code>/plan</code>: &quot;explicit&quot; before &quot;build or publish choice&quot;; &quot;print the plan's link however <code>/plan</code> was invoked&quot;.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second read, in <code>/explore</code>: &quot;no prototypes or local builds&quot; (first sorted as no cause; &quot;read-only checks&quot; does not rule out a local build); &quot;speculative or cheaply changed concerns need no questions&quot;; &quot;never ask the person to guess&quot; a fact.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second read, in the ask page: &quot;never offer a choice that needs judgment the reader lacks&quot;; &quot;never an added Other option&quot;.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second read, in <code>/ship</code>: &quot;it never authorizes archiving unchecked tasks&quot;; the <code>sole-active</code> wording of the no-argument and cold-stop rules; &quot;merge, not rebase, unless asked&quot; (first sorted as script, but a rebase of a pushed branch needs a force push, so it is a guard); the <code>LIVE_LOOK</code>, <code>REASON</code>, and <code>URL</code> names in the live look; &quot;<code>CHANGE_NAME</code> is separate from <code>BRANCH</code>&quot;.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second read, in <code>AGENTS.md</code>: &quot;asked with no verb&quot; as the condition for the two stops; &quot;a confirm per outward action&quot;.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second read, in <code>/verify</code>: &quot;a blocked or failed prerequisite pauses only its dependents&quot;.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Reasons corrected after the second read, because the record did not support them: the helper brief's three-round limit and its cache and install rule now state no invented reason; the build-order why says &quot;more runs for repairs&quot;, as its source does; a staging email &quot;could reach&quot; a customer; the rule on checks never kept links the wiki's reason; the walkthrough page says a build is written before it is checked and a walk you ask for still runs at any point.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Not restored: the allowance that a phone view can be the second picture, because it served only the count that was dropped; and the exception for a check asked for early stays in the helper brief alone, because this design names the brief as its one home.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>After counts, by <code>node scripts/measure-context.mjs --json</code>: instructions 25,350 words and 189,969 bytes (were 25,372 and 190,790), owners 12,560, descriptions 245, startup route 1,971 of 2,200; save routes active 4,795, named-secret 6,763, facts 4,420, new-plan 8,009, archived 4,795, cold-resume 5,994. By <code>wc -w</code>: <code>explore/SKILL.md</code> 595, <code>plan/SKILL.md</code> 697, <code>apply/SKILL.md</code> 891, <code>save/SKILL.md</code> 717, <code>ship/SKILL.md</code> 961, <code>continue/SKILL.md</code> 956, <code>verify/SKILL.md</code> 539, <code>explore/references/asking-the-user.md</code> 1,069, <code>apply/references/build-helper.md</code> 360, <code>save/references/checkpoint-evidence.md</code> 305, <code>verify/references/walkthrough.md</code> 1,616, <code>wiki/development/the-change-loop.md</code> 2,983, <code>AGENTS.md</code> 623, <code>wiki/maintaining/adding-a-skill.md</code> 700, <code>.agents/rules/payload.md</code> 974; 13,986 in all.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Found while building: the word count barely moved. The eleven skill pages went from 8,728 words to 8,706, and the fifteen scoped files grew by 72 because the new convention added 156 to <code>adding-a-skill.md</code>. Keeping every rule that came from a mistake, each with its reason, gave back what the six drops and 55 merges saved; five of the six save routes grew, by 57 to 83 words, because the rung list for every verb now sits in <code>checkpoint-evidence.md</code> and <code>/save</code> gained reasons; all stay under their limits.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Found after the first build: 118 of the 135 rules kept as &quot;came from a past mistake&quot; rest only on the release that added them, which is true of nearly every rule; 17 have a mistake or a request on record. Six rules were dropped and the word count stayed flat.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked how to go on after the build dropped only 6 rules → chose cut deeper and show the dropped list before publishing. A rule now stays only if a mistake is on record, the person asked for it, or it guards something that can't be undone; the publish no longer runs without a stop.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Second pass, by design.md's &quot;a release is not a cause&quot;: each of the 135 <code>incident</code> rows was searched again in memory's feedback and thread facts, <code>memory.mjs areas</code>, and every archived Decision log. 38 have a mistake or a request on record and stay as one line; 85 are the step itself and stay; 11 rows and 2 clauses split from kept rows are dropped; 1 is a repeat and merged.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Sorted 345 rules in <code>rule-map.md</code> after the second pass (342, plus three split): 27 guards kept as they are, 38 kept as one line with a mistake or a request on record, 205 steps and commands kept, 56 merged to one home, 19 dropped (16 with no cause, 3 a script already says).</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Found in the second pass: several <code>#n</code> citations in the first map were pull-request numbers, not memory facts, so every drop candidate was searched again on its own terms; each dropped row's Evidence names the terms.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Dropped in the second pass, each with its covering goal quoted in <code>rule-map.md</code>: in <code>/apply</code>, ask when unsure which plan, never show a live page or login screen, and pause on ambiguity or a blocker; in the ask page, two options for a confirmation, the tool's limits, and a missing tool moves down the list; in <code>/explore</code>, invent no alternatives, minor assumptions and evidence gaps, and no extra sign-off; in <code>/save</code>, resolve ambiguity before staging; in <code>/continue</code>, it drafts no specs; in the walkthrough, consumer checks grant no repair scope, and other evidence is inline text.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Kept as steps with nothing on record, by the lean toward <code>step</code>: a rule paired with its wrong turn (&quot;X, not Y&quot;) counts as one rule; a loop bound with no other goal covering it stays; and a rule whose promise sits in a spec this change does not touch stays (the <i>(Recommended)</i> label, no second agent or browser for a plan's wireframe, no new infrastructure or weaker checks in a walk).</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Spec deltas in the second pass: <code>asking-the-user</code> removes &quot;Consequential alternatives receive a grounded recommendation&quot; and adds it back as &quot;A consequential choice gets a grounded recommendation&quot; with one scenario, without the settled-request case; <code>apply</code> no longer names a wrong page in &quot;Pictures are unavailable&quot;; <code>staging-walkthrough</code> modifies two requirements to drop the sentences that a consumer check grants no repair scope.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Second reader of the second pass (a fresh helper given only the 14 dropped rows and the diff): every dropped line is gone, every covering sentence the map quotes is in the new text, and no script, test, or link reads a dropped line. It returned one restore and two doubts; all three were acted on.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second pass's read, in the walkthrough: &quot;no video&quot;. Nothing else on the verify pages rules a recording out, and <code>staging-walkthrough</code>'s spec says &quot;never a video&quot;. &quot;Other evidence is inline text&quot; stays dropped.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second pass's read, in <code>/explore</code>: &quot;no prototypes or local builds&quot;. &quot;Write nothing&quot; reads as a rule about files, so a trial build could pass as a read-only check; both second readers flagged it, so it stays as a step.</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Restored after the second pass's read, in <code>/apply</code>: the blocker line links the closing ask again (&quot;ending with the ways to clear it&quot;), because a blocker can stop the build before the page's report step is reached. &quot;Pause on ambiguity or a blocker&quot; stays dropped.</li>
<li class="decision card" id="decision-45" data-note="decision-45" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Not restored: the count of two pictures, which the second reader raised again. This design's worked example drops the count and the <code>apply</code> delta already says &quot;the screens that changed&quot;. Left for the person to decide at the dropped list, because the logged request was for &quot;a couple of screenshots&quot;.</li>
<li class="decision card" id="decision-46" data-note="decision-46" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>No test assertion was removed or changed in the second pass; no heading, command, flag, or name was renamed or removed.</li>
<li class="decision card" id="decision-47" data-note="decision-47" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>After counts for the second pass, by <code>node scripts/measure-context.mjs --json</code>: instructions 25,214 words and 189,121 bytes (were 25,350 and 189,969), owners 12,560, descriptions 245, startup route 1,971 of 2,200; save routes active 4,791, named-secret 6,759, facts 4,416, new-plan 7,961, archived 4,791, cold-resume 5,951. By <code>wc -w</code>: <code>explore/SKILL.md</code> 557, <code>plan/SKILL.md</code> 691, <code>apply/SKILL.md</code> 859, <code>save/SKILL.md</code> 713, <code>ship/SKILL.md</code> 961, <code>continue/SKILL.md</code> 945, <code>verify/SKILL.md</code> 539, <code>explore/references/asking-the-user.md</code> 1,035, <code>apply/references/build-helper.md</code> 360, <code>save/references/checkpoint-evidence.md</code> 305, <code>verify/references/walkthrough.md</code> 1,605, <code>wiki/development/the-change-loop.md</code> 2,983, <code>AGENTS.md</code> 623, <code>wiki/maintaining/adding-a-skill.md</code> 700, <code>.agents/rules/payload.md</code> 974; 13,850 in all (were 13,986).</li>
<li class="decision card" id="decision-48" data-note="decision-48" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Found in the second pass: the stricter test moved 85 of the 135 rules to <code>step</code>, not to dropped, because each is the only sentence that makes the assistant do that thing. The eleven skill pages went from 8,706 words to 8,570.</li>
<li class="decision card" id="decision-49" data-note="decision-49" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Put back the picture count in <code>/apply</code> (&quot;a couple of the screens that changed, one when only one view matters&quot;), because the 2026-10-08 log of <code>show-apply-screenshots</code> records the person asking for &quot;a couple of screenshots&quot;, which the second-pass test keeps. Eighteen rules are dropped, not nineteen.</li>
<li class="decision card" id="decision-50" data-note="decision-50" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Archive checkpoint: the change is archived as release 40.6.0 and saved for its checks; eighteen rules dropped, 56 repeats merged to one home, every other rule kept with its row in <code>rule-map.md</code>.</li>
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
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
    bar();
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
    bar();
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
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
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
    fit(d); bar();
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
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
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
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
<!-- file rule-map.md utf8 74733 -->
# Rule map

Every rule in the scoped files, sorted by [design.md](design.md)'s table before any edit. One section per file, one row per rule.

**Sorts.** `guard`, `script`, `repeat`, and `no cause` are the design's. `incident (on record)` is the second pass's stricter sort: a failure someone saw, or the person's ask, cited by fact number or log line. `step` marks the behavior itself: the file's own procedure, a routing case, a command, a field list, a definition, or a line a caller reads. A step is kept and at most reworded.

**Second pass.** The first sort kept 135 rows as `incident`; for most the only evidence was the release that added the rule. By design.md's "Second pass: a release is not a cause", each was searched again (`memory.mjs search` over feedback and thread facts, `memory.mjs areas`, and the Decision log and Why of every archived proposal) and re-sorted: 38 are `incident (on record)`, 85 are `step`, 11 are `no cause` and dropped, and 1 is a `repeat`. Three rows were split so a dropped clause and a kept one each have a row (Q2b, E26b, W37b). A fresh second reader then checked the new drops alone; it sent back E7 and the "no video" half of W37, both kept as `step`, and a link on A18. A `step` row's Evidence still names the release, which no longer counts as a cause. A rule paired with its wrong turn ("X, not Y", as `wiki/voice.md` asks) is one rule, so the pair stays together.

**After.** `kept as is` (a guard, wording untouched or nearly), `one line` (the goal and its reason), `kept` (a step or a command), `merged → <home>` (a repeat; the home states it, this file links or says nothing), `dropped`.

**Evidence.** For a dropped row, the terms searched and what came back. A release number names the `CHANGELOG.md` entry that introduced the rule (found with `git log -S`), followed by its change name where one exists in `openspec/changes/archive/`. `#n` is a memory fact. "No cause found" means one search of memory, the archive, and the changelog found none.

Headings, frontmatter, code blocks, commands, flags, exit codes, `key=value` lines, and verdict names are unchanged in every file, so no row lists them one by one and no name is retired.

## `.agents/skills/apply/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| A1 | Selected schedule: route its record before code or checkout | step | kept, with the link | `schedule-records.md` owns it |
| A2 | "preserve its store and pending question" | repeat | merged → `save/references/schedule-records.md`, which says "retaining `--store <id>`" and "pending questions block dependent actions" | `schedule-records.md` first paragraph |
| A3 | Resolve by the rungs `explicit`, `session`, `changed-active`, `recorded-branch`, then `sole-active` | repeat | merged → `checkpoint-evidence.md#selection-rungs`, which now says which rungs each verb walks; here one line on the outcome and the link | design.md "A home for each kind of text" |
| A4 | An argument naming no existing change is intent for a new plan | step | kept: a routing case | 26.14.0; spec `apply` "Apply builds the work the person means" |
| A5 | An unrelated `sole-active` never overrides work this conversation explored | incident (on record) | one line: the only open plan is not the answer when the chat explored something else | `openspec/changes/archive/2026-08-08-apply-auto-plan/proposal.md` Why: "a bare apply can auto-select an unrelated active change when the current line of work has no plan" |
| A6 | Unsure → ask, listing what each candidate would implement | no cause | dropped: "Unclear intent → ask before any plan or code" in the same section, and the rungs page ("Several → ask, with them as the options"), cover it; `asking-the-user.md` says a menu "shows the detail the choice needs" | searched memory and the archive for a wrong plan built after no ask: none; 26.14.0 only |
| A7 | Attached review notes → review-note handling on the existing change before readiness; continue the authorized build without another choice | incident (on record) | one line and the link: the person already chose to build | memory #1416 (feedback, 2026-10-08): "it should also be able to select build, and build & publish as well" |
| A8 | "missing plan or blocker stops" (review notes) | repeat | merged → `plan/SKILL.md#review-notes` ("a missing change → report and stop"; "a material blocker stops") | same file section |
| A9 | `applyRequires` routing, four cases | step | kept as the short list | CLI data |
| A10 | `/apply` authorizes planning and building; after `/plan`, verify the `applyRequires` closure; paused/blocked → report and stop; keep its exact name | step | kept | — |
| A11 | At all-tasks-complete, even at invocation, finish with a preview; final acceptance's saved CI preview skips upload | step | kept | — |
| A12 | When `/ship` invoked you, return with no upload and no `/save`; `/ship` archives and makes the one checkpoint | step | kept: a routing case; `/ship` reads the return | 30.10.0 `reuse-checked-revisions` |
| A13 | A fresh helper on the parent's model; the prompt; `store <id>`; the brief owns its work and return | step | kept, with its reason (the build does not carry the planning talk) | 25.12.0 `apply-builds-in-a-helper` |
| A14 | Wait quietly with the longest host wait; timeouts → wait again; read none of its edited files; message only the person's answer or a stop | incident (on record) | one line with the reason: the helper exists so the build does not fill this chat | memory #990 (2,717 parent steps over 61 chats while a helper built); `openspec/changes/archive/2026-09-27-apply-builds-in-a-helper/proposal.md` log: "Asked whether to run a Paseo compact before building or build in a helper → chose build in a helper" |
| A15 | "at most one short line per wait" | no cause | dropped: a count; "don't narrate each wait" in A14 covers it | 31.3.0; no incident names the count |
| A16 | "Follow the brief's final verification phase and log timing changes. Preserve acceptance and explicit early requests; unavailable prerequisites block." | repeat | merged → `build-helper.md` step 2; this file says none of it | design.md worked example |
| A17 | A question → ask in the shared format, log it as `Asked`, start a new helper | step | kept | 25.12.0 |
| A18 | A blocker → report it and stop | step | kept, with the link to the closing ask (A39b) | — |
| A19 | Final acceptance → after the build and its tests are written, run `/save` and the retained live acceptance; tick observed passes; blocked/failed stays unchecked and stops | step | kept: what to do on that report | 30.10.0 |
| A20 | All done → confirm no unticked box, relay the `local checks:` line | step | kept | 31.3.0 |
| A21 | No helper, or inside one → follow the brief inline | step | kept | — |
| A22 | Preview step 1: `app-untouched.sh`; `untouched=true` → skip the upload and say so | script | kept as the command and how to read it | `app-untouched.sh` |
| A23 | Preview step 2: upload with the credential from the primary worktree's `.env`; can't run → say why | script | kept as the command | `cf-preview.sh` |
| A24 | Preview step 3: `loosened-checks.mjs`; fix each *needs a reason* file without asking; rerun until exit 0 | script | kept as the command and how to read it | 25.6.0; `loosened-checks.mjs` |
| A25 | Show the changed screens before the question, on the exact current preview URL, with `/verify`'s plain checks; no scout, save, or PR comment | incident (on record) | one line: show the screens that changed as pictures in the chat, from this exact preview | `openspec/changes/archive/2026-10-08-show-apply-screenshots/proposal.md` log: "Asked: show a couple of screenshots in the chat before the multiple-choice question during /apply → chose that behavior" |
| A26 | "agent-browser, temporary files, existing privacy safeguards and cleanup" | repeat | merged → `verify/SKILL.md#plain-checks` ("Same safeguards/handoff … `cleanup`") | that section |
| A27 | "Prefer two distinct changed screens; a useful state or phone view can supply the second. One meaningful view → one picture." | incident (on record) | one line: "a couple of the screens that changed, one when only one view matters"; how to pick the second stays dropped | `openspec/changes/archive/2026-10-08-show-apply-screenshots/proposal.md` log: "Asked: show a couple of screenshots in the chat" |
| A28 | Open each image with the host image tool, a short plain caption above it; a file link alone is insufficient | step | kept: how the pictures reach the person, with its reason | 38.4.0 (#1451) |
| A29 | No preview, no changed UI, or capture/access failure → say why, keep the link and the choice | step | kept: the fallback when no picture can be shown | 38.4.0 |
| A30 | Never substitute a live page or login screen | no cause | dropped: folded into the goal, as design.md's worked example says: "Show the screens that changed as pictures in the chat … from this exact preview" | searched "login screen", "live page", "wrong page" in memory and the archive: no failure or ask; 38.4.0 only |
| A31 | Report and ask: what was built, any can't-be-undone line, the preview link, each `Check:` bullet, unfixed files; the three options | step | kept | 30.7.0, 25.6.0 |
| A31b | "plus *See the preview* when available" | repeat | merged → `asking-the-user.md#print-the-previews-link` (Q34: "Its closing question offers *See the preview*"), linked from the same step | that section |
| A32 | Repeat under the same alias for further edits; added tasks go to a new helper | step | kept | — |
| A33 | No-repo work: work the numbered to-do in order; reading, searching, drafting need no prompt | step | kept | 26.4.0 |
| A34 | Each outward step shows exactly what it will do and asks; one confirmation, one action, unless a batch was asked for; skip and report a declined step | guard | kept as is | sent message, payment, deletion |
| A35 | Report without `/save`; nothing is committed | step | kept | — |
| A35b | "To stop halfway, the person runs `/save`, which keeps a memory thread for `/continue`" | repeat | merged → `the-change-loop.md#verbs-for-any-work`, linked at the top of the section | that section |
| A36 | Git stays with `/save`: no commit, push, branch, PR, or CI step here; the preview upload is not git and gates nothing | repeat | merged → `the-change-loop.md`; one line and the link here | the loop: "WongStack skills own all git" |
| A37 | Never save to stop or between parts; substantive live acceptance may use `/save`; routine final gates belong to delivery | repeat | merged → `the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task`; one line ("Never save to stop or between parts") and the link here | 24.0.3 |
| A38 | Resuming cold → `/continue <name>` | step | kept | — |
| A39 | Pause on ambiguity or blockers (the proposal is the intent) | no cause | dropped: "Unclear intent → ask before any plan or code", "A question → ask the person", and "A blocker → report it and stop" on the same page cover it; the brief says "Return on a question, blocker" | searched "ambiguity", "guessed intent": none; a 2026-07-25 config commit only (restored after the first second read, dropped by the stricter test) |
| A39b | "ending with the next step: ways to clear it, recommended first" | repeat | merged → `asking-the-user.md#end-every-reply-with-the-next-step` ("Blocked task: the supported ways to clear it") and the shape of an ask (recommended first); the blocker line links it ("ending with the ways to clear it"), a link restored after the second read of this pass | that page |

## `.agents/skills/apply/references/build-helper.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| B1 | Build the named change; its Decision log is the agreed context; the parent handles the person and delivery | step | kept | 25.12.0 |
| B2 | Step 1: `openspec instructions apply`, read every `contextFiles` path, `memory.mjs areas --change`, touched owners and warnings | script | kept as the commands | CLI data |
| B3 | Dated facts defer to the repo | step | kept: how to read the facts the command prints | 30.10.0 |
| B4 | Finish all implementation and test authoring before executing tests or verification | incident (on record) | one line with the reason: checking part by part multiplied a long build's wait | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` Why (21 s of tests and 3 min 15 s of checks per run, repeated per part) and log: "Asked through the employee-setup handoff to stop running tests at every step → chose complete implementation first" |
| B5 | Write tests beside source | step | kept | 30.10.0 |
| B6 | Move existing intermediate test gates into the final phase, preserving acceptance obligations; log the timing change without an approval question | incident (on record) | one line | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` log, same ask: "preserving final required checks and preview without new approval stops" |
| B7 | A substantive unavailable prerequisite is a blocker, never a pass | step | kept: defines a blocker; the home for P25 and L6b | 30.10.0 |
| B8 | Explicit early requests keep their reach through the parent | step | kept: the one exception to build order, and its one home | 30.10.0 ("explicitly asking to save early … keeps its behavior") |
| B9 | Run the local checks once; repair what the change broke and rerun only that, by its last line | script | kept as the command and how to read it | 31.3.0; `checks.mjs` prints the failed part |
| B10 | "three rounds at most" | step | kept: the loop's only stop; no other line bounds the repairs | 31.3.0 `faster-sessions` design; unsure, so kept |
| B11 | Exit 7, or no such command, means nothing ran: say so and go on; a pre-check, never the gate's result | script | kept (exit code) | `checks.mjs` |
| B12 | Tick implementation tasks on source review; do not tick live acceptance without evidence; return final verification to the parent | step | kept | 30.10.0 |
| B13 | Return on a question, blocker, complete implementation, or final live acceptance; name its tasks; never run that gate | step | kept | — |
| B14 | Never ask the person; return the exact question with two or three options, best first | step | kept: how a question travels: the parent holds the conversation | 25.12.0 |
| B15 | Never run git, CI, `/save`, `/ship`, or `/verify`; never upload previews; the parent owns these and the loosened-checks step | repeat | merged → `apply/SKILL.md` Boundaries and the loop; one line here: the parent owns the one checkpoint | 25.12.0 |
| B16 | "run a test before step 3" (in **Never**) | repeat | merged → step 2 of this file (B4); the second copy goes | design.md worked example |
| B17 | Never remove shared caches | guard | kept as is, with what the words already say: it reaches past this change | a deletion outside the change; 30.10.0, no cause found |
| B18 | Never install outside the repo | step | kept: no goal on the page covers it; kept with B17 | 30.10.0; unsure, so kept |
| B19 | Report fields: stop reason; source-complete task numbers; files; `local checks:` line; exact question or blocker; retained final checks | step | kept | 25.12.0, 31.3.0 |
| B20 | "At most ten lines" | no cause | dropped: a count; "a short report" and the field list cover it | 25.12.0; no incident names the count |
| B21 | (new) Don't end the turn while a sub-helper or background check still runs | incident (on record) | added as one line: the parent reads a stop as done | memory #1496 (four times, 2026-09-27 to 2026-10-08) |

## `.agents/skills/explore/references/asking-the-user.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| Q1 | One shape: two or three real options, recommended first, a tradeoff each, room for the user's own words | step | kept | 14.2.0 |
| Q2 | Only *Review the plan* and *See the preview* may add a fourth option | step | kept: the one exception to "two or three real options" | 26.31.0 |
| Q2b | "A confirmation normally has two options" | no cause | dropped: "A confirmation names what happens on each side" in the same page covers it, under the page's "two or three real options" | searched "two options", "confirmation": no failure or ask; 26.31.0 only |
| Q3 | Put `(Recommended)` in the option text itself | step | kept: what the person sees on the recommended option; spec `asking-the-user` promises the label | 14.2.0; unsure, so kept |
| Q4 | A tradeoff says what the user gets and what it costs | step | kept: defines a tradeoff | 14.2.0 |
| Q5 | Custom answer in the tool's own free-text field, never an added Other option; use it as given | step | kept: how the person's own words are carried; the rule paired with its wrong turn | 26.14.0 |
| Q6 | Ask only what changes the result; a credential is a structured free-text question; never invent alternatives | step | kept: the free-text case `/continue` links | 26.14.0 |
| Q7 | Plain words for every plan, question, and report; more detail only when asked; a standing ask goes on the person page, never guessed | incident (on record) | one line | `openspec/changes/archive/2026-09-27-plain-words-for-everyone/proposal.md` log: "by default this should be for non-technical people unless they ask for more details" → chose plain words for everyone |
| Q8 | Name what the person will see, get, lose, or risk; no file path, identifier, command, or engineering term they did not use | incident (on record) | one line | `openspec/changes/archive/2026-09-26-plain-plans-for-everyone/proposal.md` log: "Asked what a non-technical person sees when a check fails → chose: the agent tries to fix it first, and asks only in outcome terms" |
| Q9 | Fix before you ask; never offer a choice that needs judgment the reader lacks | incident (on record) | one line | `openspec/changes/archive/2026-09-26-plain-plans-for-everyone/proposal.md` log, same ask ("tries to fix it first"); memory #1011 (feedback: "if it breaks something old it should fix it") |
| Q10 | Lead a report with the outcome | step | kept: what a report leads with | 25.13.0 |
| Q11 | The person ran the verb: at most one link besides the plan's; leave out branch names, commit ids, the gate line, `merge.sh`'s lines, fact counts unless asked | incident (on record) | one line | `openspec/changes/archive/2026-09-27-plain-words-for-everyone/proposal.md` log, same ask: detail only when asked |
| Q12 | Inside another verb: still print every line the caller reads | step | kept: a caller reads those lines | 25.13.0 |
| Q13 | Tool order: `request_user_input`, `AskUserQuestion`, another host's tool, numbered chat | step | kept | 14.2.0 |
| Q14 | Follow the tool's schema, mode limits, and real capacity; four questions is not a universal limit | no cause | dropped: "Use the first callable tool" covers the tool's own limits, and `/explore`, which owns how many, says "within tool capacity" | searched "four questions", "tool capacity", "schema": none; 16.5.0 `add-structured-asks` only ("Assumed `/explore` keeps its clarification budget") |
| Q15 | A missing named tool moves you down the list, not into non-interactive mode | no cause | dropped: "Use the first callable tool", the list's last entry ("Numbered chat … wait for the answer"), and "Only where nobody can answer, as in an unattended run" cover it | searched "non-interactive", "missing tool", "not callable": no failure or ask; reworded in 25.17.0 from 16.5.0 only |
| Q16 | Only where nobody can answer: take the recommended options, label each assumed, continue | step | kept: the fallback `/explore` links | 26.14.0 |
| Q17 | A question stays pending until answered, however long and whatever is preselected; meanwhile only independent work | step | kept: the only line that makes the assistant wait | 26.14.0 |
| Q18 | A confirmation names what happens on each side, never a bare yes/no | step | kept: defines a confirmation | 16.5.0 |
| Q19 | An offer names the outcome, not the product, and always includes stopping | step | kept: defines an offer | 25.17.0 |
| Q20 | A menu shows the detail the choice needs; never resolve several candidates by guessing | step | kept: defines a menu; the covering goal for A6 | 25.17.0 |
| Q21 | Form, never whether to ask: an authorized action or handoff goes ahead unasked; `/explore`'s limits bound clarification, not a runbook's fork | step | kept: the home for E21 and S30 | 25.17.0 |
| Q22 | Before you finish, ask what the user must decide, through the first callable tool; report and link as chat text first; only two replies end without a question | incident (on record) | one line | `openspec/changes/archive/2026-09-27-closing-question-uses-the-tool/proposal.md` log: "Asked whether to fix the typed 'What next?' menus → chose plan the fix" |
| Q23 | The seven reply endings (explore, plan, blocked, report, recurring task, after a publish, Paseo worktree) | step | kept as the list | — |
| Q24 | *Close this workspace* never at a plan's review, mid-build, or on a blocker | incident (on record) | one line, inside Q23's list | `openspec/changes/archive/2026-09-28-add-close/proposal.md` log: "Asked when the close question appears → chose at the end of any finished work in a Paseo workspace, never mid-plan or mid-build" |
| Q25 | Plan link: print *Click here to see the plan:* and the link as one chat line when a reply makes or changes a plan or its checklist | incident (on record) | one line; stated once, in the section's first paragraph | `openspec/changes/archive/2026-09-27-closing-question-uses-the-tool/proposal.md` log: "Asked (review) whether the plan link should print only in `/plan` → chose a standing rule: every reply that makes or changes a plan prints the link, whatever made it" |
| Q26 | Copied from the page builder, never shortened: the reply link when one opens, else the `review.html` file; on *new link*, rerun the builder | step | kept: how the link line is made | 37.4.0 |
| Q27 | Status, branch, Open questions, and Decision-log lines alone are record-keeping, not a change | step | kept: defines what counts as a change to a plan | 26.4.0 |
| Q28 | Print it even when the build goes on; it adds no stop | incident (on record) | one line, folded into Q25's sentence | `openspec/changes/archive/2026-09-27-closing-question-uses-the-tool/proposal.md` log, same ask: "whatever made it" |
| Q29 | Just above the closing question, never inside it: a tool's card may not make a link clickable | incident (on record) | one line, reason kept | `openspec/changes/archive/2026-09-27-review-the-plan-choice/proposal.md` log: "the person rejected putting the link inside the box, because tapping the box picks an option instead of opening the link" |
| Q30 | The builder's *When you're ready, type `/apply` to build it.* line: copy it only on the *Review the plan* reply; leave it out everywhere else | incident (on record) | one line, said once with Q31 | memory #483 (feedback, 2026-09-29: the line shows only on the *Review the plan* reply, "because elsewhere the closing question already offers Build it now") |
| Q31 | Some hosts hide text above a question card, so any closing question in a reply that made or changed a plan offers *Review the plan*; picking it starts nothing; the next reply ends with the link line, its next-step line, and no question | incident (on record) | one line, reason kept | `openspec/changes/archive/2026-09-27-review-the-plan-choice/proposal.md` log: "the first test said nothing showed above the box"; "Asked how a plan's closing question should carry the link → chose a *Review the plan* option" |
| Q32 | "which ends with no question" said in both the second and third paragraph of the plan-link section | repeat | merged → one sentence in that section | in-file repeat |
| Q33 | Preview link: *Click here to see the preview:* and the full URL of the page showing the change, the home page only when none does | incident (on record) | one line | `openspec/changes/archive/2026-09-28-see-the-preview/proposal.md` log: "Asked for the preview link to open where the change can be seen → chose the page that shows the change, the home page only when none does" |
| Q34 | Its closing question offers *See the preview*, whose reply ends with that line and no question, and starts nothing | incident (on record) | one line | memory #463 (the preview link hid above the closing question); `openspec/changes/archive/2026-09-28-see-the-preview/proposal.md` log: "the person asked for the same fix as the plan's page" |
| Q35 | "Write prose short and plain, in our voice" (last line) | repeat | merged → `AGENTS.md` ("Keep messages short and plain, in our voice"), which every session loads, and `wiki/voice.md` | the always-loaded rule |

## `.agents/skills/explore/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| E1 | Compare options and settle scope before `/plan`; find related work with `openspec list --json` and `openspec context --json` | step | kept | — |
| E2 | Write nothing; `/plan` logs answers | step | kept: what the verb does | 22.0.0 |
| E3 | Explore precedes planning except review-page notes; bounded mode under `/plan` | step | kept | 40.3.0 |
| E4 | Read owning docs and source; trace trigger, result, constraints; for non-code, the process and authoritative sources | step | kept | 30.3.0 `sharpen-explore` |
| E5 | Discover facts; separate observations from inferences | step | kept: how to investigate | 30.3.0 |
| E6 | Use proportional, authorized read-only checks | step | kept: what checks explore may run | 30.3.0 |
| E7 | "no prototypes or local builds" | step | kept: restored after the second read of this pass. "Write nothing" reads as a rule about files, so a throwaway build or spike could pass as a "read-only check"; `openspec/specs/asking-the-user/spec.md` ("Proof requires work outside exploration") names "a prototype, a write" as work explore does not do | no failure or ask on record (`archive/2026-10-04-sharpen-explore/proposal.md` lists it as a non-goal); kept by the lean: unsure between `step` and `no cause` → `step`. Both second readers flagged it |
| E8 | Name unavailable evidence and a later check | step | kept: what to do with a gap | 30.3.0 |
| E9 | For consequential choices, compare viable approaches, outcomes, costs; recommend with evidence | step | kept | 30.3.0 |
| E10 | Invent no alternatives for settled or mechanical requests | no cause | dropped: "For consequential choices, compare viable approaches" sets when to compare; `asking-the-user.md` says "Ask only what changes the result … never invent alternatives" | searched "invented alternatives", "artificial option": none; 30.3.0 only |
| E11 | Before handoff, check material assumptions and failures against the flow; revise contradictions | step | kept: the challenge before handoff | 30.3.0 |
| E12 | "Speculative or cheaply changed concerns need no questions" | incident (on record) | one line, kept as it read | `openspec/changes/archive/2026-10-04-sharpen-explore/proposal.md` log: "the candidate added a payment-related replacement choice beyond the source and settled replacement preference; speculative or cheaply changed concerns must not create questions or reopen settled preferences" |
| E13 | Ask the shared way: two or three related ready choices, one if alone, within tool capacity | step | kept | 30.3.0 |
| E14 | Track decisions and prerequisites in chat | step | kept | 30.3.0 |
| E15 | Investigate missing facts; hold only dependent choices; never ask the person to guess facts | incident (on record) | one line | memory #1335 (thread: twice, 2026-10-04 and 2026-10-06, how-to-build choices offered before the person had a picture; one extra question round each) |
| E16 | Update dependencies after answers or evidence; explain changed premises; reopen only affected decisions; findings in chat, drawn when useful | step | kept | 30.3.0 |
| E17 | The 80/20 test | step | kept: the test itself | 12.4.0 |
| E18 | Before asking, recall the task and look up likely paths once; read cited originals | script | kept as the two commands; "read the originals it cites" stays as a clause | `memory.mjs recall`, `areas` |
| E19 | Treat dated facts as assumptions; memory unavailable → say so and continue | step | kept: how to read memory, and the fallback without it | 30.3.0 |
| E20 | Check other work once; compare intent, not files; overlap, no overlap, a `notes` line; skip if checked or no repo edits | script | kept as the command and how to read it | `other-work.mjs` |
| E21 | "Clarification limits preserve authorization and delivery gates" | repeat | merged → `asking-the-user.md#form-never-whether-to-ask` (Q21) | that section |
| E22 | Exit round: apply 80/20 and tool capacity; ask only ready choices; separate parts → a new workspace each; follow up until none remains | step | kept | 30.3.0 |
| E23 | Never repeat settled choices, nested calls included, except affected ones after changed premises | incident (on record) | one line: a settled choice stays settled; reopen only one a changed premise affects | `openspec/changes/archive/2026-10-04-sharpen-explore/proposal.md` log, the same failure as E12: a settled preference was reopened |
| E24 | Keep unanswered material preferences open, never disguised as assumptions or evidence gaps; preserve authorized defaults and the nobody-can-answer fallback | step | kept: keeps an open choice open; no other line does | 30.3.0 |
| E25 | Use supported minor assumptions with reasons; evidence gaps may remain if an approach is coherent; otherwise name the prerequisite, never guess | no cause | dropped: the 80/20 test ("Assume naming, placement, wording, and cheaply changed details, with reasons") and "Name unavailable evidence and a later check" cover it; the summary still lists "minor assumptions, and evidence limits" | searched "minor assumption", "evidence gap", "guessed": none beyond E15's; 30.3.0 only |
| E26 | Summarize outcome, approach, reasons over a serious alternative, minor assumptions, evidence limits | step | kept: what the summary holds; bounded mode returns it | 30.3.0 |
| E26b | "No extra sign-off: the next-step question is it" | no cause | dropped: "**Standalone:** offer next steps" and "**Bounded:** return by the steps below" say how the round ends; `asking-the-user.md` says "Ask only what changes the result" | searched "sign-off", "looks right": none; 30.3.0 only |
| E27 | Bounded returns by the steps; standalone offers next steps; only *Plan it* starts `/plan` | step | kept | — |
| E28 | Bounded mode's four steps; `/plan` never repeats searches | step | kept | 30.3.0 |

## `.agents/skills/plan/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| P1 | Selected schedule: route its record before code or checkout | step | kept, with the link | — |
| P2 | "preserve its store and pending question" | repeat | merged → `save/references/schedule-records.md` | as A2 |
| P3 | Create an apply-ready change and its `review.html`; no-repo work gets a numbered to-do with `(outward)` marks | step | kept | 26.4.0 |
| P4 | Run `/explore` in bounded mode; log each decision in the two Decision-log line formats | step | kept, formats byte-exact | — |
| P5 | New workspaces chosen → open one per other part, report before drafting, plan only this chat's part | step | kept: a routing case | 40.3.0 |
| P6 | Write every artifact by the CLI contract, in the selected root or store; complete `/apply`'s exact change; if planning blocks, report to `/apply` without implementing | step | kept | — |
| P7 | Before tasks, weigh deterministic code for a repeated process; raise it in the exit round if it changes scope | step | kept: a step before tasks | 13.x (#87) |
| P8 | Testable behavior gets test authoring beside source tasks; prose-only changes do not | step | kept | 30.10.0 |
| P9 | Why and What Changes use plain words; file names, code, commands go in design/specs/tasks; Capabilities and Impact may be technical | incident (on record) | one line | `openspec/changes/archive/2026-09-26-plain-plans-for-everyone/proposal.md` log: "Asked who the plan and its questions are written for → chose the person asking" |
| P10 | Deleting or reshaping data, sending a message, or removing a key gets one line saying it can't be undone; otherwise none | guard | kept as is | 30.7.0 `safer-build-and-publish` |
| P11 | Draw as you write, with no second agent or browser | step | kept: the rule paired with its wrong turn; spec `ux-wireframes` promises "no other agent and no browser" | 22.0.0 |
| P12 | One What Changes bullet carries one drawing by default, plus a sketch of each new or restructured screen; more only where a bullet can not be understood without it | incident (on record) | one line | `openspec/changes/archive/2026-09-15-add-review-html/proposal.md` log: "the user reframed: the What Changes list should be the navigation, and each bullet should open a visual" |
| P13 | Build the page after drafting and after each later edit; copy its three printed lines as is; `--link` makes a reply link | script | kept as the command and how to read it | `build-review.mjs` |
| P14 | Fix warned drawings | script | kept: how to read the result | `build-review.mjs` prints the warning |
| P15 | Keep no other copy of the proposal's text | step | kept: no goal on the page covers it | 25.17.0 |
| P16 | A screen change gets a `## UX` design section; sketch phone work phone-first; UI-less changes omit it | step | kept: what a screen change adds to the plan | 13.0.0 |
| P17 | Review notes: the two opening lines update the existing plan without an explore round; paths from `openspec status`; missing change → report and stop | incident (on record) | one line each; this section is the rule's home | `openspec/changes/archive/2026-09-27-review-notes-stop-at-plan/proposal.md` log: "Asked whether the copied text needs a command at the top → chose plain words: \"Update the plan <name> with these notes…\""; memory #260 |
| P18 | Trust quoted text over spot labels | step | kept: how to read a note | 40.3.0 |
| P19 | Answer question notes without edits or log entries; offer suggested edits only when standalone | step | kept: what a question note gets | 40.3.0 |
| P20 | Apply change notes coherently, logging changes or declines; substantial rewrites follow CLI instructions; validate, create only requested artifacts, rebuild, print the link | step | kept: what a change note gets | 40.3.0 |
| P21 | Notes alone finish without building; with a build or publish choice, return to `/apply` or `/ship` and go on without another choice; a material blocker stops | incident (on record) | one line | memory #1416 (feedback, 2026-10-08): "it should also be able to select build, and build & publish as well" |
| P22 | Finish: group source and test authoring by surface; complete all implementation before automatic tests or remote checks; required checks in a final verification phase, not per-part `/save` tasks | incident (on record) | one line; the task layout's home, with a link to the why | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` log: "chose complete implementation first, final tests and verification afterward" |
| P23 | Source review completes implementation boxes, not passing tests | step | kept: what a ticked box means; the home for L2 | 30.10.0 |
| P24 | A substantive deployed acceptance task names `/save` after implementation | step | kept: the task layout for deployed acceptance | 30.10.0 |
| P25 | "unavailable prerequisites remain blockers" | repeat | merged → `build-helper.md` step 2 (B7) | that step |
| P26 | "Explicit early requests retain their reach" | repeat | merged → `build-helper.md` step 2 (B8) | task 3.1 |
| P27 | Validate; confirm the page exists and every apply-required artifact is complete; standalone sums up above the link and ends with the next step; under `/apply` return the exact name | step | kept | — |
| P28 | "Print the plan's link however `/plan` was invoked" | repeat | merged → `asking-the-user.md#print-the-plans-link` (Q25: "When a reply makes or changes a plan or its checklist, print …") and `AGENTS.md`; this page keeps the link in its standalone sentence | Q25 holds the ask (2026-09-27, "whatever made it") |

## `.agents/skills/save/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| S1 | `/save` authorizes branch creation, record upkeep, spec reconciliation, commit, push, PR updates, CI fixes; ask for anything else | step | kept | — |
| S2 | Never force push, bypass hooks, amend merged commits, or merge | guard | kept as is | force push, merge |
| S3 | `/ship` owns archive/merge; the loop owns delivery; no local check is ever the gate | repeat | merged → `the-change-loop.md#the-gate`; one line and the link here | the gate section |
| S4 | `/save [note]`: a Status value sets Status; other notes seed the Decision log | step | kept | — |
| S5 | Cold-resume context belongs in pushed files with repo-relative paths | step | kept: where cold-resume context goes | 2026-07-25 `codex-first` |
| S6 | Keep every credential handled this session out of tracked files, changes, facts, messages, PR text, and reports; values stay in working memory and the ignored live file; record only names and sources | guard | kept as is | credential in a tracked file |
| S7 | The route table; load each matching procedure before its actions; conditions combine | step | kept byte-exact | — |
| S8 | Check preconditions, then fetch `main` before comparing; errors stop; the four commands | script | kept as the commands | `change-candidates.sh` |
| S9 | Keep `BRANCH`, `NAME`, `CHANGE_ROOT` separate | step | kept: names the commands read | 25.17.0 |
| S10 | Rungs `explicit`, `session`, `changed-active`, `changed-archive`, `recorded-branch`; never `sole-active` | repeat | merged → `checkpoint-evidence.md#selection-rungs`; here the outcome (save the change this work touched, never a plan merely because it is the only one open) and the link | design.md |
| S11 | Resolve ambiguity before staging | no cause | dropped: the rungs page covers it: "Several → ask, with them as the options; never fall through" | searched "wrong change saved", "staged the wrong": none; 19.0.0 only |
| S12 | Never duplicate a change for its branch name | step | kept: kept with S9: a duplicate change is hard to undo | 25.17.0 |
| S13 | A save changing repo files takes the normal route, except the validated record-only procedure; nothing learned, decided, or changed → report and stop | step | kept | — |
| S14 | Keep the feature branch; on default or detached HEAD, `git checkout -b "$SLUG"`; slug sources; short SHA on collision; create required plan artifacts before checkpointing | step | kept | — |
| S15 | "Never rename `NAME` to match" | repeat | merged → S12's line in section 1 ("never rename or duplicate a change to match its branch") | in-file repeat |
| S16 | Proposal header, plan sections, tasks: kept current, edited in place | step | kept | — |
| S17 | Decision log: append one dated entry; never rewrite, reorder, or delete earlier ones | guard | kept as is, with its reason: it is the history a cold reader inherits | a deletion of the record; the loop's "living handoff" |
| S18 | Session facts through the memory write gate with `"session": "current"` and `"source": "save"`; a spooled result does not block the save | step | kept | 17.0.0 |
| S19 | For an active change, reconcile its deltas | step | kept | — |
| S20 | Read artifact and task progress from the CLI, "never guessed paths or schema" | repeat | merged → `plan/references/openspec-cli.md` ("never write under a guessed … path"; "never assume artifact names"); the link stays | CLI contract |
| S21 | Archived handoff: keep exact `CHANGE_ROOT`; infer `NAME` from the dated folder only if absent; retain Branch; append an archive-checkpoint entry; stage archive, removals, implementation; `--mode archive` | step | kept | — |
| S22 | Never rebuild the plan or recreate an active folder; archive already reconciled deltas | step | kept: no goal on the page covers it | 30.10.0 |
| S23 | Stage intended implementation, handoff, and removals, never `git add .`; check for unrelated staged work | step | kept: no goal on the page covers it | 2026-07-25 `codex-first` |
| S24 | A plan-only save commits its artifacts | step | kept | — |
| S25 | Write, outside the repo, a one-line repo-style commit message ending `Co-Authored-By: Claude`, and the PR summary | step | kept | 26.14.0 |
| S26 | The `checkpoint.mjs` command; `--scan-keys` names every credential handled this session; a match stops the save | script | kept as the command and how to read it | `checkpoint.mjs` (31.3.0) |
| S26b | "a match prints paths, never values, and stops the save until removed and restaged" | script | dropped: `checkpoint.mjs` prints the paths and its `NEXT:` line says to remove, restage, and rerun | `checkpoint.mjs` ("NEXT: a handled credential is in the paths above. Remove it from each, restage, and rerun") |
| S27 | No change → omit `--change-root` and `--mode`; use the longest wait and wait again, silently; follow its `NEXT:` line | script | kept | `checkpoint.mjs` |
| S28 | Report outcome and one link in plain words; the fields inside a verb or on request; return `SAVE_HEAD`, `RECEIPT`, `SAVE_GATE_RESULT`; always print the last inside a verb | step | kept | 25.13.0 |
| S29 | Direct invocation ends with next steps; failed or unverified gates offer repairs | step | kept | — |
| S30 | "Authorized chains return unasked" | repeat | merged → `asking-the-user.md#form-never-whether-to-ask` (Q21: an authorized handoff goes ahead unasked) | that section |

## `.agents/skills/save/references/checkpoint-evidence.md` (selection rungs)

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| R1 | Each verb walks its own list of rungs in order; the first with exactly one candidate selects it | step | kept; this section now also says which rungs each verb walks, moved from the five verb pages (A3, S10, H9, C3, V4) | design.md |
| R2 | Several → ask, with them as the options; never fall through | step | kept: the behavior at several candidates; the covering goal for A6 and S11 | 25.17.0; #89 |
| R3 | The six rung definitions | step | kept; `sole-active` and `changed-archive` each gain a line saying which verbs use them | `change-candidates.sh` prints the `active`, `archive`, `recorded` candidates |
| R4 | A branch name alone never selects a change; a proposal with no Branch line needs an earlier rung; keep the change name separate from the branch name | step | kept: defines how a branch selects; the home for C12 | 19.0.0 |

## `.agents/skills/ship/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| H1 | Invoking `/ship` authorizes every step without a prompt: archive, checkpoint, walk, merge, remote-branch deletion, sync, the pull-in | step | kept | — |
| H2 | It never authorizes archiving unchecked tasks; Step 2 finishes them | guard | kept as is | a merge of unfinished work |
| H3 | Confirm anything else (a force push, `--no-verify`, `git reset --hard`, `checkout .`) | guard | kept as is | force push, deletion |
| H4 | The loop owns the record, the pull-in, and the gate; PR review owns cleanliness; `main` means the default branch | step | kept | — |
| H5 | The `prepare` and `finish` commands; commands end with `NEXT:` | script | kept, with "do what it says" | `ship.mjs` |
| H6 | Scheduled records: record-only delivery before code preflight; the flags; ordinary ship leaves published records alone | script | kept | `ship.mjs`, `schedule-records.md` |
| H7 | Attached review notes → review-note handling on the existing change; continue the authorized publish without another choice | incident (on record) | one line and the link | memory #1416 (feedback, 2026-10-08), as A7 |
| H8 | "missing plan or blocker stops" (review notes) | repeat | merged → `plan/SKILL.md#review-notes` | as A8 |
| H9 | Check preconditions, then run `prepare`; uncommitted changes on the default branch go on in the same tree | script | kept | `ship.mjs prepare` |
| H10 | `main`'s check run *cut off* → restart it, then rerun | script | dropped: `ship.mjs prepare` prints the restart command in its `NEXT:` line | `ship.mjs` ("NEXT: …check run was cut off, not failed. … Rerun this command"); 37.2.5 |
| H11 | The pull-in: invoke `apply`, saying it runs inside `/ship`; it returns with no preview upload or `/save` | step | kept: the call `/apply` reads | 12.4.0 |
| H12 | `/ship <intent>` → pass the intent verbatim | step | kept: a routing case | 8.4.0 |
| H13 | No argument → invoke `/apply` bare when its resolve order lands before `sole-active`, or the session states clear intent | step | kept: a routing case | 14.1.0 (#81) |
| H14 | The cold stop: landing on `sole-active` or nothing → say there is nothing to continue, then stop | guard | kept as is, with its reason: a cold `/ship` never publishes the only open plan | a merge; 14.1.0 (#81), #89 |
| H15 | A feature branch with work runs the ordinary runbook, intent or not; `/ship` resolves nothing itself | step | kept: a routing case | 12.4.0 |
| H16 | `/plan` pauses, tasks stay pending, or a task-driven `/save` fails → report and stop before Step 2: no verb merges to stop | guard | kept as is, with the link to the loop | a merge; 24.0.3 |
| H17 | "A one-go run has one checkpoint: Step 3's" | repeat | merged → Step 3 of the same file (H27: invoke `save` exactly once) | in-file repeat |
| H18 | No-repo work finishes in `/apply`: say so and stop, with no git change | step | kept | 26.4.0 |
| H19 | `CHANGE_NAME` is separate from `BRANCH` | step | kept as it read: the step's command uses the name (restored after the second read) | the code block above it; R4 holds the reason |
| H20 | Pass `--change` for an `explicit` or `session` change; without it `prepare` takes `changed-active`, then `recorded-branch` | repeat | merged → `checkpoint-evidence.md#selection-rungs` (R1); here the flag, one line on the outcome, and the link | `ship.mjs prepare` picks |
| H21 | `sole-active` never authorizes a cold merge | repeat | merged → H14 in the same file and R1 | in-file repeat |
| H22 | None selects → `/save`'s route table on the branch diff; `--change` or `--no-change` | script | kept (flags) | `ship.mjs prepare` |
| H23 | Several active change folders → ask: move the others off the branch, or ship all on purpose | guard | kept as is | a merge carrying other work |
| H24 | Unchecked tasks → invoke `apply` inside `/ship`, then rerun; still pending → report and stop | guard | kept as is | a merge of unfinished work |
| H25 | `prepare` numbers the `## Next` entry, merging `main` in first when behind; reruns the local checks, so allow 15 minutes; `NEXT:` carries any repair | script | kept: how to read and wait on it | `ship.mjs prepare`, `number-release.mjs` |
| H26 | A file it cannot merge → resolve as the union of intent, `git add`, rerun; any other failure → report and stop before `/save` | script | dropped: `ship.mjs prepare` says both in its `NEXT:` line | `ship.mjs` ("NEXT: resolve each file above as the union of intent (a merge, never a rebase), git add them, and rerun"; "NEXT: report this message and stop before /save") |
| H27 | Invoke `save` exactly once as ordinary `/save` and follow it verbatim; proceed only on `SUCCESS` or `NONE`; never repeat, bypass, or reinterpret the gate | guard | kept as is | a merge past the gate |
| H28 | Invoke `verify` once with Step 3's exact receipt, never again for a better verdict | step | kept: the step and its reason | 31.3.0 |
| H28b | "It reuses the gate without another save; the walk itself runs fresh" | repeat | merged → `verify/SKILL.md` (V1: fresh scenarios on the exact saved revision; V6: SAVED → reuse its receipt) | those lines |
| H29 | No `verify` skill → say so and go on; never install it | step | kept: the fallback with no `verify` skill | 19.0.0 |
| H30 | Any verdict but `FAILURE` → report and merge; `FAILURE` → stop and ask two options; say what they would see not working | guard | kept as is | a merge of a failed walk needs the person |
| H31 | If the walk advanced `HEAD`, merge that commit only when its `/save` result is `SUCCESS` or `NONE` | guard | kept as is | a merge past the gate |
| H32 | Run `finish` once; allow 12 minutes; a skipped sync or secrets error is one report line; not merged → report and stop unless `NEXT:` gives a recovery | script | kept | `ship.mjs finish` |
| H33 | Merge, not rebase, unless asked | guard | kept as is | a rebase of a pushed branch needs a force push; 31.3.0 |
| H34 | Never check out, switch, stash, reset, or force a branch to make the sync succeed, or delete a local branch | guard | kept as is | deletion, force; 12.6.0 (#76) |
| H35 | Live look: `ok`/`unknown` → `REASON` as one report line; `failed` → say what is not working, invoke `apply` once with `REASON` and `URL`; no retry or revert | incident (on record) | one line each, kept as it read | `openspec/changes/archive/2026-10-04-staging-playground/proposal.md` log: "Asked whether to take a quick look that the live app loaded after publishing → chose yes, look only" |
| H36 | Report: outcome first, the live link, the plan's link, **Checks loosened**; the rest only when asked | step | kept | 25.13.0, 25.6.0 |
| H37 | Close with the next step, whose options next work owns | step | kept | — |
| H38 | "after a stop, the ways to clear the blocker" | repeat | merged → `asking-the-user.md#end-every-reply-with-the-next-step` ("Blocked task: the supported ways to clear it") | that list |

## `.agents/skills/continue/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| C1 | Selected schedule: route its record before code or checkout | step | kept, with the link | — |
| C2 | "preserve its store and pending question" | repeat | merged → `save/references/schedule-records.md` | as A2 |
| C3 | A handle selects by the rungs: a change name is `explicit`; a PR uses `changed-active`, then `recorded-branch`, on its head branch | repeat | merged → `checkpoint-evidence.md#selection-rungs`; here the outcome and the link | design.md |
| C4 | The change is the plan and the source of truth; its memory facts hold the session context; check preconditions; this skill owns checkout; `gh` resolves only GitHub | step | kept | — |
| C4b | "kept current by `/save`: `proposal.md` holds the intent, `tasks.md` the checklist" | repeat | merged → `the-change-loop.md#where-the-plan-and-record-live`, linked from the line | that section and the page's first paragraph |
| C5 | Parse the input: handle, instruction | step | kept | — |
| C6 | No handle → list changes, schedules, and open threads; offer both, recommending what the branch or latest checkpoint points at; don't guess | step | kept: the menu with no handle | 2026-07-25 |
| C7 | A non-code thread → no branch or change; `memory.mjs show`; recap; hand to `/apply` | step | kept | 26.4.0 |
| C8 | Change name → its proposal's `**Branch:**` value is `BRANCH`; the commands; facts keyed by the change name; no facts is normal | script | kept as the commands | 26.14.0 |
| C9 | No folder in a fresh checkout → fetch and search remote branch trees without checking them out; one match supplies the proposal and branch; several need a choice | script | kept as the commands | — |
| C10 | A proposal with no Branch line never selects a branch by name: stay here for an unsaved plan; ask when it is saved elsewhere | step | kept: a routing case | 19.0.0; spec `openspec-workflow` "Continue finds the branch from the change" |
| C11 | PR → the branch is its `headRefName`; `change-candidates.sh --ref --branch`; give each candidate's status and progress when asking | script | kept as the commands | `change-candidates.sh` |
| C12 | "never infer its name from the PR branch" | repeat | merged → `checkpoint-evidence.md#selection-rungs` (R4: keep the change name separate from the branch name) | that section |
| C13 | A bare number matching both a PR and a list index → ask which | step | kept: a routing case | 25.17.0 |
| C14 | Other unpublished work here → don't switch; ask: new workspace, `/save` first, or recap and stop | guard | kept as is | switching would mix or lose unsaved work |
| C15 | Nothing else here → check out; a Branch line naming a missing branch → never create it; ask | step | kept: a routing case | 25.17.0 |
| C16 | Checkout fails because another worktree has the branch → say where, recap, stop; never force it | guard | kept as is | a forced checkout |
| C17 | Never saved → stay on the current branch; `/save` will cut it | step | kept | — |
| C18 | Recap: the change, the journey, the session context, state (the PR as *the change on GitHub*) | step | kept | — |
| C18b | "as a markdown link — only the link … unless asked" | repeat | merged → `asking-the-user.md#write-in-plain-words` (Q11: one link, called *the change on GitHub*; the rest only when asked), linked from the line | that section |
| C19 | Drift check: counts only; never reload the PR diff or review threads unless asked; the commands | script | kept as the commands and one line | 2026-07-25 |
| C20 | Fold it into one line; say it as progress unless asked for counts | incident (on record) | one line | `openspec/changes/archive/2026-09-27-plain-words-for-everyone/proposal.md` log: plain words for everyone, detail only when asked |
| C21 | Not checked out → build and edit nothing, even with an instruction | guard | kept as is | edits on the wrong branch; 26.4.0 (#162) |
| C22 | An explicit instruction → do that; otherwise invoke `/apply` | step | kept | — |
| C23 | `/continue` resumes and implements; it drafts no specs | no cause | dropped: step 4 ("invoke the `/apply` skill to work the tasks") and the skill's description ("Resume saved work … for /apply") cover it; the wiki keeps `/apply` vs `/continue` | searched "drafts no specs", "continue drafted": none; reworded in 24.0.3 from an older line with no cause |

## `.agents/skills/verify/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| V1 | Check fresh scenarios on the exact saved revision; gates nothing | step | kept | — |
| V2 | Authorized: needed `/save`, browser installation, Access heal, staging preparation, § a's writes; other permissions join the handoff | step | kept | 30.6.0 |
| V3 | The `scout-check` and `preflight` commands | script | kept | `verify-staging.sh` |
| V4 | Scout rungs: `explicit` (including `/ship`'s archive), `session`, `changed-active`, `recorded-branch`, `changed-archive` | repeat | merged → `checkpoint-evidence.md#selection-rungs`; here the outcome and the link | design.md |
| V5 | Asks name candidates' scenarios; READY → match by § a; nothing reachable → NONE, name exclusions and stop | step | kept | 12.0.0 |
| V6 | Bind with `saved-revision.mjs --checkpoint`; NEEDS_SAVE → `/save`; SAVED → reuse its receipt or read the existing gate | script | kept as the command and how to read it | `saved-revision.mjs` |
| V7 | UNKNOWN → unverified, never save speculatively; no record edits or settled-check reruns | incident (on record) | one line with the reason: a save made to find out starts another round of checks | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` Why: "repeating those checks after separate parts multiplied the wait, and repairs added more runs" |
| V8 | Prepare independently; `preflight` (allow 12 minutes); `--no-browser`; `SEEDED=no` beside `TURN`; `--no-preview --no-browser` for CI-only | script | kept | `verify-staging.sh preflight` |
| V9 | Blocks pause dependents | step | kept: the home for W9 | 30.6.0 |
| V10 | Never guess URLs | step | kept: the rule and its reason (the wiki names the hazard) | wiki `staging-walkthrough.md` ("still answer `200`") |
| V11 | Recheck head before posting; changes require fresh evidence | step | kept: a step before posting | 30.6.0 |
| V12 | Walk and grade by §§ b–f; finish independent safe checks before repairs; inside `/ship`, add kept checks | step | kept: the home for W10 and W18 | 30.6.0; wiki "Safe checks finish before you are asked to help" |
| V13 | FAILURE → judge scope; in scope → collect failures, fix once, `/save`, `preflight`, repeat affected checks at most twice; retain independent evidence only with unchanged dependencies | step | kept: the repair loop and its only bound | 12.0.0 |
| V14 | Simulate and report by § f; one report covers surfaces, retries, heals, fixes, installs, scope, limits; next step; inside `/ship` return the verdict | step | kept | 29.16.0 |
| V15 | Heal once per invocation; retry dependents only | step | kept: the heal's only bound | 12.0.0 |
| V16 | Access challenge: mint a repo-named service token; widen groups if needed; confirm the machine policy accepts it | step | kept | 12.0.0 |
| V17 | Preserve human permissions; store the pair in the primary worktree `.env` only; name the mint; never print or commit credentials | guard | kept as is | credential in a tracked file |
| V18 | Privacy changes need human login/revocation checks; machine access proves no email login | step | kept: what machine access can and cannot show | 30.6.0 |
| V19 | No token or a surviving block → unverified; name the gaps | step | kept | — |
| V20 | Plain checks: skip scout, its address, the `mktemp` folder; same safeguards and handoff; past pictures; show evidence; post only if asked; `cleanup` | step | kept | wiki "A plain check posts nothing unless you ask" |
| V21 | Verdict table and precedence | step | kept byte-exact | — |
| V22 | `agent-browser`/Chrome only for browser journeys; new probe runtimes ask first; bundled collector authorized; no repo dependencies | step | kept: what may be installed | 30.6.0 |
| V23 | Saved-source previews or validated CI captures; no local repo execution or invented tooling; read-only recipes; written expectations judge | step | kept: the home for W21 | 30.6.0; wiki "What it is not" |
| V24 | Keep journeys and evidence outside the repo, bar `/ship`'s kept checks; `cleanup` on every exit | step | kept: where evidence lives and when it is cleaned | 12.0.0 |
| V25 | Never merge or archive: `/ship` owns that | guard | kept as is | a merge |

## `.agents/skills/verify/references/walkthrough.md` §§ a, c, e, f, g

§§ b and d are out of scope and byte-identical. The long why for every row here is in `wiki/development/staging-walkthrough.md#why-a-walk-runs-the-way-it-does`, which this page's first line links.

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| W1 | § a: select delta scenarios and capabilities touched by the branch diff; `WHEN`/`THEN` authoritative | step | kept | 12.0.0 |
| W2 | § a: inspect confirmed callers and data contracts; add narrowly relevant consumer scenarios; name the relationship and expectation; exclude speculation; report missing expectations | step | kept: what the scout selects | 30.6.0 `verify-more-surfaces` |
| W3 | § a: consumer checks grant no repair scope | no cause | dropped: § e covers it: "A failure is **in scope** only when … the contradicted `THEN` is one of *this change's own* scenarios" | `archive/2026-10-04-verify-more-surfaces/proposal.md` logs it as an assumption ("without authorizing unrelated repairs"), not a failure or an ask; 30.6.0 only |
| W4 | § a: the four routes, strongest first | step | kept | 30.6.0 |
| W5 | § a: CI capture: read project recipes; validate sources, identity, integrity; no recipe preserves ordinary probes; drift blocks its check, without editing recipes | step | kept: how a CI capture is read | 30.6.0 |
| W6 | § a: never execute downloads or repo code locally | guard | kept as is | running a downloaded file can leak or destroy; 30.6.0 |
| W7 | § a: the ledger's fields | step | kept | 30.6.0 |
| W8 | § a: prepare surfaces independently: no preview blocks deployed checks alone; no route → unverified; stage runnable checks | step | kept: how surfaces are prepared | 30.6.0 |
| W9 | § a: "blocked/failed prerequisites pause dependents only" | repeat | merged → `verify/SKILL.md` step 2 (V9: "A blocked or failed prerequisite pauses only its dependents") | that step |
| W10 | § a: "Finish independent safe checks" | repeat | merged → `verify/SKILL.md` step 3 (V12) | that step |
| W11 | § a: `PLAYGROUND=yes` → write freely, no prompt, ownership, or cleanup; otherwise staging-only bindings and owned disposable records, or defer | script | kept: how to read `preflight`'s line | `verify-staging.sh preflight`; 30.8.0 |
| W12 | § a: production data, paid resources, or access changes beyond the authorized heal need permission | guard | kept as is | payment, deletion |
| W13 | § a: outside services: trigger only on an `own` key; `shared` or unknown → never trigger; name the service | guard | kept as is, with its reason: a staging email could reach a real customer | sent message, payment; wiki |
| W14 | § a: missing seed records; scheduled work by manual trigger | step | kept | 29.16.0 |
| W15 | § c: the `run` command | script | kept | `verify-staging.sh run` |
| W16 | § c: "After source/test authoring and the final gate" | repeat | merged → `build-helper.md` step 2 and `verify/SKILL.md` step 2 (bind to the saved revision) | those steps |
| W17 | § c: stage independent journeys together; grade prerequisites before dependent stages; move completed inputs out before retries (every staged mutation replays); driver order; failed cleanup retains owned record IDs and defers dependent mutations | step | kept: how a run is staged, reasons kept | 29.16.0 |
| W18 | § e: "Finish independent checks" | repeat | merged → `verify/SKILL.md` step 3 (V12) | that step |
| W18b | § c: "finish independent checks" (after a failed cleanup) | repeat | merged → `verify/SKILL.md` step 3 (V12) | that step |
| W19 | § c: `REDACTED=<n>`: above 0 report it; `unknown` → inspect before posting | script | kept: how to read the line | 29.12.0 |
| W20 | § e: `PLAYGROUND=yes` → clean up nothing: `preflight` rebuilds staging before each re-walk | repeat | merged → § a (W11) of the same file; § e keeps the pointer | in-file repeat |
| W21 | § f: "No local repo execution or invented tooling" | repeat | merged → `verify/SKILL.md` Hard rules (V23) | that list |
| W22 | § e: retain retry evidence; otherwise clean up owned test data; preserve shared data | step | kept: what is cleaned after a failure | 30.8.0 |
| W23 | § e: in scope only when the `THEN` is this change's own and the fix lives in files the branch touches; a kept check needs only the second; `replay --only <id>` | step | kept | 12.0.0, 33.1.0 |
| W24 | § e: retain a focused check when CI can cheaply reproduce the defect; failure on the earlier source, pass on the repaired head; impractical harness → name the limit | step | kept: what a repair keeps | 30.6.0 |
| W25 | § e: no new infrastructure, weaker checks, or unrelated fixes | step | kept: spec `staging-walkthrough` promises it ("without requiring new test infrastructure or weakening the delivery gate"); unsure, so kept | 30.6.0 |
| W26 | § e: usually out of scope: app `401` with a valid token; previous-page screenshot | incident (on record) | one line | `openspec/changes/archive/2026-08-09-walk-stack-agnostic/proposal.md` log: "Found a real defect … a screenshot taken before a navigation paints captures the previous page" |
| W27 | § f: one `comment.md` covers every surface and retry; its fields; label practice or simulated evidence; show pass, fail, partial, unverified | step | kept | 29.16.0 |
| W28 | § f: text stands without images; `Pictures (log in to open):` links | step | kept: the comment's format, with the wiki's reason | 29.13.0 (#249) |
| W29 | § f: apply the verdict precedence; UNKNOWN/TIMEOUT lead **Not verified.**, naming completed checks, blocks, and remedies | step | kept | — |
| W29b | § f: "inherently unobservable claims stay partly shown (§ d)" | repeat | merged → § d of the same file ("Partly shown … verdict unchanged"), untouched | in-file repeat |
| W29c | § f: "Name heals or missing credentials" | repeat | merged → `verify/SKILL.md` step 5 (V14: one report covers heals, fixes, installs) and "When a block stops the walk" (V19: name credentials and repair gaps) | those lines |
| W30 | § f: attempt safe simulations before handoff; label simulated evidence; simulated delivery proves no real delivery; no safe simulation → name the limit | incident (on record) | one line | `openspec/changes/archive/2026-10-03-verify-autonomous-staging/proposal.md` log: "Asked: review note on Change #3 → added safe best-effort simulations before the handoff … Simulated evidence must name its limits" |
| W31 | § f: one handoff after independent checks; each remaining check names reason, action, expected observation, dependents; offer help or skips | step | kept: the one handoff and its fields | 29.16.0 |
| W32 | § f: skips stay skipped and unverified, grant no permission or pass, erase no failure; ask again only if reopened | incident (on record) | one line | `openspec/changes/archive/2026-10-03-verify-autonomous-staging/proposal.md` log, same ask: "options to skip selected or all remaining checks … skipped checks remain unverified" |
| W33 | § f: "Blocked reachable checks prevent SUCCESS" | repeat | merged → `verify/SKILL.md#verdicts` (SUCCESS: "no contradiction or blocked reachable check") | that table |
| W34 | § f: key links or password links for credentials; waiting grants no permission; resume pending checks; repeat completed checks only on changed conditions; retain the ledger before cleanup | step | kept: how help arrives and what resumes | 30.6.0 |
| W35 | § f: the publish, post, cleanup commands; how to read `publish`'s lines | script | kept | `verify-staging.sh publish` |
| W36 | § f: never cite missing URLs or cleaned local paths | incident (on record) | one line | memory #788 (thread, 2026-10-03: "walk screenshots are lost with no WALK_MEDIA_BUCKET") |
| W37 | § f: "other evidence is inline text" | no cause | dropped: § f's first paragraph covers it: the comment holds "raw observations/readbacks", and "Text stands without images" | 12.0.0 only |
| W37b | § f: "no video" | step | kept: restored after the second read of this pass. Nothing else on the verify pages rules a recording out, the browser guide offers one, and `openspec/specs/staging-walkthrough/spec.md` ("The walk leaves the repo as it found it") says "never a video" | searched "video": no failure or ask (memory #25 is a note on what GitHub renders); the only statement of the behavior |
| W38 | § g: inside `/ship` only, before § f's post; the `J` calls | script | kept | `verify-journeys.mjs` |
| W39 | § g: replay results `same`, `changed`, `skipped`, `not-run`; `changed` → walk fresh once, three per walk | script | kept: how to read the result | `verify-journeys.mjs`; 33.1.0 |
| W40 | § g: keep each passed journey; `expect` rows hold shown claims only | script | kept | `verify-journeys.mjs keep` |
| W41 | § g: never keep one using a private link, an outside service, or a manual job trigger | guard | kept as is, with a link to its reason | sent message; wiki `kept-checks.md#what-is-never-kept` |
| W42 | § g: prove, install; name each left out; a changed tree → `/save` once; that commit needs no re-walk | script | kept | `verify-journeys.mjs` |

## `wiki/development/the-change-loop.md`

The page keeps every heading and its why. Only its repeats of a skill's how move.

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| L1 | "Pictures unavailable → say why and keep the choice." (intro) | repeat | merged → `apply/SKILL.md#finish-with-a-preview` (A29), already linked in the same sentence | that section |
| L2 | `/plan` step: "build the complete implementation before automatic tests or remote checks. Source-review completion never claims passing tests; delivery runs required verification at the end." | repeat | merged → `plan/SKILL.md#finish` (P22, P23); the step links the build-order section | that section |
| L3 | `/apply never saves to stop`: "Prepare all source and tests first, then run the local pre-check once; tick implementation boxes on source review and report the pre-check as local. Move existing intermediate test gates to the final phase without new approval or lost acceptance obligations, and log the timing change." | repeat | merged → `build-helper.md` steps 2–4 (B4, B6, B9, B12); the section keeps the why and links the brief and `/plan` | design.md |
| L4 | "Explicit early requests retain their reach." | repeat | merged → `build-helper.md` step 2 (B8) | task 3.1 |
| L5 | `/apply` never saves to stop or between parts; routine final checks belong to `/save` or `/ship` | step | kept: the section's own rule | 24.0.3 |
| L6 | Substantive deployed acceptance needs evidence after implementation; only observed acceptance completes its task; a later archive can require another checked revision | step | kept: what counts as observed acceptance | 30.10.0 |
| L6b | "An unavailable prerequisite stays a blocker" | repeat | merged → `build-helper.md` step 2 (B7) | that step |
| L7 | Final required checks, fresh preview evidence, and the single live look remain; after failures batch repairs; every pushed source revision still takes all required CI jobs | incident (on record) | one line | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` log, the same ask: "affected rechecks only after a real failure, preserving final required checks and preview" |
| L8 | (new) the why of build order: checking part by part multiplied a long build's wait, and repairs added more runs | incident (on record) | added as the section's reason | `archive/2026-10-04-reuse-checked-revisions/proposal.md` ("repeating those checks after separate parts multiplied the wait, and repairs added more runs") |
| L9 | Everything else on the page (the loop, just ask, the offer, workspaces, the steps, the gate, loosened checks, the handoff, records) | step | kept, untouched | — |

## `AGENTS.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| G1 | A person just asks to build or change code; you run the verbs (the list) | step | kept as the orienting line, with the link | — |
| G2 | "With no verb, ask the finished-plan question at the plan's review link and 'publish it?' after `/apply`'s preview from this host." | repeat | merged → `the-change-loop.md#just-ask`; the line says only "Asked with no verb, stop at the plan and at the preview" | that section, steps 1–2 |
| G3 | "A typed verb keeps its own reach; one missing its precondition runs the verb before it." | repeat | merged → `the-change-loop.md#just-ask` ("A verb the person types keeps its own reach") and the page's intro ("A verb whose precondition is missing invokes the verb before it") | those paragraphs |
| G4 | "An invoked verb also serves work that changes no repo file, with a to-do and a confirm per outward action" | guard | kept as is for the confirm; the to-do is at `the-change-loop.md#verbs-for-any-work`, linked from the line | sent message, payment, deletion |
| G5 | Print the plan's link whenever you make or change a plan | step | kept as the orienting line, with the link | — |
| G6 | "*Click here to see the plan:* on its own line above the closing question, even if the build goes on." | repeat | merged → `asking-the-user.md#print-the-plans-link` (Q25, Q28, Q29) | that section |
| G7 | "That question also offers *Review the plan*; only that reply adds a line under it saying to type `/apply` to build it" | repeat | merged → `asking-the-user.md#print-the-plans-link` (Q30, Q31) | that section |
| G8 | Every other bullet | step | kept, untouched | out of this change's scope |

## Other wiki pages

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| X1 | `wiki/development/staging-walkthrough.md`, "Why a walk runs the way it does": "Finish the implementation before automatic verification. Write tests with source; source-complete work is not a passing test result. Explicit early requests still work." | repeat | merged → `the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task` (the why) and `build-helper.md` (the how); the bullet becomes one linking line, and still says a walk you ask for runs at any point | task 3.1 |

## Not changed, and why

- `walkthrough.md` §§ b and d: out of scope by the proposal; measured with a paid practice run before any edit.
- `checkpoint-evidence.md` above "Selection rungs": out of scope; it describes what `change-candidates.sh` prints.
- The verdict table, every code block, and every command line: scripts and callers read them.
- `verify/SKILL.md` and `walkthrough.md` keep their short one-line rules. Nearly all are steps of the walk, whose long why the wiki page holds; the second pass dropped two (W3, and W37's "other evidence is inline text"). `/verify` is the one skill with a practice site, and no practice run was made, so nothing else there was cut by reading alone.
- The exception for a check the person asks for early stays in the helper brief alone (A16, P26, L4, X1): design.md names the brief as its home, and task 3.1 holds the phrase to that one page. The parent passes such a request on as the person's answer.
- The first second reader found 28 points. Twenty-three were restored or reworded; the Decision log names each. Not restored: the allowance in A27 that a phone view can be the second picture (it only served the count that went), and the new word "sub-helper" in B21 (the plan asked for that line).

## Totals

345 rows: the first sort's 342, plus three split in the second pass.

| After | Rows |
|---|---|
| kept as is (guard) | 27 |
| one line, with a failure or an ask on record (two of them added) | 38 |
| kept (a step, or a script's command and how to read it) | 205 |
| merged to one home (repeat) | 56 |
| dropped (16 with no cause, 3 a script already says) | 19 |

Dropped in the first pass: A15, A27, B20, S26b, H10, H26. Dropped in the second: A6, A30, A39, Q2b, Q14, Q15, E10, E25, E26b, S11, C23, W3, W37. Restored by the second pass's reader: E7, W37b, and the link on A18.

<!-- end rule-map.md -->
