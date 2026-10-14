# Tasks

Implementation boxes are ticked on source review. No check runs before group 7; the second pass runs its own in 8.6.

## 1. The rule map

- [x] 1.1 Record the before counts in the Decision log: `node scripts/measure-context.mjs --json` totals and `wc -w` for each scoped file in proposal.md's Impact. Done when the log line lists every scoped file.
- [x] 1.2 Write `rule-map.md` in this change folder by design.md's sort table: one section per scoped file, one row per rule, with its sort, its new home or drop reason, and the evidence (fact number, archive path, or script name). Done when every scoped file has a section and no row lacks a sort.

## 2. Skills

Rewrite each file by its map section and design.md's "Keep what other files hold on to". Done, for each, when every kept row is in the new text, no dropped row is, and linked headings, frontmatter, and code blocks are unchanged.

- [x] 2.1 `apply/SKILL.md` and `apply/references/build-helper.md`, including the new line against ending a turn while a sub-helper or background check runs.
- [x] 2.2 `explore/references/asking-the-user.md`: the ask format and reply endings as goals, with the plan-link and preview-link rules stated once.
- [x] 2.3 `explore/SKILL.md` and `plan/SKILL.md`.
- [x] 2.4 `save/SKILL.md` and the selection-rungs section of `save/references/checkpoint-evidence.md`; each verb's page states the outcome it needs and links the rungs.
- [x] 2.5 `ship/SKILL.md` and `continue/SKILL.md`.
- [x] 2.6 `verify/SKILL.md` and `verify/references/walkthrough.md` §§ a, c, e, f, g; §§ b and d stay byte-identical (`git diff main` shows no hunk inside them).

## 3. One home for repeats

- [x] 3.1 `wiki/development/the-change-loop.md` and any other wiki page the map names: keep the why, link the skill for the how, and remove each repeat. Done when `grep -rn "early requests" .agents/skills wiki` shows the rule at its home only.
- [x] 3.2 `AGENTS.md`: cut the plan-link and just-ask bullets to one orienting line and their link. Done when each bullet links its owner and states no mechanics the owner states.
- [x] 3.3 Add any removed or renamed name to `scripts/retired-names.json`. Done when the map's renamed rows each have an entry, or the log says none was renamed.

## 4. Specs

- [x] 4.1 Write the deltas for `asking-the-user`, `apply`, and `change-loop` by design.md's "Specs: thin by the map". Done when each touched requirement states a promise with one or two scenarios.
- [x] 4.2 Write the deltas for `delivery-gate`, `openspec-workflow`, `staging-walkthrough`, and `multi-part-workspaces` the same way; requirements about scripts, the app, or data are untouched.

## 5. Tests

- [x] 5.1 Remove the sentence-matching assertions named in design.md from `cli-conventions.test.mjs`, `schedule-delivery.test.mjs`, and `document-recall.test.mjs`, keeping each assertion on a command, flag, or link. Add one `Check:` Decision-log bullet per file with its reason.

## 6. Convention and release

- [x] 6.1 Add the convention to `wiki/maintaining/adding-a-skill.md` step 1 and link it from the `measure-context` bullet in `.agents/rules/payload.md`. Done when the page states all three parts and the rule links it.
- [x] 6.2 Add `## Next (minor) — Fewer rules, each with its reason` to `CHANGELOG.md` in plain words, with an **Updating.** note: each changed skill merges into an adapted copy, and no command, flag, or heading changed.
- [x] 6.3 Hand a fresh helper the rule map and `git diff main` for the scoped files, by design.md's "A second reader". Restore what it finds; log each restore.
- [x] 6.4 Write the dropped-rules list for the publish question: one plain line per dropped row, grouped by step, no file names. Record the after counts in the Decision log beside the before counts.

## 7. Final verification

- [x] 7.1 Run `openspec validate fewer-rules-with-reasons --strict --no-interactive` and `node .github/scripts/checks.mjs --worktree` (links, retired names, OpenSpec config, `measure-context --check`, script tests). Repair what this change broke; report the result as local.
- [x] 7.2 Run `DEFAULT_BRANCH=main node .github/scripts/loosened-checks.mjs --worktree` and confirm it exits 0 with the `Check:` bullets from 5.1.

## 8. Second pass: a release is not a cause

- [x] 8.1 Re-sort every `incident` row in `rule-map.md` whose evidence is only a release, by design.md's "Second pass": `incident (on record)` with its fact or log line, `step`, or `no cause` with the covering goal quoted. Done when no `incident` row cites only a release.
- [x] 8.2 Edit the scoped files by the re-sorted map. Done when no newly dropped row is in the text, every covering goal is, and linked headings, frontmatter, and code blocks are unchanged; `walkthrough.md` §§ b and d stay byte-identical.
- [x] 8.3 Update the spec deltas: remove or thin each requirement whose rule was dropped. Done when no delta requires a dropped rule.
- [x] 8.4 Hand a fresh helper the newly dropped rows and `git diff main` for the scoped files, by design.md's "Second pass". Restore what it finds; log each restore.
- [x] 8.5 Rewrite `dropped-rules.md` to list every dropped rule from both passes, one plain line each, grouped by step, with no file names; update the `CHANGELOG.md` entry to match; record the after counts and the new sort totals in the Decision log.
- [x] 8.6 Run `openspec validate fewer-rules-with-reasons --strict --no-interactive`, `node .github/scripts/checks.mjs --worktree`, and `DEFAULT_BRANCH=main node .github/scripts/loosened-checks.mjs --worktree`. Repair what this change broke; report the result as local.
