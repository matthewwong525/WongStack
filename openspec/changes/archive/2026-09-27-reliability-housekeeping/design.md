# Design

## Context

See proposal.md — Why. Four independent fixes, one per surface:

- **Run counts.** `run.mjs` starts the headless model with `WONG_MEMORY_RUN=1` and holds `run.lock` in the clone's state folder, so at most one run per clone is live. The model ends with `finish-run --kind capture --status ok --counts '{…}'`, and `finishRun` in `memory.mjs` stores that JSON as given. `digest.mjs`'s `formatRun` prints it as the "Last background capture run" line. `stats` reads consolidation `merged` counts for the embeddings trigger.
- **Distill search.** `/ship` Step 2 runs `show "$CHANGE_NAME"` and `search --branch "$BRANCH"`. `search --branch` joins `sessions.branch`, which is the branch at session start.
- **Link check.** `checkDead` scans only files a target receives. `wong-setup` and `update-dependencies` are in no manifest category, so their links are never read. No link check reads anchors.
- **Adding a skill.** `wiki/development/adding-a-skill.md` lists five steps with no note for a source-only skill.

## Goals / Non-Goals

**Goals:** a run's recorded counts cannot exceed what it stored; distill survives a branch rename with no git history; broken paths and anchors from source-only skills fail CI.

**Non-Goals:** recording a run the model never finishes (the existing failure path in `run.mjs` stays as is); anchor checks for shipped payload files; any change to how `/ship` handles local branches.

## Decisions

### The run keeps a tally file, and `finish-run` records it

`run.mjs`, holding the lock, writes an empty `run-tally.json` in the state folder before it spawns the model and removes it in its `finally`. When `WONG_MEMORY_RUN=1` and the tally file exists, `memory.mjs` adds to it:

- `put-facts`, after a successful store write: by the returned `status` (`captured` or `skipped`), and `added`, `superseded`, `dropped` from `putFacts`'s result. A write with `source: "consolidation"` adds to `merged` (its kept facts) and `consolidationSuperseded` instead.
- `strip`, on `private:` → `private`; on `not recognized:` → `unrecognized`.
- `put-facts --home` adds only `dropped` for a `no home recorded` result, matching the runbook's rule.

`finish-run --kind capture` records the tally's capture counts; `--kind consolidation` records `{ merged, superseded }` from its consolidation counts. `--counts`, when given, is parsed and compared: any key that differs puts `model reported other counts: <keys>` in the run's `reason` (values are counts, never text from a transcript). With no tally file (a hand-run `finish-run`, or an older `run.mjs`), `--counts` is recorded as today, so nothing breaks mid-upgrade.

`formatRun` appends `(the run's own report differed)` to an `ok` line whose reason starts `model reported other counts`.

*Alternative:* count store rows by `sessions.updated_at >= WONG_MEMORY_RUN_STARTED` and `machine`. Rejected: a user's `/save` in another chat on the same machine writes session rows in that window and would be counted. *Alternative:* drop `--counts` from the runbook. Kept it, because the comparison is what exposes a hedging model, and `--status failed --reason` still needs the call.

A spooled write sent in runbook step 1 counts like any `put-facts`: it is work the run did.

### `search --change <slug>` unions session sets

`search` gains `--change <slug>`: facts whose `session_id` is in `SELECT DISTINCT session_id FROM facts WHERE slug = ? AND session_id IS NOT NULL`. With `--branch` too, the session filter is `s.branch = ? OR f.session_id IN (…)`, so one query returns both sets and the existing limit and ranking apply once. The team filter applies as today. `/ship` runs:

```bash
node "$M" show "$CHANGE_NAME"
node "$M" search --branch "$BRANCH" --change "$CHANGE_NAME" --limit 200   # feature branch
node "$M" search --change "$CHANGE_NAME" --limit 200                      # main
```

*Alternative:* old names from `git reflog` (`Branch: renamed refs/heads/A to refs/heads/B`). Rejected: Paseo may rename in another checkout, and a reflog is local.

### Source-only skills are checked against the source tree, anchors included

`check-payload-links.mjs` gains a third check. Source-only skills are the folders under `.agents/skills/` that no manifest category's `skillDirs` lists. For each Markdown file in them, every relative link (code masked, as today) resolves against the working tree: the path must exist, and a `#anchor` on a Markdown target must match one of its headings.

Heading slugs follow GitHub: lowercase, drop characters other than letters, digits, spaces, hyphens, and underscores, spaces to hyphens, and `-1`, `-2` for repeats. `#step-5--the-closing-report` (from `Step 5 — the closing report`) is the case that proves the em dash rule. An anchor on a non-Markdown target, or a link to a directory, checks the path only. A failure prints `file:line -> target` under its own heading, like the other two checks.

*Alternative:* add wong-setup to the target file set. Rejected: it does not ship, and its links to `wiki/` pages a target lacks are correct in the source.

### Adding-a-skill gets one opening note

A short paragraph after the step list's lead-in: a skill that stays in WongStack (today `wong-setup` and `update-dependencies`) does step 1 only; it is not added to `payload-files.json`, no setup surface names it, and its edits need no changelog entry of their own. The manifest guide already lists which skills are source-only, so the note links there instead of restating the list.

## Risks / Trade-offs

- [The model skips `finish-run` entirely] → The tally is discarded with the run and no row is written, as today. Out of scope; the digest keeps showing the previous run.
- [Codex's sandbox writes the tally] → `run.mjs` already grants the state folder as a writable root for Codex.
- [Turning on the source-only check finds broken links today] → Fix them in the same change (task 3.3); none were seen in a survey of about 40 targets.
- [A heading-slug edge case GitHub handles differently, such as emoji] → The slug rule is tested on this repo's real headings; a false failure names the anchor and is fixed by linking the exact slug.

## Migration Plan

No store migration: the `runs` table and its `counts` JSON are unchanged. An installed repo gets the fix on its next `/wong-sync`; a run started by an older `run.mjs` makes no tally file and records as before.
