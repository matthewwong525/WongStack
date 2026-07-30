# CLAUDE.md

## What this is

This repo is **WongStack** — a repo-native AI knowledge-center toolkit, distributed as a **template you clone and work from**. It centralizes process knowledge in repo files so humans and agents can run the same workflows, preserve decisions, and improve the process as work happens. The whole payload is the repo root: [`.claude/skills/`](.claude/skills/) (Claude Code's native skill location, also readable by other agents), the [OpenSpec](https://github.com/Fission-AI/OpenSpec) planning layer (`openspec/` plus the generated `.claude/commands/opsx/` and `openspec-*` skills), [`wiki/`](wiki/), [`VERSION`](VERSION), [`CHANGELOG.md`](CHANGELOG.md), and the `WONG-STACK` block in this file. The [`wong-setup`](.claude/skills/wong-setup/SKILL.md) skill guides *other* repos through onboarding once (git, GitHub, OpenSpec, a seed manifest) and hands the install itself to `wong-sync`, which copies in every payload file the repo lacks; from then on [`wong-sync`](.claude/skills/wong-sync/SKILL.md) — itself part of the payload, with the canonical [payload manifest](.claude/skills/wong-sync/references/payload-manifest.md) inside it — keeps a repo current by copying in what's missing and *proposing* what's worth adopting, never overwriting. Sending improvements back up is a manual pull request ([contributing](wiki/contributing.md)). See the [README](README.md) for the user story.

It's a **meta-repo** that ships WongStack *and* dogfoods it — the block below applies here too. Don't run `/wong-setup` or `/wong-sync` here; it's the source, not a target (both stop when the clone *is* the current repo).

**Working on WongStack:**
- **Editing the payload is a release** — add a [`CHANGELOG.md`](CHANGELOG.md) entry and bump [`VERSION`](VERSION) (semver) so the updater can detect and explain it.
- Skills run from a target repo's `.claude/skills/`, so they reference files by **repo-relative path** (`$(git rev-parse --show-toplevel)/.claude/skills/...`) — never `${CLAUDE_PLUGIN_ROOT}` or an absolute path.
- Rulebook canonical: [`wiki/wiki-style.md`](wiki/wiki-style.md) — the payload copy the installer places at a target's wiki root; the skills (`/dream`, `/improve docs`) read the repo's own copy there.
- **The WongStack skills own all git; OpenSpec never runs git.** `/explore`·`/plan`·`/apply` front `/opsx:explore`·`/opsx:propose`·`/opsx:apply` and implement no git themselves; when `/apply` completes every task it automatically hands the change to `/save`. `/save`·`/continue`·`/ship` own every git action — `/save` runs `/opsx:sync`, `/continue` checks out the branch then hands off to `/apply`, `/ship` runs `/opsx:archive`. When you touch one of the git skills, keep the OpenSpec step it fronts intact. The one scoped exception: `/wong-sync` runs **no git in the repo it syncs** (what it copies and proposes waits for `/save`) and treats its cached WongStack clone as **read-only** — fetch, checkout, reset, never branch or push.

<!-- WONG-STACK:BEGIN — generic WongStack conventions. The installer lifts this block verbatim into a target repo's CLAUDE.md, so keep it free of repo-specifics. Edit freely between the markers. -->

## Where context lives

The repo is the shared memory for humans and agents. `wiki/` is the source of truth for
**how we do things** — reusable process and conventions alike. Before any non-trivial change,
**find and read the owning doc** rather than guessing from code or memory. Start at
[`wiki/README.md`](wiki/README.md) and drill down: index → section README → the specific page.
The philosophy is [`wiki/agent-knowledge-center.md`](wiki/agent-knowledge-center.md); how the
wiki is organized is [`wiki/wiki-style.md`](wiki/wiki-style.md).

The plan for **what we're changing** lives in **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** —
each change is a folder under `openspec/changes/<name>/` (proposal, delta specs, design, tasks).
Run `openspec list` to see active changes from any clone; `openspec show <name>` to read one.
The record of **what shipped** is the **archived change** in `openspec/changes/archive/`, with the
synced result in `openspec/specs/`. No GitHub planning or summary issues — the change *is* the plan
and its archive *is* the record.

The raw record of **what a session figured out** is [`notes/`](notes/) — one note per line of work at
`notes/<slug>.md`, keyed by the same slug as the branch and the change. `/save` writes it (it's the
only skill that reads the conversation); `/dream` consolidates it into `wiki/` from *any* machine,
because it reads committed notes rather than scrollback. Four surfaces, one job each:

| Surface | Holds | Lifecycle |
|---|---|---|
| `openspec/changes/<slug>/` | the plan, and why this change is shaped this way | ships, then archives |
| `notes/<slug>.md` | everything else the session produced | permanent, mutable |
| `wiki/` | what survived consolidation — how we do things | canonical, curated |
| `openspec/specs/` + archive | what shipped | immutable record |

Don't duplicate across them: a fact about why the change is shaped that way lives in its Decision
log, not the note. The convention is [`notes/README.md`](notes/README.md).

**Credentials and config already live in the repo's environment files** — don't ask for a token or
stub a call out when a task needs one. `.env.example` is the committed map: every variable the
project reads, each with a comment on what it is and where it comes from. Read that to learn what a
task needs; the filled-in values sit in a git-ignored `.env` at the repo root (or your stack's
dotenv equivalent) for when you actually need to run something — a one-off script, a real API call.
The convention is [`wiki/development/secrets.md`](wiki/development/secrets.md).

## Rules

- **CI is the gate when present, else PR review.** The durable system is pull requests (any
  forge), version control, OpenSpec, and everything-lives-in-the-repo; GitHub Actions is an
  optional accelerator, honored when configured. Where checks exist, push and let CI run — the
  skills wait and fix failures; where they don't, the PR (plus the OpenSpec change and its
  archive) is the record a human reviews. Either way, nothing builds locally as a prerequisite.
- **Use the WongStack skills** — a thin verb over each OpenSpec step, so you never type `/opsx:*`
  by hand (though it's there if you want it):
  `/explore` (think it through — `/opsx:explore`), `/plan` (draft the change — `/opsx:propose`),
  `/apply` (implement the tasks, then hand completed work to `/save` — `/opsx:apply`), `/save` (sync specs + maintain the Status header +
  append to the Decision log + push + PR-body mirror + preview — `/opsx:sync`),
  `/continue [name]` (resume the branch cold, then hand off to `/apply`), `/ship` (merge + archive —
  `/opsx:archive`), `/dream` (consolidate `notes/` into the wiki + garden it), `/improve` (read-only advisor; `/improve docs`
  for the wiki). Full loop: `/explore → /plan → /apply → /save → /continue → /ship`.
  Branch name = change name = note name ties a branch to its plan and its session context.
- **Prose goes straight to `main`.** When a `/save`'s entire diff sits inside the **prose
  allowlist** — the two path prefixes `notes/**` and `wiki/**` — it commits **straight to the
  default branch**: no change, no branch, no PR, no `/ship`. That covers a conversation-only session
  (just a note) and a `/dream` run (wiki pages plus the `consolidated:` stamps). The gate exists to
  stop unreviewed *behavior* reaching `main`, and neither surface carries behavior — a note is raw
  and non-canonical, and a wiki page is prose you already reviewed in-session on the diff `/dream`
  produced. The carve-out is **exact and by path**: one changed path outside the allowlist and the
  normal branch + PR flow applies to the whole save.
- **Routing is by path prefix, never by file extension.** Markdown is not a proxy for prose here:
  `.claude/**` *is* the payload (editing it is a release), `openspec/**` *is* the specs, and
  `AGENTS.md`/`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `VERSION`, `app/**`, and every config file
  keep the full gate. The allowlist is closed — a new surface gets the gate until someone
  deliberately adds it.
- **Stay in sync with WongStack** — `/wong-sync` copies in any payload file this repo doesn't have
  yet, then *adapts* rather than overwrites: it reads what upstream lets you do against what this
  repo already does, and proposes the worthwhile gap as an OpenSpec change you review and `/apply`.
  It **never modifies a file that already exists**, so local customization is safe and a capability
  you already solve your own way is left alone. Everything it writes lands uncommitted; checkpoint
  it with `/save`. Sending an improvement the other way is a manual pull request — the bar and the
  route: [contributing](wiki/contributing.md).
- **Don't edit `wiki/` mid-task** unless it's explicitly the task — reach for `/dream` when a
  reusable process is worth capturing, with the change and diff in hand.
- **Document general, reusable processes only.** The specifics of a given change live in its
  proposal and specs (and its archive), not the wiki.

<!-- WONG-STACK:END -->
