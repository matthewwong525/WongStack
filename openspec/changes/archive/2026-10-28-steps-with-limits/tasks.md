# Tasks

## 1. Skill text

- [x] 1.1 In `.agents/skills/explore/SKILL.md`, replace *Write nothing* with *change no repo file*, and replace *read-only checks; no prototypes or local builds* with running the repo's tests, scripts and builds and throwaway tries in `.scratch/`, reporting results before any plan, still with no outward action; update the description to match (it counts toward the startup route) and link the change loop's new section. Verify `node scripts/measure-context.mjs --check` passes.
- [x] 1.2 In `.agents/skills/plan/SKILL.md`, add one line: plan changes only plans and wiki pages, and a code change waits for the person's go, linking the change loop's new section; verify `measure-context.mjs --check` passes.

## 2. The change loop page

- [x] 2.1 In `wiki/development/the-change-loop.md`, add a section under *The steps* that owns the table of what each step may change and that every chat starts in plan and only the person moves it past plan; in *Just ask*, say trying something is research done before any plan; change *writes nothing* for `/explore` in *Asking before drafting* and *The steps* to *changes no repo file*. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 2.2 Add a `## Next (minor) — Each step says what it may change` entry to `CHANGELOG.md` with **Updating.** *Nothing to do.*; verify the changelog check in `node .github/scripts/checks.mjs --worktree` passes.

## 3. Verification

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree` and verify it passes.
- [x] 3.2 In a throwaway Paseo chat in this worktree (`wiki/maintaining/test-a-hook.md#with-the-question-box` shows the commands), type `/explore find out how long node --test scripts/tests/ask-check.test.mjs takes` and check that it runs the test, reports the time before any plan, and changes no repo file (`git status` unchanged); record the result in the Decision log, then delete the chat.

## 4. Review fixes

- [x] 4.1 Let plan also save schedules (`schedules/`), so a plain reminder request is done directly: update the proposal's table, wording and Decision log, the change-loop spec delta (with a reminder scenario), the change loop page's table, the plan skill line, and the `CHANGELOG.md` entry; offset added words and bytes with cuts of text another page owns, logged in the Decision log. Verify `node scripts/measure-context.mjs --check` and `node .github/scripts/wiki-links.mjs` pass.
- [x] 4.2 Add MODIFIED delta specs `specs/asking-the-user/spec.md` (*Standalone explore asks in small groups*) and `specs/ux-wireframes/spec.md` (*Explore draws in chat from the same guide*), each carrying the whole requirement and its scenarios, with *write no file* changed to *change no repo file* (throwaway files in the git-ignored `.scratch/` allowed); list both in the proposal's Modified Capabilities.
- [x] 4.3 Rebuild the review page with `node .claude/skills/plan/scripts/build-review.mjs openspec/changes/steps-with-limits --require-current --link`, validate with `openspec validate steps-with-limits --strict --no-interactive`, and rerun the affected local checks.
