# Give the private links their own home

**Status:** ready-to-ship
**Branch:** move-hand-over-scripts
**Open questions:** none

## Why

The tools behind the three private links (handing the browser to you, receiving a key, saving passwords) live inside the checking command's folder, though none of them checks anything. Someone looking for them looks in the wrong place, and every change to them looks like a change to checking.

## What Changes

- **One home for the private links.** The hand-over, key and password pages move together into their own hidden folder beside the other skills. Nothing about how the links look or work changes.
  ```text
  before                   after
  ──────────────────────   ──────────────────────
  verify/                  verify/
    checking scripts         checking scripts
    hand-over pages        hand-over/  (hidden)
    key-link page            hand-over pages
    password page            key-link page
                             password page
  ```
- **Hidden, like the browser tool.** It does not appear in your list of commands; the agent reaches it from the browsing and keys guides, as today.
- **The same startup size.** Its one-line description is offset by trimming words elsewhere, so each session reads no more before your first message.
- **Updating is safe.** An update moves the files for you; let any open private link finish first.

**Non-goals:** Changing what any link does or shows, renaming the tool, or changing `/verify`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None: no requirement names where the scripts live, so no spec changes (`skip_specs: true`).

## Impact

Moves nine files from `.agents/skills/verify/scripts/` to a new `.agents/skills/hand-over/` skill folder with a hidden `SKILL.md`; updates the commands in `wiki/development/browsing.md` and `wiki/development/secrets.md`, `close/SKILL.md`, a comment in `ship/scripts/worktree-secrets.mjs`, five test files and the CLI-conventions test, `payload-files.json`, the payload manifest, and retired names. Adds a minor changelog entry. No behavior, app, or dependency change.

## Decision log

- **2026-09-30** — Asked to plan the move after the `/verify` rewrite shipped (28.1.0) → chose to plan it now; #215, which held it, shipped as 27.10.0.
- **2026-09-30** — Asked where the scripts should live → chose their own hidden skill folder, trimming another description to keep startup words under the limit.
- **2026-09-30** — Assumed: name the folder `hand-over`, because the main script is `hand-over.mjs` and the guides already call all three the hand-over link's safety.
- **2026-09-30** — Assumed: mark it hidden and `disable-model-invocation: true`, as the vendored `agent-browser` skill is, because nothing calls it through the Skill tool; the wiki guides run its script directly.
- **2026-09-30** — Assumed: no spec change (`skip_specs: true`), because no requirement names the scripts' location and behavior is unchanged.
- **2026-09-30** — Assumed: a minor release, because installs gain a new skill folder, with an Updating note to let an open private link finish first, since its detached watcher runs from the old path.
- **2026-09-30** — Assumed: `keys-page.test.mjs` also moves to the new path, because it imported the old folder too; the plan named five test files and six needed it.
- **2026-09-30** — Assumed: the startup budget stays at exactly 2,200 words, because the new ten-word description is offset by ten words trimmed from six other descriptions with their meaning kept.
- **2026-09-30** — Assumed: archive checkpoint for release 28.3.0; CI runs the moved tests, including the three jsdom page tests this machine could not run.
