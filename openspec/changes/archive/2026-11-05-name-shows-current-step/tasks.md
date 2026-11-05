# Tasks

## 1. The step-title script

- [x] 1.1 In `.agents/skills/explore/scripts/step-title.mjs`, drop the order guard and `--typed` from `nextState`, `setStep`, and the usage line (design decision 1); verify by the updated tests in 1.3.
- [x] 1.2 Change the hook so a loop verb stores task words but no step, a first no-skill message still starts PLAN, and another skill first still stores an empty state (design decision 2); verify by 1.3.
- [x] 1.3 Update `scripts/tests/step-title.test.mjs`: replace the "rank only rises" test with one where `SHIP` then `set APPLY` gives `APPLY:` and `DONE` then `set PLAN` gives `PLAN:`; `/ship fix the invoice total` as a first message shows no name, then `set APPLY` gives `APPLY: Fix the invoice total`, then `SHIP`, then `DONE`; a first plain message still gives `PLAN: …`; adjust the Claude-alone, `/daily`, bare `/apply`, and Codex-hook tests to the new hook. Run `node --test scripts/tests/step-title.test.mjs`; all pass.

## 2. Skills, docs and release

- [x] 2.1 Move `set APPLY` in `.agents/skills/apply/SKILL.md` to just before building, the to-do, or the preview; move `set SHIP` and `set DONE` in `.agents/skills/ship/SKILL.md` from Step 1 to the start of Step 2; drop `--typed` in `.agents/skills/explore/SKILL.md` (design decision 3). Verify `node scripts/measure-context.mjs --check` passes.
- [x] 2.2 Update the "A chat's name starts with its step" line in `wiki/development/the-change-loop.md`: the name shows the step that runs now and changes when that step starts. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 2.3 Add `--typed` to `scripts/retired-names.json` with its replacement and a `## Next (patch) — The chat name shows the step that runs now` entry to `CHANGELOG.md` with no hand step; verify `node scripts/check-retired-names.mjs` passes.
- [x] 2.4 In `.agents/skills/ship/SKILL.md`, run `set SHIP` again after each `apply` inside `/ship` until `finish` merges, so a later `apply` does not leave APPLY showing until DONE; verify `node scripts/measure-context.mjs --check` passes.
- [x] 2.5 In `.agents/skills/plan/SKILL.md`, add `set PLAN` at the start and keep the Finish `set PLAN --task`; update design decision 3 to match; verify `node scripts/measure-context.mjs --check` passes.
- [x] 2.6 In `scripts/tests/step-title.test.mjs`, add a test that reads the explore, plan, apply and ship `SKILL.md` files and checks each still sets its steps (EXPLORE; PLAN; APPLY and DONE; SHIP and DONE); run `node --test scripts/tests/step-title.test.mjs`; all pass.

## 3. Verify

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 3.2 In this Paseo chat, run `step-title.mjs set SHIP`, then `set APPLY`, and confirm with `paseo agent inspect` that the name goes to `SHIP: ` then back to `APPLY: `.
