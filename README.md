# WongStack

A **stack-agnostic workflow toolkit for [Claude Code](https://claude.com/claude-code)**, distributed as a **template you clone and work from** — not a plugin. It distills a proven way of working — plan, build, checkpoint, ship, document — into a handful of skills that work in **any GitHub repo**.

Planning runs on **[OpenSpec](https://github.com/Fission-AI/OpenSpec)**: what you're building is a spec under `openspec/changes/`, visible from any clone; the skills are thin verbs over its loop, so you never type `/opsx:*` by hand. Delivery rides on **pull requests** (any forge): CI is an **optional accelerator** — honored as the gate when configured, otherwise PR review is the gate — the per-commit preview URL is auto-discovered, and the record of what shipped is the **archived spec**. The skills land directly in your repo's `.claude/skills/`, so commands are plain `/explore`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `/document`, `/improve` (no namespace, no marketplace). One guided command, **`/install-wong-stack`**, integrates and later updates the whole thing.

## What you get

Each verb fronts one step of the OpenSpec loop — `/explore → /plan → /apply → /save → /continue → /ship`:

| Command | What it does |
| --- | --- |
| `/explore` | *(optional)* Think a problem through before committing to a shape — fronts `/opsx:explore`. Nothing is written yet. |
| `/plan` | Draft the change: `openspec/changes/<name>/` with proposal, delta specs, design, tasks — fronts `/opsx:propose`. No git. |
| `/apply` | Implement the change: work `tasks.md`, writing the code and checking off `- [x]` as each task lands — fronts `/opsx:apply`. No git — checkpoint with `/save`. |
| `/save` | Checkpoint, the git stage: commit code + change, push, open/update a PR whose **body mirrors the change**, wait for CI green when present (auto-fixing), return the **preview URL**. Before committing it syncs the change — maintains a `**Status:**` header, **appends** to an append-only `## Decision log`, folds delta specs into `openspec/specs/` (`/opsx:sync`), and authors the change as a fallback if `/plan` was skipped. `/save <note>` sets the status. Never merges. |
| `/continue [name]` | Resume on **any machine** by change name (= branch name), PR, or the `openspec list` menu (which shows each change's Status): check out the branch, recap the plan + the tail of its Decision log, run a counts-only drift check, then hand off to `/apply`. Add an instruction to steer (`/continue add-auth fix the failing test`). |
| `/ship` | Finish a branch: wait for CI green when present (else on PR review), **squash-merge**, then archive the change (`/opsx:archive`) so the archived spec is the record. |
| `/document` | Write/update a process doc by **progressive-disclosure** rules (atomic pages, stand-alone openers, generous linking). |
| `/improve` | **Senior advisor, read-only** (adapted from [shadcn/improve](https://github.com/shadcn/improve), MIT): audit the codebase, vet findings, and write self-contained **plans** for a cheaper model or a person to execute — never edits source. In a repo that plans with OpenSpec, plans land as **change folders** under `openspec/changes/`, ready for `/continue` → `/save` → `/ship`; elsewhere, under `plans/`. Nine categories + `execute`/`branch`/`next`/`reconcile`/`--issues`. **`/improve docs`** specializes it for the `docs/` wiki. |
| `/install-wong-stack` | Guided installer **and** updater: researches your repo, merges your `CLAUDE.md` with WongStack's, installs the skills, seeds the wiki — asking along the way. Re-run to update. |
| `/contribute-wong-stack` | The **upstream inverse** of install: when you've improved a skill, a docs convention, or the CLAUDE.md block *in a target repo*, this diffs only those payload files against a WongStack clone, walks you through each drift (**keep / take-from-here / skip**), copies the approved ones up, and bumps VERSION + CHANGELOG — leaving the clone ready for `/save`. Never touches app/business files, so nothing local leaks upstream. |

## The ideas behind it

- **The spec is the unit of continuity.** The plan lives in `openspec/changes/<name>/`, not a context window — `openspec list` shows every active change from a fresh clone, and `/continue` rebuilds a cold session from it. Branch name = change name ties the plan to its code.
- **The gate is CI when present, else PR review.** Nothing builds locally either way. Where GitHub Actions run, you push; the skills wait and, on red, read-fix-repush (capped); `/ship` merges only on green. Where there's no CI, the PR — with the OpenSpec change and its archive — is what a reviewer approves before `/ship` merges. CI is an accelerator, not a requirement.
- **Preview URLs are discovered, not configured** — Vercel, Netlify, Cloudflare, Render, GitHub Pages, … attach the URL to the commit/PR in a standard way; WongStack finds it.
- **Knowledge has two homes.** Reusable *processes* → the `docs/` progressive-disclosure tree (via `/document`). A change's *specifics* → its proposal and specs, preserved in `openspec/changes/archive/` when it ships. The archive is the project's searchable record of what shipped.

## Install

**New to Claude Code?** It's Anthropic's coding agent — the least terminal-heavy way to try it is the web/desktop app at **[claude.ai/code](https://claude.com/claude-code)**. Open it on the folder you want to set up (an empty folder is fine — the installer will get you a repo and GitHub sorted, step by step). You don't need to have used Git or GitHub before.

Then paste this one line — that's the whole install:

```
Install WongStack in this repo by reading and following
https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.claude/skills/install-wong-stack/SKILL.md
```

Claude takes it from there: it clones WongStack, looks over your repo, merges your `CLAUDE.md`, sets up OpenSpec (`openspec init`), installs the skills (`/explore`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `/document`, `/improve`), and seeds the `docs/` wiki — **asking before it changes anything**, and ending by handing you your first command to run. Paste it again any time to update.

The link points straight at the installer's own runbook — [`install-wong-stack/SKILL.md`](.claude/skills/install-wong-stack/SKILL.md) — so this section never drifts from what the installer actually does. The runbook self-bootstraps the clone, and can symlink itself as a real `/install-wong-stack` command for future updates.

**Prefer to work from it directly?** Clone and every command is live, no install step:
```bash
git clone https://github.com/matthewwong525/WongStack && cd WongStack
```

## Quick start

```
# paste the install prompt above, then:
/plan add-auth      # draft the change spec (openspec/changes/add-auth/)
/apply              # implement the tasks
/save               # sync + checkpoint → PR (body mirrors the change) → preview URL
/continue add-auth  # later, on any machine: resume the branch → back into /apply
/ship               # squash-merge on green CI, then archive the change
```

## Updating

Paste the same install prompt again — the installer pulls the latest WongStack, diffs your install against it, and walks you through what changed. It reads `.claude/.wong-stack.json`, compares to the clone's `VERSION`, and walks the [CHANGELOG](CHANGELOG.md) — never clobbering a skill or doc you've customized.

## Requirements

- [`gh`](https://cli.github.com/), authenticated (`gh auth login`), and `jq`.
- A GitHub repo. CI + preview deploys are optional — without CI, `/save`/`/ship` have no checks to wait for and the gate is PR review.
- [Node.js](https://nodejs.org/) — for the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI (`npm install -g @fission-ai/openspec`, or run via `npx`). The installer offers to set it up.

## Layout

```
WongStack/
├── CLAUDE.md                    # app-specific "What this is" + WongStack block (WONG-STACK markers)
├── VERSION  ·  CHANGELOG.md      # payload semver + the updater's change log
├── openspec/                     # OpenSpec planning layer: config.yaml, changes/, specs/
├── docs/{README.md, wiki-style.md}
└── .claude/
    ├── commands/opsx/            # generated OpenSpec commands (/opsx:*)
    └── skills/
        ├── install-wong-stack/  # guided installer/updater (NOT copied into target repos)
        ├── explore/  ·  plan/    # thin verbs → /opsx:explore, /opsx:propose (no git)
        ├── apply/               # implement the tasks → /opsx:apply (no git)
        ├── save/        SKILL.md + scripts/{wait-for-checks,preview-url}.sh   (→ /opsx:sync)
        ├── continue/            # resume the branch cold, then hand off to /apply
        ├── ship/                # squash-merge + archive (→ /opsx:archive)
        ├── document/    SKILL.md + references/progressive-disclosure.md   (canonical rulebook)
        ├── improve/     SKILL.md + references/ (advisor → plans; shadcn/improve verbatim + a docs variant, MIT)
        └── openspec-*/          # generated by `openspec init` (fronted by the verbs above)
```
Installing into a target repo gives it: a merged `CLAUDE.md`, the `openspec/` scaffold + `/opsx:*` commands (via `openspec init`), `.claude/skills/{explore,plan,apply,save,continue,ship,document,improve}/`, `docs/README.md` + `docs/wiki-style.md`, and a `.claude/.wong-stack.json` manifest.
