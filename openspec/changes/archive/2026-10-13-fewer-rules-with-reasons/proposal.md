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
