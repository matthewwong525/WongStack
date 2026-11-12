# /schedule works in every chat again

**Status:** ready-to-ship
**Branch:** jubilant-yak
**Open questions:** none

## Why

Since 57.0.0, an install keeps three commands inside their module's folder: Daily's schedule command, and the browser's private-link and shop commands. Claude Code loads such a command only through its module, and only in a folder you trusted. So in a chat in an untrusted folder, such as each new Paseo workspace, the commands are missing. Then *make a schedule* can open Claude Code's own cloud schedules, not yours. RelayEverything hit this on its 59.0.0 update.

## What Changes

- **Each of these commands loads in every chat, as it did before 57.0.0.** Setup and each update give the command its own place in your skills folder, beside `/plan` and `/ship`. You type `/schedule` again, not `/daily:schedule`. The browser's two private commands and the services helper load the same way. The command's other files stay inside its module, so nothing else moves.
  ```text
  .claude/skills/
    schedule/      ← /schedule: loads in every chat
    hand-over/     ← private links
    shop/
    services/
    daily/         ← the module, as today
      skills/schedule/  scripts, guides
    browser/
      skills/hand-over/ scripts, guides
      skills/shop/      scripts, guides
  ```
- **The words follow the command.** Every guide and message in your project says `/schedule`, so no page sends you to a command that is gone.
- **Your update moves it for you.** `/wong-sync` moves each command's file to its new place. Nothing to do by hand.
- **A project with its own command of the same name keeps it.** The update plan names the clash and keeps your command; your install record can give WongStack's command another name.
- **BREAKING:** in your project, `/daily:schedule` no longer exists. Type `/schedule`.

**Non-goals:** a repo that added Daily or the browser alone, outside WongStack, keeps them in one folder; WongStack's own repo keeps `/daily:schedule`; the RelayEverything update itself (its own chat).

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `payload-layout`: adds that a WongStack install gives each module command's `SKILL.md` its own top-level skill folder and renames the command in shipped text; an update moves an older install's command there.
- `daily-module`: "Daily installs as one module with its own hooks" names the command `/daily:schedule` only in a copy of the folder alone; a WongStack install names it `/schedule`.

## Impact

- `.agents/skills/wong-sync/references/payload-files.json`: one `mapped` file entry per nested command's `SKILL.md`.
- `.agents/skills/wong-sync/scripts/install-path.mjs`: a mapped entry may name a file; `installText` renames `/<module>:<command>` to `/<command>`.
- `.agents/skills/wong-sync/scripts/preflight.mjs`, `scripts/check-payload-links.mjs`: list a mapped file entry, not only a folder.
- `.agents/skills/wong-setup/scripts/install.mjs`: no edit; it takes the new entries through `install-path.mjs`.
- `.agents/skills/wong-sync/scripts/merge-check.mjs`: diffs the two install texts, each read with its commit's pairs.
- `.agents/memory/areas.json`: two definitions drop the `/daily:` prefix.
- Tests: `scripts/tests/install-path.test.mjs`, `scripts/tests/module-install.test.mjs`, a payload test that every nested command has its entry.
- Docs: `wiki/maintaining/adding-a-module.md`, `.agents/skills/wong-sync/references/payload-manifest.md`, `wiki/development/daily.md`, `CHANGELOG.md` (`## Next (major)`).

## Decision log

- **2026-11-12** — Asked (in the request, settled with Matthew) how an install loads a module's nested commands in an untrusted folder → chose to unpack them at setup and sync into top-level skill folders, so `/schedule` beats Claude Code's built-in one.
- **2026-11-12** — Assumed: only each command's `SKILL.md` moves to `.claude/skills/<command>/`; its scripts and guides stay in the module, because the source names those files through the module in about 15 places a link rewriter can't see (`join(…, '../skills/hand-over/…')`, `new URL('../skills/schedule/…')`, `hosts.mjs`'s run commands, `update.mjs`'s pins, `areas.json`). The person sees the same plain top-level command.
- **2026-11-12** — Assumed: unpacking is the default for every WongStack install, not a record choice, because every install can open in an untrusted folder, and a choice would leave each owner to find the bug. The record's existing `components.skills` rename is the way out for a name clash.
- **2026-11-12** — Assumed: Access's `services` unpacks too, because it is a nested command with the same failure, and the request covers a module's nested commands.
- **2026-11-12** — Assumed: a test fails when a module's `skills/<command>/SKILL.md` has no `mapped` entry, because a new nested command would otherwise ship with the same bug, and a hand-kept list beats a derived rule here: the loop already maps by hand.
- **2026-11-12** — Assumed: the module-alone test keeps checking the one-folder copy, without the command entries, because a repo that adds a module alone copies the folder as is.
- **2026-11-12** — Assumed: a `major` release, because a typed `/daily:schedule` stops working in installs.
- **2026-11-12** — Assumed: the meta-repo keeps its source layout and `/daily:schedule`, because a top-level link there would load the command twice in a trusted folder, and the request is about installs only.
- **2026-11-12** — Assumed: the browser's `shop` and `hand-over` `SKILL.md` name their scripts by repo path (`node .claude/skills/browser/skills/<command>/scripts/…`), not `scripts/…`, because a moved `SKILL.md` reads a bare `scripts/` path from its new folder, where no script is. Daily's and Access's already used a repo path. The browser goes to 2.0.1 and Daily to 3.0.1 (setup step 5 reworded).
- **2026-11-12** — Assumed: `scripts/retired-names.json` allows `.claude/skills/schedule/`, `.claude/skills/hand-over/`, and `.claude/skills/shop/` in the payload inventory and the tests that check the new place, because only the command's `SKILL.md` lives there now; the retired name still guards every other file in the old folder.
- **2026-11-12** — Assumed: the build ran the test gate of parts 1 and 2 once at the end, by the build brief.
- **2026-11-12** — Assumed: 4.2 passed on a scratch install from this tree. Untrusted (no plugin loaded): `schedule`, `hand-over`, `shop` load once, `services` is in the model's list, no `daily:schedule`, and the `schedule` skill's description is Daily's, so it wins over Claude Code's built-in one. Trusted (`daily@skills-dir`, `browser@skills-dir`, `access@skills-dir` loaded): each command shows once, no prefixed copy, no warning.
- **2026-11-12** — Assumed: the preflight reads the base commit's text with the base inventory's pairs (tasks 1.4, 2.5), because the 4.3 run showed 17 install files still naming `/daily:schedule` unreported, and three moved `SKILL.md` files shown as edited by the person though they were not.
- **2026-11-12** — Assumed: 4.3 passed. A scratch install from 59.0.0 (`facaf5f9`), compared with this tree committed in a clone: the four `SKILL.md` files show `removed`/`installed-equivalent` and `added`/`missing`, and every installed file naming `/daily:schedule` is reported `modified`/`installed-equivalent` (27 files, plus the `CLAUDE.md` block).
- **2026-11-12** — Assumed: the merge check diffs the two install texts, not the two blobs (task 1.5), a safe pick inside `/ship` from the second look: a person's edited page whose source is unchanged would otherwise pass the check still naming `/daily:schedule`.
- **2026-11-12** — Archived and saved for release 60.0.0 on branch `jubilant-yak`.
