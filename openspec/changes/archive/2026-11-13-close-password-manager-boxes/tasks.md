# Tasks

## 1. Browser code

- [x] 1.1 `browser-server.mjs`: `offeredLogins` clicks the in-box icon when no list opens (decision 0); passkey names in `addon logins` and the passkey press in `addon pick` (decision 0b).
- [x] 1.2 `browser-server.mjs`: the close route by design decision 1 (shown non-list add-on frames, `CLOSE_NAMES`, one click each, wait for hidden, count or refusal), and the refusal hint by decision 2.
- [x] 1.3 `addons.mjs` and `browse.mjs`: `addon close` in `ADDON_VERBS`, the help line, and `BROWSE_ADDON_CLOSED=<n>` output.
- [x] 1.4 Tests: `fake-camofox-server.mjs` gains an icon that opens the list, a passkey box,  a box frame with *Not now* and one with only *Save*; `browser-server.test.mjs` covers a close, a box with no close button (refused, nothing pressed), the fill list left alone, and the hint on a refused click, the icon opening the list, and a passkey pick only after `addon logins`; `browse.test.mjs` covers the output and help line.

## 2. Skill and docs

- [x] 2.1 `.agents/plugins/browser/SKILL.md`: `addon logins` first at every sign-in or passkey ask, before any sign-in turn; the close rule by design decision 3, with offsetting cuts.
- [x] 2.2 `.agents/plugins/browser/references/password-manager.md`, `browsing.md`, `login-codes.md`: the icon and passkey sign-in, a passkey on the person's own device staying theirs, the box paragraph, and the close named beside the one pick.
- [x] 2.3 `CHANGELOG.md`: a `## Next (minor)` entry, in plain words.

## 3. Checks

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree` (tests, payload links, context budget) and fix what it finds.
