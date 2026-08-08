---
name: save
description: The end-to-end checkpoint skill — the git stage of the change loop, the only skill that reads the conversation, and /ship's single delegated checkpoint. Preserves explicitly named session secrets in the primary worktree while excluding their values from every durable handoff. Commits and pushes the current branch (auto-creating it + auto-committing a dirty tree), opens or updates a PR whose body mirrors the change, waits for CI when present (auto-fixing failures; no checks → PR review is the gate), and returns the per-commit preview URL. Before committing it syncs the OpenSpec change under openspec/changes/<branch>/ — updating the plan, maintaining its Status header, APPENDING a dated Decision-log entry, and folding delta specs into openspec/specs/ (/opsx:sync); when the session skipped /plan it authors the change via the same OpenSpec artifact process /plan uses. It also captures the session into notes/<slug>.md — a concise-but-lossless, credential-redacted compression of the conversation that /dream later consolidates into the wiki from any machine. A prose-only save — every changed path inside the allowlist notes/** + wiki/**, so a conversation-only session or a /dream run — commits straight to the default branch: no change, no branch, no PR, no /ship. Routing is by path prefix and never by file extension; markdown under .claude/, openspec/, or the repo root keeps the full gate. Accepts an optional trailing note (/save <note>) that sets the status and seeds the log entry. Does NOT implement tasks (that's /apply), does NOT build locally, and NEVER merges (that's /ship). Use whenever you want to save/checkpoint/snapshot the thread, save a conversation into the repo, push the work up, or get a shareable preview URL of in-progress work.
user-invocable: true
---

# /save

The single checkpoint runbook. Invoking it authorizes the branch creation, commit, push, PR creation + body regeneration, spec sync, and OpenSpec change authoring — don't re-prompt for those. **Confirm** anything outside this runbook (force push, hard reset, amending merged commits).

**Input:** `/save [note]` — anything after the command is an optional **checkpoint note**, e.g. `/save blocked on API key from ops`, `/save ready to ship`. The note sets the change's `**Status:**` line (when it reads as a state — blocked / ready / parked) and seeds today's Decision-log entry. Most calls are bare.

**Internal shipping input:** `/save --shipping <name>` is invoked only by `/ship`, after `/ship` has archived that named OpenSpec change. It uses the archive as the handoff, disables the prose fast path and fallback change authoring, and returns a merge-safe gate result to `/ship`. A user does not need to invoke this form directly.

`/save` is the **git + sync** stage of the loop (`/explore → /plan → /apply → /save → /continue → /ship`). It delivers three things:

1. A pushed branch + PR with a per-commit **preview URL** (auto-discovered) and a **PR body that mirrors the change**, so a forge alone is a complete handoff surface — no clone or CLI needed to read the plan. This is `/save`'s headline job: the git mechanics of the loop (drafting is `/plan`, implementing is `/apply`).
2. A durable **OpenSpec change** under `openspec/changes/<branch>/` whose `proposal.md` *is* the current plan **plus its history**: a `**Status:**` header, the plan sections (kept current), and an append-only `## Decision log` (what happened along the way), with a `tasks.md` checklist — so a fresh session (another machine, no scrollback) can resume cold with `/continue` and know not just *what* to do but *why* it's shaped that way. Normally `/plan` drafted it and `/apply` checked off its tasks; `/save` **syncs** it. When the session skipped `/plan`, `/save` **authors it as a fallback via the same OpenSpec artifact process `/plan` uses**, so nothing gets pushed without its handoff. **The change is the plan — there is no GitHub handoff issue.** A session that produced *no code and no plan* gets no change at all (Step 2) — the note below is the whole output.
3. A **session note** at `notes/<slug>.md` — the conversation itself, compressed into the repo. `/save` is the **only** skill that reads the conversation, which is what makes consolidation portable: `/dream` reads committed notes, never scrollback, so a session captured on one machine is consolidatable from any other. See [`notes/README.md`](../../../notes/README.md) for the convention.

This save is checkpointed through the usual [gate](../../../wiki/development/the-change-loop.md#the-gate) — never a local build. Because the change lives *in the repo*, we author it **before** the commit so it ships in the same commit; in shipping context `/ship` has already moved it into the archive, and this skill maintains that explicit archive path instead. The push then triggers CI, which we wait on in Step 6.

If a step other than CI fails, stop and surface the exact error. Never bypass with `--no-verify` or `--force`. A *CI* failure is not a stop — it's the auto-fix loop's job (Step 6).

**Assume the reader is on a different machine with no access to this one** — a fresh clone, no working tree, no scrollback. The durable surface is the repo: the change's `proposal.md` (the plan + its log) and a pushed PR (whose body mirrors it). Everything the plan relies on must be pushed, and the proposal must be self-contained — reference repo files by **repo-relative path** (`src/routes/auth.ts`), never an absolute worktree path.

> **OpenSpec never runs git — this skill owns all of it.** `openspec` only reads/writes the `openspec/` folder; every `git`/`gh` action is here.
>
> `main` stands for the repo's default branch — **assume it**. Every repo `/wong-setup` creates is on `main`, and `git symbolic-ref refs/remotes/origin/HEAD` *fails* on a freshly created one (`gh repo create` doesn't record a head). Only where `main` doesn't exist locally or on the remote — an older repo on `master` — resolve the real name with `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` and substitute it.

## Step 0 — preserve named secrets; exclude every value

Because this is the only skill that reads the conversation, it is the universal checkpoint for credentials the user **explicitly supplied or rotated with a known variable name** during this session. Do not pattern-match token-shaped strings, guess a name for an opaque value, or treat every pasted string as a credential. A producer that needed the credential earlier (for example `/wong-cloudflare`) may already have saved it; verify the durable copy rather than creating another.

For each explicitly named secret:

1. Resolve `ACTIVE_ROOT`, absolute `GIT_DIR`, and absolute `COMMON_DIR` with Git exactly as the [secrets convention](../../../wiki/development/secrets.md) states. Equal git/common dirs mean the active root is primary; otherwise the parent of the common `.git` directory is the primary root. Verify `git -C "$PRIMARY_ROOT" rev-parse --show-toplevel` resolves to that same path. Failure stops the save before writing the value; never fall back to a linked checkout.
2. Use the repo's declared live/example pair (`.env` / `.env.example` by default, or the stack's documented equivalent). Prove the live destination is ignored from the primary worktree. If the committed ignore rule exists only on the active branch, the repository-common `info/exclude` may receive the same wildcard/negation pair as immediate local protection; re-check and stop if the destination is still not ignored.
3. Create the durable live file from the **active branch's** example when absent. Narrowly replace only the exact `KEY=` line or append that one line; preserve every unrelated line. Never regenerate the file or print the value.
4. If a separate regular live file exists in the linked worktree, preserve it and report only that reconciliation is needed. Do not print or compare values, delete a file, or bulk-merge. An ignored symlink to the durable file is an option only after explicit reconciliation.
5. If the variable contract is new, add a blank `KEY=` declaration to the active branch's example with what-it-is and where-to-get-it guidance. A value-only rotation makes no example diff.

Keep the handled variable names and values only in ephemeral working memory for the leak check below. **Every real credential value supplied, rotated, read, or written in the session is forbidden from** the OpenSpec change or archive, Status, Decision log, tasks, session note, commit message, PR body, staged tracked files, and final report. Those surfaces may say that `SERVICE_TOKEN` rotated and retain its non-secret sourcing guidance; they never carry the value.

## Step 1 — preflight (read-only)

```bash
git fetch origin main 2>/dev/null                # never diff against a stale origin/main
git rev-parse --abbrev-ref HEAD                   # current branch
git status --porcelain                            # working-tree state (incl. ?? untracked)
git log origin/main..HEAD --oneline 2>/dev/null   # commits ahead of main
openspec list                                     # active change(s), if any
```

At entry, parse the internal shipping form before routing:

- Normal invocation → `SHIPPING=false`.
- `/save --shipping <name>` → require the current feature branch to equal `<name>`, resolve exactly one `openspec/changes/archive/*-<name>/` directory, set it as `CHANGE_ROOT`, and set `SHIPPING=true`. Zero or multiple matches stop; never guess. The archive was created by `/ship` immediately before this call.

**Don't create a branch or commit yet.** The plan comes first (Step 2), the branch is *named from it* (Step 3), and the change is authored (Step 4) so it lands in the same commit as the code. Even a **plan-only** save (a freshly authored change, no code yet) is valid: the untracked change folder makes the tree dirty, so Step 5 commits and pushes it — that's exactly what makes the plan handoff-ready.

### The prose fast path

Before anything else, decide which of two routes this save takes. **Shipping context always takes the normal route** because the archive move is outside the allowlist. Otherwise run the changed paths from `git status --porcelain` above against the **prose allowlist** — exactly two path prefixes:

```
notes/**
wiki/**
```

- **Every changed path is inside the allowlist** → the **prose fast path**. Write the note if there's one to write (Step 4c), then commit and push **directly to the default branch**: no feature branch, no OpenSpec change, no PR, no CI wait, and no `/ship` afterwards. Jump to Step 5's prose variant. Two sessions land here: a conversation that produced only understanding (just `notes/<slug>.md`), and a `/dream` run (wiki pages plus the `consolidated:` stamps it wrote into `notes/`).
- **Anything else** → the normal flow. Continue to Step 2.

Three rules bind this decision:

- **It is by path prefix, and it is exact.** One changed path outside the allowlist — a source edit, a skill, a change folder, a version bump — and the **whole save** takes the normal flow, with the prose riding along on the branch. Never split a mixed diff into two commits to send the prose half down the fast path; the mixed save is one save.
- **Never route on file extension.** `*.md` is not a proxy for prose — markdown outside the two prefixes keeps the full gate, and the allowlist is closed.
- **`wiki/` means the literal prefix `wiki/`.** A repo that keeps its prose somewhere else — `docs/`, `handbook/` — keeps the full gate. (`/improve docs` falls back to `docs/`; this route does not.) Don't re-litigate this per save.

Why the carve-out exists, and the full list of what stays gated: [the change loop](../../../wiki/development/the-change-loop.md#the-prose-allowlist). Don't restate it here — this step is the routing test, not the doctrine.

## Step 2 — establish the current plan

The change's `proposal.md` *is* the plan — not a status report. The most concise, complete statement of what we're doing and how, so a cold reader can act.

**Shipping context:** the archived `CHANGE_ROOT/proposal.md` is already the completed plan. Maintain it in place, set its status to `ready-to-ship`, and append the shipping checkpoint to its Decision log; do not synthesize or replace plan sections from the conversation.

- **Session used plan mode** → the plan is the **most recent** one you presented (the latest `ExitPlanMode` plan), updated for anything that changed since it was approved.
- **Session never used plan mode** → synthesize a concise plan from the conversation + the diff: what this work is, and the steps to finish it. This skill is authorized to run non-interactively, so don't block on a plan-mode round-trip — write the plan directly. (Only pause if you genuinely can't tell what the work is.)

**Not every session has a plan, and that's a valid save.** Route on what the session actually produced:

| The session produced | Change? | Note? | Route |
|---|---|---|---|
| Code, or a plan for code | yes — sync or author it | if there's context beyond the diff and the Decision log | normal flow |
| Conversation only — no diff outside `notes/` | **no** | yes | prose fast path (Step 1) |
| Wiki edits (a `/dream` run) and nothing else | **no** | the `consolidated:` stamps only | prose fast path (Step 1) |
| Prose *plus* anything outside the allowlist | yes | yes | normal flow — the prose rides along |
| Nothing at all — nothing learned, decided, or done | no | no | say so and stop |

The table is about what to *write*; Step 1's path test decides the *route*, and it is the only thing that does.

**Never invent a plan for a conversation.** A session that clarified how something works, settled a question, or established a constraint is *not* empty and is *not* a change — writing it a `proposal.md` describing nothing changing and a `tasks.md` with zero tasks files real knowledge in the wrong drawer and puts a no-op entry in `openspec list`. It gets a note, and that is the complete and correct output.

Keep the plan in its own shape — whatever headings it has. If a fact it relies on lived only in local scratch state or terminal output, inline it so the cold reader has it.

## Step 3 — resolve the change name + ensure the branch

**Branch name = change name** — the tie `/continue` and `/ship` rely on.

**Already on a feature branch** (not `main`, not detached) → the change name is the branch name. Resolve which change tracks it, in priority order:

1. **`openspec/changes/<branch>/` exists** → you're **updating** it.
2. **This conversation already ran `/plan`/`/apply`/`/save`/`/continue`** → you know the change name. Use it.
3. **A single active `openspec list` entry** → use it.
4. **None** → you're **creating new**; the change name is the branch name.

**Shipping context is the exception to item 4:** the explicit archived `CHANGE_ROOT` is the change, and the missing active folder is expected. Never run fallback authoring or recreate `openspec/changes/<name>/`.

**On `main` or detached `HEAD`** → auto-create the feature branch now — do not prompt. **Name it from the plan**, not the machine: derive a short, descriptive kebab-case slug from the Step 2 plan's topic (a plan "add search to the receiving page" → `add-po-search`) — the slug becomes the change name, the branch, the PR, and the archive entry, so it must describe the *work*. Fall back to the worktree directory name **only** when the session is genuinely unreadable. If the slug already exists as a branch locally or on the remote, append `-<short-sha>`:

```bash
git checkout -b "$SLUG"
git rev-parse --abbrev-ref HEAD   # refresh the branch variable before continuing
```

## Step 4 — sync the OpenSpec change (append, never rewrite) + write the session note

4a–4b sync or author the change; **4c writes the note**, and runs on *every* route — including the prose fast path, where it's the only part of Step 4 that happens. (On a `/dream`-only save there may be nothing new to capture; 4c's write-only-when-there's-something-to-write rule still applies.)

If `/plan` already drafted the change and `/apply` has been checking off tasks, this is a light **sync**. Full authoring (4b) is the **fallback** for sessions that skipped `/plan`. In shipping context the archive is maintained in place and 4b is forbidden. In every mode the prime directive is: **plan sections update in place; Status is maintained; the Decision log only ever appends.**

### 4a. The change's living surfaces

- **`**Status:**` + `**Open questions:**`** — two lines directly under the H1 of `proposal.md`. Maintain them every save. Status vocabulary: `in-progress` | `blocked (<on what>)` | `ready-to-ship` | `parked`. A `/save <note>` that reads as a state sets Status; open questions are the decisions only the user can make (empty = `none`).
- **Plan sections** (Why / What Changes / Impact, or whatever shape the plan has) — update **in place** to the latest plan from Step 2. These are the *current* intent; they're allowed to change.
- **`## Decision log`** — the last section of `proposal.md`, **append-only**. Each save appends one dated bullet: `- **YYYY-MM-DD** — <what landed, what was decided or discovered and why, what was ruled out, what it's blocked on>`. Fold the `/save <note>` in. **Never rewrite, reorder, or delete prior entries** — the log is how a cold reader (or another team) gets the journey, not just the destination.
- **`tasks.md`** — make the checklist reflect reality: check off `- [x]` what's done, add tasks the plan grew, group by the surface each touches.

In shipping context these surfaces live under `CHANGE_ROOT` in the archive, Status is `ready-to-ship`, and the new Decision-log entry records the delegated shipping checkpoint. Do not create or edit a parallel active change.

### 4b. Creating the change fresh (the skipped-`/plan` fallback)

Author it **via the same OpenSpec artifact process `/plan` uses** — don't freehand the shape:

```bash
NAME=$(git rev-parse --abbrev-ref HEAD)
[ -d "openspec/changes/$NAME" ] || openspec new change "$NAME"
openspec status --change "$NAME" --json          # artifact build order
openspec instructions proposal --change "$NAME"  # exact sections + config context
```

Then write the artifacts (OpenSpec never runs git; you write the files):

- **`proposal.md`** — the plan per the instructions' sections, self-contained, repo-relative paths, led by **what changes and why** — plus the Status/Open-questions header and an initial Decision-log entry (4a).
- **`tasks.md`** — the `- [ ]` checklist per 4a, with already-done work checked off.
- **`design.md`** — only when the change warrants it (cross-cutting, new pattern, real trade-offs) — same bar `/plan` applies.

### 4c. Write the session note

**You are the only skill that reads the conversation.** `/dream` consolidates the wiki from committed notes and never touches scrollback or transcript files — so whatever you don't write here is lost the moment this session ends, and unreachable from any other machine even now.

Write or update **`notes/<slug>.md`**, where `<slug>` is the change/branch slug (prose fast path, so no change: derive the slug from the topic, exactly as Step 3 would). Read [`notes/README.md`](../../../notes/README.md) for the full convention; the rules that bind this step:

- **Update in place, never a file per save.** A second save on the same slug revises what's now better understood and appends what's new. No date in the filename; dates live in frontmatter (`slug`, `started`, `updated`, and an empty `consolidated:` that `/dream` fills in later).
- **Write only when there's something to write.** If the session produced nothing beyond what the diff and the Decision log already say, **skip the note** and report that in Step 7. A `/save` run three times an hour shouldn't leave three restatements of the commit.
- **Don't duplicate the Decision log.** If a fact is about why *this change* is shaped that way, it belongs in `proposal.md` and the note doesn't repeat it. The note carries the surrounding context the change deliberately doesn't hold.

**The bar is concise *without losing context*** — a compression, not a summary. Summaries drop the "why," and the why is the payload. Write so a cold reader on another machine reaches the same understanding you have now, without the transcript.

| Keep | Drop |
|---|---|
| what the user **stated** — facts, constraints, preferences, corrections | tool-call mechanics and file dumps |
| decisions **and their rationale**, including what was ruled out and why | your own reasoning-out-loud |
| specifics: names, repo-relative paths, numbers, versions, error strings | the back-and-forth of arriving somewhere (keep the destination + why) |
| open threads and unresolved questions | anything already true in the repo |

**Do not pre-apply `/dream`'s durable-facts filter.** That filter ("will this still be true next month, in a different task?") belongs at consolidation, not capture. Applying it here makes the judgment once, on this machine, unrecoverably — record both the durable conventions and the change-specific context, and let `/dream` select.

### 4d. Sync delta specs, if any

- **The change carries delta specs** (`openspec/changes/<name>/specs/**`, written because it formally revises a capability's spec) → **invoke the `openspec-sync-specs` skill** (via the Skill tool) for `<name>` to fold them into `openspec/specs/`. This is OpenSpec's `/opsx:sync`.
- **No delta specs** → skip; **most changes have none** — proposal + tasks are the whole plan.

**Shipping context:** skip 4d. `/ship`'s immediately preceding `openspec-archive-change` invocation already synced delta specs; re-running sync against a missing active change is an error, not a check.

Sanity-check with `openspec list` (it should show the change + task progress). **Only run `openspec validate "$NAME"` when the change carries delta specs** — `validate` errors with "must have at least one delta" for a proposal-only change, which is *expected*, not a failure; don't gate the save on it.

## Step 5 — commit (code + change) + push + PR (body mirrors the change)

### Prose variant (the fast path from Step 1)

Step 1 routed this save here — commit straight to the default branch and stop. No branch, no PR, no CI wait, no `/ship`. Stage **only the prefixes that actually changed**, never `git add .`:

```bash
git add notes/ wiki/              # drop whichever of the two this save didn't touch
git status --porcelain            # re-check: every staged path must be under notes/ or wiki/
git commit -m "<msg>"             # HEREDOC, with the Co-Authored-By: Claude trailer
git push origin HEAD:main         # substitute the repo's actual default branch
```

Message convention by what the save carries: notes only → `notes: <topic>`; wiki pages (a `/dream` run) → `docs: <what was consolidated or gardened>`; both → `docs: <topic>`.

The `git status --porcelain` line is not ceremony — it's the last chance to catch a stray file that would put an unreviewed non-prose path on the default branch. If anything outside the allowlist is staged, unstage it and take the normal flow for the whole save.

- **The push is rejected** (protected branch, required reviews, non-fast-forward) → **don't force and don't retry.** Say plainly that the default branch is protected, then fall back to the normal flow below: cut a branch named for the prose's slug (the note's slug, or a slug describing the wiki work), push it, and open a PR whose body is the prose change.
- **The push succeeds** → skip Steps 6 and 7's normal shape; report with Step 7's prose variant.

### Normal variant

Stage the code, the OpenSpec handoff, **and the note** **by path** (never `git add .`) so they land in one commit. Normal mode stages `openspec/changes/$NAME`; shipping context stages the explicit archived `CHANGE_ROOT` plus the corresponding removals already visible to `git add -u`:

```bash
git add -u
git add openspec/changes/"$NAME" notes/"$NAME".md <relevant new source/doc/config files by path>
```

After staging and **before committing**, scan the index for each handled secret value without placing a value in a command argument or output: read it by exact key from the durable live file into a shell variable, then run `git grep --cached -l -F -- "$value"`. Output may contain paths only. An empty value is skipped. Any match stops the save, naming only the affected path; remove the value from the tracked surface and re-stage before continuing. Commit messages, generated PR text, and the final report receive the same manual exclusion check.

- **Clean tree, 0 commits ahead of `origin/main`** → nothing to push; report the change you authored and stop (a pure research/decision session is a valid `/save` with no PR).
- **Otherwise** commit with a one-line repo-style message (`feat: <topic> — <details>` / `fix: <topic> — <details>`; see `git log -5`), via HEREDOC with a `Co-Authored-By: Claude` trailer.

**Discover the preview URL** (best-effort — the PR body links it):

```bash
ROOT="$(git rev-parse --show-toplevel)"
PREVIEW_URL=$(bash "$ROOT/.claude/skills/save/scripts/preview-url.sh")
```

Then **follow [`references/git-gate.md`](references/git-gate.md) § 1** — `/save`'s PR runbook for both normal and ship-delegated checkpoints: open or update the PR, push, and regenerate the body from the change-mirror template (`PREVIEW_URL` above fills its Preview section). The body is generated, not curated. In shipping context its source and footer point at the archived `CHANGE_ROOT`, and it offers no `/continue` command.

**The push triggers CI** (where the repo has it). Go to Step 6 and wait on it.

## Step 6 — wait for CI (if any), auto-fix on failure

**Follow [`references/git-gate.md`](references/git-gate.md) § 2** — wait on checks, read-fix-repush on red under a cap of 3. In normal context, `UNKNOWN` is reported as **unverified, not absent** and does not block the checkpoint; `TIMEOUT` reports the PR link without blocking. In shipping context, use the merge-safe column: only `SUCCESS` and `NONE` are mergeable; `UNKNOWN`, `TIMEOUT`, red after the retry cap, or any ordinary failure returns a non-mergeable result to `/ship`. Then Step 7.

## Step 7 — report

Keep it short — the user invoked this to get a URL + a saved change, not a wall of text:

**Prose-only save** → a two-liner, and nothing else. Name the prose paths that landed (the note, the wiki pages, or both — list them, don't just say "prose") and say they went to the default branch, with the commit. **Omit the PR, CI, and preview sections entirely** — don't report them as missing or "none found"; they were never part of this route. Don't tell the user to run `/ship`; there's nothing to ship.

**Normal save:**

- Branch + commit pushed (`git log -1 --oneline`); PR number + URL, noting the body mirrors the change.
- **Note** — written or updated at `notes/<slug>.md`, or explicitly skipped ("nothing beyond the diff to capture").
- **Change** — synced or authored at `openspec/changes/<name>/`, its current **Status**, and the Decision-log entry appended (name the capability specs synced, if any). Resumable with `/continue <name>`.
- **CI** — ✅ green / 🔧 auto-fixed in N pushes / ❌ red after 3 (with the error) / ⏳ still running / — none configured (PR review is the gate) / ⚠️ unverified (`UNKNOWN`, with the reason). Never report `UNKNOWN` as "none configured" — one means the repo has no CI, the other means we failed to find out.
- **Preview** — a markdown link whose visible text *is* the full URL (`[https://…](https://…)`); never bare or in a code block. None found → say so (check the PR's deploy comment).

**Shipping context:** report the same checkpoint facts, but name the archived `CHANGE_ROOT` rather than an active resumable change. End with one exact result for `/ship`: `SHIP_GATE_RESULT=SUCCESS`, `SHIP_GATE_RESULT=NONE`, `SHIP_GATE_RESULT=UNKNOWN`, `SHIP_GATE_RESULT=TIMEOUT`, or `SHIP_GATE_RESULT=FAILURE`. Never include a secret value in the report.

## Hard rules
- Never `git push --force`. Never `--no-verify`.
- **Never push to the default branch — branch off (Step 3) — with exactly one exception: a prose-only save**, routed by Step 1's path test. A rejected push (protected branch) falls back to a branch + PR — never forced.
- **Never merge a PR** — not on any route, not for a prose branch that fell back. Merging is `/ship`'s, and no scheduled job or other skill does it on this skill's behalf.
- **Never build/test locally as a gate.** CI is the gate when present, else PR review; a CI failure is fixed-and-re-pushed, never a stop (except after 3 attempts).
- **Never merge** — that's `/ship` (which also archives the change).
- **The Decision log is append-only.** Never rewrite, reorder, or delete prior entries; plan sections may change, history may not.
- **The PR body is generated, not curated** — regenerate it from the change every save; never try to preserve manual body edits (reviewers comment instead).
- **One change per line of work** — update the branch's existing `openspec/changes/<branch>/` rather than spawning duplicates. No GitHub handoff issues — the OpenSpec change is the plan.
- **Shipping context never recreates the active change.** The explicitly resolved archive is the handoff, and `/ship` alone performs the merge after consuming `SHIP_GATE_RESULT`.
