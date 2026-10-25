# App changes get their preview link back: the live line moves to its own small Worker

**Status:** in-progress
**Branch:** greedy-whale
**Open questions:** none.

## Why

Since 44.11.0, a change to your app makes no link to look at before it goes live. Cloudflare makes no preview link for an app that holds a live object of its own, and the live line, which wakes your computer when you tap in the inbox, is one. So building and checking an app change now skips the step where you see it first. It showed in WongOS on 2026-10-25.

## What Changes

- **Every app change gets its own link again.** The app stops holding the line itself and only points at it, so Cloudflare makes a link for each change, as it did before 44.11.0.
  ```mermaid
  flowchart LR
    change["app change"] --> before{"holds<br/>the line?"}
    before -->|"yes, now"| none["no link"]
    before -->|"no, after"| link["a link"]
  ```
- **A quick test comes first.** Cloudflare's page doesn't say whether an app that only points at a line in another Worker gets a link. Before anything else is built, two throwaway Workers in your Cloudflare account answer it, then get deleted. If there's still no link, the work stops and comes back to you with other options.
  ```mermaid
  flowchart LR
    test["throwaway test"] --> got{"link?"}
    got -->|yes| build["build the rest"]
    got -->|no| stop["stop, ask you"]
  ```
- **The live line moves into its own small Worker.** It does what it does today: wakes your computer and your open inbox, and keeps the schedule clock, writing to the same database. It has no web address, so only your app can reach it. Your computer still connects to the app, signed in as you, and the app passes the line through.
  ```svg
  <svg viewBox="0 0 560 120">
    <rect x="8" y="40" width="120" height="40" fill="card" stroke="line"/>
    <text x="22" y="65">your computer</text>
    <rect x="200" y="40" width="120" height="40" fill="card" stroke="line"/>
    <text x="236" y="65">the app</text>
    <rect x="392" y="8" width="160" height="40" fill="card" stroke="fg"/>
    <text x="410" y="33">the line Worker</text>
    <rect x="392" y="72" width="160" height="40" fill="card" stroke="line"/>
    <text x="428" y="97">the database</text>
    <path d="M128 60h64m-8-6 8 6-8 6" fill="none" stroke="fg"/>
    <text x="134" y="52" fill="muted">sign-in</text>
    <path d="M320 54l64-22m-10-2 10 2-6 8" fill="none" stroke="fg"/>
    <path d="M320 66l64 22m-6-8 6 8-10 2" fill="none" stroke="line"/>
    <path d="M472 48v16m-6-8 6 8 6-8" fill="none" stroke="muted"/>
  </svg>
  ```
- **Publishing puts the line out first, then the app.** Every save and every publish does it in that order, so the app never points at a line that isn't there. A change to the line's own code shows on the shared test copy of the app, not on that change's own link: the line has no link of its own.
  ```mermaid
  flowchart LR
    save["publish"] --> line["line Worker"] --> app["app"] --> link["link"]
    line -->|fails| stop["stop; app<br/>unchanged"]
  ```
- **Setup and updates make the line Worker for you.** A new app gets its live and test line Workers at setup. An app that already has the line gets them when it takes this update, before its first save. The update deletes the line's old saved state inside the app, and that can't be undone. It holds only who the line belongs to and when it next wakes; your computer reconnects within a minute and puts both back. Your schedules, their runs, and your inbox live in the database and stay as they are.

Non-goals: a link of its own for the line's code; Cloudflare's four-step move that keeps the old saved state; changing what the line or schedules do; WongOS taking this update (a later sync, there).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-line`: the line runs in its own Worker with no address of its own, and the app keeps per-change preview links.
- `stack-pack`: deploys put the line Worker out before the app, from the default branch's settings; the staging app points only at the staging line.
- `cloudflare-provisioning`: setup and the update create both line Workers before the first save.

## Impact

- **App:** `app/wrangler.jsonc` (the binding becomes `LIVE_LINE` with a `script_name` per environment; migration `line-2` deletes `Line`), new `app/wrangler.line.jsonc` and `app/worker/line-worker.ts`, `app/worker/index.ts` stops exporting `Line`, `app/vite.config.ts` runs the line beside the app in local dev.
- **Pack scripts:** `scripts/cf-build.sh`, `scripts/cf-deploy.sh`, `scripts/cf-preview.sh`, `scripts/lib-wrangler-config.mjs`/`.sh`, `scripts/cf-secrets.mjs`, `scripts/check-private-access.mjs`, and their tests.
- **Setup:** `.agents/skills/wong-setup/scripts/provision.mjs`, `.agents/skills/wong-sync/references/stack-pack-fragments.md` and a new `wrangler.line.template.jsonc` beside it, `payload-files.json` and the manifest.
- **Docs:** `wiki/stack/live-line.md`, `wiki/stack/d1-pipeline.md`, `wiki/stack/staging-bindings.md`, `CHANGELOG.md` (minor).
- **Cloudflare:** two new Workers per install (`<app>-line`, `<app>-line-staging`); the `Line` namespace in the app's Workers is deleted.

## Decision log

- **2026-10-25** — Asked (Matthew, in the request) how to get preview links back → chose moving the live line into its own small Worker that the app points at, fixed in WongStack first and taken by WongOS in a later sync.
- **2026-10-25** — Asked (Matthew, in the request) whether to trust the Cloudflare page or test → chose a throwaway test before building the rest, since the page doesn't cover an app that only points at another Worker's line.
- **2026-10-25** — Assumed: the old line state is deleted, not moved with Cloudflare's transfer, because it holds only the owner's name and the next wake time, both rewritten when the computer reconnects (every deploy drops the sockets anyway), while a transfer takes four ordered deploys per Worker and fails on a fresh install with nothing to move.
- **2026-10-25** — Assumed: the line Worker lives in the app's folder with its own settings file, not in a separate pack folder, because it shares the app's schedule and inbox code and its tools.
- **2026-10-25** — Assumed: setup creates both line Workers from this computer before the update's first save, because that save's preview runs the default branch's older deploy scripts, which don't know the line Worker.
- **2026-10-25** — Assumed: the line Worker's settings always come from the default branch, and only its built code from a branch, because a branch must not pick which Worker or database the deploy key writes to.
- **2026-10-25** — Assumed: a change to the line's own code is checked on the staging copy, not its own link, because Cloudflare makes no link for a Worker that holds a live object, which is the whole cause.
- **2026-10-25** — Fixed: the probe passed with one change. Cloudflare refused step 3's class delete while a binding kept the name `PROBE`, even pointed at the other Worker (code 10061); a renamed binding passed, and steps 3 and 4 printed links that reached the other Worker's object. So the app's binding is `LIVE_LINE`; the class keeps the name `Line`. Side answers: a binding to a missing Worker fails the deploy (10061), and `versions upload` refuses a pending Durable Object migration.
- **2026-10-25** — Assumed: the line's config template is a `.jsonc` file beside the fragments page, not a block in it, because the skills' instruction bytes sit at their recorded ceiling; provisioning reads the file the same way. For the same reason the page adds no rule line for the staging line: its rule to point every staging binding at its twin covers it, and `secrets:check` enforces it.
- **2026-10-25** — Assumed: provisioning makes only the line Workers Cloudflare doesn't list, so a rerun never sends this computer's line code over the published one; a failed line deploy is a to-do, as a failed types refresh is a warning, and the line names join setup's name-clash check so it never overwrites another project's Worker.
- **2026-10-25** — Assumed: `LINE` is not added to the retired names, because the line Worker's own binding to its class keeps that name.
- **2026-10-25** — Check: `app/knip.jsonc` gains an entry, `worker/line-worker.ts`, because the line's own Worker is a new entry point Wrangler loads from `wrangler.line.jsonc`, which knip can't see; nothing is loosened.
- **2026-10-25** — Fixed: running the two Workers together locally showed the line Worker crashing at start on Vite-only `import.meta.glob`, reached through the inbox's shared file; the line now imports a small file of its own, and a test fails if it reaches a glob again. `npm run dev` fails before this change too (a blocked import outside the app folder), so the local check used `wrangler dev`, and the tap is walked on the preview.
- **2026-10-25** — Fixed (second look): an existing Worker with a line name counts as this install's only when its setup record lists it, else setup leaves a step for the person; the update note now says to make the line Workers before the update's first save; the deploy docs' preview row names the line step. Both line Workers were made from this host before the first save, and the host's preview printed a link.
