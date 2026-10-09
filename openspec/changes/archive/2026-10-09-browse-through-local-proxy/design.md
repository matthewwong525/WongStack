# Design

## Context

See proposal.md for the observed UPS result and scope. `browse.mjs` already installs pinned Camofox once into `~/.wong-stack/camofox`, shares its loopback API across task pages, serializes startup with a lock, and suppresses server output. Camofox 1.18.1 accepts an HTTP proxy via its native `PROXY_*` settings. The browser skill directory ships in full.

## Goals / Non-Goals

Start the local forwarder deterministically with the personal browser, without a new dependency, account, daemon, credential, or setup question. Keep the existing API, private-form restrictions, login store, and preview browser unchanged. Do not introduce regional routing or retry a site's human checks.

## Decisions

1. Add a small Node HTTP forwarding module using `node:http` and `node:net`. Bind only `127.0.0.1` on a dynamically assigned port. Forward HTTP bodies and responses as streams; support HTTPS through an opaque CONNECT tunnel. Strip hop-by-hop and proxy authentication headers, validate request targets, bound upstream connection establishment, and close both ends on errors or browser-side disconnects. Do not log addresses, headers, or bodies, or add a TLS CA. Track sockets for clean closure. Reject malformed destinations and unsupported schemes with generic responses.
2. Launch a small repository-owned server entrypoint. It opens the forwarder, configures Camofox's native proxy settings, and dynamically imports the installed Camofox server in the same process. This gives proxy and browser one PID and lifetime, avoiding a separately managed proxy daemon or orphan on termination. Existing startup lock, metadata, permissions, API key, and crash-report suppression stay in the helper. An import or proxy startup failure must exit rather than run direct. Use exactly one loopback HTTP endpoint, clearing inherited native proxy alternatives and credentials so the default cannot silently select an external address.
3. Keep installed package versions unchanged. Native Camofox enables its proxy-aware launch behavior when a proxy is set; the trial establishes observed page behavior, not a universal site compatibility guarantee or a proven cause. There is no need to modify vendored package files.
4. Preserve a live older server and its tabs until an explicit stop. New starts use the new entrypoint; upgrading code must not stop another task or interrupt a private form. Record the managed proxy mode in new server metadata if useful for reliable inspection, without changing existing callers' response contracts. Document when the default takes effect for a running browser.
5. Author behavior tests with local HTTP and TCP targets for byte-preserving forwarding, CONNECT head handling, upstream errors, malformed requests, loopback binding, and shutdown. Adapt the existing fake Camofox launch fixture to assert that default starts configure the local endpoint and that stop removes the listener, while retaining concurrency, shared logins, reporting, and private-form tests. Tests use no internet or VPN.

## Risks / Trade-offs

- Proxying may not help a particular site's refusal → preserve the existing refusal handoff and avoid promising bypasses.
- A listener can hold stale sockets → explicit tracking and close paths, tested shutdown, and one process lifetime.
- An inherited proxy setting might select an unintended upstream → set and sanitize the native settings for the owned local endpoint before importing Camofox.
- An upgrade can encounter an existing direct browser → preserve active pages; document next-start activation and inspect before activating this host.

## Migration Plan

Release this as a minor payload change with a `Next` changelog entry, leaving VERSION numbering to `/ship`. Fresh installs need only the existing browser install. Existing installs receive the helper with normal payload updates; an already-running browser changes routing on its next explicit stop and start. Rollback is a previous helper followed by the same deliberate restart; never delete profiles or passwords.

After the helper finishes implementation and checks, the parent performs an isolated real Camofox acceptance run using the already-installed dependencies. Verify that the default launches the loopback proxy without supplying proxy settings, opens a public HTTPS page with WARP off, and attempts the requested UPS page once. Site refusal is recorded honestly; an unrelated site block does not invalidate demonstrated proxy routing. Do not interrupt the shared personal browser to conduct acceptance.
