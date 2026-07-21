# CLAUDE.md

## What this is

This repo is **WongStack** — a stack-agnostic Claude Code workflow toolkit, distributed as a **template you clone and work from**. The whole payload is the repo root: [`.claude/skills/`](.claude/skills/), the [OpenSpec](https://github.com/Fission-AI/OpenSpec) planning layer (`openspec/` plus the generated `.claude/commands/opsx/` and `openspec-*` skills), [`docs/`](docs/), [`VERSION`](VERSION), [`CHANGELOG.md`](CHANGELOG.md), and the `WONG-STACK` block in this file. The [`install-wong-stack`](.claude/skills/install-wong-stack/SKILL.md) skill copies that set (minus the two meta-skills) into *other* repos; its inverse, [`contribute-wong-stack`](.claude/skills/contribute-wong-stack/SKILL.md), pushes payload improvements made in a target repo back up. See the [README](README.md) for the user story.

It's a **meta-repo** that ships WongStack *and* dogfoods it — the block below applies here too. Don't run `/install-wong-stack` or `/contribute-wong-stack` here; it's the source, not a target (both stop when the clone *is* the current repo).

**Working on WongStack:**
- **Editing the payload is a release** — add a [`CHANGELOG.md`](CHANGELOG.md) entry and bump [`VERSION`](VERSION) (semver) so the updater can detect and explain it.
- Skills run from a target repo's `.claude/skills/`, so they reference files by **repo-relative path** (`$(git rev-parse --show-toplevel)/.claude/skills/...`) — never `${CLAUDE_PLUGIN_ROOT}` or an absolute path.
- Rulebook canonical: [`docs/wiki-style.md`](docs/wiki-style.md) — the payload copy the installer places at a target's wiki root; the skills (`/dream`, `/improve docs`) read the repo's own copy there.
- **The WongStack skills own all git; OpenSpec never runs git.** `/explore`·`/plan`·`/apply` front `/opsx:explore`·`/opsx:propose`·`/opsx:apply` and touch no git; `/save`·`/continue`·`/ship` own every git action — `/save` runs `/opsx:sync`, `/continue` checks out the branch then hands off to `/apply`, `/ship` runs `/opsx:archive`. When you touch one of the git skills, keep the OpenSpec step it fronts intact.

<!-- WONG-STACK:BEGIN — generic WongStack conventions. The installer lifts this block verbatim into a target repo's CLAUDE.md, so keep it free of repo-specifics. Edit freely between the markers. -->

## Where context lives

`wiki/` is the source of truth for **how we do things** — process and conventions alike.
Before any non-trivial change, **find and read the owning doc** rather than guessing from
code or memory. Start at [`wiki/README.md`](wiki/README.md) and drill down: index →
section README → the specific page. How the wiki is organized: [`wiki/wiki-style.md`](wiki/wiki-style.md).

The plan for **what we're building** lives in **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** —
each change is a folder under `openspec/changes/<name>/` (proposal, delta specs, design, tasks).
Run `openspec list` to see active changes from any clone; `openspec show <name>` to read one.
The record of **what shipped** is the **archived change** in `openspec/changes/archive/`, with the
synced result in `openspec/specs/`. No GitHub planning or summary issues — the change *is* the plan
and its archive *is* the record.

## Rules

- **CI is the gate when present, else PR review.** The durable system is pull requests (any
  forge), version control, OpenSpec, and everything-lives-in-the-repo; GitHub Actions is an
  optional accelerator, honored when configured. Where checks exist, push and let CI run — the
  skills wait and fix failures; where they don't, the PR (plus the OpenSpec change and its
  archive) is the record a human reviews. Either way, nothing builds locally as a prerequisite.
- **Use the WongStack skills** — a thin verb over each OpenSpec step, so you never type `/opsx:*`
  by hand (though it's there if you want it):
  `/explore` (think it through — `/opsx:explore`), `/plan` (draft the change — `/opsx:propose`),
  `/apply` (implement the tasks — `/opsx:apply`), `/save` (sync specs + maintain the Status header +
  append to the Decision log + push + PR-body mirror + preview — `/opsx:sync`),
  `/continue [name]` (resume the branch cold, then hand off to `/apply`), `/ship` (merge + archive —
  `/opsx:archive`), `/dream` (capture session facts into the wiki + consolidate it), `/improve` (read-only advisor; `/improve docs`
  for the wiki). Full loop: `/explore → /plan → /apply → /save → /continue → /ship`.
  Branch name = change name ties a branch to its plan.
- **Improved a WongStack skill or convention here?** `/contribute-wong-stack` pushes that change back
  up into a WongStack clone — the upstream inverse of `/install-wong-stack`. It diffs only the payload
  files, confirms each one, and copies the approved ones up (nothing app-specific ever leaks), then
  leaves the clone ready for `/save`.
- **Don't edit `wiki/` mid-task** unless it's explicitly the task — reach for `/dream` when a
  reusable process is worth capturing, with the change and diff in hand.
- **Document general, reusable processes only.** The specifics of a given change live in its
  proposal and specs (and its archive), not the wiki.

<!-- WONG-STACK:END -->
