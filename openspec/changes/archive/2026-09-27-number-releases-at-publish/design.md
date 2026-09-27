# Design

## Context

See proposal.md — Why. Today each change raises `VERSION` and adds a `## X.Y.Z — Title` entry while it is built. `merge.sh` (payload, in the `ship` skill) runs `gh pr merge --squash --match-head-commit` with no `--subject`, so GitHub takes the subject from the PR title or a commit message written before any renumbering. `scripts/tag-releases.mjs` (meta-only, run by `release.yml` on each push to `main` and by hand per `.agents/rules/payload.md`) tolerates only HTTP 403. `tag-releases.mjs` already ignores any `## ` heading that is not `## X.Y.Z — Title`, so a `## Next` heading does not disturb it. `VERSION` and `CHANGELOG.md` are not in `payload-files.json`: installed repos have neither, so every new step must be a no-op there.

## Goals / Non-Goals

**Goals:** one number per release, chosen from the default branch at merge time; a merge subject that matches the shipped `VERSION`; an idempotent Release run; one owner for the release steps.

**Non-Goals:** changelog fragments in separate files (the settled answer keeps one `CHANGELOG.md`); a custom merge driver for `CHANGELOG.md`; renumbering history.

## Decisions

### The `## Next` entry

A change adds, at the top of the entries, `## Next (patch|minor|major) — <Title>` and its bullets, and leaves `VERSION` alone. One `## Next` entry per branch; two is an error the script names (a branch carrying two changes must merge them into one entry).

### `number-release.mjs` in the ship skill

`.agents/skills/ship/scripts/number-release.mjs`, Node, `parseCli`-style `--help`, no dependencies. It finds the branch's own entry, not a fixed heading, so a first numbering, a renumber after a stale stop, and a branch cut before this change all take one path:

1. Read `CHANGELOG.md` at `HEAD` and at `origin/<default>` with `git show`. The branch's entry is the one `## Next (...) — ` or `## X.Y.Z — ` heading at `HEAD` whose line is not in the default branch's file. None, or no `CHANGELOG.md` → prints `release=none`, exits 0, touches nothing. This is every installed repo. Two or more → exit 1 naming them.
2. `origin/<default>` not an ancestor of `HEAD` → prints `behind=yes`, exits 3: the default branch must be merged in first. Fetching and merging stay in `/ship`.
3. The level is the heading's `(patch|minor|major)`; for a numbered entry, it is the gap between its version and the newest lower version in the file, so a renumbered 26.2.0 over 26.1.0 stays a minor.
4. Bump the default branch's `VERSION` by that level, write `VERSION`, rewrite the heading to `## X.Y.Z — <Title>`, move the entry above the newest entry if a conflict resolution left it lower, and give every `## ` heading one blank line before it.
5. Print `release=X.Y.Z from=A.B.C`. Exit 1 on an unknown level or a `## Next` entry while the default branch has no `VERSION`.

Alternative: a meta-only `scripts/number-release.mjs` called from `payload.md`. Rejected: `/ship` must run it between the archive and its one checkpoint, and a payload skill can not name a file targets lack.

### `/ship` runs it before the checkpoint

`SKILL.md` Step 3 gains, before invoking `/save`: `git fetch origin main`, then run the script. `release=none` → go on. `behind=yes` → `git merge origin/main` (union of intent on conflicts, the branch's entry on top) and run it again. `release=` → the numbering edit rides in the one checkpoint. Installed repos always get `release=none`, so they see no change.

### `merge.sh`: stale stop and subject

Before `gh pr merge`, `merge.sh` fetches the default branch. When `HEAD:VERSION` exists and differs from `$(git merge-base HEAD origin/<default>):VERSION` (the branch is a release) and `origin/<default>:VERSION` differs from that merge-base version (another release landed), it prints `merged=no` and `stale_version=<default's VERSION>` and exits 1 without merging. `/ship` Step 5 handles that line: merge `origin/main`, run the numbering script again, invoke ordinary `/save`, and rerun `merge.sh` on `SUCCESS` or `NONE`.

The merge passes `--subject "<subject>"`: the PR title (from `gh pr view --json title,number`) with a trailing ` (vX.Y.Z)` removed, then ` (v<HEAD VERSION>)` when the branch is a release, then ` (#<number>)`. A repo with no `VERSION` gets the PR title and number, which is GitHub's own default.

Alternative: rely on the branch being up to date via a ruleset setting. Rejected: it forces a new CI run for every unrelated commit on `main`, and GitHub's check still would not compare versions.

### `tag-releases.mjs`

`create()` returns `'done'` when stderr has `HTTP 422` and `already exists`: the other run won the race, and the Release or tag is there. It logs one line and counts neither as refused nor failed. A `## Next` heading in the `CHANGELOG.md` it reads fails the run with a message saying a release merged unnumbered.

### One owner for release steps

`.agents/rules/payload.md` gets a *Releases* bullet set: write the `## Next` entry, leave `VERSION`, `/ship` numbers it, run `tag-releases.mjs` after the merge when the workflow warned. Every other surface links to it:

- `wiki/development/README.md` keeps one sentence and the link, not the steps.
- `.github/CONTRIBUTING.md` links `payload.md`, not `wiki/contributing.md`.
- `wiki/contributing.md` (payload; can not link a meta-only file) says to add a `## Next` entry and leave `VERSION` alone, links the upstream `payload.md` by GitHub URL, and loses the hand-tagging line.
- `wiki/development/adding-a-skill.md` step 3, `.github/PULL_REQUEST_TEMPLATE.md`, and both `VERSION` lines in `openspec/config.yaml` say the same in a few words and link the rule where they can.

### `payload.md` paths and their test

`paths:` gains `wiki/stack/**`, `wiki/ux-principles.md`, `mini-apps/router*`, `mini-apps/routes*`, `mini-apps/apps/hello/**`, `schema/**`, `AGENTS.md`, and `CLAUDE.md`. New `scripts/tests/payload-rule-paths.test.mjs` reads the rule's frontmatter and `payload-files.json`, expands each category's `files`, `dirs` (as `<dir>/x`), `skillDirs` (as `.claude/skills/<name>/SKILL.md`), and `blocks[].file`, plus `VERSION` and `CHANGELOG.md`, and fails naming each path no glob matches. `seededBySetup` is not payload and is skipped. Globs match with a small `**`/`*` to RegExp converter in the test, not `path.matchesGlob`, which Node 22 still flags experimental.

## Risks / Trade-offs

- [Two branches both add a `## Next` entry at the top, so merging `main` into one conflicts in `CHANGELOG.md`] → The resolution is always the same (keep both, `## Next` on top), and the script restores blank lines the resolution drops.
- [A branch cut before this ships still raises `VERSION`] → The script treats its numbered entry as the branch's own and renumbers it from the gap, so it ships correctly with no hand edit.
- [A level inferred from the gap is wrong when the file's order is broken] → The script only infers for an entry already numbered once; a first numbering always reads the stated level.
- [Someone merges on GitHub's page, skipping `/ship`] → `tag-releases.mjs` fails on the unnumbered entry, so the Releases run goes red on `main`.
- [This change ships under the new flow it builds] → It writes its own `## Next (minor)` entry, and its `/ship` runs from the branch's skill text, so the first numbering is its own.

## Migration Plan

Ships as a minor release. Open branches with a raised `VERSION` need nothing: their `/ship` renumbers them. Rollback is a revert; entries already numbered stay valid.
