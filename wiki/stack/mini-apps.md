# Mini apps

A mini app is a small page or tool that you get from one request — "make me a tip calculator". It lives in its own folder, and the main app serves it at `/apps/<name>/`. It takes [the same loop as any change](../development/the-change-loop.md#mini-apps): a plan, a preview, then *publish it?*

```text
repo/
├─ app/               main app; its Worker serves /apps/*
└─ mini-apps/
   ├─ router.mjs      routes /apps/<name>/api/*
   ├─ routes.mjs      finds each apps/*/api.mjs
   └─ apps/
      └─ tips/
         ├─ index.html
         ├─ app.json  title, description
         ├─ api.mjs   optional handler
         └─ api.test.mjs
```

The main app's Worker, `app/worker/index.ts`, sends every request under `/apps/` to `mini-apps/router.mjs`. The router sends `/apps/<name>/api/*` to that app's `api.mjs`, and serves every other path from the build's static assets. `routes.mjs` finds the handlers when Vite bundles the Worker, so a new app needs no edit outside its folder.

## The rules

- **One folder per app**, `mini-apps/apps/<name>/`, with an `app.json` that holds a `title` and a one-line `description`. The folder name is the URL path: lowercase letters, digits, and hyphens. Copy the example app, `hello/`, to start.
- **No build step of its own.** Pages are HTML, CSS, and plain JS modules. The optional handler, `api.mjs`, is plain JavaScript too. The main app's build bundles it into the main Worker.
- **Tests live with the app.** Write tests for its logic in the same folder, runnable with `node --test` from that folder. Plain JavaScript runs on any Node with no install and no type stripping.
- **Data is shared on purpose.** A handler gets the app's D1 database, `DB`, and nothing else: staging for previews, production for published apps. It never gets the memory bindings: an app never needs them, so a bug in one can not read anyone's sessions. A table comes from a migration in the shared `schema/migrations/`, as [the data pipeline](d1-pipeline.md) says.
- **One app never changes another.** A change to a shared file under `mini-apps/` outside `mini-apps/apps/`, such as `router.mjs`, is main-app code, so CI runs the main app's tests on it.

## Build, preview, publish

A mini app goes through [the change loop](../development/the-change-loop.md) like any change. Only its folder is special.

- **Plan.** [`/plan`](../../.agents/skills/plan/SKILL.md) writes the change, with a task for the app's tests, and asks *build it now?*
- **Preview.** When [`/apply`](../../.agents/skills/apply/SKILL.md#finish-with-a-preview) finishes, it uploads a preview of the whole main app from the agent host. Open the app at `/apps/<name>/` on that link. Each further change uploads again to the same link.
- **Publish.** [`/ship`](../../.agents/skills/ship/SKILL.md) saves, waits for CI, and merges. CI runs only the changed app's tests when nothing else changed, as [the gate](../development/the-change-loop.md#the-gate) says, and still deploys the main Worker, because it serves the app.

**A preview builds the whole app, so the first one in a worktree waits for the install.** It uses staging data. A preview link on `workers.dev` is public but unlisted, because [Cloudflare Access can not gate `workers.dev`](cloudflare-access.md#why-workersdev-cannot-be-gated). Keep private data out of staging.

## The app list

`scripts/cf-build.sh` runs `scripts/mini-dashboard.mjs` after each build of the main app, with no model step. The script reads every app's `app.json` and writes three things into the build's assets:

- `/apps/<name>/` — each app's pages. It never copies `api.mjs`, tests, TypeScript files, or dotfiles.
- `/apps/index.html` — the list page, with each app's title, description, and link.
- `/apps/apps.json` — the same list as data.

The starter landing page, `app/src/App.tsx`, opens with a tutorial message: your first change is to ask the agent to remove it, and doing that walks you through the whole loop. Below it, the page reads `/apps/apps.json` and lists the apps.

On production the list shows every published app; on a preview it also shows the app that you preview. A bad folder name, or a missing title or description, stops the build and names the folder.

## When to move an app into the main app

Move a mini app into `app/` when it needs the main app's login, data model, or navigation. That is an ordinary change through [the change loop](../development/the-change-loop.md), with the main app's own tests. A mini app already shares the main app's hostname, so [Cloudflare Access](cloudflare-access.md) on the main app gates it too.

In the WongStack source repo, only the example app `hello/` is payload, so a change to it is a release. Any other app there is built like in any repo, and never ships to other repos.

Part of [the Cloudflare stack](README.md).
