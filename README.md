# Claude Framework

A portable, **stack-agnostic workflow framework for [Claude Code](https://claude.com/claude-code)**, packaged as a plugin. It distills a proven way of working — checkpoint, resume, ship, and document — into a handful of skills that work in **any GitHub repo**, from a production app to a personal weekend project.

It's deliberately **zero-config** and **GitHub-native**: no per-repo setup file, no stack assumptions. The repo's own **GitHub Actions** are the build/test gate, and the per-commit **preview URL** is auto-discovered from GitHub. If your repo pushes to GitHub and gets preview deploys, the framework just works.

## What you get

| Command | What it does |
| --- | --- |
| `/framework:save` | Checkpoint the session: push the branch (auto-creating it + auto-committing a dirty tree), open/update a PR, snapshot the work into a durable **GitHub handoff issue** (the body *is* the resumable plan), wait for every CI check to pass (auto-fixing failures), and return the auto-discovered **preview URL**. Never merges. |
| `/framework:preview` | Alias for `save`, leading the report with the preview URL. |
| `/framework:continue <issue#>` | Rehydrate a fresh session on **any machine** from a handoff issue/PR: load the plan, check out the branch, pick up where you left off. Pass an instruction to steer (`/framework:continue 42 fix the failing test`). |
| `/framework:ship` | Finish a branch: distill any **reusable process** from the conversation into `docs/`, append a **daily note** to `daily/YYYY-MM-DD.md`, wait for CI green (auto-fixing), then **squash-merge** to the default branch. |
| `/framework:document` | Write or update a process doc following **progressive-disclosure** rules (atomic pages, stand-alone openers, generous linking). |
| `/framework:init` | Scaffold a repo to follow the framework: a thin `CLAUDE.md`, a `docs/` wiki seed, and a `daily/` folder. Idempotent and non-destructive. |

## The ideas behind it

- **A handoff issue is the unit of continuity.** `/save` writes the current plan *as* a GitHub issue body. A different computer, a fresh clone, no scrollback — `/continue <issue#>` rebuilds the working state from that one durable surface. The plan travels, not the context window.
- **CI is the only gate.** Nothing builds or tests locally as a prerequisite. You push; the repo's GitHub Actions run; the skills *wait* for them and, on red, read the failing log and fix-and-re-push (capped). `/ship` merges only when everything is green.
- **Preview URLs are discovered, not configured.** Whatever posts your preview (Vercel, Netlify, Cloudflare Pages/Workers, Render, GitHub Pages, …) attaches it to the commit or PR in a standard way; the framework finds it.
- **Docs are a progressive-disclosure tree.** One place to start, every page drilling into more detail and standing on its own. `/ship` is where durable knowledge gets written — but only **general, reusable processes**. The day-to-day specifics go in `daily/`.
- **Daily notes are the log.** Each `/ship` appends a dated summary of the conversation, one `# H1` per conversation per day. A teammate reads the day's file to catch up without the diffs.

## Install

This repo is a Claude Code **plugin marketplace**. Add it once, then install the plugin:

```
/plugin marketplace add matthewwong525/ClaudeFramework
/plugin install framework@claude-framework
```

(Private repo — your `gh`/git credentials handle auth. Local path also works for development:
`/plugin marketplace add ~/Documents/ClaudeFramework`.)

The skills are namespaced under the plugin, so you invoke them as `/framework:save`, `/framework:ship`, etc. — they can't collide with a repo's own skills.

### Per-repo / per-team enablement (optional)

To make a repo declare "this app uses the framework" so collaborators get prompted to install, add to the repo's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "claude-framework": { "source": { "source": "github", "repo": "matthewwong525/ClaudeFramework" } }
  },
  "enabledPlugins": { "framework@claude-framework": true }
}
```

## Quick start in a new (or personal) app

```
/framework:init      # scaffold CLAUDE.md + docs/ + daily/   (idempotent)
# …do some work…
/framework:save      # checkpoint, get a preview URL + a handoff issue
# …on another machine, or later…
/framework:continue 42
# …when it's done…
/framework:ship      # writes the docs + daily note, then squash-merges on green CI
```

## Requirements

- The [`gh` CLI](https://cli.github.com/), authenticated (`gh auth login`).
- `jq` (used by the CI-wait and preview-discovery scripts).
- A GitHub repo. CI checks and preview deploys are optional but recommended — without CI, `/save`/`/ship` simply have no checks to wait for.

## Layout

```
ClaudeFramework/
├── .claude-plugin/marketplace.json     # the marketplace catalog (this repo)
└── plugins/framework/
    ├── .claude-plugin/plugin.json      # the plugin manifest (no version → every commit auto-updates)
    └── skills/
        ├── save/        SKILL.md + scripts/{wait-for-checks,preview-url}.sh
        ├── preview/     SKILL.md  (alias → save)
        ├── continue/    SKILL.md
        ├── ship/        SKILL.md
        ├── document/    SKILL.md + references/progressive-disclosure.md   (the docs rulebook)
        └── init/        SKILL.md + templates/
```

## Updating

The plugin manifest intentionally omits `version`, so Claude Code tracks the git commit — `/plugin update framework` (or just re-running after a `git pull` of the marketplace) picks up the latest. To pin a version for stability, add `"version": "x.y.z"` to `plugins/framework/.claude-plugin/plugin.json` and bump it on each release.
