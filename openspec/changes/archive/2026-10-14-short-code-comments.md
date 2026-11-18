<!-- openspec-archive v1 2026-10-14-short-code-comments -->
<!-- file proposal.md utf8 10640 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 7368 -->
# Design

## Context

See proposal.md for why. Three lint runs exist: `app/` and `site/` each read their own `.oxlintrc.json`; the script lint step in `scripts/payload-checks.mjs` runs oxlint 1.86.0 with no config over `scripts`, `.agents/skills/*/scripts`, `.agents/skills/*/worker` and `.github/scripts`. `app/.oxlintrc.json` already loads a JS plugin (`@shadcn/lint`). Oxlint has no built-in rule for comment length.

Counted 2026-10-14 as runs of lines starting with `//`, `/*` or `*`, outside the generated `app/worker-configuration.d.ts`: 2,356 runs of one line, 369 of two, 94 of three, 116 of four, 87 of five, 99 of six or more; about 5,800 comment lines in about 285 files. No file uses `@type {`, `@typedef`, `v8 ignore` or `c8 ignore`; 264 `@param`/`@returns` lines.

## Goals / Non-Goals

**Goals:** one rule file, three registrations, no comment over two lines outside the exceptions, no rule silently lost, short helpful comments untouched.

**Non-Goals:** a check that judges helpfulness; linting shell, YAML, SQL, JSONC or Markdown code samples; checking an install's scripts outside `app/`, which no install lints today.

## Decisions

1. **The rule is an oxlint JS plugin in one file, `scripts/lint-comment-length.mjs`, rules `max-comment-lines` (limit 2) and `max-comment-width` (limit 120), each limit an option.** It reads `context.sourceCode.getAllComments()`, joins comments whose lines are consecutive with only whitespace between into one run, and reports a run spanning more than the limit at its first line. The width rule measures each source line a counted comment touches, from column one, and reports a line over the limit only when a comment is on it, so code alone is never flagged; 136 lines exceed 120 today. Probed 2026-10-14 against oxlint 1.86.0 in a temp folder: that call returned line, block, doc, JSX and shebang comments with locations, and nothing for `//` inside a string or template. Alternative: a standalone script with its own parser. Rejected: `typescript` 7 has no stable scanner API here and a second parser is a new dependency, while oxlint is installed in all three places. The file sits in `scripts/` because the app already runs shipped scripts from there (`check-app-keys.mjs`), and it joins the pack in `payload-files.json`.
2. **Never counted, by fixed patterns.** A run holding `@license`, `SPDX-License-Identifier` or `Copyright`; and single comments a tool reads, which also do not join a run: shebang, `@vitest-environment`, `/// <reference`, `@ts-expect-error`/`@ts-ignore`/`@ts-nocheck`, `oxlint-disable*`/`eslint-disable*`, `v8`/`c8`/`istanbul ignore`, `jscpd:ignore-*`, `prettier-ignore`. Suppressions stay governed by `loosened-checks.mjs`.
3. **Two exemptions, for this rule only.** `app/src/components/ui/**` (written by `npx shadcn add`, left as written) and `app/worker-configuration.d.ts` (rewritten by `wrangler types`). Confirm at apply whether oxlint already ignores the second; if so, add nothing.
4. **Registrations.** `app/.oxlintrc.json` and `site/.oxlintrc.json` add the plugin path and the rule as `error`. The script lint step gets `scripts/tests/.oxlintrc.json` (meta-only) holding only the plugin and the rule, passed with `-c`; the workflow step changes with it, since a script test fails when the two disagree. Lint output for existing rules must be unchanged before and after the config appears.
5. **Cleanup is judgment by fresh readers, borrowed from pstack's `/no-comments`.** One helper per area (`app/src`; `app/worker` and `app/tests`; `scripts`; `.agents/skills`; `.github/scripts` and `site`) reads every comment and edits comments only:
   - *Short and says what the code can not* (why, a constraint, an outside-tool gotcha): leave it.
   - *Restates the code, a section heading, usage text a `USAGE` string repeats, a `@param`/`@returns` list that adds no meaning:* remove.
   - *Long or wide and helpful:* cut to two lines of at most 120 characters.
   - *Long and states a rule about our code* ("must run before", "do not remove", "keep in step with"): write the test when it fits the file's existing test in about 15 lines, or a rename or extract inside one file that makes the note needless; keep at most a two-line pointer.
   - *Long fact about an outside tool or platform that will help a future task:* one line on the owning wiki page, by the repeatable-knowledge rule; keep at most a two-line pointer.
   - *Long, and none of the above fits in two lines:* one row in `openspec/changes/short-code-comments/removed-reasons.md` (file, symbol, the reason in one line), then cut or remove. It archives with the change.
   No fixer: shortening needs a reader. A helper never splits a long comment with blank lines or code to pass the rule.
6. **Only comments change, and that is checked.** After the helpers finish, compile each touched file before and after with the bundler the app already has, comments dropped, and compare; the only differences allowed are the renames and extracts logged under decision 5. The comparison script is throwaway and deleted before save.
7. **Proof.** The `lint` gate in `scripts/check-app-checks.mjs` gains a sample with a three-line comment that must be caught as `max-comment-lines` and one with a 130-character comment line caught as `max-comment-width`, and copies the rule file to where the temp app's config finds it. `scripts/tests/` gains a test of the rule file: a three-line block, three single lines in a row, two lines passing, two two-line comments split by code passing, a 121-character comment line failing, a 120-character one passing, a 130-character code line passing, each never-counted pattern, and `//` in a string.
8. **Installs.** The `CHANGELOG.md` entry is `major`. Its Updating note, in plain words: after the update, the check fails on any comment over two lines in your app's code; the assistant shortens each one, turns any that stated a rule into a test, and lists what it removed. `/wong-sync` needs no change; the note becomes a sync-plan to-do.
9. **Telling the assistant.** `.agents/rules/code.md` gains one rule under *Write less code*: comment only what the code can not say, why and not what, two lines at most; a longer reason is a test, a name, or a wiki line; a comment goes stale and no check reads it. `wiki/stack/mini-apps.md` names the rule beside the other lint rules. Comments in `.oxlintrc.json` and other settings files are not covered.

## Risks / Trade-offs

- [Two-line filler passes the check] → accepted: the cleanup removes today's, and the coding rule covers new ones; the user chose length only.
- [A helper removes a comment the user would have kept] → helpers leave any short comment they are unsure of; removals of rule-stating text are listed.
- [A test reads a source comment as a marker] → before editing, search tests for patterns matched against comment text and repoint them.
- [Removed lines shift a line number a test pins] → the full suite runs after the cleanup; fix the pin.
- [JS plugins are alpha in oxlint 1.86] → the app already depends on one; the rule's own test and the proof fail if a version stops reporting comments.
- [Six open pull requests and one workspace conflict] → each takes `main`, keeps its own code, and shortens its own long comments.
- [The script coverage floor] → the rule file is covered by its test, so the floor holds.

<!-- end design.md -->
<!-- file tasks.md utf8 2883 -->
# Tasks

## 1. The rule

- [x] 1.1 Write `scripts/lint-comment-length.mjs` as an oxlint JS plugin by design decisions 1 and 2; verify by running it on a sample file and seeing a three-line comment and a 121-character comment line reported with file and line, and a two-line one not.
- [x] 1.2 Write `scripts/tests/lint-comment-length.test.mjs` with the cases in design decision 7; verify the test file lists a case for each.

## 2. Cleanup by fresh readers

- [x] 2.1 Search tests for patterns matched against comment text and repoint them; verify by listing the search and its hits in the Decision log.
- [x] 2.2 Start one fresh helper per area (design decision 5) to judge and edit comments; verify each returns counts kept, cut, removed, and its rows for `removed-reasons.md`.
- [x] 2.3 Write the tests and one-file renames the helpers flagged as cheap, beside the code they guard; verify each new test names the rule it replaces.
- [x] 2.4 Add outside-tool facts to their owning wiki pages; verify each added line links its source file.
- [x] 2.5 Write `openspec/changes/short-code-comments/removed-reasons.md` from the helpers' rows; verify every helper's rows are in it.
- [x] 2.6 Compare each touched file's compiled output before and after (design decision 6), then delete the comparison script; verify the only differences are the logged renames and extracts.

## 3. Registrations and proof

- [x] 3.1 Register the rule in `app/.oxlintrc.json` with the two exemptions in design decision 3; verify a three-line comment added to an app file is reported and one in `src/components/ui/` is not.
- [x] 3.2 Register the rule in `site/.oxlintrc.json`; verify a three-line comment added to a site file is reported.
- [x] 3.3 Add `scripts/tests/.oxlintrc.json`, pass it in the lint step of `scripts/payload-checks.mjs` and `.github/workflows/payload.yml`; verify the lint step's other findings are unchanged.
- [x] 3.4 Add the long-comment sample to the `lint` gate in `scripts/check-app-checks.mjs` and copy the rule file for the temp app; verify the samples' entries name `max-comment-lines` and `max-comment-width`.

## 4. Docs and release

- [x] 4.1 Add the comment rule to `.agents/rules/code.md` and name it in `wiki/stack/mini-apps.md`; verify both link the rule file.
- [x] 4.2 Add `scripts/lint-comment-length.mjs` to `payload-files.json` and the payload manifest; verify the file appears once in each.
- [x] 4.3 Write the `## Next (major)` entry at the top of `CHANGELOG.md` with the Updating note from design decision 8; verify the note reads in plain words.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and fix what fails; verify its last line is `LOCAL_CHECKS=pass`.
- [x] 5.2 Run the landing page's `npm test`; verify it exits zero.
- [x] 5.3 Run `openspec validate "short-code-comments" --strict --no-interactive`; verify it passes.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 1377 -->
# Spec Delta

## ADDED Requirements

### Requirement: The app's comments stay short

The scaffold's `npm test` SHALL fail on a comment longer than two lines, or a comment line wider than 120 characters, in the app's JavaScript or TypeScript and SHALL name the file and line. A code line SHALL have no width limit from this rule. Comment lines with no code between them SHALL count as one comment. A comment of one or two lines SHALL pass. A license header and a comment a tool reads SHALL never be counted. Files a command writes into the app, the ready-made parts folder and the generated binding types, SHALL be exempt from this rule and from no other because of it. The scaffold SHALL pass the rule as shipped. An update that delivers the rule SHALL tell the install how to bring its own comments in range.

#### Scenario: A long note is added

- **WHEN** a commit adds a three-line comment, as one block or as three single lines in a row, to an app source or test file
- **THEN** `npm test` exits non-zero and names the file and line

#### Scenario: A wide note is added

- **WHEN** a commit adds a one-line comment 130 characters wide to an app source file
- **THEN** `npm test` exits non-zero and names the file and line

#### Scenario: A short note is added

- **WHEN** a commit adds a two-line comment to an app source file
- **THEN** `npm test` reports nothing for it

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/landing-site/spec.md utf8 509 -->
# Spec Delta

## ADDED Requirements

### Requirement: The landing page's comments stay short

The landing page's checks SHALL fail on a comment longer than two lines, or a comment line wider than 120 characters, in its JavaScript or TypeScript, under the same rule and the same exceptions as the scaffold.

#### Scenario: A long note is added to the landing page

- **WHEN** a change adds a three-line comment to a landing page source file
- **THEN** the landing page's checks fail and name the file and line

<!-- end specs/landing-site/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 787 -->
# Spec Delta

## ADDED Requirements

### Requirement: WongStack's scripts keep comments short

Every JavaScript file the payload checks lint SHALL fail the checks when it holds a comment longer than two lines or a comment line wider than 120 characters, under the same rule and the same exceptions as the scaffold. The checks SHALL prove the rule still fails on a bad sample whenever the proof runs.

#### Scenario: A long comment in a helper script

- **WHEN** a change adds a three-line comment to a script under `scripts/` or a skill's `scripts/` folder
- **THEN** the payload checks fail and name the file and line

#### Scenario: The rule stops being read

- **WHEN** a settings change leaves the comment-length rule unregistered
- **THEN** the proof fails and names the lint check

<!-- end specs/payload-checks/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-14

~~~
<!-- end .openspec.yaml -->
<!-- file removed-reasons.md utf8 26112 -->
# What the comment cleanup dropped

Each row is a long comment that could not keep everything it said in two lines. It names the file, the nearest name in the code, and what was dropped and why that is safe. Helpers changed comments only; the code is the same before and after.

## `.github/scripts` and `site`

114 comments kept as they were, 33 cut, 0 removed, in 19 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `.github/scripts/checks.mjs` | file header | The prose on the skill check, type regeneration, when the proof and the install-shaped test run, and the `--worktree` install and lock. Each is restated at its own function (`skillCheck`, `regenerateTypes`, `proofWanted`, `targetWanted`, `ensureInstalled`, `takeTurn`), in `USAGE`, and in `wiki/development/the-change-loop.md#the-gate`. |
| `.github/scripts/checks.mjs` | file header | The `LOCAL_CHECKS=` values and exit codes 0, 1 and 7. The code (`NO_TOOLS = 7`, `localChecks`) shows them, and the gate page now holds them. |
| `.github/scripts/checks.mjs` | `regenerateTypes` | "A pack from before `--types` skips it; the script skips a repo with no wrangler config." The one-line body shows the first; the second belongs to `cf-build.sh`. |
| `.github/scripts/loosened-checks.mjs` | file header | The why, the list of what is flagged, and how a `Check:` bullet explains a file. `wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason` holds them; the usage lines repeated `USAGE`. |
| `.github/scripts/loosened-checks.mjs` | file header | The exit codes and "an empty `--base` prints why and exits 0". Both are plain in the main block. |
| `.github/scripts/loosened-checks.mjs` | `SELF` | "This script is never read for markers, because it names every marker." The constant carries it. |
| `.github/scripts/wiki-links.mjs` | file header | The list of what the check enforces (`wiki/wiki-style.md` owns it) and the usage line. |
| `site/src/apps.tsx` | file header | "(read 2026-09-27)", a one-off date. |
| `site/src/install.ts` | file header | The list of what the file holds and "this is the one file to edit". `wiki/maintaining/landing-page.md` says both. |
| `site/src/install.ts` | `STEPS` | "The second shows the message." It restates the object. |
| `site/src/install.ts` | `AGENTS` | "As the README links them." |
| `site/src/Rotator.tsx` | file header | "The headline names only what the install steps name." A test in `App.test.tsx` asserts it. |

## `app/src`

349 comments kept as they were, 61 cut, 0 removed, in 32 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `app/src/apps/access/App.tsx` | `App` | "Connecting an assistant is Home's card." `ConnectDialog.tsx` and `AppList.tsx` say it. |
| `app/src/apps/access/Confirm.tsx` | `Confirm` | "The action is the one solid button" and "keyboard goes back after answering". `App.test.tsx`, `Roles.test.tsx` and `Leaving.test.tsx` assert both. |
| `app/src/apps/access/LevelChoice.tsx` | `LevelChoice` | The look: one row that wraps, a dot marks the current one, words in bold. `style.test.ts` asserts it. |
| `app/src/apps/access/Notices.tsx` | `Notices` | The detail of each notice. The JSX, `Roles.test.tsx` and `App.test.tsx` show it. |
| `app/src/apps/access/Page.tsx` | `Page` | The layout walk-through. `Leaving.test.tsx` and `style.test.ts` cover each point. |
| `app/src/apps/access/People.tsx` | `People` | "You and Manager sit beside the email" and "last cell counts apps and keys". `App.test.tsx` and `PersonPage.test.tsx` assert them. |
| `app/src/apps/access/RowMenu.tsx` | `RowMenu` | How the menu closes and moves. That is the ready-made menu part's own behaviour, asserted in `App.test.tsx`. |
| `app/src/apps/access/SetFields.tsx` | `SetFields` | "A ticked app does everything it was built to do", and where the step sits. The screen text and `PersonPage.test.tsx` carry them. |
| `app/src/apps/access/SetFields.tsx` | `NextStep` | Folded "on the live app the owner asks their assistant to finish" into "the owner copies a request". |
| `app/src/apps/access/style.test.ts` | file header | The pointer to `src/style.test.ts` for the "no CSS file" check. That file's header says it. |
| `app/src/apps/access/Table.tsx` | `Table` | "`actions` names a last column of row menus, for a screen reader alone." `App.test.tsx` asserts it. |
| `app/src/apps/access/Table.tsx` | `Row` | "No box goes round it" and "the row says so under the pointer". `style.test.ts` covers the first; the second is a visible class. |
| `app/src/apps/access/View.tsx` | `View` | How each tab is marked. The `TAB` comment and `style.test.ts` say it. |
| `app/src/apps/hello/App.tsx` | `App` | "The page takes the whole shared frame." Visible in the classes and checked in `src/style.test.ts`. |
| `app/src/components/AssistantSetup.tsx` | `Steps` | "Copy is the one solid button" and who gets the whole project. `AssistantSetup.test.tsx` asserts both. |
| `app/src/components/AssistantSetup.tsx` | `AssistantSetup` | What the heading and the line under it say, and the try-again branch. `AssistantSetup.test.tsx` covers both. |
| `app/src/components/ConnectDialog.tsx` | `ConnectDialog` | How the popup closes. That is the dialog part's own behaviour, tested in `App.test.tsx`. |
| `app/src/lib/access.ts` | `statusSchema` | Nine lines explaining each field (`settled`, `role`, `apps`, `unticked`, `alone`, `setup`, `saved`, `direct`). The two rules and the `project` fallback stay. The largest loss in this area. |

## `app/worker`, `app/tests` and the app's config files

550 comments kept as they were, 71 cut, 1 removed, in 32 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `app/worker/employee-access/catalogue.ts` | `appTitle` | Removed "A built app's title": it restates the name. |
| `app/worker/access.ts` | file header | The 26-line essay on why to verify the signed assertion, and the table of claims for a person and a service token. The pointer keeps the rule; `wiki/stack/cloudflare-access.md` now holds the rest. |
| `app/worker/keys.ts` | `Forward` | The notes on `base`, `secret`, `header`, `prefix` and `headers`. The names say it and `problem()` in `api/forward.ts` enforces it. |
| `app/worker/keys.ts` | `keys` | The commented-out Notion example. `wiki/stack/company-api.md#use-a-key-directly` holds one. |
| `app/worker/employee-access/members.ts` | `accessStatus` | The `viewer` and `apps` field notes. |
| `app/worker/employee-access/start.ts` | `startPermissions` | "A preview starts with no import and no provider call." `management.ts` and `login-management.ts` say it at their `core.live` checks. |
| `app/worker/employee-access/core.ts` | file header | "No private pin exists." `core.test.ts` says it. |
| `app/worker/apps/hello/api.ts` | file header | What a handler is given. The `AppHandler` type shows it. |
| `app/worker/access.test.ts` | the verified-assertions tests | How the key pair is served and signed. The `beforeAll` code shows it. |

## `scripts` (outside `scripts/tests`)

180 comments kept as they were, 77 cut, 10 removed (all bare section headings), in 21 files. `scripts/employee-bootstrap.mjs` was put back as it was: its bytes are pinned, so its four long comments stay and the rule skips that one file.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `scripts/cf-secrets.mjs` | file header | A 57-line essay on `.env` and `.dev.vars`, what `check` compares and what `shared` reports. `wiki/stack/staging-bindings.md` owns it. |
| `scripts/cf-secrets.mjs` | section headings | Seven bare headings. |
| `scripts/cf-secrets.mjs` | `checkBindings` | The aside on the adoption steps. "Not a failure" stays. |
| `scripts/check-payload-links.mjs` | file header | Four "why this check" essays. `.agents/rules/payload.md` and `wiki/maintaining/repo-layout.md#linking` cover them. |
| `scripts/check-payload-links.mjs` | `TARGET_PROVIDED` | The story of an earlier wrong exemption. History; the rule stays. |
| `scripts/check-payload-links.mjs` | section headings | Three bare headings. |
| `scripts/lib-wrangler-config.mjs` | file header | Why a pattern can not read the config. The tests cover it. |
| `scripts/lib-wrangler-config.mjs` | `deployedWorkerName` | Why the two names are read from different files. The tests cover the behaviour. |
| `scripts/lib-wrangler-config.mjs` | command block | The command list. The `COMMANDS` object and the usage text hold it. |
| `scripts/check-runner/pipeline.mjs` | file header | The table of which stage holds which credential, and the retry rules. `wiki/stack/artifacts-route.md` and `check-runner.test.mjs` hold them. |
| `scripts/check-target-app.mjs` | file header | The six-step walk-through, exit codes and usage. `USAGE` and `wiki/maintaining/test-a-setup-change.md` hold them. |
| `scripts/check-openspec-config.mjs` | file header | The story of the release that shipped an unreadable config. `.agents/rules/payload.md` tells it. |
| `scripts/check-app-checks.mjs` | file header | How the throwaway folder is built, exit codes, usage. The code and `USAGE` say it. |
| `scripts/check-skill-actions.mjs` | file header | Every failure and exemption, exit codes, usage. `wiki/stack/company-api.md` owns the rule; `USAGE` the rest. |
| `scripts/check-app-keys.mjs` | file header | Where a key may be listed, exit codes, usage. Same owner. |
| `scripts/check-retired-names.mjs` | file header | The history. `.agents/rules/payload.md` has it. |
| `scripts/payload-checks.mjs` | file header | Docs-only scoping, output format, exit codes. `USAGE` and the rules file hold them. |
| `scripts/measure-sessions.mjs` | file header | The glossary of counted terms. `wiki/maintaining/measure-session-speed.md` and `USAGE` hold it. |
| `scripts/reset-staging-d1.mjs` | file header | Usage. It now points at `wiki/stack/d1-pipeline.md#seeded-staging-production-untouched`. |
| `scripts/fixtures/verify-eval/site.mjs` | file header | The list of five planted mistakes. `key.json` and the tests in `verify-eval.test.mjs` name each. |
| `scripts/tag-releases.mjs` | file header | How a rerun fills gaps. The comment on `create` keeps the two refusals. |
| `scripts/eval-verify.mjs` | file header | The counts and the temp-folder note. A test covers both. |

## `scripts/tests`

598 comments kept as they were, 68 cut, 79 removed (all bare section headings), in 52 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `scripts/tests/fixtures/fake-camofox-server.mjs` | file header | The 12-line list of control files. Each is named where the file reads it. |
| `scripts/tests/fixtures/fake-view-tools.mjs` | file header | What each fake tool does and its control files. The fake scripts show it. |
| `scripts/tests/fixtures/fake-view-tools.mjs` | `upgrade` | What each returned method does. The bodies are short. |
| `scripts/tests/fixtures/cloudflare.mjs` | `fakeCloudflare` | The 17-line list of options and `state` fields. Each is read by one handler, and the tests that set them say why. |
| `scripts/tests/fixtures/fake-tunnel.mjs` | file header | The three kinds `fakePaseo` takes. They are one visible line in the function. |
| `scripts/tests/fixtures/pack.mjs` | `pack` | What leaving out `config` does, and what `subdir` is for. |
| `scripts/tests/hand-over.test.mjs` | `fixture` | What `set`, `unset`, `checkout` and `view` do. Each has its own line. |
| `scripts/tests/provision.test.mjs` | `fakeTools` | The shape of `ran` and the list of git commands. The body lists them. |
| `scripts/tests/tools-on-path.test.mjs` | file header | The two shipped texts under test and why each child starts clean. `wiki/development/required-tools.md` now holds the reason. |
| `scripts/tests/install-cost.test.mjs` | file header | "Reads three files and installs nothing", and how the guide came to disagree. |
| `scripts/tests/other-work.test.mjs` | `setup` | Each worktree's state, squeezed to a word or two. The setup code shows it. |
| `scripts/tests/ship-publish-artifacts.test.mjs` | `FAKE_GIT` | "No env name here is one the scripts set themselves." |
| `scripts/tests/check-runner.test.mjs` | `standIn` | "With the step it was chained from." |

## `.agents/skills`: `hand-over`, `wong-setup`, `browser`

264 comments kept as they were, 112 cut, 36 removed (35 bare section headings, one that restated `report()`), in 18 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `.agents/skills/browser/scripts/browse.mjs` | file header | The usage block (in `USAGE`) and the essay on install, server start, tabs, login results and test settings. The code, each function's comment and `wiki/development/required-tools.md` say it. |
| `.agents/skills/hand-over/scripts/hand-over.mjs` | file header | 94 lines: usage, each mode's walk-through, the result lines and test settings. `USAGE`, each mode's own file, and `wiki/development/browsing.md`, `live-view.md` and `secrets.md` cover it. |
| `.agents/skills/hand-over/scripts/hand-over.mjs` | `report` | The list of lines printed. The six print lines show it. |
| `.agents/skills/hand-over/scripts/hand-over.mjs` | `servePage`, `openView`, `keyConfig` | What each returns. The code shows it. |
| `.agents/skills/hand-over/scripts/form.mjs` | file header | The form file's shape, limits and routes. `LIMITS`, `FORM_FAULTS`, `BOX_FAULTS` and `form.test.mjs` state them. |
| `.agents/skills/hand-over/scripts/form-page.mjs`, `keys-page.mjs`, `passwords-page.mjs`, `view-page.mjs` | file headers | Screen-by-screen descriptions. The page tests describe the same behaviour. |
| `.agents/skills/hand-over/scripts/keys.mjs` | file header | The contracts and limits of `resolveKeys`, `checkGuide` and the routes. `LIMITS`, `GUIDE_FAULTS` and each function's comment hold them. |
| `.agents/skills/hand-over/scripts/keys.mjs` | `keyRoutes`, `resolveKeys` | Notes on `closesAt`, `fetch` and the returned shape. |
| `.agents/skills/hand-over/scripts/lib/tunnel.mjs`, `lib/wake.mjs` | file headers | The names of the test settings. Each is read a few lines below. |
| `.agents/skills/hand-over/scripts/lib/ws-bridge.mjs` | file header | The status codes and frame handling. `refusal()` and `takeFrames()` show them; `ws-bridge.test.mjs` covers them. |
| `.agents/skills/hand-over/scripts/passwords.mjs` | file header | The save request's shape, limits and naming rule. `LIMITS`, `chooseName` and `checkLogins` carry them. |
| `.agents/skills/hand-over/scripts/reply-link.mjs` | file header | Usage, routes and limits. It points to `wiki/development/reply-links.md`. |
| `.agents/skills/hand-over/scripts/view.mjs` | file header | A 41-line tour. The two tool gotchas moved to `startSource` and `pageWindows`, and to `wiki/development/required-tools.md`. |
| `.agents/skills/hand-over/scripts/view.mjs` | `liveView` | The parameter notes. The sums are in `fitted()` and `measureBar`. |
| `.agents/skills/wong-setup/scripts/provision.mjs` | file header | The command line and the notes on the Artifacts route and the token. `USAGE` says them. |
| `.agents/skills/wong-setup/scripts/provision.mjs` | `widen` | "Later Access probes get one try each." The loop shows it. |
| `.agents/skills/wong-setup/scripts/provision.mjs` | `wranglerConfig` | Which lines are dropped from the config. Two `dropLines` calls do exactly that. |
| `.agents/skills/wong-setup/scripts/provision.mjs` | `provision`, `accessSetup`, `artifactsDelivery`, `projectCode`, `setVar`, `closeOpenConfig` | Step lists. The bodies read in the same order. |
| `.agents/skills/wong-setup/scripts/lib/cloudflare.mjs` | `scopedToken`, `installRunner`, `widenBy` | Parameter notes. |
| `.agents/skills/wong-setup/scripts/private-access.mjs` | `workerKey` | "`policies` builds the key's permissions" and the stored fields. |

## `.agents/skills`: the other skills

About 440 comments kept as they were, 82 cut, 40 removed (38 bare section headings, 2 folded into the comment beside them), in 38 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `.agents/skills/dream-memory/scripts/dream.mjs` | file header | Usage, the fact format, output columns, drift rules, exit codes. `USAGE`, the skill's own steps and the comments on `isShipped`, `stalePaths` and `planDrift` hold them. |
| `.agents/skills/explore/scripts/other-work.mjs` | file header | Usage, what counts as live work, the output shape, exit codes. `USAGE`, `isLive`, `foldPullRequests` and `savedBranches` say it. |
| `.agents/skills/memory/scripts/before-edit.mjs` | file header | "Eight lines at most, once per area per session", and the silent cases. The code states the limits. |
| `.agents/skills/memory/scripts/lib/digest.mjs` | `buildDigest` | Notes on `personal` and `admin`, and detail of the ranking. |
| `.agents/skills/memory/scripts/lib/links.mjs` | `linksIn`, `checkWiki` | The field-by-field description and the full list of problems. |
| `.agents/skills/memory/scripts/lib/primary-root.mjs` | file header | The usage line and "skills import this by path". |
| `.agents/skills/memory/scripts/lib/upkeep.mjs` | file header | The 30-day figure. It is a constant in the code. |
| `.agents/skills/memory/scripts/memory.mjs` | `NOT_TYPED` | The line of flags. The comments on `partsText` and `chatParts` cover it. |
| `.agents/skills/memory/scripts/memory.mjs` | `migrate` | Why migrations go round the Worker. The `openStore` comment keeps it. |
| `.agents/skills/memory/worker/memory-worker.mjs` | file header | Where key hashes live and who manages grants. The comments on `KEYS_GUARD` and `findGrant` say it. |
| `.agents/skills/memory/worker/statements.mjs` | file header | "`owner` is the ownership parameter; author fields are attribution only." |
| `.agents/skills/save/scripts/artifacts-credential.mjs` | file header | The git config example, the install command, the cache path and its one-day life. The comments on `helperConfig`, `install` and `cacheFile` cover them. |
| `.agents/skills/save/scripts/artifacts-run.mjs` | file header | What each command does, the restart rules, where the token comes from. |
| `.agents/skills/save/scripts/artifacts-run.mjs` | `verdict` | When a pass needs a preview address, and what counts as cut off. |
| `.agents/skills/save/scripts/checkpoint.mjs` | file header | Usage, printed keys, and the table of exit codes 0 to 6. The codes now show only at each `Stop(code, …)` call. One of the two largest losses. |
| `.agents/skills/save/scripts/delivery-route.mjs` | file header | Usage and the exact test. `ARTIFACTS_HOST`, `routeOf` and `wiki/stack/artifacts-route.md` hold it. |
| `.agents/skills/schedule/scripts/lib/paseo.mjs` | file header | The exit codes. The `EXIT` constant below is the same list. |
| `.agents/skills/schedule/scripts/presets.mjs` | file header | How the home folder is found, the safe write, output shape, exit codes. |
| `.agents/skills/schedule/scripts/tidy.mjs` | file header | 31 lines: what each command does (`USAGE`), the ownership tests (`ownWorkspace`, `orphanPids`, `isOldTemp`), exit codes. |
| `.agents/skills/schedule/scripts/workspace.mjs` | file header | Exit codes, what the new agent copies, and why the rename follows. `wiki/development/required-tools.md` now holds the two Paseo quirks. |
| `.agents/skills/ship/scripts/number-release.mjs` | file header | Usage and output lines. `USAGE` and the inline comments hold them. |
| `.agents/skills/ship/scripts/ship.mjs` | file header | 37 lines: the steps of `prepare` and `finish`, printed keys, and the table of exit codes 0 to 7. The codes now show only at each `Stop(code, …)` call. One of the two largest losses. |
| `.agents/skills/ship/scripts/worktree-secrets.mjs` | file header | What each command does and the three-way compare. `classify`, `loadBase` and `wiki/development/secrets.md` hold it. |
| `.agents/skills/update-dependencies/scripts/update.mjs` | file header | "Node built-ins." |
| `.agents/skills/verify/scripts/verify-journeys.mjs` | file header | The file format, command descriptions, the four result words. `wiki/development/kept-checks.md` has the result words. |
| `.agents/skills/verify/worker/walk-pictures.mjs` | file header | Who hands this the bucket. The comment on `handleWalkPictures` covers it. |
| `.agents/skills/wong-sync/scripts/merge-check.mjs` | file header | "The report names where to look, never file bodies." |

## Rules that became tests

Two long comments that stated a rule had no test, and a short one fit:

- `scripts/tests/cf-secrets.test.mjs`, *check with no wrangler config, or a config with no staging section, skips and passes*: replaces the notes in `scripts/cf-secrets.mjs`.
- `scripts/tests/provision.test.mjs`, *the read-only look-up key holds no write permission and no data store*: replaces the note on `CLOUDFLARE_READ_KEY`.

Every other rule the helpers found already had a test, among them: `scripts/tests/landing-site.test.mjs` and `install-cost.test.mjs` for the install message and its cost; `app/worker/access.test.ts` for sign-in failing closed; `app/worker/apps/index.test.ts`, `keys.test.ts` and `screenless.test.ts` for what a mini app is handed; `scripts/tests/wrangler-config.test.mjs` and `check-runner.test.mjs` for the scripts; `scripts/tests/view.test.mjs` for the screen source's flags and the viewer's version; `scripts/tests/payload-checks.test.mjs` for the step list staying in step with the workflow.

Left without a test, and still stated in a short comment, because a test would not fit in about 15 lines: only `browse.mjs`'s `login` reads a saved password; only `passwords.mjs` writes the logins file; `wake.mjs` is the one place that names the chat host's wake command; `view-page.html` loads the viewer before its script.

No rename or extract was made: the code is unchanged.

## Facts moved to the wiki

- `wiki/development/the-change-loop.md`: the last line and exit 7 of the local checks, from `.github/scripts/checks.mjs`.
- `wiki/stack/cloudflare-access.md`: no email header for a service token, and rotating signing keys, from `app/worker/access.ts`.
- `wiki/stack/artifacts-route.md`: a long output losing its ending, a finished run with an error flag, and the storage key's two halves.
- `wiki/stack/cloudflare-credentials.md`: a widened token refused for a short while.
- `wiki/development/required-tools.md`: the two screen-tool gotchas, the clean shell a path test needs, and two Paseo quirks.
- `wiki/development/live-view.md`: the 5-minute idle close, and the secret sent as the WebSocket subprotocol.

## After main's ten releases were merged in

Main's releases 40.6.0 to 41.2.1 brought back long comments in 50 files: the ones it rewrote where this change had cut them, and the ones in its new files. Each was cut to two lines by the same rules. No comment was removed whole, and the code is main's, byte for byte once comments are taken out.

| File | Comment | What was dropped |
|---|---|---|
| `.agents/skills/save/scripts/app-change.mjs` | file header | The eight commands, the two answer shapes, and exit codes 0, 1 and 2. `USAGE` lists the commands; the codes show at each `return`. |
| `.agents/skills/save/scripts/app-change.mjs` | `waitRows` | That a pass needs the same finished list on two reads, more than skipped rows, and a `guard` row. `scripts/tests/app-change.test.mjs` holds each. |
| `.agents/skills/save/scripts/checkpoint.mjs` | file header | Cut again as before, now with the paragraph on a copy installed through the app. `wiki/stack/employee-project.md` owns it. |
| `.agents/skills/save/scripts/delivery-route.mjs` | file header | Why the app's address is asked before the record: the record is the owner's and names where the project is kept. |
| `.agents/skills/ship/scripts/ship.mjs` | file header | Cut again as before, now with exit code 8: this copy saves through the app and never publishes. It shows at its `Stop(8, …)` call. |
| `.agents/skills/shop/scripts/shop.mjs` | file header | 41 lines: the install and its fingerprint, the allow-list, what is hidden from an answer, the `pay` steps, the printed `SHOP_` lines, and the exit codes. `.agents/skills/shop/SKILL.md` and `USAGE` hold what the assistant acts on. The largest loss of this round. |
| `.agents/skills/verify/scripts/verify-journeys.mjs` | file header, `replay`, `install` | Cut again as before, now with the second-site paragraph. `wiki/development/kept-checks.md` owns it. |
| `.agents/skills/verify/scripts/kept-promises.mjs` | file header | Which script does what with a kept check. |
| `.agents/skills/wong-setup/scripts/provision.mjs` | `wranglerConfig`, `addCodeBinding`, `codeInConfig`, `projectCode` | The bucket binding and cron details, and the GitHub-or-Cloudflare walk of `projectCode`. `wiki/stack/employee-project.md` and `scripts/tests/provision.test.mjs` hold them. |
| `.github/scripts/loosened-checks.mjs` | file header | 44 lines: what is flagged and how a reason is written. `wiki/development/loosened-checks.md`, new on main, owns it; the header now links there. |
| `scripts/check-target-app.mjs` | file header | Cut again as before. `wiki/maintaining/test-a-setup-change.md` owns the steps. |
| `scripts/tests/*.test.mjs` (six files) | headers and notes | Detail of the stand-ins that the stand-in code shows. |
| `app/src/apps/access/*.tsx` (15 files) | component notes | Cut again as before, with *Admin* in place of *manager*: how each part looks and behaves, which its tests assert. |
| `app/src/lib/access.ts` | `statusSchema` | The field glossary, cut again as before; `projectSave` is named in the two lines kept. |
| `app/worker/employee-access/*.ts` (14 files) | one-line notes over 120 characters | Nothing: each was split into two lines, or lost a few words. |
| `app/worker/keys.ts` | the commented-out example keys | The five-line Notion example. The comment links `wiki/stack/company-api.md#use-a-key-directly`, which shows it. |

One code line changed shape and not meaning: in `checkpoint.mjs` an empty `if` body that held a comment on a 138-character line now holds it on its own line.

<!-- end removed-reasons.md -->
<!-- file review.html utf8 58261 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-14-short-code-comments</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.2); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:#fff; border:1px solid var(--line); border-radius:4px; font-size:14px; font-weight:600; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
</head>
<body data-change="2026-10-14-short-code-comments">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-14-short-code-comments</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Long comments in the code go stale, and nothing notices when one stops being true. A short note that says why is worth keeping; an essay is better held by a test, a clearer name, or a wiki page.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A check fails when a comment runs longer than two lines, or a comment line runs wider than 120 characters.</b> Code lines have no width limit. It covers all JavaScript and TypeScript: the app, the website, and every helper script. It names the file and the line. A short, helpful comment still passes. Shell scripts, workflow files and database files are left alone.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">     BEFORE              AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">any comment passes   1-2 lines ─▶ passes</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">                     3 or more ─▶ +fails,</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">                                   names the line</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">                     a line over 120</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">                     characters ─▶ +fails</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A license header and the lines tools read are never counted.</b> The first line that makes a script runnable, test and type setup lines, and a line that switches one check off.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>One cleanup of today's comments, by fresh readers.</b> Of about 3,100 comments, about 400 run three lines or more. Each long one is cut to two lines when it helps; when it states a rule it becomes a test where that is cheap; a fact about an outside tool moves to the wiki; the rest are listed in this plan's folder and removed. Short ones that only repeat what the code says go too. Short, helpful ones stay as they are.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">comment ─▶ short and helpful? ─▶ stays</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">               │ no</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">               ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">          long but helpful? ─▶ cut to 2</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">               │ no</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">               ▼</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">          states a rule? ─▶ a test</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">               │ no</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">               ▼</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">          listed, removed</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>BREAKING: every install gets the check at its next update.</b> An install's app code fails the check while it holds a long comment, so the update shortens or removes those and lists any that stated a rule.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The assistant is told how to comment.</b> The coding rules say: only when the code can not say it, why and not what, two lines at most.</div></div></li>
</ol>
<p class="aside">Non-goals: banning comments; judging helpfulness in the check; comments in shell scripts, workflow files, database files, settings files and Markdown; adopting pstack's reviewer as a skill.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked how comments should be handled after reading pstack's <code>/no-comments</code> → chose a strict check with a pstack-style cleanup. Superseded the same day by the two answers below.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked whether the plan prevents comments; the user wrote &quot;if it's genuinely helpful and short we should still keep it&quot; → chose a check on long comments only, with fresh readers judging helpfulness once in the cleanup.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked how long a kept comment may be → chose two lines.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked which files the rule covers → chose all JavaScript and TypeScript; shell, workflow and database files are left alone.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked whether installs get the check → chose yes, everyone, as a breaking release.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked how to handle the clash with six open pull requests and one workspace → chose keep going here; each other change shortens its comments when it next takes <code>main</code>.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: a license header and comments a tool reads are not counted, because a header is long by nature and the others are settings, not notes.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: a run of comment lines with no code between them counts as one comment, because splitting an essay into single lines would otherwise pass.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: <code>@param</code> and <code>@returns</code> blocks are judged like any comment, because no tool here reads types from them; most run past two lines and are cut or removed.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the machine-written types file and the folder of ready-made parts are skipped, because a command writes both and the next run would put long comments back.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked whether the check also limits how wide a comment line may be → chose 120 characters, for comment lines only; 136 of today's lines are wider.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: pstack's reviewer is not added as a skill, because outside ideas are folded in, not adopted whole, and the check holds the length rule.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>app/.oxlintrc.json</code> registers the comment-length rule as an error and skips <code>src/components/ui/**</code> and <code>worker-configuration.d.ts</code> for that rule only, because a command writes those files. No existing rule changes.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>site/.oxlintrc.json</code> registers the comment-length rule as an error. No existing rule changes.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: the script lint step in <code>scripts/payload-checks.mjs</code> and <code>.github/workflows/payload.yml</code> reads a new config that adds the comment-length rule, because the step had no config to carry it. Every rule it ran before still runs.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>scripts/check-app-checks.mjs</code> gains bad samples holding a three-line comment and an over-wide comment line, and copies the rule file beside the settings, so the proof covers the new rule.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: the scripts under <code>.github/scripts/</code> have comments shortened or removed and nothing else, because the new rule covers them.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Searched tests for patterns matched against comment text, with <code>grep -rnE</code> for <code>//</code>, <code>/*</code> and escaped <code>\/\/</code> inside quotes and patterns under <code>scripts/</code>, <code>app/</code>, <code>site/src/</code>, the skills' scripts and <code>.github/scripts/</code> → five hits, all in <code>scripts/tests/provision.test.mjs</code> (lines 146, 762, 1013, 1801, 1832, plus 1839) and <code>provision.mjs</code> (341, 342), and all match comments in <code>wrangler.jsonc</code>, a settings file the rule does not cover. Nothing to repoint.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Found at build: <code>app/worker-configuration.d.ts</code> opens with <code>/* eslint-disable */</code>, which oxlint obeys, so it needs no exemption of its own; only <code>src/components/ui/**</code> is named in <code>app/.oxlintrc.json</code>.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Found at build: oxlint also reads <code>scripts/tests/.oxlintrc.json</code> by itself for files in that folder; the lint step passes it with <code>-c</code> so every linted folder gets the rule.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Cleanup result: 3,166 comments before, 3,000 after: 2,496 kept as they were, 504 cut to two lines, 166 removed (163 bare section headings, one that restated a name, two folded into the comment beside them). Seven fresh readers, since <code>scripts</code> and the skills were each split in two. Their rows are in <code>removed-reasons.md</code>.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Compared every touched file's compiled output before and after with the app's bundler, comments dropped: 214 files, six differ: the four the tasks name (<code>scripts/check-app-checks.mjs</code>, <code>scripts/payload-checks.mjs</code> and their two tests) and the two test files that gained a test (<code>cf-secrets.test.mjs</code>, <code>provision.test.mjs</code>). No rename or extract was made.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: where a removed section heading left two blank lines, one was dropped, because a doubled gap is noise and the compiled output is the same.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>.github/scripts/check-settings.mjs</code> has comments shortened and nothing else, because the new rule covers it.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>.github/scripts/checks.mjs</code> has comments shortened and nothing else, because the new rule covers it.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>.github/scripts/loosened-checks.mjs</code> has comments shortened and nothing else, because the new rule covers it.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>.github/scripts/test-file.mjs</code> has comments shortened and nothing else, because the new rule covers it.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>.github/scripts/wiki-links.mjs</code> has comments shortened and nothing else, because the new rule covers it.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>app/vitest.config.ts</code> has comments shortened and nothing else, because the new rule covers it. No setting changes.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>scripts/lint-comment-length.mjs</code> is the new rule. It names the comments that switch a check off only to leave them uncounted; it switches nothing off.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>scripts/tests/lint-comment-length.test.mjs</code> is the new rule's test. Its samples hold skip comments as text, to prove the rule leaves them uncounted; none of them acts on a real check.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>scripts/tests/.oxlintrc.json</code> is new. It adds the comment-length rule to the script lint step and exempts no file: the exemption first built for <code>scripts/employee-bootstrap.mjs</code> went when release 41.3.0 removed the fingerprint that pinned its bytes, and its comments were shortened like the rest.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Main's releases 40.6.0 to 41.2.1 were merged in. Where both sides touched a file, main's code was taken and its comments cut again by the same rules: 108 comments in 50 files, none removed. Compared with main, comments taken out, only the six files this change edits on purpose differ. <code>removed-reasons.md</code> lists what was dropped.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Archive checkpoint: release 41.3.0 was merged in too; its four clashing files took main's code, and 27 long comments it brought were cut by the same rules. The exit-code tables in <code>ship.mjs</code> and <code>checkpoint.mjs</code> and the field glossary in <code>app/src/lib/access.ts</code> stay removed, listed in <code>removed-reasons.md</code>, for the owner to restore if wanted.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
