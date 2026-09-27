# Tasks

## 1. Publishing skills (`/ship`, `/save`)

- [x] 1.1 In `.agents/skills/ship/SKILL.md` Step 1, replace the dirty-default-branch bullet: go to Step 2 in the same tree, and Step 3's save cuts the branch. Verify no line in the skill still invokes `/save` before Step 3, apart from the pull-in's gate tasks.
- [x] 1.2 In `ship/SKILL.md` Step 2, replace the "code or a plan for code → stop" rung: author the change by `save/references/new-plan.md`, select it as `explicit`, and continue through the task check and archive. Verify `grep -n "no identifiable change record" .agents/skills` returns nothing.
- [x] 1.3 In `ship/SKILL.md`'s distillation, skip `search --branch` when `BRANCH` is the default branch. Verify the step names both cases.
- [x] 1.4 In `.agents/skills/save/SKILL.md` §5, print the plan link only when the save changed the proposal's plan sections or `tasks.md`, not Status, Branch, Open questions, or Decision-log lines. Verify the sentence names both sides.

## 2. Thinking and resuming skills (`/explore`, `/continue`, `/apply`, `/plan` references)

- [x] 2.1 In `.agents/skills/explore/SKILL.md`, split the exit round's handoff: bounded mode returns to `/plan`; standalone ends with *Plan it (Recommended)* / *Keep thinking* / *Stop*. Add the review-notes exception to line 11's "always runs". Verify both modes are named.
- [x] 2.2 In `explore/references/asking-the-user.md`: the plan's link line is apart from the one link; the finished-exploration next step joins the list; "`/apply` into `/save`" says "for a task that needs the gate"; the "every reply ends with a question" rule names the *Review the plan* reply as its one exception. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 2.3 In `.agents/skills/continue/SKILL.md` Steps 3–4, a declined or failed checkout recaps and ends with the next-step question, never `/apply`. Verify Step 4's `/apply` line applies only after a checkout or with no branch yet.
- [x] 2.4 In `.agents/skills/plan/references/new-workspace.md` *Ask once*, add the busy-workspace options and say `/plan` stops after opening. Verify the no-`paseo` case leaves one option plus the person's own answer.
- [x] 2.5 In `.agents/skills/apply/SKILL.md` *Build in a helper* and `apply/references/build-helper.md` step 1, carry `store <id>` and pass `--store`. Verify both files name the line.

## 3. Wiki and `WONG-STACK` block

- [x] 3.1 In `wiki/development/the-change-loop.md`:
  - The opening plain-request paragraph says an edit ends with *publish it?*.
  - *Just ask* step 2 says an untouched app still asks *publish it?*.
  - The `/explore` step names the review-notes exception and the standalone next-step question.
  - The `/continue` step says a read-only resume stops.

  Verify `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 In `AGENTS.md`'s `WONG-STACK` block, add to the plain-request rule that a plain request that edited a repo file ends by asking *publish it?*. Verify the block still ends at `WONG-STACK:END` and the link checker passes.

## 4. Release

- [x] 4.1 Bump `VERSION` to 26.2.0 and add a `CHANGELOG.md` entry with an **Updating** line. If *Release collisions* already moved to a `## Next` heading, follow that instead. Verify the top heading matches `VERSION`.
- [x] 4.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate smoother-publish-flow --strict --no-interactive`. Verify all three pass.
