# Ship only the mini-app scaffold, not every mini app

**Status:** ready-to-ship
**Branch:** ship-only-the-mini-scaffold
**Open questions:** none

## Why

22.0.0 lists the whole `mini-apps/` folder as scaffold. Every app made in the WongStack source repo would then be copied into every repo that installs or syncs WongStack. A tip calculator tried here on 2026-09-26 showed it: saving it would have pushed it into every user's repo.

## What Changes

- **The scaffold lists what ships, instead of the whole folder.** It carries the mini Worker, its ignore files, and the example app `hello/`, and nothing else under `mini-apps/`. A new app folder in the source repo is not payload, so it stays in the source repo. `mini-apps/wrangler.jsonc` stays out, as before.
  ```text
  mini-apps/
  ├─ worker.ts           ships
  ├─ tsconfig.json       ships
  ├─ .gitignore          ships
  ├─ wrangler.jsonc      never (fragment)
  └─ apps/
     ├─ .assetsignore    ships
     ├─ hello/           ships (example)
     └─ tips/            stays here
  ```
- **A test holds the line.** Sync's preflight, given the real manifest, selects the example app and never a second app folder.
- **Release 22.0.1.**

**Non-goals:** moving the source repo's own mini apps anywhere else; changing how targets keep their own apps.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stack-pack`: the scaffold ships only the mini Worker and its example app.

## Impact

`.agents/skills/wong-sync/references/payload-files.json`, `payload-manifest.md`, `wiki/stack/mini-apps.md`, `scripts/tests/wong-sync-preflight.test.mjs`, `VERSION`, `CHANGELOG.md`. Targets that installed 22.0.0 already have `mini-apps/apps/hello/`, and their own apps are target content, so the next `/wong-sync` changes nothing for them.

## Decision log

- **2026-09-26** — Asked what to do after trying a tip calculator on a preview → chose **fix the scaffold gap first**, as 22.0.1, before saving the app here.
- **2026-09-26** — Assumed: an allow-list of files and the `hello/` folder, not a longer exclude list, because an exclude list can not name apps that do not exist yet, and the link checker matches excludes by exact file.
- **2026-09-26** — Wiki catch-up at ship: no repeatable fact; the change's own page edits (`wiki/stack/mini-apps.md`, the manifest page) carry what it teaches.
- **2026-09-26** — Archive checkpoint: 6 of 6 tasks checked; the archive synced the one new `stack-pack` requirement. 248 script tests pass locally, and the new sync test fails on the 22.0.0 manifest.
