# CLAUDE.md

## What this is

This repo is **WongStack** — a repo-native AI knowledge-center toolkit, distributed as a **template you clone and work from**. It centralizes process knowledge in repo files so humans and agents run the same workflows, preserve decisions, and improve the process as work happens. The payload is the repo root: [`.claude/skills/`](.claude/skills/), the [OpenSpec](https://github.com/Fission-AI/OpenSpec) planning layer (`openspec/` plus the generated `openspec-*` skills), [`.claude/rules/`](.claude/rules/), [`wiki/`](wiki/), [`VERSION`](VERSION), [`CHANGELOG.md`](CHANGELOG.md), and the `WONG-STACK` block in this file. [`wong-setup`](.claude/skills/wong-setup/SKILL.md) onboards *other* repos once; [`wong-sync`](.claude/skills/wong-sync/SKILL.md) — with the canonical [payload manifest](.claude/skills/wong-sync/references/payload-manifest.md) inside it — keeps them current by proposing, never overwriting. See the [README](README.md) for the user story.

It is a **meta-repo** that ships WongStack *and* dogfoods it — the block below applies here too. Don't run `/wong-setup` or `/wong-sync` here; this is the source, not a target (both stop when the clone *is* the current repo).

Working on WongStack itself — the release ritual, the link checker, what counts as code — loads from [`.claude/rules/payload.md`](.claude/rules/payload.md) the moment you touch a payload file. The full process lives in [wiki/development/](wiki/development/README.md).

<!-- WONG-STACK:BEGIN — generic WongStack conventions. The installer lifts this block verbatim into a target repo's CLAUDE.md, so keep it free of repo-specifics. Edit freely between the markers. -->

## Where context lives

The repo is the shared memory for humans and agents. Before any non-trivial change, **find and read the owning doc** rather than guessing — start at [`wiki/README.md`](wiki/README.md) and follow the links down. Four surfaces, one job each:

| Surface | Holds | Lifecycle |
|---|---|---|
| `openspec/changes/<slug>/` | the plan, and why this change is shaped this way | ships, then archives |
| `notes/<slug>.md` | everything else the session produced ([convention](notes/README.md)) | permanent, mutable |
| `wiki/` | what survived consolidation — how we do things ([philosophy](wiki/agent-knowledge-center.md), [style](wiki/wiki-style.md)) | canonical, curated |
| `openspec/specs/` + archive | what shipped | immutable record |

Don't duplicate a fact across surfaces. `openspec list` shows active changes; `openspec show <name>` reads one.

Credentials already live in the repo's environment files — `.env.example` is the committed, values-blank map; real values sit in the git-ignored `.env` at the primary worktree. Don't ask for a token or stub a call: read [the secrets convention](wiki/development/secrets.md).

## Rules

- **Always use ASD-STE100 Simplified Technical English** for user-facing prose and documentation. Best-effort compliance is sufficient without the full standard. Keep code, commands, identifiers, quotations, and prescribed text exact.
- **Drive work through the WongStack verbs**: `/explore → /plan → /apply → /save → /continue → /ship`, with `/verify` for evidence, `/dream` to consolidate notes into the wiki, and `/improve` as read-only advisor. Each verb's loaded description says when to use it; [the change loop](wiki/development/the-change-loop.md) owns what each verb does and where the git boundary falls. Branch name = change name = note name.
- **The WongStack skills own all git; OpenSpec never runs git.** `/save`·`/continue`·`/ship` own every git action; `/explore`·`/plan`·`/apply` implement none.
- **CI is the gate when present, else PR review; nothing builds locally.** The ladder: [the gate](wiki/development/the-change-loop.md#the-gate). `/verify` gates nothing.
- **Prose goes straight to `main`.** A `/save` whose entire diff sits in `notes/**` + `wiki/**` commits to the default branch — no branch, PR, or `/ship`. Routing is by path prefix, never file extension: [the prose allowlist](wiki/development/the-change-loop.md#the-prose-allowlist).
- **Stay in sync with WongStack with `/wong-sync`** — it proposes one reviewable OpenSpec change and never modifies a file with local authorship. Sending an improvement back is a manual pull request: [contributing](wiki/contributing.md).
- **Don't edit `wiki/` mid-task** unless it's explicitly the task — that's `/dream`'s job, and it documents general, reusable processes only; a change's specifics live in its proposal and archive.
- **Path-scoped conventions load from [`.claude/rules/`](.claude/rules/)** when you work with matching files. An agent that doesn't auto-load them: read the rules whose `paths:` match the files you touch.

<!-- WONG-STACK:END -->
