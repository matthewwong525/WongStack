# Tasks

## 1. Hand-over scripts

- [x] 1.1 In `.agents/skills/hand-over/scripts/lib/wake.mjs`, add `personEnv(env)`, a copy without `PASEO_AGENT_ID` and `PASEO_AGENT_CWD`, with a comment saying why; pass `env: personEnv(env)` to `wakeChat`'s `execFile`.
- [x] 1.2 In `.agents/skills/hand-over/scripts/reply-link.mjs`, raise `PROTOCOL` from 3 to 4.
- [x] 1.3 In the same file, make `startInbox` write `{pid, protocol: PROTOCOL}` and replace a live helper whose recorded protocol is missing or lower: SIGTERM it, wait for it to end, then spawn. Export it for the test.

## 2. Tests

- [x] 2.1 In `scripts/tests/fixtures/fake-tunnel.mjs`, let `fakePaseo` also record the env it ran with, without changing what existing callers read from `sent`.
- [x] 2.2 In `scripts/tests/reply-link.test.mjs`, test that `wakeChat` sends with no `PASEO_AGENT_ID` or `PASEO_AGENT_CWD` while the caller's env has both, keeps `PASEO_HOME` and the `--home` flag, and leaves the caller's env unchanged.
- [x] 2.3 In the same file, extend `a server from older code is swapped by the next open…` to seed the older server as protocol 3, then send through the swapped server and assert the `paseo send` carried no agent id though the opener's env had one.
- [x] 2.4 In `scripts/tests/reply-link-inbox.test.mjs`, test that `startInbox` replaces a live helper recorded with no protocol, writes the new pid with `protocol: 4`, and starts none while a current one runs.

## 3. Docs and release

- [x] 3.1 In `wiki/development/reply-links.md`, under *Is a link safe?*, add to *A send reaches one chat, under one fixed line* that the send arrives as your own message, never under another chat's name.
- [x] 3.2 Add a `## Next (patch) — Page sends arrive as your own message` entry at the top of `CHANGELOG.md`'s entries: what changed in plain words, and an *Updating.* note that no hand step is needed; the next page to open replaces the running server.

## 4. Verification

- [x] 4.1 Run `node --test scripts/tests/reply-link.test.mjs scripts/tests/reply-link-inbox.test.mjs scripts/tests/hand-over.test.mjs`.
- [x] 4.2 Run `node .github/scripts/checks.mjs --worktree` as a pre-check.
- [x] 4.3 Ask Matthew before `/save` publishes; CI is the gate. Answered: Matthew chose *Build and publish* on the review page.

## 5. Review fixes

- [x] 5.1 In `startInbox`, signal a recorded older helper only when its command line shows `reply-link.mjs serve-inbox`; otherwise treat the record as stale and start a new helper without signalling. Test both in `scripts/tests/reply-link-inbox.test.mjs`.
