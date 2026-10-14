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
