# Tasks

## 1. `/close` and the save step

- [x] 1.1 `close/SKILL.md`: drop *Update the wiki* and every wiki mention in the routes and report; keep discard, keep (invoke the save skill), and wrap; the description says it keeps unfinished work and closes the workspace.
- [x] 1.2 `save/SKILL.md`: the no-repo-file line says there is nothing to save in the repo, with no memory mention.
- [x] 1.3 `save/scripts/render-pr-body.mjs`: footer reads *pick it up with `/apply <name>`*; update `checkpoint-helpers.test.mjs` and `checkpoint.test.mjs` to match.
- [x] 1.4 `save/references/preconditions.md` and `checkpoint-evidence.md`: `/continue` → `/apply`'s pick-up.

## 2. `/continue` folds into `/apply`

- [x] 2.1 Move `continue/scripts/pickup.mjs` to `apply/scripts/pickup.mjs`; update `.agents/daily/profile.mjs`, `scripts/tests/pickup.test.mjs` (paths, and the "switches only through pickup.mjs" test now reads `apply/references/pick-up.md`), and `scripts/tests/cli-conventions.test.mjs`.
- [x] 2.2 Write `apply/references/pick-up.md` from `continue/SKILL.md` steps 2–4 with no memory: resolve name or PR to a branch, switch only through `pickup.mjs` with its exit handling, the busy-workspace ask, and the recap with drift counts.
- [x] 2.3 `apply/SKILL.md`: the pick-up rung (a named change or PR not on this branch → `pick-up.md`, then build unless a review was needed or an instruction says otherwise); the no-change menu (`openspec list` plus `otherWork` saved branches).
- [x] 2.4 Delete `.agents/plugins/loop/skills/continue/` and the `.claude/skills/continue` and `.agents/skills/continue` links; drop its line from `payload-files.json`.

## 3. No memory in the loop

- [x] 3.1 `explore/SKILL.md`: remove *Search memory before asking*; bounded step 2 checks other work only.
- [x] 3.2 `plan/references/new-workspace.md`: next work comes from this conversation only; the unattended case names other parts in its report; `/continue` mentions point to `/apply`'s pick-up.
- [x] 3.3 `loop/README.md`: seven commands, `/apply <name>` to pick up, and no memory sentence.
- [x] 3.4 Confirm `grep -rn "memory.mjs\|skills/memory\|plugins/memory\|\.\./memory/" .agents/plugins/loop` finds nothing but the kept-equal copy comments in `scripts/lib/`.

## 4. Names, profiles, and docs

- [x] 4.1 `.agents/memory/profile.mjs` drops the `continue` step; `.agents/memory/areas.json`'s `continue` area points at the pick-up files; `.agents/loop/step-title.mjs` and `scripts/tests/step-title.test.mjs` drop `/continue`; `context-measurement.test.mjs` and `install-path.test.mjs` drop `continue`.
- [x] 4.2 `.agents/plugins/memory/references/writing-facts.md`: `/continue` → `/apply`.
- [x] 4.3 `scripts/retired-names.json`: retire `` `/continue `` and `skills/continue/`, with replacements, allowing only the frozen fixtures that must keep them.
- [x] 4.4 `AGENTS.md` verb list; `wiki/wiki-style.md` (`/close` no longer catches facts); `wiki/development/the-change-loop.md` (diagram, steps, verbs for any work, `/apply` vs pick-up, the record section); `wiki/development/memory.md` (verbs read memory → memory's hooks bring facts; `/close` reads none); `wiki/development/README.md`; `wiki/agent-knowledge-center.md`; `wiki/stack/employee-project.md`; `wiki/stack/artifacts-route.md`; `wiki/development/first-day/make-a-change.md`.
- [x] 4.5 Add `## Next (major) — The build loop stands on its own` at the top of `CHANGELOG.md`, with the Updating note from design decision 9.

## 5. Checks

- [x] 5.1 Re-record the context baseline with `node scripts/measure-context.mjs`, then run `node scripts/check-retired-names.mjs`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/measure-context.mjs --check`, and `node .github/scripts/checks.mjs --worktree`.
- [x] 5.2 In a scratch copy with no `.claude/skills/memory/`, run `/apply <a saved change>` from another branch and `/close` with an uncommitted edit: the first switches and recaps, the second saves and closes, and neither mentions memory.
