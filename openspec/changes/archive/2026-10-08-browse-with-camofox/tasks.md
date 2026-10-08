# Tasks

## 1. The camofox client (`.agents/skills/browser/`)

- [x] 1.1 Write `scripts/browse.mjs` with `install`, `status`, `stop`, and on-demand start by the design (pinned versions in one constant, `TMPDIR` on disk, loopback bind, reporting off, API key file 0600, refuses a driver that is not 1.58.x); verify `browse.test.mjs` covers `BROWSE_NEEDS=install` (exit 3), the start environment, and the driver refusal against a fake server.
- [x] 1.2 Add `open`, `snapshot`, `click`, `type`, `press`, `select`, `get url|count|value`, `screenshot [--if-changed]`, and `close`, with the settle wait, one retry on 410 or a click timeout, a deadline per command, and one `BROWSE_ERROR=` line; verify the tests cover each command, the retry, and a second failure reported, against the fake server.
- [x] 1.3 Add per-task tabs keyed by `--session` with `userId` `me`; verify a test runs two sessions at once and `close` in one leaves the other's tab open.
- [x] 1.4 Add `logins`, `forget`, and `login <name> --username|--password|--submit` reading `~/.wong-stack/logins.json`; verify the tests cover `accepted`, `rejected`, and `missing`, and that no stored username or password appears in stdout, stderr, argv of any child, or the fake server's request log outside the `/type` body.
- [x] 1.5 Add `save`, and make `login` save once accepted and `close` save when it holds the last tab; verify by test against the fake server.
- [x] 1.6 Prove against a real camofox, by hand on this machine, that `save` checkpoints with every tab open (a cookie set, `save`, the server killed, the cookie back after a restart); on failure switch `save` to the design's fallback and record which in the design's Decision on saving.
- [x] 1.7 Rewrite `SKILL.md` for `browse.mjs`'s commands, keeping `hidden` and `disable-model-invocation`; verify `node scripts/measure-context.mjs --check` passes.
- [x] 1.8 Delete `scripts/cloud-browser.mjs` and `scripts/tests/cloud-browser.test.mjs`, and fix `scripts/tests/cli-conventions.test.mjs` and `scripts/tests/fixtures/browser-pages.json` for what remains; verify the script suite passes.

## 2. Passwords in a file (`.agents/skills/hand-over/`)

- [x] 2.1 Change `passwords.mjs` to read and atomically write `~/.wong-stack/logins.json` (0600, folder 0700) in place of the two `agent-browser auth` calls, keeping its routes, limits, and naming; verify `passwords.test.mjs` covers a first save, a replaced password, a second account, the file's mode, and that a failed write reports the login as failed.
- [x] 2.2 Update the header comments in `passwords.mjs` and `hand-over.mjs` that name the vault; verify `passwords-page.test.mjs` and `hand-over.test.mjs` pass unchanged in behavior.

## 3. The private form through camofox (`.agents/skills/hand-over/`)

- [x] 3.1 In `form.mjs`, remove `openFeed`, `typeText`, and `keyEvents`; make `fillField` type through the injected client and accept `e12` and `@e12` targets; verify `form.test.mjs` covers a typed box, a dropdown, the undo on *not accepted*, and both target spellings.
- [x] 3.2 In `hand-over.mjs`, replace `browser(args)` with `browse.mjs`'s client for the opener's session, remove `streamPort` and `formFeed`, and keep `seen()` on `get url` and `get count`; verify `hand-over.test.mjs` covers `done`, `not-accepted`, and a finish the page already meets.
- [x] 3.3 Verify by test that a sent value appears in no argv, env, log, or file, only in the loopback `/type` body.
- [x] 3.4 Try a private form on a real camofox against the pretend shop page with a card field inside an embedded frame, by hand; on failure add the design's per-key fallback and its test, and write the limit in `browsing.md`.

## 4. Cloudflare key (`.agents/skills/wong-setup/`)

- [x] 4.1 Remove `Browser Run Write` from `scripts/provision.mjs`'s widen list and from `references/permission-groups.md`, and update `scripts/tests/fixtures/cloudflare.mjs`; verify the provisioning tests pass and none expects the group.
- [x] 4.2 Add camofox to `references/tools.md` as installed on first use, never offered by setup; verify the page names the install command `browse.mjs install` and no other.

## 5. Dependencies (`.agents/skills/update-dependencies/`)

- [x] 5.1 Teach `scripts/update.mjs` camofox's two pinned versions, moved only together and only when task 1.6's check is rerun; verify its test covers reading the pin from `browse.mjs`.

## 6. Docs (`wiki/`)

- [x] 6.1 Rewrite `wiki/development/browsing.md` around `browse.mjs`: saved logins, sharing the browser, pictures, when a step needs you, a short *when a site refuses the browser* section, and the two trial lessons (read after the page settles; what the install needs); remove every cloud-browser and no-disguise line; verify the wiki checks pass and the page stays under 3,000 words.
- [x] 6.2 Delete `wiki/development/blocked-sites.md` and fix each link to it that `memory.mjs areas wiki/development/blocked-sites.md` lists, including `wiki/development/README.md`; verify `node scripts/check-payload-links.mjs` passes.
- [x] 6.3 Update `passwords.md` (where the file is, who can read it, that earlier saved logins are not carried), `login-codes.md` (commands), and `required-tools.md` (camofox on first use, its sizes); verify the wiki checks pass.
- [x] 6.4 Update `.agents/skills/memory/references/areas.json`'s `browser` area, `payload-files.json`, and the payload manifest for the removed and added files; verify `memory-areas.test.mjs` and the payload checks pass.
- [x] 6.5 Add `cloud-browser.mjs`, `blocked-sites.md`, `CLOUD_BROWSER_`, and `agent-browser auth` to `scripts/retired-names.json` with replacements, allowing `/verify`'s own files where they still apply; verify `node scripts/check-retired-names.mjs` passes.

## 7. Release

- [x] 7.1 Add the `## Next (major) — Browse your accounts with camofox` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: the first errand asks to install the new browser, and each login is saved again; verify `node .github/scripts/checks.mjs --worktree` passes.
- [x] 7.2 At archive, set `openspec/specs/browser-logins/spec.md`'s Purpose to name the personal browser instead of agent-browser; verify `openspec validate --specs --strict` passes.

## 8. Verification

- [x] 8.1 On this machine with a real camofox, run one errand end to end by hand: install through `BROWSE_NEEDS=install`, save a login through the password link's own routes as the page would, `login` on a public practice login site with its published test account, restart the server, and find the site still logged in.
- [x] 8.2 Run two sessions at once on a real camofox and confirm neither closes the other's page or logs it out.
- [x] 8.3 Confirm with a network capture or camofox's log that a forced page failure sends nothing to `camofox-telemetry.askjo.workers.dev`.
