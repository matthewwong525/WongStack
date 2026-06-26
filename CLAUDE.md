# CLAUDE.md

## What this is

This repo is **WongStack** — a stack-agnostic Claude Code workflow toolkit, distributed as a **template you clone and work from**. The whole payload is the repo root: [`.claude/skills/`](.claude/skills/), [`docs/`](docs/), [`VERSION`](VERSION), [`CHANGELOG.md`](CHANGELOG.md), and the `WONG-STACK` block in this file. The [`install-wong-stack`](.claude/skills/install-wong-stack/SKILL.md) skill copies that set (minus itself) into *other* repos. See the [README](README.md) for the user story.

It's a **meta-repo** that ships WongStack *and* dogfoods it — the block below applies here too. Don't run `/install-wong-stack` here; it's the source, not a target.

**Working on WongStack:**
- **Editing the payload is a release** — add a [`CHANGELOG.md`](CHANGELOG.md) entry and bump [`VERSION`](VERSION) (semver) so the updater can detect and explain it.
- Skills run from a target repo's `.claude/skills/`, so they reference files by **repo-relative path** (`$(git rev-parse --show-toplevel)/.claude/skills/...`) — never `${CLAUDE_PLUGIN_ROOT}` or an absolute path.
- Rulebook canonical: [`.claude/skills/document/references/progressive-disclosure.md`](.claude/skills/document/references/progressive-disclosure.md); [`docs/wiki-style.md`](docs/wiki-style.md) is a synced copy (re-copy when you edit the canonical).
- `/ship`'s subagents stay surface-isolated: summary agent → GitHub issues only, docs agent → `docs/` only; neither commits/pushes/merges.

<!-- WONG-STACK:BEGIN — generic WongStack conventions. The installer lifts this block verbatim into a target repo's CLAUDE.md, so keep it free of repo-specifics. Edit freely between the markers. -->

## Where context lives

`docs/` is the source of truth for **how we do things** — process and conventions alike.
Before any non-trivial change, **find and read the owning doc** rather than guessing from
code or memory. Start at [`docs/README.md`](docs/README.md) and drill down: index →
section README → the specific page. How the wiki is organized: [`docs/wiki-style.md`](docs/wiki-style.md).

The day-to-day record of *what shipped* lives in **GitHub issues** — `/ship` records one
summary issue per conversation (the **changes** in the body, a **conversation summary** as a
comment for extra context), closed when the work merges. Search the closed issues to catch up
without reading diffs.

## Rules

- **GitHub Actions is the build gate.** Don't run a build/test locally as a prerequisite —
  push and let CI run. The WongStack skills wait for the checks and fix failures.
- **Use the WongStack skills** instead of hand-rolling the workflow:
  `/save` (checkpoint + preview URL + handoff issue), `/preview` (alias),
  `/continue <issue#>` (resume on any machine), `/ship` (merge + write docs +
  record a summary issue), `/document` (write a process doc).
- **Don't edit `docs/` mid-task** unless it's explicitly the task — `/ship` captures reusable
  processes at the end, with the full conversation and diff in hand.
- **Document general, reusable processes only.** The specifics of a given conversation go in
  that conversation's `/ship` summary issue, not the wiki.

<!-- WONG-STACK:END -->
