---
name: wong-sync
description: Bring this repo up to date with WongStack — the updater that replaced the installer's update mode and /contribute-wong-stack. Refreshes a cached WongStack clone, follows upstream's own latest instructions when the installed copy is provably untouched, then *analyses instead of overwriting*: two subagents map what WongStack lets you do and what this repo already does, a short clarification stage asks only what the repo itself cannot answer, and the gap becomes ONE OpenSpec change — an after-picture of this repo, saying what you gain and what you lose — that you review and /apply. The run itself writes no payload file (the one exception is a fresh install, where the copy IS the install), so nothing changes until you approve the plan. Every verdict — adopted or not — lands in .claude/wong-sync-verdicts.md, where ticking a box overrules the call on the next run. It never modifies a file with local authorship and never opens a pull request. Use when you want to sync, update, or upgrade WongStack here, pull the latest skills, see what upstream has that this repo could take, or change what a previous sync decided.
user-invocable: true
---

# /wong-sync

Brings this repo up to date with WongStack in one pass. `/wong-setup` installs once; from then on this skill keeps the install current:

```
┌────────────────────────────────────────────────────────────┐
│ 1. Clone     refresh the cached WongStack clone ($WS)      │
│ 2. Classify  follow the newest instructions, then sort     │
│              every payload file — writing nothing          │
│ 3. Adapt     what it has → questions → verdicts →          │
│              the record + ONE plan                         │
│ 4. Report                                                  │
└────────────────────────────────────────────────────────────┘
                            ▼
              you review the plan, then /apply
```

Updating is **adaptation, not replication.** Convergence with WongStack doesn't mean your files match upstream's byte for byte — it means the *capability* is present here, in whatever form fits this repo. So a file you don't have is simply planned as a copy (there's nothing to reason about), a file you provably never touched — byte-identical to some upstream release — is planned as an update, and a file you've made your own is read for meaning against what upstream can do, producing a proposal rather than an overwrite.

**The run changes nothing.** It writes one OpenSpec change and stops; `/apply` does the work and `/save` checkpoints it. So the gate is the loop this repo already runs on — the plan is reviewable when you have time, editable before it runs, and visible in the pull request diff — rather than a prompt inside the skill. And because everything it wants is a task, the skill's oldest promise is finally true of the whole run instead of one step.

Four rules hold throughout:

- **The run writes two paths, and no payload file.** Its entire write scope is `.claude/wong-sync-verdicts.md` and one OpenSpec change folder — which this repo's own plan skill authors on the sync's behalf. Every copy, every update, the `WONG-STACK` block, this skill's own newer version, and the manifest rewrite are **tasks in that change**, performed later by `/apply`. ⑂ **The one exception, named here so the rule is never read as unconditional:** a **seed manifest** (`version` and `commit` both null — `/wong-setup` just handed off) copies the payload during the run, because on that path the copy *is* the install and there is no repo state for it to supersede.
- **Never overwrite anything with local authorship.** This skill does not modify or replace any file authored by a human or another tool — and now proposes rather than performs even the writes it is entitled to make. The two files it generates and solely owns (`.claude/.wong-stack.json`, `.claude/wong-sync-verdicts.md`) are the record's exception: the record is rewritten each run, and the manifest is rewritten by the plan's last file task. The carve-out is scoped by **authorship**, not kept as a growing list of exceptions. There is no conflict prompt because there is no conflict — nothing you wrote is ever clobbered.
- **No git here; read-only in the clone.** The record and the proposed change land in the working tree for you to review and `/save` — the branch → PR → CI gate stays the only way changes land here. The clone is fetched and reset, never branched, committed, or pushed; reading its history to prove a local file unmodified, and reading its own `wong-sync` instructions to run under them, are reads, not mutations.
- **It proposes; it never implements.** Step 3 writes a plan and stops. Copying, updating, and grafting all happen later through the normal loop.

There is **no contribute leg** and no argument of any kind. Sending an improvement upstream is a manual pull request — see [`contributing.md`](../../../wiki/contributing.md) at the wiki root. If someone invokes `/wong-sync contribute` out of habit, stop and say so rather than running an ordinary sync on their behalf.

## Step 0 — resolve this repo and its manifest

```bash
ROOT="$(git rev-parse --show-toplevel)"
MF="$ROOT/.claude/.wong-stack.json"
```
- **No manifest** → WongStack isn't installed here; stop and point at `/wong-setup`. A missing manifest means "not installed."
- **This repo IS a WongStack source** (`$ROOT/VERSION` exists alongside `$ROOT/.claude/skills/wong-setup/`) → **stop** — the source has nothing to sync with itself.
- **Read `$MF` yourself** — it's a handful of lines, and reading beats parsing. Note these for the rest of the run. Older manifests may lack any of them; an absent key is *absent*, not empty — say so rather than silently proceeding on a blank.
  - `BASE` ← `commit` — the clone HEAD this repo's payload files were last brought to. **Not a diff base** (nothing diffs); it drives the changelog walk.
  - `UPSTREAM` ← `upstream.repo` — defaults to `https://github.com/matthewwong525/WongStack` when absent.
  - `WS` ← `upstream.clone` — the cached clone path, with a leading `~` expanded to `$HOME`. Only a hint; Step 1 re-resolves it.
  - `STACKPACK` ← `components.stackPack` — whether this repo took the opt-in Cloudflare stack pack. Absent = false. Gates the pack's files into the Step 2 file list.
  - `APPSCAFFOLD` ← `components.appScaffold` — whether this repo took the opt-in app scaffold. Absent = false. Gates `app/` into the Step 2 file list, and **only in combination with `STACKPACK`** — the pair is the gate, since the scaffold's build and deploy path is the pack. `APPSCAFFOLD` true with `STACKPACK` false is not a valid manifest state: treat it as false, say so, and carry on.
  - `SKILLMAP` ← `components.skills` — what was actually installed, including any local renames.
  - `LEDGER` ← `capabilities` — **only on a manifest written before v8.5.** Verdicts now live solely in `.claude/wong-sync-verdicts.md`; if this key is still here, Step 3 folds it into the record and the manifest task writes the manifest without it. Absent is the normal case.

  A **seed manifest** (`version` and `commit` both null) is the one path that copies during the run: every payload file is absent, so Step 2 copies all of them and that *is* the install. Skip the changelog walk (there's no prior version to walk from) and state the version being installed instead.

  These are corrected by the plan's manifest task, so missing keys are normal on older manifests, not an error.

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
Collect what's new since the installed version: the `$WS/CHANGELOG.md` entries newer than the manifest's `version`. Hold onto the list — Step 3 must account for every one of these entries in its report, so a small upstream improvement cannot slip through unconsidered.

## Step 2 — follow the newest instructions, then classify every payload file

### Follow, without installing

**Before Step 2 proper**, decide which text this run obeys. Following upstream's newest instructions and *installing* them are separate acts, and only the second is a change to your repo:

|                                        | how it happens                       |
|----------------------------------------|--------------------------------------|
| which instructions **this run** follows | read them from the clone — no write  |
| which instructions are **installed here** | an ordinary task in the plan       |

Apply [the blob-hash proof](#the-proof-of-unmodified) to this skill's own directory — `SKILL.md` and `references/**` under the local `wong-sync` path:

- **Provably unmodified and stale** → read `SKILL.md` and `references/**` **from `$WS`**, discard the text you are running under (including any step this version doesn't have), and follow the clone's text for the rest of the run. **Re-run Step 0** against it — a newer version may consult a manifest key the old one never looked at. **Keep Step 1's clone** and everything derived from it (`LATEST`, `WS_HEAD`, the changelog list); those are facts about the clone, true under either version. **Never fetch or reset a second time.** Installing those files is a task in the plan, like every other file.
- **Not provably unmodified** → continue under the installed text and do **not** read the clone's version in its place. A locally edited `wong-sync` was changed on purpose. Say so plainly and name the version you are running: *"continuing on the installed 10.1.0 — this repo's `wong-sync` has local edits."* Step 3 then proposes the adaptation through the ordinary `adopt` path.

Earlier versions capped this at one pass per run, to stop a version-skew bug spinning. That guard is gone because what it guarded is gone: with no write, there is nothing to re-detect and nothing to loop on.

Why this matters: the instructions you are reading were loaded before this step ran, so a repo that syncs monthly would otherwise always decide by last month's logic. Reading the clone fixes that without the skill rewriting its own decision procedure before you have seen anything — the one write that could never be gated. Silence is the failure mode: a user who believes they are on current logic when they are not has no way to find out.

### Classify — and write nothing

The file list — and nothing else — comes from [`references/payload-manifest.md`](references/payload-manifest.md). Sort each file in it; **the sorting writes nothing**, and what it decides becomes tasks in Step 3's plan:

| locally | planned action |
|---|---|
| **absent** | copy it in verbatim — there is no local form to respect and nothing to reason about |
| **present, provably unmodified, stale** | update it to upstream's current version — every byte of it came from an upstream release, so nobody's work is at risk |
| **present otherwise** | leave it exactly as it is; hand it to Step 3's analysis |

⑂ On a **seed manifest** only, the copies are performed here rather than planned.

### The proof of "unmodified"

A file is provably unmodified when its git blob hash equals the hash of some version of that path in the clone's default-branch history:

```bash
LOCAL=$(git hash-object "$ROOT/<path>")
git -C "$WS" rev-list "$DEFAULT" -- "<path>" |
  while read c; do git -C "$WS" rev-parse -q --verify "$c:<path>"; done | grep -qx "$LOCAL"
```

Match the *current* upstream blob → the file is current; plan nothing. Match a *historical* blob only → provably unmodified and stale; plan the update. No match → someone changed it; the file keeps the full never-overwrite guarantee and goes to Step 3. Any one-byte difference defeats the proof, and the fallback is always the status quo — never a wrong overwrite. For a renamed skill, look up history under the *upstream* path (via `SKILLMAP`) and target the local path. The `WONG-STACK` block is excluded — it lives inside a co-authored file with no blob history of its own, so it always takes the adapt path.

The threshold is **per file, not per repo**. A fresh install is just the case where every manifest file is absent — no separate mode, no collision walk, no rename prompt. A repo missing one new upstream skill gets that one skill planned as a copy and everything else adapted.

Three scoping rules:

- **`CLAUDE.md`'s unit is the block, not the file.** No `WONG-STACK:BEGIN/END` markers (or no file at all) → plan to insert the block, markers included, creating the file if needed and leaving every byte outside the markers untouched. Markers present → the block goes to Step 3 and is never rewritten in place.
- **A renamed skill counts as present.** If `components.skills` records a payload skill installed under a different local name, that's the name it lives under here — it is present, so it is adapted, not planned as a second copy under the default name.
- **The opt-in stack pack** ([its files](references/payload-manifest.md#the-opt-in-stack-pack) — the three `scripts/`, `schema/seed.sql`, `schema/migrations/.gitkeep`, and the whole `wiki/stack/` section) enters the file list **only when `$MF` has `components.stackPack: true`**. For any other repo they're outside the manifest — never copied, never analysed, never offered. Adopting the pack is not this skill's job: the door is `/wong-cloudflare` — or, where that skill isn't installed yet, setting `components.stackPack: true` and re-running the sync, which then plans the pack's copy; that plan is this skill's only part in adoption. When they are in scope they follow the same copy-if-absent / adapt-if-present rule as everything else. The pack's config fragments are *not* files in this list; they merge into files this repo owns, so they follow the guided-edit path and surface through Step 3.
- **The opt-in app scaffold** ([its files](references/payload-manifest.md#the-opt-in-app-scaffold) — all of `app/` **except `app/wrangler.jsonc`**) enters the file list **only when `$MF` has both `components.appScaffold: true` and `components.stackPack: true`**. `app/wrangler.jsonc` is excluded even then: it carries live `database_id`s, and the target's config is created instead by `/wong-cloudflare` from the fragment. Every other scaffold file is ordinary copy-if-absent — a repo that already has a file at one of these paths keeps its own, byte for byte, so an existing application is never clobbered and a partial scaffold simply completes. With either flag absent, `app/` is outside the manifest entirely: not copied, not analysed, not offered.

## Step 3 — adapt what's present

Everything the repo already has goes to the capability analysis: two independent subagents, a short clarification stage, a verdict per capability, and one OpenSpec change carrying the whole run.

**The pipeline is specified in [`references/adapt.md`](references/adapt.md)** — the two subagent briefs, the capability record shape, the clarification stage, the five verdicts, the gap-analysis rules, the verdict record and its tick surface, the after-picture the proposal must be, the task shapes, and the report format. Follow it there.

In short: a *cartographer* reads only the clone and maps what WongStack lets you **do**; a *surveyor* reads only this repo and reports what it already does. Neither writes files and neither one's raw output is shown to you. Where the evidence genuinely cannot settle something — because the missing fact is your intent, not anything in the repo — the main thread asks, in one batch you may answer partly or not at all. Then it assigns every capability one of `present` / `divergent` / `adopt` / `not-applicable` / `declined`, each with a one-line reason. The taxonomy splits on **who decided**: the first four are the skill's reading, and `declined` is only ever written from a decision you actually made.

The step produces two things and nothing else:

- **`.claude/wong-sync-verdicts.md`** — every run, every capability, every verdict and reason. Written by the sync itself. Every entry is a checkbox; **tick one to overrule the verdict** — a non-`adopt` line to force it, an `adopt` line to refuse it.
- **`openspec/changes/sync-wongstack-<YYYY-MM-DD>/`** — the run's plan, produced whenever it has anything to do, and **authored by this repo's own plan skill**, which the sync invokes with one fully composed instruction. Its proposal is the **after-picture**: how this repo works once this lands, what you gain, what you lose, and how sharp the picture is. Its tasks are the coarse file work, the manifest rewrite last among them, then one per `adopt`. Nothing to do and nothing to adopt → no folder.

**The sync composes; the plan skill authors.** Naming, content, and scoping are the sync's product — it passes the exact change name, the proposal body to use **verbatim**, the task list, and the rule that delta specs are for `adopt` grafts only. Locating the planning home, writing the artifacts, and confirming the change is apply-ready are the plan skill's, which is what it already does for every other change in this repo. Three things keep the seam clean:

- **The collision is resolved before the invocation.** The sync checks for an existing folder for today and passes the already-suffixed `-2`/`-3` name, so the plan skill never faces a collision and never asks whether to continue an existing, possibly mid-flight change.
- **There is nothing left to prompt for.** The invocation happens after the clarification stage, so every question is already answered inside the instruction. A genuine blocker returns to the sync, which reports it — it never falls back to prompting.
- **The plan skill is never edited.** It is resolved through `SKILLMAP`, so a locally renamed one is found under its local name, and the instruction is ordinary planning intent rather than a protocol — so it works with whatever version this repo has, local edits included. A repo with **no** plan skill falls back to the sync writing `proposal.md` and `tasks.md` itself at that path; the report names that degraded mode.

## The manifest — written by the plan's last file task

`.claude/.wong-stack.json` is rewritten by a task, not by this run, so its version advances only when the work actually lands. This block is the payload's **single statement of the manifest schema** — `/wong-setup` writes its seed from here (same shape, `version`/`commit` null) rather than carrying a copy:

```json
{ "version": "<LATEST>", "commit": "<WS_HEAD>",
  "installedAt": "<existing>", "updatedAt": "<the day the task runs>",
  "upstream": { "repo": "<UPSTREAM>", "fork": "<preserved as-is, or null>", "clone": "<WS path>" },
  "components": { "skills": ["explore","plan","apply","save","continue","ship","dream","improve","wong-sync"], "claudeMd": true, "docs": true, "openspec": true, "stackPack": <true if this repo took the Cloudflare stack pack, else false/absent>, "appScaffold": <true if this repo took the app scaffold, else omit> } }
```

- **`version` and `commit` record which upstream release this repo's payload files were brought to** — a fact about files, not about what a run examined. So an unapplied plan leaves them alone, and the next run walks the same changelog span again instead of believing this repo is current. Apply the files but only some grafts and nothing hides either: the verdict record recomputes every verdict except `declined` on every run, so what you didn't take is re-proposed regardless.
- **The manifest carries install state only** — what is installed here, from where, and as of when. Verdicts, reasons, and the commit a decision was judged against live in `.claude/wong-sync-verdicts.md` and nowhere else. If this manifest still has a `capabilities` key from an earlier version, Step 3 has already folded it into the record; the task writes the manifest without it.
- **`appScaffold` is preserved, never inferred.** Write it as it was; a repo that took the scaffold keeps the flag, and a repo whose manifest has no such key gets none written — the absence is what makes every pre-9.1 install behave exactly as it did. Never set it because `app/` happens to exist: the flag records a decision, and plenty of repos have an `app/` directory they wrote themselves. Setting it is the job of `/wong-setup` and `/wong-cloudflare`, which ask first.
- **`upstream.fork`** is preserved byte-for-byte where an older version recorded one, and is never written or used. Nothing in this skill forks anything.
- ⑂ A seed manifest's null `version`/`commit` are filled with `$LATEST`/`$WS_HEAD` — keep its `installedAt` and any renames it recorded.
- Older manifests just gain the new keys; nothing breaks on a v1 manifest. If the repo still carries a `contribute-wong-stack` skill or symlink, the plan offers to remove it — `/wong-sync` supersedes it.

## Step 4 — report

- **Which logic ran** — whether the run followed the clone's `wong-sync` instructions, its version span (`10.1.0 → 11.0.0`), and that every decision after Step 1 came from the newer text. Where it couldn't, say which version ran and why: *"continuing on the installed 10.1.0 — local edits."* A run that behaved like a version other than the installed one is exactly when a reader needs to know which text to consult.
- **Questions** — anything asked, how each was answered, and how the unanswered ones resolved. A skipped question is not a failure; say what it fell back to.
- **Planned** — the change folder written for this run, what its proposal says this repo becomes, and that reviewing it and running `/apply` is what makes any of it happen. Name the file counts (copies, updates) rather than listing every path; the proposal has the lists.
- **Adapted** — a summary pointing at `.claude/wong-sync-verdicts.md`, per [`references/adapt.md`](references/adapt.md)'s report format: what's `adopt`, anything promoted or declined by a ticked box, counts for `divergent` / `not-applicable` / `present`, what was `declined` and why, and anything re-raised or retired. Say a box can be ticked to overrule any of it.
- **Already waiting** — any `sync-wongstack-*` folder this run did not write, so an unapplied plan is visible rather than quietly superseded.
- **Version** — what the plan's manifest task will record, plus the changelog accounting: one line per entry between the previous version and this one, each mapped to reflected-here / adopt / planned-directly / outside-payload-scope, per [`references/adapt.md`](references/adapt.md). An unaccounted entry is a gap the run must show, not hide.

If there's nothing to copy, nothing to update, no newer `wong-sync` to install and nothing is `adopt`, say so plainly: this repo is current. No change folder is written in that case — but `.claude/wong-sync-verdicts.md` still is, and it's exactly the run where it matters most, since it's the only place the reasoning survives.

## Hard rules

- **The run writes `.claude/wong-sync-verdicts.md` and one change folder — no payload file.** Copies, updates, the `WONG-STACK` block, this skill's own newer version, and the manifest rewrite are all tasks that `/apply` performs. ⑂ The single exception is a **seed manifest**, where the copy is the install; it is named here so the rule is never read as unconditional.
- **Never overwrite a file a human or another tool authored.** Plan a copy for what's absent; plan an update for what's provably unmodified — byte-identical to a historical upstream version, where any one-byte difference defeats the proof; everything else present is adapted, not replaced. There is no three-way diff, no conflict prompt, and no keep-local / take-upstream question — those mechanisms managed a risk that no longer exists. Read the verdict record's ticked boxes *before* regenerating it, since ticking is the one edit that must survive.
- **Follow the newest instructions; never install them mid-run.** When the local `wong-sync` is provably unmodified and stale, read `SKILL.md` and `references/**` from the clone, re-run Step 0 against them, keep Step 1's clone, and follow that text for the rest of the run — writing nothing. A `wong-sync` that fails the proof is never read from the clone and never touched; say which version you are running and leave the adaptation to Step 3.
- **The approval decision is never a prompt.** The plan is the gate. Questions before the plan are allowed and bounded by [`references/adapt.md`](references/adapt.md) — they must be about your intent, must change what gets planned, and must resolve toward `adopt` when unanswered, so a run nobody answers still finishes and still writes its plan.
- **Verdicts have one store.** `.claude/wong-sync-verdicts.md` holds every verdict, its reason, and the commit a `declined` or an answered question was judged against. Never write a verdict into the manifest, and never read one from it except to migrate a pre-v8.5 `capabilities` key into the record.
- **`declined` is only ever the user's word.** Never infer it — a ticked `adopt` line, or a refusal you can point to. A deleted task or a plan nobody applied is **not** a refusal: not yet done is not no. If you can't point to something the user actually did, the verdict is `not-applicable`, which is recomputed every run and therefore costs nothing to get wrong.
- **No git in this repo.** The record and the proposed change stay working-tree-only; `/save` is the gate.
- **The clone is read-only.** Fetch, checkout, reset — never branch, commit, or push. Ask before resetting a dirty clone.
- **It proposes; it never implements.** Step 3 writes the verdict record and — whenever the run has anything to do — produces one OpenSpec change by invoking this repo's plan skill with the composed instruction, never overwriting an existing folder. The sync resolves the date collision itself (suffix `-2`, `-3`) *before* invoking, so the plan skill only ever writes a fresh folder. No plan skill here → the sync writes `proposal.md` and `tasks.md` itself and the report names the degraded mode. An unapplied plan from a previous run never suppresses a new one; name it in the report instead.
- **No contribute leg, no arguments.** The skill never opens a pull request. `/wong-sync contribute` stops with a pointer to `contributing.md`'s manual route.
- **The manifest bounds what's planned, not what's read.** Only manifest files are ever copied or updated. The surveyor reads this repo's process surfaces broadly — that's how it can tell you already solve something — and nothing it reads leaves the machine.
