# A second look before the preview

**Status:** ready-to-ship
**Branch:** verify-skill-improvements
**Open questions:** none

## Why

Today one agent writes the code, writes its tests, and decides they are good. Nothing independent reads the code itself: the preview walk checks what the app does on screen, not a security hole or a test that proves nothing. And when something goes wrong, each step has its own idea of when to fix it alone and when to stop and ask you.

## What Changes

- **A second agent reads every finished build before you see the preview.** It starts fresh, with none of the builder's reasoning, and checks the changes against the plan: bugs, missing or weak tests, and anything the plan didn't ask for.
  ```mermaid
  flowchart TD
    build["Agent builds"] --> self["Builder checks its own work"]
    self --> review["Second agent reviews"]
    review --> checks["Automated checks"]
    checks --> clear{"All clear?"}
    clear -- "Yes" --> preview["Preview, then publish?"]
    clear -- "No, fixable" --> build
    clear -- "No, needs you" --> you["You decide"]
    you --> build
  ```
- **One rule decides what the agent fixes alone and what comes to you.** The agent fixes anything the plan already settles: a broken plan scenario, a failing check, or a bug the reviewer found. It brings you anything that needs a decision the plan doesn't make:
  ```text
  Fixed for you            Brought to you
  ───────────────────────  ──────────────────────────────
  breaks a plan scenario   outside the plan
  failing test or check    a check would get weaker
  reviewer's bug, agreed   can't be undone, or risky
                           still failing after 2 fixes
                           builder and reviewer disagree
  ```
  You get one plain question with a recommended answer, not a raw review. What was fixed for you shows in the report.
- **The preview check and the save step follow the same rule**, so a problem gets the same treatment wherever it turns up.

Non-goals: no second review of the live app, no review by a different AI company's model, and no change to what blocks publishing.

## Capabilities

### New Capabilities

### Modified Capabilities
- `apply`: a fresh reviewer agent reads the finished build before the preview, and fixable findings go back to the builder.
- `change-loop`: one rule says which problems an agent fixes alone and which it brings to the person, used by `/apply`, `/save` and `/verify`.

## Impact

- `.agents/skills/apply/SKILL.md`, a new `.agents/skills/apply/references/review-helper.md`, `.agents/skills/apply/scripts/helper-stop-check.mjs` and its test.
- `wiki/development/the-change-loop.md` gains the rule's one home; `.agents/skills/verify/references/walkthrough.md` § e and `.agents/skills/save/references/git-gate.md`'s auto-fix loop link to it.
- `CHANGELOG.md` minor entry. Skill text sits at its context budget, so the additions need offsetting cuts.
- Each build costs one more agent run.

## Decision log

- **2026-10-19** — Asked whether a second agent should review the code, reversing the 2026-10-04 "live verify covers it" decline → chose yes, at the end of the build, before the preview.
- **2026-10-19** — Asked what counts as a problem that comes to the person → asked for a proposed definition, then chose: outside the plan, a weaker check, can't be undone or risky, still failing after two fixes, unresolved builder–reviewer disagreement.
- **2026-10-19** — Assumed: the reviewer runs on the same model as the builder, not a different AI company's model, because WongStack names no required host and gstack's cross-model reviews were ruled out on 2026-10-06 as tied to one host.
- **2026-10-19** — Assumed: the rule lives once in the change-loop wiki page and `/verify` and `/save` link to it, because the same rule on two pages goes stale.
- **2026-10-19** — Asked how to fit the 446-byte overrun of the skill-text budget → chose trimming neighbouring skill files outside the plan, over raising the limit or cutting the new rules.
- **2026-10-19** — Archived for ship as 43.11.0. The new reviewer checked its own change: it caught that `git diff origin/main...` hides uncommitted builds (fixed to the merge base) and asked for an earliest-brief stop-hook test (added); its reread found none open.
