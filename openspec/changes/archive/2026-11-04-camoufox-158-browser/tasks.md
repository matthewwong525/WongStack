# Tasks

## 1. Port from WongOS

- [x] 1.1 Port `browser-server.mjs`, `refs.mjs`, `launch-config.py` and `login-move.mjs`, and point `browse.mjs` and the hand-over scripts at the new server. Verify: `browse.test.mjs`, `browser-server.test.mjs`, `refs.test.mjs`, `launch-config.test.mjs`, `login-move.test.mjs` and `hand-over.test.mjs` pass.
- [x] 1.2 `/update-dependencies` surveys the `camoufox` pin on PyPI. Verify: `update-dependencies.test.mjs` passes.
- [x] 1.3 Retire `@askjo/camofox-browser` and `#installing-camofox` in `scripts/retired-names.json`.

## 2. Wiki, spec and release

- [x] 2.1 Update `wiki/development/browsing.md` and `required-tools.md`, and add the rule that a test never copies a Facebook or Messenger login to another browser or network.
- [x] 2.2 Add the `browser-engine` spec, its area, and a `CHANGELOG.md` `Next (major)` entry with an **Updating.** note.
- [x] 2.3 `openspec validate camoufox-158-browser --strict --no-interactive`, then ship by the change loop.
