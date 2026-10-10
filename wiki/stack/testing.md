# Testing the app

AI can write or change a mistake as easily as any developer. Tests keep the behavior you rely on visible and repeatable. Use a small unit test for rules, edge cases and failures that need quick feedback; use runtime checks when the database or hosting runtime can change the outcome. An AI's successful manual run is useful evidence, but an automatic check keeps working on the next change too.

## Local checks

The app's `npm test` command runs the existing unit and screen tests with their coverage limits, then a focused suite in Cloudflare's local Workers runtime. The extra suite reuses the installed Wrangler and Vite packages; it adds no dependency, browser download or service login.

Run `npm run test:runtime` from `app/` for just the runtime cases. It builds only the Worker, starts one local runtime, applies the project's real migrations to a fresh temporary D1 database, and checks signed requests and Access saves. Setup prints build/startup and migration times. Node's built-in bytecode cache stays in the app's ignored dependency folder to speed later runs of the same installed tools. The suite closes its runtime and removes the temporary build when finished, including after a failing assertion.

Every case resets the Access tables and removes the suite's failure trigger; migrations and the one running session remain. Requests use generated signing keys and synthetic people. Only the signing-key response is substituted: authorization, request routing, D1 queries and transaction rollback use the real app and binding. Unexpected outgoing requests fail. The app's compatibility flags are kept, and its secret files and deployed resources are never used.

The separate `npm run test:checks` command gives the runtime check a deliberately wrong expectation after a successful request. A startup error cannot count as catching that mistake. It also proves the existing type and coverage checks still reject their bad samples.

## What still needs a deployed check

Local workerd checks runtime and D1 behavior, but cannot establish the hosted Access policy, a live provider's availability, or the screen's behavior in a browser. Keep the [deployed check](../development/staging-walkthrough.md) for those questions. The automatic checks remain [the publishing gate](../development/the-change-loop.md#the-gate).

Part of the [Cloudflare stack](README.md).
