# The Worker runs first for all its routes

**Status:** ready-to-ship
**Branch:** fix-worker-first-routes
**Open questions:** none

## Why

24.0.0 set `run_worker_first` to `["/apps/*"]`. Once that setting is a list, Cloudflare sends every path not in it to the static assets first, and their single-page fallback answers them, even a POST. So production answered `POST /_memory/*` and `POST /api/*` with 405: session memory could not read or write, and the starter API broke.

## What Changes

- **The list names every Worker route.** `app/wrangler.jsonc` and the stack pack's `wrangler.jsonc` fragment set `run_worker_first` to `["/api/*", "/_memory/*", "/apps/*"]`, with a comment that says each Worker route must be in the list.
  ```text
  before   POST /_memory/…  ─▶ assets ─▶ 405
  after    POST /_memory/…  ─▶ Worker ─▶ memory
  ```
- **A test holds the list.** A script test checks that the app config and the fragment both list the three routes, so a route can not drop out again.

**Non-goals:** no change to the routes themselves, to memory, or to mini apps.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stack-pack`: the main Worker runs first for `/api/`, `/_memory/`, and `/apps/`, not only `/apps/`.

## Impact

- **Config:** `app/wrangler.jsonc` and the `wrangler.jsonc` fragment.
- **Tests:** `scripts/tests/wrangler-config.test.mjs`.
- **Release:** 24.0.1. An install on 24.0.0 that took the fragment has the same break; `/wong-sync` plans the one-line fix.

## Decision log

- **2026-09-26** — Found after the 24.0.0 production deploy: `memory.mjs search` failed with HTTP 405, and production answered `POST /_memory/…` and `POST /api/x` with 405 and `GET` on both with the React page. The 24.0.0 walk probed only `/apps/` paths.
- **2026-09-26** — Assumed: list each route rather than drop `run_worker_first`, because a browser opening `/apps/<name>/api/…` still needs the Worker to run first.
- **2026-09-26** — Assumed: release 24.0.1, a fix with no breaking change.
