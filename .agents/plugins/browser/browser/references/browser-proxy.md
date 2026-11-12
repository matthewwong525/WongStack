# Browser proxies

While [the proxy setting](browsing.md#the-proxy-setting) is on, the browser can send its traffic through proxies you save, so sites see your home address, not this computer's address. [Browsing](browsing.md) owns the browser itself; this page owns its proxies.

## The order of routes

Each connection to a site tries these routes in order, and moves to the next one when a route fails:

1. **The first proxy**, `BROWSE_FIRST_PROXY`: a proxy at your home, such as a small computer that this computer reaches through a private network.
2. **The backup**, `BROWSE_UPSTREAM_PROXY`: a paid home address in your country.
3. **This computer's own network**, so the page still loads.

When the first proxy fails and the backup then opens the same connection, the first proxy waits one minute. In that minute, each new connection starts at the backup, so pages do not wait on a home proxy that is off. After the minute, the next connection tries the first proxy again. A connection that is already open keeps its route until the browser closes it.

When the backup also fails on a secure connection, the site is down, not the first proxy: the next connection tries the first proxy again. A plain (not secure) request is different: a first proxy that fails it waits one minute, even when the backup fails too.

A secure page moves to the next route when a route refuses or fails to open its tunnel, because nothing from the page has left yet. A plain request moves on only when a route refused the login or was unreachable. After a route takes a plain request, a failure gives an error page, never a second send: a second send can pay twice.

Addresses on this computer and its local network always go direct. Only the browser uses these routes: other programs on this computer use its own network.

With no saved proxy, the proxy setting sends the browser through a local proxy only, on this computer's own network.

## Save the proxies

Save each key in the primary worktree's `.env` ([how](../../hand-over/references/key-link.md)). The committed `.env.example` holds only the blank names: a proxy address, login, or home address never goes in a committed file.

- `BROWSE_FIRST_PROXY` holds `[http://][login:password@]host:port`. The login is optional.
- `BROWSE_UPSTREAM_PROXY` holds `[http://]login:password@host:port`. Pick a sticky address in your country, so sites see one address for a session.

The next browser start copies each line to `~/.wong-stack/camoufox/first-proxy` and `~/.wong-stack/camoufox/upstream-proxy`, readable only by you. A start from any repo uses those files when its own `.env` has no key, so a changed key spreads to every repo. A line in a repo's `.env` replaces the computer's copy. While a file is missing, a start reads the old camofox file of the same name in `~/.wong-stack/camofox/` and copies it over.

Only the local proxy holds the lines: the browser gets a local address, never a proxy login. At start, the browser's time zone and English follow the address that sites see: a Canadian address gives `en-CA`.

## Check the live route

`node .claude/skills/browser/scripts/browse.mjs status` prints `BROWSE_NETWORK=`. It only reads: it never starts or stops the browser.

| Value | Meaning |
|---|---|
| `upstream` | through the first proxy, or through the backup when no first proxy is saved |
| `upstream (backup)` | through the backup, because the first proxy failed: the home proxy is off or offline |
| `direct (upstream unreachable)` | every route failed: this computer's own network |
| `direct (no upstream proxy)` | the proxy is off, no line is saved, or older scripts started the running browser |
| `unknown (browser stopped)` | no browser runs |

On `upstream (backup)`, tell the person to check their home proxy. On `direct (upstream unreachable)`, tell them to check the home proxy and the backup account.

## Turn it off

- **Every route:** run `browse.mjs proxy off`. From its next start, the browser goes straight to sites. The saved lines stay for `proxy on`.
- **Only the first proxy:** blank `BROWSE_FIRST_PROXY` in each repo's `.env`, and empty `~/.wong-stack/camoufox/first-proxy`. Empty the file, do not delete it, or the old camofox line comes back.

A running browser keeps its route until its next start. Never restart it without the person's yes: a restart can stop a step in progress.

## Test a change to the routes

The route tests live in WongStack, not in an installed repo: [`forwarder.test.mjs`](https://github.com/matthewwong525/WongStack/blob/main/scripts/tests/forwarder.test.mjs), [`proxy-lines.test.mjs`](https://github.com/matthewwong525/WongStack/blob/main/scripts/tests/proxy-lines.test.mjs), [`browser-server.test.mjs`](https://github.com/matthewwong525/WongStack/blob/main/scripts/tests/browser-server.test.mjs), [`browse.test.mjs`](https://github.com/matthewwong525/WongStack/blob/main/scripts/tests/browse.test.mjs). They use local listeners and a temporary home folder, so they never touch the running browser or the saved lines. In WongStack, run them with `node --test` and those four paths under `scripts/tests/`.

To try the real routes, start a second browser server with a temporary `HOME` that holds copies of the two lines, never the running browser.

Up: [Browsing](browsing.md). Part of [the browser module](../README.md).
