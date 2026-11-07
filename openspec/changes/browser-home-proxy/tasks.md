# Tasks

## 1. Saved proxy lines

- [x] 1.1 Add `.agents/skills/browser/scripts/proxy-lines.mjs`, ported from Relay Everything's `server.mjs` (keys, computer files, old `camofox` fallbacks, 0600 save, last-`@` login split), and `scripts/tests/proxy-lines.test.mjs` with a temporary home: parse shapes, repo line wins and is saved, computer file used when the repo has none, old file read only while the new one is missing; verify `node --test scripts/tests/proxy-lines.test.mjs` passes.
- [x] 1.2 Add blank, documented `BROWSE_FIRST_PROXY` and `BROWSE_UPSTREAM_PROXY` to `.env.example`; verify the env-example checks in `node .github/scripts/checks.mjs --worktree` pass.

## 2. Routes in the forwarder

- [x] 2.1 Port Relay Everything's ordered routes into `forwarder.mjs` (`first`, `upstream`, direct; one-minute first-proxy skip; local hosts direct; plain-request no-resend; `network.json` state without `language`), keeping today's options when no route is given; extend `scripts/tests/forwarder.test.mjs` from Relay Everything's route tests (first down → backup, both down → direct, 407 moves on, plain request never sent twice, local host direct, no address or login in the state file); verify it passes.
- [x] 2.2 In `browser-server.mjs`, `startProxy(on)` passes `resolveFirst()`, `resolveUpstream()` and `NETWORK_FILE` to the forwarder only when `on`; extend `browser-server.test.mjs` (on with lines → routes passed; off → no forwarder, lines untouched); verify it passes.
- [x] 2.3 In `browse.mjs`, `status` prints `BROWSE_NETWORK=` from `networkLine(network.json, server pid)`, and the usage text says so; extend `browse.test.mjs`; verify it passes.

## 3. Docs and release

- [x] 3.1 Add `wiki/development/browser-proxy.md` (routes, save, check, turn off, test), from Relay Everything's page with WongStack's `proxy on|off` in place of `network off`; link it from `wiki/development/browsing.md#the-proxy-setting`, `wiki/development/README.md`, the seeded hub, `payload-files.json`, and the browser `SKILL.md` within the context budget; verify `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check` pass.
- [x] 3.2 Add a `## Next (minor) — …` CHANGELOG entry whose Updating note says saved home and backup proxies carry over with no step, and a repo with its own route keeps it until its next update; verify the changelog check passes.

## 4. Checks

- [x] 4.1 Run `node --test scripts/tests/forwarder.test.mjs scripts/tests/proxy-lines.test.mjs scripts/tests/browser-server.test.mjs scripts/tests/browse.test.mjs` and `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 4.2 Start a throwaway browser server from this branch with a temporary home holding copies of this computer's two lines (never the running browser): `status` shows `BROWSE_NETWORK=upstream`, a page reports a Canadian address, and with the first line pointed at a closed port it shows `upstream (backup)`.
- [ ] 4.3 `/save`, then CI passes.
