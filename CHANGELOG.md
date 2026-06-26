# Changelog

The `/install-wong-framework` updater reads the entries newer than your installed version
(`.claude/.wong-framework.json`) and walks you through each change. Newest first.

## 1.0.0 — Template + installer

First release of the Wong Framework as a **template you clone and work from** rather than a
Claude Code plugin. If you used the old `claude-framework` plugin (`/framework:save`,
`/framework:ship`, …), this replaces it; the installer migrates the legacy traces.

- **No more plugin / marketplace.** The framework lives at the repo root (`.claude/skills/`,
  `docs/`, `CLAUDE.md`) — clone it and every command is live. Commands are plain `/save`,
  `/preview`, `/continue`, `/ship`, `/document` (no `framework:` namespace).
- **`/install-wong-framework`** — a normal skill in `.claude/skills/`; guided, re-runnable
  installer/updater that deep-researches a target repo, merges its `CLAUDE.md` with the
  framework's conventions, installs the skills, and seeds the `docs/` wiki. Re-run to update.
- **`/ship` now records a GitHub summary issue, not a daily note.** The `daily/` folder is
  gone. Each `/ship` runs two subagents in parallel — one creates/updates a per-conversation
  **summary issue** (the **changes** in the body, a **conversation summary** as a comment;
  closed when the squash-merge lands), one updates `docs/` with any reusable process. The set
  of closed summary issues is the project's conversation log.
- **CLAUDE.md carries `WONG-FRAMEWORK:BEGIN/END` markers** so the updater can re-merge the
  framework block without touching your own content (your "What this is" stays yours).
