# Tasks

## 1. The script

- [x] 1.1 Write `.agents/skills/dream/scripts/dream.mjs` with `since` and `pages` by design Decision 2, and `scripts/tests/dream.test.mjs`: no earlier dream, an earlier dream fact, a page shipped by file, a page shipped by folder, an own page, and the longest-unchecked order. Done when the test file is written and reads correctly against the design.

## 2. The skill

- [x] 2.1 Write the *Placing a fact on a page* section of `wiki/development/wiki-dream.md` by design Decision 4, linking `wiki/wiki-style.md` for the rule and holding no second copy of it. Done when each of the trial's four faults in `trial.md` maps to one line in the section.
- [x] 2.2 Write `.agents/skills/dream/SKILL.md` by design Decision 3: frontmatter with a one-line description and `user-invocable: true`, the eight steps, and `--dry-run`. Done when every scenario in `specs/wiki-dream/spec.md` is covered by a step.
- [x] 2.3 In `.agents/skills/close/SKILL.md`, link `wiki/development/wiki-dream.md#placing-a-fact-on-a-page` from *Update the wiki* in place of the inline rule, adding no words. Done when the close skill's word count has not grown.

- [x] 2.4 Add the memory tidy-up as the dream's second step, linking the memory skill's consolidation procedure without copying it, and say so on `wiki/development/wiki-dream.md`, in `memory.md`'s Consolidation section, and in the changelog entry. Done when `node scripts/measure-context.mjs --check` passes and the wiki check passes.

## 3. Pages

- [x] 3.1 Write `wiki/development/wiki-dream.md` and link it from `wiki/development/README.md`, `wiki/development/memory.md`'s Consolidation section, and `/close`'s bullet in `wiki/development/the-change-loop.md`. Done when the page opens with a title and a sentence and each of the three pages links it.

## 4. Payload and release

- [x] 4.1 Add `dream` to `core.skillDirs` in `payload-files.json`, one line to the payload manifest, the skill folder and the `wiki-dream` spec to `areas.json`, and `/dream` to the verb list in `AGENTS.md`. Done when each file names it once.
- [x] 4.2 Add the `## Next (minor)` entry to `CHANGELOG.md` with the Updating note from design Decision 5. Done when the entry is at the top of the entries.
- [x] 4.3 Run `node scripts/measure-context.mjs --check` and, if it reports an `ISSUE:`, cut words in the dream's own files first. Done when it passes.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree`, which includes the script tests, the wiki check, the payload links, and the context cap, and fix what it finds. Done when it passes.
- [x] 5.2 Acceptance: run `/dream --dry-run` in this repo and read its edits against `trial.md`: the person page gains the lasting preferences and none of the product decisions, no interpretation is stated as a preference, no private name appears, every own page is re-checked, and shipped-page discrepancies are listed and not edited. Record the result in `trial.md`. Done when the dry run meets each point, or the fault is fixed in *Placing a fact on a page* and the run repeated.
