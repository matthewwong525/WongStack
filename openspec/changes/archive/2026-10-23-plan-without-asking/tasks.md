# Tasks

## 1. Page builder

- [x] 1.1 In `.agents/skills/plan/scripts/build-review.mjs`, print the review line for a live link (`Review the plan, then tap Build it or Build and publish on its page.`) or for the file (`Review the plan. When you're ready, say "build it" or "build and publish".`), keeping the scheduled-goal line; export both; verify by updating `scripts/tests/review.test.mjs` to assert each case and running `node --test scripts/tests/review.test.mjs`

## 2. Skills

- [x] 2.1 In `.agents/skills/explore/references/asking-the-user.md`, make *End every reply with the next step* end a finished plan with the plan's link and the builder's review line, no question, and *Print the plan's link* copy that line on the finished plan and the *Review the plan* answer; keep the *Review the plan* option for other closing questions in a reply that changed a plan; verify by reading both sections against the asking-the-user delta
- [x] 2.2 In `.agents/skills/explore/SKILL.md`, say standalone means the person typed `/explore`, and a request with no verb starts at `/plan`; verify by reading the exit round's *Standalone* line
- [x] 2.3 In `.agents/skills/plan/SKILL.md`, have *Finish* end standalone on the link and review line, and widen *Review notes* to a chat message about a waiting plan (bounded explore for only what it opens, then edit, rebuild, print); verify by reading both sections against the delta
- [x] 2.4 In `.agents/skills/improve-code/SKILL.md`, end at the plan's link like any finished plan; verify by `grep -n "finished-plan question" .agents/skills` returning nothing
- [x] 2.5 In `.agents/skills/daily/references/chief.md`, add that a stop at a finished plan's link goes to no bucket and waits for the person, with the no-inbox line; verify by reading *Sort each stop* against the daily-routine delta
- [x] 2.6 In `AGENTS.md` (`CLAUDE.md` links to it), say a request with no verb starts at `/plan`, never stopping at *Plan it?* or naming the step; verify by reading the verbs rule
- [x] 2.7 Add `change-loop`, `mini-apps`, and `ux-wireframes` MODIFIED deltas ending a finished plan on its link and review line with no question, narrow the `asking-the-user` chat-follow-up rule to messages that ask for a change, and say *above any closing question* in `AGENTS.md`; verify by `openspec validate plan-without-asking --strict --no-interactive`

## 3. Wiki

- [x] 3.1 Update `wiki/development/the-change-loop.md` *Just ask*, `wiki/development/daily.md` (the obvious-pick example and the plan stop), `wiki/development/repository-improvement.md`, `wiki/stack/mini-apps.md`, and `wiki/development/reply-links.md` where they name the finished-plan card; verify by `grep -rn "finished-plan question\|Build it now (Recommended)" wiki .agents` returning nothing

## 4. Release and checks

- [x] 4.1 Add a `## Next (minor) — Ask for a change, get a plan to review` entry at the top of `CHANGELOG.md`, no hand step; verify it sits above the newest numbered entry
- [x] 4.2 Run `node scripts/measure-context.mjs --check`, `node scripts/check-payload-links.mjs` and `node .github/scripts/checks.mjs --worktree`; trim skill text in the touched files if the budget fails; verify each passes
