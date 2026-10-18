# The API spec says enough on its own

**Status:** ready-to-ship
**Branch:** mcp-memory-services
**Open questions:** none

## Why

A chat learns the app's API from its spec: it searches, opens one action, and calls it. For an action you built, that's enough, because each one carries a summary and a line per input. For a key used directly, like `stripe.read`, the spec only says "send a request to `https://api.stripe.com`". It doesn't say what Stripe is for, where its API guide is, or that the install has notes on it. Those live only in the separate services list, so a chat that goes straight to the spec misses them.

## What Changes

- **Each opened action names the services it uses and where to read more.** Opening `stripe.read` shows Stripe's purpose line, a link to Stripe's own API guide, and the install's notes page for Stripe, whether it exists yet or not. A built action that uses a key shows the same for each key.
  ```text
  describe stripe.read
  ──────────────────────────────────────────
  Look something up in Stripe
  keys: Stripe  Read
    Payments and refunds
    guide: https://docs.stripe.com/api
    notes: wiki/services/stripe.md
  inputs: method, path, query, …
  ```
- **The spec groups actions by service.** Each key's actions sit under its name, with its purpose line and guide link, so a tool that reads the spec sees "Stripe: payments and refunds" once, above its actions.
  ```text
  openapi.json
  ──────────────────────────────────────────
  Stripe — Payments and refunds  (guide ↗)
    stripe.read     look something up
    stripe.change   change something
  Cloudflare — Workers, logs, usage (guide ↗)
    cloudflare.read look something up
  ```
- **The spec opens with where to start.** A few lines at its top: search with words, open one action before calling it, every error has the same shape, and check a timed-out change before repeating it.
  ```mermaid
  flowchart LR
    find["search"] --> one["open one"] --> run["call"]
    run -->|timeout| look["check first"]
  ```

**Non-goals:** no MCP. No commands on this computer in the API or the services list: those stay in their own skills. No change to which actions a person can see, and nothing new to set up.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-api-discovery`: an action's description and OpenAPI name each key it uses with its purpose and guide link, OpenAPI groups operations by key and opens with how to use it, and the helper adds each key's notes page to a described action.

## Impact

- **Worker:** `app/worker/api/discovery.ts`: `keys` entries in a described action gain `name`, `purpose` and `docs` from the key registry; OpenAPI gains `info.description`, a top-level `tags` list (one per key the caller's operations use) and per-operation `tags`; a key's own `<key>.read` / `<key>.change` operation gains `externalDocs`. `app/worker/api/discovery.test.ts`.
- **Helper:** `scripts/company-api.mjs describe` adds `notes: { path, exists }` to each key from the checkout, as `services` does; tests in `scripts/tests/company-api.test.mjs`.
- **Docs:** `wiki/stack/service-catalogue.md` (what a described action and the spec now carry); `CHANGELOG.md` minor entry.

## Decision log

- **2026-10-18** — Asked whether to make the app an MCP → chose no MCP: the documented API is enough, and Claude Code and Codex are what matter now.
- **2026-10-18** — Asked whether commands on this computer belong in the API or the services list → chose neither: they stay in their own skills.
- **2026-10-18** — Asked how to fill the API spec's gaps → chose to group each key's actions under its service with its purpose and guide link, put the guide link on each direct-use action, and open the spec with where to start.
- **2026-10-18** — Assumed: the notes page is added by the helper, not the app, because the app can't see the install's wiki.
- **2026-10-18** — Assumed: groups are by key only, not by app, because apps carry no purpose line or guide to show.
- **2026-10-18** — Assumed: the services list stays as it is, because it is the one place that names a key nobody has saved yet, which has no action to describe.
- **2026-10-18** — Assumed: one save before archive, because the preview check (task 4.2) needs the deployed app.
- **2026-10-18** — Assumed: the no-level case is proven by the unit test, not the preview, because the preview's verification token holds every key.
- **2026-10-18** — Asked to build and publish from the review page → archived with every task ticked, and published.
