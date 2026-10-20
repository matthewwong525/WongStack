# Proposal

**Status:** ready-to-ship
**Branch:** tsconfig-include-aliases
**Open questions:** none

## Why

The lookup that lists the code using a file misses most of ClaymooApp's links. Its shared app code imports other files with a `@/` shortcut, but the shortcut is set up in each app's settings, not beside the shared code. The lookup only checks settings in the same folder or above, so it skips 2,252 of the 2,386 `@/` links there.

## What Changes

- **A shortcut counts wherever the settings that cover a file define it.** When the settings beside or above a file don't explain its shortcut, the lookup also checks the settings files that list that file's folder as theirs, the way the code checker does. So ClaymooApp's shared code, which both apps list as theirs, now shows its links. Settings that build on another settings file get that file's shortcuts too.
  ```mermaid
  flowchart TD
    imp["shared file uses @/x"] --> near{"settings above?"}
    near -- yes --> hit["found"]
    near -- no --> cover["app settings that list it"] --> hit
  ```

Non-goals: shortcuts set only in build code, such as a vite config (still skipped); a settings file's `exclude` list (test files it drops still count); picking between two apps that map the same shortcut to different places (the first one found wins).

## Capabilities

### New Capabilities

### Modified Capabilities

- `memory`: the code-user list resolves a folder shortcut through any TypeScript or JavaScript settings file whose included files cover the importing file, and through settings a file extends.

## Impact

- `.agents/skills/memory/scripts/lib/callers.mjs`: config loading follows relative `extends`; alias lookup falls back to configs whose `include`/`files` cover the importer.
- `scripts/tests/memory-areas.test.mjs`: a fixture mirroring ClaymooApp's `apps/admin` + `packages/spa` layout, and an `extends` case.
- `CHANGELOG.md`: a `patch` entry.

## Decision log

- **2026-10-20** — Asked, while closing the workspace for 43.15.0, whether to fix the missed `packages/spa` shortcut links now → chose fix it now: a small follow-up that also uses the settings files whose include covers a folder, tested against ClaymooApp's real layout, published as a patch.
- **2026-10-20** — Assumed: the nearest settings file still wins, and covering settings files are only a fallback, because that keeps every link 43.15.0 already finds unchanged.
- **2026-10-20** — Assumed: relative `extends` is followed for shortcuts and included files, because a shared base settings file defining `paths` is a common monorepo layout; package `extends` (`@tsconfig/…`) is skipped, since it lives in `node_modules`.
- **2026-10-20** — Assumed: `exclude` is ignored, because on the measured repo it only drops test files, and those still load the shared code through the test runner's own `@/` alias.
- **2026-10-20** — Archive checkpoint: built and measured — the private repo's shared code went from 0 to 2,302 of 2,302 `@/` links found, this repo unchanged, same speed; one review round (two tests that passed on broken code, a private name in the changelog) fixed and reread clean; local checks pass; saved for `/ship`.
