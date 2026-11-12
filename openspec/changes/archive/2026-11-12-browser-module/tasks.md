# Tasks

## 1. Move the folders

- [x] 1.1 Start from current `main` (the 1Password change catches up later); if `plan-module` has not shipped, add its guide rule and `module.json` reading here (design, Context)
- [x] 1.2 Move `.agents/skills/browser/`, `hand-over/`, and `shop/` to `.agents/plugins/browser/{browser,hand-over,shop}/`; make the three skill paths links; add `browser/module.json` (design §1)
- [x] 1.3 Move `reply-link.mjs`, `helper.mjs`, and `lib/{computer,helper-log,inbox,line,uploads,wake}.mjs` to a new hidden `.agents/skills/reply-link/` skill; point `reply-link.mjs` at the module's `tunnel.mjs`; repoint `.agents/settings.json`, `.agents/hooks.json`, and every caller
- [x] 1.4 Move `connect/scripts/browser.mjs` and `mask-keys.mjs` to `browser/scripts/connect-browser.mjs` and `mask-keys.mjs`; repoint `connect/SKILL.md`, `wiki/stack/connect-your-tools.md`, and the tests
- [x] 1.5 List every old path in `scripts/retired-names.json`; add the `mapped` entries to `payload-files.json` and the payload manifest; update `.agents/memory/areas.json` (`browser`, `live-line`, `inbox`, `own-browser-connect`, `shopping`) and add a `browser-module` area

## 2. Slots and own helpers

- [x] 2.1 Write `browser/scripts/lib/profile.mjs` (`slot(name)`; checkout top by walking up to `.git`) and `.agents/browser/profile.mjs` filling `look`, `wakeChat`, `inbox`, `keyFiles`, and `sendKey` from today's code (design §2)
- [x] 2.2 Route `hand-over.mjs` (look, wake, inbox), `keys.mjs` (key files), and `connect-browser.mjs` (`take-key`) through the slots, each with its empty behavior
- [x] 2.3 Add `browser/scripts/lib/cli.mjs` and `lib/primary-root.mjs`; point every module script at them; use `node:util`'s `parseEnv` in `proxy-lines.mjs`; extend `cli-conventions.test.mjs` to fail when a copy differs from memory's
- [x] 2.4 Tests: each slot empty and filled; a key link with no profile writes only an ignored `.env` and refuses otherwise; `take-key` with no `sendKey` keeps the key on the computer; `helper.mjs start` repoints a `current.json` that names the old script; the moved script tests pass at the new paths

## 3. Guides, README, and setup

- [x] 3.1 Move `browsing.md`, `login-codes.md`, `password-manager.md`, `browser-window.md`, `browser-proxy.md` into `browser/references/`, `live-view.md` and `saved-details.md` into `hand-over/references/`, `shopping.md` into `shop/references/`, and the key-link section of `secrets.md` into `hand-over/references/key-link.md`, keeping `secrets.md`'s anchor as a short linking section (design §4)
- [x] 3.2 Repoint every inbound link (`memory.mjs pull <page>`), the three `SKILL.md`s, and `wiki/development/README.md`; turn links from the moved pages to WongStack pages outside the module into GitHub addresses
- [x] 3.3 Write `browser/README.md` (install and update messages first, what you get, what it needs, the slots) and `browser/references/setup.md` with its `## Update` section (design §5)
- [x] 3.4 Update `wiki/maintaining/adding-a-module.md` to name the browser as a second example of skill folders under one version

## 4. Checks

- [x] 4.1 `module-install.test.mjs` installs the browser module alone, runs its no-profile check, and runs a profile with every slot stubbed; fails on an import from outside the module's folders (design §6)
- [x] 4.2 Add the `## Next (minor) — The browser is a module any project can add` entry to `CHANGELOG.md`, with an **Updating.** note that nothing needs doing
- [x] 4.3 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, retired names, module versions, `measure-context.mjs --check`, script tests)
- [x] 4.4 In a scratch empty repo, follow `browser/references/setup.md` from the branch's files: the three skills load in Claude Code, the check passes with no profile, and after a yes the browser installs, opens a page, and closes
- [x] 4.5 In this repo, after the move: `browse.mjs open`, `snapshot`, and `close` work; `build-review.mjs --link` on this plan gives a private link; `helper.mjs status` runs from `reply-link/` (the repoint of a running helper is covered by its test)

## 5. Review fixes

- [x] 5.1 `/wong-sync` runs the `WONG-STACK` block through the install-time link rewrite, so a sync writes `.agents/skills/…` links and a fresh install's block reads as current, not locally adapted; a preflight test covers it
- [x] 5.2 The changelog entry's **Updating.** note asks each install to repoint its own `wiki/development/README.md` links to the eight moved guides (wong-sync has no automatic fix for a project's own pages)
- [x] 5.3 `proxy-lines.mjs` reads `.env` through the module's copy of memory's reader, `browser/scripts/lib/env.mjs`, so a `#` inside a value stays; `cli-conventions.test.mjs` keeps the copy equal to memory's, a proxy test covers a `#` in a password, and design §3 says so
- [x] 5.4 Every live mention of the old `browser.mjs` command now says `connect-browser.mjs`
- [x] 5.5 `payload-manifest.md` tells the sync to take the marked `CLAUDE.md` block from `install-path.mjs` too, so an update writes the block with install-path links
