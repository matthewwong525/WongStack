---
name: contribute-wong-stack
description: Push WongStack improvements made in THIS repo back up into a WongStack clone — the upstream-only inverse of /install-wong-stack. When you've improved a workflow skill, a docs convention, the auto-push hook, or the CLAUDE.md WONG-STACK block while working in a target repo, this diffs only those payload files against a WongStack clone, walks you through each drift (keep / take-from-here / skip), copies the approved ones up, then bumps VERSION + adds a CHANGELOG entry and leaves the clone ready for /save. Never reads or copies app/business-specific files, so nothing local leaks upstream. Use when you want to contribute, upstream, or push a skill/doc/workflow change back to WongStack.
user-invocable: true
---

# /contribute-wong-stack

The **upstream** half of the WongStack round trip. `/install-wong-stack` copies the payload *down* into this repo; `/contribute-wong-stack` pushes your improvements to that payload *back up* into a WongStack clone, so WongStack — the source of truth — never drifts behind its own installs.

```
WongStack  ──/install-wong-stack──▶  this repo   (copy the payload down)
WongStack  ◀──/contribute-wong-stack──  this repo (push improvements back up)
```

**Upstream only.** This skill never modifies the current repo — it only reads it and writes to the WongStack clone. Downstream sync (WongStack → here) stays `/install-wong-stack`'s job. Two rules hold throughout, mirroring the installer:
- **Only manifest files, ever** — the skill reads and copies *only* the WongStack payload files (below). App and business-specific skills, app source, and business docs are never read, so they cannot leak upstream.
- **Per-file, ask then change** — every drifted file is shown as a diff and confirmed before anything is written. Use `AskUserQuestion` if available, else ask in plain text and wait.

## Step 0 — locate the two repos

`ROOT` is **this** repo (the source of improvements); `$WS` is the **WongStack clone** you're contributing to (the destination). Resolve both, and refuse to run if they're the same repo — WongStack can't contribute to itself.

```bash
ROOT="$(git rev-parse --show-toplevel)"          # this repo — the SOURCE of changes
# (a) running as a symlinked skill — the clone is 3 dirs up from this SKILL.md (follow symlinks)
WS=$(cd "$(dirname "$(readlink -f "<this SKILL.md path>")")/../../.." 2>/dev/null && pwd)
# (b) an explicit path was passed (/contribute-wong-stack <path>) — prefer it
[ -n "$ARG_PATH" ] && WS="$ARG_PATH"
# (c) still no usable clone? fall back to a local checkout, cloning if needed
if ! ls "$WS/VERSION" >/dev/null 2>&1; then
  WS="$HOME/src/WongStack"
  [ -d "$WS/.git" ] || git clone https://github.com/matthewwong525/WongStack "$WS"
fi
ls "$WS/VERSION" "$WS/.claude/skills/ship/SKILL.md"   # sanity-check it's really a WongStack clone
```
- If `$WS` resolves to `ROOT` (you're **in** WongStack itself), **stop** — there is nothing to upstream from the source.
- If `$WS` has uncommitted changes (`git -C "$WS" status --porcelain` is non-empty), **warn and confirm** before touching it — the release ritual and the follow-up `/save` want a clean base. Offer to let the user stash/commit in `$WS` first.

Optional: symlink this skill so `/contribute-wong-stack` is a real command in this repo for next time — `ln -sf "$WS/.claude/skills/contribute-wong-stack" ~/.claude/skills/contribute-wong-stack`.

## Step 1 — diff the payload manifest (only these files)

The manifest is exactly the set `/install-wong-stack` copies **into** a target — so it's exactly what can be improved here and flow back. Compare each file in `ROOT` against its counterpart in `$WS`; surface only the ones that differ. **Nothing outside this list is read.**

- **Workflow skills** — `.claude/skills/<name>/` for `explore`, `plan`, `apply`, `save`, `continue`, `ship`, `document`, `improve`. **Never** the meta-skills (`install-wong-stack`, `contribute-wong-stack`) or the generated `openspec-*` skills (those come from `openspec init`, not the payload).
- **Docs conventions** — `docs/wiki-style.md`, `docs/voice.md`, `docs/development/secrets.md`. (Not the rest of `docs/` — that's this repo's own wiki.)
- **CLAUDE.md WONG-STACK block** — only the content between `WONG-STACK:BEGIN` and `WONG-STACK:END`. The "What this is" and every other section are this repo's own and are ignored.
- **Auto-push hook** — `.claude/hooks/auto-push.sh`, only if this repo has it. (The `settings.json` Stop entry is per-repo boilerplate, not payload — don't diff it.)

**Not in the diff:** `VERSION` and `CHANGELOG.md`. The installer never copies those into a target, so this repo's copies aren't WongStack's — they're handled by the release ritual in Step 3, in `$WS` only.

For each differing file, build a clear diff (`diff -u "$WS/<file>" "$ROOT/<file>"`, i.e. *what taking-from-here would change in the clone*). For `CLAUDE.md`, extract and diff just the marker block on each side.

## Step 2 — walk each drift, one file at a time

For every differing manifest file, show the diff and ask which way it should go:
- **take-from-here** → copy `ROOT`'s version into `$WS` (this is the contribution).
- **keep-WongStack** → leave `$WS` as-is (the clone's version wins).
- **skip** → decide later; no change.

Frame each prompt around the real question: *does this improvement belong in **every** WongStack repo?* Generic betterment goes up; a tweak that's really specific to this repo is a keep/skip. Apply approved copies into `$WS` only — for `CLAUDE.md`, replace just the marker block in `$WS`, never the surrounding content.

Track what was actually applied — it drives whether Step 3 runs and what the CHANGELOG entry says.

## Step 3 — release ritual in the clone (only if something changed)

Editing the payload is a release. **If at least one file was copied into `$WS`:**
1. Bump `$WS/VERSION` (semver) — patch for a wording/typo fix, minor for new behavior or a new capability, major for a breaking change to how a skill is used.
2. Add a newest-first entry to `$WS/CHANGELOG.md` naming what was upstreamed and where it came from (this repo).

If **nothing** was approved, make no edits to `$WS` — an inspection-only run leaves the clone pristine.

## Step 4 — hand off (no git here)

This skill does **not** commit, push, branch, or open a PR — the WongStack skills own git. Leave `$WS` as a dirty working tree and tell the user to finish there:

> Changes are staged in your WongStack clone at `$WS`. Switch to it and run `/save` (then `/ship`) to open the PR and land the release.

Report: which files were upstreamed (take-from-here), which were kept/skipped, the new `$WS` VERSION, and the one-line CHANGELOG summary.

## Hard rules
- **Upstream only, manifest only.** Never write to `ROOT`; never read or copy a file outside the manifest in Step 1.
- **Refuse to run against the source.** `$WS == ROOT` → stop.
- **Per-file confirmation.** No file moves upstream without an explicit take-from-here.
- **No git.** Leave `$WS` dirty for `/save`; never commit or push.
