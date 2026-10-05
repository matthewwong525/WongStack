# AGENTS.md

## What this is

This repo is **WongStack**: an AI assistant and knowledge center a business owner and their team run their business on, shipped as a **template you clone and work from**. The [payload manifest](.agents/skills/wong-sync/references/payload-manifest.md) lists what ships. The [README](README.md) tells the user story.

This **meta-repo** ships WongStack *and* dogfoods it, so the block below applies here too. Don't run [`/wong-setup`](.agents/skills/wong-setup/SKILL.md) or [`/wong-sync`](.agents/skills/wong-sync/SKILL.md) here; both stop.

A payload edit loads [the release rules](.agents/rules/payload.md); the full process: [wiki/maintaining/](wiki/maintaining/README.md).

<!-- WONG-STACK:BEGIN — generic conventions, copied verbatim into each install: no repo-specifics. -->

## Where context lives

Before a change, **read the owning doc**: start at [`wiki/README.md`](wiki/README.md) and follow the links down. Four memory surfaces, one job each; no fact on two:

- `openspec/changes/<slug>/`: the plan and why it has this shape. Ships, then archives.
- The memory store, outside git: each session's facts. Superseded, never edited. A digest loads at session start ([convention](wiki/development/memory.md)).
- `wiki/`: repeatable knowledge ([philosophy](wiki/agent-knowledge-center.md), [style](wiki/wiki-style.md)). Canonical and curated; grows from use.
- `openspec/specs/` and the archive: what shipped, never changed.

Before substantial work, `memory.mjs recall <question>` finds [evidence](wiki/development/document-retrieval.md); read originals. Keep `areas <path>` for warnings and `openspec list` for plans.

Credentials sit in the git-ignored `.env` at the primary worktree, mapped by the committed, values-blank `.env.example`. Don't stub a call or ask for a key in chat: declare a missing one, then [send the key link](wiki/development/secrets.md#receive-a-key-through-a-private-link).

## Rules

- **Do plain requests directly.** Research, errands, reminders, and questions need no verb; ask only for a needed answer. Repo edits end with *publish it?*: [the change loop](wiki/development/the-change-loop.md).
- **Offer a routine or a mini app when a finished task will clearly come back**: they said it recurs, or memory shows they asked before. Offer once, in the closing question; remember a no: [offer a routine or an app](wiki/development/the-change-loop.md#offer-a-routine-or-an-app).
- **Keep messages short and plain**, in [our voice](wiki/voice.md): a few lines, more only if asked. Name git, OpenSpec, or CI only if the person asks or must act; keep code, commands, identifiers, and quotes exact. Plans, questions, and reports use [plain words](.agents/skills/explore/references/asking-the-user.md#write-in-plain-words) for everyone.
- **A person just asks to build or change code; you run the verbs** `/explore → /plan → /apply → /save → /ship`, plus `/continue`, `/close`, `/verify`, `/improve`, `/routine`, and `/wong-sync`. With no verb, ask [the finished-plan question](.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step) at the plan's review link and "publish it?" after `/apply`'s preview from this host. A typed verb keeps its own reach; one missing its precondition runs the verb before it. An invoked verb also serves work that changes no repo file, with a to-do and a confirm per outward action: [just ask](wiki/development/the-change-loop.md#just-ask).
- **Print the plan's link whenever you make or change a plan**: *Click here to see the plan:* on its own line above the closing question, even if the build goes on. That question also offers *Review the plan*; only that reply adds a line under it saying to type `/apply` to build it: [print the plan's link](.agents/skills/explore/references/asking-the-user.md#print-the-plans-link).
- **Build a new standalone page or tool as a mini app**: its own folders in the main app, served at `/apps/<name>/`, through the same loop: [mini apps](wiki/stack/mini-apps.md).
- **The WongStack skills own all git; OpenSpec never runs git.** `/apply` reads branch changes but makes none: [the change loop](wiki/development/the-change-loop.md).
- **CI is the gate when present, else PR review; a local check is only a pre-check**: [the gate](wiki/development/the-change-loop.md#the-gate).
- **Send an improvement upstream by hand**: [contributing](wiki/contributing.md).
- **Schedule `/improve` only from a clean, current, serialized checkout**: [repository improvement](wiki/development/repository-improvement.md).
- **Write repeatable knowledge to the wiki when you learn it**: what will help a different, future task, placed by [the wiki rules](wiki/wiki-style.md#repeatable-knowledge). A change's specifics stay in its proposal and archive.
- **Company actions and memory reads:** [discover only the actions you need](wiki/stack/company-api.md) through the shared helper; company calls use employee login, memory keeps its installed access.
- **API keys/tokens:** [human steps](wiki/development/secrets.md#api-token-website-steps); never browse.
- **Browse as the person, one task at a time; show key moments; ask for what needs them**: [logins](wiki/development/browsing.md#saved-browser-logins), [saving passwords](wiki/development/passwords.md), [pictures](wiki/development/browsing.md#show-what-the-browser-is-doing), [asking](wiki/development/browsing.md#when-a-step-needs-you).
- **Path-scoped conventions load from [`.claude/rules/`](.agents/rules/)**; an agent that doesn't auto-load them reads those whose `paths:` match its files.

<!-- WONG-STACK:END -->
