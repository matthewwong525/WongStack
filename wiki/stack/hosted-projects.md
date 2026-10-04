# Managed hosted projects

The managed route starts a new HTTP/static project without asking its owner for GitHub or Cloudflare accounts. Existing GitHub projects keep their [current pipeline](github-actions.md). Managed creation stays disabled until service integration and complete acceptance establish setup, editing, private preview, approved publication, recovery and a second change.

## Prepare the starter

The source-only [starter helper](https://github.com/matthewwong525/WongStack/blob/main/server/hosted/starter.mjs) prepares a fresh release folder from the reviewed source checkout using the normal payload inventory, folder links, wiki hubs and install record. Dependencies are frozen to the lockfile, including Wrangler 4.144.0. The app retains its normal `npm test` chain and `npm run build:app`; `npm run build` delegates directly to it, without database migration or publication hooks. Source maintenance CI builds and tests the generated starter separately from the existing app.

Preparation copies compatibility payload files, but declares no business database, memory, queue, cron or background binding. Memory is recorded as unconfigured. The original GitHub configuration and its separate staging environment stay unchanged. [Native Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/) uses a separate `previews.vars` block and top-level static assets. The generated `/_hosted/identity` endpoint contains project and source SHA literals compiled from `WONG_HOSTED_PROJECT` and `WONG_HOSTED_SHA`, behind the existing signed Access identity check.

After review and an explicit release authorization, stage the prepared folder in an Artifacts starter repository once; retain its exact provider remote, immutable commit, source version/commit and dependency lock. Record the receipt in the service's starter pin before creating any customer project. No customer setup or build fetches Source from GitHub. Preparing files alone neither publishes this starter nor enables managed creation.

## Open the workspace

The service first establishes the exact project Worker and owner-specific Access protection, then seeds its repository from the pinned starter. Only a negotiated contract-5 peer receives [the hosted bootstrap job](https://github.com/matthewwong525/WongStack/blob/main/server/README.md#hosted-project-bootstrap). The workspace uses the existing tools, Paseo and AI sign-in steps; the owner still signs in to their AI. [Artifacts Git tokens](https://developers.cloudflare.com/artifacts/guides/authentication/) belong to one repository and are separate from Cloudflare management credentials.

Before personal setup or delivery, [private context verification](../../.agents/skills/wong-sync/scripts/hosted-context.mjs) confirms the checkout's exact remote, project, starter/source and generation with the authenticated service. A committed marker or origin chooses the possible route but grants no authority. Missing, revoked, foreign or unverifiable context stops with reconnect guidance; it never becomes a request for personal provider credentials. Retrying the same authorized bootstrap preserves customer edits and opens the same Paseo project.

Back to the [Cloudflare stack](README.md).
