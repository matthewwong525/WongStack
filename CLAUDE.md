# CLAUDE.md

## What this is

This repo is **WongStack** — a stack-agnostic Claude Code workflow toolkit, distributed as a **template you clone and work from**. The whole payload is the repo root: [`.claude/skills/`](.claude/skills/), the [OpenSpec](https://github.com/Fission-AI/OpenSpec) planning layer (`openspec/` plus the generated `.claude/commands/opsx/` and `openspec-*` skills), the optional [`.claude/hooks/`](.claude/hooks/) + [`.claude/settings.json`](.claude/settings.json) (the auto-push Stop hook), [`docs/`](docs/), [`VERSION`](VERSION), [`CHANGELOG.md`](CHANGELOG.md), and the `WONG-STACK` block in this file. The [`install-wong-stack`](.claude/skills/install-wong-stack/SKILL.md) skill copies that set (minus itself) into *other* repos. See the [README](README.md) for the user story.

It's a **meta-repo** that ships WongStack *and* dogfoods it — the block below applies here too. Don't run `/install-wong-stack` here; it's the source, not a target.

**Working on WongStack:**
- **Editing the payload is a release** — add a [`CHANGELOG.md`](CHANGELOG.md) entry and bump [`VERSION`](VERSION) (semver) so the updater can detect and explain it.
- Skills run from a target repo's `.claude/skills/`, so they reference files by **repo-relative path** (`$(git rev-parse --show-toplevel)/.claude/skills/...`) — never `${CLAUDE_PLUGIN_ROOT}` or an absolute path.
- Rulebook canonical: [`.claude/skills/document/references/progressive-disclosure.md`](.claude/skills/document/references/progressive-disclosure.md); [`docs/wiki-style.md`](docs/wiki-style.md) is a synced copy (re-copy when you edit the canonical).
- **The WongStack skills own all git; OpenSpec never runs git.** `/plan`·`/explore` front `/opsx:propose`·`/opsx:explore`; `/apply` runs `/opsx:apply`; `/save` runs `/opsx:sync`; `/ship` runs `/opsx:archive`; `/continue` resumes a change (checkout + recap) then hands to `/apply`. When you touch one of the git skills, keep the OpenSpec step it fronts intact.

<!-- WONG-STACK:BEGIN — generic WongStack conventions. The installer lifts this block verbatim into a target repo's CLAUDE.md, so keep it free of repo-specifics. Edit freely between the markers. -->

## Where context lives

`docs/` is the source of truth for **how we do things** — process and conventions alike.
Before any non-trivial change, **find and read the owning doc** rather than guessing from
code or memory. Start at [`docs/README.md`](docs/README.md) and drill down: index →
section README → the specific page. How the wiki is organized: [`docs/wiki-style.md`](docs/wiki-style.md).

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
  `/apply` (implement the tasks — `/opsx:apply`), `/save` (maintain the change's Status +
  Decision log, sync specs, push, mirror the PR body, preview — `/opsx:sync`), `/continue [name]`
  (resume a change on any machine: checkout + recap + drift check, then hand to `/apply`),
  `/ship` (quality-gate + merge + archive — `/opsx:archive`), `/document` (write a process doc),
  `/improve` (read-only advisor; `/improve docs` for the wiki).
  Branch name = change name ties a branch to its plan.
- **Don't edit `docs/` mid-task** unless it's explicitly the task — reach for `/document` when a
  reusable process is worth capturing, with the change and diff in hand.
- **Document general, reusable processes only.** The specifics of a given change live in its
  proposal and specs (and its archive), not the wiki.

<!-- WONG-STACK:END -->
