# WongStack

A **stack-agnostic workflow toolkit for [Claude Code](https://claude.com/claude-code)**, distributed as a **template you clone and work from** — not a plugin. It distills a proven way of working — checkpoint, resume, ship, document — into a handful of skills that work in **any GitHub repo**.

It's **GitHub-native**: GitHub Actions is the build gate, the per-commit preview URL is auto-discovered, and the record of what shipped lives in GitHub issues. The skills land directly in your repo's `.claude/skills/`, so commands are plain `/save`, `/ship`, `/continue`, `/preview`, `/document`, `/improve` (no namespace, no marketplace). One guided command, **`/install-wong-stack`**, integrates and later updates the whole thing.

## What you get

| Command | What it does |
| --- | --- |
| `/save` | Checkpoint: push the branch (auto-creating it + committing a dirty tree), open/update a PR, snapshot the session into a durable **handoff issue** (the body *is* the resumable plan), wait for CI green (auto-fixing), return the **preview URL**. Never merges. |
| `/preview` | Alias for `/save`, leading with the preview URL. |
| `/continue <issue#>` | Resume on **any machine** from a handoff issue/PR: load the plan, check out the branch, continue. Add an instruction to steer (`/continue 42 fix the failing test`). |
| `/ship` | Finish a branch: distill any **reusable process** into `docs/` and record a **summary issue** for the conversation (both via parallel subagents), wait for CI green, then **squash-merge** — which closes the summary issue. |
| `/document` | Write/update a process doc by **progressive-disclosure** rules (atomic pages, stand-alone openers, generous linking). |
| `/improve` | **Senior advisor, read-only** (adapted from [shadcn/improve](https://github.com/shadcn/improve), MIT): audit the codebase, vet findings, and write self-contained **plans** under `plans/` for a cheaper model or a person to execute — never edits source. Nine categories + `execute`/`branch`/`next`/`reconcile`/`--issues`. **`/improve docs`** specializes it for the `docs/` wiki (applied via `/save` + `/ship`). |
| `/install-wong-stack` | Guided installer **and** updater: researches your repo, merges your `CLAUDE.md` with WongStack's, installs the skills, seeds the wiki — asking along the way. Re-run to update. |

## The ideas behind it

- **A handoff issue is the unit of continuity.** `/save` writes the plan *as* an issue body; `/continue` rebuilds a cold session from that one durable surface. The plan travels, not the context window.
- **CI is the only gate.** Nothing builds locally. You push; GitHub Actions run; the skills wait and, on red, read-fix-repush (capped). `/ship` merges only on green.
- **Preview URLs are discovered, not configured** — Vercel, Netlify, Cloudflare, Render, GitHub Pages, … attach the URL to the commit/PR in a standard way; WongStack finds it.
- **Knowledge has two homes.** Reusable *processes* → the `docs/` progressive-disclosure tree (written at `/ship`). A conversation's *specifics* → its `/ship` **summary issue** (changes in the body, conversation summary as a comment), closed on merge. The closed issues are the project's searchable log.

## Install

Open Claude Code **in the repo you want to set up** and paste this:

```
Install WongStack in this repo by reading and following
https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.claude/skills/install-wong-stack/SKILL.md
```

That's the whole install. Claude clones WongStack, researches your repo, merges your `CLAUDE.md`, installs the skills (`/save`, `/preview`, `/continue`, `/ship`, `/document`, `/improve`), and seeds the `docs/` wiki — **asking before it changes anything**. Paste it again any time to update.

The link points straight at the installer's own runbook — [`install-wong-stack/SKILL.md`](.claude/skills/install-wong-stack/SKILL.md) — so this section never drifts from what the installer actually does. The runbook self-bootstraps the clone, and can symlink itself as a real `/install-wong-stack` command for future updates.

**Prefer to work from it directly?** Clone and every command is live, no install step:
```bash
git clone https://github.com/matthewwong525/WongStack && cd WongStack
```

## Quick start

```
# paste the install prompt above, then:
# …work…
/save          # checkpoint → preview URL + handoff issue
/continue 42   # …later, on any machine
/ship          # docs + summary issue, then squash-merge on green CI
```

## Updating

Paste the same install prompt again — the installer pulls the latest WongStack, diffs your install against it, and walks you through what changed. It reads `.claude/.wong-stack.json`, compares to the clone's `VERSION`, and walks the [CHANGELOG](CHANGELOG.md) — never clobbering a skill or doc you've customized.

## Requirements

- [`gh`](https://cli.github.com/), authenticated (`gh auth login`), and `jq`.
- A GitHub repo. CI + preview deploys are optional — without CI, `/save`/`/ship` just have no checks to wait for.

## Layout

```
WongStack/
├── CLAUDE.md                    # app-specific "What this is" + WongStack block (WONG-STACK markers)
├── VERSION  ·  CHANGELOG.md      # payload semver + the updater's change log
├── docs/{README.md, wiki-style.md}
└── .claude/skills/
    ├── install-wong-stack/  # guided installer/updater (NOT copied into target repos)
    ├── save/        SKILL.md + scripts/{wait-for-checks,preview-url}.sh
    ├── preview/     (alias → save)
    ├── continue/
    ├── ship/        (parallel subagents: summary issue + docs)
    ├── document/    SKILL.md + references/progressive-disclosure.md   (canonical rulebook)
    └── improve/     SKILL.md + references/ (advisor → plans; shadcn/improve verbatim + a docs variant, MIT)
```
Installing into a target repo gives it: a merged `CLAUDE.md`, `.claude/skills/{save,preview,continue,ship,document,improve}/`, `docs/README.md` + `docs/wiki-style.md`, and a `.claude/.wong-stack.json` manifest.
