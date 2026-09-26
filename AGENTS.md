# CLAUDE.md

## What this is

This repo is **WongStack** — a repo-native AI knowledge-center toolkit, distributed as a **template you clone and work from**. It centralizes process knowledge in repo files so humans and agents run the same workflows, preserve decisions, and improve the process as work happens. The payload is the repo root: [`.claude/skills/`](.claude/skills/), the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI and planning records (`openspec/`), [`.claude/rules/`](.claude/rules/), [`wiki/`](wiki/), [`VERSION`](VERSION), [`CHANGELOG.md`](CHANGELOG.md), and the `WONG-STACK` block in this file. [`wong-setup`](.claude/skills/wong-setup/SKILL.md) installs WongStack into an empty folder once, and provisions Cloudflare there; [`wong-sync`](.claude/skills/wong-sync/SKILL.md) — with the canonical [payload manifest](.claude/skills/wong-sync/references/payload-manifest.md) inside it — plans each update through the normal workflow. See the [README](README.md) for the user story.

It is a **meta-repo** that ships WongStack *and* dogfoods it — the block below applies here too. Don't run `/wong-setup` or `/wong-sync` here; this is the source, not a target (both stop when the clone *is* the current repo).

Working on WongStack itself — the release ritual, the link checker, what counts as code — loads from [`.claude/rules/payload.md`](.claude/rules/payload.md) the moment you touch a payload file. The full process lives in [wiki/development/](wiki/development/README.md).

<!-- WONG-STACK:BEGIN — generic WongStack conventions. The installer lifts this block verbatim into a target repo's CLAUDE.md, so keep it free of repo-specifics. Edit freely between the markers. -->

## Where context lives

The repo is the shared memory for humans and agents. Before any non-trivial change, **find and read the owning doc** rather than guessing — start at [`wiki/README.md`](wiki/README.md) and follow the links down. Four surfaces, one job each:

| Surface | Holds | Lifecycle |
|---|---|---|
| `openspec/changes/<slug>/` | the plan, and why this change is shaped this way | ships, then archives |
| memory store (outside git) | facts every session produced — what the user said, decisions, open threads; a digest loads at session start ([convention](wiki/development/memory.md)) | permanent; superseded, never edited |
| `wiki/` | reusable process and conventions — how we do things ([philosophy](wiki/agent-knowledge-center.md), [style](wiki/wiki-style.md)) | canonical, curated |
| `openspec/specs/` + archive | what shipped | immutable record |

Don't duplicate a fact across surfaces. `openspec list` shows active changes; `openspec show <name>` reads one.

Credentials already live in the repo's environment files — `.env.example` is the committed, values-blank map; real values sit in the git-ignored `.env` at the primary worktree. Don't ask for a token or stub a call: read [the secrets convention](wiki/development/secrets.md).

## Rules

- **Write user-facing prose in ASD-STE100 Simplified Technical English**, best effort, in [our voice](wiki/voice.md); keep code, commands, identifiers, and quotations exact.
- **Drive work through the verbs** `/explore → /plan → /apply → /save → /continue → /ship`, with `/verify` for evidence, `/improve` for maintenance, `/routine` for schedules, and `/wong-sync` for updates. A verb whose precondition is missing invokes the verb before it: [the change loop](wiki/development/the-change-loop.md).
- **The WongStack skills own all git; OpenSpec never runs git.** `/apply` reads branch changes but makes none: [the change loop](wiki/development/the-change-loop.md).
- **CI is the gate when present, else PR review; nothing builds locally**: [the gate](wiki/development/the-change-loop.md#the-gate).
- **Prose goes straight to `main`** when a save's whole diff sits in `wiki/**`: [the prose allowlist](wiki/development/the-change-loop.md#the-prose-allowlist).
- **Send an improvement upstream by hand**: [contributing](wiki/contributing.md).
- **Schedule `/improve` only from a clean, current, serialized checkout**: [repository improvement](wiki/development/repository-improvement.md).
- **Don't edit `wiki/` mid-task** unless it is the task; a change's specifics live in its proposal and archive.
- **Path-scoped conventions load from [`.claude/rules/`](.claude/rules/)**; an agent that doesn't auto-load them reads the rules whose `paths:` match the files it touches.

<!-- WONG-STACK:END -->
