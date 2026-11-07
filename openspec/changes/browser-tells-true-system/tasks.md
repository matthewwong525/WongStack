## 1. Script

- [x] 1.1 In `.agents/skills/browser/scripts/launch-config.py`, add `HOST_OS` and use it for `launch_options(os=…)` and `generate_fingerprint(os=…)`
- [x] 1.2 Record `os` in `fingerprint.json`, and make the identity again when the saved `os` (absent reads as `linux`) is not `HOST_OS`

## 2. Tests

- [x] 2.1 In `scripts/tests/launch-config.test.mjs`, expect the host's system from `process.platform` in place of `linux`
- [x] 2.2 Add a case that pretends to be a Mac (a `platform` option in `scripts/tests/fixtures/fake-camoufox-library.mjs`): the launch and a new identity tell `macos`; an identity saved with no system, or for another, is made again, then reused

## 3. Docs

- [x] 3.1 In `wiki/development/browsing.md`, say the device identity tells sites the computer's real system
- [x] 3.2 Add a `## Next (patch)` entry to `CHANGELOG.md`, with an **Updating.** note that a Mac or Windows computer may need one sign-in again

## 4. Checks

- [x] 4.1 Run `node --test scripts/tests/launch-config.test.mjs` and `node .github/scripts/checks.mjs --worktree`
- [ ] 4.2 `/save`, then confirm CI passes
