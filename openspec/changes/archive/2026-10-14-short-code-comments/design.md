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
