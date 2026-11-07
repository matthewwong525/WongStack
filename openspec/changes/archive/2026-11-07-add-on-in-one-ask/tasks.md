# Tasks

## 1. Fit beside the open add-on change

- [x] 1.1 Edit `main`'s current text, keeping each edit narrow so PR #532 (`password-manager-live-view-fixes`) merges over it with a small conflict; say "any add-on" where the line already names add-ons generally, and leave #532's own rewrites (side by side, *Add it yourself* → *Ask the agent*) to it.

## 2. Instructions and help

- [x] 2.1 Rewrite the add-on line in `.agents/skills/browser/SKILL.md` by the design's wording: the ask is the yes for one clear, featured or popular match; never send the person to the add-on site; after an add, name the facts and `BROWSE_ADDON_TELL`, run `addon open`, then send the browser (the window or a live view) by the *send me the browser* command.
- [x] 2.2 Update `wiki/development/password-manager.md`: *Ask the agent* says the agent adds a well-known add-on at once and opens its sign-in page; *The checks* says when it still asks (a warning, or more than one match); *Use it at a sign-in* step 1 adds "and right after an add".
- [x] 2.3 Add a minor entry to `CHANGELOG.md`.

## 3. Checks

- [x] 3.1 Run `openspec validate add-on-in-one-ask --strict --no-interactive` and the wiki checks (`node --test scripts/tests/` for wiki links and page size).
- [x] 3.2 `/save`, then confirm CI passes on the saved change.
