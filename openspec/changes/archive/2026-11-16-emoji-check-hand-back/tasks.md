# Tasks

## 1. The icon

- [x] 1.1 Replace `.agents/plugins/browser/addon/check.svg` with the `u2705` glyph from Camoufox's `TwemojiMozilla.ttf`, y-down paths in their CPAL colours, with the CC-BY 4.0 credit comment; verify a render beside the font's own ✅ matches.
- [x] 1.2 In `scripts/tests/addons.test.mjs`, assert the copied `check.svg` has the `#77B255` and `#FFFFFF` fills and no `<circle>`; verify `node --test scripts/tests/addons.test.mjs` passes.
- [x] 1.3 Add a `## Next (patch) — The Hand back button looks exactly like ✅` entry to `CHANGELOG.md` with a nothing-to-do **Updating.** note, and raise `.agents/plugins/browser/VERSION` to 3.4.1; verify `node scripts/check-payload-links.mjs` passes.

## 2. Checks

- [x] 2.1 Restart the agent's browser from this build and screenshot its toolbar; verify the button is the ✅ drawing, grey while nothing waits.
