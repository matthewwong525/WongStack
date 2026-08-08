# CLAUDE.md

## What this is

This repo is **WongStack** — a repo-native AI knowledge-center toolkit, distributed as a **template you clone and work from**. It centralizes process knowledge in repo files so humans and agents can run the same workflows, preserve decisions, and improve the process as work happens. The whole payload is the repo root: [`.claude/skills/`](.claude/skills/) (Claude Code's native skill location, also readable by other agents), the [OpenSpec](https://github.com/Fission-AI/OpenSpec) planning layer (`openspec/` plus the generated `.claude/commands/opsx/` and `openspec-*` skills), [`wiki/`](wiki/), [`VERSION`](VERSION), [`CHANGELOG.md`](CHANGELOG.md), and the `WONG-STACK` block in this file. The [`wong-setup`](.claude/skills/wong-setup/SKILL.md) skill guides *other* repos through onboarding once (git, GitHub, OpenSpec, a seed manifest) and hands the install itself to `wong-sync`, which copies in every payload file the repo lacks; from then on [`wong-sync`](.claude/skills/wong-sync/SKILL.md) — itself part of the payload, with the canonical [payload manifest](.claude/skills/wong-sync/references/payload-manifest.md) inside it — keeps a repo current by copying in what's missing and *proposing* what's worth adopting, never overwriting. Sending improvements back up is a manual pull request ([contributing](wiki/contributing.md)). See the [README](README.md) for the user story.

It's a **meta-repo** that ships WongStack *and* dogfoods it — the block below applies here too. Don't run `/wong-setup` or `/wong-sync` here; it's the source, not a target (both stop when the clone *is* the current repo).

**Working on WongStack:**
- **Editing the payload is a release** — add a [`CHANGELOG.md`](CHANGELOG.md) entry and bump [`VERSION`](VERSION) (semver) so the updater can detect and explain it.
  - **Run `node scripts/check-payload-links.mjs`** alongside the `VERSION` bump and the `CHANGELOG.md` entry. It resolves every internal link against the file set a *target* receives, in each install shape. **This repo cannot detect the problem by inspection: every payload link resolves here**, because this repo holds the payload plus everything around it — a page citing an owner that isn't in the manifest looks fine locally and is a dead link on arrival. It distinguishes *dead* (resolves in no shape — a defect, and it exits non-zero) from *conditional* (resolves only where the target took that opt-in category — reported, not failed).
  - **A template or fragment is code, not prose.** Renaming a variable a script reads — in `.env.example`, a config fragment, a workflow's `env:` — is a **behavioural** change: version bump and changelog entry, never a `docs(...)` commit. `CLOUDFLARE_API_TOKEN` regressed twice this way, because the diff looks like documentation and the failure is silent (a token under an unread name is indistinguishable from an unprovisioned repo). Where a value appears in both a template and something that reads it, one file [owns the name](wiki/stack/cloudflare-credentials.md#store-it) and every other surface links to it.
- Skills run from a target repo's `.claude/skills/`, so they reference files by **repo-relative path** (`$(git rev-parse --show-toplevel)/.claude/skills/...`) — never `${CLAUDE_PLUGIN_ROOT}` or an absolute path.
- Rulebook canonical: [`wiki/wiki-style.md`](wiki/wiki-style.md) — the payload copy the installer places at a target's wiki root; the skills (`/dream`, `/improve docs`) read the repo's own copy there.
- **The WongStack skills own all git; OpenSpec never runs git.** `/explore`·`/plan`·`/apply` front `/opsx:explore`·`/opsx:propose`·`/opsx:apply` and implement no git themselves; `/apply` delegates to `/plan` first when its current work has no apply-ready change, then hands completed tasks to `/save`. `/save`·`/continue`·`/ship` own every git action — `/save` runs `/opsx:sync`, `/continue` checks out the branch then hands off to `/apply`, `/ship` runs `/opsx:archive`. When you touch one of the git skills, keep the OpenSpec step it fronts intact. The one scoped exception: `/wong-sync` runs **no git in the repo it syncs** (what it copies and proposes waits for `/save`) and treats its cached WongStack clone as **read-only** — fetch, checkout, reset, never branch or push.

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
stub a call out when a task needs one. `.env.example` is the committed, values-blank map: every
variable the project reads, each with a comment on what it is and where it comes from. Read that to
learn what a task needs. Real values sit in the git-ignored `.env` at the **primary Git worktree**
(or your stack's dotenv equivalent), so a linked worktree never becomes the only copy. When adding
a variable, save its real value there and add the blank documented declaration to the active
branch's example; a value-only rotation changes no example. `/save` is the universal checkpoint and
must exclude credential values from notes, plans, commits, PR bodies, and output. The full rule,
including worktree resolution and duplicate reconciliation, is
[`wiki/development/secrets.md`](wiki/development/secrets.md).

## Rules

- **Always use ASD-STE100 Simplified Technical English** for user-facing prose and documentation.
  Best-effort compliance is sufficient when the full standard or its controlled vocabulary is not
  available. Keep code, commands, identifiers, quotations, and prescribed text exact.
- **CI is the gate when present, else PR review; nothing builds locally as a prerequisite.** The
  ladder and what an unverifiable check means are stated in
  [the change loop](wiki/development/the-change-loop.md#the-gate) — the one place that owns them.
  Nothing else gates a merge; the staging walkthrough is `/walk`'s job and gates nothing.
- **Use the WongStack skills** — a thin verb over each OpenSpec step, so the OpenSpec layer is
  something you drive through these verbs rather than invoke directly. (`openspec init` generates
  five `openspec-*` skills, which the verbs below call; it generates no `/opsx:*` slash commands, so
  don't reach for one.)
  `/explore` (think it through — `openspec-explore`), `/plan` (draft the change — `openspec-propose`),
  `/apply` (ensure an apply-ready change, invoking `/plan` when needed; implement the tasks, then hand completed work to `/save` — `openspec-apply-change`), `/save` (sync specs + maintain the Status header +
  append to the Decision log + push + PR-body mirror + preview — `openspec-sync-specs`),
  `/continue [name]` (resume the branch cold, then hand off to `/apply`), `/ship` (archive —
  `openspec-archive-change` — then invoke ordinary `/save` once and merge), `/dream`
  (consolidate `notes/` into the wiki + garden it), `/improve` (read-only advisor; `/improve docs`
  for the wiki). Full loop: `/explore → /plan → /apply → /save → /continue → /ship`.
  In a live session `/explore → /apply` is also valid: `/apply` performs the `/plan` stage first when needed.
  Beside the loop: `/walk` (invoke `/save`, then drive the change's scenarios through a browser
  against the deployed preview and post the evidence to the PR — gates nothing, run it whenever).
  Branch name = change name = note name ties a branch to its plan and its session context.
- **Prose goes straight to `main`.** A `/save` whose entire diff sits inside the prose allowlist —
  `notes/**` + `wiki/**` — commits to the default branch with no branch, PR, or `/ship`. Routing is
  **by path prefix, never by file extension**, and the allowlist is closed: markdown under
  `.claude/**` or `openspec/**`, and the repo-root files, keep the full gate. Scope, rationale, and
  the exactness rule: [the change loop](wiki/development/the-change-loop.md#the-prose-allowlist).
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
