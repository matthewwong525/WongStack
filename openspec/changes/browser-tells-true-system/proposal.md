# The browser tells sites your computer's real system

**Status:** built, saving for review
**Branch:** test-camoufox-password-manager
**Open questions:** none

## Why

The assistant's browser tells every site it runs on Linux, even on a Mac. To match, it puts Linux fonts over the Mac's own, and the browser's own pages, such as its add-ons page, show scrambled letters. You can't read them when you add or check a password manager.

## What Changes

- **The browser tells sites the real system:** Mac on a Mac, Windows on Windows, Linux on Linux. It uses the computer's own fonts, so its own pages read correctly. Websites look the same as before.
  | Page | Before, on a Mac | After |
  |---|---|---|
  | A website | Reads correctly | Reads correctly |
  | The add-ons page, the password manager's pop-up | Scrambled letters | Reads correctly |

- **Sites see a new device once.** On a Mac or Windows computer, the first start after the update makes a new device identity. A site may ask you to sign in again, once. A Linux computer keeps its identity.

Non-goals: no change to the browser's other settings, its version, or where it shows.

## Capabilities

### New Capabilities

### Modified Capabilities
- `browser-engine`: the disguise claims the computer's own system, and a saved identity made for another system is made again.

## Impact

- `.agents/skills/browser/scripts/launch-config.py`: `HOST_OS` from `sys.platform`, used for `launch_options(os=…)` and `generate_fingerprint(os=…)`; `fingerprint.json` records `os`, and a file for another system (or none, read as `linux`) is made again.
- `scripts/tests/launch-config.test.mjs`: expects the host's system; a case pretends to be a Mac, and a saved identity for another system, or none, is made again.
- `scripts/tests/fixtures/fake-camoufox-library.mjs`: a `platform` option writes a `sitecustomize.py` that sets `sys.platform`, so CI on Linux tests the Mac case.
- `wiki/development/browsing.md`: the device identity line names the real system.
- `CHANGELOG.md`: a `## Next (patch)` entry.

## Decision log

- **2026-11-06** — Asked whether to turn off the browser's Linux disguise after scrambled text on about:addons → chose to turn it off and try again.
- **2026-11-06** — Asked whether the add-ons page reads correctly with the Mac's own system, tried on this computer's real browser → chose: it looks good.
- **2026-11-06** — Assumed: the browser tells the real system rather than no disguise at all, because Camoufox always claims a system and, on the host's own one, uses the real fonts and leaves the bundled fonts off.
- **2026-11-06** — Assumed: a Linux computer keeps its saved identity, because its system does not change; an identity with no recorded system reads as Linux.
- **2026-11-06** — Review found that CI, on Linux only, never tested the Mac case → fixed: the fake library can make Python report `darwin` or `linux`, and a test checks a Mac's launch, its new identity, and reuse on every host.
- **2026-11-06** — Assumed: saved under /ship for final acceptance, after the review's one fix (a test that pretends to be a Mac).
