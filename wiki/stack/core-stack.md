# Core stack

The runtime the stack pack targets: a **React SPA on Cloudflare Workers with a D1 database**, built by Vite and styled with Tailwind. One Worker serves the app and its APIs; D1 holds the data; migrations apply on deploy. Everything runs remote — there's no local server to babysit — and the [D1 pipeline](d1-pipeline.md) makes each merge a deploy.

This is the [Cloudflare stack](README.md)'s answer to *what to build on*. It's a recommendation, not a requirement: take it whole, take a piece, or skip it. The pack's [scripts](d1-pipeline.md) and pipeline docs assume it; the rest of WongStack does not.

## The pieces

| Piece | Role | Notes |
|---|---|---|
| **React 19** | The SPA | Mounted at `/` and served by the Worker. |
| **Vite 8** | Build + dev | Stable release — no `overrides` pin needed. `@cloudflare/vite-plugin` wires the build to Workers. |
| **Cloudflare Workers** | The runtime | One Worker serves the SPA, the JSON APIs, and static assets. `wrangler` deploys it. |
| **D1** | The database | Cloudflare's SQLite. Migrations in `schema/migrations/` apply automatically on deploy — see the [deploy and data pipeline](d1-pipeline.md). |
| **Tailwind 4** | Styling | Utility CSS through the Vite plugin. |

Pin these versions where the scaffold needs them (Vite's Cloudflare plugin and the Workers runtime move together); the pack's scripts don't care about versions — they drive `wrangler`, which the runtime owns.

## Why this combo suits AI-driven dev

**Merge = deploy.** A PR's merge to the default branch *is* the production release: Workers Builds runs the [build and deploy wrappers](d1-pipeline.md#auto-migrate-on-build-deploy-by-branch), applies pending migrations to prod, and ships the new bundle. No separate deploy step to forget, no drift between "merged" and "live."

**One runtime, front to back.** The SPA, the APIs, and the data binding all live in a single Worker with one config file (`wrangler.jsonc`), which also declares the [staging environment](d1-pipeline.md#why-staging-is-a-whole-worker). An agent reasoning about a change sees the whole surface in one place instead of stitching a frontend host to a separate backend to a separate database.

**Cheap previews are the inner loop.** Every branch push gets its own preview URL on the [staging Worker](d1-pipeline.md#two-preview-urls-and-only-one-of-them-runs-your-queue), bound to staging data — a real, shareable deploy to exercise a change against, with no local build gate. `/save` pushes and hands back the URL; that URL, not a localhost server, is where you confirm the change works.

## Next

- How code and data ship, and how a bad migration is recovered: the [deploy and data pipeline](d1-pipeline.md).
- The login wall in front of the app: [Cloudflare Access](cloudflare-access.md).
- The tokens the pipeline needs: [Cloudflare credentials](cloudflare-credentials.md).
- Back to the stack overview: [Cloudflare stack](README.md).
