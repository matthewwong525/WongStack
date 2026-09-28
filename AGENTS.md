# CLAUDE.md

## What this is

This repo is **WongStack**: an AI assistant and knowledge center a business owner and their team run their business on, shipped as a **template you clone and work from**. The [payload manifest](.agents/skills/wong-sync/references/payload-manifest.md) lists what ships: skills, rules, the wiki, [OpenSpec](https://github.com/Fission-AI/OpenSpec) records, and the `WONG-STACK` block below. The [README](README.md) tells the user story.

This **meta-repo** ships WongStack *and* dogfoods it, so the block below applies here too. Don't run [`/wong-setup`](.agents/skills/wong-setup/SKILL.md) or [`/wong-sync`](.agents/skills/wong-sync/SKILL.md) here; both stop.

A payload edit loads [the release rules](.agents/rules/payload.md); the full process: [wiki/development/](wiki/development/README.md).

<!-- WONG-STACK:BEGIN — generic conventions, copied verbatim into each install: no repo-specifics. -->

## Where context lives

Before a non-trivial change, **read the owning doc, not a guess**: start at [`wiki/README.md`](wiki/README.md) and follow the links down. The repo is the shared memory: four surfaces, one job each, no fact on two:

- `openspec/changes/<slug>/`: the plan, and why it has this shape. Ships, then archives.
- The memory store, outside git: each session's facts. Permanent; superseded, never edited. A digest loads at session start, with your own page and facts from [home](wiki/development/home.md) ([convention](wiki/development/memory.md)).
- `wiki/`: repeatable knowledge ([philosophy](wiki/agent-knowledge-center.md), [style](wiki/wiki-style.md)). Canonical and curated; grows from use.
- `openspec/specs/` and the archive: what shipped. An immutable record.

`openspec list` shows active changes; `openspec show <name>` reads one.

Credentials sit in the git-ignored `.env` at the primary worktree, mapped by the committed, values-blank `.env.example`. Don't ask for a token or stub a call: [the secrets convention](wiki/development/secrets.md).

## Rules

- **Do a plain request directly.** Research, errands, reminders, and questions need no verb and no question round; ask only when you cannot act without an answer. One that edited a repo file, such as a wiki note, ends by asking *publish it?*: [the change loop](wiki/development/the-change-loop.md).
- **Offer a routine or a mini app when a finished task will clearly come back**: they said it recurs, or memory shows they asked before. Offer once, in the closing question, and remember a no: [offer a routine or an app](wiki/development/the-change-loop.md#offer-a-routine-or-an-app).
- **Keep messages short and plain**, in [our voice](wiki/voice.md): a few lines, more only when asked. Name git, OpenSpec, or CI only when the person asks or must act; keep code, commands, identifiers, and quotations exact. Plans, questions, and reports use [plain words](.agents/skills/explore/references/asking-the-user.md#write-in-plain-words) for everyone.
- **A person just asks to build or change code; you run the verbs** `/explore → /plan → /apply → /save → /ship`, plus `/continue`, `/verify`, `/improve`, `/routine`, and `/wong-sync`. With no verb, stop at the plan's review link to ask "build it now?", and after `/apply`'s preview from this host to ask "publish it?"; only `/save` and `/ship` push. A typed verb keeps its own reach, and one missing its precondition runs the verb before it. An invoked verb also serves work that changes no repo file, with a to-do and a confirm before each outward action: [just ask](wiki/development/the-change-loop.md#just-ask).
- **Print the plan's link whenever you make or change a plan**: *Click here to see the plan:* on its own line above the closing question, even when the build goes on; when the plan waits, the line under it says to type `/apply` to build it. That question also offers *Review the plan*: [print the plan's link](.agents/skills/explore/references/asking-the-user.md#print-the-plans-link).
- **Build a new standalone page or tool as a mini app**: its own folder, served by the main app at `/apps/<name>/`, through the same loop: [mini apps](wiki/stack/mini-apps.md).
- **The WongStack skills own all git; OpenSpec never runs git.** `/apply` reads branch changes but makes none: [the change loop](wiki/development/the-change-loop.md).
- **CI is the gate when present, else PR review; nothing builds locally**: [the gate](wiki/development/the-change-loop.md#the-gate).
- **Send an improvement upstream by hand**: [contributing](wiki/contributing.md).
- **Schedule `/improve` only from a clean, current, serialized checkout**: [repository improvement](wiki/development/repository-improvement.md).
- **Write repeatable knowledge to the wiki when you learn it**: what will help a future task that is not this one, placed by [the wiki rules](wiki/wiki-style.md#repeatable-knowledge). A change's specifics stay in its proposal and archive.
- **Browse as the person, one task at a time; show each key moment in the chat; hand over what needs them**: [saved logins](wiki/development/home.md#saved-browser-logins), [key moments](wiki/development/home.md#show-what-the-browser-is-doing), [hand-over](wiki/development/home.md#hand-the-browser-over).
- **Path-scoped conventions load from [`.claude/rules/`](.agents/rules/)**; an agent that doesn't auto-load them reads those whose `paths:` match its files.

<!-- WONG-STACK:END -->
