# Design

## Context

Five modules live in `.agents/plugins/`. Memory and the loop are one folder each; memory keeps a nested command in `skills/` (`/memory:dream-memory`), and the loop maps each `skills/<command>/` to its own install folder. The browser is three sibling folders (`browser/`, `hand-over/`, `shop/`) versioned by `browser/module.json`. Daily is two sibling folders (`daily/`, `schedule/`) because [adding a module](../../../wiki/maintaining/adding-a-module.md#where-it-lives) says a module with hooks must hold no nested skills, or a bare-named command loads twice.

Evidence on how hosts load these folders: in a project Claude Code trusts, a skill folder with `.claude-plugin/plugin.json` loads as a plugin: its hooks run, and its `skills/<name>/` load with the plugin's prefix. A headless chat in a folder never trusted loads it only as a plain skill (probed 2026-11-12 with a probe folder in a scratch repo, trusted and untrusted). This session lists `access:services` from `.agents/plugins/access/skills/services/` with nothing in `~/.claude/plugins/installed_plugins.json`. Codex loads the same folders from `.claude-plugin/marketplace.json`, prefixed the same way.

Cross-module links today (scan of `.agents/plugins/{browser,daily,access}`):

| From | To |
|---|---|
| `browser/references/browsing.md:95` | loop `explore/references/asking-the-user.md` (GitHub address) |
| `hand-over/references/live-view.md:72` | same |
| `shop/references/shopping.md:26,34,46` | same |
| `daily/SKILL.md:15` | loop `asking-the-user.md` (relative) |
| `schedule/references/registration.md:4` | same |
| `access/references/setup.md` step 9 | changes memory's profile and route |

Script imports between `browser/`↔`hand-over/`↔`shop/` and `daily/`↔`schedule/` are inside one module today and stay inside one folder after the move; only their relative paths change.

Other work: `fill-logins-from-1password` (at ship) edits `browser/SKILL.md`, `browsing.md`, `password-manager.md`, `addons.mjs`, `browse.mjs`, `browser-server.mjs`. Build from current `main` and bring `main` in again before the save; each move is a `git mv`, so its edits follow the files. Workspace "Plugin docs stand alone" rewrites links from the same guides to WongStack's wiki; whichever lands second rebases onto the moved paths. The loop part in this chat removes the loop's own links into other modules; this change only repoints the loop's link to `/daily:schedule`'s new path.

## Goals / Non-Goals

**Goals:** the browser and Daily in the memory shape; no link or import from browser, Daily or Access into another module's folder; a check that keeps it so; installs and module-only repos move with no hand step.

**Non-Goals:** behavior changes; the loop's and memory's own links; links to WongStack's wiki; a shared helper package.

## Decisions

### 1. The browser folder

```text
.agents/plugins/browser/
  .claude-plugin/plugin.json   2.0.0, no hooks
  .codex-plugin/plugin.json    2.0.0
  README.md  SKILL.md          (was browser/)
  references/  scripts/        (was browser/)
  skills/hand-over/            (was hand-over/)
  skills/shop/                 (was shop/)
```

- `git mv` every file so history follows. `module.json` is deleted.
- `.agents/skills/browser` links to `../plugins/browser`; the `hand-over` and `shop` links go. `payload-files.json` `mapped` keeps one entry, `.claude/plugins/browser` → `.claude/skills/browser`; no nested entry, so `skills/` ships inside it (as memory's `dream-memory`).
- Both nested skills are `hidden` with `disable-model-invocation`, so the `/browser:` prefix is invisible. Every caller names the path: `.claude/skills/browser/skills/hand-over/scripts/…`, `.claude/skills/browser/skills/shop/scripts/…`.
- Imports: `skills/hand-over/scripts/x.mjs` reaches `../../../scripts/lib/…`; `scripts/connect-browser.mjs` and `addons.mjs` reach `../skills/hand-over/scripts/…`.
- No marketplace entry: the browser has no hooks, as the loop has none.
- Rejected: the loop's shape (root not linked, every command mapped to its own folder). The browser skill would then need its own `skills/browser/` and the root would have no `SKILL.md`, against the settled shape.

### 2. The Daily folder

```text
.agents/plugins/daily/
  .claude-plugin/plugin.json   2.0.0, hooks
  .codex-plugin/plugin.json    2.0.0
  hooks/  README.md  SKILL.md  (was daily/)
  references/  scripts/        (was daily/)
  skills/schedule/             (was schedule/)
```

- `module.json` is deleted. `.agents/skills/daily` links to `../plugins/daily`; the `schedule` link goes. `mapped` keeps `.claude/plugins/daily` → `.claude/skills/daily`; `exclude` becomes `.claude/plugins/daily/team.md` and `.claude/plugins/daily/people`.
- Hooks already use `${CLAUDE_PLUGIN_ROOT}/scripts/…`; they keep working because `scripts/` stays at the plugin root.
- `/schedule` becomes `/daily:schedule` (asked). The skill's `name:` stays `schedule`; the host adds the prefix.
- Scripts that print the schedule path change: `skills/schedule/scripts/lib/hosts.mjs` (`finish` command and run guide) to `.agents/skills/daily/skills/schedule/…`. Imports: `skills/schedule/scripts/x.mjs` reaches `../../../scripts/lib/…`; `scripts/daily.mjs` and `finished.mjs` reach `../skills/schedule/scripts/…`.
- WongStack's own callers follow: `.agents/loop/step-title.mjs` and `.agents/memory/session-start.mjs` (repo-side glue, not modules), `.agents/inbox/*`, and `step-title.mjs`'s command-to-title match must accept `/daily:schedule` (title `SCHEDULE`).
- A run already handed to the worker carries the `finish` command from the checkout that built it, so no saved schedule stores the old path. A computer that has not synced still runs its own older copy, unchanged.

### 3. Asking without the loop's guide

Each linked ask becomes one sentence in place, for example: *Ask in the chat as a multiple choice, with the assistant's question tool when it has one, else a short numbered list.* The surrounding text already says what to ask and the choices. `.agents/rules/payload.md`'s rule "a skill that asks the user links the ask convention" becomes: a skill in the loop links its ask guide; a skill in another module states its ask in one sentence and links no other module.

### 4. Access

Delete step 9 of `references/setup.md`; steps 10–11 become 9–10. Repoint the two in-file anchors (`#10-run-the-check`, `#11-codex-and-save`), and search the repo for inbound links to them. Add one line to Access's README: a project's own files may use `signin/computer.mjs` for another tool's sign-in. It names no module.

### 5. The cross-module check

Extend `scripts/tests/module-install.test.mjs`: for `browser`, `daily`, and `access`, every relative Markdown link and every `github.com/…/WongStack/blob/main/.agents/plugins/<other>/` address in the module's files must stay inside the module's own folder; imports already fail there. The list grows when the loop's part lands. A rejected alternative, a separate `check-*.mjs`, adds a second walker of the same files.

### 6. Versions and the check

`check-module-versions.mjs` drops `module.json` reading: every module carries both `plugin.json` files. Browser 2.0.0 and Daily 2.0.0 (paths change), Access 1.0.1.

### 7. Updates

- **WongStack installs:** `/wong-sync`'s preflight compares install paths, so the moved files show as removed at `.claude/skills/{hand-over,shop,schedule}/` and added under `.claude/skills/{browser,daily}/skills/`. A local edit in an old folder follows by `git mv`, per [catch-up](../../../.agents/skills/wong-sync/references/catch-up.md). Add a test that `installPath` sends each old source path to its new install path and that no `mapped` entry names the old folders.
- **Module-only repos:** each setup guide's `## Update` gains a one-time step: when the recorded version is below 2.0.0, read the base at the old paths (`.agents/plugins/browser/<part>/X`, `.agents/plugins/daily/<part>/X`) and map them to the new ones (`X`, `skills/<part>/X`) before the three-way merge; then remove the old sibling folders from `.claude/skills/`. The install copy step copies one folder.
- `scripts/retired-names.json`: `` `/schedule` `` → `` `/daily:schedule` ``, with `openspec/specs/daily-module/spec.md` allowed, because its Purpose line can't change through a delta; `plugins/browser/browser/`, `plugins/browser/hand-over/`, `plugins/browser/shop/`, `plugins/daily/daily/`, `plugins/daily/schedule/`, `skills/hand-over/`, `skills/shop/`, `skills/schedule/`, and `module.json`, each with its replacement. Archived changes and `CHANGELOG.md` are already outside the check.

### 8. Docs

`wiki/maintaining/adding-a-module.md`'s "A command that must keep its bare name" bullet loses the sibling-folder and plain-folder shapes: a module is one folder; a nested command takes the module's prefix, unless the module has no hooks and maps the command to its own folder (the loop). Memory, the browser and Daily are the examples. Every other page naming an old path or `/schedule` follows; find them with `memory.mjs pull <page>` and the retired-names check.

## Risks / Trade-offs

- **People who type `/schedule`** get Claude Code's own cloud-schedule command, which has the same name (seen in the 6.2 test). The changelog's **Updating.** note names the new command; asking in plain words works as before.
- **A second rebase with "Plugin docs stand alone"**: both touch the same guides. Moves are `git mv`, so a rebase applies their line edits at the new paths.
- **Skill text budget:** the one-sentence asks replace links of similar length; `measure-context.mjs --check` confirms.
- **Live check after merge:** at the next WongStack install sync, confirm `.claude/skills/hand-over/`, `shop/` and `schedule/` are gone and a scheduled chat run reads its run guide. `/ship` runs this after the merge.
