## Context

Today a completed `/apply` invokes `/save`, which pushes, opens the pull request, and waits for CI. The CI deploy then publishes the preview, and that wait is several minutes. Only the mini-app path skips it: it runs `scripts/cf-preview.sh --alias mini-<name>` from the host, then offers a direct save to `main` through `save/scripts/mini-app-push.sh`.

`cf-preview.sh` does not depend on mini apps. It installs `app/` when needed, applies staging migrations, builds the whole app for staging, uploads a preview version of the staging Worker under an alias, and never deploys production. `app-untouched.sh` is the one owner of "does this change leave the main app untouched". Today it compares commits only, for CI.

The shortcut's other pieces:

- `/apply`'s "The mini-app path"
- `/save`'s route row and `references/mini-app-save.md`
- `render-pr-body.mjs`'s `mini-app` mode
- `/ship`'s "Merge a mini-app pull request"

See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- One completion rule for `/apply`: implement, upload a host preview, ask *publish it?*
- No skill has a mini-app branch. A mini app is code under `mini-apps/apps/<name>/`.
- `/ship` stays the only way to production, with its one save, CI run, and walk.

**Non-Goals:**
- No change to `/ship`, `/verify`, `test.yml`, or `deploy.yml`.
- No local test gate. `/apply` may run tests as evidence, as it does today, but nothing requires it.

## Decisions

**`/apply` runs the preview, not `/save`.** Completion becomes three steps:
1. Ask `app-untouched.sh --worktree` whether the app changed.
2. If it did, run `cf-preview.sh --alias "<change-name>"`.
3. Report the URL, with `/apps/<name>/` added for a mini app, and ask *publish it?* *(Recommended)*, *save it*, or *change it more*.

A change the person asks for after the preview edits the tree and uploads again under the same alias. *Alternative:* keep the completion save and add the host preview first. Rejected: the user wants `/save` to be the only step that opens a pull request, and the extra push buys nothing before publishing.

**The alias is the change name.** It is stable across rebuilds and works on any branch, including `main`, where `cf-preview.sh` refuses to derive an alias. Branch previews from CI use the branch name, so the two never collide.

**`app-untouched.sh` gains `--worktree`.** In that mode it compares the working tree, staged and untracked paths included, with the merge base of `HEAD` and `origin/<default>`. It prints the same three lines. The CI mode is unchanged. *Alternative:* a separate list of prose paths in `/apply`. Rejected, because two copies of the rule drift.

**The "just ask" flow keeps two stops.** `/plan` ends with *build it now?* and `/apply` ends with *publish it?* A yes runs `/ship`, which archives, saves once, waits for CI, walks, and merges. Nothing else changes in `/ship`.

**Task-driven saves stay.** A task whose definition of done needs CI still invokes `/save` mid-list. When the final task was such a save, `/apply` reports that checkpoint and its CI preview, and uploads no second preview.

**The `WONG-STACK` rules are rewritten.** The mini-app rule becomes: build a new standalone page or tool as a mini app, in its own folder, served at `/apps/<name>/`, through the same loop. The loop rule's second stop becomes "after the preview". It already reads that way, but it must not imply a save.

**`wiki/stack/mini-apps.md` keeps the layout and rules and loses the route sections.** "Try it on a preview", "Save it", and "When a save needs a pull request" collapse into one short section that points at the change loop. The `DB`-only handler rule stays as defense in depth: an app never needs the memory store.

**`render-pr-body.mjs` loses its `mini-app` mode.** Its body test is replaced by one that rejects `--mode mini-app`.

**Purpose paragraphs are edited in place** for `mini-apps`, `request-routing`, `ship-full-cycle`, and `apply-completion-handoff`, because delta specs change requirements only.

**`scripts/fixtures/context-baseline.json` drops the `mini-app-save` route**, because `measure-context.mjs --check` reads its deleted file.

## Risks / Trade-offs

- [Unsaved work lives only on this machine] → `/apply`'s report says so in its ask, and *save it* is one of the choices. `/continue` can not resume unsaved work from another machine, the same as today for an unfinished `/apply`.
- [The first preview in a worktree pays for `npm ci`] → The script says it is installing. Later previews reuse `node_modules`.
- [The host preview applies staging migrations before any review] → Same as today's mini-app preview and every CI branch preview; staging is a fixture.
- [A skill-only edit in the source repo still counts as touching the app when it changes a non-`.md` file] → The upload runs and shows an unchanged app. It is harmless, and it costs one build.
- [A downstream repo has a mini app half-way through the old route when it syncs] → The changelog says to finish or save it first.

## Migration Plan

Target repos get the change through `/wong-sync`. The preflight marks `mini-app-push.sh` and `mini-app-save.md` as removed, and `cf-preview.sh` and `app-untouched.sh` as modified. Saved mini apps do not change. Rollback: revert the merge.
