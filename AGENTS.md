# CLAUDE.md

## What this is

This repo is **WongStack** — a repo-native AI knowledge-center toolkit, distributed as a **template you clone and work from**. It centralizes process knowledge in repo files so humans and agents run the same workflows, preserve decisions, and improve the process as work happens. The payload is the repo root: [`.claude/skills/`](.agents/skills/), the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI and planning records (`openspec/`), [`.claude/rules/`](.agents/rules/), [`wiki/`](wiki/), [`VERSION`](VERSION), [`CHANGELOG.md`](CHANGELOG.md), and the `WONG-STACK` block in this file. [`wong-setup`](.agents/skills/wong-setup/SKILL.md) installs WongStack into an empty folder once, and provisions Cloudflare there; [`wong-sync`](.agents/skills/wong-sync/SKILL.md) — with the canonical [payload manifest](.agents/skills/wong-sync/references/payload-manifest.md) inside it — plans each update through the normal workflow. See the [README](README.md) for the user story.

It is a **meta-repo** that ships WongStack *and* dogfoods it — the block below applies here too. Don't run `/wong-setup` or `/wong-sync` here; this is the source, not a target (both stop when the clone *is* the current repo).

Working on WongStack itself — the release ritual, the link checker, what counts as code — loads from [`.claude/rules/payload.md`](.agents/rules/payload.md) the moment you touch a payload file. The full process lives in [wiki/development/](wiki/development/README.md).

<!-- WONG-STACK:BEGIN — generic WongStack conventions. The installer lifts this block verbatim into a target repo's CLAUDE.md, so keep it free of repo-specifics. Edit freely between the markers. -->

## Where context lives

The repo is the shared memory for humans and agents. Before any non-trivial change, **find and read the owning doc** rather than guessing — start at [`wiki/README.md`](wiki/README.md) and follow the links down. Four surfaces, one job each:

| Surface | Holds | Lifecycle |
|---|---|---|
| `openspec/changes/<slug>/` | the plan, and why this change is shaped this way | ships, then archives |
| memory store (outside git) | facts every session produced — what the user said, decisions, open threads; a digest loads at session start, with your own page and facts from [home](wiki/development/home.md) ([convention](wiki/development/memory.md)) | permanent; superseded, never edited |
| `wiki/` | repeatable knowledge — process, people, the company, the project ([philosophy](wiki/agent-knowledge-center.md), [style](wiki/wiki-style.md)) | canonical, curated; grows from use |
| `openspec/specs/` + archive | what shipped | immutable record |

Don't duplicate a fact across surfaces. `openspec list` shows active changes; `openspec show <name>` reads one.

Credentials already live in the repo's environment files — `.env.example` is the committed, values-blank map; real values sit in the git-ignored `.env` at the primary worktree. Don't ask for a token or stub a call: read [the secrets convention](wiki/development/secrets.md).

## Rules

- **Write user-facing prose in ASD-STE100 Simplified Technical English**, best effort, in [our voice](wiki/voice.md); keep code, commands, identifiers, and quotations exact.
- **Do a plain request directly.** Research, errands, reminders, and questions need no verb and no question round; ask only when you cannot act without an answer.
- **Build or change code through the verbs** `/explore → /plan → /apply → /save → /continue → /ship`, with `/verify` for evidence, `/improve` for maintenance, `/routine` for schedules, and `/wong-sync` for updates. A verb whose precondition is missing invokes the verb before it: [the change loop](wiki/development/the-change-loop.md). A verb the person invokes also serves work that changes no repo file, with a to-do and a confirm before each outward action.
- **Build a new standalone page or tool as a mini app**: its own folder beside the main app, a preview in seconds, and no question round. Saving it runs its tests here and pushes straight to the default branch, which puts it live: [mini apps](wiki/stack/mini-apps.md).
- **The WongStack skills own all git; OpenSpec never runs git.** `/apply` reads branch changes but makes none: [the change loop](wiki/development/the-change-loop.md).
- **CI is the gate when present, else PR review; nothing builds locally**: [the gate](wiki/development/the-change-loop.md#the-gate).
- **Prose goes straight to `main`** when a save's whole diff sits in `wiki/**`: [the prose allowlist](wiki/development/the-change-loop.md#the-prose-allowlist).
- **Send an improvement upstream by hand**: [contributing](wiki/contributing.md).
- **Schedule `/improve` only from a clean, current, serialized checkout**: [repository improvement](wiki/development/repository-improvement.md).
- **Write repeatable knowledge to the wiki when you learn it** — the test: will it help with a future task that is not this one? Place it by [the wiki rules](wiki/wiki-style.md#repeatable-knowledge); a change's specifics stay in its proposal and archive.
- **Browse as the person, one task at a time**: [saved logins](wiki/development/home.md#saved-browser-logins).
- **Answer in a few lines**; give more detail only when asked.
- **Path-scoped conventions load from [`.claude/rules/`](.agents/rules/)**; an agent that doesn't auto-load them reads the rules whose `paths:` match the files it touches.

<!-- WONG-STACK:END -->
