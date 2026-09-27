# Tasks

## 1. Start from 26.0.0

- [x] 1.1 Once PR #156 is on `main`, bring this branch up to date with it, then reread the lines it changed in `asking-the-user.md`, `save/SKILL.md` §5, and `ship/SKILL.md` Step 6. Verify the three #156 edits listed in design.md are present, or adjust the tasks below to what actually merged.

## 2. The rule

- [x] 2.1 In `.agents/skills/explore/references/asking-the-user.md`, "End every reply with the next step": make the finished plan's choices *Build it now (Recommended) / Review the plan / Stop here*. Verify no other line in the file still lists *change the plan first*.
- [x] 2.2 In the same file, "Print the plan's link": copy the builder's link line as printed. Keep the line above the box. Any closing question in a reply that made or changed a plan offers *Review the plan*; picking it ends the next reply with the link line in plain text, no box, and starts nothing. Remove #156's path-in-question sentence. Verify the section states each point of the delta spec once.
- [x] 2.3 In "The anatomy of an ask", allow a fourth option only for *Review the plan*. Verify the "Two or three options" bullet names the exception.
- [x] 2.4 In `.agents/skills/save/SKILL.md` §5, drop "and it goes in the closing question too" and point to the rule instead. Check `.agents/skills/plan/SKILL.md` Finish and `ship/SKILL.md` Step 6 against the new choices. Verify `grep -rn "change the plan first" .agents AGENTS.md wiki` finds nothing.

## 3. The page builder

- [x] 3.1 In `.agents/skills/plan/scripts/build-review.mjs`, print `Click here to see the plan: [review.html](<absolute path>)` as the second stdout line, wrapping the target in `<…>` when the path has a space or parenthesis. Update the "The builder prints…" sentence in `plan/SKILL.md`.
- [x] 3.2 Update `scripts/tests/review.test.mjs` "both builder aliases" to expect the new line, and add a case for a path with a space. Verify the file's tests pass with `node --test scripts/tests/review.test.mjs`, and let CI run the full suite through `/save`.

## 4. Docs and release

- [x] 4.1 Update the WONG-STACK rule line in `AGENTS.md` ("Print the plan's link…") to name the *Review the plan* choice. Keep `wiki/development/the-change-loop.md` and `wiki/stack/mini-apps.md` consistent where they say *build it now?* Verify each still reads true.
- [x] 4.2 Bump `VERSION` to 26.1.0 (or the next minor after whatever `main` holds) and add a newest-first `CHANGELOG.md` entry in plain words. Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`; verify all pass.
- [x] 4.3 Save with `/save`, and verify CI passes on the pushed branch.
