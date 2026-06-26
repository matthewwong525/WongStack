# WongFramework

A **stack-agnostic workflow framework for [Claude Code](https://claude.com/claude-code)**, distributed as a **template you clone and work from** — not a plugin. It distills a proven way of working — checkpoint, resume, ship, document — into a handful of skills that work in **any GitHub repo**.

It's **GitHub-native**: GitHub Actions is the build gate, the per-commit preview URL is auto-discovered, and the record of what shipped lives in GitHub issues. The skills land directly in your repo's `.claude/skills/`, so commands are plain `/save`, `/ship`, `/continue`, `/preview`, `/document` (no namespace, no marketplace). One guided command, **`/install-wong-framework`**, integrates and later updates the whole thing.

## What you get

| Command | What it does |
| --- | --- |
| `/save` | Checkpoint: push the branch (auto-creating it + committing a dirty tree), open/update a PR, snapshot the session into a durable **handoff issue** (the body *is* the resumable plan), wait for CI green (auto-fixing), return the **preview URL**. Never merges. |
| `/preview` | Alias for `/save`, leading with the preview URL. |
| `/continue <issue#>` | Resume on **any machine** from a handoff issue/PR: load the plan, check out the branch, continue. Add an instruction to steer (`/continue 42 fix the failing test`). |
| `/ship` | Finish a branch: distill any **reusable process** into `docs/` and record a **summary issue** for the conversation (both via parallel subagents), wait for CI green, then **squash-merge** — which closes the summary issue. |
| `/document` | Write/update a process doc by **progressive-disclosure** rules (atomic pages, stand-alone openers, generous linking). |
| `/install-wong-framework` | Guided installer **and** updater: researches your repo, merges your `CLAUDE.md` with the framework's, installs the skills, seeds the wiki — asking along the way. Re-run to update. |

## The ideas behind it

- **A handoff issue is the unit of continuity.** `/save` writes the plan *as* an issue body; `/continue` rebuilds a cold session from that one durable surface. The plan travels, not the context window.
- **CI is the only gate.** Nothing builds locally. You push; GitHub Actions run; the skills wait and, on red, read-fix-repush (capped). `/ship` merges only on green.
- **Preview URLs are discovered, not configured** — Vercel, Netlify, Cloudflare, Render, GitHub Pages, … attach the URL to the commit/PR in a standard way; the framework finds it.
- **Knowledge has two homes.** Reusable *processes* → the `docs/` progressive-disclosure tree (written at `/ship`). A conversation's *specifics* → its `/ship` **summary issue** (changes in the body, conversation summary as a comment), closed on merge. The closed issues are the project's searchable log.

## Install

**The repo *is* the template** (everything at the root), so it's usable two ways.

**Work from it directly** — clone and go; every command is live:
```bash
git clone https://github.com/matthewwong525/WongFramework && cd WongFramework
```

**Or install it into another repo** — symlink the installer (so it can find its source clone), then run it in the target repo:
```bash
git clone https://github.com/matthewwong525/WongFramework ~/src/WongFramework
ln -s ~/src/WongFramework/.claude/skills/install-wong-framework ~/.claude/skills/install-wong-framework
```
```
/install-wong-framework
```
It researches what's there, asks how to merge your `CLAUDE.md` and docs, installs the skills, and seeds the wiki — nothing overwritten without your say-so. **Symlink, don't copy** — the installer locates the payload relative to its own clone.

## Quick start

```
/install-wong-framework   # research → questions → integrate
# …work…
/save                     # checkpoint → preview URL + handoff issue
/continue 42              # …later, on any machine
/ship                     # docs + summary issue, then squash-merge on green CI
```

## Updating

```bash
git -C ~/src/WongFramework pull          # symlinked installer now points at the latest
```
```
/install-wong-framework                  # diffs your install, walks you through what changed, re-merges
```
The updater reads `.claude/.wong-framework.json`, compares to the clone's `VERSION`, and walks the [CHANGELOG](CHANGELOG.md) — never clobbering a skill or doc you've customized.

## Requirements

- [`gh`](https://cli.github.com/), authenticated (`gh auth login`), and `jq`.
- A GitHub repo. CI + preview deploys are optional — without CI, `/save`/`/ship` just have no checks to wait for.

## Layout

```
WongFramework/
├── CLAUDE.md                    # app-specific "What this is" + framework block (WONG-FRAMEWORK markers)
├── VERSION  ·  CHANGELOG.md      # payload semver + the updater's change log
├── docs/{README.md, wiki-style.md}
└── .claude/skills/
    ├── install-wong-framework/  # guided installer/updater (NOT copied into target repos)
    ├── save/        SKILL.md + scripts/{wait-for-checks,preview-url}.sh
    ├── preview/     (alias → save)
    ├── continue/
    ├── ship/        (parallel subagents: summary issue + docs)
    └── document/    SKILL.md + references/progressive-disclosure.md   (canonical rulebook)
```
Installing into a target repo gives it: a merged `CLAUDE.md`, `.claude/skills/{save,preview,continue,ship,document}/`, `docs/README.md` + `docs/wiki-style.md`, and a `.claude/.wong-framework.json` manifest.
