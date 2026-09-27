# CLAUDE.md

## What this is

This repo is **WongStack** — an **AI assistant and knowledge center a business owner and their team run their business on**, living in a repo, distributed as a **template you clone and work from**. You ask for anything and it gets done; what it learns, and the process for changing code, stay in repo files so humans and agents share one memory. The payload is the repo root: [`.claude/skills/`](.agents/skills/), the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI and planning records (`openspec/`), [`.claude/rules/`](.agents/rules/), [`wiki/`](wiki/), [`VERSION`](VERSION), [`CHANGELOG.md`](CHANGELOG.md), and the `WONG-STACK` block in this file. [`wong-setup`](.agents/skills/wong-setup/SKILL.md) installs WongStack into an empty folder once, and provisions Cloudflare there; [`wong-sync`](.agents/skills/wong-sync/SKILL.md) — with the canonical [payload manifest](.agents/skills/wong-sync/references/payload-manifest.md) inside it — plans each update through the normal workflow. See the [README](README.md) for the user story.

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

- **Do a plain request directly.** Research, errands, reminders, and questions need no verb and no question round; ask only when you cannot act without an answer. One that edited a repo file, such as a wiki note, ends by asking *publish it?*: [the change loop](wiki/development/the-change-loop.md).
- **Offer a routine or a mini app when a finished task will clearly come back** — the person said it recurs, or memory shows they asked before. Put it in the closing next-step question, offer once, and remember a no: [offer a routine or an app](wiki/development/the-change-loop.md#offer-a-routine-or-an-app).
- **Keep messages short and plain**, in [our voice](wiki/voice.md): the point first, a few lines, everyday words. Name git, OpenSpec, or CI only when the person asks or must act; give more detail only when asked. Keep code, commands, identifiers, and quotations exact. Write plans, questions, and reports in [plain words](.agents/skills/explore/references/asking-the-user.md#write-in-plain-words) for everyone.
- **A person just asks to build or change code; you run the verbs** `/explore → /plan → /apply → /save → /ship`, with `/continue` to pick saved work back up, `/verify` for evidence, `/improve` for maintenance, `/routine` for schedules, and `/wong-sync` for updates. With no verb, stop at the plan's review link to ask "build it now?", and after `/apply`'s preview from this host to ask "publish it?"; only `/save` and `/ship` push. A verb the person types keeps its own reach, and a verb whose precondition is missing invokes the verb before it: [the change loop](wiki/development/the-change-loop.md#just-ask). A verb the person invokes also serves work that changes no repo file, with a to-do and a confirm before each outward action.
- **Print the plan's link whenever you make or change a plan** — *Click here to see the plan:* on its own line, above the closing question, whatever verb made the plan and even when the build goes on; that question also offers *Review the plan*, which prints the link again and waits: [print the plan's link](.agents/skills/explore/references/asking-the-user.md#print-the-plans-link).
- **Build a new standalone page or tool as a mini app**: its own folder, served by the main app at `/apps/<name>/`, through the same loop as any change: [mini apps](wiki/stack/mini-apps.md).
- **The WongStack skills own all git; OpenSpec never runs git.** `/apply` reads branch changes but makes none: [the change loop](wiki/development/the-change-loop.md).
- **CI is the gate when present, else PR review; nothing builds locally**: [the gate](wiki/development/the-change-loop.md#the-gate).
- **Send an improvement upstream by hand**: [contributing](wiki/contributing.md).
- **Schedule `/improve` only from a clean, current, serialized checkout**: [repository improvement](wiki/development/repository-improvement.md).
- **Write repeatable knowledge to the wiki when you learn it** — the test: will it help with a future task that is not this one? Place it by [the wiki rules](wiki/wiki-style.md#repeatable-knowledge); a change's specifics stay in its proposal and archive.
- **Browse as the person, one task at a time**: [saved logins](wiki/development/home.md#saved-browser-logins).
- **Path-scoped conventions load from [`.claude/rules/`](.agents/rules/)**; an agent that doesn't auto-load them reads the rules whose `paths:` match the files it touches.

<!-- WONG-STACK:END -->
