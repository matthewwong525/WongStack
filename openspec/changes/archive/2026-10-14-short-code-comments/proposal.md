# Short comments only

**Status:** ready-to-ship
**Branch:** remove-comments-lint
**Open questions:** none

## Why

Long comments in the code go stale, and nothing notices when one stops being true. A short note that says why is worth keeping; an essay is better held by a test, a clearer name, or a wiki page.

## What Changes

- **A check fails when a comment runs longer than two lines, or a comment line runs wider than 120 characters.** Code lines have no width limit. It covers all JavaScript and TypeScript: the app, the website, and every helper script. It names the file and the line. A short, helpful comment still passes. Shell scripts, workflow files and database files are left alone.
  ```text
       BEFORE              AFTER
  any comment passes   1-2 lines ─▶ passes
                       3 or more ─▶ +fails,
                                     names the line
                       a line over 120
                       characters ─▶ +fails
  ```
- **A license header and the lines tools read are never counted.** The first line that makes a script runnable, test and type setup lines, and a line that switches one check off.
- **One cleanup of today's comments, by fresh readers.** Of about 3,100 comments, about 400 run three lines or more. Each long one is cut to two lines when it helps; when it states a rule it becomes a test where that is cheap; a fact about an outside tool moves to the wiki; the rest are listed in this plan's folder and removed. Short ones that only repeat what the code says go too. Short, helpful ones stay as they are.
  ```text
  comment ─▶ short and helpful? ─▶ stays
                 │ no
                 ▼
            long but helpful? ─▶ cut to 2
                 │ no
                 ▼
            states a rule? ─▶ a test
                 │ no
                 ▼
            listed, removed
  ```
- **BREAKING: every install gets the check at its next update.** An install's app code fails the check while it holds a long comment, so the update shortens or removes those and lists any that stated a rule.
- **The assistant is told how to comment.** The coding rules say: only when the code can not say it, why and not what, two lines at most.

Non-goals: banning comments; judging helpfulness in the check; comments in shell scripts, workflow files, database files, settings files and Markdown; adopting pstack's reviewer as a skill.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-scaffold`: `npm test` also fails on a comment longer than two lines, or a comment line wider than 120 characters, in the app's code.
- `payload-checks`: WongStack's own scripts also fail on one.
- `landing-site`: the landing page's checks also fail on one.

## Impact

Branch: `remove-comments-lint`.

One lint rule file under `scripts/`, shipped with the pack and registered in `app/.oxlintrc.json`, `site/.oxlintrc.json`, and a new config for the script lint step in `scripts/payload-checks.mjs` and the Payload checks workflow. Comment edits across `app/`, `site/`, `scripts/`, `.agents/skills/*/scripts`, `.agents/skills/*/worker` and `.github/scripts/`. A new bad sample in `scripts/check-app-checks.mjs`. Edits to `.agents/rules/code.md`, `wiki/stack/mini-apps.md`, the payload file list and manifest, and a `major` entry in `CHANGELOG.md`. No runtime dependency. Six open pull requests (#375, #374, #347, #328, #291, #233) and the `installation-owned-memory-devices` workspace touch the same files and will need their long comments shortened when they next take `main`.

## Decision log

- **2026-10-14** — Asked how comments should be handled after reading pstack's `/no-comments` → chose a strict check with a pstack-style cleanup. Superseded the same day by the two answers below.
- **2026-10-14** — Asked whether the plan prevents comments; the user wrote "if it's genuinely helpful and short we should still keep it" → chose a check on long comments only, with fresh readers judging helpfulness once in the cleanup.
- **2026-10-14** — Asked how long a kept comment may be → chose two lines.
- **2026-10-14** — Asked which files the rule covers → chose all JavaScript and TypeScript; shell, workflow and database files are left alone.
- **2026-10-14** — Asked whether installs get the check → chose yes, everyone, as a breaking release.
- **2026-10-14** — Asked how to handle the clash with six open pull requests and one workspace → chose keep going here; each other change shortens its comments when it next takes `main`.
- **2026-10-14** — Assumed: a license header and comments a tool reads are not counted, because a header is long by nature and the others are settings, not notes.
- **2026-10-14** — Assumed: a run of comment lines with no code between them counts as one comment, because splitting an essay into single lines would otherwise pass.
- **2026-10-14** — Assumed: `@param` and `@returns` blocks are judged like any comment, because no tool here reads types from them; most run past two lines and are cut or removed.
- **2026-10-14** — Assumed: the machine-written types file and the folder of ready-made parts are skipped, because a command writes both and the next run would put long comments back.
- **2026-10-14** — Asked whether the check also limits how wide a comment line may be → chose 120 characters, for comment lines only; 136 of today's lines are wider.
- **2026-10-14** — Assumed: pstack's reviewer is not added as a skill, because outside ideas are folded in, not adopted whole, and the check holds the length rule.
- **2026-10-14** — Check: `app/.oxlintrc.json` registers the comment-length rule as an error and skips `src/components/ui/**` and `worker-configuration.d.ts` for that rule only, because a command writes those files. No existing rule changes.
- **2026-10-14** — Check: `site/.oxlintrc.json` registers the comment-length rule as an error. No existing rule changes.
- **2026-10-14** — Check: the script lint step in `scripts/payload-checks.mjs` and `.github/workflows/payload.yml` reads a new config that adds the comment-length rule, because the step had no config to carry it. Every rule it ran before still runs.
- **2026-10-14** — Check: `scripts/check-app-checks.mjs` gains bad samples holding a three-line comment and an over-wide comment line, and copies the rule file beside the settings, so the proof covers the new rule.
- **2026-10-14** — Check: the scripts under `.github/scripts/` have comments shortened or removed and nothing else, because the new rule covers them.
- **2026-10-14** — Searched tests for patterns matched against comment text, with `grep -rnE` for `//`, `/*` and escaped `\/\/` inside quotes and patterns under `scripts/`, `app/`, `site/src/`, the skills' scripts and `.github/scripts/` → five hits, all in `scripts/tests/provision.test.mjs` (lines 146, 762, 1013, 1801, 1832, plus 1839) and `provision.mjs` (341, 342), and all match comments in `wrangler.jsonc`, a settings file the rule does not cover. Nothing to repoint.
- **2026-10-14** — Found at build: `app/worker-configuration.d.ts` opens with `/* eslint-disable */`, which oxlint obeys, so it needs no exemption of its own; only `src/components/ui/**` is named in `app/.oxlintrc.json`.
- **2026-10-14** — Found at build: oxlint also reads `scripts/tests/.oxlintrc.json` by itself for files in that folder; the lint step passes it with `-c` so every linted folder gets the rule.
- **2026-10-14** — Cleanup result: 3,166 comments before, 3,000 after: 2,496 kept as they were, 504 cut to two lines, 166 removed (163 bare section headings, one that restated a name, two folded into the comment beside them). Seven fresh readers, since `scripts` and the skills were each split in two. Their rows are in `removed-reasons.md`.
- **2026-10-14** — Compared every touched file's compiled output before and after with the app's bundler, comments dropped: 214 files, six differ: the four the tasks name (`scripts/check-app-checks.mjs`, `scripts/payload-checks.mjs` and their two tests) and the two test files that gained a test (`cf-secrets.test.mjs`, `provision.test.mjs`). No rename or extract was made.
- **2026-10-14** — Assumed: where a removed section heading left two blank lines, one was dropped, because a doubled gap is noise and the compiled output is the same.
- **2026-10-14** — Check: `.github/scripts/check-settings.mjs` has comments shortened and nothing else, because the new rule covers it.
- **2026-10-14** — Check: `.github/scripts/checks.mjs` has comments shortened and nothing else, because the new rule covers it.
- **2026-10-14** — Check: `.github/scripts/loosened-checks.mjs` has comments shortened and nothing else, because the new rule covers it.
- **2026-10-14** — Check: `.github/scripts/test-file.mjs` has comments shortened and nothing else, because the new rule covers it.
- **2026-10-14** — Check: `.github/scripts/wiki-links.mjs` has comments shortened and nothing else, because the new rule covers it.
- **2026-10-14** — Check: `app/vitest.config.ts` has comments shortened and nothing else, because the new rule covers it. No setting changes.
- **2026-10-14** — Check: `scripts/lint-comment-length.mjs` is the new rule. It names the comments that switch a check off only to leave them uncounted; it switches nothing off.
- **2026-10-14** — Check: `scripts/tests/lint-comment-length.test.mjs` is the new rule's test. Its samples hold skip comments as text, to prove the rule leaves them uncounted; none of them acts on a real check.
- **2026-10-14** — Check: `scripts/tests/.oxlintrc.json` is new. It adds the comment-length rule to the script lint step and exempts no file: the exemption first built for `scripts/employee-bootstrap.mjs` went when release 41.3.0 removed the fingerprint that pinned its bytes, and its comments were shortened like the rest.
- **2026-10-14** — Main's releases 40.6.0 to 41.2.1 were merged in. Where both sides touched a file, main's code was taken and its comments cut again by the same rules: 108 comments in 50 files, none removed. Compared with main, comments taken out, only the six files this change edits on purpose differ. `removed-reasons.md` lists what was dropped.
- **2026-10-14** — Archive checkpoint: release 41.3.0 was merged in too; its four clashing files took main's code, and 27 long comments it brought were cut by the same rules. The exit-code tables in `ship.mjs` and `checkpoint.mjs` and the field glossary in `app/src/lib/access.ts` stay removed, listed in `removed-reasons.md`, for the owner to restore if wanted.
