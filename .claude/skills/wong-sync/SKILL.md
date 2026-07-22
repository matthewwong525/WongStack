---
name: wong-sync
description: Sync this repo with WongStack in one pass — the round trip that replaced the installer's update mode and /contribute-wong-stack. Refreshes a cached WongStack clone, three-way-diffs every payload file against the commit you last synced to, pulls upstream improvements down into the working tree (per-file, batch-approvable), then surfaces your genuinely-local improvements as contribution candidates and — for the ones you approve — opens the upstream PR itself (fork-aware, VERSION + CHANGELOG ritual included). Runs no git in this repo; owns full git in the clone. Use when you want to sync, update, or upgrade WongStack here, pull the latest skills, or contribute/upstream an improvement back.
user-invocable: true
---

# /wong-sync

The WongStack round trip in one pass. `/wong-setup` installs once; from then on this skill keeps the install current **and** keeps WongStack current with you:

```
┌──────────────────────────────────────────────────────────┐
│ 1. Clone    refresh the cached WongStack clone ($WS)     │
│ 2. Classify three-way diff each payload file vs base     │
│ 3. Pull     upstream → here (working tree only, /save)   │
│ 4. Curate   local drift → contribution candidates        │
│ 5. PR       branch in $WS + release ritual + push + PR   │
│ 6. Manifest record the new base commit                   │
└──────────────────────────────────────────────────────────┘
```

Two rules hold throughout:
- **No git in this repo; full git in the clone.** Pulled updates land in the working tree for you to review and `/save` — the branch → PR → CI gate stays the only way changes land here. In `$WS`, this skill owns the whole flow: branch, commit, push, PR, and it never leaves the clone dirty.
- **Only manifest files, ever.** Reads and copies are scoped to [`references/payload-manifest.md`](references/payload-manifest.md) in both directions — app skills, app source, and business docs are never read, so nothing local can leak upstream. Contributing is **opt-in per file**; the default is skip.

## Step 0 — resolve this repo and its manifest

```bash
ROOT="$(git rev-parse --show-toplevel)"
MF="$ROOT/.claude/.wong-stack.json"
```
- **No manifest** → WongStack isn't installed here; stop and point at `/wong-setup`.
- **Seed manifest** (`commit` is null and `version` is null — `/wong-setup` just handed off) → **fresh mode: this sync IS the install.** Same steps, three differences marked ⑂ below: the base is the empty tree, the changelog walk is skipped, and the contribute leg is idle.
- **This repo IS a WongStack source** (`$ROOT/VERSION` exists alongside `$ROOT/.claude/skills/wong-setup/`) → **stop** — the source has nothing to sync with itself.
- Read what the manifest already knows (older manifests may lack any of these — that's fine, they're filled in at Step 6):
```bash
BASE=$(jq -r '.commit // empty' "$MF")
UPSTREAM=$(jq -r '.upstream.repo // "https://github.com/matthewwong525/WongStack"' "$MF")
FORK=$(jq -r '.upstream.fork // empty' "$MF")
WS=$(jq -r '.upstream.clone // empty' "$MF"); WS="${WS/#\~/$HOME}"
```

## Step 1 — refresh the clone (a disposable cache)

The clone lives in the XDG cache and the manifest path is only a hint — missing or broken, re-clone silently; present, bring it clean and current:

```bash
[ -d "$WS/.git" ] || WS="${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack"
[ -d "$WS/.git" ] || git clone "$UPSTREAM" "$WS"     # full clone — history is the diff base
git -C "$WS" fetch origin
DEFAULT=$(git -C "$WS" symbolic-ref --short refs/remotes/origin/HEAD | cut -d/ -f2)
```
**Dirty guard:** if `git -C "$WS" status --porcelain` is non-empty, someone left work in the clone — warn, show what's there, and **ask before resetting**; never discard it unprompted. Once clean:
```bash
git -C "$WS" checkout "$DEFAULT" && git -C "$WS" reset --hard "origin/$DEFAULT"
LATEST=$(cat "$WS/VERSION"); WS_HEAD=$(git -C "$WS" rev-parse HEAD)
```
Show what's new since the installed version: the `$WS/CHANGELOG.md` entries newer than the manifest's `version`. ⑂ Fresh mode: there is no installed version — skip the walk and just state the version being installed (`$LATEST`).

## Step 2 — classify every payload file (three-way)

The file list — and nothing else — comes from [`references/payload-manifest.md`](references/payload-manifest.md). A skill installed under a different local name is diffed under that name via the manifest's `components.skills` mapping; `CLAUDE.md` is compared **block-scoped** — only the content between `WONG-STACK:BEGIN/END` on each side.

With a recorded base (`$BASE`), get each file's base content from history — `git -C "$WS" show "$BASE:<path>"` — and compare base→upstream and base→local:

| upstream vs base | local vs base | classification | behavior |
|---|---|---|---|
| changed | unchanged | **upstream update** | pull down — batch-approvable |
| unchanged | changed | **contribution candidate** | curate in Step 4 |
| changed | changed | **true conflict** | show three-way, ask |
| unchanged | unchanged | in sync | silent |

Only real decisions get surfaced — don't walk the user through files that need none.

**No `$BASE`, real `version`** (an install that predates this skill): say so up front, fall back to a plain two-way walk of local vs `$WS` for this one sync (show each diff, ask keep / take-upstream / candidate), and record `$WS_HEAD` at Step 6 so every later sync is three-way.

⑂ **Fresh mode** (`commit` *and* `version` null): the base is the **empty tree** — the same table, with base content empty for every file. Files absent locally classify as **upstream updates** (the batch-approvable pull *is* the install); files present locally that differ are **true conflicts** — resolve keep-local / take-upstream / **keep under another name**, recording any rename in the manifest's `components.skills`. Contribution candidates cannot occur against an empty base.

## Step 3 — pull leg (upstream → here, no git)

Apply the **upstream updates** to `$ROOT`'s working tree: list them with a one-line summary each and offer batch approval (per-file inspection on request). Walk **true conflicts** one at a time with a three-way view — keep local / take upstream / merge by hand. For `CLAUDE.md`, replace only the marker block; everything outside it is this repo's own. No markers yet (a fresh install, or a file that lost them) → insert the block, markers included, without touching anything outside it — creating the file if it doesn't exist.

No `git add`, no commit, no branch — when the pull leg is done, the updates exist only as working-tree edits. Point the user at `/save` to checkpoint them through the normal gate.

## Step 4 — contribute leg (curate the local drift)

⑂ Fresh mode: skip — nothing can be a contribution candidate on an install; continue at Step 6.

The pull leg just ran, so what's left classified local-only is *genuinely* local — not staleness (drift that already landed upstream self-cancelled in Step 3). For each candidate, write a **one-line generality rationale** answering the real question: *does this belong in every WongStack repo?*

- Generic betterment of a skill, convention, or the block → recommend contributing, rationale attached.
- App-specific or marginal drift → recommend **skip**, and say why. Skip is the default; nothing moves upstream without an explicit yes on that file.

Nothing approved → report and stop after Step 6; the clone stays pristine — no branch, no ritual, no PR.

## Step 5 — branch, release ritual, fork-aware PR (all in `$WS`)

With at least one approved candidate:

1. **Branch:** `git -C "$WS" checkout -b "wong-sync/$(basename "$ROOT")-$(date +%F)"`.
2. **Copy** the approved files into `$WS` (for `CLAUDE.md`, replace only the marker block in `$WS/CLAUDE.md`).
3. **Release ritual, same commit:** bump `$WS/VERSION` (semver — patch for wording, minor for behavior, major for breaking) and add a newest-first `$WS/CHANGELOG.md` entry naming what was contributed and the repo it came from. One commit carries files + VERSION + CHANGELOG.
4. **Push, fork-aware:**
   ```bash
   SLUG=$(gh repo view "$UPSTREAM" --json owner,name -q '.owner.login + "/" + .name')
   CAN_PUSH=$(gh api "repos/$SLUG" --jq '.permissions.push' 2>/dev/null)
   ```
   - `true` (internal team) → push the branch to `origin`, PR directly on upstream.
   - otherwise → fork once and reuse it: `git -C "$WS" remote get-url fork` or `gh repo fork "$SLUG" --clone=false` + `git -C "$WS" remote add fork <fork-url>`; push the branch to `fork`; record the fork URL for Step 6.
5. **PR against upstream:** `gh pr create --repo "$SLUG"` (`--head <forkowner>:<branch>` when forked). The body is the curation output: each contributed file with its generality rationale, plus the version bump.
6. **Leave the clone clean:** `git -C "$WS" checkout "$DEFAULT"` — the branch lives on the remote; the working tree ends pristine.

**Degraded path:** if `gh` is unauthed or the network is down, don't fail the sync — the pull leg's results stand. Leave the committed branch in `$WS`, report its name, and note it just needs a push + `gh pr create` later.

## Step 6 — rewrite the manifest (always last)

Update `.claude/.wong-stack.json` to reflect what actually happened — this is the base the next sync diffs against:

```json
{ "version": "<LATEST>", "commit": "<WS_HEAD>",
  "installedAt": "<existing>", "updatedAt": "<today>",
  "upstream": { "repo": "<UPSTREAM>", "fork": "<fork URL or null>", "clone": "<WS path>" },
  "components": { "skills": ["explore","plan","apply","save","continue","ship","dream","improve","wong-sync"], "claudeMd": true, "docs": true, "openspec": true } }
```

Older manifests just gain the new keys here — nothing breaks on a v1 manifest. Set `commit` to `$WS_HEAD` (pre-contribution HEAD of the default branch); keep `components` matching reality. ⑂ Fresh mode: the seed's null `version`/`commit` are filled with `$LATEST`/`$WS_HEAD` here — keep the seed's `installedAt` and any renames it recorded (plus ones agreed during the pull). If the target still carries a `contribute-wong-stack` skill or symlink, offer to remove it — `/wong-sync` supersedes it.

## Step 7 — report

Pulled (files + one-liners, and that they await `/save`); conflicts and how each resolved; contributed (files + rationales + the PR URL, or the parked branch name on the degraded path); skipped candidates; new manifest `version`/`commit`; fork recorded, if one was created. ⑂ Fresh mode: this report is the install record — version installed, everything pulled, collisions and their resolutions — and control returns to `/wong-setup`'s closing step when it drove the handoff.

## Hard rules

- **No git in this repo.** Pulled updates stay working-tree-only; `/save` is the gate.
- **Full git in the clone, never left dirty.** Contributions ride a pushed branch; the clone ends clean on the default branch. No approvals → the clone is untouched.
- **Manifest files only, both directions.** Nothing outside [`references/payload-manifest.md`](references/payload-manifest.md) is read or copied.
- **Contributions are opt-in per file.** Default skip; rationale shown before asking.
- **Ask before destroying:** a dirty clone is never reset unprompted.
- **Rewrite the manifest last**, reflecting what actually happened.
