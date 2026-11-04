# Tasks

## 1. Setup's last words

- [x] 1.1 In `scripts/employee-bootstrap.mjs` `summary()`, when `project === 'installed'` and `found`, end with the next-step sentence from design §1 (the Paseo wording when `PASEO_AGENT_ID` is set) instead of *Nothing else is needed*; keep every other case as it is. Verify by reading the three summaries in the tests below.
- [x] 1.2 In `scripts/tests/employee-bootstrap.test.mjs`, add cases: a first install names `lesson 1` and the folder, with and without `PASEO_AGENT_ID`; an update (`up to date`) and an apps-only run still end *Nothing else is needed*; a first install whose tools can't find the sign-in names no lesson. Verify with `node --test scripts/tests/employee-bootstrap.test.mjs scripts/tests/employee-project.test.mjs`.

## 2. The lesson skill

- [x] 2.1 Create `.agents/skills/lesson/SKILL.md` (frontmatter `name: lesson`, a description of about 12 words, `user-invocable: true`) with the routing and teaching rules from design §2, linking the two lesson pages by repo-relative path. Verify the description fits with `node scripts/measure-context.mjs --check`; if it does not, cut the same words from another skill's description in this change.
- [x] 2.2 Add `lesson` to `core.skillDirs` in `.agents/skills/wong-sync/references/payload-files.json`. Verify with `node --test scripts/tests/payload-checks.test.mjs`.

## 3. The wiki pages

- [x] 3.1 Write `wiki/development/first-day/README.md` (*A teammate's first day*), `use-skills.md` (Lesson 1, design §3) and `make-a-change.md` (Lesson 2, design §4), in plain words for any assistant, with Paseo steps in words and no pictures.
- [x] 3.2 Link the folder from `wiki/development/README.md`, and add one linking sentence each to `wiki/stack/employee-access.md#add-change-and-remove-people` and `wiki/stack/employee-project.md#install-in-one-step`. Verify each page stays under 3,000 words and the links resolve with `node scripts/check-payload-links.mjs`.

## 4. Specs and release

- [x] 4.1 Add `first-day-lessons` to an area in `.agents/skills/memory/references/areas.json` (paths `.agents/skills/lesson/`, `wiki/development/first-day/`). Verify with `node --test scripts/tests/memory-areas.test.mjs`.
- [x] 4.2 Write a `## Next (minor) — A guided first day for a new teammate` entry at the top of `CHANGELOG.md`, its **Updating.** note saying that teammates who already set up can type `lesson 1` in a new chat. Leave `VERSION` alone.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate first-day-lessons --strict --no-interactive`; both pass.
- [x] 5.2 In a new chat in this checkout, type `lesson 1` and walk the first three steps, then `lesson 3`; confirm it waits after each step and offers the two lessons for `lesson 3`. Record what was seen in the Decision log.
- [x] 5.3 `/save`, and confirm CI passes on the saved change.
