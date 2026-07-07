# Changelog

The `/install-wong-stack` updater reads the entries newer than your installed version
(`.claude/.wong-stack.json`) and walks you through each change. Newest first.

## 3.0.0 — OpenSpec is the planning layer

WongStack now plans with **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** instead of GitHub
issues. A change is a folder under `openspec/changes/<name>/` (proposal, delta specs, design,
tasks) — visible from any clone via `openspec list`, and the **archived change is the record of
what shipped**. The workflow skills are now thin verbs over the native OpenSpec loop; you never
type `/opsx:*` by hand, but the commands stay available. **Breaking:** `/preview` is removed, and
`/save` / `/ship` no longer create GitHub handoff or summary issues.

- **The loop.** `/explore → /plan → /continue → /save → /ship`, each fronting one OpenSpec step:
  `/explore`=`/opsx:explore`, `/plan`=`/opsx:propose`, `/continue`=load context + `/opsx:apply`,
  `/save`=`/opsx:sync`, `/ship`=`/opsx:archive`. Documented in
  [`docs/development/the-change-loop.md`](docs/development/the-change-loop.md).
- **New skills** `/explore` and `/plan` (thin delegates to the generated `openspec-*` skills).
  **Removed** `/preview` (it was a `/save` alias — redundant now).
- **Simplified git skills.** `/save` syncs the change's delta specs into `openspec/specs/`, then
  pushes + previews (no handoff issue). `/continue` resumes by change name (= branch name), PR, or
  the `openspec list` menu, then implements. `/ship` squash-merges then archives the change (no
  summary issue, no docs distillation — use `/document`). The CI gate + preview URLs are unchanged.
- **OpenSpec never runs git; the WongStack skills own all of it.** The `openspec/` folder is
  committed with your code and reaches the default branch on `/ship`'s merge.
- **Installer.** `/install-wong-stack` now installs the `openspec` CLI and runs `openspec init` in
  the target (generating the `/opsx:*` commands + `openspec-*` skills); the manifest gains an
  `openspec` component and drops `preview` from the skill list.

## 2.4.0 — `/improve` — a senior codebase advisor (+ a `docs` variant)

New **`/improve`** skill: a **read-only senior advisor** that surveys a codebase, finds the
highest-value improvements, and writes prioritized, **self-contained plans** for a cheaper model
(or a person) to execute — it never edits source itself. It is
[shadcn/improve](https://github.com/shadcn/improve) (MIT) carried pretty much verbatim, plus one
WongStack addition: a **`docs` variant**.

- **The advisor.** Recon → Audit (parallel read-only `Explore` subagents across nine categories —
  correctness, security, performance, tests, tech-debt, dependencies, DX, docs, direction) → Vet
  (subagents over-report; every finding is confirmed against the code) → write plans under
  `plans/NNN-*.md`. Full variant set: `quick`/`deep`, a focus arg (`security`, `perf`, …),
  `branch`, `next`, `plan <desc>`, `review-plan`, `execute` (dispatch an executor subagent in an
  isolated worktree, then review its diff), `reconcile`, and `--issues`.
- **`/improve docs` — the WongStack addition.** Specializes the audit for a `docs/`
  progressive-disclosure wiki against `wiki-style.md` (structural integrity — broken links/anchors,
  orphans, hub gaps; openers & titles; one-topic-one-page; navigation; staleness; coverage), per
  `references/docs-audit-playbook.md`. Docs plans are applied by a human via `/save` → `/ship`.
- **Attribution.** shadcn's MIT license is carried in `.claude/skills/improve/LICENSE.md`; the
  SKILL and the `audit-playbook.md` / `plan-template.md` / `closing-the-loop.md` references are
  his, verbatim. The installer offers `/improve` alongside the other skills.

## 2.3.0 — Docs voice-and-tone guide

A new **`docs/voice.md`** codifies the prose style for the wiki: concise, dense, still easy to
read. [`wiki-style.md`](docs/wiki-style.md) owns a page's *shape* (titles, links,
one-topic-one-page); `voice.md` owns its *sentences*.

- **`docs/voice.md`** — the law (*say the most in the fewest words a stranger can still
  follow*), seven one-line habits, a delete-on-sight filler list, and a cut-20% test. Linked
  from [`docs/README.md`](docs/README.md) beside the rulebook.
- **Installer ships it.** `/install-wong-stack` seeds `docs/voice.md` next to the rulebook on a
  fresh install and adds/refreshes it on update, so every WongStack install inherits the voice.

## 2.2.0 — Optional auto-push hook

A new **opt-in `Stop` hook** that keeps an open PR synced without re-running `/save`. Ported
and generalized from the ClaymooApp repo WongStack was extracted from.

- **`auto-push` Stop hook** (`.claude/hooks/auto-push.sh`, wired via `.claude/settings.json`).
  Once a branch has an **open PR**, it auto-commits any pending work and pushes it on every turn.
  It no-ops on the repo's **default branch** (resolved from `origin/HEAD`, not hardcoded to
  `main` — WongStack is stack-agnostic), on a detached HEAD, and on any branch without an open
  PR, and it never blocks the turn (any hiccup just exits 0). The commit message lists the
  changed files with a diffstat body.
- **Opt-in only.** It acts every turn, so it's more intrusive than a skill — the installer
  **asks** and leaves it **off by default**. `/install-wong-stack` copies the script and *merges*
  the Stop entry into an existing `.claude/settings.json` (never clobbering your other hooks),
  refreshes it on update, and records `autoPushHook` in the manifest.

## 2.1.0 — Installer helps set up GitHub

`/install-wong-stack` now walks newcomers through GitHub setup instead of assuming it's
already done. Since every WongStack skill (`/save`, `/preview`, `/continue`, `/ship`) runs on
GitHub, the installer treats a working GitHub as a prerequisite and helps close the gap.

- **New "get GitHub working" step.** After researching the repo, the installer checks four
  rungs — is it a git repo, is `gh` installed, is `gh` authed, is there a GitHub `origin` — and
  offers to fix each it finds missing (`git init`, install `gh`, guide `gh auth login`,
  `gh repo create --push`). It explains what each piece is for, asks before any interactive or
  account-changing command, and never silently reassigns an existing remote.
- **Non-blocking.** If the user wants to set GitHub up later, install still proceeds; the report
  flags that `/save`/`/ship` won't work until auth + a remote exist.
- **Richer research.** The target-repo research now reports full GitHub readiness (git repo,
  `gh` install, auth, remote resolves) rather than just `gh auth status`.

## 2.0.0 — Renamed WongFramework → WongStack

The project is now **WongStack**. This is a rename only — no behavior changed — but it
touches user-visible names, so the updater needs to migrate existing installs.

- **`/install-wong-framework` → `/install-wong-stack`.** The installer skill and its command
  were renamed. A symlinked installer keeps working after you `git pull`; if you symlinked the
  old path (`.claude/skills/install-wong-framework`), repoint it at `install-wong-stack`.
- **Manifest renamed `.claude/.wong-framework.json` → `.claude/.wong-stack.json`.** On its next
  run the updater reads the old manifest if present and writes the new one.
- **CLAUDE.md markers renamed `WONG-FRAMEWORK:BEGIN/END` → `WONG-STACK:BEGIN/END`.** The updater
  re-merges the block under the new markers; old markers are recognized and migrated.
- **Paste-to-install.** The README's install step is now a single prompt you paste into Claude
  Code, pointing at the public [`install-wong-stack/SKILL.md`](.claude/skills/install-wong-stack/SKILL.md).
  The installer **self-bootstraps** — Step 0 clones the public repo into a cache when there's no
  local source — so the paste works from a cold start with no manual clone or symlink.

## 1.0.0 — Template + installer

First release of WongStack (then **WongFramework**) as a **template you clone and work from**
rather than a Claude Code plugin. If you used the old `claude-framework` plugin (`/framework:save`,
`/framework:ship`, …), this replaces it; the installer migrates the legacy traces.

- **No more plugin / marketplace.** WongStack lives at the repo root (`.claude/skills/`,
  `docs/`, `CLAUDE.md`) — clone it and every command is live. Commands are plain `/save`,
  `/preview`, `/continue`, `/ship`, `/document` (no `framework:` namespace).
- **`/install-wong-stack`** — a normal skill in `.claude/skills/`; guided, re-runnable
  installer/updater that deep-researches a target repo, merges its `CLAUDE.md` with
  WongStack's conventions, installs the skills, and seeds the `docs/` wiki. Re-run to update.
- **`/ship` now records a GitHub summary issue, not a daily note.** The `daily/` folder is
  gone. Each `/ship` runs two subagents in parallel — one creates/updates a per-conversation
  **summary issue** (the **changes** in the body, a **conversation summary** as a comment;
  closed when the squash-merge lands), one updates `docs/` with any reusable process. The set
  of closed summary issues is the project's conversation log.
- **CLAUDE.md carries marker comments** (then `WONG-FRAMEWORK:BEGIN/END`, renamed to
  `WONG-STACK:BEGIN/END` in 2.0.0) so the updater can re-merge the block without touching
  your own content (your "What this is" stays yours).
