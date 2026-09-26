## Context

See proposal.md. `app/worker/index.ts` serves three prefixes: `/_memory/`, `/apps/`, and `/api/`. The assets use `not_found_handling: "single-page-application"`.

## Goals / Non-Goals

**Goals:** every Worker route reaches the Worker for every method.

**Non-Goals:** no new route, and no change to the fallback for app pages.

## Decisions

**List the three prefixes in `run_worker_first`.** With a list, Cloudflare runs the Worker first only for matching paths and serves the assets, with the single-page fallback, for the rest. *Alternative:* `run_worker_first: true` — rejected, because every page load would then run the Worker, and the Worker answers unknown paths with 404 instead of the React app.

**A script test reads both configs.** A Worker unit test can not see this setting, because the Worker never receives the request. The test parses `app/wrangler.jsonc` and the fragment's block.

## Risks / Trade-offs

- [A repo adds a new Worker prefix and forgets the list] → The comment beside the list says each Worker route must be there.
