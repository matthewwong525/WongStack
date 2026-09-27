# Tasks

## 1. Memory: run counts come from what was stored (script, skill, docs)

- [x] 1.1 `run.mjs`: under the lock, write an empty `run-tally.json` in the state folder before spawning the model and remove it in `finally`; verify with a `memory-capture.test.mjs` case that the file exists during a fake agent run and is gone after
- [x] 1.2 `memory.mjs`: when `WONG_MEMORY_RUN=1` and the tally exists, add to it after a successful `put-facts` (captured or skipped, added, superseded, dropped; `source: "consolidation"` to merged and consolidation superseded; `--home` to dropped only) and after `strip` (private, unrecognized); verify with tests that a hand run without the env var or without the file writes no tally
- [x] 1.3 `finishRun`: with a tally, record its capture or consolidation counts; compare any `--counts` and put `model reported other counts: <keys>` in the reason when they differ; with no tally, record `--counts` as today; verify with tests for the false-success case (tally empty, `--counts` says private 4 → recorded counts empty, reason set) and the no-tally case
- [x] 1.4 `digest.mjs` `formatRun`: append `(the run's own report differed)` to an ok line with that reason; verify with a digest test
- [x] 1.5 `.agents/skills/memory/SKILL.md` runbook steps 3.3 and 4 and `wiki/development/memory.md`: say the script records what it stored and compares the model's counts; verify the runbook still renders in `runbook()` (existing run test)

## 2. Memory search and ship distill (script, skill)

- [x] 2.1 `memory.mjs search`: add `--change <slug>` (sessions that wrote a fact on the slug), unioned with `--branch` in one query; add it to `OPTIONS` and `USAGE`; verify with `memory-store.test.mjs` cases for the renamed-branch scenario, `--change` alone, and the team filter still applying
- [x] 2.2 `.agents/skills/memory/SKILL.md` Read table: list `--change`; verify `node scripts/measure-context.mjs --check` passes
- [x] 2.3 `.agents/skills/ship/SKILL.md` distill: feature branch runs `search --branch "$BRANCH" --change "$CHANGE_NAME"`, main runs `search --change "$CHANGE_NAME"`; verify the text matches the `delivery-gate` delta

## 3. Link check covers source-only skills (script)

- [x] 3.1 `scripts/check-payload-links.mjs`: derive source-only skills as `.agents/skills/*` folders in no category's `skillDirs`; resolve each relative link in their Markdown against the working tree, and check a `#anchor` on a Markdown target against GitHub-style heading slugs (repeats get `-1`, `-2`); report `file:line -> target` under its own heading and exit 1
- [x] 3.2 `scripts/tests/payload-links.test.mjs`: cases for a missing path and a renamed heading from a fixture `wong-setup` (fail), a valid em-dash anchor like `#step-5--the-closing-report` (pass), a repeated heading's `-1` anchor (pass), and a shipped skill's anchor staying unchecked
- [x] 3.3 Run `node scripts/check-payload-links.mjs` here and fix any broken link it finds in `wong-setup` or `update-dependencies`; verify it exits 0

## 4. Adding a skill (wiki)

- [x] 4.1 `wiki/development/adding-a-skill.md`: add the source-only note (step 1 only; no manifest entry, setup surface, or changelog entry of its own), linking the manifest guide's [Not copied](../../../.agents/skills/wong-sync/references/payload-manifest.md#not-copied) section; verify the link check passes

## 5. Release

- [x] 5.1 Add a `## Next (patch) — <Title>` entry to `CHANGELOG.md` covering all four fixes, with an **Updating** note: nothing to do by hand
- [x] 5.2 Run the script tests as `payload.yml` does (lint and the c8-wrapped suite, `TMPDIR=/var/tmp`), `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `openspec validate --specs --strict --no-interactive`, and `node scripts/measure-context.mjs --check`; CI on `/save` confirms
