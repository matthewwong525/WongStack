# Tasks

## 1. Browser

- [x] 1.1 Build from current `main`; before the save, bring `main` in again so `fill-logins-from-1password`'s edits land at the moved paths (design, Context)
- [x] 1.2 `git mv` `.agents/plugins/browser/browser/*` to `.agents/plugins/browser/`, and `hand-over/` and `shop/` to `skills/`; replace `module.json` with both `plugin.json` files at 2.0.0 (design §1)
- [x] 1.3 Relink `.agents/skills/browser` to `../plugins/browser`; delete the `hand-over` and `shop` links
- [x] 1.4 Fix every relative import and Markdown link inside the folder, and every caller path to `.claude/skills/browser/skills/{hand-over,shop}/` (`.agents/browser/profile.mjs`, `.agents/skills/reply-link/`, `.agents/skills/connect/`, the module's own guides and setup)
- [x] 1.5 Replace the four links to the loop's ask guide in `browsing.md`, `live-view.md`, and `shopping.md` with one sentence each (design §3)

## 2. Daily

- [x] 2.1 `git mv` `.agents/plugins/daily/daily/*` to `.agents/plugins/daily/`, and `schedule/` to `skills/schedule/`; delete `module.json`; raise both `plugin.json` files to 2.0.0 (design §2)
- [x] 2.2 Relink `.agents/skills/daily` to `../plugins/daily`; delete the `schedule` link
- [x] 2.3 Fix every relative import and Markdown link inside the folder; point `hosts.mjs`'s `finish` command and run guide at `.agents/skills/daily/skills/schedule/`
- [x] 2.4 Repoint WongStack's callers: `.agents/loop/step-title.mjs` (and its command match for `/daily:schedule`), `.agents/memory/session-start.mjs`, `.agents/inbox/*`, `.agents/daily/profile.mjs`, the loop's `plan/SKILL.md` link
- [x] 2.5 Rename `/schedule` to `/daily:schedule` in the module, AGENTS.md, `wong-setup`, `wong-sync`, and the wiki
- [x] 2.6 Replace the two links to the loop's ask guide in `SKILL.md` and `registration.md` with one sentence each

## 3. Access

- [x] 3.1 Delete step 9 of `references/setup.md`, renumber, repoint the moved anchors in and outside the file; add the one general sign-in line to the README; raise both `plugin.json` files to 1.0.1 (design §4)

## 4. Payload, rules and docs

- [x] 4.1 `payload-files.json`: one `mapped` entry each for browser and Daily, the new Daily `exclude` paths; the payload manifest to match
- [x] 4.2 `check-module-versions.mjs`: drop `module.json` reading (design §6)
- [x] 4.3 `scripts/retired-names.json` entries and `.agents/memory/areas.json` paths and definitions (`browser`, `browser-module`, `shopping`, `own-browser-connect`, `paseo`, `schedule`, `daily-routine`, `daily-module`) (design §7)
- [x] 4.4 `.agents/rules/payload.md`: the ask rule (design §3)
- [x] 4.5 Both setup guides: copy one folder, and a one-time `## Update` step from below 2.0.0; both READMEs to the new layout and command name (design §7)
- [x] 4.6 `wiki/maintaining/adding-a-module.md` to one shape; `wiki/development/daily.md`, `wiki/stack/host-schedules.md`, and every page naming an old path (design §8)
- [x] 4.7 `CHANGELOG.md`: `## Next (major) — The browser and Daily each come in one folder`, with an **Updating.** note that `/schedule` is now `/daily:schedule` and nothing needs doing by hand

## 5. Tests

- [x] 5.1 Move the browser and Daily paths in `cli-conventions.test.mjs`, `module-install.test.mjs`, and each script test that names them
- [x] 5.2 `module-install.test.mjs`: install browser and Daily each as one folder; fail on a link or GitHub address from `browser`, `daily`, or `access` into another module's folder (design §5)
- [x] 5.3 An install-path test: each old browser and Daily source path lands at its new install path, and no `mapped` entry names the old folders (design §7)
- [x] 5.4 A `step-title` test: a typed `/daily:schedule` titles the chat `SCHEDULE`

## 6. Review fixes

- [x] 6.1 The one-time update from the old layout in both setup guides also moves each file that exists only in the old folder (a file the project added) to its new path, so the final delete removes nothing of the project's
- [x] 6.2 `scripts/tests/helper.test.mjs` uses the real old path `.agents/skills/hand-over/scripts/reply-link.mjs`, with the file allowed in that `retired-names.json` entry

## 7. Checks

- [x] 7.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, retired names, module versions, `measure-context.mjs --check`, script tests)
- [x] 7.2 In a scratch empty repo, copy the branch's browser and Daily folders as the setup guides say: Claude Code lists `/daily:schedule` once and no bare `/schedule`, `/hand-over` or `/shop`; Daily's chat-start hook and check run; the browser's check passes with no profile
