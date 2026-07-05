# Changelog

The `/install-wong-stack` updater reads the entries newer than your installed version
(`.claude/.wong-stack.json`) and walks you through each change. Newest first.

## 2.2.0 — `/improve` — a senior codebase advisor (+ a `docs` variant)

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
