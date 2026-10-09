# Tasks

## 1. Personal browser routing and behavior tests

- [x] 1.1 Implement the loopback HTTP forwarder and shared-process Camofox launcher with bounded startup, opaque CONNECT, generic failures, header handling, and socket cleanup; review the source against the proxy privacy and failure requirements.
- [x] 1.2 Wire new browser starts to the launcher without changing pinned dependencies, saved login storage, task isolation, private-form restrictions, or reuse of an already-running server; review startup and stop paths for one process lifetime.
- [x] 1.3 Author local forwarding tests for streamed bytes, CONNECT including initial head data, upstream failures, malformed destinations, loopback binding, and closure; adapt browser fixture tests to assert the default proxy and listener shutdown while retaining existing behavioral coverage.

## 2. Installer knowledge and release notes

- [x] 2.1 Document the automatic local default and next-start activation in the owning browsing wiki, including the host's own network and independence from WARP and Paseo relay; review for one canonical explanation without promising a country or universal site access.
- [x] 2.2 Add the minor `Next` payload changelog entry, leaving VERSION unchanged; confirm new browser scripts ship via the existing skill-directory manifest.

## 3. Integration verification after implementation

- [x] 3.1 Run the required local checks after all source, tests, and docs are authored; record the result and repair affected failures within the build-helper rules.
- [x] 3.2 Parent: perform an isolated real Camofox acceptance run with the installed dependencies and no supplied proxy settings; observe the default loopback endpoint, a public HTTPS page with WARP off, and one attempt at the requested UPS page, recording any refusal without changing scope or interrupting the shared browser. Observed HTTP loopback proxy, public HTTPS trace `warp=off` and `loc=FI`, and closed listener after browser stop. The initial five-second UPS capture was still loading; a settled capture returned the tracking error, so no reliable UPS success is claimed.
