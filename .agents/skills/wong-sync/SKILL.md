---
name: wong-sync
description: Bring this repo up to date with WongStack — the updater that replaced the installer's update mode and /contribute-wong-stack. Refreshes a cached WongStack clone, copies in any payload file this repo doesn't have yet, and then *adapts* rather than overwrites: two subagents map what WongStack lets you do and what this repo already does, and the gap becomes an OpenSpec change proposing what's worth adopting, in this repo's own terms. Every verdict — adopted or not — lands in .claude/wong-sync-verdicts.md, where ticking a box overrules the call on the next run. It never modifies a file it didn't generate and never opens a pull request. Use when you want to sync, update, or upgrade WongStack here, pull the latest skills, see what upstream has that this repo could take, or change what a previous sync decided.
user-invocable: true
---

# /wong-sync

Brings this repo up to date with WongStack in one pass. `/wong-setup` installs once; from then on this skill keeps the install current:

```
┌──────────────────────────────────────────────────────────┐
│ 1. Clone    refresh the cached WongStack clone ($WS)     │
│ 2. Copy     payload files this repo doesn't have yet     │
│ 3. Adapt    what it has → verdicts → record + change     │
│ 4. Manifest record the version and commit installed      │
│ 5. Report                                                │
└──────────────────────────────────────────────────────────┘
```

Updating is **adaptation, not replication.** Convergence with WongStack doesn't mean your files match upstream's byte for byte — it means the *capability* is present here, in whatever form fits this repo. So a file you don't have is simply copied (there's nothing to reason about), and a file you do have is read for meaning against what upstream can do, producing a proposal rather than an overwrite.

Three rules hold throughout:

- **Never overwrite anything you didn't generate.** This skill does not modify or replace any file authored by a human or another tool. Its entire write scope is: payload files that were absent, the `WONG-STACK` block where no markers existed, the OpenSpec change it proposes, `.claude/.wong-stack.json`, and `.claude/wong-sync-verdicts.md`. The last two are files the skill generates and solely owns, so it rewrites them each run; the carve-out is scoped by **authorship**, not kept as a growing list of exceptions. There is no conflict prompt because there is no conflict — nothing you wrote is ever clobbered.
- **No git here; read-only in the clone.** Copied files and the proposed change land in the working tree for you to review and `/save` — the branch → PR → CI gate stays the only way changes land here. The clone is fetched and reset, never branched, committed, or pushed.
- **It proposes; it never implements.** The adapt step writes an OpenSpec change and stops. Grafting happens later through the normal loop.

There is **no contribute leg** and no argument of any kind. Sending an improvement upstream is a manual pull request — see [`contributing.md`](../../../wiki/contributing.md) at the wiki root. If someone invokes `/wong-sync contribute` out of habit, stop and say so rather than running an ordinary sync on their behalf.

## Step 0 — resolve this repo and its manifest

```bash
ROOT="$(git rev-parse --show-toplevel)"
MF="$ROOT/.claude/.wong-stack.json"
```
- **No manifest** → WongStack isn't installed here; stop and point at `/wong-setup`. A missing manifest means "not installed."
- **This repo IS a WongStack source** (`$ROOT/VERSION` exists alongside `$ROOT/.claude/skills/wong-setup/`) → **stop** — the source has nothing to sync with itself.
- **Read `$MF` yourself** — it's a handful of lines, and reading beats parsing. Note these for the rest of the run. Older manifests may lack any of them; an absent key is *absent*, not empty — say so rather than silently proceeding on a blank.
  - `BASE` ← `commit` — the clone HEAD this repo last synced against. **Not a diff base** (nothing diffs); it drives the changelog walk.
  - `UPSTREAM` ← `upstream.repo` — defaults to `https://github.com/matthewwong525/WongStack` when absent.
  - `WS` ← `upstream.clone` — the cached clone path, with a leading `~` expanded to `$HOME`. Only a hint; Step 1 re-resolves it.
  - `STACKPACK` ← `components.stackPack` — whether this repo took the opt-in Cloudflare stack pack. Absent = false. Gates the pack's files into the Step 2 file list.
  - `SKILLMAP` ← `components.skills` — what was actually installed, including any local renames.
  - `LEDGER` ← `capabilities` — **only on a manifest written before v8.5.** Verdicts now live solely in `.claude/wong-sync-verdicts.md`; if this key is still here, Step 3 folds it into the record and Step 4 writes the manifest without it. Absent is the normal case.

  A **seed manifest** (`version` and `commit` both null — `/wong-setup` just handed off) is not a special mode. Every payload file is simply absent, so Step 2 copies all of them and that *is* the install. Skip the changelog walk (there's no prior version to walk from) and state the version being installed instead.

  These are filled in (or corrected) at Step 4, so missing keys are normal on older manifests, not an error.

## Step 1 — refresh the clone (a disposable, read-only cache)

The clone lives in the XDG cache and the manifest path is only a hint — missing or broken, re-clone silently; present, bring it clean and current:

```bash
[ -d "$WS/.git" ] || WS="${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack"
[ -d "$WS/.git" ] || git clone "$UPSTREAM" "$WS"     # full clone — history feeds the changelog walk
git -C "$WS" fetch origin
DEFAULT=$(git -C "$WS" symbolic-ref --short refs/remotes/origin/HEAD | cut -d/ -f2)
```
**Dirty guard:** if `git -C "$WS" status --porcelain` is non-empty, someone left work in the clone — warn, show what's there, and **ask before resetting**; never discard it unprompted. (Nothing in this skill writes to the clone, so anything dirty came from elsewhere — possibly a contribution branch parked by an older version.) Once clean:
```bash
git -C "$WS" checkout "$DEFAULT" && git -C "$WS" reset --hard "origin/$DEFAULT"
LATEST=$(cat "$WS/VERSION"); WS_HEAD=$(git -C "$WS" rev-parse HEAD)
```
Show what's new since the installed version: the `$WS/CHANGELOG.md` entries newer than the manifest's `version`. This is context for the adapt step's report, not a decision.

## Step 2 — copy what's absent

The file list — and nothing else — comes from [`references/payload-manifest.md`](references/payload-manifest.md). For each file in it:

| locally | action |
|---|---|
| **absent** | copy it in verbatim — there is no local form to respect and nothing to reason about |
| **present** | leave it exactly as it is; hand it to Step 3 |

The threshold is **per file, not per repo**. A fresh install is just the case where every manifest file is absent — no separate mode, no collision walk, no rename prompt. A repo missing one new upstream skill gets that one skill copied and everything else adapted.

Three scoping rules:

- **`CLAUDE.md`'s unit is the block, not the file.** No `WONG-STACK:BEGIN/END` markers (or no file at all) → insert the block, markers included, creating the file if needed and leaving every byte outside the markers untouched. Markers present → the block goes to Step 3 and is never rewritten in place.
- **A renamed skill counts as present.** If `components.skills` records a payload skill installed under a different local name, that's the name it lives under here — it is present, so it is adapted, not copied in a second time under the default name.
- **The opt-in stack pack** ([its files](references/payload-manifest.md#the-opt-in-stack-pack) — the three `scripts/`, `schema/seed.sql`, `schema/migrations/.gitkeep`, and the whole `wiki/stack/` section) enters the file list **only when `$MF` has `components.stackPack: true`**. For any other repo they're outside the manifest — never copied, never analysed, never offered. When they are in scope they follow the same copy-if-absent / adapt-if-present rule as everything else. The pack's config fragments are *not* files in this list; they merge into files this repo owns, so they follow the guided-edit path and surface through Step 3.

Say what was copied, in one line each. Copied files are working-tree edits only — no `git add`, no commit, no branch.

## Step 3 — adapt what's present

Everything the repo already has goes to the capability analysis: two independent subagents, a verdict per capability, and an OpenSpec change proposing the ones worth adopting.

**The pipeline is specified in [`references/adapt.md`](references/adapt.md)** — the two subagent briefs, the capability record shape, the five verdicts, the gap-analysis rules, the verdict record and its promotion path, the output contract, and the report format. Follow it there.

In short: a *cartographer* reads only the clone and maps what WongStack lets you **do**; a *surveyor* reads only this repo and reports what it already does. Neither writes files and neither one's raw output is shown to you. The main thread compares them and assigns every capability one of `present` / `divergent` / `adopt` / `not-applicable` / `declined`, each with a one-line reason. The taxonomy splits on **who decided**: the first four are the skill's reading, and `declined` is only ever written from a decision you actually made.

The step writes two things:

- **`.claude/wong-sync-verdicts.md`** — every run, every capability, every verdict and reason. Non-`adopt` entries are checkboxes; **tick one to overrule the verdict** and the next run adopts it. This is the deliverable — the report is a summary of it.
- **`openspec/changes/adopt-wongstack-<YYYY-MM-DD>/`** — only when something is `adopt`, one task each.

## Step 4 — rewrite the manifest (always last)

Update `.claude/.wong-stack.json` to reflect what actually happened:

```json
{ "version": "<LATEST>", "commit": "<WS_HEAD>",
  "installedAt": "<existing>", "updatedAt": "<today>",
  "upstream": { "repo": "<UPSTREAM>", "fork": "<preserved as-is, or null>", "clone": "<WS path>" },
  "components": { "skills": ["explore","plan","apply","save","continue","ship","dream","improve","wong-sync"], "claudeMd": true, "docs": true, "openspec": true, "stackPack": <true if this repo took the Cloudflare stack pack, else false/absent> } }
```

- **`commit`** ← `$WS_HEAD`. It records the clone HEAD this repo last synced against. It is **not** a diff base — nothing in this skill diffs — and exists for the changelog walk.
- **The manifest carries install state only** — what is installed here, from where, and as of when. Verdicts, reasons, and the commit a decision was judged against live in `.claude/wong-sync-verdicts.md` and nowhere else. If this manifest still has a `capabilities` key from an earlier version, Step 3 has already folded it into the record; write the manifest without it.
- **`upstream.fork`** is preserved byte-for-byte where an older version recorded one, and is never written or used. Nothing in this skill forks anything.
- ⑂ A seed manifest's null `version`/`commit` are filled with `$LATEST`/`$WS_HEAD` here — keep its `installedAt` and any renames it recorded.
- Older manifests just gain the new keys; nothing breaks on a v1 manifest. If the repo still carries a `contribute-wong-stack` skill or symlink, offer to remove it — `/wong-sync` supersedes it.

## Step 5 — report

- **Copied** — the files that were absent and are now here, one line each, and that they await `/save`.
- **Adapted** — a summary pointing at `.claude/wong-sync-verdicts.md`, which is the deliverable, per [`references/adapt.md`](references/adapt.md)'s report format: what's `adopt` (and the change folder written), anything promoted by a ticked box, counts for `divergent` / `not-applicable` / `present`, what was `declined` and why, and anything re-raised or retired. Say a box can be ticked to overrule any of it.
- **Version** — the new manifest `version`/`commit`, and what the changelog walk showed.

If nothing was copied and nothing is `adopt`, say so plainly: this repo is current. No change folder is written in that case — but `.claude/wong-sync-verdicts.md` still is, and it's exactly the run where it matters most, since it's the only place the reasoning survives.

## Hard rules

- **Never overwrite a file you didn't generate.** Copy only what's absent; everything present is adapted, not replaced. There is no three-way diff, no conflict prompt, and no keep-local / take-upstream question — those mechanisms managed a risk that no longer exists. The two generated files the skill owns — `.claude/.wong-stack.json` and `.claude/wong-sync-verdicts.md` — are rewritten each run; read the verdict record's ticked boxes *before* regenerating it, since ticking is the one edit that must survive.
- **Verdicts have one store.** `.claude/wong-sync-verdicts.md` holds every verdict, its reason, and the commit a `declined` was judged against. Never write a verdict into the manifest, and never read one from it except to migrate a pre-v8.5 `capabilities` key into the record.
- **`declined` is only ever the user's word.** Never infer it. If you can't point to something the user actually said, the verdict is `not-applicable` — which is recomputed every run and therefore costs nothing to get wrong.
- **No git in this repo.** Copied files, the verdict record, and the proposed change stay working-tree-only; `/save` is the gate.
- **The clone is read-only.** Fetch, checkout, reset — never branch, commit, or push. Ask before resetting a dirty clone.
- **It proposes; it never implements.** Step 3 writes the verdict record and — only when something is `adopt` — one OpenSpec change folder, never overwriting an existing one (suffix `-2`, `-3` on a date collision). Overruling a verdict is a tick plus a re-run, not an implementation.
- **No contribute leg, no arguments.** The skill never opens a pull request. `/wong-sync contribute` stops with a pointer to `contributing.md`'s manual route.
- **The manifest bounds what's copied, not what's read.** Only manifest files are ever copied in. The surveyor reads this repo's process surfaces broadly — that's how it can tell you already solve something — and nothing it reads leaves the machine.
- **Rewrite the manifest last**, reflecting what actually happened — install state only.
