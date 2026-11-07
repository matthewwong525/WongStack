# The browser goes through your home proxy, with a backup

**Status:** in-progress
**Branch:** route-repos-through-proxy
**Open questions:** none

## Why

The assistant's browser is shared by every repo on a computer, and the repo that starts it decides how it reaches sites. WongOS, ClaymooApp and Relay Everything send it through a home proxy, with a paid proxy as a backup. WongStack's browser can not: when WongStack starts it, every repo browses from the server's own country (today Germany), and sites show German pages or refuse the sign-in.

## What Changes

- **With the proxy on, the browser goes through your saved proxies first.** You can save two: a first proxy, such as a small computer at your home, and a backup, such as a paid home address. Each page tries the first proxy, then the backup, then this computer's own network, so a page still loads when both are down. Sites see your home address, and the browser's language and clock follow it.
  ```mermaid
  flowchart LR
    B[Browser] --> F[Local proxy]
    F -->|1| H[Home proxy]
    F -->|2| U[Backup]
    F -->|3| D[Own network]
    H --> S[Site]
    U --> S
    D --> S
  ```

- **A first proxy that is off does not slow you down.** When it fails and the backup works, the browser skips it for one minute, then tries it again. Pages on this computer itself always go straight.

- **It is the same whichever repo starts the browser.** The saved proxies stay on this computer, so a start from any repo uses them. A proxy saved in one repo's keys is copied to this computer at the next start, so a changed proxy spreads to every repo.
  | Repo that starts the browser | Today | After this, and its next update |
  |---|---|---|
  | WongStack | This computer's network (Germany) | Home proxy, then backup |
  | WongOS | Home proxy, then backup | Home proxy, then backup |
  | Relay Everything | Home proxy, then backup | Home proxy, then backup |
  | ClaymooApp | Claymoo's route, then backup | Home proxy, then backup |

- **You can see which way the browser goes.** Ask *which network is the browser on?*: the assistant says home proxy, backup, or this computer's own network, and tells you to check your home proxy when it is on the backup.

- **Proxy off still means straight to sites.** *Turn the browser proxy off* sends the browser straight to sites from its next start and keeps your saved proxies for when you turn it on again. With no saved proxies, the proxy works as it does today.

- **Your other repos get it when they next update.** After this is live, one new chat each updates WongOS, ClaymooApp and Relay Everything, and each waits for your OK. Until then they keep their own home proxy route.

**Non-goals:** a new proxy, account or country; a change to Claymoo's own route for teammates without a home proxy; turning the proxy on for anyone by default; a proxy for programs on this computer other than the browser.

## What the build needs

- **Your home proxy**: Ready. This computer reaches it at its saved address, and sites see a Toronto home address through it.
- **Your backup proxy**: Ready. Its saved address works, and sites see a Mississauga address through it.
- **The proxy setting on this computer**: Ready. It is on.
- **A browser restart, after it is live**: Ready. The running browser keeps its route until it starts again, so the assistant asks you before it restarts it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the local forwarding proxy, when on, chains through a saved first proxy and a saved backup proxy before the computer's own connection, from any repo; the browser's status names the route in use.

## Impact

- `.agents/skills/browser/scripts/forwarder.mjs`: ordered routes (first, upstream, direct), the one-minute skip of a failed first proxy, local hosts direct, a no-resend rule for plain requests, and a `network.json` state with no address or login. Ported from Relay Everything's generic copy (`/root/relay-ring/.agents/skills/browser/scripts/forwarder.mjs`), minus its language field.
- New `.agents/skills/browser/scripts/proxy-lines.mjs`: reads `BROWSE_FIRST_PROXY` and `BROWSE_UPSTREAM_PROXY` from the environment or the primary worktree's `.env`, else `~/.wong-stack/camoufox/first-proxy` and `upstream-proxy` (old `camofox` files while missing), and saves a repo line to the computer file (0600). Ported from Relay Everything's `server.mjs`.
- `browser-server.mjs`: `startProxy` passes the resolved lines and the state file to the forwarder.
- `browse.mjs`: `status` prints `BROWSE_NETWORK=`; usage text.
- `.env.example`: two blank, documented keys.
- `.agents/skills/browser/SKILL.md`, `wiki/development/browsing.md` (the proxy setting), and a new `wiki/development/browser-proxy.md`, linked from `wiki/development/README.md` and the seeded hub.
- Tests: `scripts/tests/forwarder.test.mjs`, a new `scripts/tests/proxy-lines.test.mjs`, `browser-server.test.mjs`, `browse.test.mjs`.
- Release: a `minor` CHANGELOG entry whose Updating note says a repo with its own home proxy route keeps working, and the saved addresses carry over.
- After ship, outside this repo: `/wong-sync` in WongOS, ClaymooApp and `relay-ring`, each in its own workspace.

## Decision log

- **2026-11-07** — Asked which proxy every repo's browser should use → chose the home Pi first, then DataImpulse, taught to WongStack's browser so it is the same whichever repo starts it.
- **2026-11-07** — Asked what ClaymooApp should do, since it sends the browser through Claymoo's own route first → chose the home proxy first everywhere; Claymoo's route stays for teammates without one, settled in ClaymooApp's own update.
- **2026-11-07** — Asked how to run the updates of the other three repos → chose one new chat each, opened after this is live.
- **2026-11-07** — Asked again: the person first said the three repos must sync first, then stopped those syncs: they wait for this change, so each repo syncs once, after it is live.
- **2026-11-07** — Assumed: the saved proxies are used only while the proxy setting is on, and *proxy off* keeps them, because one switch is simpler than two and the setting is already on here.
- **2026-11-07** — Assumed: the code and the page come from Relay Everything's copy, which already names no person, home or account, because WongStack ships to everyone and Matthew kept those details out of the 48.0.0 browser port.
- **2026-11-07** — Assumed: no `network off` command and no `BROWSE_LANGUAGE=` line, because *proxy off* already sends the browser straight, and WongStack's server already records the browser's language.
- **2026-11-07** — Assumed: keep the existing key names `BROWSE_FIRST_PROXY` and `BROWSE_UPSTREAM_PROXY` and the existing computer files, because the three other repos and this computer already use them, so nothing needs saving again.
- **2026-11-07** — Assumed: save the plan unbuilt at /close, because the person closed this chat to wait for review; nothing is built.
- **2026-11-07** — Assumed: each task's own test run moved to the end, after all source and tests were written; the acceptance of each stays as planned.
- **2026-11-07** — Assumed: the existing forwarder test that mocks the listener now undoes each mock before the next, because stacked mocks restored in the wrong order and broke the new route tests after it; the test checks the same things.
- **2026-11-07** — Assumed: the live check ran the branch's forwarder with a temporary home holding copies of the two saved lines, not a whole second browser, because a second browser would download its own copy and the route is the forwarder's job; the home line showed Toronto and `upstream`, and a closed first port showed Burlington, Canada and `upstream (backup)`.
- **2026-11-07** — Built: the browser reads the two saved proxy lines while the proxy is on, and the review found one fix: the new page linked tests that do not ship, so it now links them on GitHub. ClaymooApp updates from this release in the same ship, because the person asked to ship it there too; WongOS and Relay Everything already route this way.
