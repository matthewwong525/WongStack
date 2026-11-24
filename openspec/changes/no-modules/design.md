# Design

## Context

See proposal.md for why. Today:

- `.agents/plugins/<module>/` holds five modules: loop, memory, daily, browser, access. Each has `VERSION`, `README.md`, `references/setup.md`; memory, daily, and access also have `hooks/claude.json` and `hooks/codex.json`, which `scripts/tests/module-hooks.test.mjs` keeps equal to `.agents/settings.json` and `.agents/hooks.json`.
- `.agents/skills/` links into the modules (`memory → ../plugins/memory`, `plan → ../plugins/loop/skills/plan`, `schedule → ../plugins/daily/skills/schedule`, and others).
- Each module reaches WongStack only through a profile: `.agents/{loop,memory,daily,browser}/profile.mjs` and `.agents/access/slots.json`. The loop reads its profile through `.agents/plugins/loop/scripts/slot.mjs <part>`, which every loop skill calls (`slot.mjs stepTitle set PLAN`, `slot.mjs otherWork`, `slot.mjs --run precheck`, …). Memory, Daily, and the browser load theirs through their own loaders.
- Installs already get real folders: `payload-files.json` `mapped` sends each module to `.claude/skills/<module>/`, the loop to `.claude/skills/loop/` plus one folder per command, and only the `SKILL.md` of a nested command (`schedule`, `services`, `hand-over`, `shop`) to `.claude/skills/<command>/`. The profiles ship as WongStack files in `dirs` (`.claude/loop`, `.claude/memory`, `.claude/browser`), so no install has its own profile.

## Goals / Non-Goals

**Goals:** the source tree equals the install tree; no module concept left in code, checks, or docs; no change to any command's behavior.

**Non-Goals:** renaming commands or capabilities; moving data files other tools read by path; reworking `.agents/inbox/`, `reply-link`, or other non-module skills.

## Decisions

### The layout

| Today | After |
| --- | --- |
| `.agents/plugins/memory/` | `.agents/skills/memory/` |
| `.agents/plugins/daily/` (less `skills/schedule/`) | `.agents/skills/daily/` |
| `.agents/plugins/daily/skills/schedule/` | `.agents/skills/schedule/` |
| `.agents/plugins/browser/` (less `skills/`) | `.agents/skills/browser/` |
| `.agents/plugins/browser/skills/{hand-over,shop}/` | `.agents/skills/{hand-over,shop}/` |
| `.agents/plugins/access/` (less `skills/`) | `.agents/skills/access/` |
| `.agents/plugins/access/skills/services/` | `.agents/skills/services/` |
| `.agents/plugins/loop/skills/<cmd>/` | `.agents/skills/<cmd>/` (seven) |
| `.agents/plugins/loop/{scripts,references}/` | `.agents/loop/{scripts,references}/` |

Every move is `git mv`, so history follows and open branches' edits rename cleanly. A nested command gets its whole folder, not only `SKILL.md`: the split between a command's `SKILL.md` and its scripts existed only so a module stayed one folder. Alternative considered: keep `.agents/skills/loop/` as the loop's shared folder, as installs have it now. Rejected: a skills-folder entry with no `SKILL.md` looks like a skill, and `.agents/loop/` already holds the loop's WongStack code.

### No profile, no slot

Each profile part is a thin wrapper around a WongStack file. The caller calls that file straight:

- Loop skills: `slot.mjs stepTitle …` → `node .claude/loop/step-title.mjs …`; `slot.mjs otherWork` → `node .claude/loop/other-work.mjs`; `slot.mjs --run precheck` → the precheck command itself. Each slot line in a skill is replaced by the command its profile part runs today. A part whose value is a constant (such as `guards`) inlines into the script that read it.
- Memory, Daily, browser: their loaders (`loadProfile`-style imports) become direct imports of the WongStack file the profile pointed to. A part that tested for the company app (Daily's schedule store, browser's inbox) keeps that test at the call site, so an install with no app behaves as today.
- Access: `slots.json` stays as data at `.agents/access/slots.json`, since the app's route reads it; the code that read it through a slot loader reads the file straight.
- Then `slot.mjs`, `scripts/tests/slot.test.mjs`, `loop-profile.test.mjs`, and every `profile.mjs` go. Tests that set `WONG_LOOP_PROFILE` or a fake profile call the target script with a stand-in path instead.

Alternative considered: keep `slot.mjs` and the profiles, move only folders. Rejected by the person: the go-between is the plugin layer.

### Files that stay put

`.agents/memory/` keeps `d1/` (wrangler's migrations directory) and `areas.json`; `.agents/daily/` keeps install-owned `team.md`, `people/`, and schedule records; `.agents/access/slots.json` stays. Their code files (`knowledge.mjs`, `lookup.mjs`, `operations.mjs`, `session-start.mjs`, `tidy-pages.mjs`, `topics.mjs`, `send-key.mjs`, …) move into the skill that runs them when only that skill runs them, and stay when a hook, the app, or another skill also does. The build moves a file only after `grep` shows every caller.

### Hooks and versions

`.agents/settings.json` and `.agents/hooks.json` already run every hook; the per-module `hooks/` folders, `module-hooks.test.mjs`, each `VERSION`, and `scripts/check-module-versions.mjs` (and its CI step) go. Hook command paths change only where a script moved.

### Docs

Each module `README.md` and `references/setup.md` goes. Any fact a WongStack page still needs (how the loop works without GitHub, memory's tidy, Daily's no-app path) moves to the wiki page that owns it: `wiki/development/the-change-loop.md`, `wiki/development/memory.md`, `wiki/development/daily.md`, `wiki/stack/access-screens.md`, and the browsing reference. `wiki/maintaining/adding-a-module.md` goes; `wiki/maintaining/adding-a-skill.md` keeps the skill rules. Full `https://github.com/…/blob/main/.agents/plugins/…` links, added so a lone module had no dead link, become relative links again. `scripts/check-payload-links.mjs` and `memory.mjs pull <page>` find the links to fix.

### Installs

`payload-files.json` drops `mapped`: the moved command folders join `skillDirs`, `.claude/loop` stays in `dirs` with its new `scripts/` and `references/`. A new `catch-up.md` step, `module-folders`, moves an install: delete `.claude/skills/loop/` (its files now come at `.claude/loop/`), replace each nested command's lone `SKILL.md` with the full folder, delete `.claude/{loop,memory,daily,browser}/profile.mjs`, each module's `VERSION`, `README.md`, `references/setup.md`, and `hooks/`, and keep every install-owned file under `.agents/daily/`. A local edit inside a moved file is carried over by the normal three-way merge. `install-path.mjs` and `preflight.mjs` lose their mapped-path code; `install-path.test.mjs` checks the new paths. `codex-plugin.mjs` leaves the start hook and stays as the update's last step for installs older than 61.0.0.

`scripts/retired-names.json` gets `.agents/plugins/`, `.claude/plugins/`, `slot.mjs`, and `profile.mjs`, so CI fails on a line that brings them back. The release is `## Next (major)`.

## Risks / Trade-offs

- [About eight open branches edit `.agents/plugins/`] → moves are `git mv`, so git follows the rename when each branch brings in `main`; a branch that adds a new file under `.agents/plugins/` moves it by hand. The changelog's **Updating.** note says so.
- [A removed slot hid a fallback for an install with no app] → each profile part is read before it goes, and any `if` it held moves to its call site; the install test runs the scaffold with and without the stack pack.
- [About 170 files change in one release] → one mechanical pass for paths (script plus `grep`), then one pass per surface for the slot and profile removal, with the full test suite after each.
- [The skill-text budget in `measure-context.mjs`] → this change removes text, so it can only go down; rerun `--check` and record the new baseline.
- [Public links to the old setup guides stop working] → accepted by the person.

## Migration Plan

Ships as one major release. Installs move on their next `/wong-sync` through the `module-folders` catch-up step. Rollback: revert the merge; installs that already synced take the revert on their next sync.
